import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  InjectionToken,
  type OnDestroy,
  type Signal,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { cn, Icon, injectSize, injectSurface, SURFACE_BG } from '@angel-r/fluid-functionalism-angular/core';

// ---------------------------------------------------------------------------
// Search inside a dropdown menu.
//
// DropdownSearch is a text field pinned to the top of a dropdown popup. It is
// controlled: the consumer filters the menu items it renders against
// `value`, so the list can be re-indexed freely (fluid hover keys on the
// indices of whatever is currently mounted). Two things make a field inside a
// menu behave:
//
//   1. The menu primitive's typeahead must not steal keystrokes from the
//      field — every typing key stops propagating at the input.
//   2. Typing while a ROW is focused must land in the field: the popup
//      hosts a capture-phase keydown handler (`[ffDropdownSearchHost]` or
//      `createDropdownSearchHost`) that refocuses the input and appends the
//      character.
//
// Arrow keys leave the field for the list (first / last row) and arrowing
// off either end of the list comes back to it, so the field is one stop in
// the ring of rows. While the field has focus no row is highlighted. So Enter
// in the field picks nothing (only a row you arrowed onto activates), and
// Escape closes the menu as usual.
// ---------------------------------------------------------------------------

export interface DropdownSearchHandle {
  readonly input: HTMLInputElement | null;
  /** Whether the field takes focus when the popup opens. */
  readonly autoFocus: boolean;
  append(text: string): void;
  deleteBackward(): void;
}

export interface DropdownSearchHostValue {
  register(handle: DropdownSearchHandle): () => void;
  /** Whether the popup is open. Popups stay mounted through their exit
   *  animation, so the field watches this rather than its own mount. */
  readonly open: Signal<boolean>;
}

export const DROPDOWN_SEARCH_HOST = new InjectionToken<DropdownSearchHostValue>('FF_DROPDOWN_SEARCH_HOST');

const ROW_SELECTOR = [
  '[role="menuitem"]:not([aria-disabled="true"])',
  '[role="menuitemradio"]:not([aria-disabled="true"])',
  '[role="menuitemcheckbox"]:not([aria-disabled="true"])',
].join(', ');

const ANY_ROW = '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]';

/** Whether `a` comes before `b` in the document. */
function precedes(a: Node, b: Node) {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

function menuRows(from: HTMLElement | null): HTMLElement[] {
  const menu = from?.closest<HTMLElement>('[role="menu"]');
  return menu ? Array.from(menu.querySelectorAll<HTMLElement>(ROW_SELECTOR)) : [];
}

/** Scroll the menu's scrolling list back to its top. The walk stops at the
 *  menu, so a list that fits never scrolls the page. */
function scrollToTop(row: HTMLElement) {
  const menu = row.closest<HTMLElement>('[role="menu"]');
  for (let el = row.parentElement; el && menu?.contains(el); el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
      el.scrollTop = 0;
      return;
    }
  }
}

/**
 * Hosts a DropdownSearch inside a popup. Returns the value to provide as
 * `DROPDOWN_SEARCH_HOST`, a keydown handler to attach to the popup element in
 * the CAPTURE phase (`addEventListener('keydown', h, { capture: true })`),
 * and `hasSearch()` / `searchMounted` for decisions that depend on a field
 * being present. `[ffDropdownSearchHost]` wires all of it for you.
 */
export function createDropdownSearchHost(open: Signal<boolean>) {
  let handle: DropdownSearchHandle | null = null;
  // Reactive twin of `handle`, for render-time decisions (the popup drops its
  // scroll fade while a field is pinned at the top).
  const searchMounted = signal(false);

  const register = (next: DropdownSearchHandle) => {
    handle = next;
    searchMounted.set(true);
    return () => {
      if (handle === next) {
        handle = null;
        searchMounted.set(false);
      }
    };
  };

  const host: DropdownSearchHostValue = { register, open };

  // Typing on a focused row: redirect the character (or Backspace) into the
  // field. Space is left alone: on a row it activates the item, which is
  // what a menu user expects once they have arrowed down. Arrowing off the
  // first or last row returns to the field instead of stopping or wrapping
  // past it, mirroring the field's own ↓ / ↑.
  const onKeyDownCapture = (e: KeyboardEvent) => {
    const input = handle?.input;
    if (!handle || !input) return;
    if (e.target === input) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (!target?.matches(ANY_ROW)) return;
      const up = e.key === 'ArrowUp';
      const rows = menuRows(target);
      const edge = up ? rows[0] : rows[rows.length - 1];
      // At or past the first / last enabled row: a disabled row beyond the
      // edge leads back to the field too.
      const pastEdge = !edge || edge === target || (up ? precedes(target, edge) : precedes(edge, target));
      if (pastEdge) {
        e.preventDefault();
        e.stopPropagation();
        input.focus();
        // The field sits before the first row, so coming back to it from the
        // bottom of a long list returns the list to its top.
        scrollToTop(target);
      }
    } else if (e.key.length === 1 && e.key !== ' ') {
      e.preventDefault();
      e.stopPropagation();
      input.focus();
      handle.append(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      input.focus();
      handle.deleteBackward();
    }
  };

  return {
    host,
    /** Whether a search field is mounted in the popup right now. */
    hasSearch: () => handle !== null,
    /** Whether a mounted field takes focus when the popup opens, a frame
     *  after the primitive's own open autofocus. */
    searchTakesFocus: () => handle?.autoFocus ?? false,
    searchMounted: searchMounted.asReadonly(),
    onKeyDownCapture,
  };
}

/**
 * Makes its host (the popup / role="menu" element) a search host: provides
 * `DROPDOWN_SEARCH_HOST` to a `<ff-dropdown-search>` inside and listens for
 * row keystrokes in the capture phase. The value is whether the popup is
 * open (a bare attribute means open).
 */
@Directive({
  selector: '[ffDropdownSearchHost]',
  exportAs: 'ffDropdownSearchHost',
  providers: [{ provide: DROPDOWN_SEARCH_HOST, useFactory: () => inject(DropdownSearchHost).host }],
})
export class DropdownSearchHost {
  readonly open = input(true, { alias: 'ffDropdownSearchHost', transform: booleanAttribute });
  private readonly state = createDropdownSearchHost(this.open);
  readonly host = this.state.host;
  readonly hasSearch = this.state.hasSearch;
  readonly searchTakesFocus = this.state.searchTakesFocus;
  readonly searchMounted = this.state.searchMounted;

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const handler = this.state.onKeyDownCapture;
    element.addEventListener('keydown', handler, { capture: true });
    inject(DestroyRef).onDestroy(() => element.removeEventListener('keydown', handler, { capture: true }));
  }
}

const alwaysOpen = signal(true).asReadonly();

/** The search field pinned to the top of a dropdown popup. */
@Component({
  selector: 'ff-dropdown-search',
  imports: [Icon],
  host: {
    '[class]': 'hostClass()',
    // aria-label is forwarded to the field; the wrapper carries no name.
    '[attr.aria-label]': 'null',
  },
  template: `
    <ff-icon
      name="search"
      [size]="size().icon"
      [strokeWidth]="1.5"
      class="shrink-0 text-muted-foreground transition-[color,stroke-width] duration-80 group-focus-within/search:text-foreground group-focus-within/search:stroke-[2]"
    />
    <input
      #input
      type="text"
      role="searchbox"
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      [value]="value()"
      [attr.placeholder]="placeholder()"
      [attr.aria-label]="ariaLabel() ?? null"
      [class]="inputClass()"
      (input)="onInput($event)"
      (keydown)="onKeydown($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownSearch implements OnDestroy {
  /** The query, two-way: `[(value)]`. Filter the rows you render against it. */
  readonly value = model('');
  readonly placeholder = input<string, string | undefined>('Search…', {
    transform: (v) => v ?? 'Search…',
  });
  /** Reset the query to "" when the popup closes (the field unmounts with
   *  it), so the menu reopens unfiltered. */
  readonly clearOnClose = input(true, { transform: booleanAttribute });
  /** Take focus when the popup opens. */
  readonly autoFocus = input(true, { transform: booleanAttribute });
  readonly ariaLabel = input<string | undefined>(undefined, { alias: 'aria-label' });
  readonly userClass = input('', { alias: 'class' });
  /** The field's keydown, before the built-in handling. Call
   *  `preventDefault()` to skip it (the React `onKeyDown` prop). */
  readonly fieldKeydown = output<KeyboardEvent>();

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly searchHost = inject(DROPDOWN_SEARCH_HOST, { optional: true });
  protected readonly size = injectSize();
  // The popup surface, painted explicitly: rows scroll underneath the sticky
  // field, and `bg-inherit` could resolve to a transparent parent.
  private readonly surface = injectSurface();

  protected readonly hostClass = computed(() => {
    const size = this.size();
    return cn(
      // Sticky at the top of the scrolling popup, bleeding into its 4px
      // padding so the divider runs edge to edge and rows scroll underneath
      // it; margin + the list gap put the first row 4px below the divider.
      'group/search sticky top-0 z-20 -mx-1 -mt-1 mb-0.5 flex shrink-0 items-center border-b border-border/60',
      SURFACE_BG[this.surface()],
      size.control,
      size.gap,
      size.variant === 'compact' ? 'px-2.5' : 'px-3',
      this.userClass(),
    );
  });

  protected readonly inputClass = computed(() => {
    const size = this.size();
    return cn(
      // rounded-none: the base :focus-visible rule hands focused elements the
      // shape radius, and a text input clips its caret to its own corners.
      'min-w-0 flex-1 rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]',
      size.field,
      // The line box: Safari runs the caret its full height, so the ladder's
      // leading keeps it in proportion to the row.
      size.variant === 'compact' ? 'leading-5' : 'leading-6',
    );
  });

  /** The input element (the React forwarded ref). */
  get input(): HTMLInputElement {
    return this.inputRef().nativeElement;
  }

  focus() {
    this.input.focus();
  }

  constructor() {
    if (this.searchHost) {
      const component = this;
      const unregister = this.searchHost.register({
        get input() {
          return component.inputRef().nativeElement;
        },
        get autoFocus() {
          return untracked(component.autoFocus);
        },
        append: (text) => this.value.set(untracked(this.value) + text),
        deleteBackward: () => this.value.set(untracked(this.value).slice(0, -1)),
      });
      inject(DestroyRef).onDestroy(unregister);
    }

    // On every open (mount, or a reopen while the popup was still playing its
    // exit): reset the query so the list starts unfiltered, then take focus.
    // The popup's own initial focus is queued a frame after mount; the field
    // takes over one frame later so a menu with a search opens ready to type.
    const open = this.searchHost?.open ?? alwaysOpen;
    effect((onCleanup) => {
      if (!open()) return;
      const autoFocus = this.autoFocus();
      untracked(() => {
        if (this.clearOnClose() && this.value() !== '') this.value.set('');
      });
      if (!autoFocus) return;
      let inner: number | undefined;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => this.inputRef().nativeElement.focus());
      });
      onCleanup(() => {
        cancelAnimationFrame(outer);
        if (inner !== undefined) cancelAnimationFrame(inner);
      });
    });
  }

  // Unmount (the popup finished closing): reset the query so the next open
  // shows the full list. ngOnDestroy runs while the model can still emit.
  ngOnDestroy() {
    if (untracked(this.clearOnClose) && untracked(this.value) !== '') this.value.set('');
  }

  protected onInput(e: Event) {
    this.value.set((e.target as HTMLInputElement).value);
  }

  protected onKeydown(e: KeyboardEvent) {
    this.fieldKeydown.emit(e);
    if (e.defaultPrevented) return;
    // Escape and Tab belong to the menu (close / leave). Everything else is
    // either typing, which the menu's typeahead must not see, or list
    // navigation handled right here.
    if (e.key === 'Escape' || e.key === 'Tab') return;
    e.stopPropagation();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const rows = menuRows(e.currentTarget as HTMLElement);
      if (rows.length === 0) return;
      e.preventDefault();
      (e.key === 'ArrowDown' ? rows[0] : rows[rows.length - 1]).focus();
    } else if (e.key === 'Enter') {
      // No row has focus, so there is nothing to pick. preventDefault keeps a
      // surrounding form from submitting.
      e.preventDefault();
    }
  }
}

/** The "no results" row a filtered menu shows instead of items. */
@Component({
  selector: 'ff-dropdown-empty',
  host: {
    role: 'status',
    'aria-live': 'polite',
    style: 'display: block',
    '[class]': 'hostClass()',
  },
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownEmpty {
  readonly userClass = input('', { alias: 'class' });
  private readonly size = injectSize();
  protected readonly hostClass = computed(() =>
    cn('px-2 py-6 text-center text-muted-foreground', this.size().text, this.userClass()),
  );
}
