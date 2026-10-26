import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
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
import { NgTemplateOutlet } from '@angular/common';
import { cn } from '../core/utils';
import { spring } from '../core/springs';
import { fontWeights } from '../core/font-weight';
import { injectShape } from '../core/shape';
import { injectSize, type SizeVariant } from '../core/size';
import { ReducedMotion } from '../core/environment';
import { enterTransition, exitTransition, animateFluid, type FluidAnimation } from '../core/motion';
import { Icon } from '../core/icon';
import type { IconDefinition, IconName } from '../core/icons';
import { createFluidHover, type ItemRect } from '../fluid-hover/fluid-hover';
import { Layer, isFocusVisible, provideSizeOverride, writeInitialStyles, type Keyframes } from '../tabs/layer';

// ---------------------------------------------------------------------------
// TabsSubtle is a pill tab strip: one filled pill under the selected tab, a
// fainter hover pill that previews the next click, and one focus ring for
// the keyboard, all absolutely positioned layers travelling across the tab
// rects the fluid hover engine measures. Activation is manual: arrows move
// focus, a click (or Enter / Space on the focused button) selects.
//
// The tablist ARIA is written by hand rather than with @angular/aria/tabs:
// the API selects by numeric index, panels (TabsSubtlePanel) render outside
// the list where a primitive's panel cannot reach its tabs, and ids are
// derived from `idPrefix` — none of which the primitive's string values,
// in-root panels and generated ids can express.
// ---------------------------------------------------------------------------

const rectFrames = (r: ItemRect): Keyframes => ({ left: r.left, width: r.width, top: r.top, height: r.height });

@Component({
  selector: 'ff-tabs-subtle',
  template: `
    <ng-container #selectedAnchor />
    <ng-container #hoverAnchor />
    <ng-container #ringAnchor />
    <ng-content />
  `,
  host: {
    role: 'tablist',
    '[class]': 'hostClass()',
    '(mousemove)': 'onMouseMove($event)',
    '(mouseleave)': 'onMouseLeave()',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
    '(keydown)': 'onKeydown($event)',
  },
  providers: [provideSizeOverride(TabsSubtle, (t) => t.size())],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsSubtle {
  /** Index of the selected tab. Two-way bindable: `[(selectedIndex)]`. */
  readonly selectedIndex = input.required<number>();
  /** Emits the index of a tab the user selects (React `onSelect`). */
  readonly selectedIndexChange = output<number>();
  /** Prefix for the ARIA ids linking tabs to TabsSubtlePanel elements. */
  readonly idPrefix = input<string | undefined>(undefined);
  /** When true, only the selected tab shows its text label. Requires icons on tabs. */
  readonly activeLabel = input(false, { transform: booleanAttribute });
  /** Pins the tabs to one step of the size ladder. Omitted, they follow the
   *  surrounding size context. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly shape = injectShape();
  private readonly reduced = inject(ReducedMotion).value;
  readonly hover = createFluidHover(() => this.host, { axis: 'x' });

  // Whether the pointer is over the list: blur reads it to keep the hover
  // highlight, and the hover pill's exit picks its path from it.
  private mouseInside = false;
  private readonly focusedIndex = signal<number | null>(null);
  /** The tab in the tab order (roving tabindex). Follows the selection. */
  readonly highlightedIndex = linkedSignal(() => this.selectedIndex());
  private readonly items = new Map<number, HTMLElement>();

  protected readonly hostClass = computed(() =>
    cn(
      // -mx-1 px-1 / -my-1 py-1 give the 2px-outset focus ring room to draw
      // without being clipped by overflow-x-auto; the max-width allows for
      // the negative margins.
      'relative flex items-center select-none overflow-x-auto max-w-[calc(100%_+_8px)] scrollbar-hide -mx-1 px-1 -my-1 py-1',
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
    afterRenderEffect(() => {
      const rects = this.hover.itemRects();
      const hovered = this.hover.activeIndex();
      const focused = this.focusedIndex();
      const selected = this.selectedIndex();
      const shape = this.shape();
      untracked(() => this.drawLayers(rects, hovered, focused, selected, shape.bg, shape.focusRing));
    });
    inject(DestroyRef).onDestroy(() => {
      this.selectedPill.destroy();
      this.hoverPill.destroy();
      this.focusRing.destroy();
    });
  }

  private drawLayers(
    rects: ItemRect[],
    hovered: number | null,
    focused: number | null,
    selected: number,
    bg: string,
    focusRingClass: string,
  ) {
    const selectedRect = rects[selected];
    const hoverRect = hovered !== null ? rects[hovered] : undefined;
    const focusRect = focused !== null ? rects[focused] : undefined;
    const isHoveringSelected = hovered === selected;
    const isHovering = hovered !== null && !isHoveringSelected;

    if (selectedRect) {
      this.selectedPill.show(
        cn('absolute bg-active pointer-events-none', bg),
        { ...rectFrames(selectedRect), opacity: isHovering ? 0.8 : 1 },
        { ...enterTransition(spring.moderate), opacity: { duration: 0.08 } },
      );
    } else {
      this.selectedPill.hide(null);
    }

    // Born at the selected pill (opacity 0) and sliding out to the hovered
    // tab, so the preview reads as leaving the current choice.
    if (hoverRect && !isHoveringSelected && selectedRect) {
      this.hoverPill.show(
        cn('absolute bg-active pointer-events-none', bg),
        { ...rectFrames(hoverRect), opacity: 0.4 },
        { ...enterTransition(spring.fast), opacity: { duration: 0.08 } },
        { ...rectFrames(selectedRect), opacity: 0 },
      );
    } else {
      // With the mouse outside the list, slide back into the selected pill;
      // still inside (now over the selected tab), fade where it is.
      this.hoverPill.hide(
        !this.mouseInside && selectedRect
          ? {
              keyframes: { ...rectFrames(selectedRect), opacity: 0 },
              transition: { ...enterTransition(spring.moderate), opacity: { duration: 0.06 } },
            }
          : { keyframes: { opacity: 0 }, transition: exitTransition(spring.fast) },
      );
    }

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

  /** Selects a tab, reporting it only when the selection changes. */
  select(index: number) {
    if (index === this.selectedIndex()) return;
    this.selectedIndexChange.emit(index);
  }

  /** @internal */
  registerTab(index: number, element: HTMLElement) {
    this.items.set(index, element);
    this.hover.registerItem(index, element);
  }

  /** @internal */
  unregisterTab(index: number, element: HTMLElement) {
    if (this.items.get(index) === element) this.items.delete(index);
    this.hover.unregisterItem(index, element);
  }

  protected onMouseMove(e: MouseEvent) {
    this.mouseInside = true;
    this.hover.onMouseMove(e);
  }

  protected onMouseLeave() {
    // Flip the flag before clearing the hover index: the hover pill's exit
    // is chosen from it.
    this.mouseInside = false;
    this.hover.onMouseLeave();
  }

  // Focus also sets the hover index, so keyboard and mouse share one
  // highlight. The ring draws only for :focus-visible, so a click shows none.
  protected onFocusIn(e: FocusEvent) {
    const target = e.target as HTMLElement;
    const indexAttr = target.closest('[data-fluid-hover-index]')?.getAttribute('data-fluid-hover-index');
    if (indexAttr == null) return;
    const index = Number(indexAttr);
    this.hover.setActiveIndex(index);
    this.highlightedIndex.set(index);
    this.focusedIndex.set(isFocusVisible(target) ? index : null);
  }

  // Focus moving between tabs stays inside the list and is ignored. Leaving
  // the list drops the ring; the hover highlight stays while the mouse rests
  // on a tab.
  protected onFocusOut(e: FocusEvent) {
    if (this.host.contains(e.relatedTarget as Node | null)) return;
    this.focusedIndex.set(null);
    if (this.mouseInside) return;
    this.hover.setActiveIndex(null);
  }

  protected onKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    const order = [...this.items.entries()].sort(([a], [b]) => a - b);
    const position = order.findIndex(([, el]) => el === target);
    if (position === -1) return;
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
        next = (position + 1) % order.length;
        break;
      case 'ArrowLeft':
        next = (position - 1 + order.length) % order.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = order.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const [index, element] = order[next];
    this.highlightedIndex.set(index);
    element.focus();
  }
}

/** A tab of a TabsSubtle: `<button ffTabsSubtleItem [index]="0" label="Recents" icon="clock">`. */
@Component({
  selector: 'button[ffTabsSubtleItem]',
  imports: [Icon, NgTemplateOutlet],
  template: `
    @if (iconName() || iconDefinition()) {
      <ff-icon
        [name]="iconName()"
        [icon]="iconDefinition()"
        [size]="size().icon"
        [strokeWidth]="isActive() ? 2 : 1.5"
        [class]="iconClass()"
      />
    }
    @if (collapseLabel()) {
      @if (labelRendered()) {
        <span #labelMotion class="overflow-hidden"><ng-container *ngTemplateOutlet="labelContent" /></span>
      }
    } @else {
      <ng-container *ngTemplateOutlet="labelContent" />
    }
    <ng-template #labelContent>
      <!-- Both stacked spans carry the text-box trim so the invisible bold
           sizer and the visible label keep identical boxes. -->
      <span #labelBox [class]="labelBoxClass()">
        <span
          class="col-start-1 row-start-1 invisible [text-box:trim-both_cap_alphabetic]"
          [style.font-variation-settings]="semibold"
          aria-hidden="true"
          >{{ label() }}</span
        >
        <span [class]="labelClass()" [style.font-variation-settings]="labelWeight()">{{ label() }}</span>
      </span>
    </ng-template>
  `,
  host: {
    type: 'button',
    role: 'tab',
    '[attr.aria-selected]': 'isSelected()',
    '[attr.tabindex]': 'isHighlighted() ? 0 : -1',
    '[attr.id]': 'idPrefix() ? idPrefix() + "-tab-" + index() : null',
    '[attr.aria-controls]': 'idPrefix() ? idPrefix() + "-panel-" + index() : null',
    '[attr.aria-label]': 'collapseLabel() && !showLabel() ? label() : null',
    '[attr.data-fluid-hover-index]': 'index()',
    '[class]': 'hostClass()',
    '(click)': 'list.select(index())',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsSubtleItem {
  /** Position of this tab within the list. */
  readonly index = input.required<number>();
  /** Text label. */
  readonly label = input.required<string>();
  /** Optional leading icon: an icon role name or an icon definition. */
  readonly icon = input<IconName | IconDefinition | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  protected readonly list = inject(TabsSubtle);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly shape = injectShape();
  protected readonly size = injectSize();
  private readonly reduced = inject(ReducedMotion).value;
  protected readonly semibold = fontWeights.semibold;

  protected readonly idPrefix = this.list.idPrefix;
  protected readonly iconName = computed(() => {
    const icon = this.icon();
    return typeof icon === 'string' ? icon : undefined;
  });
  protected readonly iconDefinition = computed(() => {
    const icon = this.icon();
    return icon !== undefined && typeof icon !== 'string' ? icon : undefined;
  });

  readonly isSelected = computed(() => this.list.selectedIndex() === this.index());
  protected readonly isHighlighted = computed(() => this.list.highlightedIndex() === this.index());
  readonly isActive = computed(() => this.list.hover.activeIndex() === this.index() || this.isSelected());
  protected readonly collapseLabel = computed(() => this.list.activeLabel() && this.icon() !== undefined);
  protected readonly showLabel = computed(() => !this.collapseLabel() || this.isSelected());
  /** Whether the collapsing label is in the DOM: shown, or still running its exit. */
  protected readonly labelRendered = linkedSignal<boolean, boolean>({
    source: this.showLabel,
    computation: (shown, previous) => (shown ? true : (previous?.value ?? false)),
  });

  protected readonly hostClass = computed(() => {
    const size = this.size();
    return cn(
      'relative z-10 flex items-center cursor-pointer bg-transparent border-none outline-none',
      size.control,
      size.px,
      !this.collapseLabel() && size.gap,
      this.shape().bg,
      this.userClass(),
    );
  });
  protected readonly iconClass = computed(() =>
    cn(
      'shrink-0 transition-[color,stroke-width] duration-80',
      this.isActive() ? 'text-foreground' : 'text-muted-foreground',
    ),
  );
  protected readonly labelBoxClass = computed(() => cn('inline-grid whitespace-nowrap', this.size().text));
  protected readonly labelClass = computed(() =>
    cn(
      'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]',
      this.isActive() ? 'text-foreground' : 'text-muted-foreground',
    ),
  );
  protected readonly labelWeight = computed(() => (this.isSelected() ? fontWeights.semibold : fontWeights.normal));

  private readonly labelMotion = viewChild<ElementRef<HTMLElement>>('labelMotion');
  private readonly labelBox = viewChild<ElementRef<HTMLElement>>('labelBox');
  // The collapsing label animates to a MEASURED layout width, not "auto":
  // offsetWidth is transform-immune, so a scaled ancestor can't skew it.
  private readonly labelWidth = signal<number | null>(null);

  constructor() {
    effect((onCleanup) => {
      const index = this.index();
      untracked(() => this.list.registerTab(index, this.host));
      onCleanup(() => this.list.unregisterTab(index, this.host));
    });

    // Measure the label box whenever it is (re)mounted, and keep measuring
    // while it lives.
    afterRenderEffect((onCleanup) => {
      const box = this.labelBox()?.nativeElement;
      if (!box) return;
      untracked(() => this.labelWidth.set(box.offsetWidth));
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => this.labelWidth.set(box.offsetWidth));
      ro.observe(box);
      onCleanup(() => ro.disconnect());
    });

    // The collapsing label's presence: width / opacity / margin spring in
    // when the tab becomes selected and out when it stops being selected.
    // The label shown on first render does not animate in (AnimatePresence
    // initial={false}).
    let firstRender = true;
    let animated: HTMLElement | null = null;
    let exiting = false;
    let current: FluidAnimation | null = null;
    afterRenderEffect(() => {
      const element = this.labelMotion()?.nativeElement ?? null;
      const shown = this.showLabel();
      const width = this.labelWidth();
      const compact = this.size().variant === 'compact';
      untracked(() => {
        const transition = { ...enterTransition(spring.fast), opacity: { duration: 0.06 } };
        if (!element) {
          animated = null;
          firstRender = false;
          return;
        }
        const target: Keyframes = {
          ...(width != null ? { width } : null),
          opacity: 1,
          // 8px matches the ladder's icon-to-label gap; compact is 6px.
          marginLeft: compact ? 6 : 8,
        };
        if (element !== animated) {
          animated = element;
          exiting = false;
          // Mounted while it should not show (activeLabel switched on for an
          // unselected tab): nothing to animate, just leave.
          if (!shown) {
            firstRender = false;
            this.labelRendered.set(false);
            return;
          }
          if (firstRender) {
            writeInitialStyles(element, target);
          } else {
            writeInitialStyles(element, { width: 0, opacity: 0, marginLeft: 0 });
            current = animateFluid(element, target, transition, this.reduced());
          }
          firstRender = false;
          return;
        }
        if (shown) {
          exiting = false;
          current?.stop();
          current = animateFluid(element, target, transition, this.reduced());
          return;
        }
        if (exiting) return;
        exiting = true;
        current?.stop();
        const exit = animateFluid(element, { width: 0, opacity: 0, marginLeft: 0 }, transition, this.reduced());
        current = exit;
        const done = () => {
          if (current !== exit || this.showLabel()) return;
          this.labelRendered.set(false);
        };
        exit.finished.then(done, done);
      });
    });
    inject(DestroyRef).onDestroy(() => current?.stop());
  }
}

/**
 * A panel for a TabsSubtle tab, rendered anywhere and linked to its tab
 * through the shared `idPrefix`. Content renders only while selected.
 */
@Component({
  selector: 'ff-tabs-subtle-panel',
  template: `
    @if (isSelected()) {
      <ng-content />
    }
  `,
  host: {
    role: 'tabpanel',
    tabindex: '-1',
    '[attr.id]': 'idPrefix() + "-panel-" + index()',
    '[attr.aria-labelledby]': 'idPrefix() + "-tab-" + index()',
    '[hidden]': '!isSelected()',
    '[style.display]': 'isSelected() ? null : "none"',
    '[class]': 'hostClass()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsSubtlePanel {
  /** Index of this panel. */
  readonly index = input.required<number>();
  /** Currently selected tab index. */
  readonly selectedIndex = input.required<number>();
  /** Must match the TabsSubtle idPrefix. */
  readonly idPrefix = input.required<string>();
  readonly userClass = input('', { alias: 'class' });

  protected readonly isSelected = computed(() => this.selectedIndex() === this.index());
  protected readonly hostClass = computed(() => cn('block outline-none', this.userClass()));
}
