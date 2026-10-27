import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Switch } from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-switch-demo',
  imports: [DemoPage, DemoSection, Switch],
  template: `
    <app-demo-page title="Switch" description="Toggle switch with animated thumb and label.">
      <app-demo-section title="Basic">
        <ff-switch label="Notifications" [(checked)]="checked" />
      </app-demo-section>
      <app-demo-section title="Disabled">
        <ff-switch label="Disabled option" [checked]="false" disabled />
      </app-demo-section>
      <app-demo-section title="Compact">
        <ff-switch label="Compact" size="compact" [(checked)]="compact" />
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SwitchDemo {
  protected readonly checked = signal(false);
  protected readonly compact = signal(true);
}
