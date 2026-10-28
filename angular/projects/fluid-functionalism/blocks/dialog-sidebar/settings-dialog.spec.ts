/**
 * SettingsDialog through its public interface. Upstream has no test for the
 * dialog-sidebar block, so this pins one test per rule of
 * registry/blocks/dialog-sidebar/settings-dialog.tsx: the xl dialog canvas
 * (no padding, fixed height) named by the title in the sidebar header, the
 * non-collapsing 13rem sidebar of sections that switches the panel, the
 * narrow-screen Select that mirrors and drives the section, the default
 * section, the wired controls of each panel, and open / close reporting.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SettingsDialog } from './settings-dialog';

@Component({
  imports: [SettingsDialog],
  template: `
    <ff-settings-dialog
      [open]="open()"
      [defaultSection]="section()"
      (openChange)="changes.push($event); open.set($event)"
    />
  `,
})
class Host {
  readonly open = signal<boolean | undefined>(true);
  readonly section = signal('general');
  readonly changes: boolean[] = [];
}

@Component({
  imports: [SettingsDialog],
  template: `<ff-settings-dialog defaultOpen />`,
})
class UncontrolledHost {}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (document.documentElement as { clientWidth?: number }).clientWidth;
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
});

const popup = () => document.querySelector<HTMLElement>('[data-slot="dialog-popup"]');
const sidebar = () => popup()!.querySelector<HTMLElement>('ff-sidebar')!;
// Rows render their label twice (the bold-weight sizer copy): read the first.
const rowLabel = (row: Element) => row.textContent!.trim().split(/\s+/)[0];
const navRow = (label: string) =>
  Array.from(sidebar().querySelectorAll<HTMLButtonElement>('[data-sidebar="menu-button"]')).find(
    (b) => rowLabel(b) === label,
  )!;
const heading = () => popup()!.querySelector<HTMLElement>('h3')!;
// The section panel inside its scroll area.
const panel = () => popup()!.querySelector<HTMLElement>('ff-scroll-area .flex.flex-col.gap-6.px-6.pb-6')!;
const panelText = () => panel().textContent ?? '';
const switches = () => Array.from(popup()!.querySelectorAll<HTMLElement>('[role="switch"]'));
const narrowTrigger = () => popup()!.querySelector<HTMLElement>('.sm\\:hidden [role="combobox"]')!;
const option = (label: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((o) => o.textContent?.trim() === label)!;

async function setup<T>(type: new () => T, configure: (host: T) => void = () => {}) {
  const fixture = TestBed.createComponent(type);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  await fixture.whenStable();
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  await settle();
  return { fixture, host: fixture.componentInstance, settle };
}

describe('SettingsDialog', () => {
  it('opens an xl dialog canvas named by the "Settings" title', async () => {
    await setup(Host);
    const panel = popup()!;
    expect(panel.classList.contains('max-w-[880px]')).toBe(true);
    expect(panel.classList.contains('p-0')).toBe(true);
    expect(panel.classList.contains('p-6')).toBe(false);
    expect(panel.classList.contains('flex')).toBe(true);
    expect(panel.classList.contains('h-[min(640px,calc(100dvh-4rem))]')).toBe(true);
    expect(panel.classList.contains('overflow-hidden')).toBe(true);
    const title = document.getElementById(panel.getAttribute('aria-labelledby')!)!;
    expect(title.textContent?.trim()).toBe('Settings');
    expect(title.style.fontVariationSettings).toBe("'wght' 400, 'opsz' 14");
    // The one title lives in the sidebar header.
    expect(sidebar().contains(title)).toBe(true);
    const description = document.getElementById(panel.getAttribute('aria-describedby')!)!;
    expect(description.textContent?.trim()).toBe('Workspace and account settings.');
    expect(description.classList.contains('sr-only')).toBe(true);
  });

  it('puts a static 13rem sidebar of sections down the left edge, hidden below sm', async () => {
    await setup(Host);
    const provider = popup()!.querySelector<HTMLElement>('ff-sidebar-provider')!;
    expect(provider.style.getPropertyValue('--sidebar-width')).toBe('13rem');
    expect(provider.classList.contains('h-full')).toBe(true);
    expect(provider.classList.contains('min-h-0')).toBe(true);
    const column = sidebar();
    expect(column.classList.contains('hidden')).toBe(true);
    expect(column.classList.contains('sm:flex')).toBe(true);
    expect(column.classList.contains('bg-[rgb(var(--overlay)/0.03)]')).toBe(true);
    // collapsible="none": no rail.
    expect(popup()!.querySelector('ff-sidebar-rail')).toBeNull();
    const labels = Array.from(column.querySelectorAll('[data-sidebar="menu-button"]')).map(rowLabel);
    expect(labels).toEqual(['General', 'Notifications', 'Appearance', 'Security', 'Members']);
    expect(column.textContent).toContain('Workspace');
  });

  it('starts on General and switches the panel from the sidebar', async () => {
    const { settle } = await setup(Host);
    expect(navRow('General').getAttribute('aria-current')).toBe('page');
    expect(heading().textContent?.trim()).toBe('General');
    expect(popup()!.textContent).toContain('Workspace name, language, and region.');
    expect(panelText()).toContain('Workspace name');

    navRow('Notifications').click();
    await settle();
    expect(navRow('Notifications').getAttribute('aria-current')).toBe('page');
    expect(navRow('General').hasAttribute('aria-current')).toBe(false);
    expect(heading().textContent?.trim()).toBe('Notifications');
    expect(popup()!.textContent).toContain('What reaches your inbox and when.');
    expect(panelText()).toContain('Daily digest');
    expect(panelText()).not.toContain('Workspace name');

    navRow('Members').click();
    await settle();
    expect(heading().textContent?.trim()).toBe('Members');
    expect(panelText()).toContain('jane@acme.com');
    expect(panelText()).toContain('Invite people');
  });

  it('honors defaultSection', async () => {
    await setup(Host, (h) => h.section.set('security'));
    expect(heading().textContent?.trim()).toBe('Security');
    expect(navRow('Security').getAttribute('aria-current')).toBe('page');
    expect(panelText()).toContain('Two-factor authentication');
    expect(panelText()).toContain('Sign out everywhere');
  });

  it('narrow screens navigate with a Select that mirrors the section', async () => {
    const { settle } = await setup(Host);
    const trigger = narrowTrigger();
    expect(trigger.textContent).toContain('General');
    trigger.click();
    await settle();
    option('Appearance').click();
    await settle();
    // The pick lands after the select's acknowledgment beat.
    await vi.waitFor(
      async () => {
        await settle();
        expect(heading().textContent?.trim()).toBe('Appearance');
      },
      { timeout: 2000 },
    );
    expect(navRow('Appearance').getAttribute('aria-current')).toBe('page');
    navRow('Security').click();
    await settle();
    expect(narrowTrigger().textContent).toContain('Security');
  });

  it('wires the switches to their settings, with the switch label visually hidden', async () => {
    const { settle } = await setup(Host, (h) => h.section.set('notifications'));
    const [digest, mentions, updates] = switches();
    expect([digest, mentions, updates].map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'true', 'false']);
    const host = updates.closest('ff-switch')!;
    expect(host.classList.contains('[&>span:last-child]:sr-only')).toBe(true);
    expect(host.querySelector('[data-slot="switch-label"]')!.textContent?.trim()).toBe('Product updates');
    updates.click();
    await settle();
    expect(switches()[2].getAttribute('aria-checked')).toBe('true');
    digest.click();
    await settle();
    expect(switches()[0].getAttribute('aria-checked')).toBe('false');
  });

  it('wires the General field and selects', async () => {
    const { settle } = await setup(Host);
    const input = popup()!.querySelector<HTMLInputElement>('ff-input-field input')!;
    expect(input.value).toBe('Acme Inc');
    input.value = 'Globex';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    expect(popup()!.querySelector<HTMLInputElement>('ff-input-field input')!.value).toBe('Globex');
    const triggers = Array.from(panel().querySelectorAll<HTMLElement>('[role="combobox"]'));
    expect(triggers.map((t) => t.textContent?.trim())).toEqual(['English', '(UTC+1) Paris']);
  });

  it('gives each member a borderless role select', async () => {
    await setup(Host, (h) => h.section.set('members'));
    const triggers = Array.from(panel().querySelectorAll<HTMLElement>('[role="combobox"]'));
    expect(triggers.map((t) => t.textContent?.trim())).toEqual(['Owner', 'Admin', 'Member']);
  });

  it('reports closing from the ✕ button, and supports defaultOpen', async () => {
    const { host, settle } = await setup(Host);
    popup()!.querySelector<HTMLButtonElement>('[data-slot="dialog-close-button"]')!.click();
    await settle();
    expect(host.changes).toEqual([false]);
    await vi.waitFor(() => expect(popup()).toBeNull(), { timeout: 2000 });

    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
    await setup(UncontrolledHost);
    await wait(0);
    expect(popup()).not.toBeNull();
    expect(heading().textContent?.trim()).toBe('General');
  });
});
