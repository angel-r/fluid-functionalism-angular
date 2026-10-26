import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  linkedSignal,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { cn } from '../core/utils';
import { fontWeights } from '../core/font-weight';
import { fieldTouchClass } from '../core/type-scale';
import { injectShape } from '../core/shape';
import { nearestStepIndex } from './slider-math';

/** A click-to-edit commit: which thumb and the clamped, snapped value. */
export interface SliderEditCommit {
  index: number;
  value: number;
}

// The compact engine's value label, click-to-edit: clicking a number swaps in
// a number input, focused and selected so typing replaces it. Enter or blur
// commits, Escape cancels. It is a pointer shortcut; keyboard users change the
// value with arrow keys on the hidden slider.
//
// Weight, not color, signals interaction: normal → semibold over 100ms while
// hovered or pressed. tabular-nums plus a ghost set at semibold (the heaviest
// this label gets) keep the box from changing width.
@Component({
  selector: 'span[ffSliderValueDisplay]',
  imports: [NgTemplateOutlet],
  host: {
    class:
      'inline-grid shrink-0 text-[length:var(--fs-body,13px)] leading-none text-muted-foreground transition-[font-variation-settings] duration-100 tabular-nums',
    '[style.font-variation-settings]': 'isInteracting() ? fw.semibold : fw.normal',
  },
  template: `
    <!-- Invisible ghost — reserves width of widest possible value -->
    <span class="col-start-1 row-start-1 invisible whitespace-nowrap" [style.font-variation-settings]="fw.semibold" aria-hidden="true">{{ widestValue() }}</span>
    <span class="col-start-1 row-start-1 whitespace-nowrap">
      <!-- While editing, the edit slot draws its own label beside the input. -->
      @if (label() && editingIndex() === null) {
        <span class="text-muted-foreground">{{ label() + ': ' }}</span>
      }
      <ng-container *ngTemplateOutlet="slot; context: { $implicit: 0 }" />
      @if (isRange()) {
        <span class="mx-1 text-muted-foreground">—</span>
        <ng-container *ngTemplateOutlet="slot; context: { $implicit: 1 }" />
      }
    </span>

    <ng-template #slot let-index>
      @if (editingIndex() === index) {
        <span class="inline-grid text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)]">
          <!-- Ghost for layout stability — widest possible value -->
          <span class="col-start-1 row-start-1 invisible" [style.font-variation-settings]="fw.normal" aria-hidden="true">{{ (label() ? label() + ': ' : '') + formatValue()(max()) }}</span>
          <span class="col-start-1 row-start-1 flex items-center gap-1">
            @if (label()) {
              <span class="text-muted-foreground">{{ label() + ':' }}</span>
            }
            <!-- The 5ch box is measured in this slot's own size, not the
                 input's, so it keeps its desktop width when touch screens set
                 the digits in 16px. -->
            <span class="inline-flex w-[5ch] shrink-0">
              <!-- List values sit off any grid, so the input takes step="any"
                   and commit snaps to the list instead. -->
              <input
                #editInput
                type="number"
                [value]="draft()"
                [attr.min]="min()"
                [attr.max]="max()"
                [attr.step]="stepValues() ? 'any' : step()"
                (input)="draft.set($any($event.target).value)"
                (blur)="commit(index)"
                (keydown)="onKeydown($event, index)"
                [attr.aria-label]="'Edit slider value' + (isRange() ? (index === 0 ? ' (start)' : ' (end)') : '')"
                [class]="inputClass()"
                [style.font-variation-settings]="fw.normal"
              />
            </span>
          </span>
        </span>
      } @else {
        <span class="cursor-text select-none" (click)="startEdit.emit(index)">{{ formatValue()(values()[index]) }}</span>
      }
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SliderValueDisplay {
  readonly values = input.required<number[]>();
  readonly editingIndex = input<number | null>(null);
  readonly min = input.required<number>();
  readonly max = input.required<number>();
  readonly step = input.required<number>();
  readonly stepValues = input<number[] | null>(null);
  readonly formatValue = input<(v: number) => string>(String);
  readonly label = input<string | undefined>(undefined);
  readonly isRange = input(false);
  readonly isInteracting = input(false);

  readonly startEdit = output<number>();
  readonly commitEdit = output<SliderEditCommit>();
  readonly cancelEdit = output<void>();

  protected readonly fw = fontWeights;
  private readonly shape = injectShape();
  private readonly editInput = viewChild<ElementRef<HTMLInputElement>>('editInput');

  // Seed the draft with the raw number, not formatValue's output, so a
  // formatted "50%" never has to be parsed back. Keyed on editingIndex alone:
  // value updates mid-edit don't overwrite what is being typed.
  protected readonly draft = linkedSignal<number | null, string>({
    source: this.editingIndex,
    computation: (index) => (index === null ? '' : String(untracked(this.values)[index])),
  });

  protected readonly inputClass = computed(() =>
    cn(
      'w-full min-w-0 bg-transparent text-foreground outline-none border-b border-border text-center',
      fieldTouchClass,
      this.shape().input,
    ),
  );

  // Assumes formatValue(max) is the longest string. Range mode reserves both
  // ends plus the separator.
  protected readonly widestValue = computed(() => {
    const prefix = this.label() ? `${this.label()}: ` : '';
    const widest = this.formatValue()(this.max());
    return this.isRange() ? `${prefix}${widest} — ${widest}` : `${prefix}${widest}`;
  });

  constructor() {
    // Focus and select the fresh input a frame after it mounts, so typing
    // replaces the number.
    afterRenderEffect((onCleanup) => {
      const el = this.editInput()?.nativeElement;
      if (!el) return;
      const frame = requestAnimationFrame(() => {
        el.focus();
        el.select();
      });
      onCleanup(() => cancelAnimationFrame(frame));
    });
  }

  // Clamp to min/max, then snap to the nearest `steps` entry or the step
  // grid. Unparseable input (empty, a lone "-") cancels instead. A blur that
  // follows Enter or Escape finds the edit already closed and does nothing.
  protected commit(index: number) {
    if (this.editingIndex() !== index) return;
    const parsed = parseFloat(this.draft());
    if (isNaN(parsed)) {
      this.cancelEdit.emit();
      return;
    }
    const min = this.min();
    const max = this.max();
    const stepValues = this.stepValues();
    const clamped = Math.max(min, Math.min(max, parsed));
    const snapped = stepValues
      ? stepValues[nearestStepIndex(clamped, stepValues)]
      : Math.round((clamped - min) / this.step()) * this.step() + min;
    this.commitEdit.emit({ index, value: snapped });
  }

  protected onKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter') this.commit(index);
    if (event.key === 'Escape') this.cancelEdit.emit();
  }
}
