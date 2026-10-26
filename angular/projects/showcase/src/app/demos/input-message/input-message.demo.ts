import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Button, ChatMessage, Icon, InputMessage, type InputMessageSendEvent } from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';
import { QueuedChatDemo } from './queued-chat';
import { samplePdf, samplePhoto } from './sample-files';

const SUGGESTIONS = [
  'What is Fluid Functionalism about?',
  'How does Micka tune the springs behind these animations?',
  'Install the InputMessage component in my project',
  'Draft a short thank-you note to Micka for the library',
];

const PLACEHOLDER_PROMPT = 'Why is every other input box so stiff?';

interface Turn {
  from: 'user' | 'assistant';
  text: string;
  files?: File[];
}

@Component({
  selector: 'app-input-message-demo',
  imports: [DemoPage, DemoSection, InputMessage, ChatMessage, Button, Icon, QueuedChatDemo],
  template: `
    <ng-template #attachSlot>
      <button ffButton variant="ghost" size="icon-sm" aria-label="Attach">
        <ff-icon name="plus" />
      </button>
    </ng-template>
    <ng-template #modelSlot>
      <button ffButton variant="ghost" size="sm" trailingIcon="chevron-down">Sonnet 4.6</button>
    </ng-template>

    <app-demo-page
      title="Input message"
      description="Chat-style message composer with an auto-resizing textarea, flexible left/right action slots, and a built-in send button on a Surface-2 substrate."
    >
      <app-demo-section title="Basic">
        <div class="w-full max-w-xl">
          <ff-input-message [(value)]="basicValue" (send)="basicValue.set('')" />
        </div>
      </app-demo-section>

      <app-demo-section title="Suggestions">
        <div class="w-full max-w-xl">
          <ff-input-message
            [(value)]="suggestValue"
            [placeholderSuggestion]="placeholderPrompt"
            [suggestions]="suggestions"
            (send)="suggestValue.set('')"
          />
        </div>
      </app-demo-section>

      <app-demo-section title="Attachments">
        <div class="flex w-full max-w-xl flex-col gap-3">
          @if (attachMessages().length > 0) {
            <div class="flex flex-col gap-2">
              @for (m of attachMessages(); track $index) {
                <ff-chat-message [from]="m.from" [files]="m.files">{{ m.text }}</ff-chat-message>
              }
            </div>
            <div class="flex justify-end">
              <button ffButton variant="ghost" size="sm" leadingIcon="rotate-ccw" (click)="resetAttach()">Reset</button>
            </div>
          }
          <ff-input-message
            [(value)]="attachValue"
            [(files)]="attachFiles"
            (send)="onAttachSend($event)"
          />
        </div>
      </app-demo-section>

      <app-demo-section title="Queued messages">
        <app-queued-chat />
      </app-demo-section>

      <app-demo-section title="Left slot only">
        <div class="w-full max-w-xl">
          <ff-input-message [(value)]="leftValue" [leftSlot]="attachSlot" (send)="leftValue.set('')" />
        </div>
      </app-demo-section>

      <app-demo-section title="Right slot only">
        <div class="w-full max-w-xl">
          <ff-input-message [(value)]="rightValue" [rightSlot]="modelSlot" (send)="rightValue.set('')" />
        </div>
      </app-demo-section>

      <app-demo-section title="Send handler">
        <div class="flex w-full max-w-xl flex-col gap-3">
          @if (messages().length > 0) {
            <div class="flex flex-col gap-2">
              @for (m of messages(); track $index) {
                <ff-chat-message from="user">{{ m }}</ff-chat-message>
              }
            </div>
            <div class="flex justify-end">
              <button ffButton variant="ghost" size="sm" leadingIcon="rotate-ccw" (click)="messages.set([])">
                Clear messages
              </button>
            </div>
          }
          <ff-input-message
            [(value)]="handlerValue"
            placeholder="Press Enter to send. Shift+Enter for newline."
            (send)="onHandlerSend($event)"
          />
        </div>
      </app-demo-section>

      <app-demo-section title="Compact">
        <div class="w-full max-w-xl">
          <ff-input-message size="compact" [(value)]="compactValue" [leftSlot]="attachSlot" (send)="compactValue.set('')" />
        </div>
      </app-demo-section>

      <app-demo-section title="Disabled">
        <div class="w-full max-w-xl">
          <ff-input-message value="This composer is disabled" disabled />
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InputMessageDemo {
  protected readonly suggestions = SUGGESTIONS;
  protected readonly placeholderPrompt = PLACEHOLDER_PROMPT;

  protected readonly basicValue = signal('');
  protected readonly suggestValue = signal('');
  protected readonly leftValue = signal('');
  protected readonly rightValue = signal('');
  protected readonly compactValue = signal('');
  protected readonly handlerValue = signal('');
  protected readonly messages = signal<string[]>([]);

  // Attachments: a composer pre-filled with an image and a PDF; sending moves
  // the message (with its attachments) into the transcript.
  private readonly initialFiles = [samplePhoto(), samplePdf('Receipt-2581-4039-8265.pdf', 'Receipt 2581-4039-8265')];
  protected readonly attachValue = signal('');
  protected readonly attachFiles = signal<File[]>(this.initialFiles);
  protected readonly attachMessages = signal<Turn[]>([]);

  protected onAttachSend({ value, files }: InputMessageSendEvent) {
    if (!value && files.length === 0) return;
    this.attachMessages.update((prev) => [...prev, { from: 'user', text: value, files }]);
    this.attachValue.set('');
    this.attachFiles.set([]);
  }

  protected resetAttach() {
    this.attachMessages.set([]);
    this.attachValue.set('');
    this.attachFiles.set(this.initialFiles);
  }

  protected onHandlerSend({ value }: InputMessageSendEvent) {
    if (value) this.messages.update((prev) => [...prev, value]);
    this.handlerValue.set('');
  }
}
