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
   import { provideFluid, provideFluidTheme } from '@angel-r/fluid-functionalism-angular/core';

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
| PDF thumbnails | provide a `FILE_THUMBNAIL_PDF_RENDERER` ([below](#pdf-thumbnails)) |

Reduced motion follows the OS setting: transforms jump, fades stay.

## Entry points

The package ships one entry point per component folder (`core`, `button`, `calendar`, `dialog`, …, `blocks/sidebar`, `blocks/sidebar-app`), the way Angular Material does, plus `styles/theme.css`. Import each symbol from its entry:

```ts
import { provideFluid, cn, Icon } from '@angel-r/fluid-functionalism-angular/core';
import { Button } from '@angel-r/fluid-functionalism-angular/button';
import { Calendar } from '@angel-r/fluid-functionalism-angular/calendar';
```

Use the sub-paths. With them, a component you only load inside `@defer` or a lazy route stays out of the initial bundle. Angular compiles a `@defer` dependency to a dynamic `import()` of the path you wrote, so a deferred component imported from `@angel-r/fluid-functionalism-angular` would keep the whole root, which re-exports every entry. The bare `@angel-r/fluid-functionalism-angular` import still works and still re-exports everything, so code written for 0.0.x keeps compiling. Its static imports tree-shake, but move to sub-paths before you defer anything. Each symbol's entry is the component folder it belongs to; the foundations (`provideFluid`, `cn`, `Icon`, `spring`, `injectAnimateFluid`, `ThemeService`, …) live in `/core`, and the icon packs in `/icon-packs`.

## PDF thumbnails

`ff-file-thumbnail` (used by `ff-input-message` and `ff-chat-message`) shows a PDF as a generic file icon. The library ships no PDF renderer, so it never pulls in pdfjs. To show a PDF's first page, provide a renderer. With `pdfjs-dist` (`npm i pdfjs-dist`):

```ts
import { FILE_THUMBNAIL_PDF_RENDERER, type FileThumbnailPdfRenderer } from '@angel-r/fluid-functionalism-angular/file-thumbnail';

const renderPdf: FileThumbnailPdfRenderer = async (file, size) => {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', document.baseURI).href;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: (size * 2) / page.getViewport({ scale: 1 }).width });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, viewport }).promise;
  return canvas.toDataURL('image/png');
};

// app.config.ts
providers: [{ provide: FILE_THUMBNAIL_PDF_RENDERER, useValue: renderPdf }]
```

Serve the worker from your own build, so it works offline (PWA) and under a strict CSP. In `angular.json`, add to the app's `assets`:

```json
{ "glob": "pdf.worker.min.mjs", "input": "node_modules/pdfjs-dist/build" }
```

With `@angular/service-worker`, add `"/*.mjs"` to an asset group in `ngsw-config.json`: the default groups cache `/*.js` only.

While a page renders, the thumbnail shows a spinner; if rendering fails, it falls back to the icon.

See the [repository](https://github.com/angel-r/fluid-functionalism-angular#readme) for the full component list and the [live demo](https://angel-r.github.io/fluid-functionalism-angular/) for every component in action.

## License

MIT. Fluid Functionalism © Micka Touillaud; Angular port © angel-r.
