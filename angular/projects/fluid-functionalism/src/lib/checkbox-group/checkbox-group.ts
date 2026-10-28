import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { animate } from 'motion';
import { cn, fontWeights, injectShape, injectSize, type SizeVariant } from '../core';
import { FLUID_HOVER, createFluidHover, FluidHoverHighlight } from '../fluid-hover';
import { SelectionBackgrounds, createMergeSplitBlocks, createSelectionRuns } from '../merge-split';
import { GroupFocusRing, createGroupFocus, focusRowOnPress, groupRows } from '../radio-group';

// ---------------------------------------------------------------------------
// CheckboxGroup is a vertical list of CheckboxItem rows sharing one fluid
// hover scope. The group paints everything that spans rows: the checked
// backgrounds (contiguous checked rows merge into one block), the hover
// highlight, and one focus ring that springs between rows. Each row is the
// focusable role="checkbox" element; the square inside it is only the box
// and its check mark.
//
// State: the group's `checkedIndices` is a model the group keeps in step with
// every toggle, so `[(checkedIndices)]` alone drives the rows. The upstream
// pattern (`[checkedIndices]` on the group, `[checked]` + `(toggle)` per item)
// works too: an item's own `checked` wins over the group's set.
// ---------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';

@Component({
  selector: 'ff-checkbox-group',
  imports: [FluidHoverHighlight, GroupFocusRing, SelectionBackgrounds],
  providers: [{ provide: FLUID_HOVER, useFactory: () => inject(CheckboxGroup).hover }],
  template: `
    <!-- Selected backgrounds (merged for contiguous checked items). A run is
         normally one block; mid merge/split it is drawn as two abutting
         halves — see createMergeSplitBlocks. -->
    <ff-selection-backgrounds [blocks]="blocks()" />
    <ff-fluid-hover-highlight [hover]="hover" [class]="shape().bg" />
    <ff-group-focus-ring [rect]="focus.focusRect()" [class]="shape().focusRing" />
    <ng-content />
  `,
  host: {
    role: 'group',
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
export class CheckboxGroup {
  /** Checked row indices. The group needs the whole set, not just each row's
   *  `checked`, to merge contiguous rows into one background. Two-way
   *  bindable: every toggle writes the next set. */
  readonly checkedIndices = model<ReadonlySet<number>>(new Set());
  /** Pins the group's rows to one step of the size ladder (default 36px,
   *  compact 28px). Omitted, it follows the surrounding size provider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly hover = createFluidHover(() => this.host);
  protected readonly focus = createGroupFocus(this.hover, this.host);
  protected readonly shape = injectShape();

  // Contiguous checked rows, each run with a stable ID. The ID keys the
  // background block, so a neighbour being checked grows or shrinks the block
  // in place instead of exiting the old block and entering a new one.
  private readonly runs = createSelectionRuns(() => [...this.checkedIndices()]);
  // Selected backgrounds, with the merge/split boundary animation when one
  // unchecked row bridges or splits two checked runs.
  protected readonly blocks = createMergeSplitBlocks(this.runs, this.hover.itemRects, () => this.shape().mergedRadius);

  // select-none keeps rapid clicks on rows from selecting the label text.
  protected readonly hostClass = computed(() =>
    cn('relative flex flex-col w-72 max-w-full select-none', this.userClass()),
  );

  /** Flips `index` in the checked set. Computed from the group's own current
   *  set, so a parent that also updates the set from `(toggle)` lands on the
   *  same result instead of undoing it. */
  toggleIndex(index: number) {
    const next = new Set(this.checkedIndices());
    if (next.has(index)) next.delete(index);
    else next.add(index);
    this.checkedIndices.set(next);
  }

  // Up/Down move focus only, wrapping at both ends; Home/End jump to the
  // first and last row. Space or Enter on a row toggles it.
  protected onKeydown(e: KeyboardEvent) {
    const rows = groupRows(this.host);
    const current = rows.indexOf(e.target as HTMLElement);
    if (current === -1) return;
    let next: number;
    if (e.key === 'ArrowDown') next = (current + 1) % rows.length;
    else if (e.key === 'ArrowUp') next = (current - 1 + rows.length) % rows.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = rows.length - 1;
    else return;
    e.preventDefault();
    rows[next]?.focus();
  }
}

@Component({
  selector: 'ff-checkbox-item',
  template: `
    <!-- The square: out of the tab order and hidden from assistive tech; the
         row already is the checkbox, so exposing it too would announce every
         option twice. -->
    <span
      #square
      role="checkbox"
      aria-hidden="true"
      tabindex="-1"
      [attr.aria-checked]="isChecked()"
      [attr.data-checked]="isChecked() ? '' : null"
      [attr.data-unchecked]="isChecked() ? null : ''"
      [class]="squareClass()"
    >
      <!-- Checked: the border turns transparent and the check alone marks the
           state. Unchecked: hover or focus darkens it over 80ms. -->
      <div data-slot="checkbox-border" [class]="borderClass()"></div>
    </span>
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
    role: 'checkbox',
    // Every row is its own tab stop: checkboxes toggle independently, so
    // there is no roving tabindex.
    tabindex: '0',
    '[attr.data-fluid-hover-index]': 'index()',
    '[attr.aria-checked]': 'isChecked()',
    '[attr.aria-label]': 'label()',
    '[class]': 'hostClass()',
    '(click)': 'onToggle()',
    '(mousedown)': 'onMousedown($event)',
    '(keydown)': 'onKeydown($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxItem {
  /** Text label for the checkbox (also its accessible name). */
  readonly label = input.required<string>();
  /** Position index within the group. */
  readonly index = input.required<number>();
  /** Whether this item is checked. Omitted, the group's checkedIndices decide. */
  readonly checked = input<boolean | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });
  /** Called when this item is toggled (click, Space or Enter). */
  readonly toggle = output<void>();

  private readonly group = inject(CheckboxGroup);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly square = viewChild.required<ElementRef<HTMLElement>>('square');
  private readonly shape = injectShape();
  private readonly sizeClasses = injectSize(() => this.group.size());
  private readonly compact = computed(() => this.sizeClasses().variant === 'compact');
  protected readonly semibold = fontWeights.semibold;

  private readonly isActive = computed(() => this.group.hover.activeIndex() === this.index());
  readonly isChecked = computed(() => this.checked() ?? this.group.checkedIndices().has(this.index()));

  protected readonly hostClass = computed(() => {
    const size = this.sizeClasses();
    return cn(
      // Fixed height so the text-box trim on the label doesn't shrink the row.
      `relative z-10 flex ${size.control} items-center ${size.gap} ${this.shape().item} ${size.px} cursor-pointer outline-none`,
      this.userClass(),
    );
  });

  protected readonly squareClass = computed(() =>
    cn(
      'relative shrink-0 appearance-none bg-transparent p-0 border-0 outline-none cursor-pointer',
      this.compact() ? 'w-[14px] h-[14px]' : 'w-[16px] h-[16px]',
    ),
  );

  protected readonly borderClass = computed(() =>
    cn(
      'absolute inset-0 border-solid transition-all duration-80',
      this.compact() ? 'rounded-[4px]' : 'rounded-[5px]',
      this.isChecked()
        ? 'border-[1.5px] border-transparent'
        : this.isActive()
          ? 'border-[1.5px] border-neutral-400 dark:border-neutral-500'
          : 'border-[1.5px] border-border',
    ),
  );

  protected readonly labelGridClass = computed(() => cn('inline-grid', this.sizeClasses().text));

  // Weight changes only when checked ('wght' 400 → 550), so weight marks
  // state; color goes muted → foreground when checked, hovered or focused.
  protected readonly labelClass = computed(() =>
    cn(
      'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]',
      this.isChecked() || this.isActive() ? 'text-foreground' : 'text-muted-foreground',
    ),
  );
  protected readonly labelWeight = computed(() => (this.isChecked() ? fontWeights.semibold : fontWeights.normal));

  private check: { svg: SVGSVGElement; path: SVGPathElement; exiting: boolean } | null = null;
  private checkRendered = false;

  constructor() {
    effect((onCleanup) => {
      const index = this.index();
      const hover = this.group.hover;
      untracked(() => hover.registerItem(index, this.host));
      onCleanup(() => hover.unregisterItem(index, this.host));
    });

    afterRenderEffect(() => {
      const checked = this.isChecked();
      const compact = this.compact();
      untracked(() => this.renderCheck(checked, compact));
    });
  }

  /**
   * The check draws itself: its stroke goes from hidden to drawn over 0.08s
   * easeOut on check, and back over 0.04s easeIn on uncheck before it
   * unmounts. A row checked at mount shows the finished check (initial={false}).
   * The path is normalized to length 1, so the dash offset is the motion
   * equivalent of `pathLength` 0 → 1.
   */
  private renderCheck(checked: boolean, compact: boolean) {
    const initial = !this.checkRendered;
    this.checkRendered = true;
    const px = String(compact ? 16 : 18);
    if (this.check) {
      this.check.svg.setAttribute('width', px);
      this.check.svg.setAttribute('height', px);
    }
    if (checked) {
      if (this.check) {
        if (this.check.exiting) {
          this.check.exiting = false;
          animate(this.check.path, { strokeDashoffset: 0 }, { duration: 0.08, ease: 'easeOut' });
        }
        return;
      }
      const doc = this.host.ownerDocument;
      const svg = doc.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
      const attrs: Record<string, string> = {
        'data-slot': 'checkbox-check',
        width: px,
        height: px,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        class: 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-foreground',
      };
      for (const [key, value] of Object.entries(attrs)) svg.setAttribute(key, value);
      const path = doc.createElementNS(SVG_NS, 'path') as SVGPathElement;
      path.setAttribute('d', 'M6 12L10 16L18 8');
      path.setAttribute('pathLength', '1');
      path.style.strokeDasharray = '1 1';
      path.style.strokeDashoffset = initial ? '0' : '1';
      svg.appendChild(path);
      this.square().nativeElement.appendChild(svg);
      this.check = { svg, path, exiting: false };
      if (!initial) animate(path, { strokeDashoffset: [1, 0] }, { duration: 0.08, ease: 'easeOut' });
      return;
    }
    const check = this.check;
    if (!check || check.exiting) return;
    check.exiting = true;
    animate(check.path, { strokeDashoffset: 1 }, { duration: 0.04, ease: 'easeIn' }).finished.then(() => {
      if (!check.exiting || this.check !== check) return;
      check.svg.remove();
      this.check = null;
    });
  }

  /** Toggles the row: emits `toggle`, then writes the group's checked set. */
  protected onToggle() {
    this.toggle.emit();
    this.group.toggleIndex(this.index());
  }

  // Clicking the square would natively focus it (nearest focusable ancestor
  // of the click target), after which arrow-key nav dead-zones. Land focus on
  // the row instead.
  protected onMousedown(e: MouseEvent) {
    focusRowOnPress(e, this.host);
  }

  // The row is not a native control, so it handles Space and Enter itself;
  // preventDefault keeps Space from scrolling the page.
  protected onKeydown(e: KeyboardEvent) {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    this.onToggle();
  }
}
