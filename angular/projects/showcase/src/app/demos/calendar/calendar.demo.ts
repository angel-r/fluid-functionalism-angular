import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Calendar, type CalendarValue, type DateRange, type Matcher } from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

/** Taken nights for the booking demo, a few days out from today. */
const BOOKED_OFFSETS = [4, 5, 6, 12, 19, 20];

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * A made-up nightly rate per day for the cell size demo, $99 to $189. Hashed
 * from the date, so it varies day to day but always renders the same.
 */
function demoRate(day: Date) {
  const seed = day.getFullYear() * 400 + day.getMonth() * 32 + day.getDate();
  const hash = Math.imul(seed, 2654435761) >>> 0;
  return 99 + ((hash >>> 8) % 10) * 10;
}

@Component({
  selector: 'app-calendar-demo',
  imports: [DemoPage, DemoSection, Calendar],
  template: `
    <app-demo-page
      title="Calendar"
      description="Month grid for a day or a range: one fluid hover across both months, a range band that follows the pointer, booked and unavailable days, and week numbers."
    >
      <app-demo-section title="Single">
        <div class="flex flex-col items-center gap-3">
          <ff-calendar [(selected)]="date" />
          <p class="text-site-caption text-muted-foreground">
            Click a day, or arrow to it and press Enter. PageUp and PageDown change the month.
          </p>
        </div>
      </app-demo-section>

      <app-demo-section title="Range">
        <div class="flex flex-col items-center gap-3">
          <ff-calendar mode="range" [numberOfMonths]="2" orientation="horizontal" [(selected)]="range" />
          <p class="text-site-caption text-muted-foreground">
            2 months, one hover. Pick a start, then move: the band follows the pointer across the month break.
          </p>
        </div>
      </app-demo-section>

      <app-demo-section title="Stacked months">
        <div class="flex flex-col items-center gap-3">
          <ff-calendar mode="range" [numberOfMonths]="2" orientation="vertical" [(selected)]="stacked" />
          <p class="text-site-caption text-muted-foreground">
            orientation="vertical" stacks the months under one weekday row; "auto" picks this when 2 months don't fit
            side by side.
          </p>
        </div>
      </app-demo-section>

      <app-demo-section title="Booked and unavailable">
        <div class="flex flex-col items-center gap-3">
          <ff-calendar mode="range" [(selected)]="booking" [booked]="booked" [disabled]="past" />
          <p class="text-site-caption text-muted-foreground">
            Booked days are struck through and a range can't cross them. Past days only fade.
          </p>
        </div>
        <div class="flex flex-col items-center gap-3">
          <ff-calendar [(selected)]="weekday" [available]="weekdays" />
          <p class="text-site-caption text-muted-foreground">
            available flips the rule: every day it doesn't match is unavailable.
          </p>
        </div>
      </app-demo-section>

      <app-demo-section title="Cell size">
        <div class="flex flex-col items-center gap-3">
          <ff-calendar [cellSize]="56" [(selected)]="big" [dayDetail]="rate" [dayDetailTemplate]="rateTpl" />
          <ng-template #rateTpl let-rate>
            <span [class]="rate <= 119 ? 'text-[color:var(--success)]' : ''">\${{ rate }}</span>
          </ng-template>
          <p class="text-site-caption text-muted-foreground">
            cellSize sets the cell in px; the numbers keep their size. dayDetail puts a line under each number, a price
            here: good deals show green.
          </p>
        </div>
      </app-demo-section>

      <app-demo-section title="Week numbers">
        <div class="flex flex-col items-center gap-3">
          <ff-calendar showWeekNumber [(selected)]="week" />
          <p class="text-site-caption text-muted-foreground">
            ISO week numbers in a muted column, with weeks starting on Monday.
          </p>
        </div>
      </app-demo-section>

      <app-demo-section title="Compact">
        <ff-calendar size="compact" [(selected)]="compact" />
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CalendarDemo {
  private readonly today = new Date();
  protected readonly date = signal<CalendarValue>(new Date());
  protected readonly range = signal<CalendarValue>(undefined as DateRange | undefined);
  protected readonly stacked = signal<CalendarValue>(undefined);
  protected readonly booking = signal<CalendarValue>(undefined);
  protected readonly weekday = signal<CalendarValue>(undefined);
  protected readonly big = signal<CalendarValue>(new Date());
  protected readonly week = signal<CalendarValue>(new Date());
  protected readonly compact = signal<CalendarValue>(new Date());
  protected readonly booked = BOOKED_OFFSETS.map((n) => addDays(this.today, n));
  protected readonly past: Matcher = { before: this.today };
  protected readonly weekdays: Matcher = { dayOfWeek: [1, 2, 3, 4, 5] };
  protected readonly rate = (day: Date) => demoRate(day);
}
