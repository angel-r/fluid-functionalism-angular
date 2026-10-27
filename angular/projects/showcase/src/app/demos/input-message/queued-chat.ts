import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  ChatMessage,
  InputMessage,
  type InputMessageSendEvent,
  type InputMessageStatus,
  type QueuedMessage,
  QueuedStack,
  QueuedStackMorph,
  ThinkingIndicator,
  collapsedStackHeight,
  createQueueId,
  injectQueueCardHeight,
} from '@angel-r/fluid-functionalism-angular';
import { samplePdf, samplePhoto } from './sample-files';

interface Turn {
  id: number;
  from: 'user' | 'assistant';
  text: string;
  thinking?: boolean;
  /** Attachments carried through from the dispatched queue item. */
  files?: File[];
  /** Set on text-only turns dispatched from the queue: the stack card with
   *  the same layout id morphs into this bubble. */
  morphKey?: string;
}

/**
 * The "queued messages" demo (React `QueuedChatDemo`): a streaming reply on a
 * pausable stepper, a Sonner-style queued stack (collapse/expand, drag-
 * reorder, double-click edit, attachment thumbnails), and the queued→sent
 * morph. It loads paused mid-think so the feature reads at a glance.
 */
@Component({
  selector: 'app-queued-chat',
  imports: [InputMessage, ChatMessage, ThinkingIndicator, QueuedStack, QueuedStackMorph],
  // Transparent host: the wrapper below is the stage's flex item, like React's.
  host: { style: 'display: contents' },
  template: `
    <!-- The React preview body is h-[440px] with compact (16px) padding, so
         its self-stretched wrapper is 408px tall. -->
    <div class="relative w-full self-stretch" style="height: 408px">
      <div #scroll class="absolute inset-0 overflow-y-auto scrollbar-hide">
        <div class="flex min-h-full flex-col justify-start gap-2" [style.padding-bottom.px]="transcriptPadding()">
          @for (m of chat(); track m.id) {
            <!-- A dispatched text-only turn morphs from its stack card
                 (text counter-scaled so it doesn't stretch); turns with
                 attachments fade in instead. -->
            <ff-chat-message [from]="m.from" [files]="m.files" [ffQueuedStackMorph]="m.morphKey">
              @if (m.thinking) {
                <ff-thinking-indicator [showIcon]="false" class="px-0 py-0" />
              } @else if (m.morphKey) {
                <span class="inline-block align-top" data-queued-morph-text>{{ m.text }}</span>
              } @else {{{ m.text }}}
            </ff-chat-message>
          }
        </div>
      </div>

      <!-- Queued messages: a Sonner-style stack just above the composer
           (front card = next to dispatch). -->
      <ff-queued-stack
        [(queue)]="queue"
        [bottom]="inputH() + 8"
        [morphLayoutId]="layoutId"
        (edit)="editQueued($event)"
        (remove)="removeQueued($event)"
      />

      <ff-input-message
        #composer
        class="absolute inset-x-0 bottom-0"
        [(value)]="value"
        [(queue)]="queue"
        [status]="status()"
        [showQueue]="false"
        [history]="history()"
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
  protected readonly queue = signal<QueuedMessage[]>([]);
  protected readonly status = signal<InputMessageStatus>('idle');
  protected readonly chat = signal<Turn[]>([]);
  protected readonly paused = signal(false);
  protected readonly inputH = signal(0);
  protected readonly history = computed(() => this.chat().filter((m) => m.from === 'user').map((m) => m.text));
  protected readonly layoutId = (item: QueuedMessage) => `qm-${item.id}`;

  private readonly cardH = injectQueueCardHeight();
  /** Room under the transcript for the floating composer and the collapsed pile. */
  protected readonly transcriptPadding = computed(() => {
    const count = this.queue().length;
    return this.inputH() + 8 + (count > 0 ? collapsedStackHeight(count, this.cardH()) + 8 : 0);
  });

  private readonly composer = viewChild.required(InputMessage);
  private readonly composerEl = viewChild.required('composer', { read: ElementRef<HTMLElement> });
  private readonly scrollEl = viewChild.required<ElementRef<HTMLElement>>('scroll');
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

  /** The preview header action (Resume / Pause / Reset), rendered by the page. */
  readonly playback = computed(() => {
    if (this.paused()) return { icon: 'play' as const, label: 'Resume', run: () => this.resume() };
    if (this.status() === 'streaming') return { icon: 'pause' as const, label: 'Pause', run: () => this.pause() };
    if (this.chat().length > 0 || this.queue().length > 0) {
      return { icon: 'rotate-ccw' as const, label: 'Reset', run: () => this.reset() };
    }
    return null;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.clearStep());
    this.loadInitial();

    // Float the composer over the transcript: track its height.
    afterNextRender(() => {
      const el = this.composerEl().nativeElement;
      this.inputH.set(el.offsetHeight);
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => this.inputH.set(el.offsetHeight));
      ro.observe(el);
      destroyRef.onDestroy(() => ro.disconnect());
    });

    // Keep the transcript pinned to its bottom.
    afterRenderEffect(() => {
      this.chat();
      this.inputH();
      this.queue();
      untracked(() => {
        const el = this.scrollEl().nativeElement;
        el.scrollTop = el.scrollHeight;
      });
    });
  }

  protected onSend({ value, files, meta }: InputMessageSendEvent) {
    if (value) this.respond(value, files, meta?.queuedId);
    // Only clear the composer for a real submit: a queued dispatch carries its
    // own text and files and leaves the in-progress draft untouched.
    if (!meta?.queuedId) this.value.set('');
  }

  protected onStop() {
    this.clearStep();
    this.paused.set(false);
    this.patchAssistant((m) => (m.thinking || m.text === '' ? { text: 'Stopped.' } : { text: m.text }));
    this.status.set('idle');
  }

  protected editQueued(item: QueuedMessage) {
    this.value.set(item.text);
    this.queue.update((q) => q.filter((x) => x.id !== item.id));
    requestAnimationFrame(() => {
      this.composer().focus();
      const textarea = this.composerEl().nativeElement.querySelector('textarea');
      textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
    });
  }

  protected removeQueued(item: QueuedMessage) {
    this.queue.update((q) => q.filter((x) => x.id !== item.id));
  }

  private respond(text: string, files: File[] = [], queuedId?: string) {
    const reply = `Replying to “${text}”. Here's a fuller answer that streams in a word at a time so you can watch the queue release the next message.`;
    this.chat.update((c) => [
      ...c,
      {
        id: this.nextTurn++,
        from: 'user',
        text,
        files,
        // A dispatched text message morphs from its stack card.
        morphKey: queuedId && files.length === 0 ? this.layoutId({ id: queuedId, text, files }) : undefined,
      },
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

  // Seed: a reply paused mid-think with a few messages queued (the first
  // carrying attachments), so the front card nudges the user to press ▶.
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

  // Reset returns to the initial seeded state, not an empty composer.
  private reset() {
    this.clearStep();
    this.value.set('');
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
