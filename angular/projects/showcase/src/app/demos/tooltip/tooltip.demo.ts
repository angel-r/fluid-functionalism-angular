import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-tooltip-demo',
  imports: [DemoPage],
  template: `<app-demo-page title='Tooltip' description='Port in progress.' />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TooltipDemo {}
