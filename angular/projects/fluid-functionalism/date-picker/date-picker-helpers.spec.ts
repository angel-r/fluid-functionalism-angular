/**
 * The time and label helpers the date picker is built on. Ported verbatim
 * from the pure cases of tests/date-picker.test.tsx.
 */
import {
  buildSlots,
  formatDuration,
  formatTime,
  nearestSlotIndex,
  parseTime,
  resolveHourCycle,
  shiftEnd,
  timeToMinutes,
} from './date-picker-time';
import { formValue, formatDateLabel, formatRangeLabel, widestLabelParts } from './date-picker-labels';

// Intl puts a narrow no-break space before AM/PM in recent ICU versions.
const plain = (s: string) => s.replace(/[  ]/g, ' ');

describe('durations', () => {
  it.each([
    [15, '15min'],
    [30, '30min'],
    [60, '1h'],
    [75, '1h 15min'],
    [105, '1h 45min'],
    [120, '2h'],
  ])('%i minutes reads %s', (minutes, label) => {
    expect(formatDuration(minutes)).toBe(label);
  });
});

describe('typed times', () => {
  it.each([
    ['1130', 690],
    ['11:30', 690],
    ['11.30', 690],
    ['11:30am', 690],
    ['11:30 pm', 1410],
    ['930', 570],
    ['9', 540],
    ['9pm', 1260],
    ['12am', 0],
    ['12pm', 720],
    ['0000', 0],
    ['2359', 1439],
    ['9h30', 570],
    ['9h', 540],
    ['9h pm', 1260],
    ['123', 83],
  ])('%s is %i minutes', (input, minutes) => {
    expect(parseTime(input)).toBe(minutes);
  });

  it.each(['2400', '1260', '13pm', 'abc', '', '11:3'])('%s is not a time', (input) => {
    expect(parseTime(input)).toBeNull();
  });

  it('reads stored HH:mm values', () => {
    expect(timeToMinutes('11:00')).toBe(660);
    expect(timeToMinutes('24:00')).toBeNull();
    expect(timeToMinutes(null)).toBeNull();
  });
});

describe('time ranges', () => {
  it('moves the end with the start, keeping the duration', () => {
    // 11:00 → 12:45, start moved to 12:00: end 13:45.
    expect(shiftEnd(660, 765, 720)).toBe(825);
  });

  it('stops the end at the end of the same day', () => {
    expect(shiftEnd(660, 780, 1380)).toBe(1439);
  });

  it('starts the end list one step after the start, with durations', () => {
    const slots = buildSlots(15, 660);
    expect(slots[0]).toEqual({ minutes: 675, duration: 15 });
    expect(slots[3]).toEqual({ minutes: 720, duration: 60 });
    expect(slots[slots.length - 1].minutes).toBeLessThanOrEqual(1439);
  });

  it('covers the whole day for a start list', () => {
    const slots = buildSlots(15);
    expect(slots).toHaveLength(96);
    expect(slots[0].minutes).toBe(0);
    expect(nearestSlotIndex(slots, 697)).toBe(46); // 11:37 → 11:30
  });
});

describe('12h and 24h', () => {
  it("follows the locale's clock", () => {
    expect(resolveHourCycle('en-US')).toBe(12);
    expect(resolveHourCycle('en-GB')).toBe(24);
    expect(resolveHourCycle('fr-FR')).toBe(24);
  });

  it('lets hourCycle override the locale', () => {
    expect(resolveHourCycle('en-US', 24)).toBe(24);
    expect(resolveHourCycle('en-GB', 12)).toBe(12);
  });

  it('formats a time on either clock', () => {
    expect(formatTime(690, 24, 'en-GB')).toBe('11:30');
    expect(formatTime(810, 24, 'en-US')).toBe('13:30');
    expect(plain(formatTime(690, 12, 'en-US'))).toBe('11:30 AM');
    expect(plain(formatTime(0, 12, 'en-US'))).toBe('12:00 AM');
  });
});

describe('form value', () => {
  it('submits ISO 8601 local dates, times and intervals', () => {
    const day = new Date(2026, 9, 21);
    expect(formValue(day)).toBe('2026-10-21');
    expect(formValue(day, '11:00')).toBe('2026-10-21T11:00');
    expect(formValue(day, null, { start: '11:00', end: '12:45' })).toBe('2026-10-21T11:00/2026-10-21T12:45');
    expect(formValue({ from: day, to: new Date(2026, 9, 24) })).toBe('2026-10-21/2026-10-24');
    // Incomplete or empty: nothing to submit.
    expect(formValue({ from: day, to: undefined })).toBe('');
    expect(formValue(undefined)).toBe('');
  });
});

describe('date label width', () => {
  it('stacks every weekday and month so any date fits the same width', () => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' } as const;
    const sample = [
      { type: 'weekday', value: 'Thu' },
      { type: 'literal', value: ' ' },
      { type: 'month', value: 'Oct' },
      { type: 'literal', value: ' ' },
      { type: 'day', value: '1' },
    ] as const;
    const cells = widestLabelParts([...sample], 'en-US', options);
    expect(cells).toHaveLength(5);
    expect(cells[0]).toHaveLength(7);
    expect(cells[0]).toContain('Wed');
    expect(cells[2]).toHaveLength(12);
    expect(cells[2]).toContain('Sep');
    expect(cells[4]).toEqual(['28']);
    expect(cells[1]).toEqual([' ']);
  });
});

describe('date labels', () => {
  const now = new Date(2026, 9, 19);

  it('reads Wed Oct 21, with the year outside the current one', () => {
    expect(formatDateLabel(new Date(2026, 9, 21), 'en-US', now)).toBe('Wed Oct 21');
    expect(formatDateLabel(new Date(2027, 9, 21), 'en-US', now)).toBe('Thu Oct 21, 2027');
  });

  it('reads a range as Oct 21 → Oct 24', () => {
    expect(formatRangeLabel({ from: new Date(2026, 9, 21), to: new Date(2026, 9, 24) }, 'en-US', now)).toBe(
      'Oct 21 → Oct 24',
    );
    expect(formatRangeLabel({ from: new Date(2026, 11, 30), to: new Date(2027, 0, 2) }, 'en-US', now)).toBe(
      'Dec 30, 2026 → Jan 2, 2027',
    );
  });
});
