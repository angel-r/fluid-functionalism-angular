import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../site/placeholder-page';

/** Placeholder for the Introduction page (T5). The task that owns
 *  it replaces this file; keep the default export and the selector. */
@Component({
  selector: 'app-intro-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page title="Introduction" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class IntroPage {}
