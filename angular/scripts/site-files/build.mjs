#!/usr/bin/env node
// Writes the site's static agent and SEO files into the built showcase (D3):
//
//   robots.txt, sitemap.xml, llms.txt, llms-full.txt,
//   md/<slug>.md (one per docs page), changelog.md
//
//   node scripts/site-files/build.mjs
//
// Everything comes from the data the site renders, so the files cannot drift:
//   - site/nav-data.ts: page slugs, names, descriptions, system install notes
//   - docs-kit/api/<slug>.ts: every page's API reference (the PropsTables)
//   - data/changelog.generated.ts: the releases, generated from content/changelog
// Those modules import only types, so Node loads them with type stripping. No
// page component is imported: pages/**, shell/ and docs-kit/doc-page* pull
// Angular runtime code.
//
// Any missing or malformed input throws, so the build that runs this fails
// instead of deploying files with pages quietly missing. `npm run
// build:site-files` (also `postbuild:showcase`, and the Pages workflow) runs it.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  changelogMarkdown,
  docUrl,
  llmsFullTxt,
  llmsTxt,
  pageMarkdown,
  robotsTxt,
  sitemapXml,
  skillMarkdown,
} from './content.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../..');
const APP = join(ROOT, 'projects/showcase/src/app');
const API_DIR = join(APP, 'docs-kit/api');
const OUT = join(ROOT, 'dist/showcase/browser');

/** One failure message shape: what was read, and why it could not be used. */
function fail(message) {
  throw new Error(`site files: ${message}`);
}

/** Imports a TypeScript data module under the app. */
async function load(path) {
  const file = relative(ROOT, path);
  try {
    return await import(pathToFileURL(path).href);
  } catch (error) {
    fail(`cannot load ${file}: ${error.message}`);
  }
}

function expectArray(value, what) {
  if (!Array.isArray(value) || value.length === 0) fail(`${what} is missing or empty`);
  return value;
}

function expectText(value, what) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${what} is missing`);
  return value;
}

/** Writes one file, creating its directory (`md/` does not exist yet). */
function write(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

// ---------------------------------------------------------------------------
// Output directory
// ---------------------------------------------------------------------------

// The files belong to the deployed output: a missing directory means the
// showcase was not built, which is a broken pipeline, not a page list to skip.
if (!existsSync(OUT)) {
  fail(`${relative(ROOT, OUT)} is missing: build the showcase first (npm run build:showcase)`);
}

// ---------------------------------------------------------------------------
// Page data
// ---------------------------------------------------------------------------

const nav = await load(join(APP, 'site/nav-data.ts'));
const systemNavList = expectArray(nav.systemNavList, 'site/nav-data.ts systemNavList');
const componentList = expectArray(nav.componentList, 'site/nav-data.ts componentList');
const docOrder = expectArray(nav.docOrder, 'site/nav-data.ts docOrder');

/** Every docs page in sidebar order, tagged with what kind it is. */
const pages = [
  ...systemNavList.map((entry) => ({ ...entry, kind: entry.slug === 'skill' ? 'skill' : 'system' })),
  ...componentList.map((entry) => ({ ...entry, kind: 'component' })),
];

for (const page of pages) {
  expectText(page.slug, 'a docs page slug in site/nav-data.ts');
  expectText(page.name, `the name of /docs/${page.slug}`);
  expectText(page.description, `the description of /docs/${page.slug}`);
  if (page.installNote !== undefined) expectText(page.installNote, `the install note of /docs/${page.slug}`);
}

const slugs = pages.map((page) => page.slug);
const duplicates = slugs.filter((slug, i) => slugs.indexOf(slug) !== i);
if (duplicates.length) fail(`duplicate docs slugs in site/nav-data.ts: ${duplicates.join(', ')}`);

// docOrder feeds the site's prev/next walk and the sitemap; a page missing
// from it would be invisible to both.
const ordered = docOrder.map((step) => step.slug);
const unordered = slugs.filter((slug) => !ordered.includes(slug));
if (unordered.length) fail(`docs pages missing from docOrder in site/nav-data.ts: ${unordered.join(', ')}`);

// ---------------------------------------------------------------------------
// API reference
// ---------------------------------------------------------------------------

// One module per page, named after the page (docs-kit/api/index.ts is the
// app's barrel; it cannot be imported here because its relative imports are
// extensionless, which Node's ESM resolver rejects).
if (!existsSync(API_DIR)) fail(`${relative(ROOT, API_DIR)} is missing`);
const apiFiles = readdirSync(API_DIR)
  .filter((name) => name.endsWith('.ts') && name !== 'index.ts' && name !== 'types.ts')
  .sort();
if (apiFiles.length === 0) fail(`no API modules in ${relative(ROOT, API_DIR)}`);

const apiBySlug = new Map();
for (const file of apiFiles) {
  const slug = file.slice(0, -'.ts'.length);
  const tables = (await load(join(API_DIR, file))).apiReference;
  expectArray(tables, `docs-kit/api/${file} apiReference`);
  for (const table of tables) {
    expectText(table.title, `a table title in docs-kit/api/${file}`);
    expectArray(table.props, `docs-kit/api/${file} "${table.title}"`);
    for (const prop of table.props) {
      expectText(prop.name, `a prop name in docs-kit/api/${file}`);
      expectText(prop.type, `docs-kit/api/${file} "${prop.name}" type`);
      expectText(prop.description, `docs-kit/api/${file} "${prop.name}" description`);
    }
  }
  apiBySlug.set(slug, tables);
}

// A table module without a page would never reach the site files; that is a
// rename that half landed.
const orphans = [...apiBySlug.keys()].filter((slug) => !slugs.includes(slug));
if (orphans.length) fail(`docs-kit/api has modules for no docs page: ${orphans.join(', ')}`);

for (const page of pages) page.api = apiBySlug.get(page.slug) ?? [];

// ---------------------------------------------------------------------------
// Changelog
// ---------------------------------------------------------------------------

const changelog = await load(join(APP, 'data/changelog.generated.ts'));
const releases = expectArray(changelog.RELEASES, 'data/changelog.generated.ts RELEASES');
for (const release of releases) {
  expectText(release.month, 'a release month in data/changelog.generated.ts');
  expectText(release.title, `the title of the ${release.month} release`);
  expectArray(release.groups, `the groups of the ${release.month} release`);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

const written = [];

function emit(path, text) {
  write(join(OUT, path), text);
  written.push(path);
}

const paths = ['/', '/docs', '/changelog', '/demo', ...docOrder.map((step) => `/docs/${step.slug}`)];

emit('robots.txt', robotsTxt());
emit('sitemap.xml', sitemapXml(paths));
emit('llms.txt', llmsTxt(pages));
emit('llms-full.txt', llmsFullTxt(pages));
emit('changelog.md', changelogMarkdown(releases));
for (const page of pages) {
  const text = page.kind === 'skill' ? skillMarkdown(page) : pageMarkdown(page);
  emit(`md/${page.slug}.md`, text);
  // The page's Markdown must say where the page is; a base URL change that
  // missed one of these is silent otherwise.
  if (!text.includes(`${docUrl(page.slug)}`)) fail(`md/${page.slug}.md does not link ${docUrl(page.slug)}`);
}

console.log(
  `site files: ${written.length} written (${pages.length} pages in md/), ${paths.length} urls in sitemap.xml -> ${relative(ROOT, OUT)}`,
);
