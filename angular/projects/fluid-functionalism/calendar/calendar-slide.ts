import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { animate, type AnimationOptions } from 'motion';
import { spring, enterTransition, exitTransition } from '../core';

/**
 * A month change. Side by side: every grid travels a full stride, so the
 * month leaving the right slot and the same month entering the left slot
 * share one path and read as one strip sliding under the clip. One month:
 * the same slide over a third of the stride, crossfading where the two
 * meet. The direction is read at exit time, so an exiting panel always gets
 * the latest one.
 */
export const SINGLE_MONTH_TRAVEL = 1 / 3;

export interface SlideConfig {
  /** 10px, or 0 under reduced motion (a plain crossfade). */
  offset: number;
  /** Side by side or stacked: the distance between two month slots. */
  stride: number | null;
  axis: 'x' | 'y';
  /** One month on screen. */
  single: boolean;
  /** 1 forward, -1 back. */
  direction: number;
}

interface SlideFrame {
  opacity: number;
  x: number;
  y: number;
}

export function slideVariants({ offset, stride, axis, single }: SlideConfig) {
  const carousel = stride !== null && offset > 0;
  const distance = carousel ? (single ? stride * SINGLE_MONTH_TRAVEL : stride) : offset;
  // Full-stride grids hand over in one path; shorter travel overlaps them.
  const solid = carousel && !single;
  const at = (v: number) => (axis === 'x' ? { x: v, y: 0 } : { x: 0, y: v });
  return {
    enter: (d: number): SlideFrame => ({ opacity: solid ? 1 : 0, ...at(d * distance) }),
    center: { opacity: 1, x: 0, y: 0 } as SlideFrame,
    centerTransition: enterTransition(spring.moderate),
    exit: (d: number): SlideFrame => ({ opacity: solid ? 1 : 0, ...at(-d * distance) }),
    exitTransition: (carousel ? enterTransition(spring.moderate) : exitTransition(spring.moderate)) as AnimationOptions,
  };
}

// An exit that never reports back (a stalled tab) still leaves.
const exitFallback = Math.round(spring.moderate.duration * 1000) + 100;

/**
 * One month panel (a caption or a grid of weeks) with React
 * `AnimatePresence` semantics: it slides in on mount unless `enter` is
 * false, slides out when `present` turns false and then emits `exited`,
 * and slides back if it turns present again mid-exit. With `measure`, a
 * present panel reports its height. Internal to the calendar.
 */
@Directive({ selector: '[ffCalendarSlide]' })
export class CalendarSlide {
  readonly present = input.required<boolean>({ alias: 'ffCalendarSlide' });
  readonly config = input.required<SlideConfig>({ alias: 'ffCalendarSlideConfig' });
  /** Slide in on mount (false for the panels of the first render). */
  readonly enter = input(true, { alias: 'ffCalendarSlideEnter' });
  readonly measure = input(false, { alias: 'ffCalendarSlideMeasure' });
  readonly exited = output<void>({ alias: 'ffCalendarSlideExited' });
  readonly heightChange = output<number>({ alias: 'ffCalendarSlideHeight' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly mounted = signal(false);
  private exitTimer: ReturnType<typeof setTimeout> | null = null;
  private frame: number | null = null;
  private wasPresent = true;

  constructor() {
    afterNextRender(() => {
      const variants = slideVariants(this.config());
      if (this.enter() && this.present()) {
        const from = variants.enter(this.config().direction);
        this.write(from);
        // Like motion/react: the panel paints at its enter pose first and
        // the spring starts on the next frame.
        this.nextFrame(() =>
          animate(
            this.host,
            { opacity: [from.opacity, 1], x: [from.x, 0], y: [from.y, 0] },
            variants.centerTransition,
          ),
        );
      }
      this.mounted.set(true);
    });

    effect(() => {
      const present = this.present();
      if (!this.mounted()) return;
      untracked(() => {
        if (present === this.wasPresent) return;
        this.wasPresent = present;
        if (present) this.revive();
        else this.leave();
      });
    });

    // A present panel reports its height (and again when it resizes).
    const shouldMeasure = computed(() => this.measure() && this.present() && this.mounted());
    effect((onCleanup) => {
      if (!shouldMeasure()) return;
      untracked(() => this.heightChange.emit(this.host.offsetHeight));
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => this.heightChange.emit(this.host.offsetHeight));
      ro.observe(this.host);
      onCleanup(() => ro.disconnect());
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.exitTimer !== null) clearTimeout(this.exitTimer);
      if (this.frame !== null) cancelAnimationFrame(this.frame);
    });
  }

  /** Runs `start` on the next frame, replacing any start still pending. */
  private nextFrame(start: () => void) {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      start();
    });
  }

  private write(frame: SlideFrame) {
    this.host.style.opacity = String(frame.opacity);
    this.host.style.transform = `translateX(${frame.x}px) translateY(${frame.y}px)`;
  }

  private leave() {
    const variants = slideVariants(this.config());
    const to = variants.exit(this.config().direction);
    let done = false;
    const finish = () => {
      if (done || this.present()) return;
      done = true;
      if (this.exitTimer !== null) clearTimeout(this.exitTimer);
      this.exitTimer = null;
      this.exited.emit();
    };
    this.nextFrame(() =>
      animate(this.host, { opacity: to.opacity, x: to.x, y: to.y }, variants.exitTransition).finished.then(
        finish,
        finish,
      ),
    );
    this.exitTimer = setTimeout(finish, exitFallback);
  }

  private revive() {
    if (this.exitTimer !== null) clearTimeout(this.exitTimer);
    this.exitTimer = null;
    const variants = slideVariants(this.config());
    this.nextFrame(() => animate(this.host, { opacity: 1, x: 0, y: 0 }, variants.centerTransition));
  }
}

/**
 * The weeks box: springs between 5- and 6-week heights from a measured
 * offsetHeight (never "auto", which overshoots under a scaled ancestor),
 * clipping only while it moves. Reduced motion jumps. Internal.
 */
@Directive({
  selector: '[ffCalendarWeeks]',
  exportAs: 'ffCalendarWeeks',
  host: { '[class]': 'hostClass()' },
})
export class CalendarWeeksBox {
  readonly reduced = input(false, { alias: 'ffCalendarWeeks' });
  /** Stacked months travel vertically through this box: a clip would slice
   *  them flat, so the strip's soft mask is their only edge. */
  readonly stacked = input(false, { alias: 'ffCalendarWeeksStacked' });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly clip = signal(false);
  /** The month the height was last taken from, and the height it settles on. */
  private measured: { month: number; h: number } | null = null;
  private target: number | null = null;
  protected readonly hostClass = computed(() =>
    this.clip() && !this.stacked() ? 'relative grid [overflow-y:clip]' : 'relative grid',
  );

  /**
   * Only a month change springs. A resize within the same month (fonts and
   * cell sizes settling after mount, a container resize) snaps, so the
   * calendar never grows on first paint.
   */
  onHeight(h: number, monthTime: number) {
    const last = this.measured;
    this.measured = { month: monthTime, h };
    if (!last || this.reduced() || last.month === monthTime) {
      if (last?.month === monthTime && last.h === h) return;
      this.target = h;
      this.host.style.height = `${h}px`;
      this.clip.set(false);
      return;
    }
    if (last.h === h) return;
    this.target = h;
    this.clip.set(true);
    const done = () => {
      if (this.target === h) this.clip.set(false);
    };
    animate(this.host, { height: `${h}px` }, enterTransition(spring.moderate)).finished.then(done, done);
  }
}

/**
 * A range ghost's fade: mounts opaque under everything live and fades out on
 * the moderate exit. Its id restarts the fade when a new pick replaces the
 * range again. The owner removes the element after `exitFallbackMs` even if
 * the animation stalls. Internal to the calendar.
 */
@Directive({ selector: '[ffCalendarGhost]' })
export class CalendarGhost {
  readonly id = input.required<number>({ alias: 'ffCalendarGhost' });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    effect(() => {
      this.id();
      untracked(() => {
        this.host.style.opacity = '1';
        animate(this.host, { opacity: 0 }, exitTransition(spring.moderate));
      });
    });
  }
}
