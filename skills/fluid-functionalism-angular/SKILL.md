---
name: fluid-functionalism-angular
description: >-
  Build Angular UIs with Fluid Functionalism for Angular
  (@angel-r/fluid-functionalism-angular): one shared motion system of three
  spring tiers, a hover highlight that glides to the item nearest the cursor,
  selection backgrounds that merge, and labels that change weight without
  layout shift. Use whenever the user mentions Fluid Functionalism, the
  Angular port, the `ff-` components, `provideFluid`, or
  fluidfunctionalism.com; asks for satisfying, fluid or polished motion in an
  Angular 22 project; builds any interface (settings dialogs, sidebars,
  command menus, chat UIs, forms, lists, tables) in a project with the
  package installed; asks to review or audit existing Angular UI motion
  against the system; or asks to update the package or what changed in a
  release. Also use before hand-writing animation code (hover highlights,
  icon swaps, weight changes, enter and exit transitions, page reveals,
  skeleton loading), so custom code follows the system instead of inventing
  timings. Bundled scripts read the stack fresh each run and write nothing.
---

# Fluid Functionalism for Angular

An Angular 22 port of [Fluid Functionalism](https://www.fluidfunctionalism.com)
by Micka Touillaud, published as
[`@angel-r/fluid-functionalism-angular`](https://www.npmjs.com/package/@angel-r/fluid-functionalism-angular).
Every component makes a state change legible: springs instead of durations,
one hover highlight per list that glides to the item nearest the cursor, and
labels that get heavier without moving their neighbours. The components are
standalone, signal-based, zoneless, and styled with Tailwind CSS v4 classes
copied from the React originals. This port is unofficial: the design, motion
system and component behaviour belong to the original project. Use this skill
for Angular; for React or Next.js, follow the original at
<https://www.fluidfunctionalism.com>.

Docs and live demos: <https://angel-r.github.io/fluid-functionalism-angular>.
The Angular site mirrors the original page by page: a docs page per system
and component, each with a playground and a **Copy prompt** button whose text
is a self-contained brief (install command, Angular usage snippet, inputs and
outputs, docs URL). The page URLs are
`/docs/<slug>` on the site, for example
<https://angel-r.github.io/fluid-functionalism-angular/docs/fluid-hover> and
<https://angel-r.github.io/fluid-functionalism-angular/docs/select>.

Four jobs this skill covers:

1. **Know the project**: read the stack at the start of every run (next
   section). The read is fast and exact, so nothing is cached and nothing can
   go stale.
2. **Compose the components**: pick the right parts, import them into a
   standalone component, and build around the behaviours already there. The
   catalog is [references/components.md](references/components.md); the craft
   for every doc page and block, with the exact behaviours, values and
   reasons baked into them, is [references/craft.md](references/craft.md). The
   catalog maps parts to the parent section that governs them. Reading that
   section before composing is what separates using this library from merely
   importing it.
3. **Write custom UI that belongs next to them**: when you build something
   the library does not ship, follow the motion system so it moves like the
   rest of the app. Read
   [references/custom-motion.md](references/custom-motion.md) before writing
   any animation, hover or state-change styling by hand.
4. **Keep it current**: bring the package up to its latest release without
   losing local work: [when asked to update](#when-asked-to-update).

## Every run: read the stack

Before composing, advising or writing motion code, run the stack script on
the app's directory, the one holding its `package.json` and `angular.json`.
That is the current directory in most projects; in a monorepo, pass it:

```bash
node <skill>/scripts/stack.mjs [apps/web]
```

It needs only Node, finishes in under a second, and writes nothing. It reads
the Angular and Tailwind versions, the two peers, the `provideFluid()` wiring,
the theme import and the `@source` line, the font declaration, which `ff-`
parts the app already uses, and which agent notes hold the project's
decisions. Every line cites the `file:line` it came from. Without Node, read
the same files by hand:
[what to check](references/stack-audit.md#what-to-check).

**Facts are read, never remembered.** Every stack fact can be read again
faster than a cached copy can be verified, and a cached verdict that drifts
from the code misleads every session after it. So do not write audit results
into the project; they go in your reply.

**Decisions are the exception.** The code cannot show what the user decided:
fluid hover declined, a stillness or an off-token duration kept on purpose, a
hand-rolled stand-in for a system piece. The script's `DECISIONS` line points
at where earlier ones live, from the app's directory up to the repository
root. Read them, honour them, and never re-raise what they settle. Recording
a new one is opt-in and goes where the project already keeps intent; see
[decisions](references/stack-audit.md#decisions).

## When asked to audit or advise

Run the full audit in [references/stack-audit.md](references/stack-audit.md):
on top of the stack read, it picks the 2 to 5 UI upgrades that would help
most. Systems come first (motion tokens, fluid hover, surfaces, sizes,
typography), then components, each rated impact / effort and ranked by
impact-per-effort. UI and design system only: infrastructure findings are
stated as facts, never pitched as recommendations. Three rules decide how
those land, and they are what separates advice from a lint report:

- **Write each one from the interface**, not from the code that causes it:
  what someone using the product sees now, on which surface, how often they
  are looking at it, and which quality it buys back. The file and the size of
  the fix are the footnote, never the headline.
- **A behaviour the app has never had is a question, not a finding.** Fixing
  something the product already does badly is advice you give; introducing a
  new signature motion, fluid hover above all, changes how the whole thing
  feels, so ask before spending a slot on it. Stillness is often deliberate.
- **A blocked install is never a gate on the outcome.** A wrong Angular or
  Tailwind major blocks npm from taking the package, not the product getting
  better; the craft is reachable by hand against the project's own tokens.
  Never front a migration the user did not ask for.

**Measure, then advise.** When the app runs, point
[`scripts/audit.mjs`](scripts/audit.mjs) at its most-used routes before
recommending anything: it moves a real pointer and reports whether each
list's hover glides or blinks off between rows, whether selecting a tab
shoves its neighbours, which transition durations and control heights
actually ship, and whether the loaded font can render a weight change. Every
advice item and shortlist entry then passes the
[evidence gate](references/stack-audit.md#the-evidence-gate): a quoted
measurement or `file:line`, a surface people actually use, exactly one
correction, and a falsification pass that deletes whatever does not hold.
"No changes recommended" is a valid outcome; an audit that always finds
something teaches people to ignore it.

The shortlist goes in your reply. Because every entry cites its evidence, the
next audit rebuilds it from the code as it is then: fixed items drop out on
their own, and only declined ones need a decision to stay settled.

## When asked to update

When the user asks to update or upgrade Fluid Functionalism for Angular, or
what changed since they installed it:

1. **Read the stack** (above), so you know the installed version and how it
   is wired.
2. **Check what is available:**

   ```bash
   npm view @angel-r/fluid-functionalism-angular version
   npm outdated @angel-r/fluid-functionalism-angular
   ```

3. **Read what changed.** The site's changelog page
   (<https://angel-r.github.io/fluid-functionalism-angular/changelog>) records
   the design and behaviour changes ported from the original library. For the
   package's own API, diff the two tarballs and open the `.d.ts` of the parts
   the project uses:

   ```bash
   npm diff \
     --diff=@angel-r/fluid-functionalism-angular@<installed> \
     --diff=@angel-r/fluid-functionalism-angular@<latest> \
     --diff-name-only
   ```

   The `--diff` flags take package specs, so `<installed>` can be
   `0.0.1` and `<latest>` `latest`. Read the type declarations for renamed
   inputs, removed exports and changed defaults.
4. **Install the new version:**

   ```bash
   npm i @angel-r/fluid-functionalism-angular@latest @angular/cdk @angular/aria
   ```

   A 0.x minor or a major can rename inputs, so check the diff before
   installing. Keep the app's own wrappers, copied classes and hand-rolled
   stand-ins in mind: npm does not touch them, and they can break against the
   new behaviour.
5. **Migrate call sites** for every renamed input, selector or export that
   touches a part the project uses, before adding new behaviour. Renamed
   inputs and selectors fail the template type check, so let `ng build` find
   them.
6. **Verify:** run the app's type check and tests, re-run `stack.mjs` (the
   version line moved, the wiring still reads as expected), and report part
   by part what changed and what you left alone.

Never edit files inside `node_modules`: wrap or compose instead.

## One-time project setup

The stack read tells you which of these are already done. Skip those.

1. **Install the package with its peers.** It needs Angular 22 and Tailwind
   CSS 4:

   ```bash
   npm i @angel-r/fluid-functionalism-angular @angular/cdk @angular/aria
   ```

2. **Add the providers** to the app's bootstrap config:

   ```ts
   // app.config.ts
   import { ApplicationConfig } from '@angular/core';
   import { provideFluid, provideFluidTheme } from '@angel-r/fluid-functionalism-angular';

   export const appConfig: ApplicationConfig = {
     providers: [provideFluid(), provideFluidTheme()],
   };
   ```

   `provideFluid()` is required: it provides the shape and size context every
   component reads, plus the icon map. `provideFluidTheme()` starts the
   light/dark service. Options are
   `provideFluid({ shape: 'pill', size: 'compact', icons: tablerIcons })` and
   `provideFluidTheme({ defaultTheme: 'light', shortcut: true })`.

3. **Import the theme after Tailwind, and let Tailwind scan the package:**

   ```css
   /* styles.css */
   @import "tailwindcss";
   @import "@angel-r/fluid-functionalism-angular/styles/theme.css";
   @source "../node_modules/@angel-r/fluid-functionalism-angular";
   ```

   The theme ships the tokens, the focus ring, the surface ladder, the type
   scale, the reveal presets, `.shimmer-text`, `scroll-fade`,
   `scroll-divider` and the scrollbar styling. Without the `@source` line,
   Tailwind never sees the class strings inside the package and the
   components render unstyled. The path is relative to the CSS file, so a
   stylesheet deeper in a monorepo needs one more `../` per level.

4. **Provide Inter as a variable font** at the two paths the theme loads, or
   declare your own `@font-face` for `Inter` after the import:

   ```css
   @font-face {
     font-family: "Inter";
     /* Root deploy: "/fonts/…". Under a sub-path, use a relative url(). */
     src: url("/fonts/InterVariable.ttf") format("truetype");
     font-weight: 100 900;
     font-style: normal;
     font-display: swap;
   }
   ```

   `font-weight: 100 900` is the part that matters: weight animation uses
   `font-variation-settings` with an optical-size pair, so a static face
   silently drops the effect. An app served under a sub-path must use a
   relative `url()` here, because the theme's `/fonts/` paths are root
   absolute.

5. **Optional: PDF thumbnails.** `ff-file-thumbnail` shows a PDF as a
   generic file icon: the package ships no PDF renderer and never imports
   pdfjs. Only when the app wants a PDF's first page, install `pdfjs-dist`
   and provide a `FILE_THUMBNAIL_PDF_RENDERER`, with the worker copied into
   the app's assets so it works offline and under a strict CSP. The package
   README ("PDF thumbnails") has the renderer and the `angular.json` asset
   entry.

## Using the components

Every component is standalone: import the classes a template uses. Attribute
selectors go on the native element the component stands in for, so a button
stays a button and a link stays a link.

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  Button,
  Icon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Tooltip,
} from '@angel-r/fluid-functionalism-angular';

@Component({
  selector: 'app-fruit-picker',
  imports: [Button, Icon, Select, SelectTrigger, SelectContent, SelectItem, Tooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2">
      <ff-select [(value)]="fruit">
        <ff-select-trigger placeholder="Select a fruit…" />
        <ff-select-content>
          @for (option of options; track option.value; let i = $index) {
            <ff-select-item [index]="i" [value]="option.value">
              {{ option.label }}
            </ff-select-item>
          }
        </ff-select-content>
      </ff-select>

      <button ffButton variant="primary" leadingIcon="plus">
        Add {{ fruit() }}
      </button>

      <ff-tooltip content="Saved automatically">
        <button ffButton variant="tertiary" size="icon" aria-label="Status">
          <ff-icon name="check" [size]="16" />
        </button>
      </ff-tooltip>
    </div>
  `,
})
export class FruitPicker {
  readonly fruit = signal('apple');
  readonly options = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
  ];
}
```

What the naming follows:

- **`ff-` elements for components, attribute selectors for native parts.**
  `<ff-select>`, `<ff-dialog>`, `<ff-tabs>`, `<ff-sidebar-provider>`;
  `button[ffButton]`, `div[ffFluidHover]`, `li[ffSidebarMenuItem]`,
  `tr[ffTableRow]`, `[ffElevated]`, `[ffShapeProvider]`, `[ffSizeProvider]`.
- **Values are inputs; changes are outputs.** Most value inputs pair with an
  output of the same name plus `Change`, so `[(value)]` works: `ff-select`,
  `ff-tabs`, `ff-accordion-group`, `ff-radio-group`, `ff-combobox`,
  `ff-date-picker`, `ff-slider`. Two parts name the value for what it holds:
  `ff-calendar` takes `[(selected)]`, and `ff-checkbox-group` takes
  `[(checkedIndices)]`. Outputs are named for the event, never after a native
  DOM event: `itemSelect` on the command menu, `copied` on input-copy,
  `cardClick` on a card. Menus and select keep `[open]` / `[value]` + output
  rather than a `model()`, so a bound value always wins.
- **`<ff-icon name="…" [size]="…" />`** for every icon slot outside a
  component's own props; inside props, `leadingIcon="plus"` takes the same
  name. Names are the Lucide kebab names by default, or the project's icon
  pack.
- **`inject*` helpers in field initializers**, never in methods:
  `injectShape()`, `injectSize()`, `injectSizeVariant()`, `injectSurface()`,
  `injectIcons()`, `injectTouchPrimary()`, `injectAnimateFluid()`.

The catalog, with selectors, entry classes and docs links, is
[references/components.md](references/components.md). Read it when choosing
parts; guessing names costs a round trip.

**Presets:** the Angular site's playgrounds encode a configuration into a
short code and a URL (`/docs/<slug>?preset=<code>`). The Share dialog's
install prompt names the package, the Angular usage snippet and
`provideFluid()` options for that configuration, so you can hand the user a
self-contained brief instead of a JSON file.

## Composing with the system

Imported components already follow every rule. The rules matter when you
write UI *around* them: a custom list, a bespoke card grid, an animated icon
of your own. The recipes and code snippets live in
[references/custom-motion.md](references/custom-motion.md); the shape of the
system:

- **Three spring speeds, tokenised.** `spring.fast` (0.08s, bounce 0) /
  `spring.moderate` (0.16s, bounce 0) / `spring.slow` (0.24s, bounce 0.12),
  exported from the package. The bigger the thing that moves, the slower the
  spring. Never hand-write a `duration`: build the motion config with
  `enterTransition(spring.moderate)` and the dismissal with
  `exitTransition(spring.moderate)`, which is the tier's paired, one-step
  quicker tween so exits read crisp instead of replaying the entrance
  backwards.
- **Reduced motion follows the OS, no wiring.** `animateFluid()` (and
  `injectAnimateFluid()` bound to the live setting) is `animate()` from
  `motion` with the rule applied: transforms and position jumps, opacity and
  colour fades stay. Components read the same setting internally, so an
  installed copy behaves correctly without a wrapper provider.
- **Page reveals are 1 class.** Import the theme, then put 1 class on the
  page's container: `reveal-landing` for a page read once,
  `reveal-product` for the app, `-subtle` for less. Slow data in the app uses
  `reveal-swap`, which crossfades a placeholder into the real block;
  `reveal-items` on both hands rows over one by one. Never hand-roll a
  scroll-listener fade on every element, and keep the hero image and headline
  out of any reveal. Rules and recipe:
  [references/custom-motion.md](references/custom-motion.md#page-reveals).
- **One hover highlight per list.** Any custom list, menu, strip or grid with
  hover uses `[ffFluidHover]` on the container, `[ffFluidHoverItem]="i"` on
  the rows and `<ff-fluid-hover-highlight />` inside, never a per-row
  `:hover` background next to components whose highlight glides. For
  non-template wiring (an imperative list, an overlay outside the component),
  `createFluidHover()` is the same engine as a controller.
- **Weight without reflow.** Text that gets heavier on state
  (selected/active/open) uses the ghost-span pattern with the `fontWeights`
  tokens (`normal`, `semibold`, `bold`), so the layout never shifts. Bind
  `[style.font-variation-settings]`, never `font-weight`.
- **Type comes from six roles.** Size text with `typeClass(role, variant)`
  from the package, or `injectSize().type.<role>` (display, title, subtitle,
  body, caption, micro; each a size and a line height at both ladder steps).
  Text uses 3 weights: `fontWeights.normal` for text, `fontWeights.semibold`
  for headings and selected items, `fontWeights.bold` only for the display
  style; never a Tailwind `font-*`. 2 text colors, foreground and muted,
  never an opacity step of them; no uppercase, no letter-spacing, no
  eyebrows. Never a raw `text-[13px]`, and never a bare `text-caption` inside
  `cn()`: stock tailwind-merge reads it as a color and drops it. An editable
  field takes `injectSize().field` (the body role plus 16px on touch screens,
  so iOS Safari does not zoom the page into it on focus).
  Prose is set from the six roles and their fixed spacing; the docs site's
  `.typeset` sheet is site CSS, not part of the package, so copy that sheet
  into the app if it needs rendered markdown styled as a page.
- **Icon swaps crossfade in one cell.** Two glyphs mounted in the same grid
  cell, fading with a touch of blur and scale: the slot never resizes.
- **Nested corners are concentric.** When a rounded surface sits close inside
  another, derive `inner radius = max(0, outer radius - inset - border)`; the
  inset is the interior spacing, usually parent padding, and the border is
  the parent's border width. The shipped shape pair (`shape().container`
  12/24px, `shape().bg` 8/20px) is fixed for a 4px total inset. For any other
  inset use `nestedRadius()` rather than reusing the pair. Past 24px, with
  asymmetric gaps, or when the inner surface does not reach the corner, treat
  the layers independently and tune by eye.
- **Move with `transform`/`opacity`**, never `top`/`left`/`width`/`height`.
  That keeps motion on the compositor and lets reduced motion drop it for
  free.
- **Theming is the project's existing Tailwind theme.** The tokens in
  `styles/theme.css` (`--background`, `--foreground`, `--muted`,
  `--border`, the eight `--surface-*` levels, `--hover`, `--active`,
  `--tint`, `--fs-*`/`--lh-*`) apply as they are; do not invent parallel
  tokens. `ThemeService` (`setTheme`, `cycle`) owns light/dark and
  the `.light`/`.dark` root classes; `provideFluidTheme({ shortcut: true })`
  adds the `T` key. Icons are Lucide by default; swap libraries app-wide
  through `provideFluid({ icons: … })`, not by editing components.

## The last 1%: where the deep craft lives

The references teach the system; the fine grain of each component, its exact
choreography, edge-case behaviour and the reasons, is written down too. In
order of reach:

- **[references/craft.md](references/craft.md)** covers every documented
  system and component plus each block: the built-in behaviours, exact values
  and the why. The catalog routes each part to its governing parent section.
  Read that section **before composing with, wrapping, extending or
  imitating a component**: it keeps composed code from fighting behaviours
  it did not know existed (the button already handles its own press
  geometry; select acknowledges a pick for 300ms; the panel already snaps
  under a collapsing child).
- **The installed types are the final word.** In this repository the sources
  are `angular/projects/fluid-functionalism/<folder>/**`; in a consuming app
  the published `.d.ts` files under
  `node_modules/@angel-r/fluid-functionalism-angular` list every input and
  output, and the docs page lists the same. Before modifying or wrapping a
  component, read the declarations; never restyle or re-time from memory of
  the React original.
- **The live demos** are the reference rendering:
  `https://angel-r.github.io/fluid-functionalism-angular/docs/<slug>`.

## Gotchas

- **Do not edit the package to change timing or hover behaviour.** Wrap or
  compose instead: edits inside `node_modules` vanish on the next install and
  drift the app away from the system.
- **`@source` is not optional.** Tailwind v4 only emits classes it can read;
  without the package in the scan, components get the tokens (from the
  imported theme) but none of their utility classes.
- **`provideFluid()` is not optional.** `injectShape()` and `injectSize()`
  read a context with no fallback provider; without it the first component
  throws a `NullInjectorError`.
- **A component's `class` input is `class`.** These components declare
  `input('', { alias: 'class' })` and compute their host classes, so
  `class="…"` and `[class]="expr"` are passed through and merged into the
  computed list. Use that input rather than `[ngClass]` on a library host:
  the host's own `[class]` binding and the directive compete for the same
  class list.
- **Outputs are not DOM event names.** `(select)` on a dropdown is not a
  thing; read the output name from the types (`itemSelect`, `valueChange`,
  `openChange`, `copied`, `cardClick`). Naming an output after a native event
  would also fire on the DOM event that bubbles to the host.
- **Two-way values have one shape.** `[(value)]` and `[value]` +
  `(valueChange)` are the same binding. On menus and select, the bound input
  wins over internal state, so an unchanging bound value deliberately freezes
  the control, which is controlled-input parity by design, not a bug.
- **Compound parts are separate classes.** There is no `Select.Item`
  sub-component: import `SelectContent`, `SelectItem`, `SelectTrigger`,
  `SelectGroup`, `SelectLabel`, `SelectSeparator` and place them as elements.
  The same holds for dialog, dropdown, tabs, sidebar, table, command menu,
  combobox and thinking steps.
- **Attribute parts need their host element to be the right tag.**
  `button[ffButton]` matches only a `<button>` (or an `<a>`), and
  `li[ffSidebarMenuItem]` only an `<li>`. Put the directive on a `<div>` and
  it simply does not apply.
- **The port is zoneless** (Angular 22's default). Change detection runs off
  signals. A mutation
  made outside a signal (a raw DOM read/write, an event handler that forgets
  to write state) will not repaint. Write state into signals, and use
  `afterRenderEffect` for DOM reads.
- **Exits are imperative.** There is no `AnimatePresence` equivalent: a
  component keeps the element mounted until its exit animation's
  `finished` resolves, with a timer fallback. When you hide or remove
  something yourself, animate first and remove on completion; do not rely on
  `animate.leave` in tests, where it never runs.
- **Overlays need the component's injector.** CDK overlays created without
  the current `Injector` lose shape, size and surface context. Projected
  content resolves DI from the declaring template, so a token that projected
  children need belongs in the component host's `providers`.
- **A failing name is usually a wrong symbol, not a missing part.** The
  package uses one catalog name per part, with the exported class in Pascal
  case (`TabsSubtle`, `CarouselDots`, `ThinkingSteps`, `AskUserQuestions`,
  `InputMessage`, `SidebarMenuSubButton`). The catalog in
  [references/components.md](references/components.md) maps display names to
  exported classes and selectors.
