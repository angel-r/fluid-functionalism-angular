/**
 * ScrollArea through its public interface. jsdom has no layout, so element
 * sizes are stubbed per `data-slot`; the area re-measures on scroll like it
 * does in a browser. Covers the desktop path (hidden native scrollbar, a
 * hover/scroll-revealed thumb sized and placed from the scroll metrics, thumb
 * drag and track clicks) and the touch-primary path (native overflow, no
 * custom scrollbar), plus the attribute pass-through the upstream omit test
 * checks.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { TouchPrimary } from '../core/environment';
import { popupViewportClass } from '../core/popup';
import { ScrollArea } from './scroll-area';

@Component({
  imports: [ScrollArea],
  template: `
    <ff-scroll-area
      data-testid="area"
      aria-label="List"
      class="h-56 w-64"
      [orientation]="orientation()"
      [viewportClass]="viewportClass()"
    >
      <p data-testid="row">Row</p>
    </ff-scroll-area>
  `,
})
class Host {
  readonly orientation = signal<'vertical' | 'horizontal' | 'both'>('vertical');
  readonly viewportClass = signal('scroll-fade');
}

/** Layout stubs: [client, scroll] per axis for the viewport, and the
 *  scrollbars' track lengths. */
const layout = {
  viewport: { clientHeight: 100, scrollHeight: 100, clientWidth: 200, scrollWidth: 200 },
  track: 100,
  thickness: 10,
};

function slotOf(el: Element) {
  return el.getAttribute('data-slot');
}

beforeEach(() => {
  layout.viewport = { clientHeight: 100, scrollHeight: 100, clientWidth: 200, scrollWidth: 200 };
  const proto = HTMLElement.prototype;
  const stub = (key: 'clientHeight' | 'scrollHeight' | 'clientWidth' | 'scrollWidth' | 'offsetWidth' | 'offsetHeight') =>
    vi.spyOn(proto, key, 'get').mockImplementation(function (this: HTMLElement) {
      const slot = slotOf(this);
      if (slot === 'scroll-area-viewport') {
        if (key === 'offsetWidth' || key === 'offsetHeight') return 0;
        return layout.viewport[key];
      }
      if (slot === 'scroll-area-scrollbar') {
        const vertical = this.getAttribute('data-orientation') === 'vertical';
        if (key === 'clientHeight' || key === 'offsetHeight') return vertical ? layout.track : layout.thickness;
        if (key === 'clientWidth' || key === 'offsetWidth') return vertical ? layout.thickness : layout.track;
      }
      return 0;
    });
  stub('clientHeight');
  stub('scrollHeight');
  stub('clientWidth');
  stub('scrollWidth');
  stub('offsetWidth');
  stub('offsetHeight');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function setup(configure: (host: Host) => void = () => {}, touch = false) {
  const touchValue = signal(touch);
  TestBed.configureTestingModule({
    providers: [{ provide: TouchPrimary, useValue: { value: touchValue.asReadonly() } }],
  });
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const root = el.querySelector<HTMLElement>('[data-testid="area"]')!;
  const viewport = () => root.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')!;
  const scrollbar = (o: 'vertical' | 'horizontal') =>
    root.querySelector<HTMLElement>(`[data-slot="scroll-area-scrollbar"][data-orientation="${o}"]`);
  const thumb = (o: 'vertical' | 'horizontal') => scrollbar(o)?.querySelector<HTMLElement>('[data-slot="scroll-area-thumb"]') ?? null;
  /** Scroll the viewport and let the area re-measure, as a browser would. */
  const scroll = (top: number, left = 0) => {
    viewport().scrollTop = top;
    viewport().scrollLeft = left;
    viewport().dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
  };
  return { fixture, host: fixture.componentInstance, root, viewport, scrollbar, thumb, scroll, touchValue };
}

describe('ScrollArea: desktop structure', () => {
  it('renders root, viewport and sizer with the React classes, and passes attributes through', () => {
    const { root, viewport } = setup();
    expect(root.getAttribute('data-slot')).toBe('scroll-area');
    expect(root.getAttribute('aria-label')).toBe('List');
    for (const c of ['relative', 'overflow-hidden', 'h-56', 'w-64']) expect(root.classList).toContain(c);
    expect(root.hasAttribute('role')).toBe(false);
    const vp = viewport();
    for (const c of ['size-full', 'rounded-[inherit]', 'scroll-fade']) expect(vp.classList).toContain(c);
    // The native scrollbar is hidden; the viewport still scrolls.
    expect(vp.style.overflow).toBe('scroll');
    const sizer = vp.firstElementChild as HTMLElement;
    expect(sizer.tagName).toBe('DIV');
    expect(sizer.getAttribute('style')).toContain('min-width: fit-content');
    expect(sizer.querySelector('[data-testid="row"]')).not.toBeNull();
  });

  it('keeps the popup viewport sizing classes', () => {
    const { viewport } = setup((h) => h.viewportClass.set(popupViewportClass));
    expect(viewport().className).toContain('max-h-[inherit]');
    expect(viewport().className).toContain('[&>div[style]]:!block');
  });

  it('renders no scrollbar while nothing overflows', () => {
    const { scrollbar, scroll } = setup();
    scroll(0);
    expect(scrollbar('vertical')).toBeNull();
    expect(scrollbar('horizontal')).toBeNull();
  });
});

describe('ScrollArea: scrollbar', () => {
  it('mounts the vertical scrollbar once content overflows, with the shape-system classes', () => {
    const { scrollbar, thumb, scroll, root } = setup();
    layout.viewport.scrollHeight = 400;
    scroll(0);
    const bar = scrollbar('vertical')!;
    expect(bar).not.toBeNull();
    for (const c of ['group/scrollbar', 'absolute', 'z-20', 'flex', 'touch-none', 'select-none', 'opacity-0', 'top-0', 'right-0', 'h-full', 'w-2.5']) {
      expect(bar.classList).toContain(c);
    }
    expect(bar.className).toContain('data-[hovering]:opacity-100');
    const t = thumb('vertical')!;
    for (const c of ['relative', 'rounded-lg', 'w-1', 'h-[var(--scroll-area-thumb-height)]', 'group-hover/scrollbar:w-1.5']) {
      expect(t.classList).toContain(c);
    }
    expect(root.hasAttribute('data-has-overflow-y')).toBe(true);
    // Vertical only by default.
    expect(scrollbar('horizontal')).toBeNull();
  });

  it('sizes the thumb to the visible fraction and places it by the scroll position', () => {
    const { scrollbar, thumb, scroll } = setup();
    layout.viewport.scrollHeight = 400;
    scroll(150);
    expect(scrollbar('vertical')!.style.getPropertyValue('--scroll-area-thumb-height')).toBe('25px');
    // 150 of 300 scrollable px: halfway along the 75px of free track.
    expect(thumb('vertical')!.style.transform).toBe('translate3d(0px, 37.5px, 0px)');
  });

  it('never shrinks the thumb below 16px', () => {
    const { scrollbar, scroll } = setup();
    layout.viewport.scrollHeight = 10000;
    scroll(0);
    expect(scrollbar('vertical')!.style.getPropertyValue('--scroll-area-thumb-height')).toBe('16px');
  });

  it('shows on hover: data-hovering follows the pointer over the area', () => {
    const { root, scrollbar, scroll, fixture } = setup();
    layout.viewport.scrollHeight = 400;
    scroll(0);
    root.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(scrollbar('vertical')!.hasAttribute('data-hovering')).toBe(true);
    root.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(scrollbar('vertical')!.hasAttribute('data-hovering')).toBe(false);
  });

  it('shows while scrolling: data-scrolling clears once scrolling stops', () => {
    vi.useFakeTimers();
    const { scrollbar, scroll, fixture } = setup();
    layout.viewport.scrollHeight = 400;
    scroll(0);
    scroll(40);
    expect(scrollbar('vertical')!.hasAttribute('data-scrolling')).toBe(true);
    vi.advanceTimersByTime(600);
    fixture.detectChanges();
    expect(scrollbar('vertical')!.hasAttribute('data-scrolling')).toBe(false);
  });

  it('dragging the thumb scrolls the viewport proportionally', () => {
    const { thumb, scroll, viewport, fixture } = setup();
    layout.viewport.scrollHeight = 400;
    scroll(0);
    const t = thumb('vertical')!;
    t.dispatchEvent(new PointerEvent('pointerdown', { clientY: 0, button: 0, bubbles: true }));
    t.dispatchEvent(new PointerEvent('pointermove', { clientY: 10, bubbles: true }));
    fixture.detectChanges();
    // 10px of thumb travel over 75px of free track maps to 300 scrollable px.
    expect(viewport().scrollTop).toBe(40);
    t.dispatchEvent(new PointerEvent('pointerup', { clientY: 10, bubbles: true }));
    t.dispatchEvent(new PointerEvent('pointermove', { clientY: 50, bubbles: true }));
    expect(viewport().scrollTop).toBe(40);
  });

  it('a click on the track jumps so the thumb centers on the pointer', () => {
    const { scrollbar, scroll, viewport } = setup();
    layout.viewport.scrollHeight = 400;
    scroll(0);
    scrollbar('vertical')!.dispatchEvent(new PointerEvent('pointerdown', { clientY: 50, button: 0, bubbles: true }));
    expect(viewport().scrollTop).toBe(150);
  });

  it('a wheel over the scrollbar scrolls the viewport', () => {
    const { scrollbar, scroll, viewport } = setup();
    layout.viewport.scrollHeight = 400;
    scroll(0);
    scrollbar('vertical')!.dispatchEvent(new WheelEvent('wheel', { deltaY: 30, bubbles: true, cancelable: true }));
    expect(viewport().scrollTop).toBe(30);
  });
});

describe('ScrollArea: orientation', () => {
  it('horizontal shows only the horizontal scrollbar', () => {
    const { scrollbar, thumb, scroll } = setup((h) => h.orientation.set('horizontal'));
    layout.viewport.scrollHeight = 400;
    layout.viewport.scrollWidth = 800;
    scroll(0);
    expect(scrollbar('vertical')).toBeNull();
    const bar = scrollbar('horizontal')!;
    for (const c of ['bottom-0', 'left-0', 'h-2.5', 'w-full', 'flex-col']) expect(bar.classList).toContain(c);
    expect(thumb('horizontal')!.classList).toContain('w-[var(--scroll-area-thumb-width)]');
    expect(bar.style.getPropertyValue('--scroll-area-thumb-width')).toBe('25px');
  });

  it('both shows both scrollbars and the corner', () => {
    const { scrollbar, scroll, root } = setup((h) => h.orientation.set('both'));
    layout.viewport.scrollHeight = 400;
    layout.viewport.scrollWidth = 800;
    scroll(0);
    expect(scrollbar('vertical')).not.toBeNull();
    expect(scrollbar('horizontal')).not.toBeNull();
    expect(root.querySelector('[data-slot="scroll-area-corner"]')).not.toBeNull();
  });
});

describe('ScrollArea: touch-primary devices', () => {
  it('uses native overflow scrolling with no custom scrollbar', () => {
    const { root, viewport, scrollbar, scroll } = setup(() => {}, true);
    expect(root.getAttribute('role')).toBe('group');
    expect(root.getAttribute('aria-roledescription')).toBe('scroll area');
    expect(root.getAttribute('data-slot')).toBe('scroll-area');
    const vp = viewport();
    for (const c of ['size-full', 'rounded-[inherit]', 'overflow-y-auto', 'scroll-fade']) expect(vp.classList).toContain(c);
    expect(vp.getAttribute('tabindex')).toBe('0');
    expect(vp.getAttribute('style')).toBeNull();
    // No sizer: the content sits directly in the viewport.
    expect((vp.firstElementChild as HTMLElement).getAttribute('data-testid')).toBe('row');
    layout.viewport.scrollHeight = 400;
    scroll(0);
    expect(scrollbar('vertical')).toBeNull();
  });

  it('maps each orientation to its native overflow axis', () => {
    const { viewport, host, fixture } = setup(() => {}, true);
    host.orientation.set('horizontal');
    fixture.detectChanges();
    expect(viewport().classList).toContain('overflow-x-auto');
    host.orientation.set('both');
    fixture.detectChanges();
    expect(viewport().classList).toContain('overflow-auto');
  });

  it('keeps its content when the pointer mode changes', () => {
    const { root, touchValue, fixture, viewport } = setup();
    touchValue.set(true);
    fixture.detectChanges();
    expect(root.getAttribute('role')).toBe('group');
    expect(viewport().querySelector('[data-testid="row"]')).not.toBeNull();
    touchValue.set(false);
    fixture.detectChanges();
    expect(root.hasAttribute('role')).toBe(false);
    expect(viewport().querySelector('[data-testid="row"]')).not.toBeNull();
  });
});
