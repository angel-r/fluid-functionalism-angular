import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../../site/placeholder-page';

/** Placeholder for the AskUserQuestions page (docs task). The task that owns
 *  it replaces this file; keep the default export and the selector. */
@Component({
  selector: 'app-ask-user-questions-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page title="AskUserQuestions" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AskUserQuestionsPage {}
