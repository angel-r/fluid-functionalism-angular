# Fluid Functionalism for Angular

An unofficial Angular 22 port of [Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism) by Micka Touillaud: components with fluid hover, merged selections and spring motion. Standalone, signal-based and zoneless.

This port is not affiliated with the original project.

## Quick path

You need Angular 22 and Tailwind CSS 4.

1. Install with its peers:

   ```bash
   npm i @angel-r/fluid-functionalism-angular @angular/cdk @angular/aria
   ```

2. Register the providers:

   ```ts
   import { provideFluid, provideFluidTheme } from '@angel-r/fluid-functionalism-angular';

   bootstrapApplication(App, {
     providers: [provideFluid(), provideFluidTheme()],
   });
   ```

3. Add the theme after Tailwind 4, and let Tailwind scan the package:

   ```css
   @import "tailwindcss";
   @import "@angel-r/fluid-functionalism-angular/styles/theme.css";
   @source "../node_modules/@angel-r/fluid-functionalism-angular";
   ```

   Serve the Inter variable fonts at `/fonts/InterVariable.ttf` and `/fonts/InterVariable-Italic.ttf`.

4. Use components: `<button ffButton>`, `<ff-select>`, `<ff-dropdown-menu>`, `<ff-calendar>`, `<ff-sidebar>`…

## Options

| Need | Use |
|---|---|
| Pill corners or the compact size everywhere | `provideFluid({ shape: 'pill', size: 'compact' })` |
| Change shape or size for one region | `[ffShapeProvider]`, `[ffSizeProvider]` |
| Another icon set | `provideFluid({ icons: tablerIcons })` (also `phosphorIcons`, `hugeiconsIcons`, `untitleduiIcons`) |
| Light/dark switching | `ThemeService` (`setTheme`, `cycle`); `provideFluidTheme({ shortcut: true })` adds the T key |
| PDF thumbnails | install the optional peer `pdfjs-dist` |

Reduced motion follows the OS setting: transforms jump, fades stay.

See the [workspace README](https://github.com/angel-r/fluid-functionalism-angular/tree/main/angular#readme) for the full component list and the React → Angular mapping.

## License

MIT. Fluid Functionalism © Micka Touillaud; Angular port © angel-r.
