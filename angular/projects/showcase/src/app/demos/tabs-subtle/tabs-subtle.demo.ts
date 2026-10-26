import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-tabs-subtle-demo',
  imports: [DemoPage],
  template: `<app-demo-page title='Tabs subtle' description='Port in progress.' />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TabsSubtleDemo {}
