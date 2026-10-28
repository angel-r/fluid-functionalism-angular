import { ChangeDetectionStrategy, Component, DOCUMENT, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  Button,
  ChatMessage,
  Icon,
  InputMessage,
  QueuedStack,
  Switch,
  Tooltip,
  type InputMessageSendEvent,
  type InputMessageStatus,
  type QueuedMessage,
  collapsedStackHeight,
  injectQueueCardHeight,
} from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview, PreviewAction, PreviewActionButton } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';
import {
  PLAY_SWITCH,
  PlayDivider,
  PlayField,
  PlaySection,
  PlaySelect,
  PlaygroundLayout,
  PlaygroundPanel,
} from '../../../docs-kit/playground';
import { GetCodeDialog } from '../../../docs-kit/preset/get-code-dialog';
import { injectPresetGlobals } from '../../../docs-kit/preset/preset-globals';
import { usePresetUrl } from '../../../docs-kit/preset/preset-url';
import { inputMessageProps } from '../../../docs-kit/api/input-message';
import { MeasureHeight, ScrollPin } from './input-message-stage';
import { QueuedChatDemo } from './queued-chat';
import { samplePdf, samplePhoto } from './sample-files';
import { buildPlaygroundCode, buildPresetSnippet } from './input-message-code';
import {
  IM_PLACEHOLDER_PROMPT,
  IM_SEED_MESSAGE,
  IM_SUGGESTIONS,
  INPUT_MESSAGE_DEFAULT_CODE,
  INPUT_MESSAGE_DEFAULT_STATE,
  INPUT_MESSAGE_PRESET_DEF,
  decodeInputMessagePreset,
  encodeInputMessagePreset,
  type InputMessagePlayState,
  type InputMessageStatusOption,
} from './input-message-preset';
import {
  attachmentsCode,
  basicCode,
  disabledCode,
  leftOnlyCode,
  queuedCode,
  rightOnlyCode,
  sendHandlerCode,
  suggestionsCode,
} from './input-message-snippets';

interface Turn {
  from: 'user' | 'assistant';
  text: string;
  files?: File[];
}

const DESCRIPTION =
  'Chat-style message composer with an auto-resizing textarea, flexible left/right action slots, and a built-in send button on a Surface-2 substrate.';

/** The shortest Angular snippet the page's Copy prompt carries. */
const INSTALL_USAGE = `import { signal } from "@angular/core";
import { InputMessage } from "@angel-r/fluid-functionalism-angular";

readonly value = signal("");

<ff-input-message [(value)]="value" (send)="value.set('')" />`;

/** One line per prop, as the page's API reference lists them. */
const INSTALL_PROPS: readonly string[] = [
  'value: string. The draft, two-way: [(value)].',
  'send: (event: { value: string; files: File[] }) => void. Fires on Enter (without Shift), send click, or a queued auto-dispatch; skipped when the draft is empty.',
  'placeholder: string (default "Ask me anything…"). Text shown while the draft is empty.',
  'size: "default" | "compact" (default from provideFluid). Step on the size ladder.',
  'leftSlot / rightSlot: TemplateRef. Content in the bottom action areas; the context gives openFilePicker() and files.',
  'files: File[]. Attachments, two-way; binding it turns drag-and-drop and the file picker on.',
  'status: "idle" | "streaming". While streaming, the send button becomes Stop (empty draft) or Queue (a draft).',
  'queue: QueuedMessage[]. Pending messages, two-way; needs status.',
  'suggestions: string[]. Suggested prompts under the action bar while the draft is empty.',
  'placeholderSuggestion: string. Tab-fillable ghost placeholder.',
  'disabled: boolean (default false). Disables the textarea, send button, and drag-and-drop.',
];

/** The InputMessage docs page: the composer's playground, its demos with
 *  real Angular code, and the API reference. */
@Component({
  selector: 'app-input-message-page',
  imports: [
    DocPage,
    DocSection,
    ComponentPreview,
    PreviewAction,
    PreviewActionButton,
    PropsTable,
    Button,
    ChatMessage,
    Icon,
    InputMessage,
    QueuedStack,
    Switch,
    Tooltip,
    PlaygroundLayout,
    PlaygroundPanel,
    PlaySection,
    PlayField,
    PlaySelect,
    PlayDivider,
    GetCodeDialog,
    QueuedChatDemo,
    MeasureHeight,
    ScrollPin,
  ],
  templateUrl: './input-message.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InputMessagePage {
  protected readonly description = DESCRIPTION;
  protected readonly installUsage = INSTALL_USAGE;
  protected readonly installProps = INSTALL_PROPS;
  protected readonly inputMessageProps = inputMessageProps;
  protected readonly presetDef = INPUT_MESSAGE_PRESET_DEF;
  protected readonly playSwitch = PLAY_SWITCH;

  protected readonly basicCode = basicCode;
  protected readonly suggestionsCode = suggestionsCode;
  protected readonly attachmentsCode = attachmentsCode;
  protected readonly queuedCode = queuedCode;
  protected readonly leftOnlyCode = leftOnlyCode;
  protected readonly rightOnlyCode = rightOnlyCode;
  protected readonly sendHandlerCode = sendHandlerCode;
  protected readonly disabledCode = disabledCode;

  // ── Basic / Suggestions / Left and right slots / Send handler ────────────
  protected readonly basicValue = signal('');
  protected readonly suggestValue = signal('');
  protected readonly leftValue = signal('');
  protected readonly rightValue = signal('');
  protected readonly handlerValue = signal('');
  protected readonly messages = signal<string[]>([]);
  protected readonly suggestions = IM_SUGGESTIONS;
  protected readonly placeholderPrompt = IM_PLACEHOLDER_PROMPT;

  // ── Attachments: a composer pre-filled with an image + PDF; sending pushes
  // the message (with its attachments) into the transcript. ────────────────
  private readonly initialAttachFiles = [samplePhoto(), samplePdf('Receipt-2581-4039-8265.pdf', 'Receipt 2581-4039-8265')];
  protected readonly attachValue = signal('');
  protected readonly attachFiles = signal<File[]>(this.initialAttachFiles);
  protected readonly attachMessages = signal<Turn[]>([]);
  /** Composer height: the transcript reserves it as bottom padding. */
  protected readonly attachInputH = signal(0);
  /** Re-pins the transcript's scroll whenever one of these changes. */
  protected readonly attachPin = computed(() => [this.attachMessages(), this.attachInputH()]);

  // ── Playground ───────────────────────────────────────────────────────────
  protected readonly suggestion = signal(INPUT_MESSAGE_DEFAULT_STATE.suggestion);
  protected readonly suggestionsOn = signal(INPUT_MESSAGE_DEFAULT_STATE.suggestionsOn);
  protected readonly historyOn = signal(INPUT_MESSAGE_DEFAULT_STATE.historyOn);
  protected readonly minRows = signal(String(INPUT_MESSAGE_DEFAULT_STATE.minRows));
  protected readonly disabled = signal(INPUT_MESSAGE_DEFAULT_STATE.disabled);
  protected readonly leftSlotOn = signal(INPUT_MESSAGE_DEFAULT_STATE.leftSlot);
  protected readonly rightSlotOn = signal(INPUT_MESSAGE_DEFAULT_STATE.rightSlot);
  protected readonly attachments = signal(INPUT_MESSAGE_DEFAULT_STATE.attachments);
  protected readonly playgroundStatus = signal<InputMessageStatusOption>(INPUT_MESSAGE_DEFAULT_STATE.status);

  protected readonly playgroundValue = signal('');
  protected readonly playgroundFiles = signal<File[]>([]);
  protected readonly playgroundQueue = signal<QueuedMessage[]>([]);
  /** Seed one sent message so the transcript (and history recall) reads at a
   *  glance. */
  protected readonly playgroundMessages = signal<Turn[]>([{ from: 'user', text: IM_SEED_MESSAGE }]);
  protected readonly playgroundInputH = signal(0);

  protected readonly minRowOptions = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
  ];
  protected readonly statusOptions = [
    { value: 'off', label: 'Off' },
    { value: 'idle', label: 'Idle' },
    { value: 'streaming', label: 'Streaming' },
  ];

  private readonly document = inject(DOCUMENT);
  private readonly cardH = injectQueueCardHeight();
  private readonly globals = injectPresetGlobals();
  private readonly sampleFiles = [samplePhoto(), samplePdf()];

  protected readonly playgroundQueueOn = computed(() => this.playgroundStatus() !== 'off');
  /** The composer's status input: `off` means the queue wiring is off. */
  protected readonly composerStatus = computed<InputMessageStatus | undefined>(() => {
    const status = this.playgroundStatus();
    return status === 'off' ? undefined : status;
  });
  protected readonly filesOn = computed(() => this.leftSlotOn() || this.attachments());
  protected readonly playgroundHistory = computed(() =>
    this.playgroundMessages()
      .map((m) => m.text)
      .filter(Boolean),
  );
  /** Re-pins the playground transcript's scroll whenever content or the
   *  composer height changes. */
  protected readonly playgroundPin = computed(() => [this.playgroundMessages(), this.playgroundInputH(), this.playgroundQueue()]);
  /** Space the transcript leaves free at the bottom: the composer, plus the
   *  collapsed queue stack when it's showing. */
  protected readonly playgroundReservedBottom = computed(() => {
    const count = this.playgroundQueue().length;
    return this.playgroundInputH() + 8 + (this.playgroundQueueOn() && count > 0 ? collapsedStackHeight(count, this.cardH()) + 8 : 0);
  });

  /** The playground's configuration, as both generators read it. */
  private readonly playState = computed<InputMessagePlayState>(() => ({
    suggestion: this.suggestion(),
    suggestionsOn: this.suggestionsOn(),
    historyOn: this.historyOn(),
    attachments: this.attachments(),
    minRows: Number(this.minRows()),
    disabled: this.disabled(),
    leftSlot: this.leftSlotOn(),
    rightSlot: this.rightSlotOn(),
    status: this.playgroundStatus(),
  }));

  protected readonly playgroundCode = computed(() => buildPlaygroundCode(this.playState()));
  protected readonly presetCode = computed(() => encodeInputMessagePreset({ ...this.playState(), ...this.globals() }));
  protected readonly presetSnippet = computed(() => buildPresetSnippet(this.playState(), this.globals()));

  constructor() {
    // "Attachments" pre-fills the composer with sample files, and clears them
    // again when the toggle goes off (the reference's effect).
    effect(() => {
      const on = this.attachments();
      untracked(() => this.playgroundFiles.set(on ? this.sampleFiles : []));
    });

    // Share links: reads ?preset= once, applies it, then keeps the address bar
    // in step with the rail.
    usePresetUrl(this.presetCode, computed(() => INPUT_MESSAGE_DEFAULT_CODE), (raw) => {
      const result = decodeInputMessagePreset(raw);
      if (!result.ok) return;
      const preset = result.preset;
      this.suggestion.set(preset.suggestion);
      this.suggestionsOn.set(preset.suggestionsOn);
      this.historyOn.set(preset.historyOn);
      this.attachments.set(preset.attachments);
      this.minRows.set(String(preset.minRows));
      this.disabled.set(preset.disabled);
      this.leftSlotOn.set(preset.leftSlot);
      this.rightSlotOn.set(preset.rightSlot);
      this.playgroundStatus.set(preset.status);
    });
  }

  // ── Attachments ──────────────────────────────────────────────────────────
  protected onAttachSend({ value, files }: InputMessageSendEvent): void {
    if (!value && files.length === 0) return;
    this.attachMessages.update((prev) => [...prev, { from: 'user', text: value, files }]);
    this.attachValue.set('');
    this.attachFiles.set([]);
  }

  protected resetAttachments(): void {
    this.attachMessages.set([]);
    this.attachValue.set('');
    this.attachFiles.set(this.initialAttachFiles);
  }

  // ── Send handler ─────────────────────────────────────────────────────────
  protected onHandlerSend({ value }: InputMessageSendEvent): void {
    if (value) this.messages.update((prev) => [...prev, value]);
    this.handlerValue.set('');
  }

  // ── Playground ───────────────────────────────────────────────────────────
  /** Live attachment list for the composer: undefined turns attachments off. */
  protected playgroundFilesBinding(): File[] | undefined {
    return this.filesOn() ? this.playgroundFiles() : undefined;
  }

  protected onPlaygroundFiles(files: File[] | undefined): void {
    if (this.filesOn() && files) this.playgroundFiles.set(files);
  }

  protected onPlaygroundQueue(queue: QueuedMessage[] | undefined): void {
    if (queue) this.playgroundQueue.set(queue);
  }

  protected setPlaygroundStatus(value: string): void {
    this.playgroundStatus.set(value as InputMessageStatusOption);
  }

  protected onPlaygroundSend({ value, files }: InputMessageSendEvent): void {
    if (value || files.length) this.playgroundMessages.update((m) => [...m, { from: 'user', text: value, files }]);
    this.playgroundValue.set('');
    if (this.filesOn()) this.playgroundFiles.set([]);
  }

  /** Double-click a queued card (or its ✎) to pull it back into the composer. */
  protected editPlaygroundQueued(item: QueuedMessage): void {
    this.playgroundValue.set(item.text);
    if (this.filesOn()) this.playgroundFiles.set(item.files);
    this.playgroundQueue.update((q) => q.filter((x) => x.id !== item.id));
    requestAnimationFrame(() => {
      const textarea = this.document.querySelector<HTMLTextAreaElement>('[data-playground-composer] textarea');
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });
  }

  protected removePlaygroundQueued(item: QueuedMessage): void {
    this.playgroundQueue.update((q) => q.filter((x) => x.id !== item.id));
  }

  protected randomize(): void {
    this.suggestion.set(Math.random() > 0.3);
    this.suggestionsOn.set(Math.random() > 0.3);
    this.historyOn.set(Math.random() > 0.4);
    this.minRows.set(['1', '1', '2', '3'][Math.floor(Math.random() * 4)]);
    this.disabled.set(false);
    this.leftSlotOn.set(Math.random() > 0.4);
    this.rightSlotOn.set(Math.random() > 0.5);
    this.attachments.set(Math.random() > 0.7);
    this.playgroundStatus.set(['off', 'off', 'idle', 'streaming'][Math.floor(Math.random() * 4)] as InputMessageStatusOption);
  }
}
