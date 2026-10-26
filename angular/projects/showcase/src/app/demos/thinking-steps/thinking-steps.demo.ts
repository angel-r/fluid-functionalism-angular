import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  Button,
  type StepStatus,
  ThinkingStep,
  ThinkingStepDetails,
  ThinkingStepImage,
  ThinkingStepSource,
  ThinkingStepSources,
  ThinkingSteps,
  ThinkingStepsContent,
  ThinkingStepsHeader,
} from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

// The root, header, content and step every demo uses.
const CORE = [ThinkingSteps, ThinkingStepsHeader, ThinkingStepsContent, ThinkingStep];

// A self-contained "screenshot" (the showcase ships no image assets).
const SCREENSHOT = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
  <rect width="400" height="240" fill="#f4f4f5"/>
  <rect x="24" y="24" width="120" height="12" rx="6" fill="#d4d4d8"/>
  <rect x="24" y="64" width="240" height="20" rx="6" fill="#a1a1aa"/>
  <rect x="24" y="96" width="320" height="10" rx="5" fill="#d4d4d8"/>
  <rect x="24" y="114" width="280" height="10" rx="5" fill="#d4d4d8"/>
  <rect x="24" y="152" width="96" height="32" rx="16" fill="#6B97FF"/>
</svg>`)}`;

type Playback = 'playing' | 'paused' | 'finished';

/**
 * Fires steps at absolute times from start (`delays`, in ms) with
 * pause/resume, auto-playing while half the demo is in view, plus the
 * play / pause / replay control. `runKey` re-creates the steps on replay.
 */
@Directive()
abstract class SequencedDemo {
  protected abstract readonly delays: number[];
  protected readonly fired = signal(0);
  protected readonly playback = signal<Playback>('paused');
  protected readonly open = signal(true);
  protected readonly runKey = signal(0);
  protected readonly screenshot = SCREENSHOT;
  protected readonly controlLabel = computed(() =>
    this.playback() === 'playing' ? 'Pause' : this.playback() === 'paused' ? 'Play' : 'Replay',
  );
  protected readonly controlIcon = computed(() =>
    this.playback() === 'playing' ? 'pause' : this.playback() === 'paused' ? 'play' : 'rotate-ccw',
  );

  private elapsed = 0;
  private manualPause = false;

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    effect((onCleanup) => {
      const fired = this.fired();
      const total = this.delays.length;
      if (fired >= total) {
        this.playback.set('finished');
        return;
      }
      if (this.playback() !== 'playing') return;
      const startedAt = Date.now();
      const target = this.delays[fired];
      const timer = setTimeout(() => {
        this.elapsed = target;
        this.fired.update((f) => f + 1);
      }, Math.max(0, target - this.elapsed));
      onCleanup(() => {
        clearTimeout(timer);
        if (this.fired() === fired) this.elapsed += Date.now() - startedAt;
      });
    });

    afterNextRender(() => {
      // The host is display: contents; the stage it sits in plays the docs'
      // preview frame: it anchors the control and is what must be in view.
      const stage = host.parentElement ?? host;
      stage.style.position = 'relative';
      if (typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.intersectionRatio >= 0.5) {
            if (!this.manualPause) this.playback.update((p) => (p === 'finished' ? p : 'playing'));
          } else if (entry.intersectionRatio < 0.1) {
            this.manualPause = false;
            this.playback.update((p) => (p === 'finished' ? p : 'paused'));
          }
        },
        { threshold: [0.1, 0.5] },
      );
      observer.observe(stage);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected togglePlayback() {
    const state = this.playback();
    if (state === 'playing') {
      this.manualPause = true;
      this.playback.set('paused');
      return;
    }
    this.manualPause = false;
    if (state === 'finished') {
      this.elapsed = 0;
      this.fired.set(0);
      this.open.set(true);
      this.runKey.update((k) => k + 1);
    }
    this.playback.set('playing');
  }

  protected status(i: number): StepStatus {
    const fired = this.fired();
    if (fired >= this.delays.length) return 'complete';
    return i < fired - 1 ? 'complete' : i === fired - 1 ? 'active' : 'pending';
  }
}

// The docs keep this control in the preview header, outside the stage: here
// it is pinned to the stage's corner so the steps lay out as in the docs.
const CONTROL = `
  <button
    ffButton
    variant="tertiary"
    size="compact"
    class="absolute right-3 top-3"
    [leadingIcon]="controlIcon()"
    (click)="togglePlayback()"
  >
    {{ controlLabel() }}
  </button>
`;

@Component({
  selector: 'app-thinking-steps-streaming',
  imports: [...CORE, ThinkingStepSources, ThinkingStepSource, Button],
  host: { style: 'display: contents' },
  template: `
    ${CONTROL}
    @for (k of [runKey()]; track k) {
      <ff-thinking-steps [(open)]="open">
        <ff-thinking-steps-header />
        <ff-thinking-steps-content>
          <ff-thinking-step icon="search" label="Searching for micka.design" [status]="status(0)" [isLast]="fired() <= 1">
            @if (fired() > 1) {
              <ff-thinking-step-sources>
                <ff-thinking-step-source [delay]="0.05">x.com</ff-thinking-step-source>
                <ff-thinking-step-source [delay]="0.1">google.com</ff-thinking-step-source>
                <ff-thinking-step-source [delay]="0.15">github.com</ff-thinking-step-source>
              </ff-thinking-step-sources>
            }
          </ff-thinking-step>
          <ff-thinking-step icon="globe" label="Reading sources" [status]="status(1)" [isLast]="fired() <= 2" />
          <ff-thinking-step icon="brain" label="Analyzing portfolio" [status]="status(2)" [isLast]="fired() <= 3" />
          <ff-thinking-step icon="check" label="Complete" [status]="status(3)" isLast />
        </ff-thinking-steps-content>
      </ff-thinking-steps>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StreamingDemo extends SequencedDemo {
  // 4 steps + 1 completion marker.
  protected readonly delays = [400, 1800, 3200, 4200, 5200];
}

const STREAMING_TEXT_DESCRIPTIONS = [
  'Establishing a connection to the data warehouse and streaming 2.4 million rows across 47 columns into a memory-mapped buffer. The source table spans three partitions dated from January through March, each containing roughly 800K records with nested JSON fields that need to be flattened before downstream processing can begin.',
  'Running a full schema validation pass against the canonical type definitions. Checking that all 47 columns match their expected types, verifying nullability constraints on the 12 required fields, confirming foreign key references resolve correctly against the dimension tables, and flagging any new columns that appeared since the last successful run on March 15th.',
  'Applying the full normalization pipeline: flattening nested address objects into discrete columns, deduplicating records that share the same composite key across partitions, converting all timestamps from mixed UTC and local offsets into a canonical ISO 8601 format, and running the currency conversion step for the 14 non-USD transaction currencies using the daily exchange rate snapshot.',
  "Executing 23 data quality assertions: verifying that output row counts fall within the expected 2% tolerance of the source, checking that the revenue distribution skew hasn't shifted beyond 1.5 standard deviations from the trailing 30-day average, confirming referential integrity against all five dimension tables, and ensuring that no single partition exceeds 40% of total volume which would indicate an upstream ingestion anomaly.",
  'Compressing the validated dataset into 847 Snappy-encoded Parquet files partitioned by region and date, uploading each file to the staging bucket with server-side encryption enabled, registering the new partition metadata in the Hive metastore, and triggering the downstream Airflow DAG that handles incremental merges into the production fact table.',
];

/** Streams `text` in, a few characters per tick, while `active`. */
@Component({
  selector: 'app-streaming-description',
  template: `
    @if (shown()) {
      <span class="text-site-body leading-4.5 text-muted-foreground">{{ shown() }}</span>
    }
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StreamingDescription {
  readonly text = input.required<string>();
  readonly active = input(false);
  readonly done = input(false);
  private readonly count = signal(0);
  protected readonly shown = computed(() => {
    const text = this.text();
    if (this.done()) return text;
    return this.active() ? text.slice(0, this.count()) : '';
  });

  constructor() {
    effect((onCleanup) => {
      const active = this.active();
      const len = this.text().length;
      const count = this.count();
      if (!active) {
        if (count !== 0) this.count.set(0);
        return;
      }
      if (count >= len) return;
      const id = setTimeout(() => this.count.set(Math.min(count + 3, len)), 16);
      onCleanup(() => clearTimeout(id));
    });
  }
}

@Component({
  selector: 'app-thinking-steps-streaming-text',
  imports: [...CORE, Button, StreamingDescription],
  host: { style: 'display: contents' },
  template: `
    ${CONTROL}
    @for (k of [runKey()]; track k) {
      <ff-thinking-steps [(open)]="open" class="w-full px-8">
        <ff-thinking-steps-header />
        <ff-thinking-steps-content>
          @for (label of labels; track $index; let i = $index) {
            <ff-thinking-step [showIcon]="false" [label]="label" [status]="status(i)" [isLast]="fired() <= i + 1">
              <app-streaming-description
                [text]="descriptions[i]"
                [active]="status(i) === 'active'"
                [done]="status(i) === 'complete'"
              />
            </ff-thinking-step>
          }
          <ff-thinking-step [showIcon]="false" label="Pipeline complete" [status]="status(5)" isLast />
        </ff-thinking-steps-content>
      </ff-thinking-steps>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StreamingTextDemo extends SequencedDemo {
  // 6 step appearances + 1 completion.
  protected readonly delays = [400, 6000, 12000, 18000, 24000, 30000, 32000];
  protected readonly labels = [
    'Loading dataset',
    'Validating schema',
    'Transforming records',
    'Running quality checks',
    'Writing output',
  ];
  protected readonly descriptions = STREAMING_TEXT_DESCRIPTIONS;
}

@Component({
  selector: 'app-thinking-steps-images',
  imports: [...CORE, ThinkingStepImage, Button],
  host: { style: 'display: contents' },
  template: `
    ${CONTROL}
    @for (k of [runKey()]; track k) {
      <ff-thinking-steps [(open)]="open">
        <ff-thinking-steps-header>Vision Agent</ff-thinking-steps-header>
        <ff-thinking-steps-content>
          <ff-thinking-step icon="search" label="Searching for reference" [status]="status(0)" [isLast]="fired() <= 1" />
          <ff-thinking-step icon="image" label="Found screenshot" [status]="status(1)" [isLast]="fired() <= 2">
            @if (fired() > 2) {
              <ff-thinking-step-image [src]="screenshot" caption="Homepage screenshot" />
            }
          </ff-thinking-step>
          <ff-thinking-step
            icon="brain"
            label="Analyzing layout"
            description="Inspecting spacing, typography scale, and color usage."
            [status]="status(2)"
            [isLast]="fired() <= 3"
          />
          <ff-thinking-step icon="check" label="Analysis complete" [status]="status(3)" isLast />
        </ff-thinking-steps-content>
      </ff-thinking-steps>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class WithImagesDemo extends SequencedDemo {
  protected readonly delays = [400, 1800, 3400, 5000, 6000];
}

@Component({
  selector: 'app-thinking-steps-full',
  imports: [...CORE, ThinkingStepSources, ThinkingStepSource, ThinkingStepImage, ThinkingStepDetails, Button],
  host: { style: 'display: contents' },
  template: `
    ${CONTROL}
    @for (k of [runKey()]; track k) {
      <ff-thinking-steps [(open)]="open">
        <ff-thinking-steps-header>Research Agent</ff-thinking-steps-header>
        <ff-thinking-steps-content>
          <ff-thinking-step icon="search" label="Searching for profiles" [status]="status(0)" [isLast]="fired() <= 1">
            @if (fired() > 1) {
              <ff-thinking-step-sources>
                <ff-thinking-step-source [delay]="0.05">x.com</ff-thinking-step-source>
                <ff-thinking-step-source [delay]="0.1">instagram.com</ff-thinking-step-source>
                <ff-thinking-step-source [delay]="0.15">github.com</ff-thinking-step-source>
              </ff-thinking-step-sources>
            }
          </ff-thinking-step>
          <ff-thinking-step
            icon="image"
            label="Found profile photo"
            description="micka.design profile from x.com"
            [status]="status(1)"
            [isLast]="fired() <= 2"
          >
            @if (fired() > 2) {
              <ff-thinking-step-image [src]="screenshot" caption="Profile card" />
            }
          </ff-thinking-step>
          <ff-thinking-step icon="globe" label="Reading portfolio" [status]="status(2)" [isLast]="fired() <= 3">
            @if (fired() > 3) {
              <ff-thinking-step-details
                summary="Explored 4 pages"
                [details]="['Read about.html', 'Read projects.html', 'Read resume.pdf', 'Read contact.html']"
              />
            }
          </ff-thinking-step>
          <ff-thinking-step icon="search" label="Searching for recent work" [status]="status(3)" [isLast]="fired() <= 4">
            @if (fired() > 4) {
              <ff-thinking-step-sources>
                <ff-thinking-step-source [delay]="0.05">figma.com</ff-thinking-step-source>
                <ff-thinking-step-source [delay]="0.1">behance.net</ff-thinking-step-source>
                <ff-thinking-step-source [delay]="0.15">google.com</ff-thinking-step-source>
              </ff-thinking-step-sources>
            }
          </ff-thinking-step>
          <ff-thinking-step
            icon="brain"
            label="Analyzing results"
            description="Compiling findings into a summary."
            [status]="status(4)"
            [isLast]="fired() <= 5"
          />
          <ff-thinking-step icon="check" label="Research complete" [status]="status(5)" isLast />
        </ff-thinking-steps-content>
      </ff-thinking-steps>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class FullDemo extends SequencedDemo {
  protected readonly delays = [400, 1600, 2800, 3800, 5000, 6200, 7200];
}

@Component({
  selector: 'app-thinking-steps-demo',
  imports: [DemoPage, DemoSection, ...CORE, ThinkingStepDetails, StreamingDemo, StreamingTextDemo, WithImagesDemo, FullDemo],
  template: `
    <app-demo-page
      title="Thinking steps"
      description="Chain-of-thought reasoning display with collapsible steps, sequential animation, source badges, and image support."
    >
      <app-demo-section title="Basic">
        <ff-thinking-steps>
          <ff-thinking-steps-header />
          <ff-thinking-steps-content>
            <ff-thinking-step icon="search" label="Searched the web" />
            <ff-thinking-step icon="globe" label="Read 3 sources">
              <ff-thinking-step-details summary="Explored 6 files" [details]="exploredFiles" />
            </ff-thinking-step>
            <ff-thinking-step icon="check" label="Done" isLast />
          </ff-thinking-steps-content>
        </ff-thinking-steps>
      </app-demo-section>

      <app-demo-section title="Minimal">
        <ff-thinking-steps>
          <ff-thinking-steps-header />
          <ff-thinking-steps-content>
            <ff-thinking-step [showIcon]="false" label="Ran a command" />
            <ff-thinking-step [showIcon]="false" label="Done" isLast />
          </ff-thinking-steps-content>
        </ff-thinking-steps>
      </app-demo-section>

      <app-demo-section title="Streaming">
        <app-thinking-steps-streaming />
      </app-demo-section>

      <app-demo-section title="Streaming text">
        <app-thinking-steps-streaming-text />
      </app-demo-section>

      <app-demo-section title="With images">
        <app-thinking-steps-images />
      </app-demo-section>

      <app-demo-section title="Full example">
        <app-thinking-steps-full />
      </app-demo-section>

      <app-demo-section title="Compact">
        <ff-thinking-steps size="compact">
          <ff-thinking-steps-header>Compact</ff-thinking-steps-header>
          <ff-thinking-steps-content>
            <ff-thinking-step icon="search" label="Searched the web" />
            <ff-thinking-step icon="check" label="Done" isLast />
          </ff-thinking-steps-content>
        </ff-thinking-steps>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ThinkingStepsDemo {
  protected readonly exploredFiles = [
    'Read accordion.tsx',
    'Read icon-context.tsx',
    'Read badge.tsx',
    'Read use-fluid-hover.ts',
    'Read components.ts',
    'Read postbuild-registry.mjs',
  ];
}
