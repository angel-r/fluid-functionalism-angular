// Scroll area — shape-system scrollbar, native overflow fallback on
// touch-primary devices. Scrollbar machinery adapted from Lina by SameerJS6
// (https://lina.sameer.sh). The React version builds on
// @base-ui/react/scroll-area; Angular has no such primitive, so this file
// carries the same contract by hand: the native scrollbar is hidden, the
// scrollbars stay mounted while their axis overflows and expose hover/scroll
// state as `data-hovering` / `data-scrolling`, and the thumb is sized through
// `--scroll-area-thumb-height` / `--scroll-area-thumb-width`.

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { cn, injectShape, injectTouchPrimary } from '@angel-r/fluid-functionalism-angular/core';

export type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both';
type Axis = 'vertical' | 'horizontal';

/** Smallest thumb length, in px, however long the content gets. */
const MIN_THUMB_SIZE = 16;
/** Radix's floor (`getThumbSize`). */
const MIN_TRACK_THUMB_SIZE = 18;
/** How long `data-scrolling` outlives the last scroll event, in ms. */
const SCROLL_TIMEOUT = 500;

interface ScrollMetrics {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
  clientWidth: number;
  scrollWidth: number;
  scrollLeft: number;
}

const emptyMetrics: ScrollMetrics = {
  clientHeight: 0,
  scrollHeight: 0,
  scrollTop: 0,
  clientWidth: 0,
  scrollWidth: 0,
  scrollLeft: 0,
};

/** Sum of an element's computed start + end lengths for one axis. */
function edges(element: Element, box: 'margin' | 'padding', axis: Axis) {
  const style = getComputedStyle(element);
  const [start, end] = axis === 'vertical' ? ['Top', 'Bottom'] : ['Left', 'Right'];
  return (parseFloat(style.getPropertyValue(`${box}-${start.toLowerCase()}`)) || 0) +
    (parseFloat(style.getPropertyValue(`${box}-${end.toLowerCase()}`)) || 0);
}

/** Thumb length and offset for one axis: the visible fraction of the free track. */
function thumbGeometry(track: number, client: number, scroll: number, position: number, min = MIN_THUMB_SIZE) {
  const range = scroll - client;
  const size = Math.min(track, Math.max(min, scroll > 0 ? (client / scroll) * track : track));
  const free = track - size;
  const offset = range > 0 ? (Math.min(Math.max(position, 0), range) / range) * free : 0;
  return { size, offset, free, range };
}

/**
 * One scrollbar of a ScrollArea. The area renders these itself (per
 * `orientation`); exported for parity with the React `ScrollBar`. On
 * touch-primary devices it renders nothing.
 */
@Component({
  selector: 'ff-scroll-bar',
  host: {
    'data-slot': 'scroll-area-scrollbar',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-hovering]': 'area.hovering() ? "" : null',
    '[attr.data-scrolling]': 'scrolling() ? "" : null',
    '[class]': 'hostClass()',
    '[style.display]': 'visible() ? null : "none"',
    '(pointerdown)': 'onTrackPointerDown($event)',
    '(wheel)': 'onWheel($event)',
  },
  template: `
    <div
      #thumb
      data-slot="scroll-area-thumb"
      [attr.data-orientation]="orientation()"
      [class]="thumbClass()"
      (pointerdown)="onThumbPointerDown($event)"
      (pointermove)="onThumbPointerMove($event)"
      (pointerup)="onThumbPointerUp($event)"
      (pointercancel)="onThumbPointerUp($event)"
    ></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollBar {
  readonly orientation = input<Axis>('vertical');
  readonly userClass = input('', { alias: 'class' });

  protected readonly area = inject(ScrollArea);
  private readonly shape = injectShape();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly thumb = viewChild.required<ElementRef<HTMLElement>>('thumb');
  private drag: { pointer: number; scroll: number } | null = null;

  protected readonly visible = computed(() => !this.area.isTouch() && this.area.hasOverflow(this.orientation()));
  protected readonly scrolling = computed(() =>
    this.orientation() === 'vertical' ? this.area.scrollingY() : this.area.scrollingX(),
  );

  // The scrollbar stays mounted while scrollable; visibility is a plain
  // opacity transition off its hover/scroll state attributes, matching the cue
  // fade — 160ms in, 120ms out (exits faster, per the animation guidelines);
  // spring tokens are Motion configs and don't apply here.
  protected readonly hostClass = computed(() => {
    const orientation = this.orientation();
    return cn(
      // The 10px track stays as a comfortable hit target; the thumb inside
      // it rests narrow and low-contrast, then widens + darkens on hover so
      // it gets out of the way until you reach for it.
      'group/scrollbar absolute z-20 flex touch-none select-none',
      // Show immediately; on hide, wait out the 160ms thumb shrink before
      // fading so the thumb visibly narrows back first instead of the fade
      // masking it.
      'opacity-0 transition-opacity duration-120 ease-out delay-160',
      'data-[hovering]:duration-160 data-[scrolling]:duration-160',
      'data-[hovering]:opacity-100 data-[scrolling]:opacity-100',
      'data-[hovering]:delay-0 data-[scrolling]:delay-0',
      orientation === 'vertical' && 'top-0 right-0 h-full w-2.5',
      orientation === 'horizontal' && 'bottom-0 left-0 h-2.5 w-full flex-col',
      this.userClass(),
    );
  });

  protected readonly thumbClass = computed(() => {
    const orientation = this.orientation();
    return cn(
      // Fixed surface-relative overlay ramp (8 → 12 → 16%) — same tint
      // direction as the menu hover/active tokens, one notch stronger.
      'relative bg-[rgb(var(--overlay)/0.08)] transition-[background-color,width,height] duration-160 ease-in-out',
      'group-hover/scrollbar:bg-[rgb(var(--overlay)/0.12)] active:!bg-[rgb(var(--overlay)/0.16)]',
      this.shape().bg,
      // -translate nudges the thumb 2px off the container edge; the track
      // (and its 10px hit target) stays flush so edge-throws still land.
      orientation === 'vertical' &&
        'mx-auto my-1 w-1 -translate-x-0.5 h-[var(--scroll-area-thumb-height)] group-hover/scrollbar:w-1.5',
      orientation === 'horizontal' &&
        'my-auto mx-1 h-1 -translate-y-0.5 w-[var(--scroll-area-thumb-width)] group-hover/scrollbar:h-1.5',
    );
  });

  constructor() {
    // Size and place the thumb from the latest metrics, after the DOM settled.
    afterRenderEffect(() => {
      const metrics = this.area.metrics();
      const orientation = this.orientation();
      if (!this.visible()) return;
      const thumb = this.thumb().nativeElement;
      const { size, offset } = this.geometry(metrics, orientation, thumb);
      if (orientation === 'vertical') {
        this.host.style.setProperty('--scroll-area-thumb-height', `${size}px`);
        thumb.style.transform = `translate3d(0px, ${offset}px, 0px)`;
      } else {
        this.host.style.setProperty('--scroll-area-thumb-width', `${size}px`);
        thumb.style.transform = `translate3d(${offset}px, 0px, 0px)`;
      }
    });
  }

  private geometry(metrics: ScrollMetrics, orientation: Axis, thumb: HTMLElement) {
    const vertical = orientation === 'vertical';
    const length = vertical ? this.host.clientHeight : this.host.clientWidth;
    const inset = this.area.thumbSizing() === 'inset';
    const margins = inset ? edges(thumb, 'margin', orientation) : 0;
    const track = Math.max(0, length - edges(this.host, 'padding', orientation) - margins);
    const min = inset ? MIN_THUMB_SIZE : MIN_TRACK_THUMB_SIZE;
    return vertical
      ? thumbGeometry(track, metrics.clientHeight, metrics.scrollHeight, metrics.scrollTop, min)
      : thumbGeometry(track, metrics.clientWidth, metrics.scrollWidth, metrics.scrollLeft, min);
  }

  private pointerPosition(event: PointerEvent) {
    return this.orientation() === 'vertical' ? event.clientY : event.clientX;
  }

  /** A press on the track (not the thumb) jumps so the thumb centers on it. */
  protected onTrackPointerDown(event: PointerEvent) {
    if (event.button !== 0 || event.target !== this.host) return;
    const viewport = this.area.viewportElement();
    if (!viewport) return;
    const orientation = this.orientation();
    const vertical = orientation === 'vertical';
    const thumb = this.thumb().nativeElement;
    const { size, free, range } = this.geometry(this.area.readMetrics(), orientation, thumb);
    if (free <= 0) return;
    const rect = this.host.getBoundingClientRect();
    const start = (vertical ? rect.top : rect.left) + edges(this.host, 'padding', orientation) / 2 +
      edges(thumb, 'margin', orientation) / 2;
    const thumbStart = Math.min(Math.max(this.pointerPosition(event) - start - size / 2, 0), free);
    const next = (thumbStart / free) * range;
    if (vertical) viewport.scrollTop = next;
    else viewport.scrollLeft = next;
    this.area.refresh();
  }

  protected onThumbPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const viewport = this.area.viewportElement();
    if (!viewport) return;
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.drag = {
      pointer: this.pointerPosition(event),
      scroll: this.orientation() === 'vertical' ? viewport.scrollTop : viewport.scrollLeft,
    };
  }

  protected onThumbPointerMove(event: PointerEvent) {
    const viewport = this.area.viewportElement();
    if (!this.drag || !viewport) return;
    const orientation = this.orientation();
    const { free, range } = this.geometry(this.area.readMetrics(), orientation, this.thumb().nativeElement);
    if (free <= 0) return;
    const next = this.drag.scroll + ((this.pointerPosition(event) - this.drag.pointer) * range) / free;
    if (orientation === 'vertical') viewport.scrollTop = next;
    else viewport.scrollLeft = next;
    this.area.refresh();
  }

  protected onThumbPointerUp(event: PointerEvent) {
    if (!this.drag) return;
    this.drag = null;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
  }

  /** The scrollbar overlays the viewport, so a wheel over it scrolls the viewport. */
  protected onWheel(event: WheelEvent) {
    const viewport = this.area.viewportElement();
    if (!viewport) return;
    const vertical = this.orientation() === 'vertical';
    const delta = vertical ? event.deltaY : event.deltaX;
    if (!delta) return;
    const before = vertical ? viewport.scrollTop : viewport.scrollLeft;
    if (vertical) viewport.scrollTop = before + delta;
    else viewport.scrollLeft = before + delta;
    const after = vertical ? viewport.scrollTop : viewport.scrollLeft;
    if (after !== before) {
      event.preventDefault();
      this.area.refresh();
    }
  }
}

@Component({
  selector: 'ff-scroll-area',
  imports: [NgTemplateOutlet, ScrollBar],
  host: {
    'data-slot': 'scroll-area',
    '[class]': 'hostClass()',
    '[attr.role]': 'isTouch() ? "group" : null',
    '[attr.aria-roledescription]': 'isTouch() ? "scroll area" : null',
    '[attr.data-has-overflow-x]': '!isTouch() && hasOverflowX() ? "" : null',
    '[attr.data-has-overflow-y]': '!isTouch() && hasOverflowY() ? "" : null',
    '[attr.data-scrolling]': '!isTouch() && (scrollingX() || scrollingY()) ? "" : null',
    '[style.--scroll-area-corner-width]': "(showCorner() ? cornerSize().width : 0) + 'px'",
    '[style.--scroll-area-corner-height]': "(showCorner() ? cornerSize().height : 0) + 'px'",
    '(pointerenter)': 'onPointerOver($event)',
    '(pointermove)': 'onPointerOver($event)',
    '(pointerleave)': 'hovering.set(false)',
  },
  styles: `
    .ff-scroll-area-viewport::-webkit-scrollbar {
      display: none;
    }
  `,
  template: `
    <ng-template #children><ng-content /></ng-template>
    @if (isTouch()) {
      <!-- On touch-primary devices the custom machinery is skipped entirely
           in favour of native overflow scrolling (better physics, momentum,
           rubber-banding). -->
      <div data-slot="scroll-area-viewport" [class]="touchViewportClass()" tabindex="0">
        <ng-container [ngTemplateOutlet]="children" />
      </div>
    } @else {
      <div
        #viewport
        data-slot="scroll-area-viewport"
        [class]="viewportClassName()"
        style="overflow: scroll; scrollbar-width: none"
        [attr.tabindex]="hasOverflowX() || hasOverflowY() ? 0 : null"
        [attr.data-has-overflow-x]="hasOverflowX() ? '' : null"
        [attr.data-has-overflow-y]="hasOverflowY() ? '' : null"
        (scroll)="onScroll()"
      >
        <!-- The sizer gives the area an intrinsic size to measure
             horizontal overflow against. -->
        <div #content style="min-width: fit-content">
          <ng-container [ngTemplateOutlet]="children" />
        </div>
      </div>
      @if (orientation() !== 'horizontal' && hasOverflowY()) {
        <ff-scroll-bar orientation="vertical" />
      }
      @if (orientation() !== 'vertical' && hasOverflowX()) {
        <ff-scroll-bar orientation="horizontal" />
      }
      @if (showCorner()) {
        <div
          data-slot="scroll-area-corner"
          class="absolute bottom-0 right-0"
          [style.width.px]="cornerSize().width"
          [style.height.px]="cornerSize().height"
        ></div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollArea {
  /** Which axes get scrollbars. Defaults to `"vertical"`. */
  readonly orientation = input<ScrollAreaOrientation>('vertical');
  /** Classes for the inner scrolling viewport — where the scroll-fade
   *  utility goes. (React: `viewportClassName`.) */
  readonly viewportClass = input('');
  /**
   * How the thumb is measured. `"inset"` (Base UI, the standalone area) fits
   * it inside its own margins; `"track"` (Radix, which every component's list
   * uses on the React site) measures the whole track and floors at 18px, so
   * the margins only shift it.
   */
  readonly thumbSizing = input<'inset' | 'track'>('inset');
  /** Classes for the outer container — set the height/width constraint here. */
  readonly userClass = input('', { alias: 'class' });

  readonly isTouch = injectTouchPrimary();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');

  /** The live scroll metrics of the viewport (desktop path only). */
  readonly metrics = signal<ScrollMetrics>(emptyMetrics, {
    equal: (a, b) =>
      a.clientHeight === b.clientHeight &&
      a.scrollHeight === b.scrollHeight &&
      a.scrollTop === b.scrollTop &&
      a.clientWidth === b.clientWidth &&
      a.scrollWidth === b.scrollWidth &&
      a.scrollLeft === b.scrollLeft,
  });
  /** True while the pointer is over the area. */
  readonly hovering = signal(false);
  readonly scrollingX = signal(false);
  readonly scrollingY = signal(false);
  readonly hasOverflowX = computed(() => this.metrics().scrollWidth > this.metrics().clientWidth);
  readonly hasOverflowY = computed(() => this.metrics().scrollHeight > this.metrics().clientHeight);

  protected readonly cornerSize = signal({ width: 0, height: 0 });
  protected readonly showCorner = computed(
    () => !this.isTouch() && this.orientation() === 'both' && this.hasOverflowX() && this.hasOverflowY(),
  );

  // `block`: the host stands in for React's root <div>; a custom element is
  // inline by default, which would ignore the h-* / w-* classes it carries.
  protected readonly hostClass = computed(() => cn('block relative overflow-hidden', this.userClass()));
  protected readonly viewportClassName = computed(() =>
    cn('ff-scroll-area-viewport size-full rounded-[inherit]', this.viewportClass()),
  );
  protected readonly touchViewportClass = computed(() => {
    const orientation = this.orientation();
    return cn(
      'size-full rounded-[inherit]',
      orientation === 'vertical' && 'overflow-y-auto',
      orientation === 'horizontal' && 'overflow-x-auto',
      orientation === 'both' && 'overflow-auto',
      this.viewportClass(),
    );
  });

  private scrollTimers: { x?: ReturnType<typeof setTimeout>; y?: ReturnType<typeof setTimeout> } = {};
  private last = { top: 0, left: 0 };

  constructor() {
    // Measure once the viewport exists, and again whenever it or its content
    // resizes (content added, the container constrained).
    afterRenderEffect((onCleanup) => {
      const viewport = this.viewport()?.nativeElement;
      const content = this.content()?.nativeElement;
      if (!viewport) return;
      this.refresh();
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => this.refresh());
      ro.observe(viewport);
      if (content) ro.observe(content);
      onCleanup(() => ro.disconnect());
    });

    // The corner fills the square where the two scrollbars meet.
    afterRenderEffect(() => {
      if (!this.showCorner()) return;
      const vertical = this.host.querySelector<HTMLElement>('[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]');
      const horizontal = this.host.querySelector<HTMLElement>('[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]');
      const next = { width: vertical?.offsetWidth ?? 0, height: horizontal?.offsetHeight ?? 0 };
      const current = this.cornerSize();
      if (current.width !== next.width || current.height !== next.height) this.cornerSize.set(next);
    });

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.scrollTimers.x);
      clearTimeout(this.scrollTimers.y);
    });
  }

  /** The scrolling element on the desktop path; `null` on touch devices. */
  viewportElement(): HTMLElement | null {
    return this.viewport()?.nativeElement ?? null;
  }

  /** Reads the viewport's scroll metrics straight from the DOM. */
  readMetrics(): ScrollMetrics {
    const viewport = this.viewportElement();
    if (!viewport) return emptyMetrics;
    return {
      clientHeight: viewport.clientHeight,
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
      clientWidth: viewport.clientWidth,
      scrollWidth: viewport.scrollWidth,
      scrollLeft: viewport.scrollLeft,
    };
  }

  /** Re-measures the viewport; scrollbars follow on the next render. */
  refresh() {
    this.metrics.set(this.readMetrics());
  }

  protected onScroll() {
    const viewport = this.viewportElement();
    if (!viewport) return;
    const { scrollTop: top, scrollLeft: left } = viewport;
    if (top !== this.last.top) this.markScrolling('y');
    if (left !== this.last.left) this.markScrolling('x');
    this.last = { top, left };
    this.refresh();
  }

  private markScrolling(axis: 'x' | 'y') {
    const flag = axis === 'x' ? this.scrollingX : this.scrollingY;
    flag.set(true);
    clearTimeout(this.scrollTimers[axis]);
    this.scrollTimers[axis] = setTimeout(() => flag.set(false), SCROLL_TIMEOUT);
  }

  protected onPointerOver(event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    this.hovering.set(true);
  }

  hasOverflow(axis: Axis) {
    return axis === 'vertical' ? this.hasOverflowY() : this.hasOverflowX();
  }
}
