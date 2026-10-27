import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CheckboxGroup, CheckboxItem } from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-checkbox-group-demo',
  imports: [DemoPage, DemoSection, CheckboxGroup, CheckboxItem],
  template: `
    <app-demo-page title="CheckboxGroup" description="Checkbox group with merged backgrounds for contiguous selections.">
      <app-demo-section title="Basic">
        <ff-checkbox-group [checkedIndices]="checked()">
          @for (label of items; track label; let i = $index) {
            <ff-checkbox-item [index]="i" [label]="label" [checked]="checked().has(i)" (toggle)="toggle(i)" />
          }
        </ff-checkbox-group>
      </app-demo-section>
      <app-demo-section title="Two-way checkedIndices">
        <ff-checkbox-group [(checkedIndices)]="channels">
          @for (label of channelLabels; track label; let i = $index) {
            <ff-checkbox-item [index]="i" [label]="label" />
          }
        </ff-checkbox-group>
      </app-demo-section>
      <app-demo-section title="Compact">
        <ff-checkbox-group size="compact" [(checkedIndices)]="compact">
          @for (label of items; track label; let i = $index) {
            <ff-checkbox-item [index]="i" [label]="label" />
          }
        </ff-checkbox-group>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CheckboxGroupDemo {
  protected readonly items = ['Apples', 'Bananas', 'Cherries', 'Dates'];
  protected readonly checked = signal<ReadonlySet<number>>(new Set([0]));
  protected readonly channelLabels = ['Email', 'Push', 'SMS', 'Slack', 'Webhook'];
  protected readonly channels = signal<ReadonlySet<number>>(new Set([0, 1, 3]));
  protected readonly compact = signal<ReadonlySet<number>>(new Set([1, 2]));

  protected toggle(index: number) {
    this.checked.update((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }
}
