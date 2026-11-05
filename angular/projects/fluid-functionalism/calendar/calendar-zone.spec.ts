import { describe, expect, it } from 'vitest';
import {
  dayInTimeZone,
  matchersInTimeZone,
  minutesInTimeZone,
  startOfDayInTimeZone,
  timeZoneOffset,
} from './calendar-zone';
import { dateMatchModifiers, type Matcher } from './calendar-dates';

// Zones far from any machine running the suite (+14 and -11), so every
// assertion proves the browser's own zone is ignored.
const KIRITIMATI = 'Pacific/Kiritimati';
const PAGO_PAGO = 'Pacific/Pago_Pago';

const local = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];

describe('dayInTimeZone', () => {
  it('reads the calendar day an instant falls on in the zone', () => {
    const instant = new Date('2026-10-21T12:00:00Z');
    expect(local(dayInTimeZone(instant, KIRITIMATI))).toEqual([2026, 10, 22, 0, 0]);
    expect(local(dayInTimeZone(instant, PAGO_PAGO))).toEqual([2026, 10, 21, 0, 0]);
    expect(local(dayInTimeZone(new Date('2026-10-21T00:00:00Z'), 'UTC'))).toEqual([2026, 10, 21, 0, 0]);
  });

  it('returns the date untouched without a zone', () => {
    const date = new Date(2026, 9, 21, 15, 30);
    expect(dayInTimeZone(date, undefined)).toBe(date);
  });
});

describe('startOfDayInTimeZone', () => {
  it('is the instant the day starts in the zone', () => {
    const day = new Date(2026, 9, 21);
    expect(startOfDayInTimeZone(day, 'UTC').toISOString()).toBe('2026-10-21T00:00:00.000Z');
    expect(startOfDayInTimeZone(day, KIRITIMATI).toISOString()).toBe('2026-10-20T10:00:00.000Z');
    expect(startOfDayInTimeZone(day, PAGO_PAGO).toISOString()).toBe('2026-10-21T11:00:00.000Z');
    expect(startOfDayInTimeZone(day, 'Europe/Madrid').toISOString()).toBe('2026-10-20T22:00:00.000Z');
  });

  it('places a wall-clock time on that day', () => {
    const day = new Date(2026, 9, 21);
    expect(startOfDayInTimeZone(day, 'Europe/Madrid', 9 * 60 + 30).toISOString()).toBe('2026-10-21T07:30:00.000Z');
    // After the clocks go back (Oct 25 in 2026), Madrid is UTC+1.
    expect(startOfDayInTimeZone(new Date(2026, 9, 26), 'Europe/Madrid', 9 * 60).toISOString()).toBe(
      '2026-10-26T08:00:00.000Z',
    );
  });

  it('round-trips with dayInTimeZone', () => {
    for (const zone of ['UTC', KIRITIMATI, PAGO_PAGO, 'America/New_York', 'Asia/Kolkata']) {
      const day = new Date(2026, 2, 8);
      expect(local(dayInTimeZone(startOfDayInTimeZone(day, zone), zone))).toEqual([2026, 3, 8, 0, 0]);
    }
  });

  it('starts a day whose midnight the clocks skip at the first moment it has', () => {
    // Santiago springs forward at midnight: Sep 6 2026 begins at 01:00 (-03).
    const start = startOfDayInTimeZone(new Date(2026, 8, 6), 'America/Santiago');
    expect(start.toISOString()).toBe('2026-09-06T04:00:00.000Z');
    expect(local(dayInTimeZone(start, 'America/Santiago'))).toEqual([2026, 9, 6, 0, 0]);
  });

  it('returns the date untouched without a zone', () => {
    const day = new Date(2026, 9, 21);
    expect(startOfDayInTimeZone(day, undefined)).toBe(day);
  });
});

describe('timeZoneOffset', () => {
  it('writes the ISO 8601 offset of the instant in the zone', () => {
    expect(timeZoneOffset(new Date('2026-10-21T07:30:00Z'), 'UTC')).toBe('Z');
    expect(timeZoneOffset(new Date('2026-10-21T07:30:00Z'), 'Europe/Madrid')).toBe('+02:00');
    expect(timeZoneOffset(new Date('2026-10-21T07:30:00Z'), 'Asia/Kolkata')).toBe('+05:30');
    expect(timeZoneOffset(new Date('2026-10-21T07:30:00Z'), PAGO_PAGO)).toBe('-11:00');
  });
});

describe('minutesInTimeZone', () => {
  it('reads the wall-clock minutes of the instant in the zone', () => {
    expect(minutesInTimeZone(new Date('2026-10-21T07:30:00Z'), 'Europe/Madrid')).toBe(9 * 60 + 30);
    expect(minutesInTimeZone(new Date('2026-10-21T07:30:00Z'), PAGO_PAGO)).toBe(20 * 60 + 30);
  });
});

describe('matchersInTimeZone', () => {
  const zone = KIRITIMATI;
  // Oct 22 in Kiritimati starts at Oct 21 10:00 UTC.
  const oct22 = new Date('2026-10-21T10:00:00Z');
  const day = (d: number) => new Date(2026, 9, d);
  const matches = (m: Matcher | Matcher[], d: number) => dateMatchModifiers(day(d), matchersInTimeZone(m, zone));

  it('reads dates, ranges and bounds as days in the zone', () => {
    expect(matches(oct22, 22)).toBe(true);
    expect(matches(oct22, 21)).toBe(false);
    expect(matches([oct22], 22)).toBe(true);
    expect(matches({ from: oct22, to: new Date('2026-10-23T10:00:00Z') }, 24)).toBe(true);
    expect(matches({ before: oct22 }, 21)).toBe(true);
    expect(matches({ before: oct22 }, 22)).toBe(false);
    expect(matches({ after: oct22 }, 23)).toBe(true);
    expect(matches({ dayOfWeek: 4 }, 22)).toBe(true);
    expect(matches(true, 1)).toBe(true);
  });

  it('hands a predicate the instant the day starts in the zone', () => {
    const seen: string[] = [];
    const predicate = (date: Date) => {
      seen.push(date.toISOString());
      return date.toISOString() === oct22.toISOString();
    };
    expect(matches(predicate, 22)).toBe(true);
    expect(matches([predicate], 23)).toBe(false);
    expect(seen).toEqual(['2026-10-21T10:00:00.000Z', '2026-10-22T10:00:00.000Z']);
  });

  it('leaves the matchers untouched without a zone', () => {
    const list: Matcher[] = [oct22];
    expect(matchersInTimeZone(list, undefined)).toBe(list);
  });
});
