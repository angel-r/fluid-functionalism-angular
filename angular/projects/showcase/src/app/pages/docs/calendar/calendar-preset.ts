// ---------------------------------------------------------------------------
// The Calendar playground's state, its preset codec and the Angular snippet
// generated from them, ported from lib/docs/playgrounds/calendar.tsx and
// lib/preset/calendar-options.ts (D5).
//
// The codec tables are byte-identical to the React ones, so a code shared from
// fluidfunctionalism.com still decodes here: value arrays keep their order,
// every default stays at index 0, and fields are only ever appended. The three
// site-global fields stay last (D1 dropped the primitive from the panel, but
// `flavor` keeps its slot so old codes decode).
// ---------------------------------------------------------------------------

import {
  decodePreset,
  encodePreset,
  registerPresetComponent,
  type PresetComponentDef,
  type PresetField,
} from '../../../docs-kit/preset/codec';
import type { PresetGlobals } from '../../../docs-kit/preset/preset-globals';

/** Which days can be picked: all of them, all but the booked and past ones,
 *  or Monday to Friday. */
export type CalendarDays = 'all' | 'booked' | 'weekdays';

export interface CalendarPlayState {
  mode: 'single' | 'range';
  months: '1' | '2';
  orientation: 'auto' | 'horizontal' | 'vertical';
  /** "auto" leaves cellSize unset, so the site size picks 36 or 32. */
  cellSize: 'auto' | '40' | '44' | '48';
  weekNumbers: boolean;
  days: CalendarDays;
}

export type CalendarPreset = CalendarPlayState & PresetGlobals;

export const DEFAULT_CALENDAR_STATE: CalendarPlayState = {
  mode: 'range',
  months: '2',
  orientation: 'auto',
  cellSize: 'auto',
  weekNumbers: false,
  days: 'all',
};

// Value arrays are ordered DEFAULT-FIRST, mirroring CALENDAR_PRESET_FIELDS.
export const CALENDAR_PRESET_FIELDS: readonly PresetField[] = [
  { key: 'mode', values: ['range', 'single'], bits: 2 },
  { key: 'months', values: ['2', '1'], bits: 2 },
  { key: 'orientation', values: ['auto', 'horizontal', 'vertical'], bits: 2 },
  { key: 'cellSize', values: ['auto', '40', '44', '48'], bits: 3 },
  { key: 'weekNumbers', values: [false, true], bits: 1 },
  { key: 'days', values: ['all', 'booked', 'weekdays'], bits: 3 },
  { key: 'flavor', values: ['radix', 'base'], bits: 3 },
  { key: 'shape', values: ['rounded', 'pill'], bits: 2 },
  { key: 'size', values: ['default', 'compact'], bits: 2 },
];

// ── Registration (tag "n") ──────────────────────────────────────────────────

export const CALENDAR_PRESET_DEF: PresetComponentDef = {
  tag: 'n',
  label: 'Calendar',
  docsPath: '/docs/calendar',
  versions: { a: CALENDAR_PRESET_FIELDS },
  currentVersion: 'a',
  defaults: {
    ...DEFAULT_CALENDAR_STATE,
    flavor: 'radix',
    shape: 'rounded',
    size: 'default',
  },
  installable: true,
};
registerPresetComponent(CALENDAR_PRESET_DEF);

export function encodeCalendarPreset(config: Partial<CalendarPreset>): string {
  return encodePreset(CALENDAR_PRESET_DEF, { ...config });
}

export type CalendarDecodeResult =
  | { ok: true; preset: CalendarPreset; version: string }
  | { ok: false; error: string };

/** Reads a shared code back into the rail's state, normalising every value so
 *  the result satisfies `CalendarPlayState` (an unknown index falls back to
 *  the field's default, which is why each check names its default). */
export function decodeCalendarPreset(code: string): CalendarDecodeResult {
  const res = decodePreset(code);
  if (!res.ok) return res;
  if (res.def.tag !== 'n') {
    return { ok: false, error: `Not a calendar preset (tag "${res.def.tag}").` };
  }
  const p = res.preset;
  return {
    ok: true,
    version: res.version,
    preset: {
      mode: p['mode'] === 'single' ? 'single' : 'range',
      months: p['months'] === '1' ? '1' : '2',
      orientation:
        p['orientation'] === 'horizontal' || p['orientation'] === 'vertical' ? p['orientation'] : 'auto',
      cellSize:
        p['cellSize'] === '40' || p['cellSize'] === '44' || p['cellSize'] === '48' ? p['cellSize'] : 'auto',
      weekNumbers: p['weekNumbers'] === true,
      days: p['days'] === 'booked' || p['days'] === 'weekdays' ? p['days'] : 'all',
      shape: p['shape'] === 'pill' ? 'pill' : 'rounded',
      size: p['size'] === 'compact' ? 'compact' : 'default',
    },
  };
}

export const CALENDAR_DEFAULT_CODE = encodeCalendarPreset({});

// ── Demo content, shared by the playground preview and the generator ────────

/** Booked nights, in days from today, so the demo always shows some. */
export const CALENDAR_BOOKED_OFFSETS = [4, 5, 6, 12, 19, 20] as const;
/** The days "weekdays" leaves open, Monday to Friday. */
export const CALENDAR_WEEKDAYS = [1, 2, 3, 4, 5] as const;

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Booked nights a few days out, so the demo always shows some. */
export function demoBookedDays(today = new Date()): Date[] {
  return CALENDAR_BOOKED_OFFSETS.map((n) => addDays(today, n));
}

// ── Generated Angular snippet ───────────────────────────────────────────────

/** The configuration above as an Angular component to paste into an app: the
 *  playground's Code tab, and the snippet the Share prompt carries (D5).
 *  `provideFluid()` closes it with the visitor's Shape and Size settings. */
export function buildCalendarPlaygroundCode(o: CalendarPlayState, g: PresetGlobals): string {
  const range = o.mode === 'range';
  const booked = o.days === 'booked';
  const weekdays = o.days === 'weekdays';
  const props = [
    ...(range ? ['mode="range"'] : []),
    range ? '[(selected)]="range"' : '[(selected)]="date"',
    ...(o.months === '2' ? ['[numberOfMonths]="2"'] : []),
    ...(o.months === '2' && o.orientation !== 'auto' ? [`orientation="${o.orientation}"`] : []),
    ...(o.cellSize !== 'auto' ? [`[cellSize]="${o.cellSize}"`] : []),
    ...(o.weekNumbers ? ['showWeekNumber'] : []),
    ...(booked ? ['[booked]="booked"', '[disabled]="past"'] : []),
    ...(weekdays ? ['[available]="weekdays"'] : []),
  ];
  const types = [...(range ? ['type DateRange'] : []), ...(weekdays ? ['type Matcher'] : [])];
  const lines = [
    `import { Component, signal } from '@angular/core';`,
    `import { Calendar, provideFluid${types.length ? `, ${types.join(', ')}` : ''} } from '@angel-r/fluid-functionalism-angular';`,
    ``,
    ...(booked
      ? [
          `const addDays = (date: Date, days: number) =>`,
          `  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);`,
          ``,
        ]
      : []),
    `@Component({`,
    `  selector: 'app-calendar-demo',`,
    `  imports: [Calendar],`,
    '  template: `',
    `    <ff-calendar`,
    ...props.map((prop) => `      ${prop}`),
    `    />`,
    '  `,',
    `})`,
    `export class CalendarDemo {`,
    range
      ? `  protected readonly range = signal<DateRange | undefined>(undefined);`
      : `  protected readonly date = signal<Date | undefined>(new Date());`,
    ...(booked
      ? [
          `  /** Taken nights, counted from today. Replace with your own. */`,
          `  protected readonly booked = [${CALENDAR_BOOKED_OFFSETS.join(', ')}].map((n) => addDays(new Date(), n));`,
          `  protected readonly past = { before: new Date() };`,
        ]
      : []),
    ...(weekdays
      ? [`  protected readonly weekdays: Matcher = { dayOfWeek: [${CALENDAR_WEEKDAYS.join(', ')}] };`]
      : []),
    `}`,
    ``,
    `// app.config.ts`,
    `provideFluid({ shape: '${g.shape}', size: '${g.size}' });`,
  ];
  return lines.join('\n');
}
