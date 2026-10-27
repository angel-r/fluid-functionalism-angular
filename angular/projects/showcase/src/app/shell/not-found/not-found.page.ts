// ---------------------------------------------------------------------------
// "A little out of place.": the 404. Ported from app/not-found.tsx, with the
// zero springing into line with the fours on hover or focus and settling back
// out of it. The shell hides the right panel on it (a :has([data-not-found])
// rule on the sidebar provider), so the section carries the marker.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Button,
  ReducedMotion,
  enterTransition,
  fontWeights,
  injectAnimateFluid,
  spring,
  type IconNode,
} from '@angel-r/fluid-functionalism-angular';

/* ANIMATION STORYBOARD
 * Rest         zero sits a little below the fours; no entrance or idle loop.
 * Hover/focus  zero springs into alignment with the surrounding digits.
 * Leave/blur   zero settles back into its displaced position.
 * Reduced      keep the displaced composition still.
 */
const REST = '0.12em';
const ALIGNED = '0em';
const ZERO_SPRING = spring.slow;

/** Lucide's ArrowUpRight, on the icon frame's 24×24 stroke grid. */
const ARROW_UP_RIGHT: IconNode = [
  ['path', { d: 'M7 7h10v10' }],
  ['path', { d: 'M7 17 17 7' }],
];

@Component({
  selector: 'app-not-found-page',
  // The host stands in for React's fragment/root element: contents keeps it
  // out of the layout its children measured themselves against.
  host: { style: 'display: contents' },
  imports: [RouterLink, Button],
  template: `
    <section
      data-not-found
      aria-labelledby="not-found-title"
      class="flex min-h-svh w-full items-center justify-center px-6 pt-20 pb-32 sm:pb-40"
    >
      <div
        class="flex flex-col items-center text-center"
        (pointerenter)="hovering.set(true)"
        (pointerleave)="hovering.set(false)"
        (focusin)="stage.set(1)"
        (focusout)="stage.set(0)"
      >
        <div
          aria-hidden="true"
          class="mb-12 flex select-none gap-[0.04em] text-[clamp(7rem,18vw,12rem)] leading-none text-foreground"
        >
          <span>4</span>
          <span #zero class="inline-block" [style.transform]="'translateY(' + rest + ')'">0</span>
          <span>4</span>
        </div>
        <h1 id="not-found-title" class="text-site-display text-foreground" [style.font-variation-settings]="bold">
          <span class="sr-only">404. </span>A little out of place.
        </h1>
        <p class="mt-2 text-site-body text-muted-foreground">We couldn’t find this page.</p>
        <a ffButton routerLink="/" variant="tertiary" [trailingIcon]="arrowUpRight" [class]="'mt-7'">Back to showcase</a>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NotFoundPage {
  protected readonly rest = REST;
  protected readonly bold = fontWeights.bold;
  protected readonly arrowUpRight = ARROW_UP_RIGHT;

  protected readonly hovering = signal(false);
  protected readonly stage = signal(0);
  /** Reduced motion keeps the displaced composition still. */
  protected readonly aligned = computed(() => !this.reduced.value() && (this.hovering() || this.stage() >= 1));

  private readonly reduced = inject(ReducedMotion);
  private readonly animate = injectAnimateFluid();
  private readonly zero = viewChild<ElementRef<HTMLElement>>('zero');

  constructor() {
    // The first pass animates rest → rest, so there is no entrance: the
    // reference's initial={false}. Every later change springs the zero.
    afterRenderEffect(() => {
      const aligned = this.aligned();
      const element = this.zero()?.nativeElement;
      if (!element) return;
      untracked(() => this.animate(element, { y: aligned ? ALIGNED : REST }, enterTransition(ZERO_SPRING)));
    });
  }
}
