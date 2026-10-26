import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Button, SettingsDialog } from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

/** The dialog-sidebar block: an xl dialog, a Sidebar of sections, a scrolling
 *  panel. Below `sm` a Select takes over. */
@Component({
  selector: 'app-dialog-sidebar-demo',
  imports: [DemoPage, DemoSection, Button, SettingsDialog],
  template: `
    <app-demo-page
      title="Dialog sidebar"
      description="An xl dialog, a Sidebar of sections, a scrolling panel. Below sm a Select takes over."
    >
      <app-demo-section title="With a sidebar">
        <button ffButton variant="secondary" (click)="open.set(true)">Open settings</button>
        <ff-settings-dialog [open]="open()" (openChange)="open.set($event)" />
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DialogSidebarDemo {
  protected readonly open = signal(false);
}
