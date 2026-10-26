import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-input-copy-demo',
  imports: [DemoPage],
  template: `<app-demo-page title="Input copy" description="Port in progress." />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InputCopyDemo {}
