import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../../site/placeholder-page';

/** Placeholder for the Badge page (docs task). The task that owns
 *  it replaces this file; keep the default export and the selector. */
@Component({
  selector: 'app-badge-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page title="Badge" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BadgePage {}
