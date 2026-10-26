import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-combobox-demo',
  imports: [DemoPage],
  template: `<app-demo-page title="Combobox" description="Port in progress." />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ComboboxDemo {}
