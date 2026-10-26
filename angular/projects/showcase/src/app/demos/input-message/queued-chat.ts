import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  Button,
  ChatMessage,
  Icon,
  InputMessage,
  type InputMessageSendEvent,
  type InputMessageStatus,
  type QueuedMessage,
  ThinkingIndicator,
  Tooltip,
  createQueueId,
} from 'fluid-functionalism';
import { samplePdf, samplePhoto } from './sample-files';

interface Turn {
  id: number;
  from: 'user' | 'assistant';
  text: string;
  thinking?: boolean;
  files?: File[];
}

/**
 * The "queued messages" demo: a streaming reply on a pausable stepper, with
 * messages queued while it streams and released one by one on the
 * streaming → idle edge. It loads paused mid-think with a few messages queued
 * so the feature reads at a glance.
 *
 * The React docs render the queue as a Sonner-style stack (the queued-stack
 * block, ported in the next tier) with `showQueue={false}`; until that block
 * lands this demo uses the composer's built-in reorderable rows.
 */
@Component({
  selector: 'app-queued-chat',
  imports: [InputMessage, ChatMessage, ThinkingIndicator, Button, Icon, Tooltip],
  template: `
    <ng-template #attach let-openFilePicker="openFilePicker">
      <ff-tooltip content="Add" side="top">
        <button ffButton variant="ghost" size="icon-sm" aria-label="Attach files" (click)="openFilePicker()">
          <ff-icon name="plus" />
        </button>
      </ff-tooltip>
    </ng-template>

    <div class="flex w-full max-w-xl flex-col gap-3">
      <div class="flex justify-end">
        <ff-tooltip [content]="playback().label" side="top">
          <button ffButton variant="ghost" size="icon-sm" [attr.aria-label]="playback().label" (click)="playback().run()">
            <ff-icon [name]="playback().icon" [size]="16" [strokeWidth]="1.5" />
          </button>
        </ff-tooltip>
      </div>
      <div class="flex h-72 flex-col justify-end gap-2 overflow-hidden">
        @for (m of chat(); track m.id) {
          @if (m.thinking) {
            <ff-chat-message from="assistant">
              <ff-thinking-indicator [showIcon]="false" class="px-0 py-0" />
            </ff-chat-message>
          } @else {
            <ff-chat-message [from]="m.from" [files]="m.files">{{ m.text }}</ff-chat-message>
          }
        }
      </div>
      <ff-input-message
        [(value)]="value"
        [(files)]="files"
        [(queue)]="queue"
        [status]="status()"
        [history]="history()"
        [leftSlot]="attach"
        placeholder="Send while I’m responding to queue a message…"
        (send)="onSend($event)"
        (stop)="onStop()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueuedChatDemo {
  protected readonly value = signal('');
  protected readonly files = signal<File[]>([]);
  protected readonly queue = signal<QueuedMessage[]>([]);
  protected readonly status = signal<InputMessageStatus>('idle');
  protected readonly chat = signal<Turn[]>([]);
  protected readonly paused = signal(false);
  protected readonly history = computed(() => this.chat().filter((m) => m.from === 'user').map((m) => m.text));
  private nextTurn = 0;

  // ── Pausable stepper: drives the in-flight reply (think → stream word by
  // word). The cascade pauses with it, since status only reaches "idle" once
  // a reply finishes streaming.
  private step: {
    id: ReturnType<typeof setTimeout> | null;
    cb: (() => void) | null;
    remaining: number;
    startedAt: number;
  } = { id: null, cb: null, remaining: 0, startedAt: 0 };

  protected readonly playback = computed(() => {
    if (this.paused()) return { icon: 'play' as const, label: 'Resume', run: () => this.resume() };
    if (this.status() === 'streaming') return { icon: 'pause' as const, label: 'Pause', run: () => this.pause() };
    return { icon: 'rotate-ccw' as const, label: 'Reset', run: () => this.reset() };
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearStep());
    this.loadInitial();
  }

  protected onSend({ value, files, meta }: InputMessageSendEvent) {
    if (value) this.respond(value, files);
    // Only clear the composer for a real submit: a queued dispatch carries its
    // own text and files and leaves the in-progress draft untouched.
    if (!meta?.queuedId) {
      this.value.set('');
      this.files.set([]);
    }
  }

  protected onStop() {
    this.clearStep();
    this.paused.set(false);
    this.patchAssistant((m) => (m.thinking || m.text === '' ? { text: 'Stopped.' } : { text: m.text }));
    this.status.set('idle');
  }

  private respond(text: string, files: File[] = []) {
    const reply = `Replying to “${text}”. Here's a fuller answer that streams in a word at a time so you can watch the queue release the next message.`;
    this.chat.update((c) => [
      ...c,
      { id: this.nextTurn++, from: 'user', text, files },
      { id: this.nextTurn++, from: 'assistant', text: '', thinking: true },
    ]);
    this.status.set('streaming');
    const words = reply.split(' ');
    const reveal = (i: number) => {
      this.patchAssistant(() => ({ text: words.slice(0, i + 1).join(' ') }));
      if (i === words.length - 1) {
        this.status.set('idle');
        return;
      }
      this.armStep(() => reveal(i + 1), 150);
    };
    this.armStep(() => reveal(0), 4000);
  }

  private patchAssistant(fn: (m: Turn) => { text: string }) {
    this.chat.update((c) => {
      const next = [...c];
      for (let k = next.length - 1; k >= 0; k--) {
        if (next[k].from === 'assistant') {
          next[k] = { id: next[k].id, from: 'assistant', ...fn(next[k]), thinking: false };
          break;
        }
      }
      return next;
    });
  }

  // Seed: a reply paused mid-think with three messages queued (the first
  // carrying attachments), so the play button nudges the user to press ▶.
  private loadInitial() {
    this.paused.set(true);
    this.respond('Help me polish the dashboard design');
    this.queue.set([
      { id: createQueueId(), text: 'Match these mockups', files: [samplePhoto(), samplePdf()] },
      { id: createQueueId(), text: 'Tighten the spacing', files: [] },
      {
        id: createQueueId(),
        text: 'Audit the color contrast across the dashboard and suggest accessible token values',
        files: [],
      },
    ]);
  }

  private reset() {
    this.clearStep();
    this.value.set('');
    this.files.set([]);
    this.chat.set([]);
    this.queue.set([]);
    this.status.set('idle');
    this.loadInitial();
  }

  private armStep(cb: () => void, delay: number) {
    this.step.cb = cb;
    this.step.remaining = delay;
    if (this.paused()) return;
    this.step.startedAt = performance.now();
    this.step.id = setTimeout(() => this.fireStep(), delay);
  }

  private fireStep() {
    const cb = this.step.cb;
    this.step.id = null;
    this.step.cb = null;
    cb?.();
  }

  private clearStep() {
    if (this.step.id != null) clearTimeout(this.step.id);
    this.step = { id: null, cb: null, remaining: 0, startedAt: 0 };
  }

  private pause() {
    if (this.step.id != null) {
      clearTimeout(this.step.id);
      this.step.id = null;
      this.step.remaining = Math.max(0, this.step.remaining - (performance.now() - this.step.startedAt));
    }
    this.paused.set(true);
  }

  private resume() {
    this.paused.set(false);
    if (this.step.cb != null && this.step.id == null) {
      this.step.startedAt = performance.now();
      this.step.id = setTimeout(() => this.fireStep(), this.step.remaining);
    }
  }
}
