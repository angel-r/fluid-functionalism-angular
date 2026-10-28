/**
 * Sidebar and SidebarContent through their public interface, pinning
 * registry/base/sidebar.tsx: the static column (`collapsible="none"`), the
 * offcanvas rail with the `peer` state an inset sibling keys on, the side it
 * registers with the provider, the surface step its content sits on, the
 * scroll region, and the mobile sheet (content inside, Escape / scrim press
 * close it after the exit).
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { SurfaceProvider, injectSurface } from '../core/surface';
import {
  SidebarInset,
  SidebarProvider,
  injectSidebar,
  type SidebarCollapsible,
  type SidebarSide,
  type SidebarVariant,
} from '../sidebar-core';
import { Sidebar, SidebarContent } from './index';

@Component({
  selector: 'test-sidebar-probe',
  template: `<span data-testid="surface">{{ surface() }}</span>`,
})
class Probe {
  readonly sidebar = injectSidebar();
  readonly surface = injectSurface();
}

@Component({
  imports: [SidebarProvider, Sidebar, SidebarContent, SidebarInset, SurfaceProvider, Probe],
  template: `
    <div [ffSurface]="1">
      <ff-sidebar-provider [persist]="false">
        <ff-sidebar
          [side]="side()"
          [variant]="variant()"
          [collapsible]="collapsible()"
          [bordered]="bordered()"
          class="h-full"
          data-testid="sidebar"
        >
          <ff-sidebar-content class="px-1" viewportClass="pb-2">
            <span data-testid="content">Nav</span>
          </ff-sidebar-content>
          <test-sidebar-probe />
        </ff-sidebar>
        <main ffSidebarInset data-testid="inset">Main</main>
      </ff-sidebar-provider>
    </div>
  `,
})
class Host {
  readonly side = signal<SidebarSide>('left');
  readonly variant = signal<SidebarVariant>('sidebar');
  readonly collapsible = signal<SidebarCollapsible>('offcanvas');
  readonly bordered = signal(true);
}

let mobile = false;

beforeEach(() => {
  mobile = false;
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: mobile,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (document.documentElement as { clientWidth?: number }).clientWidth;
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
});

async function setup(configure: (h: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const byId = (id: string) => (document.querySelector(`[data-testid="${id}"]`) ?? el.querySelector(`[data-testid="${id}"]`)) as HTMLElement;
  const provider = fixture.debugElement.query((d) => d.name === 'ff-sidebar-provider').injector.get(SidebarProvider);
  const probe = () => ({ sidebar: provider as Probe['sidebar'] });
  const detect = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, el, byId, probe, detect };
}

describe('Sidebar: static column', () => {
  it('renders an always-open column carrying the peer state', async () => {
    const { byId, el } = await setup((h) => h.collapsible.set('none'));
    const host = byId('sidebar');
    expect(host.getAttribute('data-slot')).toBe('sidebar');
    expect(host.getAttribute('data-variant')).toBe('sidebar');
    expect(host.getAttribute('data-side')).toBe('left');
    expect(host.hasAttribute('data-state')).toBe(false);
    for (const c of ['peer', 'sticky', 'shrink-0', 'flex-col', 'h-full']) expect(host.classList).toContain(c);
    // The user's height wins over the default h-svh (merged, as in React).
    expect(host.classList).not.toContain('h-svh');
    expect(host.style.width).toBe('16rem');
    const column = host.querySelector<HTMLElement>('[data-sidebar="sidebar"]')!;
    expect(column.classList).toContain('border-r');
    expect(column.contains(byId('content'))).toBe(true);
    expect(el.querySelector('ff-sidebar-shell')).toBeNull();
  });

  it('a right column sits last with its border on the inner edge; bordered=false drops it', async () => {
    const { byId, fixture, detect } = await setup((h) => {
      h.collapsible.set('none');
      h.side.set('right');
    });
    expect(byId('sidebar').classList).toContain('order-last');
    const column = () => byId('sidebar').querySelector<HTMLElement>('[data-sidebar="sidebar"]')!;
    expect(column().classList).toContain('border-l');
    fixture.componentInstance.bordered.set(false);
    await detect();
    expect(column().classList).not.toContain('border-l');
  });
});

describe('Sidebar: offcanvas rail', () => {
  it('wraps the rail and mirrors its state on a peer host the inset follows', async () => {
    const { byId, probe, detect } = await setup((h) => h.variant.set('inset'));
    const host = byId('sidebar');
    expect(host.classList).toContain('peer');
    expect(host.classList).toContain('contents');
    expect(host.getAttribute('data-state')).toBe('expanded');
    expect(host.getAttribute('data-variant')).toBe('inset');
    expect(host.getAttribute('data-collapsible')).toBe('');
    // The inset's peer-data-* selectors need the host as an earlier sibling.
    expect(host.nextElementSibling).toBe(byId('inset'));
    const shell = host.querySelector<HTMLElement>('ff-sidebar-shell')!;
    expect(shell.getAttribute('data-variant')).toBe('inset');
    expect(shell.classList).toContain('h-full');
    expect(shell.contains(byId('content'))).toBe(true);

    probe().sidebar.setOpen(false);
    await detect();
    expect(host.getAttribute('data-state')).toBe('collapsed');
    expect(host.getAttribute('data-collapsible')).toBe('offcanvas');
  });

  it('registers its side with the provider', async () => {
    const { probe, detect, fixture } = await setup();
    expect(probe().sidebar.side()).toBe('left');
    expect(probe().sidebar.shortcut()).toBe('[');
    fixture.componentInstance.side.set('right');
    await detect();
    expect(probe().sidebar.side()).toBe('right');
    expect(probe().sidebar.shortcut()).toBe(']');
  });

  it('provides the surface its content sits on: one step up in a floating card', async () => {
    const { byId, fixture, detect } = await setup();
    expect(byId('surface').textContent).toBe('1');
    fixture.componentInstance.variant.set('floating');
    await detect();
    expect(byId('surface').textContent).toBe('2');
    fixture.componentInstance.collapsible.set('none');
    await detect();
    expect(byId('surface').textContent).toBe('1');
  });

  it('paints the floating card one step above the page, not above its own content level', async () => {
    const { el, fixture, detect } = await setup();
    fixture.componentInstance.variant.set('floating');
    await detect();
    const card = el.querySelector<HTMLElement>('ff-sidebar-shell [data-sidebar="sidebar"]')!;
    expect(card.classList).toContain('bg-surface-2');
    expect(card.classList).not.toContain('bg-surface-3');
  });
});

describe('SidebarContent', () => {
  it('scrolls in a ScrollArea with the fade mask and boundary hairline', async () => {
    const { el } = await setup();
    const area = el.querySelector<HTMLElement>('ff-scroll-area')!;
    expect(area.classList).toContain('scroll-divider');
    expect(area.classList).toContain('flex-1');
    expect(area.classList).toContain('px-1');
    const viewport = area.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')!;
    expect(viewport.classList).toContain('scroll-fade');
    expect(viewport.classList).toContain('pb-2');
    const content = area.querySelector<HTMLElement>('[data-sidebar="content"]')!;
    expect(content.classList).toContain('min-w-0');
  });
});

describe('Sidebar: mobile sheet', () => {
  const panel = () => document.querySelector<HTMLElement>('[data-mobile="true"]');

  async function openSheet() {
    mobile = true;
    const ctx = await setup();
    expect(ctx.probe().sidebar.isMobile()).toBe(true);
    ctx.probe().sidebar.setOpenMobile(true);
    await ctx.detect();
    return ctx;
  }

  it('slides the content into a modal sheet two surfaces up', async () => {
    const { byId, el } = await openSheet();
    const sheet = panel()!;
    expect(sheet).not.toBeNull();
    expect(sheet.getAttribute('role')).toBe('dialog');
    expect(sheet.getAttribute('aria-label')).toBe('Sidebar');
    expect(sheet.getAttribute('data-sidebar')).toBe('sidebar');
    expect(sheet.getAttribute('data-side')).toBe('left');
    expect(sheet.style.width).toBe('18rem');
    expect(sheet.classList).toContain('left-0');
    expect(sheet.contains(byId('content'))).toBe(true);
    expect(byId('surface').textContent).toBe('3');
    // The sheet panel itself is painted two steps above the page (1 → 3).
    expect(sheet.classList).toContain('bg-surface-3');
    // Inside the sheet the region scrolls natively.
    expect(sheet.querySelector('ff-scroll-area')).toBeNull();
    expect(sheet.querySelector('[data-sidebar="content"]')!.classList).toContain('overflow-y-auto');
    expect(el.querySelector('ff-sidebar-shell')!.contains(byId('content'))).toBe(false);
  });

  it('Escape closes the sheet after its exit and clears openMobile', async () => {
    const { probe, detect } = await openSheet();
    panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await detect();
    // Held open through the exit, then closed.
    await vi.waitFor(
      async () => {
        await detect();
        expect(panel()).toBeNull();
      },
      { timeout: 2000 },
    );
    expect(probe().sidebar.openMobile()).toBe(false);
  });

  it('a scrim press closes it too', async () => {
    const { probe, detect } = await openSheet();
    document.querySelector<HTMLElement>('[data-slot="sidebar-sheet-backdrop"]')!.click();
    await vi.waitFor(
      async () => {
        await detect();
        expect(panel()).toBeNull();
      },
      { timeout: 2000 },
    );
    expect(probe().sidebar.openMobile()).toBe(false);
  });

  it('a parent-driven close plays the same exit', async () => {
    const { probe, detect } = await openSheet();
    probe().sidebar.setOpenMobile(false);
    await detect();
    await vi.waitFor(
      async () => {
        await detect();
        expect(panel()).toBeNull();
      },
      { timeout: 2000 },
    );
  });
});
