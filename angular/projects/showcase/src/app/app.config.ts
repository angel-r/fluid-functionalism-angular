import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideFluid, provideFluidTheme } from '@angel-r/fluid-functionalism-angular';
import { routes } from './app.routes';
import { readSiteSettings } from './site/site-settings';
import { provideSiteIcons } from './site/site-icons';
import { provideSiteShortcuts } from './site/settings-shortcuts';
import { provideToastHost } from './site/toast-host';
import { providePdfThumbnails } from './site/pdf-thumbnail';

// The settings index.html's pre-paint script already painted. Reading them
// here seeds every provider with the visitor's last choice, so the first
// Angular frame agrees with what is on screen instead of resetting it.
const settings = readSiteSettings();

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // The React site starts every page at the top.
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    provideFluid({ shape: settings.shape, size: settings.size }),
    provideSiteIcons(),
    // T cycles the theme through the site's own shortcut bundle
    // (settings-shortcuts.ts), which also shows the toast.
    provideFluidTheme({ defaultTheme: settings.theme }),
    provideToastHost(),
    provideSiteShortcuts(),
    providePdfThumbnails(),
  ],
};
