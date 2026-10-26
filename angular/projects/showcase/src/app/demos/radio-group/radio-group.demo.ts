import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RadioGroup, RadioItem } from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-radio-group-demo',
  imports: [DemoPage, DemoSection, RadioGroup, RadioItem],
  template: `
    <app-demo-page title="RadioGroup" description="Radio button group with fluid hover and animated selection.">
      <app-demo-section title="Basic">
        <ff-radio-group [selectedIndex]="selected()">
          @for (label of options; track label; let i = $index) {
            <ff-radio-item [index]="i" [label]="label" [selected]="selected() === i" (select)="selected.set(i)" />
          }
        </ff-radio-group>
      </app-demo-section>
      <app-demo-section title="Value (two-way)">
        <div class="flex flex-col items-center gap-3">
          <ff-radio-group [(value)]="plan">
            @for (option of plans; track option.value; let i = $index) {
              <ff-radio-item [index]="i" [label]="option.label" [value]="option.value" />
            }
          </ff-radio-group>
          <p class="text-site-caption text-muted-foreground">Selected: {{ plan() }}</p>
        </div>
      </app-demo-section>
      <app-demo-section title="Compact">
        <ff-radio-group size="compact" [(value)]="density">
          @for (option of densities; track option; let i = $index) {
            <ff-radio-item [index]="i" [label]="option" [value]="option" />
          }
        </ff-radio-group>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RadioGroupDemo {
  protected readonly options = ['Option A', 'Option B', 'Option C'];
  protected readonly selected = signal(0);
  protected readonly plans = [
    { label: 'Free', value: 'free' },
    { label: 'Pro', value: 'pro' },
    { label: 'Team', value: 'team' },
  ];
  protected readonly plan = signal<string | undefined>('pro');
  protected readonly densities = ['Comfortable', 'Cozy', 'Compact'];
  protected readonly density = signal<string | undefined>('Cozy');
}
