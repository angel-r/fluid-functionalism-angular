/**
 * Calendar: booked and unavailable days get different looks, a range never
 * spans a booked day, the band draws row-aware corners, week numbers are
 * ISO 8601, Escape during a range pick puts the previous range back, and the
 * grid keeps DayPicker's ARIA, roving tab stop and keys. Ported from
 * tests/calendar.test.tsx (component cases) plus one test per rule.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Calendar, type CalendarValue } from './calendar';
import type { DateRange, Matcher, WeekStartsOn } from './calendar-dates';
import { dayNumber } from './calendar-dates';
import { fontWeights } from '../core/font-weight';

// Never on screen, so no day label gains "Today, " by accident.
const TODAY = new Date(2026, 5, 1);
const NOV = new Date(2026, 10, 1);

@Component({
  imports: [Calendar],
  template: `
    <ff-calendar
      [mode]="mode()"
      [month]="month()"
      [today]="today()"
      [booked]="booked()"
      [disabled]="disabled()"
      [required]="required()"
      [numberOfMonths]="numberOfMonths()"
      [weekStartsOn]="weekStartsOn()"
      [showWeekNumber]="showWeekNumber()"
      [cellSize]="cellSize()"
      [dayDetail]="dayDetail()"
      [startMonth]="startMonth()"
      [autoFocus]="autoFocus()"
      [(selected)]="selected"
      (select)="selects.push($event)"
      (monthChange)="months.push($event)"
    />
  `,
})
class Host {
  readonly mode = signal<'single' | 'range'>('single');
  readonly month = signal<Date | undefined>(NOV);
  readonly today = signal<Date | undefined>(TODAY);
  readonly booked = signal<Matcher | Matcher[] | undefined>(undefined);
  readonly disabled = signal<Matcher | Matcher[] | undefined>(undefined);
  readonly required = signal(false);
  readonly numberOfMonths = signal<1 | 2>(1);
  readonly weekStartsOn = signal<WeekStartsOn | undefined>(undefined);
  readonly showWeekNumber = signal(false);
  readonly cellSize = signal<number | undefined>(undefined);
  readonly dayDetail = signal<((d: Date) => unknown) | undefined>(undefined);
  readonly startMonth = signal<Date | undefined>(undefined);
  readonly autoFocus = signal(false);
  readonly selected = signal<CalendarValue>(undefined);
  readonly selects: CalendarValue[] = [];
  readonly months: (Date | undefined)[] = [];
}

function render(setup: (host: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  setup(fixture.componentInstance);
  fixture.detectChanges();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const flush = () => fixture.detectChanges();
  /** Buttons by accessible name, skipping a month that is sliding out. */
  const buttons = (name: RegExp) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button[aria-label]')).filter(
      (b) => !b.closest('[aria-hidden="true"]') && name.test(b.getAttribute('aria-label') ?? ''),
    );
  const dayButton = (name: RegExp) => {
    const found = buttons(name);
    expect(found, `one button named ${name}`).toHaveLength(1);
    return found[0];
  };
  const key = (target: HTMLElement, k: string, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    flush();
    return event;
  };
  const click = (target: HTMLElement) => {
    target.click();
    flush();
  };
  return { fixture, host: fixture.componentInstance, el, flush, buttons, dayButton, key, click };
}

const range = (from: Date, to?: Date): DateRange => ({ from, to });

/** How many Escape keydowns reached the document while `run` ran. */
function escapesReaching(run: () => void) {
  let count = 0;
  const listener = (e: KeyboardEvent) => {
    if (e.key === 'Escape') count++;
  };
  document.addEventListener('keydown', listener);
  try {
    run();
  } finally {
    document.removeEventListener('keydown', listener);
  }
  return count;
}

describe('Calendar day states', () => {
  it('strikes booked days through, disables them and labels them booked', () => {
    const { dayButton } = render((h) => {
      h.booked.set([new Date(2026, 10, 12)]);
      h.disabled.set({ before: new Date(2026, 10, 10) });
    });
    const booked = dayButton(/November 12th, 2026, booked/);
    expect(booked.hasAttribute('disabled')).toBe(true);
    expect(booked.getAttribute('data-booked')).not.toBeNull();
    expect(booked.classList.contains('line-through')).toBe(true);

    const past = dayButton(/November 3rd, 2026$/);
    expect(past.hasAttribute('disabled')).toBe(true);
    expect(past.getAttribute('data-booked')).toBeNull();
    expect(past.classList.contains('line-through')).toBe(false);
    expect(past.classList.contains('opacity-50')).toBe(true);
  });

  it('fills the selected day and keeps its regular weight', () => {
    const { dayButton } = render((h) => h.selected.set(new Date(2026, 10, 20)));
    const day = dayButton(/November 20th, 2026/);
    expect(day.getAttribute('data-selected')).not.toBeNull();
    expect(day.classList.contains('bg-foreground')).toBe(true);
    expect(day.style.fontVariationSettings).toBe(fontWeights.normal);
    expect(day.getAttribute('aria-label')).toBe('Friday, November 20th, 2026, selected');
    expect(day.closest('[role=gridcell]')!.getAttribute('aria-selected')).toBe('true');
  });

  it('marks today with semibold, a dot and the "Today" label', () => {
    const { dayButton } = render((h) => h.today.set(new Date(2026, 10, 5)));
    const today = dayButton(/^Today, Thursday, November 5th, 2026$/);
    expect(today.style.fontVariationSettings).toBe(fontWeights.semibold);
    expect(today.querySelector('[data-slot=calendar-today-dot]')).not.toBeNull();
    expect(today.closest('[role=gridcell]')!.hasAttribute('data-today')).toBe(true);
  });
});

describe('Calendar single selection', () => {
  it('a click selects the day, writes the model and emits select; a second click clears it', () => {
    const { host, dayButton, click } = render();
    click(dayButton(/November 9th, 2026/));
    expect(dayNumber(host.selected() as Date)).toBe(dayNumber(new Date(2026, 10, 9)));
    expect(host.selects).toHaveLength(1);
    expect(dayButton(/November 9th, 2026/).getAttribute('data-selected')).not.toBeNull();
    click(dayButton(/November 9th, 2026/));
    expect(host.selected()).toBeUndefined();
  });

  it('required keeps the selection when the selected day is picked again', () => {
    const { host, dayButton, click } = render((h) => {
      h.required.set(true);
      h.selected.set(new Date(2026, 10, 20));
    });
    click(dayButton(/November 20th, 2026/));
    expect(host.selects.at(-1)).toBeInstanceOf(Date);
  });

  it('a disabled day ignores the click', () => {
    const { host, dayButton, click } = render((h) => h.disabled.set({ before: new Date(2026, 10, 10) }));
    click(dayButton(/November 3rd, 2026/));
    expect(host.selects).toHaveLength(0);
  });
});

describe('Calendar range', () => {
  const setRange = (h: Host) => h.mode.set('range');

  it('starts a range on the first pick and ends it on the second', () => {
    const { host, dayButton, click } = render(setRange);
    click(dayButton(/November 9th, 2026/));
    expect((host.selects.at(-1) as DateRange).to).toBeUndefined();
    click(dayButton(/November 13th, 2026/));
    const r = host.selects.at(-1) as DateRange;
    expect(dayNumber(r.from!)).toBe(dayNumber(new Date(2026, 10, 9)));
    expect(dayNumber(r.to!)).toBe(dayNumber(new Date(2026, 10, 13)));
  });

  it('never spans a booked day: the second pick starts over', () => {
    const { host, dayButton, click } = render((h) => {
      setRange(h);
      h.booked.set([new Date(2026, 10, 12)]);
    });
    click(dayButton(/November 9th, 2026/));
    click(dayButton(/November 15th, 2026/));
    const r = host.selects.at(-1) as DateRange;
    expect(dayNumber(r.from!)).toBe(dayNumber(new Date(2026, 10, 15)));
    expect(r.to).toBeUndefined();
  });

  it('fills the day that commits the range end in the same frame', () => {
    const { dayButton, click, flush } = render(setRange);
    click(dayButton(/November 9th, 2026/));
    const end = dayButton(/November 13th, 2026/);
    // Focus proposes the end, as the pointer would.
    end.focus();
    flush();
    expect(end.getAttribute('data-preview-end')).not.toBeNull();
    click(end);
    expect(end.classList.contains('bg-foreground')).toBe(true);
    // No fade: the gliding highlight hands its fill over at once.
    expect(end.classList.contains('transition-none')).toBe(true);
    expect(dayButton(/November 9th, 2026/).classList.contains('transition-none')).toBe(false);
  });

  it('keeps the usual fades when Escape cancels the pick', () => {
    const { el, dayButton, click, key, flush } = render((h) => {
      setRange(h);
      h.selected.set(range(new Date(2026, 10, 2), new Date(2026, 10, 4)));
    });
    click(dayButton(/November 20th, 2026/));
    const end = dayButton(/November 24th, 2026/);
    end.focus();
    flush();
    key(end, 'Escape');
    expect(el.querySelector('button.transition-none')).toBeNull();
  });

  it('puts the previous range back on Escape before the end is picked', () => {
    const initial = range(new Date(2026, 10, 2), new Date(2026, 10, 4));
    const { host, dayButton, click, key } = render((h) => {
      setRange(h);
      h.selected.set(initial);
    });
    const start = dayButton(/November 20th, 2026/);
    click(start);
    expect((host.selects.at(-1) as DateRange).to).toBeUndefined();
    const outside = escapesReaching(() => key(start, 'Escape'));
    const restored = host.selects.at(-1) as DateRange;
    expect(dayNumber(restored.from!)).toBe(dayNumber(initial.from!));
    expect(dayNumber(restored.to!)).toBe(dayNumber(initial.to!));
    expect(dayNumber((host.selected() as DateRange).to!)).toBe(dayNumber(initial.to!));
    // Consumed: a popover around the calendar must not close on it.
    expect(outside).toBe(0);
  });

  it('leaves Escape alone when no pick is in progress', () => {
    const { dayButton, key } = render(setRange);
    expect(escapesReaching(() => key(dayButton(/November 20th, 2026/), 'Escape'))).toBe(1);
  });

  it('draws the band between the ends and fills both ends', () => {
    const { el, dayButton } = render((h) => {
      setRange(h);
      h.selected.set(range(new Date(2026, 10, 9), new Date(2026, 10, 13)));
    });
    expect(dayButton(/November 9th, 2026/).getAttribute('data-selected')).not.toBeNull();
    expect(dayButton(/November 13th, 2026/).getAttribute('data-selected')).not.toBeNull();
    expect(dayButton(/November 11th, 2026/).getAttribute('data-range-middle')).not.toBeNull();
    // The 9th draws the band's right half, the 13th its left half, the
    // middle days the full width.
    expect(el.querySelectorAll('[data-slot=calendar-range-band]').length).toBe(5);
    const cells = Array.from(el.querySelectorAll('[role=gridcell][aria-selected=true]'));
    expect(cells).toHaveLength(5);
    expect(el.querySelector('[role=grid]')!.getAttribute('aria-multiselectable')).toBe('true');
  });

  function corners(dayButton: (n: RegExp) => HTMLButtonElement, day: number, month = 'November') {
    const band = dayButton(new RegExp(`${month} ${day}(st|nd|rd|th), 2026`))
      .closest('[role=gridcell]')!
      .querySelector<HTMLElement>('[data-slot=calendar-range-band]')!;
    const { borderTopLeftRadius: tl, borderBottomLeftRadius: bl } = band.style;
    const { borderTopRightRadius: tr, borderBottomRightRadius: br } = band.style;
    return [tl, tr, br, bl].map((r) => (r === '2px' ? '2' : '0')).join(' ');
  }

  it('gives row ends 2px corners, square where the next row continues the band', () => {
    const { dayButton } = render((h) => {
      setRange(h);
      h.weekStartsOn.set(0);
      h.selected.set(range(new Date(2026, 10, 8), new Date(2026, 10, 28)));
    });
    // Rows 8-14, 15-21, 22-28 (Sunday start). Top-left, top-right,
    // bottom-right, bottom-left.
    expect(corners(dayButton, 14)).toBe('0 2 0 0');
    expect(corners(dayButton, 15)).toBe('2 0 0 0');
    expect(corners(dayButton, 21)).toBe('0 0 2 0');
    expect(corners(dayButton, 22)).toBe('0 0 0 2');
    expect(corners(dayButton, 18)).toBe('0 0 0 0');
  });

  it('stops the band at a month break with 2px corners', () => {
    const { dayButton } = render((h) => {
      setRange(h);
      h.numberOfMonths.set(2);
      h.weekStartsOn.set(0);
      h.month.set(new Date(2026, 9, 1));
      h.selected.set(range(new Date(2026, 9, 27), new Date(2026, 10, 3)));
    });
    const band = (re: RegExp) =>
      dayButton(re).closest('[role=gridcell]')!.querySelector<HTMLElement>('[data-slot=calendar-range-band]')!;
    const last = band(/October 31st, 2026/);
    expect(last.style.right).toBe('0px');
    expect(last.style.borderTopRightRadius).toBe('2px');
    expect(last.style.borderBottomRightRadius).toBe('2px');
    const first = band(/November 1st, 2026/);
    expect(first.style.left).toBe('0px');
    expect(first.style.borderTopLeftRadius).toBe('2px');
    expect(first.style.borderBottomLeftRadius).toBe('2px');
  });

  it('finds row ends from the grid with ISO weeks (Monday start)', () => {
    const { dayButton } = render((h) => {
      setRange(h);
      h.showWeekNumber.set(true);
      h.selected.set(range(new Date(2026, 10, 2), new Date(2026, 10, 18)));
    });
    // Rows 2-8, 9-15, 16-22: Sunday ends a row, Monday starts one.
    expect(corners(dayButton, 7)).toBe('0 0 0 0');
    expect(corners(dayButton, 8)).toBe('0 2 0 0');
    expect(corners(dayButton, 9)).toBe('2 0 0 0');
    expect(corners(dayButton, 15)).toBe('0 0 2 0');
    expect(corners(dayButton, 16)).toBe('0 0 0 2');
  });
});

describe('Calendar day detail', () => {
  it('renders a line under each in-month day and describes the day with it', () => {
    const { el, dayButton } = render((h) => {
      h.cellSize.set(56);
      h.dayDetail.set((d: Date) => (d.getDate() === 4 ? null : `$${100 + d.getDate()}`));
    });
    const day = dayButton(/November 20th, 2026/);
    const detail = day.querySelector('[data-slot=calendar-day-detail]')!;
    expect(detail.textContent).toBe('$120');
    // Read after the date: the button points at the detail.
    expect(day.getAttribute('aria-describedby')).toBe(detail.id);
    // null means no detail.
    expect(dayButton(/November 4th, 2026/).querySelector('[data-slot=calendar-day-detail]')).toBeNull();
    // Outside days skip it.
    expect(el.querySelectorAll('[data-outside] [data-slot=calendar-day-detail]').length).toBe(0);
    expect(el.querySelector<HTMLElement>('ff-calendar')!.style.getPropertyValue('--cell-size')).toBe('56px');
  });
});

describe('Calendar week numbers', () => {
  const visible = (el: HTMLElement, selector: string) =>
    Array.from(el.querySelectorAll<HTMLElement>(selector)).filter((e) => !e.closest('[aria-hidden="true"]'));

  it('uses ISO 8601 numbering with a Monday start by default', () => {
    // 1 January 2027 is a Friday: ISO week 53 of 2026.
    const { el } = render((h) => {
      h.month.set(new Date(2027, 0, 1));
      h.showWeekNumber.set(true);
    });
    const rows = visible(el, '[role=rowheader]');
    expect(rows[0].textContent).toBe('53');
    expect(rows[0].getAttribute('aria-label')).toBe('Week 53');
    expect(rows[1].textContent).toBe('1');
    const headers = Array.from(el.querySelectorAll('[role=columnheader]'));
    // The empty week-number header, then Monday first.
    expect(headers[0].getAttribute('aria-label')).toBe('Week Number');
    expect(headers[1].getAttribute('aria-label')).toBe('Monday');
    expect(headers[1].textContent).toBe('Mo');
  });

  it('follows the locale rules when the week starts on Sunday', () => {
    const { el } = render((h) => {
      h.month.set(new Date(2027, 0, 1));
      h.showWeekNumber.set(true);
      h.weekStartsOn.set(0);
    });
    const headers = Array.from(el.querySelectorAll('[role=columnheader]'));
    expect(headers[1].getAttribute('aria-label')).toBe('Sunday');
    expect(visible(el, '[role=rowheader]')[0].textContent).toBe('1');
  });
});

describe('Calendar two months', () => {
  it('hides outside days so no date renders twice', () => {
    const { buttons } = render((h) => {
      h.numberOfMonths.set(2);
      h.month.set(new Date(2026, 9, 1));
    });
    expect(buttons(/October 31st, 2026/)).toHaveLength(1);
    expect(buttons(/November 1st, 2026/)).toHaveLength(1);
  });

  it('labels each grid with its month and splits the chevrons to the outer edges', () => {
    const { el } = render((h) => {
      h.numberOfMonths.set(2);
      h.month.set(new Date(2026, 9, 1));
    });
    const grids = Array.from(el.querySelectorAll('[role=grid]'));
    expect(grids.map((g) => g.getAttribute('aria-label'))).toEqual(['October 2026', 'November 2026']);
    const navs = Array.from(el.querySelectorAll('[data-calendar-nav]')).map((b) => b.getAttribute('data-calendar-nav'));
    expect(navs).toEqual(['previous', 'next']);
    expect(el.querySelector('[data-slot=calendar-months]')!.getAttribute('data-orientation')).toBe('horizontal');
  });
});

describe('Calendar grid and keyboard', () => {
  it('renders the grid pattern with one roving tab stop on the selected day', () => {
    const { el, dayButton } = render((h) => h.selected.set(new Date(2026, 10, 20)));
    const grid = el.querySelector('[role=grid]')!;
    expect(grid.getAttribute('aria-label')).toBe('November 2026');
    expect(grid.querySelectorAll('[role=row] [role=gridcell]').length).toBe(35);
    const tabbable = Array.from(el.querySelectorAll('[role=grid] button[tabindex="0"]'));
    expect(tabbable).toEqual([dayButton(/November 20th, 2026/)]);
    expect(el.querySelector('[role=status]')!.textContent).toBe('November 2026');
  });

  it('with no selection, the tab stop is the first open day of the month', () => {
    const { el, dayButton } = render((h) => h.disabled.set({ before: new Date(2026, 10, 3) }));
    expect(Array.from(el.querySelectorAll('[role=grid] button[tabindex="0"]'))).toEqual([
      dayButton(/November 3rd, 2026/),
    ]);
  });

  it('arrows move focus by day and week, Home and End to the week ends, skipping disabled days', () => {
    const { dayButton, key } = render((h) => {
      h.weekStartsOn.set(0);
      h.disabled.set([new Date(2026, 10, 11)]);
    });
    const start = dayButton(/November 10th, 2026/);
    start.focus();
    const right = key(start, 'ArrowRight');
    expect(right.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(dayButton(/November 12th, 2026/));
    key(document.activeElement as HTMLElement, 'ArrowDown');
    expect(document.activeElement).toBe(dayButton(/November 19th, 2026/));
    key(document.activeElement as HTMLElement, 'ArrowUp');
    key(document.activeElement as HTMLElement, 'ArrowLeft');
    expect(document.activeElement).toBe(dayButton(/November 10th, 2026/));
    key(document.activeElement as HTMLElement, 'End');
    expect(document.activeElement).toBe(dayButton(/November 14th, 2026/));
    key(document.activeElement as HTMLElement, 'Home');
    expect(document.activeElement).toBe(dayButton(/November 8th, 2026/));
    expect((document.activeElement as HTMLElement).getAttribute('tabindex')).toBe('0');
  });

  it('PageDown changes the month, emits monthChange and keeps the day of the month', () => {
    const { host, dayButton, key, flush } = render();
    const day = dayButton(/November 20th, 2026/);
    day.focus();
    key(day, 'PageDown');
    flush();
    expect(host.months.at(-1)?.getMonth()).toBe(11);
    expect(document.activeElement).toBe(dayButton(/December 20th, 2026/));
    key(document.activeElement as HTMLElement, 'PageUp');
    flush();
    expect(document.activeElement).toBe(dayButton(/November 20th, 2026/));
  });

  it('Enter on a focused day selects it (native button activation)', () => {
    const { host, dayButton, click } = render();
    const day = dayButton(/November 6th, 2026/);
    // A native button turns Enter into a click.
    click(day);
    expect(dayNumber(host.selected() as Date)).toBe(dayNumber(new Date(2026, 10, 6)));
  });

  it('autoFocus focuses the tab stop on mount', () => {
    const { dayButton } = render((h) => {
      h.autoFocus.set(true);
      h.selected.set(new Date(2026, 10, 17));
    });
    expect(document.activeElement).toBe(dayButton(/November 17th, 2026/));
  });

  it('autoFocus keeps the tab stop focused when two months re-wrap their weeks after measuring', async () => {
    const { dayButton, flush, fixture } = render((h) => {
      h.autoFocus.set(true);
      h.mode.set('range');
      h.numberOfMonths.set(2);
      h.selected.set(range(new Date(2026, 10, 17), new Date(2026, 10, 19)));
    });
    await fixture.whenStable();
    flush();
    expect(document.activeElement).toBe(dayButton(/November 17th, 2026/));
  });
});

describe('Calendar navigation', () => {
  it('the chevrons page the month and report it', () => {
    const { host, el, click } = render();
    const next = el.querySelector<HTMLButtonElement>('[data-calendar-nav=next]')!;
    expect(next.getAttribute('aria-label')).toBe('Go to the Next Month');
    click(next);
    expect(host.months.at(-1)?.getMonth()).toBe(11);
    expect(el.querySelector('[role=status]')!.textContent).toBe('December 2026');
    click(el.querySelector<HTMLButtonElement>('[data-calendar-nav=previous]')!);
    expect(host.months.at(-1)?.getMonth()).toBe(10);
  });

  it('disables previous at the start month', () => {
    const { el } = render((h) => h.startMonth.set(NOV));
    const previous = el.querySelector<HTMLButtonElement>('[data-calendar-nav=previous]')!;
    expect(previous.disabled).toBe(true);
    expect(previous.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('Calendar focus ring', () => {
  it('shows a ring on the day the keyboard reached, and drops it on pointer use', async () => {
    const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')!;
    const height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 36 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 36 });
    const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
    try {
      const { el, dayButton, key, flush } = render();
      const day = dayButton(/November 10th, 2026/);
      day.focus();
      key(day, 'ArrowRight');
      await frame();
      await frame();
      flush();
      expect(el.querySelector('[data-slot=calendar-focus-ring]')).not.toBeNull();
      el.querySelector('[data-slot=calendar-months]')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      flush();
      const ring = el.querySelector<HTMLElement>('[data-slot=calendar-focus-ring]');
      // Gone, or fading out.
      expect(ring === null || ring.style.opacity !== '1').toBe(true);
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', width);
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', height);
    }
  });
});
