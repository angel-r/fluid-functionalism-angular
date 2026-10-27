// ---------------------------------------------------------------------------
// The "Heading font" demo, ported from HeadingFontDemo in
// app/docs/typography/demos.tsx: the same global setting as the right panel,
// so picking here also restyles every heading on the page. The third tab is
// the custom Google Fonts family: picked once through Browse, it stays, with
// its heading weight beside Browse.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Button, TabsSubtle, TabsSubtleItem, fontWeights } from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { HeadingWeightSelect } from '../../../shell/heading-weight-select';
import { HeadingFontService, headingFontLabel } from '../../../site/heading-font';
import { HEADING_FONTS } from '../../../site/site-settings';

@Component({
  selector: 'app-heading-font-demo',
  imports: [ComponentPreview, TabsSubtle, TabsSubtleItem, Button, HeadingWeightSelect],
  template: `
    <app-component-preview [hideHeader]="true" [inspectable]="false">
      <div class="flex w-full flex-col gap-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <ff-tabs-subtle
            idPrefix="heading-font-tabs"
            aria-label="Heading font"
            [selectedIndex]="selected()"
            (selectedIndexChange)="setFont($event)"
          >
            @for (font of fonts; track font; let i = $index) {
              <button ffTabsSubtleItem [index]="i" [label]="label(font)"></button>
            }
          </ff-tabs-subtle>
          <div class="flex items-center gap-1">
            <app-heading-weight-select class="min-w-0 w-auto" />
            <button ffButton variant="secondary" size="sm" (click)="browse()">Browse Google Fonts</button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <h3 class="text-site-display text-foreground" [style.font-variation-settings]="bold">
            Getting started
          </h3>
          <h3 class="text-site-title text-foreground" [style.font-variation-settings]="semibold">
            Install the components you need
          </h3>
          <p class="text-site-body text-muted-foreground">
            Body text stays in Inter, so only the hierarchy changes voice.
          </p>
        </div>
      </div>
    </app-component-preview>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeadingFontDemo {
  protected readonly fonts = HEADING_FONTS;
  protected readonly bold = fontWeights.bold;
  protected readonly semibold = fontWeights.semibold;
  private readonly heading = inject(HeadingFontService);

  protected readonly selected = computed(() => HEADING_FONTS.indexOf(this.heading.font()));

  protected label(font: (typeof HEADING_FONTS)[number]): string {
    return headingFontLabel(font, this.heading.custom());
  }

  protected setFont(index: number): void {
    this.heading.setFont(HEADING_FONTS[index]);
  }

  protected browse(): void {
    this.heading.browse();
  }
}
