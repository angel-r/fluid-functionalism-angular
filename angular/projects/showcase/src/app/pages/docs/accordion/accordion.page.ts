import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../../site/placeholder-page';

/** Placeholder for the Accordion page (docs task). The task that owns
 *  it replaces this file; keep the default export and the selector. */
@Component({
  selector: 'app-accordion-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page title="Accordion" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AccordionPage {}
