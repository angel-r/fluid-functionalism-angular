import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-dropdown-search-demo',
  imports: [DemoPage],
  template: `<app-demo-page title='Dropdown search' description='Port in progress.' />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DropdownSearchDemo {}
