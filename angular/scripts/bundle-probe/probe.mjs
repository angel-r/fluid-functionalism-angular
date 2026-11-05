#!/usr/bin/env node
/**
 * Bundle probe for @angel-r/fluid-functionalism-angular.
 *
 * Proves the three claims behind the secondary entry point split:
 *   (a) tree shaking: importing one symbol keeps only that symbol's code;
 *   (b) splitting: a component imported only by a lazily loaded module is not
 *       in the static closure of the app's main chunk, and that closure stays
 *       within a byte budget;
 *   (c) shared pieces: an eager component that shares a primitive with a
 *       sibling entry does not pull that sibling's components into the main
 *       chunk when only a lazy module uses them.
 *
 * It uses the real Angular pipeline. Plain esbuild without the linker
 * overstates the cost of `cn` alone by ~20x, so every FESM file goes through
 * `JavaScriptTransformer` (linker + advanced optimizations) before esbuild
 * bundles it.
 *
 * Third-party dependencies (motion, tailwind-merge, clsx, …) are bundled, so
 * every size includes what the library drags in. esbuild assigns code to
 * chunks per file, so one lazy use of `cn` or motion pulls the whole core FESM
 * and its dependencies into the main chunk's closure; only the byte budget
 * catches that. The framework (`@angular/*`, `rxjs`, `tslib`) stays external:
 * every Angular app already ships it.
 *
 * Usage, from `angular/`:
 *   npm run probe:bundle            # builds the library, then probes
 *   node scripts/bundle-probe/probe.mjs [--dist <dir>] [--json] [--initial-budget <KB>]
 *
 * Exit code 1 means the split does not hold (or the probe cannot run).
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const angularRoot = path.resolve(here, '../..');
const requireFromAngular = createRequire(path.join(angularRoot, 'package.json'));

const args = process.argv.slice(2);
const jsonOut = args.includes('--json');
const flag = (name, fallback) => {
  const index = args.indexOf(name);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
};
const distFlag = args.indexOf('--dist');
const distDir = path.resolve(
  angularRoot,
  distFlag !== -1 ? args[distFlag + 1] : 'dist/fluid-functionalism',
);
const PKG_NAME = '@angel-r/fluid-functionalism-angular';

/**
 * The symbol used only by the lazy module, and a string that appears in its
 * code. Defaults to the S1 case: Calendar, imported lazily, outside the main
 * chunk. Overridable so a spike on a partial split (few entries) can use a
 * symbol that exists there.
 */
const LAZY = {
  symbol: flag('--lazy-symbol', 'Calendar'),
  entry: flag('--lazy-entry', 'calendar'),
  marker: flag('--lazy-marker', 'ff-calendar'),
};

/**
 * Most minified bytes (KB) the main chunk may load statically when it uses
 * `provideFluid` and a lazy module uses LAZY.symbol. Measured 2026-10-30 at
 * ~111 KB: the whole core FESM plus motion-dom and tailwind-merge, because
 * the lazy module needs them from the same file.
 */
const INITIAL_BUDGET_KB = Number(flag('--initial-budget', '120'));
if (!(INITIAL_BUDGET_KB > 0)) fail('--initial-budget must be a positive number of KB');

/** Packages every Angular app already ships; kept out of the measured bytes. */
const FRAMEWORK = /^(@angular\/|rxjs(\/|$)|tslib$)/;

if (!existsSync(path.join(distDir, 'package.json'))) {
  fail(`No built library at ${distDir}. Run \`npm run probe:bundle\`, which builds it first.`);
}

/* ------------------------------------------------------------------ *
 * Angular pipeline: hash initialisation + linker/optimizer transform
 * ------------------------------------------------------------------ */

const angularBuildRoot = path.dirname(requireFromAngular.resolve('@angular/build/package.json'));
const { initializeHash } = await import(
  pathToFileURL(path.join(angularBuildRoot, 'src/utils/hash.js')).href
);
const { JavaScriptTransformer } = await import('@angular/build/private');

await initializeHash();
const transformer = new JavaScriptTransformer({
  sourcemap: false,
  thirdPartySourcemaps: false,
  advancedOptimizations: true,
  jit: false,
});

const transformed = new Map();
async function transformFile(file) {
  if (!transformed.has(file)) {
    const data = await transformer.transformFile(file);
    transformed.set(file, data);
  }
  return transformed.get(file);
}

/* ------------------------------------------------------------------ *
 * Package resolution: package name and entry sub-paths -> FESM files
 * ------------------------------------------------------------------ */

const primaryPkg = JSON.parse(readFileSync(path.join(distDir, 'package.json'), 'utf8'));
const exportsMap = primaryPkg.exports ?? {};

function exportTarget(entry) {
  if (typeof entry === 'string') return entry;
  return entry?.default ?? entry?.import ?? entry?.module ?? entry?.es2022 ?? undefined;
}

function resolveEntryKey(key) {
  const fromPrimary = exportTarget(exportsMap[key]);
  if (fromPrimary) {
    const file = path.join(distDir, fromPrimary);
    if (file.endsWith('.mjs')) return file;
  }
  // Secondary entry packages keep their own manifest.
  const subDir = key === '.' ? null : path.join(distDir, key.replace(/^\.\//, ''));
  if (subDir) {
    const manifest = path.join(subDir, 'package.json');
    if (existsSync(manifest)) {
      const sub = JSON.parse(readFileSync(manifest, 'utf8'));
      const target = exportTarget(sub.exports?.['.']) ?? sub.module ?? sub.es2022;
      if (target) {
        const file = path.join(subDir, target);
        if (file.endsWith('.mjs')) return file;
      }
    }
  }
  return undefined;
}

/** Resolves `@angel-r/...` and `@angel-r/.../<entry>` to an FESM file. */
function resolveLibrarySpecifier(specifier) {
  if (specifier === PKG_NAME) return resolveEntryKey('.');
  if (specifier.startsWith(`${PKG_NAME}/`)) {
    const key = `./${specifier.slice(PKG_NAME.length + 1)}`;
    return resolveEntryKey(key);
  }
  return undefined;
}

const knownEntries = [...Object.keys(exportsMap)]
  .filter((key) => key !== '.' && key !== './package.json' && !key.startsWith('./styles/'))
  .map((key) => `${PKG_NAME}/${key.slice(2)}`);
/** Sub-path specifiers are only expected once the split exists. */
const hasSecondaryEntryPoints = knownEntries.length > 0;
/**
 * The package declares `sideEffects: false`. A bundler that resolves the real
 * package reads it and may drop a re-export whose names nobody uses; this
 * plugin resolves by path, so it has to forward the flag itself.
 */
const PACKAGE_SIDE_EFFECTS = primaryPkg.sideEffects !== false;

/* ------------------------------------------------------------------ *
 * esbuild wiring
 * ------------------------------------------------------------------ */

const esbuild = await import(pathToFileURL(requireFromAngular.resolve('esbuild')).href).then(
  (m) => m.default ?? m,
);

const virtualModules = new Map();

function libraryPlugin() {
  return {
    name: 'fluid-functionalism-dist',
    setup(build) {
      build.onResolve({ filter: /^probe:/ }, (a) => ({
        path: a.path.slice('probe:'.length),
        namespace: 'probe',
      }));
      build.onResolve({ filter: /^@angel-r\/fluid-functionalism-angular(\/|$)/ }, (a) => {
        const file = resolveLibrarySpecifier(a.path);
        if (!file) {
          return {
            errors: [
              {
                text: `"${a.path}" is not published by ${PKG_NAME} (no entry point for it)`,
              },
            ],
          };
        }
        return { path: file, namespace: 'ff', sideEffects: PACKAGE_SIDE_EFFECTS };
      });
      build.onResolve({ filter: /.*/ }, (a) => {
        if (FRAMEWORK.test(a.path)) return { path: a.path, external: true };
        // Inside a dependency, esbuild's own resolution (extensions, exports,
        // sideEffects) applies.
        if (a.namespace === 'file') return undefined;
        if (a.path.startsWith('.') || path.isAbsolute(a.path)) {
          return { path: path.resolve(a.resolveDir, a.path) };
        }
        // A third-party import from the library: bundled, resolved from node_modules.
        return undefined;
      });
      build.onLoad({ filter: /.*/, namespace: 'probe' }, (a) => ({
        contents: virtualModules.get(a.path),
        loader: 'js',
        resolveDir: angularRoot,
      }));
      build.onLoad({ filter: /.*/, namespace: 'ff' }, async (a) => ({
        contents: await transformFile(a.path),
        loader: 'js',
        resolveDir: path.dirname(a.path),
      }));
    },
  };
}

const sharedOptions = {
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  define: { ngDevMode: 'false', ngJitMode: 'false' },
  logLevel: 'silent',
};

/** (a) Minified size of the library code kept by a set of used symbols. */
async function measure({ code }) {
  const result = await esbuild.build({
    ...sharedOptions,
    stdin: { contents: code, loader: 'js', resolveDir: angularRoot, sourcefile: 'probe-entry.js' },
    write: false,
    plugins: [libraryPlugin()],
  });
  const text = result.outputFiles.map((file) => file.text).join('');
  return { bytes: text.length, text };
}

/** (b) Chunk layout of a main chunk plus one lazily loaded module. */
async function splitting({ main, lazy, label, symbol = LAZY.symbol, marker = LAZY.marker }) {
  virtualModules.clear();
  virtualModules.set('main', main);
  virtualModules.set('lazy', lazy);
  const result = await esbuild.build({
    ...sharedOptions,
    entryPoints: ['probe:main'],
    splitting: true,
    outdir: path.join(angularRoot, 'dist/fluid-functionalism/probe-out'),
    write: false,
    metafile: true,
    plugins: [libraryPlugin()],
  });
  const outputs = result.metafile.outputs;
  const abs = (key) => path.resolve(angularRoot, key);
  const contents = new Map();
  result.outputFiles.forEach((file) => contents.set(file.path, file.text));

  const mainKey = Object.keys(outputs).find((key) =>
    (outputs[key].entryPoint ?? '').endsWith('main'),
  );
  if (!mainKey) fail(`[${label}] esbuild emitted no main chunk`);

  // Static closure: every chunk the main chunk imports synchronously.
  const staticClosure = new Set();
  const queue = [mainKey];
  while (queue.length) {
    const key = queue.pop();
    if (!outputs[key] || staticClosure.has(key)) continue;
    staticClosure.add(key);
    for (const imp of outputs[key].imports ?? []) {
      if (imp.kind === 'import-statement' && !imp.external) queue.push(imp.path);
    }
  }

  const chunks = Object.keys(outputs)
    .filter((key) => key.endsWith('.js'))
    .map((key) => ({
      name: path.relative(angularRoot, abs(key)),
      bytes: contents.get(abs(key))?.length ?? 0,
      staticFromMain: staticClosure.has(key),
      hasLazy: (contents.get(abs(key)) ?? '').includes(marker),
      imports: (outputs[key].imports ?? [])
        .filter((imp) => imp.kind !== 'dynamic-import')
        .map((imp) => path.relative(angularRoot, abs(imp.path))),
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const lazyHasSymbol = chunks.some((c) => !c.staticFromMain && c.hasLazy);
  const staticHasSymbol = chunks.some((c) => c.staticFromMain && c.hasLazy);
  const initialBytes = chunks.filter((c) => c.staticFromMain).reduce((sum, c) => sum + c.bytes, 0);

  // Where the initial bytes come from: the library, or a dependency by package.
  const initialByPackage = {};
  for (const key of staticClosure) {
    for (const [input, { bytesInOutput }] of Object.entries(outputs[key].inputs)) {
      const pkg =
        input.match(/node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/)?.[1].replace('\\', '/') ??
        (input.startsWith('ff:') ? 'library' : 'probe');
      initialByPackage[pkg] = (initialByPackage[pkg] ?? 0) + bytesInOutput;
    }
  }

  return {
    label,
    marker,
    chunks,
    lazyHasSymbol,
    staticHasSymbol,
    initialBytes,
    initialByPackage,
    initialOk: initialBytes <= INITIAL_BUDGET_KB * 1024,
    ok: staticHasSymbol === false && lazyHasSymbol === true,
    detail: staticHasSymbol
      ? `${symbol} is in a chunk the main chunk imports statically`
      : lazyHasSymbol
        ? `${symbol} lives only in the lazy chunk`
        : `${symbol} was not emitted at all (the dynamic import kept nothing)`,
  };
}

/* ------------------------------------------------------------------ *
 * Scenarios
 * ------------------------------------------------------------------ */

const scenarios = [];
const failures = [];

function sizeRow(label, bytes) {
  scenarios.push({ kind: 'size', label, bytes });
}

// (a) bare import: one symbol at a time, then everything.
const bareUse = (imports, use) => `${imports}\nglobalThis.__probe = ${use};\n`;
async function sizesFor(sub) {
  const spec = (entry) => (entry && sub ? `${PKG_NAME}/${entry}` : PKG_NAME);
  const coreFrom = spec('core');
  const buttonFrom = spec('button');
  const lazyFrom = spec(LAZY.entry);

  if (sub && !hasSecondaryEntryPoints) return null;
  const rows = [
    ['cn', bareUse(`import { cn } from '${coreFrom}';`, 'cn')],
    ['provideFluid', bareUse(`import { provideFluid } from '${coreFrom}';`, 'provideFluid')],
    [
      'provideFluid + Button',
      bareUse(
        `import { provideFluid } from '${coreFrom}';\nimport { Button } from '${buttonFrom}';`,
        '[provideFluid, Button]',
      ),
    ],
    ['everything', `import * as ff from '${PKG_NAME}';\nglobalThis.__probe = ff;\n`],
  ];
  const out = [];
  for (const [name, code] of rows) {
    out.push([name, await measure({ code })]);
  }
  return { lazyFrom, rows: out, sub };
}

/**
 * S6: importing only `cn` keeps no icon pack and no component.
 *
 * Both are detected by data that survives minification: one glyph path per
 * pack (read from the pack sources, since identifiers are renamed) and the
 * single-quoted or double-quoted `ff-` selectors in the component metadata.
 */
const PACK_SOURCES = {
  lucide: 'core/lucide-icons.ts',
  hugeicons: 'icon-packs/hugeicons.ts',
  tabler: 'icon-packs/tabler.ts',
  phosphor: 'icon-packs/phosphor.ts',
  untitledui: 'icon-packs/untitledui.ts',
};
const sourceRoot = path.join(angularRoot, 'projects/fluid-functionalism');
const packMarkers = Object.entries(PACK_SOURCES)
  .map(([pack, relative]) => {
    const file = path.join(sourceRoot, relative);
    if (!existsSync(file)) return undefined;
    const glyph = readFileSync(file, 'utf8').match(/"d":"([^"]{12,80})"/)?.[1];
    return glyph ? [pack, glyph] : undefined;
  })
  .filter(Boolean);

function purityOf(text) {
  const iconPacks = packMarkers.filter(([, glyph]) => text.includes(glyph)).map(([pack]) => pack);
  const selectors = [
    ...new Set([...text.matchAll(/["']ff-[a-z-]+["']/g)].map((match) => match[0])),
  ];
  return { iconPacks, selectors };
}

function purityCheck(mode, result) {
  const purity = purityOf(result.text);
  scenarios.push({ kind: 'purity', label: `${mode} / cn keeps`, ...purity });
  if (purity.iconPacks.length) {
    failures.push(`${mode} import: cn keeps icon pack data (${purity.iconPacks.join(', ')})`);
  }
  if (purity.selectors.length) {
    failures.push(`${mode} import: cn keeps component code (${purity.selectors.join(', ')})`);
  }
}

/**
 * Positive controls, so a green check cannot come from detection that stopped
 * working: provideFluid() supplies the icon map, so it must keep a pack, and
 * the everything bundle must show component selectors.
 */
function controlCheck(mode, rows) {
  const byName = new Map(rows);
  if (!purityOf(byName.get('provideFluid').text).iconPacks.length) {
    failures.push(
      `${mode} import: probe cannot see icon pack data in provideFluid (detection broken)`,
    );
  }
  if (!purityOf(byName.get('everything').text).selectors.length) {
    failures.push(
      `${mode} import: probe cannot see component selectors in everything (detection broken)`,
    );
  }
}

const bareSizes = await sizesFor(null);
for (const [name, result] of bareSizes.rows) {
  sizeRow(`bare / ${name}`, result.bytes);
  if (name === 'cn') purityCheck('bare', result);
}
controlCheck('bare', bareSizes.rows);

let subSizes = null;
if (hasSecondaryEntryPoints) {
  subSizes = await sizesFor('subpaths');
  for (const [name, result] of subSizes.rows) {
    sizeRow(`sub-paths / ${name}`, result.bytes);
    if (name === 'cn') purityCheck('sub-paths', result);
  }
  controlCheck('sub-paths', subSizes.rows);
}

// (b) splitting, through the bare import.
const bareSplit = await splitting({
  label: 'bare',
  main: `import { provideFluid } from '${PKG_NAME}';\nglobalThis.__main = provideFluid;\nimport('probe:lazy');\n`,
  lazy: `import { ${LAZY.symbol} } from '${PKG_NAME}';\nglobalThis.__lazy = ${LAZY.symbol};\n`,
});
scenarios.push({ kind: 'split', ...bareSplit });
if (!bareSplit.ok) failures.push(`bare import: ${bareSplit.detail}`);
budgetCheck('bare import', bareSplit);

// (b) splitting, through sub-paths.
let subSplit = null;
if (subSizes && subSizes.lazyFrom) {
  subSplit = await splitting({
    label: 'sub-paths',
    main: `import { provideFluid } from '${PKG_NAME}/core';\nglobalThis.__main = provideFluid;\nimport('probe:lazy');\n`,
    lazy: `import { ${LAZY.symbol} } from '${PKG_NAME}/${LAZY.entry}';\nglobalThis.__lazy = ${LAZY.symbol};\n`,
  });
  scenarios.push({ kind: 'split', ...subSplit });
  if (!subSplit.ok) failures.push(`sub-path import: ${subSplit.detail}`);
  budgetCheck('sub-path import', subSplit);
}

/**
 * (c) shared pieces. Each entry ships as ONE FESM file and esbuild assigns
 * code to chunks per file, so a primitive that lives inside a component entry
 * drags that component into the main chunk as soon as an eager component uses
 * the primitive and a lazy module uses the component. These pairs are the
 * ones the showcase shell hit: an eager Select or CommandMenu must leave
 * Tabs, RadioGroup and DropdownMenu to the lazy chunk.
 */
const SHARED_CASES = [
  { eager: ['CommandMenu', 'command-menu'], lazy: ['Tabs', 'tabs'], marker: 'ff-tabs' },
  { eager: ['Select', 'select'], lazy: ['RadioGroup', 'radio-group'], marker: 'ff-radio-group' },
  { eager: ['Select', 'select'], lazy: ['DropdownMenu', 'dropdown'], marker: 'ff-dropdown-menu' },
];
if (subSplit) {
  for (const { eager, lazy, marker } of SHARED_CASES) {
    const label = `shared, eager ${eager[0]} + lazy ${lazy[0]}`;
    const split = await splitting({
      label,
      symbol: lazy[0],
      marker,
      main: `import { ${eager[0]} } from '${PKG_NAME}/${eager[1]}';
globalThis.__main = ${eager[0]};
import('probe:lazy');
`,
      lazy: `import { ${lazy[0]} } from '${PKG_NAME}/${lazy[1]}';
globalThis.__lazy = ${lazy[0]};
`,
    });
    scenarios.push({ kind: 'split', shared: true, ...split });
    if (!split.ok) failures.push(`${label}: ${split.detail}`);
  }
}

function budgetCheck(mode, split) {
  if (split.initialOk) return;
  failures.push(
    `${mode}: main loads ${(split.initialBytes / 1024).toFixed(1)} KB statically, over the ${INITIAL_BUDGET_KB} KB budget`,
  );
}

await transformer.close();

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

if (jsonOut) {
  console.log(JSON.stringify({ distDir, entryPoints: knownEntries, scenarios, failures }, null, 2));
} else {
  console.log(`library: ${path.relative(angularRoot, distDir)}`);
  console.log(
    `entry points: ${
      knownEntries.length
        ? `${knownEntries.length} sub-paths (${knownEntries.slice(0, 4).join(', ')}${knownEntries.length > 4 ? ', …' : ''})`
        : 'none (one FESM, pre-split)'
    }`,
  );
  console.log(
    '\n(a) minified bytes kept by an import (library + dependencies, framework excluded)',
  );
  for (const row of scenarios.filter((s) => s.kind === 'size')) {
    console.log(`  ${row.label.padEnd(28)} ${kb(row.bytes).padStart(9)}`);
  }
  for (const purity of scenarios.filter((s) => s.kind === 'purity')) {
    const keeps = [...purity.iconPacks, ...purity.selectors];
    console.log(
      `  ${purity.label.padEnd(28)} ${keeps.length ? keeps.join(', ') : 'no icon pack, no component'}`,
    );
  }
  for (const split of scenarios.filter((s) => s.kind === 'split')) {
    console.log(
      `\n(${split.shared ? 'c' : 'b'}) splitting, ${split.label}${split.shared ? '' : ' import'} — ${split.ok ? 'PASS' : 'FAIL'}: ${split.detail}`,
    );
    const byPackage = Object.entries(split.initialByPackage)
      .filter(([, bytes]) => bytes > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([pkg, bytes]) => `${pkg} ${kb(bytes)}`)
      .join(', ');
    console.log(
      split.shared
        ? `  initial ${kb(split.initialBytes)} (no budget): ${byPackage}`
        : `  initial ${kb(split.initialBytes)} (budget ${INITIAL_BUDGET_KB} KB, ${
            split.initialOk ? 'PASS' : 'FAIL'
          }): ${byPackage}`,
    );
    for (const chunk of split.chunks) {
      console.log(
        `  ${chunk.staticFromMain ? 'static' : 'lazy  '} ${kb(chunk.bytes).padStart(9)}  ${
          chunk.hasLazy ? `has ${split.marker}` : ''
        }  ${chunk.name}`,
      );
      if (chunk.imports.length) console.log(`         imports: ${chunk.imports.join(', ')}`);
    }
  }
  console.log('');
  if (failures.length) {
    console.log(`RED — ${failures.length} failure(s):`);
    failures.forEach((failure) => console.log(`  - ${failure}`));
    process.exitCode = 1;
  } else {
    console.log('GREEN — the library splits per entry point.');
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
