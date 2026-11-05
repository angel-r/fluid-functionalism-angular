import { type Provider, type Type, computed, inject } from '@angular/core';
import { animate, type AnimationOptions, type DOMKeyframesDefinition } from 'motion';
import { animateFluid, type FluidAnimation, SizeContext, type SizeVariant } from '@angel-r/fluid-functionalism-angular/core';

// ---------------------------------------------------------------------------
// Internal helpers shared by the tabs, tabs-subtle and accordion ports. Not
// part of the public API.
// ---------------------------------------------------------------------------

export type Keyframes = Record<string, number | string>;

export interface LayerExit {
  keyframes: Keyframes;
  transition: AnimationOptions;
}

const TRANSFORM_KEYS = new Set(['x', 'y', 'rotate']);
const UNITLESS_KEYS = new Set(['opacity']);

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function composeTransform(frames: Keyframes): string {
  const parts: string[] = [];
  if (frames['x'] !== undefined) parts.push(`translateX(${px(frames['x'])})`);
  if (frames['y'] !== undefined) parts.push(`translateY(${px(frames['y'])})`);
  if (frames['rotate'] !== undefined) {
    const r = frames['rotate'];
    parts.push(`rotate(${typeof r === 'number' ? `${r}deg` : r})`);
  }
  return parts.join(' ');
}

const px = (value: number | string) => (typeof value === 'number' ? `${value}px` : value);

/**
 * Writes keyframes straight onto an element motion has not animated yet, so
 * a freshly created layer starts at its `initial` values on its very first
 * paint (motion's own instant path lands a frame later). Transforms are also
 * handed to motion so its value store starts in step with the inline style.
 * After this, every write must go through motion: it keeps its own record of
 * each value and would animate from a stale one otherwise.
 */
export function writeInitialStyles(element: HTMLElement, frames: Keyframes) {
  const transforms: Keyframes = {};
  for (const [key, value] of Object.entries(frames)) {
    if (TRANSFORM_KEYS.has(key)) {
      transforms[key] = value;
      continue;
    }
    element.style.setProperty(
      kebab(key),
      typeof value === 'number' && !UNITLESS_KEYS.has(key) ? `${value}px` : String(value),
    );
  }
  if (Object.keys(transforms).length) {
    element.style.transform = composeTransform(transforms);
    animate(element, transforms as DOMKeyframesDefinition, { duration: 0 });
  }
}

interface LayerNode {
  element: HTMLDivElement;
  animation: FluidAnimation | null;
}

/**
 * One absolutely positioned decoration (a pill, a focus ring, a tint) with
 * React `AnimatePresence` semantics: `show` mounts it (optionally from an
 * `initial` frame) or re-targets it, `hide` runs its exit and removes it once
 * the exit lands. A `show` during the exit revives the same node, the way
 * AnimatePresence re-enters a child that is still leaving.
 *
 * The node is inserted right before `anchor` (an `<ng-container>` comment in
 * the owner's template), so every layer keeps its place in paint order no
 * matter when it mounts.
 */
export class Layer {
  private live: LayerNode | null = null;
  private exiting: LayerNode | null = null;

  constructor(
    private readonly anchor: () => Node | null | undefined,
    private readonly reduced: () => boolean,
    private readonly slot: string,
  ) {}

  /** The mounted node, while it is shown (not while it exits). */
  get element(): HTMLDivElement | null {
    return this.live?.element ?? null;
  }

  show(className: string, target: Keyframes, transition: AnimationOptions, initial: Keyframes | false = false) {
    if (!this.live && this.exiting) {
      this.live = this.exiting;
      this.exiting = null;
      this.live.animation?.stop();
    }
    if (this.live) {
      this.live.element.className = className;
      this.live.animation = animateFluid(
        this.live.element,
        target as DOMKeyframesDefinition,
        transition,
        this.reduced(),
      );
      return;
    }
    const anchor = this.anchor();
    const parent = anchor?.parentNode;
    if (!anchor || !parent) return;
    const element = (anchor.ownerDocument ?? document).createElement('div');
    element.className = className;
    element.setAttribute('data-slot', this.slot);
    parent.insertBefore(element, anchor);
    if (initial === false) {
      writeInitialStyles(element, target);
      this.live = { element, animation: null };
      return;
    }
    writeInitialStyles(element, initial);
    this.live = {
      element,
      animation: animateFluid(element, target as DOMKeyframesDefinition, transition, this.reduced()),
    };
  }

  hide(exit: LayerExit | null) {
    const node = this.live;
    if (!node) return;
    this.live = null;
    node.animation?.stop();
    if (!exit) {
      node.element.remove();
      return;
    }
    this.exiting?.element.remove();
    this.exiting = node;
    node.animation = animateFluid(
      node.element,
      exit.keyframes as DOMKeyframesDefinition,
      exit.transition,
      this.reduced(),
    );
    const done = () => {
      if (this.exiting !== node) return;
      node.element.remove();
      this.exiting = null;
    };
    node.animation.finished.then(done, done);
  }

  destroy() {
    this.live?.animation?.stop();
    this.exiting?.animation?.stop();
    this.live?.element.remove();
    this.exiting?.element.remove();
    this.live = null;
    this.exiting = null;
  }
}

/**
 * Provides a `SizeContext` that pins descendants to `read(owner)` when it is
 * set and otherwise follows the surrounding context: the React
 * `size ? <SizeProvider size={size}>{tree}</SizeProvider> : tree` pattern.
 * The owner must not inject `SizeContext` itself (that would be circular).
 */
export function provideSizeOverride<T>(owner: Type<T>, read: (owner: T) => SizeVariant | undefined): Provider {
  return {
    provide: SizeContext,
    useFactory: (): SizeContext => {
      const self = inject(owner);
      const parent = inject(SizeContext, { optional: true, skipSelf: true });
      return {
        size: computed(() => read(self) ?? parent?.size() ?? 'default'),
        setSize: (next: SizeVariant) => parent?.setSize(next),
      };
    },
  };
}

/** `:focus-visible`, tolerating engines whose selector parser lacks it. */
export function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return false;
  }
}
