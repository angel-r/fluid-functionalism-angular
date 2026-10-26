import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { animate, type AnimationPlaybackControls, type DOMKeyframesDefinition } from 'motion';
import { cn } from '../core/utils';
import { spring } from '../core/springs';
import { fontWeights } from '../core/font-weight';
import { injectShape } from '../core/shape';
import { injectSize, type SizeVariant } from '../core/size';
import { ReducedMotion } from '../core/environment';
import { animateFluid, enterTransition, exitTransition, type FluidAnimation } from '../core/motion';
import { Icon } from '../core/icon';
import { createFluidHover, type ItemRect } from '../fluid-hover/fluid-hover';
import { FluidHoverHighlight } from '../fluid-hover/fluid-hover-highlight';
import { Layer, isFocusVisible, provideSizeOverride, writeInitialStyles } from '../tabs/layer';

// ---------------------------------------------------------------------------
// Collapsible sections with a sprung height animation and a chevron that
// turns with it. `ff-accordion` is the standalone root (each row hovers on
// its own); `ff-accordion-group` adds one fluid hover highlight gliding
// across its triggers, a tinted block behind open items and a shared focus
// ring.
//
// The disclosure ARIA is written by hand rather than with
// @angular/aria/accordion: the primitive renders panel content lazily from an
// <ng-template>, hides collapsed panels with `inert` and gives triggers a
// roving tabindex, while this component keeps every panel mounted (so it can
// measure the height it springs to), applies `hidden` only once the exit
// animation has landed, and leaves every trigger in the tab order — the
// Base UI behavior the React source is built on.
// ---------------------------------------------------------------------------

export type AccordionType = 'single' | 'multiple';
export type AccordionHighlight = 'trigger' | 'item';

let nextId = 0;

const toList = (value: string | string[] | undefined): string[] =>
  Array.isArray(value) ? value : value ? [value] : [];

const TINT = 'bg-accent/20 dark:bg-accent/12 pointer-events-none';

/** State and behavior shared by the standalone and grouped roots. */
@Directive({
  host: {
    '[class]': 'hostClass()',
    '(keydown)': 'onKeydown($event)',
  },
})
export abstract class AccordionRoot {
  /** Whether one or multiple items can be expanded. */
  readonly type = input<AccordionType>('single');
  /** Controlled expanded value(s): a string in single mode, an array in
   *  multiple mode. Two-way bindable. */
  readonly value = input<string | string[] | undefined>(undefined);
  /** Initially expanded value(s) for uncontrolled use. */
  readonly defaultValue = input<string | string[] | undefined>(undefined);
  /** Emits the new expanded value(s) (React `onValueChange`): `''` when a
   *  single accordion collapses, an array in multiple mode. */
  readonly valueChange = output<string | string[]>();
  /** Accepted for API parity: single mode is always collapsible. */
  readonly collapsible = input(true, { transform: booleanAttribute });
  /** Pins the rows to one step of the size ladder. Omitted, they follow the
   *  surrounding size context. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  abstract readonly grouped: boolean;
  protected abstract readonly baseClass: string;
  protected readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  // Uncontrolled state, seeded once from defaultValue.
  private readonly internal = linkedSignal<string | string[] | undefined, string[]>({
    source: this.defaultValue,
    computation: (initial, previous) => previous?.value ?? toList(initial),
  });

  /** The expanded item values. */
  readonly openValues = computed<ReadonlySet<string>>(() => {
    const value = this.value();
    const list = value !== undefined ? toList(value) : this.internal();
    return new Set(this.type() === 'multiple' ? list : list.slice(0, 1));
  });

  protected readonly hostClass = computed(() => cn(this.baseClass, this.userClass()));

  private readonly triggers = new Set<HTMLButtonElement>();

  /** Opens or closes an item, reporting the new value(s). */
  toggle(value: string) {
    const open = this.openValues();
    const multiple = this.type() === 'multiple';
    const next = open.has(value)
      ? [...open].filter((v) => v !== value)
      : multiple
        ? [...open, value]
        : [value];
    if (this.value() === undefined) this.internal.set(next);
    this.valueChange.emit(multiple ? next : (next[0] ?? ''));
  }

  /** @internal */
  registerTrigger(trigger: HTMLButtonElement) {
    this.triggers.add(trigger);
  }

  /** @internal */
  unregisterTrigger(trigger: HTMLButtonElement) {
    this.triggers.delete(trigger);
  }

  // Arrow keys move between this root's triggers (wrapping), Home / End jump
  // to the ends. A nested accordion's triggers belong to its own root.
  protected onKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLButtonElement;
    if (!this.triggers.has(target)) return;
    const order = [...this.triggers]
      .filter((t) => !t.disabled)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1));
    const position = order.indexOf(target);
    if (position === -1) return;
    let next: number;
    switch (e.key) {
      case 'ArrowDown':
        next = (position + 1) % order.length;
        break;
      case 'ArrowUp':
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
    order[next].focus();
  }
}

/** A standalone accordion: `<ff-accordion type="single" defaultValue="item-1">`. */
@Component({
  selector: 'ff-accordion',
  template: '<ng-content />',
  providers: [
    { provide: AccordionRoot, useExisting: Accordion },
    provideSizeOverride(Accordion, (a) => a.size()),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Accordion extends AccordionRoot {
  readonly grouped = false;
  protected readonly baseClass = 'w-72 max-w-full flex flex-col';
}

/**
 * Accordion rows sharing one fluid hover highlight:
 * `<ff-accordion-group type="single" defaultValue="item-1">` with
 * `<ff-accordion-item [index]="i">` rows.
 */
@Component({
  selector: 'ff-accordion-group',
  imports: [FluidHoverHighlight],
  template: `
    <ng-container #expandedAnchor />
    <ff-fluid-hover-highlight [hover]="hover" [class]="shape().bg" />
    <ng-container #ringAnchor />
    <ng-content />
  `,
  host: {
    '(mouseenter)': 'hover.onMouseEnter()',
    '(mousemove)': 'onMouseMove($event)',
    '(mouseleave)': 'hover.onMouseLeave()',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [
    { provide: AccordionRoot, useExisting: AccordionGroup },
    provideSizeOverride(AccordionGroup, (g) => g.size()),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionGroup extends AccordionRoot {
  /** What an open item tints. "item" paints the row and its panel as one
   *  block while it stays open; "trigger" scopes the fill to the row and
   *  shows it on hover only. */
  readonly highlight = input<AccordionHighlight>('item');

  readonly grouped = true;
  protected readonly baseClass = 'relative flex flex-col w-72 max-w-full';
  protected readonly shape = injectShape();
  private readonly reduced = inject(ReducedMotion).value;
  readonly hover = createFluidHover(() => this.host);

  private readonly fullItems = new Map<number, HTMLElement>();
  private readonly fullItemsVersion = signal(0);
  /** Rects of the open items (row + panel), in the group's layout space. */
  readonly openItemRects = signal<ReadonlyMap<number, ItemRect>>(new Map());
  private readonly focusedIndex = signal<number | null>(null);

  private readonly expandedAnchor = viewChild.required('expandedAnchor', { read: ElementRef });
  private readonly ringAnchor = viewChild.required('ringAnchor', { read: ElementRef });
  private readonly expandedLayers = new Map<number, Layer>();
  private readonly focusRing = new Layer(() => this.ringAnchor().nativeElement, this.reduced, 'focus-ring');

  constructor() {
    super();
    // Re-measure when the open set or the registered items change.
    afterRenderEffect(() => {
      this.openValues();
      this.fullItemsVersion();
      untracked(() => this.remeasure());
    });
    afterRenderEffect(() => {
      const open = this.openItemRects();
      const rects = this.hover.itemRects();
      const active = this.hover.activeIndex();
      const focused = this.focusedIndex();
      const highlight = this.highlight();
      const shape = this.shape();
      untracked(() => this.drawLayers(open, rects, active, focused, highlight, shape.bg, shape.focusRing));
    });
    inject(DestroyRef).onDestroy(() => {
      this.expandedLayers.forEach((layer) => layer.destroy());
      this.focusRing.destroy();
    });
  }

  /** @internal Registers the element of an open item at `index` (null when it closes). */
  registerFullItem(index: number, element: HTMLElement | null) {
    if (element) this.fullItems.set(index, element);
    else if (!this.fullItems.has(index)) return;
    else this.fullItems.delete(index);
    this.fullItemsVersion.update((v) => v + 1);
  }

  /** Re-reads trigger and open-item rects synchronously (each frame of a
   *  height animation, so the highlights hug the moving rows). */
  remeasure() {
    this.hover.measureItems();
    this.measureFullItems();
  }

  private measureFullItems() {
    const next = new Map<number, ItemRect>();
    this.fullItems.forEach((el, index) => {
      next.set(index, { top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight });
    });
    // Skip the update when nothing moved: this runs per animation frame.
    const prev = untracked(this.openItemRects);
    let changed = prev.size !== next.size;
    if (!changed) {
      for (const [index, r] of next) {
        const p = prev.get(index);
        if (!p || p.top !== r.top || p.left !== r.left || p.width !== r.width || p.height !== r.height) {
          changed = true;
          break;
        }
      }
    }
    if (changed) this.openItemRects.set(next);
  }

  private drawLayers(
    open: ReadonlyMap<number, ItemRect>,
    rects: ItemRect[],
    active: number | null,
    focused: number | null,
    highlight: AccordionHighlight,
    bg: string,
    focusRingClass: string,
  ) {
    // "item" tints each open item (row + panel); "trigger" tints only the
    // open row the pointer is on, using the trigger rect fluid hover tracks.
    const expanded = new Map<number, ItemRect>();
    for (const [index, rect] of open) {
      if (highlight === 'item') expanded.set(index, rect);
      else if (index === active && rects[index]) expanded.set(index, rects[index]);
    }
    const isHoveringNonOpen = active !== null && !open.has(active);

    for (const [index, rect] of expanded) {
      let layer = this.expandedLayers.get(index);
      if (!layer) {
        layer = new Layer(() => this.expandedAnchor().nativeElement, this.reduced, 'expanded-bg');
        this.expandedLayers.set(index, layer);
      }
      const frames = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
      // Geometry snaps (duration 0) so the tint hugs the animating item; it
      // fades in from the item's current rect.
      layer.show(
        cn('absolute', bg, TINT),
        { ...frames, opacity: isHoveringNonOpen ? 0.7 : 1 },
        {
          top: { duration: 0 },
          left: { duration: 0 },
          width: { duration: 0 },
          height: { duration: 0 },
          opacity: { duration: 0.12 },
        },
        { ...frames, opacity: 0 },
      );
    }
    for (const [index, layer] of this.expandedLayers) {
      if (!expanded.has(index)) layer.hide({ keyframes: { opacity: 0 }, transition: exitTransition(spring.moderate) });
    }

    const focusRect = focused !== null ? rects[focused] : undefined;
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

  // A pointer over an open item's panel highlights nothing: the hover fill
  // is for rows, not for the content below them.
  protected onMouseMove(e: MouseEvent) {
    const container = this.host;
    const cRect = container.getBoundingClientRect();
    const layoutH = container.offsetHeight;
    const scale = layoutH > 0 ? cRect.height / layoutH : 1;
    const localY = (e.clientY - cRect.top) / scale + container.scrollTop;
    const rects = untracked(this.hover.itemRects);
    for (const [index, full] of untracked(this.openItemRects)) {
      const trigger = rects[index];
      if (!trigger) continue;
      const contentTop = trigger.top + trigger.height;
      const contentBottom = full.top + full.height;
      if (localY >= contentTop && localY <= contentBottom) {
        this.hover.setActiveIndex(null);
        return;
      }
    }
    this.hover.onMouseMove(e);
  }

  protected onFocusIn(e: FocusEvent) {
    const target = e.target as HTMLElement;
    const indexAttr = target.closest('[data-fluid-hover-index]')?.getAttribute('data-fluid-hover-index');
    if (indexAttr == null) return;
    const index = Number(indexAttr);
    this.hover.setActiveIndex(index);
    this.focusedIndex.set(isFocusVisible(target) ? index : null);
  }

  protected onFocusOut(e: FocusEvent) {
    if (this.host.contains(e.relatedTarget as Node | null)) return;
    this.focusedIndex.set(null);
    this.hover.setActiveIndex(null);
  }
}

/** One collapsible section: `<ff-accordion-item value="item-1" [index]="0">`. */
@Component({
  selector: 'ff-accordion-item',
  template: `
    <ng-container #tintAnchor />
    <ng-content />
  `,
  host: {
    '[class]': 'hostClass()',
    '[attr.data-fluid-hover-index]': 'index() ?? null',
    '[attr.data-open]': 'isOpen() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionItem {
  /** Unique identifier for this item. */
  readonly value = input.required<string>();
  /** Position for fluid hover. Required inside AccordionGroup, omit for standalone. */
  readonly index = input<number | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Standalone equivalent of AccordionGroup's `highlight`. Ignored inside a
   *  group, which decides for all its rows. */
  readonly highlight = input<AccordionHighlight>('item');
  readonly userClass = input('', { alias: 'class' });

  readonly root = inject(AccordionRoot);
  readonly group = this.root instanceof AccordionGroup ? this.root : null;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly shape = injectShape();
  private readonly reduced = inject(ReducedMotion).value;

  readonly triggerId = `ff-accordion-trigger-${++nextId}`;
  readonly panelId = `ff-accordion-panel-${nextId}`;
  readonly isOpen = computed(() => this.root.openValues().has(this.value()));
  /** The highlight choice in effect: the group's, or this item's standalone. */
  readonly highlightMode = computed(() => this.group?.highlight() ?? this.highlight());

  protected readonly hostClass = computed(() => cn(!this.group && 'relative', this.userClass()));

  private readonly tintAnchor = viewChild.required('tintAnchor', { read: ElementRef });
  private readonly openTint = new Layer(() => this.tintAnchor().nativeElement, this.reduced, 'open-tint');

  constructor() {
    // Inside a group, an open item reports its element so the group can
    // paint the block behind row + panel.
    afterRenderEffect((onCleanup) => {
      const group = this.group;
      const index = this.index();
      const open = this.isOpen();
      if (!group || index === undefined) return;
      untracked(() => group.registerFullItem(index, open ? this.host : null));
      onCleanup(() => group.registerFullItem(index, null));
    });
    // Standalone expanded background. Under "trigger" the tint lives in the
    // trigger instead, covering the row and not the panel below it.
    afterRenderEffect(() => {
      const show = !this.group && this.highlight() === 'item' && this.isOpen();
      const bg = this.shape().bg;
      untracked(() => {
        if (show) {
          this.openTint.show(cn('absolute inset-0', bg, TINT), { opacity: 1 }, { duration: 0.12 }, { opacity: 0 });
        } else {
          this.openTint.hide({ keyframes: { opacity: 0 }, transition: exitTransition(spring.moderate) });
        }
      });
    });
    inject(DestroyRef).onDestroy(() => this.openTint.destroy());
  }

  /** Opens or closes this item, unless disabled. */
  toggle() {
    if (this.disabled()) return;
    this.root.toggle(this.value());
  }
}

/** The row that toggles its item: `<ff-accordion-trigger>Label</ff-accordion-trigger>`. */
@Component({
  selector: 'ff-accordion-trigger',
  imports: [Icon],
  template: `
    <div
      #wrap
      [class.relative]="!item.group"
      (mouseenter)="hovered.set(true)"
      (mouseleave)="hovered.set(false)"
    >
      <ng-container #tintAnchor />
      <ng-container #hoverAnchor />
      <!-- The header is a <div>: an <h3> would be more semantic but breaks
           the ancestor selectors the styles rely on. -->
      <div [attr.data-open]="isOpen() ? '' : null">
        <button
          #button
          type="button"
          [id]="item.triggerId"
          [attr.aria-expanded]="isOpen()"
          [attr.aria-controls]="item.panelId"
          [disabled]="item.disabled()"
          [attr.data-panel-open]="isOpen() ? '' : null"
          [attr.data-disabled]="item.disabled() ? '' : null"
          [class]="buttonClass()"
          (click)="item.toggle()"
        >
          <!-- Label with dual-layer text: an invisible semibold copy reserves
               the bold width so the row doesn't shift when it opens. -->
          <span [class]="labelBoxClass()">
            <span #sizer class="col-start-1 row-start-1 invisible" [style.font-variation-settings]="semibold" aria-hidden="true"></span>
            <span #label [class]="labelClass()" [style.font-variation-settings]="labelWeight()"><ng-content /></span>
          </span>
          <span #chevron class="shrink-0 inline-flex items-center justify-center">
            <ff-icon
              name="chevron-right"
              [size]="size().icon"
              [strokeWidth]="isOpen() || isActive() ? 2 : 1.5"
              [class]="chevronClass()"
            />
          </span>
        </button>
      </div>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionTrigger {
  /** Classes for the trigger button (merged over its own). */
  readonly userClass = input('', { alias: 'class' });

  protected readonly item = inject(AccordionItem);
  private readonly shape = injectShape();
  protected readonly size = injectSize();
  private readonly reduced = inject(ReducedMotion).value;
  protected readonly semibold = fontWeights.semibold;
  protected readonly hovered = signal(false);

  protected readonly isOpen = this.item.isOpen;
  protected readonly isActive = computed(() => {
    const group = this.item.group;
    return group ? group.hover.activeIndex() === this.item.index() : this.hovered();
  });

  protected readonly buttonClass = computed(() => {
    const size = this.size();
    return cn(
      `relative z-10 flex items-center ${size.gap} ${this.shape().item} ${size.px} ${size.variant === 'compact' ? 'py-1' : 'py-2'} w-full cursor-pointer outline-none select-none`,
      !this.item.group &&
        'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] focus-visible:ring-offset-0',
      this.userClass(),
    );
  });
  protected readonly labelBoxClass = computed(() => cn('inline-grid flex-1 text-left', this.size().text));
  protected readonly labelClass = computed(() =>
    cn(
      'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80',
      this.isOpen() || this.isActive() ? 'text-foreground' : 'text-muted-foreground',
    ),
  );
  protected readonly labelWeight = computed(() => (this.isOpen() ? fontWeights.semibold : fontWeights.normal));
  protected readonly chevronClass = computed(() =>
    cn(
      'transition-[color,stroke-width] duration-80',
      this.isOpen() || this.isActive() ? 'text-foreground' : 'text-muted-foreground',
    ),
  );

  private readonly wrap = viewChild.required<ElementRef<HTMLElement>>('wrap');
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');
  private readonly label = viewChild.required<ElementRef<HTMLElement>>('label');
  private readonly sizer = viewChild.required<ElementRef<HTMLElement>>('sizer');
  private readonly chevron = viewChild.required<ElementRef<HTMLElement>>('chevron');
  private readonly tintAnchor = viewChild.required('tintAnchor', { read: ElementRef });
  private readonly hoverAnchor = viewChild.required('hoverAnchor', { read: ElementRef });
  private readonly openTint = new Layer(() => this.tintAnchor().nativeElement, this.reduced, 'open-tint');
  private readonly hoverTint = new Layer(() => this.hoverAnchor().nativeElement, this.reduced, 'hover-tint');

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const button = this.button().nativeElement;
      this.item.root.registerTrigger(button);
      destroyRef.onDestroy(() => this.item.root.unregisterTrigger(button));
      // The sizer mirrors the projected label's text (content projects once).
      const label = this.label().nativeElement;
      const sizer = this.sizer().nativeElement;
      const copy = () => {
        const text = label.textContent ?? '';
        if (sizer.textContent !== text) sizer.textContent = text;
      };
      copy();
      if (typeof MutationObserver === 'undefined') return;
      const mo = new MutationObserver(copy);
      mo.observe(label, { childList: true, characterData: true, subtree: true });
      destroyRef.onDestroy(() => mo.disconnect());
    });

    // Inside a group the wrapper is the row fluid hover measures.
    afterRenderEffect((onCleanup) => {
      const group = this.item.group;
      const index = this.item.index();
      const wrap = this.wrap().nativeElement;
      if (!group || index === undefined) return;
      untracked(() => group.hover.registerItem(index, wrap));
      onCleanup(() => group.hover.unregisterItem(index, wrap));
    });

    // The chevron turns on spring.fast; the state at mount is not animated.
    let chevronStyled = false;
    let chevronAnimation: FluidAnimation | null = null;
    afterRenderEffect(() => {
      const rotate = this.isOpen() ? 90 : 0;
      const chevron = this.chevron().nativeElement;
      untracked(() => {
        if (!chevronStyled) {
          chevronStyled = true;
          writeInitialStyles(chevron, { rotate });
          return;
        }
        chevronAnimation?.stop();
        chevronAnimation = animateFluid(chevron, { rotate }, enterTransition(spring.fast), this.reduced());
      });
    });

    // Standalone tints, scoped to this row: the open tint (under "trigger")
    // and the hover fill.
    afterRenderEffect(() => {
      const standalone = !this.item.group;
      const hovered = this.hovered();
      const showOpenTint = standalone && this.isOpen() && this.item.highlight() === 'trigger' && hovered;
      const showHover = standalone && hovered;
      const bg = this.shape().bg;
      untracked(() => {
        if (showOpenTint) {
          this.openTint.show(cn('absolute inset-0', bg, TINT), { opacity: 1 }, { duration: 0.12 }, { opacity: 0 });
        } else {
          // The expanded tint rides the moderate tier: it marks a state.
          this.openTint.hide({ keyframes: { opacity: 0 }, transition: exitTransition(spring.moderate) });
        }
        if (showHover) {
          this.hoverTint.show(
            cn('absolute inset-0', bg, 'bg-hover pointer-events-none'),
            { opacity: 1 },
            { duration: 0.08 },
            { opacity: 0 },
          );
        } else {
          this.hoverTint.hide({ keyframes: { opacity: 0 }, transition: exitTransition(spring.fast) });
        }
      });
    });

    destroyRef.onDestroy(() => {
      chevronAnimation?.stop();
      this.openTint.destroy();
      this.hoverTint.destroy();
    });
  }
}

/** The collapsible body of an item: `<ff-accordion-content>...</ff-accordion-content>`. */
@Component({
  selector: 'ff-accordion-content',
  template: `
    <div
      #motion
      role="region"
      [id]="item.panelId"
      [attr.aria-labelledby]="item.triggerId"
      [attr.data-open]="item.isOpen() ? '' : null"
      [hidden]="hidden()"
      [class]="motionClass()"
    >
      <div #measure [class]="measureClass()"><ng-content /></div>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionContent {
  /** Classes for the clipping element (merged over `overflow-hidden`). */
  readonly userClass = input('', { alias: 'class' });

  protected readonly item = inject(AccordionItem);
  private readonly size = injectSize();
  private readonly reduced = inject(ReducedMotion).value;

  protected readonly motionClass = computed(() => cn('overflow-hidden', this.userClass()));
  protected readonly measureClass = computed(() => {
    const size = this.size();
    return cn('pt-1 text-muted-foreground', size.px, size.text, size.variant === 'compact' ? 'pb-2.5' : 'pb-3');
  });

  // The open height is a self-measured LAYOUT pixel value, not "auto":
  // offsetHeight and ResizeObserver are transform-immune, so a scaled
  // ancestor can't make the spring overshoot.
  private readonly contentHeight = signal<number | null>(null);
  // Whether the height exit has fully finished. `hidden` (display: none)
  // lands only then, or it would freeze the exit mid-flight.
  private readonly exitComplete = linkedSignal<boolean, boolean>({
    source: this.item.isOpen,
    computation: (open, previous) => (previous === undefined ? !open : false),
  });
  protected readonly hidden = computed(() => {
    // Read first, unconditionally: the linked signal must be seeded while
    // the item is still open, or its first computation would run after a
    // close and read as "exit already complete".
    const exitComplete = this.exitComplete();
    return !this.item.isOpen() && exitComplete;
  });

  private readonly motionEl = viewChild.required<ElementRef<HTMLElement>>('motion');
  private readonly measureEl = viewChild.required<ElementRef<HTMLElement>>('measure');

  private previousOpen: boolean | undefined;
  // Height springs only when THIS panel toggles. When contentHeight changes
  // underneath it (anything collapsible nested inside), it snaps, so the
  // rows below don't trail a re-targeted spring.
  private toggling = false;
  private styled = false;
  private animation: AnimationPlaybackControls | null = null;
  private frame: number | null = null;
  private lastTarget = '';

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const measure = this.measureEl().nativeElement;
      if (measure.offsetHeight > 0) this.contentHeight.set(measure.offsetHeight);
      if (typeof ResizeObserver === 'undefined') return;
      // Ignore the 0 reported while the panel is display: none.
      const ro = new ResizeObserver(() => {
        if (measure.offsetHeight > 0) this.contentHeight.set(measure.offsetHeight);
      });
      ro.observe(measure);
      destroyRef.onDestroy(() => ro.disconnect());
    });

    afterRenderEffect(() => {
      const open = this.item.isOpen();
      const height = this.contentHeight();
      untracked(() => this.sync(open, height));
    });

    destroyRef.onDestroy(() => {
      this.animation?.stop();
      this.stopFrames();
    });
  }

  private sync(open: boolean, measured: number | null) {
    if (this.previousOpen !== undefined && this.previousOpen !== open) this.toggling = true;
    this.previousOpen = open;

    // Re-measure as it opens, so the spring's target is the fresh layout
    // height from its first frame.
    let height = measured;
    const measure = this.measureEl().nativeElement;
    if (open && measure.offsetHeight > 0 && measure.offsetHeight !== height) {
      height = measure.offsetHeight;
      this.contentHeight.set(height);
    }

    const element = this.motionEl().nativeElement;
    const targetHeight = open ? height : 0;
    const opacity = open ? 1 : 0;
    const key = `${open}:${targetHeight}`;
    if (key === this.lastTarget && this.styled) return;
    this.lastTarget = key;

    const instant = this.reduced() || !this.toggling || !this.styled || targetHeight === null;
    if (instant) {
      this.animation?.stop();
      this.animation = null;
      this.stopFrames();
      this.snap(element, targetHeight, opacity);
      this.styled = true;
      this.complete(open);
      return;
    }

    this.animation?.stop();
    // spring.fast lands with the chevron; a close takes the quicker exit
    // tier. Opacity runs ahead of the height on its own timing so the body
    // dissolves rather than being sliced by the clip edge.
    const animation = animate(
      element,
      { height: targetHeight, opacity } as DOMKeyframesDefinition,
      open
        ? { ...enterTransition(spring.fast), opacity: { duration: 0.06 } }
        : { ...exitTransition(spring.fast), opacity: { duration: 0.04 } },
    );
    this.animation = animation;
    this.startFrames();
    const done = () => {
      if (this.animation !== animation) return;
      this.animation = null;
      this.stopFrames();
      this.complete(this.item.isOpen());
    };
    animation.finished.then(done, done);
  }

  /** Applies a target with no animation, keeping motion's value store in step. */
  private snap(element: HTMLElement, height: number | null, opacity: number) {
    if (!this.styled) {
      if (height === null) writeInitialStyles(element, { opacity });
      else writeInitialStyles(element, { height, opacity });
      return;
    }
    if (height === null) element.style.removeProperty('height');
    else element.style.height = `${height}px`;
    element.style.opacity = String(opacity);
    animate(
      element,
      (height === null ? { opacity } : { height, opacity }) as DOMKeyframesDefinition,
      { duration: 0 },
    );
  }

  private complete(open: boolean) {
    this.toggling = false;
    this.item.group?.remeasure();
    if (!open) this.exitComplete.set(true);
  }

  // The group's highlights follow the rows below a moving panel frame by frame.
  private startFrames() {
    const group = this.item.group;
    if (!group || this.frame !== null) return;
    const tick = () => {
      group.remeasure();
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  private stopFrames() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }
}
