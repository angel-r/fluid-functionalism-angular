import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../../site/placeholder-page';

/** Placeholder for the InputGroup page (docs task). The task that owns
 *  it replaces this file; keep the default export and the selector. */
@Component({
  selector: 'app-input-group-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page title="InputGroup" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InputGroupPage {}
