// /docs/slider, ported from app/docs/slider/page.tsx: the compact step's dense
// design (track fill, range mode, steps, value display) and the default step's
// pip/scrubber design, then the API reference. Dragging, stepping and the
// value tooltip live in the component.

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Slider } from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';
import { apiReference } from '../../../docs-kit/api/slider';

const QUALITY_LABELS = ['Off', 'Low', 'Medium', 'High', 'Ultra'];

// ---------------------------------------------------------------------------
// Snippets — compact step
// ---------------------------------------------------------------------------

const basicCode = `import { Slider } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

readonly value = signal(25);

<ff-slider size="compact" [(value)]="value" />`;

const rangeCode = `import { Slider } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

readonly range = signal<[number, number]>([25, 75]);

<ff-slider [(value)]="range" />`;

const stepsCode = `import { Slider } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

readonly stepped = signal(50);
readonly stepped10 = signal(50);

<ff-slider [(value)]="stepped" [step]="25" showSteps />
<ff-slider [(value)]="stepped10" [step]="10" showSteps />`;

const nonUniformCode = `import { Slider } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

const AMPERE_RATINGS = [0.1, 0.5, 0.7, 1.1, 1.3];

readonly rating = signal(0.7);
readonly amps = (v: number) => \`\${v} A\`;

<ff-slider
  [(value)]="rating"
  [steps]="AMPERE_RATINGS"
  showSteps
  label="Rating"
  [formatValue]="amps"
/>`;

const valueDisplayCode = `import { Slider } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

readonly volume = signal(50);

<ff-slider [(value)]="volume" valuePosition="left" label="Volume" />
<ff-slider [(value)]="volume" valuePosition="right" label="Volume" />
<ff-slider [(value)]="volume" valuePosition="tooltip" />`;

const disabledCode = `import { Slider } from "@angel-r/fluid-functionalism-angular";

<ff-slider size="compact" [value]="50" disabled />`;

const formatCode = `import { Slider } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

readonly value = signal(75);
readonly percent = (v: number) => \`\${v}%\`;

<ff-slider
  size="compact"
  [(value)]="value"
  [formatValue]="percent"
  label="Opacity"
/>`;

// ---------------------------------------------------------------------------
// Snippets — default step
// ---------------------------------------------------------------------------

const comfortableBasicCode = `import { Slider } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

readonly roundness = signal(2);

<ff-slider
  label="Roundness"
  [(value)]="roundness"
  [min]="0"
  [max]="4"
/>`;

const comfortableScrubberCode = `import { Slider } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

readonly volume = signal(50);
readonly percent = (v: number) => \`\${v}%\`;

<ff-slider
  variant="scrubber"
  label="Volume"
  [(value)]="volume"
  [min]="0"
  [max]="100"
  [formatValue]="percent"
/>`;

const comfortableFormatCode = `import { Slider } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

const QUALITY_LABELS = ["Off", "Low", "Medium", "High", "Ultra"];

readonly quality = signal(2);
readonly qualityLabel = (v: number) => QUALITY_LABELS[v];

<ff-slider
  label="Quality"
  [(value)]="quality"
  [min]="0"
  [max]="4"
  [formatValue]="qualityLabel"
/>`;

const comfortableDisabledCode = `import { Slider } from "@angel-r/fluid-functionalism-angular";

<ff-slider
  label="Roundness"
  [value]="2"
  [min]="0"
  [max]="4"
  disabled
/>`;

@Component({
  selector: 'app-slider-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, Slider],
  template: `
    <app-doc-page
      title="Slider"
      slug="slider"
      description="One slider, two ladder steps: the default step's pip/scrubber design, and the compact step's dense design with track fill, range mode, and value display."
      [installUsage]="basicCode"
      [installProps]="installProps"
    >
      <!-- ---------------------------------------------------------------- -->
      <!-- Compact                                                            -->
      <!-- ---------------------------------------------------------------- -->

      <app-doc-section title="Compact">
        <app-component-preview [code]="basicCode">
          <div class="w-72">
            <ff-slider size="compact" [(value)]="basic" />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Range">
        <app-component-preview [code]="rangeCode">
          <div class="w-72">
            <ff-slider [(value)]="range" />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Steps">
        <app-component-preview [code]="stepsCode">
          <div class="w-72">
            <ff-slider [(value)]="stepped" [step]="25" showSteps />
            <ff-slider [(value)]="stepped10" [step]="10" showSteps />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Non-uniform Steps">
        <app-component-preview [code]="nonUniformCode">
          <div class="w-72">
            <ff-slider
              [(value)]="rating"
              [steps]="ampereRatings"
              showSteps
              label="Rating"
              [formatValue]="amps"
            />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Value Display">
        <app-component-preview [code]="valueDisplayCode">
          <div class="flex flex-col gap-6 w-72">
            <ff-slider [(value)]="left" valuePosition="left" label="Volume" />
            <ff-slider [(value)]="right" valuePosition="right" label="Volume" />
            <ff-slider [(value)]="tooltip" valuePosition="tooltip" />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Format">
        <app-component-preview [code]="formatCode">
          <div class="w-72">
            <ff-slider size="compact" [(value)]="formatted" [formatValue]="percent" label="Opacity" />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Disabled">
        <app-component-preview [code]="disabledCode">
          <div class="w-72">
            <ff-slider size="compact" [value]="50" disabled />
          </div>
        </app-component-preview>
      </app-doc-section>

      <!-- ---------------------------------------------------------------- -->
      <!-- Comfortable                                                        -->
      <!-- ---------------------------------------------------------------- -->

      <app-doc-section title="Default">
        <app-component-preview [code]="comfortableBasicCode">
          <div class="w-72">
            <ff-slider size="default" label="Roundness" [(value)]="roundness" [min]="0" [max]="4" />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Default — Scrubber">
        <app-component-preview [code]="comfortableScrubberCode">
          <div class="w-72">
            <ff-slider
              size="default"
              variant="scrubber"
              label="Volume"
              [(value)]="volume"
              [min]="0"
              [max]="100"
              [formatValue]="percent"
            />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Default — Format">
        <app-component-preview [code]="comfortableFormatCode">
          <div class="w-72">
            <ff-slider
              size="default"
              label="Quality"
              [(value)]="quality"
              [min]="0"
              [max]="4"
              [formatValue]="qualityLabel"
            />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Default — Disabled">
        <app-component-preview [code]="comfortableDisabledCode">
          <div class="w-72">
            <ff-slider size="default" label="Roundness" [value]="2" [min]="0" [max]="4" disabled />
          </div>
        </app-component-preview>
      </app-doc-section>

      <!-- ---------------------------------------------------------------- -->
      <!-- API Reference                                                      -->
      <!-- ---------------------------------------------------------------- -->

      <app-doc-section title="API Reference">
        <p class="text-site-body text-muted-foreground mb-3">
          One component: the default step renders the pip/scrubber design, the compact step the dense one.
          Compact-only props (an array value, steps, showSteps, showValue, valuePosition, track styling) always
          render the compact design so no capability is lost.
        </p>
        <app-props-table [groups]="api" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SliderPage {
  protected readonly api = apiReference;
  /** One line per prop, for the page's install prompt. */
  protected readonly installProps = this.api.flatMap((table) =>
    table.props
      .filter((prop) => !prop.name.startsWith('<') && !prop.name.startsWith('...'))
      .map((prop) => `${prop.name}: ${prop.type}. ${prop.description}`),
  );

  protected readonly basicCode = basicCode;
  protected readonly rangeCode = rangeCode;
  protected readonly stepsCode = stepsCode;
  protected readonly nonUniformCode = nonUniformCode;
  protected readonly valueDisplayCode = valueDisplayCode;
  protected readonly disabledCode = disabledCode;
  protected readonly formatCode = formatCode;
  protected readonly comfortableBasicCode = comfortableBasicCode;
  protected readonly comfortableScrubberCode = comfortableScrubberCode;
  protected readonly comfortableFormatCode = comfortableFormatCode;
  protected readonly comfortableDisabledCode = comfortableDisabledCode;

  protected readonly basic = signal(25);
  protected readonly range = signal<[number, number]>([25, 75]);
  protected readonly stepped = signal(50);
  protected readonly stepped10 = signal(50);
  protected readonly rating = signal(0.7);
  protected readonly left = signal(40);
  protected readonly right = signal(60);
  protected readonly tooltip = signal(50);
  protected readonly formatted = signal(75);

  protected readonly roundness = signal(2);
  protected readonly volume = signal(50);
  protected readonly quality = signal(2);

  protected readonly ampereRatings = [0.1, 0.5, 0.7, 1.1, 1.3];
  protected readonly amps = (v: number) => `${v} A`;
  protected readonly percent = (v: number) => `${v}%`;
  protected readonly qualityLabel = (v: number) => QUALITY_LABELS[v];
}
