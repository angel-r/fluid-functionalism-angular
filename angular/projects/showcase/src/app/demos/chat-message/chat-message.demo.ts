import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Button, ChatMessage, Icon, cn, injectShape } from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

// A self-contained sample image, wrapped as a File so the attachments demo
// renders a real thumbnail (the showcase ships no photo assets).
const AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6B97FF"/><stop offset="1" stop-color="#C084FC"/>
  </linearGradient></defs>
  <rect width="256" height="256" fill="url(#g)"/>
  <circle cx="128" cy="104" r="44" fill="#ffffff" fill-opacity="0.85"/>
  <path d="M48 232c8-48 44-72 80-72s72 24 80 72" fill="#ffffff" fill-opacity="0.85"/>
</svg>`;

interface Turn {
  id: number;
  from: 'user' | 'assistant';
  text: string;
  time?: string;
}

const SCRIPT: Omit<Turn, 'id'>[] = [
  { from: 'user', text: 'Can you add a message?', time: 'Now' },
  { from: 'assistant', text: 'Sure — each one enters on the moderate spring, and the ones above slide to make room.' },
  { from: 'user', text: 'Nice. One more?', time: 'Now' },
  { from: 'assistant', text: 'Here it is.' },
];

@Component({
  selector: 'app-chat-message-demo',
  imports: [DemoPage, DemoSection, ChatMessage, Button, Icon],
  template: `
    <!-- Icon-only action buttons for the hover-revealed meta row. Illustrative
         only: the buttons carry no behaviour in the demo. -->
    <ng-template #userActions>
      <button type="button" aria-label="Copy message" [class]="actionClass()">
        <ff-icon name="copy" [size]="13" [strokeWidth]="1.5" />
      </button>
      <button type="button" aria-label="Edit message" [class]="actionClass()">
        <ff-icon name="pencil" [size]="13" [strokeWidth]="1.5" />
      </button>
    </ng-template>
    <ng-template #assistantActions>
      <button type="button" aria-label="Copy message" [class]="actionClass()">
        <ff-icon name="copy" [size]="13" [strokeWidth]="1.5" />
      </button>
      <button type="button" aria-label="Regenerate response" [class]="actionClass()">
        <ff-icon name="rotate-ccw" [size]="13" [strokeWidth]="1.5" />
      </button>
    </ng-template>

    <app-demo-page
      title="Chat message"
      description="A single chat transcript entry with baked-in entrance and layout motion. Right-aligned accent bubble for the user, left-aligned plain text for the assistant, with optional file attachments and a hover-revealed meta row."
    >
      <app-demo-section title="Conversation">
        <div class="flex w-full max-w-xl flex-col gap-2">
          @for (turn of conversation; track $index) {
            <ff-chat-message
              [from]="turn.from"
              [time]="turn.time"
              [actions]="turn.from === 'user' ? userActions : assistantActions"
              >{{ turn.text }}</ff-chat-message
            >
          }
        </div>
      </app-demo-section>

      <app-demo-section title="Roles">
        <div class="flex w-full max-w-xl flex-col gap-2">
          <ff-chat-message from="user">Right-aligned accent bubble.</ff-chat-message>
          <ff-chat-message from="assistant">Left-aligned, no background.</ff-chat-message>
        </div>
      </app-demo-section>

      <app-demo-section title="Attachments">
        <div class="flex w-full max-w-xl flex-col gap-2">
          <ff-chat-message from="user" [files]="sampleFiles">Can you use this as my new avatar?</ff-chat-message>
          <ff-chat-message from="assistant">Looks great — it'll crop cleanly into the circle.</ff-chat-message>
        </div>
      </app-demo-section>

      <app-demo-section title="Live transcript">
        <div class="flex w-full max-w-xl flex-col gap-4">
          <div class="flex h-64 flex-col justify-end gap-2 overflow-hidden">
            @for (turn of live(); track turn.id) {
              <ff-chat-message [from]="turn.from" [time]="turn.time">{{ turn.text }}</ff-chat-message>
            }
          </div>
          <div class="flex gap-2">
            <button ffButton variant="secondary" [disabled]="live().length >= script.length" (click)="next()">
              Add message
            </button>
            <button ffButton variant="ghost" (click)="live.set([])">Reset</button>
          </div>
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ChatMessageDemo {
  private readonly shape = injectShape();
  protected readonly actionClass = computed(() =>
    cn(
      'inline-flex size-6 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-hover transition-colors duration-100 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
      this.shape().button,
    ),
  );

  protected readonly conversation: Omit<Turn, 'id'>[] = [
    {
      from: 'user',
      time: 'Wednesday 6:06 PM',
      text: 'What does “good design” actually mean? Everyone says it, no one defines it.',
    },
    {
      from: 'assistant',
      text: "Good design is mostly invisible — you only notice it when it's missing. It's less about how something looks and more about how effortlessly it lets you do what you came to do.",
    },
    { from: 'user', time: 'Wednesday 6:07 PM', text: 'So function over form?' },
    {
      from: 'assistant',
      text: 'Not quite. Form is part of function — something that feels good to use is, in a real sense, working better. The split between the two is mostly a myth.',
    },
    { from: 'user', time: 'Wednesday 6:08 PM', text: 'That reframes it completely.' },
  ];

  protected readonly sampleFiles = [new File([AVATAR_SVG], 'avatar.svg', { type: 'image/svg+xml' })];

  protected readonly script = SCRIPT;
  protected readonly live = signal<Turn[]>([]);
  private nextId = 0;

  protected next() {
    const turn = SCRIPT[this.live().length];
    if (turn) this.live.update((turns) => [...turns, { ...turn, id: this.nextId++ }]);
  }
}
