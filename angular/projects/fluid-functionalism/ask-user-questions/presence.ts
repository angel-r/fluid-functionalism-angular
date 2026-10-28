import { DestroyRef, Directive, ElementRef, effect, inject, input, untracked } from '@angular/core';
import type { AnimationOptions, DOMKeyframesDefinition } from 'motion';
import { spring, animateFluid, ReducedMotion } from '@angel-r/fluid-functionalism-angular/core';

// ---------------------------------------------------------------------------
// The React source wraps its small animated pieces (the footer buttons, the
// row's submit arrow, the validation error) in AnimatePresence. This is the
// same contract on an element that stays in the template: `[ffAuqPresence]`
// says whether it is present. Appearing, it springs from `presenceFrom` to
// rest; leaving, it plays back to `presenceFrom` and is then hidden (display
// none, inert) instead of unmounted, so the exit always finishes — TestBed
// never runs `animate.leave`, and a stalled tab can't strand it (a timer
// finishes the exit). `data-present` mirrors the state at once.
//
// `presencePopLayout` is AnimatePresence mode="popLayout" with
// layout="position" siblings: a leaving element is popped out of flow
// (absolute, where it stood), and the siblings it shares a parent with glide
// from their old spot to the new one on the same spring, as does a sibling
// pushed aside by an entering element.
// ---------------------------------------------------------------------------

/** A transform-and-opacity pose: the "from" an element enters from and exits to. */
export type PresencePose = { opacity?: number; scale?: number; y?: number };

const REST: Required<PresencePose> = { opacity: 1, scale: 1, y: 0 };

/** spring.fast with its own opacity duration: the React `{ ...spring.fast,
 *  opacity: { duration } }` transitions. */
export function fastWithFade(opacity: number): AnimationOptions {
  return {
    type: spring.fast.type,
    duration: spring.fast.duration,
    bounce: spring.fast.bounce,
    opacity: { duration: opacity },
  } as AnimationOptions;
}

@Directive({
  selector: '[ffAuqPresence]',
  host: { '[attr.data-present]': 'present() ? "true" : "false"' },
})
export class AuqPresence {
  readonly present = input.required<boolean>({ alias: 'ffAuqPresence' });
  /** The pose it enters from and exits to. */
  readonly presenceFrom = input<PresencePose>({ opacity: 0 });
  readonly presenceEnter = input<AnimationOptions>(fastWithFade(0.08));
  /** Defaults to the enter transition. */
  readonly presenceExit = input<AnimationOptions | undefined>(undefined);
  /** Animate an element present on first render (AnimatePresence's
   *  `initial`). */
  readonly presenceInitial = input(true);
  readonly presencePopLayout = input(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  // Reduced motion keeps the fades and drops the scale and travel, like the
  // React MotionConfig reducedMotion="user".
  private readonly reduced = inject(ReducedMotion).value;
  private running: { stop(): void; finished: Promise<void> } | null = null;
  private fallback: ReturnType<typeof setTimeout> | undefined;
  private first = true;

  constructor() {
    effect(() => {
      const present = this.present();
      untracked(() => this.sync(present));
    });
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  private stop() {
    this.running?.stop();
    this.running = null;
    clearTimeout(this.fallback);
  }

  private sync(present: boolean) {
    const first = this.first;
    this.first = false;
    const from = { ...REST, ...this.presenceFrom() };
    if (first) {
      if (!present) this.hide();
      else if (this.presenceInitial()) this.play(from, REST, this.presenceEnter());
      else this.write(REST);
      return;
    }
    this.stop();
    if (present) {
      const glide = this.measureSiblings();
      this.show();
      glide();
      this.play(this.current(from), REST, this.presenceEnter());
      return;
    }
    const glide = this.measureSiblings();
    if (this.presencePopLayout()) this.pop();
    glide();
    this.host.inert = true;
    const exit = this.presenceExit() ?? this.presenceEnter();
    const controls = this.play(this.current(REST), from, exit);
    const done = () => {
      if (this.running !== controls) return;
      this.running = null;
      clearTimeout(this.fallback);
      this.hide();
    };
    controls.finished.then(done);
    const seconds = typeof exit.duration === 'number' ? exit.duration : spring.fast.duration;
    this.fallback = setTimeout(done, Math.round(seconds * 1000) + 100);
  }

  /** The pose the element is at now (mid-animation included). */
  private current(fallback: Required<PresencePose>): Required<PresencePose> {
    const style = this.host.style;
    const opacity = style.opacity === '' ? fallback.opacity : Number(style.opacity);
    const scale = /scale\(([\d.]+)\)/.exec(style.transform)?.[1];
    const y = /translateY\((-?[\d.]+)px\)/.exec(style.transform)?.[1];
    return {
      opacity: Number.isFinite(opacity) ? opacity : fallback.opacity,
      scale: scale !== undefined ? Number(scale) : fallback.scale,
      y: y !== undefined ? Number(y) : fallback.y,
    };
  }

  private play(from: Required<PresencePose>, to: Required<PresencePose>, transition: AnimationOptions) {
    this.write(from);
    const keyframes = {
      opacity: [from.opacity, to.opacity],
      scale: [from.scale, to.scale],
      y: [from.y, to.y],
    } as DOMKeyframesDefinition;
    const handle = animateFluid(this.host, keyframes, transition, untracked(this.reduced));
    this.running = handle;
    return handle;
  }

  private write(pose: Required<PresencePose>) {
    const style = this.host.style;
    style.opacity = String(pose.opacity);
    const parts = [pose.y !== 0 ? `translateY(${pose.y}px)` : '', pose.scale !== 1 ? `scale(${pose.scale})` : ''];
    style.transform = parts.filter(Boolean).join(' ') || 'none';
  }

  private show() {
    const style = this.host.style;
    style.removeProperty('display');
    style.removeProperty('position');
    style.removeProperty('left');
    style.removeProperty('top');
    this.host.inert = false;
  }

  private hide() {
    this.host.style.display = 'none';
    this.host.inert = true;
  }

  /** Takes the element out of flow where it stands. */
  private pop() {
    const { offsetLeft, offsetTop } = this.host;
    const style = this.host.style;
    style.position = 'absolute';
    style.left = `${offsetLeft}px`;
    style.top = `${offsetTop}px`;
  }

  /** Records where the visible siblings sit; the returned function, called
   *  after the layout change, glides each one from there to its new spot. */
  private measureSiblings(): () => void {
    if (!this.presencePopLayout()) return () => {};
    const parent = this.host.parentElement;
    if (!parent) return () => {};
    const siblings = Array.from(parent.children).filter(
      (el): el is HTMLElement => el !== this.host && el instanceof HTMLElement && el.style.display !== 'none',
    );
    const before = siblings.map((el) => el.offsetLeft);
    return () => {
      siblings.forEach((el, i) => {
        const dx = before[i] - el.offsetLeft;
        if (dx === 0) return;
        animateFluid(
          el,
          { x: [dx, 0] },
          { type: spring.fast.type, duration: spring.fast.duration, bounce: spring.fast.bounce },
          untracked(this.reduced),
        );
      });
    };
  }
}
