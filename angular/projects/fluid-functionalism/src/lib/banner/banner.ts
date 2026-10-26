import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { cn } from '../core/utils';
import { injectShape } from '../core/shape';
import { SizeContext, type SizeVariant } from '../core/size';
import { ReducedMotion } from '../core/environment';
import { Icon } from '../core/icon';
import type { IconDefinition, IconName } from '../core/icons';
import { BannerPresence, bannerMotion, type BannerMotionConfig } from './banner-motion';
import { BannerAction, BannerActions, BannerDescription, BannerTitle } from './banner-parts';

// ---------------------------------------------------------------------------
// Banner is a status message built from parts, the way Card is: Banner owns
// the status color, the icon and the dismiss control; BannerTitle,
// BannerDescription and BannerActions fill the text column.
//
// One status color per banner, and it lands in one place at a time:
//   contrast="low":  a neutral overlay behind the text; only the icon is
//                    colored.
//   contrast="high": a light wash of the status color behind the text.
// There is no solid fill: the status color never sits behind the text at
// full strength. Text stays on the foreground ramp in both, so it reads the
// same on every status.
//
// The parts sit on one grid, so their placement is pure CSS: actions trail
// the title on a title-only banner, and drop under the text when there is a
// description or the banner is narrower than 24rem.
//
//   <ff-banner status="info" dismissible>
//     <p ffBannerTitle>Saved</p>
//     <p ffBannerDescription>Detail</p>
//     <div ffBannerActions>
//       <ff-banner-action variant="primary">Undo</ff-banner-action>
//     </div>
//   </ff-banner>
// ---------------------------------------------------------------------------

export type BannerStatus = 'default' | 'info' | 'success' | 'warning' | 'error';
export type BannerContrast = 'low' | 'high';
export type BannerVariant = 'inline' | 'fixed';
/** An icon by role name from the icon map, or an icon definition. */
export type BannerIcon = IconName | IconDefinition;

// The status color: the icon's fill, and the wash behind a high-contrast
// banner. Default is the foreground, so a neutral banner reads as ink.
// --info, --success and --warning ship with the theme; error reuses
// --destructive, so it matches the app's other error states.
const TONE: Record<BannerStatus, string> = {
  default: 'var(--foreground)',
  info: 'var(--info)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--destructive)',
};

// Both fills are translucent, so the banner takes on whatever surface it sits
// on. Grey reads darker than a hue at the same mix, so the neutral wash steps
// down to 8%.
function fillFor(status: BannerStatus, contrast: BannerContrast) {
  if (contrast === 'low') return 'var(--hover)';
  const amount = status === 'default' ? 8 : 12;
  return `color-mix(in oklab, var(--banner-tone) ${amount}%, transparent)`;
}

function iconInputs(icon: BannerIcon | undefined) {
  if (icon === undefined || icon === null) return null;
  return typeof icon === 'string' ? { name: icon, icon: undefined } : { name: undefined, icon };
}

/**
 * The banner. The host is the row whose one grid track opens and closes, so
 * the content below slides as the banner appears and is dismissed. It also
 * provides the size its parts read: `size` pins it, omitted it follows the
 * surrounding SizeProvider.
 */
@Component({
  selector: 'ff-banner',
  imports: [Icon],
  providers: [{ provide: SizeContext, useExisting: Banner }],
  template: `
    @if (mounted()) {
      <div class="min-h-0">
        <div #content>
          <div
            [attr.role]="resolvedRole()"
            data-slot="banner"
            [attr.data-status]="status()"
            [attr.data-contrast]="contrast()"
            [attr.data-variant]="variant()"
            [class]="bodyClass()"
            [style]="bodyStyle()"
          >
            <!-- The glyph box is one title line tall, so it lines up with
                 the first line whether it centres or tops. -->
            <span aria-hidden="true" [class]="glyphBoxClass()">
              @if (outlineIcon(); as icon) {
                <ff-icon [name]="icon.name" [icon]="icon.icon" [size]="iconSize()" [strokeWidth]="1.5" />
              } @else if (status() !== 'default') {
                <svg
                  [attr.width]="iconSize()"
                  [attr.height]="iconSize()"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  class="shrink-0"
                >
                  @if (status() === 'warning') {
                    <path
                      d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                      fill="currentColor"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linejoin="round"
                    />
                  } @else {
                    <circle cx="12" cy="12" r="10.5" fill="currentColor" />
                  }
                  <g class="stroke-background" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
                    @switch (status()) {
                      @case ('success') {
                        <path d="m8.5 12.25 2.5 2.5 4.5-5" />
                      }
                      @case ('warning') {
                        <path d="M12 9.5v3.5M12 17h.01" />
                      }
                      @case ('error') {
                        <path d="M12 7.5v5M12 16.5h.01" />
                      }
                      @default {
                        <path d="M12 16.5v-5M12 7.5h.01" />
                      }
                    }
                  </g>
                </svg>
              }
            </span>

            <ng-content />

            @if (dismissible()) {
              <button type="button" [attr.aria-label]="dismissLabel()" [class]="dismissClass()" (click)="handleDismiss()">
                <ff-icon name="x" [size]="compact() ? 13 : 15" [strokeWidth]="1.5" />
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  host: {
    '[class]': 'rowClass()',
    // Closed, the row leaves the layout so a flex parent's gap skips it,
    // as if it were unmounted.
    '[style.display]': 'mounted() ? null : "none"',
    // `role` is read by the banner itself, never left on the row.
    '[attr.role]': 'null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Banner extends SizeContext {
  /** Which status color the banner carries. */
  readonly status = input<BannerStatus>('default');
  /** "low": neutral fill, colored icon. "high": a light wash of the status
   *  color behind the text. */
  readonly contrast = input<BannerContrast>('low');
  /** "inline": a rounded block in the flow of the page. "fixed": a
   *  full-bleed bar that sticks to the top of its scroll container and
   *  pushes the content below it down. */
  readonly variant = input<BannerVariant>('inline');
  /** Replaces the status icon. Rendered in the status color. */
  readonly icon = input<BannerIcon | undefined>(undefined);
  /** Shows a dismiss (✕) button. */
  readonly dismissible = input(false, { transform: booleanAttribute });
  /** Accessible name for the ✕. */
  readonly dismissLabel = input('Dismiss');
  /** Controls visibility. Omitted, the banner hides itself when dismissed.
   *  Either way, closing collapses its height so the content below slides up. */
  readonly open = input<boolean | undefined>(undefined);
  /** Pins the banner to one step of the size ladder. Omitted, it follows the
   *  surrounding SizeProvider. */
  readonly sizeInput = input<SizeVariant | undefined>(undefined, { alias: 'size' });
  /** Overrides the appear and dismiss values for this banner. Spread
   *  `bannerMotion` to change one and keep the rest. */
  readonly motion = input<BannerMotionConfig>(bannerMotion);
  /** Overrides the role: errors and warnings default to "alert", the rest
   *  to "status". */
  readonly role = input<string | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });
  /** Emitted when the ✕ is pressed. */
  readonly dismiss = output<void>();

  private readonly parentSize = inject(SizeContext, { skipSelf: true, optional: true });
  readonly size = computed<SizeVariant>(() => this.sizeInput() ?? this.parentSize?.size() ?? 'default');
  setSize(next: SizeVariant) {
    if (this.sizeInput() === undefined) this.parentSize?.setSize(next);
  }

  private readonly shape = injectShape();
  private readonly reduceMotion = inject(ReducedMotion).value;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');

  private readonly openState = signal(true);
  /** Whether the banner should show. */
  readonly isOpen = computed(() => this.open() ?? this.openState());
  /** Whether the banner is in the DOM: open, or still playing its dismiss. */
  protected readonly mounted = signal(false);
  private presence: BannerPresence | null = null;

  protected readonly compact = computed(() => this.size() === 'compact');
  protected readonly fixed = computed(() => this.variant() === 'fixed');
  protected readonly iconSize = computed(() => (this.compact() ? 16 : 20));
  // A custom icon, or the neutral default's info icon, comes from the icon
  // set as an outline at its usual 1.5 stroke; the colored statuses get
  // their filled glyph.
  protected readonly outlineIcon = computed(() =>
    iconInputs(this.icon() ?? (this.status() === 'default' ? 'info' : undefined)),
  );

  // Errors and warnings interrupt a screen reader; the rest wait their turn.
  protected readonly resolvedRole = computed(
    () => this.role() ?? (this.status() === 'error' || this.status() === 'warning' ? 'alert' : 'status'),
  );

  // w-full: the banner is a container (for its narrow layout), so it can't
  // size to its content and has to take the full row. The clip sits on the
  // grid, not on the track's item: below 1fr, Chrome sizes the grid to f of
  // the content but the track itself to f², so clipping here keeps what is
  // shown and what is pushed down the same box.
  protected readonly rowClass = computed(() => cn('grid w-full', this.fixed() && 'sticky top-0 z-40'));

  protected readonly bodyClass = computed(() =>
    cn(
      'group/banner @container/banner relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center text-foreground',
      // With a description the icon and ✕ hold to the title line instead of
      // centring on the whole block.
      'has-data-[slot=banner-description]:items-start',
      // Even inset on all 4 sides: 16px, 12px compact.
      this.compact() ? 'p-3' : 'p-4',
      // A fixed bar runs edge to edge: square corners, no frame.
      !this.fixed() && this.shape().container,
      this.userClass(),
    ),
  );

  protected readonly bodyStyle = computed(() => ({
    '--banner-tone': TONE[this.status()],
    '--banner-fill': fillFor(this.status(), this.contrast()),
    // A fixed bar stays opaque over the page scrolling under it; inline, the
    // fill blends with the surface below.
    'background-color': this.fixed() ? 'var(--background)' : null,
    'background-image': 'linear-gradient(var(--banner-fill), var(--banner-fill))',
  }));

  protected readonly glyphBoxClass = computed(() =>
    cn(
      'col-start-1 row-start-1 flex items-center justify-center text-[color:var(--banner-tone)]',
      this.compact() ? 'mr-2.5 h-[18px]' : 'mr-3 h-5',
    ),
  );

  protected readonly dismissClass = computed(() =>
    cn(
      'col-start-4 row-start-1 flex size-7 cursor-pointer items-center justify-center text-muted-foreground outline-none transition-colors duration-80 hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
      // Pulled into the padding so the glyph, not the 28px box, sits on the
      // title line and the inset edge.
      this.compact() ? '-my-[5px] -mr-1.5 ml-1.5' : '-my-1 -mr-1.5 ml-2',
      this.shape().button,
    ),
  );

  constructor() {
    super();
    // A banner that is open on first render arrives already in place.
    let first = true;
    effect(() => {
      const open = this.isOpen();
      const fixed = this.fixed();
      const reduceMotion = this.reduceMotion();
      untracked(() => {
        // Read at call time, like the React config ref: a parent handing a
        // new config mid-flight never restarts an animation.
        const mode = { fixed, reduceMotion, config: this.motion() };
        if (open) {
          if (!this.presence) {
            this.presence = new BannerPresence(this.host, () => this.content()?.nativeElement, !first, mode);
            this.mounted.set(true);
          }
          this.presence.enter(mode);
        } else if (this.presence) {
          const presence = this.presence;
          presence.leave(mode, () => {
            presence.destroy();
            if (this.presence === presence) this.presence = null;
            this.mounted.set(false);
          });
        }
        first = false;
      });
    });
    // The content element appears a render after the mount: write its
    // styles before the first paint.
    afterRenderEffect(() => {
      if (this.content()) untracked(() => this.presence?.apply());
    });
    inject(DestroyRef).onDestroy(() => this.presence?.destroy());
  }

  protected handleDismiss() {
    this.dismiss.emit();
    if (this.open() === undefined) this.openState.set(false);
  }
}

export { BannerTitle, BannerDescription, BannerActions, BannerAction, type BannerActionVariant } from './banner-parts';
export { bannerMotion, type BannerMotionConfig } from './banner-motion';

/** Every banner part, for a standalone `imports: [BANNER_PARTS]`. */
export const BANNER_PARTS = [Banner, BannerTitle, BannerDescription, BannerActions, BannerAction] as const;
