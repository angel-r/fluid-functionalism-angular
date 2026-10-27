import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Badge, badgeColors, type BadgeColor } from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-badge-demo',
  imports: [DemoPage, DemoSection, Badge],
  template: `
    <app-demo-page
      title="Badge"
      description="Compact label for status, category, or metadata. Supports solid and dot variants with Tailwind colors."
    >
      <app-demo-section title="Solid">
        <div class="flex flex-wrap items-center gap-2">
          @for (item of genres; track item.label) {
            <ff-badge [color]="item.color">{{ item.label }}</ff-badge>
          }
        </div>
      </app-demo-section>

      <app-demo-section title="Dot">
        <div class="flex flex-wrap items-center gap-2">
          @for (item of genres; track item.label) {
            <ff-badge variant="dot" [color]="item.color">{{ item.label }}</ff-badge>
          }
        </div>
      </app-demo-section>

      <app-demo-section title="Compact">
        <div class="flex flex-wrap items-center gap-2">
          <ff-badge size="compact" color="green">Live</ff-badge>
          <ff-badge size="compact" variant="dot" color="amber">Pending</ff-badge>
        </div>
      </app-demo-section>

      <app-demo-section title="Colors">
        <div class="flex flex-col gap-3">
          <div class="flex flex-wrap items-center gap-2">
            @for (color of colors; track color) {
              <ff-badge [color]="color">{{ capitalize(color) }}</ff-badge>
            }
          </div>
          <div class="flex flex-wrap items-center gap-2">
            @for (color of colors; track color) {
              <ff-badge variant="dot" [color]="color">{{ capitalize(color) }}</ff-badge>
            }
          </div>
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BadgeDemo {
  protected readonly genres: { label: string; color: BadgeColor }[] = [
    { label: 'Fiction', color: 'violet' },
    { label: 'Science', color: 'amber' },
    { label: 'Philosophy', color: 'green' },
    { label: 'History', color: 'blue' },
    { label: 'Poetry', color: 'rose' },
  ];
  protected readonly colors = Object.keys(badgeColors) as BadgeColor[];
  protected capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
