import type { DateRange } from '../calendar/calendar-dates';

// ---------------------------------------------------------------------------
// Date labels and the form value of the date picker (pure, exported for the
// unit tests). Labels are formatted with Intl in the locale's own order.
// ---------------------------------------------------------------------------

/** A start → end time on the same day. */
export interface TimeRange {
  /** "HH:mm" */
  start: string;
  /** "HH:mm", later the same day. */
  end: string;
}

export interface LabelPart {
  type: Intl.DateTimeFormatPartTypes;
  value: string;
}

export function singleLabelOptions(withYear: boolean): Intl.DateTimeFormatOptions {
  return {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  };
}

export function rangeLabelOptions(withYear: boolean): Intl.DateTimeFormatOptions {
  return { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) };
}

/** A date's label as parts, in the locale's order. */
export function labelParts(date: Date, locale: string | undefined, options: Intl.DateTimeFormatOptions): LabelPart[] {
  const parts = new Intl.DateTimeFormat(locale, options).formatToParts(date);
  return parts.map(
    (part, i): LabelPart =>
      // Drop the comma English puts after the weekday: "Wed Oct 21".
      part.type === 'literal' && parts[i - 1]?.type === 'weekday'
        ? { type: part.type, value: part.value.replace(',', '') }
        : { type: part.type, value: part.value },
  );
}

/** `Wed Oct 21`, or `Wed Oct 21, 2027` outside the current year. */
export function formatDateLabel(date: Date, locale?: string, now = new Date()): string {
  const withYear = date.getFullYear() !== now.getFullYear();
  return labelParts(date, locale, singleLabelOptions(withYear))
    .map((part) => part.value)
    .join('');
}

/** `Oct 21 → Oct 24`, with years when the range leaves the current year. */
export function formatRangeLabel(range: DateRange, locale?: string, now = new Date()): string {
  if (!range.from) return '';
  const withYear = rangeWithYear(range, now);
  const fmt = new Intl.DateTimeFormat(locale, rangeLabelOptions(withYear));
  if (!range.to) return `${fmt.format(range.from)} →`;
  return `${fmt.format(range.from)} → ${fmt.format(range.to)}`;
}

/** `2026-10-21`, from the date's local parts (not UTC). */
function isoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The hidden input's value for `name` (exported for the unit tests). */
export function formValue(
  value: Date | DateRange | undefined,
  time?: string | null,
  timeRange?: TimeRange | null,
): string {
  if (value instanceof Date) {
    const day = isoDate(value);
    if (timeRange) return `${day}T${timeRange.start}/${day}T${timeRange.end}`;
    return time ? `${day}T${time}` : day;
  }
  if (value?.from && value.to) return `${isoDate(value.from)}/${isoDate(value.to)}`;
  return '';
}

export function rangeWithYear(range: DateRange, now: Date): boolean {
  const year = now.getFullYear();
  return (!!range.from && range.from.getFullYear() !== year) || (!!range.to && range.to.getFullYear() !== year);
}

/** Whether two dates fall on the same calendar day. */
export function sameDay(a?: Date, b?: Date): boolean {
  return !!a && !!b && a.toDateString() === b.toDateString();
}

/**
 * The label's widest form, part by part: every weekday name stacked in one
 * cell, every month name in another, a two-digit day, the rest as written.
 * Laid out invisibly under the label, it fixes the trigger's width for any
 * date in that format, in any locale and font. Exported for the unit test.
 */
export function widestLabelParts(
  sample: LabelPart[],
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): string[][] {
  const fmt = new Intl.DateTimeFormat(locale, options);
  const pick = (date: Date, type: Intl.DateTimeFormatPartTypes) =>
    fmt.formatToParts(date).find((part) => part.type === type)?.value ?? '';
  const weekdays = Array.from({ length: 7 }, (_, i) => pick(new Date(2026, 0, 4 + i), 'weekday'));
  const months = Array.from({ length: 12 }, (_, m) => pick(new Date(2026, m, 28), 'month'));
  // Digits are tabular in the label, so any two-digit day is the widest.
  const day = [pick(new Date(2026, 0, 28), 'day')];
  return sample.map((part) =>
    part.type === 'weekday'
      ? [...new Set(weekdays)]
      : part.type === 'month'
        ? [...new Set(months)]
        : part.type === 'day'
          ? day
          : [part.value],
  );
}
