# Porting guide: React → Angular 22

How a fluid-functionalism component is ported into `projects/fluid-functionalism`. Read this before porting one; the foundations it describes already exist.

## Where things live

| React source | Angular target |
|---|---|
| `registry/base/<name>.tsx` (preferred flavor) + the `registry/default/*` cores it imports | `projects/fluid-functionalism/src/lib/<name>/<name>.ts` (split into more files when it helps) |
| `lib/docs/api/<name>.ts` (props reference) | inputs/outputs with the same names and defaults |
| `tests/<name>*.test.tsx` | `src/lib/<name>/<name>.spec.ts` |
| docs page demos (`app/docs/<name>/page.tsx`) | `projects/showcase/src/app/demos/<name>/<name>.demo.ts` |

Each `src/lib/<name>/index.ts` re-exports the public pieces; `public-api.ts` already exports every component folder. Import foundations relatively (`../core`, `../fluid-hover`, `../merge-split`), never from `fluid-functionalism`.

The Base UI and Radix flavors share one behavior: port it once.

## React → Angular mapping

| React | Angular |
|---|---|
| component + props | standalone component, `input()` / `model()` / `output()`, `ChangeDetectionStrategy.OnPush`, signals only (zoneless) |
| `className` merged with `cn()` | `readonly userClass = input('', { alias: 'class' })` and `host: { '[class]': 'hostClass()' }` with `hostClass = computed(() => cn(base, this.userClass()))` |
| `asChild` / Slot, or a component that renders a native element | attribute selector on the native element: `button[ffButton], a[ffButton]` |
| compound components + context (`Tabs`, `TabsList`, `TabsTrigger`) | one component per part, parent injected by the children (`inject(Tabs)`) or an `InjectionToken` |
| `useState` / `useMemo` / `useEffect` | `signal` / `computed` / `effect` (`afterRenderEffect` for DOM reads) |
| `forwardRef` + `ref` | `ElementRef` on the host; expose methods on the component |
| controlled + uncontrolled value (`value` / `defaultValue` / `onValueChange`) | `model()` (two-way `[(value)]`), plus a `valueChange` that `model` already emits |
| `useShape()` / `useSize(size)` | `injectShape()` / `injectSize(() => this.size())` (signals) |
| `useIcons()["x"]` + `<Icon />` | `<ff-icon name="x" [size]="..." class="..." />` |
| `motion.div` + `spring.fast` | `animate()` from `motion` with `enterTransition(spring.fast)` / `exitTransition(...)` from `../core/motion`; or `injectAnimateFluid()` to honor reduced motion |
| `AnimatePresence` | keep the element until its exit animation's `finished` resolves (see `fluid-hover-highlight.ts`) |
| `useFluidHover` + `FluidHoverHighlight` | `[ffFluidHover]` on the container, `[ffFluidHoverItem]="i"` on rows, `<ff-fluid-hover-highlight [class]="shape().bg" />`; or `createFluidHover()` for custom wiring |
| `useSelectionRuns` + `useMergeSplitBlocks` + `SelectionBackgrounds` | `createSelectionRuns()` + `createMergeSplitBlocks()` + `<ff-selection-backgrounds>` |
| `Elevated offset={2}` | `[ffElevated]="2"` |
| `useTouchPrimary()` / `useKeyboardNavGate(open)` | `injectTouchPrimary()` / `createKeyboardNavGate(open)` |
| Radix / Base UI primitives | `@angular/aria` (accordion, tabs, listbox, menu, combobox, grid, toolbar, tree) and `@angular/cdk` (overlay, a11y focus trap, dialog, portal). Implement ARIA by hand only where neither fits (switch, radio, checkbox, slider). |
| portals | `@angular/cdk/overlay` with the component's `Injector` so DI (shape, size, surface) reaches overlay content |
| `class-variance-authority` | same package, used as-is |

## Rules

- Same visual output: copy class strings verbatim from the React source, including `data-*` state attributes the CSS keys on (`data-state`, `data-side`, `data-disabled`, `data-checked`).
- Same motion: always a spring tier from `../core/springs`; never a hand-written duration.
- Same accessibility: roles, `aria-*`, keyboard behavior and focus rings as the source.
- Tests go through the public component interface (render in a host component, interact with the DOM, assert DOM, emitted outputs and model values). Port the upstream test cases that apply; add one test per rule otherwise. jsdom has no layout: assert on attributes and calls, not pixels.
- Run focused tests from `angular/`: `npx ng test fluid-functionalism --watch=false --include='**/<name>/*.spec.ts'`.
- Do not run `ng build`, `ng serve`, `npm install`, formatters or generators: several ports run in parallel in this workspace.
- English for code, comments, docs and demo copy.

## Gotchas found in tier 1

- **Exits:** TestBed (jsdom) never runs `animate.leave` callbacks, even with animations enabled. Implement exits imperatively (keep the element, run motion, remove on `finished`, plus an `exitFallbackMs` timer) — see `fluid-hover-highlight.ts`, `tabs/layer.ts`.
- **Class order:** host `[class]` and `cn()` reorder tokens. Assert with `classList.contains`, never `className` substrings.
- **CDK overlay in jsdom:** the flexible position strategy reads `document.documentElement.clientWidth/clientHeight` (0 in jsdom): stub them (1024×768) or the overlay flips. `createOverlayRef` defaults to the popover API; pass the component `Injector` so DI reaches overlay content.
- **Mocks:** `vi.mock` cannot intercept modules in the prebundled `@angular/build:unit-test` runner. Put heavy or external dependencies behind an `InjectionToken` seam (see `FILE_THUMBNAIL_PDF_RENDERER`).
- **Provide + consume:** a component that provides a token (e.g. `SizeContext`) must read its parent's with `inject(Token, { skipSelf: true })`; injecting itself throws a circular dependency.
- **Projected content renders once.** To show it in different wrappers, put `<ng-content />` in an `<ng-template>` and render it with `ngTemplateOutlet` in each branch. A second visual copy (bold-label sizers) mirrors text via `MutationObserver`.
- **Projection and DI:** projected content resolves DI from the declaring template, i.e. from the component host's `providers`, not from directives inside the component's own template.
- **`:focus-visible` in jsdom** only matches a scripted focus after a prior `keydown` (Tab). Ring tests must dispatch one first and mock `offsetWidth/offsetHeight` plus wait two rAFs for fluid hover rects.
- **Two-way values:** a user action writes the `model()` and also emits the React-named output (`toggle`, `select`), so `[(x)]` and `[x]` + `(output)` both work; avoid double toggles by emitting before computing from the model.
- **Outputs as clickability:** to know whether a parent bound an output (React's "has onClick"), build it with `outputFromObservable` over a subscriber-counting Observable (see `card.ts`).
- **Type-check demos without `ng build`:** `npx ngc -p <scratch tsconfig>` with `noEmit` and `strictTemplates`, listing only your demo files (drop `baseUrl`), keeps parallel workers from colliding on `dist/`.
- **Reuse ported parts** through relative imports (`../button`, `../tooltip`, `../scroll-area`, `../menu-item`, `../dropdown-search`, `../radio-group`, `../checkbox-group`, `../slider`); never re-implement them.

## Gotchas found in tier 2

- **Output names:** never name an output after a native DOM event (`copy`, `click`, `select`, `toggle` on hosts that contain native inputs): the native event bubbling to the host also fires it. Use `copied`, `cardClick`, etc.
- **Providers for projected content:** tokens that projected children need (`DROPDOWN_CONTEXT`, `SURFACE_LEVEL`, aria's `MENU_COMPONENT` / `LISTBOX`) must be provided on the component host, e.g. with a factory reading a `viewChild` instance; providers on elements inside the component's own template are invisible to projected content.
- **@angular/aria limits (22.2.x):** aria/combobox owns and destroys its deferred popup (cannot hold it for an exit spring); aria/menu has no submenu pointer safe-area and closes a submenu when focus/pointer leave its DOM (nested CDK overlays need capture-phase `focusout`/`mouseout` stops). The dropdown uses underscore members (`_pattern`, `_items`, `listBehavior`); keep any new use of them in one place and covered by tests.
- **Controlled vs model:** where React's controlled-but-ignored state matters (`open` of menus, `value` of select), use `input()` + `output()` instead of `model()` so a bound value always wins.
- **Template refs shadow members:** `#months` in a template hides a component signal named `months` (TS2349). Pick distinct names.
- **`viewChild` at first render:** constructor `effect`s run before required `viewChild` queries resolve; use `afterRenderEffect` when opening an overlay from initial state.
- **`#ref` on `button[ffButton]`** resolves to the `Button` instance; use `viewChild('ref', { read: ElementRef })` for the element.
- **Timing in specs:** never sleep an exact timer duration with real timers; the full suite runs ~45 files in parallel and timers fire late. Poll with `vi.waitFor(..., { timeout })` or use fake timers.
- **`KeyboardEvent.cancelBubble`** resets after dispatch; prove `stopPropagation` by counting events at a document listener.

## Gotchas found in the parity pass (T12)

Check parity with `node scripts/parity/parity.mjs --slug <slug> [--motion]` against `next dev` (root) and the showcase; reports land in `.parity/`.

- **Presence flags:** read a `linkedSignal` "exiting" flag unconditionally. `computed(() => open() || exiting())` never reads `exiting` while open, so at close it has no previous value and the region unmounts instead of animating out.
- **Host display:** custom-element hosts are `display: inline`. A host that stands in for React's root `<div>` needs `display: block` (host style, so its class list stays equal to React's) or `display: contents`, or size classes like `h-56` are ignored.
- **`providers` vs `viewProviders`:** a component's `providers` also reach its own view. Use `viewProviders` when the view must read a different value (e.g. the page surface) than projected content.
- **Framer origin:** framer rewrites a declared `style.transformOrigin` to `50% 50%` once it renders a transform, so React components with a custom origin actually scale about their centre. Port the observed behaviour.
- **Flavor per page:** the slider and tooltip docs pages import `registry/radix/*`; flavored pages follow the site setting (default `base`). Match what the page renders.
- **CDK and `scrollbar-gutter: stable`:** `documentElement.clientWidth` excludes the gutter, so `right`-anchored CDK panes land one gutter width off. Floating UI also rounds to device pixels; CDK keeps fractions.
- **One-frame start lag:** zoneless change detection runs in a `setTimeout`/rAF race after an event; when rAF wins, `motion` work started there begins one frame after React's event-time start. Curves match; accepted.

## Browser checks (T13)

jsdom has no layout, so FLIP moves, springs, measured centring, popup orientation and pointer drag are verified in Chrome against the running showcase:

`node scripts/browser-checks/run.mjs --url http://localhost:4200 [--only <name substring>] [--headed]`

Checks live in `scripts/browser-checks/checks/*.mjs` (`messages`, `popups`, `layout`); each exports `{ name, path, run(page, h) }` and uses `helpers.mjs` (`section`, `sample` per frame, `assert`, `near`, `frames`). A check must be shown to bite — sabotage the page (reduced motion, instant WAAPI, fast clock, ignored `scrollTop`) and watch it fail — and then pass three runs in a row. Add one whenever a fix touches behaviour only the browser can prove.

- **Reduced motion and FLIP:** `animateFluid`'s reduced path paints its jump on the next frame. A FLIP that re-targets on the next mutation stops that jump unlanded and strands the element on its first keyframe, and the following FLIP compounds the offset. Under reduced motion, skip the FLIP instead: React's `layout` animations are transform-based and instant there, so the element is already on its layout box (`chat-message` `watchLayout`).

## Upstream sync (T19)

The React source stays in place so upstream merges keep working; the port drifts unless it follows them.

`git fetch upstream` → `git diff HEAD..upstream/main -- registry app/globals.css registry.json tests` lists what to port. Then read the full new source with `git show upstream/main:<path>` and map it hunk by hunk (the Angular files mirror the React structure closely: `calories.ts` → `calendar.ts`, `*-core.tsx` → the component, `.html` → the template). Not in scope: `app/docs/**`, `lib/docs/**`, `lib/preset/**` and the generated `public/r/**` (the Next docs site, A4); the theme ranges in `app/globals.css` still feed `styles/theme.css`.

Last sync: `1dd8931..3699f84` (2026-10-27): calendar range picking (measured day column, pressed fill, ghost band, masks, weeks height), date-picker two rows for narrow parents, sidebar `--row-h` centring, `fadeIn` on the hover highlight. The browser checks that guard it live in `scripts/browser-checks/checks/calendar.mjs` (week column, pressed fill, ghost fade, pick-start glide), `popups.mjs` (two-row date picker) and `layout.mjs` (sidebar trailing centring).

After a sync: `npx ng test fluid-functionalism --watch=false`, `npx ng build fluid-functionalism`, `npx ng build showcase`, then the browser checks against the running showcase.
