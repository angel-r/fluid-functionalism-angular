import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-thinking-steps-demo',
  imports: [DemoPage],
  template: `<app-demo-page title="Thinking steps" description="Port in progress." />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ThinkingStepsDemo {}
