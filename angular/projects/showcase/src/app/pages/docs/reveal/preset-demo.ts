// ---------------------------------------------------------------------------
// The Reveal demo frame: 1 window per preset, 2 intensities each. Ported from
// `PresetDemo` in app/docs/reveal/demos.tsx. The preview's own header gives way
// to the demo's controls — the intensity tabs on the left, Replay on the right
// — and the page itself sits edge to edge in the frame.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { inView } from 'motion';
import { Button, TabsSubtle, TabsSubtleItem, cn } from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { PRESET_SPECS } from '../../../docs-kit/api/reveal';
import { TidepoolLanding, TidepoolProduct } from './tidepool';

type Preset = 'Landing' | 'Product';
type RevealPresetName = 'reveal-landing' | 'reveal-landing-subtle' | 'reveal-product' | 'reveal-product-subtle';

const INTENSITIES = ['Default', 'Subtle'] as const;
type Intensity = (typeof INTENSITIES)[number];

@Component({
  selector: 'app-reveal-preset-demo',
  imports: [ComponentPreview, TabsSubtle, TabsSubtleItem, Button, TidepoolLanding, TidepoolProduct],
  host: { style: 'display: contents' },
  template: `
    <app-component-preview hideHeader padding="none">
      <div class="flex w-full flex-col self-stretch">
        <div class="flex w-full items-center gap-3 border-b border-border/60 px-3 py-3">
          <ff-tabs-subtle
            [idPrefix]="idPrefix()"
            [selectedIndex]="intensityIndex()"
            (selectedIndexChange)="selectIntensity($event)"
          >
            @for (label of intensities; track label; let i = $index) {
              <button ffTabsSubtleItem [index]="i" [label]="label"></button>
            }
          </ff-tabs-subtle>
          <button ffButton class="ml-auto" leadingIcon="rotate-ccw" (click)="replay()">Replay</button>
        </div>
        <!-- The page itself, edge to edge in the preview. -->
        <div #scroller tabindex="0" [class]="scrollClass()">
          @if (seen()) {
            @for (key of instanceKeys(); track key) {
              @if (preset() === 'Landing') {
                <app-tidepool-landing [className]="className()" />
              } @else {
                <app-tidepool-product [mainClass]="className()" />
              }
            }
          }
        </div>
        <div class="border-t border-border/60 px-4 py-4 sm:px-6">
          <div class="flex flex-wrap gap-x-10 gap-y-3">
            <div class="flex flex-col gap-0.5">
              <span class="text-site-caption text-muted-foreground">Class</span>
              <span class="font-mono text-site-caption whitespace-nowrap text-foreground">.{{ className() }}</span>
            </div>
            @for (spec of specs(); track spec.label) {
              <div class="flex flex-col gap-0.5">
                <span class="text-site-caption text-muted-foreground">{{ spec.label }}</span>
                <span class="font-mono text-site-caption whitespace-nowrap text-foreground">{{ spec.value }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevealPresetDemo {
  readonly preset = input.required<Preset>();

  protected readonly intensities = INTENSITIES;
  protected readonly seen = signal(false);

  private readonly intensity = signal<Intensity>('Default');
  private readonly run = signal(0);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  protected readonly idPrefix = computed(() => `reveal-${this.preset().toLowerCase()}`);

  protected readonly className = computed(
    () =>
      `reveal-${this.preset().toLowerCase()}${this.intensity() === 'Subtle' ? '-subtle' : ''}` as RevealPresetName,
  );

  protected readonly intensityIndex = computed(() => INTENSITIES.indexOf(this.intensity()));

  protected readonly specs = computed(() => PRESET_SPECS[this.className()] ?? []);

  protected readonly scrollClass = computed(() =>
    cn(
      'w-full overflow-y-auto bg-background outline-none',
      this.preset() === 'Landing' ? 'h-[560px]' : 'h-[500px]',
    ),
  );

  /** Changing it destroys and rebuilds the page, so the preset plays again. */
  protected readonly instanceKeys = computed(() => [`${this.className()}-${this.run()}`]);

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Plays only once half of it is on screen, so a visitor who scrolls to it
    // sees it run instead of its end state.
    afterNextRender(() => {
      const element = this.scroller()?.nativeElement;
      if (!element) return;
      const stop = inView(
        element,
        () => {
          this.seen.set(true);
          stop();
        },
        { amount: 0.5 },
      );
      destroyRef.onDestroy(stop);
    });
  }

  protected selectIntensity(index: number) {
    this.intensity.set(INTENSITIES[index]);
    this.restart();
  }

  protected replay() {
    this.restart();
    this.run.update((run) => run + 1);
  }

  private restart() {
    this.scroller()?.nativeElement.scrollTo({ top: 0 });
  }
}
