# Secondary entry points (0.1.0)

Objective: split `@angel-r/fluid-functionalism-angular` from one FESM file into Angular Material style secondary entry points: one per component folder, plus `core`. The bare import keeps working, `@defer` and tree shaking stop pulling the whole library into the initial bundle, and the result ships as 0.1.0.
Branch: `feat/secondary-entry-points`, created from `main` at `e593849` (after PR #4, the pdfjs drop) · Delivery strategy: `single-pr` (D6). There is one work-unit commit per task. Push and open one PR to `main` when T9 is green. Do not merge it: the user merges, because the auto-mode classifier blocks agent merges. Tag `v0.1.0` only after the merge · Test runner: `npx ng test fluid-functionalism --watch=false` (Vitest, jsdom) from `angular/`, plus the bundle probe built in T1 (`angular/scripts/bundle-probe/`).

## Specs

- **S1**: the problem as the user's PWA reported it, verbatim: "el bundle es grande y la causa es esta \"Encontré la causa: Fluid se publica en un solo archivo FESM, así que todo lo que importa provideUi() queda en el bundle inicial sin importar cómo diferamos componentes\"". The fix is the user's choice: "vamos a hacer la version 0.1.0 pero ya directamente con la opcion de los entry point tipo angular material". Done means:
  - The built package has one FESM file per entry point.
  - A component used only inside a lazy chunk (`@defer` or a lazy route) is not in the chunk that the app's main bundle loads statically, even when the app eagerly imports something else from the library. This is proven with the T1 probe.
- **S2**: entry points. Every folder that is now under `projects/fluid-functionalism/src/lib/` becomes a secondary entry point named after its folder (D1):
  - `@angel-r/fluid-functionalism-angular/<folder>` for each of the 42 top-level folders:

    accordion, ask-user-questions, badge, banner, button, calendar, card, carousel-dots, chat-message, checkbox-group, color-picker, combobox, command-menu, core, date-picker, dialog, dropdown, dropdown-search, file-thumbnail, fluid-hover, icon-packs, input-copy, input-group, input-message, menu-item, merge-split, mobile-drawer, radio-group, scroll-area, select, sidebar, sidebar-core, sidebar-menu, slider, switch, table, tabs, tabs-subtle, thinking-indicator, thinking-steps, tooltip

    (`blocks` is a parent folder, not an entry.)
  - `@angel-r/fluid-functionalism-angular/blocks/<name>` for `dialog-sidebar`, `queued-stack`, `sidebar` and `sidebar-app`.
- **S3**: the public API does not break. `import { X } from '@angel-r/fluid-functionalism-angular'` keeps working for every symbol that the root exports today:
  - The primary entry re-exports every secondary entry by package name, `export * from '@angel-r/fluid-functionalism-angular/<entry>'` (D2).
  - The showcase's 211 import sites (148 files) all use the bare name and compile **unchanged**.
  - Importing through the bare name must still tree-shake and split per entry (the S1 probe, run through the bare import).
- **S4**: cross-entry code imports other entries **only by package name** (`@angel-r/fluid-functionalism-angular/<entry>`), never by a relative path that leaves its own entry folder. Otherwise ng-packagr inlines a second copy or fails.
  - Every InjectionToken, abstract DI class (`ShapeContext`, `SizeContext`) and `providedIn: 'root'` service exists exactly once in the built output. Check with a grep over `dist/fluid-functionalism/fesm2022/*.mjs`: each `new InjectionToken('<name>')` appears in exactly one file.
- **S5**: internal files that another folder already imports become exports of the entry that owns them (D3):
  - `tabs/layer` (`Layer`, `isFocusVisible`, `provideSizeOverride`, `writeInitialStyles`, `Keyframes`) → from `/tabs`.
  - `radio-group/group-focus` (`createGroupFocus`, `GroupFocusRing`, `focusRowOnPress`, `groupRows`) → from `/radio-group`.
  - `dropdown/popup-overlay` (`createPopupOverlay`) and `dropdown/popup-parts` (`PopupCheckedBackground`, `createPinnedSize`, `createRaisedSurface`) → from `/dropdown`.
  - `chat-message/entrance` (`CHAT_MESSAGE_ENTRANCE_OVERRIDE`) → from `/chat-message`.
  - `input-message/presence` (`createPresenceList`, `PresenceEntry`) and `input-message/input-message.types` → from `/input-message`.
  - `core/overlay` (`fitToOverlayBox`) → from `/core`.
  - `core/lucide-icons` stays internal to core, unless another folder imports it.
  - If a newly exported name collides with an existing root export, the primary `export *` fails to compile. In that case, rename the internal symbol (it was never public) and log it.
- **S6**: module-level calls that keep code alive get `/* @__PURE__ */` annotations, so an unused symbol is dropped inside its own entry:
  - the 58 `perNodeStroke(...)` calls in `icon-packs/hugeicons.ts`;
  - `cva(...)` in badge.ts:39, button.ts:18, combobox-field.ts:32, select.ts:279 and sidebar-menu-button.ts:25;
  - `cn(...)` in combobox-field.ts:62,64 and date-picker-popover.ts:48;
  - `extendTailwindMerge(...)` in utils.ts:8;
  - the IIFEs in calendar.ts:119,140;
  - the other top-level calls in the mapping (Log L4), wherever the call has no observable side effect.

  Line numbers are from `main` at `e593849`, before the move. Keep a `/* @__PURE__ */` only where the call has no side effects. Acceptance: in the T1 probe, importing only `cn` from `/core` keeps no icon pack and no component class.
- **S7**: everything that ships or deploys keeps working:
  - `npx ng test fluid-functionalism --watch=false` (1171+ tests), `npx ng build fluid-functionalism` and `npx ng build showcase` pass. These are the CI steps (`.github/workflows/ci.yml`).
  - `npm run build:showcase` passes, which is the Pages build.
  - In the built showcase, the docs pages render with their Tailwind classes (D4: the `@source` path must follow the move). Check `/`, `/docs/button`, `/docs/input-message` (PDF thumbnail) and `/docs/calendar` in headless Chrome.
  - The `styles/theme.css` asset still ships at `@angel-r/fluid-functionalism-angular/styles/theme.css`.
- **S8**: docs and tooling follow the new layout:
  - `angular/PORTING.md:14`, today "Import foundations relatively (`../core`…), never from `@angel-r/fluid-functionalism-angular`", is rewritten to the S4 rule.
  - Root `README.md:44` (dist layout) and the library README gain a short "Entry points" note. Optional sub-path imports such as `@angel-r/fluid-functionalism-angular/button` are allowed; the bare import is still recommended.
  - `angular/scripts/generate-icon-packs.mjs` writes to the moved paths.
  - `skills/fluid-functionalism-angular/SKILL.md` and `scripts/stack.mjs` are checked. The mapping says both still work with the bare alias (Log L4). Change them only if a check fails.
- **S9**: version 0.1.0. `projects/fluid-functionalism/package.json` `version` becomes `0.1.0`; no 0.0.2 is ever tagged (Log L2). After the user merges, push tag `v0.1.0` and watch `publish.yml`. Release procedure: `angular/PORTING.md` "Releasing and deploys".

## Decisions

- **D1 — layout (Material style).** ng-packagr names a secondary entry after its directory relative to the package root. `src/lib/button` would therefore become `@angel-r/fluid-functionalism-angular/src/lib/button`. So every folder moves with `git mv` from `projects/fluid-functionalism/src/lib/<x>` to `projects/fluid-functionalism/<x>`, and blocks to `projects/fluid-functionalism/blocks/<x>`.
  - Each entry gets `<x>/ng-package.json` with `{ "lib": { "entryFile": "index.ts" } }`.
  - The primary keeps `projects/fluid-functionalism/ng-package.json` and `src/public-api.ts`.
  - No folder is named `src` or `styles`, so neither collides with the existing ones (checked in L4).
- **D2 — primary re-exports secondaries.** The primary `src/public-api.ts` contains only `export * from '@angel-r/fluid-functionalism-angular/<entry>'` lines, in the current order: core first, then the components, then blocks.
  - **Unproven:** that ng-packagr builds a primary that depends on its own secondaries, and that esbuild then still drops and splits per entry through the bare name. T2 proves it before anything moves.
  - **If T2 fails,** stop and record one **Needs your decision**: either keep the bare import as a single FESM (no gain) or make sub-path imports mandatory (breaking). Do not pick one yourself.
- **D3 — internals.** Cross-entry internals are exported from their owning entry (S5). This adds API and breaks nothing. We do not create a new `/internal` entry: the internals depend on their owning folders, and moving them would rewrite more code for no bundle gain.
- **D4 — source resolution.**
  - Root `angular/tsconfig.json` `paths` gains `"@angel-r/fluid-functionalism-angular/*": ["./projects/fluid-functionalism/*"]` next to the existing bare mapping, so the showcase and the tests resolve sub-paths to source. Check this against an `index.ts` per entry: map `/*` to `./projects/fluid-functionalism/*/index.ts` if a directory mapping does not resolve.
  - `tsconfig.lib.json` and `tsconfig.spec.json` `include` widen from `src/**` to the moved folders, with specs still excluded from the lib build.
  - `angular.json` `fluid-functionalism.sourceRoot` (`projects/fluid-functionalism/src`, line 12) changes so the unit-test builder still discovers every spec. Prove it with the same test count before and after T4.
  - Showcase `src/styles.css:24` `@source "../../fluid-functionalism/src"` becomes `@source "../../fluid-functionalism"`. Otherwise Tailwind drops every class that only appears in library templates.
- **D5 — specs.** Specs can keep their relative cross-folder imports: they are excluded from the lib build, and the test bundler dedupes by resolved file, so tokens stay single instances. Rewrite one only when it breaks.
- **D6 — delivery `single-pr`.** A half-split package cannot build or publish, so the change only lands whole.
  - Forecast: about 700 authored changed lines. That is about 46 × 3 lines of `ng-package.json`, about 150 import rewrites, the S6 annotations, config and docs. The moves themselves are renames.
  - Review stays per work-unit commit (one per task) inside one PR. The 400-line slicing heuristic is waived because a slice could not ship on its own. Recorded here so the waiver is visible.
- **Route.** Every task runs inline in one session (there is no parallel unit with a disjoint surface: T4 and T5 touch every folder). The exceptions:
  - T9's long checks (full suite, two builds, Pages build, browser check) may go to one fresh worker.
  - S4 makes this a contract change (high risk, item 3). So one independent verifier reads this whole document and the branch diff from `e593849`, then runs the probe and the checks, after T8 and before the PR.

## Tasks

| ID | Specs | Route | Status | Evidence |
|---|---|---|---|---|
| T1 | S1, S6 | inline | done | `angular/scripts/bundle-probe/probe.mjs` + `npm run probe:bundle`; baseline (a) 53.5 / 63.8 / 74.1 / 950.9 KB, (b) one 152.5 KB chunk with `ff-calendar` imported statically by main (RED) |
| T2 | S3, D2 | inline (scratch copy) | done | Spike in `dist/.spike` (never committed): ng-packagr 22.2 builds a primary that re-exports two secondaries; the bare import still splits (16.5 KB static core, 8.6 KB lazy button) — D2 holds |
| T3 | S5 | inline | done | 266 cross-entry imports in 112 files (221 by the codemod, 45 in the primary) now go through the folder `index.ts`; the S5 internals are exported from their entry; 1171 tests, lib and showcase builds green |
| T4 | S2, D1, D4 | inline | done | 43 folders `git mv`'d to the package root; primary entry moved to `public-api.ts` (L8); tests 1171 (same count), lib and showcase builds green, still one FESM |
| T5 | S2, S3, S4 | inline | done | 45 secondary entries (41 folders + 4 blocks) with `ng-package.json`; 266 cross-entry imports by package name; primary FESM is 45 re-exports; dist 46 `.mjs`, 28 tokens, 0 duplicates |
| T6 | S6 | inline | done | 57 `perNodeStroke` (generated), 5 `cva`, 3 `cn`, `extendTailwindMerge`, 2 calendar IIFEs annotated; probe asserts `cn` keeps no icon pack and no component; 1171 tests |
| T7 | S1, S3, S6, S7 | inline | done | Probe GREEN for bare and sub-paths; real showcase: `main`'s static closure has no `ff-calendar`; `/`, `/docs/button`, `/docs/input-message`, `/docs/calendar` render with classes and no console errors |
| T8 | S8 | inline | done | PORTING target paths and the S4 import rule, entry-points notes in both READMEs, generator writes the moved paths and its output is byte-identical, `stack.mjs` still reads the workspace |
| T9 | S7, S9 | inline, then verifier | todo | Version 0.1.0, independent verification, PR; after the user merges, tag and publish |

### Task notes

- **T1.** Write `angular/scripts/bundle-probe/probe.mjs` plus an `npm run probe:bundle` script. It must use the real Angular pipeline, not plain esbuild: plain esbuild without the linker overstates the cost (it keeps 1.22 MB for `cn` alone, against 55 KB with the linker; L3). Steps:
  1. `await initializeHash()` from `@angular/build/src/utils/hash.js`. `JavaScriptTransformer` throws without it.
  2. Run `JavaScriptTransformer` from `@angular/build/private` with `{ sourcemap: false, thirdPartySourcemaps: false, advancedOptimizations: true, jit: false }` over every `dist/fluid-functionalism/fesm2022/*.mjs`. Resolve `@angular/build` from `angular/`.
  3. Bundle with esbuild (`node_modules/esbuild`), using `bundle`, `splitting`, `minify`, `format: 'esm'`, define `ngDevMode=false` and `ngJitMode=false`, and the third-party packages marked external. Resolve the package name and its sub-paths to the transformed files through a plugin.
  4. Report two scenarios:
     - (a) the byte size of the library code when the entry imports only `cn`, then `provideFluid`, then `provideFluid` + `Button`, then everything;
     - (b) splitting: `main` imports `provideFluid` and dynamically imports a module that imports `Calendar`. Print each output chunk, and fail (exit 1) when the chunk that `main` imports statically contains `ff-calendar`.

  Run (b) once with the bare import and once with sub-paths. Baseline on `main` at `e593849`: (a) 55 KB / 65 KB / 76 KB / 974 KB; (b) one shared chunk of 156 KB that contains Calendar. Commit the probe; the failing (b) is the RED evidence.
- **T2.** Work in a `mktemp -d` copy of `angular/projects/fluid-functionalism` plus a minimal workspace, never in the repo. Move only `core` and `button` into secondary entries, with a primary that re-exports both by package name. `ng build` it and run the probe's (b) through the bare name. Record the result in the Log. If it fails, apply D2's stop rule.
- **T3.** Each new export goes to the owning `index.ts`. Rewrite each importer to the folder `index` (`../tabs`, not `../tabs/layer`), still relatively; T5 turns these into package names.
- **T4.** A move only. Sibling relative imports (`../core/utils`) still resolve, because every folder moves to the same parent. Update `src/public-api.ts` paths (`../<x>`), the D4 config and the generator paths. Gate: the test count equals the pre-move count, the lib and showcase builds pass, and `git diff -M --stat` shows renames.
- **T5.**
  - Add the 46 `ng-package.json` files.
  - Replace every production relative import that leaves its entry folder with `@angel-r/fluid-functionalism-angular/<entry>`. Inside an entry, relative imports stay.
  - Rewrite `src/public-api.ts` per D2.
  - Gate: `ng build fluid-functionalism` lists every entry, and `dist/fluid-functionalism/fesm2022/` holds one `.mjs` per entry plus the primary. Check S4 with the grep.
  - Leave `allowedNonPeerDependencies` alone unless the build asks.
- **T6.** Annotate per S6. Re-run the full suite.
- **T7.**
  - The probe must pass. Record the (a) and (b) numbers next to the baseline, for both the bare import and the sub-paths.
  - Build the showcase. Serve `dist/showcase/browser` with a small static server on a free port (check it is free first: port 4310 is taken by another app on this machine). Check the S7 pages in headless Chrome with `playwright-core` from the repo root, `chromium.launch({ channel: 'chrome' })`: the page renders, the classes apply, and the PDF thumbnail draws.
- **T8.** S8 docs. Run `node angular/scripts/generate-icon-packs.mjs` (or its npm script) and confirm the output is byte-identical.
- **T9.**
  - Bump to 0.1.0.
  - Run CI's three commands plus `npm run build:showcase`.
  - Launch the independent verifier (Route).
  - Push with `gh` and **always `--repo angel-r/fluid-functionalism-angular`**: the default gh repo is the upstream React repo.
  - Open the PR and stop.
  - After the user says it is merged: `git checkout main && git pull`, then `git tag v0.1.0 && git push origin v0.1.0`, then watch the `publish.yml` run (`gh run watch --repo angel-r/fluid-functionalism-angular`). Confirm `npm view @angel-r/fluid-functionalism-angular version` returns `0.1.0`.

## Log

- **L1** (2026-10-28, user, verbatim): "Mmm vamos a hacer la version 0.1.0 pero ya directamente con la opcion de los entry point tipo angular material, planifica el odd muy bien asi otro agente toma la tarea . Posdata voy a mergear el drop de pdfjs asi ya queda en main"
- **L2** (2026-10-28): PR #4 (pdfjs drop, version 0.0.2 in `package.json`) is merged to `main` as `e593849`. Tag `v0.0.2` was never pushed and must not be: 0.1.0 ships both changes. Earlier user report, verbatim: "hay una cosa mas que me tira la app de pwa el bundle es grande y la causa es esta \"Encontré la causa: Fluid se publica en un solo archivo FESM, así que todo lo que importa provideUi() queda en el bundle inicial sin importar cómo diferamos componentes\"".
- **L3** (2026-10-28, evidence; scratch harness, not committed): the claim holds.
  - Splitting: esbuild assigns code to chunks per module. With `main` importing `provideFluid` and a lazy chunk importing `Calendar`, esbuild emits one shared 156 KB chunk that contains Calendar and that `main` imports statically.
  - Tree shaking: through Angular's linker plus advanced optimizations, it works per symbol (`cn` 55 KB, `provideFluid` 65 KB, plus `Button` 76 KB, everything 974 KB, minified, library code only).
  - The `cn` floor is `hugeiconsIcons`: 53 KB unminified, kept because of the unannotated `perNodeStroke(...)` calls. Hence S6.
- **L4** (2026-10-28, mapping by a read-only explorer, at `e593849`):
  - **Graph:** 46 folders, no import cycles. `core` and `fluid-hover` are the leaves; `blocks/sidebar-app` is the deepest. Folder → deps (all also depend on core):
    - accordion → fluid-hover, tabs
    - ask-user-questions → button, fluid-hover, merge-split, radio-group
    - banner → button
    - calendar → button, fluid-hover, tabs, tooltip
    - card, carousel-dots, input-group, menu-item, merge-split, radio-group, sidebar-menu, table, tabs → fluid-hover
    - chat-message → file-thumbnail
    - checkbox-group → fluid-hover, merge-split, radio-group
    - color-picker → fluid-hover, slider, tooltip
    - combobox → fluid-hover, merge-split, scroll-area
    - command-menu → dialog, fluid-hover, scroll-area, tabs, tabs-subtle
    - date-picker → calendar, dropdown, fluid-hover, scroll-area
    - dialog → button
    - dropdown → dropdown-search, fluid-hover, menu-item, merge-split, radio-group, scroll-area
    - input-copy → tooltip
    - input-message → button, file-thumbnail, fluid-hover, tabs, tooltip
    - select → dropdown, fluid-hover, radio-group, scroll-area
    - sidebar → scroll-area, sidebar-core
    - sidebar-core → button, tooltip
    - tabs-subtle → fluid-hover, tabs
    - thinking-steps → badge, tabs
    - blocks/dialog-sidebar → button, dialog, input-group, scroll-area, select, sidebar, sidebar-core, sidebar-menu, switch
    - blocks/queued-stack → chat-message, file-thumbnail, input-message, tooltip
    - blocks/sidebar → dropdown, sidebar-core, sidebar-menu
    - blocks/sidebar-app → blocks/sidebar, menu-item, sidebar, sidebar-core, sidebar-menu, tooltip
    - Every other folder depends on core only (fluid-hover depends on nothing).
  - **Internal deep imports:** listed in S5 (spot-checked: `tabs/index.ts` exports only `Tabs, TabsList, TabItem, TabPanel`).
  - **Tokens:** `DROPDOWN_CONTEXT` is defined in `menu-item.ts:102` and consumed by dropdown. That is fine, since dropdown already depends on menu-item. 28 InjectionTokens in total.
  - **Showcase:** 211 import sites in 148 files, all by the bare name. `tsconfig.json:8` maps the bare name to `./projects/fluid-functionalism/src/public-api.ts`.
  - **CI:** `ci.yml` runs the test, lib build and showcase build. `publish.yml` checks the tag matches the version, runs the tests and lib build, and publishes from `angular/dist/fluid-functionalism`; it must keep its file name (npm trusted publishing). `pages.yml` runs `npm run build:showcase`.
  - **Not in scope, noted only:** `rxjs` is imported by 5 lib files but is not a peer dependency. `color-picker/popup-overlay.ts` duplicates the dropdown one.
- **L5** (2026-10-28, T1): `angular/scripts/bundle-probe/probe.mjs`, run by `npm run probe:bundle` (it builds the lib first). It transforms every `dist/fluid-functionalism/**/fesm2022/*.mjs` with `JavaScriptTransformer({ advancedOptimizations: true, jit: false })` and bundles with esbuild 0.28.2 (minify, splitting, `ngDevMode=false`, third-party external). It discovers entry points from the dist manifest `exports`, so it works before and after the split.
  - Baseline at `e593849` (RED): (a) `cn` 53.5 KB, `provideFluid` 63.8 KB, `provideFluid` + `Button` 74.1 KB, everything 950.9 KB. (b) main imports one 152.5 KB chunk that contains `ff-calendar`; the lazy chunk is 0.1 KB and re-imports that same chunk. Exit 1.
  - The numbers sit ~2% under L3's (55 / 65 / 76 / 974 / 156 KB). Same harness shape, different esbuild/linker build; T7 compares with these, not with L3's.
  - The sub-path runs (a and b) auto-skip while the package has no secondary entries; they activate in T5/T7.
- **L6** (2026-10-28, T2): D2 holds. Spike = a copy of `core` + `button` under `angular/dist/.spike/t2` (gitignored, removed afterwards), each with `ng-package.json`, a primary `src/public-api.ts` of two `export * from '@angel-r/fluid-functionalism-angular/<entry>'` lines, and the D4 `paths` mapping in a `tsconfig.lib.json`. Built with `npx ng-packagr -p … -c …` (2.6 s).
  - ng-packagr orders the graph itself: core, then button, then the primary. The primary FESM is the two re-export lines verbatim; the button FESM imports `{ Icon, cn, injectShape, injectSizeVariant }` from `@angel-r/fluid-functionalism-angular/core`. The dist manifest gains `./core` and `./button` export keys.
  - Bare import still splits: main keeps a 16.5 KB static chunk (core), Button lands in an 8.6 KB lazy chunk. Sub-paths give the same chunks. Sizes: `cn` 3.3 KB, `provideFluid` 13.5 KB, `+ Button` 25.0 KB, everything 34.6 KB.
  - **Probe fix found by the spike:** my plugin resolves library files by path, so esbuild never read the manifest and kept the primary's unused re-export as a side-effectful import — the bare run looked broken. The plugin now forwards `sideEffects` from the dist manifest (`sideEffects: false`). Real bundlers read that field from `node_modules`, so this matches reality; T7 re-checks it with the real showcase build. The unsplit baseline still reports RED (152.5 KB static chunk).
  - Learned for T5: the spike's secondary entry needs no `allowedNonPeerDependencies`; only the primary's `ng-package.json` carries it.
- **L7** (2026-10-28, T3): deep cross-folder imports are gone.
  - 573 import specifiers in 111 production files rewritten from `<rel>/<folder>/<file>` to `<rel>/<folder>` (codemod over the TS AST, spec files untouched per D5), plus the 45 re-export lines in `public-api.ts` in T5: 266 cross-entry specifiers in 112 files, as the verifier counted. The blocks files use `../../<folder>` and keep it: `src/lib/blocks/x` and `<pkg>/blocks/x` are both two levels from the package root.
  - A file could import up to 11 separate symbols from `core` through different deep paths, so 381 duplicate same-module declarations were merged into one (prettier style, 100 columns). Merges never crossed a comment between the declarations.
  - New exports, all from the S5 list: `/tabs` → `Layer, isFocusVisible, provideSizeOverride, writeInitialStyles, Keyframes`; `/radio-group` → `createGroupFocus, GroupFocusRing, focusRowOnPress, groupRows`; `/dropdown` → `createPopupOverlay, PopupCheckedBackground, createPinnedSize, createRaisedSurface` plus the overlay types the importers need (`PopupAlign`, `PopupPlacement`, `PopupOverlay`, `PopupOverlayOptions` — `Dropdown*` aliases stay as they were); `/chat-message` → `CHAT_MESSAGE_ENTRANCE_OVERRIDE, ChatMessageEntranceOverride`; `/input-message` → `createPresenceList, PresenceEntry`; `/core` → `overlay` (`fitToOverlayBox`).
  - No name collisions: the lib build, the showcase build and the 1171 tests pass. `core/lucide-icons` is still internal; nothing outside core imports it.
  - Two type errors in the first build (`'strategy' is possibly null`, `Parameter implicitly has an 'any' type`) were cascades from the missing `fitToOverlayBox` import and disappeared with it.
- **L8** (2026-10-28, T4): the move, plus one deviation from D1.
  - `git mv src/lib/<x> src/lib/blocks → <pkg>/<x>`, `<pkg>/blocks` for all 43 folders. `git diff -M` shows 236 renames.
  - **Deviation:** the primary entry moved from `src/public-api.ts` to `public-api.ts` at the package root, and `ng-package.json` `lib.entryFile` follows. ng-packagr forces `rootDir` to `dirname(entryFilePath)` for every entry point (`ng-packagr/src/lib/ts/tsconfig.js`, `initializeTsConfig`), so keeping the entry in `src/` fails with TS6059 on every moved file. Angular Material has the same shape: its entry file sits next to the component folders. D1's "the primary keeps `src/public-api.ts`" was wrong on this point; the rest of D1 holds.
  - Config: `tsconfig.lib.json` `include: ["**/*.ts"]`; `tsconfig.spec.json` `include: ["**/*.d.ts", "**/*.spec.ts"]`; root `tsconfig.json` bare path → `./projects/fluid-functionalism/public-api.ts` and new `/*` → `./projects/fluid-functionalism/*`; `angular.json` `sourceRoot` → `projects/fluid-functionalism`; showcase `styles.css` `@source "../../fluid-functionalism"`; the generator writes `icon-packs/` and `core/lucide-icons.ts`.
  - Gate: 1171 tests in 61 files (same count as before the move), lib build emits a single FESM, showcase build passes. The Tailwind scan still sees library-only classes: `backdrop-blur-sm` (only in `card.ts`) is in the built `styles-*.css`.
- **L9** (2026-10-28, T5): the package is split.
  - 45 secondary entries, not 46: S2 miscounts the top-level folders (its list has 41; `blocks` and `styles` are not entries). 41 + 4 = 45 secondaries, plus the primary, so `dist/fluid-functionalism` holds 46 `.mjs` files and 46 bundled `.d.ts`. Each secondary has `{ "lib": { "entryFile": "index.ts" } }`; the primary keeps `allowedNonPeerDependencies` (the build never asked for a change).
  - 221 import specifiers in 111 production files rewritten from a relative path to `@angel-r/fluid-functionalism-angular/<entry>`. No relative import leaves its entry folder any more; specs keep relative imports (D5).
  - The primary FESM is the 45 `export * from '@angel-r/fluid-functionalism-angular/<entry>'` lines, in the old order.
  - S4 check over the 46 `.mjs`: 28 `new InjectionToken(…)`, each in exactly one file; `class ShapeContext` and `class SizeContext` only in the core FESM; the four `providedIn: 'root'` services (`ThemeService`, `TouchPrimary`, `ReducedMotion`, `QueuedStackMorphRegistry`) each in one file.
  - Gate: `ng build fluid-functionalism` lists every entry, 1171 tests pass, `ng build showcase` passes and emits the same CSS hash as before the split (`styles-I42FRRZG.css`), so Tailwind sees the same classes.
  - The probe is GREEN here already: `cn` 3.3 KB (was 53.5), `provideFluid` 13.5 KB (63.8), `provideFluid` + `Button` 25.1 KB (74.1), everything 969.4 KB (950.9 — the entry wrappers cost ~2%). Splitting: `main` statically imports an 18.8 KB chunk; Calendar lives in an 87.7 KB lazy chunk, for the bare import and for sub-paths.
  - One test run reported 1 of 1171 failing; the next three runs (same tree) were 61/61 files and 1171/1171 tests. The failing run's output was not captured, so the name is unknown; keep an eye on it in T7/T9.
- **L10** (2026-10-28, T6): `/* @__PURE__ */` on every module-level call that has no observable side effect.
  - 57 `perNodeStroke(...)` calls, added in `generate-icon-packs.mjs` (not by hand: the file is generated), then regenerated. S6 says 58; the generator reports 57 slots, so 57.
  - `cva(...)` in badge, button, combobox-field, select, sidebar-menu-button; `cn(...)` in combobox-field (2) and date-picker-popover; `extendTailwindMerge(...)` in core/utils; the 2 calendar mask IIFEs. Deliberately left alone: `inject`/`signal`/`computed` (DI and signal registration are the side effect), `Promise.reject`, `clipboard.writeText`, and pure arithmetic helpers (`Math.*`, `Object.keys`) where the annotation buys nothing.
  - The annotations survive the build: icon-packs FESM 57, calendar 6, combobox 7, core 2, badge 1.
  - The probe now asserts S6, not just prints sizes: the `cn` bundle must contain no pack glyph and no `ff-` selector, with positive controls (provideFluid must keep a pack glyph, `everything` must keep selectors) so a broken detector cannot report green. `cn` keeps 3.3 KB, "no icon pack, no component".
  - The generator also emits `@angel-r/fluid-functionalism-angular/core` for its imports now (S4); the regeneration changed only hugeicons.ts (57 lines) and left tabler, phosphor, untitledui, lucide-icons and index.ts byte-identical.
- **L11** (2026-10-28, T7): GREEN, measured on the real pipeline and the real app.
  - Probe (`npm run probe:bundle`, bare / sub-paths identical): `cn` 3.3 KB (baseline 53.5), `provideFluid` 13.3 KB (63.8), `+ Button` 25.1 KB (74.1), everything 969.4 KB (950.9, +2%: the 46 entry wrappers and per-entry module ceremony; the library's own 46 FESMs total 1895 KB unminified). `cn` keeps no icon pack and no component. Splitting: main's static chunk 18.8 KB; Calendar lives only in the 87.7 KB lazy chunk, through the bare name and through `/calendar`.
  - Real app (`npm run build:showcase`): the built showcase has lazy routes (`loadComponent` on every page) and `provideFluid` eagerly. `index.html` loads `main-XDBTEEQR.js`, whose static import closure is 16 files / 994 KB and contains no `ff-calendar`. The calendar code sits in the lazy page chunks (e.g. 50.9 KB, 37.1 KB). This is S1 on a real app, not only in the probe.
  - Browser (headless Chrome via `playwright-core`, `channel: 'chrome'`, static server on 4317; 4310 is taken): `/` renders 2412 nodes, `--background` resolves, Inter loads, nav links work; `/docs/button` 19 `button[ffButton]`, heights exactly 28 and 36px (the ladder), 8px radius, flex layout; `/docs/input-message` the PDF attachment draws a 160×207 data-URL thumbnail with `object-cover`; `/docs/calendar` 544px wide, 4 grid containers, 63 day buttons. No console errors on any page.
- **L12** (2026-10-28, T8): docs follow the layout.
  - `angular/PORTING.md`: the target paths are `<name>/<name>.ts` and `<name>/<name>.spec.ts`, and the import rule is now S4 in prose: relative inside an entry, package name across entries, with the reason (ng-packagr inlines a second copy or fails).
  - Entry points section in `angular/projects/fluid-functionalism/README.md` (the npm README) and a short paragraph in the root `README.md`: the bare import stays recommended, sub-paths (`/calendar`, `/core`, `/blocks/sidebar`) are allowed, both split.
  - `CONTRIBUTING.md` and the skill's source path (`projects/fluid-functionalism/<folder>/**`); `angular/README.md` states the sub-path alias and the per-entry FESM layout.
  - `node angular/scripts/generate-icon-packs.mjs` leaves the tree unchanged (byte-identical output for all five packs, `index.ts` and `core/lucide-icons.ts`).
  - `node skills/fluid-functionalism-angular/scripts/stack.mjs angular` still reads the workspace: alias at `tsconfig.json:8`, `@source "../../fluid-functionalism"` at `styles.css:24`, `provideFluid()` wired. No change needed there.
- **L13** (2026-10-28, T9): independent verification, and what it changed.
  - A fresh verifier (separate agent, read-only) read this document and `e593849..HEAD`, then re-ran everything: tests 1171/1171 twice, `ng build fluid-functionalism` (46 entry builds), `ng build showcase`, `npm run build:showcase` (43 site files), `npm run probe:bundle` GREEN with the same numbers, its own static-closure check of `dist/showcase/browser` (16 files, no `ff-calendar`), and its own headless-Chrome pass over the four pages. PASS on S2–S6 and S9; findings below.
  - **Fixed, docs:** `PORTING.md` contradicted itself after my rewrite — lines 31, 44 and 64 still told the reader to import `../core/motion`, `../core/springs` and to "reuse ported parts through relative imports (`../button`, …)`. All three now use the package name; the "reuse" rule adds that a spec may keep a relative import because tests are outside the library build.
  - **Fixed, probe:** `splitting()` graded `ok: staticHasSymbol === false`, so a run where the lazy symbol was never emitted printed PASS ("was not emitted at all"). It now also requires `lazyHasSymbol`; `--lazy-marker zzz-not-there` exits 1 and the real run exits 0.
  - **Fixed, counts:** 266 cross-entry specifiers in 112 files (the codemod did 221; the primary's 45 re-export lines were rewritten separately), and S8's "Root `README.md:44`" does not exist — the note is at `README.md:56`.
  - **Open finding, not fixed: the showcase initial bundle grew.** `main` at `e593849` builds 1.07 MB initial (267.69 kB transfer); the branch builds 1.15 MB (285.84 kB), so the Pages build now prints `bundle initial exceeded maximum budget … by 51.78 kB` (warning; error budget 1.5 MB, build exits 0). Cause: the showcase compiles the library from source through the `paths` alias, so a cross-entry import lands on the entry's `index.ts` barrel and esbuild keeps the sibling modules it re-exports; the published FESMs do not have this problem (the probe is GREEN and the dist manifest declares `sideEffects: false`). Bounded experiment: importing `select`'s two dropdown helpers from `dropdown/popup-overlay` and `dropdown/popup-parts` instead of `@angel-r/fluid-functionalism-angular/dropdown` brings the same build to 1.09 MB, which confirms the barrel. Tried, no effect: `sideEffects: false` in the library manifest and in the workspace manifest. Candidate fixes (out of scope): point the sub-path alias at the built `dist` (the showcase then needs a library build) or raise the budget. The PR says so; the package's own behaviour is unaffected.
  - Pre-existing, unchanged (verifier): `allowedNonPeerDependencies` lists `lucide`, which no production file imports; `rxjs` is imported by five files but declared nowhere (also L4).
- **Next step:** T9 — push and open the PR.
