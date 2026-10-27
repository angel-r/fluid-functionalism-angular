import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  type TemplateRef,
  afterNextRender,
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
import { cn } from '../core/utils';
import { spring, exitFallbackMs } from '../core/springs';
import { fontWeights } from '../core/font-weight';
import { injectShape } from '../core/shape';
import { injectSize, type SizeVariant } from '../core/size';
import { typeClass } from '../core/type-scale';
import { POPUP_NAV_KEYS } from '../core/popup';
import { ReducedMotion, createKeyboardNavGate } from '../core/environment';
import { enterTransition, exitTransition } from '../core/motion';
import { createFluidHover, FluidHoverItem, FLUID_HOVER, type ItemRect } from '../fluid-hover/fluid-hover';
import { FluidHoverHighlight } from '../fluid-hover/fluid-hover-highlight';
import { Layer, isFocusVisible } from '../tabs/layer';
import {
  addDays,
  addMonths,
  addToRange,
  buildMonths,
  calculateFocusTarget,
  dateMatchModifiers,
  dayNumber,
  isSameDay,
  keyToMove,
  monthsBetween,
  nextFocusDate,
  rangeContainsModifiers,
  rangeIncludesDate,
  resolveDayMatchers,
  resolveWeekNumbering,
  startOfMonth,
  endOfMonth,
  fromDayNumber,
  isoDate,
  type CalendarMonth,
  type DateRange,
  type Matcher,
  type MonthGridOptions,
  type WeekStartsOn,
} from './calendar-dates';
import {
  defaultFormatters,
  defaultLabels,
  localeFirstWeekContainsDate,
  localeWeekStart,
  type CalendarFormatters,
  type CalendarLabels,
} from './calendar-locale';
import { CALENDAR_CONTEXT, INDEX_ATTR, INERT_ATTR, isDisabledDay, type CalendarContext, type CalendarNavDirection } from './calendar-context';
import { CalendarNav } from './calendar-nav';
import { CalendarGhost, CalendarSlide, CalendarWeeksBox, type SlideConfig } from './calendar-slide';
import { buildWeekViews, type CalendarDayView, type CalendarWeekView, type DayViewState } from './calendar-view';

// ---------------------------------------------------------------------------
// Calendar
//
// The month model (calendar-dates.ts) owns the date math, the roving tab
// stop, the grid keys (arrows, PageUp/PageDown, Home/End), locale and the
// selection rules that DayPicker owns in the React version. Every part
// renders as a div with the matching ARIA role, so the grid lays out with
// flex instead of table rules and one fluid hover scope spans both months.
// ---------------------------------------------------------------------------

export type CalendarMode = 'single' | 'range';
export type CalendarOrientation = 'auto' | 'horizontal' | 'vertical';
export type CalendarValue = Date | DateRange | undefined;

/** Context of a `dayDetailTemplate`: the value `dayDetail` returned, and the day. */
export interface CalendarDayDetailContext {
  $implicit: unknown;
  date: Date;
}

const MONTH_GAP = 24;
const CALENDAR_PAD = 8;
/** One day column: the cell size, or the measured column when the months
 *  fill their container (see the months box). The chevrons take one each. */
const COL = 'var(--calendar-col, var(--cell-size))';
/** The week-number column: narrower than a day, so the numbers sit close to
 *  the days instead of floating in a full cell. */
export const WEEK_COL_RATIO = 0.75;
export const WEEK_COL = `calc(var(--cell-size) * ${WEEK_COL_RATIO})`;

/**
 * The stacked strip's mask, the scroll-fade recipe twice over. Top: nothing
 * shows above the first caption row (the strip reaches up through the 16px
 * gap to the weekday row, which stays empty), then content fades in over a
 * quarter cell, ending just above the title's cap height. Bottom: content
 * fades over the 24px the strip reaches past the last week (only padding at
 * rest, so nothing on screen dims). A month sliding out either way dissolves
 * there instead of being cut. The chevrons sit in a hole that hides
 * everything from their left edge (16px fade beyond it) down to the 4px
 * margin under their row (faded across it, so the first week stays whole),
 * so a month sliding up goes under them instead of showing through. The hole
 * is the left-fade and bottom-fade gradients intersected, subtracted from
 * the fade.
 */
const STACKED_NAV_WIDTH = `calc(${COL} * 2)`;
const stackedStripMask: Record<string, string> = (() => {
  const fade =
    'linear-gradient(to bottom, transparent calc(var(--strip-clip-top) + 16px), #000 calc(var(--strip-clip-top) + 16px + var(--cell-size) / 4), #000 calc(100% - 24px), transparent)';
  const holeLeft = 'linear-gradient(to left, #000 calc(100% - 16px), transparent)';
  const holeBottom = 'linear-gradient(to bottom, #000 calc(100% - 4px), transparent)';
  // The caption row and its 4px margin: the first week below stays whole.
  const holeSize = `calc(${STACKED_NAV_WIDTH} + 16px) calc(var(--cell-size) + 4px)`;
  return {
    // Seeded here; the effect above keeps it on the weekday row's edge.
    '--strip-clip-top': '0px',
    maskImage: `${fade}, ${holeLeft}, ${holeBottom}`,
    maskSize: `100% 100%, ${holeSize}, ${holeSize}`,
    // The hole starts at the first caption row, below the strip's 16px reach.
    maskPosition: '0 0, right 4px top 16px, right 4px top 16px',
    maskRepeat: 'no-repeat',
    maskComposite: 'subtract, intersect',
  };
})();

/** The side-by-side strip's mask: content fades over 8px at the outer edges,
 *  which the strip reaches 8px past, so nothing at rest is dimmed. */
const sideStripMask: Record<string, string> = (() => {
  const mask = 'linear-gradient(to right, transparent, #000 8px, #000 calc(100% - 8px), transparent)';
  return { maskImage: mask, webkitMaskImage: mask };
})();

/** Mask for a side-by-side caption layer: transparent under the chevron
 *  (one day column, after the week numbers on the left), then a 24px ramp to
 *  opaque, toward `to`. */
function captionFade(to: 'left' | 'right', weekNumbers: boolean) {
  const nav = to === 'right' && weekNumbers ? `calc(${WEEK_COL} + ${COL})` : COL;
  return `linear-gradient(to ${to}, transparent ${nav}, #000 calc(${nav} + 24px))`;
}

/** The single-month caption layer's mask: clear past the right edge and
 *  under the chevron pair (a day column each), then a 24px ramp. */
function oneUpCaptionFade(stride: number, noNav: boolean) {
  const clear = noNav ? `${stride}px` : `calc(${stride}px + ${COL} * 2)`;
  return `linear-gradient(to left, transparent ${clear}, #000 calc(${clear} + 24px))`;
}

const WEEKDAY_BASE =
  'flex h-[calc(var(--cell-size)*0.8)] items-center justify-center text-muted-foreground supports-[width:round(1px,1px)]:h-[round(down,calc(var(--cell-size)*0.8),1px)]';

interface Panel {
  key: number;
  month: CalendarMonth;
  present: boolean;
  /** Slides in on mount (false for the first render's panels). */
  enter: boolean;
}

interface Slot {
  index: number;
  panels: Panel[];
}

interface PanelView {
  panel: Panel;
  weeks: CalendarWeekView[];
  shownElsewhere: boolean;
  caption: string;
}

interface WeekdayView {
  key: string;
  text: string;
  label: string;
}

let nextCalendarId = 0;

@Component({
  selector: 'ff-calendar',
  imports: [NgTemplateOutlet, FluidHoverHighlight, FluidHoverItem, CalendarNav, CalendarSlide, CalendarWeeksBox, CalendarGhost],
  templateUrl: './calendar.html',
  host: {
    'data-slot': 'calendar-root',
    '[class]': 'hostClass()',
    '[style.--cell-size]': 'cellSizePx()',
    '(keydown)': 'onRootKeyDown($event)',
  },
  providers: [
    { provide: CALENDAR_CONTEXT, useExisting: Calendar },
    { provide: FLUID_HOVER, useFactory: () => inject(Calendar).hover },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Calendar implements CalendarContext {
  // ── Selection ───────────────────────────────────────────────
  /** One day, or a start and an end. */
  readonly mode = input<CalendarMode>('single');
  /** The day, or `{ from, to }` in range mode. Two-way: `[(selected)]`. */
  readonly selected = model<CalendarValue>(undefined);
  /** Picking the selected day again keeps it. */
  readonly required = input(false, { transform: booleanAttribute });
  /** Range mode: fewest nights. */
  readonly min = input<number | undefined>(undefined);
  /** Range mode: most nights. */
  readonly max = input<number | undefined>(undefined);
  /** Runs on every pick (React `onSelect`). The first range pick has no `to` yet. */
  readonly select = output<CalendarValue>();

  // ── Days ────────────────────────────────────────────────────
  /** Taken days: unavailable, struck through, and announced as booked. */
  readonly booked = input<Matcher | Matcher[] | undefined>(undefined);
  /** When set, every day it does NOT match is unavailable. */
  readonly available = input<Matcher | Matcher[] | undefined>(undefined);
  /** Days that can't be picked (`{ before: today }` for the past). */
  readonly disabled = input<Matcher | Matcher[] | undefined>(undefined);
  /**
   * Extra content under each day's number, such as a price: return a short
   * value, or null for none. Set a taller `cellSize` (56 and up) to give it
   * room. Screen readers read it after the date (aria-describedby). Keep it
   * a pure function of the date: results are cached until it changes.
   */
  readonly dayDetail = input<((date: Date) => unknown) | undefined>(undefined);
  /** Renders each `dayDetail` value (the React version takes a node). */
  readonly dayDetailTemplate = input<TemplateRef<CalendarDayDetailContext> | undefined>(undefined);

  // ── Layout ──────────────────────────────────────────────────
  /** 1 or 2 months, side by side or stacked, under one fluid hover. */
  readonly numberOfMonths = input<1 | 2>(1);
  /** Two months: side by side, stacked, or side by side when they fit. */
  readonly orientation = input<CalendarOrientation>('auto');
  /** Cell size in px. Default 36, or 32 at the compact size. */
  readonly cellSize = input<number | undefined>(undefined);
  /** Stretch the columns to the container; `cellSize` caps the row height. */
  readonly fill = input(false, { transform: booleanAttribute });

  // ── Appearance ──────────────────────────────────────────────
  /** A muted ISO week column. */
  readonly showWeekNumber = input(false, { transform: booleanAttribute });
  /** Days of the neighbouring months. Default true for 1 month, always off for 2. */
  readonly showOutsideDays = input<boolean | undefined>(undefined);
  /** Pins the calendar to one step of the size ladder. */
  readonly size = input<SizeVariant | undefined>(undefined);
  /** First day of the week, 0 = Sunday. Default: the locale's. */
  readonly weekStartsOn = input<WeekStartsOn | undefined>(undefined);
  /** Monday weeks with ISO numbers. Default on with `showWeekNumber`
   *  unless the week starts on another day. */
  readonly ISOWeek = input<boolean | undefined>(undefined);
  /** A BCP 47 locale for names and labels (React: a date-fns locale). */
  readonly locale = input<string>('en-US');
  readonly labels = input<Partial<CalendarLabels> | undefined>(undefined);
  readonly formatters = input<Partial<CalendarFormatters> | undefined>(undefined);
  /** Always 6 week rows. */
  readonly fixedWeeks = input(false, { transform: booleanAttribute });
  readonly dir = input<'ltr' | 'rtl' | undefined>(undefined);

  // ── Navigation ──────────────────────────────────────────────
  /** The first month shown. Two-way: `[(month)]` (React `month` / `onMonthChange`). */
  readonly month = model<Date | undefined>(undefined);
  /** The first month shown when `month` is unset. Default: today's. */
  readonly defaultMonth = input<Date | undefined>(undefined);
  readonly startMonth = input<Date | undefined>(undefined);
  readonly endMonth = input<Date | undefined>(undefined);
  /** The day marked as today. Default: now. */
  readonly today = input<Date | undefined>(undefined);
  readonly hideNavigation = input(false, { transform: booleanAttribute });
  readonly disableNavigation = input(false, { transform: booleanAttribute });
  /** Focus the grid's tab stop on mount (a calendar opened in a popover). */
  readonly autoFocus = input(false, { transform: booleanAttribute });
  readonly prevClick = output<Date>();
  readonly nextClick = output<Date>();

  /** Classes for the inner `data-slot="calendar"` root (React `className`). */
  readonly userClass = input('', { alias: 'class' });

  // ── Environment ─────────────────────────────────────────────
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly reducedMotion = inject(ReducedMotion).value;
  private readonly sizeClasses = injectSize(() => this.size());
  readonly shape = injectShape();
  private readonly uid = nextCalendarId++;
  private readonly now = new Date();

  protected readonly monthsEl = viewChild<ElementRef<HTMLElement>>('monthsBox');
  private readonly stripEl = viewChild<ElementRef<HTMLElement>>('strip');
  private readonly weekdayRowEl = viewChild<ElementRef<HTMLElement>>('weekdayRow');
  private readonly ringAnchor = viewChild('ringAnchor', { read: ElementRef });

  protected readonly compact = computed(() => this.sizeClasses().variant === 'compact');
  protected readonly pill = computed(() => this.shape().variant === 'pill');
  protected readonly resolvedCellSize = computed(() => this.cellSize() ?? (this.compact() ? 32 : 36));
  protected readonly cellSizePx = computed(() => `${this.resolvedCellSize()}px`);
  protected readonly twoMonths = computed(() => this.numberOfMonths() > 1);
  protected readonly outsideHidden = computed(() => (this.twoMonths() ? true : !(this.showOutsideDays() ?? true)));
  readonly rtl = computed(() => this.dir() === 'rtl');
  protected readonly navHidden = computed(() => this.hideNavigation() || this.disableNavigation());

  // ── Value ───────────────────────────────────────────────────
  protected readonly range = computed(() =>
    this.mode() === 'range' ? (this.selected() as DateRange | undefined) : undefined,
  );
  protected readonly picking = computed(() => {
    const range = this.range();
    return this.mode() === 'range' && !!range?.from && !range.to;
  });
  private readonly selectedDay = computed(() => {
    const value = this.selected();
    return this.mode() === 'single' && value instanceof Date ? dayNumber(value) : null;
  });
  /** The range in place before a pick started, for Escape to restore. */
  private beforePick: DateRange | undefined = undefined;

  protected readonly matchers = computed(() =>
    resolveDayMatchers({ booked: this.booked(), available: this.available(), disabled: this.disabled() }),
  );
  protected readonly resolvedLabels = computed<CalendarLabels>(() => ({ ...defaultLabels, ...this.labels() }));
  protected readonly resolvedFormatters = computed<CalendarFormatters>(() => ({
    ...defaultFormatters,
    ...this.formatters(),
  }));
  private readonly isoWeek = computed(() =>
    resolveWeekNumbering(this.showWeekNumber(), this.weekStartsOn(), this.ISOWeek()),
  );
  private readonly gridOptions = computed<MonthGridOptions>(() => ({
    weekStartsOn: this.weekStartsOn() ?? localeWeekStart(this.locale()),
    ISOWeek: this.isoWeek(),
    fixedWeeks: this.fixedWeeks(),
    firstWeekContainsDate: localeFirstWeekContainsDate(this.locale()),
  }));
  private readonly todayN = computed(() => dayNumber(this.today() ?? this.now));

  // ── Months ──────────────────────────────────────────────────
  private clampMonth(date: Date): Date {
    let month = startOfMonth(date);
    const start = this.startMonth();
    const end = this.endMonth();
    if (end) {
      const lastFirst = addMonths(startOfMonth(end), -(this.numberOfMonths() - 1));
      if (month > lastFirst) month = lastFirst;
    }
    if (start && month < startOfMonth(start)) month = startOfMonth(start);
    return month;
  }
  protected readonly firstMonth = computed(() =>
    this.clampMonth(this.month() ?? this.defaultMonth() ?? this.today() ?? this.now),
  );
  protected readonly months = computed(() =>
    buildMonths(this.firstMonth(), this.numberOfMonths(), this.gridOptions()),
  );
  readonly previousMonth = computed<Date | undefined>(() => {
    if (this.disableNavigation()) return undefined;
    const first = this.firstMonth();
    const start = this.startMonth();
    if (start && monthsBetween(startOfMonth(start), first) <= 0) return undefined;
    return addMonths(first, -1);
  });
  readonly nextMonth = computed<Date | undefined>(() => {
    if (this.disableNavigation()) return undefined;
    const first = this.firstMonth();
    const end = this.endMonth();
    const last = addMonths(first, this.numberOfMonths() - 1);
    if (end && monthsBetween(last, startOfMonth(end)) <= 0) return undefined;
    return addMonths(first, 1);
  });

  // "auto": side by side when the container fits both months, stacked
  // otherwise. The width two months need is known from the cell size.
  private readonly fits = signal(true);
  private readonly neededWidth = computed(
    () =>
      (7 + (this.showWeekNumber() ? WEEK_COL_RATIO : 0)) * this.resolvedCellSize() * 2 +
      MONTH_GAP +
      CALENDAR_PAD * 2,
  );
  protected readonly resolvedOrientation = computed<'horizontal' | 'vertical'>(() => {
    const orientation = this.orientation();
    return orientation === 'auto' ? (this.fits() ? 'horizontal' : 'vertical') : orientation;
  });
  protected readonly twoUp = computed(() => this.twoMonths() && this.resolvedOrientation() === 'horizontal');
  readonly stacked = computed(() => this.twoMonths() && this.resolvedOrientation() === 'vertical');
  private readonly sideways = computed(() => !this.stacked());
  /** How far one month travels on a month change. Null until measured. */
  protected readonly stride = signal<number | null>(null);

  // A month change re-registers every day under new indices. The highlight
  // and the ring snap to where focus lands instead of gliding from the old
  // grid's geometry, and the grids slide in the direction of travel.
  private readonly monthKey = computed(() => this.months()[0].date.getTime());
  private readonly direction = linkedSignal<number, number>({
    source: this.monthKey,
    computation: (key, prev) => (!prev ? 0 : key === prev.source ? prev.value : key > prev.source ? 1 : -1),
  });
  protected readonly snap = linkedSignal<number, boolean>({
    source: this.monthKey,
    computation: (key, prev) => (!prev ? false : key !== prev.source ? true : prev.value),
  });

  /** Per month slot: the month shown, plus any month still sliding out. */
  protected readonly slots = linkedSignal<CalendarMonth[], Slot[]>({
    source: this.months,
    computation: (months, prev) =>
      months.map((month, index) => {
        const key = month.date.getTime();
        const panels: Panel[] = [];
        let found = false;
        for (const p of prev?.value[index]?.panels ?? []) {
          if (p.key === key) {
            panels.push({ ...p, month, present: true });
            found = true;
          } else panels.push(p.present ? { ...p, present: false } : p);
        }
        if (!found) panels.push({ key, month, present: true, enter: !!prev });
        return { index, panels };
      }),
  });

  protected readonly slideConfig = computed<SlideConfig>(() => ({
    offset: this.reducedMotion() ? 0 : 10,
    stride: this.stride(),
    axis: this.stacked() ? 'y' : 'x',
    single: this.numberOfMonths() === 1,
    direction: this.direction(),
  }));

  // ── Hover, preview and focus ────────────────────────────────
  readonly hover = createFluidHover(() => this.monthsEl()?.nativeElement, {
    axis: 'xy',
    isItemDisabled: isDisabledDay,
  });
  private readonly firstDay = computed(() => this.months()[0].weeks[0].days[0].date);
  private readonly gridStart = computed(() => dayNumber(this.firstDay()));

  /** The band to draw (committed, or start → lit day while picking) and the
   *  day the pointer or focus proposes as the end. */
  protected readonly preview = computed(() => {
    const range = this.range();
    let previewEnd: number | null = null;
    let band: { from: number; to: number } | null = null;
    if (this.mode() === 'range' && range?.from) {
      const from = dayNumber(range.from);
      if (this.picking()) {
        const active = this.hover.activeIndex();
        if (active !== null) {
          const previewDate = addDays(this.firstDay(), active);
          const [a, b] = range.from < previewDate ? [range.from, previewDate] : [previewDate, range.from];
          const disabled = this.matchers().disabled;
          const blocked = disabled.length > 0 && rangeContainsModifiers({ from: a, to: b }, disabled);
          if (!blocked) {
            previewEnd = dayNumber(previewDate);
            band = { from: Math.min(from, previewEnd), to: Math.max(from, previewEnd) };
          }
        }
      } else if (range.to) {
        band = { from, to: dayNumber(range.to) };
      }
    }
    return { previewEnd, band };
  });

  private readonly previewGlides = computed(() => {
    const { previewEnd } = this.preview();
    const from = this.range()?.from;
    return previewEnd !== null && !!from && previewEnd !== dayNumber(from);
  });
  /** Whether the lit day is a filled one (the selected day, or a range end). */
  private readonly litFilled = computed(() => {
    const active = this.hover.activeIndex();
    if (active === null) return false;
    const lit = this.gridStart() + active;
    if (this.mode() === 'single') return this.selectedDay() === lit;
    const range = this.range();
    return (
      (!!range?.from && dayNumber(range.from) === lit) ||
      (!!range?.to && !this.picking() && dayNumber(range.to) === lit)
    );
  });

  // The pick that commits a range end hands the gliding fill to the chosen
  // day, which must take it in the same frame: the last proposed end is the
  // day that was clicked (or entered) when picking stops on a range whose
  // ends include it; Escape restores another range.
  private readonly pickTrack = linkedSignal<
    { picking: boolean; previewEnd: number | null; range: DateRange | undefined },
    { picking: boolean; end: number | null; committed: number | null }
  >({
    source: () => ({ picking: this.picking(), previewEnd: this.preview().previewEnd, range: this.range() }),
    computation: (src, prev) => {
      const last = prev?.value ?? { picking: src.picking, end: src.picking ? src.previewEnd : null, committed: null };
      if (last.picking === src.picking && !(src.picking && last.end !== src.previewEnd)) return last;
      let committed = last.committed;
      if (last.picking && !src.picking && last.end !== null && src.range?.from && src.range.to) {
        const ends = [dayNumber(src.range.from), dayNumber(src.range.to)];
        if (ends.includes(last.end)) committed = last.end;
      }
      return { picking: src.picking, end: src.picking ? src.previewEnd : null, committed };
    },
  });
  private readonly committedEnd = computed(() => this.pickTrack().committed);

  // Keyboard focus ring: earned by navigation keys, or by focus arriving
  // with :focus-visible (Tab from outside). autoFocus is a script focus,
  // which Chrome marks focus-visible regardless, so the first focus after
  // mount only counts when the gate saw a keyboard trigger.
  private readonly gate = createKeyboardNavGate(signal(true));
  private autoFocusPending = false;
  private readonly focusedIndex = signal<number | null>(null);
  private inert = false;
  /** DayPicker's focused day (moves the roving tab stop) and the last one. */
  private readonly focusedDay = signal<number | null>(null);
  private readonly lastFocused = signal<number | null>(null);

  private readonly focusTarget = computed(() => {
    const disabled = this.matchers().disabled;
    const range = this.range();
    const selectedDay = this.selectedDay();
    const isSelected =
      this.mode() === 'single'
        ? (n: number) => n === selectedDay
        : (n: number) => !!range && rangeIncludesDate(range, fromDayNumber(n));
    return calculateFocusTarget({
      days: this.months().flatMap((m) => m.weeks.flatMap((w) => w.days)),
      isDisabled: (day) => this.isHiddenDate(day.date) || dateMatchModifiers(day.date, disabled),
      isSelected,
      today: this.todayN(),
      focused: this.focusedDay(),
      lastFocused: this.lastFocused(),
    });
  });

  private readonly focusRect = computed<ItemRect | null>(() => {
    const index = this.focusedIndex();
    if (!this.hover.isMeasured() || index === null) return null;
    return this.hover.itemRects()[index] ?? null;
  });
  private readonly ring = new Layer(() => this.ringAnchor()?.nativeElement, this.reducedMotion, 'calendar-focus-ring');

  // ── Classes ─────────────────────────────────────────────────
  protected readonly hostClass = computed(() =>
    cn('block rounded-[inherit] bg-inherit', this.fill() ? 'w-full' : 'w-fit'),
  );
  protected readonly rootClass = computed(() =>
    // bg-inherit passes the surface down to the stacked weekday row.
    cn('rdp-root bg-inherit', 'p-2', this.fill() && 'w-full', this.userClass()),
  );
  protected readonly monthsClass = computed(() =>
    cn(
      'relative isolate flex',
      // Stacked, the surface carries on to the sticky weekday row, which
      // must hide what scrolls under it.
      this.stacked() ? 'flex-col gap-4 bg-inherit' : 'flex-row flex-wrap gap-x-6 gap-y-4',
      this.fill() && 'w-full',
      'rdp-months',
    ),
  );
  protected readonly stripClass = computed(() =>
    this.stacked()
      ? // The box reaches 4px past the sides (so the mask never cuts a focus
        // ring), up through the gap to the weekday row and 24px past the
        // bottom for the fades, margins undone by padding. Only the months
        // take the pointer: the reach never covers what sits below.
        'pointer-events-none -mx-1 -mb-6 -mt-4 flex flex-col gap-4 px-1 pb-6 pt-4 [&>[data-slot=calendar-month]]:pointer-events-auto'
      : cn('-mx-2 -mb-2 flex flex-row gap-x-6 px-2 pb-2', this.fill() && 'min-w-0 flex-1'),
  );
  protected readonly stripStyle = computed(() => (this.stacked() ? stackedStripMask : sideStripMask));
  private readonly cellRadius = computed(() => (this.pill() ? 'rounded-full' : this.shape().bg));
  private readonly innerRingRadius = computed(() => (this.pill() ? 'before:rounded-full' : 'before:rounded-[7px]'));
  protected readonly highlightClass = computed(() =>
    cn(
      'z-[1]',
      this.cellRadius(),
      // Picking a range end, the highlight is the proposed end: the solid
      // fill glides to the pointer like the single-select highlight instead
      // of jumping from cell to cell. Its ring is the overlay's.
      this.previewGlides()
        ? 'bg-foreground'
        : cn(
            // Otherwise it's the hover fill, pressed like a ghost Button: a
            // surface 1px in with a same-color 1px spread at rest, the spread
            // collapsing on press so the fill shrinks 1px per side and steps
            // to the active token.
            'bg-transparent before:pointer-events-none before:absolute before:inset-px before:rounded-[inherit] before:bg-[var(--day-press)] before:transition-[box-shadow,background-color] before:[transition-duration:180ms,80ms] before:[transition-timing-function:cubic-bezier(0.23,1,0.32,1),ease]',
            this.pressed() && !this.litFilled()
              ? '[--day-press:var(--active)] before:shadow-[0_0_0_0px_var(--day-press)] before:[transition-duration:80ms,80ms]'
              : '[--day-press:var(--hover)] before:shadow-[0_0_0_1px_var(--day-press)]',
          ),
    ),
  );
  protected readonly innerRingClass = computed(() =>
    cn(
      'z-[3] bg-transparent',
      this.cellRadius(),
      'before:pointer-events-none before:absolute before:inset-px before:border before:border-background before:transition-opacity before:duration-80',
      this.innerRingRadius(),
      // The highlight sits under a filled start or end, so it brings an
      // inner ring on top (1px in, concentric radius) at 40%, gliding on the
      // same rect and spring, shown while the lit day is filled. The proposed
      // end is a lit filled day too, so the ring stays as it is when the
      // click commits it. Pressed, it goes solid.
      !(this.litFilled() || this.previewGlides())
        ? 'before:opacity-0'
        : this.pressed()
          ? 'before:opacity-100'
          : 'before:opacity-40',
    ),
  );
  /** Picking an end, a fresh hover session starts the solid end opaque under
   *  the range start, so it slides out of the first pick instead of fading in
   *  wherever the pointer lands. */
  protected readonly pickStart = computed<ItemRect | null>(() => {
    const from = this.range()?.from;
    if (!this.previewGlides() || !from || !this.hover.isMeasured()) return null;
    return this.hover.itemRects()[dayNumber(from) - this.gridStart()] ?? null;
  });
  protected readonly highlightTransition = computed(() => (this.snap() ? false : undefined));
  private readonly ringClass = computed(() =>
    cn(
      'pointer-events-none absolute left-0 top-0 z-[3] border border-[color:var(--focus-ring,#6B97FF)]',
      this.pill() ? 'rounded-full' : this.shape().focusRing,
    ),
  );
  protected readonly monthClass = computed(() => cn('flex flex-col', this.fill() && 'min-w-0 flex-1', 'rdp-month'));
  protected readonly captionClass = computed(() =>
    cn(
      'relative flex h-[var(--cell-size)] items-center gap-1',
      this.twoUp() ? 'justify-center' : 'justify-between pl-2',
      // With week numbers, the title belongs to the days: it starts at the
      // Monday column (centered over the 7 days, side by side).
      this.showWeekNumber() &&
        (this.twoUp() ? 'pl-[calc(var(--cell-size)*0.75)]' : 'pl-[calc(var(--cell-size)*0.75+0.5rem)]'),
      'mb-1',
      'rdp-month_caption',
    ),
  );
  protected readonly oneUpInnerClass = computed(() =>
    cn(
      'absolute inset-y-0 flex items-center',
      this.showWeekNumber() ? 'pl-[calc(var(--cell-size)*0.75+0.5rem)]' : 'pl-2',
    ),
  );
  private readonly captionTextBase = computed(() =>
    cn(
      'col-start-1 row-start-1 whitespace-nowrap text-foreground [text-box:trim-both_cap_alphabetic]',
      this.twoUp() ? 'justify-self-center' : 'justify-self-start',
      typeClass('body', this.compact() ? 'compact' : 'default'),
    ),
  );
  protected readonly weekdayClass = computed(() =>
    cn(
      WEEKDAY_BASE,
      this.fill() ? 'min-w-0 flex-1' : 'w-[var(--cell-size)]',
      typeClass('caption', this.compact() ? 'compact' : 'default'),
    ),
  );
  protected readonly weekNumberClass = computed(() =>
    cn(
      'flex w-[calc(var(--cell-size)*0.75)] shrink-0 items-center justify-center tabular-nums text-muted-foreground opacity-60',
      this.fill() ? 'max-h-[var(--cell-size)]' : 'h-[var(--cell-size)]',
      typeClass('caption', this.compact() ? 'compact' : 'default'),
      'rdp-week_number',
    ),
  );
  protected readonly semibold = fontWeights.semibold;
  protected readonly normalWeight = fontWeights.normal;
  protected readonly inertAttr = INERT_ATTR;

  /** Side by side, the weekday row travels with its days. Known before the
   *  stride is measured, so the row is there on the first paint. */
  protected readonly sideHeader = computed(() => !this.stacked());
  protected readonly sharedRows = computed(() =>
    this.twoUp() ? Math.max(...this.months().map((m) => m.weeks.length)) : null,
  );
  protected readonly weekdays = computed<WeekdayView[]>(() => {
    const locale = this.locale();
    const f = this.resolvedFormatters();
    const l = this.resolvedLabels();
    return this.months()[0].weeks[0].days.map((day) => ({
      key: day.isoDate,
      text: f.formatWeekdayName(day.date, locale),
      label: l.labelWeekday(day.date, locale),
    }));
  });
  protected readonly weekNumberHeaderLabel = computed(() => this.resolvedLabels().labelWeekNumberHeader(this.locale()));

  // Optional content under the number. Cached per day until `dayDetail`
  // changes: the grid recomputes on each pointer move while picking.
  private readonly detailCache = computed(() => {
    this.dayDetail();
    return new Map<number, unknown>();
  });

  /** Held down on a filled day, its ring goes solid; on an empty one, the
   *  hover fill presses like a ghost Button. */
  private readonly pressed = signal(false);

  /** The committed range a new pick replaced, fading out. Its id restarts
   *  the fade for each replacement. */
  private readonly committedRange = computed(() => {
    if (this.mode() !== 'range' || this.picking()) return null;
    const range = this.range();
    if (!range?.from || !range.to) return null;
    return { from: dayNumber(range.from), to: dayNumber(range.to) };
  });
  private readonly ghostTrack = linkedSignal<
    { from: number; to: number } | null,
    { last: { from: number; to: number } | null; ghost: { from: number; to: number; id: number } | null }
  >({
    source: this.committedRange,
    computation: (committed, prev) => {
      const last = prev?.value.last ?? null;
      const lastGhost = prev?.value.ghost ?? null;
      if (prev && committed?.from === last?.from && committed?.to === last?.to) return prev.value;
      return {
        last: committed,
        ghost: last && !committed ? { ...last, id: (lastGhost?.id ?? 0) + 1 } : lastGhost,
      };
    },
  });
  protected readonly ghost = computed(() => this.ghostTrack().ghost);

  /** The day-cell state every panel shares, resolved once per render. */
  private readonly dayState = computed<Omit<DayViewState, 'idPrefix'>>(() => {
    const { band, previewEnd } = this.preview();
    const matchers = this.matchers();
    return {
      locale: this.locale(),
      labels: this.resolvedLabels(),
      formatters: this.resolvedFormatters(),
      mode: this.mode(),
      range: this.range(),
      picking: this.picking(),
      selectedDay: this.selectedDay(),
      band,
      ghost: this.ghost(),
      previewEnd,
      committedEnd: this.committedEnd(),
      disabled: matchers.disabled,
      booked: matchers.modifiers.booked,
      today: this.todayN(),
      outsideHidden: this.outsideHidden(),
      isHidden: (date) => this.isHiddenDate(date),
      fill: this.fill(),
      pill: this.pill(),
      compact: this.compact(),
      focusTarget: this.focusTarget(),
      focusedDay: this.focusedDay(),
      gridStart: this.gridStart(),
      dayDetail: this.dayDetail(),
      detailCache: this.detailCache(),
    };
  });

  protected readonly views = computed(() => {
    const slots = this.slots();
    const months = this.months();
    const stride = this.stride();
    const state = this.dayState();
    const f = state.formatters;
    const locale = state.locale;
    return slots.map((slot) => ({
      index: slot.index,
      panels: slot.panels.map(
        (panel): PanelView => ({
          panel,
          weeks: buildWeekViews(panel.month, {
            ...state,
            idPrefix: `ff-calendar-${this.uid}-${slot.index}-${panel.key}`,
          }),
          shownElsewhere: !panel.present && stride !== null && months.some((m) => m.date.getTime() === panel.key),
          caption: f.formatCaption(panel.month.date, locale),
        }),
      ),
    }));
  });

  constructor() {
    // A month change ends the snap once the new days are measured.
    effect((onCleanup) => {
      if (!this.snap() || !this.hover.isMeasured()) return;
      const id = requestAnimationFrame(() => this.snap.set(false));
      onCleanup(() => cancelAnimationFrame(id));
    });

    // The cell's usual color fades come back after the moment has passed.
    effect((onCleanup) => {
      if (this.committedEnd() === null) return;
      const id = setTimeout(
        () => this.pickTrack.update((v) => ({ ...v, committed: null })),
        exitFallbackMs(spring.moderate),
      );
      onCleanup(() => clearTimeout(id));
    });

    // A ghost leaves once the moderate exit has had its time, whatever the
    // animation did.
    effect((onCleanup) => {
      if (!this.ghost()) return;
      const id = setTimeout(() => this.ghostTrack.update((v) => ({ ...v, ghost: null })), exitFallbackMs(spring.moderate));
      onCleanup(() => clearTimeout(id));
    });

    // The press reads before the click commits. The window listener catches
    // a release outside the grid.
    effect((onCleanup) => {
      if (!this.pressed()) return;
      const release = () => this.pressed.set(false);
      window.addEventListener('mouseup', release);
      onCleanup(() => window.removeEventListener('mouseup', release));
    });

    // Filling their container, the day columns outgrow the cell size, so the
    // chevrons (one column each) read the measured column instead. Read off a
    // live cell each time: a month change swaps the cells out.
    afterRenderEffect((onCleanup) => {
      const container = this.monthsEl()?.nativeElement;
      if (!container) return;
      // Week numbers and the month layout change the columns, not the box.
      this.showWeekNumber();
      this.numberOfMonths();
      this.orientation();
      if (!this.fill()) {
        container.style.setProperty('--calendar-col', 'var(--cell-size)');
        return;
      }
      const measure = () => {
        const cell = container.querySelector<HTMLElement>('[role="gridcell"]');
        if (!cell) return;
        // Fractional (offsetWidth rounds, which drifts across columns), in
        // layout pixels: the container's own ratio undoes a scaled ancestor.
        const box = container.getBoundingClientRect().width;
        const scale = box ? container.offsetWidth / box : 1;
        container.style.setProperty('--calendar-col', `${cell.getBoundingClientRect().width * scale}px`);
      };
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(measure);
      ro.observe(container);
      onCleanup(() => ro.disconnect());
    });

    // Side by side, a month change moves every grid by one month width plus
    // the gap; stacked, by the distance between the two month slots.
    afterRenderEffect((onCleanup) => {
      const container = this.monthsEl()?.nativeElement;
      const sideways = this.sideways();
      const stacked = this.stacked();
      this.numberOfMonths();
      if (!container) {
        this.stride.set(null);
        return;
      }
      const months = container.querySelectorAll<HTMLElement>('[data-slot="calendar-month"]');
      const [first, second] = [months[0], months[1]];
      if (!first || (stacked && !second)) return;
      const measure = () =>
        this.stride.set(sideways ? first.offsetWidth + MONTH_GAP : second.offsetTop - first.offsetTop);
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(measure);
      ro.observe(first);
      if (second) ro.observe(second);
      onCleanup(() => ro.disconnect());
    });

    // "auto" orientation: one comparison per container resize.
    afterRenderEffect((onCleanup) => {
      if (this.orientation() !== 'auto' || !this.twoMonths()) return;
      const needed = this.neededWidth();
      const parent = this.host.parentElement;
      if (!parent || typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => {
        const cs = getComputedStyle(parent);
        const width = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        this.fits.set(width >= needed);
      });
      ro.observe(parent);
      onCleanup(() => ro.disconnect());
    });

    // The weekday row sticks while stacked months scroll, so the strip's clip
    // follows its bottom edge: a month sliding up leaves there.
    afterRenderEffect((onCleanup) => {
      const row = this.weekdayRowEl()?.nativeElement;
      const strip = this.stripEl()?.nativeElement;
      if (!this.stacked() || !row || !strip) return;
      let frame = 0;
      const measure = () => {
        frame = 0;
        const top = row.getBoundingClientRect().bottom - strip.getBoundingClientRect().top;
        strip.style.setProperty('--strip-clip-top', `${top}px`);
      };
      const update = () => {
        if (!frame) frame = requestAnimationFrame(measure);
      };
      measure();
      window.addEventListener('scroll', update, { capture: true, passive: true });
      window.addEventListener('resize', update);
      onCleanup(() => {
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', update, { capture: true });
        window.removeEventListener('resize', update);
      });
    });

    // The keyboard focus ring, on the focused day's measured rect.
    afterRenderEffect(() => {
      const rect = this.focusRect();
      const className = this.ringClass();
      const instant = this.snap() || this.reducedMotion();
      untracked(() => {
        if (!rect) {
          this.ring.hide({ keyframes: { opacity: 0 }, transition: exitTransition(spring.fast) });
          return;
        }
        const frame = { x: rect.left - 2, y: rect.top - 2, width: rect.width + 4, height: rect.height + 4 };
        const positional = instant ? { duration: 0 } : enterTransition(spring.fast);
        this.ring.show(className, { opacity: 1, ...frame }, { ...positional, opacity: { duration: 0.08 } } as never, {
          opacity: 0,
          ...frame,
        });
      });
    });

    afterNextRender(() => {
      this.autoFocusPending = this.autoFocus();
      if (this.autoFocus()) this.autoFocusDay();
    });

    inject(DestroyRef).onDestroy(() => this.ring.destroy());
  }

  // ── View building ───────────────────────────────────────────

  private isHiddenDate(date: Date): boolean {
    const start = this.startMonth();
    const end = this.endMonth();
    const n = dayNumber(date);
    return (!!start && n < dayNumber(startOfMonth(start))) || (!!end && n > dayNumber(endOfMonth(end)));
  }

  // ── Template helpers ────────────────────────────────────────

  protected captionTextClass(view: PanelView) {
    return cn(this.captionTextBase(), view.shownElsewhere && 'invisible');
  }

  protected panelClass(view: PanelView) {
    return cn(
      'col-start-1 row-start-1 flex flex-col self-start',
      !view.panel.present && 'pointer-events-none',
      view.shownElsewhere && 'invisible',
      'rdp-weeks',
    );
  }

  protected gridLabel(month: CalendarMonth) {
    return this.resolvedLabels().labelGrid(month.date, this.locale());
  }

  /** Single month and stacked months: both chevrons right of the first
   *  caption. Side by side: previous at the far left, next at the far right. */
  protected navStart(index: number): CalendarNavDirection[] {
    return !this.navHidden() && this.twoUp() && index === 0 ? ['previous'] : [];
  }

  protected navEnd(index: number): CalendarNavDirection[] {
    if (this.navHidden() || this.stacked()) return [];
    if (this.twoUp()) return index === this.numberOfMonths() - 1 ? ['next'] : [];
    return index === 0 ? ['previous', 'next'] : [];
  }

  protected oneUp() {
    return this.numberOfMonths() === 1 && this.stride() !== null;
  }

  protected twoUpLayerStyle(index: number) {
    const stride = this.stride() ?? 0;
    const first = index === 0;
    const last = index === this.numberOfMonths() - 1;
    const mask = captionFade(first ? 'right' : 'left', this.showWeekNumber());
    return { left: `${first ? 0 : -stride}px`, right: `${last ? 0 : -stride}px`, maskImage: mask, webkitMaskImage: mask };
  }

  protected twoUpInnerStyle(index: number) {
    const stride = this.stride() ?? 0;
    const first = index === 0;
    const last = index === this.numberOfMonths() - 1;
    return { left: `${first ? 0 : stride}px`, right: `${last ? 0 : stride}px` };
  }

  protected oneUpLayerStyle() {
    const stride = this.stride() ?? 0;
    const mask = oneUpCaptionFade(stride, this.navHidden());
    return { left: `${-stride}px`, right: `${-stride}px`, maskImage: mask, webkitMaskImage: mask };
  }

  protected oneUpInnerStyle() {
    const stride = this.stride() ?? 0;
    return { left: `${stride}px`, right: `${stride}px` };
  }

  protected sharedRowsStyle() {
    return `calc(var(--cell-size) * ${this.sharedRows()})`;
  }

  protected onPanelExited(slotIndex: number, key: number) {
    this.slots.update((slots) =>
      slots.map((slot) =>
        slot.index === slotIndex ? { ...slot, panels: slot.panels.filter((p) => p.key !== key || p.present) } : slot,
      ),
    );
  }

  // ── Navigation (CalendarContext) ────────────────────────────

  navLabel(direction: CalendarNavDirection): string {
    const l = this.resolvedLabels();
    return direction === 'previous'
      ? l.labelPrevious(this.previousMonth(), this.locale())
      : l.labelNext(this.nextMonth(), this.locale());
  }

  navigate(direction: CalendarNavDirection): void {
    const target = direction === 'previous' ? this.previousMonth() : this.nextMonth();
    if (!target) return;
    this.goToMonth(target);
    if (direction === 'previous') this.prevClick.emit(target);
    else this.nextClick.emit(target);
  }

  /** Shows `date`'s month first (clamped to the start and end months). */
  goToMonth(date: Date): void {
    if (this.disableNavigation()) return;
    const next = this.clampMonth(date);
    if (next.getTime() === this.firstMonth().getTime()) return;
    this.month.set(next);
  }

  /** Brings a day on screen: earlier months become the first slot, later
   *  ones the last, so a keyboard move pages by one month. */
  private goToDay(date: Date) {
    const first = this.firstMonth();
    const offset = monthsBetween(first, date);
    const count = this.numberOfMonths();
    if (offset >= 0 && offset < count) return;
    this.goToMonth(offset < 0 ? date : addMonths(startOfMonth(date), -(count - 1)));
  }

  // ── Events ──────────────────────────────────────────────────

  protected onRootKeyDown(e: KeyboardEvent) {
    // Escape before the second pick puts the previous range back.
    if (e.key === 'Escape' && this.picking()) {
      e.stopPropagation();
      this.commit(this.beforePick);
    }
  }

  protected onMonthsKeyDown(e: KeyboardEvent) {
    if (POPUP_NAV_KEYS.includes(e.key)) this.gate.trackKeyboardNav(e);
  }

  protected onMonthsMouseDown(e: MouseEvent) {
    this.gate.keyboardNav.current = false;
    this.focusedIndex.set(null);
    if (e.button === 0) this.pressed.set(true);
  }

  protected onMonthsMouseUp() {
    this.pressed.set(false);
  }

  protected onMonthsMouseEnter() {
    this.inert = false;
    this.hover.onMouseEnter();
  }

  protected onMonthsMouseMove(e: MouseEvent) {
    if (this.focusedIndex() !== null) this.focusedIndex.set(null);
    if (this.snap()) this.snap.set(false);
    const target = e.target as Element;
    if (target.closest?.(`[${INERT_ATTR}]`)) {
      if (!this.inert) {
        this.inert = true;
        this.hover.onMouseLeave();
      }
      return;
    }
    if (this.inert) {
      this.inert = false;
      this.hover.onMouseEnter();
    }
    this.hover.onMouseMove(e);
  }

  protected onMonthsFocusIn(e: FocusEvent) {
    const target = e.target as HTMLElement;
    const el = target.closest?.(`[${INDEX_ATTR}]`);
    if (!el) return;
    const idx = Number(el.getAttribute(INDEX_ATTR));
    this.hover.setActiveIndex(idx);
    const fromScript = this.autoFocusPending;
    this.autoFocusPending = false;
    const ring = this.gate.keyboardNav.current || (!fromScript && isFocusVisible(target));
    this.focusedIndex.set(ring ? idx : null);
  }

  protected onMonthsFocusOut(e: FocusEvent) {
    const current = e.currentTarget as HTMLElement;
    if (current.contains(e.relatedTarget as Node | null)) return;
    this.focusedIndex.set(null);
    this.hover.setActiveIndex(null);
  }

  protected onDayFocus(view: CalendarDayView) {
    this.focusedDay.set(view.day.n);
    this.lastFocused.set(view.day.n);
  }

  protected onDayBlur() {
    this.focusedDay.set(null);
  }

  protected onDayClick(e: MouseEvent, view: CalendarDayView) {
    e.preventDefault();
    e.stopPropagation();
    this.focusedDay.set(view.day.n);
    this.lastFocused.set(view.day.n);
    if (view.disabled) return;
    this.pick(view.day.date);
  }

  protected onDayKeyDown(e: KeyboardEvent, view: CalendarDayView) {
    // Set before focus moves: the ring is the keyboard's.
    if (POPUP_NAV_KEYS.includes(e.key)) this.gate.trackKeyboardNav(e);
    const move = keyToMove(e.key, e.shiftKey, this.rtl());
    if (!move) return;
    e.preventDefault();
    e.stopPropagation();
    const disabled = this.matchers().disabled;
    const options = this.gridOptions();
    const target = nextFocusDate(view.day.date, move[0], move[1], {
      weekStartsOn: options.weekStartsOn,
      ISOWeek: options.ISOWeek,
      isUnfocusable: (date) => this.isHiddenDate(date) || dateMatchModifiers(date, disabled),
      startMonth: this.startMonth(),
      endMonth: this.endMonth(),
    });
    if (!target) return;
    this.goToDay(target);
    const n = dayNumber(target);
    this.focusedDay.set(n);
    this.lastFocused.set(n);
    this.focusDay(n);
  }

  // ── Selection ───────────────────────────────────────────────

  private pick(date: Date) {
    if (this.mode() === 'single') {
      const current = this.selected();
      const next =
        !this.required() && current instanceof Date && isSameDay(current, date) ? undefined : date;
      this.commit(next);
      return;
    }
    const range = this.range();
    let next = addToRange(date, range, { min: this.min(), max: this.max(), required: this.required() });
    const disabled = this.matchers().disabled;
    // A range never spans a booked or unavailable day: the pick starts over.
    if (next?.from && next.to && disabled.length > 0 && rangeContainsModifiers({ from: next.from, to: next.to }, disabled)) {
      next = { from: date, to: undefined };
    }
    if (next?.from && !next.to && !this.picking()) this.beforePick = range;
    this.commit(next);
  }

  private commit(next: CalendarValue) {
    this.selected.set(next);
    this.select.emit(next);
  }

  // ── Focus ───────────────────────────────────────────────────

  private findDayButton(n: number): HTMLButtonElement | null {
    const root = this.monthsEl()?.nativeElement;
    if (!root) return null;
    // By date, not by hover index: right after a month change the DOM still
    // holds the previous grid, whose indices count from another start.
    const selector = `[data-day="${isoDate(fromDayNumber(n))}"]:not([data-outside]) > button`;
    for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>(selector))) {
      if (!button.closest('[aria-hidden="true"]')) return button;
    }
    return null;
  }

  /**
   * DayPicker's autoFocus. The first render also measures the month stride,
   * and two months side by side then re-wrap their weeks, dropping the day
   * just focused (React measures before DayPicker's autofocus effect runs):
   * the render that follows focuses it again, still as a script focus.
   */
  private autoFocusDay() {
    const target = this.focusTarget();
    if (target === null) return;
    const button = this.findDayButton(target);
    button?.focus();
    afterNextRender(
      () => {
        const active = this.host.ownerDocument.activeElement;
        if (!button || button.isConnected || (active && active !== this.host.ownerDocument.body)) return;
        this.autoFocusPending = true;
        this.findDayButton(target)?.focus();
      },
      { injector: this.injector },
    );
  }

  /** Moves focus to a day's button, after the render that shows it. */
  private focusDay(n: number) {
    const now = this.findDayButton(n);
    if (now) {
      now.focus();
      return;
    }
    afterNextRender(() => this.findDayButton(n)?.focus(), { injector: this.injector });
  }

  /** Focuses the grid's tab stop (the selected day, today, or the first open day). */
  focus(): void {
    const target = this.focusTarget();
    if (target !== null) this.focusDay(target);
  }
}
