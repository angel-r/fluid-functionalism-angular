/**
 * Virtual scroll through its public interface: a viewport, `*ffVirtualFor`
 * rows and, for two-axis grids, a nested `*ffVirtualFor` on the x axis.
 * jsdom has no layout, so the viewport size and scroll offsets are stubbed
 * on the element and the specs assert which nodes exist and how large the
 * spacers that stand in for the rest are.
 */
import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type Signal,
  input,
  signal,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Table, TableBody, TableCell, TableRow } from '../table/table';
import { VirtualFor } from './virtual-for';
import { VirtualScroll } from './virtual-scroll';

const VIEWPORT_HEIGHT = 360;
const VIEWPORT_WIDTH = 400;

interface Row {
  id: number;
  label: string;
}

const makeRows = (n: number): Row[] => Array.from({ length: n }, (_, id) => ({ id, label: `Row ${id}` }));

function stubViewportSize() {
  const isViewport = (el: Element) => el.tagName === 'FF-VIRTUAL-SCROLL';
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return isViewport(this) ? VIEWPORT_HEIGHT : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return isViewport(this) ? VIEWPORT_WIDTH : 0;
  });
}

function scrollViewport(el: HTMLElement, offsets: { top?: number; left?: number }) {
  const viewport = el.querySelector<HTMLElement>('ff-virtual-scroll')!;
  if (offsets.top !== undefined) Object.defineProperty(viewport, 'scrollTop', { value: offsets.top, configurable: true });
  if (offsets.left !== undefined) Object.defineProperty(viewport, 'scrollLeft', { value: offsets.left, configurable: true });
  viewport.dispatchEvent(new Event('scroll'));
}

const flush = () => TestBed.inject(ApplicationRef).tick();

@Component({
  imports: [VirtualScroll, VirtualFor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ff-virtual-scroll class="h-90 extra-viewport" [buffer]="buffer()">
      <div *ffVirtualFor="let row of rows; itemSize: 36; let i = index; let n = count"
           class="row" [attr.data-index]="i" [attr.data-count]="n">
        {{ probe(row, i) }}
      </div>
    </ff-virtual-scroll>
  `,
})
class List {
  readonly rows: WritableSignal<Row[]> = signal(makeRows(1000));
  readonly buffer = signal(4);
  readonly virtualFor = viewChild.required(VirtualFor);
  readonly renders: number[] = [];
  probe(row: Row, index: number) {
    this.renders.push(index);
    return row.label;
  }
}

function setupList(configure: (l: List) => void = () => {}) {
  stubViewportSize();
  const fixture = TestBed.createComponent(List);
  configure(fixture.componentInstance);
  fixture.autoDetectChanges();
  flush();
  const el = fixture.nativeElement as HTMLElement;
  const rows = () => [...el.querySelectorAll<HTMLElement>('.row')];
  const indices = () => rows().map((r) => Number(r.dataset['index']));
  const spacers = () => [...el.querySelectorAll<HTMLElement>('[data-slot="virtual-spacer"]')];
  return { fixture, el, rows, indices, spacers, list: fixture.componentInstance };
}

const range = (start: number, end: number) => Array.from({ length: end - start }, (_, i) => start + i);

afterEach(() => vi.restoreAllMocks());

describe('virtual scroll: viewport', () => {
  it('is a scroll container that merges the class input', () => {
    const { el } = setupList();
    const viewport = el.querySelector<HTMLElement>('ff-virtual-scroll')!;
    for (const cls of ['block', 'relative', 'overflow-auto', 'extra-viewport']) {
      expect(viewport.classList).toContain(cls);
    }
    expect(viewport.getAttribute('data-slot')).toBe('virtual-scroll');
  });
});

describe('virtual scroll: one axis', () => {
  it('renders only the rows in view plus the buffer on each side', () => {
    const { indices } = setupList();
    // 360px / 36px = 10 rows in view, plus a buffer of 4 after them.
    expect(indices()).toEqual(range(0, 14));
  });

  it('stands in for the rows it does not render with spacers', () => {
    const { spacers } = setupList();
    const [leading, trailing] = spacers();
    expect(leading.style.height).toBe('0px');
    expect(trailing.style.height).toBe(`${(1000 - 14) * 36}px`);
    expect(leading.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the spacers around the rendered rows, in index order', () => {
    const { el } = setupList();
    const viewport = el.querySelector('ff-virtual-scroll')!;
    const nodes = [...viewport.children] as HTMLElement[];
    expect(nodes[0].dataset['slot']).toBe('virtual-spacer');
    expect(nodes.at(-1)!.dataset['slot']).toBe('virtual-spacer');
    expect(nodes.slice(1, -1).map((n) => Number(n.dataset['index']))).toEqual(range(0, 14));
  });

  it('moves the window as the viewport scrolls', () => {
    const { el, indices, spacers } = setupList();
    scrollViewport(el, { top: 3600 });
    flush();
    // Row 100 is at the top: 96..113 with the buffer on both sides.
    expect(indices()).toEqual(range(96, 114));
    const [leading, trailing] = spacers();
    expect(leading.style.height).toBe(`${96 * 36}px`);
    expect(trailing.style.height).toBe(`${(1000 - 114) * 36}px`);
  });

  it('clamps the window at the end of the data', () => {
    const { el, indices, spacers } = setupList();
    scrollViewport(el, { top: 1000 * 36 - VIEWPORT_HEIGHT });
    flush();
    expect(indices()).toEqual(range(986, 1000));
    expect(spacers()[1].style.height).toBe('0px');
  });

  it('reuses the nodes of rows that stay in the window', () => {
    const { el, rows } = setupList();
    const before = rows().find((r) => r.dataset['index'] === '8')!;
    scrollViewport(el, { top: 5 * 36 });
    flush();
    expect(rows().find((r) => r.dataset['index'] === '8')).toBe(before);
  });

  it('recycles the nodes that leave the window instead of creating new ones', () => {
    const { el, rows } = setupList();
    const before = new Set(rows());
    scrollViewport(el, { top: 500 * 36 });
    flush();
    // A full jump replaces every index but keeps the same pool of nodes.
    const after = rows();
    expect(after.length).toBe(18);
    expect(after.filter((r) => before.has(r)).length).toBe(before.size);
  });

  it('publishes the rendered range', () => {
    const { el, fixture } = setupList();
    const virtualFor = fixture.componentInstance.virtualFor();
    expect(virtualFor.renderedRange()).toEqual({ start: 0, end: 14 });
    scrollViewport(el, { top: 3600 });
    flush();
    expect(virtualFor.renderedRange()).toEqual({ start: 96, end: 114 });
  });

  it('follows the buffer input', () => {
    const { indices } = setupList((l) => l.buffer.set(0));
    expect(indices()).toEqual(range(0, 10));
  });

  it('exposes index and count on the row context', () => {
    const { rows } = setupList();
    expect(rows()[3].dataset['count']).toBe('1000');
  });

  it('follows the data when rows are removed', () => {
    const { list, indices, spacers } = setupList();
    list.rows.set(makeRows(5));
    flush();
    expect(indices()).toEqual(range(0, 5));
    expect(spacers()[1].style.height).toBe('0px');
  });

  it('accepts a plain array as well as a signal', () => {
    @Component({
      imports: [VirtualScroll, VirtualFor],
      template: `
        <ff-virtual-scroll>
          <div *ffVirtualFor="let row of rows; itemSize: 36" class="row">{{ row.label }}</div>
        </ff-virtual-scroll>
      `,
    })
    class Plain {
      readonly rows = makeRows(100);
    }
    stubViewportSize();
    const fixture = TestBed.createComponent(Plain);
    fixture.autoDetectChanges();
    flush();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.row').length).toBe(14);
  });
});

// One component per row, OnPush with signal inputs, counting its own renders.
const renders: number[] = [];

@Component({
  selector: 'test-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ track() }}{{ row().label }}`,
})
class RowView {
  readonly row = input.required<Row>();
  readonly index = input.required<number>();
  track() {
    renders.push(this.index());
    return '';
  }
}

@Component({
  selector: 'test-signal-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ track() }}{{ cell()() }}`,
})
class SignalCell {
  readonly cell = input.required<Signal<number>>();
  readonly index = input.required<number>();
  track() {
    renders.push(this.index());
    return '';
  }
}

describe('virtual scroll: signals', () => {
  beforeEach(() => (renders.length = 0));

  it('re-renders only the row component whose item changed, not its siblings', () => {
    @Component({
      imports: [VirtualScroll, VirtualFor, RowView],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `
        <ff-virtual-scroll>
          <test-row *ffVirtualFor="let row of rows; itemSize: 36; let i = index" [row]="row" [index]="i" />
        </ff-virtual-scroll>
      `,
    })
    class Rows {
      readonly rows = signal(makeRows(1000));
    }
    stubViewportSize();
    const fixture = TestBed.createComponent(Rows);
    fixture.autoDetectChanges();
    flush();
    expect(new Set(renders).size).toBe(14);
    renders.length = 0;
    fixture.componentInstance.rows.update((rows) => rows.map((r) => (r.id === 2 ? { ...r, label: 'Changed' } : r)));
    flush();
    expect(renders).toEqual([2]);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('test-row')[2].textContent).toBe('Changed');
  });

  it('refreshes only the cell whose own signal changed, without re-running the list', () => {
    @Component({
      imports: [VirtualScroll, VirtualFor, SignalCell],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `
        <ff-virtual-scroll>
          <test-signal-cell *ffVirtualFor="let cell of cells; itemSize: 36; let i = index"
                            [cell]="cell" [index]="probe(i)" />
        </ff-virtual-scroll>
      `,
    })
    class Cells {
      readonly cells = Array.from({ length: 100 }, (_, i) => signal(i));
      readonly listRenders: number[] = [];
      probe(i: number) {
        this.listRenders.push(i);
        return i;
      }
    }
    stubViewportSize();
    const fixture = TestBed.createComponent(Cells);
    fixture.autoDetectChanges();
    flush();
    const host = fixture.componentInstance;
    renders.length = 0;
    host.listRenders.length = 0;
    host.cells[5].set(-5);
    flush();
    expect(renders).toEqual([5]);
    expect(host.listRenders).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('test-signal-cell')[5].textContent).toBe('-5');
  });
});

@Component({
  imports: [VirtualScroll, VirtualFor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ff-virtual-scroll>
      <div *ffVirtualFor="let row of grid; itemSize: 36; let r = index" class="flex" [attr.data-row]="r">
        <div *ffVirtualFor="let cell of row; axis: 'x'; itemSize: 100; let c = index"
             class="cell" [attr.data-col]="c">{{ cell }}</div>
      </div>
    </ff-virtual-scroll>
  `,
})
class Grid {
  readonly grid = signal(Array.from({ length: 1000 }, (_, r) => Array.from({ length: 500 }, (_, c) => `${r}:${c}`)));
}

describe('virtual scroll: two axes', () => {
  function setupGrid() {
    stubViewportSize();
    const fixture = TestBed.createComponent(Grid);
    fixture.autoDetectChanges();
    flush();
    const el = fixture.nativeElement as HTMLElement;
    const cols = (row: Element) => [...row.querySelectorAll<HTMLElement>('.cell')].map((c) => Number(c.dataset['col']));
    const rowEls = () => [...el.querySelectorAll<HTMLElement>('[data-row]')];
    return { el, cols, rowEls };
  }

  it('renders only the columns in view plus the buffer, in every rendered row', () => {
    const { el, rowEls, cols } = setupGrid();
    // 400px / 100px = 4 columns in view, plus a buffer of 4.
    expect(rowEls().length).toBe(14);
    for (const row of rowEls()) expect(cols(row)).toEqual(range(0, 8));
    expect(el.querySelectorAll('.cell').length).toBe(14 * 8);
  });

  it('pads each row with horizontal spacers', () => {
    const { rowEls } = setupGrid();
    const spacers = [...rowEls()[0].querySelectorAll<HTMLElement>(':scope > [data-slot="virtual-spacer"]')];
    expect(spacers.map((s) => s.style.width)).toEqual(['0px', `${(500 - 8) * 100}px`]);
  });

  it('moves both windows as the viewport scrolls on both axes', () => {
    const { el, rowEls, cols } = setupGrid();
    scrollViewport(el, { top: 3600, left: 10000 });
    flush();
    expect(rowEls().map((r) => Number(r.dataset['row']))).toEqual(range(96, 114));
    for (const row of rowEls()) expect(cols(row)).toEqual(range(96, 108));
    expect(rowEls()[0].querySelector('.cell')!.textContent!.trim()).toBe('96:96');
  });
});

describe('virtual scroll: tables', () => {
  @Component({
    imports: [VirtualScroll, VirtualFor, Table, TableBody, TableRow, TableCell],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <ff-virtual-scroll>
        <ff-table>
          <tbody ffTableBody>
            <tr ffTableRow *ffVirtualFor="let row of rows; let i = index" [index]="i" class="row">
              <td ffTableCell>{{ row.label }}</td>
            </tr>
          </tbody>
        </ff-table>
      </ff-virtual-scroll>
    `,
  })
  class VirtualTable {
    readonly rows = signal(makeRows(1000));
  }

  function setupTable() {
    stubViewportSize();
    const fixture = TestBed.createComponent(VirtualTable);
    fixture.autoDetectChanges();
    flush();
    return fixture.nativeElement as HTMLElement;
  }

  it('uses table rows as spacers inside a tbody', () => {
    const el = setupTable();
    const tbody = el.querySelector('tbody')!;
    const children = [...tbody.children] as HTMLElement[];
    expect(children[0].tagName).toBe('TR');
    expect(children[0].dataset['slot']).toBe('virtual-spacer');
    expect(children.at(-1)!.dataset['slot']).toBe('virtual-spacer');
  });

  it('defaults the row size to the control height of the size ladder', () => {
    const el = setupTable();
    // 360px / 36px rows = 10 in view, plus the buffer.
    expect(el.querySelectorAll('.row').length).toBe(14);
    expect(el.querySelectorAll<HTMLElement>('[data-slot="virtual-spacer"]')[1].style.height).toBe(`${(1000 - 14) * 36}px`);
  });

  it('registers rendered rows with the table hover by their data index', () => {
    const el = setupTable();
    scrollViewport(el, { top: 3600 });
    flush();
    const first = el.querySelector<HTMLElement>('.row')!;
    expect(first.getAttribute('data-fluid-hover-index')).toBe('96');
  });
});
