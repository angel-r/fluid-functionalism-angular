import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Renderer2,
  type TemplateRef,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { Observable, Subject } from 'rxjs';
import {
  cn,
  fontWeights,
  Icon,
  injectShape,
  SizeContext,
  type SizeVariant,
  SURFACE_LEVEL,
  surfaceClasses,
  fieldTouchClass,
} from '@angel-r/fluid-functionalism-angular/core';
import { FluidHover, FluidHoverItem, FluidHoverHighlight } from '@angel-r/fluid-functionalism-angular/fluid-hover';
import { Button } from '@angel-r/fluid-functionalism-angular/button';
import { isFocusVisible, provideSizeOverride } from '@angel-r/fluid-functionalism-angular/tabs';
import { InputMessageFileTile } from './file-preview-tile';
import { InputMessageQueuedRow } from './queued-row';
import { InputMessageSendGlyph } from './send-glyph';
import { createCollapsibleRegion, createLayoutFlip, createPresenceList, createSettledFlag } from './presence';
import {
  DEFAULT_ACCEPT,
  type InputMessageSendEvent,
  type InputMessageSlotTemplateContext,
  type InputMessageStatus,
  type InputMessageTextareaProps,
  type QueuedMessage,
  createQueueId,
  fileFingerprint,
  mergeFiles,
  parseAccept,
} from './input-message.types';

let nextId = 0;

const COMPOSER_SURFACE = signal(2).asReadonly();
const NO_FILES: File[] = [];
const NO_QUEUE: QueuedMessage[] = [];

/** Edge drop kept across states so the composer holds its lift. */
const EDGE_DROP = '0 1px 1px -0.5px var(--shadow-color)';

/** textareaProps keys the component owns or handles itself. */
const RESERVED_TEXTAREA_PROPS = new Set([
  'class',
  'className',
  'aria-label',
  'aria-describedby',
  'value',
  'disabled',
  'placeholder',
  'rows',
  'aria-activedescendant',
]);

const CONTROL_SELECTOR =
  'button, a, input, select, textarea, [contenteditable], [role="button"], [data-im-queue]';

/**
 * Chat-style message composer: an auto-growing textarea, left/right action
 * slots, a built-in send button (which morphs into Stop / Queue while the
 * assistant streams), attachments by drag-and-drop or picker, a reorderable
 * queue, readline-style history, a Tab-fill suggested placeholder and a
 * suggestions listbox — on a surface-2 substrate.
 *
 * ```html
 * <ff-input-message [(value)]="draft" (send)="onSend($event)" />
 * ```
 *
 * Attachments are on when `files` is bound (`[(files)]`); the queue when both
 * `status` and `queue` are bound (`[(queue)]`). The Stop control needs a
 * `(stop)` listener.
 */
@Component({
  selector: 'ff-input-message',
  exportAs: 'ffInputMessage',
  imports: [
    NgTemplateOutlet,
    Button,
    Icon,
    FluidHover,
    FluidHoverItem,
    FluidHoverHighlight,
    InputMessageFileTile,
    InputMessageQueuedRow,
    InputMessageSendGlyph,
  ],
  providers: [
    // A size input pins the whole composer — inner buttons, rows and queued
    // messages included — to one ladder step (matches InputGroup).
    provideSizeOverride(InputMessage, (c) => c.size()),
    { provide: SURFACE_LEVEL, useValue: COMPOSER_SURFACE },
  ],
  templateUrl: './input-message.html',
  host: {
    '[class]': 'hostClass()',
    '[style.box-shadow]': 'edgeShadow()',
    '(mousedown)': 'onContainerMouseDown($event)',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputMessage {
  /** Step on the size ladder. Wins over the surrounding size provider and
   *  propagates to the composer's rows, buttons and queued messages. */
  readonly size = input<SizeVariant | undefined>(undefined);
  /** The textarea value, two-way (`[(value)]`); `valueChange` fires on every change. */
  readonly value = model('');
  /** Placeholder shown when the value is empty. */
  readonly placeholder = input('Ask me anything…');
  /** Bottom-left action area. The template receives `{ openFilePicker, files }`. */
  readonly leftSlot = input<TemplateRef<InputMessageSlotTemplateContext> | null | undefined>(undefined);
  /** Bottom-right action area, before the send button. Same context as `leftSlot`. */
  readonly rightSlot = input<TemplateRef<InputMessageSlotTemplateContext> | null | undefined>(undefined);
  /** Disables the textarea, send button, and drag-and-drop. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Minimum visible rows before the textarea grows. */
  readonly minRows = input(1, { transform: numberAttribute });
  /** Maximum visible rows before the textarea starts to scroll. */
  readonly maxRows = input(8, { transform: numberAttribute });
  /** When false, clicking the surrounding container won't refocus the textarea. */
  readonly clickToFocus = input(true, { transform: booleanAttribute });
  /** Accessible label for the send button. */
  readonly sendLabel = input('Send');
  /** Attached files, two-way (`[(files)]`). Unbound (undefined), attachment
   *  behavior is off: no drag-drop, no file input. */
  readonly files = model<File[] | undefined>(undefined);
  /** Accepted MIME types (comma-separated), for the picker and the drop filter. */
  readonly accept = input(DEFAULT_ACCEPT);
  /** Maximum number of files. Extra files are dropped. */
  readonly maxFiles = input<number | undefined>(undefined);
  /** Side of each preview tile in pixels. */
  readonly filePreviewSize = input(80);
  /** Extra attributes for the underlying textarea (see InputMessageTextareaProps). */
  readonly textareaProps = input<InputMessageTextareaProps | undefined>(undefined);
  /** Assistant response state. `"streaming"` turns the send button into Stop
   *  (empty draft) or Queue (draft); the `streaming → idle` edge dispatches
   *  the next queued message through `send`. Undefined keeps send-immediately. */
  readonly status = input<InputMessageStatus | undefined>(undefined);
  /** Pending messages, two-way (`[(queue)]`). Requires `status`. */
  readonly queue = model<QueuedMessage[] | undefined>(undefined);
  /** Render the built-in reorderable queue rows. False keeps enqueue and
   *  auto-dispatch running while the consumer renders the queue itself. */
  readonly showQueue = input(true, { transform: booleanAttribute });
  /** Previously-sent messages, oldest first, for ArrowUp/ArrowDown recall. */
  readonly history = input<readonly string[]>([]);
  /** Suggested prompt shown as the placeholder with a Tab keycap; Tab fills it. */
  readonly placeholderSuggestion = input<string | undefined>(undefined);
  /** Suggested prompts listed under the action bar while the draft is empty. */
  readonly suggestions = input<readonly string[] | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  /** Enter (without Shift), send-button click, or a queued auto-dispatch. */
  readonly send = output<InputMessageSendEvent>();
  private readonly stops = new Subject<void>();
  private readonly stopListeners = signal(0);
  /** The Stop control was pressed (streaming, empty draft). Only offered
   *  while something listens. */
  readonly stop = outputFromObservable(
    new Observable<void>((subscriber) => {
      untracked(() => this.stopListeners.update((n) => n + 1));
      const subscription = this.stops.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        untracked(() => this.stopListeners.update((n) => n - 1));
      };
    }),
  );
  /** The textarea gained focus (React: `textareaProps.onFocus`). */
  readonly textareaFocus = output<FocusEvent>();
  /** The textarea lost focus (React: `textareaProps.onBlur`). */
  readonly textareaBlur = output<FocusEvent>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly parentSize = inject(SizeContext, { optional: true, skipSelf: true });
  protected readonly shape = injectShape();
  protected readonly fontWeight = fontWeights.normal;

  private readonly uid = ++nextId;
  protected readonly ghostHintId = `ff-input-message-${this.uid}-hint`;
  protected readonly suggestionListId = `ff-input-message-${this.uid}-suggestions`;

  private readonly textareaRef = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea');
  private readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private readonly filesRegionEl = viewChild<ElementRef<HTMLElement>>('filesRegionBox');
  private readonly filesRowEl = viewChild<ElementRef<HTMLElement>>('filesRow');
  private readonly queueRegionEl = viewChild<ElementRef<HTMLElement>>('queueRegionBox');
  private readonly queueListEl = viewChild<ElementRef<HTMLElement>>('queueList');
  private readonly suggestionsRegionEl = viewChild<ElementRef<HTMLElement>>('suggestionsRegionBox');
  private readonly suggestionList = viewChild(FluidHover);

  protected readonly hovered = signal(false);
  protected readonly focusVisible = signal(false);
  protected readonly dragOver = signal(false);
  protected readonly liveMsg = signal('');
  /** Readline history position; null while not browsing. */
  private readonly historyIndex = signal<number | null>(null);
  private draftBeforeHistory = '';
  private prevStatus: InputMessageStatus | undefined = undefined;

  protected readonly compact = computed(() => (this.size() ?? this.parentSize?.size() ?? 'default') === 'compact');
  protected readonly filesArr = computed(() => this.files() ?? NO_FILES);
  protected readonly supportsFiles = computed(() => this.files() !== undefined);
  protected readonly queueArr = computed(() => this.queue() ?? NO_QUEUE);
  protected readonly supportsQueue = computed(() => this.status() !== undefined && this.queue() !== undefined);
  private readonly streaming = computed(() => this.status() === 'streaming');
  private readonly trimmed = computed(() => this.value().trim());
  protected readonly canSend = computed(
    () => !this.disabled() && (this.trimmed().length > 0 || this.filesArr().length > 0),
  );
  protected readonly multiple = computed(() => {
    const max = this.maxFiles();
    return max == null || max > 1;
  });
  private readonly acceptTokens = computed(() => parseAccept(this.accept()));

  protected readonly suggestionsArr = computed(() => this.suggestions() ?? []);
  protected readonly suggestionsOpen = computed(() => this.suggestionsArr().length > 0 && this.value() === '');
  protected readonly activeSuggestion = computed(() => this.suggestionList()?.controller.activeIndex() ?? null);
  protected readonly showGhost = computed(
    () => !!this.placeholderSuggestion() && this.value() === '' && !(this.dragOver() && this.supportsFiles()),
  );

  // Send button morph: Stop (streaming + empty draft) → Queue (streaming +
  // draft) → Send (idle).
  protected readonly buttonMode = computed<'send' | 'queue' | 'stop'>(() => {
    if (!this.streaming()) return 'send';
    if (this.canSend() && this.supportsQueue()) return 'queue';
    return this.stopListeners() > 0 ? 'stop' : 'send';
  });
  protected readonly buttonLabel = computed(() => {
    const mode = this.buttonMode();
    return mode === 'stop' ? 'Stop' : mode === 'queue' ? 'Queue message' : this.sendLabel();
  });
  protected readonly buttonDisabled = computed(() =>
    this.buttonMode() === 'stop' ? this.disabled() : !this.canSend(),
  );

  // Edge = the box-shadow's 1px ring, recolored in place per state (drag >
  // focus > hover) so the stroke gains contrast without ever thickening.
  // Inline, since a shadow-* utility mangles multi-layer arbitrary values;
  // at rest the class's shadow-surface-2 supplies the edge.
  protected readonly edgeShadow = computed(() => {
    if (this.dragOver()) return `0 0 0 1px #6B97FF, ${EDGE_DROP}`;
    if (this.focusVisible())
      return `0 0 0 1px color-mix(in oklab, var(--foreground) 20%, transparent), ${EDGE_DROP}`;
    if (this.hovered() && this.clickToFocus() && !this.disabled()) return `0 0 0 1px var(--border), ${EDGE_DROP}`;
    return null;
  });

  protected readonly hostClass = computed(() =>
    cn(
      // The edge is the box-shadow's hairline ring (from surface-2), not a
      // border: hover / focus bump its contrast without thickening it.
      'flex flex-col gap-1 p-2 transition-[box-shadow,color] duration-80',
      surfaceClasses(2, 2),
      this.shape().container,
      this.clickToFocus() && !this.disabled() && 'cursor-text',
      this.disabled() && 'opacity-50 pointer-events-none',
      this.userClass(),
    ),
  );

  private readonly stepTypeClass = computed(() =>
    this.compact()
      ? 'text-[length:var(--fs-subtitle-compact,13px)] leading-[var(--lh-subtitle-compact,18px)] px-1.5 py-1.5'
      : 'text-[length:var(--fs-subtitle,14px)] leading-[var(--lh-subtitle,20px)] px-2 py-2',
  );
  protected readonly textareaClass = computed(() => {
    const props = this.textareaProps();
    return cn(
      'w-full resize-none rounded-none bg-transparent outline-none',
      'text-foreground placeholder:text-muted-foreground',
      this.stepTypeClass(),
      fieldTouchClass,
      props?.className,
      props?.class,
    );
  });
  // The ghost mirrors the textarea's step typography exactly (16px touch
  // size included) so it sits where typed text will.
  protected readonly ghostClass = computed(() =>
    cn('pointer-events-none absolute inset-0 overflow-hidden text-muted-foreground', this.stepTypeClass(), fieldTouchClass),
  );
  protected readonly kbdClass = computed(() =>
    cn(
      'inline-flex shrink-0 -translate-y-px items-center rounded-[5px] border border-border bg-background px-1 font-sans text-muted-foreground',
      this.compact()
        ? 'h-4 text-[length:var(--fs-micro-compact,10px)] leading-[var(--lh-micro-compact,12px)]'
        : 'h-[18px] text-[length:var(--fs-micro,11px)] leading-[var(--lh-micro,14px)]',
    ),
  );
  // The footer's controls sit one notch below the composer's step: slot
  // content is consumer-authored (usually compact Buttons), so the compact
  // step scales every button in the row — send included — down to 24px.
  protected readonly footerClass = computed(() =>
    cn(
      'flex items-center justify-between',
      this.compact()
        ? 'gap-1.5 [&_button]:h-6 [&_button.w-7]:w-6 [&_button]:text-[length:var(--fs-caption-compact,11px)] [&_button]:leading-[var(--lh-caption-compact,14px)]'
        : 'gap-2',
    ),
  );

  protected readonly nativePlaceholder = computed(() => {
    if (this.dragOver() && this.supportsFiles()) return 'Drop files here to add to chat';
    // The ghost overlay renders a suggested placeholder.
    return this.placeholderSuggestion() ? null : this.placeholder();
  });
  protected readonly textareaLabel = computed(() => this.textareaProps()?.['aria-label'] ?? 'Message');
  protected readonly describedBy = computed(
    () => [this.showGhost() ? this.ghostHintId : null, this.textareaProps()?.['aria-describedby']].filter(Boolean).join(' ') || null,
  );
  protected readonly activeDescendant = computed(() => {
    const active = this.activeSuggestion();
    return active != null ? `${this.suggestionListId}-${active}` : null;
  });

  protected readonly slotContext = computed<InputMessageSlotTemplateContext>(() => {
    const ctx = { openFilePicker: this.pickerFn, files: this.filesArr() };
    return { $implicit: ctx, ...ctx };
  });
  private readonly pickerFn = (acceptOverride?: string) => this.openFilePicker(acceptOverride);

  // ── Collapsible regions + presence ──────────────────────────────────
  protected readonly fileTiles = createPresenceList(() => this.filesArr(), fileFingerprint, true);
  protected readonly filesRegion = createCollapsibleRegion(() => this.filesArr().length > 0, {
    element: () => this.filesRegionEl()?.nativeElement,
    fadeOnExit: true,
    onExited: () => this.fileTiles.reset(),
  });
  protected readonly filesSettled = createSettledFlag(() => this.filesRegion.mounted());

  protected readonly queueRows = createPresenceList(() => this.queueArr(), (q) => q.id, true);
  protected readonly queueRegion = createCollapsibleRegion(() => this.queueArr().length > 0, {
    element: () => this.queueRegionEl()?.nativeElement,
    fadeOnExit: true,
    onExited: () => this.queueRows.reset(),
  });
  protected readonly queueSettled = createSettledFlag(() => this.queueRegion.mounted());
  protected readonly queueIndex = computed(() => new Map(this.queueArr().map((q, i) => [q.id, i])));

  // Height-only exit: the region clips shut bottom-up, so the divider holds
  // its place until the space actually closes.
  protected readonly suggestionsRegion = createCollapsibleRegion(() => this.suggestionsOpen(), {
    element: () => this.suggestionsRegionEl()?.nativeElement,
    fadeOnExit: false,
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    createLayoutFlip(() => this.filesRowEl()?.nativeElement, () => this.fileTiles.entries());
    createLayoutFlip(() => this.queueListEl()?.nativeElement, () => this.queueRows.entries());

    // Auto-grow: rows between minRows and maxRows, scrolling past maxRows.
    let lineHeight: { el: HTMLTextAreaElement; value: number } | null = null;
    const resize = () => {
      const el = this.textareaRef().nativeElement;
      el.style.height = 'auto';
      if (!lineHeight || lineHeight.el !== el) {
        // Cached: getComputedStyle on every keystroke is needless work when
        // it only changes with font or zoom.
        const parsed = parseFloat(getComputedStyle(el).lineHeight);
        lineHeight = { el, value: Number.isNaN(parsed) ? 20 : parsed };
      }
      const min = lineHeight.value * untracked(this.minRows);
      const max = lineHeight.value * untracked(this.maxRows);
      const next = Math.min(Math.max(el.scrollHeight, min), max);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
    };
    afterRenderEffect(() => {
      this.value();
      this.minRows();
      this.maxRows();
      this.compact();
      untracked(resize);
    });
    // Re-measure when the textarea's width changes: a mount-time pass under a
    // (near-)zero-width ancestor reads the wrapped placeholder as many lines.
    // Width-gated so the observer doesn't loop on its own height writes.
    afterNextRender(() => {
      const el = this.textareaRef().nativeElement;
      if (typeof ResizeObserver === 'undefined') return;
      let lastWidth = el.offsetWidth;
      const ro = new ResizeObserver(() => {
        const width = el.offsetWidth;
        if (width === lastWidth) return;
        lastWidth = width;
        resize();
      });
      ro.observe(el);
      destroyRef.onDestroy(() => ro.disconnect());
    });

    // Extra textarea attributes (textareaProps), applied and removed in place.
    let applied: string[] = [];
    afterRenderEffect(() => {
      const props = this.textareaProps() ?? {};
      const el = this.textareaRef().nativeElement;
      untracked(() => {
        for (const name of applied) this.renderer.removeAttribute(el, name);
        applied = [];
        for (const [name, raw] of Object.entries(props)) {
          if (RESERVED_TEXTAREA_PROPS.has(name) || typeof raw === 'function' || typeof raw === 'object') continue;
          if (raw === false || raw === undefined) continue;
          this.renderer.setAttribute(el, name, raw === true ? '' : String(raw));
          applied.push(name);
        }
      });
    });

    // The list only shows while the draft is empty: drop the highlight when it closes.
    effect(() => {
      if (!this.suggestionsOpen()) untracked(() => this.setActiveSuggestion(null));
    });

    // Auto-dispatch: on the streaming → idle edge (finished, or Stop), fire
    // the head of the queue and drop it. The consumer sets status back to
    // "streaming" inside its send handler, which re-arms this for the next one.
    effect(() => {
      const status = this.status();
      untracked(() => {
        const prev = this.prevStatus;
        this.prevStatus = status;
        if (!this.supportsQueue()) return;
        const queue = this.queueArr();
        if (prev === 'streaming' && status === 'idle' && queue.length > 0) {
          const [next, ...rest] = queue;
          this.queue.set(rest);
          this.send.emit({ value: next.text, files: next.files, meta: { queuedId: next.id } });
          this.liveMsg.set(`Message sent.${rest.length ? ` ${rest.length} still queued.` : ''}`);
        }
      });
    });
  }

  // ── Public methods ─────────────────────────────────────────────────

  /** Focuses the textarea. */
  focus(options?: FocusOptions) {
    this.textareaRef().nativeElement.focus(options);
  }

  /** Opens the native file picker (attachments must be on). `acceptOverride`
   *  narrows the accept types for this one invocation. */
  openFilePicker(acceptOverride?: string) {
    const el = this.fileInputRef()?.nativeElement;
    if (!el) return;
    if (acceptOverride) {
      el.accept = acceptOverride;
      el.click();
      // Restore on the next tick: the picker dialog reads `accept` synchronously.
      queueMicrotask(() => {
        const current = this.fileInputRef()?.nativeElement;
        if (current) current.accept = this.accept();
      });
      return;
    }
    el.click();
  }

  // ── Send / stop / queue ────────────────────────────────────────────

  protected submit() {
    if (!this.canSend()) return;
    this.historyIndex.set(null);
    const trimmed = this.trimmed();
    const files = this.filesArr();
    // While the assistant streams, a submit enqueues: snapshot the draft
    // (text + attached files), clear the composer, keep focus.
    if (this.streaming() && this.supportsQueue()) {
      const item: QueuedMessage = { id: createQueueId(), text: trimmed, files };
      this.queue.set([...this.queueArr(), item]);
      this.value.set('');
      if (this.supportsFiles()) this.files.set([]);
      requestAnimationFrame(() => this.textareaRef().nativeElement.focus());
      return;
    }
    this.send.emit({ value: trimmed, files });
  }

  protected onButtonClick() {
    if (this.buttonMode() === 'stop') this.stops.next();
    else this.submit();
  }

  protected editQueued(item: QueuedMessage) {
    if (!this.supportsQueue()) return;
    // Silent replace: pull the item into the composer, overwriting any draft.
    // Re-sending re-queues it to the end.
    this.historyIndex.set(null);
    this.value.set(item.text);
    if (this.supportsFiles()) {
      const max = this.maxFiles();
      this.files.set(max != null ? item.files.slice(0, max) : item.files);
    }
    this.queue.set(this.queueArr().filter((q) => q.id !== item.id));
    this.focusAtEnd();
  }

  protected removeQueued(item: QueuedMessage) {
    this.queue.set(this.queueArr().filter((q) => q.id !== item.id));
  }

  protected moveQueued(item: QueuedMessage, dir: -1 | 1) {
    const cur = this.queueArr();
    const i = cur.findIndex((q) => q.id === item.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cur.length) return;
    const next = [...cur];
    [next[i], next[j]] = [next[j], next[i]];
    this.queue.set(next);
  }

  // ── Suggestions ────────────────────────────────────────────────────

  private setActiveSuggestion(index: number | null) {
    this.suggestionList()?.controller.setActiveIndex(index);
  }

  /** Fill a suggested prompt into the composer (Tab / Enter / click). Fills
   *  only: the user still reviews and sends. */
  protected acceptSuggestion(text: string) {
    this.setActiveSuggestion(null);
    this.historyIndex.set(null);
    this.value.set(text);
    this.focusAtEnd();
  }

  protected suggestionClass(active: boolean) {
    return cn(
      'relative flex cursor-pointer items-center gap-2',
      // Text size mirrors the composer's textarea (the rows read as prompt
      // candidates, not metadata); heights follow the queued-row ladder.
      this.compact()
        ? 'h-7 px-2 text-[length:var(--fs-subtitle-compact,13px)] leading-[var(--lh-subtitle-compact,18px)]'
        : 'h-8 px-2.5 text-[length:var(--fs-subtitle,14px)] leading-[var(--lh-subtitle,20px)]',
      'text-muted-foreground transition-colors duration-80',
      active && 'text-foreground',
    );
  }

  protected enterIconClass(active: boolean) {
    return cn('shrink-0 transition-opacity duration-80', active ? 'opacity-100' : 'opacity-0');
  }

  // ── Textarea events ────────────────────────────────────────────────

  protected onInput(e: Event) {
    // Real typing exits history mode (recall sets the value programmatically)
    // and drops any suggestion highlight.
    this.historyIndex.set(null);
    this.setActiveSuggestion(null);
    this.value.set((e.target as HTMLTextAreaElement).value);
  }

  protected onFocus(e: FocusEvent) {
    if (isFocusVisible(e.target as Element)) this.focusVisible.set(true);
    this.textareaFocus.emit(e);
  }

  protected onBlur(e: FocusEvent) {
    this.focusVisible.set(false);
    this.setActiveSuggestion(null);
    this.textareaBlur.emit(e);
  }

  protected onKeydown(e: KeyboardEvent) {
    if (e.isComposing) return;
    const plain = !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey;
    const value = this.value();

    // Suggested prompts: ArrowDown moves the highlight into / down the list,
    // ArrowUp walks it back up (then out), Enter fills, Escape drops the
    // highlight. With no highlight, ArrowUp falls through to history recall.
    if (this.suggestionsOpen() && plain) {
      const active = this.activeSuggestion();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.setActiveSuggestion(active == null ? 0 : Math.min(active + 1, this.suggestionsArr().length - 1));
        return;
      }
      if (active != null) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.setActiveSuggestion(active === 0 ? null : active - 1);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          this.acceptSuggestion(this.suggestionsArr()[active]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          this.setActiveSuggestion(null);
          return;
        }
      }
    }

    // Tab fills the suggested placeholder into the empty composer (Shift+Tab
    // still moves focus backward; a non-empty draft tabs normally).
    const suggestion = this.placeholderSuggestion();
    if (e.key === 'Tab' && !e.shiftKey && suggestion && value === '') {
      e.preventDefault();
      this.acceptSuggestion(suggestion);
      return;
    }

    // Readline-style history: plain ArrowUp/ArrowDown, only with the caret
    // on the first/last line so multi-line editing still works.
    const history = this.history();
    if (history.length > 0 && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && plain) {
      const el = e.currentTarget as HTMLTextAreaElement;
      const caret = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? caret;
      const index = this.historyIndex();
      if (e.key === 'ArrowUp' && !value.slice(0, caret).includes('\n')) {
        const start = index == null ? history.length : index;
        if (start > 0) {
          e.preventDefault();
          if (index == null) this.draftBeforeHistory = value;
          this.historyIndex.set(start - 1);
          this.value.set(history[start - 1]);
          this.caretToEnd();
        }
        return;
      }
      if (e.key === 'ArrowDown' && index != null && !value.slice(end).includes('\n')) {
        e.preventDefault();
        const next = index + 1;
        if (next >= history.length) {
          this.historyIndex.set(null);
          this.value.set(this.draftBeforeHistory);
        } else {
          this.historyIndex.set(next);
          this.value.set(history[next]);
        }
        this.caretToEnd();
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.submit();
    }
  }

  private caretToEnd() {
    requestAnimationFrame(() => {
      const el = this.textareaRef().nativeElement;
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  private focusAtEnd() {
    requestAnimationFrame(() => {
      const el = this.textareaRef().nativeElement;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  // ── Container events ───────────────────────────────────────────────

  protected onContainerMouseDown(e: MouseEvent) {
    if (!this.clickToFocus() || this.disabled()) return;
    const textarea = this.textareaRef().nativeElement;
    const target = e.target as HTMLElement;
    if (target === textarea) return;
    if (target.closest?.(CONTROL_SELECTOR)) return;
    e.preventDefault();
    textarea.focus();
  }

  protected onDragOver(e: DragEvent) {
    if (!this.supportsFiles() || this.disabled()) return;
    // Only a file drag: text/HTML drags shouldn't trigger.
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    this.dragOver.set(true);
  }

  protected onDragLeave(e: DragEvent) {
    const next = e.relatedTarget as Node | null;
    if (next && this.host.contains(next)) return;
    this.dragOver.set(false);
  }

  protected onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    if (!this.supportsFiles() || this.disabled()) return;
    this.addFiles(Array.from(e.dataTransfer?.files ?? []));
  }

  protected onFileInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    this.addFiles(Array.from(input.files));
    input.value = ''; // Allow re-selecting the same file.
  }

  private addFiles(incoming: File[]) {
    if (!this.supportsFiles()) return;
    const next = mergeFiles(this.filesArr(), incoming, this.acceptTokens(), this.maxFiles());
    if (next) this.files.set(next);
  }

  protected removeFile(file: File) {
    if (!this.supportsFiles()) return;
    this.files.set(this.filesArr().filter((f) => f !== file));
  }
}
