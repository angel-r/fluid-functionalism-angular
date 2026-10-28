// The Icons setting, as the library wants it: the full reactive map over the
// installed one. `SiteSettingsService.icons()` is a signal, so switching packs
// in the right panel repaints every <ff-icon> without a reload.

import { type Provider, computed, inject } from '@angular/core';
import { FF_ICONS, FF_ICON_SOURCE } from '@angel-r/fluid-functionalism-angular';
import { ICON_PACKS } from './icon-map';
import { SiteSettingsService } from './site-settings.service';

/** Icons from the current site setting, merged over the map `provideIcons()`
 *  installed (Lucide, unless the app overrode it), so a pack that leaves a
 *  slot out keeps the default glyph there. */
export function provideSiteIcons(): Provider {
  return {
    provide: FF_ICON_SOURCE,
    useFactory: () => {
      const settings = inject(SiteSettingsService);
      const base = inject(FF_ICONS);
      return computed(() => ({ ...base, ...ICON_PACKS[settings.icons()] }));
    },
  };
}
