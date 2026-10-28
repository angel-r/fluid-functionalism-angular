/**
 * The framework-free month model that replaces DayPicker: matchers, the
 * booked / unavailable split, ISO and locale week numbers, the month grid,
 * the range rules, and keyboard focus moves. Ported from the pure cases of
 * tests/calendar.test.tsx plus one test per DayPicker rule the port relies on.
 */
import {
  addToRange,
  buildMonth,
  calculateFocusTarget,
  dateMatchModifiers,
  dayNumber,
  keyToMove,
  nextFocusDate,
  rangeContainsModifiers,
  resolveDayMatchers,
  resolveWeekNumbering,
} from './calendar-dates';

const d = (y: number, m: number, day: number) => new Date(y, m, day);
const sunday = { weekStartsOn: 0 as const, ISOWeek: false, fixedWeeks: false, firstWeekContainsDate: 1 };
const iso = { ...sunday, weekStartsOn: 1 as const, ISOWeek: true };

describe('resolveDayMatchers', () => {
  const booked = d(2026, 10, 12);
  const past = { before: d(2026, 10, 10) };

  it('makes booked days unpickable and marks them booked', () => {
    const { disabled, modifiers } = resolveDayMatchers({ booked: [booked], disabled: past });
    expect(dateMatchModifiers(booked, disabled)).toBe(true);
    expect(dateMatchModifiers(booked, modifiers.booked)).toBe(true);
    expect(dateMatchModifiers(booked, modifiers.unavailable)).toBe(false);
  });

  it('makes disabled days unavailable without marking them booked', () => {
    const { disabled, modifiers } = resolveDayMatchers({ booked: [booked], disabled: past });
    const day = d(2026, 10, 3);
    expect(dateMatchModifiers(day, disabled)).toBe(true);
    expect(dateMatchModifiers(day, modifiers.unavailable)).toBe(true);
    expect(dateMatchModifiers(day, modifiers.booked)).toBe(false);
  });

  it('turns every day outside `available` unavailable', () => {
    const { disabled, modifiers } = resolveDayMatchers({ available: { dayOfWeek: [1, 2, 3, 4, 5] } });
    const saturday = d(2026, 10, 14);
    const monday = d(2026, 10, 16);
    expect(dateMatchModifiers(saturday, disabled)).toBe(true);
    expect(dateMatchModifiers(saturday, modifiers.unavailable)).toBe(true);
    expect(dateMatchModifiers(monday, disabled)).toBe(false);
  });

  it('leaves every day open with no matchers', () => {
    const { disabled } = resolveDayMatchers({});
    expect(dateMatchModifiers(d(2026, 10, 14), disabled)).toBe(false);
  });
});

describe('dateMatchModifiers', () => {
  const day = d(2026, 10, 14);
  it('reads every matcher shape', () => {
    expect(dateMatchModifiers(day, true)).toBe(true);
    expect(dateMatchModifiers(day, false)).toBe(false);
    expect(dateMatchModifiers(day, new Date(2026, 10, 14, 18, 30))).toBe(true);
    expect(dateMatchModifiers(day, [d(2026, 10, 1), d(2026, 10, 14)])).toBe(true);
    expect(dateMatchModifiers(day, { from: d(2026, 10, 10), to: d(2026, 10, 14) })).toBe(true);
    expect(dateMatchModifiers(day, { from: d(2026, 10, 15), to: d(2026, 10, 10) })).toBe(true);
    expect(dateMatchModifiers(day, { before: d(2026, 10, 14) })).toBe(false);
    expect(dateMatchModifiers(day, { before: d(2026, 10, 15) })).toBe(true);
    expect(dateMatchModifiers(day, { after: d(2026, 10, 13) })).toBe(true);
    expect(dateMatchModifiers(day, { after: d(2026, 10, 10), before: d(2026, 10, 20) })).toBe(true);
    expect(dateMatchModifiers(day, { after: d(2026, 10, 20), before: d(2026, 10, 10) })).toBe(false);
    expect(dateMatchModifiers(day, { dayOfWeek: 6 })).toBe(true);
    expect(dateMatchModifiers(day, (date) => date.getDate() === 14)).toBe(true);
  });

  it('finds a matching day inside a range', () => {
    expect(rangeContainsModifiers({ from: d(2026, 10, 9), to: d(2026, 10, 15) }, [d(2026, 10, 12)])).toBe(true);
    expect(rangeContainsModifiers({ from: d(2026, 10, 9), to: d(2026, 10, 11) }, [d(2026, 10, 12)])).toBe(false);
  });
});

describe('week numbers', () => {
  it('uses ISO 8601 numbering with a Monday start by default', () => {
    expect(resolveWeekNumbering(true, undefined, undefined)).toBe(true);
    expect(resolveWeekNumbering(true, 0, undefined)).toBe(false);
    expect(resolveWeekNumbering(false, undefined, undefined)).toBe(false);
    expect(resolveWeekNumbering(false, undefined, true)).toBe(true);
  });

  it('numbers January 2027 as ISO week 53 then 1, or locale week 1 with a Sunday start', () => {
    const isoMonth = buildMonth(d(2027, 0, 1), iso);
    expect(isoMonth.weeks[0].weekNumber).toBe(53);
    expect(isoMonth.weeks[1].weekNumber).toBe(1);
    expect(isoMonth.weeks[0].days[0].date.getDay()).toBe(1);
    const local = buildMonth(d(2027, 0, 1), sunday);
    expect(local.weeks[0].weekNumber).toBe(1);
    expect(local.weeks[0].days[0].date.getDay()).toBe(0);
  });
});

describe('buildMonth', () => {
  it('lays out whole weeks with the neighbouring days flagged outside', () => {
    const month = buildMonth(d(2026, 10, 1), sunday);
    // November 2026 starts on a Sunday and ends on a Monday: 5 rows.
    expect(month.weeks).toHaveLength(5);
    expect(month.weeks.every((w) => w.days.length === 7)).toBe(true);
    expect(month.weeks[0].days[0].outside).toBe(false);
    const last = month.weeks[4].days;
    expect(last[1].date.getDate()).toBe(30);
    expect(last[2].outside).toBe(true);
    expect(last[2].isoDate).toBe('2026-12-01');
  });

  it('pads to 6 weeks with fixedWeeks', () => {
    expect(buildMonth(d(2026, 10, 1), { ...sunday, fixedWeeks: true }).weeks).toHaveLength(6);
  });
});

describe('addToRange', () => {
  it('starts a range on the first pick and ends it on the second, either way round', () => {
    const first = addToRange(d(2026, 10, 9), undefined);
    expect(dayNumber(first!.from!)).toBe(dayNumber(d(2026, 10, 9)));
    expect(first!.to).toBeUndefined();
    const after = addToRange(d(2026, 10, 13), first);
    expect(dayNumber(after!.to!)).toBe(dayNumber(d(2026, 10, 13)));
    const before = addToRange(d(2026, 10, 5), first);
    expect(dayNumber(before!.from!)).toBe(dayNumber(d(2026, 10, 5)));
    expect(dayNumber(before!.to!)).toBe(dayNumber(d(2026, 10, 9)));
  });

  it('starts over on a pick after a complete range', () => {
    const next = addToRange(d(2026, 10, 20), { from: d(2026, 10, 2), to: d(2026, 10, 4) });
    expect(dayNumber(next!.from!)).toBe(dayNumber(d(2026, 10, 20)));
    expect(next!.to).toBeUndefined();
  });

  it('starts over when the range breaks min or max nights', () => {
    const start = { from: d(2026, 10, 9), to: undefined };
    expect(addToRange(d(2026, 10, 20), start, { max: 5 })!.to).toBeUndefined();
    expect(addToRange(d(2026, 10, 10), start, { min: 3 })!.to).toBeUndefined();
    expect(addToRange(d(2026, 10, 12), start, { min: 3 })!.to).toBeDefined();
  });
});

describe('keyboard focus', () => {
  const opts = { weekStartsOn: 0 as const, ISOWeek: false };
  it('maps the grid keys like DayPicker', () => {
    expect(keyToMove('ArrowLeft', false, false)).toEqual(['day', 'before']);
    expect(keyToMove('ArrowLeft', false, true)).toEqual(['day', 'after']);
    expect(keyToMove('ArrowDown', false, false)).toEqual(['week', 'after']);
    expect(keyToMove('PageUp', true, false)).toEqual(['year', 'before']);
    expect(keyToMove('Home', false, false)).toEqual(['startOfWeek', 'before']);
    expect(keyToMove('Enter', false, false)).toBeNull();
  });

  it('skips unfocusable days in the direction of travel', () => {
    const blocked = (date: Date) => date.getDate() === 13;
    const next = nextFocusDate(d(2026, 10, 12), 'day', 'after', { ...opts, isUnfocusable: blocked });
    expect(next!.getDate()).toBe(14);
    const end = nextFocusDate(d(2026, 10, 11), 'endOfWeek', 'after', { ...opts, isUnfocusable: () => false });
    expect(end!.getDate()).toBe(14);
    const month = nextFocusDate(d(2026, 0, 31), 'month', 'after', { ...opts, isUnfocusable: () => false });
    expect([month!.getMonth(), month!.getDate()]).toEqual([1, 28]);
  });

  it('clamps to the start and end months', () => {
    const next = nextFocusDate(d(2026, 10, 3), 'month', 'before', {
      ...opts,
      isUnfocusable: () => false,
      startMonth: d(2026, 10, 1),
    });
    expect(dayNumber(next!)).toBe(dayNumber(d(2026, 10, 1)));
  });

  it('targets the selected day, then today, then the first open day', () => {
    const days = buildMonth(d(2026, 10, 1), sunday).weeks.flatMap((w) => w.days);
    const open = () => false;
    const base = { days, isDisabled: open, focused: null, lastFocused: null };
    const sel = dayNumber(d(2026, 10, 20));
    const today = dayNumber(d(2026, 10, 5));
    expect(calculateFocusTarget({ ...base, isSelected: (n) => n === sel, today })).toBe(sel);
    expect(calculateFocusTarget({ ...base, isSelected: () => false, today })).toBe(today);
    expect(calculateFocusTarget({ ...base, isSelected: () => false, today: null })).toBe(dayNumber(d(2026, 10, 1)));
  });
});
