// The site's global settings shortcuts: T theme, R radius, S size, I icon
// library, F heading font. Ported from lib/docs/*-shortcut.tsx and
// settings-toast.tsx.
//
// The four panel settings announce their new value only when a shortcut drove
// the change (a keypress within MATCH_WINDOW_MS of it); picking the same value
// with the mouse stays silent, because the panel already shows it. F has its
// own toast in HeadingFontService.cycle().

import {
  type EnvironmentProviders,
  DOCUMENT,
  DestroyRef,
  effect,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { SiteSettingsService } from './site-settings.service';
import { HeadingFontService } from './heading-font';
import { SiteToastService } from './toast';
import { ICON_LIBRARY_LABELS } from './icon-map';

type Setting = 'theme' | 'shape' | 'size' | 'icons';

const SHORTCUTS: Record<string, Setting> = { t: 'theme', r: 'shape', s: 'size', i: 'icons' };
const KEY_LABELS: Record<Setting, string> = { theme: 'T', shape: 'R', size: 'S', icons: 'I' };

// A shortcut keydown and the state write it causes land within a frame or two
// of each other; the window only exists so a stale keypress cannot claim a
// later pointer-driven change (picking from the select with the mouse).
const MATCH_WINDOW_MS = 300;

/** Fields and open popups own their keys. */
function targetOwnsKeys(event: KeyboardEvent): boolean {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target) return false;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return true;
  return !!target.closest('[role="listbox"], [role="menu"], [role="dialog"], [role="combobox"], [role="option"]');
}

/** Mounts the settings shortcuts and their toasts, once, at boot. Needs
 *  `provideFluid()`, `provideFluidTheme()` and `provideToastHost()`. */
export function provideSiteShortcuts(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const settings = inject(SiteSettingsService);
      const headingFont = inject(HeadingFontService);
      const toast = inject(SiteToastService);
      const document = inject(DOCUMENT);

      let pending: { setting: Setting; at: number } | null = null;

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (targetOwnsKeys(event)) return;

        const key = event.key.toLowerCase();
        if (key === 'f') {
          event.preventDefault();
          headingFont.cycle();
          return;
        }
        const setting = SHORTCUTS[key];
        if (!setting) return;
        event.preventDefault();
        pending = { setting, at: performance.now() };
        if (setting === 'theme') settings.cycleTheme();
        else if (setting === 'shape') settings.cycleShape();
        else if (setting === 'size') settings.cycleSize();
        else settings.cycleIcons();
      };

      document.addEventListener('keydown', onKeyDown);
      inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', onKeyDown));

      // Announce the change only when a matching shortcut just fired. The
      // first run compares the seed with itself, so nothing is announced.
      let previous = {
        theme: settings.theme(),
        shape: settings.shape(),
        size: settings.size(),
        icons: settings.icons(),
      };
      effect(() => {
        const current = {
          theme: settings.theme(),
          shape: settings.shape(),
          size: settings.size(),
          icons: settings.icons(),
        };
        const changed = (
          [
            ['theme', current.theme !== previous.theme, `Theme set to ${current.theme[0].toUpperCase()}${current.theme.slice(1)}`],
            ['shape', current.shape !== previous.shape, `Radius set to ${current.shape === 'pill' ? 'Pill' : 'Rounded'}`],
            ['size', current.size !== previous.size, `Size set to ${current.size === 'compact' ? 'Compact' : 'Default'}`],
            ['icons', current.icons !== previous.icons, `Icons set to ${ICON_LIBRARY_LABELS[current.icons]}`],
          ] as const
        ).find(([, didChange]) => didChange);
        previous = current;
        if (!changed) return;
        const [setting, , message] = changed;
        if (!pending || pending.setting !== setting || performance.now() - pending.at > MATCH_WINDOW_MS) return;
        pending = null;
        toast.shortcut(KEY_LABELS[setting], message);
      });
    }),
  ]);
}
