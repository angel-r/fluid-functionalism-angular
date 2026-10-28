// ---------------------------------------------------------------------------
// /docs/table, ported from app/docs/table/page.tsx: one Basic section (three
// body rows over a header row) and the two API reference tables. Body rows
// pass `index`, which is what lights them under the fluid hover.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@angel-r/fluid-functionalism-angular';
import { rowProps, tableProps } from '../../../docs-kit/api/table';
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
  selector: 'app-table-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, Table, TableHeader, TableBody, TableRow, TableHead, TableCell],
  template: `
    <app-doc-page
      title="Table"
      description="Data table with row hover effects and semantic markup."
      slug="table"
      [installUsage]="basicCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Basic">
        <app-component-preview [code]="basicCode">
          <div class="w-full">
            <ff-table>
              <thead ffTableHeader>
                <tr ffTableRow>
                  <th ffTableHead>Name</th>
                  <th ffTableHead>Role</th>
                  <th ffTableHead>Status</th>
                </tr>
              </thead>
              <tbody ffTableBody>
                @for (person of people; track person.name; let i = $index) {
                  <tr ffTableRow [index]="i">
                    <td ffTableCell>{{ person.name }}</td>
                    <td ffTableCell>{{ person.role }}</td>
                    <td ffTableCell>{{ person.status }}</td>
                  </tr>
                }
              </tbody>
            </ff-table>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference — Table">
        <app-props-table [props]="table" />
      </app-doc-section>

      <app-doc-section title="API Reference — TableRow">
        <app-props-table [props]="rows" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TablePage {
  protected readonly basicCode = `import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@angel-r/fluid-functionalism-angular';

<ff-table>
  <thead ffTableHeader>
    <tr ffTableRow>
      <th ffTableHead>Name</th>
      <th ffTableHead>Role</th>
      <th ffTableHead>Status</th>
    </tr>
  </thead>
  <tbody ffTableBody>
    <tr ffTableRow [index]="0">
      <td ffTableCell>Alice</td>
      <td ffTableCell>Engineer</td>
      <td ffTableCell>Active</td>
    </tr>
    <tr ffTableRow [index]="1">
      <td ffTableCell>Bob</td>
      <td ffTableCell>Designer</td>
      <td ffTableCell>Away</td>
    </tr>
    <tr ffTableRow [index]="2">
      <td ffTableCell>Carol</td>
      <td ffTableCell>Manager</td>
      <td ffTableCell>Active</td>
    </tr>
  </tbody>
</ff-table>`;

  protected readonly installProps = promptProps([...tableProps, ...rowProps]);
  protected readonly table = tableProps;
  protected readonly rows = rowProps;

  protected readonly people = [
    { name: 'Alice', role: 'Engineer', status: 'Active' },
    { name: 'Bob', role: 'Designer', status: 'Away' },
    { name: 'Carol', role: 'Manager', status: 'Active' },
  ];
}
