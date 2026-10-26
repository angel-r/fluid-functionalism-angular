import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BANNER_PARTS, Button, type BannerContrast, type BannerStatus } from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

const STATUSES: { status: BannerStatus; label: string }[] = [
  { status: 'default', label: 'Default' },
  { status: 'info', label: 'Info' },
  { status: 'success', label: 'Success' },
  { status: 'warning', label: 'Warning' },
  { status: 'error', label: 'Error' },
];

const CONTRASTS: { contrast: BannerContrast; label: string }[] = [
  { contrast: 'low', label: 'Low contrast' },
  { contrast: 'high', label: 'High contrast' },
];

@Component({
  selector: 'app-banner-demo',
  imports: [DemoPage, DemoSection, BANNER_PARTS, Button],
  template: `
    <app-demo-page
      title="Banner"
      description="A status message: 1 colored icon, a title, an optional description and up to 3 actions."
    >
      <app-demo-section title="Statuses">
        <div class="grid w-full max-w-[560px] grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2">
          @for (c of contrasts; track c.contrast) {
            <div class="flex flex-col gap-2">
              <span class="px-1 text-site-caption text-muted-foreground">{{ c.label }}</span>
              @for (s of statuses; track s.status) {
                <ff-banner [status]="s.status" [contrast]="c.contrast">
                  <p ffBannerTitle>{{ s.label }}</p>
                </ff-banner>
              }
            </div>
          }
        </div>
      </app-demo-section>

      <app-demo-section title="Actions">
        <div class="flex w-full max-w-[520px] flex-col gap-3">
          <ff-banner status="info">
            <p ffBannerTitle>Enjoying Fluid Functionalism?</p>
            <div ffBannerActions>
              <ff-banner-action variant="primary">Star on GitHub</ff-banner-action>
              <ff-banner-action>Share</ff-banner-action>
              <ff-banner-action variant="ghost">Later</ff-banner-action>
            </div>
          </ff-banner>
          <ff-banner status="info">
            <p ffBannerTitle>The registry has new components</p>
            <p ffBannerDescription>Run the install command again to pull the latest versions.</p>
            <div ffBannerActions>
              <ff-banner-action variant="primary">Copy command</ff-banner-action>
              <ff-banner-action>What's new</ff-banner-action>
              <ff-banner-action variant="ghost">Later</ff-banner-action>
            </div>
          </ff-banner>
        </div>
      </app-demo-section>

      <app-demo-section title="Fixed">
        <div class="flex w-full max-w-[560px] flex-col items-start gap-3">
          <div class="h-[300px] w-full overflow-y-auto rounded-xl border border-border bg-background">
            @if (fixedShown()) {
              <ff-banner variant="fixed" status="warning" dismissible>
                <p ffBannerTitle>Registry maintenance tonight at 22:00 UTC</p>
                <div ffBannerActions>
                  <ff-banner-action>Details</ff-banner-action>
                </div>
              </ff-banner>
            }
            <div class="flex flex-col gap-3 p-4">
              @for (line of lines; track $index) {
                <div class="h-4 rounded bg-muted" [style.width.%]="line"></div>
              }
            </div>
          </div>
          <button ffButton variant="tertiary" size="compact" (click)="replayFixed()">Replay</button>
        </div>
      </app-demo-section>

      <app-demo-section title="Custom icon">
        <div class="w-full max-w-[520px]">
          <ff-banner icon="bell">
            <p ffBannerTitle>3 new components since your last visit</p>
          </ff-banner>
        </div>
      </app-demo-section>

      <app-demo-section title="Dismiss and re-open">
        <div class="flex w-full max-w-[520px] flex-col gap-3">
          <p class="text-site-body text-muted-foreground">Content above the banner.</p>
          <ff-banner status="success" dismissible [open]="open()" (dismiss)="open.set(false)">
            <p ffBannerTitle>Changes saved</p>
            <p ffBannerDescription>Closing collapses its height, so the content below slides up.</p>
          </ff-banner>
          <p class="text-site-body text-muted-foreground">Content below the banner.</p>
          <div>
            <button ffButton variant="secondary" size="compact" [disabled]="open()" (click)="open.set(true)">
              Show again
            </button>
          </div>
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BannerDemo {
  protected readonly statuses = STATUSES;
  protected readonly contrasts = CONTRASTS;
  protected readonly lines = [92, 76, 84, 60, 88, 70, 95, 64, 80, 72, 90, 58, 86, 74];
  protected readonly fixedShown = signal(true);
  protected readonly open = signal(true);

  /** Remounts the fixed bar, like the docs' replay button. */
  protected replayFixed() {
    this.fixedShown.set(false);
    setTimeout(() => this.fixedShown.set(true));
  }
}
