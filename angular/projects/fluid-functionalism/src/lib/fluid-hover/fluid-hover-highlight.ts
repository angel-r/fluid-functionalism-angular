import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Renderer2,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { animate, type AnimationOptions } from 'motion';
import { cn } from '../core/utils';
import { spring } from '../core/springs';
import { ReducedMotion } from '../core/environment';
import { exitTransition } from '../core/motion';
import { FLUID_HOVER, type FluidHoverController, type ItemRect } from './fluid-hover';

// ---------------------------------------------------------------------------
// The one hover highlight every fluid hover list renders: an absolutely
// positioned fill that springs between the rects the controller measures.
//
//   <div ffFluidHover class="relative">
//     <ff-fluid-hover-highlight [class]="shape().bg" />
//     ...rows with [ffFluidHoverItem]
//   </div>
//
// It owns no layout opinion beyond `absolute`: radius, z-index, and the
// offsetParent (the container must be `relative`) are the consumer's. The
// host is `display: contents`, so the fill's offsetParent is the container.
// ---------------------------------------------------------------------------

const fade: AnimationOptions = { duration: 0.08 };
const snap: AnimationOptions = { duration: 0 };

/** A measured rect as animation targets: position as a transform, size as layout. */
export function toTarget(rect: ItemRect) {
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
}

/**
 * Resolves the positional transition. Reduced motion keeps the opacity fade
 * and drops the travel: fewer and gentler, not none.
 */
export function resolveHighlightTransition(
  transition: AnimationOptions | false | undefined,
  reduceMotion: boolean,
): AnimationOptions {
  const positional =
    transition === false || reduceMotion
      ? snap
      : (transition ?? { type: spring.fast.type, duration: spring.fast.duration, bounce: spring.fast.bounce });
  return { ...positional, opacity: fade } as AnimationOptions;
}

interface Layer {
  element: HTMLDivElement;
  session: number;
}

@Component({
  selector: 'ff-fluid-hover-highlight',
  template: '',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluidHoverHighlight {
  /** The list to follow. Defaults to the enclosing `[ffFluidHover]`. */
  readonly hover = input<FluidHoverController | null>(inject(FLUID_HOVER, { optional: true }));
  /** Keep the list's state but show nothing (a closed popup). Runs the exit fade. */
  readonly hidden = input(false);
  /** For lists that resolve their own rect: the rect to sit on, in the
   *  container's coordinate space. `null` hides the highlight. Wins over `hover`. */
  readonly rect = input<ItemRect | null | undefined>(undefined);
  /** With `rect`: the pointer session, which re-keys the highlight so it fades
   *  in at `from ?? rect` instead of sliding over from wherever it was last. */
  readonly session = input<number>(0);
  /** Where a fresh session fades in from (a checked row, an active route). */
  readonly from = input<ItemRect | null>(null);
  /** `false` starts a fresh session opaque instead of fading in: for a
   *  `from` under a filled item (the calendar's range start), so the
   *  highlight reads as sliding out of it. */
  readonly fadeIn = input(true);
  /** The positional spring; `false` snaps with no travel. Fade is always 0.08s. */
  readonly transition = input<AnimationOptions | false | undefined>(undefined);
  readonly userClass = input<string>('', { alias: 'class' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly reducedMotion = inject(ReducedMotion).value;
  private live: Layer | null = null;

  /** The rect and session the inputs resolve to. */
  readonly source = computed<{ rect: ItemRect | null; session: number }>(() => {
    const rect = this.rect();
    if (rect !== undefined) return { rect, session: this.session() };
    const hover = this.hover();
    if (!hover) return { rect: null, session: 0 };
    const index = hover.activeIndex();
    const visible = !this.hidden() && hover.isMeasured() && index !== null;
    return { rect: visible ? (hover.itemRects()[index] ?? null) : null, session: hover.session() };
  });

  private readonly className = computed(() =>
    cn('pointer-events-none absolute left-0 top-0 bg-hover', this.userClass()),
  );

  constructor() {
    effect(() => {
      const { rect, session } = this.source();
      untracked(() => this.render(rect, session));
    });
    effect(() => {
      const className = this.className();
      if (this.live) this.live.element.className = className;
    });
    inject(DestroyRef).onDestroy(() => this.live?.element.remove());
  }

  private render(rect: ItemRect | null, session: number) {
    const transition = resolveHighlightTransition(this.transition(), this.reducedMotion());
    if (this.live && (rect === null || this.live.session !== session)) {
      const exiting = this.live.element;
      this.live = null;
      animate(exiting, { opacity: 0 }, exitTransition(spring.fast)).finished.then(() => exiting.remove());
    }
    if (!rect) return;
    const target = toTarget(rect);
    if (this.live) {
      animate(this.live.element, { opacity: 1, ...target }, transition);
      return;
    }
    const element = this.renderer.createElement('div') as HTMLDivElement;
    element.className = this.className();
    element.setAttribute('data-slot', 'fluid-hover-highlight');
    this.renderer.appendChild(this.host, element);
    this.live = { element, session };
    const start = toTarget(this.from() ?? rect);
    animate(
      element,
      {
        opacity: [this.fadeIn() ? 0 : 1, 1],
        x: [start.x, target.x],
        y: [start.y, target.y],
        width: [start.width, target.width],
        height: [start.height, target.height],
      },
      transition,
    );
  }
}
