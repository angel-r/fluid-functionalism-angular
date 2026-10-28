// ---------------------------------------------------------------------------
// The "Make them yours" settings (theme, radius, size, icons) and the heading
// font, and where the browser keeps them.
//
// The React site keeps each one in a cookie so the server can render the
// visitor's last choice on the first paint. There is no server here, so the
// same `ff_*` keys live in localStorage and index.html's pre-paint script
// applies them before Angular boots (see the inline script there). The names
// match `lib/docs/site-settings.ts` exactly.
// ---------------------------------------------------------------------------

import type { ShapeVariant, SizeVariant, Theme } from '@angel-r/fluid-functionalism-angular';
import type { IconLibrary } from './icon-map';

export interface SiteSettings {
  theme: Theme;
  shape: ShapeVariant;
  size: SizeVariant;
  icons: IconLibrary;
}

/** What a first visit sees. The React default icon library is Untitled UI. */
export const DEFAULT_SETTINGS: SiteSettings = {
  theme: 'system',
  shape: 'rounded',
  size: 'default',
  icons: 'untitledui',
};

/** Every value each setting accepts, in the order the site lists them. */
export const SETTING_VALUES = {
  theme: ['system', 'light', 'dark'],
  shape: ['rounded', 'pill'],
  size: ['default', 'compact'],
  icons: ['lucide', 'tabler', 'phosphor', 'hugeicons', 'untitledui'],
} as const satisfies { [K in keyof SiteSettings]: readonly SiteSettings[K][] };

export const SETTINGS_KEYS: Record<keyof SiteSettings, string> = {
  theme: 'ff_theme',
  shape: 'ff_shape',
  size: 'ff_size',
  icons: 'ff_icons',
};

export type HeadingFont = 'inter' | 'source-serif' | 'custom';

export const HEADING_FONTS = ['inter', 'source-serif', 'custom'] as const satisfies readonly HeadingFont[];

export const DEFAULT_HEADING_FONT: HeadingFont = 'inter';

/** The heading font, the Google Fonts family behind "custom" (its catalog
 *  name, unencoded), and the weight every heading takes in it (`null` is
 *  Auto, the role weights). */
export const FONT_KEYS = {
  font: 'ff_font',
  customFont: 'ff_font_custom',
  customWeight: 'ff_font_weight',
} as const;

export interface StoredHeadingFont {
  font: HeadingFont;
  customFamily: string | null;
  customWeight: number | null;
}

/** localStorage, or null where it is unavailable (private mode, blocked
 *  storage): every read then falls back to the defaults and every write is a
 *  no-op, so the site still works, it just forgets. */
function siteStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readSetting<K extends keyof SiteSettings>(key: K, stored: Storage | null): SiteSettings[K] {
  const raw = stored?.getItem(SETTINGS_KEYS[key]);
  const allowed = SETTING_VALUES[key] as readonly string[];
  return (raw && allowed.includes(raw) ? raw : DEFAULT_SETTINGS[key]) as SiteSettings[K];
}

/** Every settings value, falling back to the default for a missing or unknown
 *  one. Safe to call before Angular boots. */
export function readSiteSettings(stored = siteStorage()): SiteSettings {
  return {
    theme: readSetting('theme', stored),
    shape: readSetting('shape', stored),
    size: readSetting('size', stored),
    icons: readSetting('icons', stored),
  };
}

export function writeSetting<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]): void {
  siteStorage()?.setItem(SETTINGS_KEYS[key], value);
}

/** The saved heading font, custom family name and custom weight. The caller
 *  checks family and weight against the catalog, falling back to Inter and
 *  Auto when they are unknown. */
export function readHeadingFont(stored = siteStorage()): StoredHeadingFont {
  const raw = stored?.getItem(FONT_KEYS.font);
  const font = (HEADING_FONTS as readonly string[]).includes(raw ?? '')
    ? (raw as HeadingFont)
    : DEFAULT_HEADING_FONT;
  const family = stored?.getItem(FONT_KEYS.customFont) ?? null;
  const weight = Number(stored?.getItem(FONT_KEYS.customWeight));
  return {
    font,
    customFamily: family,
    customWeight: Number.isInteger(weight) && weight >= 1 && weight <= 1000 ? weight : null,
  };
}

export function writeHeadingFont<K extends 'font' | 'customFont'>(key: K, value: string): void {
  siteStorage()?.setItem(FONT_KEYS[key], value);
}

/** Stores the custom weight; `null` (Auto) clears it. */
export function writeCustomWeight(weight: number | null): void {
  const stored = siteStorage();
  if (!stored) return;
  if (weight === null) stored.removeItem(FONT_KEYS.customWeight);
  else stored.setItem(FONT_KEYS.customWeight, String(weight));
}
