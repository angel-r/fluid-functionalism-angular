import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Tooltip } from '../tooltip';
import { rgbToHsl, rgbToOklch, type ChannelKey, type ColorFormat, type ParsedColor } from './color-math';
import { ColorInput } from './color-input';

export interface ChannelChange {
  channel: ChannelKey;
  value: string;
}

// ---------------------------------------------------------------------------
// ColorInputsRow — the input row adapts to the format.
//
// HEX is the one plain text field (no scrubbing): the "#" is a fixed prefix,
// re-added on commit, and 8-digit input carries alpha. RGB, HSL and OKLCH show
// one scrubbable field per channel. Hue fields (HSL H, OKLCH H) wrap: hue is
// an angle, so nudging past 360 continues at 1 instead of sticking at the end.
// Chroma steps by 0.01 (Shift 0.1) with 2 decimals, capped at 0.4: above the
// sRGB peak (about 0.32, pure magenta), so every displayable chroma is
// reachable and anything past the gamut clips on commit. Alpha shows as a
// whole percent in every format.
//
// Channel fields show bare values with no labels, so a tooltip names each one
// after 300ms of hover.
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-color-channels',
  imports: [Tooltip, ColorInput, NgTemplateOutlet],
  host: { '[class]': 'format() === "hex" ? "grid grid-cols-2 gap-2" : "grid grid-cols-4 gap-1"' },
  template: `
    <ng-template #alphaField>
      <ff-tooltip content="Alpha" [delayDuration]="300">
        <div>
          <ff-color-input
            [value]="alphaPct() + '%'"
            ariaLabel="Alpha"
            align="center"
            inputMode="numeric"
            [nudgeStep]="1"
            [nudgeShiftStep]="10"
            hasPercent
            scrubbable
            [min]="0"
            [max]="100"
            (commit)="onAlpha($event)"
          />
        </div>
      </ff-tooltip>
    </ng-template>

    @switch (format()) {
      @case ('hex') {
        <ff-tooltip content="Hex" [delayDuration]="300">
          <div>
            <ff-color-input [value]="hexNoHash()" ariaLabel="Hex value" prefix="#" (commit)="onHex($event)" />
          </div>
        </ff-tooltip>
      }
      @case ('rgb') {
        @for (ch of rgbChannels; track ch.key) {
          <ff-tooltip [content]="ch.label" [delayDuration]="300">
            <div>
              <ff-color-input
                [value]="rgbValue(ch.key)"
                [ariaLabel]="ch.label"
                align="center"
                inputMode="numeric"
                [nudgeStep]="1"
                [nudgeShiftStep]="10"
                scrubbable
                [min]="0"
                [max]="255"
                (commit)="emit(ch.key, $event)"
              />
            </div>
          </ff-tooltip>
        }
      }
      @case ('hsl') {
        <ff-tooltip content="Hue" [delayDuration]="300">
          <div>
            <ff-color-input [value]="hsl().h" ariaLabel="Hue" align="center" inputMode="numeric" [nudgeStep]="1" [nudgeShiftStep]="10" scrubbable [min]="0" [max]="360" wrap (commit)="emit('hSL', $event)" />
          </div>
        </ff-tooltip>
        <ff-tooltip content="Saturation" [delayDuration]="300">
          <div>
            <ff-color-input [value]="hsl().s" ariaLabel="Saturation" align="center" inputMode="numeric" [nudgeStep]="1" [nudgeShiftStep]="10" scrubbable [min]="0" [max]="100" (commit)="emit('sSL', $event)" />
          </div>
        </ff-tooltip>
        <ff-tooltip content="Lightness" [delayDuration]="300">
          <div>
            <ff-color-input [value]="hsl().l" ariaLabel="Lightness" align="center" inputMode="numeric" [nudgeStep]="1" [nudgeShiftStep]="10" scrubbable [min]="0" [max]="100" (commit)="emit('lSL', $event)" />
          </div>
        </ff-tooltip>
      }
      @case ('oklch') {
        <ff-tooltip content="Lightness" [delayDuration]="300">
          <div>
            <ff-color-input [value]="oklch().L" ariaLabel="Lightness" align="center" inputMode="decimal" [nudgeStep]="1" [nudgeShiftStep]="10" scrubbable [min]="0" [max]="100" (commit)="emit('L', $event)" />
          </div>
        </ff-tooltip>
        <ff-tooltip content="Chroma" [delayDuration]="300">
          <div>
            <ff-color-input [value]="oklch().C" ariaLabel="Chroma" align="center" inputMode="decimal" [nudgeStep]="0.01" [nudgeShiftStep]="0.1" [decimals]="2" scrubbable [min]="0" [max]="0.4" (commit)="emit('C', $event)" />
          </div>
        </ff-tooltip>
        <ff-tooltip content="Hue" [delayDuration]="300">
          <div>
            <ff-color-input [value]="oklch().H" ariaLabel="Hue" align="center" inputMode="numeric" [nudgeStep]="1" [nudgeShiftStep]="10" scrubbable [min]="0" [max]="360" wrap (commit)="emit('H', $event)" />
          </div>
        </ff-tooltip>
      }
    }
    <ng-container *ngTemplateOutlet="alphaField" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorChannels {
  readonly parsed = input.required<ParsedColor>();
  readonly format = input.required<ColorFormat>();
  /** Sticky OKLCH hue override for display (preserves the stated H across
   *  round-trip drift). */
  readonly oklchHue = input<number | null>(null);
  /** A whole color typed in the hex field ("#" re-added). */
  readonly hexCommit = output<string>();
  readonly channelChange = output<ChannelChange>();

  protected readonly rgbChannels = [
    { key: 'r', label: 'Red' },
    { key: 'g', label: 'Green' },
    { key: 'b', label: 'Blue' },
  ] as const;

  protected readonly alphaPct = computed(() => Math.round(this.parsed().a * 100));
  protected readonly hexNoHash = computed(() => this.parsed().hex.replace(/^#/, '').toUpperCase());
  protected readonly hsl = computed(() => {
    const { r, g, b } = this.parsed();
    const hsl = rgbToHsl(r, g, b);
    return {
      h: String(Math.round(hsl.h)),
      s: String(Math.round(hsl.s * 100)),
      l: String(Math.round(hsl.l * 100)),
    };
  });
  protected readonly oklch = computed(() => {
    const { r, g, b } = this.parsed();
    const oklch = rgbToOklch(r, g, b);
    return {
      L: (oklch.L * 100).toFixed(0),
      C: oklch.C.toFixed(2),
      H: (this.oklchHue() ?? oklch.H).toFixed(0),
    };
  });

  protected rgbValue(key: 'r' | 'g' | 'b') {
    return String(this.parsed()[key]);
  }

  protected emit(channel: ChannelKey, value: string) {
    this.channelChange.emit({ channel, value });
  }

  protected onHex(next: string) {
    this.hexCommit.emit(next.startsWith('#') ? next : `#${next}`);
  }

  protected onAlpha(text: string) {
    const n = parseFloat(text.replace('%', ''));
    if (Number.isNaN(n)) return;
    this.emit('alphaPercent', String(Math.max(0, Math.min(100, Math.round(n)))));
  }
}
