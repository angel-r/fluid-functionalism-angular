import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  type EmbeddedViewRef,
  InjectionToken,
  Injector,
  Renderer2,
  TemplateRef,
  ViewContainerRef,
  afterRenderEffect,
  computed,
  contentChild,
  effect,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  type ConnectedPosition,
  type FlexibleConnectedPositionStrategy,
  type OverlayRef,
  createFlexibleConnectedPositionStrategy,
  createOverlayRef,
  createRepositionScrollStrategy,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { animate } from 'motion';
import { cn } from '../core/utils';
import { Icon } from '../core/icon';
import { shapeMap } from '../core/shape';
import { injectSize } from '../core/size';
import { exitFallbackMs, spring } from '../core/springs';
import { Elevated } from '../core/surface';
import { isDisabledRow, popupMotionClass, popupScrollAreaClass, popupViewportClass } from '../core/popup';
import { type FluidAnimation, enterTransition, exitTransition, injectAnimateFluid } from '../core/motion';
import { type ItemRect, createFluidHover } from '../fluid-hover/fluid-hover';
import { FluidHoverHighlight } from '../fluid-hover/fluid-hover-highlight';
import { SelectionBackgrounds, createMergeSplitBlocks, createSelectionRuns } from '../merge-split/merge-split';
import { ScrollArea } from '../scroll-area/scroll-area';
import {
  COMBOBOX_CREATE_VALUE,
  Combobox,
  type ComboboxItemData,
  comboboxItemLabel,
  comboboxItemValue,
} from './combobox-root';
import { type ComboboxIcon, comboboxIconInputs } from './combobox-field';

// The field follows the global pill/rounded shape; the popup does not. Like
// Dropdown, the list keeps the smaller "rounded" radii whatever the rest of
// the UI is shaped: pill corners on a popover distort its padding and break
// the concentric fit of the rows' hover and selection backgrounds inside it.
const popupShape = shapeMap.rounded;

export type ComboboxSide = 'top' | 'bottom' | 'left' | 'right';
export type ComboboxAlign = 'start' | 'center' | 'end';

const OPPOSITE: Record<ComboboxSide, ComboboxSide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/** Collision padding against the viewport edges, as Base UI's default. */
const VIEWPORT_MARGIN = 5;

function connectedPosition(side: ComboboxSide, align: ComboboxAlign, offset: number): ConnectedPosition {
  const x = align === 'center' ? 'center' : align;
  const y = align === 'start' ? 'top' : align === 'end' ? 'bottom' : 'center';
  switch (side) {
    case 'bottom':
      return { originX: x, originY: 'bottom', overlayX: x, overlayY: 'top', offsetY: offset };
    case 'top':
      return { originX: x, originY: 'top', overlayX: x, overlayY: 'bottom', offsetY: -offset };
    case 'left':
      return { originX: 'start', originY: y, overlayX: 'end', overlayY: y, offsetX: -offset };
    case 'right':
      return { originX: 'end', originY: y, overlayX: 'start', overlayY: y, offsetX: offset };
  }
}

/** The side a resolved CDK position sits on (after collision flipping). */
function sideOf(position: ConnectedPosition): ComboboxSide {
  if (position.originY === 'top' && position.overlayY === 'bottom') return 'top';
  if (position.originY === 'bottom' && position.overlayY === 'top') return 'bottom';
  return position.originX === 'start' && position.overlayX === 'end' ? 'left' : 'right';
}

/** What `--popup-enter-y` resolves to on each side (see `popupMotionClass`). */
function enterOffset(side: ComboboxSide): number {
  return side === 'bottom' ? -4 : side === 'top' ? 4 : 0;
}

// ---------------------------------------------------------------------------
// ComboboxContent — the popup surface. Holds ComboboxEmpty and ComboboxList.
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-combobox-content',
  imports: [Elevated],
  host: { style: 'display: contents' },
  template: `
    <ng-template #popup>
      <div data-slot="combobox-motion" [class]="motionClass">
        <!-- min-w tracks the field via --anchor-width; the list inside owns
             padding and scrolling. A press anywhere in the popup keeps focus
             in the input. -->
        <div
          data-slot="combobox-popup"
          [ffElevated]="2"
          [shadowLevel]="3"
          [class]="popupClass()"
          (mousedown)="$event.preventDefault()"
        >
          <ng-content />
        </div>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComboboxContent {
  /** Side of the field the popup prefers. */
  readonly side = input<ComboboxSide>('bottom');
  /** Alignment against the field. */
  readonly align = input<ComboboxAlign>('start');
  /** Gap to the field, in px. */
  readonly sideOffset = input(6, { transform: numberAttribute });
  readonly userClass = input('', { alias: 'class' });

  private readonly root = inject(Combobox);
  private readonly injector = inject(Injector);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly document = inject(DOCUMENT);
  private readonly animate = injectAnimateFluid();
  private readonly popupTemplate = viewChild.required<TemplateRef<unknown>>('popup');

  protected readonly motionClass = popupMotionClass;
  protected readonly popupClass = computed(() =>
    cn(
      `flex flex-col min-w-[var(--anchor-width)] max-h-[min(300px,var(--available-height))] overflow-hidden ${popupShape.container} select-none outline-none`,
      this.userClass(),
    ),
  );

  private overlayRef: OverlayRef | null = null;
  private positionStrategy: FlexibleConnectedPositionStrategy | null = null;
  private view: EmbeddedViewRef<unknown> | null = null;
  private motionElement: HTMLElement | null = null;
  private animation: FluidAnimation | null = null;
  private exiting = false;
  private exitTimer: ReturnType<typeof setTimeout> | undefined;
  private resolvedSide: ComboboxSide = 'bottom';
  private anchorObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const open = this.root.open();
      untracked(() => (open ? this.show() : this.hide()));
    });

    effect(() => {
      const positions = this.positions();
      untracked(() => {
        this.positionStrategy?.withPositions(positions);
        this.overlayRef?.updatePosition();
      });
    });

    // Non-modal: the popup tracks its field as the list filters (a popup
    // flipped above the field grows upward) and as chips wrap.
    afterRenderEffect(() => {
      this.root.listItems();
      this.root.values();
      untracked(() => this.reposition());
    });

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.exitTimer);
      this.animation?.stop();
      this.anchorObserver?.disconnect();
      this.overlayRef?.dispose();
      this.overlayRef = null;
      this.root.mounted.set(false);
      this.root.popup.set(null);
    });
  }

  private positions() {
    const side = this.side();
    return [side, OPPOSITE[side]].map((s) => connectedPosition(s, this.align(), this.sideOffset()));
  }

  private ensureOverlay(anchor: HTMLElement): OverlayRef {
    if (this.overlayRef) return this.overlayRef;
    const strategy = createFlexibleConnectedPositionStrategy(this.injector, anchor)
      .withPositions(untracked(() => this.positions()))
      .withFlexibleDimensions(false)
      .withPush(true)
      .withViewportMargin(VIEWPORT_MARGIN);
    strategy.positionChanges.subscribe((change) => {
      this.resolvedSide = sideOf(change.connectionPair);
      this.overlayRef?.overlayElement.setAttribute('data-side', this.resolvedSide);
      this.syncAnchorVars();
    });
    this.positionStrategy = strategy;
    this.overlayRef = createOverlayRef(this.injector, {
      positionStrategy: strategy,
      scrollStrategy: createRepositionScrollStrategy(this.injector),
      panelClass: ['z-50', 'outline-none'],
    });
    return this.overlayRef;
  }

  /** The Positioner's CSS variables: the field's width and the room on the resolved side. */
  private syncAnchorVars() {
    const anchor = untracked(this.root.anchor);
    const pane = this.overlayRef?.overlayElement;
    if (!anchor || !pane) return;
    const rect = anchor.getBoundingClientRect();
    const viewportHeight = this.document.documentElement.clientHeight || this.document.defaultView?.innerHeight || 0;
    const offset = untracked(this.sideOffset);
    const side = this.resolvedSide;
    const room =
      side === 'top'
        ? rect.top - offset - VIEWPORT_MARGIN
        : side === 'bottom'
          ? viewportHeight - rect.bottom - offset - VIEWPORT_MARGIN
          : viewportHeight - 2 * VIEWPORT_MARGIN;
    pane.style.setProperty('--anchor-width', `${anchor.offsetWidth}px`);
    pane.style.setProperty('--available-height', `${Math.max(0, room)}px`);
  }

  private reposition() {
    if (!this.overlayRef?.hasAttached()) return;
    this.syncAnchorVars();
    this.overlayRef.updatePosition();
  }

  private show() {
    clearTimeout(this.exitTimer);
    const anchor = untracked(this.root.anchor);
    if (!anchor) return;
    const overlayRef = this.ensureOverlay(anchor);
    this.positionStrategy?.setOrigin(anchor);
    if (!overlayRef.hasAttached()) {
      this.resolvedSide = untracked(this.side);
      overlayRef.overlayElement.setAttribute('data-side', this.resolvedSide);
      overlayRef.overlayElement.setAttribute('data-align', untracked(this.align));
      this.syncAnchorVars();
      this.root.mounted.set(true);
      this.view = overlayRef.attach(new TemplatePortal(this.popupTemplate(), this.viewContainerRef));
      this.view.detectChanges();
      this.motionElement = this.view.rootNodes.find((n): n is HTMLElement => n instanceof HTMLElement) ?? null;
      this.root.popup.set((this.motionElement?.firstElementChild as HTMLElement | null) ?? null);
      this.observeAnchor(anchor);
      this.exiting = false;
      const el = this.motionElement;
      if (el) {
        el.style.opacity = '0';
        this.animation = this.animate(
          el,
          { opacity: [0, 1], y: [enterOffset(this.resolvedSide), 0], scaleY: [0.96, 1] },
          enterTransition(spring.fast),
        );
      }
      return;
    }
    // Reopened mid-exit: turn the exit around from where it is.
    if (this.exiting && this.motionElement) {
      this.exiting = false;
      this.animation?.stop();
      this.animation = this.animate(this.motionElement, { opacity: 1, y: 0, scaleY: 1 }, enterTransition(spring.fast));
    }
  }

  private hide() {
    if (!this.overlayRef?.hasAttached() || this.exiting) return;
    this.exiting = true;
    const el = this.motionElement;
    if (el) {
      this.animation?.stop();
      const animation = this.animate(
        el,
        { opacity: 0, y: enterOffset(this.resolvedSide), scaleY: 0.96 },
        exitTransition(spring.fast),
      );
      this.animation = animation;
      // Release the deferred unmount once the exit has played.
      animation.finished.then(() => {
        if (this.exiting && this.animation === animation) this.detach();
      });
    }
    // Fallback release: animation callbacks can stall in throttled or
    // background tabs. The popup exits on the fast tier.
    this.exitTimer = setTimeout(() => {
      if (this.exiting) this.detach();
    }, exitFallbackMs(spring.fast));
  }

  private detach() {
    clearTimeout(this.exitTimer);
    this.exiting = false;
    this.animation?.stop();
    this.animation = null;
    this.anchorObserver?.disconnect();
    this.anchorObserver = null;
    if (this.overlayRef?.hasAttached()) this.overlayRef.detach();
    this.view = null;
    this.motionElement = null;
    this.root.popup.set(null);
    this.root.mounted.set(false);
  }

  private observeAnchor(anchor: HTMLElement) {
    this.anchorObserver?.disconnect();
    if (typeof ResizeObserver === 'undefined') return;
    this.anchorObserver = new ResizeObserver(() => this.reposition());
    this.anchorObserver.observe(anchor);
  }
}

// ---------------------------------------------------------------------------
// Row template
// ---------------------------------------------------------------------------

/** What a row template receives. `$implicit` is the item itself. */
export interface ComboboxRowContext<T = any> {
  $implicit: T;
  value: string;
  label: string;
  index: number;
}

/**
 * Marks the template ComboboxList stamps once per matching item (the React
 * function child): `<ng-template ffComboboxRow let-item let-value="value" let-label="label">`.
 */
@Directive({ selector: 'ng-template[ffComboboxRow]' })
export class ComboboxRow {
  readonly template = inject<TemplateRef<ComboboxRowContext>>(TemplateRef);

  static ngTemplateContextGuard(_dir: ComboboxRow, ctx: unknown): ctx is ComboboxRowContext {
    return true;
  }
}

// ---------------------------------------------------------------------------
// The single-mode checked marker: one background that glides between rows.
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-combobox-checked-marker',
  template: '',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComboboxCheckedMarker {
  /** The checked row's rect; null hides the marker (fade out). */
  readonly rect = input<ItemRect | null>(null);
  /** Snap (no travel) while a filter reflow moves the rows. */
  readonly snap = input(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly animate = injectAnimateFluid();
  private live: HTMLDivElement | null = null;
  private readonly exiting = new Set<HTMLElement>();

  constructor() {
    effect(() => {
      const rect = this.rect();
      const snap = this.snap();
      untracked(() => this.render(rect, snap));
    });
    inject(DestroyRef).onDestroy(() => {
      this.live?.remove();
      this.exiting.forEach((el) => el.remove());
    });
  }

  private render(rect: ItemRect | null, snap: boolean) {
    if (!rect) {
      const el = this.live;
      if (!el) return;
      this.live = null;
      this.exiting.add(el);
      animate(el, { opacity: 0 }, exitTransition(spring.moderate)).finished.then(() => {
        this.exiting.delete(el);
        el.remove();
      });
      return;
    }
    const target = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    if (!this.live) {
      // initial={false}: the marker mounts on its row, already visible.
      const el = this.renderer.createElement('div') as HTMLDivElement;
      el.className = `absolute ${popupShape.bg} bg-active pointer-events-none`;
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('data-slot', 'combobox-checked');
      el.style.top = `${target.top}px`;
      el.style.left = `${target.left}px`;
      el.style.width = `${target.width}px`;
      el.style.height = `${target.height}px`;
      el.style.opacity = '1';
      this.renderer.appendChild(this.host, el);
      this.live = el;
      return;
    }
    this.animate(
      this.live,
      { ...target, opacity: 1 },
      snap ? { duration: 0 } : { ...enterTransition(spring.moderate), opacity: { duration: 0.08 } },
    );
  }
}

// ---------------------------------------------------------------------------
// ComboboxItem
// ---------------------------------------------------------------------------

/** The list rows register with. */
export const COMBOBOX_LIST = new InjectionToken<ComboboxListHandle>('FF_COMBOBOX_LIST');

export interface ComboboxListHandle {
  readonly hover: ReturnType<typeof createFluidHover>;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

@Component({
  selector: 'ff-combobox-item',
  imports: [Icon],
  host: {
    role: 'option',
    '[attr.id]': 'id()',
    '[attr.aria-selected]': 'checked() ? "true" : "false"',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '[attr.data-selected]': 'checked() ? "" : null',
    '[attr.data-fluid-hover-index]': 'index() < 0 ? null : index()',
    '[attr.data-value]': 'value()',
    '[class]': 'hostClass()',
    '(pointermove)': 'onPointerMove()',
    '(click)': 'onClick()',
  },
  template: `
    @if (iconInputs(); as ic) {
      <ff-icon
        [name]="ic.name"
        [icon]="ic.icon"
        [size]="size().icon"
        [strokeWidth]="lit() ? 2 : 1.5"
        class="shrink-0 transition-[color,stroke-width] duration-80"
      />
    }
    <!-- py-1/-my-1 keeps truncate's overflow:hidden from clipping
         ascenders/descenders outside the trimmed box. -->
    <span class="flex-1 min-w-0 truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1"><ng-content /></span>
    <!-- Always-rendered fixed slot so the check appearing/disappearing never
         changes the row's intrinsic width. -->
    <span #checkSlot aria-hidden="true" [class]="checkSlotClass()"></span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComboboxItem {
  /** The item's value: a string item itself, or an object item's `value`. */
  readonly value = input.required<string>();
  /** Leading icon in the row: an icon role or an icon definition. */
  readonly icon = input<ComboboxIcon | undefined>(undefined);
  readonly disabled = input(false);
  readonly userClass = input('', { alias: 'class' });

  private readonly root = inject(Combobox);
  private readonly list = inject(COMBOBOX_LIST, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly size = injectSize();
  private readonly checkSlot = viewChild.required<ElementRef<HTMLElement>>('checkSlot');

  /** The row's index: where its value sits among the rendered rows. */
  readonly index = computed(() => {
    const value = this.value();
    return this.root.listItems().findIndex((item) => comboboxItemValue(item) === value);
  });
  protected readonly id = computed(() => (this.index() < 0 ? null : `${this.root.listId}-${this.index()}`));
  readonly checked = computed(() => this.root.values().includes(this.value()));
  /** The row Enter would pick (aria-activedescendant points at it). */
  readonly highlighted = computed(() => this.root.safeHighlight()?.index === this.index());
  /** Lit by the hover background (pointer, or a keyboard highlight driving it). */
  protected readonly active = computed(() => this.list?.hover.activeIndex() === this.index());
  protected readonly lit = computed(() => this.active() || this.checked());
  protected readonly iconInputs = computed(() => comboboxIconInputs(this.icon()));

  protected readonly hostClass = computed(() => {
    const size = this.size();
    return cn(
      // Fixed height so the text-box trim on the label doesn't shrink the
      // row; shrink-0 because the list is a max-height flex column.
      `relative z-10 flex ${size.control} shrink-0 items-center ${size.gap} ${popupShape.item} ${size.itemPx} ${size.text} cursor-pointer outline-none select-none`,
      'transition-[color] duration-80',
      this.lit() ? 'text-foreground' : 'text-muted-foreground',
      this.disabled() && 'opacity-50 pointer-events-none',
      this.userClass(),
    );
  });

  protected readonly checkSlotClass = computed(() =>
    cn('shrink-0', this.size().variant === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'),
  );

  private check: { svg: SVGSVGElement; path: SVGPathElement; exiting: boolean } | null = null;
  private checkRendered = false;

  constructor() {
    effect((onCleanup) => {
      const index = this.index();
      const list = this.list;
      if (!list || index < 0) return;
      untracked(() => list.hover.registerItem(index, this.host));
      onCleanup(() => list.hover.unregisterItem(index, this.host));
    });

    afterRenderEffect(() => {
      const checked = this.checked();
      const px = this.size().icon;
      untracked(() => this.renderCheck(checked, px));
    });
  }

  protected onPointerMove() {
    if (this.disabled()) return;
    const index = this.index();
    if (index < 0) return;
    const h = untracked(this.root.highlight);
    if (!h || h.index !== index || h.keyboard) this.root.highlight.set({ index, keyboard: false });
  }

  protected onClick() {
    if (this.disabled()) return;
    this.root.selectValue(this.value());
  }

  /**
   * The checkmark draws in over 0.08s easeOut and erases over 0.04s easeIn
   * before it unmounts. A row checked at mount shows the finished check
   * (initial={false}). The path is normalized to length 1, so the dash
   * offset is the motion equivalent of `pathLength` 0 → 1.
   */
  private renderCheck(checked: boolean, px: number) {
    const initial = !this.checkRendered;
    this.checkRendered = true;
    if (this.check) {
      this.check.svg.setAttribute('width', String(px));
      this.check.svg.setAttribute('height', String(px));
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
        'data-slot': 'combobox-check',
        width: String(px),
        height: String(px),
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        class: 'text-foreground',
      };
      for (const [key, value] of Object.entries(attrs)) svg.setAttribute(key, value);
      const path = doc.createElementNS(SVG_NS, 'path') as SVGPathElement;
      path.setAttribute('d', 'M4 12L9 17L20 6');
      path.setAttribute('pathLength', '1');
      path.style.strokeDasharray = '1 1';
      path.style.strokeDashoffset = initial ? '0' : '1';
      svg.appendChild(path);
      this.checkSlot().nativeElement.appendChild(svg);
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
}

// ---------------------------------------------------------------------------
// ComboboxList — a row per matching item, carrying the fluid hover overlay
// and the animated selected background(s).
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-combobox-list',
  imports: [NgTemplateOutlet, ScrollArea, FluidHoverHighlight, SelectionBackgrounds, ComboboxCheckedMarker, ComboboxItem],
  providers: [{ provide: COMBOBOX_LIST, useExisting: ComboboxList }],
  // The host is no box of its own; it passes the popup's max-height down so
  // the ScrollArea can inherit it.
  host: { style: 'display: contents; max-height: inherit' },
  template: `
    <ff-scroll-area [class]="scrollAreaClass" [viewportClass]="viewportClass">
      <div
        #list
        role="listbox"
        tabindex="-1"
        [attr.id]="root.listId"
        [attr.aria-multiselectable]="root.multiple() ? 'true' : null"
        [attr.data-empty]="empty() ? '' : null"
        [class]="listClass()"
        (mouseenter)="hover.onMouseEnter()"
        (mousemove)="hover.onMouseMove($event)"
        (mouseleave)="onMouseLeave()"
        (click)="hover.onClick($event)"
      >
        <!-- The overlays are torn down as the close begins rather than
             exit-animated, so a reopen never springs one from a stale row. -->
        @if (root.open()) {
          @if (root.multiple()) {
            <ff-selection-backgrounds [blocks]="blocks()" />
          } @else {
            <ff-combobox-checked-marker [rect]="checkedRect()" [snap]="reflowSnap()" />
          }
          <!-- Hover background. Snaps (no travel) while a filter reflow is
               moving the rows underneath. -->
          <ff-fluid-hover-highlight [hover]="hover" [class]="highlightClass" [transition]="reflowSnap() ? false : undefined" />
        }
        @if (root.mounted()) {
          @for (row of rows(); track row.value) {
            @if (row.create) {
              <!-- The create row is the list's, not the consumer's: it reads
                   its label from the root and picks like any row. -->
              <ff-combobox-item [value]="createValue" icon="plus">{{ root.createRow() }}</ff-combobox-item>
            } @else if (rowTemplate(); as def) {
              <ng-container [ngTemplateOutlet]="def.template" [ngTemplateOutletContext]="row.context" />
            }
          }
        }
      </div>
    </ff-scroll-area>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComboboxList implements ComboboxListHandle {
  readonly userClass = input('', { alias: 'class' });

  protected readonly root = inject(Combobox);
  private readonly listElement = viewChild<ElementRef<HTMLElement>>('list');
  protected readonly rowTemplate = contentChild(ComboboxRow);

  protected readonly scrollAreaClass = popupScrollAreaClass;
  protected readonly viewportClass = cn(popupViewportClass, 'scroll-fade');
  protected readonly highlightClass = popupShape.bg;
  protected readonly createValue = COMBOBOX_CREATE_VALUE;

  readonly hover = createFluidHover(() => this.listElement()?.nativeElement, { isItemDisabled: isDisabledRow });

  protected readonly listClass = computed(() =>
    cn(
      // The list is the overlays' offsetParent, so rows and overlays scroll
      // together inside the ScrollArea. Padding collapses when the list is
      // empty (ComboboxEmpty takes over).
      'relative flex flex-col p-1 outline-none data-[empty]:p-0',
      this.userClass(),
    ),
  );

  protected readonly empty = computed(() => this.root.listItems().length === 0);

  protected readonly rows = computed(() =>
    this.root.listItems().map((item: ComboboxItemData, index) => {
      const value = comboboxItemValue(item);
      return {
        value,
        create: value === COMBOBOX_CREATE_VALUE,
        context: { $implicit: item, value, label: comboboxItemLabel(item), index } satisfies ComboboxRowContext,
      };
    }),
  );

  /**
   * Filtering moves the rows underneath the overlays, and those frames must
   * snap, not glide. The query is the reflow signal (picks don't change it,
   * keeping multiple mode's merge/split glide): it arms with the rects of the
   * old row set and clears a frame after rects of the new set land.
   */
  private readonly reflowArmed = linkedSignal<string, ItemRect[] | null>({
    source: () => this.root.query(),
    computation: (_query, previous) => (previous === undefined ? null : untracked(this.hover.itemRects)),
  });
  protected readonly reflowSnap = computed(() => this.reflowArmed() !== null);

  /** Checked rows by index: one in single mode, any number in multiple. */
  private readonly checkedIndices = computed(() => {
    if (!this.root.open()) return [];
    const values = this.root.values();
    const indices: number[] = [];
    this.root.listItems().forEach((item, i) => {
      if (values.includes(comboboxItemValue(item))) indices.push(i);
    });
    return indices;
  });

  /**
   * Overlays read rects only once the row set is fully measured. Single mode
   * glides ONE marker between rows; multiple mode paints one block per
   * contiguous run of checked rows, merging and splitting as picks bridge or
   * break a run.
   */
  protected readonly checkedRect = computed(() => {
    if (this.root.multiple() || !this.hover.isMeasured()) return null;
    const index = this.checkedIndices()[0];
    return index === undefined ? null : (this.hover.itemRects()[index] ?? null);
  });
  private readonly runs = createSelectionRuns(() => (this.root.multiple() ? this.checkedIndices() : []));
  private readonly measuredRects = computed(() =>
    this.hover.isMeasured() && this.root.open() ? this.hover.itemRects() : [],
  );
  private readonly rawBlocks = createMergeSplitBlocks(this.runs, this.measuredRects, () => popupShape.bgRadius);
  protected readonly blocks = computed(() =>
    this.reflowSnap() ? this.rawBlocks().map((b) => ({ ...b, instant: true })) : this.rawBlocks(),
  );

  constructor() {
    effect((onCleanup) => {
      const armed = this.reflowArmed();
      if (armed === null || this.hover.itemRects() === armed) return;
      const frame = requestAnimationFrame(() => {
        if (untracked(this.reflowArmed) === armed) this.reflowArmed.set(null);
      });
      onCleanup(() => cancelAnimationFrame(frame));
    });

    // Fresh rects once per open; filtering re-registers rows, which the hover
    // engine coalesces into its own measurement.
    effect(() => {
      if (this.root.open()) untracked(() => this.hover.remeasure());
    });

    // A keyboard (or automatic) highlight drives the hover background — the
    // only indicator: the row Enter would pick reads like the row the pointer
    // would pick. A dropped highlight takes the background with it.
    effect(() => {
      const h = this.root.safeHighlight();
      untracked(() => {
        if (!h) {
          this.hover.setActiveIndex(null);
          return;
        }
        if (!h.keyboard) return;
        this.hover.setActiveIndex(h.index);
        const row = this.listElement()?.nativeElement.querySelector<HTMLElement>(`[data-fluid-hover-index="${h.index}"]`);
        row?.scrollIntoView?.({ block: 'nearest' });
      });
    });

    // Reset the hover index as the close begins.
    effect(() => {
      if (!this.root.open()) untracked(() => this.hover.setActiveIndex(null));
    });
  }

  protected onMouseLeave() {
    this.hover.onMouseLeave();
    // Leaving the list drops a pointer highlight; a keyboard one stays so
    // Enter still means what the background shows.
    const h = untracked(this.root.highlight);
    if (h && !h.keyboard) this.root.highlight.set(null);
  }
}

// ---------------------------------------------------------------------------
// ComboboxEmpty — shown in place of the list when nothing matches.
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-combobox-empty',
  // Always mounted as a live region; the message only renders while the list
  // is empty, so the padding is gated on having content.
  host: {
    role: 'status',
    'aria-live': 'polite',
    style: 'display: block',
    '[class]': 'hostClass()',
  },
  template: `@if (showing()) {@if (showAllSelected()) {<ng-container>{{ allSelected() }}</ng-container>} @else {<ng-content />}}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComboboxEmpty {
  /** Shown instead of the content when `hideSelected` has emptied the list with nothing typed. */
  readonly allSelected = input<string | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  private readonly root = inject(Combobox);
  private readonly size = injectSize();

  protected readonly showing = computed(() => this.root.listItems().length === 0);
  protected readonly showAllSelected = computed(() => this.root.allSelected() && this.allSelected() !== undefined);
  protected readonly hostClass = computed(() =>
    cn('px-3 text-center text-muted-foreground [&:not(:empty)]:py-6', this.size().text, this.userClass()),
  );
}
