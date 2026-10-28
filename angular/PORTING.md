# Porting guide: React → Angular 22

How a fluid-functionalism component is ported into `projects/fluid-functionalism`. Read this before porting one; the foundations it describes already exist.

## Where things live

| React source | Angular target |
|---|---|
| `registry/base/<name>.tsx` (preferred flavor) + the `registry/default/*` cores it imports | `projects/fluid-functionalism/<name>/<name>.ts` (split into more files when it helps) |
| `lib/docs/api/<name>.ts` (props reference) | inputs/outputs with the same names and defaults |
| `tests/<name>*.test.tsx` | `<name>/<name>.spec.ts` |
| docs page demos (`app/docs/<name>/page.tsx`) | `projects/showcase/src/app/demos/<name>/<name>.demo.ts` |

Every folder at the package root is its own entry point, so `<name>/index.ts` re-exports the pieces other entries may use, and `public-api.ts` re-exports every entry by package name. Inside an entry, import relatively (`./x`). Code in one entry that needs another imports it by package name — `@angel-r/fluid-functionalism-angular/core`, `@angel-r/fluid-functionalism-angular/fluid-hover` — never by a relative path that leaves its own folder: ng-packagr would inline a second copy, or fail. A piece another entry needs that is not exported yet belongs in the owning `index.ts`.

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
| `motion.div` + `spring.fast` | `animate()` from `motion` with `enterTransition(spring.fast)` / `exitTransition(...)` from `@angel-r/fluid-functionalism-angular/core`; or `injectAnimateFluid()` to honor reduced motion |
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
- Same motion: always a spring tier from `@angel-r/fluid-functionalism-angular/core` (`spring`); never a hand-written duration.
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
- **Reuse ported parts** from their entry (`@angel-r/fluid-functionalism-angular/button`, `/tooltip`, `/scroll-area`, `/menu-item`, `/dropdown-search`, `/radio-group`, `/checkbox-group`, `/slider`); never re-implement them. A spec next to the component may keep a relative import, since tests are not part of the library build.

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

## The docs site

`projects/showcase` is the Angular docs site, deployed to
https://angel-r.github.io/fluid-functionalism-angular/ (the Next site at the
repo root is the reference, D1-D10 in `odd/tasks/docs-site.md`). Its shape:

| Folder | What lives there |
|---|---|
| `src/app/site/` | The `ff_*` settings (localStorage + the pre-paint script in `index.html`), the heading font and its Google Fonts catalog, the icon packs, the toast, the right-rail portal, the nav and command-menu tables, the install prompts, and the changelog build data. |
| `src/app/shell/` | The chrome: sidebar (1280px sheet), right panel, site command menu, 404. `app.ts` renders it and the router outlet. |
| `src/app/docs-kit/` | `DocPage`, `ComponentPreview` (tabs, shiki, inspect overlay, header action slot), `PropsTable`, the playground primitives, the preset codec and Share dialog, and `api/` with every page's props tables. |
| `src/app/pages/` | One folder per route: `home/`, `intro/`, `changelog/`, `demo/`, `docs/<slug>/`. |
| `scripts/changelog/` | `content/changelog/*.md` → `src/app/data/changelog.generated.ts`. `npm run build:showcase` runs it first. |

Rules that keep it coherent:

- `app.routes.ts` owns every route; a page module default-exports its
  component (`pages/docs/<slug>/<slug>.page.ts`), so a route only names the
  import. Nav tables live in `site/nav-data.ts`, one place.
- Content is Angular (S8): snippets, install prompts and copy use
  `@angel-r/fluid-functionalism-angular`, `provideFluid()` and the `ff-`
  components, never `npx shadcn` or React imports.
- Classes, copy and motion come from the React page verbatim; a page's
  sections, previews and API table follow the reference's order.
- Settings live in localStorage under the original `ff_*` keys; the pre-paint
  script, `SiteSettingsService` and `HeadingFontService` must agree.

## Browser checks (T13)

jsdom has no layout, so FLIP moves, springs, measured centring, popup orientation and pointer drag are verified in Chrome against the running showcase:

`node scripts/browser-checks/run.mjs --url http://localhost:4200 [--only <name substring>] [--headed]`

Checks live in `scripts/browser-checks/checks/*.mjs` (`messages`, `popups`, `layout`); each exports `{ name, path, run(page, h) }` and uses `helpers.mjs` (`section`, `sample` per frame, `assert`, `near`, `frames`). A check must be shown to bite — sabotage the page (reduced motion, instant WAAPI, fast clock, ignored `scrollTop`) and watch it fail — and then pass three runs in a row. Add one whenever a fix touches behaviour only the browser can prove.

- **Reduced motion and FLIP:** `animateFluid`'s reduced path paints its jump on the next frame. A FLIP that re-targets on the next mutation stops that jump unlanded and strands the element on its first keyframe, and the following FLIP compounds the offset. Under reduced motion, skip the FLIP instead: React's `layout` animations are transform-based and instant there, so the element is already on its layout box (`chat-message` `watchLayout`).

## Upstream sync (T19)

The React source stays in place so upstream merges keep working; the port drifts unless it follows them.

`git fetch upstream` → `git diff HEAD..upstream/main -- registry app/globals.css registry.json tests` lists what to port. Then read the full new source with `git show upstream/main:<path>` and map it hunk by hunk (the Angular files mirror the React structure closely: `calories.ts` → `calendar.ts`, `*-core.tsx` → the component, `.html` → the template). The docs site is in scope too, since `projects/showcase` reproduces it (see "The docs site" below): follow `app/docs/**`, `lib/docs/**`, `lib/preset/**` and `lib/changelog/**` changes into the showcase, mapping `app/docs/<slug>/page.tsx` → `pages/docs/<slug>/`, `lib/docs/playgrounds/<slug>.tsx` → the page's playground, `lib/docs/api/<slug>.ts` → `docs-kit/api/<slug>.ts`, and `lib/preset/<slug>-options.ts` → the page's preset. `app/globals.css` still feeds `styles/theme.css` for the library and `projects/showcase/src/styles.css` for the site-only part (heading font, section 7). The generated `public/r/**` stays out: it is the shadcn registry, which does not exist here.

Last sync: `1dd8931..3699f84` (2026-10-27): calendar range picking (measured day column, pressed fill, ghost band, masks, weeks height), date-picker two rows for narrow parents, sidebar `--row-h` centring, `fadeIn` on the hover highlight. The browser checks that guard it live in `scripts/browser-checks/checks/calendar.mjs` (week column, pressed fill, ghost fade, pick-start glide), `popups.mjs` (two-row date picker) and `layout.mjs` (sidebar trailing centring).

These files at the root belong to the fork and describe the Angular port, so a merge from upstream keeps our side (`git checkout --ours <path>`): `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE` and everything under `.github/`. Read upstream's change to them first, in case it carries something the port should copy.

After a sync: `npx ng test fluid-functionalism --watch=false`, `npx ng build fluid-functionalism`, `npx ng build showcase`, then the browser checks against the running showcase.

## Releasing and deploys

- **npm:** the library is `@angel-r/fluid-functionalism-angular`. Release by bumping `version` in `projects/fluid-functionalism/package.json`, committing, and pushing a tag `v<version>` (`git tag v0.1.0 && git push origin v0.1.0`). `.github/workflows/publish.yml` checks the tag matches the version, runs the tests, builds and publishes with npm trusted publishing (OIDC, no token). The tag must name a version that is not on npm yet (`npm view @angel-r/fluid-functionalism-angular versions`), or the publish step fails. 0.0.1 was published by hand.
- **Trusted publisher on npmjs.com:** configured on 2026-10-27 (id `bcd94a59-00f9-4923-9990-16302a3c0d4f`) with `npm trust github @angel-r/fluid-functionalism-angular --file publish.yml --repo angel-r/fluid-functionalism-angular --allow-publish` (permissions: publish, stage publish). Renaming `publish.yml` or the repository breaks it; re-create it with the same command. `npm trust` and a manual `npm publish` need the owner's WebAuthn 2FA in a browser, which an agent shell cannot complete (it fails with `EOTP`), so the owner runs them in an external terminal and releases go through the tag.
- **Demo:** `.github/workflows/pages.yml` deploys the showcase to https://angel-r.github.io/fluid-functionalism-angular/ on every push to `main` that touches `angular/`. The site lives under a sub-path, so showcase links and assets must be relative (`href="sidebar"`, not `"/sidebar"`); the showcase re-declares Inter with relative URLs because the theme points at `/fonts/`.
- **GitHub accounts:** the repository belongs to `angel-r`. When `gh` has another account active, switch with `gh auth switch --user angel-r` before pushing or calling the API, and switch back afterwards.
