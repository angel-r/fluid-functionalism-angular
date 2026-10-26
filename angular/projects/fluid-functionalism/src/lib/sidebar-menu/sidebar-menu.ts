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
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { AnimationOptions } from 'motion';
import { cn } from '../core/utils';
import { exitFallbackMs, spring } from '../core/springs';
import { enterTransition, exitTransition } from '../core/motion';
import { injectShape } from '../core/shape';
import { SizeContext, type SizeVariant } from '../core/size';
import { createFluidHover, type ItemRect } from '../fluid-hover/fluid-hover';
import { FluidHoverHighlight } from '../fluid-hover/fluid-hover-highlight';
import {
  NO_TARGET,
  ROOT_LEVEL_ID,
  SIDEBAR_MENU_ANIMATE,
  byDomOrder,
  overlayGroupId,
  retarget,
  retargetAll,
  rowSkipped,
  sameElements,
  sameRowInfo,
  type ActiveRect,
  type OverlayTarget,
  type RowInfo,
  type SidebarMenuAnimate,
} from './menu-utils';

// ─── Menu scope ──────────────────────────────────────────────────────────────
//
// One scope per SidebarMenu tree: a single fluid-hover system plus the
// traveling overlays — hover background, active background(s), focus ring —
// that glide between every visible row, sub-menu rows included, so the hover
// moves from a parent into its children as one continuous piece. Sub rows
// live inside positioned ancestors, so their rects are accumulated into the
// menu's own coordinate space by the fluid hover engine. The active background
// stays one per level (the root rows, and each sub-menu) so a current section
// and the current page inside it can both be lit.

const snap: AnimationOptions = { duration: 0 };
const fade = { duration: 0.08 };
/** A tier's enter spring for position, with the 0.08s opacity fade. */
const springWithFade = (tier: Parameters<typeof enterTransition>[0]) =>
  ({ ...enterTransition(tier), opacity: fade }) as AnimationOptions;

const BUTTON_SELECTOR = '[data-sidebar="menu-button"], [data-sidebar="menu-sub-button"]';
const NAV_KEYS = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'];

/**
 * `<ul ffSidebarMenu>`: a list of sidebar rows with one shared hover, active
 * and focus treatment. Rows (`li[ffSidebarMenuItem]`) register by element, so
 * indexes are derived from DOM order and conditional rows just work.
 *
 *   <ul ffSidebarMenu aria-label="Workspace">
 *     <li ffSidebarMenuItem>
 *       <button ffSidebarMenuButton icon="home" [isActive]="true">Home</button>
 *     </li>
 *   </ul>
 */
@Component({
  selector: 'ul[ffSidebarMenu]',
  exportAs: 'ffSidebarMenu',
  imports: [FluidHoverHighlight],
  providers: [{ provide: SizeContext, useFactory: () => inject(SidebarMenu).sizeContext }],
  host: {
    'data-sidebar': 'menu',
    '[class]': 'hostClass()',
    '(mouseenter)': 'hover.onMouseEnter()',
    '(mousemove)': 'onMouseMove($event)',
    '(mouseleave)': 'hover.onMouseLeave()',
    '(click)': 'hover.onClick($event)',
    '(focusin)': 'onFocus($event)',
    '(focusout)': 'onBlur($event)',
    // Pointer interaction switches modality back to pointer. Clicking the
    // already-focused row never re-fires focus, so without this the
    // keyboard ring would stick until focus left the menu.
    '(pointerdown)': 'focusedRow.set(null)',
    '(keydown)': 'onKeyDown($event)',
  },
  template: `
    <!-- Active row backgrounds — one per active row (see activeRects). -->
    <div #activeLayer data-slot="sidebar-menu-active-layer" style="display: contents"></div>
    @if (hover.isMeasured()) {
      <!-- Hover background. Fades in at the first hovered row; snaps (no
           travel) when only a reflow moved the rows underneath. -->
      <ff-fluid-hover-highlight
        [rect]="hoverRect()"
        [session]="hover.session()"
        [class]="shape().bg"
        [transition]="hoverTarget().rowChanged ? undefined : false"
      />
    }
    <!-- Focus ring -->
    <div #ringLayer data-slot="sidebar-menu-ring-layer" style="display: contents"></div>
    <ng-content />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarMenu {
  /** Pins the menu's rows to one step of the size ladder. Omitted, they
   *  follow the surrounding size provider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  /** Draw the traveling keyboard focus ring. Off, keyboard focus moves the
   *  hover background only — for menus whose rows are the whole surface,
   *  like a settings dialog's section list. */
  readonly focusRing = input(true, { transform: booleanAttribute });
  readonly userClass = input('', { alias: 'class' });

  protected readonly shape = injectShape();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly animate = inject(SIDEBAR_MENU_ANIMATE);

  protected readonly hostClass = computed(() =>
    cn('relative flex w-full min-w-0 flex-col select-none', this.userClass()),
  );

  /** Provided as SizeContext to the rows: the pinned size, or the parent's. */
  readonly sizeContext: SizeContext = (() => {
    const parent = inject(SizeContext, { optional: true, skipSelf: true });
    return {
      size: computed<SizeVariant>(() => this.size() ?? parent?.size() ?? 'default'),
      setSize: (next: SizeVariant) => parent?.setSize(next),
    };
  })();

  readonly hover = createFluidHover(() => this.host, { isItemDisabled: rowSkipped });

  // ── Row registry ──
  private readonly rows = new Set<HTMLElement>();
  private readonly rowButtons = new Map<HTMLElement, HTMLElement>();
  private readonly activeMap = new Map<HTMLElement, boolean>();
  private registeredCount = 0;
  private readonly rowsVersion = signal(0);
  private readonly activeVersion = signal(0);
  private readonly visibilityVersion = signal(0);
  private syncedRows = -1;
  private syncedVisibility = 0;

  /** Registered rows in DOM order. */
  readonly orderedRows = signal<HTMLElement[]>([], { equal: sameElements });
  private readonly rowInfo = signal<Map<HTMLElement, RowInfo>>(new Map(), { equal: sameRowInfo });
  /** Every visible active row, in DOM order — a parent section marker and
   *  the current row inside its sub-tree can be active at once. */
  readonly activeRows = signal<HTMLElement[]>([], { equal: sameElements });
  readonly focusedRow = signal<HTMLElement | null>(null);

  readonly hoveredRow = computed(() => {
    const index = this.hover.activeIndex();
    return index !== null ? (this.orderedRows()[index] ?? null) : null;
  });
  readonly firstRow = computed(() => this.orderedRows()[0] ?? null);
  readonly hasActive = computed(() => this.activeRows().length > 0);

  // ── Overlay geometry ──
  // The engine measures each row's button, so a rect is the button strip. A
  // row registered without one was measured as its whole <li> — which grows
  // when it hosts an expanded sub-menu — so that rect is clamped to 48px
  // (the tallest row, size="lg"): the highlight never covers an expanded
  // sub-tree.
  private overlayRect(row: HTMLElement | null): ItemRect | null {
    if (!row) return null;
    const index = this.orderedRows().indexOf(row);
    const rect = index === -1 ? null : this.hover.itemRects()[index];
    if (!rect) return null;
    return this.rowInfo().get(row)?.buttonless ? { ...rect, height: Math.min(rect.height, 48) } : rect;
  }

  protected readonly hoverRect = computed(() => this.overlayRect(this.hoveredRow()));
  private readonly focusRect = computed(() => (this.focusRing() ? this.overlayRect(this.focusedRow()) : null));

  // Every active row gets its own background. Keys are the row's level
  // (root, or its sub-menu) plus its occurrence within that level: the usual
  // case — one active per level — keeps a stable key, so the background
  // GLIDES when the selection moves instead of remounting.
  private readonly activeRects = computed<ActiveRect[]>(() => {
    const occurrences = new Map<number, number>();
    const out: ActiveRect[] = [];
    for (const row of this.activeRows()) {
      const levelId = this.rowInfo().get(row)?.levelId;
      if (levelId === undefined) continue;
      const occurrence = occurrences.get(levelId) ?? 0;
      occurrences.set(levelId, occurrence + 1);
      const rect = this.overlayRect(row);
      if (rect) out.push({ key: `${levelId}:${occurrence}`, rect, row });
    }
    return out;
  });

  // A rect change has two causes with two right answers. The highlight moving
  // to a DIFFERENT row springs — that's the glide. The same row itself moving
  // — a sibling sub-tree collapsing above reflows every row below on every
  // frame of its own spring — must snap, or the overlay chases the row it is
  // sitting on with a trailing second spring. Each overlay keeps its target
  // as of its last change, and which kind of change that was.
  protected readonly hoverTarget = linkedSignal<{ row: HTMLElement | null; rect: ItemRect | null }, OverlayTarget>({
    source: () => ({ row: this.hoveredRow(), rect: this.hoverRect() }),
    computation: (next, prev) => retarget(prev?.value ?? NO_TARGET, next.row, next.rect),
  });
  private readonly focusTarget = linkedSignal<{ row: HTMLElement | null; rect: ItemRect | null }, OverlayTarget>({
    source: () => ({ row: this.focusedRow(), rect: this.focusRect() }),
    computation: (next, prev) => retarget(prev?.value ?? NO_TARGET, next.row, next.rect),
  });
  private readonly activeTargets = linkedSignal<ActiveRect[], Map<string, OverlayTarget>>({
    source: this.activeRects,
    computation: (next, prev) => retargetAll(prev?.value ?? new Map(), next),
  });

  private readonly activeLayer = viewChild.required<ElementRef<HTMLElement>>('activeLayer');
  private readonly ringLayer = viewChild.required<ElementRef<HTMLElement>>('ringLayer');

  constructor() {
    // Row set and active flags settle after render, when the rows are in the
    // DOM and their order can be read.
    afterRenderEffect(() => {
      const rows = this.rowsVersion();
      this.activeVersion();
      const visibility = this.visibilityVersion();
      untracked(() => {
        if (rows !== this.syncedRows) {
          this.syncedRows = rows;
          this.syncRows();
        }
        this.recomputeActive();
        if (visibility !== this.syncedVisibility) {
          this.syncedVisibility = visibility;
          // A hover riding a row that just collapsed away has nothing under it.
          const row = this.hoveredRow();
          if (row && rowSkipped(row)) this.hover.setActiveIndex(null);
        }
      });
    });

    const actives = new ActiveOverlays(this.animate);
    const ring = new FocusRingOverlay(this.animate);
    effect(() => {
      const measured = this.hover.isMeasured();
      const rects = this.activeRects();
      const targets = this.activeTargets();
      const bg = this.shape().bg;
      const layer = this.activeLayer().nativeElement;
      untracked(() => actives.render(layer, measured ? rects : null, targets, bg));
    });
    effect(() => {
      const measured = this.hover.isMeasured();
      const target = this.focusTarget();
      const rect = this.focusRect();
      const className = this.shape().focusRing;
      const layer = this.ringLayer().nativeElement;
      untracked(() => ring.render(layer, measured ? rect : null, target.rowChanged, className));
    });
    inject(DestroyRef).onDestroy(() => {
      actives.destroy();
      ring.destroy();
    });
  }

  // ── Registry API (used by the row parts) ──

  registerRow(row: HTMLElement): () => void {
    this.rows.add(row);
    this.rowsVersion.update((v) => v + 1);
    return () => {
      this.rows.delete(row);
      this.rowButtons.delete(row);
      this.activeMap.delete(row);
      this.rowsVersion.update((v) => v + 1);
    };
  }

  /** The button is the row's measured element, so a button arriving after
   *  its row registered re-syncs what the fluid hover engine observes. */
  setRowButton(row: HTMLElement, button: HTMLElement | null) {
    if (button) this.rowButtons.set(row, button);
    else this.rowButtons.delete(row);
    this.rowsVersion.update((v) => v + 1);
  }

  setRowActive(row: HTMLElement, active: boolean) {
    this.activeMap.set(row, active);
    this.activeVersion.update((v) => v + 1);
  }

  /** A sub-menu toggled: rows changed visibility in place, so hover targets
   *  and the visible active set must be recomputed. */
  refreshVisibility() {
    this.visibilityVersion.update((v) => v + 1);
  }

  private rowButton(row: HTMLElement) {
    return this.rowButtons.get(row) ?? row.querySelector<HTMLElement>(':scope > [data-sidebar="menu-button"], :scope > [data-sidebar="menu-sub-button"]');
  }

  // The fluid hover engine measures the row's BUTTON, not the <li>: a row
  // hosting an expanded sub-tree is a tall <li>, and hit-testing against that
  // whole box would hand the sub-tree's gaps and gutter to the parent.
  private syncRows() {
    const sorted = [...this.rows].filter((el) => el.isConnected).sort(byDomOrder);
    this.orderedRows.set(sorted);
    const info = new Map<HTMLElement, RowInfo>();
    for (const el of sorted) {
      const sub = el.closest('[data-sidebar="menu-sub"]');
      info.set(el, { levelId: sub ? overlayGroupId(sub) : ROOT_LEVEL_ID, buttonless: !this.rowButton(el) });
    }
    this.rowInfo.set(info);
    sorted.forEach((el, i) => this.hover.registerItem(i, this.rowButton(el) ?? el));
    for (let i = sorted.length; i < this.registeredCount; i++) this.hover.registerItem(i, null);
    this.registeredCount = sorted.length;
  }

  private recomputeActive() {
    this.activeRows.set(this.orderedRows().filter((el) => this.activeMap.get(el) && !rowSkipped(el)));
  }

  // ── Pointer, focus and keyboard ──

  // While a popup anchored in the sidebar is open (a row action's or the
  // header/footer rows' dropdown), hover tracking freezes across every menu
  // scope — otherwise a non-modal popup lets rows underneath keep
  // highlighting. Collapsible rows only set aria-expanded, so they never match.
  private popupOpen() {
    const root = this.host.closest('[data-slot="sidebar-wrapper"]') ?? this.host;
    return !!root.querySelector(
      '[data-sidebar="menu-button"][data-state="open"], [data-sidebar="menu-button"][data-popup-open], [data-sidebar="menu-action"][data-state="open"], [data-sidebar="menu-action"][data-popup-open]',
    );
  }

  protected onMouseMove(event: MouseEvent) {
    if (this.popupOpen()) return;
    this.hover.onMouseMove(event);
  }

  protected onFocus(event: FocusEvent) {
    const target = event.target as HTMLElement;
    // Only the row's main button drives the traveling highlight and ring —
    // actions keep their own static focus rings.
    if (!target.closest('[data-sidebar="menu-button"],[data-sidebar="menu-sub-button"]')) return;
    const row = target.closest<HTMLElement>('[data-sidebar="menu-item"],[data-sidebar="menu-sub-item"]');
    if (!row) return;
    const index = this.orderedRows().indexOf(row);
    if (index === -1) return;
    this.hover.setActiveIndex(index);
    this.focusedRow.set(target.matches(':focus-visible') ? row : null);
  }

  protected onBlur(event: FocusEvent) {
    if (this.host.contains(event.relatedTarget as Node | null)) return;
    this.focusedRow.set(null);
    this.hover.setActiveIndex(null);
  }

  // Arrow/Home/End over every button in DOM order, sub rows included.
  protected onKeyDown(event: KeyboardEvent) {
    if (!NAV_KEYS.includes(event.key)) return;
    const items = Array.from(this.host.querySelectorAll<HTMLElement>(BUTTON_SELECTOR)).filter(
      (el) => !el.closest('[data-sidebar="menu-sub"][data-state="closed"]'),
    );
    const current = items.indexOf(event.target as HTMLElement);
    if (current === -1) return;
    event.preventDefault();
    // Keep handled arrows from also reaching window-level listeners (a docs
    // site's ←/→ page navigation), and from a surrounding menu.
    event.stopPropagation();
    if (event.key === 'Home') items[0]?.focus();
    else if (event.key === 'End') items[items.length - 1]?.focus();
    else {
      const next =
        event.key === 'ArrowDown' || event.key === 'ArrowRight'
          ? (current + 1) % items.length
          : (current - 1 + items.length) % items.length;
      items[next]?.focus();
    }
  }
}

// ─── Overlay renderers ───────────────────────────────────────────────────────
//
// The overlays are imperative (AnimatePresence): an exiting element stays in
// the DOM until its exit tween lands, with a timer fallback for throttled
// tabs. While the rows are being (re)measured every overlay unmounts at once,
// and remounts in place (`initial={false}`) once the rects are current.

type Animate = SidebarMenuAnimate;

function place(element: HTMLElement, frame: { top: number; left: number; width: number; height: number }) {
  element.style.top = `${frame.top}px`;
  element.style.left = `${frame.left}px`;
  element.style.width = `${frame.width}px`;
  element.style.height = `${frame.height}px`;
}

function exitAndRemove(animate: Animate, element: HTMLElement, transition: AnimationOptions, fallbackMs: number) {
  let done = false;
  const remove = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    element.remove();
  };
  const timer = setTimeout(remove, fallbackMs);
  animate(element, { opacity: 0 }, transition).finished.then(remove, remove);
}

class ActiveOverlays {
  private readonly live = new Map<string, { element: HTMLElement; target: OverlayTarget | undefined }>();

  constructor(private readonly animate: Animate) {}

  render(layer: HTMLElement, rects: ActiveRect[] | null, targets: Map<string, OverlayTarget>, bg: string) {
    const className = `absolute ${bg} bg-active pointer-events-none`;
    if (rects === null) {
      this.destroy();
      return;
    }
    const keys = new Set(rects.map((r) => r.key));
    for (const [key, entry] of this.live) {
      if (keys.has(key)) continue;
      this.live.delete(key);
      exitAndRemove(this.animate, entry.element, exitTransition(spring.moderate), exitFallbackMs(spring.moderate));
    }
    for (const { key, rect } of rects) {
      const target = targets.get(key);
      const frame = { top: rect.top, left: rect.left, width: rect.width, height: rect.height, opacity: 1 };
      const entry = this.live.get(key);
      if (!entry) {
        const element = layer.ownerDocument.createElement('div');
        element.className = className;
        place(element, frame);
        element.style.opacity = '1';
        layer.appendChild(element);
        this.live.set(key, { element, target });
        this.animate(element, frame, snap);
        continue;
      }
      entry.element.className = className;
      if (entry.target === target) continue;
      entry.target = target;
      this.animate(entry.element, frame, target?.rowChanged ? springWithFade(spring.moderate) : snap);
    }
  }

  destroy() {
    for (const { element } of this.live.values()) element.remove();
    this.live.clear();
  }
}

class FocusRingOverlay {
  private element: HTMLElement | null = null;
  private last: ItemRect | null = null;

  constructor(private readonly animate: Animate) {}

  render(layer: HTMLElement, rect: ItemRect | null, rowChanged: boolean, focusRingClass: string) {
    const className = `absolute ${focusRingClass} pointer-events-none z-20 border border-[color:var(--focus-ring,#6B97FF)]`;
    if (!rect) {
      const exiting = this.element;
      this.element = null;
      this.last = null;
      if (exiting) exitAndRemove(this.animate, exiting, exitTransition(spring.fast), exitFallbackMs(spring.fast));
      return;
    }
    const frame = { left: rect.left - 2, top: rect.top - 2, width: rect.width + 4, height: rect.height + 4 };
    if (!this.element) {
      const element = layer.ownerDocument.createElement('div');
      element.className = className;
      place(element, frame);
      layer.appendChild(element);
      this.element = element;
      this.last = rect;
      this.animate(element, frame, snap);
      return;
    }
    this.element.className = className;
    if (this.last && this.last.top === rect.top && this.last.left === rect.left && this.last.width === rect.width && this.last.height === rect.height) return;
    this.last = rect;
    this.animate(this.element, frame, rowChanged ? springWithFade(spring.fast) : snap);
  }

  destroy() {
    this.element?.remove();
    this.element = null;
  }
}
