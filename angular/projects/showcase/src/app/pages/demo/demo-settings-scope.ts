// ---------------------------------------------------------------------------
// The /demo settings sandbox: the "Make them yours" slide's five settings, kept
// to the page.
//
// The slide is the right panel's SettingsContent (shell/settings-content.ts),
// so the markup, rows and shortcuts stay one implementation. That component
// reads SiteSettingsService, which writes the site's settings; here the page
// provides its own SiteSettingsService surface on the scope element instead, so
// the same panel drives the page alone. Shape and size come from the
// `ffShapeProvider` / `ffSizeProvider` on that element (the library's own
// scoped providers), icons from a scoped icon source, and the theme from the
// document-level ThemeService — the only mechanism a theme has, since the
// tokens resolve from <html> — restored to the site's theme when the page is
// destroyed.
//
// The site's settings shortcuts (settings-shortcuts.ts) are intercepted here
// for the same reason: the slide's tooltips promise T / R / S / I, and left
// alone the shell's handler would change the site behind the page. F stays with
// the site: the heading font is a document-level setting.
// ---------------------------------------------------------------------------

import { DOCUMENT, Directive, DestroyRef, computed, inject, signal, untracked } from '@angular/core';
import {
  FF_ICONS,
  FF_ICON_SOURCE,
  ShapeContext,
  ShapeProvider,
  SizeContext,
  SizeProvider,
  ThemeService,
  type ShapeVariant,
  type SizeVariant,
  type Theme,
} from '@angel-r/fluid-functionalism-angular';
import { ICON_LIBRARY_LABELS, ICON_LIBRARY_ORDER, ICON_PACKS, type IconLibrary } from '../../site/icon-map';
import { SiteToastService } from '../../site/toast';
import { SiteSettingsService } from '../../site/site-settings.service';

const THEME_ORDER: readonly Theme[] = ['system', 'light', 'dark'];

type Setting = 'theme' | 'shape' | 'size' | 'icons';

const KEY_LABELS: Record<Setting, string> = { theme: 'T', shape: 'R', size: 'S', icons: 'I' };

/** Fields and open popups own their keys, as in settings-shortcuts.ts. */
function targetOwnsKeys(event: KeyboardEvent): boolean {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target) return false;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return true;
  return !!target.closest('[role="listbox"], [role="menu"], [role="dialog"], [role="combobox"], [role="option"]');
}

/**
 * Scopes the settings panel to a region:
 * `<div appDemoSettingsScope ffShapeProvider ffSizeProvider>`.
 * The two providers must sit on the same element: the scope reads and writes
 * them, and DI resolves both from this element's injector.
 */
@Directive({
  selector: '[appDemoSettingsScope]',
  providers: [
    { provide: SiteSettingsService, useExisting: DemoSettingsScope },
    {
      // The Icons row, scoped: the same merge the site does in site-icons.ts,
      // over this scope's signal, so <ff-icon> inside the page repaints while
      // the site keeps its own pack.
      provide: FF_ICON_SOURCE,
      useFactory: () => {
        const scope = inject(DemoSettingsScope);
        const base = inject(FF_ICONS);
        return computed(() => ({ ...base, ...ICON_PACKS[scope.icons()] }));
      },
    },
  ],
})
export class DemoSettingsScope
  implements
    Pick<SiteSettingsService, 'theme' | 'shape' | 'size' | 'icons' | 'setTheme' | 'setShape' | 'setSize' | 'setIcons'>
{
  // The site's values, read above this element: the panel opens where the
  // visitor left the site, and the page puts it back on the way out.
  private readonly siteShape = inject(ShapeContext, { skipSelf: true });
  private readonly siteSize = inject(SizeContext, { skipSelf: true });
  private readonly siteSettings = inject(SiteSettingsService, { skipSelf: true });
  private readonly themeService = inject(ThemeService);
  private readonly toast = inject(SiteToastService);
  private readonly document = inject(DOCUMENT);

  // The scoped providers, from the same element (ffShapeProvider /
  // ffSizeProvider). They are the page's shape and size.
  private readonly shapeProvider = inject(ShapeProvider);
  private readonly sizeProvider = inject(SizeProvider);

  readonly shape = this.shapeProvider.shape;
  readonly size = this.sizeProvider.size;

  private readonly siteTheme = untracked(() => this.themeService.theme());
  private readonly themeState = signal<Theme>(this.siteTheme);
  readonly theme = this.themeState.asReadonly();

  private readonly library = signal<IconLibrary>(untracked(() => this.siteSettings.icons()));
  readonly icons = this.library.asReadonly();

  constructor() {
    this.document.addEventListener('keydown', this.onKeyDown, true);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('keydown', this.onKeyDown, true);
      // The theme and the size step's type scale are document-level (the
      // tokens resolve from <html>), so they are the two settings the page
      // writes outside itself: hand the site back its own. (Unchanged means a
      // no-op.)
      this.themeService.setTheme(this.siteTheme);
      this.document.documentElement.dataset['size'] = this.siteSize.size();
      // A shape change publishes its input radius on <html> (core/shape.ts);
      // the scoped provider's last value would outlive the page.
      this.document.documentElement.style.setProperty('--shape-input-radius', `${this.siteShape.classes().bgRadius}px`);
    });
  }

  setTheme(next: Theme): void {
    if (next === this.themeState()) return;
    this.themeState.set(next);
    this.themeService.setTheme(next);
  }

  setShape(next: ShapeVariant): void {
    this.shapeProvider.setShape(next);
  }

  setSize(next: SizeVariant): void {
    if (next === this.size()) return;
    this.sizeProvider.setSize(next);
    // Site chrome (`.text-site-*`, the site's own type scale) reads
    // <html data-size>; the provider only covers control heights.
    this.document.documentElement.dataset['size'] = next;
  }

  setIcons(next: IconLibrary): void {
    this.library.set(next);
  }

  /** The site's T / R / S / I shortcuts, aimed at this scope. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (targetOwnsKeys(event)) return;

    const key = event.key.toLowerCase();
    const setting: Setting | undefined =
      key === 't' ? 'theme' : key === 'r' ? 'shape' : key === 's' ? 'size' : key === 'i' ? 'icons' : undefined;
    if (!setting) return;

    event.preventDefault();
    // The shell's handler listens on document in the bubble phase; stopping
    // the event in this capture phase keeps it from changing the site.
    event.stopPropagation();
    this.cycle(setting);
  };

  private cycle(setting: Setting): void {
    if (setting === 'theme') {
      this.setTheme(THEME_ORDER[(THEME_ORDER.indexOf(this.theme()) + 1) % THEME_ORDER.length]);
    } else if (setting === 'shape') {
      this.setShape(this.shape() === 'pill' ? 'rounded' : 'pill');
    } else if (setting === 'size') {
      this.setSize(this.size() === 'compact' ? 'default' : 'compact');
    } else {
      const next = (ICON_LIBRARY_ORDER.indexOf(this.icons()) + 1) % ICON_LIBRARY_ORDER.length;
      this.setIcons(ICON_LIBRARY_ORDER[next]);
    }
    this.toast.shortcut(KEY_LABELS[setting], this.message(setting));
  }

  private message(setting: Setting): string {
    if (setting === 'theme') {
      const theme = this.theme();
      return `Theme set to ${theme[0].toUpperCase()}${theme.slice(1)}`;
    }
    if (setting === 'shape') return `Radius set to ${this.shape() === 'pill' ? 'Pill' : 'Rounded'}`;
    if (setting === 'size') return `Size set to ${this.size() === 'compact' ? 'Compact' : 'Default'}`;
    return `Icons set to ${ICON_LIBRARY_LABELS[this.icons()]}`;
  }
}
