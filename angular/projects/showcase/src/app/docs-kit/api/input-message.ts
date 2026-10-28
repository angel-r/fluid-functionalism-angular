// The API reference of /docs/input-message: its PropsTables and the API section
// of /docs/input-message.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const inputMessageProps: PropDef[] = [
  { name: "size", type: '"default" | "compact"', default: "from the size context", description: "Step on the size ladder (see /docs/sizes). Wins over `provideFluid({ size })` and the surrounding `[ffSizeProvider]`." },
  { name: "value", type: "string", description: "The textarea value. Two-way: `[(value)]`; React's onValueChange is `(valueChange)`." },
  { name: "valueChange", type: "(value: string) => void", description: "Emitted with the new value on every textarea change." },
  { name: "send", type: "(event: InputMessageSendEvent) => void", description: "Emitted on Enter (without Shift), send-button click, or a queued auto-dispatch. Carries the trimmed `value` and the attached `files`; skipped when the value is empty and no files are attached." },
  { name: "placeholder", type: "string", default: '"Ask me anything…"', description: "Placeholder shown when the value is empty. While a file is being dragged over the component (and attachments are enabled), the placeholder swaps to \"Drop files here to add to chat\"." },
  { name: "leftSlot", type: "TemplateRef<InputMessageSlotTemplateContext>", description: "Template rendered in the bottom-left action area. Its context gives `openFilePicker(acceptOverride?)`, which opens the native file picker (optionally scoped to a subset of accept types, e.g. `\"image/*\"`), and the current `files`." },
  { name: "rightSlot", type: "TemplateRef<InputMessageSlotTemplateContext>", description: "Template rendered in the bottom-right action area, before the built-in send button. Same context as `leftSlot`." },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the textarea, send button, and drag-and-drop." },
  { name: "minRows", type: "number", default: "1", description: "Minimum visible rows before the textarea grows." },
  { name: "maxRows", type: "number", default: "8", description: "Maximum visible rows before the textarea starts to scroll." },
  { name: "clickToFocus", type: "boolean", default: "true", description: "When true, clicking anywhere on the surrounding container (outside of buttons / links / inputs) focuses the textarea." },
  { name: "sendLabel", type: "string", default: '"Send"', description: "Accessible label for the send button." },
  { name: "files", type: "File[]", description: "Attached files. Two-way: `[(files)]`; React's onFilesChange is `(filesChange)`. When unbound (undefined), attachment behavior is disabled: no drag-and-drop, no file input." },
  { name: "filesChange", type: "(files: File[]) => void", description: "Emitted when files are added (drag-drop or picker) or removed via the preview tile's × button. Duplicate drops of the same file (same name + size + lastModified) are silently de-duplicated." },
  { name: "accept", type: "string", default: '"image/png,image/jpeg,application/pdf"', description: "Accepted MIME types as a comma-separated string. Used by both the file picker and the drag-and-drop filter." },
  { name: "maxFiles", type: "number", description: "Maximum number of attached files. Extra files beyond this limit are dropped." },
  { name: "filePreviewSize", type: "number", default: "80", description: "Side length (in pixels) of each preview tile. Images use object-cover; PDFs render the first page through a provided FILE_THUMBNAIL_PDF_RENDERER (otherwise an icon); other types fall back to a centered icon. A theme-aware inset outline keeps light media edges visible." },
  { name: "textareaProps", type: "InputMessageTextareaProps", description: "Extra attributes for the underlying textarea (value, disabled and placeholder are controlled by the component). `class` merges with the field's classes and `aria-label` replaces the default \"Message\"." },
  { name: "status", type: '"idle" | "streaming"', description: "Assistant response state. When \"streaming\", the send button becomes a Stop control (empty draft) or a Queue action (non-empty draft). On the streaming→idle edge the next queued message auto-dispatches via `send`. Leave undefined for the legacy send-immediately behavior." },
  { name: "stop", type: "() => void", description: "Emitted when the Stop control is pressed (streaming + empty draft). Halt the current response and set status to \"idle\"; that edge immediately dispatches the next queued message." },
  { name: "queue", type: "QueuedMessage[]", description: "Pending messages, two-way: `[(queue)]`; React's onQueueChange is `(queueChange)`. Rendered as reorderable rows above the textarea. Double-click (or Enter/F2) edits a row back into the composer; the × (or Delete) removes it; drag or Alt+↑/↓ reorders. Requires status to be controlled." },
  { name: "queueChange", type: "(queue: QueuedMessage[]) => void", description: "Emitted whenever the queue changes: enqueue, edit, delete, reorder, or auto-dispatch. Each QueuedMessage is { id, text, files }." },
  { name: "showQueue", type: "boolean", default: "true", description: "Render the built-in reorderable queue rows above the textarea. Set to false to suppress them and render the queue yourself (e.g. as full-width rows above the composer); enqueue and auto-dispatch still run." },
  { name: "history", type: "readonly string[]", default: "[]", description: "Previously-sent messages, oldest first. With the textarea focused, ArrowUp (caret on the first line) recalls the previous message and walks backward; ArrowDown (caret on the last line) walks forward toward the in-progress draft. Editing or sending exits history mode." },
  { name: "placeholderSuggestion", type: "string", description: "Suggested prompt rendered as the placeholder (with a Tab keycap) while the draft is empty. Pressing Tab fills it into the composer; it doesn't send. Takes precedence over placeholder. Shift+Tab still moves focus backward, and once the draft is non-empty Tab resumes normal focus traversal." },
  { name: "suggestions", type: "readonly string[]", description: "Suggested prompts listed under the action bar while the draft is empty. ArrowDown moves a highlight into the list (focus stays in the textarea, tracked via aria-activedescendant), ArrowUp walks back up and out, Enter or click fills the highlighted prompt into the composer. Escape drops the highlight; typing collapses the list. While nothing is highlighted the first row shows a ↓ hint in the slot where the highlighted row shows ↵." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the composer container." },
  { name: "textareaFocus", type: "(event: FocusEvent) => void", description: "Emitted when the textarea gains focus (React: `textareaProps.onFocus`)." },
  { name: "textareaBlur", type: "(event: FocusEvent) => void", description: "Emitted when the textarea loses focus (React: `textareaProps.onBlur`)." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "InputMessage", props: inputMessageProps },
];
