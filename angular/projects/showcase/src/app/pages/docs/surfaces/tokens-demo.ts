// ---------------------------------------------------------------------------
// Tokens — the compact ladder, eight chips in each theme, plus the CSS the
// Code tab shows. Ported from the TokensDemo of app/docs/surfaces/page.tsx.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  ScrollArea,
  fontWeights,
  injectShape,
  surfaceClasses,
} from '@angel-r/fluid-functionalism-angular';
import { SurfacesPreview } from './preview';

const TOKENS_CSS = `:root, .light {
  --surface-1: #FAFAFA;
  --surface-2: #FCFCFC;
  --surface-3: #FFFFFF;
  --surface-4: #FFFFFF;
  --surface-5: #FFFFFF;
  --surface-6: #FFFFFF;
  --surface-7: #FFFFFF;
  --surface-8: #FFFFFF;

  --shadow-color: rgb(0 0 0 / 0.06);
  --shadow-1: 0 0 0 1px var(--shadow-color);
  --shadow-2: 0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color);
  /* …doubling drop layers up to --shadow-8 (96px blur) */
}

.dark {
  --surface-1: #171717;
  --surface-2: #1E1E1E;
  --surface-3: #252525;
  --surface-4: #2C2C2C;
  --surface-5: #333333;
  --surface-6: #3A3A3A;
  --surface-7: #414141;
  --surface-8: #484848;

  /* shadow recipe per level:
       inset top highlight + inset ring + outer hairline + stacked drops */
}`;

/** One rung of the ladder: the painted box and its level number. */
@Component({
  selector: 'app-surface-chip',
  template: `
    <div class="flex flex-col items-center gap-2 shrink-0">
      <div [class]="chipClass()" aria-hidden="true"></div>
      <span class="text-[11px] leading-3.5 text-muted-foreground font-mono">{{ level() }}</span>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurfaceChip {
  readonly level = input.required<number>();

  private readonly shape = injectShape();

  protected readonly chipClass = computed(
    () => `w-14 h-14 ${this.shape().container} ${surfaceClasses(this.level())}`,
  );
}

@Component({
  selector: 'app-surfaces-tokens-demo',
  imports: [ScrollArea, SurfacesPreview, SurfaceChip],
  template: `
    <app-surfaces-preview [code]="tokensCss">
      <div class="flex flex-col gap-4 w-full">
        <div class="dark flex flex-col gap-2">
          <span class="text-[11px] leading-3.5 text-muted-foreground" [style.font-variation-settings]="semibold">
            Dark
          </span>
          <ff-scroll-area
            orientation="horizontal"
            viewportClass="scroll-fade-x"
            class="rounded-2xl bg-background"
          >
            <div class="flex gap-3 p-4 w-max">
              @for (level of levels; track level) {
                <app-surface-chip [level]="level" />
              }
            </div>
          </ff-scroll-area>
        </div>
        <div class="light flex flex-col gap-2">
          <span class="text-[11px] leading-3.5 text-muted-foreground" [style.font-variation-settings]="semibold">
            Light
          </span>
          <ff-scroll-area
            orientation="horizontal"
            viewportClass="scroll-fade-x"
            class="rounded-2xl bg-background"
          >
            <div class="flex gap-3 p-4 w-max">
              @for (level of levels; track level) {
                <app-surface-chip [level]="level" />
              }
            </div>
          </ff-scroll-area>
        </div>
      </div>
    </app-surfaces-preview>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurfacesTokensDemo {
  protected readonly levels = [1, 2, 3, 4, 5, 6, 7, 8];
  protected readonly tokensCss = TOKENS_CSS;
  protected readonly semibold = fontWeights.semibold;
}
