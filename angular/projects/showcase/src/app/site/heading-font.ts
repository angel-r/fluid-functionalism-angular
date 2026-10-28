// ---------------------------------------------------------------------------
// The heading font: the right panel's Heading font row (F cycles it), the
// Google Fonts loader behind "custom", and the <html data-font> the site CSS
// keys on. Ported from lib/docs/heading-font.tsx.
//
// The choice lives on <html data-font>; a custom Google Fonts family also sets
// --font-custom (and --font-custom-weight when the visitor picked one weight
// for every heading) and loads its stylesheet. index.html's pre-paint script
// reads the same localStorage keys back, so a saved serif paints on the first
// frame.
// ---------------------------------------------------------------------------

import { DOCUMENT, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { SiteToastService } from './toast';
import {
  HEADING_FONTS,
  readHeadingFont,
  writeCustomWeight,
  writeHeadingFont,
  type HeadingFont,
} from './site-settings';
import { GOOGLE_FONTS } from './google-fonts-data';
import {
  customHeadingVars,
  googleFontHref,
  googleFontWeights,
  nearestGoogleFontWeight,
  type GoogleFont,
} from './google-fonts';

/** The built-in choices. "custom" reads as the picked family's name. */
const BUILT_IN_LABELS = {
  inter: 'Inter',
  'source-serif': 'Source Serif 4',
} as const satisfies Partial<Record<HeadingFont, string>>;

export function headingFontLabel(font: HeadingFont, custom: GoogleFont | null): string {
  return font === 'custom' ? (custom?.n ?? 'Custom') : BUILT_IN_LABELS[font];
}

@Injectable({ providedIn: 'root' })
export class HeadingFontService {
  private readonly document = inject(DOCUMENT);
  private readonly toast = inject(SiteToastService);

  /** The cookie-equivalent values the load started with, already checked
   *  against the catalog: an unknown family reads as Inter, a weight the
   *  family does not have as Auto. */
  private readonly stored = readHeadingFont();
  private readonly savedCustom = this.stored.customFamily
    ? (GOOGLE_FONTS.find((font) => font.n === this.stored.customFamily) ?? null)
    : null;
  private readonly savedWeight =
    this.savedCustom &&
    this.stored.customWeight !== null &&
    googleFontWeights(this.savedCustom).includes(this.stored.customWeight)
      ? this.stored.customWeight
      : null;

  private readonly fontState = signal<HeadingFont>(
    this.stored.font === 'custom' && !this.savedCustom ? 'inter' : this.stored.font,
  );
  private readonly customState = signal<GoogleFont | null>(this.savedCustom);
  private readonly weightState = signal<number | null>(this.savedWeight);
  private readonly pickingState = signal(false);

  readonly font = this.fontState.asReadonly();
  readonly custom = this.customState.asReadonly();
  readonly weight = this.weightState.asReadonly();
  /** True while the Google Fonts picker should be open. */
  readonly picking = this.pickingState.asReadonly();
  /** The choices on offer: "custom" only once a family was picked. */
  readonly fonts = computed<readonly HeadingFont[]>(() =>
    this.custom() ? HEADING_FONTS : HEADING_FONTS.filter((font) => font !== 'custom'),
  );

  private stylesheet: HTMLLinkElement | null = null;
  private writtenFont: HeadingFont = untracked(this.font);

  constructor() {
    effect(() => {
      const font = this.font();
      const custom = this.custom();
      const weight = this.weight();
      const root = this.document.documentElement;

      root.dataset['font'] = font;
      root.style.removeProperty('--font-custom-weight');
      if (custom) {
        for (const [name, value] of Object.entries(customHeadingVars(custom, weight))) {
          root.style.setProperty(name, value);
        }
      }
      this.loadStylesheet(font === 'custom' ? custom : null);

      if (font !== this.writtenFont) {
        this.writtenFont = font;
        writeHeadingFont('font', font);
      }
    });
  }

  /** Switches the heading font. "custom" with no family yet opens the picker. */
  setFont(next: HeadingFont): void {
    if (next === 'custom' && !this.custom()) this.pickingState.set(true);
    else this.fontState.set(next);
  }

  /** F: the choices on offer, in order. */
  cycle(): void {
    const fonts = this.fonts();
    const next = fonts[(fonts.indexOf(this.font()) + 1) % fonts.length];
    this.setFont(next);
    this.toast.shortcut('F', `Heading font set to ${headingFontLabel(next, this.custom())}`);
  }

  browse(): void {
    this.pickingState.set(true);
  }

  closePicker(): void {
    this.pickingState.set(false);
  }

  /** A new family keeps the picked weight when it has it, else the nearest
   *  weight it does have. */
  pick(family: GoogleFont): void {
    const weight = this.weight();
    const nextWeight = weight === null ? null : nearestGoogleFontWeight(family, weight);
    this.customState.set(family);
    this.weightState.set(nextWeight);
    writeHeadingFont('customFont', family.n);
    writeCustomWeight(nextWeight);
    this.fontState.set('custom');
    this.pickingState.set(false);
  }

  /** `null` is Auto, the role weights. */
  setWeight(weight: number | null): void {
    this.weightState.set(weight);
    writeCustomWeight(weight);
  }

  /** Loads the whole family, in place rather than hoisted: a stylesheet in
   *  <head> that suspends the first paint would hide the page for a font. */
  private loadStylesheet(font: GoogleFont | null): void {
    if (!font) {
      this.stylesheet?.remove();
      this.stylesheet = null;
      return;
    }
    if (!this.stylesheet) {
      const link = this.document.createElement('link');
      link.rel = 'stylesheet';
      this.stylesheet = link;
      this.document.head.appendChild(link);
    }
    const href = googleFontHref(font);
    if (this.stylesheet.getAttribute('href') !== href) this.stylesheet.setAttribute('href', href);
  }
}
