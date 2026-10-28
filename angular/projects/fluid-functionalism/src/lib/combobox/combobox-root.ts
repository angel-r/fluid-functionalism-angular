import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  signal,
  untracked,
} from '@angular/core';
import { SizeContext, type SizeVariant } from '../core';

// ---------------------------------------------------------------------------
// Combobox
//
// A text field that filters a list as you type. The input keeps DOM focus
// while ArrowUp/ArrowDown move an aria-activedescendant highlight through
// the rows, Enter picks the highlighted row, Escape closes. This root owns
// that state machine (filtering, the always-on highlight, the create row,
// single and multiple selection) and hands it to its parts by DI:
//
//   <ff-combobox [items]="frameworks" [(value)]="framework">
//     <ff-combobox-input placeholder="Select a framework…" />
//     <ff-combobox-content>
//       <ff-combobox-empty>No framework found.</ff-combobox-empty>
//       <ff-combobox-list>
//         <ng-template ffComboboxRow let-value="value" let-label="label">
//           <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
//         </ng-template>
//       </ff-combobox-list>
//     </ff-combobox-content>
//   </ff-combobox>
//
// Items are data: string items are their own value and label; object items
// carry `{ value, label }` plus anything else the rows need.
// ---------------------------------------------------------------------------

export type ComboboxItemData = string | { value: string; label: string };

/** A string ("" = none), or an array when `multiple`. */
export type ComboboxValue = string | string[];

export interface ComboboxHighlight {
  /** Index into the rendered rows. */
  index: number;
  /** A keyboard or automatic highlight (drives the hover background); a
   *  pointer highlight is left to fluid hover. */
  keyboard: boolean;
}

export function comboboxItemValue(item: ComboboxItemData): string {
  return typeof item === 'string' ? item : item.value;
}

export function comboboxItemLabel(item: ComboboxItemData): string {
  return typeof item === 'string' ? item : item.label;
}

/**
 * The create row is one more item in the filtered list, so Enter and the
 * arrows reach it like any row. Its value can't collide with a consumer's;
 * its label is the query it would create.
 */
export const COMBOBOX_CREATE_VALUE = '\u0000create';

export function isComboboxCreateItem(item: ComboboxItemData): boolean {
  return comboboxItemValue(item) === COMBOBOX_CREATE_VALUE;
}

function defaultCreateLabel(query: string): string {
  return `Create “${query}”`;
}

// Case- and accent-insensitive, like the collator match (sensitivity
// "base") Base UI's Combobox filters with: "sao" finds "São Paulo".
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
}

/** The default filter: the label contains the query. */
export function comboboxContains(item: ComboboxItemData, query: string): boolean {
  return fold(comboboxItemLabel(item)).includes(fold(query));
}

function toValues(v: ComboboxValue | null | undefined): string[] {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) return v;
  return v === '' ? [] : [v];
}

/** The chips field registers itself so ArrowLeft can walk into it. */
export interface ComboboxChipsHandle {
  focusLast(): boolean;
}

let nextId = 0;

/** Size pinned by the root's `size`; otherwise the surrounding provider's. */
function createPinnedSize(pinned: () => SizeVariant | undefined, parent: SizeContext | null): SizeContext {
  return {
    size: computed(() => pinned() ?? parent?.size() ?? 'default'),
    setSize(next: SizeVariant) {
      if (pinned() !== undefined) return;
      parent?.setSize(next);
    },
  } as SizeContext;
}

@Component({
  selector: 'ff-combobox',
  // A size pins the whole compound (field + overlay popup): overlay content
  // resolves DI from this host, the way React context crosses portals.
  providers: [{ provide: SizeContext, useFactory: () => inject(Combobox).sizeContext }],
  host: { style: 'display: contents' },
  // Base UI's clipped 1px input sits after the parts whether or not the
  // combobox is named; the named hidden inputs carry the form value.
  template: `<ng-content /><input aria-hidden="true" tabindex="-1" style="clip-path: inset(50%); overflow: hidden; white-space: nowrap; border: 0; padding: 0; width: 1px; height: 1px; margin: 0; position: fixed; top: 0; left: 0" [value]="multiple() ? '' : (values()[0] ?? '')" />@if (name(); as formName) {@if (multiple()) {@for (v of values(); track v) {<input type="hidden" [name]="formName" [value]="v" />}} @else {<input type="hidden" [name]="formName" [value]="values()[0] ?? ''" [required]="required()" />}}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Combobox<T extends ComboboxItemData = ComboboxItemData, V extends ComboboxValue = ComboboxValue> {
  /** The options. Strings, or `{ value, label, … }` objects. */
  readonly items = input.required<readonly T[]>();
  /** Select any number of items; pair with `<ff-combobox-chips>`. Values become `string[]`. */
  readonly multiple = input(false, { transform: booleanAttribute });
  /** Selected value(s), two-way: a string ("" = none), or an array when `multiple`. */
  readonly value = model<V>('' as V);
  /** Match an item against the typed query. Defaults to a case-insensitive "contains" on the label. */
  readonly filter = input<((item: T, query: string) => boolean) | undefined>(undefined);
  /**
   * Offer a last row that creates what was typed, whenever the query matches
   * no item's label exactly. Called with the trimmed query. Add the new item
   * to `items` and return it to select it.
   */
  readonly onCreate = input<((query: string) => T | void | null | undefined) | undefined>(undefined);
  /** The create row's label. */
  readonly createLabel = input<(query: string) => string, ((query: string) => string) | undefined>(defaultCreateLabel, {
    transform: (v) => v ?? defaultCreateLabel,
  });
  /** Multiple only: selected items leave the list; the chips are then the only way to deselect. */
  readonly hideSelected = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Form field name: hidden inputs carry the value. */
  readonly name = input<string | undefined>(undefined);
  readonly required = input(false, { transform: booleanAttribute });
  /** Pins field and popup to one step of the size ladder. Omitted, both follow the surrounding provider. */
  readonly size = input<SizeVariant | undefined>(undefined);

  readonly sizeContext = createPinnedSize(this.size, inject(SizeContext, { optional: true, skipSelf: true }));
  private readonly document = inject(DOCUMENT);

  readonly listId = `ff-combobox-list-${nextId++}`;

  /** Selected values: one entry in single mode, any number in multiple. */
  readonly values = computed(() => toValues(this.value()));

  private readonly baseItemsByValue = computed(() => {
    const map = new Map<string, ComboboxItemData>();
    for (const item of this.items()) map.set(comboboxItemValue(item), item);
    return map;
  });

  /** Single mode shows the selection's label in the field; multiple keeps the field for typing. */
  readonly selectedLabel = computed(() => {
    if (this.multiple()) return '';
    const first = this.values()[0];
    const item = first !== undefined ? this.baseItemsByValue().get(first) : undefined;
    return item ? comboboxItemLabel(item) : '';
  });

  /** What the field shows. An external value change re-syncs it to the selection's label. */
  readonly inputValue = linkedSignal(() => this.selectedLabel());
  /** What filters the list: only typing sets it, so opening with a selection lists everything. */
  readonly query = signal('');
  readonly open = signal(false);
  readonly highlight = signal<ComboboxHighlight | null>(null);

  readonly trimmedQuery = computed(() => this.query().trim());

  /** The create row for the current query; null while none is offered. */
  readonly createItem = computed<ComboboxItemData | null>(() => {
    const query = this.trimmedQuery();
    if (!this.onCreate() || query === '') return null;
    const lower = query.toLocaleLowerCase();
    const exists = this.items().some((item) => comboboxItemLabel(item).toLocaleLowerCase() === lower);
    return exists ? null : { value: COMBOBOX_CREATE_VALUE, label: query };
  });

  /** Every item by value, the create row included (it carries the query it stands for). */
  readonly itemsByValue = computed(() => {
    const create = this.createItem();
    if (!create) return this.baseItemsByValue();
    const map = new Map(this.baseItemsByValue());
    map.set(COMBOBOX_CREATE_VALUE, create);
    return map;
  });

  /**
   * The rendered rows: the matches less the chips when `hideSelected`, plus
   * the create row last, so Enter picks a real match while one exists and
   * only creates once nothing matches.
   */
  readonly listItems = computed<readonly ComboboxItemData[]>(() => {
    const query = this.query();
    const filter = this.filter() as ((item: ComboboxItemData, query: string) => boolean) | undefined;
    const match = filter ?? comboboxContains;
    let visible: readonly ComboboxItemData[] = query === '' ? this.items() : this.items().filter((item) => match(item, query));
    if (this.hideSelected() && this.multiple()) {
      const values = this.values();
      visible = visible.filter((item) => !values.includes(comboboxItemValue(item)));
    }
    const create = this.createItem();
    return create ? [...visible, create] : visible;
  });

  /** `hideSelected` has emptied the list with nothing typed: every item is a chip already. */
  readonly allSelected = computed(
    () =>
      this.hideSelected() &&
      this.multiple() &&
      this.trimmedQuery() === '' &&
      this.items().length > 0 &&
      this.listItems().length === 0,
  );

  /** A highlight past the rendered rows would point aria-activedescendant at no element. */
  readonly safeHighlight = computed(() => {
    const h = this.highlight();
    return h && h.index < this.listItems().length ? h : null;
  });

  /** The create row's label; null while no row is offered. */
  readonly createRow = computed(() => (this.createItem() ? this.createLabel()(this.trimmedQuery()) : null));

  /** True from the open until the popup's exit has played (set by the content). */
  readonly mounted = signal(false);
  /** The field (input group or chips container) the popup anchors to. */
  readonly anchor = signal<HTMLElement | null>(null);
  /** The popup surface, while mounted. */
  readonly popup = signal<HTMLElement | null>(null);

  private inputElement: HTMLInputElement | null = null;
  private chips: ComboboxChipsHandle | null = null;

  constructor() {
    // Dismiss on a press outside the field and the popup. The field itself
    // is not "outside": focus stays in the input, and the chevron toggles.
    effect((onCleanup) => {
      if (!this.open()) return;
      const handler = (e: Event) => {
        const target = e.target as Node | null;
        if (!target) return;
        if (untracked(this.anchor)?.contains(target) || untracked(this.popup)?.contains(target)) return;
        this.setOpen(false);
      };
      this.document.addEventListener('pointerdown', handler, true);
      onCleanup(() => this.document.removeEventListener('pointerdown', handler, true));
    });
  }

  // ── Registration (the fields) ───────────────────────────────────────

  registerInput(element: HTMLInputElement) {
    this.inputElement = element;
    return () => {
      if (this.inputElement === element) this.inputElement = null;
    };
  }

  registerChips(handle: ComboboxChipsHandle) {
    this.chips = handle;
    return () => {
      if (this.chips === handle) this.chips = null;
    };
  }

  focusInput() {
    this.inputElement?.focus();
  }

  // ── Actions ─────────────────────────────────────────────────────────

  setOpen(next: boolean) {
    if (next) {
      if (this.disabled()) return;
      this.open.set(true);
      // The first row is highlighted the moment the list opens, whatever
      // opened it, so Enter always has a target. An opener that already
      // chose a row keeps it.
      if (!untracked(this.highlight)) this.highlight.set({ index: 0, keyboard: true });
      return;
    }
    this.open.set(false);
    // Closing without a pick reverts the field to the selection.
    this.query.set('');
    this.highlight.set(null);
    this.inputValue.set(untracked(this.selectedLabel));
  }

  /** The chevron: focus the field and toggle. */
  toggle() {
    if (this.disabled()) return;
    this.focusInput();
    this.setOpen(!untracked(this.open));
  }

  /** Typing: filter, open, and highlight the first match so Enter picks it. */
  setInputValue(next: string) {
    this.inputValue.set(next);
    this.query.set(next);
    if (this.disabled()) return;
    this.open.set(true);
    this.highlight.set({ index: 0, keyboard: true });
  }

  /** Picks the row rendered for `value` (a row's click). */
  selectValue(value: string) {
    const item = this.itemsByValue().get(value);
    if (item !== undefined) this.select(item);
  }

  select(item: ComboboxItemData) {
    const values = untracked(this.values);
    const multiple = untracked(this.multiple);
    // A pick on the create row is not a selection: it asks the consumer for
    // the item, selects whatever comes back, and closes like any pick made
    // while filtering.
    if (isComboboxCreateItem(item)) {
      const made = untracked(this.onCreate)?.(comboboxItemLabel(item));
      if (made !== undefined && made !== null) {
        this.commit(multiple ? [...values, comboboxItemValue(made)] : [comboboxItemValue(made)]);
        // The consumer added the item to `items`, so the label resolves now.
        this.setOpen(false);
        if (!multiple) this.inputValue.set(comboboxItemLabel(made));
      } else {
        this.setOpen(false);
      }
      return;
    }
    const v = comboboxItemValue(item);
    if (multiple) {
      // Toggle. A pick from an unfiltered list keeps the popup open for the
      // next one; a pick made while filtering closes it and clears the query.
      this.commit(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
      if (untracked(this.query) !== '') this.setOpen(false);
      return;
    }
    this.commit([v]);
    this.setOpen(false);
    this.inputValue.set(comboboxItemLabel(item));
  }

  /** Drops one pick (a chip's ✕, Backspace). */
  remove(value: string, focusInput = true) {
    this.commit(untracked(this.values).filter((x) => x !== value));
    if (focusInput) this.focusInput();
  }

  /** The clear ✕: drops the pick(s) and the query. */
  clear() {
    this.commit([]);
    this.inputValue.set('');
    this.query.set('');
    this.highlight.set(null);
    this.focusInput();
  }

  private commit(next: string[]) {
    this.value.set((untracked(this.multiple) ? next : (next[0] ?? '')) as V);
  }

  private isRowDisabled(index: number) {
    return this.document.getElementById(`${this.listId}-${index}`)?.getAttribute('aria-disabled') === 'true';
  }

  // ── The field's keyboard model ──────────────────────────────────────

  onInputKeydown(e: KeyboardEvent, input: HTMLInputElement) {
    if (e.defaultPrevented || this.disabled()) return;
    const rows = this.listItems();
    const count = rows.length;
    const open = this.open();
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        const down = e.key === 'ArrowDown';
        if (!open) {
          this.setOpen(true);
          if (count > 0) this.highlight.set({ index: down ? 0 : count - 1, keyboard: true });
          return;
        }
        if (count === 0) return;
        // Wrap straight from one end to the other: with the always-on
        // highlight React turns off Base UI's allowEscape, so the input is
        // never a stop between the ends.
        const step = down ? 1 : -1;
        const current = this.safeHighlight()?.index ?? (down ? -1 : count);
        this.highlight.set({ index: (current + step + count) % count, keyboard: true });
        return;
      }
      case 'Enter': {
        if (!open) return;
        e.preventDefault();
        const h = this.safeHighlight();
        if (h && rows[h.index] !== undefined && !this.isRowDisabled(h.index)) this.select(rows[h.index]);
        return;
      }
      case 'Escape': {
        if (!open) return;
        e.preventDefault();
        this.setOpen(false);
        return;
      }
      case 'Backspace': {
        // Multiple: an empty field backspaces into the chips.
        const values = this.values();
        if (this.multiple() && input.value === '' && values.length > 0) {
          e.preventDefault();
          this.remove(values[values.length - 1]);
        }
        return;
      }
      case 'ArrowLeft': {
        // Multiple: ArrowLeft at the start of the field walks into the chips.
        if (this.multiple() && input.selectionStart === 0 && input.selectionEnd === 0 && this.chips?.focusLast()) {
          e.preventDefault();
        }
        return;
      }
      default:
        return;
    }
  }

  /** Focus leaving the field and the popup closes it (non-modal dismissal). */
  onFieldFocusout(e: FocusEvent) {
    if (!untracked(this.open)) return;
    const next = e.relatedTarget as Node | null;
    if (next && (untracked(this.anchor)?.contains(next) || untracked(this.popup)?.contains(next))) return;
    this.setOpen(false);
  }
}
