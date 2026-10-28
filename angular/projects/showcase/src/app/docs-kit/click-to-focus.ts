// ---------------------------------------------------------------------------
// Routes keyboard control into a preview on click. Ported from
// lib/click-to-focus.ts: when the visitor presses an empty (non-interactive)
// part of the preview, focus moves to the preview region itself rather than to
// a control inside it, so a mouse press never lights a control's keyboard ring,
// while a real control keeps its native focus.
//
// ComponentPreview pairs this with a `focus-within` border on its frame, so the
// active demo is visible and the page gets keyboard control back when focus
// leaves.
// ---------------------------------------------------------------------------

/** Anything that can hold keyboard focus. */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[role="slider"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Fields a click away should leave: text-like inputs only (not range,
 *  buttons, checkboxes or file pickers, which keep focus like any control). */
const TEXT_ENTRY_SELECTOR = [
  'textarea',
  'input:not([type])',
  ...[
    'text',
    'search',
    'email',
    'url',
    'tel',
    'password',
    'number',
    'date',
    'time',
    'datetime-local',
    'month',
    'week',
  ].map((type) => `input[type=${type}]`),
].join(',');

/** Handles the press: a press on a control keeps its focus, an empty-space
 *  press lands on `scope` (or `fallback`). */
export function routeKeyboardOnMouseDown(event: MouseEvent, scope: HTMLElement | null, fallback?: HTMLElement | null): void {
  if (!scope) return;
  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (target.closest(FOCUSABLE_SELECTOR)) return; // let the element focus itself
  // A press on a popup opened from the demo (a menu, a time list) is not a
  // press on this region's empty space: keep the field's focus where it is.
  if (!scope.contains(target)) {
    event.preventDefault();
    return;
  }
  event.preventDefault(); // don't blur to <body> on an empty-space press
  const region = fallback ?? scope;
  const active = document.activeElement as HTMLElement | null;
  // Already keyboard-active here: keep the current focus, except in a text
  // field. Pressing away from a field means leaving it (a value being typed
  // commits on blur), so focus moves to the region instead.
  const typing = !!active && (active.matches(TEXT_ENTRY_SELECTOR) || active.isContentEditable);
  if (active && region.contains(active) && active !== region && !typing) return;
  region.focus();
}
