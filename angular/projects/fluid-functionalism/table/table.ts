import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  type EmbeddedViewRef,
  InjectionToken,
  TemplateRef,
  ViewContainerRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  output,
  untracked,
} from '@angular/core';
import { Button } from '@angel-r/fluid-functionalism-angular/button';
import {
  cn,
  fontWeights,
  Icon,
  injectSize,
  injectSurface,
  SizeContext,
  sizeMap,
  SURFACE_BG,
  type SizeVariant,
} from '@angel-r/fluid-functionalism-angular/core';
import { createFluidHover, type FluidHoverController, FluidHoverHighlight } from '@angel-r/fluid-functionalism-angular/fluid-hover';

// ---------------------------------------------------------------------------
// Table is a plain HTML table with one fluid hover highlight drawn behind all
// of it. Body rows opt in by passing `index`; header rows leave it out, so
// they never light up. On the lit row the borders around it fade out and its
// text lifts from muted to foreground, so the highlight reads as one clean
// pill instead of a band crossed by rules.
//
//   <ff-table>
//     <thead ffTableHeader><tr ffTableRow><th ffTableHead>Name</th></tr></thead>
//     <tbody ffTableBody><tr ffTableRow [index]="0"><td ffTableCell>Alice</td></tr></tbody>
//   </ff-table>
//
// For server-driven listings the table is presentational: rows come in through
// `data` and render with `*ffTableRows`, a sortable header (`sortKey`) emits
// `sortChange`, and `<ff-table-pagination>` emits `pageChange`. Each event is
// the whole query (column, direction, offset, limit); the table never sorts or
// slices rows itself, so what it shows changes only when `data` does.
//
//   <ff-table #table [data]="rows()" [pageSize]="25" [total]="total()"
//             (sortChange)="load($event)" (pageChange)="load($event)">
//     <thead ffTableHeader sticky><tr ffTableRow><th ffTableHead sortKey="name">Name</th></tr></thead>
//     <tbody ffTableBody>
//       <tr ffTableRow *ffTableRows="let row of table; let i = index" [index]="i"><td ffTableCell>{{ row.name }}</td></tr>
//     </tbody>
//     <ff-table-pagination />
//   </ff-table>
// ---------------------------------------------------------------------------

/** The hover state rows read: the table's fluid hover controller. */
export const TABLE_CONTEXT = new InjectionToken<FluidHoverController>('FF_TABLE_CONTEXT');

/** Sort direction, in the words most query APIs use. */
export type TableSortDirection = 'ASC' | 'DESC';

/** The column the rows are sorted by. */
export interface TableSort {
  readonly column: string;
  readonly direction: TableSortDirection;
}

/**
 * What `sortChange` and `pageChange` emit: everything a server needs to fetch
 * the next rows. `column` and `direction` are null while nothing is sorted;
 * `limit` is the page size, null when the table has none.
 */
export interface TableQuery {
  readonly column: string | null;
  readonly direction: TableSortDirection | null;
  readonly offset: number;
  readonly limit: number | null;
}

/**
 * The table. The host is the positioned wrapper the highlight sits in (a div
 * can't live inside <table>); rows ride above it (z-10). `class` lands on
 * the <table>, as `className` does in React.
 */
@Component({
  selector: 'ff-table',
  imports: [FluidHoverHighlight],
  providers: [
    { provide: TABLE_CONTEXT, useFactory: () => inject(Table).hover },
    // A size input pins every cell to one ladder step (cells read the context).
    { provide: SizeContext, useFactory: () => inject(Table).sizeContext },
  ],
  host: {
    class: 'relative',
    style: 'display: block',
    '(mouseenter)': 'hover.onMouseEnter()',
    '(mousemove)': 'hover.onMouseMove($event)',
    '(mouseleave)': 'hover.onMouseLeave()',
    '(click)': 'hover.onClick($event)',
  },
  template: `
    <ff-fluid-hover-highlight [hover]="hover" />
    <table [class]="tableClass()" [attr.aria-busy]="pending() || null"><ng-content /></table>
    <ng-content select="ff-table-pagination" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Table<T = unknown> {
  /** Pins the table's rows to one step of the size ladder (default 36px,
   *  compact 28px). Omitted, it follows the surrounding size provider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  /** The rows `*ffTableRows` renders, in the order given. */
  readonly data = input<readonly T[] | undefined>(undefined);
  /** The starting sort. Header clicks move it on without waiting for the
   *  parent; binding a new value resets it. */
  readonly sort = input<TableSort | null>(null);
  /** The starting offset of the page shown. Same contract as `sort`. */
  readonly offset = input(0, { transform: numberAttribute });
  /** Rows per page. Set it to show `<ff-table-pagination>`. */
  readonly pageSize = input<number | undefined>(undefined);
  /** Total rows on the server. Without it, a short page marks the last one. */
  readonly total = input<number | undefined>(undefined);

  /** A sortable header was clicked. The offset goes back to 0. */
  readonly sortChange = output<TableQuery>();
  /** The pagination moved to another page. */
  readonly pageChange = output<TableQuery>();

  /** The sort the headers show. */
  readonly activeSort = linkedSignal(() => this.sort());
  /** The offset the pagination shows. */
  readonly activeOffset = linkedSignal(() => this.offset());
  /** True from an emitted query until new `data` arrives (`aria-busy`). */
  readonly pending = linkedSignal({ source: this.data, computation: () => false });

  /** The query the table is showing or waiting for. */
  readonly query = computed<TableQuery>(() => {
    const sort = this.activeSort();
    return {
      column: sort?.column ?? null,
      direction: sort?.direction ?? null,
      offset: this.activeOffset(),
      limit: this.pageSize() ?? null,
    };
  });

  /** Sorts by `column`: ascending first, then flips on each click. */
  toggleSort(column: string): void {
    const current = this.activeSort();
    const direction: TableSortDirection =
      current?.column === column && current.direction === 'ASC' ? 'DESC' : 'ASC';
    this.activeSort.set({ column, direction });
    this.activeOffset.set(0);
    this.pending.set(true);
    this.sortChange.emit(this.query());
  }

  /** Moves to the page starting at `offset`. */
  goToOffset(offset: number): void {
    this.activeOffset.set(Math.max(0, offset));
    this.pending.set(true);
    this.pageChange.emit(this.query());
  }

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly hover = createFluidHover(() => this.host);

  private readonly parentSize = inject(SizeContext, { optional: true, skipSelf: true });
  readonly sizeContext: SizeContext = {
    size: computed(() => this.size() ?? this.parentSize?.size() ?? 'default'),
    // A pinned table ignores writes, like a controlled size provider.
    setSize: (next) => {
      if (this.size() === undefined) this.parentSize?.setSize(next);
    },
  };

  protected readonly tableClass = computed(() =>
    cn('w-full border-collapse', sizeMap[this.sizeContext.size()].text, this.userClass()),
  );
}

@Directive({ selector: 'thead[ffTableHeader]', host: { '[class]': 'hostClass()' } })
export class TableHeader {
  /** Pins the header to the top of the nearest scroll container (CSS
   *  `position: sticky`), on the surface it sits on so rows pass under it. */
  readonly sticky = input(false, { transform: booleanAttribute });
  readonly userClass = input('', { alias: 'class' });
  private readonly surface = injectSurface();
  // z-20 lifts it over the rows (z-10) and the highlight scrolling beneath.
  protected readonly hostClass = computed(() =>
    cn(this.sticky() && ['sticky top-0 z-20', SURFACE_BG[this.surface()]], this.userClass()),
  );
}

@Directive({ selector: 'tbody[ffTableBody]', host: { '[class]': 'hostClass()' } })
export class TableBody {
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() => cn('', this.userClass()));
}

/** What a `*ffTableRows` template sees: the row, its index, the row count. */
export interface TableRowsContext<T> {
  $implicit: T;
  index: number;
  count: number;
}

/**
 * Stamps its template once per item of the table's `data`:
 * `<tr ffTableRow *ffTableRows="let row of table; let i = index" [index]="i">`.
 * `of` takes the table's template reference and types `row`; omitted, the
 * directive reads the table it sits in. Views are reused by position, so a
 * new page updates the rows in place instead of rebuilding them.
 */
@Directive({ selector: '[ffTableRows]' })
export class TableRows<T> {
  readonly of = input<Table<T> | undefined>(undefined, { alias: 'ffTableRowsOf' });

  private readonly parent = inject<Table<T>>(Table, { optional: true });
  private readonly template = inject<TemplateRef<TableRowsContext<T>>>(TemplateRef);
  private readonly container = inject(ViewContainerRef);
  private readonly views: EmbeddedViewRef<TableRowsContext<T>>[] = [];

  constructor() {
    effect(() => {
      const rows = (this.of() ?? this.parent)?.data() ?? [];
      untracked(() => this.render(rows));
    });
  }

  private render(rows: readonly T[]): void {
    rows.forEach((row, index) => {
      const context: TableRowsContext<T> = { $implicit: row, index, count: rows.length };
      const view = this.views[index];
      if (view) {
        view.context = context;
        view.markForCheck();
      } else {
        this.views.push(this.container.createEmbeddedView(this.template, context));
      }
    });
    while (this.views.length > rows.length) this.views.pop()!.destroy();
  }

  static ngTemplateContextGuard<T>(_dir: TableRows<T>, _ctx: unknown): _ctx is TableRowsContext<T> {
    return true;
  }
}

/** A row. Body rows pass `index` and join the fluid hover; header rows don't. */
@Directive({
  selector: 'tr[ffTableRow]',
  host: {
    '[attr.data-fluid-hover-index]': 'index() ?? null',
    '[class]': 'hostClass()',
    // Weight goes through the variable font's axis with the same values
    // every component uses: semibold header, normal body.
    '[style.font-variation-settings]': 'weight()',
  },
})
export class TableRow {
  readonly index = input<number | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });
  private readonly ctx = inject(TABLE_CONTEXT, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private readonly isBodyRow = computed(() => this.index() !== undefined);
  private readonly activeIndex = computed(() => this.ctx?.activeIndex() ?? null);

  // Each row draws only its bottom border, so the lit row's top edge is the
  // border of the row above it. Hiding both leaves the highlight with no
  // rule along or through it. Row 0's top edge is the header's border.
  private readonly hideBorder = computed(() => {
    const active = this.activeIndex();
    const index = this.index();
    if (active === null) return false;
    return this.isBodyRow() ? index === active || index === active - 1 : active === 0;
  });

  // A collapsed border belongs to the table, not the row, so it stays behind
  // when a sticky header scrolls. The stuck header's rule is drawn inside its
  // row instead, over the (transparent) border's spot, with the same fade.
  private readonly header = inject(TableHeader, { optional: true });
  private readonly ruleInside = computed(() => !this.isBodyRow() && !!this.header?.sticky());

  protected readonly hostClass = computed(() =>
    cn(
      // Borders fade over 80ms instead of popping as the highlight moves.
      // `is-active` lets every cell read the lit state through the row.
      'group/row relative z-10 border-b transition-[border-color] duration-80',
      this.ruleInside()
        ? [
            'border-transparent after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-px',
            'after:transition-[background-color] after:duration-80',
            this.hideBorder() ? 'after:bg-transparent' : 'after:bg-accent/40',
          ]
        : this.hideBorder()
          ? 'border-transparent'
          : 'border-accent/40',
      this.isBodyRow() && this.activeIndex() === this.index() && 'is-active',
      this.userClass(),
    ),
  );

  protected readonly weight = computed(() =>
    this.isBodyRow() ? fontWeights.normal : fontWeights.semibold,
  );

  constructor() {
    effect((onCleanup) => {
      const index = this.index();
      const ctx = this.ctx;
      if (!ctx || index === undefined) return;
      untracked(() => ctx.registerItem(index, this.host));
      onCleanup(() => ctx.unregisterItem(index, this.host));
    });
  }
}

/**
 * A header cell. With `sortKey` its label becomes a button that sorts the
 * table by that column; the arrow shows the direction, and `aria-sort` says it.
 */
@Component({
  selector: 'th[ffTableHead]',
  imports: [NgTemplateOutlet, Icon],
  host: { '[class]': 'hostClass()', '[attr.aria-sort]': 'ariaSort()' },
  template: `
    <ng-template #label><ng-content /></ng-template>
    @if (sortKey(); as key) {
      <button type="button" [class]="sortButtonClass" (click)="table?.toggleSort(key)">
        <ng-container [ngTemplateOutlet]="label" />
        <ff-icon name="arrow-up" [size]="14" aria-hidden="true" [class]="arrowClass()" />
      </button>
    } @else {
      <ng-container [ngTemplateOutlet]="label" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableHead {
  /** The column name `sortChange` reports. Set it to make the column sortable. */
  readonly sortKey = input<string | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });
  protected readonly table = inject(Table, { optional: true });
  private readonly size = injectSize();

  /** This column's direction, null while another column (or none) sorts. */
  private readonly direction = computed(() => {
    const sort = this.table?.activeSort();
    return sort && sort.column === this.sortKey() ? sort.direction : null;
  });

  protected readonly ariaSort = computed(() => {
    if (!this.sortKey()) return null;
    const direction = this.direction();
    return direction === 'ASC' ? 'ascending' : direction === 'DESC' ? 'descending' : 'none';
  });

  // The button keeps the header's text; -mx-1/px-1 give the focus ring room
  // without moving the label off the column's edge.
  protected readonly sortButtonClass =
    'group/sort -mx-1 inline-flex cursor-pointer items-center gap-1 rounded-[4px] px-1 text-left outline-none ' +
    'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]';

  // One arrow that turns for DESC, on the same 80ms as the row borders. An
  // unsorted column shows it faintly on hover or focus, as the affordance.
  protected readonly arrowClass = computed(() =>
    cn(
      'shrink-0 text-muted-foreground transition-[opacity,rotate] duration-80',
      this.direction() === null
        ? 'opacity-0 group-hover/sort:opacity-50 group-focus-visible/sort:opacity-50'
        : 'opacity-100',
      this.direction() === 'DESC' && 'rotate-180',
    ),
  );
  protected readonly hostClass = computed(() =>
    cn(
      'text-left text-foreground',
      // py + line box lands the row on the ladder (36px / 28px).
      this.size().variant === 'compact' ? 'px-2.5 py-[5px]' : 'px-3 py-2',
      this.userClass(),
    ),
  );
}

/** A body cell: muted at rest, foreground on the lit row. */
@Directive({ selector: 'td[ffTableCell]', host: { '[class]': 'hostClass()' } })
export class TableCell {
  readonly userClass = input('', { alias: 'class' });
  private readonly size = injectSize();
  // Muted at rest, foreground on the lit row, on the same 80ms as the border
  // fade. Same padding as TableHead so every row shares a height.
  protected readonly hostClass = computed(() =>
    cn(
      'text-muted-foreground transition-colors duration-80 group-[.is-active]/row:text-foreground',
      this.size().variant === 'compact' ? 'px-2.5 py-[5px]' : 'px-3 py-2',
      this.userClass(),
    ),
  );
}

/**
 * Previous / next controls for a paged table, with the range shown
 * ("26–50 of 340"). Place it inside `<ff-table>` to render under the rows, or
 * anywhere else with `[for]="table"`. It renders nothing until the table has
 * a `pageSize`. Moving emits the table's `pageChange`; the range moves at
 * once, the rows when the next `data` arrives.
 */
@Component({
  selector: 'ff-table-pagination',
  imports: [Button, Icon],
  host: { '[class]': 'hostClass()' },
  template: `
    @if (limit()) {
      <span aria-live="polite" [class]="labelClass()">{{ label() }}</span>
      <button
        ffButton
        variant="tertiary"
        size="icon-compact"
        aria-label="Previous page"
        [disabled]="!hasPrevious()"
        (click)="move(-1)"
      >
        <ff-icon name="chevron-right" [size]="14" class="rotate-180" />
      </button>
      <button
        ffButton
        variant="tertiary"
        size="icon-compact"
        aria-label="Next page"
        [disabled]="!hasNext()"
        (click)="move(1)"
      >
        <ff-icon name="chevron-right" [size]="14" />
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TablePagination<T = unknown> {
  /** The table to page. Omitted, the table it sits in. */
  readonly for = input<Table<T> | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  private readonly parent = inject(Table, { optional: true });
  private readonly size = injectSize();
  private readonly table = computed(() => this.for() ?? this.parent);

  protected readonly limit = computed(() => this.table()?.pageSize() ?? 0);
  private readonly offset = computed(() => this.table()?.activeOffset() ?? 0);
  private readonly total = computed(() => this.table()?.total());
  private readonly rowCount = computed(() => this.table()?.data()?.length ?? 0);

  protected readonly hasPrevious = computed(() => this.offset() > 0);
  // Without a total, a full page is the only hint that another one follows.
  protected readonly hasNext = computed(() => {
    const total = this.total();
    return total !== undefined ? this.offset() + this.limit() < total : this.rowCount() >= this.limit();
  });

  protected readonly label = computed(() => {
    const offset = this.offset();
    const total = this.total();
    const end = total !== undefined ? Math.min(offset + this.limit(), total) : offset + this.rowCount();
    if (end <= offset) return 'No results';
    const range = `${offset + 1}–${end}`;
    return total !== undefined ? `${range} of ${total}` : range;
  });

  protected readonly labelClass = computed(() =>
    cn('mr-1 tabular-nums text-muted-foreground', this.size().type.caption),
  );

  protected readonly hostClass = computed(() =>
    cn(this.limit() ? 'flex items-center justify-end gap-1 pt-2' : 'hidden', this.userClass()),
  );

  protected move(step: -1 | 1): void {
    this.table()?.goToOffset(this.offset() + step * this.limit());
  }
}
