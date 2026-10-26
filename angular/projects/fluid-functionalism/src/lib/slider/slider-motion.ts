import { type AnimationCallbackEvent, DestroyRef, inject } from '@angular/core';
import { animate, motionValue, type AnimationOptions, type MotionValue } from 'motion';
import { injectAnimateFluid, enterTransition, exitTransition } from '../core/motion';
import { spring } from '../core/springs';
import { applyStyles } from './slider-math';

/**
 * The `motion.div initial={false} animate={...}` contract: the first time an
 * element is seen its target is written with no animation, every later
 * target animates (honoring reduced motion, which keeps fades only).
 */
export function injectTween() {
  const animateFluid = injectAnimateFluid();
  const seen = new WeakSet<Element>();
  return (el: HTMLElement | null | undefined, target: Record<string, string | number>, transition: AnimationOptions) => {
    if (!el) return;
    if (!seen.has(el)) {
      seen.add(el);
      applyStyles(el, target);
      return;
    }
    animateFluid(el, target, transition);
  };
}

/** Motion values destroyed (listeners and running springs) with the component. */
export function injectMotionValues(count: number): MotionValue<number>[] {
  const values = Array.from({ length: count }, () => motionValue(0));
  inject(DestroyRef).onDestroy(() => values.forEach((v) => v.destroy()));
  return values;
}

/** Springs a motion value to `target` on a tier's enter transition. */
export function springTo(value: MotionValue<number>, target: number, tier: (typeof spring)[keyof typeof spring]) {
  animate(value, target, { type: tier.type, duration: tier.duration, bounce: tier.bounce });
}

/** AnimatePresence for the caption bubbles: fade + 4px rise on spring.fast. */
export function tooltipEnter(event: AnimationCallbackEvent) {
  animate(event.target, { opacity: [0, 1], y: [4, 0] }, enterTransition(spring.fast));
  event.animationComplete();
}

/** The bubble's exit: fade + 4px drop on spring.fast's exit tween, then removal. */
export function tooltipLeave(event: AnimationCallbackEvent) {
  animate(event.target, { opacity: 0, y: 4 }, exitTransition(spring.fast)).finished.then(
    () => event.animationComplete(),
    () => event.animationComplete(),
  );
}
