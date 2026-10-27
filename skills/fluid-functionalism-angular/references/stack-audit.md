# Fluid Functionalism for Angular: project stack audit

The stack read runs at the start of every session that composes or advises.
The full audit (the stack read, measurements, and a shortlist) runs when the
user asks for one. Neither writes into the project: facts are read again each
time, results go in the reply, and only the user's own decisions are kept,
with their OK ([decisions](#decisions)). Every check below maps to a concrete
consequence you can explain to the user, which is where most of the skill's
*advice* comes from.

## What to check

`scripts/stack.mjs` reads all of it in under a second and cites the
`file:line` behind each fact:

```bash
node <skill>/scripts/stack.mjs [app dir] [--json]
```

Point it at the app's directory (in an Angular workspace, the workspace root
that holds `angular.json`, or a project folder inside it). It reads
`package.json`, `angular.json` (projects, the application build target, its
styles and assets), the bootstrap config (`app.config.ts` or `main.ts`), the
styles entry, the `tsconfig` path alias when the package is consumed from
source, and the agent notes from the app directory up to the repository root.
Without Node, read those same files by hand. The tables below say what each
fact means.

### 1. Hard requirements (the package does not install or render without them)

| Check | Where | If missing or off |
|---|---|---|
| Angular 22 | `package.json` (`@angular/core` ^22.2) | The package's peers reject the install. Do not patch or force it: the components use signal APIs and standalone defaults from 22. Flag it once as a stack fact, then apply the craft by hand if the user wants the look ([when installs are blocked](#when-installs-are-blocked)) |
| Tailwind CSS 4 | `package.json` (`tailwindcss` ^4) and the entry CSS using `@import "tailwindcss"` | The class strings assume v4 (`size-*`, CSS-first config, `@source`). On v3 the package installs but renders broken. A migration is the user's call, never a prerequisite smuggled into advice |
| `@angular/cdk` and `@angular/aria` | `package.json` | The peers are required: overlays, dialogs and menus read from them. Missing peers throw at runtime |
| Theme import | The entry CSS has `@import "@angel-r/fluid-functionalism-angular/styles/theme.css"` after Tailwind | Components render unstyled and the type scale, surfaces, reveal presets and scrollbars are absent |
| Library scan | The entry CSS has `@source` pointing at the package (or, in this repository, at the library source) | Tailwind never sees the class strings inside the package, so most utilities are never generated |
| `provideFluid()` | `app.config.ts` (or wherever `bootstrapApplication` gets its providers) | Shape and size contexts have no fallback provider: the first component throws `NullInjectorError` |

### 2. System wiring (works without, but visibly worse: prime advice material)

| Check | How | Consequence when missing |
|---|---|---|
| `provideFluidTheme()` | The same providers list | No theme service, so light/dark switching does not happen and `T` does nothing |
| Shape and size defaults match the product | `provideFluid({ shape, size })` and the `[ffShapeProvider]` / `[ffSizeProvider]` regions | A product designed compact renders at the 36px default, or the reverse, and every control looks one notch off |
| Inter loaded as a variable font | Theme's `@font-face` with `font-weight: 100 900`, or an app `@font-face` after the import | Weight animations still run but labels widen on hover and selection, so the "weight without reflow" promise silently breaks. A static face makes `font-variation-settings` a no-op site-wide: worth flagging on its own. The fallback is the system font, which has no weight axis at all |
| Inter served under the app's base path | The theme points at root-absolute `/fonts/`; a sub-path deploy needs a relative `@font-face` after the import | The font 404s and the whole page falls back, so every weight and optical-size cue disappears |
| Icon set chosen once | `provideFluid({ icons })`, or `provideIcons()` in a region, rather than per-component overrides | Components keep Lucide inside their own slots while the app's custom icons come from another pack, so the same action looks different in two places |
| State tokens available | The theme import provides `bg-hover`, `bg-active` and `--tint` | Custom code cannot use the shared hover and selected fills, and ad-hoc grays creep in |
| Zoneless | `app.config.ts` has no `provideZoneChangeDetection` (Angular 22 defaults to zoneless) | With zone.js still installed, change detection may run more often than the components expect but does not break them. Report it as a fact, not a finding |

### 3. Inventory (context for suggestions, not warnings)

- **Parts in use.** Which `ff-` selectors and attribute directives appear in
  templates (`ff-select`, `button[ffButton]`, `[ffFluidHover]`,
  `[ffElevated]`, …), and which `inject*` helpers appear in components. This
  tells you what can be used right now and what the app has already adopted.
  The script lists the counts with example paths.
- **Systems in use.** `spring` imports with hand-written durations beside
  them, `typeClass` versus raw `text-[13px]`, `[ffSizeProvider]` versus
  per-control heights, reveal classes on page containers, `ff-scroll-area`
  versus default scrollbars.
- **Hand-rolled stand-ins.** A local `springs.ts`, a `motion.ts` that is this
  library's `spring`, a `proximity-hover` directive that is `[ffFluidHover]`,
  a local weight helper that is `fontWeights`. The script cannot recognise
  them by name; look for them and offer to record one as a
  [decision](#decisions) so later sessions extend it instead of importing
  beside it.
- **`pdfjs-dist`.** Only needed by `ff-file-thumbnail` (PDF previews). Do not
  flag its absence unless that component is in play.
- **Package manager.** Note which one (`packageManager` in `package.json`,
  the lockfile) for every command you hand over, not just removals.
- **Build setup.** The application builder (`@angular/build:application`),
  the styles entry, and whether the project is a single app or a workspace
  with several. This decides where the theme import and providers live.
- **TypeScript strictness.** Only worth noting if it is off in a way that
  will fight the components' input types.

## Measure before you advise

Source shows what a component asks for; only the rendered page shows what it
does. Most advice turns on questions source cannot settle: whether a list's
hover glides or blinks off between rows, whether selecting a tab shoves its
neighbours, which transition durations survive the cascade, which control
heights ship, whether the loaded font can render a weight change at all. When
the app runs, measure those instead of inferring them:

```bash
cd <skill>/scripts && npm install        # once: playwright-core
node audit.mjs http://localhost:4200/<route> [--widths 1280,390] [--json out.json]
```

Point it at the surfaces with the most exposure, the ones the shortlist is
going to be about, not at every route. It needs a Chromium (the Playwright
download, a local Chrome, or `CHROME_PATH`). What it reports, per viewport:

- **HOVER.** Each labelled list of 3+ rows, classified by moving a real
  pointer: `glide` (this library's engine, identified by
  `data-fluid-hover-active-index`), `custom-glide` (a moving overlay that is
  not the engine), `per-row` (each row repaints its own fill, with whether it
  goes dark in the gap between rows), or `none`; plus any row that moves when
  a neighbour is hovered.
- **SELECT.** Whether selecting a tab moves the other tabs (a weight change
  without a ghost span).
- **TRANSITIONS.** CSS durations off the system's tokens
  (0/60/80/120/160/180/240ms) and `transition-property: all`, with example
  elements.
- **LADDER.** The distribution of control heights against 36 / 28px.
- **FONT.** For each family that sets `font-variation-settings: 'wght'`,
  whether a variable face actually loaded. A static face means every weight
  change on the page is silently inert.
- **OVERFLOW.** Horizontal overflow and the element causing it.

What it cannot see, so do not read silence as a pass: springs (they run in
JS, not CSS transitions), popups and menus closed at load, states behind
auth, reduced-motion behaviour, and taste. Screenshots at the same widths
still carry the judgment call; the numbers carry the claims.

Run it in bounded passes: once before advising, once after a change to
confirm it, then stop. If the app cannot run (no dev server, no browser), say
so and file any entry that depended on a measurement as a `check:` question
rather than a finding.

## The evidence gate

Every advice item and every shortlist entry passes this gate before it is
written, and it is what lets the audit be trusted on the next run:

1. **Evidence.** A line `audit.mjs` printed, quoted with its route and width,
   or a `file:line`. A hunch, a grep hit, a similar name, or "this looks
   hand-rolled" is a lead to measure, not evidence.
2. **Reach.** The evidence is on a surface people actually use in this
   product: the measured route renders it, or the file is on that route's
   render path. A problem in a demo page, a story file, or a depicted mockup
   is not the product's problem.
3. **One correction.** The entry names exactly one replacement: a token, a
   component, a directive or a provider. If the evidence supports two
   corrections, or the fix needs product intent nobody has stated, it is a
   question for the user, not an entry.

Then try to break each survivor. Re-open what it cites and delete it when:

- the measurement or the file does not match what the entry claims;
- the difference is a documented exception or a recorded decision (a
  deliberate stillness, an off-token duration someone chose on purpose,
  explained by a comment beside the code or a line in the project's agent
  notes);
- the surface is depicted UI rather than the app's own chrome;
- another entry has the same root cause, so merge them into one;
- it is infrastructure, which the shortlist never carries.

Evidence is the footnote, not the headline: the interface-first rule below
still decides how an entry reads. It sits on its own `evidence:` line in the
reply, so the user, or the next session, can re-check it instead of trusting
it.

If fewer than two entries survive, say so rather than pad. If none survive,
that is a result, not a failure: write *"No changes recommended: nothing
measured on <routes> departs from the system"* and stop. An audit that always
finds something teaches people to ignore it.

## Replacement shortlist (2 to 5 items, systems first)

Part of every audit and refresh: name the **2 to 5 upgrades** that would most
improve this project's UI, ranked, each rated for impact and effort. Two to
five is a hard band; one suggestion reads as an afterthought, six reads as a
rewrite plan. If fewer than two genuine candidates exist, say so; never pad.

**UI and design system only.** Every slot goes to something the user sees or
feels. Infrastructure findings (dead dependencies, package-manager notes,
Angular or Tailwind migrations, icon-library consolidation) are stated as
stack facts, but they never occupy a shortlist slot and never lead the
conversation. An infra blocker can still appear *inside* an entry, as the
reason its effort is L.

**Systems before components.** Work through the system pages (Motion, Fluid
Hover, Surfaces, Sizes, Typography, Scrollbars) before individual components:
one system adopted lifts every surface at once, and components imported
afterwards land on rails that already exist. Candidates in that order:

1. **Motion tokens** (`spring`) for hand-written durations scattered around,
   missing exit tweens, drifted bounce values.
2. **Fluid hover** (`[ffFluidHover]`) for a list, menu, table or grid whose
   glide is hand-rolled, or whose per-row `:hover` blinks off between rows and
   drops clicks in the gaps.
3. **Surfaces** (`[ffElevated]` plus the tokens) for popovers, dropdowns and
   dialogs with ad-hoc backgrounds and shadows that break at depth or in dark
   mode.
4. **Sizes** (`[ffSizeProvider]`, `injectSize()`) for three or more control
   heights in the wild: the 36/28 ladder shared by buttons, inputs, selects,
   tabs and rows.
5. **Typography** (`typeClass()`, `fontWeights`, `injectSize().field`) for
   five or more text sizes or line heights in the wild, or markdown rendered
   with stock prose styles.
6. **Scrollbars** (`ff-scroll-area`) for default scrollbars inside panels and
   popups.

Then components, picked by the same felt-difference test: the card grid that
would gain 2-D fluid hover and composed layouts, the sidebar (resize,
collapse, mobile drawer), a hand-rolled palette to `CommandMenu`, a plain
modal to `Dialog`'s spring enter and crisp exit, form controls that snap to
`Select`, `Switch`, `CheckboxGroup`.

**Separate a repair from a new character.** Most entries are repairs: the app
already does this thing, and does it inconsistently, late, or not at all where
its neighbours do. Those are recommendations, and you make them.

A few would introduce a signature behaviour the product has never had. Fluid
hover is the main one. If nothing in the app animates a hover today, that is
as likely a deliberate register as an oversight: plenty of good interfaces
are still, and mean to be. Adopting it changes how the whole product feels,
which is the user's call and not an audit finding, so ask once before it takes
a slot: name where it would land first, what it would feel like there, and
what it would cost. "Nothing glides on hover" is an observation about their
code. "Do you want hover in these menus to follow the cursor the way the rest
of the library does, or is the stillness deliberate?" is the question behind
it, and it is the one worth asking. Offer to record the answer as a
[decision](#decisions) so no later run re-opens a settled question.

**Write every entry from the interface, not from the code.** The reader is
looking at their own product, so an entry opens on what someone using it sees
now, where, and how often. The file, the missing config line, the token and
the size of the fix all come after, as the explanation for a difference
already named. An entry whose subject is a symbol, a config key or a package
has been written backwards, and so has any heading that leads with the cost:
"one line" is not a headline, it is a footnote.

Three things carry a why:

- **Exposure.** How much of a session this surface is on screen, and for how
  long. A dock, a sidebar, a message list, the model picker in a composer sit
  in front of someone continuously; a settings modal does not. Say which it
  is, and let it move the ranking more than the size of the diff does.
- **What it costs them now.** Read the current behaviour and name the moment
  it goes wrong: a state you have to read instead of glance at, a hover that
  blinks off between rows, a panel that lands late, a dismissal that drags.
- **Which quality it buys back.** Cohesion, so the surface moves like the rest
  of the app. Immediacy, so it answers the instant you act. Legibility of
  state, so you can tell what is selected without comparing. Finish, so
  nothing jumps or snaps.

The same finding, written both ways:

> Backwards: "InterVariable loads as a single 400 face. No `font-weight`
> range, so every weight resolves to the same face (one line)."
>
> Right: "A selected row in the model picker looks almost the same as an
> unselected one, so people read the list instead of glancing at it. Weight is
> the cue that would carry that, and it is the one cue this app cannot
> currently use: the variable font is declared without a weight range, so
> every weight resolves to the same face. One line in the `@font-face` turns
> selection into something you see rather than parse."

Same fact, same fix, same length. The second one is about the product.

**Impact (high / medium / low)** is how much the user would actually feel it:
surface traffic (a sidebar or nav beats a rarely opened modal); whether the
current code has the exact failure modes this library fixes (blinking per-row
hover, snapping state changes, mushy exits, labels that shift on selection,
popups that vanish at depth); systems default high when several surfaces
inherit the fix at once.

**Effort (S / M / L)** is what it really costs here:

- **S**: theme or provider wiring, or a component swap at a few call sites.
- **M**: several call sites or a moderate API distance (prop renames, a
  wrapper to keep, a custom directive to retire).
- **L**: a heavily custom local component, many call sites, or an Angular or
  Tailwind major migration blocking the package. The effort includes the
  hand-roll or the migration. A blocked install never hides a candidate: it
  raises its effort and says why.

Each entry: current state, the replacement (correct exported symbol or
selector), impact, effort, one line of *why* naming the felt difference.
**Ground the why in the craft:** before writing an entry, read the
candidate's section in [craft.md](craft.md) and pick the one or two details the
project's current component visibly lacks. "Your select snaps open and closes
on the click; `ff-select` animates the open and holds the popup 300ms so the
check mark is seen drawing in" persuades where "animated select" does not.
Rules for using it honestly:

- Cite at most two craft details per entry: the sharpest contrasts with what
  the current code does, not a feature dump.
- Only cite what the project actually lacks: if their hand-rolled version
  already fades in at the nearest row, that bullet is not an argument. Reading
  the current component first is what makes the pitch credible.
- The same comparison sets the effort honestly: craft the local version
  already replicates means the replacement changes less than it seems (lower
  risk), while local behaviours the library *does not* have belong in the
  entry as a named trade-off, not a surprise.

Rank by impact-per-effort within the systems-then-components order: a
medium-impact S usually belongs above a high-impact L. The shortlist goes in
the reply ([format below](#where-the-results-go)). A later audit rebuilds it
from fresh evidence: a done item has no evidence left and drops out, and a
declined one is settled by its decision.

## When installs are blocked

A failed hard requirement (an Angular major below 22, Tailwind v3) does not
end the skill's usefulness: it changes mode. Do not push a stack migration the
project did not ask for; a working app on v3 has better reasons to migrate
than one component library, and "upgrade your stack first" is rarely the
advice the user came for. Instead:

- **Apply the system by hand.** The principles install without the package:
  three spring tiers as local named tokens (many projects have already
  hand-rolled them; look for a `motion.ts`/`springs.ts` citing the docs and
  treat it as the project's `spring`), exits one tier quicker, one gliding
  highlight per list (a hand-rolled fluid-hover directive is correct here: the
  "never hand-roll" rule exists to prevent drift *beside imported
  components*, and there are none), `bg-hover`/`bg-active`-style state tokens,
  transform and opacity only, and the ghost-span weight pattern with the
  three weights.
- **State the blocker and its caveats once**: which requirement fails, and
  what a future migration must watch for (the theme import, the `@source`
  line, the provider wiring). `stack.mjs` reports both on every run, so the
  day the project migrates, the path is read from what is there then.
- **Advise the migration question once, deliberately**, as its own decision
  with its costs, not as a prerequisite smuggled into every suggestion.
- **Never present the block as a gate on the list.** A blocked install blocks
  *the package*, not the outcome. Every item on the shortlist is a way this
  interface can feel better, and each one is reachable by hand against the
  project's own tokens, so write the shortlist to read the same either way:
  the blocker changes how an item lands and what it costs, never whether it
  is worth doing. Above all, do not close with a summary that puts the
  migration in front of everything.

## Where the results go

In the reply, not a file. Lead with the shortlist; the stack facts are
context, one or two lines. Keep it under about 40 lines:

```markdown
**Stack**: Angular 22 standalone app, npm. Theme imported and scanned,
provideFluid() wired, 24 ff- parts in use. Inter is declared without a weight
range, so weight animation is inert.

**Shortlist**
| Now | Replace with | Impact | Effort | Why | Evidence |
|---|---|---|---|---|---|
| durations hand-written in 6 files | springs (motion tokens) | high | S | exits reuse the entrance spring today, so dismissals drag; Enter and exit helpers pair every tier with a one-tier-quicker exit tween | components/panel.ts:44, dock.ts:18 (+4) |
| nav + table per-row :hover | [ffFluidHover] | high | S | hover blinks off between rows; the highlight glides to the nearest row and a gap click still lands on what is lit | audit.mjs / @1280: per-row, dark in the 4px gap |
| static card grid (projects.ts) | ff-card-group | med | M | the grid is the first thing anyone sees and nothing answers the cursor on it; the highlight tracks the nearest card in both axes and dividers drop beside the active one | audit.mjs / @1280: none on 9 cards |
| hand-rolled command palette (cmd-k.ts) | CommandMenuDialog | med | M | keyboard scroll keeps the row centered and travels with the highlight; mod+k resolves per platform with a Dvorak-safe fallback, both missing locally | src/app/cmd-k.ts:88 scrollIntoView, :31 metaKey only |

**Also worth fixing**
- Selecting a tab on /settings shoves the tabs beside it, so the row jumps
  each time the section changes; the label needs a ghost span.
  evidence: audit.mjs /settings @1280: SELECT "General / Billing / Team":
  selecting tab 2 moved tab 3 by 2.8px
```

## Decisions

The only thing worth carrying between sessions is what the user decided,
because nothing in the code shows it: fluid hover declined, a stillness kept
on purpose, an off-token duration chosen deliberately, a hand-rolled directive
that stands in for `[ffFluidHover]`. A decision is intent, not a snapshot of
the code, so it stays true until the user changes their mind. Record one only
when the user makes it, and only with their OK:

- **Tied to one place** (a duration, one still list): a one-line comment
  beside the code saying what was kept and why. The falsification pass
  re-opens the cited code and finds it, and the note goes away with the code
  it explains.

  ```ts
  // 150ms on purpose: matches the OS sheet it sits on, not a motion tier.
  ```

- **Project-wide** (fluid hover declined, a local alias of a system piece):
  one line under a `## Fluid Functionalism` heading in the agent notes the
  project already keeps (`AGENTS.md`, `CLAUDE.md`). `stack.mjs` finds that
  heading, in the app's directory or any directory above it up to the
  repository root, and prints it under `DECISIONS`.

  ```markdown
  ## Fluid Functionalism
  - Fluid hover: declined 2026-09-14, menus stay still on purpose.
  - src/app/proximity-hover.ts is this project's [ffFluidHover]: extend it,
    don't import the directive beside it.
  ```

Never create a new file for decisions. If the project keeps no agent notes, or
the user would rather not write any, keep the decision in the reply. A lost
decision costs one repeated question, never a wrong import.

A written decision outlives your session and later sessions trust it, so hold
it to a higher bar than advice:

- Record what the user said or what you observed, not what you concluded from
  it: "the app has no `@source` line" is a fact; "the app cannot use the
  library" is a conclusion the fact does not support.
- A claim you could not verify is a question for the user, not a decision.

## Later runs

- **Run `stack.mjs` again**; it is the record. Trust what it prints over
  anything remembered from an earlier session.
- **Read the decisions it points at** before suggesting anything, and never
  re-raise what they settle.
- **Check versions** with `npm outdated @angel-r/fluid-functionalism-angular`
  before advising an upgrade, and read the changelog at
  <https://angel-r.github.io/fluid-functionalism-angular/changelog> rather
  than guessing what a version changed.
- **Confirm with one more measurement**: after a change lands, re-run
  `audit.mjs` on the route it touched and call the item done only when the
  line that justified it is gone. One confirming run, not a loop.
- **Surface stack-level advice at natural moments**: a missing weight range
  when a task involves selected or active labels, a missing theme import when
  components look unstyled, rather than on every run. If the user declines,
  offer to record it as a decision so it stops being raised.
