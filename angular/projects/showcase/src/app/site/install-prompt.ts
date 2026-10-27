// ---------------------------------------------------------------------------
// The text behind every "Copy prompt" on the site: the home hero, the right
// panel, each doc page's Installation row, and the playground's Share dialog
// (D5). Ported from lib/docs/install-prompt.ts, rewritten for the Angular
// package: npm install plus provideFluid(), never `npx shadcn`.
//
// A brief is self-contained on purpose: install command, setup, a usage
// snippet, the props, the docs URL and where to check for changes, so an agent
// can wire the component without fetching anything.
// ---------------------------------------------------------------------------

import {
  CHANGELOG_LINE,
  INSTALL_COMMAND,
  INSTALLED_FILES,
  PROJECT_NEEDS,
  SITE,
  SKILL_LINE,
  THEME_IMPORT,
  headingFamily,
  iconsImport,
  iconsLabel,
  plainDescription,
  providerCall,
  stripTrailingPeriod,
} from './install-brief';
import type { HeadingFont } from './site-settings';
import type { IconLibrary } from './icon-map';
import { googleFontWeights, nearestGoogleFontWeight, type GoogleFont } from './google-fonts';
import type { ShapeVariant, SizeVariant, Theme } from '@angel-r/fluid-functionalism-angular';

/** The "Make them yours" settings, as the briefs spell them. */
export interface PromptSettings {
  theme: Theme;
  shape: ShapeVariant;
  size: SizeVariant;
  icons: IconLibrary;
}

export interface PromptHeading {
  font: HeadingFont;
  /** The Google Fonts family, when `font` is "custom". */
  custom: GoogleFont | null;
  /** The custom family's one heading weight; `null` keeps the role weights. */
  weight: number | null;
}

const THEME_NAMES: Record<Theme, string> = { system: 'system', light: 'light', dark: 'dark' };
const SHAPE_NAMES: Record<ShapeVariant, string> = { rounded: 'rounded corners', pill: 'pill corners' };
const SIZE_NAMES: Record<SizeVariant, string> = { default: 'the 36px default size', compact: 'the 28px compact size' };

/** One sentence naming the settings, the way the panel shows them. */
export function describeSettings(settings: PromptSettings): string {
  return [
    `${THEME_NAMES[settings.theme]} theme`,
    SHAPE_NAMES[settings.shape],
    SIZE_NAMES[settings.size],
    `${iconsLabel(settings.icons)} icons`,
  ].join(', ');
}

/** The setup steps every brief shares once the package is installed. */
function setupLines(settings: PromptSettings, heading?: PromptHeading): string[] {
  const lines: string[] = [];
  lines.push('Setup, once per app:');
  lines.push(`- styles.css: ${THEME_IMPORT.replace(/\n/g, '\n  ')}`);
  lines.push(
    '- Copy InterVariable.ttf and InterVariable-Italic.ttf into public/fonts/ (the theme declares Inter there; replace the @font-face rules if you serve them from another path).',
  );
  const iconImport = iconsImport(settings.icons);
  if (iconImport) lines.push(`- ${iconImport}`);
  lines.push(
    `- app.config.ts providers: ${providerCall(settings)} and provideFluidTheme({ defaultTheme: '${settings.theme}' }).`,
  );
  lines.push('- Reduced motion follows the OS setting on its own; there is nothing to configure.');
  if (heading) lines.push(...headingLines(heading));
  return lines;
}

/** The step that sets the headings' font, as the site draws it. */
function headingLines(heading: PromptHeading): string[] {
  const family = headingFamily(heading.font, heading.custom);
  if (!family) return [];
  const lines = ['- Headings (site-only styling, copy it if you want the same):'];
  if (heading.font === 'source-serif') {
    lines.push(
      `  Self-host Source Serif 4 as a variable font (weight 200-900, optical size axis) and add: h1, h2, h3 { font-family: "Source Serif 4", Georgia, serif; font-variation-settings: 'wght' 450, 'opsz' 18 !important; } with h1 at 'wght' 450, 'opsz' 25. One weight, 450, for every heading.`,
    );
    lines.push(
      '  Also raise the display role by 4px: :root { --fs-display: 32px; --lh-display: 38px; --fs-display-compact: 28px; --lh-display-compact: 34px; }',
    );
    return lines;
  }

  const font = heading.custom!;
  const available = googleFontWeights(font);
  const title = heading.weight ?? 550;
  const display = heading.weight ?? 700;
  const cuts = [...new Set([title, display].map((weight) => nearestGoogleFontWeight(font, weight)))].sort(
    (a, b) => a - b,
  );
  const face = font.a?.wght
    ? `the variable family (weights ${available[0]}-${available[available.length - 1]})`
    : `weights ${cuts.join(', ')}`;
  lines.push(
    `  Load ${family} from Google Fonts, ${face}, and add: h1, h2, h3 { font-family: "${family}", sans-serif; font-synthesis-weight: none; font-weight: ${title} !important; } with h1 at ${display}.`,
  );
  if (heading.weight === null) {
    lines.push('  Those are Inter\'s role weights; the family rounds a static cut to its nearest.');
  }
  return lines;
}

/** The home hero's and the right panel's "Copy install prompt": start an app
 *  on the library with every "Make them yours" setting already chosen. */
export function buildStarterPrompt(settings: PromptSettings, heading?: PromptHeading): string {
  const family = heading ? headingFamily(heading.font, heading.custom) : null;
  const lines: string[] = [];
  lines.push(
    `Start an Angular app with Fluid Functionalism: the component library installed, set to ${describeSettings(settings)}${family ? `, ${family} headings` : ''}.`,
  );
  lines.push('');
  lines.push('Run:');
  lines.push(INSTALL_COMMAND);
  lines.push('');
  lines.push(...setupLines(settings, heading));
  lines.push('');
  lines.push(PROJECT_NEEDS);
  lines.push(INSTALLED_FILES);
  lines.push('');
  lines.push(SKILL_LINE);
  lines.push(`Docs: ${SITE}/docs`);
  lines.push(CHANGELOG_LINE);
  return lines.join('\n');
}

export interface PagePromptInput {
  name: string;
  slug: string;
  description?: string;
  /** A minimal Angular snippet, exactly as the page's Code tab shows it. */
  usage?: string;
  /** One line per prop, as the page's API reference lists them. */
  props?: readonly string[];
  /** What the install adds, for system pages. */
  installNote?: string;
}

/** A doc page's "Copy prompt": the component, its setup, its snippet. */
export function buildPagePrompt(input: PagePromptInput): string {
  const lines: string[] = [];
  lines.push(`Add the ${input.name} from Fluid Functionalism to my Angular app.`);
  lines.push('');
  lines.push('Install:');
  lines.push(INSTALL_COMMAND);
  lines.push('');
  if (input.installNote) {
    lines.push(input.installNote);
    lines.push('');
  }
  if (input.usage) {
    lines.push('Usage:');
    lines.push(input.usage.trim());
    lines.push('');
  }
  if (input.props?.length) {
    lines.push('Props:');
    for (const prop of input.props) lines.push(`- ${prop}`);
    lines.push('');
  }
  const about: string[] = [];
  if (input.description) about.push(`${stripTrailingPeriod(plainDescription(input.description))}.`);
  about.push(PROJECT_NEEDS);
  about.push(INSTALLED_FILES);
  lines.push(about.join(' '));
  lines.push(SKILL_LINE);
  lines.push(`Docs: ${SITE}/docs/${input.slug}`);
  lines.push(CHANGELOG_LINE);
  return lines.join('\n');
}

export interface PresetPromptInput {
  name: string;
  slug: string;
  /** The encoded playground configuration (lib/preset/codec.ts). */
  code: string;
  /** The Angular snippet generated from the playground state: template plus
   *  the provideFluid() call. */
  snippet: string;
  /** Only for configurations the playground marks installable (D5); others
   *  share instead of prompting. */
  props?: readonly string[];
  description?: string;
}

/** The playground's "Copy prompt" (D5): the configuration the visitor built,
 *  as an Angular snippet to drop into their app. */
export function buildPresetPrompt(input: PresetPromptInput): string {
  const lines: string[] = [];
  lines.push(`Add the ${input.name} I configured on Fluid Functionalism to my Angular app.`);
  lines.push('');
  lines.push('Install:');
  lines.push(INSTALL_COMMAND);
  lines.push('');
  lines.push('Usage (this configuration, ready to paste):');
  lines.push(input.snippet.trim());
  lines.push('');
  lines.push(
    `The snippet already composes the ${input.name} with the options I picked. Change props in that file, not in the package.`,
  );
  if (input.props?.length) {
    lines.push('');
    lines.push(`Props of the underlying ${input.name}:`);
    for (const prop of input.props) lines.push(`- ${prop}`);
  }
  lines.push('');
  const about: string[] = [];
  if (input.description) about.push(`${stripTrailingPeriod(plainDescription(input.description))}.`);
  about.push(PROJECT_NEEDS);
  lines.push(about.join(' '));
  lines.push(`Reopen or tweak this configuration: ${SITE}/docs/${input.slug}?preset=${input.code}`);
  lines.push(SKILL_LINE);
  lines.push(`Docs: ${SITE}/docs/${input.slug}`);
  lines.push(CHANGELOG_LINE);
  return lines.join('\n');
}
