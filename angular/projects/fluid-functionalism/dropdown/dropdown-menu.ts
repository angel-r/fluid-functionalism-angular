import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  InjectionToken,
  type Signal,
  type TemplateRef,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Directionality } from '@angular/cdk/bidi';
import { MENU_COMPONENT, Menu as AriaMenu, MenuItem as AriaMenuItem } from '@angular/aria/menu';
import {
  cn,
  Icon,
  type IconDefinition,
  type IconName,
  SizeContext,
  injectSize,
  type SizeVariant,
  SURFACE_LEVEL,
  surfaceClasses,
  isDisabledRow,
  popupMotionClass,
  popupScrollAreaClass,
  popupViewportClass,
} from '@angel-r/fluid-functionalism-angular/core';
import { createFluidHover, isOwnEvent, FluidHoverHighlight } from '@angel-r/fluid-functionalism-angular/fluid-hover';
import { SelectionBackgrounds, createMergeSplitBlocks, createSelectionRuns } from '@angel-r/fluid-functionalism-angular/merge-split';
import {
  DROPDOWN_CONTEXT,
  MenuItem,
  MenuItemRow,
  type DropdownContextValue,
  type MenuItemRenderOptions,
  type MenuItemTemplateContext,
} from '@angel-r/fluid-functionalism-angular/menu-item';
import { DROPDOWN_SEARCH_HOST, createDropdownSearchHost } from '@angel-r/fluid-functionalism-angular/dropdown-search';
import { ScrollArea } from '@angel-r/fluid-functionalism-angular/scroll-area';
import { dropdownShape } from './dropdown';
import { SUBMENU_ALIGN_OFFSET, SUBMENU_SIDE_OFFSET, createSubmenuHost } from './dropdown-sub';
import { createPopupOverlay, type PopupAlign, type PopupPlacement, type PopupSide } from './popup-overlay';
import { PopupCheckedBackground, createControllableOpen, createPinnedSize, createRaisedSurface } from './popup-parts';

const shape = dropdownShape;

const FIRST_ROW =
  '[role="menuitem"]:not([aria-disabled="true"]), [role="menuitemradio"]:not([aria-disabled="true"]), [role="menuitemcheckbox"]:not([aria-disabled="true"])';

// ---------------------------------------------------------------------------
// Popup menus
//
// @angular/aria's Menu owns the menu semantics inside each popup: role="menu"
// and the item roles, the roving tab stop, arrow / Home / End navigation,
// typeahead, hover-to-focus, and submenus (hover to open after a delay, → / ←,
// aria-haspopup / aria-expanded / aria-controls on the trigger row). The CDK
// overlay owns positioning (collision flipping, anchor tracking). This layer
// owns the open state (controlled or not, the whole tree closing on a pick,
// Escape, a press outside or focus leaving), the fluid-hover overlays, and
// the spring open/close: the exit plays to its end before the popup leaves
// the overlay (see popup-overlay.ts).
// ---------------------------------------------------------------------------

/** One level of the menu tree: the root DropdownMenu or a DropdownSub. */
export interface DropdownMenuContext {
  readonly open: Signal<boolean>;
  /** Set by DropdownSub: the content is a submenu. */
  readonly sub: boolean;
  setOpen(next: boolean): void;
  /** The root of the tree: closing it closes every level. */
  readonly root: DropdownMenu;
  /** What the popup is positioned against: the trigger, or the trigger row. */
  readonly anchor: Signal<HTMLElement | null>;
  /** The popup content registers itself with its level. */
  registerContent(content: DropdownPopupBase): () => void;
  /** The submenus opened from this level's rows. */
  readonly children: ReadonlySet<DropdownSub>;
  registerChild(sub: DropdownSub): () => void;
}

function childRegistry() {
  const children = new Set<DropdownSub>();
  return {
    children: children as ReadonlySet<DropdownSub>,
    registerChild(sub: DropdownSub) {
      children.add(sub);
      return () => children.delete(sub);
    },
  };
}

export const DROPDOWN_MENU_CONTEXT = new InjectionToken<DropdownMenuContext>('FF_DROPDOWN_MENU_CONTEXT');

function injectMenuContext(): DropdownMenuContext {
  const ctx = inject(DROPDOWN_MENU_CONTEXT, { optional: true });
  if (!ctx) throw new Error('DropdownMenu compound components must be inside <ff-dropdown-menu>');
  return ctx;
}

// ---------------------------------------------------------------------------
// DropdownMenu (popup root)
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-dropdown-menu',
  providers: [
    { provide: DROPDOWN_MENU_CONTEXT, useExisting: DropdownMenu },
    // A size input pins the whole compound (trigger content + popup rows) to
    // one ladder step.
    { provide: SizeContext, useFactory: () => inject(DropdownMenu).sizeContext },
  ],
  host: { style: 'display: contents' },
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownMenu implements DropdownMenuContext {
  /** Controlled open state. Bind with `[(open)]`, or `[open]` + `(openChange)`. */
  readonly openInput = input<boolean | undefined>(undefined, { alias: 'open' });
  /** Initial open state when `open` is not bound. */
  readonly defaultOpen = input(false, { transform: booleanAttribute });
  /** Disables the menu: the trigger no longer opens it. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Pins trigger-side content and the popup rows to one step of the size
   *  ladder. Omitted, they follow the surrounding size provider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  /** The menu opened or closed (React `onOpenChange`). */
  readonly openChange = output<boolean>();

  readonly sub = false;
  readonly root = this;
  readonly sizeContext = createPinnedSize(this.size);
  private readonly state = createControllableOpen(this.openInput, this.defaultOpen, (next) =>
    this.openChange.emit(next),
  );
  readonly open = this.state.value;
  /** The trigger element (registered by `[ffDropdownTrigger]`). */
  readonly trigger = signal<HTMLElement | null>(null);
  readonly anchor = this.trigger.asReadonly();
  private readonly content = signal<DropdownPopupBase | null>(null);
  /** The popup menu's id, for the trigger's aria-controls. */
  readonly menuId = computed(() => this.content()?.menu().id() ?? null);
  private readonly panels = new Set<HTMLElement>();
  private readonly document = inject(DOCUMENT);
  private readonly childSubs = childRegistry();
  readonly children = this.childSubs.children;
  readonly registerChild = this.childSubs.registerChild;

  constructor() {
    // Dismissal: a press outside the trigger and every open popup, focus
    // moving outside them, and Escape.
    effect((onCleanup) => {
      if (!this.open()) return;
      const onPointerDown = (e: Event) => {
        if (!this.contains(e.target as Node | null)) this.setOpen(false);
      };
      const onFocusIn = (e: FocusEvent) => {
        if (!this.contains(e.target as Node | null)) this.setOpen(false);
      };
      const onKeydown = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;
        this.setOpen(false);
        this.trigger()?.focus();
      };
      this.document.addEventListener('pointerdown', onPointerDown, true);
      this.document.addEventListener('focusin', onFocusIn, true);
      // Capture: the menu primitive stops the Escape it handles itself.
      this.document.addEventListener('keydown', onKeydown, true);
      onCleanup(() => {
        this.document.removeEventListener('pointerdown', onPointerDown, true);
        this.document.removeEventListener('focusin', onFocusIn, true);
        this.document.removeEventListener('keydown', onKeydown, true);
      });
    });

    // Closing hands focus back to the trigger when it was inside a popup (or
    // went nowhere), as the menu primitive does.
    let wasOpen = false;
    effect(() => {
      const open = this.open();
      untracked(() => {
        if (wasOpen && !open) {
          const active = this.document.activeElement;
          if (!active || active === this.document.body || this.inPanels(active)) this.trigger()?.focus();
        }
        wasOpen = open;
      });
    });
  }

  setOpen(next: boolean) {
    if (next && this.disabled()) return;
    this.state.set(next);
  }

  registerContent(content: DropdownPopupBase) {
    this.content.set(content);
    return () => {
      if (untracked(this.content) === content) this.content.set(null);
    };
  }

  /** Popups of this tree register their element so a press or focus inside
   *  any of them (submenus included) doesn't count as outside. */
  registerPanel(element: HTMLElement) {
    this.panels.add(element);
    return () => this.panels.delete(element);
  }

  private inPanels(node: Node | null) {
    if (!node) return false;
    for (const panel of this.panels) if (panel.contains(node)) return true;
    return false;
  }

  private contains(node: Node | null) {
    return !!node && (!!this.trigger()?.contains(node) || this.inPanels(node));
  }
}

// ---------------------------------------------------------------------------
// DropdownTrigger
//
// Put it on any element, typically a button:
//
//   <button ffButton ffDropdownTrigger variant="secondary">Open</button>
// ---------------------------------------------------------------------------

@Directive({
  selector: '[ffDropdownTrigger]',
  exportAs: 'ffDropdownTrigger',
  host: {
    'aria-haspopup': 'menu',
    '[attr.aria-expanded]': 'menu.open()',
    '[attr.aria-controls]': 'menu.open() ? menu.menuId() : null',
    '[attr.data-popup-open]': 'menu.open() ? "" : null',
    '[attr.aria-disabled]': 'menu.disabled() || null',
    '[attr.data-disabled]': 'menu.disabled() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class DropdownTrigger {
  protected readonly menu = inject(DropdownMenu);

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    this.menu.trigger.set(element);
    inject(DestroyRef).onDestroy(() => {
      if (untracked(this.menu.trigger) === element) this.menu.trigger.set(null);
    });
  }

  protected onClick() {
    this.menu.setOpen(!this.menu.open());
  }
}

// ---------------------------------------------------------------------------
// DropdownContent / DropdownSubContent (popup panel)
//
// Positioner > motion wrapper > Menu popup carrying the exact inline-panel
// visuals: the raised surface, fluid-hover overlays, and the animated
// selected background. Children sit in a display:contents group so rows stay
// direct flex children of the list.
// ---------------------------------------------------------------------------

type LitBy = 'open' | 'pointer' | 'keyboard';

const POPUP_TEMPLATE = `
  <div #positioner data-slot="dropdown-positioner" class="z-50 outline-none" style="display: none">
    <div #motion [class]="motionClass">
      <div
        #popup
        ngMenu
        [class]="popupClass()"
        (focusin)="onFocusIn($event)"
        (focusout)="onFocusOut($event)"
        (mouseenter)="onMouseEnter($event)"
        (mousemove)="onMouseMove($event)"
        (mouseleave)="onMouseLeave($event)"
        (click)="hover.onClick($event)"
      >
        <!-- The list scrolls inside a ScrollArea; the inner wrapper is the
             rows' offsetParent, so the overlays scroll with them. -->
        <ff-scroll-area [class]="scrollAreaClass" [viewportClass]="viewportClass()" thumbSizing="track">
          <div #list class="relative flex flex-col p-1">
            <!-- Selected backgrounds — merged runs in multiple mode -->
            @if (multiple()) {
              <ff-selection-backgrounds [blocks]="blocks()" />
            }
            <!-- Selected background -->
            <ff-popup-checked-background [rect]="checkedRect()" />
            <!-- Hover background -->
            <ff-fluid-hover-highlight [hover]="hover" [from]="highlightFrom()" [class]="shape.bg" />
            <div role="group" class="contents"><ng-content /></div>
          </div>
        </ff-scroll-area>
        <!-- The menu-item primitive each MenuItem renders through: it owns the
             role, roving tabindex, typeahead and activation; [ffMenuItemRow]
             carries the visuals and the fluid hover registration. -->
        <ng-template #primitive let-o>
          <div
            ngMenuItem
            [ffMenuItemRow]="o"
            [role]="o.role"
            [value]="o.value"
            [disabled]="!!o.disabled"
            [searchTerm]="o.label"
            [attr.aria-checked]="ariaChecked(o)"
            [attr.data-disabled]="o.disabled ? '' : null"
            (click)="activate(o, $event)"
            (keydown)="onRowKeydown(o, $event)"
          >
            <ng-container [ngTemplateOutlet]="o.content" />
          </div>
        </ng-template>
      </div>
    </div>
  </div>
`;

const POPUP_IMPORTS = [
  AriaMenu,
  AriaMenuItem,
  MenuItemRow,
  NgTemplateOutlet,
  ScrollArea,
  SelectionBackgrounds,
  PopupCheckedBackground,
  FluidHoverHighlight,
];

@Directive()
export abstract class DropdownPopupBase {
  /** Index of the checked item. Drives the animated selected background and
   *  the radio state announced to assistive tech. */
  readonly checkedIndex = input<number | undefined>(undefined);
  /** Multiple selection: the checked rows. Rows become checkbox items that
   *  keep the menu open when toggled, and contiguous runs share one merged
   *  background (see CheckboxGroup). */
  readonly checkedIndices = input<readonly number[] | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  protected abstract readonly placement: Signal<PopupPlacement>;

  protected readonly shape = shape;
  protected readonly motionClass = popupMotionClass;
  protected readonly scrollAreaClass = popupScrollAreaClass;
  protected readonly menuCtx = injectMenuContext();
  readonly open = this.menuCtx.open;
  readonly sub = this.menuCtx.sub;
  private readonly document = inject(DOCUMENT);
  protected readonly dir = inject(Directionality);

  /** The menu primitive of this popup. */
  readonly menu = viewChild.required(AriaMenu);
  readonly positioner = viewChild.required<ElementRef<HTMLElement>>('positioner');
  private readonly motion = viewChild.required<ElementRef<HTMLElement>>('motion');
  private readonly popup = viewChild.required<ElementRef<HTMLElement>>('popup');
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private readonly primitive = viewChild<TemplateRef<MenuItemTemplateContext>>('primitive');

  readonly surface = createRaisedSurface(2);
  readonly hover = createFluidHover(() => this.list()?.nativeElement, { isItemDisabled: isDisabledRow });
  // Submenus opened from these rows: their trigger stays lit while the
  // pointer crosses to them (see dropdown-sub.ts).
  private readonly submenus = createSubmenuHost(() => this.list()?.nativeElement, this.hover, this.open);
  // An optional DropdownSearch child: typing on a focused row is redirected
  // into the field. (The field takes focus itself, a frame after the open.)
  readonly search = createDropdownSearchHost(this.open);

  protected readonly overlay = createPopupOverlay({
    positioner: () => this.positioner()?.nativeElement,
    motion: () => this.motion()?.nativeElement,
    anchor: () => this.menuCtx.anchor(),
    placement: () => this.placement(),
    rtl: () => this.dir.valueSignal() === 'rtl',
  });

  protected readonly multiple = computed(() => this.checkedIndices() != null);
  protected readonly checkedRect = computed(() => {
    const index = this.checkedIndex();
    return !this.multiple() && index != null ? (this.hover.itemRects()[index] ?? null) : null;
  });
  // Multiple: one merged block per contiguous run of checked rows.
  private readonly runs = createSelectionRuns(() => this.checkedIndices() ?? []);
  protected readonly blocks = createMergeSplitBlocks(
    this.runs,
    computed(() => (this.open() ? this.hover.itemRects() : [])),
    () => shape.bgRadius,
  );

  // What lights the highlight: the open itself (its first-row focus), the
  // pointer, or the keyboard. A highlight that appears from nothing fades in
  // at `from` and glides to its row. That suits the pointer entering the list
  // (it rises from the checked row toward the cursor), not a row lit by the
  // open or by arrowing in from the search field: those fade in where they
  // are. The handlers read `litByNow`: a key press updates it before the
  // focus it moves arrives, in the same event. Each open starts over.
  private litByNow: LitBy = 'open';
  private readonly litBy = signal<LitBy>('open');
  protected readonly highlightFrom = computed(() => (this.litBy() === 'pointer' ? this.checkedRect() : null));

  protected readonly popupClass = computed(() =>
    cn(
      // min-w tracks the trigger through --anchor-width. A submenu's anchor
      // is a row, so it keeps its own narrower width instead.
      `flex flex-col ${this.sub ? 'w-56' : 'w-72 min-w-[var(--anchor-width)]'} max-w-full max-h-[min(480px,var(--available-height))] overflow-hidden ${shape.container} select-none outline-none`,
      surfaceClasses(this.surface(), 3),
      this.userClass(),
    ),
  );
  protected readonly viewportClass = computed(() =>
    cn(popupViewportClass, !this.search.searchMounted() && 'scroll-fade'),
  );

  readonly context: DropdownContextValue = {
    registerItem: this.hover.registerItem,
    unregisterItem: this.hover.unregisterItem,
    activeIndex: this.hover.activeIndex,
    checkedIndex: this.checkedIndex,
    multiple: this.multiple,
    checkedIndices: this.checkedIndices,
    inMenu: true,
    menuItemTemplate: this.primitive,
    onSubmenuOpenChange: this.submenus.onSubmenuOpenChange,
  };

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(this.menuCtx.registerContent(this));

    afterNextRender(() => {
      const popup = this.popup().nativeElement;
      popup.addEventListener('keydown', this.onKeyDownCapture, { capture: true });
      popup.addEventListener('focusout', this.keepForDescendants, { capture: true });
      popup.addEventListener('mouseout', this.keepForDescendants, { capture: true });
      const unregister = this.menuCtx.root.registerPanel(this.positioner().nativeElement);
      destroyRef.onDestroy(() => {
        popup.removeEventListener('keydown', this.onKeyDownCapture, { capture: true });
        popup.removeEventListener('focusout', this.keepForDescendants, { capture: true });
        popup.removeEventListener('mouseout', this.keepForDescendants, { capture: true });
        unregister();
      });
    });

    // A submenu starts each open with no row picked: the primitive focuses a
    // menu's picked row as it becomes visible, which is right after a
    // keyboard open (it picks the first row) but would pull focus out of the
    // parent on a hover or controlled open.
    if (this.sub) {
      effect(() => {
        const menu = this.menu();
        if (!menu.parent() || this.open()) return;
        untracked(() => menu._pattern.listBehavior.unfocus());
      });
    }

    let openFrames: number[] = [];
    const cancelFrames = () => {
      openFrames.forEach((id) => cancelAnimationFrame(id));
      openFrames = [];
    };
    effect(() => {
      const open = this.open();
      // A submenu's anchor (its trigger row) can register after it opens.
      if (!this.menuCtx.anchor()) return;
      untracked(() => {
        cancelFrames();
        if (!open) {
          if (this.sub) (this.menuCtx as DropdownSub).keyboardOpen = false;
          this.overlay.hide();
          return;
        }
        this.litByNow = 'open';
        this.litBy.set('open');
        this.overlay.show();
        // The popup keeps its rows registered between opens, so their rects
        // were taken while it was hidden: re-measure once it is laid out.
        this.hover.remeasure();
        if (this.sub) {
          // A keyboard open (→, Enter, Space) lands on the submenu's first
          // row. Hovering the trigger (or a controlled open) leaves focus in
          // the parent.
          const sub = this.menuCtx as DropdownSub;
          if (sub.keyboardOpen) {
            sub.keyboardOpen = false;
            this.menu()._pattern.listBehavior.first();
          }
          return;
        }
        // Open ready to act: focus the first enabled row (a mounted search
        // field takes focus itself instead), a couple of frames after the
        // open so the popup is laid out.
        const outer = requestAnimationFrame(() => {
          const inner = requestAnimationFrame(() => {
            openFrames = [];
            if (this.search.hasSearch()) return;
            const container = this.list().nativeElement;
            const active = this.document.activeElement;
            if (container.contains(active) && active !== container) return;
            container.querySelector<HTMLElement>(FIRST_ROW)?.focus();
          });
          openFrames = [inner];
        });
        openFrames = [outer];
      });
    });

    destroyRef.onDestroy(() => {
      cancelFrames();
      this.overlay.dispose();
    });
  }

  private markLitBy(by: LitBy) {
    this.litByNow = by;
    if (untracked(this.litBy) !== by) this.litBy.set(by);
  }

  /** Keeps the menu primitive's roving item in step with a row focused by
   *  something other than its own navigation (the search field's ↓ / ↑, the
   *  open's first-row focus). */
  private syncActiveItem(row: Element) {
    const menu = this.menu();
    const item = menu._items().find((i) => i.element === row);
    if (item && menu._pattern.inputs.activeItem() !== item._pattern) {
      menu._pattern.listBehavior.goto(item._pattern, { focusElement: false });
    }
  }

  /** Whether `node` sits in a submenu opened from this popup, at any depth. */
  containsDescendant(node: Node | null): boolean {
    if (!node) return false;
    for (const child of this.menuCtx.children) {
      const content = child.popupContent();
      if (content && (content.positioner().nativeElement.contains(node) || content.containsDescendant(node))) {
        return true;
      }
    }
    return false;
  }

  // Focus or the pointer leaving this popup for one of its own submenus is
  // not leaving the menu: the submenu renders in its own overlay, outside
  // this popup's DOM, so the menu primitive would read it as a departure and
  // close the submenu it just opened. Stopped before the primitive hears it.
  private readonly keepForDescendants = (e: Event) => {
    if (this.containsDescendant((e as FocusEvent | MouseEvent).relatedTarget as Node | null)) e.stopPropagation();
  };

  private readonly onKeyDownCapture = (e: KeyboardEvent) => {
    if (!isOwnEvent(e)) return;
    this.markLitBy('keyboard');
    this.search.onKeyDownCapture(e);
  };

  protected onMouseEnter(e: MouseEvent) {
    if (!isOwnEvent(e)) return;
    this.markLitBy('pointer');
    this.submenus.onMouseEnter();
  }

  protected onMouseMove(e: MouseEvent) {
    if (!isOwnEvent(e)) return;
    this.markLitBy('pointer');
    this.submenus.onMouseMove(e);
  }

  protected onMouseLeave(e: MouseEvent) {
    if (!isOwnEvent(e)) return;
    this.submenus.onMouseLeave();
  }

  protected onFocusIn(e: FocusEvent) {
    if (!isOwnEvent(e)) return;
    const target = e.target as HTMLElement;
    const popup = this.popup().nativeElement;
    const row = target.closest?.('[data-fluid-hover-index]');
    // Keyboard navigation moves the hover background only — no ring: in a
    // menu the highlighted row is the focus indicator.
    if (row && popup.contains(row)) {
      this.syncActiveItem(row);
      // With an autofocusing search field, the open's first-row focus can
      // land a frame before the field takes over: that row stays unlit.
      if (this.litByNow === 'open' && this.search.searchTakesFocus()) return;
      this.hover.setActiveIndex(Number(row.getAttribute('data-fluid-hover-index')));
    } else if (target !== popup) {
      // Focus moved to a non-row inside the popup, such as the search field:
      // no row is highlighted any more. The popup focusing itself doesn't
      // count.
      this.hover.setActiveIndex(null);
    }
  }

  protected onFocusOut(e: FocusEvent) {
    if (!isOwnEvent(e)) return;
    // Only a departure from the whole popup ends the hover session.
    if (this.popup().nativeElement.contains(e.relatedTarget as Node | null)) return;
    // Focus moving into an open submenu keeps its trigger lit.
    if (this.submenus.holding()) return;
    this.hover.setActiveIndex(null);
  }

  protected ariaChecked(o: MenuItemRenderOptions): string | null {
    if (o.checkbox) return String(!!o.checked);
    if (o.radio) return String(this.checkedIndex() === o.value);
    return null;
  }

  /** A row activated by click: run its handler, then close the whole menu
   *  unless the row keeps it open. */
  protected activate(o: MenuItemRenderOptions, e: Event) {
    if (o.disabled) return;
    o.onActivate?.(e);
    if (o.closeOnClick) this.menuCtx.root.setOpen(false);
  }

  /** Enter and Space activate the focused row, like a click. */
  protected onRowKeydown(o: MenuItemRenderOptions, e: KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (o.disabled) return;
    e.preventDefault();
    this.activate(o, e);
  }
}

@Component({
  selector: 'ff-dropdown-content',
  imports: POPUP_IMPORTS,
  providers: [
    { provide: DROPDOWN_CONTEXT, useFactory: () => inject(DropdownContent).context },
    { provide: DROPDOWN_SEARCH_HOST, useFactory: () => inject(DropdownContent).search.host },
    { provide: SURFACE_LEVEL, useFactory: () => inject(DropdownContent).surface },
    // Rows rendered by projected content (a submenu trigger) reach the menu
    // primitive through the host.
    { provide: MENU_COMPONENT, useFactory: () => inject(DropdownContent).menu() },
  ],
  host: { style: 'display: contents' },
  template: POPUP_TEMPLATE,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownContent extends DropdownPopupBase {
  /** Side of the trigger the popup prefers. */
  readonly side = input<PopupSide>('bottom');
  /** Alignment against the trigger. */
  readonly align = input<PopupAlign>('start');
  /** Gap to the trigger, in px. */
  readonly sideOffset = input(6);
  /** Shift along the trigger edge, in px. */
  readonly alignOffset = input(0);

  protected readonly placement = computed<PopupPlacement>(() => ({
    side: this.side(),
    align: this.align(),
    sideOffset: this.sideOffset(),
    alignOffset: this.alignOffset(),
  }));
}

// ---------------------------------------------------------------------------
// DropdownSub, DropdownSubTrigger, DropdownSubContent (submenus)
//
//   <ff-dropdown-sub>
//     <ff-dropdown-sub-trigger [index]="2" icon="palette" label="Theme" />
//     <ff-dropdown-sub-content [checkedIndex]="theme()">
//       <ff-menu-item [index]="0" label="Light" ... />
//     </ff-dropdown-sub-content>
//   </ff-dropdown-sub>
//
// The menu primitive owns hover-to-open, → / ← and Escape. DropdownSub gives
// its content its own open state, so DropdownSubContent is the same popup as
// DropdownContent, beside its trigger row instead of below a trigger. The
// trigger is a MenuItem with a trailing chevron, indexed among its parent's
// rows; the submenu's rows index from 0 again.
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-dropdown-sub',
  providers: [{ provide: DROPDOWN_MENU_CONTEXT, useExisting: DropdownSub }],
  host: { style: 'display: contents' },
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownSub implements DropdownMenuContext {
  /** Controlled open state. Bind with `[(open)]`, or `[open]` + `(openChange)`. */
  readonly openInput = input<boolean | undefined>(undefined, { alias: 'open' });
  /** Initial open state when `open` is not bound. */
  readonly defaultOpen = input(false, { transform: booleanAttribute });
  /** The submenu opened or closed (React `onOpenChange`). */
  readonly openChange = output<boolean>();

  readonly sub = true;
  private readonly parent = inject(DROPDOWN_MENU_CONTEXT, { skipSelf: true });
  readonly root = this.parent.root;
  private readonly state = createControllableOpen(this.openInput, this.defaultOpen, (next) =>
    this.openChange.emit(next),
  );
  /** Open, and never while the menu it opens from is closed. */
  readonly open = computed(() => this.state.value() && this.parent.open());
  /** The trigger row's menu-item primitive (registered by the sub trigger). */
  readonly triggerItem = signal<AriaMenuItem<unknown> | null>(null);
  readonly anchor = computed(() => this.triggerItem()?.element ?? null);
  private readonly content = signal<DropdownPopupBase | null>(null);
  /** The submenu's menu primitive, for the trigger row's `[submenu]`. */
  readonly submenu = computed(() => this.content()?.menu());
  /** The popup this submenu renders (null until it is created). */
  readonly popupContent = this.content.asReadonly();
  private readonly childSubs = childRegistry();
  readonly children = this.childSubs.children;
  readonly registerChild = this.childSubs.registerChild;
  /** Set when the trigger row opens the submenu from the keyboard (→,
   *  Enter, Space): the popup then focuses its first row. */
  keyboardOpen = false;

  constructor() {
    inject(DestroyRef).onDestroy(this.parent.registerChild(this));
    // The menu closing closes its submenus.
    effect(() => {
      if (!this.parent.open()) untracked(() => this.state.set(false));
    });
    // Keep the primitive's expanded state and ours in step. A change the
    // primitive made (hover, →, ←, Escape) is reported as an open request;
    // otherwise (our state changed, a controlled state holding, the first
    // sync) the primitive follows our state.
    let lastExpanded: boolean | null = null;
    effect(() => {
      const item = this.triggerItem();
      if (!item) {
        lastExpanded = null;
        return;
      }
      const expanded = !!item.expanded();
      this.open();
      untracked(() => {
        if (lastExpanded !== null && expanded !== lastExpanded) this.state.set(expanded);
        const target = this.open();
        // The pattern's own open, not the directive's: that one also picks the
        // submenu's first row, which only a keyboard open should do.
        if (!!item.expanded() !== target) target ? item._pattern.open() : item._pattern.close();
        lastExpanded = !!item.expanded();
      });
    });
  }

  setOpen(next: boolean) {
    this.state.set(next);
  }

  registerContent(content: DropdownPopupBase) {
    this.content.set(content);
    return () => {
      if (untracked(this.content) === content) this.content.set(null);
    };
  }
}

/** Registers a submenu trigger row's menu-item primitive with its submenu
 *  and announces the popup it opens as a menu. Internal. */
@Directive({
  selector: '[ffDropdownSubTriggerRow]',
  host: { '[attr.aria-haspopup]': '"menu"', '(keydown)': 'onKeydown($event)' },
})
export class DropdownSubTriggerRow {
  private readonly sub = inject(DropdownSub);
  private readonly dir = inject(Directionality);

  protected onKeydown(e: KeyboardEvent) {
    const expand = this.dir.valueSignal() === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    if (this.sub.open()) return;
    if (e.key === expand || e.key === 'Enter' || e.key === ' ') this.sub.keyboardOpen = true;
  }

  constructor() {
    const item = inject<AriaMenuItem<unknown>>(AriaMenuItem, { self: true });
    const sub = this.sub;
    sub.triggerItem.set(item);
    inject(DestroyRef).onDestroy(() => {
      if (untracked(sub.triggerItem) === item) sub.triggerItem.set(null);
    });
  }
}

@Component({
  selector: 'ff-dropdown-sub-trigger',
  imports: [MenuItem, AriaMenuItem, DropdownSubTriggerRow, MenuItemRow, NgTemplateOutlet, Icon],
  providers: [{ provide: DROPDOWN_CONTEXT, useFactory: () => inject(DropdownSubTrigger).context }],
  host: { style: 'display: contents' },
  template: `
    <!-- The row renders through the parent's MenuItem, wrapped in the
         submenu-trigger primitive instead of a plain item. -->
    <ng-template #primitive let-o>
      <div
        ngMenuItem
        ffDropdownSubTriggerRow
        [ffMenuItemRow]="o"
        role="menuitem"
        [value]="o.value"
        [disabled]="!!o.disabled"
        [searchTerm]="o.label"
        [submenu]="sub.submenu()"
        [attr.data-disabled]="o.disabled ? '' : null"
      >
        <ng-container [ngTemplateOutlet]="o.content" />
        <!-- The trailing chevron lights with the row, like the leading icon. -->
        <span aria-hidden="true" class="inline-grid shrink-0 rtl:-scale-x-100">
          <ff-icon name="chevron-right" [size]="size().icon" [strokeWidth]="lit() ? 2 : 1.5" [class]="chevronClass()" />
        </span>
      </div>
    </ng-template>
    <ff-menu-item [index]="index()" [label]="label()" [icon]="icon()" [disabled]="disabled()" [class]="userClass()" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownSubTrigger {
  /** Position among the parent menu's rows. */
  readonly index = input.required<number>();
  readonly label = input.required<string>();
  /** Leading icon. A chevron always trails the row. */
  readonly icon = input<IconName | IconDefinition | undefined>(undefined);
  /** Disables the row and its submenu. */
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly userClass = input('', { alias: 'class' });

  private readonly parent = inject(DROPDOWN_CONTEXT, { skipSelf: true });
  protected readonly sub = inject(DropdownSub);
  protected readonly size = injectSize();
  private readonly primitive = viewChild<TemplateRef<MenuItemTemplateContext>>('primitive');
  protected readonly lit = computed(() => this.parent.activeIndex() === this.index());
  protected readonly chevronClass = computed(() =>
    cn('transition-[color,stroke-width] duration-80', this.lit() ? 'text-foreground' : 'text-muted-foreground'),
  );

  readonly context: DropdownContextValue = { ...this.parent, menuItemTemplate: this.primitive };

  constructor() {
    // Reports the submenu opening and closing to the parent popup, which
    // keeps this row lit meanwhile.
    effect((onCleanup) => {
      const open = this.sub.open();
      const index = this.index();
      const report = this.parent.onSubmenuOpenChange;
      if (!open || !report) return;
      untracked(() => report(index, true));
      onCleanup(() => report(index, false));
    });
  }
}

/** The submenu popup: DropdownContent beside its trigger row, the first row
 *  level with the trigger. It opens toward the reading direction's end. The
 *  side stays physical so the enter choreography, keyed on `data-side`,
 *  still applies. */
@Component({
  selector: 'ff-dropdown-sub-content',
  imports: POPUP_IMPORTS,
  providers: [
    { provide: DROPDOWN_CONTEXT, useFactory: () => inject(DropdownSubContent).context },
    { provide: DROPDOWN_SEARCH_HOST, useFactory: () => inject(DropdownSubContent).search.host },
    { provide: SURFACE_LEVEL, useFactory: () => inject(DropdownSubContent).surface },
    { provide: MENU_COMPONENT, useFactory: () => inject(DropdownSubContent).menu() },
  ],
  host: { style: 'display: contents' },
  template: POPUP_TEMPLATE,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownSubContent extends DropdownPopupBase {
  /** Distance from the trigger row, in px. The default leaves a 2px gap past
   *  the menu's padding. */
  readonly sideOffset = input(SUBMENU_SIDE_OFFSET);
  /** Shift along the trigger row. The default lines the first row up with it. */
  readonly alignOffset = input(SUBMENU_ALIGN_OFFSET);

  protected readonly placement = computed<PopupPlacement>(() => ({
    side: this.dir.valueSignal() === 'rtl' ? 'left' : 'right',
    align: 'start',
    sideOffset: this.sideOffset(),
    alignOffset: this.alignOffset(),
  }));
}
