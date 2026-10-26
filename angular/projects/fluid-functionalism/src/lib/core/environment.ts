import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  type Signal,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { POPUP_NAV_KEYS } from './popup';

// Adapted from Lina by SameerJS6 (https://lina.sameer.sh) — use-has-primary-touch.
// Detects touch-primary devices (coarse pointer + touch points), updating live
// on pointer-mode and media-query changes. False until the browser reports.
@Injectable({ providedIn: 'root' })
export class TouchPrimary {
  private readonly _value = signal(false);
  readonly value = this._value.asReadonly();

  constructor() {
    const window = inject(DOCUMENT).defaultView;
    if (!window?.matchMedia) return;
    const controller = new AbortController();
    const { signal: abort } = controller;
    const handleTouch = () => {
      const hasTouch = 'ontouchstart' in window || window.navigator.maxTouchPoints > 0;
      const prefersTouch = window.matchMedia('(pointer: coarse)').matches;
      this._value.set(hasTouch && prefersTouch);
    };
    window.matchMedia('(pointer: coarse)').addEventListener('change', handleTouch, { signal: abort });
    window.addEventListener('pointerdown', handleTouch, { signal: abort });
    handleTouch();
    inject(DestroyRef).onDestroy(() => controller.abort());
  }
}

export function injectTouchPrimary(): Signal<boolean> {
  return inject(TouchPrimary).value;
}

/**
 * The OS "reduce motion" setting, live. The React version wraps the tree in
 * `MotionConfig reducedMotion="user"`, which drops transform and layout
 * animations but keeps fades (they carry meaning); `animateFluid()` applies
 * the same rule from this signal.
 */
@Injectable({ providedIn: 'root' })
export class ReducedMotion {
  private readonly _value = signal(false);
  readonly value = this._value.asReadonly();

  constructor() {
    const window = inject(DOCUMENT).defaultView;
    if (!window?.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => this._value.set(mq.matches);
    mq.addEventListener('change', update);
    update();
    inject(DestroyRef).onDestroy(() => mq.removeEventListener('change', update));
  }
}

/**
 * Gates a popup's keyboard focus ring on keyboard use.
 *
 * Rows take focus as a popup opens, and Chrome grants `:focus-visible` to any
 * script-driven focus — so without a gate every pointer-opened popup would
 * open with a ring on its first row. The flag is seeded at open from the
 * element that has focus then: a trigger reached by keyboard matches
 * `:focus-visible`, a clicked one doesn't. Navigation keys inside the popup
 * earn the ring afterwards. Attach `trackKeyboardNav` in the CAPTURE phase —
 * the primitive moves focus during its own keydown handling, so the flag
 * must be set before then. Call in an injection context.
 */
export function createKeyboardNavGate(open: Signal<boolean>) {
  const document = inject(DOCUMENT);
  const keyboardNav = { current: false };

  effect(() => {
    if (!open()) return;
    untracked(() => {
      const active = document.activeElement;
      keyboardNav.current = active instanceof HTMLElement && active.matches(':focus-visible');
    });
  });

  const trackKeyboardNav = (e: KeyboardEvent) => {
    if (POPUP_NAV_KEYS.includes(e.key)) keyboardNav.current = true;
  };

  return { keyboardNav, trackKeyboardNav };
}
