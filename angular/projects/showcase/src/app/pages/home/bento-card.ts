// ---------------------------------------------------------------------------
// One bento tile: the 300px grid cell's card, its preview stage and footer.
// Ported from app/components/bento-card.tsx.
//
// No click-to-focus wiring: a mousedown on empty space used to route focus to
// the preview's first interactive element, which left cards looking "primed"
// (a checked radio, a selected tab) the moment a visitor clicked anywhere in
// them. Now a click only focuses what was actually clicked; Tab still routes
// into the card naturally.
//
// `flipFrom` is the FLIP the grid runs when the column count changes: the card
// box tweens with `spring.moderate` while the stage and the footer label ride
// as React's `layout="position"` nodes — the inverse of the box's scale, so
// their content keeps its size instead of stretching with the box.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Badge,
  ReducedMotion,
  cn,
  enterTransition,
  fontWeights,
  injectAnimateFluid,
  spring,
  type FluidAnimation,
} from '@angel-r/fluid-functionalism-angular';

@Component({
  selector: 'app-bento-card',
  imports: [RouterLink, Badge],
  template: `
    <div #stage [class]="stageClass()">
      <ng-content />
    </div>

    <!-- Footer row: the name, a link to the docs, on the left. The link spans
         the full row so its hover fill runs edge to edge. -->
    <div class="relative shrink-0 border-t border-border/40">
      <a
        [routerLink]="'docs/' + slug()"
        [attr.aria-label]="'View ' + name() + ' documentation'"
        class="group/link flex items-center gap-2 px-4 py-3 rounded-b-xl transition-colors duration-80 hover:bg-hover outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--focus-ring,#6B97FF)]"
      >
        <div #label class="flex items-center gap-2">
          <span
            class="text-site-body text-muted-foreground transition-colors duration-80 group-hover/link:text-foreground"
            [style.font-variation-settings]="normal"
            >{{ name() }}</span
          >
          @if (isNew()) {
            <ff-badge variant="dot" color="blue" size="sm">New</ff-badge>
          }
        </div>
      </a>
    </div>
  `,
  // The host IS React's card root, so the class list matches it token for token
  // and `getBoundingClientRect()` measures the card box itself.
  host: { '[class]': 'hostClass()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoCard {
  readonly slug = input.required<string>();
  readonly name = input.required<string>();
  readonly isNew = input(false);
  /** Overrides the stage's padding for a preview that needs a taller window. */
  readonly previewClassName = input<string | undefined>(undefined);

  protected readonly normal = fontWeights.normal;

  // A named `group/link` scopes the footer's hover: an unnamed group would
  // fire every inner component's own `group-hover:` at once.
  protected readonly hostClass = computed(() =>
    cn(
      'relative flex flex-col rounded-xl border overflow-clip outline-none transition-[shadow,border-color] duration-80 bento-card-border',
      'min-w-0 flex-1',
    ),
  );

  protected readonly stageClass = computed(() =>
    cn('flex-1 min-h-0 flex items-center justify-center px-6 py-16', this.previewClassName()),
  );

  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly label = viewChild<ElementRef<HTMLElement>>('label');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly reduced = inject(ReducedMotion).value;
  private readonly animate = injectAnimateFluid();

  private boxAnimation: FluidAnimation | null = null;
  private readonly innerAnimations: FluidAnimation[] = [];

  /** The card's layout box, transform-free (call `stopFlip` first). */
  rect(): DOMRect {
    return this.host.getBoundingClientRect();
  }

  /** Stops a running FLIP and drops the inline transforms it wrote. */
  stopFlip(): void {
    this.boxAnimation?.stop();
    this.boxAnimation = null;
    for (const animation of this.innerAnimations.splice(0)) animation.stop();
    this.host.style.transform = '';
    for (const node of this.innerNodes()) node.style.transform = '';
  }

  /** Springs the card from `old` (its box before the grid re-slotted it) to
   *  where it now sits. */
  flipFrom(old: DOMRect | null): void {
    const el = this.host;
    if (!old) return;
    // React's layout animations are transform-based and instant under reduced
    // motion: the card is already on its new box, so there is nothing to run.
    if (this.reduced()) {
      this.stopFlip();
      return;
    }
    const next = el.getBoundingClientRect();
    if (!next.width || !next.height) return;

    const scaleX = old.width / next.width;
    const scaleY = old.height / next.height;
    // Framer scales about the box centre, so the translate carries the
    // half-difference between the old and the new size.
    const x = old.left - next.left + (old.width - next.width) / 2;
    const y = old.top - next.top + (old.height - next.height) / 2;
    if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5 && Math.abs(scaleX - 1) < 0.002 && Math.abs(scaleY - 1) < 0.002) {
      this.stopFlip();
      return;
    }

    this.stopFlip();
    this.boxAnimation = this.animate(
      el,
      { x: [x, 0], y: [y, 0], scaleX: [scaleX, 1], scaleY: [scaleY, 1] },
      enterTransition(spring.moderate),
    );
    for (const node of this.innerNodes()) {
      this.innerAnimations.push(
        this.animate(node, { scaleX: [1 / scaleX, 1], scaleY: [1 / scaleY, 1] }, enterTransition(spring.moderate)),
      );
    }
  }

  private innerNodes(): HTMLElement[] {
    return [this.stage()?.nativeElement, this.label()?.nativeElement].filter(
      (node): node is HTMLElement => node !== undefined,
    );
  }
}
