import { Directive, ElementRef, booleanAttribute, computed, inject, input, numberAttribute, output } from '@angular/core';
import { keyboardTarget } from './slider-math';

/**
 * The invisible thumb both engines render under their visuals: the WAI-ARIA
 * slider pattern by hand (role, value attributes, keyboard). It never sees
 * the pointer — the engines handle presses so they can spring — and reports
 * keyboard moves through `valueCommit` instead of changing anything itself.
 *
 *   ArrowRight / ArrowUp      +step      (Shift: +10 steps)
 *   ArrowLeft / ArrowDown     −step      (Shift: −10 steps)
 *   PageUp / PageDown         ±10 steps
 *   Home / End                min / max
 *
 * `lowerBound` / `upperBound` keep a range thumb from passing its sibling.
 */
@Directive({
  selector: '[ffSliderThumb]',
  host: {
    role: 'slider',
    style: 'position: absolute; top: 0; translate: -50% 0',
    'aria-orientation': 'horizontal',
    'data-orientation': 'horizontal',
    '[attr.tabindex]': 'disabled() ? null : 0',
    '[attr.aria-valuemin]': 'min()',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-valuetext]': 'valueText() ?? null',
    '[attr.aria-label]': 'label() ?? null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[style.left.%]': 'percent()',
    '(keydown)': 'onKeydown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'focusVisibleChange.emit(false)',
  },
})
export class SliderThumb {
  readonly value = input.required<number>();
  readonly min = input(0, { transform: numberAttribute });
  readonly max = input(100, { transform: numberAttribute });
  readonly step = input(1, { transform: numberAttribute });
  readonly lowerBound = input<number | undefined>(undefined);
  readonly upperBound = input<number | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly label = input<string | undefined>(undefined);
  readonly valueText = input<string | undefined>(undefined);

  /** The value a key press asks for (already snapped and clamped). */
  readonly valueCommit = output<number>();
  /** True when the thumb takes `:focus-visible` focus, false on blur. */
  readonly focusVisibleChange = output<boolean>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Where the invisible thumb sits, so focus scrolling lands on the value. */
  protected readonly percent = computed(() => {
    const span = this.max() - this.min();
    return span === 0 ? 0 : ((this.value() - this.min()) / span) * 100;
  });

  protected onKeydown(event: KeyboardEvent) {
    if (this.disabled()) return;
    const target = keyboardTarget(event, this.value(), this.min(), this.max(), this.step());
    if (target === null) return;
    event.preventDefault();
    const lower = this.lowerBound() ?? this.min();
    const upper = this.upperBound() ?? this.max();
    const next = Math.max(lower, Math.min(upper, target));
    if (next !== this.value()) this.valueCommit.emit(next);
  }

  protected onFocus() {
    this.focusVisibleChange.emit(matchesFocusVisible(this.el));
  }
}

// A pointer press never shows the focus ring; keyboard focus does. Engines
// without :focus-visible support treat every focus as keyboard focus.
function matchesFocusVisible(el: HTMLElement): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
}
