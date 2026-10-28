// ---------------------------------------------------------------------------
// The DatePicker playground's state, its preset codec and the Angular snippet
// generated from them, ported from lib/docs/playgrounds/date-picker.tsx and
// lib/preset/date-picker-options.ts (D5).
//
// The codec tables are byte-identical to the React ones (append only, defaults
// at index 0), so a code shared from fluidfunctionalism.com still decodes here.
// The three site-global fields stay last (D1 dropped the primitive from the
// panel, but `flavor` keeps its slot so old codes decode).
// ---------------------------------------------------------------------------

import {
  decodePreset,
  encodePreset,
  registerPresetComponent,
  type PresetComponentDef,
  type PresetField,
} from '../../../docs-kit/preset/codec';
import type { PresetGlobals } from '../../../docs-kit/preset/preset-globals';
import type { DatePickerPreset } from '@angel-r/fluid-functionalism-angular';

/** No time, one time, or a start → end time on the picked day. */
export type DatePickerTime = 'none' | 'time' | 'timeRange';

export interface DatePickerPlayState {
  mode: 'single' | 'range';
  /** The `variant` prop, labeled "Design" in the rail. */
  variant: 'outline' | 'ghost';
  time: DatePickerTime;
  presets: boolean;
  months: '1' | '2';
  orientation: 'auto' | 'horizontal' | 'vertical';
  step: '15' | '30' | '60';
  clock: 'locale' | '12' | '24';
  weekNumbers: boolean;
  days: 'all' | 'booked';
  clearable: boolean;
  disabled: boolean;
  /** The picker's own `size` prop; "site" leaves it unset. Named apart from
   *  the site-global `size` every preset carries. */
  pickerSize: 'site' | 'default' | 'compact';
}

export type DatePickerPresetConfig = DatePickerPlayState & PresetGlobals;

export const DEFAULT_DATE_PICKER_STATE: DatePickerPlayState = {
  mode: 'single',
  variant: 'ghost',
  time: 'timeRange',
  presets: false,
  months: '2',
  orientation: 'horizontal',
  step: '15',
  clock: 'locale',
  weekNumbers: false,
  days: 'all',
  clearable: true,
  disabled: false,
  pickerSize: 'site',
};

// Value arrays are ordered DEFAULT-FIRST, mirroring DATE_PICKER_PRESET_FIELDS.
export const DATE_PICKER_PRESET_FIELDS: readonly PresetField[] = [
  { key: 'variant', values: ['ghost', 'outline'], bits: 2 },
  { key: 'mode', values: ['single', 'range'], bits: 2 },
  { key: 'time', values: ['timeRange', 'none', 'time'], bits: 2 },
  { key: 'step', values: ['15', '30', '60'], bits: 3 },
  { key: 'clock', values: ['locale', '12', '24'], bits: 2 },
  { key: 'presets', values: [false, true], bits: 1 },
  { key: 'months', values: ['2', '1'], bits: 2 },
  { key: 'orientation', values: ['horizontal', 'auto', 'vertical'], bits: 2 },
  { key: 'days', values: ['all', 'booked'], bits: 2 },
  { key: 'weekNumbers', values: [false, true], bits: 1 },
  { key: 'pickerSize', values: ['site', 'default', 'compact'], bits: 2 },
  { key: 'clearable', values: [true, false], bits: 1 },
  { key: 'disabled', values: [false, true], bits: 1 },
  { key: 'flavor', values: ['radix', 'base'], bits: 3 },
  { key: 'shape', values: ['rounded', 'pill'], bits: 2 },
  { key: 'size', values: ['default', 'compact'], bits: 2 },
];

// ── Registration (tag "p") ──────────────────────────────────────────────────

export const DATE_PICKER_PRESET_DEF: PresetComponentDef = {
  tag: 'p',
  label: 'Date Picker',
  docsPath: '/docs/date-picker',
  versions: { a: DATE_PICKER_PRESET_FIELDS },
  currentVersion: 'a',
  defaults: {
    ...DEFAULT_DATE_PICKER_STATE,
    flavor: 'radix',
    shape: 'rounded',
    size: 'default',
  },
  installable: true,
};
registerPresetComponent(DATE_PICKER_PRESET_DEF);

export function encodeDatePickerPreset(config: Partial<DatePickerPresetConfig>): string {
  return encodePreset(DATE_PICKER_PRESET_DEF, { ...config });
}

export type DatePickerDecodeResult =
  | { ok: true; preset: DatePickerPresetConfig; version: string }
  | { ok: false; error: string };

/** Reads a shared code back into the rail's state, normalising every value so
 *  the result satisfies `DatePickerPlayState`. */
export function decodeDatePickerPreset(code: string): DatePickerDecodeResult {
  const res = decodePreset(code);
  if (!res.ok) return res;
  if (res.def.tag !== 'p') {
    return { ok: false, error: `Not a date picker preset (tag "${res.def.tag}").` };
  }
  const p = res.preset;
  const pickerSize = p['pickerSize'];
  return {
    ok: true,
    version: res.version,
    preset: {
      mode: p['mode'] === 'range' ? 'range' : 'single',
      variant: p['variant'] === 'outline' ? 'outline' : 'ghost',
      time: p['time'] === 'none' || p['time'] === 'time' ? p['time'] : 'timeRange',
      presets: p['presets'] === true,
      months: p['months'] === '1' ? '1' : '2',
      orientation:
        p['orientation'] === 'auto' || p['orientation'] === 'vertical' ? p['orientation'] : 'horizontal',
      step: p['step'] === '30' || p['step'] === '60' ? p['step'] : '15',
      clock: p['clock'] === '12' || p['clock'] === '24' ? p['clock'] : 'locale',
      weekNumbers: p['weekNumbers'] === true,
      days: p['days'] === 'booked' ? 'booked' : 'all',
      clearable: p['clearable'] !== false,
      disabled: p['disabled'] === true,
      pickerSize: pickerSize === 'default' || pickerSize === 'compact' ? pickerSize : 'site',
      shape: p['shape'] === 'pill' ? 'pill' : 'rounded',
      size: p['size'] === 'compact' ? 'compact' : 'default',
    },
  };
}

export const DATE_PICKER_DEFAULT_CODE = encodeDatePickerPreset({});

/** The default month count for a mode: 1 for a date, 2 for a range. */
export function defaultDatePickerMonths(mode: DatePickerPlayState['mode']): DatePickerPlayState['months'] {
  return mode === 'range' ? '2' : '1';
}

/** The playground's derived facts, shared by the preview and the generator:
 *  times belong to a single date, presets to a range, and the clear button to
 *  the outline field. */
export function deriveDatePicker(p: DatePickerPlayState): {
  range: boolean;
  time: DatePickerTime;
  presets: boolean;
  clearable: boolean;
} {
  const range = p.mode === 'range';
  return {
    range,
    time: range ? 'none' : p.time,
    presets: range && p.presets,
    clearable: p.variant !== 'outline' || p.clearable,
  };
}

// ── Demo content ────────────────────────────────────────────────────────────

/** Starting times for the time fields. */
export const DATE_PICKER_DEFAULT_TIME = '11:00';
export const DATE_PICKER_DEFAULT_TIME_RANGE = { start: '11:00', end: '12:45' } as const;

/** The demo's booked nights, counted from today. */
export function demoBooking(today = new Date()): Date[] {
  return [3, 4, 5, 11, 12].map((n) => addDays(today, n));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** 4 ranges counted from today. */
export function demoPresets(today = new Date()): DatePickerPreset[] {
  const saturday = (6 - today.getDay() + 7) % 7;
  return [
    { label: 'Next 7 days', range: { from: today, to: addDays(today, 6) } },
    { label: 'Next 14 days', range: { from: today, to: addDays(today, 13) } },
    { label: 'Next 30 days', range: { from: today, to: addDays(today, 29) } },
    { label: 'This weekend', range: { from: addDays(today, saturday), to: addDays(today, saturday + 1) } },
  ];
}

// ── Generated Angular snippet ───────────────────────────────────────────────

/** The configuration above as an Angular component to paste into an app: the
 *  playground's Code tab, and the snippet the Share prompt carries (D5).
 *  `provideFluid()` closes it with the visitor's Shape and Size settings. */
export function buildDatePickerPlaygroundCode(o: DatePickerPlayState, g: PresetGlobals): string {
  const d = deriveDatePicker(o);
  const hasTime = d.time !== 'none';
  const booked = o.days === 'booked';
  const calendarProps = [...(booked ? ['booked', 'disabled: { before: new Date() }'] : []), ...(o.weekNumbers ? ['showWeekNumber: true'] : [])];
  const props = [
    ...(d.range ? ['mode="range"'] : []),
    ...(o.variant === 'ghost' ? ['variant="ghost"'] : []),
    d.range ? '[(value)]="range"' : '[(value)]="date"',
    ...(d.time === 'time' ? ['[(time)]="time"'] : []),
    ...(d.time === 'timeRange' ? ['[(timeRange)]="timeRange"'] : []),
    ...(hasTime && o.step !== '15' ? [`[step]="${o.step}"`] : []),
    ...(hasTime && o.clock !== 'locale' ? [`[hourCycle]="${o.clock}"`] : []),
    ...(d.presets ? ['[presets]="presets"'] : []),
    ...(o.months !== defaultDatePickerMonths(o.mode) ? [`[numberOfMonths]="${o.months}"`] : []),
    ...(o.months === '2' && o.orientation !== 'auto' ? [`orientation="${o.orientation}"`] : []),
    ...(calendarProps.length ? ['[calendarProps]="calendarProps"'] : []),
    ...(!d.clearable ? ['[clearable]="false"'] : []),
    ...(o.disabled ? ['disabled'] : []),
    ...(o.pickerSize !== 'site' ? [`size="${o.pickerSize}"`] : []),
  ];
  const types = [
    ...(d.range ? ['type DateRange'] : []),
    ...(d.presets ? ['type DatePickerPreset'] : []),
    ...(d.time === 'timeRange' ? ['type TimeRange'] : []),
    ...(calendarProps.length ? ['type DatePickerCalendarProps'] : []),
  ];
  const helpers: string[] = [];
  if (booked || d.presets) {
    helpers.push(
      `const addDays = (date: Date, days: number) =>`,
      `  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);`,
      ``,
    );
  }
  if (booked) {
    helpers.push(
      `/** Taken nights, counted from today. Replace with your own. */`,
      `const booked = [4, 5, 6, 12, 19, 20].map((n) => addDays(new Date(), n));`,
      ``,
    );
  }
  if (d.presets) {
    helpers.push(
      `/** Ranges listed beside the calendar, counted from today. */`,
      `const today = new Date();`,
      `const saturday = (6 - today.getDay() + 7) % 7;`,
      `const presets: DatePickerPreset[] = [`,
      `  { label: 'Next 7 days', range: { from: today, to: addDays(today, 6) } },`,
      `  { label: 'Next 14 days', range: { from: today, to: addDays(today, 13) } },`,
      `  { label: 'Next 30 days', range: { from: today, to: addDays(today, 29) } },`,
      `  { label: 'This weekend', range: { from: addDays(today, saturday), to: addDays(today, saturday + 1) } },`,
      `];`,
      ``,
    );
  }
  const lines = [
    `import { Component, signal } from '@angular/core';`,
    `import { DatePicker, provideFluid${types.length ? `, ${types.join(', ')}` : ''} } from '@angel-r/fluid-functionalism-angular';`,
    ``,
    ...helpers,
    `@Component({`,
    `  selector: 'app-date-picker-demo',`,
    `  imports: [DatePicker],`,
    '  template: `',
    `    <ff-date-picker`,
    ...props.map((prop) => `      ${prop}`),
    `    />`,
    '  `,',
    `})`,
    `export class DatePickerDemo {`,
    d.range
      ? `  protected readonly range = signal<DateRange | undefined>(undefined);`
      : `  protected readonly date = signal<Date | undefined>(new Date());`,
    ...(d.time === 'time'
      ? [`  protected readonly time = signal<string | null>('${DATE_PICKER_DEFAULT_TIME}');`]
      : []),
    ...(d.time === 'timeRange'
      ? [
          `  protected readonly timeRange = signal<TimeRange | null>({ start: '${DATE_PICKER_DEFAULT_TIME_RANGE.start}', end: '${DATE_PICKER_DEFAULT_TIME_RANGE.end}' });`,
        ]
      : []),
    ...(calendarProps.length
      ? [
          `  protected readonly calendarProps: DatePickerCalendarProps = {`,
          ...calendarProps.map((entry) => `    ${entry},`),
          `  };`,
        ]
      : []),
    `}`,
    ``,
    `// app.config.ts`,
    `provideFluid({ shape: '${g.shape}', size: '${g.size}' });`,
  ];
  return lines.join('\n');
}
