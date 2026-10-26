import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-thinking-indicator-demo',
  imports: [DemoPage],
  template: `<app-demo-page title='Thinking indicator' description='Port in progress.' />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ThinkingIndicatorDemo {}
