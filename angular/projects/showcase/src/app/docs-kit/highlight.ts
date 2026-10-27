// ---------------------------------------------------------------------------
// Code highlighting for the docs previews, ported from lib/docs/highlight.ts.
// One lazily created shiki highlighter for the whole site, in the two GitHub
// themes the site uses: it emits dual-theme markup (`--shiki-light` /
// `--shiki-dark` custom properties per token) and styles.css picks the one
// that matches the active theme with `light-dark()`, so a theme switch recolors
// every block without re-highlighting it.
//
// The two grammars are the ones an Angular snippet needs: `angular-html` for
// templates and `ts` for TypeScript (imports, providers, generated snippets).
// ---------------------------------------------------------------------------

import { createHighlighter, type Highlighter } from 'shiki/bundle/web';

/** The grammars this module loads. */
export type HighlightLanguage = 'angular-html' | 'ts';

const LANGS: HighlightLanguage[] = ['angular-html', 'ts'];

let highlighter: Highlighter | null = null;
let loading: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (highlighter) return Promise.resolve(highlighter);
  loading ??= createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: LANGS,
  }).then((created) => {
    highlighter = created;
    return created;
  });
  return loading;
}

/** The grammar a snippet's code is written in.
 *
 * Templates are the common case on a doc page, so anything that shows an
 * element without being a TypeScript file highlights as `angular-html`; a
 * snippet with only imports, decorators, providers or plain statements is
 * `ts`. Pages never choose: the Code tab and the search snippets both call
 * `highlight()`, which picks the grammar itself. */
export function highlightLanguage(code: string): HighlightLanguage {
  const trimmed = code.trim();
  if (!trimmed) return 'angular-html';
  if (/^</.test(trimmed)) return 'angular-html';
  if (/@Component\b|template\s*:|provideFluid\s*\(/.test(trimmed)) return 'ts';
  if (/^(import|export|const|let|function|class|interface|type)\b/.test(trimmed)) {
    // An Angular example that opens with its imports still shows a template:
    // it is the part the reader copies. Highlighting the template is the
    // useful half; the import lines stay uncolored.
    return /(^|\n)\s*</.test(trimmed) ? 'angular-html' : 'ts';
  }
  return 'ts';
}

/** Highlights a snippet for the Code tab: dual-theme GitHub HTML, with the
 *  colors left in CSS custom properties (`defaultColor: false`). */
export async function highlight(code: string, lang: HighlightLanguage = highlightLanguage(code)): Promise<string> {
  const instance = await getHighlighter();
  return instance.codeToHtml(code.trim(), {
    lang,
    themes: { dark: 'github-dark', light: 'github-light' },
    defaultColor: false,
  });
}
