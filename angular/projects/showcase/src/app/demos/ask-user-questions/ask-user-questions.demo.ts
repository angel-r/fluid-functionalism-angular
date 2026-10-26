import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-ask-user-questions-demo',
  imports: [DemoPage],
  template: `<app-demo-page title="Ask user questions" description="Port in progress." />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AskUserQuestionsDemo {}
