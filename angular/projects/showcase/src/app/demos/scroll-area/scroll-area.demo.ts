import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-scroll-area-demo',
  imports: [DemoPage],
  template: `<app-demo-page title='Scroll area' description='Port in progress.' />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ScrollAreaDemo {}
