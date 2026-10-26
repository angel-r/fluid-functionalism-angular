import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-carousel-dots-demo',
  imports: [DemoPage],
  template: `<app-demo-page title='Carousel dots' description='Port in progress.' />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CarouselDotsDemo {}
