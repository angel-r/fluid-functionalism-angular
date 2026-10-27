/**
 * DatePicker through its public interface. Ports the component cases of
 * tests/date-picker.test.tsx (one implementation, so one flavor): it opens
 * with focus on the selected day, Escape closes it and hands focus back to
 * the trigger, the popup stays mounted through its exit, a pick closes it, a
 * typed time commits on Enter, a named picker submits through a hidden input,
 * and the duration steps aside while the end time is edited. Then one test
 * per rule of the React core: the trigger's ARIA and labels, range picks and
 * Escape mid-pick, presets, the clear button, outside presses, the time slot
 * lists, the time range rules, controlled open, variants and disabled.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Calendar } from '../calendar/calendar';
import { vi } from 'vitest';
import { DatePicker, type DatePickerCalendarProps, type DatePickerPreset } from './date-picker';
import type { DateRange } from '../calendar/calendar-dates';
import type { TimeRange } from './date-picker-labels';

type Value = Date | DateRange | undefined;

/** Pick acknowledgment (200ms) + the exit fallback, with slack. */
const CLOSE_MS = 1000;

// Intl puts a narrow no-break space before AM/PM in recent ICU versions.
const plain = (s: string | null | undefined) => (s ?? '').replace(/[  ]/g, ' ');

@Component({
  imports: [DatePicker],
  template: `
    <form>
      <ff-date-picker
        [mode]="mode()"
        [variant]="variant()"
        [(value)]="value"
        [(time)]="time"
        [(timeRange)]="timeRange"
        [presets]="presets()"
        [hourCycle]="hourCycle()"
        [locale]="locale()"
        [name]="name()"
        [clearable]="clearable()"
        [disabled]="disabled()"
        [placeholder]="placeholder()"
        [step]="step()"
        [size]="size()"
        [calendarProps]="calendarProps()"
        [open]="open()"
        class="extra-group"
        (valueChange)="values.push($event)"
        (timeChange)="times.push($event)"
        (timeRangeChange)="timeRanges.push($event)"
        (openChange)="opens.push($event)"
      />
    </form>
    <button type="button" data-testid="outside">Outside</button>
  `,
})
class Host {
  readonly mode = signal<'single' | 'range'>('single');
  readonly variant = signal<'outline' | 'ghost'>('outline');
  readonly value = signal<Value>(new Date(2026, 9, 21));
  readonly time = signal<string | null | undefined>(undefined);
  readonly timeRange = signal<TimeRange | null | undefined>(undefined);
  readonly presets = signal<DatePickerPreset[] | undefined>(undefined);
  readonly hourCycle = signal<12 | 24 | undefined>(undefined);
  readonly locale = signal<string | undefined>('en-US');
  readonly name = signal<string | undefined>(undefined);
  readonly clearable = signal(true);
  readonly disabled = signal(false);
  readonly placeholder = signal<string | undefined>(undefined);
  readonly step = signal(15);
  readonly size = signal<'default' | 'compact' | undefined>(undefined);
  readonly calendarProps = signal<DatePickerCalendarProps | undefined>(undefined);
  readonly open = signal<boolean | undefined>(undefined);
  readonly values: Value[] = [];
  readonly times: (string | null | undefined)[] = [];
  readonly timeRanges: (TimeRange | null | undefined)[] = [];
  readonly opens: boolean[] = [];
}

@Component({
  imports: [DatePicker],
  template: `<ff-date-picker id="check-in" aria-label="Check-in" [value]="day" locale="en-US" />`,
})
class LabelledHost {
  readonly day = new Date(2026, 9, 21);
}

beforeEach(() => {
  // Only Date is faked: today is pinned, timers and frames stay real.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 19, 10, 7));
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
});

afterEach(() => {
  vi.useRealTimers();
  delete (document.documentElement as { clientWidth?: number }).clientWidth;
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
});

function setup(configure: (h: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.autoDetectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const host = fixture.componentInstance;
  const group = () => el.querySelector<HTMLElement>('[data-slot=date-picker]')!;
  const trigger = () => el.querySelector<HTMLButtonElement>('[data-slot=date-picker-trigger]')!;
  const popup = () => document.querySelector<HTMLElement>('[data-slot=date-picker-popup]');
  const outside = el.querySelector<HTMLElement>('[data-testid=outside]')!;
  const combobox = (name: string) => el.querySelector<HTMLInputElement>(`input[role=combobox][aria-label="${name}"]`)!;
  const clear = () => el.querySelector<HTMLButtonElement>('[data-slot=date-picker-clear]');
  const dayButton = (name: RegExp) =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('[data-slot=date-picker-popup] button[aria-label]')).find(
      (b) => !b.closest('[aria-hidden="true"]') && name.test(b.getAttribute('aria-label') ?? ''),
    )!;
  const click = (target: HTMLElement) => {
    target.click();
    TestBed.tick();
  };
  const press = (target: HTMLElement) => {
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    target.click();
    TestBed.tick();
  };
  const key = (target: Element, k: string) => {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    TestBed.tick();
    return event;
  };
  const type = (input: HTMLInputElement, text: string) => {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    TestBed.tick();
  };
  const focus = (target: HTMLElement) => {
    target.focus();
    TestBed.tick();
  };
  const open = async () => {
    click(trigger());
    await vi.waitFor(() => expect(popup()).not.toBeNull());
  };
  return { fixture, host, el, group, trigger, popup, outside, combobox, clear, dayButton, click, press, key, type, focus, open };
}

describe('date picker popover (ported)', () => {
  it('opens with focus on the selected day', async () => {
    const t = setup();
    expect(t.trigger().textContent).toContain('Oct 21');
    await t.open();
    await vi.waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toMatch(/October 21st, 2026/));
  });

  it('closes on Escape, returns focus to the trigger, and plays its exit', async () => {
    const t = setup();
    await t.open();
    await vi.waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toMatch(/October 21st, 2026/));
    // Read the popup in the same commit that marks the trigger closed: it
    // must still be mounted there, for its exit spring.
    let mountedAtClose: boolean | null = null;
    const observer = new MutationObserver(() => {
      if (mountedAtClose === null && t.trigger().getAttribute('aria-expanded') === 'false') {
        mountedAtClose = t.popup() !== null;
      }
    });
    observer.observe(t.trigger(), { attributes: true, attributeFilter: ['aria-expanded'] });
    t.key(document.activeElement!, 'Escape');
    await vi.waitFor(() => expect(t.trigger().getAttribute('aria-expanded')).toBe('false'));
    observer.disconnect();
    expect(mountedAtClose).toBe(true);
    // ...and gone once it has played.
    await vi.waitFor(() => expect(t.popup()).toBeNull(), { timeout: CLOSE_MS });
    await vi.waitFor(() => expect(document.activeElement).toBe(t.trigger()));
  });

  it('closes after a pick and reports the date', async () => {
    const t = setup();
    await t.open();
    t.click(t.dayButton(/October 23rd, 2026/));
    expect((t.host.values.at(-1) as Date).getDate()).toBe(23);
    await vi.waitFor(() => expect(t.trigger().getAttribute('aria-expanded')).toBe('false'), { timeout: CLOSE_MS });
    expect(t.trigger().textContent).toContain('Oct 23');
  });

  it('commits a typed time on Enter', () => {
    const t = setup((h) => {
      h.time.set('11:00');
      h.hourCycle.set(24);
    });
    const input = t.combobox('Time');
    t.focus(input);
    t.type(input, '1130');
    t.key(input, 'Enter');
    expect(t.host.times.at(-1)).toBe('11:30');
    expect(t.host.time()).toBe('11:30');
    expect(input.value).toBe('11:30');
  });

  it('submits its value through a hidden input when named', () => {
    const t = setup((h) => {
      h.name.set('when');
      h.time.set('11:00');
    });
    const form = t.el.querySelector('form')!;
    expect(new FormData(form).get('when')).toBe('2026-10-21T11:00');
  });

  it('hides the duration while the end time is being edited, keeping its width', () => {
    const t = setup((h) => {
      h.timeRange.set({ start: '11:00', end: '12:45' });
      h.hourCycle.set(24);
    });
    const duration = () => t.el.querySelector<HTMLElement>('[data-slot=date-picker-duration]')!;
    // Hidden but still laid out, so the field keeps its width.
    const hidden = () => duration().parentElement!.classList.contains('invisible');
    expect(duration().textContent).toBe('1h 45min');
    expect(hidden()).toBe(false);
    const end = t.combobox('End time');
    t.focus(end);
    expect(hidden()).toBe(true);
    t.key(end, 'Escape');
    expect(hidden()).toBe(false);
  });
});

describe('date picker trigger', () => {
  it('is a dialog trigger whose aria-expanded follows the popover, and a second click closes it', async () => {
    const t = setup();
    expect(t.trigger().getAttribute('aria-haspopup')).toBe('dialog');
    expect(t.trigger().getAttribute('aria-expanded')).toBe('false');
    await t.open();
    expect(t.trigger().getAttribute('aria-expanded')).toBe('true');
    const dialog = document.getElementById(t.trigger().getAttribute('aria-controls')!)!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.contains(t.popup())).toBe(true);
    expect(t.host.opens).toEqual([true]);
    t.press(t.trigger());
    expect(t.trigger().getAttribute('aria-expanded')).toBe('false');
    expect(t.host.opens).toEqual([true, false]);
  });

  it('shows the placeholder while empty: "Pick a date", "Pick dates" in range mode, or the given one', () => {
    const t = setup((h) => h.value.set(undefined));
    expect(t.trigger().hasAttribute('data-placeholder')).toBe(true);
    expect(t.trigger().classList.contains('text-muted-foreground')).toBe(true);
    expect(t.trigger().querySelector('span > span')!.textContent).toBe('Pick a date');
    t.host.mode.set('range');
    TestBed.tick();
    expect(t.trigger().querySelector('span > span')!.textContent).toBe('Pick dates');
    t.host.placeholder.set('Check in → check out');
    TestBed.tick();
    expect(t.trigger().querySelector('span > span')!.textContent).toBe('Check in → check out');
  });

  it('reads the date with the year only outside the current one', () => {
    const t = setup();
    expect(t.trigger().querySelector('span > span')!.textContent).toBe('Wed Oct 21');
    expect(t.trigger().hasAttribute('data-placeholder')).toBe(false);
    t.host.value.set(new Date(2027, 9, 21));
    TestBed.tick();
    expect(t.trigger().querySelector('span > span')!.textContent).toBe('Thu Oct 21, 2027');
  });

  it('names the group, reads the label before the date, and puts the id on the trigger', () => {
    const fixture = TestBed.createComponent(LabelledHost);
    fixture.autoDetectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const group = el.querySelector<HTMLElement>('[data-slot=date-picker]')!;
    const trigger = el.querySelector<HTMLElement>('[data-slot=date-picker-trigger]')!;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Check-in');
    expect(trigger.getAttribute('aria-label')).toBe('Check-in: Wed Oct 21');
    expect(trigger.id).toBe('check-in');
    expect(el.querySelectorAll('#check-in')).toHaveLength(1);
  });

  it('outline is a bordered field with a calendar icon; ghost is inline text', () => {
    const t = setup();
    expect(t.group().getAttribute('data-variant')).toBe('outline');
    expect(t.group().classList.contains('border')).toBe(true);
    expect(t.group().classList.contains('extra-group')).toBe(true);
    expect(t.trigger().querySelector('svg')).not.toBeNull();
    t.host.variant.set('ghost');
    TestBed.tick();
    expect(t.group().getAttribute('data-variant')).toBe('ghost');
    expect(t.group().classList.contains('border')).toBe(false);
    expect(t.trigger().querySelector('svg')).toBeNull();
  });

  it('disables the whole picker', () => {
    const t = setup((h) => {
      h.disabled.set(true);
      h.time.set('11:00');
    });
    expect(t.trigger().disabled).toBe(true);
    expect(t.combobox('Time').disabled).toBe(true);
    expect(t.group().classList.contains('pointer-events-none')).toBe(true);
    expect(t.group().classList.contains('opacity-50')).toBe(true);
  });

  it('pins the compact step of the size ladder', () => {
    const t = setup((h) => h.size.set('compact'));
    expect(t.group().classList.contains('h-7')).toBe(true);
    expect(t.group().classList.contains('min-w-[128px]')).toBe(true);
  });
});

describe('date picker popover', () => {
  it('flips above its trigger when the popup does not fit below', async () => {
    // The side is chosen from the popup's measured height, so the popup must
    // be rendered when it is measured: an empty one always "fits" below.
    Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 900 });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.querySelector('[data-slot=date-picker-popup]') ? 300 : 0;
    });
    const t = setup();
    vi.spyOn(t.trigger(), 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 830, 200, 30));
    await t.open();
    await vi.waitFor(() => expect(t.popup()!.closest('[data-side]')?.getAttribute('data-side')).toBe('top'));
    vi.restoreAllMocks();
  });

  it('closes on a press outside the picker', async () => {
    const t = setup();
    await t.open();
    t.press(t.outside);
    expect(t.trigger().getAttribute('aria-expanded')).toBe('false');
    await vi.waitFor(() => expect(t.popup()).toBeNull(), { timeout: CLOSE_MS });
  });

  it('a press inside the popup keeps it open', async () => {
    const t = setup();
    await t.open();
    t.press(t.popup()!);
    expect(t.trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('follows a bound open, reporting requests without closing', async () => {
    const t = setup((h) => h.open.set(true));
    await vi.waitFor(() => expect(t.popup()).not.toBeNull());
    t.press(t.trigger());
    expect(t.host.opens).toEqual([false]);
    expect(t.trigger().getAttribute('aria-expanded')).toBe('true');
    t.host.open.set(false);
    TestBed.tick();
    expect(t.trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('opens on the value month, or on today without one', async () => {
    const t = setup((h) => h.value.set(new Date(2027, 2, 9)));
    await t.open();
    expect(t.dayButton(/March 9th, 2027/)).toBeTruthy();
    t.key(document.activeElement!, 'Escape');
    await vi.waitFor(() => expect(t.popup()).toBeNull(), { timeout: CLOSE_MS });
    t.host.value.set(undefined);
    TestBed.tick();
    await t.open();
    expect(t.dayButton(/October 19th, 2026/)).toBeTruthy();
  });

  it('draws the calendar in English unless a locale is given, whatever the browser locale', async () => {
    // React passes no locale to its calendar, so DayPicker stays en-US.
    const resolved = Intl.DateTimeFormat.prototype.resolvedOptions;
    const spy = vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function (this: Intl.DateTimeFormat) {
      return { ...resolved.call(this), locale: 'es-ES' };
    });
    const t = setup((h) => h.locale.set(undefined));
    await t.open();
    const calendar = () => t.fixture.debugElement.query(By.directive(Calendar)).componentInstance as Calendar;
    expect(calendar().locale()).toBe('en-US');
    spy.mockRestore();
    t.host.locale.set('de-DE');
    TestBed.tick();
    expect(calendar().locale()).toBe('de-DE');
  });

  it('reaches the calendar through calendarProps', async () => {
    const t = setup((h) => h.calendarProps.set({ booked: [new Date(2026, 9, 22)] }));
    await t.open();
    expect(t.dayButton(/October 22nd, 2026/).getAttribute('aria-label')).toMatch(/booked/i);
  });
});

describe('date picker range', () => {
  it('keeps a half-picked range to itself, then commits the whole range and closes', async () => {
    const t = setup((h) => {
      h.mode.set('range');
      h.value.set(undefined);
    });
    await t.open();
    t.click(t.dayButton(/October 21st, 2026/));
    expect(t.host.values).toEqual([]);
    expect(t.trigger().getAttribute('aria-expanded')).toBe('true');
    t.click(t.dayButton(/October 24th, 2026/));
    const range = t.host.values.at(-1) as DateRange;
    expect(range.from?.getDate()).toBe(21);
    expect(range.to?.getDate()).toBe(24);
    await vi.waitFor(() => expect(t.trigger().getAttribute('aria-expanded')).toBe('false'), { timeout: CLOSE_MS });
    expect(t.trigger().querySelector('span > span')!.textContent).toBe('Oct 21 → Oct 24');
  });

  it('Escape mid-pick puts the previous range back and keeps the popover open', async () => {
    const previous = { from: new Date(2026, 9, 5), to: new Date(2026, 9, 7) };
    const t = setup((h) => {
      h.mode.set('range');
      h.value.set(previous);
    });
    await t.open();
    t.click(t.dayButton(/October 21st, 2026/));
    t.key(t.dayButton(/October 21st, 2026/), 'Escape');
    expect(t.trigger().getAttribute('aria-expanded')).toBe('true');
    expect(t.host.values).toEqual([]);
    expect(t.host.value()).toBe(previous);
    // A second Escape, with nothing picked, closes.
    t.key(document.activeElement ?? t.popup()!, 'Escape');
    expect(t.trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('lists presets beside the calendar; a preset sets the range and is marked pressed', async () => {
    const presets: DatePickerPreset[] = [
      { label: 'Next 7 days', range: { from: new Date(2026, 9, 19), to: new Date(2026, 9, 25) } },
      { label: 'Next 14 days', range: { from: new Date(2026, 9, 19), to: new Date(2026, 10, 1) } },
    ];
    const t = setup((h) => {
      h.mode.set('range');
      h.value.set(undefined);
      h.presets.set(presets);
    });
    await t.open();
    const group = document.querySelector<HTMLElement>('[data-slot=date-picker-presets]')!;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Presets');
    const rows = Array.from(group.querySelectorAll<HTMLButtonElement>('button[data-preset-index]'));
    // The visible label is the last span; the first is its invisible bold sizer.
    expect(rows.map((r) => r.querySelector('span > span:last-child')?.textContent)).toEqual([
      'Next 7 days',
      'Next 14 days',
    ]);
    expect(rows.every((r) => r.getAttribute('aria-pressed') === 'false')).toBe(true);
    t.click(rows[1]);
    expect(t.host.values.at(-1)).toBe(presets[1].range);
    expect(rows[1].getAttribute('aria-pressed')).toBe('true');
    expect(rows[0].getAttribute('aria-pressed')).toBe('false');
  });
});

describe('date picker clear', () => {
  it('appears once there is a value and clears the date and the time', async () => {
    const t = setup((h) => h.time.set('11:00'));
    expect(t.clear()!.getAttribute('aria-label')).toBe('Clear');
    t.click(t.clear()!);
    expect(t.host.values).toEqual([undefined]);
    expect(t.host.times).toEqual([null]);
    expect(t.trigger().hasAttribute('data-placeholder')).toBe(true);
    // It fades out, then leaves.
    await vi.waitFor(() => expect(t.clear()).toBeNull(), { timeout: CLOSE_MS });
  });

  it('clears a time range too', () => {
    const t = setup((h) => h.timeRange.set({ start: '11:00', end: '12:45' }));
    t.click(t.clear()!);
    expect(t.host.timeRanges).toEqual([null]);
  });

  it('is absent when empty, for ghost, and with clearable false', () => {
    const t = setup((h) => h.value.set(undefined));
    expect(t.clear()).toBeNull();
    t.host.value.set(new Date(2026, 9, 21));
    t.host.variant.set('ghost');
    TestBed.tick();
    expect(t.clear()).toBeNull();
    t.host.variant.set('outline');
    t.host.clearable.set(false);
    TestBed.tick();
    expect(t.clear()).toBeNull();
  });
});

describe('date picker time field', () => {
  const listbox = () => document.querySelector<HTMLElement>('[role=listbox]');
  const options = () => Array.from(document.querySelectorAll<HTMLElement>('[role=option]'));

  it('is a combobox that opens its slot list on focus, on the shown time', async () => {
    const t = setup((h) => {
      h.time.set('11:00');
      h.hourCycle.set(24);
    });
    const input = t.combobox('Time');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.value).toBe('11:00');
    t.focus(input);
    await vi.waitFor(() => expect(listbox()).not.toBeNull());
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(listbox()!.id);
    expect(options()).toHaveLength(96);
    const selected = options().filter((o) => o.getAttribute('aria-selected') === 'true');
    expect(selected.map((o) => o.textContent?.trim().slice(-5))).toEqual(['11:00']);
    expect(input.getAttribute('aria-activedescendant')).toBe(selected[0].id);
  });

  it('arrows through the slots, showing each in the field, and Enter commits it', async () => {
    const t = setup((h) => {
      h.time.set('11:00');
      h.hourCycle.set(24);
    });
    const input = t.combobox('Time');
    t.focus(input);
    t.key(input, 'ArrowDown');
    expect(input.value).toBe('11:15');
    t.key(input, 'ArrowDown');
    t.key(input, 'ArrowUp');
    expect(input.value).toBe('11:15');
    t.key(input, 'Enter');
    expect(t.host.times.at(-1)).toBe('11:15');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('commits a clicked slot', async () => {
    const t = setup((h) => {
      h.time.set(null);
      h.hourCycle.set(24);
      h.step.set(30);
    });
    const input = t.combobox('Time');
    expect(input.placeholder).toBe('Time');
    t.focus(input);
    await vi.waitFor(() => expect(options()).toHaveLength(48));
    const row = options().find((o) => o.textContent?.includes('14:30'))!;
    t.press(row);
    expect(t.host.times.at(-1)).toBe('14:30');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('drops a typed draft that is not a time on blur', () => {
    const t = setup((h) => {
      h.time.set('11:00');
      h.hourCycle.set(24);
    });
    const input = t.combobox('Time');
    t.focus(input);
    t.type(input, 'abc');
    input.blur();
    TestBed.tick();
    expect(t.host.times).toEqual([]);
    expect(input.value).toBe('11:00');
  });

  it("formats on the locale's clock, or the hourCycle override", () => {
    const t = setup((h) => h.time.set('11:00'));
    expect(plain(t.combobox('Time').value)).toBe('11:00 AM');
    t.host.hourCycle.set(24);
    TestBed.tick();
    expect(t.combobox('Time').value).toBe('11:00');
  });

  it('moving the start keeps the duration', () => {
    const t = setup((h) => {
      h.timeRange.set({ start: '11:00', end: '12:45' });
      h.hourCycle.set(24);
    });
    const start = t.combobox('Start time');
    t.focus(start);
    t.type(start, '12:00');
    t.key(start, 'Enter');
    expect(t.host.timeRanges.at(-1)).toEqual({ start: '12:00', end: '13:45' });
  });

  it('an end at or before the start is not taken; the end list counts from the start', async () => {
    const t = setup((h) => {
      h.timeRange.set({ start: '11:00', end: '12:45' });
      h.hourCycle.set(24);
    });
    const end = t.combobox('End time');
    t.focus(end);
    await vi.waitFor(() => expect(options().length).toBeGreaterThan(0));
    expect(options()[0].textContent).toContain('11:15');
    expect(options()[0].textContent).toContain('15min');
    t.type(end, '10:00');
    t.key(end, 'Enter');
    expect(t.host.timeRanges).toEqual([]);
    expect(end.value).toBe('12:45');
  });

  it('an empty start takes the end an hour after it', () => {
    const t = setup((h) => {
      h.timeRange.set(null);
      h.hourCycle.set(24);
    });
    const start = t.combobox('Start time');
    t.focus(start);
    t.type(start, '9');
    t.key(start, 'Enter');
    expect(t.host.timeRanges.at(-1)).toEqual({ start: '09:00', end: '10:00' });
  });
});
