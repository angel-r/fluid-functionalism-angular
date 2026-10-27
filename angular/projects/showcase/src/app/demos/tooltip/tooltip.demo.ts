import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Button, Tooltip, TooltipProvider, fontWeights } from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-tooltip-demo',
  imports: [DemoPage, DemoSection, Button, Tooltip, TooltipProvider],
  template: `
    <app-demo-page
      title="Tooltip"
      description="Floating tooltip with spring-based animations, configurable placement, and rich content support."
    >
      <app-demo-section title="Basic">
        <ff-tooltip content="Save your changes">
          <button ffButton>Hover me</button>
        </ff-tooltip>
      </app-demo-section>

      <app-demo-section title="Placement">
        <div class="flex gap-3">
          @for (side of sides; track side.value) {
            <ff-tooltip [content]="side.label" [side]="side.value">
              <button ffButton variant="secondary">{{ side.label }}</button>
            </ff-tooltip>
          }
        </div>
      </app-demo-section>

      <app-demo-section title="Rich content">
        <ng-template #shortcut>
          <div class="flex flex-col gap-1">
            <span [style.font-variation-settings]="semibold">Keyboard shortcut</span>
            <span class="text-muted-foreground">⌘ + S</span>
          </div>
        </ng-template>
        <ff-tooltip [content]="shortcut">
          <button ffButton>Save</button>
        </ff-tooltip>
      </app-demo-section>

      <app-demo-section title="Follow cursor">
        <div class="flex flex-wrap items-center justify-center gap-6">
          <ff-tooltip content="Following x" side="top" followCursor="x">
            <div class="flex h-12 w-64 cursor-default items-center justify-center rounded-lg border border-border text-[12px] text-muted-foreground">
              Move along me
            </div>
          </ff-tooltip>
          <ff-tooltip content="Following y" side="right" followCursor="y">
            <div class="flex h-40 w-12 cursor-default items-center justify-center rounded-lg border border-border text-[12px] text-muted-foreground">
              <span class="rotate-90 whitespace-nowrap">Move along me</span>
            </div>
          </ff-tooltip>
        </div>
      </app-demo-section>

      <app-demo-section title="Delay">
        <div class="flex gap-3">
          <ff-tooltip content="Instant" [delayDuration]="0">
            <button ffButton variant="secondary">No delay</button>
          </ff-tooltip>
          <ff-tooltip content="Slow" [delayDuration]="500">
            <button ffButton variant="secondary">500ms delay</button>
          </ff-tooltip>
        </div>
      </app-demo-section>

      <app-demo-section title="Grouped (TooltipProvider)">
        <div ffTooltipProvider class="flex gap-1">
          @for (action of actions; track action) {
            <ff-tooltip [content]="action">
              <button ffButton variant="ghost" size="compact">{{ action }}</button>
            </ff-tooltip>
          }
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TooltipDemo {
  protected readonly semibold = fontWeights.semibold;
  protected readonly sides = [
    { value: 'top', label: 'Top' },
    { value: 'right', label: 'Right' },
    { value: 'bottom', label: 'Bottom' },
    { value: 'left', label: 'Left' },
  ] as const;
  /** Once one opens, moving along the row shows the next one at once. */
  protected readonly actions = ['Bold', 'Italic', 'Underline', 'Strikethrough', 'Code'];
}
