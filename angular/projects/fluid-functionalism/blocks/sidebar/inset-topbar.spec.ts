/**
 * SidebarInsetTopbar through its public interface, pinning
 * registry/blocks/sidebar-app/inset-topbar.tsx: the main region's <header>
 * with a SidebarTrigger ahead of the projected content (a title or a
 * breadcrumb), the trigger hiding while the sidebar only peeks and fading
 * back in late after a pin.
 */
import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SidebarProvider } from '../../sidebar-core';
import { SidebarInsetTopbar } from './index';

@Component({
  imports: [SidebarProvider, SidebarInsetTopbar],
  template: `
    <ff-sidebar-provider [persist]="false" peek="click">
      <header ffSidebarInsetTopbar class="border-b" data-testid="topbar">
        <nav aria-label="Breadcrumb" data-testid="crumbs"><span>Workspace</span> / <span>Inbox</span></nav>
      </header>
    </ff-sidebar-provider>
  `,
})
class Host {
  readonly provider = viewChild.required(SidebarProvider);
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => vi.unstubAllGlobals());

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const topbar = el.querySelector<HTMLElement>('[data-testid="topbar"]')!;
  const trigger = topbar.querySelector<HTMLElement>('button[data-sidebar="trigger"]')!;
  return { fixture, el, topbar, trigger, provider: fixture.componentInstance.provider() };
}

describe('SidebarInsetTopbar', () => {
  it('lays out a header row with the trigger ahead of the projected content', () => {
    const { topbar, trigger } = setup();
    expect(topbar.tagName).toBe('HEADER');
    for (const token of ['flex', 'h-12', 'shrink-0', 'items-center', 'gap-2', 'px-1.5', 'border-b']) {
      expect(topbar.classList.contains(token)).toBe(true);
    }
    const crumbs = topbar.querySelector<HTMLElement>('[data-testid="crumbs"]')!;
    expect(crumbs.textContent).toContain('Inbox');
    expect(trigger.compareDocumentPosition(crumbs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(trigger.getAttribute('aria-label')).toBe('Toggle Sidebar');
  });

  it('toggles the sidebar from the trigger', () => {
    const { fixture, trigger, provider } = setup();
    expect(provider.open()).toBe(true);
    trigger.click();
    fixture.detectChanges();
    expect(provider.open()).toBe(false);
    trigger.click();
    fixture.detectChanges();
    expect(provider.open()).toBe(true);
  });

  it('hides the trigger while the sidebar peeks and fades it back in late', () => {
    const { fixture, trigger, provider } = setup();
    for (const token of ['opacity-100', 'transition-opacity', 'delay-200', 'duration-160']) {
      expect(trigger.classList.contains(token)).toBe(true);
    }
    provider.setOpen(false);
    provider.setIsPeeking(true);
    fixture.detectChanges();
    expect(trigger.classList.contains('opacity-0')).toBe(true);
    expect(trigger.classList.contains('opacity-100')).toBe(false);
    provider.setOpen(true);
    fixture.detectChanges();
    expect(trigger.classList.contains('opacity-100')).toBe(true);
  });
});
