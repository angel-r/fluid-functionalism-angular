// ---------------------------------------------------------------------------
// /docs/table, ported from app/docs/table/page.tsx: one Basic section (three
// body rows over a header row) and the API reference tables. Body rows pass
// `index`, which is what lights them under the fluid hover. The Server-side
// data section is Angular-only (#11): a sticky header over rows from `data`,
// with sorting and paging answered by a simulated API.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableRows,
  type TableQuery,
} from '@angel-r/fluid-functionalism-angular';
import { headerProps, headProps, paginationProps, rowProps, rowsProps, tableProps } from '../../../docs-kit/api/table';
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

interface Person {
  name: string;
  role: string;
  status: string;
}

@Component({
  selector: 'app-table-page',
  imports: [
    DocPage,
    DocSection,
    ComponentPreview,
    PropsTable,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableRows,
    TablePagination,
  ],
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

      <app-doc-section title="Server-side data">
        <app-component-preview [code]="serverCode">
          <div class="w-full" data-testid="server-table">
            <div class="max-h-64 overflow-auto">
              <ff-table
                #server
                [data]="page()"
                [pageSize]="pageSize"
                [total]="employees.length"
                (sortChange)="load($event)"
                (pageChange)="load($event)"
              >
                <thead ffTableHeader sticky>
                  <tr ffTableRow>
                    <th ffTableHead sortKey="name">Name</th>
                    <th ffTableHead sortKey="role">Role</th>
                    <th ffTableHead sortKey="status">Status</th>
                  </tr>
                </thead>
                <tbody ffTableBody>
                  <tr ffTableRow *ffTableRows="let person of server; let i = index" [index]="i">
                    <td ffTableCell>{{ person.name }}</td>
                    <td ffTableCell>{{ person.role }}</td>
                    <td ffTableCell>{{ person.status }}</td>
                  </tr>
                </tbody>
              </ff-table>
            </div>
            <ff-table-pagination [for]="server" />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference — Table">
        <app-props-table [props]="table" />
      </app-doc-section>

      <app-doc-section title="API Reference — TableHeader">
        <app-props-table [props]="header" />
      </app-doc-section>

      <app-doc-section title="API Reference — TableHead">
        <app-props-table [props]="head" />
      </app-doc-section>

      <app-doc-section title="API Reference — TableRow">
        <app-props-table [props]="rows" />
      </app-doc-section>

      <app-doc-section title="API Reference — TableRows">
        <app-props-table [props]="rowsDirective" />
      </app-doc-section>

      <app-doc-section title="API Reference — TablePagination">
        <app-props-table [props]="pagination" />
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

  protected readonly serverCode = `import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableRows, TablePagination, type TableQuery,
} from '@angel-r/fluid-functionalism-angular';

<div class="max-h-64 overflow-auto">
  <ff-table
    #table
    [data]="rows()"
    [pageSize]="8"
    [total]="total()"
    (sortChange)="load($event)"
    (pageChange)="load($event)"
  >
    <thead ffTableHeader sticky>
      <tr ffTableRow>
        <th ffTableHead sortKey="name">Name</th>
        <th ffTableHead sortKey="role">Role</th>
        <th ffTableHead sortKey="status">Status</th>
      </tr>
    </thead>
    <tbody ffTableBody>
      <tr ffTableRow *ffTableRows="let person of table; let i = index" [index]="i">
        <td ffTableCell>{{ person.name }}</td>
        <td ffTableCell>{{ person.role }}</td>
        <td ffTableCell>{{ person.status }}</td>
      </tr>
    </tbody>
  </ff-table>
</div>
<ff-table-pagination [for]="table" />

// The table only emits the query; the rows change when the response lands.
// query: { column: 'name', direction: 'ASC', offset: 16, limit: 8 }
load(query: TableQuery) {
  this.api.people(query).subscribe(({ rows, total }) => {
    this.rows.set(rows);
    this.total.set(total);
  });
}`;

  protected readonly installProps = promptProps([
    ...tableProps,
    ...headerProps,
    ...headProps,
    ...rowProps,
    ...rowsProps,
    ...paginationProps,
  ]);
  protected readonly table = tableProps;
  protected readonly header = headerProps;
  protected readonly head = headProps;
  protected readonly rows = rowProps;
  protected readonly rowsDirective = rowsProps;
  protected readonly pagination = paginationProps;

  protected readonly people = [
    { name: 'Alice', role: 'Engineer', status: 'Active' },
    { name: 'Bob', role: 'Designer', status: 'Away' },
    { name: 'Carol', role: 'Manager', status: 'Active' },
  ];

  // The Server-side data demo's "API": it sorts and slices a fixed list after
  // a short delay, the way a real endpoint answers a query.
  protected readonly pageSize = 8;
  protected readonly employees: Person[] = [
    'Alice', 'Bob', 'Carol', 'Dave', 'Erin', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy', 'Mallory', 'Niaj',
    'Olivia', 'Peggy', 'Rupert', 'Sybil', 'Trent', 'Uma', 'Victor', 'Walter', 'Xena', 'Yara', 'Zoe',
  ].map((name, i) => ({
    name,
    role: ['Engineer', 'Designer', 'Manager', 'Support'][i % 4],
    status: ['Active', 'Away', 'Active', 'Offline', 'Active'][i % 5],
  }));
  protected readonly page = signal<Person[]>(this.employees.slice(0, this.pageSize));
  private request = 0;

  protected load(query: TableQuery): void {
    const request = ++this.request;
    setTimeout(() => {
      // A later query superseded this one.
      if (request !== this.request) return;
      const sorted = [...this.employees];
      const column = query.column as keyof Person | null;
      if (column) {
        const sign = query.direction === 'DESC' ? -1 : 1;
        sorted.sort((a, b) => sign * a[column].localeCompare(b[column]));
      }
      this.page.set(sorted.slice(query.offset, query.offset + (query.limit ?? sorted.length)));
    }, 400);
  }
}
