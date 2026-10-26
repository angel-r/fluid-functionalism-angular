// Public types and pure helpers of InputMessage. No Angular here, so the
// queued-stack block (and tests) can reuse them without the component.

/** A message held in the queue while the assistant is responding. Carries the
 *  trimmed text plus a snapshot of the files attached when it was queued, so
 *  double-click-to-edit can restore both. `id` is a stable key minted on enqueue. */
export interface QueuedMessage {
  id: string;
  text: string;
  files: File[];
}

/** Assistant response state. */
export type InputMessageStatus = 'idle' | 'streaming';

/** The context a `leftSlot` / `rightSlot` template receives. Read it with
 *  `let-openFilePicker="openFilePicker"` / `let-files="files"`, or take the
 *  whole object as `let-ctx`. */
export interface InputMessageSlotContext {
  /** Opens the native file picker via the hidden `<input type="file">`.
   *  Pass `acceptOverride` (e.g. `"image/*"`) to scope the picker to a
   *  subset of the component's accept types just for this invocation. */
  openFilePicker: (acceptOverride?: string) => void;
  /** Currently-attached files (controlled). */
  files: File[];
}

/** The template context object: the slot context, also as `$implicit`. */
export interface InputMessageSlotTemplateContext extends InputMessageSlotContext {
  $implicit: InputMessageSlotContext;
}

/** What `send` emits: the React `onSend(value, files, meta)` arguments. */
export interface InputMessageSendEvent {
  /** The trimmed value. */
  value: string;
  /** The attached files (or the queued item's snapshot). */
  files: File[];
  /** Set for auto-dispatched queue items: `queuedId` is the originating
   *  QueuedMessage id, so a consumer can morph the queued item into the sent
   *  message. */
  meta?: { queuedId?: string };
}

/**
 * Extra attributes for the underlying textarea. `class` (or React's
 * `className`) merges with the field's own classes; `aria-label` replaces the
 * default "Message"; `aria-describedby` joins the ghost-hint id. Every other
 * string / number / boolean entry is set as an attribute (`false`, `null` and
 * `undefined` remove it). `value`, `disabled` and `placeholder` are owned by
 * the component and ignored here.
 */
export type InputMessageTextareaProps = {
  class?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
} & Record<string, string | number | boolean | null | undefined>;

export const DEFAULT_ACCEPT = 'image/png,image/jpeg,application/pdf';

/** Splits an `accept` string into its trimmed, non-empty tokens. */
export function parseAccept(accept: string): string[] {
  return accept
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Whether a file matches one of the accept tokens (`type/*`, `.ext`, or an exact MIME type). */
export function matchesAccept(file: File, tokens: readonly string[]): boolean {
  return tokens.some((token) => {
    if (token.endsWith('/*')) return file.type.startsWith(token.slice(0, -1));
    if (token.startsWith('.')) return file.name.toLowerCase().endsWith(token.toLowerCase());
    return file.type === token;
  });
}

/** Identity key for dedup: name + size + lastModified is unique enough to
 *  catch "user dropped the same file twice" without false positives on
 *  legitimately distinct files (different bytes ⇒ different size). */
export function fileFingerprint(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * The attachment list after adding `incoming`: unaccepted types and
 * duplicates dropped, capped at `maxFiles`. Returns `null` when nothing new
 * was accepted (the caller then emits nothing).
 */
export function mergeFiles(
  current: readonly File[],
  incoming: readonly File[],
  acceptTokens: readonly string[],
  maxFiles: number | undefined,
): File[] | null {
  const existing = new Set(current.map(fileFingerprint));
  const accepted: File[] = [];
  for (const f of incoming) {
    if (!matchesAccept(f, acceptTokens)) continue;
    const fp = fileFingerprint(f);
    if (existing.has(fp)) continue;
    existing.add(fp);
    accepted.push(f);
  }
  if (!accepted.length) return null;
  const next = [...current, ...accepted];
  return maxFiles != null ? next.slice(0, maxFiles) : next;
}

let queueSeq = 0;

/** A stable id for a new queue item. `crypto.randomUUID` only exists in
 *  secure contexts (an http:// LAN address has none), so fall back to a counter. */
export function createQueueId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  queueSeq += 1;
  return `qm-${Date.now().toString(36)}-${queueSeq}`;
}
