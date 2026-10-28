// ---------------------------------------------------------------------------
// /docs/date-picker, ported from app/docs/date-picker/page.tsx: the
// playground, the single date, the range with presets, the two time field
// shapes, the booked-days calendar, and the API reference. Copy and classes
// follow the reference; the Code tabs, the install prompt and the Share
// prompt carry the Angular forms.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  DatePicker,
  Switch,
  fontWeights,
  type DatePickerCalendarProps,
  type DatePickerValue,
  type TimeRange,
} from '@angel-r/fluid-functionalism-angular';
import { API_REFERENCE } from '../../../docs-kit/api';
import type { PropDef } from '../../../docs-kit/api/types';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import {
  PLAY_SWITCH,
  PlayDivider,
  PlayField,
  PlaySelect,
  PlaygroundLayout,
  PlaygroundPanel,
  type PlayOption,
} from '../../../docs-kit/playground';
import { GetCodeDialog } from '../../../docs-kit/preset/get-code-dialog';
import { injectPresetGlobals } from '../../../docs-kit/preset/preset-globals';
import { usePresetUrl } from '../../../docs-kit/preset/preset-url';
import { PropsTable } from '../../../docs-kit/props-table';
import { demoBookedDays } from '../calendar/calendar-preset';
import {
  DATE_PICKER_DEFAULT_CODE,
  DATE_PICKER_DEFAULT_TIME,
  DATE_PICKER_DEFAULT_TIME_RANGE,
  DATE_PICKER_PRESET_DEF,
  DEFAULT_DATE_PICKER_STATE,
  buildDatePickerPlaygroundCode,
  decodeDatePickerPreset,
  defaultDatePickerMonths,
  demoBooking,
  demoPresets,
  encodeDatePickerPreset,
  type DatePickerPlayState,
} from './date-picker-preset';

/** The install prompt's one line per prop. */
function promptProps(tables: readonly { props: PropDef[] }[]): string[] {
  return tables.flatMap((table) =>
    table.props.map(
      (prop) =>
        `${prop.name}: ${prop.type}${prop.default !== undefined ? ` (default ${prop.default})` : ''} — ${prop.description}`,
    ),
  );
}

function pick<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

const DEFAULT_CODE = signal(DATE_PICKER_DEFAULT_CODE);

@Component({
  selector: 'app-date-picker-page',
  imports: [
    DocPage,
    DocSection,
    ComponentPreview,
    PropsTable,
    PlaygroundLayout,
    PlaygroundPanel,
    PlayField,
    PlaySelect,
    PlayDivider,
    GetCodeDialog,
    DatePicker,
    Switch,
  ],
  template: `
    <app-doc-page
      title="DatePicker"
      slug="date-picker"
      description="Outline or ghost trigger for a date, a range, or a date and a time: a calendar popover with presets, and time slot lists that show each duration."
      [installUsage]="singleCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Playground">
        <app-playground-layout [preview]="playPreview" [controls]="playControls" />

        <!-- The playground's live preview: what gets picked (a date, a range,
             a date with a time or a time range), and every prop that changes
             what the popovers show. -->
        <ng-template #playPreview>
          <app-component-preview
            [code]="playgroundCode()"
            padding="none"
            align="top"
            [minHeightClass]="'min-h-[480px]'"
          >
            <!-- Top left, so the row never slides sideways as its fields
                 change width. -->
            <div class="flex w-full justify-start px-6 py-16">
              @if (state().mode === 'range') {
                <ff-date-picker
                  mode="range"
                  [variant]="state().variant"
                  [numberOfMonths]="playMonths()"
                  [orientation]="state().orientation"
                  [step]="playStep()"
                  [hourCycle]="playHourCycle()"
                  [calendarProps]="playCalendarProps()"
                  [clearable]="state().clearable"
                  [disabled]="state().disabled"
                  [size]="playSize()"
                  [presets]="playPresets()"
                  [(value)]="playRange"
                />
              } @else if (state().time === 'time') {
                <ff-date-picker
                  [variant]="state().variant"
                  [numberOfMonths]="playMonths()"
                  [orientation]="state().orientation"
                  [step]="playStep()"
                  [hourCycle]="playHourCycle()"
                  [calendarProps]="playCalendarProps()"
                  [clearable]="state().clearable"
                  [disabled]="state().disabled"
                  [size]="playSize()"
                  [(value)]="playDate"
                  [(time)]="playTime"
                />
              } @else if (state().time === 'timeRange') {
                <ff-date-picker
                  [variant]="state().variant"
                  [numberOfMonths]="playMonths()"
                  [orientation]="state().orientation"
                  [step]="playStep()"
                  [hourCycle]="playHourCycle()"
                  [calendarProps]="playCalendarProps()"
                  [clearable]="state().clearable"
                  [disabled]="state().disabled"
                  [size]="playSize()"
                  [(value)]="playDate"
                  [(timeRange)]="playTimeRange"
                />
              } @else {
                <ff-date-picker
                  [variant]="state().variant"
                  [numberOfMonths]="playMonths()"
                  [orientation]="state().orientation"
                  [step]="playStep()"
                  [hourCycle]="playHourCycle()"
                  [calendarProps]="playCalendarProps()"
                  [clearable]="state().clearable"
                  [disabled]="state().disabled"
                  [size]="playSize()"
                  [(value)]="playDate"
                />
              }
            </div>
          </app-component-preview>
        </ng-template>

        <!-- The controls, shown inline below the preview until the right rail
             exists (>=1280px). -->
        <ng-template #playControls>
          <app-playground-panel (shuffle)="randomize()">
            <app-play-field label="Design">
              <app-play-select
                [value]="state().variant"
                [options]="variantOptions"
                (valueChange)="set('variant', $event)"
              />
            </app-play-field>
            <app-play-field label="Mode">
              <app-play-select
                [value]="state().mode"
                [options]="modeOptions"
                (valueChange)="changeMode($event)"
              />
            </app-play-field>
            <app-play-field label="Time" [disabled]="isRange()">
              <app-play-select
                [value]="state().time"
                [options]="timeOptions"
                (valueChange)="set('time', $event)"
              />
            </app-play-field>
            <app-play-field label="Step" [disabled]="!hasTime()">
              <app-play-select
                [value]="state().step"
                [options]="stepOptions"
                (valueChange)="set('step', $event)"
              />
            </app-play-field>
            <app-play-field label="Clock" [disabled]="!hasTime()">
              <app-play-select
                [value]="state().clock"
                [options]="clockOptions"
                (valueChange)="set('clock', $event)"
              />
            </app-play-field>
            <ff-switch
              label="Presets"
              [checked]="state().presets"
              [disabled]="!isRange()"
              (toggle)="set('presets', !state().presets)"
              [class]="playSwitch"
            />
            <app-play-divider />
            <app-play-field label="Months">
              <app-play-select
                [value]="state().months"
                [options]="monthOptions"
                (valueChange)="set('months', $event)"
              />
            </app-play-field>
            <app-play-field label="Orientation" [disabled]="state().months === '1'">
              <app-play-select
                [value]="state().orientation"
                [options]="orientationOptions"
                (valueChange)="set('orientation', $event)"
              />
            </app-play-field>
            <app-play-field label="Days">
              <app-play-select
                [value]="state().days"
                [options]="daysOptions"
                (valueChange)="set('days', $event)"
              />
            </app-play-field>
            <ff-switch
              label="Week numbers"
              [checked]="state().weekNumbers"
              (toggle)="set('weekNumbers', !state().weekNumbers)"
              [class]="playSwitch"
            />
            <app-play-divider />
            <app-play-field label="Size">
              <app-play-select
                [value]="state().pickerSize"
                [options]="sizeOptions"
                (valueChange)="set('pickerSize', $event)"
              />
            </app-play-field>
            <ff-switch
              label="Clearable"
              [checked]="state().clearable"
              [disabled]="state().variant !== 'outline'"
              (toggle)="set('clearable', !state().clearable)"
              [class]="playSwitch"
            />
            <ff-switch
              label="Disabled"
              [checked]="state().disabled"
              (toggle)="set('disabled', !state().disabled)"
              [class]="playSwitch"
            />
            <app-play-divider />
            <!-- The exact configuration above, as a stateless code the registry
                 can turn into an installable block. -->
            <app-get-code-dialog
              [def]="presetDef"
              [code]="presetCode()"
              [snippet]="playgroundCode()"
            />
          </app-playground-panel>
        </ng-template>
      </app-doc-section>

      <app-doc-section title="Date">
        <p class="text-site-body text-muted-foreground">
          Opens on the selected day, or today. Pick one and it closes.
        </p>
        <app-component-preview [code]="singleCode" [minHeightClass]="'min-h-[420px]'" align="top">
          <div class="w-full">
            <ff-date-picker [(value)]="date" />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Range with presets">
        <p class="text-site-body text-muted-foreground">
          Pick a start and an end, or a preset. It closes once the end is set;
          <code>Escape</code> mid-pick puts the previous range back.
        </p>
        <app-component-preview [code]="rangeCode" [minHeightClass]="'min-h-[460px]'" align="top">
          <div class="w-full">
            <ff-date-picker mode="range" [(value)]="range" [presets]="presets" />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Date and time">
        <p class="text-site-body text-muted-foreground">
          2 segments, 2 popovers. Type <code>1130</code> or <code>11:30am</code> in a time, or
          arrow through the slots. The end list counts the duration from the start.
        </p>
        <app-component-preview [code]="eventCode" [minHeightClass]="'min-h-[420px]'" align="top">
          <div class="flex w-full flex-col gap-1">
            <div
              class="px-2 text-site-title text-foreground"
              [style.font-variation-settings]="semibold"
            >
              Design review
            </div>
            <div class="flex items-center gap-2">
              <span class="w-20 px-2 text-site-body text-muted-foreground">When</span>
              <ff-date-picker
                variant="ghost"
                [(value)]="eventDate"
                [(timeRange)]="eventTime"
              />
            </div>
          </div>
        </app-component-preview>
        <p class="text-site-body text-muted-foreground">
          <code>time</code> takes one time instead. <code>step</code> sets the minutes between
          slots.
        </p>
        <app-component-preview [code]="timeCode" [minHeightClass]="'min-h-[420px]'" align="top">
          <div class="w-full">
            <ff-date-picker
              [(value)]="deadline"
              [(time)]="deadlineTime"
              [step]="30"
            />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Booked days">
        <p class="text-site-body text-muted-foreground">
          <code>calendarProps</code> reaches the calendar inside: booked nights, past days, cell
          size.
        </p>
        <app-component-preview [code]="bookingCode" [minHeightClass]="'min-h-[460px]'" align="top">
          <div class="w-full">
            <ff-date-picker
              mode="range"
              placeholder="Check in → check out"
              [(value)]="stay"
              [calendarProps]="stayProps"
            />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference">
        <app-props-table [groups]="apiTables" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DatePickerPage {
  protected readonly semibold = fontWeights.semibold;
  protected readonly apiTables = API_REFERENCE['date-picker'];
  protected readonly installProps = promptProps(API_REFERENCE['date-picker']);

  // ── Page demos ──────────────────────────────────────────
  protected readonly date = signal<DatePickerValue>(undefined);
  protected readonly range = signal<DatePickerValue>(undefined);
  protected readonly presets = demoPresets();
  protected readonly eventDate = signal<DatePickerValue>(new Date());
  protected readonly eventTime = signal<TimeRange | null | undefined>({
    start: '11:00',
    end: '12:45',
  });
  protected readonly deadline = signal<DatePickerValue>(undefined);
  protected readonly deadlineTime = signal<string | null | undefined>(null);
  protected readonly stay = signal<DatePickerValue>(undefined);
  protected readonly stayProps: DatePickerCalendarProps = {
    booked: demoBooking(),
    disabled: { before: new Date() },
  };

  // ── Playground ──────────────────────────────────────────
  protected readonly state = signal<DatePickerPlayState>(DEFAULT_DATE_PICKER_STATE);
  protected readonly playDate = signal<DatePickerValue>(new Date());
  protected readonly playRange = signal<DatePickerValue>(undefined);
  protected readonly playTime = signal<string | null>(DATE_PICKER_DEFAULT_TIME);
  protected readonly playTimeRange = signal<TimeRange | null>({
    start: DATE_PICKER_DEFAULT_TIME_RANGE.start,
    end: DATE_PICKER_DEFAULT_TIME_RANGE.end,
  });
  protected readonly presetDef = DATE_PICKER_PRESET_DEF;
  protected readonly playSwitch = PLAY_SWITCH;

  protected readonly variantOptions: readonly PlayOption[] = [
    { value: 'outline', label: 'Outline' },
    { value: 'ghost', label: 'Ghost' },
  ];
  protected readonly modeOptions: readonly PlayOption[] = [
    { value: 'single', label: 'Date' },
    { value: 'range', label: 'Range' },
  ];
  protected readonly timeOptions: readonly PlayOption[] = [
    { value: 'none', label: 'None' },
    { value: 'time', label: 'One time' },
    { value: 'timeRange', label: 'Start → end' },
  ];
  protected readonly stepOptions: readonly PlayOption[] = [
    { value: '15', label: '15 min' },
    { value: '30', label: '30 min' },
    { value: '60', label: '1 hour' },
  ];
  protected readonly clockOptions: readonly PlayOption[] = [
    { value: 'locale', label: 'Auto' },
    { value: '12', label: '12h' },
    { value: '24', label: '24h' },
  ];
  protected readonly monthOptions: readonly PlayOption[] = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
  ];
  protected readonly orientationOptions: readonly PlayOption[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'horizontal', label: 'Horizontal' },
    { value: 'vertical', label: 'Vertical' },
  ];
  protected readonly daysOptions: readonly PlayOption[] = [
    { value: 'all', label: 'All open' },
    { value: 'booked', label: 'Booked + past' },
  ];
  protected readonly sizeOptions: readonly PlayOption[] = [
    { value: 'site', label: 'Site' },
    { value: 'default', label: 'Default' },
    { value: 'compact', label: 'Compact' },
  ];

  private readonly globals = injectPresetGlobals();
  private readonly presetsDemo = demoPresets();
  private readonly playBooked = demoBookedDays();
  private readonly playPast: DatePickerCalendarProps['disabled'] = { before: new Date() };

  protected readonly isRange = computed(() => this.state().mode === 'range');
  protected readonly hasTime = computed(() => !this.isRange() && this.state().time !== 'none');
  protected readonly playMonths = computed(() => Number(this.state().months) as 1 | 2);
  protected readonly playStep = computed(() => Number(this.state().step));
  /** `undefined` follows the locale's clock, as the reference's `hourCycle`. */
  protected readonly playHourCycle = computed<12 | 24 | undefined>(() => {
    const clock = this.state().clock;
    return clock === 'locale' ? undefined : (Number(clock) as 12 | 24);
  });
  protected readonly playSize = computed(() => {
    const size = this.state().pickerSize;
    return size === 'site' ? undefined : size;
  });
  protected readonly playPresets = computed(() =>
    this.state().presets ? this.presetsDemo : undefined,
  );
  protected readonly playCalendarProps = computed<DatePickerCalendarProps>(() => ({
    ...(this.state().days === 'booked' ? { booked: this.playBooked, disabled: this.playPast } : {}),
    showWeekNumber: this.state().weekNumbers,
  }));

  /** The Code tab's snippet, and the Share prompt's usage block (D5). */
  protected readonly playgroundCode = computed(() =>
    buildDatePickerPlaygroundCode(this.state(), this.globals()),
  );

  /** The configuration as one stateless code, kept in the address bar. */
  protected readonly presetCode = computed(() =>
    encodeDatePickerPreset({ ...this.state(), ...this.globals() }),
  );

  constructor() {
    usePresetUrl(this.presetCode, DEFAULT_CODE, (raw) => {
      const result = decodeDatePickerPreset(raw);
      if (!result.ok) return;
      // The globals stay with the site settings; the rail takes the rest.
      this.state.set({
        mode: result.preset.mode,
        variant: result.preset.variant,
        time: result.preset.time,
        presets: result.preset.presets,
        months: result.preset.months,
        orientation: result.preset.orientation,
        step: result.preset.step,
        clock: result.preset.clock,
        weekNumbers: result.preset.weekNumbers,
        days: result.preset.days,
        clearable: result.preset.clearable,
        disabled: result.preset.disabled,
        pickerSize: result.preset.pickerSize,
      });
    });
  }

  /** The options above are the only values the rail can produce, so the
   *  field's own union holds at runtime. */
  protected set(key: keyof DatePickerPlayState, value: unknown): void {
    this.state.update((state) => ({ ...state, [key]: value }) as DatePickerPlayState);
  }

  /** Each mode opens on its own default month count. */
  protected changeMode(value: string): void {
    const mode = value === 'range' ? 'range' : 'single';
    this.state.update((state) => ({ ...state, mode, months: defaultDatePickerMonths(mode) }));
  }

  protected randomize(): void {
    const mode = pick(['single', 'range'] as const);
    this.state.set({
      mode,
      variant: pick(['outline', 'ghost'] as const),
      time: pick(['none', 'time', 'timeRange'] as const),
      presets: Math.random() > 0.5,
      months: Math.random() > 0.7 ? (mode === 'range' ? '1' : '2') : defaultDatePickerMonths(mode),
      orientation: pick(['auto', 'horizontal', 'vertical'] as const),
      step: pick(['15', '15', '30', '60'] as const),
      clock: pick(['locale', '12', '24'] as const),
      weekNumbers: Math.random() > 0.6,
      days: pick(['all', 'booked'] as const),
      clearable: true,
      disabled: false,
      pickerSize: 'site',
    });
  }

  // ── Code snippets ───────────────────────────────────────
  protected readonly singleCode = `import { signal } from '@angular/core';
import { DatePicker, type DatePickerValue } from '@angel-r/fluid-functionalism-angular';

const date = signal<DatePickerValue>(undefined);

<ff-date-picker [(value)]="date" />`;

  protected readonly rangeCode = `import { signal } from '@angular/core';
import { DatePicker, type DateRange, type DatePickerPreset } from '@angel-r/fluid-functionalism-angular';

const range = signal<DateRange | undefined>(undefined);
const today = new Date();
const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const presets: DatePickerPreset[] = [
  { label: 'Next 7 days', range: { from: today, to: addDays(today, 6) } },
  { label: 'Next 30 days', range: { from: today, to: addDays(today, 29) } },
];

<ff-date-picker mode="range" [(value)]="range" [presets]="presets" />`;

  protected readonly eventCode = `import { signal } from '@angular/core';
import { DatePicker, type TimeRange } from '@angel-r/fluid-functionalism-angular';

const date = signal<Date | undefined>(new Date());
const time = signal<TimeRange | null>({ start: '11:00', end: '12:45' });

<div class="flex items-center gap-2">
  <span class="w-20 text-muted-foreground">When</span>
  <ff-date-picker
    variant="ghost"
    [(value)]="date"
    [(timeRange)]="time"
  />
</div>`;

  protected readonly timeCode = `import { signal } from '@angular/core';
import { DatePicker } from '@angel-r/fluid-functionalism-angular';

const date = signal<Date | undefined>(new Date());
const time = signal<string | null>(null);

<ff-date-picker [(value)]="date" [(time)]="time" [step]="30" />`;

  protected readonly bookingCode = `import { signal } from '@angular/core';
import { DatePicker, type DateRange, type DatePickerCalendarProps } from '@angel-r/fluid-functionalism-angular';

const stay = signal<DateRange | undefined>(undefined);
const calendarProps: DatePickerCalendarProps = {
  booked,
  disabled: { before: new Date() },
};

<ff-date-picker
  mode="range"
  [(value)]="stay"
  placeholder="Check in → check out"
  [calendarProps]="calendarProps"
/>`;
}
