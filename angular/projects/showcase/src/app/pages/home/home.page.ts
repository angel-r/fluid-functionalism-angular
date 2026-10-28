// ---------------------------------------------------------------------------
// The Showcase: the site's home page. Ported from app/page.tsx — the hero, its
// prev/next arrows, the three buttons, and the bento grid under them.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, Icon, SizeProvider, Tooltip, fontWeights } from '@angel-r/fluid-functionalism-angular';
import { CopyPromptButton } from '../../site/copy-prompt-button';
import { HeadingFontService } from '../../site/heading-font';
import { buildStarterPrompt } from '../../site/install-prompt';
import { SiteSettingsService } from '../../site/site-settings.service';
import { BentoGrid } from './bento-grid';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, Button, Icon, Tooltip, SizeProvider, CopyPromptButton, BentoGrid],
  templateUrl: './home.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HomePage {
  private readonly settings = inject(SiteSettingsService);
  private readonly heading = inject(HeadingFontService);

  protected readonly bold = fontWeights.bold;

  // Square icon buttons follow the site-wide size step (see /docs/sizes).
  protected readonly iconSize = computed(() => (this.settings.size() === 'compact' ? 'icon-compact' : 'icon'));

  /** The starter brief, spelled with the live settings and heading font. */
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
}
