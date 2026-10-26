import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-input-group-demo',
  imports: [DemoPage],
  template: `<app-demo-page title='Input group' description='Port in progress.' />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InputGroupDemo {}
