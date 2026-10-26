import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-mobile-drawer-demo',
  imports: [DemoPage],
  template: `<app-demo-page title='Mobile drawer' description='Port in progress.' />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class MobileDrawerDemo {}
