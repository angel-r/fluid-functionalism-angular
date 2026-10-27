// ---------------------------------------------------------------------------
// The Breaking entries' ```diff blocks, highlighted the way
// lib/docs/highlight.ts does it: each line keeps its syntax colors and gets
// `diff add` / `diff remove` from its `+` / `-` marker, which styles.css turns
// into a tinted line with the marker in a gutter.
//
// This is the changelog's own highlighter instance: the docs kit loads only the
// template grammars, and a diff can be written in any of DIFF_LANGS.
// ---------------------------------------------------------------------------

import { createHighlighter, type Highlighter } from 'shiki/bundle/web';

/** The languages a ```` ```diff <lang> ```` fence may name. A bare ```diff is
 *  TSX, the language the upstream components are written in. */
export const DIFF_LANGS = ['tsx', 'ts', 'css', 'json', 'bash'] as const;
export type DiffLang = (typeof DIFF_LANGS)[number];

let highlighter: Highlighter | null = null;
let loading: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (highlighter) return Promise.resolve(highlighter);
  loading ??= createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: [...DIFF_LANGS],
  }).then((created) => {
    highlighter = created;
    return created;
  });
  return loading;
}

/** A diff for the `.changelog-diff` block: dual-theme GitHub HTML, with the
 *  add/remove classes on the lines. */
export async function highlightDiff(diff: string, lang: DiffLang = 'tsx'): Promise<string> {
  const instance = await getHighlighter();
  const lines = diff.replace(/\n+$/, '').split('\n');
  const marks = lines.map((line) => (line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : null));
  // Releases write `- code`, a space after the marker; plain unified diffs
  // write `-code`. Drop the space too when every line has one, so the code
  // starts at the gutter's edge either way.
  const spaced = lines.every((line) => !line || /^[+\- ]( |$)/.test(line));
  const code = lines.map((line) => (/^[+\- ]/.test(line) ? line.slice(spaced ? 2 : 1) : line)).join('\n');
  return instance.codeToHtml(code, {
    lang,
    themes: { dark: 'github-dark', light: 'github-light' },
    defaultColor: false,
    transformers: [
      {
        line(node, line) {
          const mark = marks[line - 1];
          if (mark) this.addClassToHast(node, ['diff', mark]);
        },
      },
    ],
  });
}
