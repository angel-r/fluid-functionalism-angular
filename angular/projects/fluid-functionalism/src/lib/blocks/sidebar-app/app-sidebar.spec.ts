/**
 * AppSidebar through its public interface, pinning
 * registry/blocks/sidebar-app/app-sidebar.tsx: an inset sidebar assembled
 * from the workspace-header, search-field and user-footer blocks, the "New"
 * action row, one collapsible group per nav section (label action, badges),
 * and the active row following clicks. Plus the Angular-only seam: the host
 * mirrors the rail's peer state so a sibling SidebarInset still keys on it.
 */
import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SidebarInset, SidebarProvider, type SidebarVariant } from '../../sidebar-core';
import { AppSidebar, type NavSection } from './index';

const SECTIONS: NavSection[] = [
  {
    label: 'Platform',
    items: [
      { label: 'Home', icon: 'star' },
      { label: 'Inbox', icon: 'mail', badge: '12' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Notifications', icon: 'bell', badge: '3' },
      { label: 'Settings', icon: 'settings' },
    ],
  },
];

@Component({
  imports: [SidebarProvider, SidebarInset, AppSidebar],
  template: `
    <ff-sidebar-provider [persist]="false" [mobileBreakpoint]="0">
      <ff-app-sidebar [sections]="sections" [variant]="variant()" [(active)]="active" />
      <main ffSidebarInset data-testid="inset">Main</main>
    </ff-sidebar-provider>
  `,
})
class Host {
  readonly sections = SECTIONS;
  readonly variant = signal<SidebarVariant>('inset');
  readonly active = signal('Home');
  readonly provider = viewChild.required(SidebarProvider);
}

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

function shownMenus() {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]')).filter(
    (m) => m.closest<HTMLElement>('[data-slot="dropdown-positioner"]')?.style.display !== 'none',
  );
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const row = (label: string) =>
    Array.from(el.querySelectorAll<HTMLElement>('[data-sidebar="menu-button"]')).find(
      (b) => b.querySelector('[data-slot="sidebar-menu-label"]')?.textContent!.trim() === label,
    )!;
  return { fixture, el, row };
}

describe('AppSidebar', () => {
  it('assembles an inset sidebar from the header, search, nav and footer blocks', () => {
    const { el } = setup();
    expect(el.querySelector('ff-sidebar')!.getAttribute('data-variant')).toBe('inset');
    const header = el.querySelector<HTMLElement>('[data-sidebar="header"]')!;
    const switcher = header.querySelector<HTMLElement>('button[aria-label="Switch workspace"]')!;
    expect(switcher.textContent).toContain('Acme Inc');
    expect(header.querySelector('input[aria-label="Search"]')).not.toBeNull();
    const newRow = Array.from(header.querySelectorAll<HTMLElement>('[data-sidebar="menu-button"]')).find((b) =>
      b.textContent!.includes('New'),
    )!;
    expect(newRow.querySelector('svg.lucide-plus')).not.toBeNull();
    const kbd = newRow.querySelector<HTMLElement>('kbd')!;
    expect(kbd.textContent!.trim()).toBe('⇧⌘O');
    expect(kbd.parentElement!.classList.contains('group-hover/menu-item:opacity-100')).toBe(true);
    const footer = el.querySelector<HTMLElement>('[data-sidebar="footer"]')!;
    expect(footer.querySelector('button[aria-label="Open user menu"]')!.textContent).toContain('Jane Doe');
  });

  it('renders one collapsible group per section with its label action and badges', () => {
    const { el } = setup();
    const groups = Array.from(el.querySelectorAll<HTMLElement>('ff-sidebar-group'));
    expect(groups.map((g) => g.querySelector('ff-sidebar-group-label')!.textContent!.trim())).toEqual([
      'Platform',
      'Workspace',
    ]);
    for (const group of groups) {
      expect(group.querySelectorAll('button[aria-label="Add item"]')).toHaveLength(1);
    }
    const badges = Array.from(el.querySelectorAll<HTMLElement>('[data-sidebar="menu-badge"]')).map((b) =>
      b.textContent!.trim(),
    );
    expect(badges).toEqual(['12', '3']);
    const settings = groups[1].querySelector<HTMLElement>('[data-sidebar="menu-button"] svg.lucide-settings');
    expect(settings).not.toBeNull();
  });

  it('marks the active row and moves it on click', () => {
    const { fixture, row } = setup();
    expect(row('Home').getAttribute('aria-current')).toBe('page');
    expect(row('Inbox').hasAttribute('aria-current')).toBe(false);
    row('Inbox').click();
    fixture.detectChanges();
    expect(row('Inbox').getAttribute('aria-current')).toBe('page');
    expect(row('Inbox').getAttribute('data-active')).toBe('true');
    expect(row('Home').hasAttribute('aria-current')).toBe(false);
    expect(fixture.componentInstance.active()).toBe('Inbox');
    fixture.componentInstance.active.set('Settings');
    fixture.detectChanges();
    expect(row('Settings').getAttribute('aria-current')).toBe('page');
  });

  it('opens the workspace switcher and the user menu with their rows', async () => {
    const { fixture, el } = setup();
    el.querySelector<HTMLElement>('button[aria-label="Switch workspace"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    let rows = Array.from(shownMenus()[0].querySelectorAll<HTMLElement>('[role^="menuitem"]'));
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual(['Acme Inc', 'Personal', 'New workspace']);
    expect(rows[0].getAttribute('aria-checked')).toBe('true');

    // A press outside closes it; then the user menu opens upward.
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    el.querySelector<HTMLElement>('button[aria-label="Open user menu"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const userMenu = shownMenus().find((m) => m.querySelector('[aria-label="Profile"]'))!;
    rows = Array.from(userMenu.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual(['Profile', 'Settings', 'Log out']);
  });

  it('mirrors the rail state on its host so a sibling SidebarInset keys on it', () => {
    const { fixture, el } = setup();
    const host = el.querySelector<HTMLElement>('ff-app-sidebar')!;
    const inset = el.querySelector<HTMLElement>('[data-testid="inset"]')!;
    expect(host.nextElementSibling).toBe(inset);
    expect(host.classList.contains('peer')).toBe(true);
    expect(host.getAttribute('data-variant')).toBe('inset');
    expect(host.getAttribute('data-side')).toBe('left');
    expect(host.getAttribute('data-state')).toBe('expanded');
    fixture.componentInstance.provider().setOpen(false);
    fixture.componentInstance.variant.set('floating');
    fixture.detectChanges();
    expect(host.getAttribute('data-state')).toBe('collapsed');
    expect(host.getAttribute('data-variant')).toBe('floating');
    expect(el.querySelector('ff-sidebar')!.getAttribute('data-variant')).toBe('floating');
  });
});
