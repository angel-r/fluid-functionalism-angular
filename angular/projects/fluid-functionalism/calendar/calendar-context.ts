import { InjectionToken, type Signal } from '@angular/core';
import type { ShapeClasses } from '../core';

export type CalendarNavDirection = 'previous' | 'next';

/** What the calendar's inner parts (the month nav) read from the calendar. */
export interface CalendarContext {
  readonly previousMonth: Signal<Date | undefined>;
  readonly nextMonth: Signal<Date | undefined>;
  /** Two months stacked: the chevrons point up and down. */
  readonly stacked: Signal<boolean>;
  readonly rtl: Signal<boolean>;
  readonly shape: Signal<ShapeClasses>;
  navLabel(direction: CalendarNavDirection): string;
  navigate(direction: CalendarNavDirection): void;
}

export const CALENDAR_CONTEXT = new InjectionToken<CalendarContext>('FF_CALENDAR_CONTEXT');

/** Parts the pointer passes over without lighting a day (captions, the
 *  weekday row, week numbers, booked days). */
export const INERT_ATTR = 'data-calendar-inert';
export const INDEX_ATTR = 'data-calendar-index';

export function isDisabledDay(el: HTMLElement): boolean {
  return (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true';
}
