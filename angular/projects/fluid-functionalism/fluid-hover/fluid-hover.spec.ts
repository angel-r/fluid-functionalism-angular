/**
 * Ported from tests/use-fluid-hover-click.test.tsx and
 * tests/fluid-hover-highlight.test.tsx: gap clicks keep the highlight's
 * promise, the hover state is mirrored in the DOM, and the highlight mounts,
 * re-keys and unmounts like the React AnimatePresence version.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  ACTIVE_ATTR,
  ACTIVE_INDEX_ATTR,
  FluidHover,
  FluidHoverItem,
  type ItemRect,
} from './fluid-hover';
import { FluidHoverHighlight, resolveHighlightTransition } from './fluid-hover-highlight';

@Component({
  imports: [FluidHover, FluidHoverItem],
  template: `
    <div
      ffFluidHover
      #list="ffFluidHover"
      [ffFluidHoverGapClick]="gapClick()"
      [ffFluidHoverItemDisabled]="disabled()"
      data-testid="list"
    >
      <input data-testid="search" placeholder="Search" />
      @for (key of keys(); track key; let i = $index) {
        @if (boxed()) {
          <div [ffFluidHoverItem]="i" [attr.data-testid]="'row-' + i">
            <button type="button" (click)="clicks[i]()">Row {{ i }}</button>
          </div>
        } @else {
          <div [ffFluidHoverItem]="i" [attr.data-testid]="'row-' + i" (click)="clicks[i]()">Row {{ i }}</div>
        }
      }
      <span data-testid="gap">gap</span>
    </div>
  `,
})
class List {
  readonly keys = signal(['a', 'b', 'c']);
  readonly boxed = signal(false);
  readonly gapClick = signal<boolean | { maxDistance?: number }>(true);
  readonly disabled = signal<((el: HTMLElement) => boolean) | undefined>(undefined);
  readonly clicks = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
}

function setup(configure: (list: List) => void = () => {}) {
  const fixture = TestBed.createComponent(List);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const controller = fixture.debugElement.children[0].injector.get(FluidHover).controller;
  const get = (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
  const highlight = (index: number | null) => {
    controller.setActiveIndex(index);
    fixture.detectChanges();
  };
  return { fixture, el, get, highlight, controller, clicks: fixture.componentInstance.clicks };
}

describe('fluid hover: gap clicks land on the highlighted row', () => {
  it('a click between rows activates the highlighted row', () => {
    const { get, clicks, highlight } = setup();
    highlight(1);
    get('gap').click();
    expect(clicks[1]).toHaveBeenCalledTimes(1);
    expect(clicks[0]).not.toHaveBeenCalled();
  });

  it('a click on the container itself counts as a gap', () => {
    const { get, clicks, highlight } = setup();
    highlight(2);
    get('list').click();
    expect(clicks[2]).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no row is highlighted', () => {
    const { get, clicks, highlight } = setup();
    highlight(null);
    get('gap').click();
    for (const c of clicks) expect(c).not.toHaveBeenCalled();
  });

  it("a click inside a row is the row's own, not routed", () => {
    const { get, clicks, highlight } = setup();
    highlight(1);
    get('row-0').click();
    expect(clicks[0]).toHaveBeenCalledTimes(1);
    expect(clicks[1]).not.toHaveBeenCalled();
  });

  it('a control between rows keeps its click (the search field)', () => {
    const { get, clicks, highlight } = setup();
    highlight(1);
    get('search').click();
    for (const c of clicks) expect(c).not.toHaveBeenCalled();
  });

  it('never activates a disabled row', () => {
    const { get, clicks, highlight } = setup((l) =>
      l.disabled.set((el) => el.dataset['testid'] === 'row-1'),
    );
    highlight(1);
    get('gap').click();
    for (const c of clicks) expect(c).not.toHaveBeenCalled();
  });

  it('`gapClick: false` leaves empty space inert', () => {
    const { get, clicks, highlight } = setup((l) => l.gapClick.set(false));
    highlight(1);
    get('gap').click();
    for (const c of clicks) expect(c).not.toHaveBeenCalled();
  });

  it('`maxDistance` routes only clicks near the highlighted row', () => {
    const { get, clicks, highlight } = setup((l) => l.gapClick.set({ maxDistance: 10 }));
    highlight(1);
    // jsdom has no layout: every rect is 0x0 at (0,0), so a click at (5,5) is
    // within 10px and a click at (100,100) is not.
    get('gap').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100, clientY: 100 }));
    expect(clicks[1]).not.toHaveBeenCalled();
    get('gap').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 5, clientY: 5 }));
    expect(clicks[1]).toHaveBeenCalledTimes(1);
  });

  it('lands on the control inside a boxed row, so a sidebar link still fires', () => {
    const { get, clicks, highlight } = setup((l) => l.boxed.set(true));
    highlight(0);
    get('gap').click();
    expect(clicks[0]).toHaveBeenCalledTimes(1);
  });
});

describe('fluid hover: the hover state is in the DOM', () => {
  it("marks the highlighted row and the container's index", () => {
    const { get, highlight } = setup();
    highlight(1);
    expect(get('row-1').hasAttribute(ACTIVE_ATTR)).toBe(true);
    expect(get('row-0').hasAttribute(ACTIVE_ATTR)).toBe(false);
    expect(get('list').getAttribute(ACTIVE_INDEX_ATTR)).toBe('1');
  });

  it('moves the mark when the highlight moves, and clears it on null', () => {
    const { get, highlight } = setup();
    highlight(1);
    highlight(2);
    expect(get('row-1').hasAttribute(ACTIVE_ATTR)).toBe(false);
    expect(get('row-2').hasAttribute(ACTIVE_ATTR)).toBe(true);
    expect(get('list').getAttribute(ACTIVE_INDEX_ATTR)).toBe('2');
    highlight(null);
    expect(get('row-2').hasAttribute(ACTIVE_ATTR)).toBe(false);
    expect(get('list').hasAttribute(ACTIVE_INDEX_ATTR)).toBe(false);
  });
});

describe('fluid hover: the highlighted row unregisters', () => {
  it('clears the highlight so nothing stale stays lit or takes a routed click', async () => {
    const { fixture, get, highlight, controller, clicks } = setup();
    highlight(2);
    fixture.componentInstance.keys.set(['a', 'b']);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    expect(controller.activeIndex()).toBeNull();
    expect(get('list').hasAttribute(ACTIVE_INDEX_ATTR)).toBe(false);
    get('gap').click();
    for (const c of clicks) expect(c).not.toHaveBeenCalled();
  });

  it('a row that moves off the highlighted index hands the highlight to the row now there', async () => {
    const { fixture, get, highlight, controller } = setup((l) => l.keys.set(['b', 'c', 'd']));
    highlight(0);
    fixture.componentInstance.keys.set(['a', 'b', 'c', 'd']);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    expect(controller.activeIndex()).toBe(0);
    expect(get('row-0').hasAttribute(ACTIVE_ATTR)).toBe(true);
    expect(get('row-1').hasAttribute(ACTIVE_ATTR)).toBe(false);
  });
});

describe('resolveHighlightTransition', () => {
  it('defaults to spring.fast for position and a 0.08s fade for opacity', () => {
    expect(resolveHighlightTransition(undefined, false)).toEqual({
      type: 'spring',
      duration: 0.08,
      bounce: 0,
      opacity: { duration: 0.08 },
    });
  });

  it('`false` snaps position (a reflow, not a hover) and still fades', () => {
    expect(resolveHighlightTransition(false, false)).toEqual({ duration: 0, opacity: { duration: 0.08 } });
  });

  it('reduced motion drops the travel and keeps the fade', () => {
    expect(resolveHighlightTransition({ type: 'spring', duration: 0.5 }, true)).toEqual({
      duration: 0,
      opacity: { duration: 0.08 },
    });
  });
});

@Component({
  imports: [FluidHoverHighlight],
  template: `<ff-fluid-hover-highlight [rect]="rect()" [session]="session()" [from]="from()" class="rounded-lg z-0" />`,
})
class HighlightHost {
  readonly rect = signal<ItemRect | null>(null);
  readonly session = signal(0);
  readonly from = signal<ItemRect | null>(null);
}

describe('ff-fluid-hover-highlight', () => {
  const row = (top: number): ItemRect => ({ top, left: 0, width: 200, height: 36 });
  const nodes = (el: HTMLElement) => el.querySelectorAll<HTMLElement>('[data-slot="fluid-hover-highlight"]');

  it('renders nothing without a rect', () => {
    const fixture = TestBed.createComponent(HighlightHost);
    fixture.detectChanges();
    expect(nodes(fixture.nativeElement).length).toBe(0);
  });

  it("mounts at the rect and merges the consumer's classes", () => {
    const fixture = TestBed.createComponent(HighlightHost);
    fixture.componentInstance.rect.set(row(40));
    fixture.detectChanges();
    const [node] = nodes(fixture.nativeElement);
    expect(node.className).toBe('pointer-events-none absolute left-0 top-0 bg-hover rounded-lg z-0');
  });

  it('a new session remounts the node, so re-entry fades in fresh', () => {
    const fixture = TestBed.createComponent(HighlightHost);
    fixture.componentInstance.rect.set(row(0));
    fixture.detectChanges();
    const first = nodes(fixture.nativeElement)[0];
    fixture.componentInstance.session.set(1);
    fixture.detectChanges();
    const all = nodes(fixture.nativeElement);
    expect(all[all.length - 1]).not.toBe(first);
  });

  it('the same session keeps the node, so a hover change travels', () => {
    const fixture = TestBed.createComponent(HighlightHost);
    fixture.componentInstance.rect.set(row(0));
    fixture.detectChanges();
    const first = nodes(fixture.nativeElement)[0];
    fixture.componentInstance.rect.set(row(40));
    fixture.detectChanges();
    expect(nodes(fixture.nativeElement).length).toBe(1);
    expect(nodes(fixture.nativeElement)[0]).toBe(first);
  });

  it('unmounts once the rect is gone', async () => {
    const fixture = TestBed.createComponent(HighlightHost);
    fixture.componentInstance.rect.set(row(0));
    fixture.detectChanges();
    fixture.componentInstance.rect.set(null);
    fixture.detectChanges();
    await vi.waitFor(() => expect(nodes(fixture.nativeElement).length).toBe(0), { timeout: 1000 });
  });
});

