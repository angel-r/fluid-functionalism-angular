// ---------------------------------------------------------------------------
// "Make them yours": the settings block the right panel shows on desktop and
// the mobile sheet repeats in its footer. Ported from app/components/right-panel.tsx
// (SettingsContent), with D1's Primitive row removed: Theme, Radius, Size,
// Icons and Heading font, then the install prompt and the credit.
//
// Each row names its shortcut in a tooltip (T, R, S, I, F). The values live in
// SiteSettingsService and HeadingFontService, so a row here and the T/R/S/I/F
// shortcuts write the same state.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Tooltip,
  type IconName,
  type ShapeVariant,
  type SizeVariant,
  type Theme,
  type TooltipSide,
} from '@angel-r/fluid-functionalism-angular';
import { SiteSettingsService } from '../site/site-settings.service';
import { HeadingFontService, headingFontLabel } from '../site/heading-font';
import { ICON_LIBRARY_LABELS, ICON_LIBRARY_ORDER, type IconLibrary } from '../site/icon-map';
import { buildStarterPrompt } from '../site/install-prompt';
import { CopyPromptButton } from '../site/copy-prompt-button';
import { HeadingWeightSelect } from './heading-weight-select';

/** The heading font select's action row: opens the Google Fonts picker. */
const BROWSE = '__browse';

/** The select's trigger: borderless, control height, site body size. */
const TRIGGER = 'min-w-0 w-auto h-7 px-2 text-site-body';

@Component({
  selector: 'app-settings-content',
  // The host stands in for React's fragment/root element: contents keeps it
  // out of the layout its children measured themselves against.
  host: { style: 'display: contents' },
  imports: [
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    Tooltip,
    CopyPromptButton,
    HeadingWeightSelect,
  ],
  templateUrl: './settings-content.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsContent {
  /** Which side the shortcut tooltips open on: left in the panel, right in
   *  the mobile sheet (where the panel is a drawer from the left edge). */
  readonly tooltipSide = input<TooltipSide>('left');

  protected readonly TRIGGER = TRIGGER;
  protected readonly BROWSE = BROWSE;
  protected readonly settings = inject(SiteSettingsService);
  protected readonly heading = inject(HeadingFontService);

  protected readonly themeOptions: readonly { label: string; value: Theme; icon: IconName }[] = [
    { label: 'System', value: 'system', icon: 'monitor' },
    { label: 'Light', value: 'light', icon: 'sun' },
    { label: 'Dark', value: 'dark', icon: 'moon' },
  ];

  protected readonly shapeOptions: readonly { label: string; value: ShapeVariant; icon: IconName }[] = [
    { label: 'Rounded', value: 'rounded', icon: 'rectangle-horizontal' },
    { label: 'Pill', value: 'pill', icon: 'circle' },
  ];

  protected readonly sizeOptions: readonly { label: string; value: SizeVariant }[] = [
    { label: 'Default', value: 'default' },
    { label: 'Compact', value: 'compact' },
  ];

  protected readonly iconOptions: readonly { label: string; value: IconLibrary; icon: IconName }[] =
    ICON_LIBRARY_ORDER.map((library) => ({
      label: ICON_LIBRARY_LABELS[library],
      value: library,
      icon: 'palette',
    }));

  protected readonly themeIcon = computed(
    () => this.themeOptions.find((option) => option.value === this.settings.theme())?.icon,
  );
  protected readonly shapeIcon = computed(
    () => this.shapeOptions.find((option) => option.value === this.settings.shape())?.icon,
  );

  /** The installer carries everything set above, live. */
  protected readonly starterPrompt = computed(() =>
    buildStarterPrompt(
      {
        theme: this.settings.theme(),
        shape: this.settings.shape(),
        size: this.settings.size(),
        icons: this.settings.icons(),
      },
      { font: this.heading.font(), custom: this.heading.custom(), weight: this.heading.weight() },
    ),
  );

  protected fontLabel(font: 'inter' | 'source-serif' | 'custom'): string {
    return headingFontLabel(font, this.heading.custom());
  }

  protected setTheme(value: string): void {
    this.settings.setTheme(value as Theme);
  }

  protected setShape(value: string): void {
    this.settings.setShape(value as ShapeVariant);
  }

  protected setSize(value: string): void {
    this.settings.setSize(value as SizeVariant);
  }

  protected setIcons(value: string): void {
    this.settings.setIcons(value as IconLibrary);
  }

  /** The last row is an action, not a value: it opens the Google Fonts picker
   *  and leaves the selection alone. */
  protected setFont(value: string): void {
    if (value === BROWSE) this.heading.browse();
    else this.heading.setFont(value as 'inter' | 'source-serif' | 'custom');
  }
}
