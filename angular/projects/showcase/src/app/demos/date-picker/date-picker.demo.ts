import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  DatePicker,
  fontWeights,
  type DatePickerCalendarProps,
  type DatePickerPreset,
  type DatePickerValue,
  type TimeRange,
} from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** The docs page's presets: next 7, 14 and 30 days, and this weekend. */
function demoPresets(today = new Date()): DatePickerPreset[] {
  const saturday = (6 - today.getDay() + 7) % 7;
  return [
    { label: 'Next 7 days', range: { from: today, to: addDays(today, 6) } },
    { label: 'Next 14 days', range: { from: today, to: addDays(today, 13) } },
    { label: 'Next 30 days', range: { from: today, to: addDays(today, 29) } },
    { label: 'This weekend', range: { from: addDays(today, saturday), to: addDays(today, saturday + 1) } },
  ];
}

@Component({
  selector: 'app-date-picker-demo',
  imports: [DemoPage, DemoSection, DatePicker],
  template: `
    <app-demo-page
      title="Date picker"
      description="Outline or ghost trigger for a date, a range, or a date and a time: a calendar popover with presets, and time slot lists that show each duration."
    >
      <app-demo-section title="Date">
        <div class="flex w-full max-w-md flex-col gap-3">
          <ff-date-picker [(value)]="date" />
          <p class="text-site-caption text-muted-foreground">Opens on the selected day, or today. Pick one and it closes.</p>
        </div>
      </app-demo-section>

      <app-demo-section title="Range with presets">
        <div class="flex w-full max-w-md flex-col gap-3">
          <ff-date-picker mode="range" [(value)]="range" [presets]="presets" />
          <p class="text-site-caption text-muted-foreground">
            Pick a start and an end, or a preset. It closes once the end is set; Escape mid-pick puts the previous
            range back.
          </p>
        </div>
      </app-demo-section>

      <app-demo-section title="Date and time">
        <div class="flex w-full max-w-md flex-col gap-3">
          <div class="flex w-full flex-col gap-1">
            <div class="px-2 text-site-title text-foreground" [style.font-variation-settings]="semibold">
              Design review
            </div>
            <div class="flex items-center gap-2">
              <span class="w-20 px-2 text-site-body text-muted-foreground">When</span>
              <ff-date-picker variant="ghost" [(value)]="eventDate" [(timeRange)]="eventTime" />
            </div>
          </div>
          <p class="text-site-caption text-muted-foreground">
            2 segments, 2 popovers. Type 1130 or 11:30am in a time, or arrow through the slots. The end list counts the
            duration from the start.
          </p>
        </div>
        <div class="flex w-full max-w-md flex-col gap-3">
          <ff-date-picker [(value)]="deadline" [(time)]="deadlineTime" [step]="30" />
          <p class="text-site-caption text-muted-foreground">
            time takes one time instead. step sets the minutes between slots.
          </p>
        </div>
      </app-demo-section>

      <app-demo-section title="Booked days">
        <div class="flex w-full max-w-md flex-col gap-3">
          <ff-date-picker
            mode="range"
            placeholder="Check in → check out"
            [(value)]="stay"
            [calendarProps]="bookingProps"
          />
          <p class="text-site-caption text-muted-foreground">
            calendarProps reaches the calendar inside: booked nights, past days, cell size.
          </p>
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DatePickerDemo {
  protected readonly semibold = fontWeights.semibold;
  protected readonly presets = demoPresets();
  protected readonly date = signal<DatePickerValue>(undefined);
  protected readonly range = signal<DatePickerValue>(undefined);
  protected readonly eventDate = signal<DatePickerValue>(new Date());
  protected readonly eventTime = signal<TimeRange | null | undefined>({ start: '11:00', end: '12:45' });
  protected readonly deadline = signal<DatePickerValue>(undefined);
  protected readonly deadlineTime = signal<string | null | undefined>(null);
  protected readonly stay = signal<DatePickerValue>(undefined);
  protected readonly bookingProps: DatePickerCalendarProps = {
    booked: [3, 4, 5, 11, 12].map((n) => addDays(new Date(), n)),
    disabled: { before: new Date() },
  };
}
