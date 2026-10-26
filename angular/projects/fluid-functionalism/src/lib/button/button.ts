import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../core/utils';
import { injectShape } from '../core/shape';
import { injectSizeVariant } from '../core/size';
import { Icon } from '../core/icon';
import type { IconDefinition, IconName } from '../core/icons';

export const buttonVariants = cva(
  [
    // whitespace-nowrap: a label never breaks onto 2 lines. It also makes
    // the label the button's narrowest width, so a tight row moves the
    // button (or overflows) instead of squeezing it.
    'group relative isolate inline-flex items-center justify-center outline-none cursor-pointer select-none whitespace-nowrap',
    'transition-colors duration-80',
    'disabled:opacity-50 disabled:pointer-events-none',
    'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
  ],
  {
    variants: {
      variant: {
        primary: 'text-background',
        secondary: 'text-foreground',
        tertiary: 'text-foreground',
        ghost: 'text-muted-foreground hover:text-foreground',
      },
      // The two-step size ladder shared by every control.
      // default = 36px control height, compact = 28px for dense surfaces.
      size: {
        default: 'h-9 px-4 text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)] gap-1.5',
        compact: 'h-7 px-3 text-[length:var(--fs-body-compact,12px)] leading-[var(--lh-body-compact,18px)] gap-1',
        icon: 'h-9 w-9 p-0 [&_svg]:h-4 [&_svg]:w-4',
        'icon-compact': 'h-7 w-7 p-0 [&_svg]:h-3.5 [&_svg]:w-3.5',
      },
      iconLeft: { true: '' },
      iconRight: { true: '' },
    },
    // An icon sits 4px closer to its edge than text does: 12px default and
    // 8px compact, against the 16px / 12px base padding.
    compoundVariants: [
      { size: 'compact', iconLeft: true, className: 'pl-2' },
      { size: 'default', iconLeft: true, className: 'pl-3' },
      { size: 'compact', iconRight: true, className: 'pr-2' },
      { size: 'default', iconRight: true, className: 'pr-3' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;

type ButtonSizeCanonical = 'default' | 'compact' | 'icon' | 'icon-compact';

/** Public size values: the canonical two-size scale plus the pre-sizes-system
 *  aliases. Aliases resolve onto the canonical ladder (sm → compact; md/lg →
 *  default). */
export type ButtonSize = ButtonSizeCanonical | 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-lg';

const legacySizeAliases: Partial<Record<ButtonSize, ButtonSizeCanonical>> = {
  sm: 'compact',
  md: 'default',
  lg: 'default',
  'icon-sm': 'icon-compact',
  'icon-lg': 'icon',
};

/** An icon by role name from the icon map, or an icon definition. */
export type ButtonIcon = IconName | IconDefinition;

/* Press effect: the surface layer sits 1px inside the button and a
   same-color box-shadow spread fills it back out to the full bounds.
   Pressing collapses the spread, shrinking the surface by exactly 1px per
   side at any width — a scale would warp (2% of a 400px button is 8px
   sideways but under 1px vertically). Primary's fills are opaque
   color-mix()es. Secondary's are see-through (--tint), so it takes on the
   surface or tinted banner under it; its fill and spread ring still never
   double up, since an outer shadow renders only outside the surface box. */
const bgVariants: Record<ButtonVariant, string> = {
  primary:
    '[--btn-bg:var(--foreground)] group-hover:[--btn-bg:color-mix(in_oklab,var(--foreground)_90%,var(--background))] group-active:[--btn-bg:color-mix(in_oklab,var(--foreground)_80%,var(--background))] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
  secondary:
    '[--btn-bg:var(--tint)] group-hover:[--btn-bg:var(--tint-hover)] group-active:[--btn-bg:var(--tint)] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
  // The border ring is an outer 1px shadow at rest that hands off to an
  // inset 1px shadow when pressed, so the ring moves inward with the
  // surface. The translucent fill only ever reaches the ring's inner edge
  // (exactly the surface box), so it needs no spread of its own.
  tertiary:
    'bg-transparent shadow-[0_0_0_1px_var(--border),inset_0_0_0_0px_var(--border)] group-hover:bg-hover group-active:bg-active group-active:shadow-[0_0_0_0px_var(--border),inset_0_0_0_1px_var(--border)]',
  // Translucent fill + same-color spread never double up: outer shadows
  // render only outside the surface box.
  ghost:
    'bg-transparent shadow-[0_0_0_1px_transparent] group-hover:bg-hover group-hover:shadow-[0_0_0_1px_var(--hover)] group-active:bg-active group-active:shadow-[0_0_0_0px_var(--active)]',
};

/* Forced-active (`active` input): pressed colors at full size; the
   geometric press-collapse still reacts on top. */
const activeBgVariants: Record<ButtonVariant, string> = {
  primary:
    '[--btn-bg:color-mix(in_oklab,var(--foreground)_80%,var(--background))] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
  secondary:
    '[--btn-bg:var(--tint)] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
  tertiary:
    'bg-active shadow-[0_0_0_1px_var(--border),inset_0_0_0_0px_var(--border)] group-active:shadow-[0_0_0_0px_var(--border),inset_0_0_0_1px_var(--border)]',
  ghost: 'bg-active shadow-[0_0_0_1px_var(--active)] group-active:shadow-[0_0_0_0px_var(--active)]',
};

const surfaceBase =
  'absolute inset-px rounded-[inherit] transition-[box-shadow,background-color] [transition-duration:180ms,80ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1),ease] group-active:[transition-duration:80ms,80ms]';

/** Splits an icon input into the `name` / `icon` inputs of `<ff-icon>`. */
function iconInputs(icon: ButtonIcon | undefined) {
  if (icon === undefined || icon === null) return null;
  return typeof icon === 'string' ? { name: icon, icon: undefined } : { name: undefined, icon };
}

/**
 * `<button ffButton>Save</button>`, or `<a ffButton href="/docs">` for a
 * plain link styled as a button (the React `asChild` / `render` path: no
 * button semantics on the link).
 */
@Component({
  selector: 'button[ffButton], a[ffButton]',
  imports: [Icon, NgTemplateOutlet],
  template: `
    <ng-template #label><ng-content /></ng-template>
    <span aria-hidden="true" [class]="surfaceClass()"></span>
    <span class="relative inline-flex items-center justify-center gap-[inherit]">
      @if (loading()) {
        <span class="flex items-center justify-center gap-[inherit] opacity-0">
          @if (!isIconOnly() && leading(); as icon) {
            <ff-icon [name]="icon.name" [icon]="icon.icon" [size]="iconSize()" [strokeWidth]="2" />
          }
          <ng-container [ngTemplateOutlet]="label" />
          @if (!isIconOnly() && trailing(); as icon) {
            <ff-icon [name]="icon.name" [icon]="icon.icon" [size]="iconSize()" [strokeWidth]="2" />
          }
        </span>
        <span class="absolute inset-0 flex items-center justify-center">
          <svg [attr.class]="spinnerSizeClass()" viewBox="0 0 24 24" fill="none">
            <path
              d="M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z"
              stroke="currentColor"
              stroke-width="1.125"
              stroke-linecap="round"
              pathLength="100"
              style="stroke-dasharray: 15 85; animation: spinner-move 2s linear infinite, spinner-dash 4s ease-in-out infinite"
            />
          </svg>
        </span>
      } @else if (isIconOnly()) {
        <span class="[&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-80 group-hover:[&_svg]:stroke-[2]">
          <ng-container [ngTemplateOutlet]="label" />
        </span>
      } @else {
        @if (leading(); as icon) {
          <ff-icon
            [name]="icon.name"
            [icon]="icon.icon"
            [size]="iconSize()"
            [strokeWidth]="1.5"
            class="transition-[stroke-width] duration-80 group-hover:stroke-[2]"
          />
        }
        <!-- text-box only applies to block containers, so the trim lives on
             the label span (a blockified flex item), not the flex root. The
             button's height is fixed (h-*), so this doesn't change layout —
             it just centers the cap-to-baseline box optically. -->
        <span class="[text-box:trim-both_cap_alphabetic]"><ng-container [ngTemplateOutlet]="label" /></span>
        @if (trailing(); as icon) {
          <ff-icon
            [name]="icon.name"
            [icon]="icon.icon"
            [size]="iconSize()"
            [strokeWidth]="1.5"
            class="transition-[stroke-width] duration-80 group-hover:stroke-[2]"
          />
        }
      }
    </span>
  `,
  host: {
    '[class]': 'rootClass()',
    '[attr.type]': 'isNativeButton ? type() : null',
    '[attr.disabled]': 'isNativeButton && (disabled() || loading()) ? "" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  /** Omitted, the button follows the surrounding SizeProvider (default 36px,
   *  compact 28px). Legacy sm/md/lg values still resolve. */
  readonly size = input<ButtonSize | undefined>(undefined);
  /** Shows a spinner and disables the button. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Disables a native button. Ignored on a link host, like the React
   *  `asChild` path. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Force the visual pressed/held state, e.g. while a menu the button
   *  opened is showing. */
  readonly active = input(false, { transform: booleanAttribute });
  readonly leadingIcon = input<ButtonIcon | undefined>(undefined);
  readonly trailingIcon = input<ButtonIcon | undefined>(undefined);
  /** The native button type. Defaults to "button" (Base UI's default), so a
   *  button inside a form never submits it by accident. */
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly userClass = input('', { alias: 'class' });

  protected readonly isNativeButton =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'BUTTON';
  private readonly shape = injectShape();
  private readonly contextSize = injectSizeVariant();

  // Explicit input (legacy aliases mapped onto the canonical ladder) >
  // surrounding SizeProvider > default.
  protected readonly resolvedSize = computed<ButtonSizeCanonical>(() => {
    const size = this.size();
    if (size) return legacySizeAliases[size] ?? (size as ButtonSizeCanonical);
    return this.contextSize() === 'compact' ? 'compact' : 'default';
  });
  protected readonly isIconOnly = computed(() => {
    const size = this.resolvedSize();
    return size === 'icon' || size === 'icon-compact';
  });
  private readonly isCompact = computed(() => {
    const size = this.resolvedSize();
    return size === 'compact' || size === 'icon-compact';
  });
  protected readonly iconSize = computed(() => (this.isCompact() ? 14 : 16));
  // Spinner box tracks the button height so the loading glyph stays
  // proportionate across sizes.
  protected readonly spinnerSizeClass = computed(() => (this.isCompact() ? 'h-7 w-7' : 'h-9 w-9'));
  protected readonly leading = computed(() => iconInputs(this.leadingIcon()));
  protected readonly trailing = computed(() => iconInputs(this.trailingIcon()));

  protected readonly surfaceClass = computed(() =>
    cn(surfaceBase, (this.active() ? activeBgVariants : bgVariants)[this.variant()]),
  );

  protected readonly rootClass = computed(() =>
    cn(
      buttonVariants({
        variant: this.variant(),
        size: this.resolvedSize(),
        iconLeft: !this.isIconOnly() && !!this.leading(),
        iconRight: !this.isIconOnly() && !!this.trailing(),
      }),
      this.shape().button,
      this.userClass(),
    ),
  );
}
