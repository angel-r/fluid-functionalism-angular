#!/usr/bin/env node
// Browser checks for the layout and motion behaviour jsdom cannot test
// (FLIP moves, springs, measured centring, popup orientation, drag).
//
//   node scripts/browser-checks/run.mjs [--url http://localhost:4300]
//        [--only <check name substring>] [--headed]
//
// Runs every check exported by `checks/*.mjs` against a running showcase
// (`ng serve showcase` or a served production build), each in a fresh page,
// and exits 1 when any check fails. A check module exports `checks`, an
// array of `{ name, path, viewport?, run(page, h) }`; `h` is `helpers.mjs`.
// Needs `playwright-core` (root devDependency) and a local Chrome.
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as helpers from './helpers.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, '../../../package.json'));
const { chromium } = require('playwright-core');

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 ? args[i + 1] : fallback;
};
const BASE = arg('url', 'http://localhost:4300').replace(/\/$/, '');
const ONLY = arg('only', '');
const HEADED = args.includes('--headed');

const modules = readdirSync(join(here, 'checks')).filter((f) => f.endsWith('.mjs')).sort();
const all = [];
for (const file of modules) {
  const { checks } = await import(pathToFileURL(join(here, 'checks', file)).href);
  for (const check of checks) all.push({ ...check, file });
}
const selected = all.filter((c) => c.name.includes(ONLY));
if (!selected.length) {
  console.error(`no check matches "${ONLY}"`);
  process.exit(1);
}

const browser = await chromium.launch({ channel: 'chrome', headless: !HEADED });
let failed = 0;
for (const check of selected) {
  const page = await browser.newPage({ viewport: check.viewport ?? { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const started = Date.now();
  try {
    await page.goto(`${BASE}/${check.path.replace(/^\//, '')}`, { waitUntil: 'networkidle' });
    await check.run(page, helpers);
    if (errors.length) throw new Error(`page error: ${errors[0]}`);
    console.log(`PASS  ${check.name} (${Date.now() - started} ms)`);
  } catch (error) {
    failed++;
    console.log(`FAIL  ${check.name} [${check.file}]\n      ${String(error.message ?? error).split('\n').join('\n      ')}`);
  } finally {
    await page.close();
  }
}
await browser.close();
console.log(`\n${selected.length - failed}/${selected.length} passed`);
process.exit(failed ? 1 : 0);
