import { inject } from '@angular/core';
import { animate, type AnimationOptions, type DOMKeyframesDefinition } from 'motion';
import { spring } from './springs';
import { ReducedMotion } from './environment';

export type SpringTier = (typeof spring)[keyof typeof spring];

/** The ENTER transition of a tier, as motion options (drops the `exit` key). */
export function enterTransition(tier: SpringTier): AnimationOptions {
  return { type: tier.type, duration: tier.duration, bounce: tier.bounce };
}

/** The EXIT transition of a tier: a plain tween, no bounce, one tier quicker. */
export function exitTransition(tier: SpringTier): AnimationOptions {
  return { duration: tier.exit.duration };
}

export interface FluidAnimation {
  readonly finished: Promise<void>;
  stop(): void;
}

// Values that keep animating under reduced motion: fades carry meaning.
const FADE_KEYS = new Set(['opacity']);

/**
 * `motion`'s `animate()` with the React `MotionConfig reducedMotion="user"`
 * rule applied: when `reduced` is true, every non-fade value jumps to its
 * target while opacity still animates.
 */
export function animateFluid(
  element: Element,
  keyframes: DOMKeyframesDefinition,
  transition: AnimationOptions,
  reduced = false,
): FluidAnimation {
  if (!reduced) {
    const controls = animate(element, keyframes, transition);
    return { finished: controls.finished.then(() => undefined), stop: () => controls.stop() };
  }
  const fades: Record<string, unknown> = {};
  const jumps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(keyframes)) {
    (FADE_KEYS.has(key) ? fades : jumps)[key] = value;
  }
  const all = [
    Object.keys(fades).length ? animate(element, fades as DOMKeyframesDefinition, transition) : null,
    Object.keys(jumps).length ? animate(element, jumps as DOMKeyframesDefinition, { duration: 0 }) : null,
  ].filter((c) => c !== null);
  return {
    finished: Promise.all(all.map((c) => c.finished)).then(() => undefined),
    stop: () => all.forEach((c) => c.stop()),
  };
}

/** `animateFluid` bound to the live reduced-motion setting. Injection context only. */
export function injectAnimateFluid() {
  const reduced = inject(ReducedMotion).value;
  return (element: Element, keyframes: DOMKeyframesDefinition, transition: AnimationOptions) =>
    animateFluid(element, keyframes, transition, reduced());
}
