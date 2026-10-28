export interface AskUserOption {
  id?: string;
  title: string;
  description?: string;
}

export interface AskUserQuestion {
  id?: string;
  title: string;
  /** Options to choose from. Optional only because a `freeText` question
   *  has none; every other mode requires at least one. */
  options?: AskUserOption[];
  multiSelect?: boolean;
  allowOther?: boolean;
  otherPlaceholder?: string;
  skippable?: boolean;
  nextLabel?: string;
  /** Visual layout for each option row.
   *  - "inline" (default): title and description on one line.
   *  - "stacked": title above, description below — useful when descriptions
   *    are long enough to wrap. */
  layout?: 'inline' | 'stacked';
  /** Which side of the row the numbered chip sits on.
   *  - "right" (default): chip on the right; the single-select submit
   *    arrow overlays it on hover/focus.
   *  - "left": chip on the left, before the body. The submit arrow still
   *    appears on the right edge of the row, so the action affordance stays
   *    where the eye expects it. */
  chipPosition?: 'left' | 'right';
  /** Render a single multi-line textarea as the *only* answer, with no
   *  option rows — for open-ended prompts (a name, a description, free
   *  comments). Distinct from `allowOther`, which appends a free-text row
   *  *alongside* options. The field auto-focuses when the question appears;
   *  ⌘/⌃+Enter (or the bottom submit button) commits, and the answer is
   *  returned in `otherText`. `options` is ignored when this is set. */
  freeText?: boolean;
  /** Placeholder for the `freeText` textarea. */
  freeTextPlaceholder?: string;
  /** Whether the `freeText` field starts at multi-line height. Defaults to
   *  `true`. Set `false` for a single-line field where plain Enter submits
   *  instead of inserting a newline. Either way the textarea grows to fit. */
  freeTextMultiline?: boolean;
  /** Validate the `freeText` value when the user tries to submit (button or
   *  ⌘/⌃+Enter). Return an error message to block submission and surface it
   *  in the footer; return null/undefined to allow it. The error clears as
   *  soon as the user edits the field. */
  freeTextValidate?: (value: string) => string | null | undefined;
}

export interface AskUserAnswer {
  questionId: string;
  selectedIds: string[];
  otherText?: string;
  skipped?: boolean;
}

/** What `(skip)` emits: the React `onSkip(questionId, currentIndex)`. */
export interface AskUserSkipEvent {
  questionId: string;
  index: number;
}

export function questionKey(q: AskUserQuestion, i: number) {
  return q.id ?? `q-${i}`;
}

export function optionKey(o: AskUserOption, i: number) {
  return o.id ?? `o-${i}`;
}
