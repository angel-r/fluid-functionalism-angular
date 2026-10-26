// ---------------------------------------------------------------------------
// The calendar's month model, framework-free. The React calendar sits on
// DayPicker, which owns the date math, the matchers, the selection rules and
// the keyboard moves; this file is that part of DayPicker, rebuilt on plain
// `Date` objects (local calendar dates, never time of day) so the Angular
// component can render the same DOM and behave the same way.
// ---------------------------------------------------------------------------

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** `{ from, to }`. While a range is being picked, `to` is undefined. */
export interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

export interface DateBefore {
  before: Date;
}
export interface DateAfter {
  after: Date;
}
/** Both bounds: the days between them (exclusive) when `after` < `before`,
 *  the days outside them otherwise. */
export interface DateInterval {
  before: Date;
  after: Date;
}
export interface DayOfWeek {
  dayOfWeek: number | number[];
}

/** DayPicker's matcher: which days a rule applies to. */
export type Matcher =
  | boolean
  | ((date: Date) => boolean)
  | Date
  | Date[]
  | DateRange
  | DateBefore
  | DateAfter
  | DateInterval
  | DayOfWeek;

const DAY_MS = 86_400_000;

/** Days since the epoch for a local calendar date. Comparing these instead
 *  of Date objects keeps every range check free of time-of-day and DST. */
export function dayNumber(date: Date): number {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

/** The local date of a day number. */
export function fromDayNumber(n: number): Date {
  const utc = new Date(n * DAY_MS);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Months later, clamped to the last day of the target month (Jan 31 + 1 →
 *  Feb 28), like date-fns `addMonths`. */
export function addMonths(date: Date, months: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), last));
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function isSameDay(a: Date | undefined, b: Date | undefined): boolean {
  return !!a && !!b && dayNumber(a) === dayNumber(b);
}

/** Whole months from `a` to `b` (b − a), ignoring days. */
export function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

export function startOfWeek(date: Date, weekStartsOn: WeekStartsOn): Date {
  const diff = (date.getDay() - weekStartsOn + 7) % 7;
  return addDays(date, -diff);
}

export function endOfWeek(date: Date, weekStartsOn: WeekStartsOn): Date {
  return addDays(startOfWeek(date, weekStartsOn), 6);
}

/** ISO 8601 week number: weeks start on Monday and week 1 holds the year's
 *  first Thursday. */
export function isoWeek(date: Date): number {
  const thursday = addDays(date, 3 - ((date.getDay() + 6) % 7));
  const jan1 = new Date(thursday.getFullYear(), 0, 1);
  return Math.floor((dayNumber(thursday) - dayNumber(jan1)) / 7) + 1;
}

/** Locale week number (date-fns `getWeek`): week 1 is the week holding
 *  January `firstWeekContainsDate`. */
export function localeWeek(date: Date, weekStartsOn: WeekStartsOn, firstWeekContainsDate = 1): number {
  const startOfWeekYear = (year: number) =>
    startOfWeek(new Date(year, 0, firstWeekContainsDate), weekStartsOn);
  const year = date.getFullYear();
  let start = startOfWeekYear(year + 1);
  if (dayNumber(date) < dayNumber(start)) start = startOfWeekYear(year);
  if (dayNumber(date) < dayNumber(start)) start = startOfWeekYear(year - 1);
  return Math.floor((dayNumber(startOfWeek(date, weekStartsOn)) - dayNumber(start)) / 7) + 1;
}

export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ---------------------------------------------------------------------------
// Matchers
// ---------------------------------------------------------------------------

const isObject = (m: unknown): m is Record<string, unknown> =>
  typeof m === 'object' && m !== null && !(m instanceof Date) && !Array.isArray(m);

function matchOne(date: Date, matcher: Matcher): boolean {
  if (typeof matcher === 'boolean') return matcher;
  if (typeof matcher === 'function') return matcher(date);
  if (matcher instanceof Date) return isSameDay(date, matcher);
  if (Array.isArray(matcher)) return matcher.some((m) => isSameDay(date, m));
  if (!isObject(matcher)) return false;
  const n = dayNumber(date);
  if ('dayOfWeek' in matcher) {
    const days = (matcher as DayOfWeek).dayOfWeek;
    return (Array.isArray(days) ? days : [days]).includes(date.getDay());
  }
  if ('from' in matcher || 'to' in matcher) return rangeIncludesDate(matcher as DateRange, date);
  const before = (matcher as Partial<DateInterval>).before;
  const after = (matcher as Partial<DateInterval>).after;
  if (before && after) {
    const isBefore = dayNumber(before) - n > 0;
    const isAfter = n - dayNumber(after) > 0;
    // A closed interval holds the days between; an open one, the days outside.
    return dayNumber(before) > dayNumber(after) ? isBefore && isAfter : isBefore || isAfter;
  }
  if (before) return dayNumber(before) - n > 0;
  if (after) return n - dayNumber(after) > 0;
  return false;
}

/** Whether a range (ends included, either order) holds the day. */
export function rangeIncludesDate(range: DateRange, date: Date): boolean {
  const { from, to } = range;
  const n = dayNumber(date);
  if (from && to) {
    const [a, b] = [dayNumber(from), dayNumber(to)].sort((x, y) => x - y);
    return n >= a && n <= b;
  }
  if (to) return n === dayNumber(to);
  if (from) return n === dayNumber(from);
  return false;
}

/** Whether the day matches the matcher, or any of a list of them. A
 *  Matcher[] and a Date[] both read as "any of these". */
export function dateMatchModifiers(date: Date, matchers: Matcher | Matcher[] | undefined): boolean {
  if (matchers === undefined) return false;
  const list = Array.isArray(matchers) ? (matchers as Matcher[]) : [matchers];
  return list.some((m) => (m instanceof Date ? isSameDay(date, m) : matchOne(date, m)));
}

/** Whether any day of the range (ends included) matches. */
export function rangeContainsModifiers(range: { from: Date; to: Date }, matchers: Matcher | Matcher[]): boolean {
  const a = Math.min(dayNumber(range.from), dayNumber(range.to));
  const b = Math.max(dayNumber(range.from), dayNumber(range.to));
  for (let n = a; n <= b; n++) {
    if (dateMatchModifiers(fromDayNumber(n), matchers)) return true;
  }
  return false;
}

/**
 * The three day matchers, mapped onto what the grid understands. `booked`
 * and every day outside `available` join `disabled`, so none of them can be
 * picked or focused; `booked` also stays a modifier of its own for the
 * line-through and the accessible label.
 */
export function resolveDayMatchers({
  booked,
  available,
  disabled,
}: {
  booked?: Matcher | Matcher[];
  available?: Matcher | Matcher[];
  disabled?: Matcher | Matcher[];
}) {
  const flat = (m: Matcher | Matcher[] | undefined): Matcher[] =>
    m === undefined ? [] : Array.isArray(m) ? (m as Matcher[]) : [m];
  const outside: Matcher[] =
    available === undefined ? [] : [(date: Date) => !dateMatchModifiers(date, available)];
  const unavailable = [...flat(disabled), ...outside];
  const list = [...flat(booked), ...unavailable];
  return {
    disabled: list,
    modifiers: {
      booked: (booked ?? false) as Matcher | Matcher[],
      unavailable: (unavailable.length > 0 ? unavailable : false) as Matcher | Matcher[],
    },
  };
}

/** ISO 8601 week numbers by default: they need a Monday start, so the
 *  Monday start comes with them unless the caller picked a Sunday week, in
 *  which case the locale's own numbering applies. */
export function resolveWeekNumbering(
  showWeekNumber: boolean | undefined,
  weekStartsOn: WeekStartsOn | undefined,
  ISOWeek: boolean | undefined,
): boolean {
  if (ISOWeek !== undefined) return ISOWeek;
  if (!showWeekNumber) return false;
  return weekStartsOn === undefined || weekStartsOn === 1;
}

// ---------------------------------------------------------------------------
// Month grid
// ---------------------------------------------------------------------------

export interface CalendarDay {
  date: Date;
  /** Days since the epoch: the day's identity. */
  n: number;
  /** `yyyy-MM-dd`, DayPicker's `data-day`. */
  isoDate: string;
  /** The month whose grid shows the day. */
  displayMonth: Date;
  /** A day of the neighbouring month. */
  outside: boolean;
}

export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDay[];
}

export interface CalendarMonth {
  date: Date;
  weeks: CalendarWeek[];
}

export interface MonthGridOptions {
  weekStartsOn: WeekStartsOn;
  /** Monday weeks with ISO 8601 numbers. */
  ISOWeek: boolean;
  /** Always 6 rows. */
  fixedWeeks: boolean;
  /** Locale numbering: the January date week 1 holds. */
  firstWeekContainsDate: number;
}

/** One month's whole weeks, from the start of the week holding the 1st to
 *  the end of the week holding the last day. */
export function buildMonth(month: Date, options: MonthGridOptions): CalendarMonth {
  const date = startOfMonth(month);
  const weekStart: WeekStartsOn = options.ISOWeek ? 1 : options.weekStartsOn;
  const first = startOfWeek(date, weekStart);
  const last = endOfWeek(endOfMonth(date), weekStart);
  let count = (dayNumber(last) - dayNumber(first) + 1) / 7;
  if (options.fixedWeeks) count = Math.max(count, 6);
  const weeks: CalendarWeek[] = [];
  for (let w = 0; w < count; w++) {
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(first, w * 7 + i);
      days.push({
        date: day,
        n: dayNumber(day),
        isoDate: isoDate(day),
        displayMonth: date,
        outside: day.getMonth() !== date.getMonth() || day.getFullYear() !== date.getFullYear(),
      });
    }
    const weekNumber = options.ISOWeek
      ? isoWeek(days[0].date)
      : localeWeek(days[0].date, weekStart, options.firstWeekContainsDate);
    weeks.push({ weekNumber, days });
  }
  return { date, weeks };
}

export function buildMonths(first: Date, count: number, options: MonthGridOptions): CalendarMonth[] {
  return Array.from({ length: count }, (_, i) => buildMonth(addMonths(startOfMonth(first), i), options));
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface RangeRules {
  /** Fewest nights a range may span. */
  min?: number;
  /** Most nights a range may span. */
  max?: number;
  required?: boolean;
}

/**
 * DayPicker's range rule with `resetOnSelect`: the first pick sets only the
 * start, the second sets the end (either side of the start), and a pick
 * after a complete range starts a new one. A range that breaks `min` or
 * `max` starts over from the picked day.
 */
export function addToRange(date: Date, range: DateRange | undefined, rules: RangeRules = {}): DateRange | undefined {
  const { min = 0, max = 0, required = false } = rules;
  const { from, to } = range ?? { from: undefined, to: undefined };
  let next: DateRange | undefined;
  if (!from || to) {
    next = { from: date, to: undefined };
  } else if (isSameDay(from, date)) {
    next = min === 0 ? { from, to: date } : required ? { from, to: undefined } : undefined;
  } else if (dayNumber(date) < dayNumber(from)) {
    next = { from: date, to: from };
  } else {
    next = { from, to: date };
  }
  if (next?.from && next.to) {
    const nights = dayNumber(next.to) - dayNumber(next.from);
    if ((max > 0 && nights > max) || (min > 1 && nights < min)) next = { from: date, to: undefined };
  }
  return next;
}

// ---------------------------------------------------------------------------
// Keyboard focus
// ---------------------------------------------------------------------------

export type FocusMove = 'day' | 'week' | 'month' | 'year' | 'startOfWeek' | 'endOfWeek';
export type FocusDirection = 'before' | 'after';

/** DayPicker's grid keys: arrows by day and week (Shift: month and year),
 *  PageUp/PageDown by month (Shift: year), Home/End to the week's ends. */
export function keyToMove(key: string, shiftKey: boolean, rtl: boolean): [FocusMove, FocusDirection] | null {
  switch (key) {
    case 'ArrowLeft':
      return [shiftKey ? 'month' : 'day', rtl ? 'after' : 'before'];
    case 'ArrowRight':
      return [shiftKey ? 'month' : 'day', rtl ? 'before' : 'after'];
    case 'ArrowDown':
      return [shiftKey ? 'year' : 'week', 'after'];
    case 'ArrowUp':
      return [shiftKey ? 'year' : 'week', 'before'];
    case 'PageUp':
      return [shiftKey ? 'year' : 'month', 'before'];
    case 'PageDown':
      return [shiftKey ? 'year' : 'month', 'after'];
    case 'Home':
      return ['startOfWeek', 'before'];
    case 'End':
      return ['endOfWeek', 'after'];
    default:
      return null;
  }
}

export interface FocusMoveOptions {
  weekStartsOn: WeekStartsOn;
  ISOWeek: boolean;
  /** Days focus skips over (disabled, hidden). */
  isUnfocusable: (date: Date) => boolean;
  startMonth?: Date;
  endMonth?: Date;
}

function moveDate(date: Date, by: FocusMove, dir: FocusDirection, options: FocusMoveOptions): Date {
  const sign = dir === 'after' ? 1 : -1;
  const weekStart: WeekStartsOn = options.ISOWeek ? 1 : options.weekStartsOn;
  switch (by) {
    case 'day':
      return addDays(date, sign);
    case 'week':
      return addDays(date, sign * 7);
    case 'month':
      return addMonths(date, sign);
    case 'year':
      return addMonths(date, sign * 12);
    case 'startOfWeek':
      return startOfWeek(date, weekStart);
    case 'endOfWeek':
      return endOfWeek(date, weekStart);
  }
}

/** The day focus lands on: the move, clamped to the start and end months,
 *  repeated past unfocusable days (up to a year of attempts). */
export function nextFocusDate(
  from: Date,
  by: FocusMove,
  dir: FocusDirection,
  options: FocusMoveOptions,
): Date | undefined {
  let ref = from;
  for (let attempt = 0; attempt <= 365; attempt++) {
    let next = moveDate(ref, by, dir, options);
    if (dir === 'before' && options.startMonth && dayNumber(next) < dayNumber(startOfMonth(options.startMonth))) {
      next = startOfMonth(options.startMonth);
    } else if (dir === 'after' && options.endMonth && dayNumber(next) > dayNumber(endOfMonth(options.endMonth))) {
      next = endOfMonth(options.endMonth);
    }
    if (!options.isUnfocusable(next)) return next;
    ref = next;
  }
  return undefined;
}

/**
 * The day that holds the grid's tab stop: the focused day, else the last
 * focused one, else the first selected, else today, else the first open day.
 * Outside, hidden and disabled days never hold it.
 */
export function calculateFocusTarget({
  days,
  isDisabled,
  isSelected,
  today,
  focused,
  lastFocused,
}: {
  days: readonly CalendarDay[];
  isDisabled: (day: CalendarDay) => boolean;
  isSelected: (n: number) => boolean;
  today: number | null;
  focused: number | null;
  lastFocused: number | null;
}): number | null {
  let target: number | null = null;
  let priority = -1;
  let firstOpen: number | null = null;
  for (const day of days) {
    if (day.outside || isDisabled(day)) continue;
    firstOpen ??= day.n;
    if (day.n === focused && priority < 3) {
      target = day.n;
      priority = 3;
    } else if (day.n === lastFocused && priority < 2) {
      target = day.n;
      priority = 2;
    } else if (isSelected(day.n) && priority < 1) {
      target = day.n;
      priority = 1;
    } else if (day.n === today && priority < 0) {
      target = day.n;
      priority = 0;
    }
  }
  return target ?? firstOpen;
}
