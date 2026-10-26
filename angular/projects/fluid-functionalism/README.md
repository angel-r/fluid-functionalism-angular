# fluid-functionalism (Angular)

Angular 22 port of [fluid-functionalism](https://github.com/mickadesign/fluid-functionalism): components with fluid hover, merged selections and spring motion. Standalone, signal-based and zoneless.

## Quick path

1. Install with its peers:

   ```bash
   npm i fluid-functionalism @angular/cdk @angular/aria
   ```

2. Register the providers:

   ```ts
   import { provideFluid, provideFluidTheme } from 'fluid-functionalism';

   bootstrapApplication(App, {
     providers: [provideFluid(), provideFluidTheme()],
   });
   ```

3. Add the theme after Tailwind 4, and let Tailwind scan the package:

   ```css
   @import "tailwindcss";
   @import "fluid-functionalism/styles/theme.css";
   @source "../node_modules/fluid-functionalism";
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

See the workspace README (`angular/README.md` in the repository) for the full component list and the React → Angular mapping.
