/** The class the wrapped leading text gets: it truncates, its siblings don't. */
export const LEADING_TEXT_CLASS = 'min-w-0 truncate';

const MARKER = 'data-ff-leading-text';

/**
 * Truncate only the leading text of a row: wraps the text nodes that open
 * `container` (up to its first element) in `<span class="min-w-0 truncate">`,
 * so element children (count badges, trailing controls) stay flex siblings
 * that the row's gap keeps spacing — the React label splits its string
 * children the same way. Idempotent; Angular keeps updating the moved text
 * nodes in place. Returns the wrapper, or null when there is no leading text.
 */
export function wrapLeadingText(container: HTMLElement): HTMLElement | null {
  const document = container.ownerDocument;
  const leading: Text[] = [];
  let existing: HTMLElement | null = null;
  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === Node.COMMENT_NODE) continue;
    if (node.nodeType === Node.TEXT_NODE) {
      leading.push(node as Text);
      continue;
    }
    if (node instanceof HTMLElement && node.hasAttribute(MARKER)) existing = node;
    break;
  }
  const text = leading.filter((node) => node.data.trim() !== '');
  if (text.length === 0) return existing;
  const wrapper = existing ?? document.createElement('span');
  if (!existing) {
    wrapper.setAttribute(MARKER, '');
    wrapper.className = LEADING_TEXT_CLASS;
    container.insertBefore(wrapper, text[0]);
  }
  // New leading text lands in front of the existing wrapper's content.
  const anchor = existing ? existing.firstChild : null;
  for (const node of text) wrapper.insertBefore(node, anchor);
  return wrapper;
}
