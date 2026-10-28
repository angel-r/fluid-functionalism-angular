import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  type Signal,
  afterRenderEffect,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { animate, type AnimationOptions, type AnimationPlaybackControls } from 'motion';
import {
  cn,
  exitFallbackMs,
  spring,
  enterTransition,
  exitTransition,
  ReducedMotion,
  injectShape,
  SURFACE_LEVEL,
  surfaceClasses,
} from '../core';
import { injectSidebar, type SidebarSide, type SidebarVariant } from './sidebar-context';
import { SidebarRail } from './sidebar-rail';

// Crossing the drawer breakpoint DISSOLVES the desktop rail instead of
// snapping it away: opacity fades while `display` rides the same transition
// with allow-discrete, so none applies only once the fade lands (and
// @starting-style fades it back in when the window grows). Literal classes per
// breakpoint — Tailwind's scanner can't see composed strings. Non-standard
// breakpoints fall back to a JS-driven `hidden` (no dissolve, but never rail +
// drawer at once).
const BREAKPOINT_FADE_BASE =
  'transition-[opacity,display] ease-out [transition-behavior:allow-discrete] motion-reduce:transition-none';
const BREAKPOINT_HIDDEN: Record<number, string> = {
  640: 'max-sm:hidden max-sm:opacity-0 max-sm:duration-160 sm:duration-240 sm:starting:opacity-0',
  768: 'max-md:hidden max-md:opacity-0 max-md:duration-160 md:duration-240 md:starting:opacity-0',
  1024: 'max-lg:hidden max-lg:opacity-0 max-lg:duration-160 lg:duration-240 lg:starting:opacity-0',
  1280: 'max-xl:hidden max-xl:opacity-0 max-xl:duration-160 xl:duration-240 xl:starting:opacity-0',
};

const pageLevel = signal(1).asReadonly();
const snap: AnimationOptions = { duration: 0 };

/**
 * The surface level a sidebar's content sits on: one step up inside a
 * floating card (or the collapsed peek card), the substrate otherwise. For a
 * component that wraps SidebarShell and re-provides `SURFACE_LEVEL` to its own
 * projected content (projected content resolves DI from where it is declared).
 * Call in an injection context below a SidebarProvider.
 */
export function injectSidebarContentLevel(variant: () => SidebarVariant): Signal<number> {
  const sidebar = injectSidebar();
  const substrate = inject(SURFACE_LEVEL, { optional: true, skipSelf: true }) ?? pageLevel;
  return computed(() => {
    const peekEnabled = sidebar.peek() !== 'none' && !sidebar.open() && !sidebar.isResizing();
    return variant() === 'floating' || peekEnabled ? Math.min(substrate() + 1, 8) : substrate();
  });
}

/**
 * The expanded/collapsed desktop rail. An in-flow sticky column animates its
 * width (this is what reflows the inset) while the fixed-width panel inside
 * slides out under overflow clipping — container-relative, so the whole
 * sidebar works inside any bounded frame, not just the viewport. Ships the
 * resize/collapse rail handle on its inner edge by default.
 */
@Component({
  selector: 'ff-sidebar-shell',
  imports: [NgTemplateOutlet, SidebarRail],
  providers: [{ provide: SURFACE_LEVEL, useFactory: () => inject(SidebarShell).contentLevel }],
  host: {
    'data-slot': 'sidebar',
    '[attr.data-state]': "sidebar.open() ? 'expanded' : 'collapsed'",
    '[attr.data-collapsible]': "sidebar.open() ? '' : 'offcanvas'",
    '[attr.data-variant]': 'variant()',
    '[attr.data-side]': 'side()',
    '[class]': 'hostClass()',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave()',
  },
  template: `
    <ng-template #content><ng-content /></ng-template>
    @if (peekEnabled()) {
      <!-- Edge strip: the collapsed sidebar's reveal affordance. A thin
           hairline brightens on hover; hover mode peeks after a short intent
           delay, click mode on press. -->
      <button
        type="button"
        aria-label="Peek sidebar"
        [attr.aria-expanded]="sidebar.isPeeking()"
        [class]="stripClass()"
        (pointerenter)="onStripEnter($event)"
        (click)="onStripClick()"
      >
        <span aria-hidden="true" [class]="stripLineClass()"></span>
      </button>
      @if (peekMounted()) {
        <div #peekCard data-sidebar="peek" [class]="peekClass()" [style.width]="peekWidth()">
          <ng-container [ngTemplateOutlet]="content" />
        </div>
      }
    } @else {
      <div #panel [class]="panelClass()" [style.width]="sidebar.width()">
        @if (variant() === 'floating') {
          <div data-sidebar="sidebar" [class]="floatingCardClass()">
            <ng-container [ngTemplateOutlet]="content" />
          </div>
        } @else {
          <div data-sidebar="sidebar" [class]="columnClass()">
            <ng-container [ngTemplateOutlet]="content" />
          </div>
        }
        @if (rail()) {
          <ff-sidebar-rail
            [tooltipOpen]="railTooltipOpen()"
            [class]="railClass()"
            [style.--rail-fade-start]="railFade()?.start"
            [style.--rail-fade-end]="railFade()?.end"
          />
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarShell {
  readonly side = input.required<SidebarSide>();
  readonly variant = input.required<SidebarVariant>();
  /** The `sidebar` variant's inner-edge border. */
  readonly bordered = input(true, { transform: booleanAttribute });
  /** Render the built-in resize/collapse rail handle. `false` hides it and
   *  disables drag-resize — the trigger and keyboard shortcut still toggle. */
  readonly rail = input(true, { transform: booleanAttribute });
  /** Pin the rail's tooltip open (`true`) or closed (`false`); `undefined`
   *  leaves it on hover. Dragging always hides it. */
  readonly railTooltipOpen = input<boolean | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  protected readonly sidebar = injectSidebar();
  private readonly shape = injectShape();
  private readonly reduceMotion = inject(ReducedMotion).value;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);

  /** What the content inside the shell sits on (provided as SURFACE_LEVEL). */
  readonly contentLevel = injectSidebarContentLevel(this.variant);
  private readonly substrate = inject(SURFACE_LEVEL, { optional: true, skipSelf: true }) ?? pageLevel;
  private readonly floatingLevel = computed(() => Math.min(this.substrate() + 1, 8));

  // Collapsed-peek: the edge strip reveals the sidebar as a floating overlay
  // without pinning it. `!isResizing`: a drag can preview the collapsed state
  // mid-gesture; the shell must not swap to the peek strip then, or it would
  // unmount the rail holding the pointer capture and kill the drag.
  protected readonly peekEnabled = computed(
    () => this.sidebar.peek() !== 'none' && !this.sidebar.open() && !this.sidebar.isResizing(),
  );
  // Pinning open from an active peek: the panel is already fully on screen as
  // the overlay card, so while the width spring makes room the shell must not
  // clip — otherwise the visible sidebar wipes in from a mask it never left.
  private readonly pinFromPeekHold = signal(false);

  protected readonly hostClass = computed(() => {
    const breakpoint = this.sidebar.mobileBreakpoint();
    return cn(
      // No bare `group` here: an unnamed group on the whole rail would fire
      // every descendant's group-hover on rail hover.
      'peer shrink-0 sticky top-0 h-svh',
      // While peek is armed the 0-width shell must not clip the edge strip or
      // the overlay card — and must rise above the inset so the card paints
      // over it. Pinning from a peek keeps both through the width spring.
      this.peekEnabled() || this.pinFromPeekHold() ? 'z-40' : 'overflow-hidden',
      // Flex order (not DOM order) decides the side.
      this.side() === 'right' && 'order-last',
      // The inset rail has no card edge of its own, so its scroll hairline
      // hugs the rows' 8px gutter instead of running panel-wide.
      this.variant() === 'inset' && '[--scroll-divider-inset:8px]',
      BREAKPOINT_FADE_BASE,
      BREAKPOINT_HIDDEN[breakpoint],
      !BREAKPOINT_HIDDEN[breakpoint] && this.sidebar.isMobile() && 'hidden',
      this.userClass(),
    );
  });

  protected readonly stripClass = computed(() =>
    cn(
      'group/peek-strip absolute inset-y-0 z-40 w-3 cursor-pointer outline-none',
      this.side() === 'left' ? 'left-0' : 'right-0',
    ),
  );
  protected readonly stripLineClass = computed(() =>
    cn(
      'absolute inset-y-0 w-px bg-border opacity-0 transition-opacity duration-80 group-hover/peek-strip:opacity-100 group-focus-visible/peek-strip:opacity-100',
      this.side() === 'left' ? 'left-0' : 'right-0',
    ),
  );
  protected readonly peekClass = computed(() => {
    const floating = this.variant() === 'floating';
    return cn(
      'absolute inset-y-2 z-50 flex flex-col overflow-hidden',
      // The card's edge inset matches where the PINNED rail's content sits,
      // so pinning from a peek never shifts the rows sideways.
      this.side() === 'left' ? (floating ? 'left-2' : 'left-0') : floating ? 'right-2' : 'right-0',
      this.shape().container,
      surfaceClasses(this.floatingLevel(), 3),
    );
  });
  protected readonly peekWidth = computed(
    () => `calc(${this.sidebar.width()} - ${this.variant() === 'floating' ? '1rem' : '0.5rem'})`,
  );
  protected readonly panelClass = computed(() =>
    cn(
      'absolute inset-y-0 flex h-full flex-col',
      this.side() === 'left' ? 'left-0' : 'right-0',
      // Floating floats its card inside a full gutter; inset only needs the
      // vertical inset (horizontal room belongs to the nav rows).
      this.variant() === 'floating' && 'p-2',
      this.variant() === 'inset' && 'py-2',
    ),
  );
  protected readonly floatingCardClass = computed(() =>
    cn('flex h-full w-full min-h-0 flex-col', this.shape().container, surfaceClasses(this.floatingLevel(), 3)),
  );
  protected readonly columnClass = computed(() =>
    cn(
      'flex h-full w-full min-h-0 flex-col',
      this.bordered() &&
        this.variant() === 'sidebar' &&
        (this.side() === 'left' ? 'border-r border-border' : 'border-l border-border'),
    ),
  );
  protected readonly railClass = computed(() => {
    const variant = this.variant();
    const left = this.side() === 'left';
    return cn(
      // The floating card sits inside the panel's p-2 gutter, so the grab
      // strip (and its hover hairline) moves in to straddle the card's edge.
      variant === 'floating' && (left ? 'right-1 after:right-[3.5px]' : 'left-1 after:left-[3.5px]'),
      // Cards are vertically inset and rounded — the hover hairline hugs the
      // card's straight run, fading in past the corner radius.
      variant !== 'sidebar' &&
        'after:inset-y-2 after:[mask-image:linear-gradient(to_bottom,transparent_var(--rail-fade-start),black_var(--rail-fade-end),black_calc(100%-var(--rail-fade-end)),transparent_calc(100%-var(--rail-fade-start)))]',
    );
  });
  protected readonly railFade = computed(() => {
    if (this.variant() === 'sidebar') return null;
    const start = this.shape().bgRadius >= 20 ? 24 : 12;
    return { start: `${start}px`, end: `${start + 24}px` };
  });

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly peekCard = viewChild<ElementRef<HTMLElement>>('peekCard');

  // ── Peek card presence (AnimatePresence) ──
  protected readonly peekMounted = signal(false);
  private peekEnterPending = false;
  private peekAnimation: AnimationPlaybackControls | null = null;
  private peekExitTimer: ReturnType<typeof setTimeout> | undefined;

  // ── Width / slide motion ──
  private dragFlipActive = false;
  private dragFlipTimer: ReturnType<typeof setTimeout> | undefined;
  private pinHoldTimer: ReturnType<typeof setTimeout> | undefined;
  private prevOpen: boolean;
  private prevPeeking: boolean;
  private widthStarted = false;
  private lastWidthTarget = '';
  private lastPanel: HTMLElement | null = null;
  private lastPanelTarget = '';

  constructor() {
    this.prevOpen = untracked(this.sidebar.open);
    this.prevPeeking = untracked(this.sidebar.isPeeking);

    effect(() => {
      const open = this.sidebar.open();
      const peeking = this.sidebar.isPeeking();
      const resizing = this.sidebar.isResizing();
      const width = this.sidebar.width();
      const panel = this.panel()?.nativeElement ?? null;
      const side = this.side();
      const reduced = this.reduceMotion();
      untracked(() => this.runMotion(open, peeking, resizing, width, panel, side, reduced));
    });

    effect(() => this.syncPeekCard(this.peekEnabled(), this.sidebar.isPeeking()));
    afterRenderEffect(() => {
      const card = this.peekCard()?.nativeElement;
      if (card && this.peekEnterPending) untracked(() => this.enterPeekCard(card));
    });

    effect((onCleanup) => {
      if (!(this.peekEnabled() && this.sidebar.isPeeking())) return;
      const hover = this.sidebar.peek() === 'hover';
      untracked(() => onCleanup(this.watchPeek(hover)));
    });

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.dragFlipTimer);
      clearTimeout(this.pinHoldTimer);
      clearTimeout(this.peekExitTimer);
      this.peekAnimation?.stop();
    });
  }

  // ── Width and slide ─────────────────────────────────────

  private runMotion(
    open: boolean,
    peeking: boolean,
    resizing: boolean,
    width: string,
    panel: HTMLElement | null,
    side: SidebarSide,
    reduced: boolean,
  ) {
    // Both holds start in the run whose `open` flipped, compared with the
    // previous run: the provider drops isPeeking in that same change, so only
    // the previous run still knows the card was up.
    if (open !== this.prevOpen) {
      this.prevOpen = open;
      // Mid-drag open flips — the collapse preview and its drag-back rescue —
      // ride the moderate tier instead of the drag's glued tracking, held
      // through the spring's settle so later moves retarget it.
      if (resizing) {
        this.dragFlipActive = true;
        clearTimeout(this.dragFlipTimer);
        this.dragFlipTimer = setTimeout(() => (this.dragFlipActive = false), exitFallbackMs(spring.moderate));
      }
      if (open && this.prevPeeking) {
        this.pinFromPeekHold.set(true);
        clearTimeout(this.pinHoldTimer);
        this.pinHoldTimer = setTimeout(() => this.pinFromPeekHold.set(false), exitFallbackMs(spring.slow));
      }
    }
    this.prevPeeking = peeking;
    if (!resizing) this.dragFlipActive = false;

    // Drag-resize glues the panel to the pointer; the spring resumes for
    // open/close. Reduced motion snaps. The open/close ride the SLOW tier: a
    // whole column moving is the largest thing this component animates.
    const transition: AnimationOptions = reduced
      ? snap
      : resizing
        ? this.dragFlipActive
          ? open
            ? enterTransition(spring.moderate)
            : exitTransition(spring.moderate)
          : snap
        : open
          ? enterTransition(spring.slow)
          : exitTransition(spring.slow);

    // `initial={false}`: the first state is applied, not animated.
    const widthTarget = open ? width : '0rem';
    if (!this.widthStarted || widthTarget !== this.lastWidthTarget) {
      animate(this.host, { width: widthTarget }, this.widthStarted ? transition : snap);
      this.widthStarted = true;
      this.lastWidthTarget = widthTarget;
    }

    if (panel) {
      const x = open ? '0%' : side === 'left' ? '-100%' : '100%';
      const fresh = panel !== this.lastPanel;
      if (fresh || x !== this.lastPanelTarget) {
        animate(panel, { x }, fresh ? snap : transition);
        this.lastPanel = panel;
        this.lastPanelTarget = x;
      }
    } else {
      this.lastPanel = null;
    }
  }

  // ── Peek ────────────────────────────────────────────────

  private syncPeekCard(enabled: boolean, peeking: boolean) {
    untracked(() => {
      if (!enabled) {
        // The whole peek branch leaves with the strip: no exit to play.
        clearTimeout(this.peekExitTimer);
        this.peekAnimation?.stop();
        this.peekAnimation = null;
        this.peekEnterPending = false;
        this.peekMounted.set(false);
        return;
      }
      if (peeking) {
        clearTimeout(this.peekExitTimer);
        if (this.peekMounted() && this.peekCard()) {
          // Back in during the exit: retarget the same card.
          this.peekAnimation?.stop();
          this.peekAnimation = animate(
            this.peekCard()!.nativeElement,
            { x: 0 },
            this.reduceMotion() ? snap : enterTransition(spring.moderate),
          );
        } else {
          this.peekEnterPending = true;
          this.peekMounted.set(true);
        }
        return;
      }
      const card = this.peekCard()?.nativeElement;
      this.peekEnterPending = false;
      if (!card) {
        this.peekMounted.set(false);
        return;
      }
      this.peekAnimation?.stop();
      const exit = animate(
        card,
        { x: this.side() === 'left' ? '-108%' : '108%' },
        this.reduceMotion() ? snap : exitTransition(spring.moderate),
      );
      this.peekAnimation = exit;
      const unmount = () => {
        if (this.peekAnimation !== exit) return;
        clearTimeout(this.peekExitTimer);
        this.peekAnimation = null;
        this.peekMounted.set(false);
      };
      exit.finished.then(unmount, unmount);
      // Fallback: animation callbacks can stall in throttled tabs.
      clearTimeout(this.peekExitTimer);
      this.peekExitTimer = setTimeout(unmount, exitFallbackMs(spring.moderate));
    });
  }

  private enterPeekCard(card: HTMLElement) {
    this.peekEnterPending = false;
    this.peekAnimation?.stop();
    if (this.reduceMotion()) {
      this.peekAnimation = animate(card, { x: 0 }, snap);
      return;
    }
    const from = this.side() === 'left' ? '-108%' : '108%';
    card.style.transform = `translateX(${from})`;
    this.peekAnimation = animate(card, { x: [from, 0] }, enterTransition(spring.moderate));
  }

  /** Document listeners while peeked; returns their teardown. Both modes
   *  dismiss on Escape or an outside press. */
  private watchPeek(hover: boolean): () => void {
    const document = this.document;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.sidebar.setIsPeeking(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!this.host.contains(event.target as Node)) this.sidebar.setIsPeeking(false);
    };
    // Hover mode holds the peek by geometric containment, not enter/leave: a
    // portalled tooltip or menu covering the card steals the hit-test and
    // fires pointerleave on the shell even though the cursor never left the
    // sidebar. Dismissal is armed only when the pointer actually crosses out
    // of the overlay's box (with a little margin), and disarmed the moment it
    // crosses back.
    let wasInside = true;
    const onPointerMove = (event: PointerEvent) => {
      const overlay = this.host.querySelector('[data-sidebar="peek"]') ?? this.host;
      const box = overlay.getBoundingClientRect();
      const inside =
        event.clientX >= box.left - 8 &&
        event.clientX <= box.right + 8 &&
        event.clientY >= box.top - 8 &&
        event.clientY <= box.bottom + 8;
      if (inside) {
        // Unconditional: another surface's leave may have armed a dismissal
        // while the pointer was already inside the box.
        wasInside = true;
        this.sidebar.cancelPeekTimer();
      } else if (wasInside) {
        wasInside = false;
        this.sidebar.scheduleDismissPeek();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    if (hover) document.addEventListener('pointermove', onPointerMove);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
    };
  }

  // Hover-mode dismissal lives on the shell root: the pointer can land on the
  // overlay without ever crossing it (the card slides in under a stationary
  // cursor), so per-element leave events are unreliable.
  protected onPointerEnter() {
    if (this.peekEnabled() && this.sidebar.peek() === 'hover') this.sidebar.cancelPeekTimer();
  }

  // While PEEKED, dismissal belongs to the geometric watcher; this only
  // retires a pending peek-arm when the cursor departs before the intent
  // delay lands.
  protected onPointerLeave() {
    if (this.peekEnabled() && this.sidebar.peek() === 'hover' && !this.sidebar.isPeeking()) {
      this.sidebar.cancelPeekTimer();
    }
  }

  protected onStripEnter(event: PointerEvent) {
    if (this.sidebar.peek() === 'hover' && event.pointerType === 'mouse') this.sidebar.schedulePeek();
  }

  protected onStripClick() {
    this.sidebar.cancelPeekTimer();
    this.sidebar.setIsPeeking(true);
  }
}
