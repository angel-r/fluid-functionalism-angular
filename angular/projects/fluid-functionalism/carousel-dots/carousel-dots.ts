import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  untracked,
  viewChild,
} from '@angular/core';
import { animate, isMotionValue, motionValue, type MotionValue } from 'motion';
import { cn, spring, enterTransition, ReducedMotion } from '@angel-r/fluid-functionalism-angular/core';
import { FLUID_HOVER, FluidHoverItem, createFluidHover, FluidHoverHighlight } from '@angel-r/fluid-functionalism-angular/fluid-hover';

// ─── CarouselDots ───────────────────────────────────────────────────────
// A row of 6px dots, one per slide. The current one stretches into a 24px
// pill. Static, it is solid; with `autoplay` it fills over each slide's
// duration and then moves to the next. Each dot sits in an
// 18px round click area, and one fluid highlight glides between those areas
// on hover, so the target you are about to hit is always visible.

/** Dot height, and the diameter of every resting dot. */
const DOT_PX = 6;
/** Width of the current dot's pill. */
const PILL_PX = 24;

/** The light track every dot shares; the playing pill's fill is darker. */
const TRACK_COLOR = 'color-mix(in oklab, var(--foreground), transparent 85%)';
const FILL_COLOR = 'color-mix(in oklab, var(--foreground), transparent 60%)';

/** The fill is a full-width pill slid in from the left, never scaled:
 *  scaling would squash its rounded end. At 0 a full dot shows, so the
 *  clock starts as a perfect circle; at 1 it covers the pill. */
const fillAt = (p: number) => {
  const clamped = Math.min(Math.max(p, 0), 1);
  return `translateX(calc(${clamped - 1} * (100% - ${DOT_PX}px)))`;
};

export interface CarouselDotsAutoplay {
  /** How long each slide plays before the next one, in ms. Default 3000. */
  duration?: number;
  /** Holds the fill where it is, e.g. while the pointer is over the slide. */
  paused?: boolean;
  /** After the last slide, go back to the first. Default true. */
  loop?: boolean;
}

const defaultLabel = (index: number) => `Go to slide ${index + 1}`;
const DEFAULT_DURATION = 3000;
/** A frame longer than this is a stall (a background tab), not playback. */
const MAX_FRAME_MS = 100;

/**
 * The dot's track: animates its own width between the resting dot and the
 * pill. Width is a layout value, which the reduced-motion rule for transforms
 * does not cover, so it gates itself: instant under reduced motion. The first
 * render sets the width directly (React's `initial={false}`).
 */
@Directive({ selector: '[ffCarouselDotTrack]' })
export class CarouselDotTrack {
  readonly current = input(false, { alias: 'ffCarouselDotTrack' });
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly reduced = inject(ReducedMotion).value;

  constructor() {
    let first = true;
    effect(() => {
      const width = this.current() ? PILL_PX : DOT_PX;
      untracked(() => {
        if (first) {
          first = false;
          this.element.style.width = `${width}px`;
          return;
        }
        animate(this.element, { width }, this.reduced() ? { duration: 0 } : enterTransition(spring.moderate));
      });
    });
  }
}

@Component({
  selector: 'ff-carousel-dots',
  imports: [FluidHoverHighlight, FluidHoverItem, CarouselDotTrack],
  providers: [{ provide: FLUID_HOVER, useFactory: () => inject(CarouselDots).hover }],
  host: {
    role: 'group',
    'aria-label': 'Slides',
    '[class]': 'hostClass()',
    '(mousemove)': 'hover.onMouseMove($event)',
    '(mouseenter)': 'hover.onMouseEnter()',
    '(mouseleave)': 'hover.onMouseLeave()',
    '(click)': 'hover.onClick($event)',
  },
  template: `
    <ff-fluid-hover-highlight class="rounded-full" />
    @for (i of indexes(); track i) {
      <button
        type="button"
        [ffFluidHoverItem]="i"
        (click)="select(i)"
        [attr.aria-label]="getLabel()(i)"
        [attr.aria-current]="i === value() ? 'true' : null"
        class="relative z-10 flex items-center rounded-full p-1.5 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
      >
        <span
          class="relative block overflow-hidden rounded-full"
          [style.height.px]="dotPx"
          [style.background-color]="trackColor"
          [ffCarouselDotTrack]="i === value()"
        >
          @if (i === value()) {
            <span #fill aria-hidden="true" class="absolute inset-0 rounded-full" [style.background-color]="fillColor"></span>
          }
        </span>
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselDots {
  /** How many dots to show. */
  readonly count = input.required<number>();
  /** Index of the current dot. Set by a click, and by autoplay finishing a
   *  slide; `valueChange` reports both. */
  readonly value = model(0);
  /** Autoplay: the current pill fills over `duration`, then the next slide
   *  comes in. `true` uses the defaults. Omit it for a static, solid pill. */
  readonly autoplay = input<boolean | CarouselDotsAutoplay | undefined>(undefined);
  /** Drive the fill yourself, from 0 to 1, when something else owns the
   *  clock. A MotionValue moves it every frame without change detection.
   *  Takes precedence over `autoplay`. */
  readonly progress = input<number | MotionValue<number> | undefined>(undefined);
  /** Accessible name for each dot. Defaults to "Go to slide N". */
  readonly getLabel = input<(index: number) => string>(defaultLabel);
  readonly userClass = input('', { alias: 'class' });

  protected readonly dotPx = DOT_PX;
  protected readonly trackColor = TRACK_COLOR;
  protected readonly fillColor = FILL_COLOR;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly reduced = inject(ReducedMotion).value;
  readonly hover = createFluidHover(() => this.host, { axis: 'x' });

  protected readonly hostClass = computed(() => cn('relative flex w-fit items-center', this.userClass()));
  protected readonly indexes = computed(() => Array.from({ length: Math.max(0, this.count()) }, (_, i) => i));

  private readonly options = computed(() => {
    const autoplay = this.autoplay();
    return autoplay === true ? {} : autoplay || null;
  });
  private readonly autoplaying = computed(() => this.options() !== null && this.progress() === undefined);

  private readonly fill = viewChild<ElementRef<HTMLElement>>('fill');

  // One local motion value serves every mode: a static pill sits at 1, a
  // number is copied in, and autoplay advances it on its own clock.
  private readonly local: MotionValue<number>;
  // Set once the clock has asked for the next slide, so it asks once, not
  // every frame, if the parent is slow to (or chooses not to) move on.
  private waiting = false;

  constructor() {
    const progress = this.progress();
    this.local = motionValue(typeof progress === 'number' ? progress : this.autoplaying() ? 0 : 1);

    effect(() => {
      const progress = this.progress();
      const autoplaying = this.autoplaying();
      untracked(() => {
        if (typeof progress === 'number') this.local.set(progress);
        else if (progress === undefined && !autoplaying) this.local.set(1);
      });
    });

    // Autoplay restarts the fill whenever the slide changes, whoever changed
    // it: a click, the clock itself, or the parent.
    effect(() => {
      this.value();
      const autoplaying = this.autoplaying();
      untracked(() => {
        this.waiting = false;
        if (autoplaying) this.local.set(0);
      });
    });

    // The clock. Live values are read untracked each frame, so it never
    // restarts on an input change; only toggling autoplay or reduced motion
    // does. Reduced motion: no timer moves the page on the reader's behalf.
    effect((onCleanup) => {
      if (!this.autoplaying() || this.reduced()) return;
      let raf = 0;
      let last = performance.now();
      const tick = (now: number) => {
        const dt = now - last;
        last = now;
        const options = untracked(this.options) ?? {};
        const duration = options.duration ?? DEFAULT_DURATION;
        const paused = options.paused ?? false;
        const loop = options.loop ?? true;
        const value = untracked(this.value);
        const count = untracked(this.count);
        if (!paused && !this.waiting && dt < MAX_FRAME_MS) {
          const next = this.local.get() + dt / duration;
          if (next < 1) {
            this.local.set(next);
          } else if (loop || value < count - 1) {
            this.local.set(1);
            this.waiting = true;
            this.value.set((value + 1) % count);
          } else {
            this.local.set(1);
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      onCleanup(() => cancelAnimationFrame(raf));
    });

    // The fill follows the source every frame, straight to the DOM. The fill
    // element is re-created whenever the current dot moves.
    effect((onCleanup) => {
      const fill = this.fill()?.nativeElement;
      const progress = this.progress();
      if (!fill) return;
      const source = isMotionValue(progress) ? (progress as MotionValue<number>) : this.local;
      const apply = (p: number) => (fill.style.transform = fillAt(p));
      apply(source.get());
      onCleanup(source.on('change', apply));
    });

    inject(DestroyRef).onDestroy(() => this.local.destroy());
  }

  protected select(index: number) {
    this.value.set(index);
  }
}
