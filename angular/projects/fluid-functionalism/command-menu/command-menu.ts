import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  InjectionToken,
  type Signal,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { animate } from 'motion';
import {
  cn,
  spring,
  enterTransition,
  ReducedMotion,
  isDisabledRow,
  type SizeVariant,
} from '../core';
import { createFluidHover } from '../fluid-hover';
import { provideSizeOverride } from '../tabs';
import {
  defaultCommandMenuFilter,
  sectionRows,
  type CommandMenuFilter,
  type CommandMenuIcon,
  type CommandMenuItemData,
} from './items';

// ---------------------------------------------------------------------------
// Command menu
//
// A search field over a list of actions: type to filter, arrows to move the
// highlight, Enter to run. The input keeps DOM focus the whole time and
// points at the highlighted row through aria-activedescendant, so the list
// needs no primitive of its own; the one thing a primitive would add, the
// modal shell, comes from the Dialog (ff-command-menu-dialog).
//
// Items are data: pass `items` to the root and the list renders a row per
// match, grouped under their `group` headings. Rows are yours to customize
// through an `<ng-template ffCommandMenuRow>`, or through the inputs on
// ff-command-menu-item. The panel is sized by its rows: give the root (or its
// dialog) a max-height and the list scrolls past it.
//
// The highlight is the fluid hover fill and nothing else: the pointer moves
// it through the fluid hover engine, the keyboard moves it through `move()`,
// and Enter runs whatever it sits on. There is no focus ring in the list,
// like the dropdown and combobox popups.
// ---------------------------------------------------------------------------

/** What an enclosing ff-command-menu-dialog gives the menu inside it. */
export interface CommandMenuDialogContext {
  readonly open: Signal<boolean>;
  close(): void;
}

/** Provided by ff-command-menu-dialog to the menu (and footer) it holds. */
export const COMMAND_MENU_DIALOG = new InjectionToken<CommandMenuDialogContext>('FF_COMMAND_MENU_DIALOG');

export interface CommandMenuTab {
  value: string;
  label: string;
  icon?: CommandMenuIcon;
}

/** The mounted ff-command-menu-tabs, so ← and → in the field switch tabs. */
export interface CommandMenuTabsHandle {
  readonly tabs: readonly CommandMenuTab[];
  readonly value: string;
  onValueChange(value: string): void;
}

let nextId = 0;

/**
 * The command menu root: owns the query, the filtered rows, and the
 * highlight, and frames its parts in a column whose height springs to its
 * content.
 *
 *   <ff-command-menu [items]="items" (itemSelect)="run($event)">
 *     <ff-command-menu-input />
 *     <ff-command-menu-list>
 *       <ff-command-menu-empty>No results.</ff-command-menu-empty>
 *     </ff-command-menu-list>
 *   </ff-command-menu>
 */
@Component({
  selector: 'ff-command-menu',
  providers: [provideSizeOverride(CommandMenu, (menu) => menu.size())],
  host: {
    'data-slot': 'command-menu',
    // A block by a host style, so the class list stays React's root div's.
    style: 'display: block',
    '[class]': 'hostClass()',
  },
  template: `
    <div #frame class="max-h-[inherit] overflow-hidden">
      <div #column class="flex max-h-[inherit] min-h-0 flex-col"><ng-content /></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandMenu {
  /** The actions. The highlight resets to the first enabled row whenever the
   *  visible rows change (by value, not by array identity). */
  readonly items = input.required<readonly CommandMenuItemData[]>();
  /** Match an item against the query. Default: every word of the query
   *  appears in the label, description, or keywords. */
  readonly filter = input<CommandMenuFilter>(defaultCommandMenuFilter);
  /** Controlled query. Left undefined, the menu keeps its own. */
  readonly query = input<string | undefined>(undefined);
  /** Initial query of an uncontrolled menu. */
  readonly defaultQuery = input('');
  /** Values listed first, under `suggestionsLabel`, while nothing is typed.
   *  A suggested row leaves its own group so it is listed once. */
  readonly suggestions = input<readonly string[] | undefined>(undefined);
  readonly suggestionsLabel = input('Suggestions');
  /** Inside ff-command-menu-dialog: picking a row closes the dialog. */
  readonly closeOnSelect = input(true, { transform: booleanAttribute });
  /** Pins field and rows to one step of the size ladder (default 36px rows,
   *  compact 28px). Omitted, both follow the surrounding size context. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  /** Every keystroke in the field. (React: `onQueryChange`.) */
  readonly queryChange = output<string>();
  /** A row was picked, after the item's own `onSelect`. (React: `onSelect`;
   *  renamed because `select` is a native event that bubbles from the field.) */
  readonly itemSelect = output<CommandMenuItemData>();

  /** Id of the listbox; rows are `${listId}-${index}`. */
  readonly listId = `ff-command-menu-${++nextId}`;
  /** The enclosing dialog, when there is one. */
  readonly dialog = inject(COMMAND_MENU_DIALOG, { optional: true });

  private readonly internalQuery = linkedSignal(() => this.defaultQuery());
  /** The effective query. */
  readonly currentQuery = computed(() => this.query() ?? this.internalQuery());

  readonly itemsByValue = computed(() => {
    const map = new Map<string, CommandMenuItemData>();
    for (const item of this.items()) map.set(item.value, item);
    return map;
  });
  readonly sections = computed(() => {
    const query = this.currentQuery();
    const items = this.items();
    const filter = this.filter();
    const visible = query === '' ? items : items.filter((item) => filter(item, query));
    return sectionRows(visible, this.suggestions(), this.suggestionsLabel(), query);
  });
  /** The visible rows, flat, in list order: the keyboard's index space. */
  readonly rows = computed(() => this.sections().flatMap((s) => s.items));
  // What the rows ARE, not the array's identity: only a real change may
  // reset the highlight. Joined on a NUL so values with spaces cannot collide.
  private readonly rowsKey = computed(() =>
    this.rows()
      .map((row) => row.value)
      .join('\u0000'),
  );

  /** The listbox element, set by ff-command-menu-list. */
  readonly listElement = signal<HTMLElement | null>(null);
  /** The highlight lives in the fluid hover engine. It is created here, at
   *  the root, so the field can drive it. */
  readonly hover = createFluidHover(() => this.listElement(), { isItemDisabled: isDisabledRow });
  /** The highlighted row's flat index. */
  readonly activeIndex = this.hover.activeIndex;
  /** The highlighted row, if any. */
  readonly activeRow = computed(() => {
    const index = this.activeIndex();
    return index === null ? undefined : this.rows()[index];
  });

  private readonly tabsHandle = signal<CommandMenuTabsHandle | null>(null);
  /** The mounted tabs, read by the field on ← / →. */
  readonly tabs = this.tabsHandle.asReadonly();
  /** Whether ff-command-menu-tabs is mounted: the footer adds a ← → hint. */
  readonly tabsMounted = computed(() => this.tabsHandle() !== null);

  private readonly reduced = inject(ReducedMotion).value;
  private readonly destroyRef = inject(DestroyRef);
  protected readonly hostClass = computed(() =>
    cn('relative w-full max-h-[inherit] overflow-hidden', this.userClass()),
  );

  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  private readonly column = viewChild.required<ElementRef<HTMLElement>>('column');
  private scrollAnimation: { stop(): void } | null = null;
  private heightAnimation: { stop(): void } | null = null;
  /** The next measurement snaps instead of springing: the first one, and the
   *  first after the menu comes back into the document (a dialog reopening). */
  private snapNextHeight = true;

  constructor() {
    // The first enabled row is highlighted whenever the row set changes, so
    // Enter always has a target and it follows the query as it filters.
    effect(() => {
      this.rowsKey();
      untracked(() => this.highlightFirst());
    });

    // React remounts the dialog's content on every open, so the palette
    // opens fresh. Projected content outlives the dialog's panel here, so the
    // reset is explicit: the typed query goes and the first row lights.
    const dialog = this.dialog;
    if (dialog) {
      let wasOpen = untracked(dialog.open);
      effect(() => {
        const open = dialog.open();
        untracked(() => {
          if (open && !wasOpen) {
            if (this.query() === undefined) this.internalQuery.set(this.defaultQuery());
            this.snapNextHeight = true;
            this.highlightFirst();
          }
          wasOpen = open;
        });
      });
    }

    // The panel follows its rows: the column inside is measured (offsetHeight,
    // transform-immune) and the frame springs to that number on the moderate
    // tier. Never "auto": an animation would read the visual size under a
    // scaled ancestor. Reduced motion snaps. max-h inherits down the chain,
    // so a cap on the wrapper (or on this root's class) bounds the column
    // and the list scrolls past it.
    afterNextRender(() => {
      const column = this.column().nativeElement;
      if (typeof ResizeObserver === 'undefined') return;
      const update = () => this.applyHeight(column);
      update();
      const ro = new ResizeObserver(update);
      ro.observe(column);
      this.destroyRef.onDestroy(() => ro.disconnect());
    });

    this.destroyRef.onDestroy(() => {
      this.scrollAnimation?.stop();
      this.heightAnimation?.stop();
    });
  }

  /** Sets the query: uncontrolled menus keep it, `queryChange` reports it. */
  setQuery(next: string) {
    if (this.query() === undefined) this.internalQuery.set(next);
    this.queryChange.emit(next);
  }

  /** Moves the highlight from the keyboard: a step (wrapping), or an end. */
  move(to: 1 | -1 | 'first' | 'last') {
    const enabled: number[] = [];
    this.rows().forEach((row, i) => {
      if (!row.disabled) enabled.push(i);
    });
    if (enabled.length === 0) return;
    let next: number;
    if (to === 'first') next = enabled[0];
    else if (to === 'last') next = enabled[enabled.length - 1];
    else {
      const current = untracked(this.activeIndex);
      const pos = current === null ? -1 : enabled.indexOf(current);
      // Wraps at both ends: the list is the whole keyboard space, there is
      // no field to stop at.
      if (pos === -1) next = to === 1 ? enabled[0] : enabled[enabled.length - 1];
      else next = enabled[(pos + to + enabled.length) % enabled.length];
    }
    this.hover.setActiveIndex(next);
    this.scrollToRow(next, 'center');
  }

  /** Runs a row: its own `onSelect`, then `itemSelect`, then closes the
   *  dialog when `closeOnSelect`. Disabled rows do nothing. */
  select(item: CommandMenuItemData) {
    if (item.disabled) return;
    item.onSelect?.();
    this.itemSelect.emit(item);
    if (this.closeOnSelect()) this.dialog?.close();
  }

  /** @internal ff-command-menu-tabs registers itself while mounted. */
  registerTabs(handle: CommandMenuTabsHandle) {
    this.tabsHandle.set(handle);
  }

  /** @internal Clears the handle only if it is still the one registered. */
  unregisterTabs(handle: CommandMenuTabsHandle) {
    if (this.tabsHandle() === handle) this.tabsHandle.set(null);
  }

  private highlightFirst() {
    const first = this.rows().findIndex((row) => !row.disabled);
    this.hover.setActiveIndex(first === -1 ? null : first);
    this.scrollToRow(0, 'top');
  }

  // Scrolling is decided the moment a move is, rather than in an effect on
  // the index: a move to the row already highlighted (Home at the top, ↓ in
  // a one-row list, a query that keeps row 0) must still scroll. A keyboard
  // move keeps its row at the CENTER of the viewport (as far as the ends
  // allow) and the viewport travels there on the same fast spring as the
  // highlight, so row and fill move together; a query reset snaps to the
  // top, heading included. Offsets, not rects: the row's offsetParent is the
  // list, so their sum is the row's place in the scroll content whatever
  // transform an ancestor carries. Never scrollIntoView, which also scrolls
  // the page.
  private scrollToRow(index: number, mode: 'center' | 'top') {
    const list = this.listElement();
    const viewport = list?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!list || !viewport) return;
    this.scrollAnimation?.stop();
    this.scrollAnimation = null;
    if (mode === 'top' || index === 0) {
      viewport.scrollTop = 0;
      return;
    }
    const row = list.querySelector<HTMLElement>(`[data-fluid-hover-index="${index}"]`);
    if (!row) return;
    const rowTop = row.offsetTop + list.offsetTop;
    const target = Math.max(
      0,
      Math.min(
        rowTop + row.offsetHeight / 2 - viewport.clientHeight / 2,
        viewport.scrollHeight - viewport.clientHeight,
      ),
    );
    if (untracked(this.reduced)) {
      viewport.scrollTop = target;
      return;
    }
    this.scrollAnimation = animate(viewport.scrollTop, target, {
      type: spring.fast.type,
      duration: spring.fast.duration,
      bounce: spring.fast.bounce,
      onUpdate: (value: number) => {
        viewport.scrollTop = value;
      },
    });
  }

  private applyHeight(column: HTMLElement) {
    const frame = this.frame().nativeElement;
    if (!column.isConnected) {
      this.snapNextHeight = true;
      return;
    }
    const height = column.offsetHeight;
    this.heightAnimation?.stop();
    this.heightAnimation = null;
    if (this.snapNextHeight || untracked(this.reduced)) {
      this.snapNextHeight = false;
      frame.style.height = `${height}px`;
      return;
    }
    this.heightAnimation = animate(frame, { height }, enterTransition(spring.moderate));
  }
}
