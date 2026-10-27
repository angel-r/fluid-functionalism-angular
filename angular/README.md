# Fluid Functionalism for Angular

An unofficial Angular 22 port of [Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism) by Micka Touillaud: every component, block and theme token of the React library, with the same classes, springs and keyboard behavior, built as standalone, signal-based, zoneless components.

This port is not affiliated with the original project. Design, motion system and component behavior come from Fluid Functionalism; the Angular code is maintained here.

This folder is an Angular workspace with two projects:

| Project | What it is |
|---|---|
| `projects/fluid-functionalism` | The library (ng-packagr), published as `@angel-r/fluid-functionalism-angular`. Components, DI foundations, theme CSS, icon packs. |
| `projects/showcase` | A demo app with one route per component and block. |

The React/Next source at the repository root is untouched, so upstream changes can still be merged and compared 1:1.

## Quick path

You need Angular 22 and Tailwind CSS 4.

1. Install the package with its peers:

   ```bash
   npm i @angel-r/fluid-functionalism-angular @angular/cdk @angular/aria
   ```

2. Add the providers:

   ```ts
   // app.config.ts
   import { provideFluid, provideFluidTheme } from '@angel-r/fluid-functionalism-angular';

   export const appConfig: ApplicationConfig = {
     providers: [provideFluid({ shape: 'rounded', size: 'default' }), provideFluidTheme({ shortcut: true })],
   };
   ```

3. Import the theme after Tailwind 4 and let Tailwind scan the library:

   ```css
   /* styles.css */
   @import "tailwindcss";
   @import "@angel-r/fluid-functionalism-angular/styles/theme.css";
   @source "../node_modules/@angel-r/fluid-functionalism-angular";
   ```

   Serve `InterVariable.ttf` and `InterVariable-Italic.ttf` under `/fonts/` (the theme's `@font-face` points there).

4. Use a component:

   ```html
   <button ffButton variant="primary" leadingIcon="plus">Create</button>
   <ff-select [(value)]="fruit">
     <ff-select-trigger placeholder="Select a fruit…" />
     <ff-select-content>
       <ff-select-item [index]="0" value="apple">Apple</ff-select-item>
     </ff-select-content>
   </ff-select>
   ```

## What is included

| Group | Items |
|---|---|
| Foundations | theme tokens, surfaces, type scale, reveal and utility CSS; `provideFluid`, shape/size/surface context, `[ffElevated]`, `<ff-icon>`, theme service, fluid hover, merge-split selection backgrounds, spring tiers |
| Components | accordion, ask-user-questions, badge, banner, button, calendar, card, carousel-dots, chat-message, checkbox-group, color-picker, combobox, command-menu, date-picker, dialog, dropdown (with submenus and search), file-thumbnail, input-copy, input-group, input-message, menu-item, mobile-drawer, radio-group, scroll-area, select, sidebar (core, menu, shell), slider, switch, table, tabs, tabs-subtle, thinking-indicator, thinking-steps, tooltip |
| Blocks | queued-stack, dialog-sidebar, sidebar workspace header, user footer, search field, inset topbar, sidebar-app |
| Icon packs | Lucide (default), plus Tabler, Phosphor, Hugeicons and Untitled UI via `provideIcons(tablerIcons)` |

Not ported: the Next docs site itself (playgrounds, presets, changelog, OG images, evals, skill) and the site-only `nav-item` / `nav-menu`.

## How React maps to Angular

| React | Angular |
|---|---|
| `FluidProvider` / `ShapeProvider` / `SizeProvider` / `IconProvider` | `provideFluid()`, `[ffShapeProvider]`, `[ffSizeProvider]`, `provideIcons()` |
| `useShape()` / `useSize()` / `useIcons()` | `injectShape()` / `injectSize()` / `<ff-icon name="…">` |
| `value` + `onValueChange` | `[(value)]` (`model()`); menus and select keep `[open]` / `[value]` + output so a bound value always wins |
| `asChild` / Slot | attribute selectors on the native element (`button[ffButton]`, `a[ffButton]`) |
| `onSelect`, `onCopy`, `onClick` | `itemSelect`, `copied`, `cardClick` (never named after native DOM events) |
| Radix / Base UI primitives | `@angular/aria` (menu, listbox, tabs) and `@angular/cdk` (overlay, dialog, a11y); hand-written ARIA where neither fits |
| `motion/react` springs | `motion` vanilla `animate()` with the same spring tiers; exits run imperatively |
| `@daypicker/react` | a framework-free date model inside `calendar` |

The per-component differences (and why) are recorded in `odd/tasks/angular-port.md` at the repository root. `PORTING.md` holds the conventions and the gotchas found while porting.

## Development

| Task | Command (from `angular/`) |
|---|---|
| Install the workspace | `npm install` |
| Showcase dev server | `npx ng serve showcase` |
| All tests (Vitest, jsdom) | `npx ng test fluid-functionalism --watch=false` |
| One component's tests | `npx ng test fluid-functionalism --watch=false --include='**/select/*.spec.ts'` |
| Browser motion/layout checks | `node scripts/browser-checks/run.mjs --url http://localhost:4200` (needs the showcase running and a local Chrome; `--only <text>` filters) |
| Build the library | `npx ng build fluid-functionalism` (output in `dist/fluid-functionalism`) |
| Publish to npm | bump `version` in `projects/fluid-functionalism/package.json`, commit, then push a matching tag (`git tag v0.1.0 && git push origin v0.1.0`). The `Publish Angular library` workflow tests, builds and publishes with npm trusted publishing. |
| Regenerate the icon packs | `node scripts/generate-icon-packs.mjs` |

In the workspace, the `@angel-r/fluid-functionalism-angular` import path points at the library source, so the showcase needs no library build.

## Checklist for a change

- [ ] Class strings, `data-*` attributes and ARIA match the React source.
- [ ] Motion uses a spring tier from `core/springs`, never a hand-written duration.
- [ ] The component's spec covers each rule through its public interface.
- [ ] The showcase demo shows the change.

## License

[MIT](../LICENSE). Fluid Functionalism © Micka Touillaud; Angular port © angel-r.
