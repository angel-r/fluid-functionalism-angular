import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../../site/placeholder-page';

/** Placeholder for the InputMessage page (docs task). The task that owns
 *  it replaces this file; keep the default export and the selector. */
@Component({
  selector: 'app-input-message-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page title="InputMessage" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InputMessagePage {}
