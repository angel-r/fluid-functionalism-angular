// ---------------------------------------------------------------------------
// /docs/checkbox-group, ported from app/docs/checkbox-group/page.tsx: one
// Basic section (four rows, the first checked) and the two API reference
// tables. Contiguous checks merge into one background; the group's
// `checkedIndices` carries the set that does it.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CheckboxGroup, CheckboxItem } from '@angel-r/fluid-functionalism-angular';
import { groupProps, itemProps } from '../../../docs-kit/api/checkbox-group';
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
  selector: 'app-checkbox-group-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, CheckboxGroup, CheckboxItem],
  template: `
    <app-doc-page
      title="CheckboxGroup"
      description="Checkbox group with merged backgrounds for contiguous selections."
      slug="checkbox-group"
      [installUsage]="basicCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Basic">
        <app-component-preview [code]="basicCode">
          <ff-checkbox-group [checkedIndices]="checked()">
            @for (label of items; track label; let i = $index) {
              <ff-checkbox-item
                [index]="i"
                [label]="label"
                [checked]="checked().has(i)"
                (toggle)="toggle(i)"
              />
            }
          </ff-checkbox-group>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference — CheckboxGroup">
        <app-props-table [props]="groupTable" />
      </app-doc-section>

      <app-doc-section title="API Reference — CheckboxItem">
        <app-props-table [props]="itemTable" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CheckboxGroupPage {
  protected readonly basicCode = `import { CheckboxGroup, CheckboxItem } from '@angel-r/fluid-functionalism-angular';
import { signal } from '@angular/core';

readonly items = ['Apples', 'Bananas', 'Cherries', 'Dates'];
readonly checked = signal<ReadonlySet<number>>(new Set([0]));

toggle(index: number) {
  this.checked.update((prev) => {
    const next = new Set(prev);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    return next;
  });
}

<ff-checkbox-group [checkedIndices]="checked()">
  @for (label of items; track label; let i = $index) {
    <ff-checkbox-item
      [index]="i"
      [label]="label"
      [checked]="checked().has(i)"
      (toggle)="toggle(i)"
    />
  }
</ff-checkbox-group>`;

  protected readonly installProps = promptProps([...groupProps, ...itemProps]);
  protected readonly groupTable = groupProps;
  protected readonly itemTable = itemProps;

  protected readonly items = ['Apples', 'Bananas', 'Cherries', 'Dates'];
  protected readonly checked = signal<ReadonlySet<number>>(new Set([0]));

  protected toggle(index: number): void {
    this.checked.update((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }
}
