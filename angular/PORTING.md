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
