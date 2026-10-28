// ---------------------------------------------------------------------------
// The card around a /demo slide. Ported from app/components/bento-card.tsx with
// the one part the home grid never uses: the footer's `action` slot, where the
// demo page pins the scale toggle (already the home card's job is a different
// one: the FLIP the grid runs when its column count changes).
//
// The footer name is a link to the component's docs when the slide has a slug,
// and the settings slide (no slug) gets the plain label instead. The action is
// layered over the link rather than sitting beside it: the link keeps the full
// row so its hover fill runs edge to edge, and a button nested in an anchor is
// invalid markup anyway.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Badge, cn, fontWeights } from '@angel-r/fluid-functionalism-angular';

@Component({
  selector: 'app-demo-card',
  imports: [NgTemplateOutlet, RouterLink, Badge],
  template: `
    <div class="flex-1 min-h-0 flex items-center justify-center px-6 py-16">
      <ng-content />
    </div>

    <div class="relative shrink-0 border-t border-border/40">
      @if (slug()) {
        <a
          [routerLink]="'/docs/' + slug()"
          [attr.aria-label]="'View ' + name() + ' documentation'"
          class="group/link flex items-center gap-2 px-4 py-3 rounded-b-xl transition-colors duration-80 hover:bg-hover outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--focus-ring,#6B97FF)]"
        >
          <ng-container *ngTemplateOutlet="label" />
        </a>
      } @else {
        <div class="flex items-center gap-2 px-4 py-3">
          <ng-container *ngTemplateOutlet="label" />
        </div>
      }
      <div class="absolute inset-y-0 right-2 z-10 flex items-center">
        <ng-content select="[demo-action]" />
      </div>
    </div>

    <ng-template #label>
      <div class="flex items-center gap-2">
        <span [class]="labelClass()" [style.font-variation-settings]="normal">{{ name() }}</span>
        @if (isNew()) {
          <ff-badge variant="dot" color="blue" size="sm">New</ff-badge>
        }
      </div>
    </ng-template>
  `,
  // The host IS React's card root, so the class list matches it token for token
  // and the card box is what the page measures and fills.
  host: { '[class]': 'hostClass', style: 'height: 100%' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoCard {
  /** Empty on the settings slide: the footer name is not a link there. */
  readonly slug = input('');
  readonly name = input.required<string>();
  readonly isNew = input(false);

  protected readonly normal = fontWeights.normal;

  // No unnamed `group` here: many of the components inside the card use
  // Tailwind's unnamed `group-hover:`, and an unnamed group on the card would
  // fire all of them at once. The footer link uses a named `group/link`.
  protected readonly hostClass = cn(
    'relative flex flex-col rounded-xl border overflow-clip outline-none transition-[shadow,border-color] duration-80 bento-card-border',
  );

  /** The label dims until the footer link is hovered — only when there is one. */
  protected readonly labelClass = computed(() =>
    cn(
      'text-site-body text-muted-foreground transition-colors duration-80',
      this.slug() && 'group-hover/link:text-foreground',
    ),
  );
}
