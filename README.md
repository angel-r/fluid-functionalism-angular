# Fluid Functionalism for Angular

Refined UI components with satisfying hover, for Angular.

An unofficial Angular 22 port of [Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism) by Micka Touillaud. Every component, block and theme token of the React library, with the same classes, springs and keyboard behavior, built as standalone, signal-based, zoneless components. One hover highlight glides to the item nearest your cursor, selections merge into one background, and every transition uses a spring.

[Live demo](https://angel-r.github.io/fluid-functionalism-angular/) · [npm](https://www.npmjs.com/package/@angel-r/fluid-functionalism-angular) · [Original project](https://www.fluidfunctionalism.com)

This port is not affiliated with the original project. Design, motion system and component behavior come from Fluid Functionalism; the Angular code is maintained here.

## Install

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
     providers: [provideFluid(), provideFluidTheme()],
   };
   ```

3. Import the theme after Tailwind and let Tailwind scan the package:

   ```css
   /* styles.css */
   @import "tailwindcss";
   @import "@angel-r/fluid-functionalism-angular/styles/theme.css";
   @source "../node_modules/@angel-r/fluid-functionalism-angular";
   ```

   The theme loads Inter from `/fonts/InterVariable.ttf` and `/fonts/InterVariable-Italic.ttf`. Put both files in your app's `public/fonts/`, or declare your own `@font-face` for `Inter` after the import.

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

## Options

| Need | Use |
|---|---|
| Pill corners or the compact size everywhere | `provideFluid({ shape: 'pill', size: 'compact' })` |
| Change shape or size for one region | `[ffShapeProvider]`, `[ffSizeProvider]` |
| Another icon set | `provideFluid({ icons: tablerIcons })`, also `phosphorIcons`, `hugeiconsIcons`, `untitleduiIcons` |
| Light and dark | `ThemeService` (`setTheme`, `cycle`); `provideFluidTheme({ shortcut: true })` adds the T key |
| PDF thumbnails | install the optional peer `pdfjs-dist` |

Reduced motion follows the OS setting: transforms jump, fades stay.

## What's included

| Group | Items |
|---|---|
| Components | accordion, ask-user-questions, badge, banner, button, calendar, card, carousel-dots, chat-message, checkbox-group, color-picker, combobox, command-menu, date-picker, dialog, dropdown (with submenus and search), file-thumbnail, input-copy, input-group, input-message, menu-item, mobile-drawer, radio-group, scroll-area, select, sidebar (core, menu, shell), slider, switch, table, tabs, tabs-subtle, thinking-indicator, thinking-steps, tooltip |
| Blocks | queued-stack, dialog-sidebar, sidebar workspace header, user footer, search field, inset topbar, sidebar-app |
| Systems | theme tokens, surfaces, type scale, shape and size context, `[ffElevated]`, `<ff-icon>`, fluid hover, merged selection backgrounds, spring tiers |
| Icon packs | Lucide (default), Tabler, Phosphor, Hugeicons, Untitled UI |

The [live demo](https://angel-r.github.io/fluid-functionalism-angular/) has one page per component and block.

## Repository layout

| Path | What it is |
|---|---|
| `angular/` | The Angular workspace: the library, the showcase app and their docs. Start with [`angular/README.md`](angular/README.md). |
| everything else | The original React project, kept unchanged so upstream changes can be merged and ported. |

## Development

```bash
cd angular
npm ci
npx ng serve showcase                         # demo app on http://localhost:4200
npx ng test fluid-functionalism --watch=false # library tests
```

[`angular/README.md`](angular/README.md) lists every command and how React maps to Angular. [`angular/PORTING.md`](angular/PORTING.md) covers the porting rules, the upstream sync and releases.

## Contributing

Bugs and ideas for the Angular port go to this repository's [issues](https://github.com/angel-r/fluid-functionalism-angular/issues). [CONTRIBUTING.md](CONTRIBUTING.md) has the rules for a pull request. Design questions about the components themselves belong to the [original project](https://github.com/mickadesign/fluid-functionalism).

## License

[MIT](LICENSE). Fluid Functionalism © Micka Touillaud; Angular port © angel-r.
