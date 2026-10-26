# Fluid Functionalism for Angular

An Angular 22 port of [fluid-functionalism](https://github.com/mickadesign/fluid-functionalism): every component, block and theme token of the React library, with the same classes, springs and keyboard behavior, built as standalone, signal-based, zoneless components.

This folder is an Angular workspace with two projects:

| Project | What it is |
|---|---|
| `projects/fluid-functionalism` | The library (ng-packagr). Components, DI foundations, theme CSS, icon packs. |
| `projects/showcase` | A demo app with one route per component and block. |

The React/Next source at the repository root is untouched, so upstream changes can still be merged and compared 1:1.

## Quick path

1. Install and run the showcase:

   ```bash
   cd angular
   npm install
   npx ng serve showcase
   ```

2. Use the library in an app. Add the providers:

   ```ts
   // app.config.ts
   import { provideFluid, provideFluidTheme } from 'fluid-functionalism';

   export const appConfig: ApplicationConfig = {
     providers: [provideFluid({ shape: 'rounded', size: 'default' }), provideFluidTheme({ shortcut: true })],
   };
   ```

3. Import the theme after Tailwind 4 and let Tailwind scan the library:

   ```css
   /* styles.css */
   @import "tailwindcss";
   @import "fluid-functionalism/styles/theme.css";
   @source "../node_modules/fluid-functionalism";
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
| Showcase dev server | `npx ng serve showcase` |
| All tests (Vitest, jsdom) | `npx ng test fluid-functionalism --watch=false` |
| One component's tests | `npx ng test fluid-functionalism --watch=false --include='**/select/*.spec.ts'` |
| Build the library | `npx ng build fluid-functionalism` (output in `dist/fluid-functionalism`) |
| Regenerate the icon packs | `node scripts/generate-icon-packs.mjs` |

In the workspace, the `fluid-functionalism` import path points at the library source, so the showcase needs no library build.

## Checklist for a change

- [ ] Class strings, `data-*` attributes and ARIA match the React source.
- [ ] Motion uses a spring tier from `core/springs`, never a hand-written duration.
- [ ] The component's spec covers each rule through its public interface.
- [ ] The showcase demo shows the change.
