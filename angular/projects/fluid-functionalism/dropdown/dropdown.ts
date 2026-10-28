import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
} from '@angular/core';
import {
  cn,
  shapeMap,
  SizeContext,
  injectSize,
  type SizeVariant,
  SURFACE_LEVEL,
  surfaceClasses,
  typeClass,
  isDisabledRow,
} from '@angel-r/fluid-functionalism-angular/core';
import { createFluidHover, FluidHoverHighlight } from '@angel-r/fluid-functionalism-angular/fluid-hover';
import { SelectionBackgrounds, createMergeSplitBlocks, createSelectionRuns } from '@angel-r/fluid-functionalism-angular/merge-split';
import { DROPDOWN_CONTEXT, type DropdownContextValue } from '@angel-r/fluid-functionalism-angular/menu-item';
import { GroupFocusRing, createGroupFocus } from '@angel-r/fluid-functionalism-angular/radio-group';
import { PopupCheckedBackground, createPinnedSize, createRaisedSurface } from './popup-parts';

// Dropdown opts out of the global pill/rounded shape context — popover surfaces
// look cleaner with the smaller "rounded" radii regardless of how the rest of
// the UI is shaped (the heavy pill bubbling distorts perceived padding at this
// scale and produces the corner-shadow asymmetry).
export const dropdownShape = shapeMap.rounded;

const ROWS = '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]';

// ---------------------------------------------------------------------------
// Dropdown (inline panel)
//
// An always-rendered panel — no trigger, positioning, or dismissal. Because it
// sits statically in the page it does NOT claim popup menu semantics: the
// container is a plain role="group" (pass `aria-label` to name it). The real
// role="menu" lives on the popup DropdownContent, which is wired to a
// trigger. Consumers who hand-roll a trigger around the inline panel get
// grouping semantics rather than a falsely-announced popup menu.
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-dropdown',
  imports: [FluidHoverHighlight, GroupFocusRing, SelectionBackgrounds, PopupCheckedBackground],
  providers: [
    { provide: DROPDOWN_CONTEXT, useFactory: () => inject(Dropdown).context },
    // A size input pins every row in the panel to one ladder step.
    { provide: SizeContext, useFactory: () => inject(Dropdown).sizeContext },
    { provide: SURFACE_LEVEL, useFactory: () => inject(Dropdown).surface },
  ],
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
  template: `
    <!-- Selected backgrounds — merged runs in multiple mode -->
    @if (multiple()) {
      <ff-selection-backgrounds [blocks]="blocks()" />
    }
    <!-- Selected background -->
    <ff-popup-checked-background [rect]="checkedRect()" />
    <!-- Hover background -->
    <ff-fluid-hover-highlight [hover]="hover" [from]="checkedRect()" [class]="shape.bg" />
    <!-- Focus ring -->
    <ff-group-focus-ring [rect]="focus.focusRect()" [class]="shape.focusRing" />
    <ng-content />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dropdown {
  /** The checked row: drives the animated selected background. */
  readonly checkedIndex = input<number | undefined>(undefined);
  /** Multiple selection: the checked rows. Rows become checkbox items and
   *  contiguous runs share one merged background (see CheckboxGroup). */
  readonly checkedIndices = input<readonly number[] | undefined>(undefined);
  /** Pins the panel's rows to one step of the size ladder (default 36px,
   *  compact 28px). Omitted, they follow the surrounding size provider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  protected readonly shape = dropdownShape;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly sizeContext = createPinnedSize(this.size);
  readonly surface = createRaisedSurface(2);
  readonly hover = createFluidHover(() => this.host, { isItemDisabled: isDisabledRow });
  protected readonly focus = createGroupFocus(this.hover, this.host);

  protected readonly multiple = computed(() => this.checkedIndices() != null);
  protected readonly checkedRect = computed(() => {
    const index = this.checkedIndex();
    return !this.multiple() && index != null ? (this.hover.itemRects()[index] ?? null) : null;
  });
  // Multiple: one merged block per contiguous run of checked rows.
  private readonly runs = createSelectionRuns(() => this.checkedIndices() ?? []);
  protected readonly blocks = createMergeSplitBlocks(this.runs, this.hover.itemRects, () => this.shape.bgRadius);

  readonly context: DropdownContextValue = {
    registerItem: this.hover.registerItem,
    unregisterItem: this.hover.unregisterItem,
    activeIndex: this.hover.activeIndex,
    checkedIndex: this.checkedIndex,
    multiple: this.multiple,
    checkedIndices: this.checkedIndices,
  };

  protected readonly hostClass = computed(() =>
    cn(
      `relative flex flex-col w-72 max-w-full ${this.shape.container} p-1 select-none`,
      surfaceClasses(this.surface(), 3),
      this.userClass(),
    ),
  );

  protected onKeydown(e: KeyboardEvent) {
    const items = Array.from(this.host.querySelectorAll<HTMLElement>(ROWS));
    const current = items.indexOf(e.target as HTMLElement);
    if (current === -1) return;
    if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault();
      const next =
        e.key === 'ArrowDown' || e.key === 'ArrowRight'
          ? (current + 1) % items.length
          : (current - 1 + items.length) % items.length;
      items[next].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  }
}

// ---------------------------------------------------------------------------
// DropdownLabel
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-dropdown-label',
  // Displayed as a block by a host style, so the class list stays React's.
  host: { style: 'display: block', '[class]': 'hostClass()' },
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownLabel {
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

// ---------------------------------------------------------------------------
// DropdownSeparator
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-dropdown-separator',
  host: { role: 'separator', style: 'display: block', '[class]': 'hostClass()' },
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownSeparator {
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() => cn('my-1 -mx-1 h-px shrink-0 bg-border/60', this.userClass()));
}
