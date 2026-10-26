import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { cn } from '../core/utils';
import { injectShape } from '../core/shape';
import { SizeContext, type SizeVariant } from '../core/size';
import { SURFACE_LEVEL } from '../core/surface';
import { surfaceClasses } from '../core/surface-classes';
import { Slider } from '../slider/slider';
import type { SliderStyle, SliderValue } from '../slider/slider-math';
import {
  applyChannelEdit,
  buildParsed,
  formatValueByFormat,
  hsvToRgb,
  hsvaFromRgba,
  initialHsva,
  parseColor,
  resolveCssColor,
  type ColorFormat,
  type HsvaState,
  type ParsedColor,
} from './color-math';
import { SaturationSquare, type SaturationChange } from './saturation-square';
import { FormatMenu } from './format-menu';
import { EyeDropperButton } from './eye-dropper';
import { ColorChannels, type ChannelChange } from './color-channels';
import { SwatchStrip } from './color-swatch';
import { CHECKER_IMAGE, PANEL_WIDTH, createPinnedSize } from './shared';

/** What `colorChange` emits: the color in the current format plus the parsed
 *  color in every format (the React `onValueChange(value, parsed)`). */
export interface ColorChange {
  value: string;
  parsed: ParsedColor;
}

interface PanelState {
  hsv: HsvaState;
  /** Sticky OKLCH hue, see `applyChannelEdit`. */
  oklchHue: number | null;
}

const HUE_TRACK: SliderStyle = {
  background:
    'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))',
  borderColor: 'transparent',
};

const sliderNumber = (v: SliderValue) => (typeof v === 'number' ? v : v[0]);

// ---------------------------------------------------------------------------
// ColorPicker — the panel.
//
// Holds one color as HSV + alpha and derives every format from it. Every edit
// (square, rails, channel fields, swatches, eyedropper) writes `value` in the
// selected format (HEX, RGB, HSL, OKLCH) and emits `colorChange` with the
// parsed color in all of them. Switching format re-emits the same color in
// the new format.
//
//   <ff-color-picker [(value)]="color" />
//   <ff-color-picker defaultFormat="oklch" [swatches]="presets" (colorChange)="save($event.parsed)" />
//
// A value changed from outside re-syncs HSV, except when it is the string
// this panel last emitted coming straight back, so re-parsing a rounded
// string never snaps HSV or drops a held hue; a gray, white or black keeps
// the hue already in state; a value that doesn't parse is ignored.
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-color-picker',
  imports: [SaturationSquare, Slider, FormatMenu, EyeDropperButton, ColorChannels, SwatchStrip],
  providers: [
    // A size input pins the whole panel — format menu, inputs, eyedropper,
    // overlay content included — to one step of the ladder.
    { provide: SizeContext, useFactory: () => inject(ColorPicker).sizeContext },
    // Announce the panel's effective level so descendants (the format menu)
    // elevate above it instead of colliding at the same surface.
    { provide: SURFACE_LEVEL, useFactory: () => inject(ColorPicker).pickerLevel },
  ],
  host: {
    '[class]': 'hostClass()',
    '[style.width.px]': 'panelWidth',
  },
  template: `
    <ff-color-saturation [h]="hsv().h" [s]="hsv().s" [v]="hsv().v" (change)="onSquare($event)" />

    <!-- A hue picked on the rail is a new stated hue, so the sticky OKLCH hue
         is dropped and OKLCH H follows the color again. -->
    <div class="flex flex-col [&>*]:mb-0 [&>*+*]:-mt-px">
      <ff-slider
        aria-label="Hue"
        [value]="hsv().h"
        (valueChange)="onHue($event)"
        [min]="0"
        [max]="360"
        [step]="1"
        [showValue]="false"
        hideFill
        [thumbColor]="hueColor()"
        thumbBorderColor="rgba(255,255,255,0.9)"
        [trackStyle]="hueTrack"
      />
      <!-- Alpha runs on whole percents. The gradient layers over the same 8px
           checker as the tiles, and the thumb shows the opaque color. -->
      <ff-slider
        aria-label="Alpha"
        [value]="alphaPercent()"
        (valueChange)="onAlpha($event)"
        [min]="0"
        [max]="100"
        [step]="1"
        [showValue]="false"
        hideFill
        [thumbColor]="solidColor()"
        thumbBorderColor="rgba(255,255,255,0.9)"
        [trackStyle]="alphaTrack()"
      />
    </div>

    <div class="grid grid-cols-2 gap-2">
      <ff-color-format-menu
        [value]="currentFormat()"
        [open]="formatOpen()"
        [defaultOpen]="defaultFormatOpen()"
        (valueSelect)="setFormat($event)"
      />
      @if (!hideEyedropper()) {
        <ff-color-eye-dropper (pick)="commitWholeColor($event)" />
      }
    </div>

    <ff-color-channels
      [parsed]="parsed()"
      [format]="currentFormat()"
      [oklchHue]="oklchHue()"
      (hexCommit)="commitWholeColor($event)"
      (channelChange)="onChannel($event)"
    />

    @if (swatches(); as list) {
      @if (list.length > 0) {
        <ff-color-swatch-strip [swatches]="list" [currentHex]="parsed().hex" (pick)="commitWholeColor($event)" />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPicker {
  /** Hex (3, 4, 6 or 8 digits), rgb(a), hsl(a) or oklch; named colors are
   *  not parsed here. A later value that doesn't parse is ignored (the panel
   *  keeps its color); an unparseable first value starts at pure red.
   *  Two-way: `[(value)]`. */
  readonly value = model<string | undefined>(undefined);
  /** Initial color when uncontrolled. */
  readonly defaultValue = input('#6B97FF');
  /** The selected format. Two-way: `[(format)]`; `formatChange` fires when
   *  the user switches. */
  readonly format = model<ColorFormat | undefined>(undefined);
  /** Initial format when uncontrolled. */
  readonly defaultFormat = input<ColorFormat>('hex');
  /** Optional preset swatches (any CSS color, named colors included). When
   *  omitted, the strip is hidden. */
  readonly swatches = input<readonly string[] | undefined>(undefined);
  /** Force-hide the eyedropper button (it already hides itself where
   *  `window.EyeDropper` is missing). */
  readonly hideEyedropper = input(false, { transform: booleanAttribute });
  /** Controls the format dropdown's open state; when set, user toggles are
   *  ignored. */
  readonly formatOpen = input<boolean | undefined>(undefined);
  /** Initial open state for the format dropdown (uncontrolled). */
  readonly defaultFormatOpen = input(false, { transform: booleanAttribute });
  /** Pins the panel to one step of the size ladder (default 36px, compact
   *  28px). Omitted, it follows the surrounding size provider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });
  /** Fires with the color formatted in the current format plus the parsed
   *  color in every format, on every edit and on a format switch. */
  readonly colorChange = output<ColorChange>();

  readonly sizeContext = createPinnedSize(() => this.size());
  private readonly substrate = inject(SURFACE_LEVEL, { optional: true, skipSelf: true }) ?? signal(1);
  /** The panel uses bg-card (surface-3) by default; inside the popover the
   *  class override pushes it higher. Either way this is its level. */
  readonly pickerLevel = computed(() => Math.max(this.substrate(), 3));
  private readonly shape = injectShape();
  protected readonly panelWidth = PANEL_WIDTH;
  protected readonly hueTrack = HUE_TRACK;

  protected readonly hostClass = computed(() =>
    // p-3 is the 12px inset SaturationSquare subtracts from this container's
    // radius; change one and the corners stop nesting.
    cn('flex flex-col gap-2 p-3', surfaceClasses(this.pickerLevel(), 1), this.shape().container, this.userClass()),
  );

  readonly currentFormat = computed<ColorFormat>(() => this.format() ?? this.defaultFormat());

  /** The string this panel last emitted: echoed back, it is not re-parsed. */
  private lastEmitted = '';

  private readonly state = linkedSignal<string | undefined, PanelState>({
    source: this.value,
    computation: (value, previous) => {
      if (!previous) {
        // Deliberately computed once from the initial value only.
        return { hsv: initialHsva(value ?? untracked(() => this.defaultValue())), oklchHue: null };
      }
      if (value === undefined || value === this.lastEmitted) return previous.value;
      const p = parseColor(value);
      if (!p) return previous.value;
      return { hsv: hsvaFromRgba(p, previous.value.hsv.h), oklchHue: null };
    },
  });

  protected readonly hsv = computed(() => this.state().hsv);
  protected readonly oklchHue = computed(() => this.state().oklchHue);
  /** The current color in every format. */
  readonly parsed = computed(() => {
    const { h, s, v, a } = this.hsv();
    return buildParsed(h, s, v, a);
  });

  protected readonly hueColor = computed(() => `hsl(${this.hsv().h}, 100%, 50%)`);
  protected readonly alphaPercent = computed(() => Math.round(this.hsv().a * 100));
  /** The current color at full opacity: the alpha rail's thumb and the
   *  opaque end of its gradient. */
  private readonly solid = computed(() => {
    const { h, s, v } = this.hsv();
    const { r, g, b } = hsvToRgb(h, s, v);
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  });
  protected readonly solidColor = computed(() => {
    const { r, g, b } = this.solid();
    return `rgb(${r}, ${g}, ${b})`;
  });
  // A color-aware transparent stop (same hue, alpha 0) keeps the gradient
  // chromatically consistent and reaches fully opaque with no edge gap.
  protected readonly alphaTrack = computed<SliderStyle>(() => {
    const { r, g, b } = this.solid();
    return {
      backgroundImage: `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0) 0%, ${this.solidColor()} 98%), ${CHECKER_IMAGE}`,
      backgroundSize: '100% 100%, 8px 8px',
      borderWidth: 0,
    };
  });

  // ── Write paths ─────────────────────────────────────────────────────

  /** Merge into HSV, format in the current format, record it as emitted,
   *  then notify. */
  private commit(next: Partial<HsvaState>, oklchHue: number | null = this.oklchHue()) {
    const hsv = { ...this.hsv(), ...next };
    this.state.set({ hsv, oklchHue });
    const parsed = buildParsed(hsv.h, hsv.s, hsv.v, hsv.a);
    this.emit(formatValueByFormat(parsed, this.currentFormat()), parsed);
  }

  private emit(formatted: string, parsed: ParsedColor) {
    this.lastEmitted = formatted;
    this.value.set(formatted);
    this.colorChange.emit({ value: formatted, parsed });
  }

  protected onSquare({ s, v }: SaturationChange) {
    this.commit({ s, v });
  }

  protected onHue(value: SliderValue) {
    this.commit({ h: sliderNumber(value) }, null);
  }

  protected onAlpha(value: SliderValue) {
    this.commit({ a: sliderNumber(value) / 100 });
  }

  protected onChannel({ channel, value }: ChannelChange) {
    const edit = applyChannelEdit(this.hsv(), this.oklchHue(), channel, value);
    this.commit(edit.hsv, edit.oklchHue);
  }

  /**
   * Whole-color entry point shared by the hex field, swatches and the
   * eyedropper. Named CSS colors resolve through the browser (swatches); an
   * unreadable string is dropped (the color stays put), and a gray, white or
   * black keeps the hue already in state.
   */
  commitWholeColor(input: string) {
    const p = resolveCssColor(input);
    if (!p) return;
    const hsv = hsvaFromRgba(p, this.hsv().h);
    this.commit(hsv, null);
  }

  /** Switching format re-emits the same color in the new format, so a
   *  consumer storing the string stays in the format the user picked. */
  protected setFormat(next: ColorFormat) {
    this.format.set(next);
    const parsed = this.parsed();
    this.emit(formatValueByFormat(parsed, next), parsed);
  }
}
