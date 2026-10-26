import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-command-menu-demo',
  imports: [DemoPage],
  template: `<app-demo-page title="Command menu" description="Port in progress." />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CommandMenuDemo {}
