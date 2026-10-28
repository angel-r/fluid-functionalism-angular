// ---------------------------------------------------------------------------
// /docs/switch, ported from app/docs/switch/page.tsx: a switch driven by the
// page's state, its disabled form, and the API reference. The thumb springs
// between the track's ends on its own tier (spring.moderate).
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Switch } from '@angel-r/fluid-functionalism-angular';
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
  selector: 'app-switch-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, Switch],
  template: `
    <app-doc-page
      title="Switch"
      slug="switch"
      description="Toggle switch with animated thumb and label."
      [installUsage]="basicCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Basic">
        <app-component-preview [code]="basicCode">
          <ff-switch label="Notifications" [(checked)]="checked" />
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Disabled">
        <app-component-preview [code]="disabledCode">
          <ff-switch label="Disabled option" [checked]="false" disabled />
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference">
        <app-props-table [props]="switchTable" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SwitchPage {
  protected readonly basicCode = `import { Switch } from '@angel-r/fluid-functionalism-angular';
import { signal } from '@angular/core';

readonly checked = signal(false);

<ff-switch label="Notifications" [(checked)]="checked" />`;

  protected readonly disabledCode = `<ff-switch label="Disabled option" [checked]="false" disabled />`;

  protected readonly switchTable = API_REFERENCE['switch'][0].props;
  protected readonly installProps = promptProps(API_REFERENCE['switch']);

  protected readonly checked = signal(false);
}
