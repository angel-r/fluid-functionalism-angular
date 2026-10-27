// ---------------------------------------------------------------------------
// The Code tabs of /docs/ask-user-questions, written as Angular. The React
// page keeps one hand-written JSX snippet per demo; here a single emitter
// rebuilds the questions literal from the same data the preview renders, so a
// demo and its Code tab can never disagree (S8).
//
// The emitter follows the reference's layout: the questions literal with only
// the keys the question sets, a `@Component` with the template element, and the
// class that feeds it. Optional `leading` comments are the reference's own.
// ---------------------------------------------------------------------------

import type { AskUserOption, AskUserQuestion } from '@angel-r/fluid-functionalism-angular';
import type { PresetGlobals } from '../../../docs-kit/preset/preset-globals';
import {
  chipLeftQuestions,
  freeTextQuestions,
  multiSelectQuestions,
  multipleQuestions,
  otherQuestions,
  skipQuestions,
  stackedQuestions,
  validateQuestions,
} from './questions';

/** One-line options stay on a line while they fit this width, the way the
 *  reference's formatter wraps them. */
const PRINT_WIDTH = 80;

export interface SnippetSpec {
  questions: readonly AskUserQuestion[];
  /** Bindings on the template element, one per line, without indentation.
   *  Defaults to `[questions]="questions"`. */
  bindings?: readonly string[];
  /** Extra type imports from the package, e.g. `AskUserAnswer`. */
  ffTypes?: readonly string[];
  /** Extra runtime imports from `@angular/core`, e.g. `signal`. */
  core?: readonly string[];
  /** Class members after the questions field, one entry per line. */
  members?: readonly string[];
  /** Comment lines above the questions literal. */
  leading?: readonly string[];
  /** Raw `freeTextValidate` source lines, keyed by question id. A function
   *  value cannot be rebuilt from the data, so the demo passes its source. */
  validateSource?: Readonly<Record<string, readonly string[]>>;
  /** Pin `provideFluid()` to the site settings (install prompt only). */
  providers?: PresetGlobals;
}

function optionLines(option: AskUserOption): string[] {
  const parts: string[] = [];
  if (option.id !== undefined) parts.push(`id: ${JSON.stringify(option.id)}`);
  parts.push(`title: ${JSON.stringify(option.title)}`);
  if (option.description !== undefined) parts.push(`description: ${JSON.stringify(option.description)}`);
  const single = `      { ${parts.join(', ')} },`;
  if (single.length <= PRINT_WIDTH) return [single];

  const lines = ['      {'];
  if (option.id !== undefined) lines.push(`        id: ${JSON.stringify(option.id)},`);
  lines.push(`        title: ${JSON.stringify(option.title)},`);
  if (option.description !== undefined) {
    const kept = `        description: ${JSON.stringify(option.description)},`;
    if (kept.length <= PRINT_WIDTH) lines.push(kept);
    else lines.push('        description:', `          ${JSON.stringify(option.description)},`);
  }
  lines.push('      },');
  return lines;
}

/** The `const questions: AskUserQuestion[] = […]` literal. */
function questionLines(
  questions: readonly AskUserQuestion[],
  validateSource: Readonly<Record<string, readonly string[]>> = {},
): string[] {
  const lines = ['const questions: AskUserQuestion[] = ['];
  for (const q of questions) {
    lines.push('  {');
    if (q.id !== undefined) lines.push(`    id: ${JSON.stringify(q.id)},`);
    lines.push(`    title: ${JSON.stringify(q.title)},`);
    if (q.freeText) {
      lines.push('    freeText: true,');
      if (q.freeTextMultiline === false) {
        lines.push('    freeTextMultiline: false, // single-line; Enter submits');
      }
      if (q.freeTextPlaceholder !== undefined) {
        lines.push(`    freeTextPlaceholder: ${JSON.stringify(q.freeTextPlaceholder)},`);
      }
    } else {
      if (q.layout === 'stacked') lines.push('    layout: "stacked",');
      if (q.chipPosition === 'left') lines.push('    chipPosition: "left",');
      if (q.multiSelect) lines.push('    multiSelect: true,');
      if (q.allowOther) {
        lines.push('    allowOther: true,');
        if (q.otherPlaceholder !== undefined) {
          lines.push(`    otherPlaceholder: ${JSON.stringify(q.otherPlaceholder)},`);
        }
      }
    }
    if (q.skippable === false) lines.push('    skippable: false,');
    if (q.nextLabel !== undefined) lines.push(`    nextLabel: ${JSON.stringify(q.nextLabel)},`);
    if (q.id !== undefined) lines.push(...(validateSource[q.id] ?? []));
    if (!q.freeText) {
      lines.push('    options: [');
      for (const option of q.options ?? []) lines.push(...optionLines(option));
      lines.push('    ],');
    }
    lines.push('  },');
  }
  lines.push('];');
  return lines;
}

/** A complete Angular snippet: the setup (when pinned), the questions, the
 *  component and its class. */
export function buildSnippet(spec: SnippetSpec): string {
  const bindings = spec.bindings ?? ['[questions]="questions"'];
  const types = [...new Set([...(spec.ffTypes ?? []), 'AskUserQuestion'])].sort();
  const core = ['Component', ...(spec.core ?? [])].join(', ');

  const lines: string[] = [];
  if (spec.providers) {
    lines.push('// app.config.ts');
    lines.push("import { type ApplicationConfig } from '@angular/core';");
    lines.push("import { provideFluid } from '@angel-r/fluid-functionalism-angular';");
    lines.push('');
    lines.push('export const appConfig: ApplicationConfig = {');
    lines.push(
      `  providers: [provideFluid({ shape: '${spec.providers.shape}', size: '${spec.providers.size}' })],`,
    );
    lines.push('};');
    lines.push('');
    lines.push('// question-flow.ts');
  }
  lines.push(`import { ${core} } from '@angular/core';`);
  lines.push(
    `import { AskUserQuestions, ${types.map((name) => `type ${name}`).join(', ')} } from '@angel-r/fluid-functionalism-angular';`,
  );
  lines.push('');
  for (const comment of spec.leading ?? []) lines.push(comment);
  lines.push(...questionLines(spec.questions, spec.validateSource));
  lines.push('');
  lines.push('@Component({');
  lines.push('  imports: [AskUserQuestions],');
  if (bindings.length === 1) {
    lines.push(`  template: \`<ff-ask-user-questions ${bindings[0]} />\`,`);
  } else {
    lines.push('  template: `<ff-ask-user-questions');
    for (const binding of bindings) lines.push(`    ${binding}`);
    lines.push('  />`,');
  }
  lines.push('})');
  lines.push('export class QuestionFlow {');
  lines.push('  protected readonly questions = questions;');
  if (spec.members?.length) {
    lines.push('');
    for (const member of spec.members) lines.push(member);
  }
  lines.push('}');
  return lines.join('\n');
}

// ── The page's demos ──────────────────────────────────────────────────────

export const multipleCode = buildSnippet({ questions: multipleQuestions });

export const multiSelectCode = buildSnippet({ questions: multiSelectQuestions });

export const otherCode = buildSnippet({ questions: otherQuestions });

export const freeTextCode = buildSnippet({
  questions: freeTextQuestions,
  leading: [
    '// freeText turns a question into a single open-ended textarea — no options.',
    '// The field auto-focuses and commits with ⌘/⌃+Enter or the bottom button.',
  ],
});

export const validateCode = buildSnippet({
  questions: validateQuestions,
  leading: [
    '// freeTextValidate runs on submit; a returned message blocks navigation and',
    '// shows in the footer, left-aligned. It clears as soon as the user edits.',
  ],
  validateSource: {
    email: [
      '    freeTextValidate: (value) =>',
      '      /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(value)',
      '        ? null',
      '        : "Please enter a valid email so we can reach out.",',
    ],
  },
});

export const skipCode = buildSnippet({
  questions: skipQuestions,
  bindings: ['[questions]="questions"', '(skip)="onSkip($event)"'],
  ffTypes: ['AskUserSkipEvent'],
  members: [
    '  protected onSkip(event: AskUserSkipEvent): void {',
    "    console.log('skipped', event.questionId, event.index);",
    '  }',
  ],
});

export const chipLeftCode = buildSnippet({
  questions: chipLeftQuestions,
  leading: [
    '// Chip-on-left works with every other option. This walks through:',
    '// single-select inline, single-select stacked, multi-select inline,',
    '// allow-other (multi-line textarea), and skippable: false — all with',
    '// chipPosition: "left". The single-select submit arrow still appears',
    '// on the right edge of the row.',
  ],
});

export const stackedCode = buildSnippet({
  questions: stackedQuestions,
  leading: [
    '// Every question opts into the stacked layout. The set covers the',
    '// same edge cases as the first example — single/multi-select, allowOther,',
    '// custom nextLabel, skippable:false — so you can see how each behaves',
    '// when titles and descriptions stack vertically.',
  ],
});

export const controlledCode = buildSnippet({
  questions: multipleQuestions,
  bindings: [
    '[questions]="questions"',
    '[(currentIndex)]="index"',
    '[(answers)]="answers"',
    '(complete)="index.set(0)"',
  ],
  core: ['signal'],
  ffTypes: ['AskUserAnswer'],
  members: [
    '  protected readonly index = signal(0);',
    '  protected readonly answers = signal<Record<string, AskUserAnswer>>({});',
  ],
});
