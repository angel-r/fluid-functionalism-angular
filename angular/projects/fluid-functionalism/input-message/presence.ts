import {
  DestroyRef,
  type Signal,
  afterRenderEffect,
  computed,
  inject,
  linkedSignal,
  untracked,
} from '@angular/core';
import { spring, ReducedMotion, type FluidAnimation, animateFluid, enterTransition } from '../core';
import { writeInitialStyles } from '../tabs';

// ---------------------------------------------------------------------------
// Internal presence helpers of InputMessage (React `AnimatePresence`,
// `layout` and the measured-height regions). Not part of the public API.
// ---------------------------------------------------------------------------

/** One rendered list entry. `present: false` while its exit animation runs. */
export interface PresenceEntry<T> {
  key: string;
  item: T;
  present: boolean;
}

export interface PresenceList<T> {
  readonly entries: Signal<PresenceEntry<T>[]>;
  /** The entry's exit landed: drop it from the rendered list. */
  done(key: string): void;
  /** Forget every entry (the region holding them unmounted). */
  reset(): void;
}

/**
 * Keeps removed items rendered (with `present: false`) until their exit
 * finishes and `done(key)` drops them, the way `AnimatePresence` holds an
 * exiting child. Removed entries keep their previous slot.
 *
 * `holdOnEmpty`: an empty list leaves the entries as they were. The list's
 * region collapses around them then (an exiting AnimatePresence child keeps
 * its last render, so its rows don't each run their own exit); call
 * `reset()` once that region is gone.
 */
export function createPresenceList<T>(
  items: () => readonly T[],
  keyOf: (item: T) => string,
  holdOnEmpty = false,
): PresenceList<T> {
  const entries = linkedSignal<readonly T[], PresenceEntry<T>[]>({
    source: items,
    computation: (next, prev) => {
      if (holdOnEmpty && next.length === 0 && prev) return prev.value;
      const nextKeys = new Set(next.map(keyOf));
      const result: PresenceEntry<T>[] = next.map((item) => ({ key: keyOf(item), item, present: true }));
      prev?.value.forEach((entry, index) => {
        if (nextKeys.has(entry.key)) return;
        result.splice(Math.min(index, result.length), 0, { ...entry, present: false });
      });
      return result;
    },
  });
  return {
    entries: entries.asReadonly(),
    done: (key) => entries.update((list) => list.filter((e) => e.present || e.key !== key)),
    reset: () => entries.set([]),
  };
}

export interface CollapsibleRegionOptions {
  /** The region's clipping element (rendered while `mounted()`). Its first
   *  element child is the measured content. */
  element: () => HTMLElement | undefined;
  /** Fade opacity on the exit too (the suggestions region exits height-only). */
  fadeOnExit: boolean;
  /** Called once the exit has landed and the element is gone. */
  onExited?: () => void;
}

export interface CollapsibleRegion {
  /** Render the region while this is true: open, or still collapsing. */
  readonly mounted: Signal<boolean>;
}

/** Safety net for the collapse: unmount even if a throttled tab stalls it. */
const REGION_EXIT_FALLBACK_MS = Math.round(spring.moderate.duration * 1000) + 300;

/**
 * A collapsible region that springs to a self-measured PIXEL height rather
 * than "auto": "auto" resolves from the visual (transformed) size, so under a
 * scaled ancestor the region would balloon to scale× its real height and snap
 * back. The height is the clipping element's scrollHeight (inner margins
 * count, and it stays right while the animated height is mid-flight); a
 * ResizeObserver on the content re-targets the spring as rows come and go.
 *
 * `initial={false}` semantics: a region open at mount appears at its height
 * with no enter. Call in an injection context.
 */
export function createCollapsibleRegion(open: () => boolean, options: CollapsibleRegionOptions): CollapsibleRegion {
  const reduced = inject(ReducedMotion).value;
  const exiting = linkedSignal<boolean, boolean>({
    source: open,
    computation: (isOpen, prev) => (prev === undefined ? false : !isOpen),
  });
  // Read `exiting` on every pass, even while open: a linkedSignal first read
  // at the close has no previous value, would report "not exiting" and drop a
  // region that was open at mount without its collapse.
  const mounted = computed(() => {
    const isExiting = exiting();
    return open() || isExiting;
  });

  let firstRender = true;
  let animation: FluidAnimation | null = null;
  let exitTimer: ReturnType<typeof setTimeout> | undefined;
  let animatedEl: HTMLElement | null = null;

  const measure = (el: HTMLElement) => {
    const content = el.firstElementChild as HTMLElement | null;
    const next = el.scrollHeight || content?.offsetHeight || 0;
    return next > 0 ? next : null;
  };

  const springTo = (el: HTMLElement, frames: Record<string, number>) => {
    animation?.stop();
    animation = animateFluid(el, frames, { ...enterTransition(spring.moderate), bounce: 0 }, reduced());
    return animation;
  };

  const finishExit = () => {
    clearTimeout(exitTimer);
    animation = null;
    if (untracked(open)) return;
    exiting.set(false);
    options.onExited?.();
  };

  afterRenderEffect((onCleanup) => {
    const isOpen = open();
    const el = options.element();
    untracked(() => {
      const atMount = firstRender;
      firstRender = false;
      if (!el) {
        animatedEl = null;
        return;
      }
      const fresh = animatedEl !== el;
      animatedEl = el;
      clearTimeout(exitTimer);
      if (isOpen) {
        const height = measure(el);
        if (fresh && atMount) {
          writeInitialStyles(el, height === null ? { opacity: 1 } : { height, opacity: 1 });
        } else {
          if (fresh) writeInitialStyles(el, { height: 0, opacity: 0 });
          springTo(el, height === null ? { opacity: 1 } : { height, opacity: 1 });
        }
        // Rows added or removed while open re-target the height.
        if (typeof ResizeObserver !== 'undefined' && el.firstElementChild) {
          const ro = new ResizeObserver(() => {
            if (!untracked(open)) return;
            const next = measure(el);
            if (next !== null) springTo(el, { height: next });
          });
          ro.observe(el.firstElementChild);
          onCleanup(() => ro.disconnect());
        }
        return;
      }
      const exit = springTo(el, options.fadeOnExit ? { height: 0, opacity: 0 } : { height: 0 });
      exit.finished.then(
        () => animation === exit && finishExit(),
        () => animation === exit && finishExit(),
      );
      exitTimer = setTimeout(finishExit, REGION_EXIT_FALLBACK_MS);
    });
  });

  inject(DestroyRef).onDestroy(() => {
    animation?.stop();
    clearTimeout(exitTimer);
  });

  return { mounted };
}

/**
 * False on the render a region mounts, true from the next one: rows present
 * when their region appears don't run their own enter (`initial={false}` on
 * the inner AnimatePresence); rows added later do. Call in an injection context.
 */
export function createSettledFlag(mounted: () => boolean): Signal<boolean> {
  const settled = linkedSignal<boolean, boolean>({ source: mounted, computation: () => false });
  afterRenderEffect(() => {
    const isMounted = mounted();
    untracked(() => {
      if (isMounted && !settled()) settled.set(true);
    });
  });
  return settled.asReadonly();
}

/**
 * React `layout` for a list's direct children: after each render where
 * `track()` changed, every child marked `data-flip-key` that moved springs
 * from its old layout position to the new one (spring.fast). Children marked
 * `data-flip-skip` (dragged, or popped out while exiting) don't animate.
 * Exiting children marked `data-flip-pop` are first taken out of the flow at
 * their last position (`mode="popLayout"`), so siblings slide into the gap
 * while they fade. Call in an injection context.
 */
export function createLayoutFlip(container: () => HTMLElement | undefined, track: () => unknown) {
  const reduced = inject(ReducedMotion).value;
  const last = new Map<string, { x: number; y: number }>();

  afterRenderEffect(() => {
    track();
    const root = container();
    untracked(() => {
      if (!root) {
        last.clear();
        return;
      }
      const children = [...root.children].filter(
        (c): c is HTMLElement => c instanceof HTMLElement && c.hasAttribute('data-flip-key'),
      );
      for (const child of children) {
        if (!child.hasAttribute('data-flip-pop') || child.style.position === 'absolute') continue;
        const prev = last.get(child.getAttribute('data-flip-key')!);
        child.style.position = 'absolute';
        child.style.left = `${prev?.x ?? child.offsetLeft}px`;
        child.style.top = `${prev?.y ?? child.offsetTop}px`;
      }
      const seen = new Set<string>();
      for (const child of children) {
        const key = child.getAttribute('data-flip-key')!;
        seen.add(key);
        if (child.hasAttribute('data-flip-pop')) continue;
        const next = { x: child.offsetLeft, y: child.offsetTop };
        const prev = last.get(key);
        last.set(key, next);
        if (!prev || child.hasAttribute('data-flip-skip')) continue;
        const dx = prev.x - next.x;
        const dy = prev.y - next.y;
        if (dx === 0 && dy === 0) continue;
        animateFluid(child, { x: [dx, 0], y: [dy, 0] }, enterTransition(spring.fast), reduced());
      }
      for (const key of [...last.keys()]) if (!seen.has(key)) last.delete(key);
    });
  });

  return {
    /** Re-read the positions without animating (after a drag moved a row). */
    sync: (key: string, el: HTMLElement) => last.set(key, { x: el.offsetLeft, y: el.offsetTop }),
  };
}
