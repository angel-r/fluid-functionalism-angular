import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../site/placeholder-page';

/** Placeholder for the Showcase page (T4). The task that owns
 *  it replaces this file; keep the default export and the selector. */
@Component({
  selector: 'app-home-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page title="Showcase" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HomePage {}
