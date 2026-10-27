// ---------------------------------------------------------------------------
// The thin snippet the Card playground's Code tab shows, ported from
// `buildPlaygroundCode` in lib/docs/playgrounds/card.tsx.
//
// It is schematic on purpose: one composed card plus "…three more", with the
// media still to be filled in, so the shape of the group reads at a glance.
// The install-grade component the Share dialog copies lives in card-install.ts.
// Both end with the `provideFluid()` call the visitor's Shape and Size settings
// imply (`injectPresetGlobals()`), so they regenerate with the settings (S8, D5).
// ---------------------------------------------------------------------------

import type { PresetGlobals } from '../../../docs-kit/preset/preset-globals';
import type { CardBorder, CardMediaKind, CardOrientation } from './card-options';

export interface CardPlaygroundView {
  orientation: CardOrientation;
  /** The derived column count: inline is always 1. */
  cols: number;
  border: CardBorder;
  /** The derived fact: an image forces separated tiles. */
  separated: boolean;
  fluidHover: boolean;
  media: CardMediaKind;
  description: boolean;
  primaryBtn: boolean;
  secondaryBtn: boolean;
  ghostBtn: boolean;
  selected: boolean;
}

export function buildCardPlaygroundCode(view: CardPlaygroundView, globals: PresetGlobals): string {
  const groupProps: string[] = [];
  if (view.orientation !== 'card') groupProps.push(`orientation="${view.orientation}"`);
  if (view.cols !== 1) groupProps.push(`[columns]="${view.cols}"`);
  if (view.border !== 'none') groupProps.push(`border="${view.border}"`);
  if (view.separated) groupProps.push('separated');
  if (!view.fluidHover) groupProps.push('[fluidHover]="false"');
  const attr = groupProps.length ? ' ' + groupProps.join(' ') : '';
  const isInline = view.orientation === 'inline';

  const smallMedia =
    view.media === 'icon'
      ? '<ff-card-media icon="search" />'
      : view.media === 'logo'
        ? '<ff-card-media [logo]="logo" size="32" />'
        : null;
  const imageLine = view.media === 'image' ? '<img ffCardImage [src]="image" />' : null;
  const buttons: string[] = [];
  if (view.primaryBtn) buttons.push('<button ffCardButton variant="primary">Get started</button>');
  if (view.secondaryBtn) buttons.push('<button ffCardButton variant="secondary">Learn more</button>');
  if (view.ghostBtn) buttons.push('<button ffCardButton>Connect</button>');
  const ordered = isInline && view.media !== 'image' ? [...buttons].reverse() : buttons;
  const footer = ordered.length ? ['<div ffCardFooter>', ...ordered.map((button) => '  ' + button), '</div>'] : null;
  const descriptionLine = view.description ? '<p ffCardDescription>Analyze recent commits…</p>' : null;

  const lead = (line: string) => `        ${line}`;
  const inner = isInline
    ? [
        imageLine && lead(imageLine),
        smallMedia && lead(smallMedia),
        lead('<div ffCardHeader>'),
        lead('  <span ffCardTitle>Find critical bugs</span>'),
        descriptionLine && lead(`  ${descriptionLine}`),
        lead('</div>'),
        ...(footer ? footer.map(lead) : []),
      ]
    : [
        imageLine && lead(imageLine),
        lead('<div ffCardHeader>'),
        smallMedia && lead(`  ${smallMedia}`),
        lead('  <span ffCardTitle>Find critical bugs</span>'),
        descriptionLine && lead(`  ${descriptionLine}`),
        lead('</div>'),
        ...(footer ? footer.map(lead) : []),
      ];

  const lines: string[] = [];
  lines.push(`import { ${view.selected ? 'Component, signal' : 'Component'} } from '@angular/core';`);
  lines.push("import { CARD_PARTS, provideFluid } from '@angel-r/fluid-functionalism-angular';");
  lines.push('');
  lines.push('@Component({');
  lines.push("  selector: 'app-card-section',");
  lines.push('  imports: [CARD_PARTS],');
  lines.push('  template: `');
  lines.push(`    <ff-card-group${attr}>`);
  lines.push(
    view.selected
      ? '      <ff-card label="Find critical bugs" selected (cardClick)="selected.set(0)">'
      : '      <ff-card>',
  );
  lines.push(...inner.filter((line): line is string => !!line));
  lines.push('      </ff-card>');
  lines.push('      <!-- …three more -->');
  lines.push('    </ff-card-group>');
  lines.push('  `,');
  lines.push('})');
  lines.push('export class CardSection {');
  if (view.selected) lines.push('  protected readonly selected = signal(0);');
  lines.push('}');
  lines.push('');
  lines.push('// app.config.ts (once per app)');
  lines.push(`provideFluid({ shape: '${globals.shape}', size: '${globals.size}' })`);
  return lines.join('\n');
}
