import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Calendar, type CalendarValue, type DateRange, type Matcher } from '@angel-r/fluid-functionalism-angular';
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
        <ff-calendar [(selected)]="date" />
      </app-demo-section>

      <app-demo-section title="Range">
        <ff-calendar mode="range" [numberOfMonths]="2" orientation="horizontal" [(selected)]="range" />
      </app-demo-section>

      <app-demo-section title="Stacked months">
        <ff-calendar mode="range" [numberOfMonths]="2" orientation="vertical" [(selected)]="stacked" />
      </app-demo-section>

      <app-demo-section title="Booked and unavailable">
        <ff-calendar mode="range" [(selected)]="booking" [booked]="booked" [disabled]="past" />
      </app-demo-section>

      <app-demo-section title="Booked and unavailable">
        <ff-calendar [(selected)]="weekday" [available]="weekdays" />
      </app-demo-section>

      <app-demo-section title="Cell size">
        <ff-calendar [cellSize]="56" [(selected)]="big" [dayDetail]="rate" [dayDetailTemplate]="rateTpl" />
        <ng-template #rateTpl let-rate>
          <span [class]="rate <= 119 ? 'text-[color:var(--success)]' : ''">\${{ rate }}</span>
        </ng-template>
      </app-demo-section>

      <app-demo-section title="Week numbers">
        <ff-calendar showWeekNumber [(selected)]="week" />
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
