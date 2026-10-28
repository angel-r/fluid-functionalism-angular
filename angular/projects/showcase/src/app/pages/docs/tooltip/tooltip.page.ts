// ---------------------------------------------------------------------------
// /docs/tooltip, ported from app/docs/tooltip/page.tsx: the basic hover, the
// four placements, rich content through a TemplateRef, followCursor on both
// axes, the two delay extremes, and the API reference.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Button, Tooltip, fontWeights } from '@angel-r/fluid-functionalism-angular';
import { API_REFERENCE } from '../../../docs-kit/api';
import type { PropDef } from '../../../docs-kit/api/types';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';

/** The install prompt's one line per prop. `<ng-content />` rows describe the
 *  projection, not an input, so they stay out. */
function promptProps(tables: readonly { props: PropDef[] }[]): string[] {
  return tables.flatMap((table) =>
    table.props
      .filter((prop) => !prop.name.startsWith('<ng-content'))
      .map(
        (prop) =>
          `${prop.name}: ${prop.type}${prop.default !== undefined ? ` (default ${prop.default})` : ''} — ${prop.description}`,
      ),
  );
}

@Component({
  selector: 'app-tooltip-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, Button, Tooltip],
  template: `
    <app-doc-page
      title="Tooltip"
      slug="tooltip"
      description="Floating tooltip with spring-based animations, configurable placement, and rich content support."
      [installUsage]="basicCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Basic">
        <app-component-preview [code]="basicCode">
          <ff-tooltip content="Save your changes">
            <button ffButton>Hover me</button>
          </ff-tooltip>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Placement">
        <app-component-preview [code]="placementCode">
          <div class="flex gap-3">
            @for (side of sides; track side.value) {
              <ff-tooltip [content]="side.label" [side]="side.value">
                <button ffButton variant="secondary">{{ side.label }}</button>
              </ff-tooltip>
            }
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Rich Content">
        <app-component-preview [code]="richCode">
          <ng-template #shortcut>
            <div class="flex flex-col gap-1">
              <span [style.font-variation-settings]="semibold">Keyboard shortcut</span>
              <span class="text-muted-foreground">⌘ + S</span>
            </div>
          </ng-template>
          <ff-tooltip [content]="shortcut">
            <button ffButton>Save</button>
          </ff-tooltip>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Follow cursor">
        <app-component-preview [code]="followCursorCode" minHeightClass="min-h-[220px]">
          <div class="flex flex-wrap items-center justify-center gap-6">
            <ff-tooltip content="Following x" side="top" followCursor="x">
              <div
                class="flex h-12 w-64 cursor-default items-center justify-center rounded-lg border border-border text-[12px] text-muted-foreground"
              >
                Move along me
              </div>
            </ff-tooltip>
            <ff-tooltip content="Following y" side="right" followCursor="y">
              <div
                class="flex h-40 w-12 cursor-default items-center justify-center rounded-lg border border-border text-[12px] text-muted-foreground"
              >
                <span class="rotate-90 whitespace-nowrap">Move along me</span>
              </div>
            </ff-tooltip>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Delay">
        <app-component-preview [code]="delayCode">
          <div class="flex gap-3">
            <ff-tooltip content="Instant" [delayDuration]="0">
              <button ffButton variant="secondary">No delay</button>
            </ff-tooltip>
            <ff-tooltip content="Slow" [delayDuration]="500">
              <button ffButton variant="secondary">500ms delay</button>
            </ff-tooltip>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference">
        <app-props-table [props]="tooltipTable" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TooltipPage {
  protected readonly basicCode = `import { Button, Tooltip } from '@angel-r/fluid-functionalism-angular';

<ff-tooltip content="Save your changes">
  <button ffButton>Hover me</button>
</ff-tooltip>`;

  protected readonly placementCode = `import { Button, Tooltip } from '@angel-r/fluid-functionalism-angular';

<ff-tooltip content="Top" side="top">
  <button ffButton variant="secondary">Top</button>
</ff-tooltip>
<ff-tooltip content="Right" side="right">
  <button ffButton variant="secondary">Right</button>
</ff-tooltip>
<ff-tooltip content="Bottom" side="bottom">
  <button ffButton variant="secondary">Bottom</button>
</ff-tooltip>
<ff-tooltip content="Left" side="left">
  <button ffButton variant="secondary">Left</button>
</ff-tooltip>`;

  protected readonly richCode = `import { Button, Tooltip, fontWeights } from '@angel-r/fluid-functionalism-angular';

<ng-template #shortcut>
  <div class="flex flex-col gap-1">
    <span [style.font-variation-settings]="fontWeights.semibold">Keyboard shortcut</span>
    <span class="text-muted-foreground">⌘ + S</span>
  </div>
</ng-template>

<ff-tooltip [content]="shortcut">
  <button ffButton>Save</button>
</ff-tooltip>`;

  protected readonly followCursorCode = `<!-- For tall or wide triggers, a centered tooltip sits far from the
     pointer — followCursor tracks it along one axis while the other stays
     anchored by \`side\`. The Sidebar's rail handle uses followCursor="y". -->

<ff-tooltip content="Following x" side="top" followCursor="x">
  <div class="h-12 w-64 …" />
</ff-tooltip>

<ff-tooltip content="Following y" side="right" followCursor="y">
  <div class="h-40 w-12 …" />
</ff-tooltip>`;

  protected readonly delayCode = `import { Tooltip } from '@angel-r/fluid-functionalism-angular';

<ff-tooltip content="Instant" [delayDuration]="0">
  <button ffButton variant="secondary">No delay</button>
</ff-tooltip>
<ff-tooltip content="Slow" [delayDuration]="500">
  <button ffButton variant="secondary">500ms delay</button>
</ff-tooltip>`;

  protected readonly tooltipTable = API_REFERENCE['tooltip'][0].props;
  protected readonly installProps = promptProps(API_REFERENCE['tooltip']);

  protected readonly semibold = fontWeights.semibold;

  protected readonly sides = [
    { value: 'top', label: 'Top' },
    { value: 'right', label: 'Right' },
    { value: 'bottom', label: 'Bottom' },
    { value: 'left', label: 'Left' },
  ] as const;
}
