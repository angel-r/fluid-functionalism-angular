// Generates the alternative icon packs (Tabler, Phosphor, Hugeicons, Untitled
// UI) as static SVG data for `provideIcons()`, so the library needs none of
// those packages at runtime.
//
// The slot → glyph mapping is read from the React registry files
// (registry/default/lib/icons-*.tsx), the single source of truth; the glyph
// data comes from the framework-free packages:
//
//   npm i -D @tabler/icons @phosphor-icons/core @hugeicons/core-free-icons @untitledui/icons
//   node scripts/generate-icon-packs.mjs [--modules <node_modules dir>]
//
// All four packages are MIT licensed. Slots a React pack fills with a Lucide
// fallback (Play/Pause) are left out, so `provideIcons()` keeps Lucide there.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const workspace = resolve(here, '..');
const repo = resolve(workspace, '..');
const modulesArg = process.argv.indexOf('--modules');
const modules = resolve(modulesArg > -1 ? process.argv[modulesArg + 1] : join(workspace, 'node_modules'));
const requireFrom = createRequire(join(modules, 'noop.js'));
const pkgDir = (pkg) => join(modules, pkg);
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const outDir = join(workspace, 'projects/fluid-functionalism/src/lib/icon-packs');

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([a-zA-Z])([0-9])/g, '$1-$2').toLowerCase();
const camelToKebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** `{ slot: localName, wrapper }` pairs from a React pack's map literal. */
function readSlots(file) {
  const src = readFileSync(join(repo, 'registry/default/lib', file), 'utf8');
  const map = src.slice(src.indexOf('Record<IconName, IconComponent> = {'));
  return [...map.matchAll(/"([a-z-]+)":\s*(\w+)\((\w+)\)/g)].map(([, slot, wrapper, local]) => ({ slot, wrapper, local }));
}

/** `local → exported name` for named imports (`X as Y`) from `pkg`. */
function readNamedImports(file, pkg) {
  const src = readFileSync(join(repo, 'registry/default/lib', file), 'utf8');
  const block = src.match(new RegExp(`import \\{([^}]*)\\} from "${pkg}"`))?.[1] ?? '';
  const out = new Map();
  for (const part of block.split(',').map((p) => p.trim()).filter(Boolean)) {
    const [name, alias] = part.split(/\s+as\s+/);
    out.set(alias ?? name, name);
  }
  return out;
}

function parseSvgChildren(svg) {
  const nodes = [];
  for (const [, tag, attrs] of svg.matchAll(/<(\w+)\s+([^>]*?)\/?>/g)) {
    if (tag === 'svg') continue;
    const a = {};
    for (const [, k, v] of attrs.matchAll(/([\w:-]+)="([^"]*)"/g)) a[k] = v;
    nodes.push([tag, a]);
  }
  return nodes;
}

function tabler() {
  const data = readJson(join(pkgDir('@tabler/icons'), 'tabler-nodes-outline.json'));
  const entries = readSlots('icons-tabler.tsx').map(({ slot, local }) => {
    const name = kebab(local.replace(/^Icon/, ''));
    if (!data[name]) throw new Error(`tabler: no glyph "${name}" for ${slot}`);
    return [slot, JSON.stringify(data[name])];
  });
  return { entries, frame: (nodes) => nodes };
}

function phosphor() {
  const names = readNamedImports('icons-phosphor.tsx', '@phosphor-icons/react');
  const core = pkgDir('@phosphor-icons/core');
  const read = (weight, name) =>
    parseSvgChildren(readFileSync(join(core, 'assets', weight, weight === 'regular' ? `${name}.svg` : `${name}-${weight}.svg`), 'utf8'));
  const entries = readSlots('icons-phosphor.tsx').map(({ slot, wrapper, local }) => {
    const name = kebab(names.get(local) ?? local);
    const regular = JSON.stringify(read('regular', name));
    const light = JSON.stringify(read('light', name));
    const mirror = wrapper === 'phosphorFlipped' ? ", class: '-scale-x-100'" : '';
    // Same weight rule as the React adapter: 1.75 and up draws regular.
    return [slot, `{ viewBox: '0 0 256 256', filled: true${mirror}, nodes: (s) => (s >= 1.75 ? ${regular} : ${light}) }`];
  });
  return { entries };
}

function hugeicons() {
  const src = readFileSync(join(repo, 'registry/default/lib/icons-hugeicons.tsx'), 'utf8');
  const imports = new Map([...src.matchAll(/import (\w+) from "@hugeicons\/core-free-icons\/(\w+)"/g)].map(([, l, n]) => [l, n]));
  const pkg = requireFrom('@hugeicons/core-free-icons');
  const entries = readSlots('icons-hugeicons.tsx').map(({ slot, local }) => {
    const glyph = pkg[imports.get(local)];
    if (!glyph) throw new Error(`hugeicons: no glyph for ${slot}`);
    // Per-node stroke widths are dropped so the <svg>'s stroke-width (the
    // value components animate) wins, as HugeiconsIcon's strokeWidth prop does.
    const nodes = glyph.map(([tag, attrs]) => [
      tag,
      Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k !== 'key' && k !== 'strokeWidth')
          .map(([k, v]) => [camelToKebab(k), v]),
      ),
    ]);
    return [slot, JSON.stringify(nodes)];
  });
  return { entries };
}

function untitledui() {
  const names = readNamedImports('icons-untitledui.tsx', '@untitledui/icons');
  const dist = join(pkgDir('@untitledui/icons'), 'dist');
  const entries = readSlots('icons-untitledui.tsx').map(({ slot, local }) => {
    const name = names.get(local) ?? local;
    const src = readFileSync(join(dist, `${name}.mjs`), 'utf8');
    const nodes = [...src.matchAll(/createElement\("(\w+)",\{([^}]*)\}\)/g)]
      .filter(([, tag]) => tag !== 'svg')
      .map(([, tag, body]) => [tag, Object.fromEntries([...body.matchAll(/(\w+):"([^"]*)"/g)].map(([, k, v]) => [camelToKebab(k), v]))]);
    if (!nodes.length) throw new Error(`untitledui: no nodes parsed for ${name}`);
    return [slot, JSON.stringify(nodes)];
  });
  return { entries };
}

const packs = [
  ['tabler', 'tablerIcons', 'Tabler', '@tabler/icons', tabler],
  ['phosphor', 'phosphorIcons', 'Phosphor', '@phosphor-icons/core', phosphor],
  ['hugeicons', 'hugeiconsIcons', 'Hugeicons', '@hugeicons/core-free-icons', hugeicons],
  ['untitledui', 'untitleduiIcons', 'Untitled UI', '@untitledui/icons', untitledui],
];

mkdirSync(outDir, { recursive: true });
for (const [file, exportName, title, pkg, build] of packs) {
  const version = readJson(join(pkgDir(pkg), 'package.json')).version;
  const { entries } = build();
  const body = entries.map(([slot, value]) => `  '${slot}': ${value},`).join('\n');
  writeFileSync(
    join(outDir, `${file}.ts`),
    `// Generated by scripts/generate-icon-packs.mjs from ${pkg}@${version} (MIT).\n` +
      `// Do not edit by hand: change registry/default/lib/icons-${file}.tsx and regenerate.\n` +
      `import type { IconDefinition, IconName } from '../core/icons';\n\n` +
      `/** ${title} glyphs for every slot the components look up: \`provideIcons(${exportName})\`. */\n` +
      `export const ${exportName}: Partial<Record<IconName, IconDefinition>> = {\n${body}\n};\n`,
  );
  console.log(`${file}: ${entries.length} slots`);
}
writeFileSync(join(outDir, 'index.ts'), packs.map(([file]) => `export * from './${file}';`).join('\n') + '\n');
