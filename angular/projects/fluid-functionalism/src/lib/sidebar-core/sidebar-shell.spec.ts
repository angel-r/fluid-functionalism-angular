/**
 * SidebarShell (the desktop rail) and SidebarRail through their public
 * interface, pinning registry/default/sidebar-core.tsx: the shell's state
 * attributes and classes (the `peer` the inset keys on, the breakpoint
 * dissolve, the clip), the three variants, the surface step a floating card
 * provides, the rail handle (click to collapse, drag to resize within
 * 160–360px, drag past the slop to collapse), and the collapsed peek (edge
 * strip, overlay card, Escape / outside-press dismissal, hover intent).
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { injectSurface, SurfaceProvider } from '../core/surface';
import { surfaceClasses } from '../core/surface-classes';
import {
  SIDEBAR_COLLAPSE_SLOP,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SidebarProvider,
  SidebarShell,
  injectSidebar,
  type SidebarContextValue,
  type SidebarPeek,
  type SidebarSide,
  type SidebarVariant,
} from './index';

@Component({
  selector: 'test-sidebar-probe',
  template: `<span data-testid="surface">{{ surface() }}</span>`,
})
class Probe {
  readonly sidebar = injectSidebar();
  readonly surface = injectSurface();
}

@Component({
  imports: [SidebarProvider, SidebarShell, Probe, SurfaceProvider],
  template: `
    <div [ffSurface]="substrate()">
      <ff-sidebar-provider [defaultOpen]="defaultOpen()" [peek]="peek()" [mobileBreakpoint]="breakpoint()">
        <ff-sidebar-shell
          data-testid="shell"
          [side]="side()"
          [variant]="variant()"
          [bordered]="bordered()"
          [rail]="rail()"
          [railTooltipOpen]="railTooltipOpen()"
        >
          <span data-testid="content">Nav</span>
          <test-sidebar-probe />
        </ff-sidebar-shell>
        <button type="button" data-testid="outside">Outside</button>
      </ff-sidebar-provider>
    </div>
  `,
})
class Host {
  readonly substrate = signal(1);
  readonly defaultOpen = signal(true);
  readonly peek = signal<SidebarPeek>('none');
  readonly breakpoint = signal(768);
  readonly side = signal<SidebarSide>('left');
  readonly variant = signal<SidebarVariant>('sidebar');
  readonly bordered = signal(true);
  readonly rail = signal(true);
  readonly railTooltipOpen = signal<boolean | undefined>(undefined);
}

let matchMediaMatches = false;

beforeEach(() => {
  matchMediaMatches = false;
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matchMediaMatches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  proto['setPointerCapture'] ??= () => {};
  proto['releasePointerCapture'] ??= () => {};
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (document.documentElement as { clientWidth?: number }).clientWidth;
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
});

function setup(configure: (h: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(s: string) => el.querySelector<T>(s);
  const probe = () => fixture.debugElement.query((d) => d.name === 'test-sidebar-probe')?.componentInstance as Probe | undefined;
  const sidebar = fixture.debugElement.query((d) => d.name === 'ff-sidebar-provider').injector.get(
    SidebarProvider,
  ) as SidebarContextValue;
  const flush = () => fixture.detectChanges();
  const pointer = (target: Element, type: string, init: PointerEventInit = {}) => {
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: 'mouse', ...init }));
    flush();
  };
  return {
    fixture,
    host: fixture.componentInstance,
    shell: () => q('[data-testid="shell"]')!,
    panelCard: () => q('[data-sidebar="sidebar"]'),
    rail: () => q<HTMLButtonElement>('[data-sidebar="rail"]'),
    strip: () => q<HTMLButtonElement>('button[aria-label="Peek sidebar"]'),
    peekCard: () => q('[data-sidebar="peek"]'),
    content: () => q('[data-testid="content"]'),
    outside: () => q('[data-testid="outside"]')!,
    probe,
    sidebar,
    flush,
    pointer,
  };
}

describe('sidebar shell: state and classes', () => {
  it('mirrors the open state into its data attributes', () => {
    const { shell, sidebar, flush } = setup((h) => h.variant.set('floating'));
    expect(shell().getAttribute('data-slot')).toBe('sidebar');
    expect(shell().getAttribute('data-state')).toBe('expanded');
    expect(shell().getAttribute('data-collapsible')).toBe('');
    expect(shell().getAttribute('data-variant')).toBe('floating');
    expect(shell().getAttribute('data-side')).toBe('left');
    sidebar.setOpen(false);
    flush();
    expect(shell().getAttribute('data-state')).toBe('collapsed');
    expect(shell().getAttribute('data-collapsible')).toBe('offcanvas');
  });

  it('is the sticky, clipped peer column with the breakpoint dissolve', () => {
    const { shell } = setup();
    for (const cls of [
      'peer', 'shrink-0', 'sticky', 'top-0', 'h-svh', 'overflow-hidden',
      'transition-[opacity,display]', 'ease-out', '[transition-behavior:allow-discrete]', 'motion-reduce:transition-none',
      'max-md:hidden', 'max-md:opacity-0', 'max-md:duration-160', 'md:duration-240', 'md:starting:opacity-0',
    ]) {
      expect(shell().classList).toContain(cls);
    }
    expect(shell().classList).not.toContain('order-last');
    expect(shell().classList).not.toContain('hidden');
  });

  it('a right sidebar orders last; the inset variant tightens the scroll divider', () => {
    const { shell } = setup((h) => {
      h.side.set('right');
      h.variant.set('inset');
    });
    expect(shell().classList).toContain('order-last');
    expect(shell().classList).toContain('[--scroll-divider-inset:8px]');
  });

  it('a non-standard breakpoint hides the shell from JS when mobile', () => {
    matchMediaMatches = true;
    const { shell, flush } = setup((h) => h.breakpoint.set(900));
    flush();
    expect(shell().classList).toContain('hidden');
    expect(shell().classList).not.toContain('max-md:hidden');
  });
});

describe('sidebar shell: variants', () => {
  it('sidebar: a bordered transparent column on the inner edge', () => {
    const left = setup();
    for (const cls of ['flex', 'h-full', 'w-full', 'min-h-0', 'flex-col', 'border-r', 'border-border']) {
      expect(left.panelCard()!.classList).toContain(cls);
    }
    expect(left.panelCard()!.contains(left.content())).toBe(true);
    left.fixture.destroy();
    const right = setup((h) => h.side.set('right'));
    expect(right.panelCard()!.classList).toContain('border-l');
    right.fixture.destroy();
    const plain = setup((h) => h.bordered.set(false));
    expect(plain.panelCard()!.classList).not.toContain('border-r');
  });

  it('floating: a card one surface step up, inside a gutter', () => {
    const { panelCard, probe } = setup((h) => {
      h.variant.set('floating');
      h.substrate.set(2);
    });
    const card = panelCard()!;
    for (const cls of [...surfaceClasses(3, 3).split(' '), 'rounded-xl']) expect(card.classList).toContain(cls);
    expect(card.parentElement!.classList).toContain('p-2');
    expect(probe()!.surface()).toBe(3);
  });

  it('sidebar and inset content stays on the substrate', () => {
    const { probe, panelCard } = setup((h) => {
      h.variant.set('inset');
      h.substrate.set(2);
    });
    expect(probe()!.surface()).toBe(2);
    expect(panelCard()!.parentElement!.classList).toContain('py-2');
  });
});

describe('sidebar rail', () => {
  it('renders the grab strip by default, and none with rail=false', () => {
    const { rail } = setup();
    const handle = rail()!;
    expect(handle.getAttribute('aria-label')).toBe('Resize or collapse sidebar');
    expect(handle.getAttribute('tabindex')).toBe('-1');
    expect(handle.getAttribute('type')).toBe('button');
    for (const cls of ['absolute', 'inset-y-0', 'z-20', 'w-2', 'cursor-col-resize', 'touch-none', 'right-0', 'after:right-0']) {
      expect(handle.classList).toContain(cls);
    }
    const off = setup((h) => h.rail.set(false));
    expect(off.rail()).toBeNull();
  });

  it('moves onto the card edge in the floating variant and mirrors on the right', () => {
    const floating = setup((h) => h.variant.set('floating'));
    expect(floating.rail()!.classList).toContain('right-1');
    expect(floating.rail()!.classList).toContain('after:right-[3.5px]');
    floating.fixture.destroy();
    // The rail mirrors the side the Sidebar registers on the provider.
    const right = setup((h) => h.side.set('right'));
    right.sidebar.registerSide('right');
    right.flush();
    expect(right.rail()!.classList).toContain('left-0');
    expect(right.rail()!.classList).toContain('after:left-0');
  });

  it('a pinned tooltip explains drag and click with the shortcut, and brightens the edge', () => {
    const { rail } = setup((h) => h.railTooltipOpen.set(true));
    const popup = document.querySelector('[data-slot="tooltip-popup"]')!;
    expect(popup.textContent).toContain('Drag to resize');
    expect(popup.textContent).toContain('Click to collapse');
    expect(popup.querySelector('kbd')!.textContent).toBe('[');
    expect(rail()!.classList).toContain('after:bg-foreground/25');
  });

  it('a press that never drags collapses the sidebar', () => {
    const { rail, pointer, sidebar } = setup();
    pointer(rail()!, 'pointerdown', { clientX: 256 });
    pointer(rail()!, 'pointerup', { clientX: 256 });
    expect(sidebar.open()).toBe(false);
  });

  it('a drag resizes within the clamp, and releases without toggling', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(256);
    const { rail, pointer, sidebar } = setup();
    pointer(rail()!, 'pointerdown', { clientX: 256 });
    pointer(rail()!, 'pointermove', { clientX: 300 });
    expect(sidebar.isResizing()).toBe(true);
    expect(sidebar.width()).toBe('300px');
    pointer(rail()!, 'pointermove', { clientX: 900 });
    expect(sidebar.width()).toBe(`${SIDEBAR_MAX_WIDTH}px`);
    pointer(rail()!, 'pointermove', { clientX: 120 });
    expect(sidebar.width()).toBe(`${SIDEBAR_MIN_WIDTH}px`);
    pointer(rail()!, 'pointerup', { clientX: 120 });
    expect(sidebar.isResizing()).toBe(false);
    expect(sidebar.open()).toBe(true);
  });

  it('dragging past the slop previews the collapse; pulling back re-expands', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(256);
    const { rail, pointer, sidebar } = setup();
    const collapseAt = 256 - (256 - (SIDEBAR_MIN_WIDTH - SIDEBAR_COLLAPSE_SLOP)) - 1;
    pointer(rail()!, 'pointerdown', { clientX: 256 });
    pointer(rail()!, 'pointermove', { clientX: collapseAt });
    expect(sidebar.open()).toBe(false);
    expect(sidebar.width()).toBe(`${SIDEBAR_MIN_WIDTH}px`);
    pointer(rail()!, 'pointermove', { clientX: 200 });
    expect(sidebar.open()).toBe(true);
    pointer(rail()!, 'pointercancel', { clientX: 200 });
    expect(sidebar.isResizing()).toBe(false);
    expect(sidebar.open()).toBe(true);
  });
});

describe('sidebar shell: peek', () => {
  const collapsed = (peek: SidebarPeek) => (h: Host) => {
    h.defaultOpen.set(false);
    h.peek.set(peek);
  };

  it('shows no edge strip while open or with peek="none"', () => {
    expect(setup().strip()).toBeNull();
    expect(setup((h) => h.defaultOpen.set(false)).strip()).toBeNull();
  });

  it('a collapsed click-peek shell swaps the rail for an edge strip and stops clipping', () => {
    const { strip, shell, rail, content } = setup(collapsed('click'));
    expect(strip()).not.toBeNull();
    expect(strip()!.getAttribute('aria-expanded')).toBe('false');
    for (const cls of ['absolute', 'inset-y-0', 'z-40', 'w-3', 'left-0']) expect(strip()!.classList).toContain(cls);
    expect(shell().classList).toContain('z-40');
    expect(shell().classList).not.toContain('overflow-hidden');
    expect(rail()).toBeNull();
    expect(content()).toBeNull();
  });

  it('a strip click floats the sidebar out as a card one step up', () => {
    const { strip, peekCard, content, probe, flush } = setup(collapsed('click'));
    strip()!.click();
    flush();
    const card = peekCard()!;
    expect(card).not.toBeNull();
    expect(card.contains(content())).toBe(true);
    for (const cls of ['absolute', 'inset-y-2', 'z-50', 'flex', 'flex-col', 'overflow-hidden', 'left-0', 'rounded-xl', ...surfaceClasses(2, 3).split(' ')]) {
      expect(card.classList).toContain(cls);
    }
    // jsdom folds the calc() it is given.
    expect(['calc(16rem - 0.5rem)', 'calc(15.5rem)']).toContain(card.style.width);
    expect(strip()!.getAttribute('aria-expanded')).toBe('true');
    expect(probe()!.surface()).toBe(2);
  });

  it('Escape and an outside press dismiss the peek; a press inside keeps it', async () => {
    const { strip, peekCard, content, outside, sidebar, flush, pointer } = setup(collapsed('click'));
    strip()!.click();
    flush();
    pointer(content()!, 'pointerdown');
    expect(sidebar.isPeeking()).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    flush();
    expect(sidebar.isPeeking()).toBe(false);
    // The card plays its exit, then leaves.
    expect(peekCard()).not.toBeNull();
    await vi.waitFor(() => {
      flush();
      expect(peekCard()).toBeNull();
    }, { timeout: 1000 });
    strip()!.click();
    flush();
    pointer(outside(), 'pointerdown');
    expect(sidebar.isPeeking()).toBe(false);
  });

  it('hover-peek arms after the intent delay, for a mouse only', () => {
    vi.useFakeTimers();
    const { strip, sidebar, pointer, flush } = setup(collapsed('hover'));
    pointer(strip()!, 'pointerenter', { bubbles: false, pointerType: 'touch' });
    vi.advanceTimersByTime(200);
    expect(sidebar.isPeeking()).toBe(false);
    pointer(strip()!, 'pointerenter', { bubbles: false });
    vi.advanceTimersByTime(149);
    expect(sidebar.isPeeking()).toBe(false);
    vi.advanceTimersByTime(1);
    flush();
    expect(sidebar.isPeeking()).toBe(true);
  });

  it('pinning from a peek drops the card for the rail and keeps the clip off through the spring', async () => {
    const { strip, peekCard, panelCard, shell, sidebar, flush } = setup(collapsed('click'));
    strip()!.click();
    flush();
    sidebar.setOpen(true);
    flush();
    expect(peekCard()).toBeNull();
    expect(panelCard()).not.toBeNull();
    expect(shell().classList).toContain('z-40');
    await vi.waitFor(() => {
      flush();
      expect(shell().classList).toContain('overflow-hidden');
    }, { timeout: 1000 });
  });
});
