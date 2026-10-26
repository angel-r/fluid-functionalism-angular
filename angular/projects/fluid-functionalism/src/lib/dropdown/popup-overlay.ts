import { DOCUMENT, Injector, type Signal, inject, signal } from '@angular/core';
import {
  type ConnectedPosition,
  type ConnectionPositionPair,
  type FlexibleConnectedPositionStrategy,
  type OverlayRef,
  createFlexibleConnectedPositionStrategy,
  createOverlayRef,
  createRepositionScrollStrategy,
} from '@angular/cdk/overlay';
import { DomPortal } from '@angular/cdk/portal';
import { spring, exitFallbackMs } from '../core/springs';
import { enterTransition, exitTransition, injectAnimateFluid, type FluidAnimation } from '../core/motion';

// ---------------------------------------------------------------------------
// The popup half the dropdown and select share: a CDK overlay that carries an
// element rendered in the component's own template (a DomPortal), so the
// popup content keeps its DI, its registered rows and its query results
// between opens — the React popups keep their content component mounted the
// same way. While closed the element sits back in place with display:none.
//
// It owns the positioning (side / align / offsets with a flip to the
// opposite side), the resolved `data-side` the enter choreography keys on,
// the `--anchor-width` / `--available-height` variables the popup classes
// read, and the spring open/close: the exit plays to the end before the
// element leaves the overlay, with a timer fallback for stalled tabs.
// ---------------------------------------------------------------------------

export type PopupSide = 'top' | 'bottom' | 'left' | 'right';
export type PopupAlign = 'start' | 'center' | 'end';

export interface PopupPlacement {
  side: PopupSide;
  align: PopupAlign;
  sideOffset: number;
  alignOffset: number;
}

const OPPOSITE: Record<PopupSide, PopupSide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/** Keeps the popup this far from the viewport edges, in px. */
const VIEWPORT_MARGIN = 8;

/**
 * One CDK connected position for a physical side and a logical alignment.
 * `rtl` is the overlay's direction: CDK reads start/end against it, so a
 * physical left/right side is translated back to it.
 */
export function connectedPosition(
  side: PopupSide,
  align: PopupAlign,
  sideOffset: number,
  alignOffset: number,
  rtl = false,
): ConnectedPosition {
  if (side === 'top' || side === 'bottom') {
    const inward = (align === 'end') !== rtl ? -alignOffset : alignOffset;
    return {
      originX: align,
      overlayX: align,
      originY: side === 'bottom' ? 'bottom' : 'top',
      overlayY: side === 'bottom' ? 'top' : 'bottom',
      offsetY: side === 'bottom' ? sideOffset : -sideOffset,
      offsetX: align === 'center' ? alignOffset : inward,
    };
  }
  // Physical right is CDK's "end" in LTR and its "start" in RTL.
  const towardRight = side === 'right';
  const originX = towardRight !== rtl ? 'end' : 'start';
  const overlayX = towardRight !== rtl ? 'start' : 'end';
  const alignY = align === 'start' ? 'top' : align === 'end' ? 'bottom' : 'center';
  return {
    originX,
    overlayX,
    originY: alignY,
    overlayY: alignY,
    offsetX: towardRight ? sideOffset : -sideOffset,
    offsetY: align === 'end' ? -alignOffset : alignOffset,
  };
}

/** The physical side a resolved CDK position pair landed on. */
export function sideOfPair(pair: ConnectionPositionPair, rtl = false): PopupSide {
  if (pair.originY === 'bottom' && pair.overlayY === 'top') return 'bottom';
  if (pair.originY === 'top' && pair.overlayY === 'bottom') return 'top';
  const end = pair.originX === 'end';
  return end !== rtl ? 'right' : 'left';
}

/** The 4px slide the enter choreography starts from, by resolved side (the
 *  numeric `--popup-enter-y` of `popupMotionClass`). */
export function enterOffsetY(side: PopupSide): number {
  return side === 'top' ? 4 : side === 'bottom' ? -4 : 0;
}

export interface PopupOverlayOptions {
  /** The element that moves into the overlay (the React Positioner). */
  positioner: () => HTMLElement | undefined;
  /** The element the open/close spring animates (the React motion.div). */
  motion: () => HTMLElement | undefined;
  /** What the popup is positioned against. */
  anchor: () => HTMLElement | null | undefined;
  placement: () => PopupPlacement;
  /** Whether the reading direction is right-to-left. */
  rtl?: () => boolean;
}

/**
 * Creates the overlay controller. Call in an injection context; the
 * component's injector is what the overlay uses, so DI reaches the content.
 */
export function createPopupOverlay(options: PopupOverlayOptions) {
  const injector = inject(Injector);
  const document = inject(DOCUMENT);
  const animate = injectAnimateFluid();
  const side = signal<PopupSide>('bottom');
  const attached = signal(false);

  let overlayRef: OverlayRef | null = null;
  let strategy: FlexibleConnectedPositionStrategy | null = null;
  let animation: FluidAnimation | null = null;
  let exiting = false;
  let exitTimer: ReturnType<typeof setTimeout> | undefined;

  const rtl = () => options.rtl?.() ?? false;

  const positions = () => {
    const p = options.placement();
    return [p.side, OPPOSITE[p.side]].map((s) => connectedPosition(s, p.align, p.sideOffset, p.alignOffset, rtl()));
  };

  const setSide = (next: PopupSide) => {
    side.set(next);
    const el = options.positioner();
    el?.setAttribute('data-side', next);
    syncAvailableHeight();
  };

  // The CSS variables Base UI's Positioner provides.
  const syncAnchorWidth = () => {
    const el = options.positioner();
    const anchor = options.anchor();
    if (!el || !anchor) return;
    el.style.setProperty('--anchor-width', `${anchor.getBoundingClientRect().width}px`);
  };

  const syncAvailableHeight = () => {
    const el = options.positioner();
    const anchor = options.anchor();
    const view = document.defaultView;
    if (!el || !anchor || !view) return;
    const rect = anchor.getBoundingClientRect();
    const viewport = document.documentElement.clientHeight || view.innerHeight;
    const { sideOffset } = options.placement();
    const s = side();
    const available =
      s === 'bottom'
        ? viewport - rect.bottom - sideOffset - VIEWPORT_MARGIN
        : s === 'top'
          ? rect.top - sideOffset - VIEWPORT_MARGIN
          : viewport - 2 * VIEWPORT_MARGIN;
    el.style.setProperty('--available-height', `${Math.max(0, Math.round(available))}px`);
  };

  const ensureOverlay = () => {
    if (overlayRef) return overlayRef;
    const anchor = options.anchor();
    if (!anchor) return null;
    strategy = createFlexibleConnectedPositionStrategy(injector, anchor)
      .withPositions(positions())
      .withFlexibleDimensions(false)
      .withPush(true)
      .withViewportMargin(VIEWPORT_MARGIN);
    strategy.positionChanges.subscribe((change) => setSide(sideOfPair(change.connectionPair, rtl())));
    overlayRef = createOverlayRef(injector, {
      positionStrategy: strategy,
      scrollStrategy: createRepositionScrollStrategy(injector),
      direction: rtl() ? 'rtl' : 'ltr',
    });
    return overlayRef;
  };

  const show = () => {
    clearTimeout(exitTimer);
    const ref = ensureOverlay();
    const el = options.positioner();
    if (!ref || !el) return;
    const anchor = options.anchor();
    if (anchor) strategy?.setOrigin(anchor);
    strategy?.withPositions(positions());
    if (!ref.hasAttached()) {
      exiting = false;
      el.style.display = '';
      setSide(options.placement().side);
      syncAnchorWidth();
      ref.attach(new DomPortal(el));
      attached.set(true);
      ref.updatePosition();
      const motion = options.motion();
      if (motion) {
        animation?.stop();
        motion.style.opacity = '0';
        animation = animate(
          motion,
          { opacity: [0, 1], y: [enterOffsetY(side()), 0], scaleY: [0.96, 1] },
          enterTransition(spring.fast),
        );
      }
      return;
    }
    // Reopened mid-exit: turn the exit around from where it is.
    if (exiting) {
      exiting = false;
      const motion = options.motion();
      if (motion) {
        animation?.stop();
        animation = animate(motion, { opacity: 1, y: 0, scaleY: 1 }, enterTransition(spring.fast));
      }
    }
  };

  const detach = () => {
    clearTimeout(exitTimer);
    exiting = false;
    animation?.stop();
    animation = null;
    if (overlayRef?.hasAttached()) overlayRef.detach();
    const el = options.positioner();
    if (el) el.style.display = 'none';
    attached.set(false);
  };

  const hide = () => {
    if (!overlayRef?.hasAttached() || exiting) return;
    exiting = true;
    const motion = options.motion();
    if (motion) {
      animation?.stop();
      const exit = animate(
        motion,
        { opacity: 0, y: enterOffsetY(side()), scaleY: 0.96 },
        exitTransition(spring.fast),
      );
      animation = exit;
      exit.finished.then(() => {
        if (exiting && animation === exit) detach();
      });
    }
    // Fallback release: animation callbacks can stall in throttled or
    // background tabs.
    exitTimer = setTimeout(() => {
      if (exiting) detach();
    }, exitFallbackMs(spring.fast));
  };

  const dispose = () => {
    clearTimeout(exitTimer);
    animation?.stop();
    overlayRef?.dispose();
    overlayRef = null;
  };

  return {
    /** The side the popup resolved to after collision flipping. */
    side: side.asReadonly() as Signal<PopupSide>,
    /** Whether the popup element is in the overlay (open, or playing its exit). */
    attached: attached.asReadonly(),
    show,
    hide,
    dispose,
    updatePosition: () => overlayRef?.updatePosition(),
  };
}

export type PopupOverlay = ReturnType<typeof createPopupOverlay>;
