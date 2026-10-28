// ---------------------------------------------------------------------------
// The Code tab of every InputMessage section, as Angular. Ported from the
// snippet constants in app/docs/input-message/page.tsx: same demo, same
// comments, rewritten against `@angel-r/fluid-functionalism-angular` (S8).
// ---------------------------------------------------------------------------

/** The basic composer: a two-way draft, and clearing it on send. Selects the
 *  page's Installation prompt usage snippet too. */
export const basicCode = `import { signal } from "@angular/core";
import { InputMessage } from "@angel-r/fluid-functionalism-angular";

readonly value = signal("");

// template
<div class="w-full max-w-xl">
  <ff-input-message
    [(value)]="value"
    (send)="value.set('')"
  />
</div>`;

export const suggestionsCode = `import { signal } from "@angular/core";
import { InputMessage } from "@angel-r/fluid-functionalism-angular";

readonly suggestions = [
  "What is Fluid Functionalism about?",
  "How does Micka tune the springs behind these animations?",
  "Install the InputMessage component in my project",
  "Draft a short thank-you note to Micka for the library",
];

readonly value = signal("");

// template
<div class="w-full max-w-xl">
  <!-- The ghost placeholder renders with a Tab keycap — Tab fills it into the
       composer. ArrowDown/ArrowUp walk the list below (focus stays in the
       textarea) and Enter or click fills the highlighted prompt; the first row
       shows a ↓ hint until a row is highlighted. Typing collapses the list. -->
  <ff-input-message
    [(value)]="value"
    (send)="value.set('')"
    placeholderSuggestion="Why is every other input box so stiff?"
    [suggestions]="suggestions"
  />
</div>`;

export const attachmentsCode = `import {
  DestroyRef, ElementRef, afterNextRender, afterRenderEffect,
  inject, signal, untracked, viewChild,
} from "@angular/core";
import {
  ChatMessage, InputMessage, type InputMessageSendEvent,
} from "@angel-r/fluid-functionalism-angular";

type Turn = { from: "user" | "assistant"; text: string; files?: File[] };

readonly value = signal("");
readonly files = signal<File[]>([]);
readonly messages = signal<Turn[]>([]);
readonly inputH = signal(0);
private readonly composerEl = viewChild.required("composer", { read: ElementRef });
private readonly scrollEl = viewChild.required<ElementRef<HTMLElement>>("scroll");
private readonly destroyRef = inject(DestroyRef);

constructor() {
  // Pre-fill the composer with a real image + PDF. Images use object-cover;
  // PDFs render their first page with a FILE_THUMBNAIL_PDF_RENDERER. Both show the × remove button.
  void Promise.all([
    fetch("micka.png")
      .then((r) => r.blob())
      .then((b) => new File([b], "micka.png", { type: "image/png" })),
    fetch("Receipt-2581-4039-8265.pdf")
      .then((r) => r.blob())
      .then((b) => new File([b], "Receipt-2581-4039-8265.pdf", { type: "application/pdf" })),
  ]).then((files) => this.files.set(files));

  // Float the composer over the history: measure its height to reserve scroll
  // padding, and keep the transcript pinned to the bottom as it grows.
  afterNextRender(() => {
    const el = this.composerEl().nativeElement;
    this.inputH.set(el.offsetHeight);
    const observer = new ResizeObserver(() => this.inputH.set(el.offsetHeight));
    observer.observe(el);
    this.destroyRef.onDestroy(() => observer.disconnect());
  });
  afterRenderEffect(() => {
    this.messages();
    this.inputH();
    untracked(() => {
      const el = this.scrollEl().nativeElement;
      el.scrollTop = el.scrollHeight;
    });
  });
}

// Send pushes the message along with its attachments into the transcript.
onSend({ value, files }: InputMessageSendEvent) {
  if (!value && files.length === 0) return;
  this.messages.update((prev) => [...prev, { from: "user", text: value, files }]);
  this.value.set("");
  this.files.set([]);
}

// template
<div class="relative w-full h-[440px]">
  <div #scroll class="absolute inset-0 overflow-y-auto scrollbar-hide">
    <div
      class="flex min-h-full flex-col justify-start gap-2"
      [style.padding-bottom.px]="inputH() + 12"
    >
      @for (m of messages(); track $index) {
        <ff-chat-message [from]="m.from" [files]="m.files">{{ m.text }}</ff-chat-message>
      }
    </div>
  </div>
  <ff-input-message
    #composer
    class="absolute inset-x-0 bottom-0"
    [(value)]="value"
    [(files)]="files"
    (send)="onSend($event)"
  />
</div>`;

export const leftOnlyCode = `import { signal } from "@angular/core";
import { Button, Icon, InputMessage } from "@angel-r/fluid-functionalism-angular";

readonly value = signal("");

// template
<ng-template #attachSlot>
  <button ffButton variant="ghost" size="icon-sm" aria-label="Attach">
    <ff-icon name="plus" />
  </button>
</ng-template>

<div class="w-full max-w-xl">
  <ff-input-message
    [(value)]="value"
    [leftSlot]="attachSlot"
  />
</div>`;

export const rightOnlyCode = `import { signal } from "@angular/core";
import { Button, InputMessage } from "@angel-r/fluid-functionalism-angular";

readonly value = signal("");

// template
<ng-template #modelSlot>
  <button ffButton variant="ghost" size="sm" trailingIcon="chevron-down">Sonnet 4.6</button>
</ng-template>

<div class="w-full max-w-xl">
  <ff-input-message
    [(value)]="value"
    [rightSlot]="modelSlot"
  />
</div>`;

export const sendHandlerCode = `import { signal } from "@angular/core";
import {
  ChatMessage, InputMessage, type InputMessageSendEvent,
} from "@angel-r/fluid-functionalism-angular";

readonly value = signal("");
readonly messages = signal<string[]>([]);

onSend({ value }: InputMessageSendEvent) {
  if (value) this.messages.update((prev) => [...prev, value]);
  this.value.set("");
}

// template
<div class="flex w-full max-w-xl flex-col gap-3">
  @if (messages().length > 0) {
    <div class="flex flex-col gap-2">
      @for (m of messages(); track $index) {
        <ff-chat-message from="user">{{ m }}</ff-chat-message>
      }
    </div>
  }
  <ff-input-message
    [(value)]="value"
    (send)="onSend($event)"
    placeholder="Press Enter to send. Shift+Enter for newline."
  />
</div>`;

export const queuedCode = `import {
  DestroyRef, ElementRef, afterNextRender, afterRenderEffect, computed,
  inject, signal, untracked, viewChild,
} from "@angular/core";
import {
  ChatMessage, InputMessage, QueuedStack, QueuedStackMorph, ThinkingIndicator,
  collapsedStackHeight, injectQueueCardHeight,
  type InputMessageSendEvent, type QueuedMessage,
} from "@angel-r/fluid-functionalism-angular";

// Sent turns dispatched from the queue keep their queued id, so the front
// stack card and the sent bubble can share a layout id and morph.
type Turn = { from: "user" | "assistant"; text: string; thinking?: boolean; id?: string };

readonly value = signal("");
readonly queue = signal<QueuedMessage[]>([]);
readonly status = signal<"idle" | "streaming">("idle");
readonly chat = signal<Turn[]>([]);
// The message currently playing its queued→sent morph. The morph key applies
// ONLY to this one, ONLY briefly — otherwise every transcript reflow would
// re-fire the layout animation on the settled bubble.
readonly morphingId = signal<string | null>(null);
readonly history = computed(() =>
  this.chat().filter((m) => m.from === "user").map((m) => m.text),
);
readonly morphId = (id: string) => \`qm-\${id}\`;

// Float the composer over the transcript: measure it to reserve scroll
// padding (+ the collapsed stack), and keep the transcript pinned.
readonly inputH = signal(0);
private readonly cardH = injectQueueCardHeight();
readonly reservedBottom = computed(
  () =>
    this.inputH() +
    8 +
    (this.queue().length > 0
      ? collapsedStackHeight(this.queue().length, this.cardH()) + 8
      : 0),
);

private readonly timers: number[] = [];
private readonly composerEl = viewChild.required("composer", { read: ElementRef });
private readonly scrollEl = viewChild.required<ElementRef<HTMLElement>>("scroll");

constructor() {
  const destroyRef = inject(DestroyRef);
  afterNextRender(() => {
    const el = this.composerEl().nativeElement;
    this.inputH.set(el.offsetHeight);
    const observer = new ResizeObserver(() => this.inputH.set(el.offsetHeight));
    observer.observe(el);
    destroyRef.onDestroy(() => observer.disconnect());
  });
  afterRenderEffect(() => {
    this.chat();
    this.inputH();
    this.queue();
    untracked(() => {
      const el = this.scrollEl().nativeElement;
      el.scrollTop = el.scrollHeight;
    });
  });
  destroyRef.onDestroy(() => this.timers.forEach(clearTimeout));
}

// Stand-in for a real assistant: append the user turn plus an assistant
// placeholder in its "thinking" state, hold there for a beat, then stream the
// reply in word-by-word. The final streaming→idle edge releases the next
// queued message.
private respond(text: string, queuedId?: string) {
  const reply = \`Replying to "\${text}". A fuller answer that streams in…\`;
  this.chat.update((c) => [
    ...c,
    { from: "user", text, id: queuedId },
    { from: "assistant", text: "", thinking: true },
  ]);
  this.status.set("streaming");

  // A dispatched (from-queue) message morphs from its stack card: flag it,
  // then drop the morph key once the transition has settled.
  if (queuedId) {
    this.morphingId.set(queuedId);
    this.timers.push(setTimeout(() => this.morphingId.set(null), 450));
  }

  const words = reply.split(" ");
  this.timers.push(
    setTimeout(() => {
      words.forEach((_, i) => {
        this.timers.push(
          setTimeout(() => {
            this.chat.update((c) =>
              c.map((m, k) =>
                k === c.length - 1
                  ? { from: "assistant", text: words.slice(0, i + 1).join(" ") }
                  : m,
              ),
            );
            if (i === words.length - 1) this.status.set("idle");
          }, i * 150),
        );
      });
    }, 4000),
  ); // think before streaming
}

// While idle this sends; the component also calls send itself to auto-dispatch
// the head of the queue on each streaming→idle edge — meta.queuedId tags those
// so the morph can find its stack card, and a dispatch must leave any
// in-progress draft untouched.
onSend({ value, meta }: InputMessageSendEvent) {
  if (value) this.respond(value, meta?.queuedId);
  if (!meta?.queuedId) this.value.set("");
}

// Stop ends the current response; returning to idle immediately releases the
// next queued message.
onStop() {
  this.timers.forEach(clearTimeout);
  this.status.set("idle");
}

editQueued(item: QueuedMessage) {
  this.value.set(item.text);
  this.queue.update((q) => q.filter((x) => x.id !== item.id));
}

removeQueued(item: QueuedMessage) {
  this.queue.update((q) => q.filter((x) => x.id !== item.id));
}

// Queue interactions: double-click (or Enter/F2) a row to edit it back into
// the composer, × (or Delete) to remove, drag or Alt+↑/↓ to reorder.

// template
<div class="relative w-full self-stretch">
  <div #scroll class="absolute inset-0 overflow-y-auto scrollbar-hide">
    <div
      class="flex min-h-full flex-col justify-start gap-2"
      [style.padding-bottom.px]="reservedBottom()"
    >
      @for (m of chat(); track $index) {
        @if (m.thinking) {
          <ff-chat-message from="assistant">
            <ff-thinking-indicator [showIcon]="false" class="px-0 py-0" />
          </ff-chat-message>
        } @else {
          <!-- Queued→sent morph: the bubble claims the stack card's box under
               the same layout id; the inner span is counter-scaled so the text
               doesn't stretch with the box. -->
          <ff-chat-message
            [from]="m.from"
            [ffQueuedStackMorph]="m.id === morphingId() ? morphId(m.id) : undefined"
          >
            <span class="inline-block align-top" data-queued-morph-text>{{ m.text }}</span>
          </ff-chat-message>
        }
      }
    </div>
  </div>

  <!-- Render the queue yourself as a Sonner-style stack overlaying just above
       the composer: a pile that fans out on hover. Front card (queue[0]) is
       next to dispatch. Double-click edits, × removes, drag reorders. -->
  <ff-queued-stack
    [(queue)]="queue"
    [bottom]="inputH() + 8"
    [morphLayoutId]="morphId"
    (edit)="editQueued($event)"
    (remove)="removeQueued($event)"
  />

  <ff-input-message
    #composer
    class="absolute inset-x-0 bottom-0"
    [(value)]="value"
    [status]="status()"
    [(queue)]="queue"
    [showQueue]="false"
    [history]="history()"
    (send)="onSend($event)"
    (stop)="onStop()"
    placeholder="Send while I'm responding to queue a message…"
  />
</div>`;

export const disabledCode = `import { InputMessage } from "@angel-r/fluid-functionalism-angular";

// template
<div class="w-full max-w-xl">
  <ff-input-message value="This composer is disabled" disabled />
</div>`;
