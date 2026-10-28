import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  InjectionToken,
  type Signal,
  afterEveryRender,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { LISTBOX, Listbox, Option } from '@angular/aria/listbox';
import { animate } from 'motion';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  cn,
  Icon,
  type IconDefinition,
  type IconName,
  injectShape,
  shapeMap,
  SizeContext,
  injectSize,
  type SizeVariant,
  SURFACE_LEVEL,
  surfaceClasses,
  typeClass,
  createKeyboardNavGate,
  isDisabledRow,
  popupMotionClass,
  popupScrollAreaClass,
  popupViewportClass,
} from '../core';
import { createFluidHover, type ItemRect, FluidHoverHighlight } from '../fluid-hover';
import { GroupFocusRing } from '../radio-group';
import { ScrollArea } from '../scroll-area';
import {
  createPopupOverlay,
  type PopupPlacement,
  PopupCheckedBackground,
  createPinnedSize,
  createRaisedSurface,
} from '../dropdown';

// ---------------------------------------------------------------------------
// Select
//
// @angular/aria's Listbox owns the list semantics inside the popup: role
// "listbox" / "option", aria-selected, the roving tab stop, arrow / Home /
// End navigation skipping disabled options, and typeahead. Picking is
// handled here: an option is picked (never toggled off) by click, Enter or
// Space. The CDK overlay owns positioning. This layer keeps the combobox
// trigger, the hidden form input, the fluid-hover overlays, the spring
// open/close, the selection acknowledgment, and the animated checkmark.
// ---------------------------------------------------------------------------

// How long a selection holds the popup open before closing, so the
// acknowledgment — the checkmark drawing in and the selected background
// springing to the picked row — is visible instead of being cut off by the
// ~60ms close fade. Escape and outside presses still close immediately.
const selectionAckMs = 300;

// The trigger follows the global pill/rounded shape; the popup does not.
// Like Dropdown and Combobox, the list keeps the smaller "rounded" radii
// whatever the rest of the UI is shaped: pill corners on a popover distort
// its padding and break the concentric fit of the rows' hover and selection
// backgrounds inside it.
const popupShape = shapeMap.rounded;

const placement: PopupPlacement = { side: 'bottom', align: 'start', sideOffset: 6, alignOffset: 0 };

interface SelectContextValue {
  readonly value: Signal<string>;
  readonly open: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  /** The label shown in the trigger: the selected item's text, or null. */
  readonly selectedLabel: Signal<string | null>;
  readonly trigger: Signal<HTMLElement | null>;
  readonly listboxId: Signal<string | null>;
  setTrigger(element: HTMLElement | null): void;
  setListboxId(id: string | null): void;
  registerPanel(element: HTMLElement): () => void;
  /** An item was picked: select it, then close after the acknowledgment. */
  pick(value: string): void;
  /** Open or close now (cancels a pending acknowledgment close). */
  setOpen(next: boolean): void;
  /** How the trigger was last pressed: a pointer open with nothing selected
   *  focuses the popup itself, a keyboard open the first option (Base UI). */
  readonly openInput: { keyboard: boolean };
}

const SELECT_CONTEXT = new InjectionToken<SelectContextValue>('FF_SELECT_CONTEXT');

function injectSelect(): SelectContextValue {
  const ctx = inject(SELECT_CONTEXT, { optional: true });
  if (!ctx) throw new Error('Select compound components must be inside <ff-select>');
  return ctx;
}

interface SelectContentContextValue {
  registerItem(index: number, element: HTMLElement | null): void;
  unregisterItem(index: number, element: HTMLElement): void;
  readonly activeIndex: Signal<number | null>;
  readonly checkedIndex: Signal<number | undefined>;
}

const SELECT_CONTENT_CONTEXT = new InjectionToken<SelectContentContextValue>('FF_SELECT_CONTENT_CONTEXT');

// ---------------------------------------------------------------------------
// Select (root)
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-select',
  providers: [
    { provide: SELECT_CONTEXT, useFactory: () => inject(Select).context },
    // A size input pins trigger + popup to one step of the ladder.
    { provide: SizeContext, useFactory: () => inject(Select).sizeContext },
  ],
  host: { style: 'display: contents' },
  template: `
    <ng-content />
    <!-- Base UI's hidden input: rendered named or not, clipped to 1px at
         the viewport's top-left corner. -->
    <input
      aria-hidden="true"
      tabindex="-1"
      style="clip-path: inset(50%); overflow: hidden; white-space: nowrap; border: 0; padding: 0; width: 1px; height: 1px; margin: 0; position: fixed; top: 0; left: 0"
      [attr.name]="name() ?? null"
      [value]="value()"
      [required]="required()"
      [disabled]="disabled()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Select {
  /** Controlled selected value. Bind with `[(value)]`, or `[value]` + `(valueChange)`. */
  readonly valueInput = input<string | undefined>(undefined, { alias: 'value' });
  /** Uncontrolled initial value. */
  readonly defaultValue = input<string | undefined>(undefined);
  /** Disables the entire select. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Name for form submission (renders a hidden input). */
  readonly name = input<string | undefined>(undefined);
  /** Marks the select as required in forms. */
  readonly required = input(false, { transform: booleanAttribute });
  /** Pins trigger and popup to one step of the size ladder. Omitted, both
   *  follow the surrounding size provider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  /** The selected value changed (React `onValueChange`). */
  readonly valueChange = output<string>();

  readonly sizeContext = createPinnedSize(this.size);
  private readonly internalValue = linkedSignal(() => untracked(this.defaultValue) ?? '');
  /** The selected value ("" when nothing is selected). */
  readonly value = computed(() => this.valueInput() ?? this.internalValue());
  readonly open = signal(false);
  private readonly items = contentChildren(SelectItem, { descendants: true });
  private readonly trigger = signal<HTMLElement | null>(null);
  private readonly listboxId = signal<string | null>(null);
  private readonly panels = new Set<HTMLElement>();
  private readonly document = inject(DOCUMENT);
  private ackTimer: ReturnType<typeof setTimeout> | null = null;

  /** The selected item's label, resolved from the items even before the
   *  popup has ever opened. A value no item matches shows as itself. */
  readonly selectedLabel = computed(() => {
    const value = this.value();
    if (value === '') return null;
    const item = this.items().find((i) => i.value() === value);
    return item ? item.labelText() || value : value;
  });

  readonly context: SelectContextValue = {
    value: this.value,
    open: this.open.asReadonly(),
    disabled: this.disabled,
    selectedLabel: this.selectedLabel,
    trigger: this.trigger.asReadonly(),
    listboxId: this.listboxId.asReadonly(),
    setTrigger: (element) => this.trigger.set(element),
    setListboxId: (id) => this.listboxId.set(id),
    registerPanel: (element) => {
      this.panels.add(element);
      return () => this.panels.delete(element);
    },
    pick: (value) => this.pick(value),
    setOpen: (next) => this.setOpen(next),
    openInput: { keyboard: false },
  };

  constructor() {
    // Dismissal: a press outside the trigger and popup, focus moving outside
    // them, and Escape.
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
      this.document.addEventListener('keydown', onKeydown, true);
      onCleanup(() => {
        this.document.removeEventListener('pointerdown', onPointerDown, true);
        this.document.removeEventListener('focusin', onFocusIn, true);
        this.document.removeEventListener('keydown', onKeydown, true);
      });
    });

    // Closing hands focus back to the trigger when it was in the popup.
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

    inject(DestroyRef).onDestroy(() => this.cancelAckClose());
  }

  private cancelAckClose() {
    if (this.ackTimer !== null) {
      clearTimeout(this.ackTimer);
      this.ackTimer = null;
    }
  }

  // Picking an item acknowledges before closing: the close is deferred by
  // selectionAckMs so the checkmark draw and the selected background's spring
  // to the picked row are seen. Every other close reason (Escape, outside
  // press, trigger toggle, focus-out) closes immediately and cancels any
  // pending acknowledgment; re-picking within the window restarts it.
  private pick(value: string) {
    if (value !== untracked(this.value)) {
      if (untracked(this.valueInput) === undefined) this.internalValue.set(value);
      this.valueChange.emit(value);
    }
    this.cancelAckClose();
    this.ackTimer = setTimeout(() => {
      this.ackTimer = null;
      this.open.set(false);
    }, selectionAckMs);
  }

  private setOpen(next: boolean) {
    this.cancelAckClose();
    if (next && untracked(this.disabled)) return;
    this.open.set(next);
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
// SelectTrigger
// ---------------------------------------------------------------------------

export const selectTriggerVariants = cva(
  [
    'group inline-flex items-center justify-between outline-none cursor-pointer',
    'transition-all duration-80',
    'disabled:opacity-50 disabled:pointer-events-none',
    'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
  ],
  {
    variants: {
      variant: {
        bordered: 'border border-border bg-transparent text-foreground hover:bg-hover',
        borderless: 'border border-transparent bg-transparent text-foreground hover:bg-hover',
      },
    },
    defaultVariants: {
      variant: 'bordered',
    },
  },
);

export type SelectTriggerVariant = NonNullable<VariantProps<typeof selectTriggerVariants>['variant']>;

@Component({
  selector: 'ff-select-trigger',
  imports: [Icon],
  host: {
    // The consumer's class styles the button, so the host draws no box: the
    // wrapper below is the layout element.
    style: 'display: contents',
    // aria-label is forwarded to the button; the host carries no name.
    '[attr.aria-label]': 'null',
  },
  template: `
    <div class="flex flex-col gap-1">
    <button
      #button
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      [attr.aria-expanded]="select.open()"
      [attr.aria-controls]="select.open() ? select.listboxId() : null"
      [attr.aria-invalid]="error() ? true : null"
      [attr.aria-label]="ariaLabel() ?? null"
      [attr.data-popup-open]="select.open() ? '' : null"
      [attr.data-disabled]="select.disabled() ? '' : null"
      [disabled]="select.disabled()"
      [class]="buttonClass()"
      (pointerdown)="select.openInput.keyboard = false"
      (click)="select.setOpen(!select.open())"
      (keydown)="onKeydown($event)"
    >
      <span [class]="innerClass()">
        @if (icon(); as icon) {
          <ff-icon
            [name]="iconName()"
            [icon]="iconDefinition()"
            [size]="size().icon"
            [strokeWidth]="1.5"
            class="shrink-0 text-muted-foreground transition-[color,stroke-width] duration-80 group-hover:text-foreground group-hover:stroke-[2]"
          />
        }
        <!-- py-1/-my-1: truncate's overflow:hidden clips at the padding box,
             and the trimmed box excludes ascenders/descenders — the padding
             gives glyphs room while the negative margin keeps the trimmed
             layout box. -->
        <span
          data-slot="select-value"
          [attr.data-placeholder]="select.selectedLabel() === null ? '' : null"
          class="min-w-0 flex-1 text-left truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1 data-[placeholder]:text-muted-foreground"
          >{{ select.selectedLabel() ?? placeholder() }}</span
        >
      </span>
      <svg
        [attr.width]="size().icon"
        [attr.height]="size().icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="shrink-0 text-muted-foreground transition-colors duration-80 group-hover:text-foreground"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
    @if (error()) {
      <span class="text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] text-destructive pl-3">{{
        error()
      }}</span>
    }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectTrigger {
  /** Visual style of the trigger. */
  readonly variant = input<SelectTriggerVariant>('bordered');
  /** Optional icon displayed before the value. */
  readonly icon = input<IconName | IconDefinition | undefined>(undefined);
  /** Text shown when no value is selected. */
  readonly placeholder = input<string, string | undefined>('Select…', { transform: (v) => v ?? 'Select…' });
  /** Error message shown below the trigger. */
  readonly error = input<string | undefined>(undefined);
  /** Size override for the trigger alone. Prefer `size` on <ff-select> so
   *  the popup matches. */
  readonly sizeOverride = input<SizeVariant | undefined>(undefined, { alias: 'size' });
  readonly ariaLabel = input<string | undefined>(undefined, { alias: 'aria-label' });
  /** Classes for the trigger button. */
  readonly userClass = input('', { alias: 'class' });

  protected readonly select = injectSelect();
  protected readonly size = injectSize(() => this.sizeOverride());
  private readonly shape = injectShape();
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');

  protected readonly iconName = computed(() => {
    const icon = this.icon();
    return typeof icon === 'string' ? icon : undefined;
  });
  protected readonly iconDefinition = computed(() => {
    const icon = this.icon();
    return typeof icon === 'string' ? undefined : icon;
  });

  protected readonly buttonClass = computed(() => {
    const size = this.size();
    return cn(
      selectTriggerVariants({ variant: this.variant() }),
      size.control,
      size.text,
      size.px,
      size.gap,
      size.variant === 'compact' ? 'min-w-[128px]' : 'min-w-[160px]',
      this.shape().input,
      this.error() && 'border-destructive/50 hover:border-destructive/50',
      this.userClass(),
    );
  });
  protected readonly innerClass = computed(() => cn('flex items-center min-w-0 flex-1', this.size().gap));

  constructor() {
    afterNextRender(() => this.select.setTrigger(this.button().nativeElement));
    inject(DestroyRef).onDestroy(() => {
      if (untracked(this.select.trigger) === this.button().nativeElement) this.select.setTrigger(null);
    });
  }

  /** The button element. */
  get element(): HTMLButtonElement {
    return this.button().nativeElement;
  }

  protected onKeydown(e: KeyboardEvent) {
    this.select.openInput.keyboard = true;
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !this.select.open()) {
      e.preventDefault();
      this.select.setOpen(true);
    }
  }
}

// ---------------------------------------------------------------------------
// SelectContent
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-select-content',
  imports: [Listbox, ScrollArea, PopupCheckedBackground, FluidHoverHighlight, GroupFocusRing],
  providers: [
    { provide: SELECT_CONTENT_CONTEXT, useFactory: () => inject(SelectContent).context },
    { provide: SURFACE_LEVEL, useFactory: () => inject(SelectContent).surface },
    // Projected options reach the listbox primitive through the host.
    { provide: LISTBOX, useFactory: () => inject(SelectContent).listbox() },
  ],
  host: { style: 'display: contents' },
  template: `
    <div #positioner data-slot="select-positioner" class="z-50 outline-none" style="display: none">
      <div #motion [class]="motionClass">
        <div
          #popup
          ngListbox
          focusMode="roving"
          selectionMode="explicit"
          orientation="vertical"
          [softDisabled]="false"
          [value]="selectedValues()"
          [class]="popupClass()"
          (mouseenter)="onMouseEnter()"
          (mousemove)="hover.onMouseMove($event)"
          (mouseleave)="hover.onMouseLeave()"
          (click)="hover.onClick($event)"
          (focusin)="onFocusIn($event)"
          (focusout)="onFocusOut($event)"
        >
          <!-- The list scrolls inside a ScrollArea; the inner wrapper is the
               rows' offsetParent, so the overlays scroll with them. -->
          <ff-scroll-area [class]="scrollAreaClass" [viewportClass]="viewportClass" thumbSizing="track">
            <div #list class="relative flex flex-col p-1">
              <!-- The selected background and the focus ring are torn down as
                   the close begins rather than exit-animated, so a reopen
                   never springs them over from the previous row. The popup's
                   own fade covers their disappearance. -->
              @if (select.open()) {
                <ff-popup-checked-background [rect]="checkedRect()" />
              }
              <ff-fluid-hover-highlight [hover]="hover" [hidden]="!select.open()" [class]="shape.bg" />
              @if (select.open()) {
                <ff-group-focus-ring [rect]="focusRect()" [class]="shape.focusRing" />
              }
              <ng-content />
            </div>
          </ff-scroll-area>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectContent {
  /** Additional classes for the menu container. */
  readonly userClass = input('', { alias: 'class' });

  protected readonly select = injectSelect();
  protected readonly shape = popupShape;
  protected readonly motionClass = popupMotionClass;
  protected readonly scrollAreaClass = popupScrollAreaClass;
  protected readonly viewportClass = cn(popupViewportClass, 'scroll-fade');
  private readonly document = inject(DOCUMENT);

  /** The listbox primitive of the popup. */
  readonly listbox = viewChild.required<Listbox<string>>(Listbox);
  private readonly positioner = viewChild.required<ElementRef<HTMLElement>>('positioner');
  private readonly motion = viewChild.required<ElementRef<HTMLElement>>('motion');
  private readonly popup = viewChild.required<ElementRef<HTMLElement>>('popup');
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private readonly items = contentChildren(SelectItem, { descendants: true });

  readonly surface = createRaisedSurface(2);
  readonly hover = createFluidHover(() => this.list()?.nativeElement, { isItemDisabled: isDisabledRow });
  // Keyboard focus ring gate: seeded from the trigger's :focus-visible at
  // open, earned by navigation keys inside the popup.
  private readonly navGate = createKeyboardNavGate(this.select.open);
  private readonly checkedIndex = signal<number | undefined>(undefined);
  private readonly focusedIndex = signal<number | null>(null);

  private readonly overlay = createPopupOverlay({
    positioner: () => this.positioner()?.nativeElement,
    motion: () => this.motion()?.nativeElement,
    anchor: () => this.select.trigger(),
    placement: () => placement,
  });

  protected readonly selectedValues = computed(() => {
    const value = this.select.value();
    return value === '' ? [] : [value];
  });

  // Overlays read rects only once the item set is fully measured. Positioning
  // one from an incomplete pass mounts it at the wrong row, and the
  // correcting pass then springs it across the list.
  protected readonly checkedRect = computed<ItemRect | null>(() => {
    const index = this.checkedIndex();
    return this.hover.isMeasured() && index != null ? (this.hover.itemRects()[index] ?? null) : null;
  });
  protected readonly focusRect = computed<ItemRect | null>(() => {
    const index = this.focusedIndex();
    return this.hover.isMeasured() && index !== null ? (this.hover.itemRects()[index] ?? null) : null;
  });

  protected readonly popupClass = computed(() =>
    cn(
      // min-w tracks the trigger through --anchor-width.
      `flex flex-col min-w-[var(--anchor-width)] max-h-[min(300px,var(--available-height))] overflow-hidden ${popupShape.container} select-none outline-none`,
      surfaceClasses(this.surface(), 3),
      this.userClass(),
    ),
  );

  readonly context: SelectContentContextValue = {
    registerItem: this.hover.registerItem,
    unregisterItem: this.hover.unregisterItem,
    activeIndex: this.hover.activeIndex,
    checkedIndex: this.checkedIndex.asReadonly(),
  };

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const popup = this.popup().nativeElement;
      popup.addEventListener('keydown', this.onKeyDownCapture, { capture: true });
      popup.addEventListener('click', this.onClickCapture, { capture: true });
      const unregister = this.select.registerPanel(this.positioner().nativeElement);
      this.select.setListboxId(this.listbox().id());
      destroyRef.onDestroy(() => {
        popup.removeEventListener('keydown', this.onKeyDownCapture, { capture: true });
        popup.removeEventListener('click', this.onClickCapture, { capture: true });
        unregister();
      });
    });

    let frames: number[] = [];
    const cancelFrames = () => {
      frames.forEach((id) => cancelAnimationFrame(id));
      frames = [];
    };
    const afterLayout = (fn: () => void) => {
      // Double rAF: the first waits for the open to render, the second for
      // layout.
      const outer = requestAnimationFrame(() => {
        const inner = requestAnimationFrame(() => {
          frames = frames.filter((id) => id !== inner);
          fn();
        });
        frames.push(inner);
      });
      frames.push(outer);
    };

    effect(() => {
      const open = this.select.open();
      if (!this.select.trigger()) return;
      untracked(() => {
        cancelFrames();
        if (!open) {
          // Reset every overlay index as the close begins, so a reopen never
          // starts with the previous row's highlight or selection marker.
          this.checkedIndex.set(undefined);
          this.hover.setActiveIndex(null);
          this.focusedIndex.set(null);
          this.overlay.hide();
          return;
        }
        this.overlay.show();
        // The rows stay registered while the popup sits hidden between
        // opens: re-measure once it is laid out.
        this.hover.remeasure();
        // Open on the selected option. With nothing selected, a keyboard
        // open lands on the first enabled option and a pointer open on the
        // listbox itself, so no row lights up under a pointer that is still
        // on the trigger (Base UI).
        afterLayout(() => {
          const list = this.list().nativeElement;
          if (list.contains(this.document.activeElement)) return;
          const rows = Array.from(list.querySelectorAll<HTMLElement>('[role="option"]'));
          const value = this.select.value();
          const target =
            rows.find((r) => r.getAttribute('data-value') === value && !isDisabledRow(r)) ??
            (this.select.openInput.keyboard ? rows.find((r) => !isDisabledRow(r)) : undefined);
          (target ?? this.popup().nativeElement).focus();
        });
      });
    });

    // Detect the checked row once the popup is laid out. Deliberately does
    // NOT remeasure on a value change while open: the rows haven't moved, so
    // only checkedIndex switches — which lets the selected marker spring from
    // the old row to the picked one (the selection acknowledgment).
    effect(() => {
      const open = this.select.open();
      const value = this.select.value();
      if (!open) return;
      untracked(() =>
        afterLayout(() => {
          const rows = Array.from(this.list().nativeElement.querySelectorAll<HTMLElement>('[data-fluid-hover-index]'));
          const index = rows.findIndex((el) => el.getAttribute('data-value') === value);
          this.checkedIndex.set(index !== -1 ? Number(rows[index].getAttribute('data-fluid-hover-index')) : undefined);
        }),
      );
    });

    destroyRef.onDestroy(() => {
      cancelFrames();
      this.overlay.dispose();
    });
  }

  private optionOf(target: EventTarget | null): HTMLElement | null {
    const option = (target as HTMLElement | null)?.closest?.<HTMLElement>('[role="option"]') ?? null;
    return option && this.popup().nativeElement.contains(option) ? option : null;
  }

  // Picking is ours, not the listbox's: its single-selection toggles an
  // option off when picked again, and a select never deselects. Capture
  // phase, so the listbox never sees the events picking handles.
  private readonly onClickCapture = (e: MouseEvent) => {
    const option = this.optionOf(e.target);
    if (!option) return;
    e.stopPropagation();
    if (isDisabledRow(option)) return;
    const value = option.getAttribute('data-value');
    if (value !== null) this.select.pick(value);
  };

  private readonly onKeyDownCapture = (e: KeyboardEvent) => {
    // The nav flag must be set before the listbox moves focus.
    this.navGate.trackKeyboardNav(e);
    // The listbox itself holds focus after a pointer open with nothing
    // selected: the arrows start from an end, not from the listbox's
    // roving item (Base UI).
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target === this.popup().nativeElement) {
      const rows = Array.from(this.list().nativeElement.querySelectorAll<HTMLElement>('[role="option"]')).filter(
        (r) => !isDisabledRow(r),
      );
      const target = e.key === 'ArrowDown' ? rows[0] : rows.at(-1);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      target.focus();
      return;
    }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const option = this.optionOf(e.target);
    if (!option) return;
    e.preventDefault();
    e.stopPropagation();
    if (isDisabledRow(option)) return;
    const value = option.getAttribute('data-value');
    if (value !== null) this.select.pick(value);
  };

  protected onMouseEnter() {
    this.hover.onMouseEnter();
    this.focusedIndex.set(null);
  }

  protected onFocusIn(e: FocusEvent) {
    const target = e.target as HTMLElement;
    const row = target.closest?.('[data-fluid-hover-index]');
    if (!row || !this.popup().nativeElement.contains(row)) return;
    // Keep the listbox's roving item in step with a row focused by something
    // other than its own navigation (a click, the open focus).
    const item = this.items().find((i) => i.rowElement() === row);
    const listbox = this.listbox();
    if (item && listbox._pattern.inputs.activeItem() !== item.option()._pattern) {
      listbox._pattern.listBehavior.goto(item.option()._pattern, { focusElement: false });
    }
    const index = Number(row.getAttribute('data-fluid-hover-index'));
    this.hover.setActiveIndex(index);
    this.focusedIndex.set(this.navGate.keyboardNav.current && target.matches(':focus-visible') ? index : null);
  }

  protected onFocusOut(e: FocusEvent) {
    // Only a departure from the whole popup ends the hover session.
    if (this.popup().nativeElement.contains(e.relatedTarget as Node | null)) return;
    this.focusedIndex.set(null);
    this.hover.setActiveIndex(null);
  }
}

// ---------------------------------------------------------------------------
// SelectItem
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-select-item',
  imports: [Option, Icon],
  host: { style: 'display: contents' },
  template: `
    <div
      #row
      ngOption
      [value]="value()"
      [disabled]="disabled()"
      [label]="labelText()"
      [attr.data-fluid-hover-index]="index()"
      [attr.data-value]="value()"
      [attr.data-selected]="isChecked() ? '' : null"
      [attr.data-disabled]="disabled() ? '' : null"
      [class]="rowClass()"
    >
      @if (icon()) {
        <ff-icon
          [name]="iconName()"
          [icon]="iconDefinition()"
          [size]="size().icon"
          [strokeWidth]="lit() ? 2 : 1.5"
          class="shrink-0 transition-[color,stroke-width] duration-80"
        />
      }
      <!-- py-1/-my-1 keeps truncate's overflow:hidden from clipping
           ascenders/descenders outside the trimmed box. -->
      <span #text class="flex-1 min-w-0 truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1"><ng-content /></span>
      <!-- Always-rendered fixed slot so the check appearing/disappearing never
           changes the row's intrinsic width — without it the whole popup
           resizes when a selection lands. -->
      <span aria-hidden="true" [class]="slotClass()">
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
            class="text-foreground"
          >
            <!-- pathLength="1" with dash "1 1" is a drawn stroke as motion
                 writes it (React's motion.path at pathLength 1): the exit
                 animates from it, and a draw-in resets the dash to "0 1". -->
            <path #checkPath d="M4 12L9 17L20 6" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="0" />
          </svg>
        }
      </span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectItem {
  /** Position index within the content for fluid hover. */
  readonly index = input.required<number>();
  /** Unique value for this option. */
  readonly value = input.required<string>();
  /** Optional icon displayed before the label. */
  readonly icon = input<IconName | IconDefinition | undefined>(undefined);
  /** Disables this individual item. */
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly userClass = input('', { alias: 'class' });

  private readonly select = injectSelect();
  private readonly content = inject(SELECT_CONTENT_CONTEXT);
  protected readonly size = injectSize();
  private readonly row = viewChild.required<ElementRef<HTMLElement>>('row');
  private readonly text = viewChild.required<ElementRef<HTMLElement>>('text');
  private readonly checkPath = viewChild<ElementRef<SVGPathElement>>('checkPath');
  /** The option primitive on the row. */
  readonly option = viewChild.required<Option<string>>(Option);

  /** The item's text, read from its projected content (the trigger label and
   *  the typeahead term). */
  readonly labelText = signal('');

  protected readonly isActive = computed(() => this.content.activeIndex() === this.index());
  protected readonly isChecked = computed(() => this.select.value() === this.value());
  protected readonly lit = computed(() => this.isActive() || this.isChecked());

  protected readonly iconName = computed(() => {
    const icon = this.icon();
    return typeof icon === 'string' ? icon : undefined;
  });
  protected readonly iconDefinition = computed(() => {
    const icon = this.icon();
    return typeof icon === 'string' ? undefined : icon;
  });

  protected readonly rowClass = computed(() => {
    const size = this.size();
    return cn(
      // Fixed height so the text-box trim on the item text doesn't shrink the
      // row. shrink-0: the popup is a max-height flex column, so without it a
      // long list compresses rows to fit instead of scrolling.
      `relative z-10 flex ${size.control} shrink-0 items-center ${size.gap} ${popupShape.item} ${size.itemPx} ${size.text} cursor-pointer outline-none select-none`,
      'transition-[color] duration-80',
      this.lit() ? 'text-foreground' : 'text-muted-foreground',
      this.disabled() && 'opacity-50 pointer-events-none',
      this.userClass(),
    );
  });
  protected readonly slotClass = computed(() =>
    cn('shrink-0', this.size().variant === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'),
  );

  /** The row element (role="option"). */
  rowElement(): HTMLElement {
    return this.row().nativeElement;
  }

  // The check mark: mounted while checked and through its exit stroke. A row
  // checked at mount shows the finished check instead of drawing it, so
  // default selections don't animate on page load.
  protected readonly checkMounted = signal(false);
  private drawPending = false;
  private checkAnimation: { stop(): void } | null = null;

  constructor() {
    afterEveryRender(() => {
      const text = this.text().nativeElement.textContent?.trim() ?? '';
      if (text !== untracked(this.labelText)) this.labelText.set(text);
    });

    let initial = true;
    effect(() => {
      const on = this.isChecked();
      untracked(() => {
        const firstRun = initial;
        initial = false;
        if (on) {
          this.checkAnimation?.stop();
          this.checkAnimation = null;
          const path = this.checkPath()?.nativeElement;
          if (this.checkMounted() && path) {
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
            if (this.checkAnimation === controls && !this.isChecked()) {
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

    // Fluid hover registration at this item's index.
    effect((onCleanup) => {
      const element = this.row().nativeElement;
      const index = this.index();
      untracked(() => this.content.registerItem(index, element));
      onCleanup(() => this.content.unregisterItem(index, element));
    });
  }
}

// ---------------------------------------------------------------------------
// SelectGroup + SelectLabel + SelectSeparator
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-select-group',
  // Group, label and separator display as blocks by a host style, so their
  // class lists stay React's.
  host: { role: 'group', style: 'display: block', '[class]': 'hostClass()' },
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectGroup {
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() => cn(this.userClass()));
}

@Component({
  selector: 'ff-select-label',
  host: { style: 'display: block', '[class]': 'hostClass()' },
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectLabel {
  readonly userClass = input('', { alias: 'class' });
  private readonly size = injectSize();
  // Group labels are the caption role of the type scale.
  protected readonly hostClass = computed(() =>
    cn(
      'px-2 py-1.5 shrink-0 text-muted-foreground',
      typeClass('caption', this.size().variant === 'compact' ? 'compact' : 'default'),
      this.userClass(),
    ),
  );
}

@Component({
  selector: 'ff-select-separator',
  host: { role: 'separator', style: 'display: block', '[class]': 'hostClass()' },
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectSeparator {
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() => cn('my-1 -mx-1 h-px shrink-0 bg-border/60', this.userClass()));
}
