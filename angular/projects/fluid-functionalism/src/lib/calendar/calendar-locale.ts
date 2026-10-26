// ---------------------------------------------------------------------------
// Labels and formatters through `Intl`, replacing DayPicker's date-fns
// locale. English output matches DayPicker's defaults word for word
// ("Friday, November 20th, 2026", "Mo", "November 2026"); other locales use
// the `Intl` equivalents (a full date, the short weekday).
// ---------------------------------------------------------------------------

import type { WeekStartsOn } from './calendar-dates';

/** The state a day label reads. */
export interface DayLabelModifiers {
  today: boolean;
  selected: boolean;
  disabled: boolean;
  outside: boolean;
  booked: boolean;
}

/** The accessible strings, DayPicker's `labels`. Any can be overridden. */
export interface CalendarLabels {
  labelDayButton: (date: Date, modifiers: DayLabelModifiers, locale: string) => string;
  labelGrid: (month: Date, locale: string) => string;
  labelWeekday: (date: Date, locale: string) => string;
  labelWeekNumber: (weekNumber: number, locale: string) => string;
  labelWeekNumberHeader: (locale: string) => string;
  labelPrevious: (month: Date | undefined, locale: string) => string;
  labelNext: (month: Date | undefined, locale: string) => string;
}

/** The visible strings, DayPicker's `formatters`. Any can be overridden. */
export interface CalendarFormatters {
  formatCaption: (month: Date, locale: string) => string;
  formatDay: (date: Date, locale: string) => string;
  formatWeekdayName: (date: Date, locale: string) => string;
  formatWeekNumber: (weekNumber: number, locale: string) => string;
}

const cache = new Map<string, Intl.DateTimeFormat>();
function dtf(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = cache.get(key);
  if (!format) {
    try {
      format = new Intl.DateTimeFormat(locale, options);
    } catch {
      format = new Intl.DateTimeFormat('en-US', options);
    }
    cache.set(key, format);
  }
  return format;
}

const isEnglish = (locale: string) => /^en\b/i.test(locale);

function ordinal(n: number): string {
  const rule = new Intl.PluralRules('en-US', { type: 'ordinal' }).select(n);
  const suffix = { one: 'st', two: 'nd', few: 'rd' }[rule as 'one' | 'two' | 'few'] ?? 'th';
  return `${n}${suffix}`;
}

/** date-fns "PPPP": "Friday, November 20th, 2026" in English. */
export function formatFullDate(date: Date, locale: string): string {
  if (!isEnglish(locale)) return dtf(locale, { dateStyle: 'full' }).format(date);
  const weekday = dtf(locale, { weekday: 'long' }).format(date);
  const month = dtf(locale, { month: 'long' }).format(date);
  return `${weekday}, ${month} ${ordinal(date.getDate())}, ${date.getFullYear()}`;
}

export const defaultFormatters: CalendarFormatters = {
  formatCaption: (month, locale) => dtf(locale, { month: 'long', year: 'numeric' }).format(month),
  formatDay: (date) => String(date.getDate()),
  // date-fns "cccccc": two letters in English (Su, Mo, ...).
  formatWeekdayName: (date, locale) => {
    const short = dtf(locale, { weekday: 'short' }).format(date);
    return isEnglish(locale) ? short.slice(0, 2) : short;
  },
  // Week numbers read like the day numbers beside them: 1, not 01.
  formatWeekNumber: (n) => String(n),
};

export const defaultLabels: CalendarLabels = {
  labelDayButton: (date, modifiers, locale) => {
    let label = formatFullDate(date, locale);
    if (modifiers.today) label = `Today, ${label}`;
    if (modifiers.selected) label = `${label}, selected`;
    return modifiers.booked ? `${label}, booked` : label;
  },
  labelGrid: (month, locale) => defaultFormatters.formatCaption(month, locale),
  labelWeekday: (date, locale) => dtf(locale, { weekday: 'long' }).format(date),
  labelWeekNumber: (n) => `Week ${n}`,
  labelWeekNumberHeader: () => 'Week Number',
  labelPrevious: () => 'Go to the Previous Month',
  labelNext: () => 'Go to the Next Month',
};

interface WeekInfo {
  firstDay: number;
  minimalDays: number;
}

function weekInfo(locale: string): WeekInfo | null {
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => WeekInfo;
      weekInfo?: WeekInfo;
    };
    return loc.getWeekInfo?.() ?? loc.weekInfo ?? null;
  } catch {
    return null;
  }
}

/** The locale's first weekday (0 = Sunday), Sunday when `Intl` can't tell. */
export function localeWeekStart(locale: string): WeekStartsOn {
  const info = weekInfo(locale);
  return info ? ((info.firstDay % 7) as WeekStartsOn) : 0;
}

/** The January date the locale's week 1 must hold (1 when unknown). */
export function localeFirstWeekContainsDate(locale: string): number {
  return weekInfo(locale)?.minimalDays ?? 1;
}
