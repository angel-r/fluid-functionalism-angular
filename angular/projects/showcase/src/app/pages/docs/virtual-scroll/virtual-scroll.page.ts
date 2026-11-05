// ---------------------------------------------------------------------------
// /docs/virtual-scroll: an Angular-only page (the React library has no
// virtualization). A 10,000-row table, a two-axis time matrix with a sticky
// header row and label column, and the API reference. Each demo prints how
// many nodes it actually renders, which is the point of the component.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  type Signal,
  type WritableSignal,
  computed,
  input,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  VirtualFor,
  VirtualScroll,
  fontWeights,
  injectSize,
} from '@angel-r/fluid-functionalism-angular';
import type { PropDef } from '../../../docs-kit/api/types';
import { virtualForProps, virtualScrollProps } from '../../../docs-kit/api/virtual-scroll';
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

const ROLES = ['Engineer', 'Designer', 'Manager', 'Analyst', 'Researcher'];
const STATUSES = ['Active', 'Away', 'Offline'];
const NAMES = ['Alice', 'Bob', 'Carol', 'Dan', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy'];

/** A deterministic pseudo-random sequence, so every visit shows the same data. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

interface Person {
  name: string;
  role: string;
  status: string;
}

interface Schedule {
  name: string;
  /** Hours per day, one signal per cell. */
  days: WritableSignal<number>[];
}

const ROW_COUNT = 10_000;
const GRID_ROWS = 1_000;
const GRID_DAYS = 365;
const DAY_WIDTH = 56;
const LABEL_WIDTH = 128;

/** One cell of the time matrix. OnPush with a signal input: when one cell's
 *  signal changes, only this component re-renders, never its siblings. */
@Component({
  selector: 'app-hours-cell',
  host: {
    class: 'flex h-9 w-14 flex-none items-center justify-center border-b border-r border-border tabular-nums',
    '[class.text-muted-foreground]': 'hours()() === 0',
    '[style.background-color]': 'tint()',
  },
  template: `{{ hours()() }}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HoursCell {
  readonly hours = input.required<Signal<number>>();
  protected readonly tint = computed(
    () => `color-mix(in oklab, var(--foreground) ${this.hours()() * 2}%, transparent)`,
  );
}

@Component({
  selector: 'app-virtual-scroll-page',
  imports: [
    DocPage,
    DocSection,
    ComponentPreview,
    PropsTable,
    Button,
    HoursCell,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    VirtualScroll,
    VirtualFor,
  ],
  template: `
    <app-doc-page
      title="VirtualScroll"
      description="Renders only the rows and columns in view, for long lists, dense tables and two-axis grids."
      slug="virtual-scroll"
      [installUsage]="tableCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Table">
        <app-component-preview [code]="tableCode">
          <div class="flex w-full flex-col gap-3">
            <ff-virtual-scroll class="h-96 w-full" data-testid="table-viewport">
              <ff-table>
                <thead ffTableHeader>
                  <tr ffTableRow>
                    <th ffTableHead class="sticky top-0 z-20 bg-background">#</th>
                    <th ffTableHead class="sticky top-0 z-20 bg-background">Name</th>
                    <th ffTableHead class="sticky top-0 z-20 bg-background">Role</th>
                    <th ffTableHead class="sticky top-0 z-20 bg-background">Status</th>
                  </tr>
                </thead>
                <tbody ffTableBody>
                  <tr ffTableRow *ffVirtualFor="let person of people; let i = index" [index]="i">
                    <td ffTableCell class="tabular-nums">{{ i + 1 }}</td>
                    <td ffTableCell>{{ person.name }}</td>
                    <td ffTableCell>{{ person.role }}</td>
                    <td ffTableCell>{{ person.status }}</td>
                  </tr>
                </tbody>
              </ff-table>
            </ff-virtual-scroll>
            <p class="text-muted-foreground tabular-nums" [class]="size().text" data-testid="table-count">
              {{ tableRendered() }} of {{ rowCount }} rows in the DOM
            </p>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Two axes">
        <app-component-preview [code]="gridCode">
          <div class="flex w-full flex-col gap-3" [class]="size().text">
            <ff-virtual-scroll class="h-96 w-full border border-border" data-testid="grid-viewport">
              <div class="sticky top-0 z-20 flex w-max bg-background" [style.font-variation-settings]="semibold">
                <div class="sticky left-0 z-10 flex h-9 w-32 flex-none items-center border-b border-r border-border bg-background px-3">
                  Person
                </div>
                <div
                  *ffVirtualFor="let day of days; axis: 'x'; itemSize: dayWidth"
                  class="flex h-9 w-14 flex-none items-center justify-center border-b border-r border-border tabular-nums"
                >
                  {{ day }}
                </div>
              </div>
              <div *ffVirtualFor="let row of schedule; itemSize: 36" class="flex w-max">
                <div class="sticky left-0 z-10 flex h-9 w-32 flex-none items-center border-b border-r border-border bg-background px-3">
                  {{ row.name }}
                </div>
                <app-hours-cell *ffVirtualFor="let hours of row.days; axis: 'x'; itemSize: dayWidth" [hours]="hours" />
              </div>
            </ff-virtual-scroll>
            <div class="flex flex-wrap items-center gap-3">
              <button ffButton variant="secondary" (click)="editCell()" data-testid="edit-cell">Edit a visible cell</button>
              <p class="text-muted-foreground tabular-nums" data-testid="grid-count">
                {{ gridRendered() }} of {{ cellCount }} cells in the DOM
              </p>
            </div>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference — VirtualScroll">
        <app-props-table [props]="viewportApi" />
      </app-doc-section>

      <app-doc-section title="API Reference — VirtualFor">
        <app-props-table [props]="forApi" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class VirtualScrollPage {
  protected readonly size = injectSize();
  protected readonly semibold = fontWeights.semibold;
  protected readonly dayWidth = DAY_WIDTH;
  protected readonly rowCount = ROW_COUNT.toLocaleString('en-US');
  protected readonly cellCount = (GRID_ROWS * GRID_DAYS).toLocaleString('en-US');

  protected readonly people = signal<Person[]>(this.makePeople());
  protected readonly days = Array.from({ length: GRID_DAYS }, (_, i) => i + 1);
  protected readonly schedule = signal<Schedule[]>(this.makeSchedule());

  private readonly viewports = viewChildren(VirtualScroll);
  private readonly windows = viewChildren(VirtualFor);

  protected readonly tableRendered = computed(() => {
    const rows = this.windows().find((w) => w.ffVirtualForOf() === this.people);
    const range = rows?.renderedRange();
    return range ? range.end - range.start : 0;
  });

  protected readonly gridRendered = computed(() => {
    const rows = this.windows().find((w) => w.ffVirtualForOf() === this.schedule)?.renderedRange();
    const columns = this.windows().find((w) => w.ffVirtualForOf() === this.days)?.renderedRange();
    return rows && columns ? ((rows.end - rows.start) * (columns.end - columns.start)).toLocaleString('en-US') : 0;
  });

  /** Writes one cell's signal in view: only that cell re-renders. */
  protected editCell() {
    const viewport = this.viewports()[1];
    if (!viewport) return;
    const random = Math.random;
    const firstRow = Math.floor(viewport.scrollTop() / 36);
    const firstDay = Math.floor(viewport.scrollLeft() / DAY_WIDTH);
    const rowsInView = Math.max(1, Math.floor((viewport.viewportHeight() - 36) / 36));
    const daysInView = Math.max(1, Math.floor((viewport.viewportWidth() - LABEL_WIDTH) / DAY_WIDTH));
    const row = this.schedule()[Math.min(GRID_ROWS - 1, firstRow + Math.floor(random() * rowsInView))];
    const cell = row.days[Math.min(GRID_DAYS - 1, firstDay + Math.floor(random() * daysInView))];
    cell.set((cell() + 1 + Math.floor(random() * 7)) % 9);
  }

  private makePeople(): Person[] {
    const next = seeded(8);
    return Array.from({ length: ROW_COUNT }, () => ({
      name: `${NAMES[Math.floor(next() * NAMES.length)]} ${String.fromCharCode(65 + Math.floor(next() * 26))}.`,
      role: ROLES[Math.floor(next() * ROLES.length)],
      status: STATUSES[Math.floor(next() * STATUSES.length)],
    }));
  }

  private makeSchedule(): Schedule[] {
    const next = seeded(36);
    return Array.from({ length: GRID_ROWS }, (_, r) => ({
      name: `${NAMES[r % NAMES.length]} ${r + 1}`,
      days: Array.from({ length: GRID_DAYS }, (_, d) =>
        signal(d % 7 >= 5 ? 0 : Math.floor(next() * 9)),
      ),
    }));
  }

  protected readonly tableCode = `import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, VirtualFor, VirtualScroll } from '@angel-r/fluid-functionalism-angular';

// people = signal<Person[]>(…10,000 rows)

<ff-virtual-scroll class="h-96">
  <ff-table>
    <thead ffTableHeader>
      <tr ffTableRow>
        <th ffTableHead class="sticky top-0 z-20 bg-background">Name</th>
        <th ffTableHead class="sticky top-0 z-20 bg-background">Role</th>
      </tr>
    </thead>
    <tbody ffTableBody>
      <!-- Without itemSize, the row size is measured from the rendered rows. -->
      <tr ffTableRow *ffVirtualFor="let person of people; let i = index" [index]="i">
        <td ffTableCell>{{ person.name }}</td>
        <td ffTableCell>{{ person.role }}</td>
      </tr>
    </tbody>
  </ff-table>
</ff-virtual-scroll>`;

  protected readonly gridCode = `import { VirtualFor, VirtualScroll } from '@angel-r/fluid-functionalism-angular';

// schedule = signal<{ name: string; days: WritableSignal<number>[] }[]>(…)
// <app-hours-cell> is OnPush and takes the cell's signal as an input, so
// writing one cell re-renders that cell alone.

<ff-virtual-scroll class="h-96">
  <div *ffVirtualFor="let row of schedule; itemSize: 36" class="flex w-max">
    <div class="sticky left-0 w-32 bg-background">{{ row.name }}</div>
    <app-hours-cell *ffVirtualFor="let hours of row.days; axis: 'x'; itemSize: 56" [hours]="hours" />
  </div>
</ff-virtual-scroll>`;

  protected readonly installProps = promptProps([...virtualScrollProps, ...virtualForProps]);
  protected readonly viewportApi = virtualScrollProps;
  protected readonly forApi = virtualForProps;
}
