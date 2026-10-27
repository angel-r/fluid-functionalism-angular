import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../../site/placeholder-page';

/** Placeholder for the CarouselDots page (docs task). The task that owns
 *  it replaces this file; keep the default export and the selector. */
@Component({
  selector: 'app-carousel-dots-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page title="CarouselDots" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CarouselDotsPage {}
