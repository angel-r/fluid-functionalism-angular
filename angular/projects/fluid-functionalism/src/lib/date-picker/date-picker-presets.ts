import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output } from '@angular/core';
import { cn, fontWeights, injectSize } from '../core';
import { FLUID_HOVER, FluidHoverItem, createFluidHover, FluidHoverHighlight } from '../fluid-hover';
import type { DateRange } from '../calendar';
import { sameDay } from './date-picker-labels';

/** A range listed beside the calendar in range mode. */
export interface DatePickerPreset {
  label: string;
  range: DateRange;
}

/** The preset ranges beside the calendar, under their own fluid hover. */
@Component({
  selector: 'ff-date-picker-presets',
  imports: [FluidHoverItem, FluidHoverHighlight],
  host: {
    role: 'group',
    'aria-label': 'Presets',
    'data-slot': 'date-picker-presets',
    class: 'relative flex flex-col p-1',
    '(mousemove)': 'hover.onMouseMove($event)',
    '(mouseenter)': 'hover.onMouseEnter()',
    '(mouseleave)': 'hover.onMouseLeave()',
    '(click)': 'hover.onClick($event)',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FLUID_HOVER, useFactory: () => inject(DatePickerPresets).hover }],
  template: `
    <ff-fluid-hover-highlight [hover]="hover" class="rounded-lg" />
    @for (preset of presets(); track preset.label; let i = $index) {
      <button
        type="button"
        [ffFluidHoverItem]="i"
        [attr.data-preset-index]="i"
        [attr.aria-pressed]="isSelected(preset)"
        [class]="rowClass(i, preset)"
        (click)="pick.emit(preset)"
      >
        <span class="inline-grid">
          <!-- Trimmed like the visible label, so both boxes match and the
               label sits centered in the row. -->
          <span
            aria-hidden="true"
            class="invisible col-start-1 row-start-1 [text-box:trim-both_cap_alphabetic]"
            [style.font-variation-settings]="semibold"
            >{{ preset.label }}</span
          >
          <span
            class="col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]"
            [style.font-variation-settings]="isSelected(preset) ? semibold : normal"
            >{{ preset.label }}</span
          >
        </span>
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePickerPresets {
  readonly presets = input<DatePickerPreset[]>([]);
  /** The committed range, to mark the matching preset pressed. */
  readonly value = input<DateRange | undefined>(undefined);
  readonly pick = output<DatePickerPreset>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly sizeClasses = injectSize();
  protected readonly semibold = fontWeights.semibold;
  protected readonly normal = fontWeights.normal;
  readonly hover = createFluidHover(() => this.host, { axis: 'xy' });

  private readonly baseRowClass = computed(() =>
    cn(
      'relative z-10 flex shrink-0 cursor-pointer items-center rounded-lg text-left whitespace-nowrap outline-none',
      'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
      this.sizeClasses().control,
      this.sizeClasses().itemPx,
      this.sizeClasses().text,
      'transition-[color] duration-80',
    ),
  );

  protected isSelected(preset: DatePickerPreset): boolean {
    const value = this.value();
    return sameDay(value?.from, preset.range.from) && sameDay(value?.to, preset.range.to);
  }

  protected rowClass(i: number, preset: DatePickerPreset) {
    const lit = this.isSelected(preset) || this.hover.activeIndex() === i;
    return cn(this.baseRowClass(), lit ? 'text-foreground' : 'text-muted-foreground');
  }

  protected onFocusIn(e: FocusEvent) {
    const i = Number((e.target as HTMLElement).getAttribute('data-preset-index'));
    if (!Number.isNaN(i)) this.hover.setActiveIndex(i);
  }

  protected onFocusOut(e: FocusEvent) {
    if (!this.host.contains(e.relatedTarget as Node | null)) this.hover.setActiveIndex(null);
  }
}
