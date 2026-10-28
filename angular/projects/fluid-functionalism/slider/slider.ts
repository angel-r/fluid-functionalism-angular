import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, model } from '@angular/core';
import { cn, injectSizeVariant, type SizeVariant } from '../core';
import { SliderCompact } from './slider-compact';
import { SliderComfortable } from './slider-comfortable';
import type { SliderStyle, SliderValue, SliderVariant, ValuePosition } from './slider-math';

// ---------------------------------------------------------------------------
// Slider — the public component, riding the size ladder.
//
// The two designs are the two ladder steps: the comfortable pips/scrubber
// design renders at the default step, the dense design at the compact step.
// Features only the compact engine implements (range values, discrete step
// lists, value display, track styling) force it regardless of the resolved
// step, so no capability is ever lost.
//
//   <ff-slider label="Volume" [(value)]="volume" />
//   <ff-slider size="compact" [(value)]="range" [steps]="[0.1, 0.5, 1]" showSteps />
//
// Generic over the value type, so `[(value)]` binds a `number` or a
// `[number, number]` signal without casts.
//
// The host is a block wrapper: `class` and any HTML attribute (aria-label,
// data-*) land on it, and the engine's root fills it.
// ---------------------------------------------------------------------------

// Presence, not truthiness: undefined means "not set", so an explicit
// `[showValue]="false"` or `[hideFill]="false"` still picks the compact
// engine, the only one that reads those inputs.
const presentBoolean = (v: unknown): boolean | undefined => (v === undefined ? undefined : booleanAttribute(v));

@Component({
  selector: 'ff-slider',
  imports: [SliderCompact, SliderComfortable],
  host: { '[class]': 'hostClass()' },
  template: `
    @if (compact()) {
      <ff-slider-compact
        [value]="value()"
        (valueChange)="value.set($any($event))"
        [min]="min()"
        [max]="max()"
        [step]="step()"
        [steps]="steps()"
        [showSteps]="showSteps() ?? false"
        [showValue]="showValue() ?? true"
        [valuePosition]="valuePosition() ?? 'left'"
        [formatValue]="formatValue()"
        [label]="label()"
        [disabled]="disabled()"
        [trackClassName]="trackClassName()"
        [trackStyle]="trackStyle()"
        [fillClassName]="fillClassName()"
        [fillStyle]="fillStyle()"
        [hideFill]="hideFill() ?? false"
        [thumbColor]="thumbColor()"
        [thumbBorderColor]="thumbBorderColor()"
      />
    } @else {
      <ff-slider-comfortable
        [value]="$any(value())"
        (valueChange)="value.set($any($event))"
        [min]="min()"
        [max]="max()"
        [step]="step()"
        [variant]="variant()"
        [label]="label()"
        [formatValue]="formatValue()"
        [disabled]="disabled()"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Slider<T extends SliderValue = SliderValue> {
  /** Current value. An array enables range mode with two thumbs. Two-way:
   *  `[(value)]`; `(valueChange)` fires on drag, click, edit and keyboard. */
  readonly value = model.required<T>();
  /** Step on the size ladder; omitted, it follows the surrounding size provider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  /** Default-step layout: value pips along the row, or an edge-to-edge
   *  scrubber. Ignored when the compact design renders. */
  readonly variant = input<SliderVariant, SliderVariant | undefined>('pips', { transform: (v) => v ?? 'pips' });
  readonly min = input(0, { transform: (v: number | undefined) => v ?? 0 });
  readonly max = input(100, { transform: (v: number | undefined) => v ?? 100 });
  /** Step increment. The thumb snaps to the nearest step during drag. */
  readonly step = input(1, { transform: (v: number | undefined) => v ?? 1 });
  /** Discrete list of allowed values, e.g. [0.1, 0.5, 0.7, 1.1, 1.3]. The
   *  thumb snaps only to these and arrow keys walk the list; min/max derive
   *  from its extremes and `step` is ignored. */
  readonly steps = input<number[] | undefined>(undefined);
  /** Dot indicators at each step position on the track. */
  readonly showSteps = input<boolean | undefined, unknown>(undefined, { transform: presentBoolean });
  /** Whether to display the current value label (default true). */
  readonly showValue = input<boolean | undefined, unknown>(undefined, { transform: presentBoolean });
  /** Position of the value label; "tooltip" shows above the thumb during interaction. */
  readonly valuePosition = input<ValuePosition | undefined>(undefined);
  /** Formats every displayed value and, with `steps`, the thumbs' aria-valuetext. */
  readonly formatValue = input<(v: number) => string, ((v: number) => string) | undefined>(String, {
    transform: (v) => v ?? String,
  });
  /** The thumb's accessible name, also shown as text. Range thumbs get
   *  "<label> minimum" / "<label> maximum". */
  readonly label = input<string | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly trackClassName = input<string | undefined>(undefined);
  readonly trackStyle = input<SliderStyle | undefined>(undefined);
  readonly fillClassName = input<string | undefined>(undefined);
  readonly fillStyle = input<SliderStyle | undefined>(undefined);
  readonly hideFill = input<boolean | undefined, unknown>(undefined, { transform: presentBoolean });
  readonly thumbColor = input<string | undefined>(undefined);
  readonly thumbBorderColor = input<string | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  private readonly resolvedSize = injectSizeVariant(() => this.size());

  protected readonly compact = computed(
    () =>
      this.resolvedSize() === 'compact' ||
      Array.isArray(this.value()) ||
      [
        this.steps(),
        this.showSteps(),
        this.showValue(),
        this.valuePosition(),
        this.trackClassName(),
        this.trackStyle(),
        this.fillClassName(),
        this.fillStyle(),
        this.hideFill(),
        this.thumbColor(),
        this.thumbBorderColor(),
      ].some((v) => v !== undefined),
  );

  protected readonly hostClass = computed(() => cn('block w-full', this.userClass()));
}

export { SliderComfortable };
