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
import {
  fitToOverlayBox,
  spring,
  exitFallbackMs,
  enterTransition,
  exitTransition,
  injectAnimateFluid,
  type FluidAnimation,
} from '../core';

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

/** Keeps the popup this far from the viewport edges, in px (Base UI's
 *  default `collisionPadding`). */
const COLLISION_PADDING = 5;

/** Base UI pads every side 1px more for the flip decision than for the
 *  size, and the side across from the requested one 1px more again, so a
 *  popup that overflows both sides alike stays where it was asked to go. */
const FLIP_BIAS = 1;

interface AnchorBox {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

/**
 * The side a popup of `size` opens on (Base UI's floating-ui `flip` with its
 * `bestFit` fallback): the requested side when it fits, else the opposite
 * one when that fits, else whichever overflows less, the requested side
 * winning a tie through the flip bias.
 */
export function choosePopupSide(
  preferred: PopupSide,
  anchor: AnchorBox,
  size: { width: number; height: number },
  viewport: ViewportSize,
  sideOffset: number,
): PopupSide {
  const padding = (s: PopupSide) => COLLISION_PADDING + FLIP_BIAS + (s === OPPOSITE[preferred] ? FLIP_BIAS : 0);
  const overflow = (s: PopupSide) => {
    const needed = (s === 'top' || s === 'bottom' ? size.height : size.width) + sideOffset;
    const space =
      s === 'bottom'
        ? viewport.height - anchor.bottom
        : s === 'top'
          ? anchor.top
          : s === 'right'
            ? viewport.width - anchor.right
            : anchor.left;
    return needed - (space - padding(s));
  };
  const opposite = OPPOSITE[preferred];
  const wanted = overflow(preferred);
  if (wanted <= 0) return preferred;
  const other = overflow(opposite);
  if (other <= 0) return opposite;
  return other < wanted ? opposite : preferred;
}

/** The height left for the popup on `side` (Base UI's `size()`, which
 *  writes `--available-height` unrounded). */
export function availableSpace(side: PopupSide, anchor: AnchorBox, viewport: ViewportSize, sideOffset: number): number {
  const available =
    side === 'bottom'
      ? viewport.height - anchor.bottom - sideOffset - COLLISION_PADDING
      : side === 'top'
        ? anchor.top - sideOffset - COLLISION_PADDING
        : viewport.height - 2 * COLLISION_PADDING;
  return Math.max(0, available);
}

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

  const positionsFor = (s: PopupSide) => {
    const p = options.placement();
    return [connectedPosition(s, p.align, p.sideOffset, p.alignOffset, rtl())];
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

  const viewportSize = (): ViewportSize | null => {
    const view = document.defaultView;
    if (!view) return null;
    return {
      width: document.documentElement.clientWidth || view.innerWidth,
      height: document.documentElement.clientHeight || view.innerHeight,
    };
  };

  const syncAvailableHeight = () => {
    const el = options.positioner();
    const anchor = options.anchor();
    const viewport = viewportSize();
    if (!el || !anchor || !viewport) return;
    const available = availableSpace(side(), anchor.getBoundingClientRect(), viewport, options.placement().sideOffset);
    el.style.setProperty('--available-height', `${available}px`);
  };

  // The side to open on, decided once per open like Base UI's flip: the
  // popup is measured at its natural size (--available-height seeded with
  // the viewport, as Base UI seeds 100vh), then CDK is handed that one side.
  // Letting CDK pick between both sides flips a popup capped to exactly the
  // space below whenever sub-pixel rounding makes it overflow by a hair.
  const resolveSide = (): PopupSide => {
    const p = options.placement();
    const el = options.positioner();
    const anchor = options.anchor();
    const viewport = viewportSize();
    if (!el || !anchor || !viewport) return p.side;
    el.style.setProperty('--available-height', `${viewport.height}px`);
    const box = options.motion() ?? el;
    const size = { width: box.offsetWidth, height: box.offsetHeight };
    return choosePopupSide(p.side, anchor.getBoundingClientRect(), size, viewport, p.sideOffset);
  };

  const ensureOverlay = () => {
    if (overlayRef) return overlayRef;
    const anchor = options.anchor();
    if (!anchor) return null;
    strategy = fitToOverlayBox(
      createFlexibleConnectedPositionStrategy(injector, anchor)
        .withPositions(positionsFor(options.placement().side))
        .withFlexibleDimensions(false)
        .withPush(true)
        .withViewportMargin(COLLISION_PADDING),
    );
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
    if (!ref.hasAttached()) {
      exiting = false;
      el.style.display = '';
      syncAnchorWidth();
      strategy?.withPositions(positionsFor(options.placement().side));
      ref.attach(new DomPortal(el));
      attached.set(true);
      const resolved = resolveSide();
      strategy?.withPositions(positionsFor(resolved));
      setSide(resolved);
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
