import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-switch-demo',
  imports: [DemoPage],
  template: `<app-demo-page title='Switch' description='Port in progress.' />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SwitchDemo {}
