import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../site/placeholder-page';

/** Placeholder for the Not found page (T2). The task that owns
 *  it replaces this file; keep the default export and the selector. */
@Component({
  selector: 'app-not-found-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page title="Not found" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NotFoundPage {}
