// ---------------------------------------------------------------------------
// /docs/badge, ported from app/docs/badge/page.tsx: solid and dot badges, the
// full Tailwind palette in both variants, and the API reference.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Badge, badgeColors, type BadgeColor } from '@angel-r/fluid-functionalism-angular';
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
  selector: 'app-badge-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, Badge],
  template: `
    <app-doc-page
      title="Badge"
      slug="badge"
      description="Compact label for status, category, or metadata. Supports solid and dot variants with Tailwind colors."
      [installUsage]="solidCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Solid">
        <app-component-preview [code]="solidCode">
          <div class="flex flex-wrap items-center gap-2">
            @for (item of genres; track item.label) {
              <ff-badge [color]="item.color">{{ item.label }}</ff-badge>
            }
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Dot">
        <app-component-preview [code]="dotCode">
          <div class="flex flex-wrap items-center gap-2">
            @for (item of genres; track item.label) {
              <ff-badge variant="dot" [color]="item.color">{{ item.label }}</ff-badge>
            }
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Colors">
        <app-component-preview [code]="colorsCode">
          <div class="flex flex-col gap-3">
            <div class="flex flex-wrap items-center gap-2">
              @for (color of colors; track color) {
                <ff-badge [color]="color">{{ capitalize(color) }}</ff-badge>
              }
            </div>
            <div class="flex flex-wrap items-center gap-2">
              @for (color of colors; track color) {
                <ff-badge variant="dot" [color]="color">{{ capitalize(color) }}</ff-badge>
              }
            </div>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference">
        <app-props-table [props]="badgeTable" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BadgePage {
  protected readonly solidCode = `import { Badge } from '@angel-r/fluid-functionalism-angular';

<ff-badge color="violet">Fiction</ff-badge>
<ff-badge color="amber">Science</ff-badge>
<ff-badge color="green">Philosophy</ff-badge>
<ff-badge color="blue">History</ff-badge>
<ff-badge color="rose">Poetry</ff-badge>`;

  protected readonly dotCode = `import { Badge } from '@angel-r/fluid-functionalism-angular';

<ff-badge variant="dot" color="violet">Fiction</ff-badge>
<ff-badge variant="dot" color="amber">Science</ff-badge>
<ff-badge variant="dot" color="green">Philosophy</ff-badge>
<ff-badge variant="dot" color="blue">History</ff-badge>
<ff-badge variant="dot" color="rose">Poetry</ff-badge>`;

  protected readonly colorsCode = `import { Badge } from '@angel-r/fluid-functionalism-angular';

<!-- All available Tailwind colors -->
<ff-badge color="gray">Gray</ff-badge>
<ff-badge color="red">Red</ff-badge>
<ff-badge color="blue">Blue</ff-badge>
<ff-badge color="green">Green</ff-badge>
<!-- ... and more -->`;

  protected readonly badgeTable = API_REFERENCE['badge'][0].props;
  protected readonly installProps = promptProps(API_REFERENCE['badge']);

  protected readonly genres: readonly { label: string; color: BadgeColor }[] = [
    { label: 'Fiction', color: 'violet' },
    { label: 'Science', color: 'amber' },
    { label: 'Philosophy', color: 'green' },
    { label: 'History', color: 'blue' },
    { label: 'Poetry', color: 'rose' },
  ];
  protected readonly colors = Object.keys(badgeColors) as BadgeColor[];

  protected capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
