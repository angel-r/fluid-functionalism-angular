import { type EmbeddedViewRef, type Injector, type TemplateRef, type ViewContainerRef } from '@angular/core';
import {
  type FlexibleConnectedPositionStrategy,
  type OverlayRef,
  createFlexibleConnectedPositionStrategy,
  createOverlayRef,
  createRepositionScrollStrategy,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { fitToOverlayBox } from '../core/overlay';
import { exitFallbackMs } from '../core/springs';
import { type FluidAnimation, type SpringTier, enterTransition, exitTransition, type injectAnimateFluid } from '../core/motion';

// ---------------------------------------------------------------------------
// The overlay both color picker popups share (the format menu and the
// popover panel): a CDK overlay anchored below the trigger's start edge,
// flipping above it on collision, with the React spring choreography.
//
// The content keeps mounted through its exit: opacity 0 → 1, y -4 → 0 and
// scaleY 0.96 → 1 on the enter tier, back on its exit tween, then detached
// (plus a fallback timer, since animation callbacks can stall in background
// tabs and never run under TestBed).
// ---------------------------------------------------------------------------

export interface PopupOverlayOptions {
  injector: Injector;
  viewContainerRef: ViewContainerRef;
  template: () => TemplateRef<unknown>;
  origin: () => HTMLElement;
  /** Renders inside this element instead of the global overlay layer. */
  portalContainer: () => HTMLElement | null;
  /** Classes for the positioner pane (its z-index). */
  paneClass: string;
  /** Gap between the trigger and the popup, in px. */
  sideOffset: number;
  tier: SpringTier;
  animate: ReturnType<typeof injectAnimateFluid>;
  /** Called after the view attached, with its root element. */
  onAttach?: (root: HTMLElement) => void;
  /** Called after the view detached. */
  onDetach?: () => void;
}

const HIDDEN = { opacity: 0, y: -4, scaleY: 0.96 };
const SHOWN = { opacity: 1, y: 0, scaleY: 1 };

export class PopupOverlay {
  private overlayRef: OverlayRef | null = null;
  private strategy: FlexibleConnectedPositionStrategy | null = null;
  private view: EmbeddedViewRef<unknown> | null = null;
  private animation: FluidAnimation | null = null;
  private exitTimer: ReturnType<typeof setTimeout> | undefined;
  private exiting = false;
  /** The first element of the attached view (the motion wrapper). */
  root: HTMLElement | null = null;

  constructor(private readonly options: PopupOverlayOptions) {}

  get attached() {
    return !!this.overlayRef?.hasAttached();
  }

  /** The overlay pane, for outside-press checks. */
  get pane(): HTMLElement | null {
    return this.overlayRef?.overlayElement ?? null;
  }

  private ensure(): OverlayRef {
    if (this.overlayRef) return this.overlayRef;
    const { injector, sideOffset } = this.options;
    const container = this.options.portalContainer();
    const strategy = fitToOverlayBox(
      createFlexibleConnectedPositionStrategy(injector, this.options.origin())
        .withPositions([
          { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: sideOffset },
          { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -sideOffset },
        ])
        .withFlexibleDimensions(false)
        .withPush(true)
        .withViewportMargin(8),
    );
    if (container) strategy.withPopoverLocation({ type: 'parent', element: container });
    strategy.positionChanges.subscribe((change) => {
      const side = change.connectionPair.originY === 'top' ? 'top' : 'bottom';
      this.overlayRef?.overlayElement.setAttribute('data-side', side);
    });
    this.strategy = strategy;
    this.overlayRef = createOverlayRef(injector, {
      positionStrategy: strategy,
      scrollStrategy: createRepositionScrollStrategy(injector),
      panelClass: this.options.paneClass.split(/\s+/).filter(Boolean),
      ...(container ? { usePopover: true } : {}),
    });
    return this.overlayRef;
  }

  show() {
    clearTimeout(this.exitTimer);
    const overlayRef = this.ensure();
    this.strategy?.setOrigin(this.options.origin());
    const { tier, animate } = this.options;
    if (!overlayRef.hasAttached()) {
      overlayRef.overlayElement.setAttribute('data-side', 'bottom');
      this.view = overlayRef.attach(new TemplatePortal(this.options.template(), this.options.viewContainerRef));
      this.view.detectChanges();
      this.root = this.view.rootNodes.find((n): n is HTMLElement => n instanceof HTMLElement) ?? null;
      this.exiting = false;
      if (this.root) {
        Object.assign(this.root.style, { opacity: '0' });
        this.animation = animate(
          this.root,
          { opacity: [0, 1], y: [HIDDEN.y, 0], scaleY: [HIDDEN.scaleY, 1] },
          enterTransition(tier),
        );
        this.options.onAttach?.(this.root);
      }
      overlayRef.updatePosition();
      return;
    }
    // Reopened mid-exit: turn the exit around from where it is.
    if (this.exiting && this.root) {
      this.exiting = false;
      this.animation?.stop();
      this.animation = animate(this.root, SHOWN, enterTransition(tier));
    }
  }

  hide() {
    if (!this.overlayRef?.hasAttached() || this.exiting) return;
    this.exiting = true;
    const root = this.root;
    if (root) {
      this.animation?.stop();
      const animation = this.options.animate(root, HIDDEN, exitTransition(this.options.tier));
      this.animation = animation;
      animation.finished.then(() => {
        if (this.exiting && this.animation === animation) this.detach();
      });
    }
    this.exitTimer = setTimeout(() => {
      if (this.exiting) this.detach();
    }, exitFallbackMs(this.options.tier));
  }

  updatePosition() {
    this.overlayRef?.updatePosition();
  }

  private detach() {
    clearTimeout(this.exitTimer);
    this.exiting = false;
    this.animation?.stop();
    this.animation = null;
    if (this.overlayRef?.hasAttached()) this.overlayRef.detach();
    this.view = null;
    this.root = null;
    this.options.onDetach?.();
  }

  dispose() {
    clearTimeout(this.exitTimer);
    this.animation?.stop();
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.view = null;
    this.root = null;
  }
}
