import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  Injector,
  type TemplateRef,
  ViewContainerRef,
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
import { cn } from '../core/utils';
import { spring } from '../core/springs';
import { fontWeights } from '../core/font-weight';
import { injectShape, shapeMap } from '../core/shape';
import { injectSize } from '../core/size';
import { Elevated } from '../core/surface';
import { Icon } from '../core/icon';
import { enterTransition, exitTransition, injectAnimateFluid, type SpringTier } from '../core/motion';
import { FLUID_HOVER, FluidHoverItem, type ItemRect, createFluidHover } from '../fluid-hover/fluid-hover';
import { FluidHoverHighlight } from '../fluid-hover/fluid-hover-highlight';
import { FORMATS, FORMAT_LABELS, type ColorFormat } from './color-math';
import { COLOR_PICKER_POPUP_SCOPE, COLOR_PICKER_PORTAL_CONTAINER } from './shared';
import { PopupOverlay } from './popup-overlay';

// ---------------------------------------------------------------------------
// FormatDropdown — the HEX / RGB / HSL / OKLCH menu.
//
// React builds it on Base UI's Menu; here it is the WAI-ARIA menu button
// pattern by hand on a CDK overlay: the trigger carries aria-haspopup /
// aria-expanded, the popup is role="menu" with menuitemradio rows. Keys:
// ArrowDown/ArrowUp on the trigger open onto the first/last row; inside,
// arrows rove (wrapping), Home/End jump, a letter jumps by typeahead,
// Enter/Space pick, Escape and Tab close back to the trigger. The popup keeps
// the fluid hover overlays: the checked-row background, the hover highlight
// (each hover session fades in on the checked row, then glides) and the
// keyboard focus ring.
// ---------------------------------------------------------------------------

// Popup surfaces opt out of the global pill/rounded shape — same rationale as
// the Dropdown component (pill radii distort perceived padding at this scale).
const menuShape = shapeMap.rounded;

let nextId = 0;

/** One absolutely positioned overlay layer that follows a row rect: it appears
 *  in place, glides between rects on its spring, and fades out on its exit. */
class RectLayer {
  private shown = false;

  constructor(
    private readonly tier: SpringTier,
    private readonly outset: number,
    private readonly animate: ReturnType<typeof injectAnimateFluid>,
  ) {}

  update(el: HTMLElement | undefined, rect: ItemRect | null) {
    if (!el) {
      this.shown = false;
      return;
    }
    if (!rect) {
      if (!this.shown) return;
      this.shown = false;
      el.setAttribute('data-state', 'hidden');
      this.animate(el, { opacity: 0 }, exitTransition(this.tier));
      return;
    }
    const o = this.outset;
    const target = { top: rect.top - o, left: rect.left - o, width: rect.width + o * 2, height: rect.height + o * 2 };
    el.setAttribute('data-state', 'visible');
    if (!this.shown) {
      // initial={false}: the layer appears where it belongs, no travel.
      this.shown = true;
      Object.assign(el.style, {
        top: `${target.top}px`,
        left: `${target.left}px`,
        width: `${target.width}px`,
        height: `${target.height}px`,
        opacity: '1',
      });
      return;
    }
    this.animate(el, target, enterTransition(this.tier));
    this.animate(el, { opacity: 1 }, { duration: 0.08 });
  }
}

@Component({
  selector: 'ff-color-format-menu',
  imports: [Icon, Elevated, FluidHoverItem, FluidHoverHighlight],
  host: { style: 'display: contents' },
  providers: [{ provide: FLUID_HOVER, useFactory: () => inject(FormatMenu).hover }],
  template: `
    <!-- The trigger holds bg-active and foreground text while open, so it
         reads as the menu's anchor; the chevron flips 180° over 150ms. -->
    <button
      #trigger
      type="button"
      aria-haspopup="menu"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="open() ? menuId : null"
      [attr.data-popup-open]="open() ? '' : null"
      [class]="triggerClass()"
      [style.font-variation-settings]="normalWeight"
      (pointerdown)="releaseFocus()"
      (click)="onTriggerClick($event)"
      (keydown)="onTriggerKeyDown($event)"
    >
      <span>{{ labels[value()] }}</span>
      <ff-icon name="chevron-down" [size]="14" [strokeWidth]="1.5" [class]="chevronClass()" />
    </button>

    <ng-template #popup>
      <div data-slot="color-format-motion" style="transform-origin: top center">
        <!-- Elevated lifts the menu 2 surface levels above the panel it opens
             from; min-w keeps it at least as wide as the trigger. -->
        <div
          #menu
          [id]="menuId"
          role="menu"
          tabindex="-1"
          aria-orientation="vertical"
          [ffElevated]="2"
          [shadowLevel]="3"
          [class]="popupClass"
          [style.--anchor-width]="anchorWidth() + 'px'"
          (pointerdown)="releaseFocus()"
          (mouseenter)="onPopupMouseEnter()"
          (mousemove)="hover.onMouseMove($event)"
          (mouseleave)="hover.onMouseLeave()"
          (click)="hover.onClick($event)"
          (focusin)="onPopupFocus($event)"
          (focusout)="onPopupBlur($event)"
          (keydown)="onMenuKeyDown($event)"
        >
          <!-- Selected background: its own layer under the hover highlight,
               so the checked row stays marked while the pointer is on
               another row. -->
          <div #checkedLayer data-slot="color-format-checked" [class]="checkedLayerClass" style="opacity: 0"></div>
          <ff-fluid-hover-highlight [hover]="hover" [from]="checkedRect()" [class]="menuShape.bg" />
          <!-- Focus ring: one 1px border drawn 2px outside the focused row,
               gliding between rows on spring.fast. -->
          <div #focusLayer data-slot="color-format-focus-ring" [class]="focusLayerClass" style="opacity: 0"></div>
          @for (fmt of formats; track fmt; let i = $index) {
            <!-- The invisible semibold copy reserves the widest width, so the
                 label can move between normal and semibold (checked) without
                 shifting the row. -->
            <div
              role="menuitemradio"
              tabindex="-1"
              [attr.aria-checked]="value() === fmt"
              [attr.data-checked]="value() === fmt ? '' : null"
              [attr.data-fluid-hover-index]="i"
              [ffFluidHoverItem]="i"
              [class]="itemClass()"
              (click)="choose(fmt)"
              (mouseenter)="onItemMouseEnter($event)"
            >
              <span class="inline-grid">
                <span class="col-start-1 row-start-1 invisible" [style.font-variation-settings]="semiboldWeight" aria-hidden="true">{{ labels[fmt] }}</span>
                <span
                  [class]="labelClass(i, value() === fmt)"
                  [style.font-variation-settings]="value() === fmt ? semiboldWeight : normalWeight"
                >{{ labels[fmt] }}</span>
              </span>
            </div>
          }
        </div>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormatMenu {
  readonly value = input.required<ColorFormat>();
  /** Controls the open state; when set, user toggles are ignored. */
  readonly openInput = input<boolean | undefined>(undefined, { alias: 'open' });
  /** Initial open state (uncontrolled). */
  readonly defaultOpen = input(false, { transform: booleanAttribute });
  readonly valueSelect = output<ColorFormat>();

  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly portalContainer = inject(COLOR_PICKER_PORTAL_CONTAINER, { optional: true });
  private readonly popupScope = inject(COLOR_PICKER_POPUP_SCOPE, { optional: true });
  private releaseScope: (() => void) | null = null;
  private readonly shape = injectShape();
  private readonly sizeClasses = injectSize();
  private readonly animate = injectAnimateFluid();
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly popupTemplate = viewChild.required<TemplateRef<unknown>>('popup');

  protected readonly labels = FORMAT_LABELS;
  protected readonly formats = FORMATS;
  protected readonly menuShape = menuShape;
  protected readonly normalWeight = fontWeights.normal;
  protected readonly semiboldWeight = fontWeights.semibold;
  protected readonly menuId = `ff-color-format-menu-${nextId++}`;

  // Seeded once from defaultOpen; later defaultOpen changes are ignored.
  private readonly internalOpen = signal<boolean | null>(null);
  readonly open = computed(() => this.openInput() ?? this.internalOpen() ?? this.defaultOpen());

  /** The popup element while attached. */
  private readonly menuEl = signal<HTMLElement | null>(null);
  readonly hover = createFluidHover(() => this.menuEl());
  /** Row that holds keyboard focus (:focus-visible only): drives the ring. */
  private readonly focusedIndex = signal<number | null>(null);
  protected readonly anchorWidth = signal(0);

  protected readonly checkedRect = computed(() => {
    const index = FORMATS.indexOf(this.value());
    return index === -1 ? null : (this.hover.itemRects()[index] ?? null);
  });
  private readonly focusRect = computed(() => {
    const index = this.focusedIndex();
    return index === null ? null : (this.hover.itemRects()[index] ?? null);
  });

  protected readonly triggerClass = computed(() =>
    cn(
      'flex items-center justify-between bg-transparent hover:bg-hover hover:text-foreground transition-colors duration-80 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] cursor-pointer',
      this.sizeClasses().gap,
      this.sizeClasses().control,
      this.sizeClasses().px,
      this.sizeClasses().text,
      this.open() ? 'bg-active text-foreground' : 'text-muted-foreground active:bg-active',
      this.shape().input,
    ),
  );
  protected readonly chevronClass = computed(() =>
    cn('text-muted-foreground transition-transform duration-150', this.open() && 'rotate-180'),
  );
  protected readonly popupClass = cn(
    `relative flex flex-col min-w-[var(--anchor-width)] ${menuShape.container} p-1 select-none outline-none`,
  );
  protected readonly checkedLayerClass = `absolute ${menuShape.bg} bg-active pointer-events-none`;
  protected readonly focusLayerClass = `absolute ${menuShape.focusRing} pointer-events-none z-20 border border-[color:var(--focus-ring,#6B97FF)]`;
  protected readonly itemClass = computed(() =>
    cn(
      'relative z-10 flex items-center cursor-pointer outline-none',
      this.sizeClasses().variant === 'compact' ? 'px-2.5 py-1.5' : 'px-3 py-2',
      this.sizeClasses().text,
      this.shape().item,
    ),
  );

  // Color goes muted → foreground when hovered or checked, over 80ms.
  protected labelClass(index: number, checked: boolean) {
    return cn(
      'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80',
      this.hover.activeIndex() === index || checked ? 'text-foreground' : 'text-muted-foreground',
    );
  }

  private readonly overlay = new PopupOverlay({
    injector: this.injector,
    viewContainerRef: this.viewContainerRef,
    template: () => this.popupTemplate(),
    origin: () => this.trigger().nativeElement,
    portalContainer: () => this.portalContainer?.() ?? null,
    paneClass: 'z-[60] outline-none',
    sideOffset: 6,
    tier: spring.fast,
    animate: this.animate,
    onAttach: (root) => {
      this.menuEl.set(root.querySelector<HTMLElement>('[role="menu"]'));
      const pane = this.overlay.pane;
      if (pane && this.popupScope) this.releaseScope = this.popupScope.add(pane);
    },
    onDetach: () => {
      this.releaseScope?.();
      this.releaseScope = null;
      this.menuEl.set(null);
      this.focusedIndex.set(null);
      this.hover.setActiveIndex(null);
    },
  });

  private readonly checkedLayer = new RectLayer(spring.moderate, 0, this.animate);
  private readonly focusLayer = new RectLayer(spring.fast, 2, this.animate);

  /** Open from the first render, the menu loads with the page; until the
   *  reader reaches into it, it never takes focus, so the page keeps its keys. */
  private openWithPage = false;
  /** How the next open should place focus. */
  private pendingFocus: 'first' | 'last' | 'popup' | null = null;
  private typeahead = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // The trigger is a view query, so opening waits for the first render.
    let firstRun = true;
    afterRenderEffect(() => {
      const open = this.open();
      untracked(() => {
        if (firstRun) {
          firstRun = false;
          this.openWithPage = open;
        }
        if (open) this.show();
        else this.hide();
      });
    });

    // The popup keeps its rows registered between opens, so their rects were
    // taken while it was hidden: re-measure once it is open and laid out.
    effect(() => {
      if (this.open() && this.menuEl()) untracked(() => this.hover.remeasure());
    });

    afterRenderEffect(() => {
      const rect = this.checkedRect();
      const el = this.menuEl()?.querySelector<HTMLElement>('[data-slot="color-format-checked"]') ?? undefined;
      untracked(() => this.checkedLayer.update(el, rect));
    });
    afterRenderEffect(() => {
      const rect = this.focusRect();
      const el = this.menuEl()?.querySelector<HTMLElement>('[data-slot="color-format-focus-ring"]') ?? undefined;
      untracked(() => this.focusLayer.update(el, rect));
    });

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.typeaheadTimer);
      this.document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
      this.releaseScope?.();
      this.overlay.dispose();
    });
  }

  // ── State ───────────────────────────────────────────────────────────

  /** Interaction asks for a new open state; a controlled menu ignores it. */
  private requestOpen(next: boolean) {
    this.releaseFocus();
    if (this.openInput() === undefined) this.internalOpen.set(next);
  }

  protected releaseFocus() {
    this.openWithPage = false;
  }

  private show() {
    this.anchorWidth.set(this.trigger().nativeElement.getBoundingClientRect().width);
    this.overlay.show();
    this.document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
    const focus = this.pendingFocus;
    this.pendingFocus = null;
    if (!focus || this.openWithPage) return;
    const menu = this.menuEl();
    if (focus === 'popup') menu?.focus({ preventScroll: true });
    else this.focusRow(focus === 'first' ? 0 : FORMATS.length - 1);
  }

  private hide() {
    this.document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    const menu = this.menuEl();
    const hadFocus = !!menu && menu.contains(this.document.activeElement);
    this.overlay.hide();
    // Focus goes back where it came from: the trigger.
    if (hadFocus) this.trigger().nativeElement.focus({ preventScroll: true });
  }

  private close() {
    this.requestOpen(false);
  }

  // Non-modal: a press anywhere outside the trigger and the menu closes it.
  private readonly onDocumentPointerDown = (e: PointerEvent) => {
    const target = e.target as Node | null;
    if (!target) return;
    if (this.trigger().nativeElement.contains(target)) return;
    if (this.overlay.pane?.contains(target)) return;
    this.close();
  };

  // ── Trigger ─────────────────────────────────────────────────────────

  protected onTriggerClick(e: MouseEvent) {
    const opening = !this.open();
    // A keyboard click (Enter / Space: detail 0) opens onto the first row; a
    // pointer click focuses the popup itself.
    if (opening) this.pendingFocus = e.detail === 0 ? 'first' : 'popup';
    this.requestOpen(opening);
  }

  protected onTriggerKeyDown(e: KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const edge = e.key === 'ArrowDown' ? 'first' : 'last';
    if (this.open()) {
      this.releaseFocus();
      this.focusRow(edge === 'first' ? 0 : FORMATS.length - 1);
      return;
    }
    this.pendingFocus = edge;
    this.requestOpen(true);
  }

  // ── Rows ────────────────────────────────────────────────────────────

  private rows(): HTMLElement[] {
    return Array.from(this.menuEl()?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []);
  }

  private focusRow(index: number) {
    this.rows()[index]?.focus({ preventScroll: true });
  }

  protected choose(fmt: ColorFormat) {
    this.valueSelect.emit(fmt);
    this.close();
  }

  /** Base UI highlights the row under the pointer by focusing it — unless the
   *  menu opened with the page and the reader hasn't reached into it yet. */
  protected onItemMouseEnter(e: MouseEvent) {
    if (this.openWithPage) return;
    (e.currentTarget as HTMLElement).focus({ preventScroll: true });
  }

  // ── Popup ───────────────────────────────────────────────────────────

  // The pointer arriving hides the keyboard focus ring.
  protected onPopupMouseEnter() {
    this.hover.onMouseEnter();
    this.focusedIndex.set(null);
  }

  // Focus moves the highlight too, but shows the ring only for
  // :focus-visible; blur clears both only once focus leaves the popup.
  protected onPopupFocus(e: FocusEvent) {
    const target = e.target as HTMLElement;
    const indexAttr = target.closest('[data-fluid-hover-index]')?.getAttribute('data-fluid-hover-index');
    if (indexAttr == null) return;
    const index = Number(indexAttr);
    this.hover.setActiveIndex(index);
    this.focusedIndex.set(matchesFocusVisible(target) ? index : null);
  }

  protected onPopupBlur(e: FocusEvent) {
    const next = e.relatedTarget as Node | null;
    if (next && this.menuEl()?.contains(next)) return;
    this.focusedIndex.set(null);
    this.hover.setActiveIndex(null);
    // Focus leaving for somewhere other than the trigger closes the menu.
    if (next && !this.trigger().nativeElement.contains(next)) this.close();
  }

  protected onMenuKeyDown(e: KeyboardEvent) {
    const rows = this.rows();
    const current = rows.indexOf(this.document.activeElement as HTMLElement);
    const move = (index: number) => {
      e.preventDefault();
      this.releaseFocus();
      this.focusRow(index);
    };
    switch (e.key) {
      case 'ArrowDown':
        return move(current === -1 ? 0 : (current + 1) % rows.length);
      case 'ArrowUp':
        return move(current === -1 ? rows.length - 1 : (current - 1 + rows.length) % rows.length);
      case 'Home':
        return move(0);
      case 'End':
        return move(rows.length - 1);
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (current !== -1) this.choose(FORMATS[current]);
        return;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.close();
        this.trigger().nativeElement.focus({ preventScroll: true });
        return;
      case 'Tab':
        e.preventDefault();
        this.close();
        this.trigger().nativeElement.focus({ preventScroll: true });
        return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      clearTimeout(this.typeaheadTimer);
      this.typeahead += e.key.toLowerCase();
      this.typeaheadTimer = setTimeout(() => (this.typeahead = ''), 500);
      const match = FORMATS.findIndex((f) => FORMAT_LABELS[f].toLowerCase().startsWith(this.typeahead));
      if (match !== -1) move(match);
    }
  }
}

function matchesFocusVisible(el: HTMLElement) {
  try {
    return el.matches(':focus-visible');
  } catch {
    return false;
  }
}
