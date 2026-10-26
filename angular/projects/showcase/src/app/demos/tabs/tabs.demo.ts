import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-tabs-demo',
  imports: [DemoPage],
  template: `<app-demo-page title='Tabs' description='Port in progress.' />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TabsDemo {}
