import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  type TemplateRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  cn,
  spring,
  exitFallbackMs,
  injectShape,
  nestedRadius,
  SizeContext,
  sizeMap,
  type SizeVariant,
  Elevated,
  Icon,
  enterTransition,
  exitTransition,
  injectAnimateFluid,
  type FluidAnimation,
} from '../core';
import { FLUID_HOVER, FluidHoverItem, createFluidHover, FluidHoverHighlight } from '../fluid-hover';
import {
  Calendar,
  WEEK_COL_RATIO,
  type CalendarDayDetailContext,
  type CalendarOrientation,
  type CalendarValue,
  type DateRange,
  type Matcher,
  type WeekStartsOn,
  type CalendarFormatters,
  type CalendarLabels,
} from '../calendar';
import { LAST_MINUTE, buildSlots, formatDuration, minutesToTime, resolveHourCycle, shiftEnd, timeToMinutes } from './date-picker-time';
import {
  formValue,
  formatDateLabel,
  formatRangeLabel,
  labelParts,
  rangeLabelOptions,
  rangeWithYear,
  sameDay,
  singleLabelOptions,
  widestLabelParts,
  type LabelPart,
  type TimeRange,
} from './date-picker-labels';
import {
  createDatePickerPopover,
  datePickerMotionClass,
  datePickerPopupClass,
  datePickerPositionerClass,
} from './date-picker-popover';
import { DATE_PICKER_SEGMENTS, DatePickerTimeField } from './date-picker-time-field';
import { DatePickerPresets, type DatePickerPreset } from './date-picker-presets';

export type { DatePickerPreset } from './date-picker-presets';

// ---------------------------------------------------------------------------
// DatePicker: an outline field or a ghost trigger for a date, a range, or a
// date and a time. The date opens a calendar popover (with presets in range
// mode); each time is an editable field with its own slot-list popover. One
// small fluid hover runs across the trigger's segments.
//
// Labels and times are formatted with Intl; times are "HH:mm" strings on the
// same day as the date.
// ---------------------------------------------------------------------------

export type DatePickerMode = 'single' | 'range';
export type DatePickerVariant = 'outline' | 'ghost';
export type DatePickerValue = Date | DateRange | undefined;

/** What `calendarProps` reaches on the calendar inside (React `CalendarProps`
 *  minus what the picker owns: mode, selection, months, orientation, size). */
export interface DatePickerCalendarProps {
  booked?: Matcher | Matcher[];
  available?: Matcher | Matcher[];
  disabled?: Matcher | Matcher[];
  min?: number;
  max?: number;
  dayDetail?: (date: Date) => unknown;
  dayDetailTemplate?: TemplateRef<CalendarDayDetailContext>;
  cellSize?: number;
  fill?: boolean;
  showWeekNumber?: boolean;
  showOutsideDays?: boolean;
  weekStartsOn?: WeekStartsOn;
  ISOWeek?: boolean;
  /** BCP 47; defaults to the picker's `locale`, else `en-US` like the React calendar. */
  locale?: string;
  labels?: Partial<CalendarLabels>;
  formatters?: Partial<CalendarFormatters>;
  fixedWeeks?: boolean;
  dir?: 'ltr' | 'rtl';
  startMonth?: Date;
  endMonth?: Date;
  today?: Date;
  hideNavigation?: boolean;
  disableNavigation?: boolean;
  /** Classes for the calendar root. */
  class?: string;
}

/** How long a single pick stays on screen before the popover closes, so the
 *  selected day's fill is seen landing. */
const pickAckMs = 200;
const PRESETS_WIDTH = 152;

let nextPickerId = 0;

@Component({
  selector: 'ff-date-picker',
  imports: [
    NgTemplateOutlet,
    Elevated,
    Icon,
    FluidHoverItem,
    FluidHoverHighlight,
    Calendar,
    DatePickerTimeField,
    DatePickerPresets,
  ],
  host: {
    role: 'group',
    'data-slot': 'date-picker',
    '[attr.data-variant]': 'variant()',
    '[attr.data-two-rows]': 'twoRows() ? "" : null',
    '[attr.aria-label]': 'ariaLabel() ?? null',
    // `id` belongs to the date trigger and `name` to the hidden input.
    '[attr.id]': 'null',
    '[attr.name]': 'null',
    '[class]': 'hostClass()',
    '(mousemove)': 'segmentHover.onMouseMove($event)',
    '(mouseenter)': 'segmentHover.onMouseEnter()',
    '(mouseleave)': 'segmentHover.onMouseLeave()',
    '(click)': 'segmentHover.onClick($event)',
  },
  providers: [
    { provide: SizeContext, useFactory: () => inject(DatePicker).sizeContext },
    { provide: FLUID_HOVER, useFactory: () => inject(DatePicker).segmentHover },
    { provide: DATE_PICKER_SEGMENTS, useFactory: () => inject(DatePicker).segmentHover },
  ],
  template: `
    <ff-fluid-hover-highlight [hover]="segmentHover" [class]="highlightClass()" />
    @if (name()) {
      <input type="hidden" [name]="name()" [value]="formValue()" />
    }

    <span [class]="dateWrapClass()" [style.height]="rowHeight()">
      <button
        #trigger
        type="button"
        data-slot="date-picker-trigger"
        aria-haspopup="dialog"
        [ffFluidHoverItem]="0"
        [attr.id]="id() ?? null"
        [disabled]="disabled()"
        [attr.aria-label]="triggerLabel()"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-controls]="isOpen() ? popupId : null"
        [attr.data-popup-open]="isOpen() ? '' : null"
        [attr.data-placeholder]="hasValue() ? null : ''"
        [class]="triggerClass()"
        (click)="setOpen(!isOpen())"
      >
        @if (field()) {
          <ff-icon name="calendar" [size]="sizeClasses().icon" [strokeWidth]="1.5" class="shrink-0 text-muted-foreground" />
        }
        <!-- Left-aligned: a button centers its text, which would float the
             date inside its fixed width. -->
        <span class="inline-grid text-left tabular-nums">
          <span class="col-start-1 row-start-1 [text-box:trim-both_cap_alphabetic]">{{ dateLabel() }}</span>
          <span aria-hidden="true" class="invisible col-start-1 row-start-1 inline-flex whitespace-pre">
            @for (options of labelSizer(); track $index) {
              <span class="inline-grid">
                @for (option of options; track option) {
                  <!-- Trimmed per part: text-box trim skips flex containers. -->
                  <span class="col-start-1 row-start-1 [text-box:trim-both_cap_alphabetic]">{{ option }}</span>
                }
              </span>
            }
          </span>
          <span
            aria-hidden="true"
            class="invisible col-start-1 row-start-1 whitespace-pre [text-box:trim-both_cap_alphabetic]"
            >{{ labelPlaceholder() }}</span
          >
        </span>
      </button>
    </span>

    <div #positioner data-slot="date-picker-positioner" [class]="positionerClass" style="display: none">
      <div role="dialog" class="outline-none" [id]="popupId" [attr.aria-label]="ariaLabel() ?? null">
        <div #motion [class]="motionClass">
          @if (popover.mounted()) {
            <div data-slot="date-picker-popup" [ffElevated]="2" [shadowLevel]="3" [class]="popupClass">
              <div [class]="popupBodyClass()">
                <!-- Presets sit beside the calendar, or below it when the
                     months stack (the calendar stays first in reading and
                     tab order). -->
                @if (showPresets() && !stacked()) {
                  <ng-container [ngTemplateOutlet]="presetTpl" />
                }
                <!-- 4px in from the popup's 12px corners: 8px keeps them concentric. -->
                <div class="rounded-lg bg-inherit">
                  <ff-calendar
                    autoFocus
                    [mode]="mode()"
                    [selected]="calendarSelected()"
                    [required]="mode() === 'single'"
                    [numberOfMonths]="resolvedNumberOfMonths()"
                    [orientation]="calendarOrientation()"
                    [month]="month()"
                    [locale]="calendarLocale()"
                    [booked]="cal().booked"
                    [available]="cal().available"
                    [disabled]="cal().disabled"
                    [min]="cal().min"
                    [max]="cal().max"
                    [dayDetail]="cal().dayDetail"
                    [dayDetailTemplate]="cal().dayDetailTemplate"
                    [cellSize]="cal().cellSize"
                    [fill]="!!cal().fill"
                    [showWeekNumber]="!!cal().showWeekNumber"
                    [showOutsideDays]="cal().showOutsideDays"
                    [weekStartsOn]="cal().weekStartsOn"
                    [ISOWeek]="cal().ISOWeek"
                    [labels]="cal().labels"
                    [formatters]="cal().formatters"
                    [fixedWeeks]="!!cal().fixedWeeks"
                    [dir]="cal().dir"
                    [startMonth]="cal().startMonth"
                    [endMonth]="cal().endMonth"
                    [today]="cal().today"
                    [hideNavigation]="!!cal().hideNavigation"
                    [disableNavigation]="!!cal().disableNavigation"
                    [class]="cal().class ?? ''"
                    (select)="onCalendarSelect($event)"
                    (monthChange)="month.set($event)"
                  />
                </div>
                @if (showPresets() && stacked()) {
                  <ng-container [ngTemplateOutlet]="presetTpl" />
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    <ng-template #presetTpl>
      <div [class]="presetWrapClass()">
        <ff-date-picker-presets [presets]="presets() ?? []" [value]="range()" (pick)="onPresetPick($event)" />
      </div>
    </ng-template>

    @if (timed() && !twoRows()) {
      <span aria-hidden="true" class="relative z-[1] mx-0.5 h-4 w-px shrink-0 bg-border"></span>
    }
    @if (twoRows()) {
      <!-- The line between the date row and the time row. -->
      <span aria-hidden="true" class="order-3 my-1 h-px basis-full bg-border"></span>
    }
    @if (timed()) {
      <span [class]="timeWrapClass()" [style.height]="rowHeight()">
        @if (hasTime()) {
          <ff-date-picker-time-field
            placeholder="Time"
            label="Time"
            prefixIcon="clock"
            [index]="1"
            [value]="timeMinutes()"
            [slots]="daySlots()"
            [hourCycle]="hourCycle()"
            [locale]="locale()"
            [disabled]="disabled()"
            [segmentClass]="segmentClass()"
            [fallback]="nowFallback"
            (commit)="setTime(minutesToTime($event))"
          />
        } @else if (hasTimeRange()) {
          <ff-date-picker-time-field
            placeholder="Start"
            label="Start time"
            prefixIcon="clock"
            [index]="1"
            [value]="startMinutes()"
            [slots]="daySlots()"
            [hourCycle]="hourCycle()"
            [locale]="locale()"
            [disabled]="disabled()"
            [segmentClass]="segmentClass()"
            [fallback]="nowFallback"
            (commit)="onStartCommit($event)"
          />
          <ff-date-picker-time-field
            placeholder="End"
            label="End time"
            prefixIcon="arrow-right"
            [index]="2"
            [value]="endMinutes()"
            [slots]="endSlots()"
            [hourCycle]="hourCycle()"
            [locale]="locale()"
            [disabled]="disabled()"
            [segmentClass]="segmentClass()"
            [fallback]="endFallback"
            [duration]="durationNote()"
            (commit)="onEndCommit($event)"
          />
        }
      </span>
    }

    @if (clearMounted()) {
      <button
        #clear
        type="button"
        aria-label="Clear"
        data-slot="date-picker-clear"
        [ffFluidHoverItem]="9"
        [class]="clearClass()"
        [style.height]="rowHeight()"
        (click)="onClear()"
      >
        <ff-icon name="x" [size]="sizeClasses().icon" [strokeWidth]="1.5" />
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePicker {
  // ── Value ───────────────────────────────────────────────────
  /** One date, or a start and an end. */
  readonly mode = input<DatePickerMode>('single');
  /** The date, or `{ from, to }` in range mode. Two-way: `[(value)]`; the
   *  `valueChange` output is React's `onValueChange` (a pick, a complete
   *  range, or a clear). */
  readonly value = model<DatePickerValue>(undefined);
  /** Range mode: `{ label, range }` shortcuts beside the calendar. */
  readonly presets = input<DatePickerPreset[] | undefined>(undefined);

  // ── Time ────────────────────────────────────────────────────
  /** One time, as `"HH:mm"`. `null` shows an empty field; leave it unset
   *  (undefined) for no time field. Two-way: `[(time)]`. */
  readonly time = model<string | null | undefined>(undefined);
  /** `{ start: "11:00", end: "12:45" }` on the same day, with the duration
   *  shown. `null` shows empty fields; unset for none. Two-way: `[(timeRange)]`. */
  readonly timeRange = model<TimeRange | null | undefined>(undefined);
  /** Minutes between slots. */
  readonly step = input(15);
  /** Overrides the locale's clock. Values stay `"HH:mm"`. */
  readonly hourCycleInput = input<12 | 24 | undefined>(undefined, { alias: 'hourCycle' });

  // ── Calendar ────────────────────────────────────────────────
  /** Months in the popover. Default 1, 2 in range mode. */
  readonly numberOfMonths = input<1 | 2 | undefined>(undefined);
  /** 2 months side by side or stacked. Auto stacks when they don't fit. */
  readonly orientation = input<CalendarOrientation>('auto');
  /** Reaches the calendar: `booked`, `disabled`, `cellSize`, `dayDetail`… */
  readonly calendarProps = input<DatePickerCalendarProps | undefined>(undefined);
  /** BCP 47 locale for dates and times. Defaults to the browser's. */
  readonly locale = input<string | undefined>(undefined);

  // ── Trigger ─────────────────────────────────────────────────
  /** "outline" matches Select; "ghost" is inline text with a hover fill. */
  readonly variant = input<DatePickerVariant>('outline');
  /** Shows while nothing is picked. Default "Pick a date", "Pick dates" in range mode. */
  readonly placeholder = input<string | undefined>(undefined);
  /** Outline: a clear button once there's a value. */
  readonly clearable = input(true, { transform: booleanAttribute });
  /** Controls the date popover with `openChange` (a bound value always wins). */
  readonly openInput = input<boolean | undefined>(undefined, { alias: 'open' });
  /** The date popover's initial state when `open` is unbound. */
  readonly defaultOpen = input(false, { transform: booleanAttribute });
  /** Disables the whole picker. Block days with `calendarProps.disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Pins the trigger and popovers to one step of the size ladder. */
  readonly size = input<SizeVariant | undefined>(undefined);

  // ── Forms and accessibility ─────────────────────────────────
  /** Submits with a form through a hidden input, in ISO 8601 local time:
   *  `2026-10-21`, `2026-10-21T11:00`, two joined by `/` for a range or a
   *  start and end time. Empty until the value is complete. */
  readonly name = input<string | undefined>(undefined);
  /** The date trigger's id, for a `<label for>`. */
  readonly id = input<string | undefined>(undefined);
  /** Names the group, and is read before the date: "Check-in: Oct 21". */
  readonly ariaLabel = input<string | undefined>(undefined, { alias: 'aria-label' });
  /** Classes on the outer group. */
  readonly userClass = input('', { alias: 'class' });

  /** The date popover opened or closed (React `onOpenChange`). */
  readonly openChange = output<boolean>();

  // ── Environment ─────────────────────────────────────────────
  private readonly parentSize = inject(SizeContext, { optional: true, skipSelf: true });
  readonly sizeContext: SizeContext = {
    size: computed(() => this.size() ?? this.parentSize?.size() ?? 'default'),
    setSize: (next: SizeVariant) => {
      if (this.size() === undefined) this.parentSize?.setSize(next);
    },
  };
  protected readonly sizeClasses = computed(() => sizeMap[this.sizeContext.size()]);
  private readonly shape = injectShape();
  private readonly animate = injectAnimateFluid();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly popupId = `ff-date-picker-popup-${nextPickerId++}`;
  protected readonly positionerClass = datePickerPositionerClass;
  protected readonly motionClass = datePickerMotionClass;
  protected readonly popupClass = datePickerPopupClass;
  protected readonly minutesToTime = minutesToTime;

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly positioner = viewChild<ElementRef<HTMLElement>>('positioner');
  private readonly motion = viewChild<ElementRef<HTMLElement>>('motion');
  private readonly clearEl = viewChild<ElementRef<HTMLButtonElement>>('clear');

  /** Too narrow for date and time on one row (a phone, a side panel), the
   *  time moves to a second row under the date. The one-row width is measured
   *  while on one row; the segments size to their widest value, so it holds. */
  protected readonly twoRows = signal(false);
  /** The picker's one-row content width, measured while it is on one row. */
  private oneRowWidth = 0;

  /** Segment hover scope: date, time(s), clear. */
  readonly segmentHover = createFluidHover(() => this.host, () => ({
    axis: this.twoRows() ? 'xy' : 'x',
    gapClick: false,
  }));

  // ── State ───────────────────────────────────────────────────
  private readonly openState = linkedSignal(() => this.defaultOpen());
  readonly isOpen = computed(() => this.openInput() ?? this.openState());
  /** While a range is being picked, its partial value lives here; the
   *  consumer only ever sees complete ranges. */
  private readonly draft = signal<DateRange | undefined>(undefined);
  protected readonly month = signal<Date | undefined>(undefined);
  private readonly layout = signal<'horizontal' | 'vertical'>('horizontal');
  private ackTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly compact = computed(() => this.sizeClasses().variant === 'compact');
  protected readonly field = computed(() => this.variant() === 'outline');
  protected readonly hourCycle = computed(() => resolveHourCycle(this.locale(), this.hourCycleInput()));
  protected readonly cal = computed<DatePickerCalendarProps>(() => this.calendarProps() ?? {});
  // React passes no locale to its calendar, so DayPicker draws en-US whatever
  // the browser; a picker `locale` (or calendarProps.locale) opts in.
  protected readonly calendarLocale = computed(() => this.cal().locale ?? this.locale() ?? 'en-US');
  protected readonly resolvedNumberOfMonths = computed<1 | 2>(
    () => this.numberOfMonths() ?? (this.mode() === 'range' ? 2 : 1),
  );
  private readonly resolvedOrientation = computed(() =>
    this.orientation() === 'auto' ? this.layout() : this.orientation(),
  );
  protected readonly calendarOrientation = computed<CalendarOrientation>(() =>
    this.resolvedNumberOfMonths() > 1 ? this.resolvedOrientation() : 'auto',
  );
  protected readonly stacked = computed(() => this.resolvedOrientation() === 'vertical');
  protected readonly showPresets = computed(() => this.mode() === 'range' && !!this.presets()?.length);

  protected readonly range = computed(() =>
    this.mode() === 'range' ? (this.value() as DateRange | undefined) : undefined,
  );
  private readonly single = computed(() => {
    const value = this.value();
    return this.mode() === 'single' && value instanceof Date ? value : undefined;
  });
  protected readonly hasValue = computed(() => (this.mode() === 'range' ? !!this.range()?.from : !!this.single()));
  protected readonly hasTime = computed(() => this.time() !== undefined);
  protected readonly hasTimeRange = computed(() => !this.hasTime() && this.timeRange() !== undefined);
  /** Whether the trigger carries any time field after the date. */
  protected readonly timed = computed(() => this.hasTime() || this.hasTimeRange());
  protected readonly calendarSelected = computed<CalendarValue>(() =>
    this.mode() === 'range' ? (this.draft() ?? this.range()) : this.single(),
  );

  protected readonly labelPlaceholder = computed(
    () => this.placeholder() ?? (this.mode() === 'range' ? 'Pick dates' : 'Pick a date'),
  );
  protected readonly dateLabel = computed(() => {
    const range = this.range();
    const single = this.single();
    if (this.mode() === 'range') return range?.from ? formatRangeLabel(range, this.locale()) : this.labelPlaceholder();
    return single ? formatDateLabel(single, this.locale()) : this.labelPlaceholder();
  });
  protected readonly triggerLabel = computed(() => {
    const label = this.ariaLabel();
    return label ? `${label}: ${this.dateLabel()}` : null;
  });

  // The date keeps the width of its widest possible label (and of the
  // placeholder), so picking Oct 1 or Oct 31 never moves what follows.
  protected readonly labelSizer = computed(() => {
    const year = new Date().getFullYear();
    const locale = this.locale();
    if (this.mode() === 'range') {
      const range = this.range();
      const from = range?.from ?? new Date(year, 0, 1);
      const to = range?.to ?? from;
      const options = rangeLabelOptions(
        rangeWithYear({ from: range?.from ? from : undefined, to: range?.to ? to : undefined }, new Date(year, 0, 1)),
      );
      const sample: LabelPart[] = [
        ...labelParts(from, locale, options),
        { type: 'literal', value: ' → ' },
        ...labelParts(to, locale, options),
      ];
      return widestLabelParts(sample, locale, options);
    }
    const date = this.single() ?? new Date(year, 0, 1);
    const options = singleLabelOptions(date.getFullYear() !== year);
    return widestLabelParts(labelParts(date, locale, options), locale, options);
  });

  protected readonly formValue = computed(() =>
    formValue(
      this.mode() === 'range' ? this.range() : this.single(),
      this.hasTime() ? this.time() : null,
      this.hasTimeRange() ? this.timeRange() : null,
    ),
  );

  // ── Classes ─────────────────────────────────────────────────
  // Segments sit 2px inside the field (plus its 1px border); their corners
  // nest inside its radius: 8 - 3 = 5px rounded, 20 - 3 = 17px pill.
  private readonly innerRadius = computed(() =>
    this.field()
      ? nestedRadius(this.shape().bgRadius, 3) === 5
        ? 'rounded-[5px]'
        : 'rounded-[17px]'
      : this.shape().bg,
  );
  protected readonly segmentClass = computed(() =>
    cn(
      'relative z-[1] inline-flex h-full items-center outline-none',
      'transition-[color] duration-80',
      'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
      this.compact() || this.twoRows() ? 'px-1.5' : 'px-2',
      this.innerRadius(),
    ),
  );
  /** Stacked, each row keeps the one-row height (inside the field's 1px
   *  border and 2px padding), so the segments' h-full still resolves. */
  protected readonly rowHeight = computed(() =>
    this.twoRows() ? `${this.sizeClasses().controlHeight - (this.field() ? 6 : 0)}px` : null,
  );
  protected readonly dateWrapClass = computed(() =>
    cn(
      'inline-flex h-full items-center',
      // A lone date field fills the box, so its hover spans the width.
      this.field() && !this.timed() && 'flex-1',
      this.twoRows() && 'order-1',
    ),
  );
  protected readonly timeWrapClass = computed(() =>
    cn('inline-flex h-full items-center', this.twoRows() && 'order-4'),
  );
  protected readonly hostClass = computed(() =>
    cn(
      'group/date-picker relative inline-flex items-center',
      this.twoRows() ? 'flex-wrap' : this.sizeClasses().control,
      this.sizeClasses().text,
      this.field()
        ? cn(
            'border border-border bg-transparent',
            // Two rows get more room around them than the one-row field.
            this.twoRows() ? 'p-1' : 'p-0.5',
            this.shape().input,
            this.compact() ? 'min-w-[128px]' : 'min-w-[160px]',
          )
        : '',
      this.disabled() && 'pointer-events-none opacity-50',
      this.userClass(),
    ),
  );
  protected readonly highlightClass = computed(() => cn('z-0', this.innerRadius()));
  protected readonly triggerClass = computed(() =>
    cn(
      this.segmentClass(),
      // Icon-to-label gap matches Button's, at both sizes.
      this.compact() ? 'gap-1' : 'gap-1.5',
      'cursor-pointer whitespace-nowrap',
      this.field() && !this.hasTime() && !this.hasTimeRange() && 'flex-1',
      this.hasValue() ? 'text-foreground' : 'text-muted-foreground',
      this.isOpen() && 'text-foreground',
    ),
  );
  protected readonly clearClass = computed(() =>
    cn(
      'relative z-[1] ml-auto inline-flex h-full shrink-0 cursor-pointer items-center justify-center text-muted-foreground outline-none hover:text-foreground',
      // Two rows: the clear sits right after the date it clears.
      this.twoRows() && 'order-2 ml-0',
      'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
      this.compact() ? 'w-6' : 'w-7',
      this.innerRadius(),
    ),
  );
  protected readonly popupBodyClass = computed(() =>
    cn(
      // Same box as the popup: its corners follow the popup's 12px.
      'flex rounded-[inherit] bg-inherit p-1',
      this.showPresets() && this.stacked() ? 'flex-col' : 'flex-row',
      this.stacked() &&
        this.resolvedNumberOfMonths() > 1 &&
        'max-h-[min(560px,var(--popup-available-height,560px))] overflow-y-auto',
    ),
  );
  protected readonly presetWrapClass = computed(() =>
    cn('shrink-0', this.stacked() ? 'mt-1 border-t border-border pt-1' : 'w-[152px] border-r border-border pr-1'),
  );

  // ── Time segments ───────────────────────────────────────────
  protected readonly timeMinutes = computed(() => timeToMinutes(this.time()));
  protected readonly startMinutes = computed(() => (this.hasTimeRange() ? timeToMinutes(this.timeRange()?.start) : null));
  protected readonly endMinutes = computed(() => (this.hasTimeRange() ? timeToMinutes(this.timeRange()?.end) : null));
  protected readonly daySlots = computed(() => buildSlots(this.step()));
  protected readonly endSlots = computed(() => {
    const step = this.step();
    const now = untracked(() => this.nowMinutes());
    return buildSlots(step, this.startMinutes() ?? now - (now % step));
  });
  protected readonly durationNote = computed(() => {
    const start = this.startMinutes();
    const end = this.endMinutes();
    return start !== null && end !== null && end > start ? formatDuration(end - start) : undefined;
  });
  protected readonly nowFallback = () => this.nowMinutes();
  protected readonly endFallback = () => (this.startMinutes() ?? this.nowMinutes()) + 60;

  // ── Clear ───────────────────────────────────────────────────
  private readonly showClear = computed(
    () =>
      this.field() &&
      this.clearable() &&
      (this.hasValue() || (this.hasTime() && !!this.time()) || (this.hasTimeRange() && !!this.timeRange())),
  );
  protected readonly clearMounted = signal(false);
  private clearAnimation: FluidAnimation | null = null;
  private clearExiting = false;
  private clearEnterPending = false;
  private clearTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly popover = createDatePickerPopover({
    open: this.isOpen,
    kind: 'trigger',
    positioner: () => this.positioner()?.nativeElement,
    motion: () => this.motion()?.nativeElement,
    anchor: () => this.trigger()?.nativeElement,
    align: 'start',
    escapeBlocked: () => !!this.draft(),
    dismiss: () => this.setOpen(false),
  });

  constructor() {
    // Too narrow for date and time on one row (a phone, a side panel), the
    // time moves to a second row under the date. The one-row width is
    // measured while on one row, so the two-row layout can't feed back into
    // it: the segments size to their widest value, so it holds.
    afterRenderEffect((onCleanup) => {
      const el = this.host;
      const parent = el.parentElement;
      if (!parent || !this.timed()) {
        this.twoRows.set(false);
        return;
      }
      const measure = () => {
        // The content's width, not the box's: the field's min-width lets a
        // flex parent shrink the box under its content.
        if (el.dataset['twoRows'] === undefined) {
          this.oneRowWidth = el.scrollWidth + el.offsetWidth - el.clientWidth;
        }
        const cs = getComputedStyle(parent);
        const room = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        this.twoRows.set(this.oneRowWidth > room + 0.5);
      };
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(measure);
      ro.observe(parent);
      ro.observe(el);
      onCleanup(() => ro.disconnect());
    });

    // A bound or default open lands on the value's month too.
    effect(() => {
      if (!this.isOpen()) return;
      untracked(() => {
        if (this.month() === undefined) this.prepareOpen();
      });
    });

    // The clear button fades in and out (AnimatePresence with initial off).
    let first = true;
    effect(() => {
      const show = this.showClear();
      untracked(() => {
        if (show) {
          clearTimeout(this.clearTimer);
          if (!this.clearMounted()) {
            this.clearEnterPending = !first;
            this.clearMounted.set(true);
          } else if (this.clearExiting) {
            this.clearExiting = false;
            const el = this.clearEl()?.nativeElement;
            if (el) {
              this.clearAnimation?.stop();
              this.clearAnimation = this.animate(el, { opacity: 1 }, enterTransition(spring.fast));
            }
          }
        } else if (this.clearMounted() && !this.clearExiting) {
          this.clearExiting = true;
          const release = () => {
            if (!this.clearExiting) return;
            this.clearExiting = false;
            this.clearAnimation?.stop();
            this.clearAnimation = null;
            this.clearMounted.set(false);
          };
          const el = this.clearEl()?.nativeElement;
          if (el) {
            this.clearAnimation?.stop();
            const exit = this.animate(el, { opacity: 0 }, exitTransition(spring.fast));
            this.clearAnimation = exit;
            exit.finished.then(() => {
              if (this.clearAnimation === exit) release();
            });
          }
          // Fallback release for throttled tabs where the exit stalls.
          this.clearTimer = setTimeout(release, exitFallbackMs(spring.fast));
        }
        first = false;
      });
    });
    afterRenderEffect(() => {
      const el = this.clearEl()?.nativeElement;
      if (!el || !this.clearEnterPending) return;
      this.clearEnterPending = false;
      el.style.opacity = '0';
      this.clearAnimation = this.animate(el, { opacity: [0, 1] }, enterTransition(spring.fast));
    });

    inject(DestroyRef).onDestroy(() => {
      this.cancelAck();
      clearTimeout(this.clearTimer);
      this.clearAnimation?.stop();
    });
  }

  // ── Open ────────────────────────────────────────────────────

  private nowMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  private cancelAck() {
    if (this.ackTimer !== null) {
      clearTimeout(this.ackTimer);
      this.ackTimer = null;
    }
  }

  /** Opens on the value's month, laid out for the room the viewport has. */
  private prepareOpen() {
    const value = this.value();
    const anchor = value instanceof Date ? value : value?.from;
    this.month.set(anchor ?? new Date());
    if (this.orientation() === 'auto' && this.resolvedNumberOfMonths() > 1 && typeof window !== 'undefined') {
      const cellSize = this.cal().cellSize ?? (this.compact() ? 32 : 36);
      const needed =
        (7 + (this.cal().showWeekNumber ? WEEK_COL_RATIO : 0)) * cellSize * 2 +
        24 +
        24 +
        (this.presets()?.length ? PRESETS_WIDTH : 0);
      this.layout.set(window.innerWidth - 16 >= needed ? 'horizontal' : 'vertical');
    }
  }

  /** Opens or closes the date popover (reported through `openChange`). */
  setOpen(next: boolean) {
    this.cancelAck();
    if (next) this.prepareOpen();
    else this.draft.set(undefined);
    if (this.openInput() === undefined) this.openState.set(next);
    this.openChange.emit(next);
  }

  private closeAfterAck() {
    this.cancelAck();
    this.ackTimer = setTimeout(() => {
      this.ackTimer = null;
      this.setOpen(false);
    }, pickAckMs);
  }

  // ── Picks ───────────────────────────────────────────────────

  private setValue(next: DatePickerValue) {
    this.value.set(next);
  }

  protected onCalendarSelect(next: CalendarValue) {
    if (this.mode() === 'single') {
      this.setValue(next as Date | undefined);
      if (next) this.closeAfterAck();
      return;
    }
    const r = next as DateRange | undefined;
    if (r?.from && !r.to) {
      this.draft.set(r);
      return;
    }
    const draft = this.draft();
    this.draft.set(undefined);
    if (!draft) {
      this.setValue(r);
      return;
    }
    // A pick that lands the end commits and closes. Escape restoring the
    // previous range lands here too, sharing no endpoint with the draft.
    const completes = !!r?.from && !!r.to && (sameDay(r.from, draft.from) || sameDay(r.to, draft.from));
    if (completes) {
      this.setValue(r);
      this.closeAfterAck();
    }
  }

  protected onPresetPick(preset: DatePickerPreset) {
    this.draft.set(undefined);
    this.setValue(preset.range);
    if (preset.range.from) this.month.set(preset.range.from);
  }

  protected setTime(next: string | null) {
    this.time.set(next);
  }

  protected onStartCommit(m: number) {
    const startMinutes = this.startMinutes();
    const endMinutes = this.endMinutes();
    const prevStart = startMinutes ?? m;
    const prevEnd = endMinutes ?? Math.min(m + 60, LAST_MINUTE);
    this.timeRange.set({
      start: minutesToTime(m),
      end: minutesToTime(endMinutes === null ? prevEnd : shiftEnd(prevStart, prevEnd, m)),
    });
  }

  protected onEndCommit(m: number) {
    const start = this.startMinutes() ?? Math.max(m - 60, 0);
    if (m <= start) return;
    this.timeRange.set({ start: minutesToTime(start), end: minutesToTime(m) });
  }

  protected onClear() {
    this.setValue(undefined);
    this.draft.set(undefined);
    if (this.hasTime()) this.time.set(null);
    if (this.hasTimeRange()) this.timeRange.set(null);
  }
}
