import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  afterRenderEffect,
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
import {
  Tab as NgTab,
  TabContent as NgTabContent,
  TabList as NgTabList,
  TabPanel as NgTabPanel,
  Tabs as NgTabs,
} from '@angular/aria/tabs';
import { cn } from '../core/utils';
import { spring } from '../core/springs';
import { fontWeights } from '../core/font-weight';
import { injectShape } from '../core/shape';
import { injectSize, type SizeVariant } from '../core/size';
import { injectSurface } from '../core/surface';
import { surfaceClasses } from '../core/surface-classes';
import { ReducedMotion } from '../core/environment';
import { enterTransition, exitTransition } from '../core/motion';
import { Icon } from '../core/icon';
import type { IconDefinition, IconName } from '../core/icons';
import { createFluidHover, type ItemRect } from '../fluid-hover/fluid-hover';
import { Layer, isFocusVisible, provideSizeOverride, type Keyframes } from './layer';

// ---------------------------------------------------------------------------
// Tabs is a segmented control: a muted track (TabsList) holding one raised
// pill for the selected tab, a faint hover pill that previews the next click,
// and a focus ring for the keyboard. All three are absolutely positioned
// layers that travel across the tab rects measured by the fluid hover engine;
// the tabs themselves stay transparent. Selection moves on spring.moderate,
// hover and focus on spring.fast, and labels change weight without shifting
// layout. Roles, roving focus and arrow-key selection come from
// @angular/aria/tabs.
// ---------------------------------------------------------------------------

const rectFrames = (r: ItemRect): Keyframes => ({ left: r.left, width: r.width, top: r.top, height: r.height });

/** Root of a segmented control: `<ff-tabs defaultValue="library">`. */
@Component({
  selector: 'ff-tabs',
  template: '<ng-content />',
  hostDirectives: [NgTabs],
  host: { '[class]': 'hostClass()' },
  providers: [provideSizeOverride(Tabs, (t) => t.size())],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tabs {
  /** Controlled value (takes precedence over selectedIndex). Two-way bindable. */
  readonly value = input<string | undefined>(undefined);
  /** Emits the value of a tab the user selects (React `onValueChange`). */
  readonly valueChange = output<string>();
  /** Index-based controlled alternative. Two-way bindable. */
  readonly selectedIndex = input<number | undefined>(undefined);
  /** Emits the index of a tab the user selects (React `onSelect`). */
  readonly selectedIndexChange = output<number>();
  /** Initially selected tab for uncontrolled use. */
  readonly defaultValue = input<string | undefined>(undefined);
  /** Pins the segmented control to one step of the size ladder. Omitted, it
   *  follows the surrounding size context. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  private readonly list = signal<TabsList | null>(null);
  private readonly uncontrolled = signal<string | undefined>(undefined);

  /** Tab values in DOM order, as the list reports them. */
  readonly valueOrder = computed(() => this.list()?.values() ?? []);

  /**
   * The selected value: explicit value > selectedIndex lookup > uncontrolled
   * state > defaultValue > the first tab.
   */
  readonly resolvedValue = computed<string | undefined>(() => {
    const value = this.value();
    if (value !== undefined) return value;
    const order = this.valueOrder();
    const index = this.selectedIndex();
    if (index != null) return order[index];
    return this.uncontrolled() ?? this.defaultValue() ?? order[0];
  });

  protected readonly hostClass = computed(() => cn('block', this.userClass()));

  /** @internal */
  registerList(list: TabsList | null) {
    this.list.set(list);
  }

  /** @internal Reports a selection made by the user. */
  select(value: string) {
    if (value === this.resolvedValue()) return;
    // Local state only backs uncontrolled use; with value or selectedIndex
    // the parent owns selection, so this just reports the change.
    if (this.value() === undefined && this.selectedIndex() == null) this.uncontrolled.set(value);
    this.valueChange.emit(value);
    const index = this.valueOrder().indexOf(value);
    if (index !== -1) this.selectedIndexChange.emit(index);
  }
}

/** The muted track holding the tabs: `<ff-tabs-list>`. */
@Component({
  selector: 'ff-tabs-list',
  template: `
    <ng-container #selectedAnchor />
    <ng-container #hoverAnchor />
    <ng-container #ringAnchor />
    <ng-content />
  `,
  // Arrow keys move focus and select in one step (selectionMode "follow"),
  // so the pill follows the keyboard the way it follows a click.
  hostDirectives: [NgTabList],
  host: {
    '[class]': 'hostClass()',
    '(mousemove)': 'onMouseMove($event)',
    '(mouseleave)': 'onMouseLeave()',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsList {
  readonly userClass = input('', { alias: 'class' });

  readonly root = inject(Tabs);
  private readonly primitive = inject(NgTabList);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly shape = injectShape();
  private readonly size = injectSize();
  private readonly substrate = injectSurface();
  private readonly reduced = inject(ReducedMotion).value;
  // axis "x": the tab nearest the cursor horizontally wins, so the list's
  // padding never leaves the hover pill without a target.
  readonly hover = createFluidHover(() => this.host, { axis: 'x' });

  private readonly items = signal<TabItem[]>([]);
  // Bumped when the DOM order may have changed (first render, mutations).
  // Items register before they are attached and before their inputs are
  // set, so nothing is ordered (or read) until the first render is done.
  private readonly orderVersion = signal(0);
  /** The registered tabs in DOM order. */
  readonly ordered = computed(() => {
    if (this.orderVersion() === 0) return [];
    return [...this.items()].sort((a, b) =>
      a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1,
    );
  });
  readonly values = computed(() => this.ordered().map((item) => item.value()));

  private mouseInside = false;
  private readonly focusedIndex = signal<number | null>(null);
  private readonly selectedIdx = computed(() => {
    const value = this.root.resolvedValue();
    return value !== undefined ? this.values().indexOf(value) : -1;
  });
  // The pills follow optimisticIdx, not selectedIdx. A click sets it at once,
  // so the pill moves before controlled state round-trips; it resyncs
  // whenever the resolved selection changes (arrow keys, a parent).
  private readonly optimisticIdx = linkedSignal<number | null>(() => {
    const index = this.selectedIdx();
    return index >= 0 ? index : null;
  });

  protected readonly hostClass = computed(() =>
    cn(
      // segmentPad + segmentItem add up to the ladder's control height, so the
      // segmented control lines up with buttons and inputs beside it.
      'relative inline-flex items-center select-none bg-muted',
      this.size().segmentPad,
      this.shape().container,
      this.userClass(),
    ),
  );

  private readonly selectedAnchor = viewChild.required('selectedAnchor', { read: ElementRef });
  private readonly hoverAnchor = viewChild.required('hoverAnchor', { read: ElementRef });
  private readonly ringAnchor = viewChild.required('ringAnchor', { read: ElementRef });
  private readonly selectedPill = new Layer(() => this.selectedAnchor().nativeElement, this.reduced, 'selected-pill');
  private readonly hoverPill = new Layer(() => this.hoverAnchor().nativeElement, this.reduced, 'hover-pill');
  private readonly focusRing = new Layer(() => this.ringAnchor().nativeElement, this.reduced, 'focus-ring');

  constructor() {
    this.root.registerList(this);
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      this.root.registerList(null);
      this.selectedPill.destroy();
      this.hoverPill.destroy();
      this.focusRing.destroy();
    });

    afterNextRender(() => {
      this.orderVersion.update((v) => v + 1);
      if (typeof MutationObserver === 'undefined') return;
      const mo = new MutationObserver(() => this.orderVersion.update((v) => v + 1));
      mo.observe(this.host, { childList: true, subtree: true });
      destroyRef.onDestroy(() => mo.disconnect());
    });

    // Keep the primitive's selection on the resolved value.
    effect(() => {
      const value = this.root.resolvedValue();
      untracked(() => this.syncPrimitive(value));
    });
    this.primitive.selectedTab.subscribe((value) => this.onPrimitiveSelect(value));

    afterRenderEffect(() => {
      const rects = this.hover.itemRects();
      const hovered = this.hover.activeIndex();
      const focused = this.focusedIndex();
      const selected = this.optimisticIdx();
      const shape = this.shape();
      // The selected pill lifts 3 levels above its substrate (1 above the
      // muted track + 2 for pop): surface 4 on the page, 8 inside a dialog.
      const level = Math.min(this.substrate() + 3, 8);
      untracked(() => this.drawLayers(rects, hovered, focused, selected, shape.bg, shape.focusRing, level));
    });
  }

  private syncing = false;

  private syncPrimitive(value: string | undefined) {
    if (value === undefined || untracked(this.primitive.selectedTab) === value) return;
    this.syncing = true;
    try {
      this.primitive.selectedTab.set(value);
    } finally {
      this.syncing = false;
    }
  }

  private onPrimitiveSelect(value: string | undefined) {
    if (this.syncing) return;
    const resolved = untracked(this.root.resolvedValue);
    if (value === undefined || value === resolved) {
      // The primitive can momentarily lose its selection while its tabs
      // register; put it back on the resolved value.
      if (value === undefined && resolved !== undefined) queueMicrotask(() => this.syncPrimitive(untracked(this.root.resolvedValue)));
      return;
    }
    this.root.select(value);
    // A controlled parent that keeps its value wins: once the change has
    // round-tripped, put the primitive back on whatever is resolved now.
    afterNextRender(() => this.syncPrimitive(untracked(this.root.resolvedValue)), { injector: this.injector });
  }

  private drawLayers(
    rects: ItemRect[],
    hovered: number | null,
    focused: number | null,
    selected: number | null,
    bg: string,
    focusRingClass: string,
    level: number,
  ) {
    const selectedRect = selected !== null ? rects[selected] : undefined;
    const hoverRect = hovered !== null ? rects[hovered] : undefined;
    const focusRect = focused !== null ? rects[focused] : undefined;
    // Hovering the selected tab needs no hover pill; hovering any other tab
    // shows one and dims the active pill.
    const isHoveringSelected = hovered === selected;
    const isHovering = hovered !== null && !isHoveringSelected;

    if (selectedRect) {
      this.selectedPill.show(
        // A raised surface (background + shadow), not a tint, so the
        // selected tab lifts off the muted track.
        cn('absolute pointer-events-none', surfaceClasses(level), bg),
        // Dims to 0.85 while another tab is hovered: the selection reads as
        // "current" and the hover pill as "next".
        { ...rectFrames(selectedRect), opacity: isHovering ? 0.85 : 1 },
        { ...enterTransition(spring.moderate), opacity: { duration: 0.08 } },
      );
    } else {
      this.selectedPill.hide(null);
    }

    // Born at the selected pill (opacity 0) and sliding out to the hovered
    // tab. Without a selected pill there is nowhere to start.
    if (hoverRect && !isHoveringSelected && selectedRect) {
      this.hoverPill.show(
        cn('absolute pointer-events-none bg-hover', bg),
        // bg-hover at 0.4 stays well below the active pill.
        { ...rectFrames(hoverRect), opacity: 0.4 },
        { ...enterTransition(spring.fast), opacity: { duration: 0.08 } },
        { ...rectFrames(selectedRect), opacity: 0 },
      );
    } else {
      // With the mouse outside the list, slide back into the selected pill
      // on spring.moderate while fading over 60ms; still inside, fade in place.
      this.hoverPill.hide(
        !this.mouseInside && selectedRect
          ? {
              keyframes: { ...rectFrames(selectedRect), opacity: 0 },
              transition: { ...enterTransition(spring.moderate), opacity: { duration: 0.06 } },
            }
          : { keyframes: { opacity: 0 }, transition: exitTransition(spring.fast) },
      );
    }

    // One ring for the whole list, 2px outside the focused tab, above the
    // tabs (z-20). The #6B97FF fallback keeps it visible without the token.
    if (focusRect) {
      this.focusRing.show(
        cn('absolute pointer-events-none z-20 border border-[color:var(--focus-ring,#6B97FF)]', focusRingClass),
        {
          left: focusRect.left - 2,
          top: focusRect.top - 2,
          width: focusRect.width + 4,
          height: focusRect.height + 4,
          opacity: 1,
        },
        { ...enterTransition(spring.fast), opacity: { duration: 0.08 } },
      );
    } else {
      this.focusRing.hide({ keyframes: { opacity: 0 }, transition: exitTransition(spring.fast) });
    }
  }

  /** @internal */
  register(item: TabItem) {
    this.items.update((items) => [...items, item]);
  }

  /** @internal */
  unregister(item: TabItem) {
    this.items.update((items) => items.filter((i) => i !== item));
  }

  /** @internal Moves the pill at once on click, ahead of the value round trip. */
  setOptimisticIdx(index: number) {
    this.optimisticIdx.set(index);
  }

  protected onMouseMove(e: MouseEvent) {
    this.mouseInside = true;
    this.hover.onMouseMove(e);
  }

  protected onMouseLeave() {
    this.mouseInside = false;
    this.hover.onMouseLeave();
  }

  // Focus also sets the hover index, so keyboard and mouse share one
  // highlight state. The ring draws only for :focus-visible, so a mouse
  // click (which focuses too) shows none.
  protected onFocusIn(e: FocusEvent) {
    const target = e.target as HTMLElement;
    const trigger = target.closest('[role="tab"]');
    const indexAttr = trigger?.getAttribute('data-fluid-hover-index');
    if (indexAttr == null) return;
    const index = Number(indexAttr);
    this.hover.setActiveIndex(index);
    this.focusedIndex.set(isFocusVisible(target) ? index : null);
  }

  // Focus moving between tabs stays inside the list and is ignored. Leaving
  // the list drops the ring; the hover highlight stays while the mouse still
  // rests on a tab.
  protected onFocusOut(e: FocusEvent) {
    if (this.host.contains(e.relatedTarget as Node | null)) return;
    this.focusedIndex.set(null);
    if (this.mouseInside) return;
    this.hover.setActiveIndex(null);
  }
}

/** One segment: `<button ffTabItem value="library" label="Library" icon="square-library">`. */
@Component({
  selector: 'button[ffTabItem]',
  imports: [Icon],
  hostDirectives: [{ directive: NgTab, inputs: ['value', 'disabled'] }],
  template: `
    <!-- Stroke 1.5 -> 2 and muted -> foreground on hover or selection, over
         the label's 80ms, so icon and text change together. -->
    @if (iconName() || iconDefinition()) {
      <ff-icon
        [name]="iconName()"
        [icon]="iconDefinition()"
        [size]="size().icon"
        [strokeWidth]="isActive() ? 2 : 1.5"
        [class]="iconClass()"
      />
    }
    <span [class]="labelBoxClass()">
      <!-- Invisible semibold copy: reserves the bold width up front, so the
           tab doesn't widen when selected and the pills don't jump. -->
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
    '[attr.data-fluid-hover-index]': 'index()',
    '[class]': 'hostClass()',
    '(mousedown)': 'onMouseDown($event)',
    '(click)': 'onClick()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabItem {
  /** Text label. */
  readonly label = input.required<string>();
  /** Optional leading icon: an icon role name or an icon definition. */
  readonly icon = input<IconName | IconDefinition | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  private readonly tab = inject(NgTab);
  private readonly list = inject(TabsList);
  /** @internal */
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly size = injectSize();
  protected readonly semibold = fontWeights.semibold;

  /** Unique value for this tab (the `value` input). */
  readonly value = computed(() => this.tab.value());
  /** Position in the list, from DOM order. */
  readonly index = computed(() => this.list.ordered().indexOf(this));
  readonly isSelected = computed(() => this.list.root.resolvedValue() === this.value());
  // Hover or selection brightens color and icon stroke; only selection
  // changes weight, so hovering never thickens a label.
  readonly isActive = computed(() => this.list.hover.activeIndex() === this.index() || this.isSelected());

  protected readonly iconName = computed(() => {
    const icon = this.icon();
    return typeof icon === 'string' ? icon : undefined;
  });
  protected readonly iconDefinition = computed(() => {
    const icon = this.icon();
    return icon !== undefined && typeof icon !== 'string' ? icon : undefined;
  });

  protected readonly hostClass = computed(() =>
    cn(
      // outline-none: the list draws one shared focus ring instead. Fixed
      // height (not py) so the text-box trim doesn't shrink the tab.
      'relative z-10 flex items-center px-3 cursor-pointer bg-transparent border-none outline-none',
      this.size().segmentItem,
      this.size().gap,
      this.userClass(),
    ),
  );
  protected readonly iconClass = computed(() =>
    cn('transition-[color,stroke-width] duration-80', this.isActive() ? 'text-foreground' : 'text-muted-foreground'),
  );
  protected readonly labelBoxClass = computed(() => cn('inline-grid whitespace-nowrap', this.size().text));
  protected readonly labelClass = computed(() =>
    cn(
      'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]',
      this.isActive() ? 'text-foreground' : 'text-muted-foreground',
    ),
  );
  // Semibold only when selected, via wght + opsz so the width barely moves.
  protected readonly labelWeight = computed(() => (this.isSelected() ? fontWeights.semibold : fontWeights.normal));

  constructor() {
    this.list.register(this);
    inject(DestroyRef).onDestroy(() => this.list.unregister(this));
    // Register the button so the list can measure its rect; the cleanup
    // unregisters it so no pill aims at a tab that has gone.
    effect((onCleanup) => {
      const index = this.index();
      if (index < 0) return;
      untracked(() => this.list.hover.registerItem(index, this.element));
      onCleanup(() => this.list.hover.unregisterItem(index, this.element));
    });
  }

  // A main-button press selects at once, like Radix (mousedown) and Base UI
  // (activateOnFocus on press): the pill starts moving on press, not release.
  protected onMouseDown(e: MouseEvent) {
    if (e.button !== 0 || e.ctrlKey || this.isSelected()) return;
    this.onClick();
    this.tab.open();
  }

  protected onClick() {
    const index = this.index();
    if (index >= 0) this.list.setOptimisticIdx(index);
  }
}

/** Content for the tab with the same value: `<ff-tab-panel value="library">`. */
@Component({
  selector: 'ff-tab-panel',
  imports: [NgTabPanel, NgTabContent],
  // The primitive panel lives in this template (not as a host directive) so
  // its lazily rendered ngTabContent is a content child it can see.
  template: `
    <div
      ngTabPanel
      [value]="value()"
      [class]="panelClass()"
      [hidden]="!visible()"
      [style.display]="visible() ? null : 'none'"
    >
      <ng-template ngTabContent><ng-content /></ng-template>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabPanel {
  /** Must match a TabItem value. */
  readonly value = input.required<string>();
  readonly userClass = input('', { alias: 'class' });
  protected readonly panelClass = computed(() => cn('outline-none', this.userClass()));
  private readonly root = inject(Tabs);
  // Mirrors the primitive's visibility from the resolved selection (which the
  // primitive follows). Reading the primitive itself here would run before
  // its inputs are bound: style bindings evaluate ahead of property bindings.
  protected readonly visible = computed(() => this.root.resolvedValue() === this.value());
}
