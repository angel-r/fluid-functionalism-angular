// ---------------------------------------------------------------------------
// The Markdown section's data: the starting document, the sheet's spacing
// values, and the spacing rules the inspector traces a margin or padding back
// to. Ported from lib/docs/typeset-sample.tsx (MARKDOWN_SAMPLE) and
// lib/typeset/generate.ts (TYPESET_SPACE, the spacing rules), with the copy
// rewritten for Angular (S8).
//
// The sheet itself is typeset.css, generated from generateTypesetCss(typeStyles)
// exactly as the reference's globals.css carries it.
// ---------------------------------------------------------------------------

/** Starting HTML of the Markdown section: a getting-started doc with most of
 *  what markdown writes: 3 heading levels, bold, italic, strikethrough,
 *  inline code, a link, nested bullets, numbers, and to-dos, a quote, a
 *  table, a code block, and a rule. */
export const MARKDOWN_SAMPLE = [
  '<h1>Getting started with Fluid Functionalism</h1>',
  '<p><strong>Stack</strong> Angular and Tailwind v4 · <strong>License</strong> MIT</p>',
  '<h2>Setup</h2>',
  '<ul data-type="taskList">',
  '<li data-type="taskItem" data-checked="true"><p>Install the type scale and the markdown styles</p></li>',
  '<li data-type="taskItem" data-checked="true"><p>Add a dropdown and a dialog</p></li>',
  '<li data-type="taskItem" data-checked="false"><p>Move every list to fluid hover</p>',
  '<ul data-type="taskList">',
  '<li data-type="taskItem" data-checked="true"><p>Sidebar</p></li>',
  '<li data-type="taskItem" data-checked="false"><p>Command menu</p></li>',
  '</ul></li>',
  '<li data-type="taskItem" data-checked="false"><p>Switch dense screens to compact</p></li>',
  '</ul>',
  '<h2>How it moves</h2>',
  '<p>Every component animates with <strong>3 spring speeds</strong>, and hover <em>glides</em> to the item under your cursor instead of blinking. A label turns <code>semibold</code> without moving its neighbors, since <code>fontWeights</code> pairs each weight with an optical size. The <a href="docs/motion">motion page</a> has every value.</p>',
  '<blockquote><p>No component invents its own timing, so everything moves at the same pace.</p></blockquote>',
  '<h3>What you get</h3>',
  '<ul>',
  '<li><p>Components at 2 sizes</p><ul><li><p>Default, 36px rows</p></li><li><p>Compact, 28px rows</p></li></ul></li>',
  '<li><p>A size ladder of 36px and 28px rows</p></li>',
  '<li><p>A skill for your coding agent</p></li>',
  '</ul>',
  '<h3>Spring speeds</h3>',
  '<table><tbody>',
  '<tr><th><p>Speed</p></th><th><p>Duration</p></th><th><p>Used for</p></th></tr>',
  '<tr><td><p>fast</p></td><td><p>0.08s</p></td><td><p>Hover, tooltips, focus rings</p></td></tr>',
  '<tr><td><p>moderate</p></td><td><p>0.16s</p></td><td><p>Dropdowns and tabs</p></td></tr>',
  '<tr><td><p>slow</p></td><td><p>0.24s</p></td><td><p>Dialogs and drawers</p></td></tr>',
  '</tbody></table>',
  '<h2>Install</h2>',
  '<p>Each piece is a package. We planned to <s>ship one big bundle</s> ship one item per component, so you only add what you use:</p>',
  '<pre><code class="language-bash"># One component\nnpm i @angel-r/fluid-functionalism-angular\n\n# The skill for your coding agent\nnpx skills add angel-r/fluid-functionalism-angular</code></pre>',
  '<h3>Next steps</h3>',
  '<ol>',
  '<li><p>Read the craft notes for each component</p></li>',
  '<li><p>Install the skill</p><ol><li><p>Let it read your stack</p></li><li><p>Fix what it flags</p></li></ol></li>',
  '<li><p>Ship it</p></li>',
  '</ol>',
  '<hr>',
  '<p>Found a bug? Open an issue on <strong>GitHub</strong>.</p>',
].join('');

/** Room between blocks in px: 12px between paragraphs and 8px under a
 *  title, as on the site's doc pages, then 24px above a section and 20px
 *  above a sub-heading. Compact steps them down, list items aside. The
 *  Spacing table on the page reads them from here. */
export const TYPESET_SPACE = {
  /** Between blocks: paragraphs, lists, quotes, code, tables, media. */
  block: { default: 12, compact: 8 },
  /** Below a heading, and above a figcaption. */
  heading: { default: 8, compact: 4 },
  /** Above h1 and h2. */
  section: { default: 24, compact: 16 },
  /** Above h3 to h6. */
  subsection: { default: 20, compact: 12 },
  /** Both sides of an hr. */
  rule: { default: 24, compact: 16 },
  /** Between list items, and inside an item. */
  item: { default: 4, compact: 4 },
} as const;

export type SpaceKind = keyof typeof TYPESET_SPACE;

/** The sheet's spacing rules, in source order: `[selector, declarations]`.
 *  Only the declarations the inspector traces (margin, padding and gap), and
 *  the selectors generateTypesetCss writes, so `ruleFor` names the rule that
 *  set the space the pointer is over. Values don't change selectors. */
const BLOCKS = 'p, ul, ol, pre, blockquote, figure, table, .typeset-scroll, .tableWrapper, img, video';
const ANY_HEADING = 'h1, h2, h3, h4, h5, h6';

/** Split a selector list at its top-level commas (not the ones inside
 *  `:is(…)`). Also used by the docs inspector to name the rule it traced. */
export function selectorList(sel: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < sel.length; i++) {
    if (sel[i] === '(') depth++;
    else if (sel[i] === ')') depth--;
    else if (sel[i] === ',' && depth === 0) {
      parts.push(sel.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(sel.slice(start).trim());
  return parts;
}

// The same two wrappers generate.ts builds: every element selector inside
// `.typeset` in a single :where(), plus the opt-out.
const inSheet = (sel: string) =>
  selectorList(sel)
    .map((part) => `.typeset ${part}`)
    .join(', ');
const OPT_OUT = ':not(:where(.typeset .not-typeset, .typeset .not-typeset *))';
const el = (sel: string) => `:where(${inSheet(sel)})${OPT_OUT}`;
const flowEl = (sel: string) => `:where(${inSheet(sel)}):not(:where(.typeset .not-typeset *))`;

export type SpacingDecls = Record<string, string>;

export const SHEET_SPACING_RULES: ReadonlyArray<readonly [selector: string, decls: SpacingDecls]> = [
  [el(`${BLOCKS}, ${ANY_HEADING}, li`), { margin: '0' }],
  [flowEl(`* + :is(${BLOCKS}, .not-typeset)`), { 'margin-top': 'var(--typeset-space-block)' }],
  [el('* + :is(h1, h2)'), { 'margin-top': 'var(--typeset-space-section)' }],
  [el('* + :is(h3, h4, h5, h6)'), { 'margin-top': 'var(--typeset-space-subsection)' }],
  [flowEl(':is(h1, h2, h3, h4, h5, h6) + *'), { 'margin-top': 'var(--typeset-space-heading)' }],
  [el('hr'), { 'margin-top': 'var(--typeset-space-rule)' }],
  [flowEl('hr + *'), { 'margin-top': 'var(--typeset-space-rule)' }],
  [el('ul, ol'), { 'padding-left': 'calc(var(--typeset-indent) - 4px)' }],
  [el('li ul, li ol'), { 'padding-left': 'calc(var(--typeset-sub-indent) - 4px)' }],
  [el('li'), { 'padding-left': '4px' }],
  [
    el('li + li, li > ul, li > ol, li > p + p, li > div > ul, li > div > ol, li > div > p + p'),
    { 'margin-top': 'var(--typeset-space-item)' },
  ],
  [el('.contains-task-list, ul[data-type="taskList"]'), { 'padding-left': '0' }],
  [el('.contains-task-list > li, ul[data-type="taskList"] > li'), { 'padding-left': '0' }],
  [el('.contains-task-list .contains-task-list'), { 'padding-left': 'var(--typeset-sub-indent)' }],
  [
    el('ul[data-type="taskList"] > li > div > ul[data-type="taskList"]'),
    { 'margin-left': 'calc(var(--typeset-sub-indent) - var(--typeset-indent))' },
  ],
  [
    el('.task-list-item > :is(ul, ol):not(.contains-task-list)'),
    { 'padding-left': 'calc(var(--typeset-indent) + var(--typeset-sub-indent) - 4px)' },
  ],
  [el('ul[data-type="taskList"] > li'), { gap: 'var(--typeset-check-gap)' }],
  [el('blockquote'), { 'padding-left': '1em' }],
  [el('pre'), { padding: '0.75em 1em' }],
  [el('th, td'), { padding: '0.5em 0.75em' }],
  [el('th:first-child, td:first-child'), { 'padding-left': '0' }],
  [el('figcaption'), { 'margin-top': 'var(--typeset-space-heading)' }],
];

/** The selector list a sheet rule opens with, `:where(.typeset p, …)`,
 *  split at its top-level commas. */
function whereParts(sel: string): string[] {
  if (!sel.startsWith(':where(')) return [];
  let depth = 0;
  let i = 0;
  for (; i < sel.length; i++) {
    if (sel[i] === '(') depth++;
    else if (sel[i] === ')' && --depth === 0) break;
  }
  return selectorList(sel.slice(':where('.length, i));
}

const safeMatches = (element: Element, sel: string): boolean => {
  try {
    return element.matches(sel);
  } catch {
    return false;
  }
};

/** The last sheet rule (same specificity, so order wins) that sets `prop`
 *  on `element`, as its selector. */
export function ruleFor(
  element: HTMLElement,
  prop: 'margin-top' | 'padding-top' | 'padding-bottom' | 'gap',
): string | null {
  const short = prop === 'margin-top' ? 'margin' : prop === 'gap' ? 'gap' : 'padding';
  for (let i = SHEET_SPACING_RULES.length - 1; i >= 0; i--) {
    const [sel, decls] = SHEET_SPACING_RULES[i];
    const value = decls[prop] ?? decls[short];
    if (value === undefined || sel.includes('::') || !safeMatches(element, sel)) continue;
    const part = whereParts(sel).find((p) => safeMatches(element, p)) ?? sel;
    // An element list reads better as the element it matched: the block
    // itself at the end, the one before it in front of a `+`.
    const tag = (node: Element | null) => node?.tagName.toLowerCase() ?? '*';
    return part
      .replace(/^\.typeset /, '')
      .replace(/:is\([^)]*\)$/, tag(element))
      .replace(/:is\([^)]*\)/, tag(element.previousElementSibling));
  }
  return null;
}
