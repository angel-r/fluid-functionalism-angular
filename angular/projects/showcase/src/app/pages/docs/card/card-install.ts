// ---------------------------------------------------------------------------
// Install-grade code generation for card presets, ported from
// lib/preset/card-install.ts. Emits ONE compilable standalone component
// reproducing exactly what the playground preview renders for the encoded
// state — same sizing wrapper, same derived constraints (image forces
// separated tiles, inline forces a single column), same demo content — plus
// the `provideFluid()` call the site's Shape and Size settings pin (D5).
//
// The reference wrapped the file in a `PresetFile` registry item; this port has
// no registry, so the Share dialog copies the snippet itself.
// ---------------------------------------------------------------------------

import { CARD_BANNER, CARD_ITEMS, CARD_THUMB, type CardPreset } from './card-options';

/** The playground's derived layout facts, shared by every emitter below. */
function derive(p: CardPreset) {
  const isInline = p.orientation === 'inline';
  // Inline cards are a full-width list — force a single column (playground
  // rule), and 3 columns fills two even rows (6 items); everything else 4.
  const cols = isInline ? 1 : p.columns;
  const count = cols === 3 ? 6 : 4;
  const isImage = p.media === 'image';
  const isSmall = p.media === 'icon' || p.media === 'logo';
  // The prominent image needs per-card clipping — separated is forced on.
  const separated = isImage || p.separated;
  const anyButton = p.primaryBtn || p.secondaryBtn || p.ghostBtn;
  return { isInline, cols, count, isImage, isSmall, separated, anyButton };
}

export function buildCardInstallSnippet(p: CardPreset): string {
  const d = derive(p);
  const lines: string[] = [];

  lines.push(`import { ${p.selected ? 'Component, signal' : 'Component'} } from '@angular/core';`);
  lines.push(
    `import { CARD_PARTS, provideFluid${p.media === 'icon' ? ', type IconName' : ''} } from '@angel-r/fluid-functionalism-angular';`,
  );
  lines.push('');

  // ── Demo content ──
  lines.push('// Seed content for the generated card group — replace with your own.');
  const itemType = [
    ...(p.media === 'icon' ? ['icon: IconName'] : []),
    'title: string',
    ...(p.description ? ['description: string'] : []),
  ].join('; ');
  lines.push(`const ITEMS: { ${itemType} }[] = [`);
  for (const item of CARD_ITEMS.slice(0, d.count)) {
    const fields = [
      ...(p.media === 'icon' ? [`icon: ${JSON.stringify(item.icon)}`] : []),
      `title: ${JSON.stringify(item.title)}`,
      ...(p.description ? [`description: ${JSON.stringify(item.description)}`] : []),
    ].join(', ');
    lines.push(`  { ${fields} },`);
  }
  lines.push('];');
  lines.push('');
  if (d.isImage) {
    lines.push('// Inline data-URI banner so the demo needs no asset files — swap for your artwork.');
    lines.push('const BANNER =');
    lines.push(`  ${JSON.stringify(CARD_BANNER)};`);
    lines.push('');
  }
  if (p.media === 'logo') {
    lines.push('// Inline data-URI brand tile so the demo needs no asset files — swap for your logo.');
    lines.push('const THUMB =');
    lines.push(`  ${JSON.stringify(CARD_THUMB)};`);
    lines.push('');
  }

  // ── Component ──
  lines.push('@Component({');
  lines.push("  selector: 'app-card-section',");
  lines.push('  imports: [CARD_PARTS],');
  lines.push('  template: `');
  lines.push('    <div class="w-full max-w-[560px]">');

  const groupProps: string[] = [];
  if (p.orientation !== 'card') groupProps.push(`orientation="${p.orientation}"`);
  if (d.cols !== 1) groupProps.push(`[columns]="${d.cols}"`);
  if (p.border !== 'none') groupProps.push(`border="${p.border}"`);
  if (d.separated) groupProps.push('separated');
  if (!p.fluidHover) groupProps.push('[fluidHover]="false"');
  lines.push(`      <ff-card-group${groupProps.length ? ' ' + groupProps.join(' ') : ''}>`);

  lines.push(`        @for (item of items; track item.title; let i = $index) {`);
  if (p.selected) {
    lines.push('          <ff-card');
    lines.push('            [label]="item.title"');
    lines.push('            [selected]="i === selected()"');
    lines.push('            (cardClick)="selected.set(i)"');
    lines.push('          >');
  } else {
    lines.push('          <ff-card>');
  }

  const mediaLine =
    p.media === 'icon'
      ? '<ff-card-media [icon]="item.icon" />'
      : p.media === 'logo'
        ? '<ff-card-media [logo]="thumb" size="32" />'
        : null;
  if (d.isImage) lines.push('            <img ffCardImage [src]="banner" />');
  if (d.isInline && mediaLine) lines.push(`            ${mediaLine}`);
  lines.push('            <div ffCardHeader>');
  if (!d.isInline && mediaLine) lines.push(`              ${mediaLine}`);
  lines.push('              <span ffCardTitle>{{ item.title }}</span>');
  if (p.description) {
    lines.push('              <p ffCardDescription>{{ item.description }}</p>');
  }
  lines.push('            </div>');
  if (d.anyButton) {
    // Stacked order: primary → secondary → ghost. A plain inline row reverses
    // it so the primary sits on the right; an inline image card keeps the
    // natural order (actions drop below the text).
    const buttons: string[] = [];
    if (p.primaryBtn) buttons.push('<button ffCardButton variant="primary">Get started</button>');
    if (p.secondaryBtn) buttons.push('<button ffCardButton variant="secondary">Learn more</button>');
    if (p.ghostBtn) buttons.push('<button ffCardButton>Connect</button>');
    const ordered = d.isInline && !d.isImage ? [...buttons].reverse() : buttons;
    lines.push('            <div ffCardFooter>');
    for (const button of ordered) lines.push(`              ${button}`);
    lines.push('            </div>');
  }
  lines.push('          </ff-card>');
  lines.push('        }');
  lines.push('      </ff-card-group>');
  lines.push('    </div>');
  lines.push('  `,');
  lines.push('})');
  lines.push('export class CardSection {');
  if (p.selected) lines.push('  protected readonly selected = signal(0);');
  lines.push('  protected readonly items = ITEMS;');
  if (d.isImage) lines.push('  protected readonly banner = BANNER;');
  if (p.media === 'logo') lines.push('  protected readonly thumb = THUMB;');
  lines.push('}');
  lines.push('');
  lines.push('// app.config.ts (once per app)');
  lines.push(`provideFluid({ shape: '${p.shape}', size: '${p.size}' })`);
  return lines.join('\n');
}
