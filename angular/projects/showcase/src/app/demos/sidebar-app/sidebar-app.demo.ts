import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-sidebar-app-demo',
  imports: [DemoPage],
  template: `<app-demo-page title="Sidebar app" description="Port in progress." />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SidebarAppDemo {}
