import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import { cn } from '../core/utils';
import { injectShape } from '../core/shape';
import { parseColor, resolveCssColor, rgbToHexStr } from './color-math';
import { CHECKER_IMAGE, CHECKER_SIZE } from './shared';

// ---------------------------------------------------------------------------
// ColorTile — small colored square, checker behind alpha.
//
// The color paints on a child layer over the checker, and an inset 1px
// hairline at 25% gray outlines the tile so white or near-transparent colors
// don't vanish into the surface.
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-color-tile',
  host: {
    '[class]': 'hostClass()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.background-image]': 'checkerImage',
    '[style.background-size]': 'checkerSize',
    '[style.box-shadow]': '"inset 0 0 0 1px rgba(127,127,127,0.25)"',
  },
  template: `<span class="absolute inset-0" [style.background-color]="color()"></span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorTile {
  /** Any CSS color. */
  readonly color = input.required<string>();
  /** Square edge in px. Default 24. */
  readonly size = input(24, { transform: numberAttribute });
  readonly userClass = input('', { alias: 'class' });

  private readonly shape = injectShape();
  protected readonly checkerImage = CHECKER_IMAGE;
  protected readonly checkerSize = CHECKER_SIZE;
  protected readonly hostClass = computed(() =>
    cn('inline-block relative shrink-0 overflow-hidden', this.shape().bg, this.userClass()),
  );
}

// ---------------------------------------------------------------------------
// ColorSwatch — clickable strip swatch on a native button.
//
// Rings are stacked box-shadows: the inset hairline, a 2px gap in the page
// background, then a 2px outer ring (accent blue when selected, 40% gray on
// hover). The gap keeps the ring readable on any swatch color.
// ---------------------------------------------------------------------------

const RING_REST = 'inset 0 0 0 1px rgba(127,127,127,0.25)';
const RING_SELECTED = `${RING_REST}, 0 0 0 2px var(--background), 0 0 0 4px #6B97FF`;
const RING_HOVER = `${RING_REST}, 0 0 0 2px var(--background), 0 0 0 4px rgba(127,127,127,0.4)`;

@Component({
  selector: 'button[ffColorSwatch]',
  host: {
    type: 'button',
    '[attr.aria-label]': '"Select color " + color()',
    '[class]': 'hostClass()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.background-image]': 'checkerImage',
    '[style.background-size]': 'checkerSize',
    '[style.box-shadow]': 'ring()',
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
  },
  template: `<span class="absolute inset-0" [style.background-color]="color()"></span><ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorSwatch {
  /** Any CSS color; it paints over a checker, so alpha shows. */
  readonly color = input.required<string>({ alias: 'ffColorSwatch' });
  /** Square edge in px. Default 28. */
  readonly size = input(28, { transform: numberAttribute });
  /** Draws the accent ring outside a 2px background gap. */
  readonly selected = input(false, { transform: booleanAttribute });
  readonly userClass = input('', { alias: 'class' });

  private readonly shape = injectShape();
  protected readonly hovered = signal(false);
  protected readonly checkerImage = CHECKER_IMAGE;
  protected readonly checkerSize = CHECKER_SIZE;
  protected readonly ring = computed(() =>
    this.selected() ? RING_SELECTED : this.hovered() ? RING_HOVER : RING_REST,
  );
  protected readonly hostClass = computed(() =>
    cn(
      'relative shrink-0 overflow-hidden cursor-pointer outline-none transition-shadow duration-100',
      this.shape().bg,
      this.userClass(),
    ),
  );
}

/** Lowercase hex (alpha included) a color string normalizes to, or null. */
function normalizeParsed(color: string): string | null {
  const p = parseColor(color);
  return p ? rgbToHexStr(p.r, p.g, p.b, p.a).toLowerCase() : null;
}

// ---------------------------------------------------------------------------
// SwatchStrip — the panel's preset row.
//
// Selection compares normalized lowercase hex (alpha included), so "#FFF",
// "#ffffff" and "rgb(255, 255, 255)" all mark the same swatch. Named CSS
// colors ("red", "tomato") are normalized by the browser (canvas round-trip)
// before the comparison; without a canvas they never match.
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-color-swatch-strip',
  imports: [ColorSwatch],
  host: { class: 'flex flex-wrap gap-2' },
  template: `
    @for (sw of normalized(); track $index) {
      <button [ffColorSwatch]="sw.color" [size]="28" [selected]="sw.normalized === current()" (click)="pick.emit(sw.color)"></button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwatchStrip {
  readonly swatches = input.required<readonly string[]>();
  /** The current color as hex. */
  readonly currentHex = input.required<string>();
  readonly pick = output<string>();

  protected readonly current = computed(() => normalizeParsed(this.currentHex()) ?? '');
  protected readonly normalized = computed(() =>
    this.swatches().map((color) => {
      const parsed = normalizeParsed(color);
      if (parsed) return { color, normalized: parsed };
      const p = resolveCssColor(color);
      return { color, normalized: p ? rgbToHexStr(p.r, p.g, p.b, p.a).toLowerCase() : color.toLowerCase() };
    }),
  );
}
