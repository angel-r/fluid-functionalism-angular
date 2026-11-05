import {
  DestroyRef,
  Directive,
  type EmbeddedViewRef,
  type Signal,
  TemplateRef,
  ViewContainerRef,
  type WritableSignal,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  isSignal,
  signal,
  untracked,
} from '@angular/core';
import { injectSize } from '@angel-r/fluid-functionalism-angular/core';
import { VirtualScroll } from './virtual-scroll';

/** The axis a `*ffVirtualFor` lays its items along: rows (`y`) or columns (`x`). */
export type VirtualAxis = 'x' | 'y';

/** The data a `*ffVirtualFor` takes: an array, or a signal of one. */
export type VirtualForData<T> = readonly T[] | Signal<readonly T[]> | null | undefined;

/**
 * The template context of one rendered item. Every value is read through a
 * signal, so when a view is recycled for another index, or its item is
 * replaced, only that view refreshes.
 */
export class VirtualForContext<T> {
  /** @internal */
  readonly _item: WritableSignal<T>;
  /** @internal */
  readonly _index: WritableSignal<number>;
  /** @internal */
  readonly _count: WritableSignal<number>;

  constructor(item: T, index: number, count: number) {
    this._item = signal(item);
    this._index = signal(index);
    this._count = signal(count);
  }

  /** The item (`let row`). */
  get $implicit(): T {
    return this._item();
  }
  /** The item, for `*ffVirtualFor="… as row"`. */
  get ffVirtualFor(): T {
    return this._item();
  }
  /** The item's index in the whole data, not in the rendered window. */
  get index(): number {
    return this._index();
  }
  /** The length of the whole data. */
  get count(): number {
    return this._count();
  }
}

/** The slice of the data a `*ffVirtualFor` renders: `start` inclusive, `end` exclusive. */
export interface VirtualRange {
  start: number;
  end: number;
}

const TABLE_SECTIONS = new Set(['TABLE', 'THEAD', 'TBODY', 'TFOOT']);

/**
 * Renders the items of `ffVirtualForOf` that fall inside the surrounding
 * `<ff-virtual-scroll>` viewport, plus its buffer, along one axis. Every item
 * has the same size: `itemSize` px or, when omitted, the pitch measured
 * between the first two rendered items.
 *
 * Two spacers, one before and one after the rendered items, stand in for the
 * rest, so the scroll extent is the full data's. Inside a table section they
 * are `<tr>`s, inside a row `<td>`s, elsewhere `<div>`s. A column axis
 * (`axis: 'x'`) nested inside a row axis virtualizes both at once.
 *
 * Views are recycled: a row that scrolls out is reused for the one that
 * scrolls in, so keep per-row state in the data, not in the row's DOM.
 */
@Directive({ selector: '[ffVirtualFor][ffVirtualForOf]' })
export class VirtualFor<T> {
  /** The data: an array, or a signal of one. Pass the signal itself to let a
   *  single item change refresh only its own row. */
  readonly ffVirtualForOf = input.required<VirtualForData<T>>();
  /** `y` lays items out as rows, `x` as columns. */
  readonly ffVirtualForAxis = input<VirtualAxis>('y');
  /** The size of every item along the axis, in px. Omitted, it is measured
   *  from the first two rendered items (the size ladder's control height
   *  stands in until then). */
  readonly ffVirtualForItemSize = input<number | undefined>(undefined);

  static ngTemplateContextGuard<T>(_dir: VirtualFor<T>, ctx: unknown): ctx is VirtualForContext<T> {
    return true;
  }

  private readonly viewport = inject(VirtualScroll);
  private readonly template = inject<TemplateRef<VirtualForContext<T>>>(TemplateRef);
  private readonly container = inject(ViewContainerRef);
  private readonly controlSize = injectSize();

  private readonly items = computed<readonly T[]>(() => {
    const data = this.ffVirtualForOf();
    return (isSignal(data) ? data() : data) ?? [];
  });

  /** The pitch of the rendered items, measured when `itemSize` is omitted. */
  private readonly measuredSize = signal<number | null>(null);

  private readonly itemSize = computed(() =>
    Math.max(1, this.ffVirtualForItemSize() ?? this.measuredSize() ?? this.controlSize().controlHeight),
  );

  /** Where the first item starts inside the scrolled content: a table
   *  header above the rows, or a sticky label column before the cells. */
  private readonly offset = signal(0);

  /** The rendered slice of the data, buffer included. */
  readonly renderedRange = computed<VirtualRange>(
    () => {
      const count = this.items().length;
      const size = this.itemSize();
      const y = this.ffVirtualForAxis() === 'y';
      const scroll = (y ? this.viewport.scrollTop() : this.viewport.scrollLeft()) - this.offset();
      const extent = y ? this.viewport.viewportHeight() : this.viewport.viewportWidth();
      const buffer = Math.max(0, this.viewport.buffer());
      const first = Math.floor(Math.max(0, scroll) / size);
      const last = Math.ceil(Math.max(0, scroll + extent) / size);
      const clamp = (n: number) => Math.min(count, Math.max(0, n));
      return { start: clamp(first - buffer), end: clamp(last + buffer) };
    },
    { equal: (a, b) => a.start === b.start && a.end === b.end },
  );

  private readonly views = new Map<number, EmbeddedViewRef<VirtualForContext<T>>>();
  private leading: HTMLElement | null = null;
  private trailing: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const items = this.items();
      const range = this.renderedRange();
      untracked(() => this.render(items, range));
    });

    afterRenderEffect({
      write: () => {
        const range = this.renderedRange();
        const count = this.items().length;
        const size = this.itemSize();
        const placed = this.placeSpacers(range.start * size, (count - range.end) * size);
        // 0: not in the DOM yet, then how many items there are to measure
        // (1, 2 or 3+), so the measurement reruns as the first ones arrive.
        return placed ? 1 + Math.min(3, this.container.length) : 0;
      },
      read: (state) => {
        // Re-measure when the viewport resizes: a header can wrap.
        this.viewport.viewportWidth();
        this.viewport.viewportHeight();
        if (!state()) return;
        untracked(() => {
          this.measureOffset();
          this.measureItemSize();
        });
      },
    });

    inject(DestroyRef).onDestroy(() => {
      this.leading?.remove();
      this.trailing?.remove();
    });
  }

  private render(items: readonly T[], { start, end }: VirtualRange) {
    const count = items.length;
    const free: EmbeddedViewRef<VirtualForContext<T>>[] = [];
    for (const [index, view] of this.views) {
      if (index < start || index >= end) {
        free.push(view);
        this.views.delete(index);
      }
    }

    for (let index = start, position = 0; index < end; index++, position++) {
      let view = this.views.get(index);
      if (view) {
        view.context._item.set(items[index]);
        view.context._count.set(count);
      } else {
        view = free.pop();
        if (view) {
          view.context._index.set(index);
          view.context._item.set(items[index]);
          view.context._count.set(count);
        } else {
          view = this.container.createEmbeddedView(
            this.template,
            new VirtualForContext(items[index], index, count),
            position,
          );
        }
        this.views.set(index, view);
      }
      if (this.container.get(position) !== view) this.container.move(view, position);
    }

    for (const view of free) view.destroy();
  }

  /** Puts the spacers on both sides of the rendered items and sizes them.
   *  Returns whether they are in the DOM (the anchor has a parent). */
  private placeSpacers(before: number, after: number): boolean {
    const anchor = this.container.element.nativeElement as Node;
    const parent = anchor.parentNode;
    if (!parent || !(parent instanceof Element)) return false;

    this.leading ??= this.createSpacer(parent);
    this.trailing ??= this.createSpacer(parent);

    const nodes = this.renderedNodes();
    const first = nodes.length && precedes(nodes[0], anchor) ? nodes[0] : anchor;
    const last = nodes.length && precedes(anchor, nodes[nodes.length - 1]) ? nodes[nodes.length - 1] : anchor;
    if (this.leading.nextSibling !== first) parent.insertBefore(this.leading, first);
    if (last.nextSibling !== this.trailing) parent.insertBefore(this.trailing, last.nextSibling);

    this.sizeSpacer(this.leading, before);
    this.sizeSpacer(this.trailing, after);
    return true;
  }

  private renderedNodes(): Node[] {
    const nodes: Node[] = [];
    for (let i = 0; i < this.container.length; i++) {
      const view = this.container.get(i) as EmbeddedViewRef<unknown> | null;
      if (view) nodes.push(...view.rootNodes);
    }
    return nodes;
  }

  private createSpacer(parent: Element): HTMLElement {
    const doc = parent.ownerDocument;
    let spacer: HTMLElement;
    if (TABLE_SECTIONS.has(parent.tagName)) {
      spacer = doc.createElement('tr');
      const cell = doc.createElement('td');
      cell.style.padding = '0';
      cell.style.border = '0';
      spacer.appendChild(cell);
    } else if (parent.tagName === 'TR') {
      spacer = doc.createElement('td');
      spacer.style.padding = '0';
      spacer.style.border = '0';
    } else {
      spacer = doc.createElement('div');
      spacer.style.flex = 'none';
    }
    spacer.setAttribute('data-slot', 'virtual-spacer');
    spacer.setAttribute('aria-hidden', 'true');
    return spacer;
  }

  private sizeSpacer(spacer: HTMLElement, px: number) {
    const value = `${Math.max(0, px)}px`;
    if (this.ffVirtualForAxis() === 'y') {
      spacer.style.height = value;
    } else {
      spacer.style.width = value;
      // A table cell takes its width only as a minimum unless pinned.
      if (spacer.tagName === 'TD') {
        spacer.style.minWidth = value;
        spacer.style.maxWidth = value;
      }
    }
  }

  /** Without an explicit `itemSize`, the size is the distance between two
   *  consecutive rendered items, so borders, margins and gaps count: a
   *  `tr[ffTableRow]` is its 36px ladder step plus its 1px bottom border. */
  private measureItemSize() {
    if (this.ffVirtualForItemSize() !== undefined) return;
    const viewport = this.viewport.element.getBoundingClientRect();
    if (!viewport.width && !viewport.height) return;
    // Two interior items when there are three: the first one can carry half
    // of a border it collapses with (a table header's), the rest repeat.
    const from = this.container.length > 2 ? 1 : 0;
    const [first, second] = [from, from + 1].map((i) => {
      const view = this.container.get(i) as EmbeddedViewRef<unknown> | null;
      return view?.rootNodes.find((node): node is Element => node instanceof Element);
    });
    if (!first) return;
    const y = this.ffVirtualForAxis() === 'y';
    const a = first.getBoundingClientRect();
    let size = y ? a.height : a.width;
    if (second) {
      const b = second.getBoundingClientRect();
      size = y ? b.top - a.top : b.left - a.left;
    }
    if (size > 0) this.measuredSize.set(Math.round(size * 100) / 100);
  }

  private measureOffset() {
    const spacer = this.leading;
    if (!spacer?.isConnected) return;
    const viewport = this.viewport.element;
    const outer = viewport.getBoundingClientRect();
    // No layout box (display: none): nothing to measure until it shows,
    // which resizes the viewport and runs this again.
    if (!outer.width && !outer.height) return;
    const y = this.ffVirtualForAxis() === 'y';
    // Layout offsets up the offsetParent chain (the viewport is positioned)
    // do not move with the scroll and come in whole pixels, so sub-pixel
    // layout cannot ping-pong the range.
    let offset = 0;
    let node: HTMLElement | null = spacer;
    while (node && node !== viewport) {
      offset += y ? node.offsetTop : node.offsetLeft;
      const parent = node.offsetParent as HTMLElement | null;
      if (parent && parent !== viewport) offset += y ? parent.clientTop : parent.clientLeft;
      node = parent;
    }
    if (node !== viewport) {
      // Something between them escapes the chain (fixed or no layout box).
      const inner = spacer.getBoundingClientRect();
      offset = y
        ? inner.top - outer.top - viewport.clientTop + viewport.scrollTop
        : inner.left - outer.left - viewport.clientLeft + viewport.scrollLeft;
    }
    this.offset.set(Math.max(0, Math.round(offset)));
  }
}

function precedes(a: Node, b: Node): boolean {
  return a === b || !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}
