// The site's settings state: theme, radius, size and icon library, all
// switchable from the right panel, the command menu, the settings shortcuts
// (T/R/S/I) and the playgrounds. One service owns the values and writes each
// change back to localStorage, where index.html's pre-paint script and the
// next boot read them.

import { DOCUMENT, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  ThemeService,
  injectShapeContext,
  injectSizeContext,
  type ShapeVariant,
  type SizeVariant,
  type Theme,
} from '@angel-r/fluid-functionalism-angular';
import { ICON_LIBRARY_ORDER, type IconLibrary } from './icon-map';
import { readSiteSettings, writeSetting, type SiteSettings } from './site-settings';

const SHAPE_ORDER: readonly ShapeVariant[] = ['rounded', 'pill'];

@Injectable({ providedIn: 'root' })
export class SiteSettingsService {
  private readonly themeService = inject(ThemeService);
  private readonly shapeContext = injectShapeContext();
  private readonly sizeContext = injectSizeContext();
  private readonly document = inject(DOCUMENT);

  readonly theme = this.themeService.theme;
  readonly shape = this.shapeContext.shape;
  readonly size = this.sizeContext.size;

  private readonly library = signal<IconLibrary>(untracked(() => readSiteSettings().icons));
  readonly icons = this.library.asReadonly();

  /** The values a load started with: nothing is written until one changes, so
   *  a first visit stores nothing at all. */
  private written: SiteSettings = {
    theme: untracked(this.theme),
    shape: untracked(this.shape),
    size: untracked(this.size),
    icons: untracked(this.icons),
  };

  constructor() {
    // Mirrors the size step onto <html data-size> so the plain-CSS type-scale
    // variables (--fs-site-*) follow the ladder. The React site mounts this as
    // SizeAttribute; with no server it lives with the settings that drive it.
    effect(() => {
      this.document.documentElement.dataset['size'] = this.size();
    });

    effect(() => {
      const current: SiteSettings = {
        theme: this.theme(),
        shape: this.shape(),
        size: this.size(),
        icons: this.icons(),
      };
      for (const key of Object.keys(current) as (keyof SiteSettings)[]) {
        if (current[key] !== this.written[key]) writeSetting(key, current[key]);
      }
      this.written = current;
    });
  }

  setTheme(next: Theme): void {
    this.themeService.setTheme(next);
  }

  /** T: system → light → dark → system. */
  cycleTheme(): void {
    this.themeService.cycle();
  }

  setShape(next: ShapeVariant): void {
    this.shapeContext.setShape(next);
  }

  /** R: rounded → pill. */
  cycleShape(): void {
    const index = SHAPE_ORDER.indexOf(this.shape());
    this.shapeContext.setShape(SHAPE_ORDER[(index + 1) % SHAPE_ORDER.length]);
  }

  setSize(next: SizeVariant): void {
    this.sizeContext.setSize(next);
  }

  /** S: default ↔ compact. */
  cycleSize(): void {
    this.sizeContext.setSize(this.size() === 'default' ? 'compact' : 'default');
  }

  setIcons(next: IconLibrary): void {
    this.library.set(next);
  }

  /** I: Lucide → Tabler → Phosphor → HugeIcons → Untitled UI → Lucide. */
  cycleIcons(): void {
    const index = ICON_LIBRARY_ORDER.indexOf(this.icons());
    this.library.set(ICON_LIBRARY_ORDER[(index + 1) % ICON_LIBRARY_ORDER.length]);
  }
}
