#!/usr/bin/env node
// Read an Angular project's stack the way the skill's audit needs it: fresh,
// on every run.
//
// Every fact the audit turns on can be read back from the project in well
// under a second: the Angular and Tailwind versions, the package and its
// peers, the theme import and the Tailwind scan, the provider wiring, the
// font declaration, and which `ff-` parts the app already uses. Reading them
// again each run means no cached verdict can drift from the code, so the
// skill never leaves a record in the project. This prints what it read, with
// the file:line it read it from, and writes nothing.
//
// It reports facts. What each one costs the interface, and whether it is
// worth raising, lives in references/stack-audit.md.
//
//   node scripts/stack.mjs                    # the current directory
//   node scripts/stack.mjs apps/web --json
//
// No dependencies: plain Node 18+.

import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE = "@angel-r/fluid-functionalism-angular";
export const PEERS = ["@angular/cdk", "@angular/aria"];
export const REQUIRED_MAJOR = { angular: 22, tailwind: 4 };

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".angular",
  "dist",
  "coverage",
  ".cache",
  ".vscode",
  "e2e",
]);

const SOURCE_EXT = new Set([".ts", ".html"]);
const NOT_PRODUCT = /\.(spec|test)\.ts$/;
const MAX_FILES = 4000;
const MAX_BYTES = 400_000;

/** Helpers and classes that only this library exports. A project importing
 *  one of these has adopted that system. */
export const SYSTEM_SYMBOLS = [
  "injectShape",
  "injectShapeContext",
  "injectSize",
  "injectSizeVariant",
  "injectSurface",
  "injectIcons",
  "injectTypeScale",
  "injectAnimateFluid",
  "injectTouchPrimary",
  "typeClass",
  "fontWeights",
  "spring",
  "enterTransition",
  "exitTransition",
  "animateFluid",
  "createFluidHover",
  "createSelectionRuns",
  "createMergeSplitBlocks",
  "provideFluid",
  "provideFluidTheme",
  "provideIcons",
];

const ICON_PACKS = ["tablerIcons", "phosphorIcons", "hugeiconsIcons", "untitleduiIcons"];

const REVEAL_CLASSES = [
  "reveal-landing",
  "reveal-product",
  "reveal-swap",
  "reveal-items",
  "reveal-scroll",
];

const DECISION_FILES = ["AGENTS.md", "CLAUDE.md"];
const DECISION_HEADING = /^##\s+Fluid Functionalism\s*$/m;

/** "^22.2.0" -> 22; "workspace:*", "latest" -> null. */
export function parseMajor(version) {
  const match = String(version ?? "").match(/(\d+)(?:\.\d+)?/);
  return match ? Number(match[1]) : null;
}

export function parseArgs(argv) {
  const args = { dir: null, json: false };
  for (const arg of argv) {
    if (arg === "--json") args.json = true;
    else if (!arg.startsWith("-") && !args.dir) args.dir = arg;
  }
  return args;
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function readText(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/** 1-based line for a character index. */
export function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

/** `path/to/file.ts:12`, relative to the workspace root when inside it. */
export function cite(file, text, index, root) {
  const rel = relative(root, file).split(sep).join("/");
  return `${rel}:${lineAt(text, index)}`;
}

/** The nearest directory at or above `start` that holds an angular.json. */
export function findWorkspace(start) {
  let dir = resolve(start);
  for (let depth = 0; depth < 12; depth++) {
    if (existsSync(join(dir, "angular.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** The application projects in an angular.json, with their build options. */
export function readProjects(workspace) {
  const file = join(workspace, "angular.json");
  const json = readJson(file);
  if (!json?.projects) return [];
  return Object.entries(json.projects).map(([name, project]) => {
    const build = project?.architect?.build ?? project?.targets?.build ?? null;
    const options = build?.options ?? {};
    return {
      name,
      root: resolve(workspace, project.root ?? ""),
      sourceRoot: resolve(workspace, project.sourceRoot ?? project.root ?? ""),
      builder: build?.builder ?? null,
      styles: options.styles ?? [],
      assets: options.assets ?? [],
      file,
    };
  });
}

/** The project whose root contains `dir`, else the first application. */
export function pickProject(projects, dir) {
  const target = resolve(dir);
  const applications = projects.filter((p) => (p.builder ?? "").includes("application"));
  const pool = applications.length ? applications : projects;
  const inside = pool.filter(
    (p) => target === p.root || target.startsWith(p.root + sep),
  );
  inside.sort((a, b) => b.root.length - a.root.length);
  return inside[0] ?? pool[0] ?? null;
}

/** Style entry files for a project, resolved against the workspace root. */
export function styleFiles(project, workspace) {
  const files = [];
  for (const entry of project?.styles ?? []) {
    const path = typeof entry === "string" ? entry : entry?.input;
    if (!path || !path.endsWith(".css")) continue;
    files.push(isAbsolute(path) ? path : resolve(workspace, path));
  }
  return files;
}

function walk(dir, visit) {
  let seen = 0;
  const stack = [dir];
  while (stack.length && seen < MAX_FILES) {
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        stack.push(path);
        continue;
      }
      if (!entry.isFile()) continue;
      if (NOT_PRODUCT.test(entry.name)) continue;
      if (!SOURCE_EXT.has(extname(entry.name))) continue;
      if (statSync(path).size > MAX_BYTES) continue;
      seen++;
      visit(path);
      if (seen >= MAX_FILES) break;
    }
  }
  return seen;
}

function dependencyVersions(pkg) {
  return { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
}

function firstMatch(text, regex) {
  const match = regex.exec(text);
  return match ? match : null;
}

function collectDecisions(start) {
  const found = [];
  let dir = resolve(start);
  for (let depth = 0; depth < 12; depth++) {
    for (const name of DECISION_FILES) {
      const file = join(dir, name);
      const text = existsSync(file) ? readText(file) : null;
      if (!text) continue;
      const match = DECISION_HEADING.exec(text);
      if (!match) continue;
      const startIndex = match.index;
      const rest = text.slice(startIndex);
      const nextHeading = rest.slice(rest.indexOf("\n") + 1).search(/^##\s+/m);
      const section =
        nextHeading === -1
          ? rest.trimEnd()
          : rest.slice(0, rest.indexOf("\n") + 1 + nextHeading).trimEnd();
      found.push({ file, text, index: startIndex, section });
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return found;
}

export function readStack(startDir) {
  const start = resolve(startDir ?? ".");
  const workspace = findWorkspace(start);
  const packageFile = workspace
    ? join(workspace, "package.json")
    : join(start, "package.json");
  const pkg = readJson(packageFile);
  const deps = dependencyVersions(pkg);
  const projects = workspace ? readProjects(workspace) : [];
  const project = pickProject(projects, start);
  const root = workspace ?? start;
  const styles = styleFiles(project, root).map((file) => {
    const text = existsSync(file) ? readText(file) : null;
    return { file, text: text ?? "" };
  });

  const installedFile = join(root, "node_modules", PACKAGE, "package.json");
  const installed = readJson(installedFile);

  const requirements = {
    angular: {
      range: deps["@angular/core"] ?? null,
      major: parseMajor(deps["@angular/core"]),
      ok: parseMajor(deps["@angular/core"]) === REQUIRED_MAJOR.angular,
    },
    tailwind: {
      range: deps.tailwindcss ?? null,
      major: parseMajor(deps.tailwindcss),
      ok: parseMajor(deps.tailwindcss) === REQUIRED_MAJOR.tailwind,
    },
    package: {
      range: deps[PACKAGE] ?? null,
      installed: installed?.version ?? null,
    },
    peers: Object.fromEntries(
      PEERS.map((peer) => [peer, deps[peer] ?? installed?.peerDependencies?.[peer] ?? null]),
    ),
    pdfjs: deps["pdfjs-dist"] ?? null,
  };

  // A workspace that paths the package at its own source has no dependency
  // entry; report the alias instead of a false "not declared".
  let alias = null;
  const tsconfigFile = join(root, "tsconfig.json");
  const tsconfigText = existsSync(tsconfigFile) ? readText(tsconfigFile) : null;
  if (!requirements.package.range && tsconfigText) {
    const match = /["']@angel-r\/fluid-functionalism-angular["']\s*:/.exec(tsconfigText);
    if (match) {
      alias = {
        file: tsconfigFile,
        line: lineAt(tsconfigText, match.index ?? 0),
      };
    }
  }
  requirements.package.alias = alias;

  const css = { files: [] };
  for (const { file, text } of styles) {
    const tailwind = firstMatch(text, /@import\s+["']tailwindcss["']/);
    const theme = firstMatch(
      text,
      /@import\s+["'][^"']*fluid-functionalism[^"']*\/styles\/theme\.css["']/,
    );
    const sources = [...text.matchAll(/@source\s+([^;]+);/g)].map((m) => ({
      value: m[1].trim(),
      index: m.index ?? 0,
    }));
    const librarySource = sources.find((s) =>
      /fluid-functionalism/.test(s.value),
    );
    const fontFaces = [...text.matchAll(/@font-face\s*\{[^}]*\}/g)];
    const interFaces = fontFaces
      .filter((m) => /font-family:\s*["']?Inter["']?\s*;/.test(m[0]))
      .map((m) => {
        const weight = /font-weight:\s*([^;]+);/.exec(m[0]);
        const url = /url\(\s*["']?([^"')]+)/.exec(m[0]);
        return {
          index: m.index ?? 0,
          weight: weight?.[1]?.trim() ?? null,
          variable: /100\s+900/.test(weight?.[1] ?? ""),
          url: url?.[1] ?? null,
        };
      });
    css.files.push({
      file,
      text,
      tailwind,
      theme,
      sources,
      librarySource,
      interFaces,
    });
  }
  const withTailwind = css.files.find((f) => f.tailwind);
  const withTheme = css.files.find((f) => f.theme);
  const withSource = css.files.find((f) => f.librarySource);
  const interFace = css.files
    .flatMap((f) => f.interFaces.map((face) => ({ ...face, file: f.file, text: f.text })))
    .find((face) => face.variable);
  const rootAbsoluteFont = css.files.find((f) => /url\(\s*["']?\/fonts\//.test(f.text));

  const configFiles = [];
  if (project) {
    walk(project.sourceRoot, (file) => {
      const name = file.split(sep).pop() ?? "";
      if (name === "app.config.ts" || name === "main.ts") {
        configFiles.push({ file, text: readText(file) ?? "" });
      }
    });
  }
  const config = configFiles.find((f) => /provideFluid\s*\(/.test(f.text)) ?? configFiles[0] ?? null;
  const configText = config?.text ?? "";
  const fluidCall = /provideFluid\s*\(([\s\S]{0,400}?)\)\s*[,;\n]/.exec(configText);
  const themeCall = /provideFluidTheme\s*\(([\s\S]{0,300}?)\)\s*[,;\n]/.exec(configText);
  const option = (text, name) => {
    const match = new RegExp(`${name}\\s*:\\s*([^,})]+)`).exec(text ?? "");
    return match ? match[1].trim() : null;
  };
  const wiring = {
    provideFluid: firstMatch(configText, /provideFluid\s*\(/),
    provideFluidTheme: firstMatch(configText, /provideFluidTheme\s*\(/),
    shape: option(fluidCall?.[1], "shape"),
    size: option(fluidCall?.[1], "size"),
    icons: option(fluidCall?.[1], "icons"),
    themeOptions: themeCall?.[1]?.trim() ?? null,
    zone: firstMatch(configText, /provideZoneChangeDetection\s*\(/),
    provideIcons: firstMatch(configText, /provideIcons\s*\(/),
  };

  // Product code: selectors, directives, system symbols.
  const usage = { elements: new Map(), directives: new Map(), systems: new Map(), reveal: new Map() };
  const bump = (map, key, file, text, index) => {
    if (!map.has(key)) map.set(key, { count: 0, examples: [] });
    const entry = map.get(key);
    entry.count++;
    if (entry.examples.length < 3) entry.examples.push(cite(file, text, index, root));
  };
  let scanned = 0;
  if (project) {
    walk(project.sourceRoot, (file) => {
      const text = readText(file);
      if (!text) return;
      scanned++;
      for (const match of text.matchAll(/<(ff-[a-z0-9-]+)/g)) {
        bump(usage.elements, match[1], file, text, match.index ?? 0);
      }
      for (const match of text.matchAll(/\bff[A-Z][A-Za-z0-9]*\b/g)) {
        bump(usage.directives, match[0], file, text, match.index ?? 0);
      }
      for (const symbol of SYSTEM_SYMBOLS) {
        const match = new RegExp(`\\b${symbol}\\b`).exec(text);
        if (match) bump(usage.systems, symbol, file, text, match.index ?? 0);
      }
      for (const cls of REVEAL_CLASSES) {
        const match = new RegExp(`\\b${cls}\\b`).exec(text);
        if (match) bump(usage.reveal, cls, file, text, match.index ?? 0);
      }
    });
  }

  const iconPacks = ICON_PACKS.filter((pack) =>
    css.files.some((f) => f.text.includes(pack)) ||
    configText.includes(pack),
  );

  const durations = [];
  if (project) {
    walk(project.sourceRoot, (file) => {
      const text = readText(file);
      if (!text || !/from\s+["']motion["']/.test(text)) return;
      const match = /\bduration\s*:\s*[0-9.]+/.exec(text);
      if (match) durations.push(cite(file, text, match.index ?? 0, root));
    });
  }

  const decisions = collectDecisions(start).map((d) => ({
    file: d.file,
    line: lineAt(d.text, d.index),
    section: d.section,
  }));

  const sorted = (map) =>
    [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, value]) => ({ name, ...value }));

  return {
    start,
    workspace,
    project: project
      ? { name: project.name, root: project.root, sourceRoot: project.sourceRoot, builder: project.builder }
      : null,
    scanned,
    packageFile,
    requirements,
    css: {
      tailwind: withTailwind
        ? { file: withTailwind.file, line: lineAt(withTailwind.text, withTailwind.tailwind.index ?? 0) }
        : null,
      theme: withTheme
        ? { file: withTheme.file, line: lineAt(withTheme.text, withTheme.theme.index ?? 0) }
        : null,
      source: withSource
        ? {
            file: withSource.file,
            line: lineAt(withSource.text, withSource.librarySource.index ?? 0),
            target: withSource.librarySource.value,
          }
        : null,
      inter: interFace
        ? {
            file: interFace.file,
            line: lineAt(interFace.text, interFace.index),
            weight: interFace.weight,
            url: interFace.url,
          }
        : null,
      rootAbsoluteFont: rootAbsoluteFont ? rootAbsoluteFont.file : null,
    },
    config: config
      ? {
          file: config.file,
          provideFluid: wiring.provideFluid
            ? lineAt(configText, wiring.provideFluid.index ?? 0)
            : null,
          provideFluidTheme: wiring.provideFluidTheme
            ? lineAt(configText, wiring.provideFluidTheme.index ?? 0)
            : null,
          shape: wiring.shape,
          size: wiring.size,
          icons: wiring.icons,
          themeOptions: wiring.themeOptions,
          zone: wiring.zone ? lineAt(configText, wiring.zone.index ?? 0) : null,
          provideIcons: wiring.provideIcons
            ? lineAt(configText, wiring.provideIcons.index ?? 0)
            : null,
        }
      : null,
    iconPacks,
    usage: {
      elements: sorted(usage.elements),
      directives: sorted(usage.directives),
      systems: sorted(usage.systems),
      reveal: sorted(usage.reveal),
    },
    durations,
    decisions,
  };
}

const pad = (value, width) => String(value ?? "").padEnd(width);

export function formatStack(stack) {
  const lines = [];
  const { requirements: req } = stack;
  const show = (file) => relative(stack.workspace ?? stack.start, file).split(sep).join("/");
  lines.push(`Fluid Functionalism for Angular — stack read`);
  lines.push(`dir: ${stack.start}`);
  lines.push(`workspace: ${stack.workspace ?? "not found (no angular.json)"}`);
  if (stack.project) {
    lines.push(
      `project: ${stack.project.name} (${stack.project.builder ?? "no build target"}) — ${stack.scanned} source files scanned`,
    );
  } else {
    lines.push("project: none found");
  }
  lines.push("");

  lines.push("REQUIREMENTS");
  const version = (label, item) =>
    lines.push(`  ${pad(label, 26)} ${item.range ?? "missing"}${item.ok === false ? "  *" : ""}`);
  version("@angular/core 22", req.angular);
  version("tailwindcss 4", req.tailwind);
  lines.push(
    `  ${pad(PACKAGE, 26)} ${req.package.range ?? (req.package.alias ? "workspace path alias" : "not declared")}${
      req.package.installed ? ` (installed ${req.package.installed})` : ""
    }${req.package.alias ? `  ${req.package.alias.file ? show(req.package.alias.file) : ""}:${req.package.alias.line}` : ""}`,
  );
  for (const [peer, range] of Object.entries(req.peers)) {
    lines.push(`  ${pad(peer, 26)} ${range ?? "missing"}${range ? "" : "  *"}`);
  }

  lines.push("WIRING");
  lines.push(
    `  ${pad("tailwind import", 26)} ${
      stack.css.tailwind
        ? `yes  ${show(stack.css.tailwind.file)}:${stack.css.tailwind.line}`
        : "missing  *"
    }`,
  );
  lines.push(
    `  ${pad("theme import", 26)} ${
      stack.css.theme
        ? `yes  ${show(stack.css.theme.file)}:${stack.css.theme.line}`
        : "missing  *"
    }`,
  );
  lines.push(
    `  ${pad("library @source", 26)} ${
      stack.css.source
        ? `yes  ${show(stack.css.source.file)}:${stack.css.source.line}  → ${stack.css.source.target}`
        : "missing  * (Tailwind will not emit the package's classes)"
    }`,
  );
  lines.push(
    `  ${pad("Inter weight range", 26)} ${
      stack.css.inter
        ? `${stack.css.inter.weight ?? "none"}  ${show(stack.css.inter.file)}:${stack.css.inter.line}${
            stack.css.inter.url ? `  url ${stack.css.inter.url}` : ""
          }`
        : "no variable Inter @font-face found  *"
    }`,
  );
  if (stack.css.rootAbsoluteFont) {
    lines.push(
      `  ${pad("font paths", 26)} root-absolute /fonts/ in ${stack.css.rootAbsoluteFont
        .split(sep)
        .join("/")} (breaks under a sub-path deploy)`,
    );
  }
  if (stack.config) {
    const file = show(stack.config.file);
    lines.push(
      `  ${pad("provideFluid()", 26)} ${
        stack.config.provideFluid ? `yes  ${file}:${stack.config.provideFluid}` : "missing  *"
      }`,
    );
    if (stack.config.provideFluid) {
      const options = [
        stack.config.shape ? `shape ${stack.config.shape}` : null,
        stack.config.size ? `size ${stack.config.size}` : null,
        stack.config.icons ? `icons ${stack.config.icons}` : null,
      ].filter(Boolean);
      if (options.length) lines.push(`  ${pad("", 26)} options: ${options.join(", ")}`);
    }
    lines.push(
      `  ${pad("provideFluidTheme()", 26)} ${
        stack.config.provideFluidTheme
          ? `yes  ${file}:${stack.config.provideFluidTheme}${
              stack.config.themeOptions ? `  (${stack.config.themeOptions})` : ""
            }`
          : "missing  *"
      }`,
    );
    if (stack.config.provideIcons) {
      lines.push(`  ${pad("provideIcons()", 26)} yes  ${file}:${stack.config.provideIcons}`);
    }
    if (stack.config.zone) {
      lines.push(
        `  ${pad("zone.js", 26)} provideZoneChangeDetection at ${file}:${stack.config.zone} (Angular 22 is zoneless by default)`,
      );
    }
  }
  for (const pack of stack.iconPacks) lines.push(`  ${pad("icon pack", 26)} ${pack}`);
  lines.push("");

  const list = (title, entries, empty) => {
    lines.push(title);
    if (!entries.length) {
      lines.push(`  ${empty}`);
      return;
    }
    for (const entry of entries.slice(0, 12)) {
      lines.push(`  ${pad(entry.name, 24)} × ${String(entry.count).padEnd(4)} ${entry.examples[0]}`);
    }
    if (entries.length > 12) lines.push(`  (+${entries.length - 12} more)`);
  };
  list("PARTS IN USE (elements)", stack.usage.elements, "no ff- elements");
  list("DIRECTIVES / INPUTS", stack.usage.directives, "no ff* attributes");
  list("SYSTEMS ADOPTED", stack.usage.systems, "no library helpers imported");
  list("REVEAL", stack.usage.reveal, "no reveal classes");
  lines.push("");

  lines.push("FACTS");
  if (stack.durations.length) {
    lines.push(`  motion imported beside a hand-written duration: ${stack.durations.join(", ")}`);
  } else {
    lines.push("  no file imports motion with a hand-written duration");
  }
  lines.push(
    `  pdfjs-dist ${req.pdfjs ?? "not declared"}${
      stack.usage.elements.some((e) => e.name === "ff-file-thumbnail")
        ? " (ff-file-thumbnail is in use; the optional peer is needed)"
        : " (only needed by ff-file-thumbnail)"
    }`,
  );
  lines.push("");

  lines.push(
    `DECISIONS ${stack.decisions.length ? `(${stack.decisions.length})` : "(none found)"}`,
  );
  for (const decision of stack.decisions) {
    lines.push(`  ${show(decision.file)}:${decision.line}`);
    for (const row of decision.section.split("\n").slice(1)) {
      if (row.trim()) lines.push(`    ${row.trim()}`);
    }
  }
  lines.push("");
  lines.push(
    "Facts, not advice: read references/stack-audit.md before turning any line into a recommendation.",
  );
  return lines.join("\n");
}

function isMain() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const stack = readStack(args.dir ?? ".");
  if (args.json) console.log(JSON.stringify(stack, null, 2));
  else console.log(formatStack(stack));
}

if (process.argv[1] && isMain()) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
