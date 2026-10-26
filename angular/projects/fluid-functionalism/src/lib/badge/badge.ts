import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../core/utils';
import { injectShape } from '../core/shape';
import { injectSizeVariant } from '../core/size';

// ---------------------------------------------------------------------------
// Badge is a short label for status, category or metadata, in 2 variants:
//   solid: a light tint of the color behind foreground text.
//   dot:   a neutral outline and foreground text; only the dot is colored.
// Each color is a single hex. The solid tint is mixed against the page
// background at render time, so the same hex works in light and dark themes.
// ---------------------------------------------------------------------------

// Tailwind's 500 step for each hue (400 for gray). Text never takes the hue:
// it stays on the foreground color, so it keeps its contrast on every color.
export const badgeColors = {
  gray: '#a3a3a3',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
} as const;

export type BadgeColor = keyof typeof badgeColors;

export const badgeVariants = cva('inline-flex items-center whitespace-nowrap', {
  variants: {
    variant: {
      solid: '',
      dot: 'border border-border text-foreground',
    },
    // The two-step size ladder shared by every control: 24px tall by
    // default, 20px compact. The height is fixed rather than padded so the
    // trimmed label below can't shrink the badge.
    size: {
      default: 'h-6 px-2.5 text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] gap-1.5',
      compact: 'h-5 px-2 text-[length:var(--fs-caption-compact,11px)] leading-[var(--lh-caption-compact,14px)] gap-1',
    },
  },
  defaultVariants: {
    variant: 'solid',
    size: 'default',
  },
});

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

type BadgeSizeCanonical = 'default' | 'compact';

/** Public size values: the canonical two-size scale plus the pre-sizes-system
 *  aliases. Aliases resolve onto the canonical ladder (sm → compact; md/lg →
 *  default). */
export type BadgeSize = BadgeSizeCanonical | 'sm' | 'md' | 'lg';

const legacySizeAliases: Partial<Record<BadgeSize, BadgeSizeCanonical>> = {
  sm: 'compact',
  md: 'default',
  lg: 'default',
};

/**
 * `<ff-badge color="green">Live</ff-badge>`, or `<span ffBadge>` on a native
 * span.
 */
@Component({
  selector: 'ff-badge, span[ffBadge]',
  template: `
    @if (!isSolid()) {
      <span
        class="shrink-0 rounded-full"
        [style.width.px]="dotSize()"
        [style.height.px]="dotSize()"
        [style.background-color]="dotColor()"
      ></span>
    }
    <!-- text-box needs a block container. The badge root is a flex
         container, so the label gets its own span. Height is fixed (h-*),
         so trimming only recenters the letterforms. -->
    <span class="[text-box:trim-both_cap_alphabetic]"><ng-content /></span>
  `,
  host: {
    '[class]': 'hostClass()',
    '[style.background-color]': 'fill()',
    '[style.color]': 'textColor()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  readonly variant = input<BadgeVariant>('solid');
  readonly color = input<BadgeColor>('gray');
  /** Omitted, the badge follows the surrounding SizeProvider. Legacy
   *  sm/md/lg values still resolve. */
  readonly size = input<BadgeSize | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  // Corner radius comes from the shape context (pill or rounded), so badges
  // follow the rest of the app instead of hard-coding a radius.
  private readonly shape = injectShape();
  // Explicit prop (legacy aliases mapped onto the canonical ladder) >
  // surrounding SizeProvider > default.
  private readonly contextSize = injectSizeVariant();
  protected readonly resolvedSize = computed<BadgeSizeCanonical>(() => {
    const size = this.size();
    if (size) return legacySizeAliases[size] ?? (size as BadgeSizeCanonical);
    return this.contextSize() === 'compact' ? 'compact' : 'default';
  });

  protected readonly isSolid = computed(() => this.variant() === 'solid');
  protected readonly dotSize = computed(() => (this.resolvedSize() === 'compact' ? 6 : 7));
  // The dot carries the full-strength hex. Gray uses the theme's muted text
  // color instead, so the neutral dot stays visible in both themes.
  protected readonly dotColor = computed(() =>
    this.color() === 'gray' ? 'var(--muted-foreground)' : badgeColors[this.color()],
  );

  // 15% of the hue mixed into the page background: a tint that sits at the
  // right depth in either theme, under plain foreground text. Gray skips the
  // mix and takes the theme's neutral fill (`--accent`), so a gray badge
  // matches the other neutral fills around it.
  protected readonly fill = computed(() => {
    if (!this.isSolid()) return null;
    const color = this.color();
    return color === 'gray'
      ? 'var(--accent)'
      : `color-mix(in srgb, ${badgeColors[color]} 15%, var(--background))`;
  });
  protected readonly textColor = computed(() => (this.isSolid() ? 'var(--foreground)' : null));

  protected readonly hostClass = computed(() =>
    cn(
      badgeVariants({ variant: this.variant(), size: this.resolvedSize() }),
      this.shape().item,
      this.userClass(),
    ),
  );
}
