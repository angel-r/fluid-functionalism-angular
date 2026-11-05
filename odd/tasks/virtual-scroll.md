# Virtual scroll (issue #8)

Objective: a signal-based virtual scroll viewport for long lists, dense tables and two-axis grids. Branch `feat/virtual-scroll`; delivery `single-pr` (parent pushes); runner `npx ng test fluid-functionalism --watch=false --include='**/virtual-scroll/*.spec.ts'` plus `scripts/browser-checks`.

## Specs

- S1 — "Only the visible nodes, plus a small buffer, are rendered."
- S2 — "Two-axis virtualization (horizontal and vertical at the same time) for Gantt views and time matrices."
- S3 — "Signal-based, so updating a single cell does not trigger change detection in sibling components (Angular 22)."
- S4 — Design decision (user, option A): an in-house engine, not the CDK viewport (it virtualizes one axis only). Fixed item sizes in v1; variable heights are out of scope. New entry point `@angel-r/fluid-functionalism-angular/virtual-scroll`: `<ff-virtual-scroll>` viewport plus a `*ffVirtualFor` structural directive (`axis: 'y' | 'x'`, `itemSize`), row size measured from the rendered items when `itemSize` is omitted (see L4).
- S5 — Brief: docs page and showcase demo for the new component; `npm run build` and the affected checks pass; commit with `Closes #8`, no push.
- S6 — User (L7): port-only changes appear in the changelog — "sí, hazlo así e incluye #5 y #13". A port source `angular/content/changelog/` in the upstream format, merged by month into `/changelog` and `changelog.md`, entries marked Angular, refs to the port repo; entries for VirtualScroll, #5 and #13.

## Tasks

- [x] T1 — S1-S4 engine + specs (entry point, viewport, directive). Route: inline (no writer trigger). RED: missing symbols; GREEN: 21/21 `virtual-scroll.spec.ts`.
- [x] T2 — S5 docs page, demo, registries, browser check. Route: inline; registry map from one read-only explorer (mapping trigger: >5 lookups across showcase registries). Browser checks 6/6 on :4308. Commit d4a4406.
- [x] T3 — S6 port changelog source. Route: inline. RED: `merge.test.mjs` (module missing); GREEN: 5/5; upstream data byte-identical minus `source`; changelog browser checks 2/2.

## Log

- L1 (2026-11-05, user): "Work GitHub issue #8 of angel-r/fluid-functionalism-angular. Branch: feat/virtual-scroll (already checked out in this worktree). Showcase port: 4308. This issue HAS an open design decision: explore, present it to the user and wait before writing source."
- L2 (2026-11-05): presented A (own signal engine, fixed sizes) vs B (CDK for y + own x). User answered: "a".
- L3: design notes. Views are recycled by slot; each view context exposes `$implicit` / `index` through getters over per-view signals, so a changed item refreshes only its own view. Leading and trailing spacer elements (div, or tr/td inside tables) keep the scroll extent; the directive measures its own start offset (e.g. a table header or a sticky label column) once and on resize.
- L4 (verification): a `tr[ffTableRow]` renders 37px (36px ladder step + 1px collapsed bottom border), so a 36px default drifted. `itemSize` omitted now measures the pitch between two interior rendered items (the first can carry half of a header's collapsed border); the ladder height stands in until measured. Still fixed-size per list (S4).
- L5 (verification): Angular 22 embedded views share the declaring component's reactive consumer (`viewShouldHaveReactiveConsumer` is false for embedded TViews), so a changed item re-runs the declaring template's bindings; OnPush cell components with unchanged inputs are skipped (S3 as worded: "sibling components"). Signal-per-cell read inside an OnPush cell component refreshes that cell alone with no list work. Specs pin both.
- L6: start offsets are measured through the offsetParent chain (scroll-independent, whole px), skipped when the viewport has no layout box. Known limitation: a recycled row loses DOM focus when moved.
- L7 (2026-11-05, user): "ya se que esto es un port pero no deberia igualmente aparecer en los changes logs ?" → proposed a port-only source merged by month (upstream's content/changelog/ syncs from upstream, so writing there would conflict). User: "sí, hazlo así e incluye #5 y #13".
- L8: #5 filed as Updated (bare import keeps working, so not breaking) in 2026-10; #13 and VirtualScroll in 2026-11 (VirtualScroll ref: PR #15). Full browser suite 34/36: the two sidebar peek frame-sampling checks pass alone (2/2) and nothing under the sidebar changed.
