/**
 * Table through its public interface. There is no upstream table test, so
 * these pin one rule each from registry/default/table.tsx: body rows register
 * with the fluid hover and header rows don't, the borders around the lit row
 * fade out, cell text lifts on the lit row, header/body weights, and the
 * size step the cells follow.
 */
import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fontWeights } from '../core/font-weight';
import { SizeProvider, sizeMap, type SizeVariant } from '../core/size';
import { ACTIVE_ATTR } from '../fluid-hover/fluid-hover';
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
  type TableSort,
} from './table';

@Component({
  imports: [Table, TableHeader, TableBody, TableRow, TableHead, TableCell, SizeProvider],
  template: `
    <div ffSizeProvider [size]="outerSize()">
      <ff-table [size]="size()" class="extra-table">
        <thead ffTableHeader class="extra-head">
          <tr ffTableRow data-testid="header">
            <th ffTableHead>Name</th>
            <th ffTableHead>Role</th>
          </tr>
        </thead>
        <tbody ffTableBody>
          @for (person of people; track person.name; let i = $index) {
            <tr ffTableRow [index]="i" [attr.data-testid]="'row-' + i" class="extra-row">
              <td ffTableCell>{{ person.name }}</td>
              <td ffTableCell class="extra-cell">{{ person.role }}</td>
            </tr>
          }
        </tbody>
      </ff-table>
    </div>
  `,
})
class People {
  readonly table = viewChild.required(Table);
  readonly size = signal<SizeVariant | undefined>(undefined);
  readonly outerSize = signal<SizeVariant | undefined>(undefined);
  readonly people = [
    { name: 'Alice', role: 'Engineer' },
    { name: 'Bob', role: 'Designer' },
    { name: 'Carol', role: 'Manager' },
  ];
}

function setup(configure: (p: People) => void = () => {}) {
  const fixture = TestBed.createComponent(People);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const get = (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
  const light = (index: number | null) => {
    fixture.componentInstance.table().hover.setActiveIndex(index);
    fixture.detectChanges();
  };
  return { fixture, el, get, light };
}

describe('table: structure', () => {
  it('renders a full-width collapsed table inside a positioned wrapper with the highlight', () => {
    const { el } = setup();
    const host = el.querySelector<HTMLElement>('ff-table')!;
    const table = host.querySelector('table')!;
    expect(host.classList).toContain('relative');
    for (const cls of ['w-full', 'border-collapse', ...sizeMap.default.text.split(' '), 'extra-table']) {
      expect(table.classList).toContain(cls);
    }
    expect(table.querySelector('thead')!.classList).toContain('extra-head');
    expect(table.querySelectorAll('tbody tr').length).toBe(3);
  });

  it('marks body rows with their index and leaves header rows out', () => {
    const { get } = setup();
    expect(get('row-1').getAttribute('data-fluid-hover-index')).toBe('1');
    expect(get('header').hasAttribute('data-fluid-hover-index')).toBe(false);
  });

  it('weights the header semibold and the body normal', () => {
    const { get } = setup();
    expect(get('header').style.fontVariationSettings).toBe(fontWeights.semibold);
    expect(get('row-0').style.fontVariationSettings).toBe(fontWeights.normal);
  });
});

describe('table: the lit row', () => {
  const rowBase = ['group/row', 'relative', 'z-10', 'border-b', 'transition-[border-color]', 'duration-80'];

  it('draws every row border at rest', () => {
    const { get } = setup();
    for (const id of ['header', 'row-0', 'row-1', 'row-2']) {
      for (const cls of rowBase) expect(get(id).classList).toContain(cls);
      expect(get(id).classList).toContain('border-accent/40');
      expect(get(id).classList).not.toContain('is-active');
    }
    expect(get('row-0').classList).toContain('extra-row');
  });

  it('hides the lit row border and the one above it, and marks the lit row', () => {
    const { get, light } = setup();
    light(2);
    expect(get('row-2').classList).toContain('border-transparent');
    expect(get('row-2').classList).toContain('is-active');
    expect(get('row-2').hasAttribute(ACTIVE_ATTR)).toBe(true);
    expect(get('row-1').classList).toContain('border-transparent');
    expect(get('row-1').classList).not.toContain('is-active');
    expect(get('row-0').classList).toContain('border-accent/40');
    expect(get('header').classList).toContain('border-accent/40');
  });

  it("hides the header's border when the first row is lit", () => {
    const { get, light } = setup();
    light(0);
    expect(get('header').classList).toContain('border-transparent');
    expect(get('header').classList).not.toContain('is-active');
    expect(get('row-1').classList).toContain('border-accent/40');
  });

  it('restores the borders when the highlight leaves', () => {
    const { get, light } = setup();
    light(1);
    light(null);
    expect(get('row-1').classList).toContain('border-accent/40');
    expect(get('row-0').classList).toContain('border-accent/40');
  });

  it('gives cells the muted-to-foreground lift through the row', () => {
    const { get } = setup();
    const cell = get('row-0').querySelectorAll('td')[1];
    for (const cls of [
      'text-muted-foreground', 'transition-colors', 'duration-80', 'group-[.is-active]/row:text-foreground',
      'px-3', 'py-2', 'extra-cell',
    ]) {
      expect(cell.classList).toContain(cls);
    }
  });
});

describe('table: size', () => {
  it('pads header and body cells on the default step', () => {
    const { get } = setup();
    const th = get('header').querySelector('th')!;
    for (const cls of ['text-left', 'text-foreground', 'px-3', 'py-2']) expect(th.classList).toContain(cls);
  });

  it('a size input pins every cell to that step', () => {
    const { get, el } = setup((p) => p.size.set('compact'));
    const th = get('header').querySelector('th')!;
    const td = get('row-0').querySelector('td')!;
    for (const cell of [th, td]) {
      expect(cell.classList).toContain('px-2.5');
      expect(cell.classList).toContain('py-[5px]');
    }
    for (const cls of sizeMap.compact.text.split(' ')) expect(el.querySelector('table')!.classList).toContain(cls);
  });

  it('follows the surrounding size provider when the input is omitted', () => {
    const { get } = setup((p) => p.outerSize.set('compact'));
    expect(get('row-0').querySelector('td')!.classList).toContain('px-2.5');
  });

  it('the input wins over the surrounding provider', () => {
    const { get } = setup((p) => {
      p.outerSize.set('compact');
      p.size.set('default');
    });
    expect(get('row-0').querySelector('td')!.classList).toContain('px-3');
  });
});

// ---------------------------------------------------------------------------
// Server-driven data (#11): rows come from the `data` input, and sorting and
// paging only emit a query. The table never reorders or slices rows itself:
// what it renders changes only when `data` changes from outside.
// ---------------------------------------------------------------------------

interface Person {
  name: string;
  role: string;
}

const firstPage: Person[] = [
  { name: 'Alice', role: 'Engineer' },
  { name: 'Bob', role: 'Designer' },
];

@Component({
  imports: [Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableRows, TablePagination],
  template: `
    <ff-table
      #table
      [data]="rows()"
      [sort]="sort()"
      [pageSize]="pageSize()"
      [total]="total()"
      (sortChange)="sortEvents.push($event)"
      (pageChange)="pageEvents.push($event)"
    >
      <thead ffTableHeader [sticky]="sticky()">
        <tr ffTableRow>
          <th ffTableHead sortKey="name" data-testid="name-head">Name</th>
          <th ffTableHead data-testid="role-head">Role</th>
        </tr>
      </thead>
      <tbody ffTableBody>
        <tr ffTableRow *ffTableRows="let person of table; let i = index" [index]="i" [attr.data-testid]="'row-' + i">
          <td ffTableCell>{{ person.name }}</td>
          <td ffTableCell>{{ person.role }}</td>
        </tr>
      </tbody>
      <ff-table-pagination />
    </ff-table>
  `,
})
class ServerPeople {
  readonly rows = signal<Person[]>(firstPage);
  readonly sort = signal<TableSort | null>(null);
  readonly pageSize = signal<number | undefined>(2);
  readonly total = signal<number | undefined>(5);
  readonly sticky = signal(false);
  readonly sortEvents: TableQuery[] = [];
  readonly pageEvents: TableQuery[] = [];
}

function serverSetup(configure: (p: ServerPeople) => void = () => {}) {
  const fixture = TestBed.createComponent(ServerPeople);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const get = (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  const names = () => [...el.querySelectorAll('tbody tr')].map((tr) => tr.querySelector('td')!.textContent!.trim());
  const sortButton = () => get('name-head')!.querySelector('button')!;
  const pager = () => el.querySelector<HTMLElement>('ff-table-pagination')!;
  const pagerButton = (label: string) => pager().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  const click = (button: HTMLElement) => {
    button.click();
    fixture.detectChanges();
  };
  return { fixture, el, get, names, sortButton, pager, pagerButton, click };
}

describe('table: data input', () => {
  it('renders one row per item of data, with the row index in the template context', () => {
    const { names, get } = serverSetup();
    expect(names()).toEqual(['Alice', 'Bob']);
    expect(get('row-1')!.getAttribute('data-fluid-hover-index')).toBe('1');
  });

  it('re-renders when data changes, adding and removing rows', () => {
    const { fixture, names } = serverSetup();
    fixture.componentInstance.rows.set([
      { name: 'Carol', role: 'Manager' },
      { name: 'Dave', role: 'Engineer' },
      { name: 'Erin', role: 'Designer' },
    ]);
    fixture.detectChanges();
    expect(names()).toEqual(['Carol', 'Dave', 'Erin']);
    fixture.componentInstance.rows.set([{ name: 'Frank', role: 'Support' }]);
    fixture.detectChanges();
    expect(names()).toEqual(['Frank']);
  });

  it('renders no body rows for empty data', () => {
    const { fixture, el } = serverSetup((p) => p.rows.set([]));
    expect(el.querySelectorAll('tbody tr').length).toBe(0);
    fixture.componentInstance.rows.set(firstPage);
    fixture.detectChanges();
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
  });
});

describe('table: sortChange', () => {
  it('a sortable header renders a button and aria-sort; a plain header does not', () => {
    const { get, sortButton } = serverSetup();
    expect(sortButton().getAttribute('type')).toBe('button');
    expect(sortButton().textContent).toContain('Name');
    expect(get('name-head')!.getAttribute('aria-sort')).toBe('none');
    expect(get('role-head')!.querySelector('button')).toBeNull();
    expect(get('role-head')!.hasAttribute('aria-sort')).toBe(false);
  });

  it('emits the column, ASC and offset 0 on the first click, without touching the rows', () => {
    const { fixture, sortButton, click, names } = serverSetup();
    click(sortButton());
    expect(fixture.componentInstance.sortEvents).toEqual([{ column: 'name', direction: 'ASC', offset: 0, limit: 2 }]);
    expect(names()).toEqual(['Alice', 'Bob']);
  });

  it('toggles to DESC on the same column and marks aria-sort', () => {
    const { fixture, sortButton, click, get } = serverSetup();
    click(sortButton());
    expect(get('name-head')!.getAttribute('aria-sort')).toBe('ascending');
    click(sortButton());
    expect(get('name-head')!.getAttribute('aria-sort')).toBe('descending');
    expect(fixture.componentInstance.sortEvents.map((e) => e.direction)).toEqual(['ASC', 'DESC']);
  });

  it('a bound sort sets the starting state and the next click toggles from it', () => {
    const { fixture, sortButton, click, get } = serverSetup((p) => p.sort.set({ column: 'name', direction: 'DESC' }));
    expect(get('name-head')!.getAttribute('aria-sort')).toBe('descending');
    click(sortButton());
    expect(fixture.componentInstance.sortEvents.at(-1)!.direction).toBe('ASC');
  });

  it('sorting goes back to the first page', () => {
    const { fixture, sortButton, pagerButton, click } = serverSetup();
    click(pagerButton('Next page'));
    click(sortButton());
    expect(fixture.componentInstance.sortEvents.at(-1)!.offset).toBe(0);
  });

  it('marks the table busy from the event until data changes', () => {
    const { fixture, sortButton, click, el } = serverSetup();
    const table = el.querySelector('table')!;
    expect(table.hasAttribute('aria-busy')).toBe(false);
    click(sortButton());
    expect(table.getAttribute('aria-busy')).toBe('true');
    fixture.componentInstance.rows.set([...firstPage].reverse());
    fixture.detectChanges();
    expect(table.hasAttribute('aria-busy')).toBe(false);
  });
});

describe('table: pageChange', () => {
  it('shows the range and total, with previous disabled on the first page', () => {
    const { pager, pagerButton } = serverSetup();
    expect(pager().textContent).toContain('1–2 of 5');
    expect(pagerButton('Previous page').disabled).toBe(true);
    expect(pagerButton('Next page').disabled).toBe(false);
  });

  it('emits the next offset with the current sort, without touching the rows', () => {
    const { fixture, sortButton, pagerButton, click, names } = serverSetup();
    click(sortButton());
    click(pagerButton('Next page'));
    expect(fixture.componentInstance.pageEvents).toEqual([{ column: 'name', direction: 'ASC', offset: 2, limit: 2 }]);
    expect(names()).toEqual(['Alice', 'Bob']);
  });

  it('emits null column and direction when nothing is sorted', () => {
    const { fixture, pagerButton, click } = serverSetup();
    click(pagerButton('Next page'));
    expect(fixture.componentInstance.pageEvents[0]).toEqual({ column: null, direction: null, offset: 2, limit: 2 });
  });

  it('goes back with previous and disables next on the last page', () => {
    const { fixture, pager, pagerButton, click } = serverSetup();
    click(pagerButton('Next page'));
    click(pagerButton('Next page'));
    expect(pager().textContent).toContain('5–5 of 5');
    expect(pagerButton('Next page').disabled).toBe(true);
    click(pagerButton('Previous page'));
    expect(fixture.componentInstance.pageEvents.map((e) => e.offset)).toEqual([2, 4, 2]);
  });

  it('without a total, next stays enabled while a full page came back', () => {
    const { fixture, pager, pagerButton } = serverSetup((p) => p.total.set(undefined));
    expect(pager().textContent).toContain('1–2');
    expect(pager().textContent).not.toContain('of');
    expect(pagerButton('Next page').disabled).toBe(false);
    fixture.componentInstance.rows.set([firstPage[0]]);
    fixture.detectChanges();
    expect(pagerButton('Next page').disabled).toBe(true);
  });

  it('renders nothing without a page size', () => {
    const { pager } = serverSetup((p) => p.pageSize.set(undefined));
    expect(pager().querySelector('button')).toBeNull();
  });
});

describe('table: sticky header', () => {
  it('pins the header to the top of the scroll container on the surface background', () => {
    const { fixture, el } = serverSetup((p) => p.sticky.set(true));
    const thead = el.querySelector('thead')!;
    for (const cls of ['sticky', 'top-0', 'z-20', 'bg-surface-1']) expect(thead.classList).toContain(cls);
    fixture.componentInstance.sticky.set(false);
    fixture.detectChanges();
    expect(thead.classList).not.toContain('sticky');
  });

  it('draws the header rule inside the row, so it travels with the stuck header', () => {
    const { fixture, el } = serverSetup((p) => p.sticky.set(true));
    const header = el.querySelector('thead tr')!;
    for (const cls of ['border-transparent', 'after:absolute', 'after:-bottom-px', 'after:h-px', 'after:bg-accent/40']) {
      expect(header.classList).toContain(cls);
    }
    const table = fixture.debugElement.query((d) => d.name === 'ff-table').componentInstance as Table;
    table.hover.setActiveIndex(0);
    fixture.detectChanges();
    expect(header.classList).toContain('after:bg-transparent');
    expect(header.classList).not.toContain('after:bg-accent/40');
  });

  it('a body row keeps its border when the header is sticky', () => {
    const { get } = serverSetup((p) => p.sticky.set(true));
    expect(get('row-0')!.classList).toContain('border-accent/40');
    expect(get('row-0')!.classList).not.toContain('after:absolute');
  });
});
