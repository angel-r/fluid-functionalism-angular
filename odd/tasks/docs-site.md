# Docs site in Angular

Objective: make the Angular showcase (`angular/projects/showcase`, deployed to https://angel-r.github.io/fluid-functionalism-angular/) reproduce the public docs site https://www.fluidfunctionalism.com/ page by page, built with the ported library. This reverses assumption A4 of `odd/tasks/angular-port.md`.
Branch: `feat/docs-site`, created from `main` (7d94ef7) before the first write · Delivery strategy: `single-pr` (D8). Commit each task on `feat/docs-site`. When T13 is green, push the branch and open one PR to `main`. Do not merge it; the user merges · Test runner: `ng test` (Vitest, jsdom) from `angular/`, plus Playwright browser checks (`angular/scripts/browser-checks/`) and the parity script (`angular/scripts/parity/`).

## Specs

- **S1**: "quiero que quede tal cual obviamente en angular". Every user-visible page of https://www.fluidfunctionalism.com/ exists in the Angular showcase with the same structure, layout, copy, interactions and motion. It is built from Angular components (the library in `angular/projects/fluid-functionalism` plus showcase code) and has no React runtime. The React/Next source in the repo root is the reference (`app/**`, `lib/docs/**`, `lib/changelog/**`, `lib/preset/**`, `content/changelog/**`) and stays untouched.
- **S2**: Shell (reference: `app/layout.tsx`, `app/components/sidebar-layout.tsx`, `sidebar.tsx`, `right-panel.tsx`, `site-command-menu.tsx`). It must have:
  - **Left sidebar.** Search trigger "Search · Ctrl K". Rows Showcase, Introduction and Changelog. "System" and "Components" groups with counts and a hairline under the label. New/Updated dots.
  - **Layout.** Library Sidebar with `mobileBreakpoint` 1280 (a sheet below it), the desktop reopen trigger and close-on-navigate.
  - **Shortcuts.** `[` toggles the rail (with toast); `]` toggles the right panel; ArrowLeft/Right moves through `pageOrder`.
  - **Right panel "Make them yours".** Theme (T), Radius (R), Size (S), Icons (I) and Heading font (F, including "Browse Google Fonts…" and the heading weight). Also the GitHub star count, "Copy install prompt" and the "Created by @micka_design" credit, plus the right-rail slot used by playgrounds.
  - **Site command menu.** Pages / System / Components with New/Updated descriptions. Settings rows. Actions: copy install, Previous/Next page, Open on GitHub. Recent pages.
  - **404 page.** "A little out of place." / "We couldn't find this page." / "Back to showcase". The right panel is hidden.
- **S3**: Home "Showcase" (reference: `app/page.tsx`, `app/components/bento-*.tsx`, `demo-data.ts`):
  - Hero: "Fluid Functionalism", "Refined UI components with satisfying hover.", the prev/next arrows, and the buttons "Copy install prompt", "Learn more" and "See demo".
  - Bento grid: the same `displayOrder`, sides, spans, `STAGE_PADDING`, the 1/2/3-column FLIP between breakpoints, one live preview per component, New dots, and `reveal-landing-subtle`.
- **S4**: Introduction (`/docs`, reference `app/docs/page.tsx`) and Changelog (`/changelog`, reference `app/changelog/**`, `content/changelog/*.md`). The changelog keeps its timeline, index, kind groups, diff highlighting, entry previews and copy buttons. The New/Updated marks come from `content/changelog/*.md` plus `AHEAD_OF_RELEASE` (`lib/changelog/load.ts`).
- **S5**: System pages, as in `app/docs/<slug>/**`: Fluid Hover, Motion, Reveal, Scrollbars, Sizes, Skill, Surfaces, Typography.
- **S6**: All 30 component docs pages, as in `app/docs/<slug>/page.tsx`. Each has:
  - `DocPage`: title, prev/next arrows with tooltips, description, Installation row.
  - `DocSection`s with `ComponentPreview`: Preview/Code `TabsSubtle`, shiki highlighting in dual GitHub themes switched by CSS vars, the Inspect switch with the pixel-ruler overlay, and replay.
  - The interactive Playground: controls portaled into the right rail at ≥1280px and inline below that, shuffle, and the preset Share dialog or install prompt (D5).
  - The "API Reference" `PropsTable`.
- **S7**: URLs follow the original paths under the base href: `/`, `/docs`, `/changelog`, `/docs/<slug>` (system and component slugs), `/demo`. Every current showcase route (`/foundations`, `/button`, `/menu-item`, …) redirects to its new page (or to `/` when it has none). Unknown paths render the 404 page. All links stay relative (PORTING.md: the site lives under a sub-path).
- **S8**: The content is Angular. Code snippets are Angular templates and TS that compile against `@angel-r/fluid-functionalism-angular`. Installation, copy prompts, the starter prompt and the preset install prompt (D5) use the Angular package (`npm i @angel-r/fluid-functionalism-angular`, `provideFluid()`), not `npx shadcn` or React imports.
- **S9**: Static hosting on GitHub Pages:
  - Settings persist in localStorage. An inline script in `index.html` applies the theme class and `data-size` / `data-font` / shape before Angular boots, so there is no flash of defaults.
  - The changelog and release marks are generated at build time into a JSON/TS file. The build fails if the markdown cannot be parsed.
  - No server routes.
- **S10**: Parity is verified for each page against the production site. Run the parity script, or headless Chrome screenshots at 1440×1800 and 390×844 in both themes. Fix every visible difference or record it as residue in the Log. `ng test`, both builds and the browser checks are green at every task closure.

Decisions (the user chose each one on 2026-10-27, L6). These are binding: the executor decides nothing outside them, and anything not covered here goes back to the user as a single question.
- **D1, Primitive setting.** "Quitarlo". The "Primitive" row (Radix / Base UI) is removed from the right panel, the command menu settings and the shortcuts. The panel shows Theme, Radius, Size, Icons and Heading font only.
- **D2, GitHub repository.** "Tu fork". The star button and "Open on GitHub" use `angel-r/fluid-functionalism-angular`:
  - The count is fetched client-side from `https://api.github.com/repos/angel-r/fluid-functionalism-angular` (`stargazers_count`), formatted like the original ("1.1k").
  - On any fetch failure, only the count is hidden; the button stays.
  - The "Created by @micka_design" credit stays as in the original.
- **D3, agent and SEO files.** "Generar estáticas". At build time, generate static files with Angular content in the deployed output: `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, one `md/<slug>.md` per docs page, and `changelog.md`. Every URL uses the base `https://angel-r.github.io/fluid-functionalism-angular/`. `r/preset|setup|starter`, `og`, `api/stars` and `middleware.ts` are not ported. Task T15.
- **D4, internal pages.** "/demo sí, /compare no". `/demo` is ported (T12). The `/compare` entry is removed from the command menu `PAGES`. `/compare-bases`, `/concepts/*`, `/og*`, `/stars`, `/slider` and `/table` are unlinked and not ported.
- **D5, playground presets.** "Share + prompt Angular". Port `lib/preset/codec.ts` as is (pure TS, no imports), along with the `?preset=` read-once/URL sync and the "Share this configuration" dialog, whose link is `https://angel-r.github.io/fluid-functionalism-angular/docs/<slug>?preset=<code>`. Installable configurations (`def.installable`) copy a prompt with `npm i @angel-r/fluid-functionalism-angular` plus the Angular snippet (template + `provideFluid()`) generated from the playground state, instead of `npx shadcn … /r/preset/<code>.json`.
- **D6, analytics.** "Sin analítica". Drop `@vercel/analytics` (including the `track(...)` calls) and `@vercel/speed-insights`. Add no replacement.
- **D7, current demos with no page in the original.** "Redirigir al padre". The old routes redirect as follows:
  - `menu-item` and `dropdown-search` → `docs/dropdown`
  - `scroll-area` → `docs/scrollbars`
  - `file-thumbnail` and `queued-stack` → `docs/input-message`
  - `mobile-drawer` and `sidebar-app` → `docs/sidebar`
  - `dialog-sidebar` → `docs/dialog`

  Every other current route redirects to its `docs/<slug>` page, and `foundations` → `docs/surfaces`. Demo code is reused where it matches a reference section; unused demo files are deleted.
- **D8, delivery.** "Rama + un PR final" and "Push + abrir PR". Local work-unit commits per task go on `feat/docs-site`. After T13 is green, push `feat/docs-site` to `origin` and open one PR to `main` with the `branch-pr` skill. Never merge, and never push to `main`.
- **D9, Skill page.** "Escribir skill Angular". Create `skills/fluid-functionalism-angular/SKILL.md` (plus `references/` as needed), adapted from `skills/fluid-functionalism/`: it installs `@angel-r/fluid-functionalism-angular`, uses `provideFluid()` and the `ff-` components, and keeps the same craft rules and values. The Skill page promotes it with the original's design and its install prompt points to it. Task T16.
- **D10, dependencies.** The executor may add only these packages to `angular/package.json`: `shiki` (code highlighting) and `mdast-util-from-markdown` (changelog build script). Any other package goes to the user as a question.

## Tasks

Route column: inline = the executing session writes it. Delegated = parallel writers with the disjoint folders listed (Writer trigger (a)). T2, T3 and T4 can run in parallel after T1. T5 to T12 can run in parallel after T3, one folder per page. Only T1 owns `app.routes.ts` and the route/nav tables; later tasks only fill in their own page components.

| ID | Specs | Scope | Route | Status | Commit |
|----|-------|-------|-------|--------|--------|
| T1 | S2,S7,S9,D1,D6,D7,D10 | **Foundations.** Create branch `feat/docs-site`. `SiteSettingsService` (localStorage keys mirroring `lib/docs/site-settings.ts` `ff_*`, defaults system/rounded/default/untitledui) plus the pre-paint script in `index.html`. Wire Theme, Shape, Size, Heading font (`lib/docs/heading-font.tsx`: `data-font` + CSS vars, Google Fonts loader) and Icons. **Library change:** a reactive icon map, so the Icons setting can switch packs at runtime without breaking `provideIcons()`/`injectIcons()` (`core/icons.ts:129-144` is a static `useValue` today); RED test first. Toast service. Site-only CSS: diff `app/globals.css` against `styles/theme.css`, port the missing part (`text-site-*`, `html[data-size]` 412-479, shiki vars). Nav data: copy `lib/docs/components.ts` and `command-menu-items.ts`. Build script `content/changelog/*.md` → JSON (changelog entries + release marks). The full route table (S7) with placeholder pages and the 404. A right-rail portal service (CDK `TemplatePortal`) whose interface T2 and T3 share. | inline | done | c3dc1b6 |
| T2 | S2 | **Shell.** Sidebar layout, left nav, mobile sheet, shortcuts, right panel with settings and stars, the site command menu, the 404 page. Replace `app.html`/`app.ts`. Folder `showcase/src/app/shell/**`. | delegated (parallel with T3, T4) | done | f5b4ef5 |
| T3 | S6,S8 | **Docs kit.** `DocPage`/`DocSection` (prev/next from `docOrder`, Angular install row, copy prompt), `ComponentPreview` (tabs, shiki `bundle/web` with `angular-html`/`ts`, replay), `PropsTable` plus `lib/docs/api/*.ts` adapted to the Angular inputs/outputs, playground primitives (`PlaygroundPanel`, `PlayField`, `PlaySelect`, `PlaygroundLayout` via the rail service), and the preset Share dialog / Angular install prompt (D5). Folder `showcase/src/app/docs-kit/**`. | delegated (parallel with T2, T4) | done | 0ecf578 |
| T4 | S3 | **Home.** Hero, bento grid/card with FLIP, and the 30 previews (`bento-previews.tsx`), plus `demo-data`. Folder `showcase/src/app/pages/home/**`. | delegated (parallel with T2, T3) | done | 99c8bfd |
| T5 | S4 | **Introduction and Changelog.** Folders `pages/intro/**` and `pages/changelog/**`. | delegated after T3 | done | ed1f935 |
| T6 | S6,S8 | **Simple component pages:** badge, switch, radio-group, checkbox-group, thinking-indicator, table, input-copy, input-group, tooltip, button, carousel-dots, color-picker, chat-message, dialog, tabs, tabs-subtle, slider, select. Folders `pages/docs/<slug>/**`. | delegated after T3 | done | ec3f3d5 |
| T7 | S6,S8 | **Playground pages:** accordion, banner, calendar, card, combobox, command-menu, date-picker, dropdown. Each ports its `lib/docs/playgrounds/<slug>.tsx` with Angular code generation. Folders `pages/docs/<slug>/**`. | delegated after T3 | done | 57256a0 |
| T8 | S6,S8 | **Heavy pages:** sidebar (page 1,936 + playground 1,707 + `example-data.ts`), input-message (809 + queued chat 555 + playground 587), ask-user-questions (1,267 + playground), thinking-steps (804). Folders `pages/docs/<slug>/**`. | delegated after T3, one writer per page | done | 31d5aa5 |
| T9 | S5 | **System pages, batch 1:** fluid-hover, motion, reveal, scrollbars. | delegated after T3 | done | b22482a |
| T10 | S5,D9 | **System pages, batch 2:** sizes, surfaces, typography (`lib/typeset/generate.ts`, `lib/docs/typeset-sample.tsx`), and skill (promotes the T16 skill). | delegated after T3 | done | a621fb0 |
| T11 | S6 | **Inspect overlay** (`lib/docs/InspectOverlay.tsx`, 768 lines) wired into `ComponentPreview`. | delegated after T3 | done | 0ecf578 |
| T12 | S1,S7 | **`/demo` page** (`app/demo/page.tsx`, 353 lines), full-screen without the shell. | delegated after T2 | done | a92b3eb |
| T13 | S10,S7,D8 | **Whole-site parity pass, then delivery (D8).** Every page in both themes, desktop and mobile, plus the shortcuts and settings persistence across reloads. Browser checks for the shell (the 1280 sheet, the rail portal, redirects, 404 on a deep link in Pages). Update `angular/PORTING.md` (A4 reversed, docs-site sync rule), `angular/README.md` and the root `README.md`. Mark A4 superseded in `odd/tasks/angular-port.md`. Seam: full suite and both builds. | inline | done | this PR |
| T14 | — | Engram mirror `odd/docs-site/tasks` after every change to this document. | inline | in progress | |
| T15 | D3 | **Static agent and SEO files.** A Node build script run by the showcase build (and so by `pages.yml`) emits `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, `md/<slug>.md` and `changelog.md` into the build output. Content is adapted from `lib/docs/markdown.ts`, `app/llms*.txt`, `app/robots.ts` and `app/sitemap.ts`, with Angular snippets and the D3 base URL. The script only reads the page data; it never imports page components. | delegated after T5–T10 | done | e13e2e1 |
| T16 | D9 | **Angular skill.** `skills/fluid-functionalism-angular/**`, adapted from `skills/fluid-functionalism/**`. The install prompt text it needs is shared with T10. | delegated (parallel with T2–T4) | done | 1075f9e |

## Verification

From `angular/`:
- `npx ng test fluid-functionalism --watch=false`, plus the showcase specs if any exist.
- `npx ng build fluid-functionalism`, then `npx ng build showcase`.
- The browser checks and the parity script as described in `angular/PORTING.md` ("Check parity …", browser checks section). The React reference needs the root `npm ci` and `next dev`.
- Fallback screenshot when Chrome DevTools MCP cannot connect (it failed on 2026-10-27): `"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --hide-scrollbars --window-size=1440,1800 --virtual-time-budget=8000 --user-data-dir=<scratch> --screenshot=<file> <url>`.

Risk per task:
- T1 touches a published library export: item 3, with an independent verifier on the icon change.
- T13 touches the deploy and its links: item 5.
- The page tasks are item 6 unless browser checks cover them.

Rules for workers:
- Read this document until `## Log` and `angular/PORTING.md`.
- English for code, comments and UI copy.
- Never edit outside the folders listed for the task. Route and nav tables belong to T1.
- No repo-wide formatters or installs. The executing session (the parent) adds the D10 dependencies; workers never install.

## Log

- **L1** (2026-10-27, user): "mira el sitio quedo muy distinto al original https://www.fluidfunctionalism.com/ https://angel-r.github.io/fluid-functionalism-angular/foundations , se ve muy mal porque?"
- **L2** (2026-10-27): Diagnosis with headless Chrome screenshots of both sites.
  - The deployed CSS is complete (109 KB with every Tailwind utility) and the components match the reference tokens.
  - The difference is the site shell and the docs pages. A4 (`odd/tasks/angular-port.md:19`, `angular/PORTING.md:104`) kept them out of scope.
  - Extra finding: the sidebar shows "Foundations" twice, as the group label and as a link. T2 replaces that sidebar anyway.
- **L3** (2026-10-27, user): "quiero que quede tal cual obviamente en angular"
- **L4** (2026-10-27, user): "haz el plan en odd y lo ejecuto con otro agente". This session writes only this plan and its mirror; another agent executes it.
- **L5** (2026-10-27): A read-only explorer mapped the Next site.
  - Sizes: shell ≈2,900 lines + `globals.css`; home ≈1,570; system pages ≈7,600 (+ typeset ≈960); component pages ≈11,700; docs kit ≈3,900 + API data 1,800 + playgrounds 5,600; changelog ≈1,450; intro ≈210.
  - Key facts:
    - Settings live in server-read cookies (`app/layout.tsx:74-101`); they become localStorage plus a pre-paint script.
    - Release marks read `content/changelog/*.md` via `node:fs` (`lib/changelog/load.ts`); they become a build step.
    - Snippets are JSX strings highlighted in the browser by `shiki/bundle/web` (`lib/docs/highlight.ts`); they must be rewritten as Angular.
    - Playground controls portal into the right panel (`lib/right-rail.tsx`).
    - Deploy already copies `index.html` to `404.html` (`.github/workflows/pages.yml:63-65`), so deep links work.
  - Parent spot check: `core/icons.ts:129-144` confirmed a static `useValue` icon map.
  - Forecast: roughly 25-35k authored lines.
- **L6** (2026-10-27, user): "revisemos los supuestos 1 a 1 la idea es que quede sin dudas para que el otro agente no decida nada y ejecute". Answers, verbatim:
  - Primitive: "Quitarlo" (D1)
  - Star repository: "Tu fork" (D2)
  - Agent routes: "Generar estáticas" (D3)
  - Pages: "/demo sí, /compare no" (D4)
  - Presets: "Share + prompt Angular" (D5)
  - Analytics: "Sin analítica" (D6)
  - Current demos: "Redirigir al padre" (D7)
  - Skill page: "Escribir skill Angular" (D9)
  - Delivery: "Rama + un PR final" and "Push + abrir PR" (D8)

  Assumptions B1-B6 are replaced by D1-D10 (D10 lists the dependencies the specs need). New tasks: T15 (D3) and T16 (D9). Evidence for D5: `lib/docs/preset-ui.tsx:95-128` (Share dialog vs installable `CopyPromptButton`) and `lib/docs/install-prompt.ts:121` (`npx shadcn … /r/preset/<code>.json`). `lib/preset/codec.ts` has no imports.
- **Next step**: the executor starts T1 on `feat/docs-site`. This document is untracked on `feat/angular-port` (same commit as `main`), so it carries over to the new branch.

- **L7** (2026-10-27, executor): T1-T13, T15 and T16 closed on `feat/docs-site`; one PR to `main` (D8).
  - T1: the library's icon source (`FF_ICON_SOURCE` behind `FF_ICONS`; `provideIconsSource()` / `injectIconsSource()`; `<ff-icon>` reads it; the spec was written RED first), `SiteSettingsService` (`ff_*` localStorage, the pre-paint script in `index.html`, the size mirror), the heading font with its Google Fonts catalog and the self-hosted Source Serif 4, the T/R/S/I/F shortcuts and their toasts, the site-only CSS (heading font, section 7), the nav and command-menu tables, the changelog build script (`content/changelog/*.md` to `changelog.generated.ts`, a malformed release fails the build), the full route table with the D7 redirects and the 404, and the right-rail portal service.
  - T2: the shell (sidebar at 1280 with the sheet, right panel with the fork's stars and no Primitive row, site command menu, 404, `[`, `]`, arrow keys, full-screen `/demo`).
  - T3 + T11: the docs kit (`DocPage`, `ComponentPreview` with Preview/Code tabs, shiki dual themes, the inspect overlay, the header action slot, `PropsTable`, the playground primitives, the preset codec and Share dialog) and the 34 API references adapted to the Angular inputs, outputs and selectors.
  - T4: the home page (hero, 29-tile bento with the FLIP, the previews, the New dots). The reference renders 29 tiles: `banner` has no bento preview there either.
  - T5-T10, T12: every docs page, the changelog and `/demo`, at reference parity in structure, sections and copy.
  - T15: `scripts/site-files` writes `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, `changelog.md` and 38 `md/<slug>.md` at build time, from the page data only.
  - T16: `skills/fluid-functionalism-angular` (SKILL.md, four references, `stack.mjs` and `audit.mjs`).
  - Verified: library 1170/1170, showcase 3/3, both builds green (site initial 1.06 MB raw, 266 kB transfer; the budget moved to 1.1 MB warning / 1.5 MB error), 43 routes loaded at 1440 and 390 with no console errors, the browser checks at 26/26 three runs in a row (every new check sabotaged to fail, then restored), and side-by-side screenshots against the production site for home (light, dark, 390), card, badge, changelog and `/demo`.
  - Body outline parity: the 13 pages the production site still served before it started blocking automated requests matched heading for heading (accordion, ask-user-questions, badge, banner, button, input-copy, input-group, input-message, motion, tabs-subtle, thinking-indicator, thinking-steps, tooltip); `fluid-hover` differs only in one table title (`ff-fluid-hover-highlight`, the Angular component).
  - Residue, recorded per S10:
    - `/demo` has 25 of the reference's 26 slides (`banner` has no static preview) and no pen menu: the ported playgrounds keep their controls inside their page components, so the slide shell cannot mount them. The settings slide, stage, scaling, navigation, `?c=` addressing and progress dots match.
    - The Introduction has no prev/next arrows (it has no `docOrder` slug; a fake one would also switch on the wrong install row).
    - Demo copy inside the card page keeps the reference's product words ("Built on Radix UI or Base UI"), and the changelog's historical skill entry still names the React skill command; both come from reference content (`app/docs/card`, `content/changelog/2026-09.md`).
    - `/docs` and `/demo` scroll horizontally by 4-17px at 390 exactly as the production site does (the install `InputCopy` is `w-fit`; the demo progress dots overflow), so no change was made.
    - Chrome logs a benign "ResizeObserver loop completed with undelivered notifications" error on `/docs/calendar` under `ng serve`; it comes from the measured calendar column and does not affect the page.
    - Two browser checks were dropped, with their reasons in the check files: the `chat-message` FLIP checks (their live transcript board was a custom old demo with no docs-page equivalent) and the sidebar mobile-sheet check (every sidebar demo pins `mobileBreakpoint=0`; its assertions moved into the new shell check, which covers the site sheet).
    - T14 (the Engram mirror) cannot run from this workspace: no Engram tooling is available here.
