// ---------------------------------------------------------------------------
// The four animated demos of /docs/thinking-steps, ported from the page's
// StreamingDemo / StreamingTextDemo / WithImagesDemo / FullDemo.
//
// Each one plays while at least half of the preview is in view, pauses when it
// leaves, and carries the reference's play / pause / replay control, which the
// page projects into the preview header.
// ---------------------------------------------------------------------------

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
  type IconName,
  type StepStatus,
  ThinkingStep,
  ThinkingStepDetails,
  ThinkingStepImage,
  ThinkingStepSource,
  ThinkingStepSources,
  ThinkingSteps,
  ThinkingStepsContent,
  ThinkingStepsHeader,
} from '@angel-r/fluid-functionalism-angular';

// The root, header, content and step every demo uses.
const CORE = [ThinkingSteps, ThinkingStepsHeader, ThinkingStepsContent, ThinkingStep];

// A self-contained "screenshot" (the showcase ships no og image): the same
// wireframe stand-in the old showcase demos used.
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
 * Fires steps at absolute times from start (`delays`, in ms), pausing and
 * resuming with the viewport, plus the reference's play / pause / replay
 * control. `runKey` re-creates the steps on replay so each one animates in
 * again.
 */
@Directive()
abstract class SequencedStepsDemo {
  protected abstract readonly delays: readonly number[];

  protected readonly fired = signal(0);
  protected readonly open = signal(true);
  protected readonly runKey = signal(0);
  protected readonly screenshot = SCREENSHOT;

  private readonly playback = signal<Playback>('paused');
  private elapsed = 0;
  /** A visitor pressed Pause: coming back into view does not resume. */
  private manualPause = false;

  /** The preview header's playback control: Pause, Play or Replay. */
  readonly control = computed<{ icon: IconName; tooltip: string }>(() => {
    const state = this.playback();
    if (state === 'playing') return { icon: 'pause', tooltip: 'Pause' };
    if (state === 'paused') return { icon: 'play', tooltip: 'Play' };
    return { icon: 'rotate-ccw', tooltip: 'Replay' };
  });

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
        this.fired.update((count) => count + 1);
      }, Math.max(0, target - this.elapsed));
      onCleanup(() => {
        clearTimeout(timer);
        if (this.fired() === fired) this.elapsed += Date.now() - startedAt;
      });
    });

    afterNextRender(() => {
      // The host is display: contents and sits in the preview tab, which is
      // rebuilt when the reader switches tabs: observe the frame, which
      // outlives it (and matches the reference's wrapper around the preview).
      const stage = host.closest('[data-component-preview]') ?? host.parentElement ?? host;
      if (typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.intersectionRatio >= 0.5) {
            if (!this.manualPause) {
              this.playback.update((state) => (state === 'finished' ? state : 'playing'));
            }
          } else if (entry.intersectionRatio < 0.1) {
            this.manualPause = false;
            this.playback.update((state) => (state === 'finished' ? state : 'paused'));
          }
        },
        { threshold: [0.1, 0.5] },
      );
      observer.observe(stage);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Pause while playing; resume while paused; restart once finished. */
  togglePlayback(): void {
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
      this.runKey.update((key) => key + 1);
    }
    this.playback.set('playing');
  }

  protected status(index: number): StepStatus {
    const fired = this.fired();
    if (fired >= this.delays.length) return 'complete';
    return index < fired - 1 ? 'complete' : index === fired - 1 ? 'active' : 'pending';
  }
}

@Component({
  selector: 'app-thinking-steps-streaming-demo',
  imports: [...CORE, ThinkingStepSources, ThinkingStepSource],
  host: { style: 'display: contents' },
  template: `
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
export class StreamingDemo extends SequencedStepsDemo {
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
  selector: 'app-thinking-steps-streaming-description',
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
      const length = this.text().length;
      const count = this.count();
      if (!active) {
        if (count !== 0) this.count.set(0);
        return;
      }
      if (count >= length) return;
      const id = setTimeout(() => this.count.set(Math.min(count + 3, length)), 16);
      onCleanup(() => clearTimeout(id));
    });
  }
}

@Component({
  selector: 'app-thinking-steps-streaming-text-demo',
  imports: [...CORE, StreamingDescription],
  host: { style: 'display: contents' },
  template: `
    @for (k of [runKey()]; track k) {
      <ff-thinking-steps [(open)]="open" class="w-full px-8">
        <ff-thinking-steps-header />
        <ff-thinking-steps-content>
          @for (label of labels; track $index; let i = $index) {
            <ff-thinking-step [showIcon]="false" [label]="label" [status]="status(i)" [isLast]="fired() <= i + 1">
              <app-thinking-steps-streaming-description
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
export class StreamingTextDemo extends SequencedStepsDemo {
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
  selector: 'app-thinking-steps-images-demo',
  imports: [...CORE, ThinkingStepImage],
  host: { style: 'display: contents' },
  template: `
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
export class WithImagesDemo extends SequencedStepsDemo {
  protected readonly delays = [400, 1800, 3400, 5000, 6000];
}

@Component({
  selector: 'app-thinking-steps-full-demo',
  imports: [...CORE, ThinkingStepSources, ThinkingStepSource, ThinkingStepImage, ThinkingStepDetails],
  host: { style: 'display: contents' },
  template: `
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
export class FullDemo extends SequencedStepsDemo {
  protected readonly delays = [400, 1600, 2800, 3800, 5000, 6200, 7200];
}
