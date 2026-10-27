import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../site/placeholder-page';

/** Placeholder for the Demo page (T12). The task that owns
 *  it replaces this file; keep the default export and the selector. */
@Component({
  selector: 'app-demo-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page title="Demo" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DemoPage {}
