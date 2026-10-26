import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-radio-group-demo',
  imports: [DemoPage],
  template: `<app-demo-page title='Radio group' description='Port in progress.' />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RadioGroupDemo {}
