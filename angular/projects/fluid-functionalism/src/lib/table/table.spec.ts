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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

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
