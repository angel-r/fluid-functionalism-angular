import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-dialog-sidebar-demo',
  imports: [DemoPage],
  template: `<app-demo-page title="Dialog sidebar" description="Port in progress." />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DialogSidebarDemo {}
