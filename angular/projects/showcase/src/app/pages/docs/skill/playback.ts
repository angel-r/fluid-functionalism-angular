// ---------------------------------------------------------------------------
// The scripted-cursor engine behind the Skill page's examples, ported from
// app/docs/skill/hero-shared.tsx: one Compare frame per example, a cursor that
// glides to each target and presses it, a loop of turns that plays the generic
// side and then the skill side, and a real pointer or keyboard taking over
// while it is inside.
//
// The cursor rides motion values and writes the DOM itself, and hovering is
// played back the way a mouse does it: `data-script-hover` on the element and
// its ancestors for CSS, plus the mouseover/mouseout/mousemove events, so
// fluid hover follows the script too.
// ---------------------------------------------------------------------------

import { DOCUMENT, DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { animate, easeInOut, motionValue } from 'motion';
import { ReducedMotion } from '@angel-r/fluid-functionalism-angular';

/** Height of every example's frame, so switching tabs never moves the page.
 *  Matches the menu: 5 rows of 36px plus 8px padding top and bottom. */
export const FRAME_H = 196;

export type Side = 'generic' | 'skill';

export interface ScriptStep {
  ms: number;
  run: () => void;
}

/** A beat before the first step, so an example doesn't start mid-glance. */
const FIRST_STEP_MS = 400;
/** How long the cursor takes to glide to its next target. */
const GLIDE_MS = 500;
/** How long the cursor rests on its target before it presses: long enough to
 *  read the hover it lands on. */
const HOVER_MS = 450;
/** Set on whatever the scripted cursor is over, and on its ancestors, the way
 *  the browser applies :hover. */
const HOVER_ATTR = 'data-script-hover';

@Injectable()
export class SkillPlayer {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reduced = inject(ReducedMotion).value;

  /** The Compare's root element, in whose coordinates the cursor travels. */
  readonly root = signal<HTMLElement | null>(null);
  readonly paused = signal(false);
  private readonly pointerInside = signal(false);
  private readonly keyboardInside = signal(false);
  private readonly inView = signal(false);

  readonly playing = computed(
    () => this.inView() && !this.reduced() && !this.pointerInside() && !this.keyboardInside() && !this.paused(),
  );

  private readonly x = motionValue(0);
  private readonly y = motionValue(0);
  private readonly scale = motionValue(1);
  private readonly opacity = motionValue(0);
  private cursor: HTMLElement | null = null;
  private placed = false;
  private hovered: Element | null = null;
  private hitQueued = false;
  private observer: IntersectionObserver | null = null;

  private steps: (() => ScriptStep[]) | null = null;
  private reset: (() => void) | null = null;
  private index = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  /** Events the script dispatched, so playback can tell them apart from a
   *  visitor's pointer. */
  private readonly scriptedEvents = new WeakSet<Event>();

  constructor() {
    effect(() => {
      const playing = this.playing();
      untracked(() => (playing ? this.startLoop() : this.stopLoop()));
    });
    this.destroyRef.onDestroy(() => {
      this.stopLoop();
      this.observer?.disconnect();
    });
  }

  /** Wires the Compare's root and cursor element. */
  attach(root: HTMLElement, cursor: HTMLElement): void {
    this.root.set(root);
    this.cursor = cursor;
    cursor.style.opacity = '0';
    const write = () => {
      const el = this.cursor;
      if (!el) return;
      el.style.transform = `translate3d(${this.x.get()}px, ${this.y.get()}px, 0) scale(${this.scale.get()})`;
      el.style.opacity = String(this.opacity.get());
    };
    this.x.on('change', () => {
      write();
      this.scheduleHit();
    });
    this.y.on('change', () => {
      write();
      this.scheduleHit();
    });
    this.scale.on('change', write);

    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      (entries) => this.inView.set(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.35 },
    );
    this.observer.observe(root);
  }

  /** Registers the loop and the state a pause must undo. */
  loop(steps: () => ScriptStep[], reset?: () => void): void {
    this.steps = steps;
    this.reset = reset ?? null;
    this.index = 0;
  }

  isScripted(event: Event): boolean {
    return this.scriptedEvents.has(event);
  }

  pointerEnter(event: MouseEvent): void {
    if (this.isScripted(event)) return;
    this.pointerInside.set(true);
  }

  pointerMove(event: MouseEvent): void {
    this.pointerEnter(event);
  }

  pointerDown(event: MouseEvent): void {
    this.pointerEnter(event);
  }

  pointerLeave(event: MouseEvent): void {
    if (this.isScripted(event)) return;
    this.pointerInside.set(false);
  }

  /** Only :focus-visible counts: a mouse click leaves focus on its button. */
  focusIn(event: FocusEvent): void {
    const target = event.target;
    this.keyboardInside.set(target instanceof HTMLElement && target.matches(':focus-visible'));
  }

  focusOut(event: FocusEvent): void {
    const root = this.root();
    const related = event.relatedTarget;
    if (!root || !(related instanceof Node) || !root.contains(related)) this.keyboardInside.set(false);
  }

  /** Glides the cursor to the center of the `index`th match inside the root. */
  goto(selector: string, index = 0): void {
    const root = this.root();
    const target = root?.querySelectorAll<HTMLElement>(selector)[index];
    if (!root || !target) return;
    const box = root.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const tx = to.left - box.left + to.width / 2;
    const ty = to.top - box.top + to.height / 2;
    // The first time, drift in from just below and right of the target.
    if (!this.placed) {
      this.x.set(tx + 24);
      this.y.set(ty + 24);
      this.opacity.set(1);
      this.placed = true;
    }
    const glide = { duration: GLIDE_MS / 1000, ease: easeInOut };
    animate(this.x, tx, glide);
    animate(this.y, ty, glide);
  }

  click(): void {
    animate(this.scale, [1, 0.8, 1], { duration: 0.2 });
  }

  /** One scripted glide and its rest, as a step. */
  glideStep(selector: string, index: number, restMs = HOVER_MS): ScriptStep {
    return { ms: GLIDE_MS + restMs, run: () => this.goto(selector, index) };
  }

  /** Two steps for one scripted click: glide to the target and rest on it,
   *  then press it and run `act`, then wait `holdMs`. */
  clickStep(selector: string, index: number, act: () => void, holdMs: number): ScriptStep[] {
    return [
      this.glideStep(selector, index),
      {
        ms: holdMs,
        run: () => {
          this.click();
          act();
        },
      },
    ];
  }

  /** Builds turn-by-turn steps: the generic side plays its whole turn, then
   *  the skill side plays the same one. */
  turns(setActive: (side: Side) => void, turn: (side: Side) => ScriptStep[]): ScriptStep[] {
    return (['generic', 'skill'] as const).flatMap((side) => {
      const [first, ...rest] = turn(side);
      return [
        {
          ms: first.ms,
          run: () => {
            setActive(side);
            first.run();
          },
        },
        ...rest,
      ];
    });
  }

  private startLoop(): void {
    if (this.timer !== undefined) return;
    // A resume keeps the cursor where it paused: show it again there.
    if (this.placed) this.opacity.set(1);
    const tick = () => {
      const steps = this.steps?.();
      if (!steps?.length) return;
      const step = steps[this.index];
      this.index = (this.index + 1) % steps.length;
      step.run();
      this.timer = setTimeout(tick, step.ms);
    };
    this.timer = setTimeout(tick, FIRST_STEP_MS);
  }

  private stopLoop(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.reset?.();
    this.clearHover();
    this.opacity.set(0);
  }

  private scheduleHit(): void {
    if (this.hitQueued) return;
    this.hitQueued = true;
    queueMicrotask(() => {
      this.hitQueued = false;
      this.updateHover();
    });
  }

  private updateHover(): void {
    const root = this.root();
    if (!root || !this.placed || !this.playing()) {
      this.clearHover();
      return;
    }
    const box = root.getBoundingClientRect();
    const at = { x: box.left + this.x.get(), y: box.top + this.y.get() };
    const hit = this.document.elementFromPoint(at.x, at.y);
    const next = hit && hit !== root && root.contains(hit) ? hit : null;
    if (next === this.hovered) {
      if (next) this.fire(next, 'mousemove', null, at);
      return;
    }
    this.chain(this.hovered).forEach((node) => node.removeAttribute(HOVER_ATTR));
    this.chain(next).forEach((node) => node.setAttribute(HOVER_ATTR, ''));
    // React derives enter and leave from this pair, as it does for a mouse.
    if (this.hovered) this.fire(this.hovered, 'mouseout', next, at);
    if (next) this.fire(next, 'mouseover', this.hovered, at);
    this.hovered = next;
    if (next) this.fire(next, 'mousemove', null, at);
  }

  private clearHover(): void {
    this.chain(this.hovered).forEach((node) => node.removeAttribute(HOVER_ATTR));
    this.hovered = null;
  }

  private chain(element: Element | null): Element[] {
    const root = this.root();
    const out: Element[] = [];
    for (let node = element; node && node !== root; node = node.parentElement) out.push(node);
    return out;
  }

  private fire(target: Element, type: string, related: Element | null, at: { x: number; y: number }): void {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      relatedTarget: related,
      clientX: at.x,
      clientY: at.y,
    });
    this.scriptedEvents.add(event);
    target.dispatchEvent(event);
  }
}
