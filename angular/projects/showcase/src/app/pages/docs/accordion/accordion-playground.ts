// ---------------------------------------------------------------------------
// The Accordion playground's state and its generated Angular snippet, ported
// from lib/docs/playgrounds/accordion.tsx.
//
// Two questions: how many items open at once, and what an open one tints.
// `type` and `collapsible` are one decision in practice, so they read as one
// control: "one or none" is the pair, not a flag on top of a mode.
//
// The snippet is what the preview's Code tab shows and what "Copy prompt"
// pins: a compilable standalone component plus the `provideFluid()` call the
// visitor's Shape and Size settings imply (S8, D5). The provider line comes
// from `injectPresetGlobals()`, so it regenerates with the settings.
// ---------------------------------------------------------------------------

import type { PresetGlobals } from '../../../docs-kit/preset/preset-globals';

/** one: always exactly one open · oneOrNone: single + collapsible · any:
 *  multiple. */
export type AccordionExpand = 'one' | 'oneOrNone' | 'any';

export interface AccordionPlayState {
  expand: AccordionExpand;
  /** On, an expanded item holds its tint (highlight="item"). Off, the fill
   *  scopes to the row and waits for hover (highlight="trigger"). */
  highlightExpanded: boolean;
}

export const DEFAULT_ACCORDION_STATE: AccordionPlayState = {
  expand: 'oneOrNone',
  highlightExpanded: true,
};

/** Rolls the panel: "one or none" is twice as likely, as in the reference. */
export function randomAccordionState(): AccordionPlayState {
  const expands: readonly AccordionExpand[] = ['one', 'oneOrNone', 'oneOrNone', 'any'];
  return {
    expand: expands[Math.floor(Math.random() * expands.length)],
    highlightExpanded: Math.random() > 0.4,
  };
}

export function buildAccordionPlaygroundCode(state: AccordionPlayState, globals: PresetGlobals): string {
  const single = state.expand !== 'any';
  const attrs: string[] = [`type="${single ? 'single' : 'multiple'}"`];
  if (state.expand === 'oneOrNone') attrs.push('collapsible');
  if (!state.highlightExpanded) attrs.push('highlight="trigger"');
  attrs.push(single ? 'defaultValue="item-1"' : `[defaultValue]="['item-1']"`);

  const lines: string[] = [];
  lines.push("import { Component, input } from '@angular/core';");
  lines.push('import {');
  lines.push('  AccordionContent,');
  lines.push('  AccordionGroup,');
  lines.push('  AccordionItem,');
  lines.push('  AccordionTrigger,');
  lines.push('  provideFluid,');
  lines.push("} from '@angel-r/fluid-functionalism-angular';");
  lines.push('');
  lines.push('interface FaqItem {');
  lines.push('  value: string;');
  lines.push('  title: string;');
  lines.push('  content: string;');
  lines.push('}');
  lines.push('');
  lines.push('@Component({');
  lines.push("  selector: 'app-faq',");
  lines.push('  imports: [AccordionGroup, AccordionItem, AccordionTrigger, AccordionContent],');
  lines.push('  template: `');

  if (!state.highlightExpanded) {
    lines.push('    <!-- highlight="trigger" keeps an open item\'s tint on the row and');
    lines.push("         leaves its panel on the page's own surface -->");
  }
  lines.push(`    <ff-accordion-group ${attrs.join(' ')}>`);
  lines.push('      @for (item of items(); track item.value; let i = $index) {');
  lines.push('        <ff-accordion-item [value]="item.value" [index]="i">');
  lines.push('          <ff-accordion-trigger>{{ item.title }}</ff-accordion-trigger>');
  lines.push('          <ff-accordion-content>{{ item.content }}</ff-accordion-content>');
  lines.push('        </ff-accordion-item>');
  lines.push('      }');
  lines.push('    </ff-accordion-group>');

  lines.push('  `,');
  lines.push('})');
  lines.push('export class Faq {');
  lines.push('  readonly items = input.required<FaqItem[]>();');
  lines.push('}');
  lines.push('');
  lines.push('// app.config.ts (once per app)');
  lines.push(`provideFluid({ shape: '${globals.shape}', size: '${globals.size}' })`);
  return lines.join('\n');
}
