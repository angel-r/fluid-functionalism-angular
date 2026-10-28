// ---------------------------------------------------------------------------
// /docs/thinking-indicator, ported from app/docs/thinking-indicator/page.tsx:
// one Basic section (the morphing glyph and the cycling word are the
// component's own) and its API reference.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ThinkingIndicator } from '@angel-r/fluid-functionalism-angular';
import { indicatorProps } from '../../../docs-kit/api/thinking-indicator';
import type { PropDef } from '../../../docs-kit/api/types';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';

/** The install prompt's one line per prop. */
function promptProps(props: readonly PropDef[]): string[] {
  return props
    .filter((prop) => !prop.name.startsWith('<ng-content'))
    .map(
      (prop) =>
        `${prop.name}: ${prop.type}${prop.default !== undefined ? ` (default ${prop.default})` : ''} — ${prop.description}`,
    );
}

@Component({
  selector: 'app-thinking-indicator-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, ThinkingIndicator],
  template: `
    <app-doc-page
      title="ThinkingIndicator"
      description="Animated status indicator with morphing SVG and cycling text."
      slug="thinking-indicator"
      [installUsage]="basicCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Basic">
        <app-component-preview [code]="basicCode">
          <ff-thinking-indicator />
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference">
        <app-props-table [props]="indicatorTable" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ThinkingIndicatorPage {
  protected readonly basicCode = `import { ThinkingIndicator } from '@angel-r/fluid-functionalism-angular';

<ff-thinking-indicator />`;

  protected readonly installProps = promptProps(indicatorProps);
  protected readonly indicatorTable = indicatorProps;
}
