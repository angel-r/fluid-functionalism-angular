import type { DateRange, Matcher } from './calendar-dates';

// ---------------------------------------------------------------------------
// Time zones at the calendar's boundary. Inside, the calendar works on
// calendar days carried by local-midnight `Date`s (see calendar-dates.ts).
// With a `timeZone`, the dates that come in are instants read in that zone,
// and the dates that go out are the instant each day starts there, so the
// picked day never depends on the browser's own zone. Without one, every
// helper here returns its input untouched. Built on Intl alone, so it brings
// no time-zone library and no tz database of its own.
// ---------------------------------------------------------------------------

interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formats = new Map<string, Intl.DateTimeFormat>();

function wallFormat(timeZone: string): Intl.DateTimeFormat {
  let format = formats.get(timeZone);
  if (!format) {
    // Throws a RangeError naming the zone when it is not a valid IANA name.
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      era: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formats.set(timeZone, format);
  }
  return format;
}

/** The wall clock in the zone at an instant (whole seconds). */
function wallTime(instant: number, timeZone: string): WallTime {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of wallFormat(timeZone).formatToParts(instant)) parts[part.type] = part.value;
  const year = Number(parts.year);
  return {
    // Years before 1 AD come back as "BC" years: 1 BC is year 0.
    year: parts.era === 'BC' || parts.era === 'B' ? 1 - year : year,
    month: Number(parts.month) - 1,
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** A wall time read as if it were UTC, in milliseconds. */
function wallAsUtc(w: WallTime): number {
  const date = new Date(0);
  date.setUTCFullYear(w.year, w.month, w.day);
  date.setUTCHours(w.hour, w.minute, w.second, 0);
  return date.getTime();
}

/** The zone's offset from UTC at an instant, in milliseconds. */
function offsetAt(instant: number, timeZone: string): number {
  const whole = Math.floor(instant / 1000) * 1000;
  return wallAsUtc(wallTime(whole, timeZone)) - whole;
}

/** The calendar day an instant falls on in `timeZone`, as the calendar's own
 *  local-midnight date. Without a zone, the date as given. */
export function dayInTimeZone(date: Date, timeZone: string | undefined): Date {
  if (!timeZone) return date;
  const w = wallTime(date.getTime(), timeZone);
  const day = new Date(0);
  day.setFullYear(w.year, w.month, w.day);
  day.setHours(0, 0, 0, 0);
  return day;
}

/**
 * The instant `day`'s calendar date starts in `timeZone`: 00:00 there, or the
 * first moment the day has when the clocks skip midnight. `minutes` places a
 * wall-clock time on that date instead. Without a zone, the date as given.
 */
export function startOfDayInTimeZone(day: Date, timeZone: string | undefined, minutes = 0): Date {
  if (!timeZone) return day;
  const target = wallAsUtc({
    year: day.getFullYear(),
    month: day.getMonth(),
    day: day.getDate(),
    hour: 0,
    minute: minutes,
    second: 0,
  });
  // Two passes settle the offset across a transition; of the candidates
  // still on the target date, the earliest is the day's first moment.
  const first = target - offsetAt(target, timeZone);
  const second = target - offsetAt(first, timeZone);
  const date = new Date(target).getUTCDate();
  const onDate = [first, second].filter((t) => wallTime(t, timeZone).day === date);
  return new Date(onDate.length > 0 ? Math.min(...onDate) : first);
}

/** The ISO 8601 offset of `timeZone` at an instant: `Z`, `+02:00`, `-11:00`. */
export function timeZoneOffset(instant: Date, timeZone: string): string {
  const minutes = Math.round(offsetAt(instant.getTime(), timeZone) / 60_000);
  if (minutes === 0) return 'Z';
  const pad = (n: number) => String(n).padStart(2, '0');
  const abs = Math.abs(minutes);
  return `${minutes < 0 ? '-' : '+'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Minutes past midnight on the wall clock: in `timeZone`, else local. */
export function minutesInTimeZone(date: Date, timeZone: string | undefined): number {
  if (!timeZone) return date.getHours() * 60 + date.getMinutes();
  const w = wallTime(date.getTime(), timeZone);
  return w.hour * 60 + w.minute;
}

/** A date or a range, each end mapped. */
export function mapDateValue<T extends Date | DateRange | undefined>(value: T, map: (date: Date) => Date): T {
  if (value instanceof Date) return map(value) as T;
  if (!value) return value;
  const range = value as DateRange;
  return { from: range.from && map(range.from), to: range.to && map(range.to) } as T;
}

/**
 * Day matchers read in `timeZone`: every date in them becomes the day it
 * falls on there, and a predicate is handed the instant each day starts
 * there, the same date the calendar emits. Without a zone, as given.
 */
export function matchersInTimeZone(
  matchers: Matcher | Matcher[] | undefined,
  timeZone: string | undefined,
): Matcher | Matcher[] | undefined {
  if (!timeZone || matchers === undefined) return matchers;
  const day = (date: Date) => dayInTimeZone(date, timeZone);
  const one = (m: Matcher): Matcher => {
    if (typeof m === 'boolean') return m;
    if (typeof m === 'function') return (date: Date) => m(startOfDayInTimeZone(date, timeZone));
    if (m instanceof Date) return day(m);
    if (Array.isArray(m)) return m.map(day);
    if ('dayOfWeek' in m) return m;
    if ('from' in m || 'to' in m) return mapDateValue(m as DateRange, day);
    const bounds = m as { before?: Date; after?: Date };
    return {
      ...(bounds.before ? { before: day(bounds.before) } : {}),
      ...(bounds.after ? { after: day(bounds.after) } : {}),
    } as Matcher;
  };
  return Array.isArray(matchers) ? (matchers as Matcher[]).map(one) : one(matchers);
}
