// ---------------------------------------------------------------------------
// /docs/calendar, ported from app/docs/calendar/page.tsx: the playground, the
// single and range grids, the stacked months, booked and unavailable days, the
// bigger cells with a nightly rate, ISO week numbers, and the API reference.
// Copy and classes follow the reference; the Code tabs, the install prompt and
// the Share prompt carry the Angular forms.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  Calendar,
  Switch,
  type CalendarValue,
  type Matcher,
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
import {
  CALENDAR_DEFAULT_CODE,
  CALENDAR_PRESET_DEF,
  DEFAULT_CALENDAR_STATE,
  buildCalendarPlaygroundCode,
  decodeCalendarPreset,
  demoBookedDays,
  encodeCalendarPreset,
  type CalendarPlayState,
} from './calendar-preset';

/** The install prompt's one line per prop. */
function promptProps(tables: readonly { props: PropDef[] }[]): string[] {
  return tables.flatMap((table) =>
    table.props.map(
      (prop) =>
        `${prop.name}: ${prop.type}${prop.default !== undefined ? ` (default ${prop.default})` : ''} — ${prop.description}`,
    ),
  );
}

/**
 * A made-up nightly rate per day for the cell size demo, $99 to $189. Hashed
 * from the date, so it varies day to day but renders the same every time.
 */
function demoRate(day: Date): number {
  const seed = day.getFullYear() * 400 + day.getMonth() * 32 + day.getDate();
  const hash = Math.imul(seed, 2654435761) >>> 0;
  return 99 + ((hash >>> 8) % 10) * 10;
}

function pick<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

const DEFAULT_CODE = signal(CALENDAR_DEFAULT_CODE);

@Component({
  selector: 'app-calendar-page',
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
    Calendar,
    Switch,
  ],
  template: `
    <app-doc-page
      title="Calendar"
      slug="calendar"
      description="Month grid for a day or a range: one fluid hover across both months, a range band that follows the pointer, booked and unavailable days, and week numbers."
      [installUsage]="singleCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Playground">
        <app-playground-layout [preview]="playPreview" [controls]="playControls" />

        <!-- The playground's live preview: one calendar, driven by the
             questions the rail asks. -->
        <ng-template #playPreview>
          <app-component-preview
            [code]="playgroundCode()"
            padding="none"
            align="top"
            [minHeightClass]="'min-h-[420px]'"
          >
            <div class="flex w-full justify-center px-6 py-10">
              @if (state().mode === 'range') {
                <ff-calendar
                  mode="range"
                  [numberOfMonths]="playMonths()"
                  [orientation]="state().orientation"
                  [cellSize]="playCellSize()"
                  [showWeekNumber]="state().weekNumbers"
                  [booked]="playBooked()"
                  [disabled]="playPast()"
                  [available]="playWeekdays()"
                  [(selected)]="playRange"
                />
              } @else {
                <ff-calendar
                  [numberOfMonths]="playMonths()"
                  [orientation]="state().orientation"
                  [cellSize]="playCellSize()"
                  [showWeekNumber]="state().weekNumbers"
                  [booked]="playBooked()"
                  [disabled]="playPast()"
                  [available]="playWeekdays()"
                  [(selected)]="playDate"
                />
              }
            </div>
          </app-component-preview>
        </ng-template>

        <!-- The controls, shown inline below the preview until the right rail
             exists (>=1280px). -->
        <ng-template #playControls>
          <app-playground-panel (shuffle)="randomize()">
            <app-play-field label="Mode">
              <app-play-select
                [value]="state().mode"
                [options]="modeOptions"
                (valueChange)="set('mode', $event)"
              />
            </app-play-field>
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
            <app-play-field label="Cell size">
              <app-play-select
                [value]="state().cellSize"
                [options]="cellSizeOptions"
                (valueChange)="set('cellSize', $event)"
              />
            </app-play-field>
            <app-play-divider />
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

      <app-doc-section title="Single">
        <p class="text-site-body text-muted-foreground">
          Click a day, or arrow to it and press <code>Enter</code>. <code>PageUp</code> and
          <code>PageDown</code> change the month.
        </p>
        <app-component-preview [code]="singleCode" [minHeightClass]="'min-h-[360px]'">
          <ff-calendar [(selected)]="date" />
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Range">
        <p class="text-site-body text-muted-foreground">
          2 months, one hover. Pick a start, then move: the band follows the pointer across
          the month break.
        </p>
        <app-component-preview [code]="rangeCode" [minHeightClass]="'min-h-[360px]'">
          <ff-calendar
            mode="range"
            [numberOfMonths]="2"
            orientation="horizontal"
            [(selected)]="range"
          />
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Stacked months">
        <p class="text-site-body text-muted-foreground">
          <code>orientation="vertical"</code> stacks the months under one weekday row, which
          stays put when they scroll in a shorter box. <code>auto</code> picks this when 2
          months don't fit side by side.
        </p>
        <app-component-preview [code]="verticalCode">
          <ff-calendar
            mode="range"
            [numberOfMonths]="2"
            orientation="vertical"
            [(selected)]="stacked"
          />
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Booked and unavailable">
        <p class="text-site-body text-muted-foreground">
          Booked days are struck through and a range can't cross them. Past days only fade.
        </p>
        <app-component-preview [code]="bookingCode" [minHeightClass]="'min-h-[360px]'">
          <ff-calendar
            mode="range"
            [(selected)]="booking"
            [booked]="booked"
            [disabled]="past"
          />
        </app-component-preview>
        <p class="text-site-body text-muted-foreground">
          <code>available</code> flips the rule: every day it doesn't match is unavailable.
        </p>
        <app-component-preview [code]="availableCode" [minHeightClass]="'min-h-[360px]'">
          <ff-calendar [(selected)]="weekday" [available]="weekdays" />
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Cell size">
        <p class="text-site-body text-muted-foreground">
          <code>cellSize</code> sets the cell in px; the numbers keep their size.
          <code>dayDetail</code> puts a line under each number, a price here, and needs the room
          of a taller cell. It takes any node: good deals show green.
        </p>
        <app-component-preview [code]="sizeCode" [minHeightClass]="'min-h-[420px]'">
          <ff-calendar
            [cellSize]="56"
            [(selected)]="big"
            [dayDetail]="rate"
            [dayDetailTemplate]="rateTpl"
          />
          <ng-template #rateTpl let-rate>
            <span
              [class]="$any(rate) <= 119 ? 'text-[color:var(--success)]' : undefined"
              >{{ '$' }}{{ $any(rate) }}</span
            >
          </ng-template>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Week numbers">
        <p class="text-site-body text-muted-foreground">
          ISO week numbers in a muted column, with weeks starting on Monday.
        </p>
        <app-component-preview [code]="weekNumbersCode" [minHeightClass]="'min-h-[360px]'">
          <ff-calendar showWeekNumber [(selected)]="week" />
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference">
        <app-props-table [groups]="apiTables" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CalendarPage {
  // ── Page demos ──────────────────────────────────────────
  protected readonly date = signal<CalendarValue>(new Date());
  protected readonly range = signal<CalendarValue>(undefined);
  protected readonly stacked = signal<CalendarValue>(undefined);
  protected readonly booking = signal<CalendarValue>(undefined);
  protected readonly weekday = signal<CalendarValue>(undefined);
  protected readonly big = signal<CalendarValue>(new Date());
  protected readonly week = signal<CalendarValue>(new Date());
  protected readonly booked = demoBookedDays();
  protected readonly past: Matcher = { before: new Date() };
  protected readonly weekdays: Matcher = { dayOfWeek: [1, 2, 3, 4, 5] };
  protected readonly rate = demoRate;
  protected readonly apiTables = API_REFERENCE['calendar'];
  protected readonly installProps = promptProps(API_REFERENCE['calendar']);

  // ── Playground ──────────────────────────────────────────
  protected readonly state = signal<CalendarPlayState>(DEFAULT_CALENDAR_STATE);
  protected readonly playDate = signal<CalendarValue>(new Date());
  protected readonly playRange = signal<CalendarValue>(undefined);
  protected readonly presetDef = CALENDAR_PRESET_DEF;
  protected readonly playSwitch = PLAY_SWITCH;

  protected readonly modeOptions: readonly PlayOption[] = [
    { value: 'single', label: 'Single' },
    { value: 'range', label: 'Range' },
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
  protected readonly cellSizeOptions: readonly PlayOption[] = [
    { value: 'auto', label: 'Size' },
    { value: '40', label: '40px' },
    { value: '44', label: '44px' },
    { value: '48', label: '48px' },
  ];
  protected readonly daysOptions: readonly PlayOption[] = [
    { value: 'all', label: 'All open' },
    { value: 'booked', label: 'Booked + past' },
    { value: 'weekdays', label: 'Weekdays only' },
  ];

  private readonly globals = injectPresetGlobals();
  private readonly playBookedDays = demoBookedDays();
  private readonly playPastMatcher: Matcher = { before: new Date() };
  private readonly playWeekdayMatcher: Matcher = { dayOfWeek: [1, 2, 3, 4, 5] };

  protected readonly playMonths = computed(() => Number(this.state().months) as 1 | 2);
  protected readonly playCellSize = computed(() =>
    this.state().cellSize === 'auto' ? undefined : Number(this.state().cellSize),
  );
  protected readonly playBooked = computed(() =>
    this.state().days === 'booked' ? this.playBookedDays : undefined,
  );
  protected readonly playPast = computed(() =>
    this.state().days === 'booked' ? this.playPastMatcher : undefined,
  );
  protected readonly playWeekdays = computed(() =>
    this.state().days === 'weekdays' ? this.playWeekdayMatcher : undefined,
  );

  /** The Code tab's snippet, and the Share prompt's usage block (D5). */
  protected readonly playgroundCode = computed(() =>
    buildCalendarPlaygroundCode(this.state(), this.globals()),
  );

  /** The configuration as one stateless code, kept in the address bar. */
  protected readonly presetCode = computed(() =>
    encodeCalendarPreset({ ...this.state(), ...this.globals() }),
  );

  constructor() {
    usePresetUrl(this.presetCode, DEFAULT_CODE, (raw) => {
      const result = decodeCalendarPreset(raw);
      if (!result.ok) return;
      // The globals stay with the site settings; the rail takes the rest.
      this.state.set({
        mode: result.preset.mode,
        months: result.preset.months,
        orientation: result.preset.orientation,
        cellSize: result.preset.cellSize,
        weekNumbers: result.preset.weekNumbers,
        days: result.preset.days,
      });
    });
  }

  /** The options above are the only values the rail can produce, so the
   *  field's own union holds at runtime. */
  protected set(key: keyof CalendarPlayState, value: unknown): void {
    this.state.update((state) => ({ ...state, [key]: value }) as CalendarPlayState);
  }

  protected randomize(): void {
    this.state.set({
      mode: pick(['single', 'range', 'range'] as const),
      months: pick(['1', '2'] as const),
      orientation: pick(['auto', 'horizontal', 'vertical'] as const),
      cellSize: pick(['auto', 'auto', '40', '44', '48'] as const),
      weekNumbers: Math.random() > 0.6,
      days: pick(['all', 'booked', 'weekdays'] as const),
    });
  }

  // ── Code snippets ───────────────────────────────────────
  protected readonly singleCode = `import { signal } from '@angular/core';
import { Calendar, type CalendarValue } from '@angel-r/fluid-functionalism-angular';

const date = signal<CalendarValue>(new Date());

<ff-calendar [(selected)]="date" />`;

  protected readonly rangeCode = `import { signal } from '@angular/core';
import { Calendar, type DateRange } from '@angel-r/fluid-functionalism-angular';

const range = signal<DateRange | undefined>(undefined);

<ff-calendar
  mode="range"
  [numberOfMonths]="2"
  orientation="horizontal"
  [(selected)]="range"
/>`;

  protected readonly verticalCode = `import { signal } from '@angular/core';
import { Calendar, type DateRange } from '@angel-r/fluid-functionalism-angular';

const range = signal<DateRange | undefined>(undefined);

<ff-calendar
  mode="range"
  [numberOfMonths]="2"
  orientation="vertical"
  [(selected)]="range"
/>`;

  protected readonly bookingCode = `import { Calendar, type Matcher } from '@angel-r/fluid-functionalism-angular';

const booked: Date[] = [/* Date[] of taken nights */];
const past: Matcher = { before: new Date() };

<ff-calendar
  mode="range"
  [(selected)]="range"
  [booked]="booked"
  [disabled]="past"
/>`;

  protected readonly availableCode = `import { Calendar, type Matcher } from '@angel-r/fluid-functionalism-angular';

const weekdays: Matcher = { dayOfWeek: [1, 2, 3, 4, 5] };

<ff-calendar [(selected)]="date" [available]="weekdays" />`;

  protected readonly sizeCode = `import { Calendar } from '@angel-r/fluid-functionalism-angular';

// Your nightly rate for a day: weeknights cheaper here.
const rateFor = (day: Date) => ([0, 5, 6].includes(day.getDay()) ? 169 : 109);

<ff-calendar
  [cellSize]="56"
  [(selected)]="date"
  [dayDetail]="rateFor"
  [dayDetailTemplate]="rateTpl"
/>
<ng-template #rateTpl let-rate>
  <!-- Good deals in green, the rest muted. -->
  <span [class]="$any(rate) <= 119 ? 'text-[color:var(--success)]' : undefined">\${{ $any(rate) }}</span>
</ng-template>`;

  protected readonly weekNumbersCode = `import { Calendar } from '@angel-r/fluid-functionalism-angular';

<ff-calendar showWeekNumber [(selected)]="date" />`;
}
