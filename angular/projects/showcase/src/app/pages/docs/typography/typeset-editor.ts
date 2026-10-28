// ---------------------------------------------------------------------------
// The Markdown section's editor, ported from the TypesetEditor half of
// lib/docs/typeset-sample.tsx. The reference runs Tiptap; Angular ships no
// editor and D10 adds no package, so this is the same document — a
// contenteditable `.typeset` with markdown shortcuts that format in place,
// clickable to-dos, and the same Inspect switch — built on the DOM directly.
//
// What it keeps from the reference:
// - Markdown shortcuts as you type: "# " to "###### " for headings, "- " for
//   a list, "1. " for a numbered list, "[] " for a to-do, "> " for a quote,
//   "```" for code, "---" for a rule, and **bold**, *italic*, `code` and
//   ~~strike~~ inline.
// - To-dos toggle in place; a checked item's own text takes the line.
// - Clicking the page margin puts the caret at the end, as Notion does.
// - Inspect measures the live DOM: one band per line box of the block under
//   the pointer, plus who owns the space around it (margin, padding, gap) and
//   the sheet rule that set it, in the site inspector's colors.
// - The sheet's compact step follows the page's size setting (S).
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  Switch,
  ThemeService,
  cn,
  fontWeights,
  injectShape,
  injectSizeVariant,
} from '@angel-r/fluid-functionalism-angular';
import { ruleFor } from './typeset';

// ── Inspect ──────────────────────────────────────────────
// Hover a text block to see its line boxes (one band per line) and a readout
// of its measured font size and line height, plus the space around it.

// A type alias, not an interface, so a box passes straight in as a style.
type Box = {
  top: number;
  left: number;
  width: number;
  height: number;
};

interface InspectMark {
  el: HTMLElement;
  /** Border box: what the pointer is matched against. */
  box: Box;
  /** Content box: where the line bands go (inside a code block's padding). */
  content: Box;
  fontSize: number;
  /** Line height in px: one band per line. */
  lineHeight: number;
}

const INSPECT_BLOCKS = ':is(h1, h2, h3, h4, h5, h6, p, pre, figcaption)';
const INSPECT_BAND = 'rgba(107, 151, 255, 0.16)';
const INSPECT_TONES = {
  margin: { fill: 'rgba(255, 168, 82, 0.28)', line: 'rgba(240, 140, 40, 0.9)' },
  padding: { fill: 'rgba(153, 255, 201, 0.35)', line: 'rgba(83, 214, 145, 0.9)' },
} as const;

interface SpaceMark {
  kind: 'Margin top' | 'Padding top' | 'Padding bottom' | 'Gap';
  value: number;
  /** The element the space belongs to, e.g. "li". */
  owner: string;
  /** The sheet rule that set it, as its matching selector. */
  rule: string | null;
  band: Box;
  tone: keyof typeof INSPECT_TONES;
}

const pxLabel = (value: number) => {
  const n = Math.round(value * 10) / 10;
  return `${Number.isInteger(n) ? n : n.toFixed(1)}px`;
};

/** Distance from a point to a box (0 inside). */
function distanceTo(x: number, y: number, b: Box): number {
  return Math.hypot(
    Math.max(b.left - x, 0, x - (b.left + b.width)),
    Math.max(b.top - y, 0, y - (b.top + b.height)),
  );
}

const isRow = (node: HTMLElement): boolean => {
  const cs = getComputedStyle(node);
  return /flex/.test(cs.display) && !cs.flexDirection.startsWith('column');
};

/** Every block's boxes relative to `frame`, in document order. */
function measureBlocks(editor: HTMLElement, frame: HTMLElement): InspectMark[] {
  const base = frame.getBoundingClientRect();
  const blocks = Array.from(editor.querySelectorAll<HTMLElement>(INSPECT_BLOCKS));
  return blocks.map((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const [pt, pr, pb, pl] = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat);
    const box = { top: r.top - base.top, left: r.left - base.left, width: r.width, height: r.height };
    return {
      el,
      box,
      content: { top: box.top + pt, left: box.left + pl, width: box.width - pl - pr, height: box.height - pt - pb },
      fontSize: parseFloat(cs.fontSize),
      lineHeight: parseFloat(cs.lineHeight),
    };
  });
}

/** The space around `el` and who owns it, as bands relative to `frame`. */
function spacingOf(el: HTMLElement, editor: HTMLElement, frame: HTMLElement): SpaceMark[] {
  const base = frame.getBoundingClientRect();
  const rel = (node: Element): Box => {
    const r = node.getBoundingClientRect();
    return { top: r.top - base.top, left: r.left - base.left, width: r.width, height: r.height };
  };
  const name = (node: Element) => node.tagName.toLowerCase();
  const out: SpaceMark[] = [];

  const padding = (node: HTMLElement, side: 'top' | 'bottom') => {
    const cs = getComputedStyle(node);
    const value = parseFloat(side === 'top' ? cs.paddingTop : cs.paddingBottom);
    if (value < 0.5) return;
    const b = rel(node);
    const border = parseFloat(side === 'top' ? cs.borderTopWidth : cs.borderBottomWidth);
    out.push({
      kind: side === 'top' ? 'Padding top' : 'Padding bottom',
      value,
      owner: name(node),
      rule: ruleFor(node, side === 'top' ? 'padding-top' : 'padding-bottom'),
      band: {
        top: side === 'top' ? b.top + border : b.top + b.height - border - value,
        left: b.left,
        width: b.width,
        height: value,
      },
      tone: 'padding',
    });
  };

  // Above: the block's own padding, then its margin, then up through every
  // ancestor it opens (a first child shares its parent's space above).
  padding(el, 'top');
  let node: HTMLElement = el;
  while (node !== editor) {
    const mt = parseFloat(getComputedStyle(node).marginTop);
    if (mt >= 0.5) {
      const b = rel(node);
      out.push({
        kind: 'Margin top',
        value: mt,
        owner: name(node),
        rule: ruleFor(node, 'margin-top'),
        band: { top: b.top - mt, left: b.left, width: b.width, height: mt },
        tone: 'margin',
      });
    }
    const parent: HTMLElement | null = node.parentElement;
    if (!parent || parent === editor) break;
    // A sibling before it stacks above it, so the space is the block's own;
    // in a flex row (a to-do's checkbox) siblings sit beside it instead.
    if (node.previousElementSibling && !isRow(parent)) break;
    padding(parent, 'top');
    if (getComputedStyle(parent).display === 'table-cell') break;
    node = parent;
  }

  // Below: the block's own padding, then any ancestor it closes. The sheet
  // never adds margin below, so that's all the space under it.
  padding(el, 'bottom');
  node = el;
  while (node !== editor) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent || parent === editor) break;
    if (node.nextElementSibling && !isRow(parent)) break;
    padding(parent, 'bottom');
    if (getComputedStyle(parent).display === 'table-cell') break;
    node = parent;
  }

  // Gap: the nearest flex or grid ancestor that spaces its children, like a
  // to-do's checkbox and its text.
  for (let n = el.parentElement; n && n !== editor; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (!/flex|grid/.test(cs.display)) continue;
    const gap = Math.max(parseFloat(cs.columnGap) || 0, parseFloat(cs.rowGap) || 0);
    const [a, b] = Array.from(n.children);
    if (gap < 0.5 || !a || !b) break;
    const ra = rel(a);
    const rb = rel(b);
    const host = rel(n);
    out.push({
      kind: 'Gap',
      value: gap,
      owner: name(n),
      rule: ruleFor(n as HTMLElement, 'gap'),
      band: { top: host.top, left: ra.left + ra.width, width: Math.max(1, rb.left - ra.left - ra.width), height: host.height },
      tone: 'padding',
    });
    break;
  }
  return out;
}

@Component({
  selector: 'app-typeset-editor',
  imports: [Switch],
  templateUrl: './typeset-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypesetEditor {
  /** The starting HTML. Own constant markup, never visitor input. */
  readonly content = input.required<string>();
  /** The editor's accessible name. */
  readonly label = input.required<string>();

  protected readonly shape = injectShape();
  protected readonly semibold = fontWeights.semibold;
  protected readonly tones = INSPECT_TONES;
  protected readonly px = pxLabel;
  private readonly sizeVariant = injectSizeVariant();
  protected readonly compact = computed(() => this.sizeVariant() === 'compact');
  protected readonly inspect = signal(false);
  protected readonly hovered = signal<number | null>(null);
  private readonly marks = signal<InspectMark[]>([]);
  private readonly version = signal(0);

  protected readonly mark = computed(() => {
    this.version();
    const index = this.hovered();
    const marks = this.marks();
    return index === null ? undefined : marks[index];
  });

  protected readonly spacing = computed(() => {
    this.version();
    const mark = this.mark();
    const frame = this.frameRef()?.nativeElement;
    return mark && frame ? spacingOf(mark.el, this.editorRef().nativeElement, frame) : [];
  });

  /** The theme opposite the page's. The tooltip inverts the page
   *  (bg-foreground), so its readout sits in that theme's scope. */
  protected readonly inverse = computed(() => {
    this.theme.theme();
    this.inversion();
    return this.document.documentElement.classList.contains('dark') ? 'light' : 'dark';
  });
  /** Re-read on every theme flip, which the page does not signal itself. */
  private readonly inversion = signal(0);

  /** One band per line box, over the block's content box. */
  protected bandImage(lineHeight: number): string {
    return `repeating-linear-gradient(to bottom, ${INSPECT_BAND} 0 ${lineHeight}px, transparent ${lineHeight}px ${lineHeight * 2}px)`;
  }

  /** The readout sits above its block, or below it when the block is near the
   *  frame's top; its center keeps 150px inside the frame so it never clips. */
  protected readonly readout = computed(() => {
    const mark = this.mark();
    if (!mark) return { top: 0, left: 0, transform: 'translate(-50%, -100%)' };
    const half = 150;
    const left = Math.min(Math.max(mark.content.left + mark.content.width / 2, half), this.frameWidth() - half);
    const above = mark.content.top > 120;
    return {
      top: above ? mark.content.top - 8 : mark.content.top + mark.content.height + 8,
      left: Math.max(left, half),
      transform: above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
    };
  });

  protected readonly readoutClass = computed(() =>
    cn(
      'bg-foreground text-background text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] px-2 py-1',
      '[text-box:trim-both_cap_alphabetic] supports-[text-box:trim-both]:py-2',
      this.shape().bg,
      '!px-3 !py-2.5 max-w-[300px]',
    ),
  );

  private readonly editorRef = viewChild.required<ElementRef<HTMLElement>>('editor');
  private readonly frameRef = viewChild.required<ElementRef<HTMLElement>>('frame');
  private readonly document = inject(DOCUMENT);
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  /** The frame's width, so the readout stays inside it. */
  private readonly frameWidth = signal(0);

  constructor() {
    afterNextRender(() => {
      const editor = this.editorRef().nativeElement;
      // Own constant sample, never visitor input.
      editor.innerHTML = this.content();
      this.prepareTasks(editor);
      this.refreshPlaceholders();

      const measure = () => {
        if (this.inspect()) this.measure();
        this.inversion.update((value) => value + 1);
      };
      const observer = new ResizeObserver(() => measure());
      observer.observe(this.frameRef().nativeElement);
      observer.observe(editor);
      this.destroyRef.onDestroy(() => observer.disconnect());
      // Widths and line heights are only right once Inter has loaded.
      void this.document.fonts?.ready.then(() => measure());
    });

    // The compact step re-runs the sheet's variables: re-measure the blocks.
    afterRenderEffect(() => {
      this.compact();
      untracked(() => {
        if (this.inspect()) this.measure();
      });
    });
  }

  protected toggleInspect(): void {
    this.inspect.update((value) => !value);
    this.hovered.set(null);
    if (this.inspect()) this.measure();
    else this.marks.set([]);
  }

  protected pick(event: PointerEvent): void {
    if (!this.inspect()) return;
    const frame = this.frameRef().nativeElement;
    const marks = this.marks();
    if (marks.length === 0) return;
    const base = frame.getBoundingClientRect();
    const x = event.clientX - base.left;
    const y = event.clientY - base.top;
    let best = 0;
    marks.forEach((mark, index) => {
      if (distanceTo(x, y, mark.box) < distanceTo(x, y, marks[best].box)) best = index;
    });
    this.hovered.set(best);
  }

  /** A click in the page margin lands at the end of the document, as in Notion. */
  protected focusEnd(event: MouseEvent): void {
    const editor = this.editorRef().nativeElement;
    if (event.target instanceof Node && editor.contains(event.target)) return;
    event.preventDefault();
    editor.focus();
    const range = this.document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = this.document.defaultView?.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  protected onInput(): void {
    this.refreshPlaceholders();
    this.tryBlockShortcut();
    this.tryInlineShortcut();
    this.refreshPlaceholders();
    if (this.inspect()) this.measure();
    this.inversion.update((value) => value + 1);
  }

  protected onClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    // Tiptap's link extension runs with openOnClick: false.
    if (target.closest('a')) event.preventDefault();

    const checkbox = target.closest('input[type="checkbox"]');
    const row = checkbox?.closest('li') ?? (target.closest('label')?.closest('li') ?? null);
    if (!row || !checkbox) return;
    event.preventDefault();
    const checked = row.getAttribute('data-checked') !== 'true';
    row.setAttribute('data-checked', checked ? 'true' : 'false');
    (checkbox as HTMLInputElement).checked = checked;
    this.refreshPlaceholders();
  }

  protected onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text/plain');
    if (text === undefined) return;
    event.preventDefault();
    this.document.execCommand('insertText', false, text);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (this.insertBlockBreak(event)) event.preventDefault();
    }
  }

  // ── Formatting ─────────────────────────────────────────

  /** The element the caret sits in, up to the editor. */
  private blockOf(node: Node): HTMLElement | null {
    const editor = this.editorRef().nativeElement;
    let element: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;
    while (element && element !== editor) {
      if (/^(P|H1|H2|H3|H4|H5|H6|PRE|LI|BLOCKQUOTE)$/.test(element.tagName)) return element;
      element = element.parentElement;
    }
    return null;
  }

  private select(element: HTMLElement): void {
    const selection = this.document.defaultView?.getSelection();
    if (!selection) return;
    const range = this.document.createRange();
    range.selectNodeContents(element);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    element.focus();
  }

  private caretAfter(node: Node): void {
    const selection = this.document.defaultView?.getSelection();
    if (!selection) return;
    const range = this.document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /** Replaces the caret's block with `replacement`, then places the caret in
   *  `caretIn` (an element inside it). */
  private replaceBlock(block: HTMLElement, replacement: HTMLElement, caretIn: HTMLElement): void {
    block.parentElement?.replaceChild(replacement, block);
    this.select(caretIn);
    this.refreshPlaceholders();
  }

  private paragraph(content = ''): HTMLElement {
    const p = this.document.createElement('p');
    if (content) p.textContent = content;
    else p.appendChild(this.document.createElement('br'));
    return p;
  }

  private taskItem(): HTMLElement {
    const li = this.document.createElement('li');
    li.setAttribute('data-type', 'taskItem');
    li.setAttribute('data-checked', 'false');
    const label = this.document.createElement('label');
    label.setAttribute('contenteditable', 'false');
    const checkbox = this.document.createElement('input');
    checkbox.type = 'checkbox';
    label.appendChild(checkbox);
    const content = this.document.createElement('div');
    const p = this.paragraph();
    content.appendChild(p);
    li.append(label, content);
    return li;
  }

  /** Markdown block shortcuts, applied as you type, the way Tiptap's input
   *  rules do: only when the block holds the shortcut alone. */
  private tryBlockShortcut(): void {
    const selection = this.document.defaultView?.getSelection();
    if (!selection?.anchorNode || !selection.isCollapsed) return;
    const block = this.blockOf(selection.anchorNode);
    const editor = this.editorRef().nativeElement;
    if (!block || block === editor || block.tagName === 'PRE') return;
    const text = block.textContent ?? '';

    const heading = /^(#{1,6}) $/.exec(text);
    if (heading) {
      const h = this.document.createElement(`h${heading[1].length}`);
      this.replaceBlock(block, h, h);
      return;
    }
    if (/^[-*] $/.test(text)) {
      const ul = this.document.createElement('ul');
      const li = this.document.createElement('li');
      const p = this.paragraph();
      li.appendChild(p);
      ul.appendChild(li);
      this.replaceBlock(block, ul, p);
      return;
    }
    if (/^\d+\. $/.test(text)) {
      const ol = this.document.createElement('ol');
      const li = this.document.createElement('li');
      const p = this.paragraph();
      li.appendChild(p);
      ol.appendChild(li);
      this.replaceBlock(block, ol, p);
      return;
    }
    if (/^\[\] ?$/.test(text)) {
      const ul = this.document.createElement('ul');
      ul.setAttribute('data-type', 'taskList');
      const li = this.taskItem();
      ul.appendChild(li);
      const p = li.querySelector('p') as HTMLElement;
      this.replaceBlock(block, ul, p);
      return;
    }
    if (/^> $/.test(text)) {
      const quote = this.document.createElement('blockquote');
      const p = this.paragraph();
      quote.appendChild(p);
      this.replaceBlock(block, quote, p);
      return;
    }
    if (text === '```') {
      const pre = this.document.createElement('pre');
      const code = this.document.createElement('code');
      pre.appendChild(code);
      this.replaceBlock(block, pre, code);
      return;
    }
    if (text === '---') {
      const rule = this.document.createElement('hr');
      const p = this.paragraph();
      block.parentElement?.replaceChild(rule, block);
      rule.parentElement?.insertBefore(p, rule.nextSibling);
      this.select(p);
      this.refreshPlaceholders();
    }
  }

  /** Inline shortcuts: the closing delimiter turns what is before it into
   *  the mark, inside the one text node. */
  private tryInlineShortcut(): void {
    const selection = this.document.defaultView?.getSelection();
    if (!selection?.isCollapsed || !(selection.anchorNode instanceof Text)) return;
    const node = selection.anchorNode;
    const offset = selection.anchorOffset;
    const before = node.data.slice(0, offset);
    const patterns: ReadonlyArray<readonly [RegExp, string]> = [
      [/\*\*([^*\n]+)\*\*$/, 'strong'],
      [/~~([^~\n]+)~~$/, 's'],
      [/`([^`\n]+)`$/, 'code'],
      [/(?<!\*)\*([^*\n]+)\*$/, 'em'],
      [/(?<!_)_([^_\n]+)_$/, 'em'],
    ];
    for (const [pattern, tag] of patterns) {
      const match = pattern.exec(before);
      if (!match) continue;
      const start = offset - match[0].length;
      const range = this.document.createRange();
      range.setStart(node, start);
      range.setEnd(node, offset);
      range.deleteContents();
      const element = this.document.createElement(tag);
      element.textContent = match[1];
      range.insertNode(element);
      this.caretAfter(element);
      return;
    }
  }

  /** Enter: a new block of the same kind where that makes sense (a list item,
   *  a paragraph), a line inside code, and the list's exit on an empty item.
   *  Text after the caret moves into the new block, as an editor splits. */
  private insertBlockBreak(event: KeyboardEvent): boolean {
    const selection = this.document.defaultView?.getSelection();
    if (!selection?.anchorNode) return false;
    const editor = this.editorRef().nativeElement;
    const block = this.blockOf(selection.anchorNode);
    if (!block || block === editor) return false;

    if (block.tagName === 'PRE' || block.closest('pre')) {
      event.preventDefault();
      this.document.execCommand('insertText', false, '\n');
      return true;
    }

    const rest = this.rangeAfterCaret(block);
    const li = block.tagName === 'LI' ? block : block.closest('li');
    if (li) {
      const item = li as HTMLElement;
      const list = item.parentElement;
      if (!list) return false;
      if ((item.textContent ?? '').trim() === '' && !item.querySelector('input[type="checkbox"]')) {
        // An empty item steps out of the list, back into a paragraph.
        const p = this.paragraph();
        list.parentElement?.insertBefore(p, list.nextSibling);
        item.remove();
        if (list.children.length === 0) list.remove();
        this.select(p);
      } else {
        const next =
          item.getAttribute('data-type') === 'taskItem'
            ? this.taskItem()
            : (() => {
                const element = this.document.createElement('li');
                element.appendChild(this.paragraph());
                return element;
              })();
        const target = next.querySelector('p') ?? next;
        list.insertBefore(next, item.nextSibling);
        target.replaceChildren(rest);
        this.select(target);
      }
      this.refreshPlaceholders();
      return true;
    }

    const p = this.paragraph();
    p.replaceChildren(rest);
    block.parentElement?.insertBefore(p, block.nextSibling);
    this.select(p);
    this.refreshPlaceholders();
    return true;
  }

  /** The block's content after the caret, as a fragment. */
  private rangeAfterCaret(block: HTMLElement): DocumentFragment {
    const selection = this.document.defaultView?.getSelection();
    const range = this.document.createRange();
    range.selectNodeContents(block);
    if (selection?.rangeCount) range.setStart(selection.getRangeAt(0).endContainer, selection.getRangeAt(0).endOffset);
    return range.extractContents();
  }

  /** Tiptap's task-item node view: a checkbox beside a content column. The
   *  sample and the shortcut both write the plain item, so the box is added
   *  here, once, and the sheet's task rules apply as they do in the reference. */
  private prepareTasks(editor: HTMLElement): void {
    editor.querySelectorAll<HTMLElement>('li[data-type="taskItem"]').forEach((item) => {
      if (item.querySelector(':scope > label')) return;
      const label = this.document.createElement('label');
      label.setAttribute('contenteditable', 'false');
      const checkbox = this.document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.getAttribute('data-checked') === 'true';
      label.appendChild(checkbox);
      const content = this.document.createElement('div');
      while (item.firstChild) content.appendChild(item.firstChild);
      item.append(label, content);
    });
  }

  private refreshPlaceholders(): void {
    const editor = this.editorRef().nativeElement;
    editor.querySelectorAll<HTMLElement>(':is(h1, h2, h3, h4, h5, h6, p, pre)').forEach((block) => {
      const empty =
        (block.textContent ?? '').trim() === '' &&
        !block.querySelector('img, input[type="checkbox"], code:not(:empty)');
      block.classList.toggle('is-empty', empty);
      if (empty) block.setAttribute('data-placeholder', this.placeholderFor(block));
      else block.removeAttribute('data-placeholder');
    });
  }

  private placeholderFor(block: HTMLElement): string {
    const heading = /^H([1-6])$/.exec(block.tagName);
    if (heading) return `Heading ${heading[1]}`;
    if (block.tagName === 'PRE') return 'Code';
    return 'Write something';
  }

  private measure(): void {
    const frame = this.frameRef().nativeElement;
    this.frameWidth.set(frame.getBoundingClientRect().width);
    this.marks.set(measureBlocks(this.editorRef().nativeElement, frame));
    this.version.update((value) => value + 1);
  }
}
