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
| T2 | S3, D2 | inline (scratch copy) | todo | Spike: primary re-exports two secondaries; the bare import still splits |
| T3 | S5 | inline | todo | Export the cross-entry internals from their owning `index.ts` |
| T4 | S2, D1, D4 | inline | todo | `git mv` every folder to the package root and fix config; tests and builds green, still one FESM |
| T5 | S2, S3, S4 | inline | todo | One `ng-package.json` per entry; cross-entry imports by package name; primary re-exports |
| T6 | S6 | inline | todo | `/* @__PURE__ */` annotations |
| T7 | S1, S3, S6, S7 | inline | todo | Probe GREEN plus showcase browser check |
| T8 | S8 | inline | todo | Docs and generator paths |
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
- **Next step:** T1 done, start T2.
