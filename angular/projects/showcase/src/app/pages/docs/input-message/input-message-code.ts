// ---------------------------------------------------------------------------
// Code generation for the InputMessage playground, Angular.
//
// Two generators, as on the reference (D5):
// - `buildPlaygroundCode`: the teaching snippet the Code tab shows, kept in
//   sync with the rail (free class fragments + the template, like React's
//   useState/JSX pair, rewritten as signals and Angular control flow).
// - `buildPresetSnippet`: the install-grade file the Share dialog's copy
//   prompt carries — one compilable component, plus the `provideFluid()` call
//   the visitor's shape and size imply.
// ---------------------------------------------------------------------------

import type { PresetGlobals } from '../../../docs-kit/preset/preset-globals';
import type { InputMessagePlayState } from './input-message-preset';
import { IM_PLACEHOLDER_PROMPT, IM_SEED_MESSAGE, IM_SUGGESTIONS } from './input-message-preset';

// ── Teaching snippet (the Code tab) ────────────────────────────────────────

export function buildPlaygroundCode(o: InputMessagePlayState): string {
  const queueOn = o.status !== 'off';
  const filesOn = o.leftSlot || o.attachments;
  const slots = o.leftSlot || o.rightSlot;

  const library = ['ChatMessage', 'InputMessage'];
  if (slots) library.push('Button');
  if (o.leftSlot) library.push('Icon', 'Tooltip');
  if (queueOn) library.push('QueuedStack', 'collapsedStackHeight', 'injectQueueCardHeight');
  if (queueOn) library.push('type QueuedMessage');
  library.push('type InputMessageSendEvent');

  const core = ['afterNextRender', 'afterRenderEffect', 'ElementRef', 'signal', 'untracked', 'viewChild'];
  if (o.historyOn || queueOn) core.splice(2, 0, 'computed');

  const l: string[] = [];
  l.push(`import { ${core.join(', ')} } from "@angular/core";`);
  l.push(`import { ${library.join(', ')} } from "@angel-r/fluid-functionalism-angular";`);
  l.push('');

  l.push(`readonly value = signal("");`);
  l.push(`readonly messages = signal([{ text: ${JSON.stringify(IM_SEED_MESSAGE)}, files: [] as File[] }]);`);
  if (filesOn) l.push(`readonly files = signal<File[]>([]);`);
  if (queueOn) {
    l.push(`readonly queue = signal<QueuedMessage[]>([]);`);
    l.push(`readonly status = signal<"idle" | "streaming">(${JSON.stringify(o.status)});`);
  }
  if (o.suggestionsOn) {
    l.push(`readonly suggestions = [`);
    for (const s of IM_SUGGESTIONS) l.push(`  ${JSON.stringify(s)},`);
    l.push(`];`);
  }
  if (o.historyOn) l.push(`readonly history = computed(() => this.messages().map((m) => m.text));`);

  l.push('');
  l.push(`// Float the composer over the transcript: measure it to reserve scroll`);
  l.push(
    queueOn
      ? `// padding (plus the collapsed queue stack) and to position the stack, and`
      : `// padding, and keep the transcript pinned to the latest message.`,
  );
  if (queueOn) l.push(`// keep the transcript pinned to the latest message.`);
  l.push(`readonly inputH = signal(0);`);
  if (queueOn) {
    l.push(`// Floating room for the collapsed stack (44px front card + 12px per`);
    l.push(`// peek, max 2 peeks), reserved under the transcript.`);
    l.push(`private readonly cardH = injectQueueCardHeight();`);
    l.push(`readonly collapsedStackH = computed(() => collapsedStackHeight(this.queue().length, this.cardH()));`);
  }
  l.push(`private readonly composerEl = viewChild.required("composer", { read: ElementRef });`);
  l.push(`private readonly scrollEl = viewChild.required<ElementRef<HTMLElement>>("scroll");`);
  l.push('');
  l.push(`constructor() {`);
  if (o.attachments) {
    l.push(`  // Pre-fill the composer with a real image + PDF. Images use object-cover;`);
    l.push(`  // PDFs render their first page via pdfjs. Both show the × remove button.`);
    l.push(`  void Promise.all([`);
    l.push(`    fetch("micka.png")`);
    l.push(`      .then((r) => r.blob())`);
    l.push(`      .then((b) => new File([b], "micka.png", { type: "image/png" })),`);
    l.push(`    fetch("Receipt-2581-4039-8265.pdf")`);
    l.push(`      .then((r) => r.blob())`);
    l.push(`      .then((b) => new File([b], "Receipt-2581-4039-8265.pdf", { type: "application/pdf" })),`);
    l.push(`  ]).then((files) => this.files.set(files));`);
    l.push('');
  }
  l.push(`  afterNextRender(() => {`);
  l.push(`    const el = this.composerEl().nativeElement;`);
  l.push(`    this.inputH.set(el.offsetHeight);`);
  l.push(`    const observer = new ResizeObserver(() => this.inputH.set(el.offsetHeight));`);
  l.push(`    observer.observe(el);`);
  l.push(`  });`);
  l.push(`  afterRenderEffect(() => {`);
  l.push(`    this.messages();`);
  l.push(`    this.inputH();`);
  if (queueOn) l.push(`    this.queue();`);
  l.push(`    untracked(() => {`);
  l.push(`      const el = this.scrollEl().nativeElement;`);
  l.push(`      el.scrollTop = el.scrollHeight;`);
  l.push(`    });`);
  l.push(`  });`);
  l.push(`}`);
  l.push('');
  l.push(`onSend({ value, files }: InputMessageSendEvent) {`);
  l.push(`  if (value || files.length) this.messages.update((m) => [...m, { text: value, files }]);`);
  l.push(`  this.value.set("");`);
  if (filesOn) l.push(`  this.files.set([]);`);
  l.push(`}`);

  // ── Template ──
  l.push('');
  l.push(`// template`);
  l.push(`<div class="relative w-full self-stretch">`);
  l.push(`  <div #scroll class="absolute inset-0 overflow-y-auto scrollbar-hide">`);
  l.push(`    <div`);
  l.push(`      class="flex min-h-full flex-col justify-start gap-2"`);
  l.push(
    queueOn
      ? `      [style.padding-bottom.px]="inputH() + 8 + (queue().length > 0 ? collapsedStackH() + 8 : 0)"`
      : `      [style.padding-bottom.px]="inputH() + 8"`,
  );
  l.push(`    >`);
  l.push(`      @for (m of messages(); track $index) {`);
  l.push(`        <ff-chat-message from="user" [files]="m.files">{{ m.text }}</ff-chat-message>`);
  l.push(`      }`);
  l.push(`    </div>`);
  l.push(`  </div>`);
  if (queueOn) {
    l.push(`  <!-- Render the queued messages yourself here — e.g. the Sonner-style`);
    l.push(`      stack from the "Queued messages" demo — just above the measured`);
    l.push(`      composer: <ff-queued-stack [(queue)]="queue" [bottom]="inputH() + 8" />. -->`);
  }
  if (o.historyOn) {
    l.push(`  <!-- ArrowUp recalls sent messages, ArrowDown walks back to the draft. -->`);
  }
  if (queueOn) {
    l.push(`  <!-- While streaming, submits enqueue; flipping back to idle dispatches`);
    l.push(`      the head of the queue through send. The built-in queue rows are off`);
    l.push(`      because the stack above renders the queue itself. -->`);
  }
  l.push(`  <ff-input-message`);
  l.push(`    #composer`);
  l.push(`    class="absolute inset-x-0 bottom-0"`);
  l.push(`    [(value)]="value"`);
  l.push(`    (send)="onSend($event)"`);
  if (o.suggestion) l.push(`    placeholderSuggestion=${JSON.stringify(IM_PLACEHOLDER_PROMPT)}`);
  if (o.suggestionsOn) l.push(`    [suggestions]="suggestions"`);
  if (o.historyOn) l.push(`    [history]="history()"`);
  if (o.minRows > 1) l.push(`    [minRows]="${o.minRows}"`);
  if (o.disabled) l.push(`    disabled`);
  if (filesOn) l.push(`    [(files)]="files"`);
  if (o.leftSlot) l.push(`    [leftSlot]="attachSlot"`);
  if (o.rightSlot) l.push(`    [rightSlot]="modelSlot"`);
  if (queueOn) {
    l.push(`    [status]="status()"`);
    l.push(`    [(queue)]="queue"`);
    l.push(`    (stop)="status.set('idle')"`);
    l.push(`    [showQueue]="false"`);
  }
  l.push(`  />`);
  l.push(`</div>`);
  if (slots) {
    l.push('');
    if (o.leftSlot) {
      l.push(`<ng-template #attachSlot let-openFilePicker="openFilePicker">`);
      l.push(`  <ff-tooltip content="Attach" side="top">`);
      l.push(`    <button ffButton variant="ghost" size="icon-sm" aria-label="Attach files" (click)="openFilePicker()">`);
      l.push(`      <ff-icon name="plus" />`);
      l.push(`    </button>`);
      l.push(`  </ff-tooltip>`);
      l.push(`</ng-template>`);
    }
    if (o.rightSlot) {
      l.push(`<ng-template #modelSlot>`);
      l.push(`  <button ffButton variant="ghost" size="sm" trailingIcon="chevron-down">Sonnet 5</button>`);
      l.push(`</ng-template>`);
    }
  }
  return l.join('\n');
}

// ── Installable preset snippet (the Share dialog's prompt) ─────────────────

/** The compilable file the preset's copy prompt carries, plus the provider
 *  call: one component that composes the composer exactly as configured. */
export function buildPresetSnippet(o: InputMessagePlayState, globals: PresetGlobals): string {
  const queueOn = o.status !== 'off';
  const filesOn = o.leftSlot || o.attachments;
  const slots = o.leftSlot || o.rightSlot;

  const library = ['ChatMessage', 'InputMessage'];
  if (slots) library.push('Button');
  if (o.leftSlot) library.push('Tooltip', 'Icon');
  if (queueOn) {
    library.push('QueuedStack', 'QueuedStackMorph', 'collapsedStackHeight', 'injectQueueCardHeight');
  }
  library.push('type InputMessageSendEvent');
  if (queueOn) library.push('type QueuedMessage');

  const imports = [
    'ChatMessage',
    'InputMessage',
    ...(slots ? ['Button'] : []),
    ...(o.leftSlot ? ['Tooltip', 'Icon'] : []),
    ...(queueOn ? ['QueuedStack', 'QueuedStackMorph'] : []),
  ];

  const core = [
    'Component',
    'DestroyRef',
    'ElementRef',
    'afterNextRender',
    'afterRenderEffect',
    'inject',
    'signal',
    'untracked',
    'viewChild',
    'type ApplicationConfig',
  ];
  if (queueOn || o.historyOn) core.splice(5, 0, 'computed');

  const l: string[] = [];
  l.push(`// chat-composer.ts — generated from your InputMessage playground configuration.`);
  l.push(`import { ${core.join(', ')} } from "@angular/core";`);
  l.push(`import { provideFluid } from "@angel-r/fluid-functionalism-angular";`);
  l.push(`import { ${library.join(', ')} } from "@angel-r/fluid-functionalism-angular";`);
  l.push('');

  l.push(`interface Turn {`);
  if (queueOn) {
    l.push(`  id: string;`);
    l.push(`  from: "user" | "assistant";`);
  }
  l.push(`  text: string;`);
  if (filesOn) l.push(`  files: File[];`);
  l.push(`}`);
  l.push('');

  l.push(`@Component({`);
  l.push(`  selector: "app-chat-composer",`);
  l.push(`  imports: [${imports.join(', ')}],`);
  l.push(`  template: \``);

  if (o.leftSlot) {
    l.push(`    <ng-template #attachSlot let-openFilePicker="openFilePicker">`);
    l.push(`      <ff-tooltip content="Attach" side="top">`);
    l.push(`        <button ffButton variant="ghost" size="icon-sm" aria-label="Attach files" (click)="openFilePicker()">`);
    l.push(`          <ff-icon name="plus" />`);
    l.push(`        </button>`);
    l.push(`      </ff-tooltip>`);
    l.push(`    </ng-template>`);
    l.push('');
  }
  if (o.rightSlot) {
    l.push(`    <ng-template #modelSlot>`);
    l.push(`      <button ffButton variant="ghost" size="sm" trailingIcon="chevron-down">Sonnet 5</button>`);
    l.push(`    </ng-template>`);
    l.push('');
  }

  l.push(`    <div class="relative w-full self-stretch">`);
  l.push(`      <div #scroll class="absolute inset-0 overflow-y-auto scrollbar-hide">`);
  l.push(`        <div`);
  l.push(`          class="flex min-h-full flex-col justify-start gap-2"`);
  l.push(
    queueOn
      ? `          [style.padding-bottom.px]="reservedBottom()"`
      : `          [style.padding-bottom.px]="inputH() + 8"`,
  );
  l.push(`        >`);
  const filesBinding = filesOn ? ' [files]="m.files"' : '';
  const morphBinding = queueOn ? ` [ffQueuedStackMorph]="m.id === morphingId() ? layoutId(m) : undefined"` : '';
  const bubbleText = queueOn
    ? `                <span class="inline-block align-top" data-queued-morph-text>{{ m.text }}</span>`
    : `              {{ m.text }}`;
  l.push(`          @for (m of messages(); track $index) {`);
  if (queueOn) {
    l.push(`            @if (m.from === "assistant") {`);
    l.push(`              <div class="max-w-[80%] self-start whitespace-pre-wrap break-words py-2 text-[14px] text-foreground">`);
    l.push(`                {{ m.text }}`);
    l.push(`              </div>`);
    l.push(`            } @else {`);
    l.push(`              <ff-chat-message from="user"${filesBinding}${morphBinding}>`);
    l.push(bubbleText);
    l.push(`              </ff-chat-message>`);
    l.push(`            }`);
  } else {
    l.push(`            <ff-chat-message from="user"${filesBinding}>`);
    l.push(bubbleText);
    l.push(`            </ff-chat-message>`);
  }
  l.push(`          }`);
  l.push(`        </div>`);
  l.push(`      </div>`);
  l.push('');
  if (queueOn) {
    l.push(`      <!-- Queued messages — a Sonner-style stack floated just above the`);
    l.push(`          composer (front card = next to dispatch). -->`);
    l.push(`      <ff-queued-stack`);
    l.push(`        [(queue)]="queue"`);
    l.push(`        [bottom]="inputH() + 8"`);
    l.push(`        [morphLayoutId]="layoutId"`);
    l.push(`        (edit)="editQueued($event)"`);
    l.push(`        (remove)="removeQueued($event)"`);
    l.push(`      />`);
    l.push('');
  }
  if (queueOn && o.historyOn) {
    l.push(`      <!-- While streaming, submits enqueue; flipping back to idle dispatches`);
    l.push(`          the head of the queue through send. ArrowUp recalls sent messages,`);
    l.push(`          ArrowDown walks back to the draft. -->`);
  } else if (queueOn) {
    l.push(`      <!-- While streaming, submits enqueue; flipping back to idle dispatches`);
    l.push(`          the head of the queue through send. -->`);
  } else if (o.historyOn) {
    l.push(`      <!-- ArrowUp recalls sent messages, ArrowDown walks back to the draft. -->`);
  }
  l.push(`      <ff-input-message`);
  l.push(`        #composer`);
  l.push(`        class="absolute inset-x-0 bottom-0"`);
  l.push(`        [(value)]="value"`);
  l.push(`        (send)="onSend($event)"`);
  if (o.suggestion) l.push(`        placeholderSuggestion=${JSON.stringify(IM_PLACEHOLDER_PROMPT)}`);
  if (o.suggestionsOn) l.push(`        [suggestions]="suggestions"`);
  if (o.historyOn) l.push(`        [history]="history()"`);
  if (o.minRows > 1) l.push(`        [minRows]="${o.minRows}"`);
  if (o.disabled) l.push(`        disabled`);
  if (filesOn) l.push(`        [(files)]="files"`);
  if (o.leftSlot) l.push(`        [leftSlot]="attachSlot"`);
  if (o.rightSlot) l.push(`        [rightSlot]="modelSlot"`);
  if (queueOn) {
    l.push(`        [status]="status()"`);
    l.push(`        [(queue)]="queue"`);
    l.push(`        (stop)="onStop()"`);
    l.push(`        [showQueue]="false"`);
  }
  l.push(`      />`);
  l.push(`    </div>`);
  l.push(`  \`,`);
  l.push(`})`);
  l.push(`export class ChatComposer {`);
  l.push(`  readonly value = signal("");`);
  if (o.suggestionsOn) {
    l.push(`  readonly suggestions = [`);
    for (const s of IM_SUGGESTIONS) l.push(`    ${JSON.stringify(s)},`);
    l.push(`  ];`);
  }
  if (queueOn) {
    l.push(`  readonly messages = signal<Turn[]>([`);
    l.push(`    { id: "seed", from: "user", text: ${JSON.stringify(IM_SEED_MESSAGE)}${filesOn ? ', files: []' : ''} },`);
    l.push(`  ]);`);
  } else {
    l.push(`  readonly messages = signal<Turn[]>([`);
    l.push(`    { text: ${JSON.stringify(IM_SEED_MESSAGE)}${filesOn ? ', files: []' : ''} },`);
    l.push(`  ]);`);
  }
  if (filesOn) l.push(`  readonly files = signal<File[]>([]);`);
  if (queueOn) {
    l.push(`  readonly queue = signal<QueuedMessage[]>([]);`);
    if (o.status === 'streaming') {
      l.push(`  // Seeded mid-stream (the preset's configuration): sends enqueue`);
      l.push(`  // immediately; Stop flips to idle and dispatches the head.`);
    }
    l.push(`  readonly status = signal<"idle" | "streaming">(${JSON.stringify(o.status)});`);
    l.push(`  // The id of the message currently playing its queued→sent morph. The`);
    l.push(`  // morph key is applied ONLY to this one, ONLY for the brief transition —`);
    l.push(`  // then cleared, so a settled bubble never re-animates.`);
    l.push(`  readonly morphingId = signal<string | null>(null);`);
    l.push(`  readonly layoutId = (item: { id: string }) => \`qm-\${item.id}\`;`);
  }
  if (o.historyOn) {
    l.push(`  readonly history = computed(() =>`);
    l.push(
      queueOn
        ? `    this.messages().filter((m) => m.from === "user").map((m) => m.text),`
        : `    this.messages().map((m) => m.text),`,
    );
    l.push(`  );`);
  }
  l.push(`  readonly inputH = signal(0);`);

  const refs: string[] = [`  private readonly composerEl = viewChild.required("composer", { read: ElementRef });`];
  refs.push(`  private readonly scrollEl = viewChild.required<ElementRef<HTMLElement>>("scroll");`);
  if (queueOn) {
    refs.push(`  private readonly cardH = injectQueueCardHeight();`);
    refs.push(`  /** Room under the transcript for the composer and the collapsed stack. */`);
    refs.push(`  readonly reservedBottom = computed(`);
    refs.push(`    () =>`);
    refs.push(`      this.inputH() +`);
    refs.push(`      8 +`);
    refs.push(`      (this.queue().length > 0`);
    refs.push(`        ? collapsedStackHeight(this.queue().length, this.cardH()) + 8`);
    refs.push(`        : 0),`);
    refs.push(`  );`);
  }
  l.push(...refs);
  l.push('');
  if (queueOn) {
    l.push(`  /** The id of the reply being streamed, so Stop can drop its timers. */`);
    l.push(`  private replyTimers: number[] = [];`);
    l.push('');
  }
  l.push(`  constructor() {`);
  l.push(`    const destroyRef = inject(DestroyRef);`);
  l.push(`    afterNextRender(() => {`);
  l.push(`      const el = this.composerEl().nativeElement;`);
  l.push(`      this.inputH.set(el.offsetHeight);`);
  l.push(`      const observer = new ResizeObserver(() => this.inputH.set(el.offsetHeight));`);
  l.push(`      observer.observe(el);`);
  l.push(`      destroyRef.onDestroy(() => observer.disconnect());`);
  l.push(`    });`);
  l.push(
    queueOn
      ? `    // Keep the transcript pinned. \`queue\` is tracked too: enqueuing grows`
      : `    // Keep the transcript pinned to the latest message.`,
  );
  if (queueOn) l.push(`    // the reserved bottom padding, which must re-pin the scroll.`);
  l.push(`    afterRenderEffect(() => {`);
  l.push(`      this.messages();`);
  l.push(`      this.inputH();`);
  if (queueOn) l.push(`      this.queue();`);
  l.push(`      untracked(() => {`);
  l.push(`        const el = this.scrollEl().nativeElement;`);
  l.push(`        el.scrollTop = el.scrollHeight;`);
  l.push(`      });`);
  l.push(`    });`);
  if (queueOn) l.push(`    destroyRef.onDestroy(() => this.replyTimers.forEach(clearTimeout));`);
  if (o.attachments) {
    l.push('');
    l.push(`    // Pre-fill the composer with sample attachments — swap the URLs for`);
    l.push(`    // assets of your own. Images use object-cover; PDFs render page 1.`);
    l.push(`    void Promise.all([`);
    l.push(`      fetch("sample.png")`);
    l.push(`        .then((r) => r.blob())`);
    l.push(`        .then((b) => new File([b], "sample.png", { type: "image/png" })),`);
    l.push(`      fetch("sample.pdf")`);
    l.push(`        .then((r) => r.blob())`);
    l.push(`        .then((b) => new File([b], "sample.pdf", { type: "application/pdf" })),`);
    l.push(`    ]).then((files) => this.files.set(files));`);
  }
  l.push(`  }`);
  l.push('');

  if (queueOn) {
    l.push(`  // Fake reply — swap for your backend. The streaming → idle edge is what`);
    l.push(`  // auto-dispatches the next queued message through onSend.`);
    l.push(`  private respond(text: string) {`);
    l.push(`    this.status.set("streaming");`);
    l.push(`    this.replyTimers.push(`);
    l.push(`      setTimeout(() => {`);
    l.push(`        this.messages.update((m) => [`);
    l.push(`          ...m,`);
    l.push(`          { id: crypto.randomUUID(), from: "assistant", text: \`Replying to "\${text}" — swap this stub for your backend.\`${filesOn ? ', files: []' : ''} },`);
    l.push(`        ]);`);
    l.push(`        this.status.set("idle");`);
    l.push(`      }, 2600),`);
    l.push(`    );`);
    l.push(`  }`);
    l.push('');
    l.push(`  onSend({ value, files, meta }: InputMessageSendEvent) {`);
    l.push(`    if (value || files.length) {`);
    l.push(`      const id = meta?.queuedId ?? crypto.randomUUID();`);
    l.push(`      this.messages.update((m) => [...m, { id, from: "user", text: value${filesOn ? ', files' : ', files: []'} }]);`);
    l.push(`      if (value) this.respond(value);`);
    l.push(`      // A dispatched (from-queue) text message morphs from its stack card;`);
    l.push(`      // attachment cards fade instead (their layouts differ).`);
    l.push(`      if (meta?.queuedId && files.length === 0) {`);
    l.push(`        this.morphingId.set(meta.queuedId);`);
    l.push(`        this.replyTimers.push(setTimeout(() => this.morphingId.set(null), 450));`);
    l.push(`      }`);
    l.push(`    }`);
    l.push(`    // Only clear the composer for an actual user submit — a queued dispatch`);
    l.push(`    // must leave any in-progress draft untouched.`);
    l.push(`    if (!meta?.queuedId) {`);
    l.push(`      this.value.set("");`);
    if (filesOn) l.push(`      this.files.set([]);`);
    l.push(`    }`);
    l.push(`  }`);
    l.push('');
    l.push(`  onStop() {`);
    l.push(`    this.replyTimers.forEach(clearTimeout);`);
    l.push(`    this.status.set("idle");`);
    l.push(`  }`);
    l.push('');
    l.push(`  // Double-click a queued card (or its ✎) to pull it back into the composer.`);
    l.push(`  editQueued(item: QueuedMessage) {`);
    l.push(`    this.value.set(item.text);`);
    if (filesOn) l.push(`    this.files.set(item.files);`);
    l.push(`    this.queue.update((q) => q.filter((x) => x.id !== item.id));`);
    l.push(`    requestAnimationFrame(() => this.composerEl().nativeElement.querySelector("textarea")?.focus());`);
    l.push(`  }`);
    l.push('');
    l.push(`  removeQueued(item: QueuedMessage) {`);
    l.push(`    this.queue.update((q) => q.filter((x) => x.id !== item.id));`);
    l.push(`  }`);
  } else {
    l.push(`  onSend({ value, files }: InputMessageSendEvent) {`);
    l.push(
      `    if (value || files.length) this.messages.update((m) => [...m, { text: value${filesOn ? ', files' : ', files: []'} }]);`,
    );
    l.push(`    this.value.set("");`);
    if (filesOn) l.push(`    this.files.set([]);`);
    l.push(`  }`);
  }
  l.push(`}`);
  l.push('');
  l.push(`// app.config.ts — the settings this configuration was shared with.`);
  l.push(`export const appConfig: ApplicationConfig = {`);
  l.push(`  providers: [provideFluid({ shape: ${JSON.stringify(globals.shape)}, size: ${JSON.stringify(globals.size)} })],`);
  l.push(`};`);
  return l.join('\n');
}
