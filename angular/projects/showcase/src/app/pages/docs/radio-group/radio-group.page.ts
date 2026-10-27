// ---------------------------------------------------------------------------
// /docs/radio-group, ported from app/docs/radio-group/page.tsx: one Basic
// section (three rows, the first selected) and the two API reference tables.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RadioGroup, RadioItem } from '@angel-r/fluid-functionalism-angular';
import { groupProps, itemProps } from '../../../docs-kit/api/radio-group';
import type { PropDef } from '../../../docs-kit/api/types';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';

/** The install prompt's one line per prop. `<ng-content />` rows describe the
 *  projection, not an input, so they stay out. */
function promptProps(props: readonly PropDef[]): string[] {
  return props
    .filter((prop) => !prop.name.startsWith('<ng-content'))
    .map(
      (prop) =>
        `${prop.name}: ${prop.type}${prop.default !== undefined ? ` (default ${prop.default})` : ''} — ${prop.description}`,
    );
}

@Component({
  selector: 'app-radio-group-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, RadioGroup, RadioItem],
  template: `
    <app-doc-page
      title="RadioGroup"
      description="Radio button group with fluid hover and animated selection."
      slug="radio-group"
      [installUsage]="basicCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Basic">
        <app-component-preview [code]="basicCode">
          <ff-radio-group [selectedIndex]="selected()">
            @for (label of options; track label; let i = $index) {
              <ff-radio-item
                [index]="i"
                [label]="label"
                [selected]="selected() === i"
                (select)="selected.set(i)"
              />
            }
          </ff-radio-group>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference — RadioGroup">
        <app-props-table [props]="groupTable" />
      </app-doc-section>

      <app-doc-section title="API Reference — RadioItem">
        <app-props-table [props]="itemTable" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RadioGroupPage {
  protected readonly basicCode = `import { RadioGroup, RadioItem } from '@angel-r/fluid-functionalism-angular';
import { signal } from '@angular/core';

readonly options = ['Option A', 'Option B', 'Option C'];
readonly selected = signal(0);

<ff-radio-group [selectedIndex]="selected()">
  @for (label of options; track label; let i = $index) {
    <ff-radio-item
      [index]="i"
      [label]="label"
      [selected]="selected() === i"
      (select)="selected.set(i)"
    />
  }
</ff-radio-group>`;

  protected readonly installProps = promptProps([...groupProps, ...itemProps]);
  protected readonly groupTable = groupProps;
  protected readonly itemTable = itemProps;

  protected readonly options = ['Option A', 'Option B', 'Option C'];
  protected readonly selected = signal(0);
}
