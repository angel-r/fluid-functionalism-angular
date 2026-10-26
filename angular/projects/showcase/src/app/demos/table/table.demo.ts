import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-table-demo',
  imports: [DemoPage, DemoSection, Table, TableHeader, TableBody, TableRow, TableHead, TableCell],
  template: `
    <app-demo-page title="Table" description="Data table with row hover effects and semantic markup.">
      <app-demo-section title="Basic">
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
      </app-demo-section>

      <app-demo-section title="Compact">
        <div class="w-full">
          <ff-table size="compact">
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
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TableDemo {
  protected readonly people = [
    { name: 'Alice', role: 'Engineer', status: 'Active' },
    { name: 'Bob', role: 'Designer', status: 'Away' },
    { name: 'Carol', role: 'Manager', status: 'Active' },
  ];
}
