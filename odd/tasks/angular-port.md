# Angular port of fluid-functionalism

Objective: port every fluid-functionalism component to Angular 22 inside `angular/` (library `fluid-functionalism` + `showcase` app), keeping the React/Next source intact for upstream merges.
Branch: `feat/angular-port` · Delivery strategy: single-pr ("Todo junto") · Test runner: `ng test` (Vitest, jsdom) from `angular/`.

## Specs

- **S1** — Fork named "-angular": `angel-r/fluid-functionalism-angular`, upstream remote kept. (Done.)
- **S2** — "portar todos estos componentes a angular 22": every public registry item in `registry.json` (ui, lib, hook, block, CSS-only theme items) gets an Angular 22 equivalent. One implementation per component (the Base UI and Radix flavours share one behavior). Components are standalone, signal-based, zoneless-compatible, prefix `ff`.
- **S3** — Structure chosen by the user: "Workspace Angular al lado (Recommended)": `angular/` holds a publishable library (ng-packagr) and a simple showcase app; React/Next code stays untouched so upstream merges keep working; primitives with `@angular/aria` + `@angular/cdk/overlay`; springs with vanilla `motion`.
- **S4** — Visual and motion parity: the same CSS tokens (`app/globals.css` 24-483 and 950-1533, per-item `css` blobs in `registry.json`), the same spring tiers (`registry/default/lib/springs.ts`), and the same fluid-hover glide behavior.
- **S5** — Behavior tests: port the behavior tests listed in the Log (fluid hover, pick-nearest, banner, button, calendar, checkbox group, command menu, date picker, dropdown keyboard/submenu, touch fields, ...) to Vitest via the public component interface.
- **S6** — The showcase has one route per component with a representative demo.

Assumptions (not requested, revisit if wrong):
- A1: React context providers become DI (`InjectionToken` + `provideFluid()`), React hooks become directives/services; `asChild` becomes attribute selectors or content projection.
- A2: Icons default to lucide via `@lucide/angular` behind an icon-map token; the tabler/phosphor/hugeicons/untitledui packs are ported last and only if an Angular package exists.
- A3: `@daypicker/react` is replaced by a custom calendar grid; Base UI NumberField/ScrollArea by custom implementations.
- A4: The Next docs site (playgrounds, presets, changelog, OG, evals, skill) is out of scope.

## Tasks

| ID | Specs | Scope | Route | Status | Commit |
|----|-------|-------|-------|--------|--------|
| T0 | S1,S3 | Fork, workspace scaffold, root tooling excludes `angular/` | inline | done | 1cc139a |
| T1 | S2,S4 | Theme CSS (tokens, surfaces, type-scale, reveal, utilities, component CSS) + pure libs: cn, springs, font-weight, popup, type-scale, surface-classes, theme service | inline | done | a6d8f85 |
| T2 | S2,A1 | DI foundations: shape/size/surface/icon tokens, `provideFluid`, elevated, touch-primary, keyboard-nav-gate | inline | done | a6d8f85 |
| T3 | S2,S4,S5 | Fluid hover engine + highlight + pick-nearest (+ tests) | inline | done | 76d9f63 |
| T4 | S2,S5 | Merge-split selection backgrounds | inline | done | a89b906 |
| T5 | S2,S5,S6 | Tier 1 components (badge, thinking-indicator, switch, slider, tooltip, button, scroll-area, file-thumbnail, mobile-drawer, carousel-dots, table, card, input-group, radio-group, checkbox-group, accordion, tabs, tabs-subtle, menu-item, dropdown-search) | delegated, parallel writers (disjoint dirs) | in progress | |
| T6 | S2,S5,S6 | Tier 2 (banner, dialog, input-copy, thinking-steps, chat-message, dropdown(-sub), select, combobox, calendar, color-picker, ask-user-questions, sidebar-core) | delegated, parallel writers | todo | |
| T7 | S2,S5,S6 | Tier 3 (sidebar-menu, sidebar, command-menu, date-picker, input-message) | delegated, parallel writers | todo | |
| T8 | S2,S6 | Blocks (queued-stack, sidebar blocks, sidebar-app, dialog-sidebar) | delegated, parallel writers | todo | |
| T9 | S2,A2 | Alternative icon packs | inline | todo | |
| T10 | S3,S6 | README for `angular/`, showcase index, full test + build seam check | inline | todo | |

Route evidence: T5–T8 delegate writers by the parallelism reason (independent components with disjoint `src/lib/<name>/` and `demos/<name>/` surfaces); the parent owns `public-api.ts`, showcase routes, and git.

## Log

- **L1** (2026-10-26, user, verbatim): "Vamos a hacer fork de esto con nombre -angular, y vamos a portar todos estos componentes a angular 22 https://github.com/mickadesign/fluid-functionalism"
- **L2** (2026-10-26, user choice): structure "Workspace Angular al lado (Recommended)".
- **L3** (2026-10-26, user, verbatim): "desactivar rdd para este repo" → ran `gentle-ai review mode disable --scope clone`; native review stays off for this clone.
- **L4** (2026-10-26): map from explorer. 18 dual-flavour components share `registry/default/*` cores; 15 default-only; 7 blocks. Largest: color-picker 2447, slider ~1960, ask-user-questions 1880, calendar 1782, sidebar-core 1660, command-menu 1587, sidebar-menu 1510, date-picker-core 1488, input-message 1407, combobox ~1270. Behavior tests to port: use-fluid-hover-click, pick-nearest, fluid-hover-highlight, sidebar-hover, banner, button-render, calendar, checkbox-group-base, group-focus-ring, color-picker-sync, command-menu, date-picker, dropdown-keyboard, dropdown-submenu, dropdown-inline-shape, omit, touch-fields, type-scale, reveal.
- **L5** (2026-10-26): Engram mirror `odd/angular-port/tasks` pending. Engram resolves from `C:\Users\angel\Documents\Angel` (ambiguous: deporwin, inventarioapi), not from this repository.
- **L6** (2026-10-26): T1+T2 done. `styles/theme.css` = globals.css 3-306, 320-483, 937-1533 (every registry.json css/cssVars entry verified present). Providers → DI: abstract `ShapeContext`/`SizeContext` + `[ffShapeProvider]`/`[ffSizeProvider]` directives + root contexts from `provideFluid()`; `SURFACE_LEVEL` token + `[ffSurface]`/`[ffElevated]`; icons via `FF_ICONS` + `<ff-icon>` over vanilla `lucide` nodes; `ReducedMotion` + `animateFluid()` replaces `MotionConfig reducedMotion="user"`. `omit` dropped (React prop spreading only). Gotcha fixed: `inject()` inside a `linkedSignal` source runs lazily outside the injection context — inject first. Checks: `ng test` 13/13, lib + showcase build, headless screenshot of /foundations OK.
- **L7** (2026-10-26): T3 done. `createFluidHover()` controller (signals) + `[ffFluidHover]` / `[ffFluidHoverItem]` directives + `<ff-fluid-hover-highlight>` (manual AnimatePresence over `motion` keyframes). Gotcha fixed: Angular runs each effect's cleanup right before that effect re-runs (React runs all cleanups first), so a row moving off an index could unregister the new row there; added `unregisterItem(index, element)`. Checks: `ng test` 44/44 (pick-nearest ported verbatim, gap-click / DOM-mark / highlight suites ported), Playwright on system Chrome: highlight glides row 0 → row 2 (y 4 → 81.7 @40ms → 84), no console errors.
- **L8** (2026-10-26, user, verbatim answer to chain strategy): "Todo junto" → delivery strategy `single-pr`.
- **L9** (2026-10-26): T4 done. `createSelectionRuns` (computed with id memo) + `createMergeSplitBlocks` (boundary effects, resolve timers, follow-up rAF) + pure `buildBlocks` + `<ff-selection-backgrounds>` (manual presence; entering blocks use explicit [from, to] keyframes). Checks: `ng test` 52/52, lib build OK.
- **L10** (2026-10-26): T5 launched as 6 parallel writers (button/badge/thinking-indicator/card · slider · tooltip/scroll-area/file-thumbnail/carousel-dots · radio-group/checkbox-group/input-group/switch · accordion/tabs/tabs-subtle · menu-item/dropdown-search/mobile-drawer/table). Trigger: Writer (a) parallelism, disjoint `src/lib/<name>/` + `demos/<name>/` surfaces pre-scaffolded in 1708d92; parent owns public-api, registry, git. Conventions in `angular/PORTING.md` (fc66757). Concurrent focused `ng test --include` runs verified safe.
- **L11** (2026-10-26): T5 group radio-group/checkbox-group/input-group/switch returned: 50/50 focused tests (parent re-ran), surfaces clean. Deviations accepted: no ControlValueAccessor (no @angular/forms peer; signal-forms shape instead); toggles write the `model()` AND emit `toggle`/`select`, so `[(x)]` and `[x]`+output both work; no hidden native radio inputs. Shared internal `radio-group/group-focus.ts` reused by checkbox-group.
- **L12** (2026-10-26): T5 slider returned: 31/31 focused tests (parent re-ran). Compact + comfortable engines, range, steps, click-to-edit, hover tooltip, hand-written ARIA thumbs (`span[role=slider]`). Deviations accepted: host wrapper takes `class`/attrs; keyboard range thumbs clamp at sibling (Radix swaps); `valueChange` only on actual change; uses Angular `animate.enter/leave` + motion springs.
- **L13** (2026-10-26): T5 menu-item/dropdown-search/mobile-drawer/table returned: 78/78 focused tests (parent re-ran). `DROPDOWN_CONTEXT` + `[ffMenuItemRow]` popup hand-off, `[ffDropdownSearchHost]` for the dropdown; drawer on CDK Dialog with component Injector. Follow-up for parent: `<ff-icon>` recreates its svg when size/strokeWidth/class change, so CSS stroke transitions do not tween — fix in core at the seam.
- **L14** (2026-10-26): ff-icon fixed in core (attributes updated in place; RED→GREEN test). T5 button/badge/thinking-indicator/card returned: 56/56 focused tests (parent re-ran). Button is `button[ffButton], a[ffButton]` (no asChild); card clickability = `(cardClick)` bound (outputFromObservable subscriber count); card image projected first; thinking indicator keeps source durations.
