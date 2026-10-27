import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../site/placeholder-page';

/** Placeholder for the Changelog page (T5). The task that owns
 *  it replaces this file; keep the default export and the selector. */
@Component({
  selector: 'app-changelog-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page title="Changelog" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ChangelogPage {}
