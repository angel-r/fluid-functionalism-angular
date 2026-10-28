import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  InjectionToken,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { cn, fontWeights, SizeContext, injectSize, sizeMap, type SizeVariant } from '@angel-r/fluid-functionalism-angular/core';
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
// ---------------------------------------------------------------------------

/** The hover state rows read: the table's fluid hover controller. */
export const TABLE_CONTEXT = new InjectionToken<FluidHoverController>('FF_TABLE_CONTEXT');

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
    <table [class]="tableClass()"><ng-content /></table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Table {
  /** Pins the table's rows to one step of the size ladder (default 36px,
   *  compact 28px). Omitted, it follows the surrounding size provider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

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
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() => cn('', this.userClass()));
}

@Directive({ selector: 'tbody[ffTableBody]', host: { '[class]': 'hostClass()' } })
export class TableBody {
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() => cn('', this.userClass()));
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

  protected readonly hostClass = computed(() =>
    cn(
      // Borders fade over 80ms instead of popping as the highlight moves.
      // `is-active` lets every cell read the lit state through the row.
      'group/row relative z-10 border-b transition-[border-color] duration-80',
      this.hideBorder() ? 'border-transparent' : 'border-accent/40',
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

/** A header cell. */
@Directive({ selector: 'th[ffTableHead]', host: { '[class]': 'hostClass()' } })
export class TableHead {
  readonly userClass = input('', { alias: 'class' });
  private readonly size = injectSize();
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
