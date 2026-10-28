// The text of the site's agent and SEO files (D3), adapted from the React
// site's generators: lib/docs/markdown.ts (the per-page Markdown and both
// llms.txt files), app/robots.ts, app/sitemap.ts and lib/changelog/markdown.ts.
// Rewritten for the Angular package: `npm i @angel-r/fluid-functionalism-angular`,
// `provideFluid()` and `ff-` components instead of `npx shadcn` and React
// imports, and every URL under the deployed base.
//
// Data in, text out: the builders take the page list and the releases, so the
// script stays the only place that reads the site's modules (build.mjs).
// The install wording mirrors site/install-brief.ts and site/install-prompt.ts;
// this module cannot import them (they pull the icon packs, which need the
// library's build), so the strings are repeated here and must follow them.

/** The deployed site, without a trailing slash: `${SITE}/docs` is a page url,
 *  `${SITE}/` is the home page. */
export const SITE = 'https://angel-r.github.io/fluid-functionalism-angular';

/** The port's repository (D2). */
export const REPO = 'https://github.com/angel-r/fluid-functionalism-angular';

/** The Angular skill (D9), and the files it ships. */
export const SKILL_DIR = `${REPO}/blob/main/skills/fluid-functionalism-angular`;
const CRAFT = `${SKILL_DIR}/references/craft.md`;
const SKILL_COMMAND = 'npx skills add angel-r/fluid-functionalism-angular --skill fluid-functionalism-angular';

/** Where the changelog's refs link: the upstream repository whose commits and
 *  pull requests those refs name (the same target as the changelog page). */
const UPSTREAM_REPO = 'https://github.com/mickadesign/fluid-functionalism';

export const PACKAGE = '@angel-r/fluid-functionalism-angular';
export const INSTALL_COMMAND = `npm i ${PACKAGE} @angular/cdk @angular/aria`;
export const UPDATE_COMMAND = `npm i ${PACKAGE}@latest`;

/** What the project has to have before an install works. */
export const PROJECT_NEEDS =
  'Needs an Angular app on Tailwind v4 with zoneless change detection, plus the Inter variable font (public/fonts/InterVariable.ttf and InterVariable-Italic.ttf) for the weight animations.';

/** Where the code lands, and how to change it. */
export const INSTALLED_FILES =
  'The components come from the package; compose with inputs and the class input rather than editing the library.';

const SUMMARY =
  'Animated Angular components sharing one motion system: three spring speeds, a hover highlight that glides to the item nearest the cursor, and labels that change weight without layout shift.';

/** The note under a component's Installation row when it has no system note:
 *  one package, not a registry item (site/docs-kit/doc-page.ts). */
const GENERIC_NOTE = 'One package: the install command adds every component, not just this one.';

/** A docs page url. */
export function docUrl(slug) {
  return `${SITE}/docs/${slug}`;
}

/** The Markdown twin of a docs page, written to `md/<slug>.md`. */
export function markdownUrl(slug) {
  return `${SITE}/md/${slug}.md`;
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

/** The Markdown of one docs page: title, description, install brief, API
 *  tables and the docs url. `entry.kind` is "system", "component" or "skill";
 *  `entry.api` is the page's ApiTable[] (empty when it has no reference). */
export function pageMarkdown(entry) {
  const { slug, name, kind } = entry;
  const api = entry.api ?? [];

  const lines = [];
  lines.push(`# ${name}`, '', `> ${plainDescription(entry.description)}`, '');
  lines.push(
    `${kind === 'system' ? 'A system' : 'A component'} of Fluid Functionalism for Angular (\`${PACKAGE}\`), an animated component library with one motion system. Live demos and playground: ${docUrl(slug)}. Every page: ${SITE}/llms.txt`,
    '',
  );

  lines.push(...installSection(entry));

  if (api.length) {
    lines.push('## API reference', '');
    for (const table of api) lines.push(...apiTable(table, api.length > 1));
  }

  lines.push('## Design details', '');
  lines.push(
    `The exact behaviors and values behind ${name} ship in the Fluid Functionalism Angular skill: \`${SKILL_COMMAND}\`. Read them without installing: ${CRAFT}`,
  );
  return lines.join('\n') + '\n';
}

/** The Skill page: it installs an agent skill, not a component. */
export function skillMarkdown(entry) {
  return [
    '# Fluid Functionalism Angular skill',
    '',
    `> ${plainDescription(entry.description)}`,
    '',
    `An agent skill (SKILL.md) for coding agents, shipped with the Angular port. It reads the project's Angular and Tailwind stack, suggests 2 to 5 upgrades ranked by what users will notice, then installs the package and matches the rest to the same system. It writes no files of its own into the project. Live page: ${docUrl(entry.slug)}`,
    '',
    '## Install',
    '',
    '```bash',
    `${SKILL_COMMAND} -g -y`,
    '```',
    '',
    "`-g` installs it for the user rather than into the repo; `-y` skips the CLI's questions. Then read its SKILL.md and use it to audit the project.",
    '',
    '## What it ships',
    '',
    `- SKILL.md: when to use it and the workflow. ${SKILL_DIR}/SKILL.md`,
    `- references/components.md: the component catalog, by package export and selector. ${SKILL_DIR}/references/components.md`,
    `- references/craft.md: the interaction-design decisions built into each component and system. ${CRAFT}`,
    `- references/custom-motion.md: writing custom UI that fits the system. ${SKILL_DIR}/references/custom-motion.md`,
    `- references/stack-audit.md: the project stack read and audit. ${SKILL_DIR}/references/stack-audit.md`,
    `- scripts/stack.mjs and scripts/audit.mjs: the stack read and the route audit the skill runs. ${SKILL_DIR}/scripts`,
    '',
  ].join('\n');
}

/** The install section every page shares: one npm command, the once-per-app
 *  wiring, then what the project needs and what the install adds. */
function installSection(entry) {
  const note = entry.installNote ?? (entry.kind === 'component' ? GENERIC_NOTE : undefined);
  const lines = ['## Install', ''];
  if (note) lines.push(plainDescription(note), '');

  lines.push('```bash', INSTALL_COMMAND, '```', '');
  lines.push('Then, once per app:', '');
  lines.push(
    `- \`styles.css\`: import the theme after Tailwind: \`@import "tailwindcss";\` then \`@import "${PACKAGE}/styles/theme.css";\`.`,
  );
  lines.push(
    "- `app.config.ts` providers: `provideFluid({ shape: 'rounded', size: 'default' })`, plus `provideFluidTheme({ defaultTheme: 'system' })` to follow the OS theme.",
  );
  lines.push('- Reduced motion follows the OS setting on its own; there is nothing to configure.');
  lines.push(`- ${PROJECT_NEEDS}`, `- ${INSTALLED_FILES}`, '');
  return lines;
}

// ---------------------------------------------------------------------------
// llms.txt
// ---------------------------------------------------------------------------

/** `llms.txt` (https://llmstxt.org): what the library is, how to install it,
 *  and every page with a one-line description. `pages` is in sidebar order. */
export function llmsTxt(pages) {
  const lines = [];
  lines.push('# Fluid Functionalism for Angular', '', `> ${SUMMARY}`, '');
  lines.push(
    'Every page below is Markdown: the install steps, the API reference and the docs URL. Its twin on the site is `/docs/<slug>`; the Markdown lives at `/md/<slug>.md`.',
    '',
  );

  lines.push('## Install', '');
  lines.push('```bash', INSTALL_COMMAND, '```', '');
  lines.push(
    `Then import \`${PACKAGE}/styles/theme.css\` in \`styles.css\`, and call \`provideFluid()\` (plus \`provideFluidTheme()\` for the theme) in \`app.config.ts\`. Components are standalone: import the ones a page uses and put them in the component's \`imports\`.`,
    '',
  );
  lines.push(`- ${PROJECT_NEEDS}`);
  lines.push(`- ${INSTALLED_FILES}`);
  lines.push('- Every component is a standalone Angular component with `ff-` element selectors or attribute directives (`button[ffButton]`), and inputs/outputs instead of React props.');
  lines.push(`- Changelog: every change, month by month, with migration steps for breaking changes: ${SITE}/changelog.md`);
  lines.push(`- For a whole project, the agent skill carries the craft behind every component: \`${SKILL_COMMAND}\` (${markdownUrl('skill')})`);
  lines.push('');

  lines.push('## System', '');
  for (const page of pages.filter((p) => p.kind !== 'component')) {
    lines.push(`- [${page.name}](${markdownUrl(page.slug)}): ${plainDescription(page.description)}`);
  }
  lines.push('', '## Components', '');
  for (const page of pages.filter((p) => p.kind === 'component')) {
    lines.push(`- [${page.name}](${markdownUrl(page.slug)}): ${plainDescription(page.description)}`);
  }
  lines.push('', '## Optional', '');
  lines.push(`- [Every page in one file](${SITE}/llms-full.txt): this index followed by every page above`);
  lines.push(`- [Changelog in one file](${SITE}/changelog.md): every release with its entries`);
  lines.push(`- [Sitemap](${SITE}/sitemap.xml): every public page on the site`);
  lines.push(`- [Source on GitHub](${REPO})`);
  return lines.join('\n') + '\n';
}

/** `llms-full.txt`: the index, then every page, for agents that want the
 *  whole library in one request. */
export function llmsFullTxt(pages) {
  const bodies = pages.map((page) => (page.kind === 'skill' ? skillMarkdown(page) : pageMarkdown(page)).trimEnd());
  return [llmsTxt(pages).trimEnd(), ...bodies].join('\n\n---\n\n') + '\n';
}

// ---------------------------------------------------------------------------
// robots.txt and sitemap.xml
// ---------------------------------------------------------------------------

/** Every path is public, so the file only points crawlers at the sitemap. */
export function robotsTxt() {
  return [
    '# Every page on this site is public; the sitemap lists them.',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE}/sitemap.xml`,
    '',
  ].join('\n');
}

/** `paths` are site paths: "/", "/docs", "/docs/button". No `lastmod`: the
 *  date would be the build's, which marks every page modified on every deploy
 *  and is optional in the protocol anyway. */
export function sitemapXml(paths) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const path of paths) {
    const docs = path.startsWith('/docs');
    lines.push(
      '  <url>',
      `    <loc>${escapeXml(`${SITE}${path}`)}</loc>`,
      `    <changefreq>${docs ? 'weekly' : 'monthly'}</changefreq>`,
      `    <priority>${path === '/' ? '1.0' : docs ? '0.8' : '0.5'}</priority>`,
      '  </url>',
    );
  }
  lines.push('</urlset>', '');
  return lines.join('\n');
}

/** `&` first, so the entities the other replacements write stay intact. */
function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// changelog.md
// ---------------------------------------------------------------------------

/** The whole changelog as one Markdown document, from the generated releases
 *  (data/changelog.generated.ts). `releases` is newest month first. */
export function changelogMarkdown(releases) {
  const out = [
    '# Fluid Functionalism for Angular changelog',
    '',
    'Every change to Fluid Functionalism for Angular, an animated Angular component library, month by month. A release lands on the first Friday of the next month.',
    '',
    `- Page: ${SITE}/changelog`,
    '- New: a component or system that just landed.',
    '- Breaking: an API change that needs a migration. Each one carries a diff of the call site, before and after.',
    '- Updated: a change to something already here.',
    `- Install or update the package: \`${UPDATE_COMMAND}\`. Every component ships in the package, so an update replaces the library; local changes belong in the app, not in the package.`,
    `- Upgrade a whole project: the Angular agent skill (\`${SKILL_COMMAND}\`) reads the package version the project has, compares the components in use with this changelog, and applies it. Ask it to update Fluid Functionalism.`,
  ];

  for (const release of releases) {
    out.push('', `## ${monthLabel(release.month)}`, '');
    if (release.released) out.push(`Released ${day(release.released)}.`, '');
    out.push(`Highlights: ${release.title}`);
    if (release.intro) out.push('', inline(release.intro));
    for (const group of release.groups) {
      out.push('', `### ${KIND_LABEL[group.kind]}`, '', ...group.entries.map(entry));
    }
  }

  // Entries end on their own blank line; collapse the doubles that leaves
  // before each group heading.
  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

const KIND_LABEL = { breaking: 'Breaking', new: 'New', updated: 'Updated' };

function inline(parts) {
  return parts.map((part) => (part.type === 'code' ? '`' + part.value + '`' : part.value)).join('');
}

function ref(reference) {
  return reference.type === 'pr'
    ? `[#${reference.number}](${UPSTREAM_REPO}/pull/${reference.number})`
    : `[${reference.sha}](${UPSTREAM_REPO}/commit/${reference.sha})`;
}

/** The docs slug an entry points at, when it has one. */
function slugOf(e) {
  return e.href ? /^\/docs\/([^/#?]+)/.exec(e.href)?.[1] : undefined;
}

/** What to run to get the change: the skill for a skill entry, the package for
 *  a component or system, and for an entry with no page either (a change
 *  across every component, or a docs-site feature the sentence names). */
function updateLine(e) {
  const slug = slugOf(e);
  if (slug === 'skill') return `Update: \`${SKILL_COMMAND}\`.`;
  if (slug) return `Update: \`${UPDATE_COMMAND}\`.`;
  return `Update: the package (\`${UPDATE_COMMAND}\`) when the sentence names a component; a docs-site change needs nothing in your app.`;
}

/** Step 1 of a Breaking entry's migration, by what the entry updates. */
function migrateStep(e) {
  const slug = slugOf(e);
  if (slug === 'skill') return `  1. Update the skill: \`${SKILL_COMMAND}\`.`;
  if (slug) return `  1. Update the package: \`${UPDATE_COMMAND}\`.`;
  return `  1. Update the package if the sentence names a component: \`${UPDATE_COMMAND}\`.`;
}

function entry(e) {
  const label = e.href ? `[${e.name}](${SITE}${e.href})` : `**${e.name}**`;
  const lines = [`- ${label}: ${inline(e.text)} (${e.refs.map(ref).join(', ')})`, '', `  ${updateLine(e)}`];
  if (e.diff) {
    lines.push(
      '',
      '  Migrate:',
      '',
      migrateStep(e),
      '  2. Find each call site matching the `-` lines below and rewrite it to the `+` lines.',
      '  3. Run the type checker.',
      '',
      '  ```diff',
      ...e.diff.replace(/\n+$/, '').split('\n').map((line) => `  ${line}`),
      '  ```',
    );
  }
  return lines.join('\n') + '\n';
}

/** `2026-09` → "September 2026", in UTC so the build's zone never shifts it. */
function monthLabel(month) {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** `2026-09-05` → "September 5, 2026". */
function day(iso) {
  const [year, month, date] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// ---------------------------------------------------------------------------
// Table helpers (lib/docs/markdown.ts)
// ---------------------------------------------------------------------------

function apiTable(table, withHeading) {
  const lines = [];
  if (withHeading) lines.push(`### ${table.title}`, '');
  const withDefault = table.props.some((prop) => prop.default !== undefined);
  lines.push(withDefault ? '| Prop | Type | Default | Description |' : '| Prop | Type | Description |');
  lines.push(withDefault ? '| --- | --- | --- | --- |' : '| --- | --- | --- |');
  for (const prop of table.props) {
    const cells = [code(prop.name), code(prop.type)];
    if (withDefault) cells.push(prop.default === undefined ? '' : formatDefault(prop.default));
    cells.push(cell(prop.description));
    lines.push(`| ${cells.join(' | ')} |`);
  }
  lines.push('');
  return lines;
}

/** Table-safe text: pipes escaped, newlines flattened. */
function escapeCell(value) {
  return value.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();
}

/** A prose cell. Tags the descriptions mention ("a <button>") go in code
 *  spans, so a Markdown viewer shows them instead of rendering them. */
function cell(value) {
  return escapeCell(value).replace(/<\/?[A-Za-z][^<>]*>/g, (tag) => `\`${tag}\``);
}

/** Inline code that survives a table cell (GFM wants pipes escaped even
 *  inside code spans) and values that contain a backtick. */
function code(value) {
  const body = escapeCell(value);
  return body.includes('`') ? `\`\` ${body} \`\`` : `\`${body}\``;
}

/** Literal defaults read as code; prose defaults ("from SizeProvider") as text. */
function formatDefault(value) {
  return /^(["'`[{(\-\d]|true$|false$|null$|undefined$)/.test(value) ? code(value) : cell(value);
}

/** Site copy allows a spaced em dash in descriptions; briefs do not. A pair
 *  around an aside becomes parentheses, a single one a colon. */
export function plainDescription(description) {
  return description
    .replace(/\s+\u2014\s+([^\u2014]+?)\s+\u2014\s+/g, ' ($1) ')
    .replace(/\s+\u2014\s+/g, ': ');
}
