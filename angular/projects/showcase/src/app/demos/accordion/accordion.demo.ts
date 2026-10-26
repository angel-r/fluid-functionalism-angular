import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-accordion-demo',
  imports: [DemoPage],
  template: `<app-demo-page title='Accordion' description='Port in progress.' />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AccordionDemo {}
