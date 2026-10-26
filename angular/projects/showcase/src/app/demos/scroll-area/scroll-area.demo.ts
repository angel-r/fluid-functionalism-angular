import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ScrollArea, injectShape } from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

const RELEASES = Array.from({ length: 24 }, (_, i) => `v1.${23 - i}.0 — maintenance release`);
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const CITIES = [
  'Amsterdam', 'Berlin', 'Copenhagen', 'Dublin', 'Helsinki', 'Lisbon',
  'London', 'Madrid', 'Oslo', 'Paris', 'Prague', 'Stockholm',
  'Vienna', 'Warsaw', 'Zurich',
];

@Component({
  selector: 'app-scroll-area-demo',
  imports: [DemoPage, DemoSection, NgTemplateOutlet, ScrollArea],
  template: `
    <ng-template #rows>
      <div class="flex flex-col p-3">
        @for (release of releases; track release) {
          <div class="px-3 py-2 text-site-body text-foreground whitespace-nowrap">{{ release }}</div>
        }
      </div>
    </ng-template>

    <app-demo-page title="Scrollbars" description="A scrollbar that stays out of the way but never disappears.">
      <app-demo-section title="The problem">
        <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div class="flex flex-col gap-2">
            <div class="h-56 w-64 overflow-y-auto border border-border" [class]="shape().container">
              <ng-container *ngTemplateOutlet="rows" />
            </div>
            <span class="text-center text-site-caption text-muted-foreground">
              <span aria-hidden="true">❌</span> The native scrollbar hides until you scroll, so the list looks cut off
            </span>
          </div>
          <div class="flex flex-col gap-2">
            <ff-scroll-area viewportClass="scroll-fade" [class]="'h-56 w-64 border border-border ' + shape().container">
              <ng-container *ngTemplateOutlet="rows" />
            </ff-scroll-area>
            <span class="text-center text-site-caption text-muted-foreground">
              <span aria-hidden="true">✅</span> ScrollArea shows its scrollbar on hover and fades the edges
            </span>
          </div>
        </div>
      </app-demo-section>

      <app-demo-section title="Horizontal">
        <ff-scroll-area orientation="horizontal" viewportClass="scroll-fade-x" class="w-full">
          <div class="flex w-max gap-2 p-3">
            @for (month of months; track month) {
              <div
                class="flex h-20 w-28 shrink-0 items-center justify-center border border-border text-site-body text-foreground"
                [class]="shape().container"
              >
                {{ month }}
              </div>
            }
          </div>
        </ff-scroll-area>
      </app-demo-section>

      <app-demo-section title="The fade">
        <ff-scroll-area viewportClass="scroll-fade" [class]="'h-64 w-72 border border-border ' + shape().container">
          <ng-container *ngTemplateOutlet="rows" />
        </ff-scroll-area>
      </app-demo-section>

      <app-demo-section title="Both axes">
        <ff-scroll-area orientation="both" [class]="'h-80 w-full border border-border ' + shape().container">
          <table class="w-max text-site-body">
            <thead>
              <tr class="border-b border-border">
                <th class="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground">City</th>
                @for (month of months; track month) {
                  <th class="whitespace-nowrap px-3 py-2 text-right font-medium text-muted-foreground">{{ month }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (city of cities; track city; let r = $index) {
                <tr class="border-b border-border/60 last:border-0">
                  <td class="whitespace-nowrap px-3 py-2 text-foreground">{{ city }}</td>
                  @for (month of months; track month; let c = $index) {
                    <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted-foreground">{{ metric(r, c) }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </ff-scroll-area>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ScrollAreaDemo {
  protected readonly shape = injectShape();
  protected readonly releases = RELEASES;
  protected readonly months = MONTHS;
  protected readonly cities = CITIES;

  /** Deterministic fake metric so the table renders identically on every pass. */
  protected metric(row: number, col: number) {
    return (((row + 3) * (col + 7) * 37) % 900) + 100;
  }
}
