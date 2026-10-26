import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-queued-stack-demo',
  imports: [DemoPage],
  template: `<app-demo-page title="Queued stack" description="Port in progress." />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class QueuedStackDemo {}
