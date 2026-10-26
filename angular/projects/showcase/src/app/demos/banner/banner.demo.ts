import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-banner-demo',
  imports: [DemoPage],
  template: `<app-demo-page title="Banner" description="Port in progress." />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BannerDemo {}
