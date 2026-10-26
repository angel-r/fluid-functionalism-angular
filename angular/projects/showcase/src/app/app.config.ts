import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideFluid, provideFluidTheme, untitleduiIcons } from 'fluid-functionalism';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Same defaults as the React docs site (lib/docs/site-settings.ts).
    provideFluid({ icons: untitleduiIcons }),
    provideFluidTheme({ shortcut: true }),
  ],
};
