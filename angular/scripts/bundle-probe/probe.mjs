#!/usr/bin/env node
/**
 * Bundle probe for @angel-r/fluid-functionalism-angular.
 *
 * Proves the two claims behind the secondary entry point split:
 *   (a) tree shaking: importing one symbol keeps only that symbol's code;
 *   (b) splitting: a component imported only by a lazily loaded module is not
 *       in the static closure of the app's main chunk.
 *
 * It uses the real Angular pipeline. Plain esbuild without the linker
 * overstates the cost of `cn` alone by ~20x, so every FESM file goes through
 * `JavaScriptTransformer` (linker + advanced optimizations) before esbuild
 * bundles it.
 *
 * Usage, from `angular/`:
 *   npm run probe:bundle            # builds the library, then probes
 *   node scripts/bundle-probe/probe.mjs [--dist <dir>] [--json]
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
        if (a.path.startsWith('.') || path.isAbsolute(a.path)) {
          return { path: path.resolve(a.resolveDir, a.path) };
        }
        // Everything else stays external: the probe measures library bytes only.
        return { path: a.path, external: true };
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
  return result.outputFiles.reduce((sum, file) => sum + file.contents.length, 0);
}

/** (b) Chunk layout of a main chunk plus one lazily loaded module. */
async function splitting({ main, lazy, label }) {
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

  const mainKey = Object.keys(outputs).find(
    (key) => (outputs[key].entryPoint ?? '').endsWith('main'),
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
      hasLazy: (contents.get(abs(key)) ?? '').includes(LAZY.marker),
      imports: (outputs[key].imports ?? [])
        .filter((imp) => imp.kind !== 'dynamic-import')
        .map((imp) => path.relative(angularRoot, abs(imp.path))),
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const lazyHasSymbol = chunks.some((c) => !c.staticFromMain && c.hasLazy);
  const staticHasSymbol = chunks.some((c) => c.staticFromMain && c.hasLazy);

  return {
    label,
    chunks,
    lazyHasSymbol,
    staticHasSymbol,
    ok: staticHasSymbol === false,
    detail: staticHasSymbol
      ? `${LAZY.symbol} is in a chunk the main chunk imports statically`
      : lazyHasSymbol
        ? `${LAZY.symbol} lives only in the lazy chunk`
        : `${LAZY.symbol} was not emitted at all (the dynamic import kept nothing)`,
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
      bareUse(`import { provideFluid } from '${coreFrom}';\nimport { Button } from '${buttonFrom}';`, '[provideFluid, Button]'),
    ],
    [
      'everything',
      `import * as ff from '${PKG_NAME}';\nglobalThis.__probe = ff;\n`,
    ],
  ];
  const out = [];
  for (const [name, code] of rows) {
    out.push([name, await measure({ code })]);
  }
  return { lazyFrom, rows: out, sub };
}

const bareSizes = await sizesFor(null);
bareSizes.rows.forEach(([name, bytes]) => sizeRow(`bare / ${name}`, bytes));

let subSizes = null;
if (hasSecondaryEntryPoints) {
  subSizes = await sizesFor('subpaths');
  subSizes.rows.forEach(([name, bytes]) => sizeRow(`sub-paths / ${name}`, bytes));
}

// (b) splitting, through the bare import.
const bareSplit = await splitting({
  label: 'bare',
  main: `import { provideFluid } from '${PKG_NAME}';\nglobalThis.__main = provideFluid;\nimport('probe:lazy');\n`,
  lazy: `import { ${LAZY.symbol} } from '${PKG_NAME}';\nglobalThis.__lazy = ${LAZY.symbol};\n`,
});
scenarios.push({ kind: 'split', ...bareSplit });
if (!bareSplit.ok) failures.push(`bare import: ${bareSplit.detail}`);

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
  console.log('\n(a) minified library bytes kept by an import');
  for (const row of scenarios.filter((s) => s.kind === 'size')) {
    console.log(`  ${row.label.padEnd(28)} ${kb(row.bytes).padStart(9)}`);
  }
  for (const split of scenarios.filter((s) => s.kind === 'split')) {
    console.log(`\n(b) splitting, ${split.label} import — ${split.ok ? 'PASS' : 'FAIL'}: ${split.detail}`);
    for (const chunk of split.chunks) {
      console.log(
        `  ${chunk.staticFromMain ? 'static' : 'lazy  '} ${kb(chunk.bytes).padStart(9)}  ${
          chunk.hasLazy ? `has ${LAZY.marker}` : ''
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
