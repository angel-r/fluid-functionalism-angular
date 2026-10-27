import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  BANNER_PARTS,
  Button,
  Switch,
  type BannerContrast,
  type BannerStatus,
  type BannerVariant,
} from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import {
  PLAY_SWITCH,
  PlayDivider,
  PlayField,
  PlaySection,
  PlaySelect,
  PlaygroundLayout,
  PlaygroundOverlay,
  PlaygroundPanel,
} from '../../../docs-kit/playground';
import { PropsTable } from '../../../docs-kit/props-table';
import { injectPresetGlobals } from '../../../docs-kit/preset/preset-globals';
import { actionProps, bannerProps, partProps } from '../../../docs-kit/api/banner';
import { BannerInlinePage, BannerMockPage } from './banner-parts';
import {
  BANNER_COPY,
  BANNER_STATUSES,
  DEFAULT_BANNER_STATE,
  buildBannerCode,
  randomBannerState,
  type BannerPlayState,
} from './banner-playground';

const statusesCode = `import { BANNER_PARTS } from '@angel-r/fluid-functionalism-angular';

<!-- status: "default" | "info" | "success" | "warning" | "error" -->
<ff-banner status="info">
  <p ffBannerTitle>Info</p>
</ff-banner>
<ff-banner status="info" contrast="high">
  <p ffBannerTitle>Info</p>
</ff-banner>`;

const actionsCode = `import { BANNER_PARTS } from '@angel-r/fluid-functionalism-angular';

<!-- Write primary first: that's the tab order. The banner lays the
     actions out by variant. -->

<!-- Title only: they trail the title, primary at the edge -->
<ff-banner status="info">
  <p ffBannerTitle>Enjoying Fluid Functionalism?</p>
  <div ffBannerActions>
    <ff-banner-action variant="primary">Star on GitHub</ff-banner-action>
    <ff-banner-action>Share</ff-banner-action>
    <ff-banner-action variant="ghost">Later</ff-banner-action>
  </div>
</ff-banner>

<!-- With a description: they drop under the text, primary first -->
<ff-banner status="info">
  <p ffBannerTitle>The registry has new components</p>
  <p ffBannerDescription>Run the install command again to pull the latest versions.</p>
  <div ffBannerActions>
    <ff-banner-action variant="primary">Copy command</ff-banner-action>
    <ff-banner-action>What's new</ff-banner-action>
    <ff-banner-action variant="ghost">Later</ff-banner-action>
  </div>
</ff-banner>`;

const fixedCode = `import { BANNER_PARTS } from '@angel-r/fluid-functionalism-angular';

<!-- Between the header and the content that scrolls -->
<div class="flex h-dvh flex-col">
  <app-header />
  <ff-banner variant="fixed" status="warning" dismissible>
    <p ffBannerTitle>Registry maintenance tonight at 22:00 UTC</p>
    <div ffBannerActions>
      <ff-banner-action>Details</ff-banner-action>
    </div>
  </ff-banner>
  <main class="flex-1 overflow-y-auto"><!-- page content --></main>
</div>`;

const iconCode = `import { BANNER_PARTS } from '@angel-r/fluid-functionalism-angular';

<ff-banner icon="bell">
  <p ffBannerTitle>3 new components since your last visit</p>
</ff-banner>`;

const installUsage = `<ff-banner status="warning" contrast="high" dismissible>
  <p ffBannerTitle>Inter is missing its opsz axis</p>
  <p ffBannerDescription>Labels shift when their weight changes.</p>
  <div ffBannerActions>
    <ff-banner-action variant="primary">Show the fix</ff-banner-action>
    <ff-banner-action>Read the guide</ff-banner-action>
    <ff-banner-action variant="ghost">Ignore</ff-banner-action>
  </div>
</ff-banner>`;

const installProps: readonly string[] = [
  'status: "default" | "info" | "success" | "warning" | "error" (default "default"). The status color and the glyph that carries it.',
  'contrast: "low" | "high" (default "low"). low: neutral fill, colored icon. high: a light wash of the status color.',
  'variant: "inline" | "fixed" (default "inline"). fixed: a full-bleed bar that sticks to the top of its scroll container and pushes the content down.',
  'icon: IconName | IconDefinition. Replaces the status icon, drawn as an outline in the status color.',
  'dismissible: boolean (default false). Shows a ✕ button; dismiss fires when it is pressed.',
  'open: boolean. Controls visibility; omitted, the ✕ hides the banner on its own. Closing collapses its height.',
  'size: "default" | "compact" (default from provideFluid). Step on the size ladder.',
  'motion: BannerMotionConfig (default bannerMotion). Overrides the appear and dismiss values for this banner; the exported bannerMotion holds the token-derived defaults.',
  'BannerAction: takes Button props (variant "primary" | "secondary" | "ghost", laid out by variant; href renders a link; external opens it in a new tab).',
  'Parts: [ffBannerTitle], [ffBannerDescription] and [ffBannerActions] wrap up to 3 ff-banner-action.',
];

@Component({
  selector: 'app-banner-page',
  imports: [
    NgTemplateOutlet,
    DocPage,
    DocSection,
    ComponentPreview,
    PropsTable,
    PlaygroundLayout,
    PlaygroundOverlay,
    PlaygroundPanel,
    PlayField,
    PlaySelect,
    PlaySection,
    PlayDivider,
    Switch,
    BANNER_PARTS,
    Button,
    BannerMockPage,
    BannerInlinePage,
  ],
  templateUrl: './banner.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BannerPage {
  protected readonly variant = signal<BannerVariant>(DEFAULT_BANNER_STATE.variant);
  protected readonly status = signal<BannerStatus>(DEFAULT_BANNER_STATE.status);
  protected readonly contrast = signal<BannerContrast>(DEFAULT_BANNER_STATE.contrast);
  protected readonly description = signal(DEFAULT_BANNER_STATE.description);
  protected readonly primary = signal(DEFAULT_BANNER_STATE.primary);
  protected readonly secondary = signal(DEFAULT_BANNER_STATE.secondary);
  protected readonly ghost = signal(DEFAULT_BANNER_STATE.ghost);
  protected readonly dismissible = signal(DEFAULT_BANNER_STATE.dismissible);
  protected readonly open = signal(true);

  protected readonly copy = computed(() => BANNER_COPY[this.status()]);
  protected readonly statuses = BANNER_STATUSES;
  protected readonly contrasts: readonly { value: BannerContrast; label: string }[] = [
    { value: 'low', label: 'Low contrast' },
    { value: 'high', label: 'High contrast' },
  ];
  protected readonly variantOptions = [
    { value: 'inline', label: 'Inline' },
    { value: 'fixed', label: 'Fixed' },
  ];
  protected readonly statusOptions = BANNER_STATUSES;
  protected readonly contrastOptions = [
    { value: 'low', label: 'Low' },
    { value: 'high', label: 'High' },
  ];
  protected readonly playSwitch = PLAY_SWITCH;
  protected readonly bannerProps = bannerProps;
  protected readonly partProps = partProps;
  protected readonly actionProps = actionProps;
  protected readonly statusesCode = statusesCode;
  protected readonly actionsCode = actionsCode;
  protected readonly fixedCode = fixedCode;
  protected readonly iconCode = iconCode;
  protected readonly installUsage = installUsage;
  protected readonly installProps = installProps;

  /** Remounts the fixed demo so its bar replays its entrance (the reference's
   *  replay control). */
  protected readonly fixedShown = signal(true);

  private readonly globals = injectPresetGlobals();

  protected readonly code = computed(() =>
    buildBannerCode(
      {
        variant: this.variant(),
        status: this.status(),
        contrast: this.contrast(),
        description: this.description(),
        primary: this.primary(),
        secondary: this.secondary(),
        ghost: this.ghost(),
        dismissible: this.dismissible(),
      },
      this.globals(),
    ),
  );

  /** Every control's value: the inline page re-measures when it changes. */
  protected readonly resetKey = computed(() =>
    [
      this.variant(),
      this.status(),
      this.contrast(),
      this.description(),
      this.primary(),
      this.secondary(),
      this.ghost(),
      this.dismissible(),
    ].join(),
  );

  protected setVariant(value: string): void {
    this.variant.set(value as BannerVariant);
  }

  protected setStatus(value: string): void {
    this.status.set(value as BannerStatus);
  }

  protected setContrast(value: string): void {
    this.contrast.set(value as BannerContrast);
  }

  /** Toggling dismissible always brings the banner back, so the control never
   *  acts on a bar that isn't there. */
  protected setDismissible(checked: boolean): void {
    this.dismissible.set(checked);
    this.open.set(true);
  }

  protected shuffle(): void {
    const next: BannerPlayState = randomBannerState();
    this.variant.set(next.variant);
    this.status.set(next.status);
    this.contrast.set(next.contrast);
    this.description.set(next.description);
    this.primary.set(next.primary);
    this.secondary.set(next.secondary);
    this.ghost.set(next.ghost);
    this.dismissible.set(next.dismissible);
    this.open.set(true);
  }

  protected replayFixed(): void {
    this.fixedShown.set(false);
    setTimeout(() => this.fixedShown.set(true));
  }
}
