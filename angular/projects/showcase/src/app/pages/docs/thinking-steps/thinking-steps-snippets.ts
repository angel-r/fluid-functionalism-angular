// ---------------------------------------------------------------------------
// The Code tab of /docs/thinking-steps: the reference page's six snippets,
// rewritten as Angular that runs against the library (templates, signals and
// the same copy). The highlight grammar follows the snippet itself.
// ---------------------------------------------------------------------------

export const basicCode = `import { Component } from '@angular/core';
import {
  ThinkingStep,
  ThinkingStepDetails,
  ThinkingSteps,
  ThinkingStepsContent,
  ThinkingStepsHeader,
} from '@angel-r/fluid-functionalism-angular';

@Component({
  imports: [ThinkingSteps, ThinkingStepsHeader, ThinkingStepsContent, ThinkingStep, ThinkingStepDetails],
  template: \`
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
  \`,
})
export class Demo {
  protected readonly exploredFiles = [
    'Read accordion.tsx',
    'Read icon-context.tsx',
    'Read badge.tsx',
    'Read use-fluid-hover.ts',
    'Read components.ts',
    'Read postbuild-registry.mjs',
  ];
}`;

export const minimalCode = `<!-- Two dots — the simplest possible usage. -->
<ff-thinking-steps>
  <ff-thinking-steps-header />
  <ff-thinking-steps-content>
    <ff-thinking-step [showIcon]="false" label="Ran a command" />
    <ff-thinking-step [showIcon]="false" label="Done" isLast />
  </ff-thinking-steps-content>
</ff-thinking-steps>`;

export const streamingCode = `import { Component, signal } from '@angular/core';
import {
  type StepStatus,
  ThinkingStep,
  ThinkingStepSource,
  ThinkingStepSources,
  ThinkingSteps,
  ThinkingStepsContent,
  ThinkingStepsHeader,
} from '@angel-r/fluid-functionalism-angular';

const TOTAL = 4;

@Component({
  imports: [
    ThinkingSteps, ThinkingStepsHeader, ThinkingStepsContent,
    ThinkingStep, ThinkingStepSources, ThinkingStepSource,
  ],
  template: \`
    <ff-thinking-steps [(open)]="open">
      <ff-thinking-steps-header />
      <ff-thinking-steps-content>
        <ff-thinking-step
          icon="search"
          label="Searching for micka.design"
          [status]="status(0)"
          [isLast]="visibleSteps() <= 1"
        >
          @if (visibleSteps() > 1) {
            <ff-thinking-step-sources>
              <ff-thinking-step-source [delay]="0.05">x.com</ff-thinking-step-source>
              <ff-thinking-step-source [delay]="0.1">google.com</ff-thinking-step-source>
              <ff-thinking-step-source [delay]="0.15">github.com</ff-thinking-step-source>
            </ff-thinking-step-sources>
          }
        </ff-thinking-step>
        <ff-thinking-step
          icon="globe"
          label="Reading sources"
          [status]="status(1)"
          [isLast]="visibleSteps() <= 2"
        />
        <ff-thinking-step
          icon="brain"
          label="Analyzing portfolio"
          [status]="status(2)"
          [isLast]="visibleSteps() <= 3"
        />
        <ff-thinking-step icon="check" label="Complete" [status]="status(3)" isLast />
      </ff-thinking-steps-content>
    </ff-thinking-steps>
  \`,
})
export class Demo {
  protected readonly open = signal(true);
  protected readonly visibleSteps = signal(0);

  constructor() {
    [400, 1800, 3200, 4200, 5200].forEach((at, step) =>
      setTimeout(() => this.visibleSteps.set(step + 1), at),
    );
  }

  protected status(index: number): StepStatus {
    if (this.visibleSteps() > TOTAL) return 'complete';
    return index < this.visibleSteps() - 1
      ? 'complete'
      : index === this.visibleSteps() - 1
        ? 'active'
        : 'pending';
  }
}`;

export const streamingTextCode = `<!-- Dot mode with long descriptions — text-only, no sources or details. -->
<ff-thinking-steps [(open)]="open">
  <ff-thinking-steps-header />
  <ff-thinking-steps-content>
    <ff-thinking-step
      [showIcon]="false"
      label="Loading dataset"
      [status]="status(0)"
      description="Establishing a connection to the data warehouse and streaming
        2.4 million rows across 47 columns into a memory-mapped buffer.
        The source table spans three partitions dated from January
        through March, each containing roughly 800K records with nested
        JSON fields that need to be flattened before downstream
        processing can begin."
    />
    <ff-thinking-step
      [showIcon]="false"
      label="Validating schema"
      [status]="status(1)"
      description="Running a full schema validation pass against the canonical
        type definitions. Checking that all 47 columns match their
        expected types, verifying nullability constraints on the 12
        required fields, confirming foreign key references resolve
        correctly against the dimension tables, and flagging any new
        columns that appeared since the last successful run."
    />
    <ff-thinking-step
      [showIcon]="false"
      label="Transforming records"
      [status]="status(2)"
      description="Applying the full normalization pipeline: flattening nested
        address objects into discrete columns, deduplicating records
        that share the same composite key across partitions, converting
        all timestamps from mixed UTC and local offsets into canonical
        ISO 8601 format, and running the currency conversion step for
        the 14 non-USD transaction currencies."
    />
    <ff-thinking-step
      [showIcon]="false"
      label="Running quality checks"
      [status]="status(3)"
      description="Executing 23 data quality assertions: verifying output row
        counts fall within the expected 2% tolerance, checking revenue
        distribution skew against the trailing 30-day average,
        confirming referential integrity against all five dimension
        tables, and ensuring no single partition exceeds 40% of total
        volume."
    />
    <ff-thinking-step
      [showIcon]="false"
      label="Writing output"
      [status]="status(4)"
      description="Compressing the validated dataset into 847 Snappy-encoded
        Parquet files partitioned by region and date, uploading each
        file to the staging bucket with server-side encryption,
        registering partition metadata in the Hive metastore, and
        triggering the downstream Airflow DAG for incremental merges
        into the production fact table."
    />
    <ff-thinking-step [showIcon]="false" label="Pipeline complete" [status]="status(5)" isLast />
  </ff-thinking-steps-content>
</ff-thinking-steps>`;

export const withImagesCode = `<!-- Steps with inline images using ThinkingStepImage. -->
<ff-thinking-steps [(open)]="open">
  <ff-thinking-steps-header>Vision Agent</ff-thinking-steps-header>
  <ff-thinking-steps-content>
    <ff-thinking-step
      icon="search"
      label="Searching for reference"
      [status]="status(0)"
      [isLast]="visibleSteps() <= 1"
    />
    <ff-thinking-step
      icon="image"
      label="Found screenshot"
      [status]="status(1)"
      [isLast]="visibleSteps() <= 2"
    >
      <ff-thinking-step-image src="og.png" caption="Homepage screenshot" />
    </ff-thinking-step>
    <ff-thinking-step
      icon="brain"
      label="Analyzing layout"
      description="Inspecting spacing, typography scale, and color usage."
      [status]="status(2)"
      [isLast]="visibleSteps() <= 3"
    />
    <ff-thinking-step icon="check" label="Analysis complete" [status]="status(3)" isLast />
  </ff-thinking-steps-content>
</ff-thinking-steps>`;

export const fullCode = `<!-- Kitchen sink: sources, details, descriptions, images, custom header. -->
<ff-thinking-steps [(open)]="open">
  <ff-thinking-steps-header>Research Agent</ff-thinking-steps-header>
  <ff-thinking-steps-content>
    <ff-thinking-step icon="search" label="Searching for profiles" [status]="status(0)" [isLast]="visibleSteps() <= 1">
      <ff-thinking-step-sources>
        <ff-thinking-step-source>x.com</ff-thinking-step-source>
        <ff-thinking-step-source>instagram.com</ff-thinking-step-source>
        <ff-thinking-step-source>github.com</ff-thinking-step-source>
      </ff-thinking-step-sources>
    </ff-thinking-step>
    <ff-thinking-step
      icon="image"
      label="Found profile photo"
      description="micka.design profile from x.com"
      [status]="status(1)"
      [isLast]="visibleSteps() <= 2"
    >
      <ff-thinking-step-image src="og.png" caption="Profile card" />
    </ff-thinking-step>
    <ff-thinking-step icon="globe" label="Reading portfolio" [status]="status(2)" [isLast]="visibleSteps() <= 3">
      <ff-thinking-step-details
        summary="Explored 4 pages"
        [details]="['Read about.html', 'Read projects.html', 'Read resume.pdf', 'Read contact.html']"
      />
    </ff-thinking-step>
    <ff-thinking-step icon="search" label="Searching for recent work" [status]="status(3)" [isLast]="visibleSteps() <= 4">
      <ff-thinking-step-sources>
        <ff-thinking-step-source>figma.com</ff-thinking-step-source>
        <ff-thinking-step-source>behance.net</ff-thinking-step-source>
        <ff-thinking-step-source>google.com</ff-thinking-step-source>
      </ff-thinking-step-sources>
    </ff-thinking-step>
    <ff-thinking-step
      icon="brain"
      label="Analyzing results"
      description="Compiling findings into a summary."
      [status]="status(4)"
      [isLast]="visibleSteps() <= 5"
    />
    <ff-thinking-step icon="check" label="Research complete" [status]="status(5)" isLast />
  </ff-thinking-steps-content>
</ff-thinking-steps>`;
