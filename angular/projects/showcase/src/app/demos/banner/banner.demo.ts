import { NgTemplateOutlet } from '@angular/common';
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
  imports: [NgTemplateOutlet, DemoPage, DemoSection, BANNER_PARTS, Button],
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
        <div class="w-full max-w-[560px]">
          <ng-container *ngTemplateOutlet="mockPage; context: { $implicit: true }" />
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

      <app-demo-section title="Fixed: replay the entrance">
        <div class="flex w-full max-w-[560px] flex-col items-start gap-3">
          <ng-container *ngTemplateOutlet="mockPage; context: { $implicit: replayShown() }" />
          <button ffButton variant="tertiary" size="compact" (click)="replayFixed()">Replay</button>
        </div>
      </app-demo-section>
    </app-demo-page>

    <!-- The docs' MockPage: a header strip, the banner, then skeleton rows. -->
    <ng-template #mockPage let-shown>
      <div class="flex h-[300px] w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
        <div class="flex h-11 shrink-0 items-center gap-4 border-b border-border/60 px-4" aria-hidden="true">
          <div class="size-5 rounded-md bg-muted"></div>
          <div class="flex items-center gap-3">
            <div class="h-2.5 w-10 rounded-full bg-muted"></div>
            <div class="h-2.5 w-12 rounded-full bg-muted"></div>
            <div class="h-2.5 w-9 rounded-full bg-muted"></div>
          </div>
          <div class="ml-auto size-6 rounded-full bg-muted"></div>
        </div>
        @if (shown) {
          <ff-banner variant="fixed" status="warning" dismissible>
            <p ffBannerTitle>Registry maintenance tonight at 22:00 UTC</p>
            <div ffBannerActions>
              <ff-banner-action>Details</ff-banner-action>
            </div>
          </ff-banner>
        }
        <div class="min-h-0 flex-1 overflow-y-auto">
          <div class="flex flex-col gap-3 p-5" aria-hidden="true">
            <div class="h-3 w-1/3 rounded-full bg-muted"></div>
            @for (width of rowWidths; track $index) {
              <div class="h-2.5 rounded-full bg-muted" [style.width.%]="width"></div>
            }
          </div>
        </div>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BannerDemo {
  protected readonly statuses = STATUSES;
  protected readonly contrasts = CONTRASTS;
  // The docs' MockPage skeleton rows.
  protected readonly rowWidths = [92, 84, 88, 60, 95, 78, 86, 70, 50, 90, 82, 94, 66, 88, 74, 58];
  protected readonly replayShown = signal(true);
  protected readonly open = signal(true);

  /** Remounts the fixed bar, like the docs' replay button. */
  protected replayFixed() {
    this.replayShown.set(false);
    setTimeout(() => this.replayShown.set(true));
  }
}
