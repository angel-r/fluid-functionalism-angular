// ---------------------------------------------------------------------------
// The changelog's two copy prompts, ported from lib/changelog/migration-
// prompt.ts and lib/changelog/upgrade-prompt.ts and rewritten for the Angular
// package (S8): the update step is npm, the skill is the Angular skill (D9).
//
// Both lead a coding agent through the same job /changelog.md describes: what
// changed, how to get the new code, and how to rewrite the call sites from the
// diff.
// ---------------------------------------------------------------------------

import { PACKAGE, SITE } from '../../site/install-brief';
import { inlineToText, monthLabel, type EntryView } from './changelog-data';

/** The one line that updates the package a project already has. */
const UPDATE_COMMAND = `npm i ${PACKAGE}@latest`;

/** The Angular skill, installed by the `skills` CLI (D9). */
export const SKILL_INSTALL = 'npx skills add angel-r/fluid-functionalism-angular --skill fluid-functionalism-angular';

/** What an entry installs, as the current library spells it: the skill, or the
 *  package every component ships in. */
function reinstallStep(entry: EntryView): string[] {
  const slug = entry.href ? /^\/docs\/([^/#]+)$/.exec(entry.href)?.[1] : undefined;
  if (slug === 'skill') return ['1. Update the agent skill:', SKILL_INSTALL];
  return [
    '1. Update the package (the components come from it, so there is nothing to overwrite in the app):',
    UPDATE_COMMAND,
  ];
}

/** The text behind a Breaking entry's "Copy migration prompt": a brief an AI
 *  coding agent can act on without opening the changelog. It updates the
 *  package, then rewrites call sites from the diff's `-` lines to its `+`
 *  lines. */
export function buildMigrationPrompt({ entry, month }: { entry: EntryView; month: string }): string {
  const lines: string[] = [];
  lines.push(
    `Migrate my Angular app to the ${monthLabel(month)} release of ${entry.name} from Fluid Functionalism. It has a breaking change.`,
  );
  lines.push('');
  lines.push(`What changed: ${inlineToText(entry.text)}`);
  lines.push('');
  lines.push(...reinstallStep(entry));
  lines.push('');
  lines.push(
    '2. Find every call site that matches the - lines below and rewrite it to the + lines. Leave everything else as it is, then run the type checker.',
  );
  lines.push('```diff');
  lines.push(entry.diff?.replace(/\n+$/, '') ?? '');
  lines.push('```');
  lines.push('');
  lines.push(`Changelog: ${SITE}/changelog#${month}`);
  if (entry.href) lines.push(`Docs: ${SITE}${entry.href}`);
  return lines.join('\n');
}

/** The text behind /changelog's "Copy upgrade prompt": a brief any coding agent
 *  can follow to bring a project's components up to the latest release. The
 *  skill does the whole job, so the brief leads with it; the steps after it are
 *  the same job by hand, for an agent without it. */
export function buildUpgradePrompt(): string {
  return [
    'Update the Fluid Functionalism components in my Angular project to the latest release.',
    '',
    "The fast way: add the Fluid Functionalism Angular skill if it isn't installed yet, then ask it to update Fluid Functionalism. It reads the package version the project has, compares every component in use with the release notes, shows what changed before anything is rewritten, and applies the changelog.",
    SKILL_INSTALL,
    '',
    'Without the skill:',
    `1. Read the changelog: ${SITE}/changelog.md. Every entry names the component it changes, and every Breaking entry carries migration steps and a before/after diff.`,
    `2. Find what the project uses: ${PACKAGE} in package.json, the ff- components the app imports, the theme import in its stylesheet and the provideFluid() call in its app config.`,
    `3. Update the package with ${UPDATE_COMMAND}, then compare every ff- component the app imports with the release notes.`,
    "4. Apply every Breaking entry that changes a component the project uses: rewrite each call site from the diff's - lines to its + lines.",
    '5. Run the type checker and the build, then list what changed, component by component.',
  ].join('\n');
}
