import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { cn, fontWeights, injectSizeVariant, typeClass } from '../core';
import { Button, type ButtonIcon } from '../button';

// ── BannerTitle ──────────────────────────────────────────

/** The message: `<p ffBannerTitle>`. */
@Directive({
  selector: '[ffBannerTitle]',
  host: {
    'data-slot': 'banner-title',
    '[class]': 'hostClass()',
    '[style.font-variation-settings]': 'fontVariation',
  },
})
export class BannerTitle {
  readonly userClass = input('', { alias: 'class' });
  private readonly size = injectSizeVariant();
  protected readonly fontVariation = fontWeights.semibold;
  protected readonly hostClass = computed(() =>
    cn(
      'col-start-2 row-start-1 min-w-0 text-foreground',
      typeClass('subtitle', this.size() === 'compact' ? 'compact' : 'default'),
      this.userClass(),
    ),
  );
}

// ── BannerDescription ────────────────────────────────────
// Foreground, like the title: muted grey drops under 4.5:1 on the tinted
// and neutral fills, and the title already stands apart by its weight.

/** Optional text under the title: `<p ffBannerDescription>`. */
@Directive({
  selector: '[ffBannerDescription]',
  host: { 'data-slot': 'banner-description', '[class]': 'hostClass()' },
})
export class BannerDescription {
  readonly userClass = input('', { alias: 'class' });
  private readonly size = injectSizeVariant();
  protected readonly hostClass = computed(() =>
    cn(
      'col-start-2 row-start-2 mt-0.5 min-w-0 text-foreground',
      typeClass('subtitle', this.size() === 'compact' ? 'compact' : 'default'),
      this.userClass(),
    ),
  );
}

// ── BannerActions ────────────────────────────────────────
// Trailing on the title row by default (pulled into the padding so a 28px
// button doesn't grow a one-line banner). Under the text, aligned with the
// title and 8px below it (6px compact), when the banner has a description or
// is narrower than 24rem. Each BannerAction places itself by variant, so the
// order flips with the layout (see BANNER_ACTION_ORDER).

/** Up to 3 actions: `<div ffBannerActions>`. */
@Directive({
  selector: '[ffBannerActions]',
  host: { 'data-slot': 'banner-actions', '[class]': 'hostClass()' },
})
export class BannerActions {
  readonly userClass = input('', { alias: 'class' });
  private readonly size = injectSizeVariant();
  protected readonly hostClass = computed(() => {
    const compact = this.size() === 'compact';
    return cn(
      'col-start-3 row-start-1 flex flex-wrap items-center gap-2',
      compact ? '-my-[5px] ml-2.5' : '-my-1 ml-3',
      // With a description
      'group-has-data-[slot=banner-description]/banner:col-start-2 group-has-data-[slot=banner-description]/banner:row-start-3 group-has-data-[slot=banner-description]/banner:my-0 group-has-data-[slot=banner-description]/banner:ml-0',
      compact
        ? 'group-has-data-[slot=banner-description]/banner:mt-1.5'
        : 'group-has-data-[slot=banner-description]/banner:mt-2',
      // Narrow banner
      '@max-sm/banner:col-start-2 @max-sm/banner:row-start-3 @max-sm/banner:my-0 @max-sm/banner:ml-0',
      compact ? '@max-sm/banner:mt-1.5' : '@max-sm/banner:mt-2',
      this.userClass(),
    );
  });
}

// ── BannerAction ─────────────────────────────────────────
// The library Button at its compact 28px size, so it presses like every
// other button and a one-line banner doesn't grow. Primary is ink on any
// status; secondary's see-through tint darkens (or, in dark mode, lightens)
// whatever fill the banner has. Ghost text steps up from muted to 70%
// foreground, which holds 4.5:1 on every banner fill.

export type BannerActionVariant = 'primary' | 'secondary' | 'ghost';

// Where each variant sits, whatever order the actions are written in.
// Trailing the title, the strongest action goes last, at the edge: ghost,
// secondary, primary. Under the text it leads, where the eye starts the row:
// primary, secondary, ghost. Tab order follows the markup, so write primary
// first.
const BANNER_ACTION_ORDER: Record<BannerActionVariant, string> = {
  primary: 'order-3 group-has-data-[slot=banner-description]/banner:order-1 @max-sm/banner:order-1',
  secondary: 'order-2',
  ghost: 'order-1 group-has-data-[slot=banner-description]/banner:order-3 @max-sm/banner:order-3',
};

/**
 * One action: `<ff-banner-action variant="primary" (click)="...">`. Renders
 * the library Button (or a link styled as one when `href` is set). The host
 * is `display: contents`, so the button itself is the flex item its order
 * class places.
 */
@Component({
  selector: 'ff-banner-action',
  imports: [Button, NgTemplateOutlet],
  template: `
    <ng-template #label><ng-content /></ng-template>
    @if (href(); as href) {
      <a
        ffButton
        [variant]="variant()"
        size="compact"
        data-slot="banner-action"
        [class]="classes()"
        [leadingIcon]="leadingIcon()"
        [trailingIcon]="trailingIcon()"
        [attr.href]="href"
        [attr.target]="external() ? '_blank' : null"
        [attr.rel]="external() ? 'noopener noreferrer' : null"
        ><ng-container [ngTemplateOutlet]="label"
      /></a>
    } @else {
      <button
        ffButton
        type="button"
        [variant]="variant()"
        size="compact"
        data-slot="banner-action"
        [class]="classes()"
        [leadingIcon]="leadingIcon()"
        [trailingIcon]="trailingIcon()"
        [disabled]="disabled()"
        [loading]="loading()"
      >
        <ng-container [ngTemplateOutlet]="label" />
      </button>
    }
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerAction {
  readonly variant = input<BannerActionVariant>('secondary');
  /** Renders a link instead of a button. */
  readonly href = input<string | undefined>(undefined);
  /** Opens the href in a new tab. */
  readonly external = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly leadingIcon = input<ButtonIcon | undefined>(undefined);
  readonly trailingIcon = input<ButtonIcon | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  protected readonly classes = computed(() =>
    cn(BANNER_ACTION_ORDER[this.variant()], this.variant() === 'ghost' && 'text-foreground', this.userClass()),
  );
}
