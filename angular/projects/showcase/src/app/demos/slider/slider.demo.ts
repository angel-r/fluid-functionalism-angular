import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Slider } from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

const QUALITY_LABELS = ['Off', 'Low', 'Medium', 'High', 'Ultra'];

@Component({
  selector: 'app-slider-demo',
  imports: [DemoPage, DemoSection, Slider],
  template: `
    <app-demo-page
      title="Slider"
      description="One slider, two ladder steps: the default step's pip/scrubber design, and the compact step's dense design with track fill, range mode, and value display."
    >
      <app-demo-section title="Compact">
        <div class="w-72">
          <ff-slider size="compact" [(value)]="basic" />
        </div>
      </app-demo-section>

      <app-demo-section title="Range">
        <div class="w-72">
          <ff-slider [(value)]="range" />
        </div>
      </app-demo-section>

      <app-demo-section title="Steps">
        <div class="w-72">
          <ff-slider [(value)]="stepped" [step]="25" showSteps />
          <ff-slider [(value)]="stepped10" [step]="10" showSteps />
        </div>
      </app-demo-section>

      <app-demo-section title="Non-uniform steps">
        <div class="w-72">
          <ff-slider [(value)]="rating" [steps]="ampereRatings" showSteps label="Rating" [formatValue]="amps" />
        </div>
      </app-demo-section>

      <app-demo-section title="Value display">
        <div class="flex w-72 flex-col gap-6">
          <ff-slider [(value)]="left" valuePosition="left" label="Volume" />
          <ff-slider [(value)]="right" valuePosition="right" label="Volume" />
          <ff-slider [(value)]="tooltip" valuePosition="tooltip" />
        </div>
      </app-demo-section>

      <app-demo-section title="Format">
        <div class="w-72">
          <ff-slider size="compact" [(value)]="formatted" [formatValue]="percent" label="Opacity" />
        </div>
      </app-demo-section>

      <app-demo-section title="Disabled">
        <div class="w-72">
          <ff-slider size="compact" [value]="50" disabled />
        </div>
      </app-demo-section>

      <app-demo-section title="Default">
        <div class="w-72">
          <ff-slider size="default" label="Roundness" [(value)]="roundness" [min]="0" [max]="4" />
        </div>
      </app-demo-section>

      <app-demo-section title="Default — Scrubber">
        <div class="w-72">
          <ff-slider size="default" variant="scrubber" label="Volume" [(value)]="volume" [min]="0" [max]="100" [formatValue]="percent" />
        </div>
      </app-demo-section>

      <app-demo-section title="Default — Format">
        <div class="w-72">
          <ff-slider size="default" label="Quality" [(value)]="quality" [min]="0" [max]="4" [formatValue]="qualityLabel" />
        </div>
      </app-demo-section>

      <app-demo-section title="Default — Disabled">
        <div class="w-72">
          <ff-slider size="default" label="Roundness" [value]="2" [min]="0" [max]="4" disabled />
        </div>
      </app-demo-section>

      <app-demo-section title="Channel strip">
        <div class="flex w-full max-w-[480px] flex-col gap-1">
          @for (channel of channels; track channel.label) {
            <ff-slider [(value)]="channel.value" [label]="channel.label" valuePosition="right" [formatValue]="percent" />
          }
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SliderDemo {
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
  protected readonly channels = [
    { label: 'Volume', value: signal(78) },
    { label: 'Bass', value: signal(55) },
    { label: 'Mid', value: signal(50) },
    { label: 'Treble', value: signal(62) },
    { label: 'Presence', value: signal(45) },
  ];

  protected readonly ampereRatings = [0.1, 0.5, 0.7, 1.1, 1.3];
  protected readonly amps = (v: number) => `${v} A`;
  protected readonly percent = (v: number) => `${v}%`;
  protected readonly qualityLabel = (v: number) => QUALITY_LABELS[v];
}
