import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-color-picker-demo',
  imports: [DemoPage],
  template: `<app-demo-page title="Color picker" description="Port in progress." />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ColorPickerDemo {}
