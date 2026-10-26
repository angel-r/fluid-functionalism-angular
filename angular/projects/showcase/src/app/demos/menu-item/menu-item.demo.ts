import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-menu-item-demo',
  imports: [DemoPage],
  template: `<app-demo-page title='Menu item' description='Port in progress.' />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class MenuItemDemo {}
