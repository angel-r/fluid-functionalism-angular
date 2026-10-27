// ---------------------------------------------------------------------------
// /docs/thinking-steps, ported from app/docs/thinking-steps/page.tsx: six
// sections — Basic, Minimal, the four sequenced demos, and the API reference.
// Each animated demo owns its playback state and the page projects its
// play / pause / replay control into the preview header (React's
// AnimatedPreview playbackButton).
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ThinkingStep,
  ThinkingStepDetails,
  ThinkingSteps,
  ThinkingStepsContent,
  ThinkingStepsHeader,
  fontWeights,
} from '@angel-r/fluid-functionalism-angular';
import {
  detailsProps,
  headerProps,
  imageProps,
  rootProps,
  sourceProps,
  stepProps,
} from '../../../docs-kit/api/thinking-steps';
import type { ApiTable } from '../../../docs-kit/api/types';
import { ComponentPreview, PreviewActionButton } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';
import { FullDemo, StreamingDemo, StreamingTextDemo, WithImagesDemo } from './thinking-steps-demos';
import {
  basicCode,
  fullCode,
  minimalCode,
  streamingCode,
  streamingTextCode,
  withImagesCode,
} from './thinking-steps-snippets';

/** The install prompt's snippet: the page's shortest usage. */
const INSTALL_USAGE = `<ff-thinking-steps>
  <ff-thinking-steps-header />
  <ff-thinking-steps-content>
    <ff-thinking-step [showIcon]="false" label="Ran a command" />
    <ff-thinking-step [showIcon]="false" label="Done" isLast />
  </ff-thinking-steps-content>
</ff-thinking-steps>`;

/** The page's API tables, in page order, and one install-prompt line per prop. */
const API_TABLES: readonly (readonly [string, ApiTable['props']])[] = [
  ['ThinkingSteps', rootProps],
  ['ThinkingStepsHeader', headerProps],
  ['ThinkingStep', stepProps],
  ['ThinkingStepDetails', detailsProps],
  ['ThinkingStepSource', sourceProps],
  ['ThinkingStepImage', imageProps],
];

const INSTALL_PROPS = API_TABLES.flatMap(([title, table]) =>
  table.map((prop) => {
    const fallback = prop.default === undefined ? '' : ` (default: ${prop.default})`;
    return `${title}.${prop.name}: ${prop.type}${fallback} — ${prop.description}`;
  }),
);

@Component({
  selector: 'app-thinking-steps-page',
  imports: [
    DocPage,
    DocSection,
    ComponentPreview,
    PreviewActionButton,
    PropsTable,
    ThinkingSteps,
    ThinkingStepsHeader,
    ThinkingStepsContent,
    ThinkingStep,
    ThinkingStepDetails,
    StreamingDemo,
    StreamingTextDemo,
    WithImagesDemo,
    FullDemo,
  ],
  templateUrl: './thinking-steps.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ThinkingStepsPage {
  protected readonly semibold = fontWeights.semibold;

  protected readonly basicCode = basicCode;
  protected readonly minimalCode = minimalCode;
  protected readonly streamingCode = streamingCode;
  protected readonly streamingTextCode = streamingTextCode;
  protected readonly withImagesCode = withImagesCode;
  protected readonly fullCode = fullCode;

  protected readonly installUsage = INSTALL_USAGE;
  protected readonly installProps = INSTALL_PROPS;

  protected readonly rootProps = rootProps;
  protected readonly headerProps = headerProps;
  protected readonly stepProps = stepProps;
  protected readonly detailsProps = detailsProps;
  protected readonly sourceProps = sourceProps;
  protected readonly imageProps = imageProps;

  protected readonly exploredFiles = [
    'Read accordion.tsx',
    'Read icon-context.tsx',
    'Read badge.tsx',
    'Read use-fluid-hover.ts',
    'Read components.ts',
    'Read postbuild-registry.mjs',
  ];
}
