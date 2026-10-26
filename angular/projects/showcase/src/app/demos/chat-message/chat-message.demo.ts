import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-chat-message-demo',
  imports: [DemoPage],
  template: `<app-demo-page title="Chat message" description="Port in progress." />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ChatMessageDemo {}
