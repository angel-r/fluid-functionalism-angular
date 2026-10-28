import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  InjectionToken,
  type Signal,
  type TemplateRef,
  afterRenderEffect,
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
import { animate } from 'motion';
import {
  cn,
  fontWeights,
  shapeMap,
  injectSize,
  Icon,
  type IconDefinition,
  type IconName,
} from '@angel-r/fluid-functionalism-angular/core';
import { FLUID_HOVER } from '@angel-r/fluid-functionalism-angular/fluid-hover';

// MenuItem is only used inside Dropdown, which opts out of the global pill
// shape — see the dropdown for the rationale.
const shape = shapeMap.rounded;

// ---------------------------------------------------------------------------
// Dropdown context — the single shared context for every Dropdown build.
//
// It lives here rather than in the dropdown module so that MenuItem stays
// primitive-free and self-contained: the inline panel, the popup menu and a
// submenu each provide this same token, and MenuItem resolves whichever
// provider actually wraps it.
// ---------------------------------------------------------------------------

/** What MenuItem hands to the popup's primitive template (the React
 *  `renderMenuItem` options). The template renders the styled row with
 *  `[ffMenuItemRow]="options"` on the element its menu-item primitive sits
 *  on, and the row content with `<ng-container [ngTemplateOutlet]="options.content" />`. */
export interface MenuItemRenderOptions {
  /** Radio-style option (boolean `checked` on MenuItem) vs plain action item. */
  radio: boolean;
  /** Checkbox-style option: a boolean `checked` inside a multiple-selection
   *  dropdown (`checkedIndices`). Takes precedence over `radio`. */
  checkbox: boolean;
  /** The item's checked state (radio and checkbox items). */
  checked?: boolean;
  /** The item's index — doubles as the radio value. */
  value: number;
  disabled?: boolean;
  label: string;
  closeOnClick: boolean;
  /** The ARIA role the primitive should carry, resolved from radio/checkbox. */
  role: 'menuitem' | 'menuitemradio' | 'menuitemcheckbox';
  /** The row's activation (emits `select`). The dropdown hands it to its
   *  primitive's activation, which keyboard activation also calls. Absent
   *  on a disabled row. */
  onActivate?: (e?: Event) => void;
  /** The styled row's classes (visuals; `[ffMenuItemRow]` applies them). */
  className: string;
  /** The row content: icon, label, check. */
  content: TemplateRef<unknown>;
  /** The item itself; `[ffMenuItemRow]` registers the row element through it. */
  item: MenuItem;
}

/** Context of the primitive template: `let-options` is the render options. */
export interface MenuItemTemplateContext {
  $implicit: MenuItemRenderOptions;
}

export interface DropdownContextValue {
  registerItem(index: number, element: HTMLElement | null): void;
  /** Unregisters `element` from `index` only if it still holds that slot
   *  (the fluid hover controller's `unregisterItem`). */
  unregisterItem(index: number, element: HTMLElement): void;
  readonly activeIndex: Signal<number | null>;
  readonly checkedIndex?: Signal<number | undefined>;
  /** Multiple selection (`checkedIndices` on the dropdown): rows are
   *  checkbox items and activating one keeps the menu open by default. */
  readonly multiple?: Signal<boolean>;
  readonly checkedIndices?: Signal<readonly number[] | undefined>;
  /** True when items render inside a menu popup, where the primitive owns
   *  roles, roving highlight, typeahead, and activation. */
  readonly inMenu?: boolean;
  /** Popup-only: wraps a MenuItem's styled row in the dropdown's menu-item
   *  primitive (the React `renderMenuItem`). Absent in the inline panel,
   *  where MenuItem renders its own ARIA menuitem row. */
  readonly menuItemTemplate?: Signal<TemplateRef<MenuItemTemplateContext> | undefined>;
  /** Popup-only: a submenu trigger reports its submenu opening and closing
   *  here, so the menu keeps that row lit while the pointer crosses over. */
  onSubmenuOpenChange?(index: number, open: boolean): void;
}

export const DROPDOWN_CONTEXT = new InjectionToken<DropdownContextValue>('FF_DROPDOWN_CONTEXT');

/** Null-safe context read for callers that render outside a provider. */
export function injectDropdownMaybe(): DropdownContextValue | null {
  return inject(DROPDOWN_CONTEXT, { optional: true });
}

export function injectDropdown(): DropdownContextValue {
  const ctx = injectDropdownMaybe();
  if (!ctx) throw new Error('injectDropdown() must be used within a Dropdown');
  return ctx;
}

/**
 * The context MenuItem reads: the dropdown's, or — so rows can stand alone in
 * a static list — the enclosing `[ffFluidHover]` list's hover state with no
 * checked rows. React has only the first and throws without it.
 */
function injectMenuItemContext(): DropdownContextValue {
  const ctx = injectDropdownMaybe();
  if (ctx) return ctx;
  const hover = inject(FLUID_HOVER, { optional: true });
  if (hover) {
    return {
      registerItem: hover.registerItem,
      unregisterItem: hover.unregisterItem,
      activeIndex: hover.activeIndex,
    };
  }
  throw new Error('ff-menu-item must be used within a Dropdown (or an [ffFluidHover] list)');
}

const optionalBoolean = (value: boolean | '' | undefined | null) =>
  value === '' ? true : (value ?? undefined);

/**
 * A dropdown row: optional icon, label, and a check that draws in when the
 * row is checked. Inline it is its own ARIA menuitem row; inside a popup the
 * dropdown's primitive template wraps it (see `MenuItemRenderOptions`).
 */
@Component({
  selector: 'ff-menu-item',
  imports: [Icon, NgTemplateOutlet],
  host: { style: 'display: contents' },
  template: `
    <ng-template #content>
      @if (hasIcon()) {
        <span class="inline-grid">
          <span class="col-start-1 row-start-1 invisible">
            <ff-icon [name]="iconName()" [icon]="iconDefinition()" [size]="size().icon" [strokeWidth]="2" />
          </span>
          <ff-icon
            [name]="iconName()"
            [icon]="iconDefinition()"
            [size]="size().icon"
            [strokeWidth]="lit() ? 2 : 1.5"
            [class]="iconClass()"
          />
        </span>
      }
      <!-- Both stacked spans carry the text-box trim so the invisible bold
           sizer and the visible label keep identical boxes. -->
      <span [class]="labelGridClass()">
        <span
          class="col-start-1 row-start-1 invisible [text-box:trim-both_cap_alphabetic]"
          [style.font-variation-settings]="semibold"
          aria-hidden="true"
          >{{ label() }}</span
        >
        <span [class]="labelClass()" [style.font-variation-settings]="labelWeight()">{{ label() }}</span>
      </span>
      @if (checkMounted()) {
        <svg
          [attr.width]="size().icon"
          [attr.height]="size().icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-foreground shrink-0"
        >
          <!-- pathLength="1" with dash "1 1" is a drawn stroke as motion
               writes it (React's motion.path at pathLength 1): the exit
               animates from it, and a draw-in resets the dash to "0 1". -->
          <path #checkPath d="M4 12L9 17L20 6" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="0" />
        </svg>
      }
    </ng-template>

    @if (primitiveTemplate(); as tpl) {
      <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="templateContext(content)" />
    } @else {
      <div
        #row
        [attr.data-fluid-hover-index]="index()"
        [attr.tabindex]="tabIndex()"
        [attr.role]="renderOptions().role"
        [attr.aria-checked]="checked() ?? null"
        [attr.aria-disabled]="disabled() || null"
        [attr.aria-label]="label()"
        [class]="itemClass()"
        (click)="activate($event)"
        (keydown)="onKeydown($event)"
      >
        <ng-container [ngTemplateOutlet]="content" />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuItem {
  /** Optional leading icon: a slot name from the icon map, or an icon
   *  definition. When omitted the row is text-only, with no icon column. */
  readonly icon = input<IconName | IconDefinition | undefined>(undefined);
  readonly label = input.required<string>();
  readonly index = input.required<number>();
  /** A boolean makes a radio row (`menuitemradio` + `aria-checked`), or a
   *  checkbox row under `checkedIndices`. Undefined: a plain action item. */
  readonly checked = input<boolean | undefined, boolean | '' | undefined | null>(undefined, {
    transform: optionalBoolean,
  });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Popup only: whether activating the item closes the menu.
   *  Defaults to true, or false under `checkedIndices`. */
  readonly closeOnClick = input<boolean | undefined, boolean | '' | undefined | null>(undefined, {
    transform: optionalBoolean,
  });
  readonly userClass = input('', { alias: 'class' });
  /** The row was activated: click, Enter or Space (the React `onSelect`). */
  readonly select = output<void>();

  private readonly ctx = injectMenuItemContext();
  protected readonly size = injectSize();
  protected readonly semibold = fontWeights.semibold;

  private readonly rowRef = viewChild<ElementRef<HTMLElement>>('row');
  private readonly checkPath = viewChild<ElementRef<SVGPathElement>>('checkPath');
  /** The row element the popup primitive renders (set by `[ffMenuItemRow]`). */
  private readonly popupRow = signal<HTMLElement | null>(null);

  protected readonly primitiveTemplate = computed(() => this.ctx.menuItemTemplate?.());
  private readonly multiple = computed(() => this.ctx.multiple?.() ?? false);
  private readonly isCheckbox = computed(() => this.multiple() && typeof this.checked() === 'boolean');
  protected readonly isActive = computed(() => this.ctx.activeIndex() === this.index());
  protected readonly lit = computed(() => this.isActive() || !!this.checked());

  protected readonly hasIcon = computed(() => this.icon() !== undefined);
  protected readonly iconName = computed(() => {
    const icon = this.icon();
    return typeof icon === 'string' ? icon : undefined;
  });
  protected readonly iconDefinition = computed(() => {
    const icon = this.icon();
    return typeof icon === 'string' ? undefined : icon;
  });
  protected readonly iconClass = computed(() =>
    cn(
      'col-start-1 row-start-1 transition-[color,stroke-width] duration-80',
      this.lit() ? 'text-foreground' : 'text-muted-foreground',
    ),
  );
  protected readonly labelGridClass = computed(() => cn('inline-grid flex-1', this.size().text));
  protected readonly labelClass = computed(() =>
    cn(
      'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]',
      this.lit() ? 'text-foreground' : 'text-muted-foreground',
    ),
  );
  protected readonly labelWeight = computed(() =>
    this.checked() ? fontWeights.semibold : fontWeights.normal,
  );

  readonly itemClass = computed(() => {
    const size = this.size();
    return cn(
      // Fixed height so the text-box trim on the label doesn't shrink the
      // row. shrink-0 because menu popups are max-height flex columns —
      // without it a long list compresses rows to fit instead of scrolling.
      `relative z-10 flex ${size.control} shrink-0 items-center ${size.gap} ${shape.item} ${size.itemPx} cursor-pointer outline-none`,
      this.disabled() && 'opacity-50 pointer-events-none',
      this.userClass(),
    );
  });

  /** Disabled items are never the roving tab stop. */
  protected readonly tabIndex = computed(() => {
    const stop = this.ctx.checkedIndex?.() ?? this.ctx.checkedIndices?.()?.[0] ?? 0;
    return !this.disabled() && this.index() === stop ? 0 : -1;
  });

  readonly renderOptions = computed(() => {
    const checked = this.checked();
    const checkbox = this.isCheckbox();
    const radio = !checkbox && typeof checked === 'boolean';
    const disabled = this.disabled();
    return {
      radio,
      checkbox,
      checked,
      value: this.index(),
      disabled,
      label: this.label(),
      // Toggling one of several stays open; picking one of one closes.
      closeOnClick: this.closeOnClick() ?? !this.multiple(),
      role: checkbox ? 'menuitemcheckbox' : radio ? 'menuitemradio' : 'menuitem',
      onActivate: disabled ? undefined : () => this.select.emit(),
      className: this.itemClass(),
      item: this as MenuItem,
    } satisfies Omit<MenuItemRenderOptions, 'content'>;
  });

  private lastContext: { options: unknown; content: unknown; value: MenuItemTemplateContext } | null = null;

  /** The primitive template's context, stable while nothing changed. */
  protected templateContext(content: TemplateRef<unknown>): MenuItemTemplateContext {
    const options = this.renderOptions();
    if (this.lastContext?.options !== options || this.lastContext.content !== content) {
      this.lastContext = { options, content, value: { $implicit: { ...options, content } } };
    }
    return this.lastContext.value;
  }

  // The check mark: mounted while checked and through its exit stroke. A row
  // checked at mount shows the finished check instead of drawing it, so
  // default selections don't animate on page load.
  protected readonly checkMounted = signal(false);
  private drawPending = false;
  private checkAnimation: { stop(): void } | null = null;

  constructor() {
    let initial = true;
    effect(() => {
      const on = this.checked() === true;
      untracked(() => {
        const firstRun = initial;
        initial = false;
        if (on) {
          this.checkAnimation?.stop();
          this.checkAnimation = null;
          const path = this.checkPath()?.nativeElement;
          if (this.checkMounted() && path) {
            // Re-checked mid-exit: draw back in from where the stroke is.
            this.checkAnimation = animate(path, { pathLength: 1 }, { duration: 0.08, ease: 'easeOut' });
          } else if (!firstRun) {
            this.drawPending = true;
          }
          this.checkMounted.set(true);
        } else if (this.checkMounted()) {
          this.drawPending = false;
          const path = this.checkPath()?.nativeElement;
          if (!path) {
            this.checkMounted.set(false);
            return;
          }
          this.checkAnimation?.stop();
          const controls = animate(path, { pathLength: 0 }, { duration: 0.04, ease: 'easeIn' });
          this.checkAnimation = controls;
          controls.finished.then(() => {
            if (this.checkAnimation === controls && this.checked() !== true) {
              this.checkAnimation = null;
              this.checkMounted.set(false);
            }
          });
        }
      });
    });

    afterRenderEffect(() => {
      const path = this.checkPath()?.nativeElement;
      if (!path || !this.drawPending) return;
      this.drawPending = false;
      // Undrawn before the first paint: motion writes its first frame on the
      // next animation frame, which would show the full check for a frame.
      path.setAttribute('stroke-dasharray', '0 1');
      this.checkAnimation = animate(path, { pathLength: [0, 1] }, { duration: 0.08, ease: 'easeOut' });
    });

    // Fluid hover registration: the inline row, or the row the popup
    // primitive rendered, at this item's index.
    effect((onCleanup) => {
      const element = this.primitiveTemplate() ? this.popupRow() : (this.rowRef()?.nativeElement ?? null);
      const index = this.index();
      if (!element) return;
      untracked(() => this.ctx.registerItem(index, element));
      onCleanup(() => this.ctx.unregisterItem(index, element));
    });
  }

  /** Called by `[ffMenuItemRow]`: the element the popup primitive rendered. */
  attachRow(element: HTMLElement): () => void {
    this.popupRow.set(element);
    return () => {
      if (untracked(this.popupRow) === element) this.popupRow.set(null);
    };
  }

  protected activate(_e: MouseEvent) {
    if (this.disabled()) return;
    this.select.emit();
  }

  protected onKeydown(e: KeyboardEvent) {
    if (this.disabled()) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.select.emit();
    }
  }
}

/**
 * The styled-row half of a popup menu item: put it on the element the
 * dropdown's menu-item primitive renders, inside its `menuItemTemplate`.
 * It applies the row classes, `data-fluid-hover-index` and `aria-label`, and
 * registers the element with the list.
 */
@Directive({
  selector: '[ffMenuItemRow]',
  host: {
    '[class]': 'options().className',
    '[attr.data-fluid-hover-index]': 'options().value',
    '[attr.aria-label]': 'options().label',
  },
})
export class MenuItemRow {
  readonly options = input.required<MenuItemRenderOptions>({ alias: 'ffMenuItemRow' });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly item = computed(() => this.options().item);

  constructor() {
    effect((onCleanup) => {
      const item = this.item();
      onCleanup(untracked(() => item.attachRow(this.host)));
    });
  }
}
