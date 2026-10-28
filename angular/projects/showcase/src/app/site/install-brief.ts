// The pieces every install brief on the site shares: what to install, where
// the docs live, and the one line that points a coding agent at the skill.
// Ported from lib/docs/install-brief.ts, rewritten for the Angular package
// (S8): npm install, provideFluid(), relative-free absolute site URLs for D3.

import type { HeadingFont } from './site-settings';
import { ICON_LIBRARY_LABELS, type IconLibrary } from './icon-map';

/** The deployed site, without a trailing slash (D3). */
export const SITE = 'https://angel-r.github.io/fluid-functionalism-angular';

/** The package, and the peers a standalone Angular app needs anyway. */
export const PACKAGE = '@angel-r/fluid-functionalism-angular';
export const INSTALL_COMMAND = `npm i ${PACKAGE} @angular/cdk @angular/aria`;

/** The theme import every app adds once. */
export const THEME_IMPORT = `@import "tailwindcss";
@import "${PACKAGE}/styles/theme.css";`;

/** The craft (exact behaviors and values) ships in the skill, not in the
 *  brief: one pointer instead of a page of bullets (D9). */
export const SKILL_LINE =
  'For the design details behind it (exact behaviors and values), add the Fluid Functionalism Angular skill: npx skills add angel-r/fluid-functionalism-angular';

/** Where an agent checks for changes later: every month's release, with
 *  migration steps for anything breaking. */
export const CHANGELOG_LINE = `Changelog (what changed each month, how to update): ${SITE}/changelog.md`;

/** What the project has to have before an install works. */
export const PROJECT_NEEDS =
  'Needs an Angular app on Tailwind v4 with zoneless change detection, plus the Inter variable font (public/fonts/InterVariable.ttf and InterVariable-Italic.ttf) for the weight animations.';

/** Where installed code lands, and how to change it. */
export const INSTALLED_FILES =
  'The components come from the package; compose with inputs and the class input rather than editing the library.';

/** The provider call the briefs quote, with the visitor's settings filled in. */
export function providerCall(settings: { shape: string; size: string; icons: IconLibrary }): string {
  const icons = settings.icons === 'lucide' ? '' : `\n  icons: ${settings.icons}Icons,`;
  return `provideFluid({ shape: '${settings.shape}', size: '${settings.size}',${icons}\n})`;
}

/** The icons import line, when the visitor picked a pack other than Lucide. */
export function iconsImport(icons: IconLibrary): string | null {
  if (icons === 'lucide') return null;
  return `import { ${icons}Icons } from '${PACKAGE}';`;
}

export function iconsLabel(icons: IconLibrary): string {
  return ICON_LIBRARY_LABELS[icons];
}

/** Site copy allows a spaced em dash in descriptions; briefs do not. A pair
 *  around an aside becomes parentheses ("a ladder (36px and 28px) shared
 *  by"), a single one a colon. */
export function plainDescription(description: string): string {
  return description
    .replace(/\s+\u2014\s+([^\u2014]+?)\s+\u2014\s+/g, ' ($1) ')
    .replace(/\s+\u2014\s+/g, ': ');
}

/** A description ready to follow "Docs:" in a brief: no trailing period. */
export function stripTrailingPeriod(value: string): string {
  return value.replace(/[.\s]+$/, '');
}

/** The heading font a visitor picked, as the brief spells it. `null` when
 *  Inter (nothing to do). */
export function headingFamily(font: HeadingFont, custom: { n: string } | null): string | null {
  if (font === 'inter') return null;
  return font === 'source-serif' ? 'Source Serif 4' : (custom?.n ?? null);
}
