/**
 * SidebarWorkspaceHeader and WorkspaceTile through their public interface,
 * pinning registry/blocks/sidebar-workspace-header.tsx: the switcher row (a
 * menu row whose button opens the workspace dropdown on the sidebar menu
 * grid, with the checked row forwarded), the non-interactive lockup when no
 * menu is given, the peek cross-fade between the tile and a SidebarTrigger,
 * and the tile's shape-following corners.
 */
import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ShapeProvider, type ShapeVariant } from '../../core/shape';
import { SidebarProvider } from '../../sidebar-core';
import { MenuItem } from '../../menu-item';
import { SIDEBAR_MENU_POPUP } from '../../sidebar-menu';
import { SidebarBlockMenu, SidebarWorkspaceHeader, WorkspaceTile } from './index';

@Component({
  imports: [SidebarProvider, SidebarWorkspaceHeader, WorkspaceTile, SidebarBlockMenu, MenuItem],
  template: `
    <ff-sidebar-provider [persist]="false" [defaultOpen]="false" peek="click">
      <ff-sidebar-workspace-header name="Acme Inc" [checkedIndex]="0">
        <span ffWorkspaceTile data-testid="tile">A</span>
        <ng-template ffSidebarBlockMenu>
          <ff-menu-item [index]="0" label="Acme Inc" [checked]="true" (select)="picked('Acme Inc')" />
          <ff-menu-item [index]="1" label="Personal" (select)="picked('Personal')" />
        </ng-template>
      </ff-sidebar-workspace-header>
    </ff-sidebar-provider>
  `,
})
class Switcher {
  readonly provider = viewChild.required(SidebarProvider);
  readonly picked = vi.fn();
}

@Component({
  imports: [SidebarProvider, SidebarWorkspaceHeader, WorkspaceTile],
  template: `
    <ff-sidebar-provider [persist]="false" [defaultOpen]="false" peek="click">
      <ff-sidebar-workspace-header name="Acme Inc">
        <span ffWorkspaceTile data-testid="tile">A</span>
      </ff-sidebar-workspace-header>
    </ff-sidebar-provider>
  `,
})
class Lockup {
  readonly provider = viewChild.required(SidebarProvider);
}

@Component({
  imports: [ShapeProvider, WorkspaceTile],
  template: `
    <div ffShapeProvider [defaultShape]="shape()">
      <span ffWorkspaceTile class="extra" data-testid="tile">A</span>
    </div>
  `,
})
class Tile {
  readonly shape = signal<ShapeVariant>('rounded');
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

/** The popup menus currently shown (closed popups sit hidden in place). */
function shownMenus() {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]')).filter(
    (m) => m.closest<HTMLElement>('[data-slot="dropdown-positioner"]')?.style.display !== 'none',
  );
}

function render<T>(type: new () => T) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('SidebarWorkspaceHeader: switcher', () => {
  it('renders a Workspace menu whose row button opens the switcher', async () => {
    const { fixture, el } = render(Switcher);
    const menu = el.querySelector<HTMLElement>('ul[aria-label="Workspace"]')!;
    expect(menu).not.toBeNull();
    expect(menu.classList.contains('@container')).toBe(true);
    const button = menu.querySelector<HTMLElement>('button[aria-label="Switch workspace"]')!;
    expect(button.getAttribute('data-sidebar')).toBe('menu-button');
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.classList.contains('pl-8')).toBe(true);
    expect(button.textContent).toContain('Acme Inc');
    // The tile sits in an aria-hidden leading slot inside the row button.
    const tile = el.querySelector<HTMLElement>('[data-testid="tile"]')!;
    expect(button.contains(tile)).toBe(true);
    expect(tile.parentElement!.getAttribute('aria-hidden')).toBe('true');
    // Trailing chevron, hidden once the row is too narrow (@container).
    const chevron = button.querySelector('svg.lucide-chevron-down')!;
    expect(chevron.closest('span')!.classList.contains('@max-[7rem]:hidden')).toBe(true);

    expect(shownMenus()).toHaveLength(0);
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(shownMenus()).toHaveLength(1);
  });

  it('puts the menu rows on the sidebar menu grid with the checked row forwarded', async () => {
    const { fixture, el } = render(Switcher);
    el.querySelector<HTMLElement>('button[aria-label="Switch workspace"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const [menu] = shownMenus();
    for (const token of SIDEBAR_MENU_POPUP.split(' ')) expect(menu.classList.contains(token)).toBe(true);
    const rows = Array.from(menu.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual(['Acme Inc', 'Personal']);
    expect(rows[0].getAttribute('role')).toBe('menuitemradio');
    // A radio row is checked when its index is the forwarded checkedIndex.
    expect(rows[0].getAttribute('aria-checked')).toBe('true');
    expect(rows[1].getAttribute('aria-checked')).not.toBe('true');
  });

  it('runs the picked row and closes the switcher', async () => {
    const { fixture, el } = render(Switcher);
    const button = el.querySelector<HTMLElement>('button[aria-label="Switch workspace"]')!;
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    shownMenus()[0].querySelector<HTMLElement>('[aria-label="Personal"]')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.picked).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.picked).toHaveBeenCalledWith('Personal');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('SidebarWorkspaceHeader: lockup', () => {
  it('renders a non-interactive logo lockup outside any menu when no menu is given', () => {
    const { el } = render(Lockup);
    expect(el.querySelector('ul')).toBeNull();
    expect(el.querySelector('[aria-haspopup]')).toBeNull();
    const tile = el.querySelector<HTMLElement>('[data-testid="tile"]')!;
    const row = tile.parentElement!.parentElement!;
    for (const token of ['relative', 'flex', 'h-8', 'items-center', 'pl-8', 'pr-2']) {
      expect(row.classList.contains(token)).toBe(true);
    }
    expect(row.textContent).toContain('Acme Inc');
  });
});

describe('SidebarWorkspaceHeader: peek cross-fade', () => {
  for (const [name, type] of [
    ['switcher', Switcher],
    ['lockup', Lockup],
  ] as const) {
    it(`swaps the tile for a sidebar trigger while peeking (${name})`, () => {
      const { fixture, el } = render(type as new () => Switcher | Lockup);
      const tileSlot = el.querySelector<HTMLElement>('[data-testid="tile"]')!.parentElement!;
      const triggerHost = el.querySelector<HTMLElement>('ff-sidebar-trigger')!;
      const trigger = triggerHost.querySelector<HTMLElement>('button[data-sidebar="trigger"]')!;

      // At rest the tile shows and the trigger is out of reach.
      expect(tileSlot.classList.contains('opacity-100')).toBe(true);
      expect(trigger.classList.contains('opacity-0')).toBe(true);
      expect(trigger.classList.contains('pointer-events-none')).toBe(true);
      expect(triggerHost.getAttribute('aria-hidden')).toBe('true');
      expect(triggerHost.hasAttribute('inert')).toBe(true);
      // No hover fill behind the glyph, a 16px glyph, positioned over the slot.
      for (const token of ['[&>span:first-child]:hidden', '[&_svg]:size-4', 'absolute', 'left-1']) {
        expect(trigger.classList.contains(token)).toBe(true);
      }

      fixture.componentInstance.provider().setIsPeeking(true);
      fixture.detectChanges();
      expect(tileSlot.classList.contains('opacity-0')).toBe(true);
      expect(trigger.classList.contains('opacity-100')).toBe(true);
      expect(trigger.classList.contains('pointer-events-none')).toBe(false);
      expect(triggerHost.hasAttribute('aria-hidden')).toBe(false);
      expect(triggerHost.hasAttribute('inert')).toBe(false);

      // The peek trigger pins the sidebar open.
      trigger.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.provider().open()).toBe(true);
    });
  }
});

describe('WorkspaceTile', () => {
  it('draws a 20px semibold letter tile with rounded-md corners on the rounded shape', () => {
    const { el } = render(Tile);
    const tile = el.querySelector<HTMLElement>('[data-testid="tile"]')!;
    for (const token of ['flex', 'size-5', 'shrink-0', 'bg-foreground', 'text-background', 'rounded-md', 'extra']) {
      expect(tile.classList.contains(token)).toBe(true);
    }
    expect(tile.style.fontVariationSettings).toContain('550');
  });

  it('turns fully round on the pill shape', () => {
    const { fixture, el } = render(Tile);
    fixture.componentInstance.shape.set('pill');
    fixture.detectChanges();
    const tile = el.querySelector<HTMLElement>('[data-testid="tile"]')!;
    expect(tile.classList.contains('rounded-full')).toBe(true);
    expect(tile.classList.contains('rounded-md')).toBe(false);
  });
});
