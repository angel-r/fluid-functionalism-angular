import {
  DestroyRef,
  Directive,
  ElementRef,
  InjectionToken,
  type Signal,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

export interface ItemRect {
  top: number;
  height: number;
  left: number;
  width: number;
}

export interface FluidHoverOptions {
  /**
   * Which direction to resolve the nearest item along.
   *   "y"  — vertical lists (default): closest by top/height
   *   "x"  — horizontal strips: closest by left/width
   *   "xy" — 2-D grids: closest card across both rows AND columns,
   *          measured by Euclidean distance to each item's center
   */
  axis?: 'x' | 'y' | 'xy';
  /**
   * Makes an item invisible to hit-testing without unregistering it — for
   * rows that stay mounted while clipped away (a collapsed sub-tree).
   * Consulted per mouse move, so keep it cheap.
   */
  isItemDisabled?: (element: HTMLElement) => boolean;
  /**
   * Whether a click that lands between items (a gap, the padding, past the
   * last row) is routed to the highlighted item, so what is lit is what a
   * click hits. On by default. Pass `false` where empty space should stay
   * inert, or `{ maxDistance }` to route only clicks within that many pixels
   * of the highlighted item's edge.
   */
  gapClick?: boolean | { maxDistance?: number };
}

export interface PickNearestInput {
  axis: 'x' | 'y' | 'xy';
  /** The pointer, in viewport coordinates. */
  point: { x: number; y: number };
  /** Item rects in the container's layout space (sparse: unregistered slots
   *  are undefined). */
  rects: readonly (ItemRect | undefined)[];
  /** The container's bounding rect and live scroll / border offsets, which
   *  map layout rects into the pointer's viewport space. */
  containerRect: { left: number; top: number; width: number; height: number };
  scroll: { x: number; y: number };
  border: { x: number; y: number };
  /** Layout size of the container, so a cumulative ancestor `transform:
   *  scale` (a popup mid scale-in) can be factored out per axis. */
  layoutSize: { width: number; height: number };
  /** Skips an item without unregistering it. */
  isDisabled?: (index: number) => boolean;
}

/**
 * The rule, as one pure function: an item the pointer is inside wins;
 * otherwise the item whose center is nearest does, so a pointer in a gap, in
 * the padding, or past the last row still lands. `y` and `x` measure one
 * coordinate; `xy` measures the straight line to each center. Ties keep the
 * first item.
 */
export function pickNearest({
  axis,
  point,
  rects,
  containerRect,
  scroll,
  border,
  layoutSize,
  isDisabled,
}: PickNearestInput): number | null {
  const scaleX = layoutSize.width > 0 ? containerRect.width / layoutSize.width : 1;
  const scaleY = layoutSize.height > 0 ? containerRect.height / layoutSize.height : 1;
  let closestIndex: number | null = null;
  let closestDistance = Infinity;
  let containingIndex: number | null = null;

  for (let index = 0; index < rects.length; index++) {
    const r = rects[index];
    if (!r) continue;
    if (isDisabled?.(index)) continue;

    if (axis === 'xy') {
      const left = containerRect.left + (border.x + r.left - scroll.x) * scaleX;
      const top = containerRect.top + (border.y + r.top - scroll.y) * scaleY;
      const width = r.width * scaleX;
      const height = r.height * scaleY;
      if (point.x >= left && point.x <= left + width && point.y >= top && point.y <= top + height) {
        containingIndex = index;
      }
      const distance = Math.hypot(point.x - (left + width / 2), point.y - (top + height / 2));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
      continue;
    }

    const horizontal = axis === 'x';
    const mousePos = horizontal ? point.x : point.y;
    const scale = horizontal ? scaleX : scaleY;
    const itemStart =
      (horizontal ? containerRect.left : containerRect.top) +
      ((horizontal ? border.x : border.y) +
        (horizontal ? r.left : r.top) -
        (horizontal ? scroll.x : scroll.y)) *
        scale;
    const itemSize = (horizontal ? r.width : r.height) * scale;
    if (mousePos >= itemStart && mousePos <= itemStart + itemSize) {
      containingIndex = index;
    }
    const distance = Math.abs(mousePos - (itemStart + itemSize / 2));
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  }

  return containingIndex ?? closestIndex;
}

/**
 * Whether an event happened inside the element whose handler hears it. A bare
 * point with no target (a caller re-picking at a remembered position) counts
 * as the list's own. In the DOM, overlay content lives outside the list, but
 * a consumer forwarding events from another layer can still check this.
 */
export function isOwnEvent(e: { currentTarget?: EventTarget | null; target?: EventTarget | null }) {
  const { currentTarget, target } = e;
  if (!(currentTarget instanceof Node) || !(target instanceof Node)) return true;
  return currentTarget.contains(target);
}

/** Set on the highlighted item (boolean attribute). */
export const ACTIVE_ATTR = 'data-fluid-hover-active';
/** Set on the container: the highlighted index, or absent. */
export const ACTIVE_INDEX_ATTR = 'data-fluid-hover-active-index';

const ACTIVATOR_SELECTOR =
  "a[href], button, [role='menuitem'], [role='menuitemradio'], [role='menuitemcheckbox'], [role='option'], [role='radio'], [role='checkbox'], [role='tab'], [role='link'], [role='button']";

/**
 * The element a routed click should land on. A registered item is usually
 * the interactive row itself; when it is only a box around one (a sidebar
 * row around its button, a card around its link), the first control inside
 * is what a real click on the row would have reached.
 */
function resolveActivator(element: HTMLElement): HTMLElement {
  if (element.matches(ACTIVATOR_SELECTOR) || element.hasAttribute('tabindex')) return element;
  return element.querySelector<HTMLElement>(ACTIVATOR_SELECTOR) ?? element;
}

/**
 * How many frames the coalesced remeasure retries while the registered items
 * still have no layout box. A popup can be in the DOM one frame before it is
 * laid out; retrying beats publishing zeroed rects, and the cap keeps a list
 * that stays hidden for good from spinning frames forever.
 */
const measurementAttempts = 3;

/** The live state and handlers of one fluid hover list. */
export interface FluidHoverController {
  readonly activeIndex: Signal<number | null>;
  setActiveIndex(index: number | null): void;
  readonly itemRects: Signal<ItemRect[]>;
  /**
   * True once every registered item has been measured and no remeasure is
   * pending, i.e. `itemRects` describes the current item set. Gate absolutely
   * positioned overlays on it.
   */
  readonly isMeasured: Signal<boolean>;
  /**
   * Counts pointer entries. It steps when the pointer, having entered the
   * container, first moves the highlight, so the highlight keyed on it fades
   * in at the new row instead of sliding over from where it was last.
   */
  readonly session: Signal<number>;
  registerItem(index: number, element: HTMLElement | null): void;
  /**
   * Unregisters `element` from `index` only if it still holds that slot.
   * Angular runs each effect's cleanup right before that effect re-runs, so a
   * row moving off an index can clean up after the new row there registered.
   */
  unregisterItem(index: number, element: HTMLElement): void;
  /** Invalidates the published rects and runs the coalesced measurement pass
   *  again, holding `isMeasured` false until it settles. */
  remeasure(): void;
  /** Re-reads the rects synchronously, keeping `isMeasured` as it is. Only for
   *  layout that moves the rows under a visible overlay frame by frame. */
  measureItems(): void;
  onMouseMove(e: MouseEvent): void;
  onMouseEnter(): void;
  onMouseLeave(): void;
  /** Routes a click that lands between items to the highlighted item. */
  onClick(e: MouseEvent): void;
}

type MaybeSignal<T> = T | (() => T);
const read = <T>(value: MaybeSignal<T>): T =>
  typeof value === 'function' ? (value as () => T)() : value;

/**
 * The fluid hover engine. Call in an injection context with the container
 * (an element, or a signal of one such as a `viewChild`) and its options
 * (a value, or a function read at event time). The container must be the
 * offsetParent of its items (`position: relative`).
 */
export function createFluidHover(
  container: () => HTMLElement | null | undefined,
  options: MaybeSignal<FluidHoverOptions> = {},
): FluidHoverController {
  const items = new Map<number, HTMLElement>();
  const activeIndex = signal<number | null>(null);
  const itemRects = signal<ItemRect[]>([]);
  const isMeasured = signal(false);
  const session = signal(0);
  // Set when the pointer enters; the pointer's first change of highlight
  // starts the new session, in the same update as the change itself.
  let sessionPending = false;
  let rafId: number | null = null;
  let remeasureRafId: number | null = null;
  let itemRo: ResizeObserver | null = null;

  /**
   * Publishes a rect for every registered item. Returns false when the
   * measurement could not be completed (no container, or an item without a
   * layout box) — nothing is published then, so the last complete
   * measurement stands instead of being overwritten with zeroes.
   */
  const runMeasurement = () => {
    const root = untracked(container);
    if (!root) return false;
    const rects: ItemRect[] = [];
    let everyItemHasLayout = true;
    items.forEach((element, index) => {
      // An element inside a display:none / not-yet-laid-out popup has no
      // offsetParent and reports every offset as 0. `position: fixed` items
      // also have no offsetParent but do have a size.
      const hasLayoutBox =
        element.offsetParent !== null || element.offsetWidth > 0 || element.offsetHeight > 0;
      if (!hasLayoutBox) {
        everyItemHasLayout = false;
        return;
      }
      // offset* instead of getBoundingClientRect so measurements ignore CSS
      // transforms (a popup's scale-in). Items nested inside positioned
      // descendants of the container accumulate those ancestors' offsets, so
      // every rect lands in the container's own coordinate space.
      let top = element.offsetTop;
      let left = element.offsetLeft;
      let ancestor = element.offsetParent as HTMLElement | null;
      while (ancestor && ancestor !== root && root.contains(ancestor)) {
        top += ancestor.offsetTop + ancestor.clientTop;
        left += ancestor.offsetLeft + ancestor.clientLeft;
        ancestor = ancestor.offsetParent as HTMLElement | null;
      }
      rects[index] = { top, height: element.offsetHeight, left, width: element.offsetWidth };
    });
    if (!everyItemHasLayout) return false;
    // Skip the update when nothing moved so redundant remeasures don't churn.
    const prev = untracked(itemRects);
    let changed = prev.length !== rects.length;
    for (let i = 0; !changed && i < rects.length; i++) {
      const p = prev[i];
      const r = rects[i];
      if (p === r) continue; // both undefined (sparse slot)
      changed = !p || !r || p.top !== r.top || p.left !== r.left || p.width !== r.width || p.height !== r.height;
    }
    if (changed) itemRects.set(rects);
    return true;
  };

  /**
   * The single measurement pass: coalesces every trigger (item registration,
   * resize) into one remeasure on the next frame and is the only place
   * readiness is reported, so `isMeasured` never turns true while another
   * pass is still queued.
   */
  const scheduleMeasurement = (attemptsLeft: number) => {
    if (remeasureRafId !== null) cancelAnimationFrame(remeasureRafId);
    remeasureRafId = requestAnimationFrame(() => {
      remeasureRafId = null;
      if (runMeasurement()) isMeasured.set(true);
      else if (attemptsLeft > 1) scheduleMeasurement(attemptsLeft - 1);
    });
  };

  const remeasure = () => {
    // Readiness drops first: until the pass settles, an overlay positioned
    // from the published rects would be corrected after mounting — a slide.
    isMeasured.set(false);
    scheduleMeasurement(measurementAttempts);
  };

  // Observes the registered items themselves: rows that change size in place
  // (the size step flipping) must invalidate the published rects.
  const getItemRo = () => {
    if (itemRo === null && typeof ResizeObserver !== 'undefined') {
      itemRo = new ResizeObserver(() => scheduleMeasurement(measurementAttempts));
    }
    return itemRo;
  };

  const registerItem = (index: number, element: HTMLElement | null) => {
    if (element) {
      items.set(index, element);
      getItemRo()?.observe(element);
      if (index === untracked(activeIndex)) element.setAttribute(ACTIVE_ATTR, '');
    } else {
      const previous = items.get(index);
      if (previous) itemRo?.unobserve(previous);
      // The mark leaves with the element: a row that only moved to another
      // index (a filtering list re-ordering) must not carry it there.
      previous?.removeAttribute(ACTIVE_ATTR);
      items.delete(index);
      // The highlighted row is gone: nothing should stay lit or receive a
      // routed click until the pointer picks again. Decided after this
      // turn's registrations, so a row that only moved index hands the
      // highlight to the row now under it.
      if (index === untracked(activeIndex)) {
        queueMicrotask(() => {
          if (untracked(activeIndex) === index && !items.has(index)) activeIndex.set(null);
        });
      }
    }
    // Coalesce rapid register/unregister calls into one remeasure next frame.
    remeasure();
  };

  const unregisterItem = (index: number, element: HTMLElement) => {
    if (items.get(index) === element) {
      registerItem(index, null);
      return;
    }
    // Another row took the slot first: only drop this element's own traces.
    itemRo?.unobserve(element);
    element.removeAttribute(ACTIVE_ATTR);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isOwnEvent(e)) return;
    const { clientX, clientY } = e;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const root = untracked(container);
      if (!root) return;
      const { isItemDisabled } = read(options);
      const next = pickNearest({
        axis: read(options).axis ?? 'y',
        point: { x: clientX, y: clientY },
        rects: untracked(itemRects),
        containerRect: root.getBoundingClientRect(),
        scroll: { x: root.scrollLeft, y: root.scrollTop },
        border: { x: root.clientLeft, y: root.clientTop },
        layoutSize: { width: root.offsetWidth, height: root.offsetHeight },
        isDisabled: isItemDisabled
          ? (index) => {
              const el = items.get(index);
              return !!el && isItemDisabled(el);
            }
          : undefined,
      });
      if (sessionPending && next !== untracked(activeIndex)) {
        sessionPending = false;
        session.update((s) => s + 1);
      }
      activeIndex.set(next);
    });
  };

  const onMouseEnter = () => {
    sessionPending = true;
  };

  const onMouseLeave = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    activeIndex.set(null);
  };

  const onClick = (e: MouseEvent) => {
    const target = e.target as Node | null;
    if (!target) return;
    // Inside an item: the item owns the click.
    for (const element of items.values()) if (element.contains(target)) return;
    // A row that unmounted while its own click was still bubbling already
    // landed; it is not a gap.
    if (!target.isConnected) return;
    if (!isOwnEvent(e)) return;
    // A control that sits between the rows (a search field, a footer button)
    // keeps its own click too.
    const control = (target as Element).closest?.(
      "input, textarea, select, button, a, summary, [contenteditable], [role='textbox'], [role='searchbox'], [role='button']",
    );
    if (control) return;
    const { gapClick = true, isItemDisabled } = read(options);
    if (gapClick === false) return;
    const maxDistance = typeof gapClick === 'object' ? (gapClick.maxDistance ?? Infinity) : Infinity;
    const index = untracked(activeIndex);
    if (index === null) return;
    const element = items.get(index);
    if (!element || isItemDisabled?.(element)) return;
    if (maxDistance !== Infinity) {
      const r = element.getBoundingClientRect();
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
      const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      if (Math.hypot(dx, dy) > maxDistance) return;
    }
    // A real DOM click on the item, so its own handlers run exactly as if
    // the pointer had been inside.
    resolveActivator(element).click();
  };

  // The state, in the DOM: `data-fluid-hover-active` on the highlighted item
  // and `data-fluid-hover-active-index` on the container. Devtools shows it
  // and a test asserts on it without waiting for a frame.
  let marked: { container: HTMLElement | null; item: HTMLElement | undefined; index: number | null } = {
    container: null,
    item: undefined,
    index: null,
  };
  effect(() => {
    const index = activeIndex();
    const root = container() ?? null;
    untracked(() => {
      marked.item?.removeAttribute(ACTIVE_ATTR);
      if (marked.index !== null) items.get(marked.index)?.removeAttribute(ACTIVE_ATTR);
      if (marked.container && marked.container !== root) marked.container.removeAttribute(ACTIVE_INDEX_ATTR);
      if (index === null) root?.removeAttribute(ACTIVE_INDEX_ATTR);
      else root?.setAttribute(ACTIVE_INDEX_ATTR, String(index));
      const item = index === null ? undefined : items.get(index);
      item?.setAttribute(ACTIVE_ATTR, '');
      marked = { container: root, item, index };
    });
  });

  // Remeasure when the container resizes — a reflow moves items even though
  // the registered set is unchanged. Readiness is deliberately not dropped:
  // the published rects stay usable, and hiding overlays on every reflow
  // would flicker them.
  effect((onCleanup) => {
    const root = container();
    if (!root || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => scheduleMeasurement(measurementAttempts));
    ro.observe(root);
    onCleanup(() => ro.disconnect());
  });

  inject(DestroyRef).onDestroy(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    if (remeasureRafId !== null) cancelAnimationFrame(remeasureRafId);
    itemRo?.disconnect();
    itemRo = null;
  });

  return {
    activeIndex: activeIndex.asReadonly(),
    setActiveIndex: (index) => activeIndex.set(index),
    itemRects: itemRects.asReadonly(),
    isMeasured: isMeasured.asReadonly(),
    session: session.asReadonly(),
    registerItem,
    unregisterItem,
    remeasure,
    measureItems: () => void runMeasurement(),
    onMouseMove,
    onMouseEnter,
    onMouseLeave,
    onClick,
  };
}

/** The list a fluid hover item registers with. */
export const FLUID_HOVER = new InjectionToken<FluidHoverController>('FF_FLUID_HOVER');

/**
 * Turns its host into a fluid hover list: binds the pointer handlers and
 * provides the controller to `[ffFluidHoverItem]` rows and highlights inside.
 * The host must be `position: relative`.
 */
@Directive({
  selector: '[ffFluidHover]',
  exportAs: 'ffFluidHover',
  providers: [{ provide: FLUID_HOVER, useFactory: () => inject(FluidHover).controller }],
  host: {
    '(mousemove)': 'controller.onMouseMove($event)',
    '(mouseenter)': 'controller.onMouseEnter()',
    '(mouseleave)': 'controller.onMouseLeave()',
    '(click)': 'controller.onClick($event)',
  },
})
export class FluidHover {
  readonly axis = input<'x' | 'y' | 'xy'>('y', { alias: 'ffFluidHoverAxis' });
  readonly gapClick = input<boolean | { maxDistance?: number }>(true, { alias: 'ffFluidHoverGapClick' });
  readonly isItemDisabled = input<((element: HTMLElement) => boolean) | undefined>(undefined, {
    alias: 'ffFluidHoverItemDisabled',
  });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly controller = createFluidHover(
    () => this.host,
    () => ({ axis: this.axis(), gapClick: this.gapClick(), isItemDisabled: this.isItemDisabled() }),
  );
}

/**
 * Registers its host with the enclosing fluid hover list at `index` for as
 * long as it is rendered. Outside a list (or with no index) nothing happens.
 */
@Directive({ selector: '[ffFluidHoverItem]' })
export class FluidHoverItem {
  readonly index = input<number | undefined>(undefined, { alias: 'ffFluidHoverItem' });
  private readonly list = inject(FLUID_HOVER, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    effect((onCleanup) => {
      const index = this.index();
      const list = this.list;
      if (!list || index === undefined) return;
      untracked(() => list.registerItem(index, this.host));
      onCleanup(() => list.unregisterItem(index, this.host));
    });
  }
}
