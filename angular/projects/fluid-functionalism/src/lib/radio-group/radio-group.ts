import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import type { AnimationOptions } from 'motion';
import {
  cn,
  spring,
  fontWeights,
  enterTransition,
  injectAnimateFluid,
  injectShape,
  injectSize,
  type SizeVariant,
} from '../core';
import { FLUID_HOVER, createFluidHover, FluidHoverHighlight } from '../fluid-hover';
import { GroupFocusRing, createGroupFocus, focusRowOnPress, groupRows } from './group-focus';

// ---------------------------------------------------------------------------
// RadioGroup is a vertical list of RadioItem rows sharing one fluid hover
// scope. The group paints everything that spans rows: one selected background
// that springs from the old row to the new one, the hover highlight, and one
// focus ring that springs between rows. Each row is the focusable
// role="radio" element. Selection takes one of three APIs: `value` (a model,
// so `[(value)]` works) on the group, `selectedIndex` on the group, or
// `selected` + `(select)` per item.
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-radio-group',
  imports: [FluidHoverHighlight, GroupFocusRing],
  providers: [{ provide: FLUID_HOVER, useFactory: () => inject(RadioGroup).hover }],
  template: `
    <!-- One shared background springs (spring.moderate) from the old row to
         the new one instead of each row fading its own in and out. -->
    @if (selectedRect()) {
      <div
        #selectedBg
        data-slot="radio-selected-background"
        aria-hidden="true"
        [class]="'absolute ' + shape().bg + ' bg-active pointer-events-none'"
      ></div>
    }
    <ff-fluid-hover-highlight [hover]="hover" [class]="shape().bg" />
    <ff-group-focus-ring [rect]="focus.focusRect()" [class]="shape().focusRing" />
    <ng-content />
  `,
  host: {
    role: 'radiogroup',
    '[class]': 'hostClass()',
    '(mouseenter)': 'hover.onMouseEnter()',
    '(mousemove)': 'hover.onMouseMove($event)',
    '(mouseleave)': 'hover.onMouseLeave()',
    '(click)': 'hover.onClick($event)',
    '(focusin)': 'focus.onFocusIn($event)',
    '(focusout)': 'focus.onFocusOut($event)',
    '(keydown)': 'onKeydown($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioGroup {
  /** The selected item's `value`. Two-way bindable; a press on an item with a
   *  `value` writes it. A value that matches no item selects nothing. */
  readonly value = model<string | undefined>(undefined);
  /** Index of the currently selected item (when not using `value`). */
  readonly selectedIndex = input<number | undefined>(undefined);
  /** Pins the group's rows to one step of the size ladder (default 36px,
   *  compact 28px). Omitted, it follows the surrounding size provider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });
  /** Focus left the group (signal forms' touched state). */
  readonly touch = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly hover = createFluidHover(() => this.host);
  protected readonly focus = createGroupFocus(this.hover, this.host, () => this.touch.emit());
  protected readonly shape = injectShape();
  private readonly animateFluid = injectAnimateFluid();
  private readonly items = contentChildren(RadioItem, { descendants: true });
  private readonly selectedBg = viewChild<ElementRef<HTMLElement>>('selectedBg');

  /** The row index the selected background sits on; -1 when nothing matches. */
  readonly resolvedSelectedIndex = computed(() => {
    const value = this.value();
    if (value !== undefined) return this.items().find((item) => item.value() === value)?.index() ?? -1;
    return this.selectedIndex() ?? -1;
  });

  /** The index items compare against when value equality can't decide. */
  readonly contextSelectedIndex = computed(() => {
    if (this.value() !== undefined) {
      const index = this.resolvedSelectedIndex();
      return index >= 0 ? index : null;
    }
    return this.selectedIndex() ?? null;
  });

  /** Covers all three selection APIs: value, selectedIndex, per-item selected.
   *  With no selection, the first row keeps the tab stop. */
  readonly hasSelection = computed(
    () => this.resolvedSelectedIndex() >= 0 || this.items().some((item) => item.selected() === true),
  );

  protected readonly selectedRect = computed(() => {
    const index = this.resolvedSelectedIndex();
    return index >= 0 ? (this.hover.itemRects()[index] ?? null) : null;
  });

  // select-none keeps rapid clicks on rows from selecting the label text.
  protected readonly hostClass = computed(() =>
    cn('relative flex flex-col w-72 max-w-full select-none', this.userClass()),
  );

  constructor() {
    // initial={false}: a freshly mounted background is placed, not animated;
    // after that it springs between rows.
    let placed: HTMLElement | null = null;
    afterRenderEffect(() => {
      const element = this.selectedBg()?.nativeElement ?? null;
      const rect = this.selectedRect();
      untracked(() => {
        if (!element || !rect) {
          placed = null;
          return;
        }
        const target = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
        if (element !== placed) {
          placed = element;
          for (const [key, value] of Object.entries(target)) element.style.setProperty(key, `${value}px`);
          element.style.opacity = '1';
          return;
        }
        this.animateFluid(element, { ...target, opacity: 1 }, {
          ...enterTransition(spring.moderate),
          opacity: { duration: 0.08 },
        } as AnimationOptions);
      });
    });
  }

  // All four arrows move focus AND select, as native radios do, wrapping at
  // both ends; Home/End jump to the first or last row and select it.
  // Selecting goes through the row's click, so it runs the same handler as a
  // pointer press.
  protected onKeydown(e: KeyboardEvent) {
    const rows = groupRows(this.host);
    const current = rows.indexOf(e.target as HTMLElement);
    if (current === -1) return;
    let next: number;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (current + 1) % rows.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (current - 1 + rows.length) % rows.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = rows.length - 1;
    else return;
    e.preventDefault();
    rows[next]?.focus();
    rows[next]?.click();
  }
}

@Component({
  selector: 'ff-radio-item',
  template: `
    <div #circle data-slot="radio-circle" [class]="circleClass()">
      <!-- Selected: the border turns transparent and the dot alone marks the
           state. Unselected: hover or focus darkens it over 80ms. -->
      <div data-slot="radio-border" [class]="borderClass()"></div>
    </div>
    <!-- Both stacked spans carry the text-box trim so the invisible bold sizer
         and the visible label keep identical boxes. -->
    <span [class]="labelGridClass()">
      <span
        class="col-start-1 row-start-1 invisible [text-box:trim-both_cap_alphabetic]"
        [style.font-variation-settings]="semibold"
        aria-hidden="true"
        >{{ label() }}</span
      >
      <span [class]="labelClass()" [style.font-variation-settings]="labelWeight()">{{ label() }}</span>
    </span>
  `,
  host: {
    role: 'radio',
    '[attr.data-fluid-hover-index]': 'index()',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.aria-checked]': 'isSelected()',
    '[attr.aria-label]': 'label()',
    '[class]': 'hostClass()',
    '(click)': 'handleSelect()',
    '(mousedown)': 'onMousedown($event)',
    '(keydown)': 'onKeydown($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioItem {
  /** Text label for the radio item (also its accessible name). */
  readonly label = input.required<string>();
  /** Position index within the group. */
  readonly index = input.required<number>();
  /** Whether this item is selected (per-item mode). */
  readonly selected = input<boolean | undefined>(undefined);
  /** The value written to the group's `value` when this item is pressed. */
  readonly value = input<string | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });
  /** Called when this item is pressed, Space/Enter, or an arrow lands on it. */
  readonly select = output<void>();

  private readonly group = inject(RadioGroup);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly circle = viewChild.required<ElementRef<HTMLElement>>('circle');
  private readonly animateFluid = injectAnimateFluid();
  private readonly shape = injectShape();
  private readonly sizeClasses = injectSize(() => this.group.size());
  private readonly compact = computed(() => this.sizeClasses().variant === 'compact');
  protected readonly semibold = fontWeights.semibold;

  private readonly isActive = computed(() => this.group.hover.activeIndex() === this.index());

  // Value equality decides when both the item and the group have a value;
  // otherwise the item's own `selected` wins over the group's selectedIndex.
  readonly isSelected = computed(() => {
    const value = this.value();
    const groupValue = this.group.value();
    if (value !== undefined && groupValue !== undefined) return groupValue === value;
    return this.selected() ?? this.group.contextSelectedIndex() === this.index();
  });

  // Roving tabindex: the selected item is the tab stop; with no selection the
  // first item takes it so the group stays keyboard-reachable.
  protected readonly tabIndex = computed(() =>
    this.isSelected() ? 0 : !this.group.hasSelection() && this.index() === 0 ? 0 : -1,
  );

  protected readonly hostClass = computed(() => {
    const size = this.sizeClasses();
    return cn(
      // Fixed height so the text-box trim on the label doesn't shrink the row.
      `relative z-10 flex ${size.control} items-center ${size.gap} ${this.shape().item} ${size.px} cursor-pointer outline-none`,
      this.userClass(),
    );
  });

  protected readonly circleClass = computed(() =>
    cn('relative shrink-0', this.compact() ? 'w-[14px] h-[14px]' : 'w-[16px] h-[16px]'),
  );

  protected readonly borderClass = computed(() =>
    cn(
      'absolute inset-0 rounded-full border-solid transition-all duration-80',
      this.isSelected()
        ? 'border-[1.5px] border-transparent'
        : this.isActive()
          ? 'border-[1.5px] border-neutral-400 dark:border-neutral-500'
          : 'border-[1.5px] border-border',
    ),
  );

  protected readonly labelGridClass = computed(() => cn('inline-grid', this.sizeClasses().text));

  // Weight changes only when selected ('wght' 400 → 550), so weight marks
  // state; color goes muted → foreground when selected, hovered or focused.
  protected readonly labelClass = computed(() =>
    cn(
      'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]',
      this.isSelected() || this.isActive() ? 'text-foreground' : 'text-muted-foreground',
    ),
  );
  protected readonly labelWeight = computed(() => (this.isSelected() ? fontWeights.semibold : fontWeights.normal));

  private dot: { element: HTMLElement; inner: HTMLElement; exiting: boolean } | null = null;
  private dotRendered = false;

  constructor() {
    effect((onCleanup) => {
      const index = this.index();
      const hover = this.group.hover;
      untracked(() => hover.registerItem(index, this.host));
      onCleanup(() => hover.unregisterItem(index, this.host));
    });

    afterRenderEffect(() => {
      const selected = this.isSelected();
      const compact = this.compact();
      untracked(() => this.renderDot(selected, compact));
    });
  }

  /**
   * The dot pops in on spring.fast from scale 0.3 and opacity 0, and shrinks
   * back out over 0.04s. A row selected at mount shows the dot at full size
   * instead of popping it in (AnimatePresence initial={false}).
   */
  private renderDot(selected: boolean, compact: boolean) {
    const initial = !this.dotRendered;
    this.dotRendered = true;
    const innerClass = cn('rounded-full bg-foreground', compact ? 'w-[7px] h-[7px]' : 'w-[8px] h-[8px]');
    if (this.dot) this.dot.inner.className = innerClass;
    if (selected) {
      if (this.dot) {
        if (this.dot.exiting) {
          this.dot.exiting = false;
          this.animateFluid(this.dot.element, { opacity: 1, scale: 1 }, enterTransition(spring.fast));
        }
        return;
      }
      const doc = this.host.ownerDocument;
      const element = doc.createElement('div');
      element.className = 'absolute inset-0 flex items-center justify-center';
      element.setAttribute('data-slot', 'radio-dot');
      const inner = doc.createElement('div');
      inner.className = innerClass;
      element.appendChild(inner);
      this.circle().nativeElement.appendChild(element);
      this.dot = { element, inner, exiting: false };
      if (!initial) {
        this.animateFluid(element, { opacity: [0, 1], scale: [0.3, 1] }, enterTransition(spring.fast));
      }
      return;
    }
    const dot = this.dot;
    if (!dot || dot.exiting) return;
    dot.exiting = true;
    this.animateFluid(dot.element, { opacity: 0, scale: 0.3 }, { duration: 0.04 }).finished.then(() => {
      if (!dot.exiting || this.dot !== dot) return;
      dot.element.remove();
      this.dot = null;
    });
  }

  // Value mode reports through the group's value, every mode through
  // `select`; both fire when both are wired.
  protected handleSelect() {
    const value = this.value();
    if (value !== undefined) this.group.value.set(value);
    this.select.emit();
  }

  protected onMousedown(e: MouseEvent) {
    focusRowOnPress(e, this.host);
  }

  // The row is not a native control, so it handles Space and Enter itself;
  // preventDefault keeps Space from scrolling the page.
  protected onKeydown(e: KeyboardEvent) {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    this.handleSelect();
  }
}
