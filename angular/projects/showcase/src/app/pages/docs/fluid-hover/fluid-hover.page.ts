import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../../site/placeholder-page';

/** Placeholder for the Fluid Hover page (docs task). The task that owns
 *  it replaces this file; keep the default export and the selector. */
@Component({
  selector: 'app-fluid-hover-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page title="Fluid Hover" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FluidHoverPage {}
