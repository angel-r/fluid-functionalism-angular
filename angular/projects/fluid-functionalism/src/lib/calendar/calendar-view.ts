// ---------------------------------------------------------------------------
// What each day cell renders: its classes, data-* state, label, tab stop and
// slice of the range band, as one pure function of the calendar's state.
// The React version spreads this over its Day and DayButton parts.
// ---------------------------------------------------------------------------

import { cn } from '../core/utils';
import { fontWeights } from '../core/font-weight';
import { typeClass } from '../core/type-scale';
import {
  addDays,
  dateMatchModifiers,
  dayNumber,
  rangeIncludesDate,
  type CalendarDay,
  type CalendarMonth,
  type DateRange,
  type Matcher,
} from './calendar-dates';
import type { CalendarFormatters, CalendarLabels } from './calendar-locale';

export interface BandStyle {
  left: string;
  right: string;
  tl: string;
  tr: string;
  br: string;
  bl: string;
}

export interface CalendarDayView {
  day: CalendarDay;
  key: string;
  hidden: boolean;
  today: boolean;
  disabled: boolean;
  outside: boolean;
  ariaSelected: true | null;
  label: string;
  text: string;
  /** The fluid hover index; null for outside days, which stay out of it. */
  index: number | null;
  tabIndex: number;
  isEnd: boolean;
  inMiddle: boolean;
  booked: boolean;
  isPreviewEnd: boolean;
  cellClass: string;
  buttonClass: string;
  weight: string;
  band: BandStyle | null;
  hasDetail: boolean;
  detail: unknown;
  detailId: string;
  detailClass: string;
}

export interface CalendarWeekView {
  key: number;
  label: string;
  text: string;
  days: CalendarDayView[];
}

/** Everything a day cell reads, resolved once per render. */
export interface DayViewState {
  locale: string;
  labels: CalendarLabels;
  formatters: CalendarFormatters;
  mode: 'single' | 'range';
  range: DateRange | undefined;
  picking: boolean;
  selectedDay: number | null;
  /** The band to draw: committed, or start → proposed end while picking. */
  band: { from: number; to: number } | null;
  previewEnd: number | null;
  /** The day a range end was just committed on (no fade). */
  committedEnd: number | null;
  disabled: Matcher[];
  booked: Matcher | Matcher[];
  today: number;
  outsideHidden: boolean;
  isHidden: (date: Date) => boolean;
  fill: boolean;
  pill: boolean;
  compact: boolean;
  focusTarget: number | null;
  focusedDay: number | null;
  gridStart: number;
  dayDetail: ((date: Date) => unknown) | undefined;
  /** Per-day cache of `dayDetail` results. */
  detailCache: Map<number, unknown>;
  /** Unique per panel: the prefix of the detail ids. */
  idPrefix: string;
}

export function buildWeekViews(month: CalendarMonth, s: DayViewState): CalendarWeekView[] {
  const { band } = s;
  const fromN = s.range?.from ? dayNumber(s.range.from) : null;
  const toN = s.range?.to ? dayNumber(s.range.to) : null;
  const weeks = month.weeks;
  const gridFirst = weeks[0].days[0].n;
  const lastWeek = weeks[weeks.length - 1].days;
  const gridLast = lastWeek[lastWeek.length - 1].n;
  const monthIndex = month.date.getMonth();

  // Whether the day `m` is drawn in this grid with band reaching its left or
  // right edge: the row above or below then touches this corner.
  const drawn = (m: number, n: number, date: Date) => {
    if (m < gridFirst || m > gridLast) return false;
    if (!s.outsideHidden) return true;
    return addDays(date, m - n).getMonth() === monthIndex;
  };
  const bandAtLeft = (m: number, n: number, date: Date) => !!band && drawn(m, n, date) && m > band.from && m <= band.to;
  const bandAtRight = (m: number, n: number, date: Date) => !!band && drawn(m, n, date) && m >= band.from && m < band.to;
  const corner = (edge: boolean, touching: boolean) => (edge && !touching ? '2px' : '0px');

  return weeks.map((week) => ({
    key: week.days[0].n,
    label: s.labels.labelWeekNumber(week.weekNumber, s.locale),
    text: s.formatters.formatWeekNumber(week.weekNumber, s.locale),
    days: week.days.map((day): CalendarDayView => {
      const { n, date, outside } = day;
      const hidden = (outside && s.outsideHidden) || s.isHidden(date);
      const disabled = dateMatchModifiers(date, s.disabled);
      const booked = s.booked !== false && dateMatchModifiers(date, s.booked);
      const today = n === s.today;
      const selected = s.mode === 'single' ? s.selectedDay === n : !!s.range && rangeIncludesDate(s.range, date);

      // The band: from the cell's center to the edge facing the rest of the
      // range, full width in the middle; 2px corners where a week row (or a
      // month, outside days hidden) ends, square on any corner whose row
      // above or below continues the band, so stacked rows read as one block.
      const inBand = !!band && !hidden && band.from !== band.to && n >= band.from && n <= band.to;
      let bandStyle: BandStyle | null = null;
      if (inBand && band) {
        const lastOfMonth = addDays(date, 1).getMonth() !== date.getMonth();
        const firstOfMonth = date.getDate() === 1;
        // The column, read off the grid itself: every row starts on the
        // week's first day, whatever weekStartsOn, locale or ISO decided.
        const weekday = (((n - gridFirst) % 7) + 7) % 7;
        const edgeLeft = n > band.from && (weekday === 0 || (firstOfMonth && s.outsideHidden));
        const edgeRight = n < band.to && (weekday === 6 || (lastOfMonth && s.outsideHidden));
        bandStyle = {
          left: n > band.from ? '0px' : '50%',
          right: n < band.to ? '0px' : '50%',
          tl: corner(edgeLeft, bandAtLeft(n - 7, n, date)),
          bl: corner(edgeLeft, bandAtLeft(n + 7, n, date)),
          tr: corner(edgeRight, bandAtRight(n - 7, n, date)),
          br: corner(edgeRight, bandAtRight(n + 7, n, date)),
        };
      }

      const isEnd = s.mode === 'single' ? s.selectedDay === n : fromN === n || (toN === n && !s.picking);
      const isPreviewEnd = s.picking && s.previewEnd === n && fromN !== n;
      const inMiddle = !!band && n > band.from && n < band.to;

      // Optional content under the number. Outside days skip it.
      let detail: unknown = null;
      if (!outside && s.dayDetail) {
        if (s.detailCache.has(n)) detail = s.detailCache.get(n);
        else {
          detail = s.dayDetail(date);
          s.detailCache.set(n, detail);
        }
      }
      const hasDetail = detail !== null && detail !== undefined && detail !== false && detail !== '';

      // DayPicker's class names, kept for consumers that style by them.
      const rdp = [
        'rdp-day',
        today && 'rdp-today',
        selected && 'rdp-selected',
        disabled && 'rdp-disabled',
        outside && 'rdp-outside',
        hidden && 'rdp-hidden',
        s.focusedDay === n && 'rdp-focused',
        s.mode === 'range' && fromN === n && 'rdp-range_start',
        s.mode === 'range' && toN === n && 'rdp-range_end',
        s.mode === 'range' &&
          fromN !== null &&
          toN !== null &&
          n > Math.min(fromN, toN) &&
          n < Math.max(fromN, toN) &&
          'rdp-range_middle',
      ];

      return {
        day,
        key: day.isoDate,
        hidden,
        today,
        disabled,
        outside,
        ariaSelected: selected ? true : null,
        label: s.labels.labelDayButton(date, { today, selected, disabled, outside, booked }, s.locale),
        text: s.formatters.formatDay(date, s.locale),
        index: outside ? null : n - s.gridStart,
        tabIndex: !outside && n === s.focusTarget ? 0 : -1,
        isEnd,
        inMiddle,
        booked,
        isPreviewEnd,
        cellClass: cn(
          'relative flex items-center justify-center p-0',
          s.fill ? 'aspect-square max-h-[var(--cell-size)] min-w-0 flex-1' : 'size-[var(--cell-size)]',
          rdp,
        ),
        buttonClass: cn(
          'relative z-[2] flex items-center justify-center p-0 outline-none select-none tabular-nums',
          hasDetail && 'flex-col gap-2',
          // While a range end is being picked the fill is the gliding
          // highlight's: cells only swap their number's color, faded over
          // the highlight's arrival.
          s.picking
            ? 'transition-[color] duration-80'
            : s.committedEnd === n
              ? // The click that commits the end takes over the highlight's
                // fill in the same frame: a fade would flash an empty cell.
                'transition-none'
              : 'transition-[color,background-color,font-variation-settings] duration-80',
          s.fill ? 'aspect-square h-full max-w-full' : 'size-[var(--cell-size)]',
          s.pill ? 'rounded-full' : 'rounded-lg',
          typeClass('body', s.compact ? 'compact' : 'default'),
          isEnd
            ? 'bg-foreground text-background'
            : isPreviewEnd
              ? 'cursor-pointer text-background'
              : disabled
                ? cn('cursor-default text-muted-foreground opacity-50', booked && 'line-through')
                : outside
                  ? 'cursor-pointer text-muted-foreground opacity-60'
                  : 'cursor-pointer text-foreground',
          'rdp-day_button',
        ),
        // Selection never changes weight; only today is semibold.
        weight: today ? fontWeights.semibold : fontWeights.normal,
        band: bandStyle,
        hasDetail,
        detail,
        detailId: `${s.idPrefix}-${day.isoDate}`,
        detailClass: cn(
          'whitespace-nowrap [text-box:trim-both_cap_alphabetic]',
          typeClass('caption', s.compact ? 'compact' : 'default'),
          // Quieter than the number. On a filled day it takes the fill's
          // text color, overriding any color the caller gave it, so a
          // colored price never vanishes on the fill.
          isEnd || isPreviewEnd ? '[&_*]:!text-current' : !disabled && 'text-muted-foreground',
        ),
      };
    }),
  }));
}
