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
  type Signal,
  TemplateRef,
  ViewContainerRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
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
import {
  cn,
  fitToOverlayBox,
  exitFallbackMs,
  spring,
  fontWeights,
  injectShape,
  type FluidAnimation,
  enterTransition,
  exitTransition,
  injectAnimateFluid,
} from '../core';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
export type TooltipContent = string | number | TemplateRef<unknown> | null | undefined;

// ---------------------------------------------------------------------------
// Portal container
// ---------------------------------------------------------------------------

/** Where tooltips below render instead of the global overlay layer. */
export const TOOLTIP_PORTAL_CONTAINER = new InjectionToken<Signal<HTMLElement | null>>('FF_TOOLTIP_PORTAL_CONTAINER');

/**
 * Renders descendant tooltips inside the given element (a scaled preview
 * frame, say) instead of the global overlay layer:
 * `<div [ffTooltipPortalContainer]="frame">`.
 */
@Directive({
  selector: '[ffTooltipPortalContainer]',
  providers: [{ provide: TOOLTIP_PORTAL_CONTAINER, useFactory: () => inject(TooltipPortalContainer).value }],
})
export class TooltipPortalContainer {
  readonly value = input<HTMLElement | null>(null, { alias: 'ffTooltipPortalContainer' });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const DEFAULT_DELAY = 200;

interface TooltipGroupMember {
  closeFromGroup(): void;
}

/**
 * Shared delay state for a group of tooltips: once one opens, moving to an
 * adjacent trigger shows its tooltip instantly instead of re-waiting the full
 * delay, and a tooltip that closed within `timeout` ms still counts.
 */
export class TooltipGroup {
  private current: TooltipGroupMember | null = null;
  private lastClosedAt = -Infinity;

  constructor(
    readonly delay: () => number,
    readonly timeout: () => number,
  ) {}

  /** The delay a member should wait before opening. */
  openDelay(own: number | undefined): number {
    if (this.current !== null || performance.now() - this.lastClosedAt < this.timeout()) return 0;
    return own ?? this.delay();
  }

  opened(member: TooltipGroupMember) {
    if (this.current && this.current !== member) this.current.closeFromGroup();
    this.current = member;
  }

  closed(member: TooltipGroupMember) {
    if (this.current !== member) return;
    this.current = null;
    this.lastClosedAt = performance.now();
  }
}

export const TOOLTIP_GROUP = new InjectionToken<TooltipGroup>('FF_TOOLTIP_GROUP');

/**
 * Groups descendant Tooltips so that once one opens, moving to an adjacent
 * trigger shows its tooltip instantly instead of re-waiting the full delay.
 * Put it once at the app (or section) level; bare Tooltips still work without
 * it, each with its own delay.
 */
@Directive({
  selector: '[ffTooltipProvider]',
  providers: [{ provide: TOOLTIP_GROUP, useFactory: () => inject(TooltipProvider).group }],
})
export class TooltipProvider {
  /** Hover delay before tooltips open, in ms. Defaults to 200. */
  readonly delayDuration = input(DEFAULT_DELAY);
  /** After a tooltip closes, adjacent tooltips opened within this window
   *  skip the hover delay, in ms. Defaults to 300. */
  readonly skipDelayDuration = input(300);
  readonly group = new TooltipGroup(
    () => this.delayDuration(),
    () => this.skipDelayDuration(),
  );
}

// ---------------------------------------------------------------------------
// Animation and placement helpers
// ---------------------------------------------------------------------------

function getSlideOffset(side: TooltipSide): { x: number; y: number } {
  switch (side) {
    case 'top':
      return { x: 0, y: 4 };
    case 'bottom':
      return { x: 0, y: -4 };
    case 'left':
      return { x: 4, y: 0 };
    case 'right':
      return { x: -4, y: 0 };
  }
}

const OPPOSITE: Record<TooltipSide, TooltipSide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

function connectedPosition(side: TooltipSide, offset: number): ConnectedPosition {
  switch (side) {
    case 'top':
      return { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -offset };
    case 'bottom':
      return { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: offset };
    case 'left':
      return { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -offset };
    case 'right':
      return { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: offset };
  }
}

/** The side a resolved CDK position sits on (after collision flipping). */
function sideOf(position: ConnectedPosition): TooltipSide {
  if (position.originY === 'top' && position.overlayY === 'bottom') return 'top';
  if (position.originY === 'bottom' && position.overlayY === 'top') return 'bottom';
  return position.originX === 'start' ? 'left' : 'right';
}

/** Collision padding against the viewport edges, as Base UI's default. */
const VIEWPORT_MARGIN = 5;

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

/**
 * Floating tooltip with spring-based animations. Wraps its trigger (the
 * first projected element) and renders `content` in an overlay:
 *
 *   <ff-tooltip content="Save your changes"><button>Hover me</button></ff-tooltip>
 *
 * The host is `display: contents`, so it adds no box around the trigger.
 */
@Component({
  selector: 'ff-tooltip',
  imports: [NgTemplateOutlet],
  host: {
    style: 'display: contents',
    '(pointerover)': 'onPointerOver($event)',
    '(pointerout)': 'onPointerOut($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerdown)': 'cancelOpen()',
    '(click)': 'onPress()',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <ng-content />
    <ng-template #popup>
      <!-- Outer wrapper carries the positioner-facing state plus the
           cursor-follow offset; the inner box keeps the enter/exit slide so
           the two transforms don't fight. -->
      <div
        data-slot="tooltip-popup"
        [attr.data-side]="resolvedSide()"
        (pointerenter)="onPopupEnter()"
        (pointerleave)="onPopupLeave($event)"
      >
        <div [class]="boxClass()" [style.font-variation-settings]="fontWeight">
          @if (contentTemplate(); as template) {
            <ng-container [ngTemplateOutlet]="template" />
          } @else {
            {{ content() }}
          }
        </div>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tooltip implements TooltipGroupMember {
  /** The content displayed inside the tooltip: text or a template. */
  readonly content = input<TooltipContent>(undefined);
  /** Preferred side of the trigger to render the tooltip. */
  readonly side = input<TooltipSide>('top');
  /** Distance in pixels between the tooltip and the trigger. */
  readonly sideOffset = input(8);
  /** Hover delay before this tooltip opens, in ms. Defaults to 200, or to the
   *  ambient TooltipProvider's delayDuration when one is present. */
  readonly delayDuration = input<number | undefined>(undefined);
  /** Additional classes for the tooltip content box. (React: `className`.) */
  readonly userClass = input('', { alias: 'class' });
  /** Extra classes for the overlay positioner element — pass a z utility here
   *  to lift the whole tooltip above other fixed layers (default z-50).
   *  (React: `contentClassName`.) */
  readonly contentClass = input<string | undefined>(undefined);
  /** When true, forces the tooltip open. When false, forces it closed. When
   *  undefined, uses default hover/focus behavior. */
  readonly forceOpen = input<boolean | undefined>(undefined);
  /** Follow the cursor along one axis while hovering the trigger — for tall
   *  or wide triggers (the Sidebar rail) where a centered tooltip sits far
   *  from the pointer. The other axis stays anchored by `side`. */
  readonly followCursor = input<'x' | 'y' | undefined>(undefined);
  /** Emits when the tooltip's internal open state changes (before forceOpen
   *  is applied). (React: `onOpenChange`.) */
  readonly openChange = output<boolean>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly group = inject(TOOLTIP_GROUP, { optional: true });
  private readonly portalContainer = inject(TOOLTIP_PORTAL_CONTAINER, { optional: true });
  private readonly shape = injectShape();
  private readonly animate = injectAnimateFluid();
  private readonly popupTemplate = viewChild.required<TemplateRef<unknown>>('popup');

  private readonly internalOpen = signal(false);
  /** The effective open state: `forceOpen` wins over interaction. */
  readonly open = computed(() => this.forceOpen() ?? this.internalOpen());
  protected readonly resolvedSide = signal<TooltipSide>('top');
  protected readonly fontWeight = fontWeights.normal;

  protected readonly contentTemplate = computed(() => {
    const content = this.content();
    return content instanceof TemplateRef ? content : null;
  });

  protected readonly boxClass = computed(() =>
    cn(
      // Trim recenters the label; the padding bump only applies where
      // text-box is supported, keeping the same overall height (~24px) as
      // untrimmed browsers.
      'bg-foreground text-background text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] px-2 py-1',
      '[text-box:trim-both_cap_alphabetic] supports-[text-box:trim-both]:py-2',
      this.shape().bg,
      this.userClass(),
    ),
  );
  private readonly paneClass = computed(() => cn('z-50', this.contentClass()));

  private overlayRef: OverlayRef | null = null;
  private positionStrategy: FlexibleConnectedPositionStrategy | null = null;
  private view: EmbeddedViewRef<unknown> | null = null;
  private outer: HTMLElement | null = null;
  private box: HTMLElement | null = null;
  private animation: FluidAnimation | null = null;
  private exiting = false;
  private appliedPaneClass: string[] = [];

  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private exitTimer: ReturnType<typeof setTimeout> | undefined;
  /** A press closed the tooltip: hover can't reopen it until the pointer leaves. */
  private pressed = false;
  /** Cursor-follow offset from the trigger's center, written straight to the DOM. */
  private followOffset = 0;

  constructor() {
    effect(() => {
      const open = this.open();
      untracked(() => (open ? this.show() : this.hide()));
    });

    effect(() => {
      const open = this.open();
      untracked(() => {
        if (this.group) open ? this.group.opened(this) : this.group.closed(this);
        const trigger = this.trigger();
        if (open) trigger?.setAttribute('data-popup-open', '');
        else trigger?.removeAttribute('data-popup-open');
      });
    });

    // A force-opened follow-cursor tooltip has no cursor to follow — it rests
    // centered on the trigger until a real pointer takes over.
    effect(() => {
      if (this.forceOpen() && this.followCursor()) untracked(() => this.setFollowOffset(0));
    });

    effect(() => {
      const positions = [this.side(), OPPOSITE[this.side()]].map((s) => connectedPosition(s, this.sideOffset()));
      untracked(() => {
        this.positionStrategy?.withPositions(positions);
        this.overlayRef?.updatePosition();
      });
    });

    effect(() => {
      const next = this.paneClass().split(/\s+/).filter(Boolean);
      untracked(() => this.applyPaneClass(next));
    });

    // Content can change size while open (a status label): stay anchored.
    afterRenderEffect(() => {
      this.content();
      this.overlayRef?.updatePosition();
    });

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.openTimer);
      clearTimeout(this.closeTimer);
      clearTimeout(this.exitTimer);
      this.document.removeEventListener('keydown', this.onDocumentKeydown, true);
      this.animation?.stop();
      if (this.group) this.group.closed(this);
      this.overlayRef?.dispose();
      this.overlayRef = null;
    });
  }

  // ── State ─────────────────────────────────────────────────────────────

  /** Interaction asks for a new open state; reported only when it differs
   *  from the effective state (as the React version's onOpenChange). */
  private requestOpen(next: boolean) {
    if (next === this.open()) return;
    this.internalOpen.set(next);
    this.openChange.emit(next);
  }

  closeFromGroup() {
    this.cancelOpen();
    this.requestOpen(false);
  }

  private trigger(): HTMLElement | null {
    return (this.host.firstElementChild as HTMLElement | null) ?? null;
  }

  private popupElement(): HTMLElement | null {
    return this.outer;
  }

  // ── Interaction ──────────────────────────────────────────────────────

  private isInside(node: EventTarget | null, element: Element | null) {
    return node instanceof Node && !!element && element.contains(node);
  }

  protected onPointerOver(event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    if (this.isInside(event.relatedTarget, this.host) || this.isInside(event.relatedTarget, this.popupElement())) {
      clearTimeout(this.closeTimer);
      return;
    }
    clearTimeout(this.closeTimer);
    if (this.pressed) return;
    this.scheduleOpen();
  }

  protected onPointerOut(event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    if (this.isInside(event.relatedTarget, this.host)) return;
    this.pressed = false;
    this.cancelOpen();
    if (this.isInside(event.relatedTarget, this.popupElement())) return;
    if (this.headsToPopup(event)) {
      // The popup is hoverable: give the pointer a moment to cross the gap.
      clearTimeout(this.closeTimer);
      this.closeTimer = setTimeout(() => this.requestOpen(false), HOVERABLE_GRACE_MS);
      return;
    }
    this.requestOpen(false);
  }

  /** Whether the pointer left the trigger through the edge facing the popup. */
  private headsToPopup(event: PointerEvent) {
    const trigger = this.trigger();
    if (!this.outer || !trigger) return false;
    const rect = trigger.getBoundingClientRect();
    switch (this.resolvedSide()) {
      case 'top':
        return event.clientY <= rect.top;
      case 'bottom':
        return event.clientY >= rect.bottom;
      case 'left':
        return event.clientX <= rect.left;
      case 'right':
        return event.clientX >= rect.right;
    }
  }

  protected onPopupEnter() {
    clearTimeout(this.closeTimer);
  }

  protected onPopupLeave(event: PointerEvent) {
    if (this.isInside(event.relatedTarget, this.host)) return;
    this.requestOpen(false);
  }

  protected onPointerMove(event: PointerEvent) {
    const followCursor = this.followCursor();
    const trigger = this.trigger();
    if (!followCursor || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    this.setFollowOffset(
      followCursor === 'y'
        ? event.clientY - (rect.top + rect.height / 2)
        : event.clientX - (rect.left + rect.width / 2),
    );
  }

  protected cancelOpen() {
    clearTimeout(this.openTimer);
    this.openTimer = undefined;
  }

  /** A press on the trigger closes the tooltip. */
  protected onPress() {
    this.cancelOpen();
    clearTimeout(this.closeTimer);
    this.pressed = true;
    this.requestOpen(false);
  }

  protected onFocusIn(event: FocusEvent) {
    const target = event.target as HTMLElement | null;
    if (!target || !this.matchesFocusVisible(target)) return;
    this.cancelOpen();
    clearTimeout(this.closeTimer);
    this.requestOpen(true);
  }

  protected onFocusOut(event: FocusEvent) {
    if (this.isInside(event.relatedTarget, this.host) || this.isInside(event.relatedTarget, this.popupElement())) return;
    this.cancelOpen();
    this.requestOpen(false);
  }

  private matchesFocusVisible(element: HTMLElement) {
    try {
      return element.matches(':focus-visible');
    } catch {
      return element.matches(':focus');
    }
  }

  private scheduleOpen() {
    this.cancelOpen();
    const delay = this.group ? this.group.openDelay(this.delayDuration()) : (this.delayDuration() ?? DEFAULT_DELAY);
    if (delay <= 0) {
      this.requestOpen(true);
      return;
    }
    this.openTimer = setTimeout(() => {
      this.openTimer = undefined;
      this.requestOpen(true);
    }, delay);
  }

  private readonly onDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    this.cancelOpen();
    this.requestOpen(false);
  };

  // ── Overlay ──────────────────────────────────────────────────────────

  private ensureOverlay(): OverlayRef | null {
    if (this.overlayRef) return this.overlayRef;
    const origin = this.trigger() ?? this.host;
    const container = this.portalContainer?.() ?? null;
    const strategy = fitToOverlayBox(
      createFlexibleConnectedPositionStrategy(this.injector, origin)
        .withPositions([this.side(), OPPOSITE[this.side()]].map((s) => connectedPosition(s, this.sideOffset())))
        .withFlexibleDimensions(false)
        .withPush(true)
        .withViewportMargin(VIEWPORT_MARGIN),
    );
    if (container) strategy.withPopoverLocation({ type: 'parent', element: container });
    strategy.positionChanges.subscribe((change) => {
      const side = sideOf(change.connectionPair);
      this.resolvedSide.set(side);
      this.overlayRef?.overlayElement.setAttribute('data-side', side);
      this.snapToPixels();
    });
    this.positionStrategy = strategy;
    this.overlayRef = createOverlayRef(this.injector, {
      positionStrategy: strategy,
      scrollStrategy: createRepositionScrollStrategy(this.injector),
      ...(container ? { usePopover: true } : {}),
    });
    this.appliedPaneClass = [];
    this.applyPaneClass(this.paneClass().split(/\s+/).filter(Boolean));
    return this.overlayRef;
  }

  private applyPaneClass(next: string[]) {
    if (!this.overlayRef) return;
    if (this.appliedPaneClass.length) this.overlayRef.removePanelClass(this.appliedPaneClass);
    if (next.length) this.overlayRef.addPanelClass(next);
    this.appliedPaneClass = next;
  }

  /** Lands the bubble where Floating UI puts React's: Floating UI rounds its
   *  translate to device pixels; the CDK pane keeps fractions (a centered
   *  pane). Shifting by the remainder lands the bubble on the same whole
   *  pixels, so its text renders as crisp as React's. (The scrollbar-gutter
   *  offset of right-anchored panes is fixed by `fitToOverlayBox`.) */
  private snapToPixels() {
    const outer = this.outer;
    const pane = this.overlayRef?.overlayElement;
    if (!outer || !pane) return;
    const { x, y } = pane.getBoundingClientRect();
    const dpr = this.document.defaultView?.devicePixelRatio || 1;
    const remainder = (v: number) => Math.round(v * dpr) / dpr - v;
    outer.style.translate = `${remainder(x)}px ${remainder(y)}px`;
  }

  private setFollowOffset(offset: number) {
    this.followOffset = offset;
    this.applyFollowOffset();
  }

  private applyFollowOffset() {
    if (!this.outer) return;
    const followCursor = this.followCursor();
    this.outer.style.transform =
      followCursor === 'y'
        ? `translateY(${this.followOffset}px)`
        : followCursor === 'x'
          ? `translateX(${this.followOffset}px)`
          : '';
  }

  private show() {
    clearTimeout(this.exitTimer);
    const overlayRef = this.ensureOverlay();
    if (!overlayRef) return;
    // The projected trigger can be re-rendered between opens: anchor to the current one.
    this.positionStrategy?.setOrigin(this.trigger() ?? this.host);
    this.document.addEventListener('keydown', this.onDocumentKeydown, true);
    const slide = getSlideOffset(this.side());
    if (!overlayRef.hasAttached()) {
      this.resolvedSide.set(this.side());
      overlayRef.overlayElement.setAttribute('data-side', this.side());
      this.view = overlayRef.attach(new TemplatePortal(this.popupTemplate(), this.viewContainerRef));
      this.view.detectChanges();
      this.outer = this.view.rootNodes.find((n): n is HTMLElement => n instanceof HTMLElement) ?? null;
      this.box = (this.outer?.firstElementChild as HTMLElement | null) ?? null;
      this.applyFollowOffset();
      this.exiting = false;
      if (this.box) {
        this.box.style.opacity = '0';
        this.animation = this.animate(
          this.box,
          { opacity: [0, 1], x: [slide.x, 0], y: [slide.y, 0] },
          enterTransition(spring.fast),
        );
      }
      return;
    }
    // Reopened mid-exit: turn the exit around from where it is.
    if (this.exiting && this.box) {
      this.exiting = false;
      this.animation?.stop();
      this.animation = this.animate(this.box, { opacity: 1, x: 0, y: 0 }, enterTransition(spring.fast));
    }
  }

  private hide() {
    this.document.removeEventListener('keydown', this.onDocumentKeydown, true);
    clearTimeout(this.closeTimer);
    if (!this.overlayRef?.hasAttached() || this.exiting) return;
    this.exiting = true;
    const box = this.box;
    if (box) {
      this.animation?.stop();
      // The exit only fades (the docs' Radix flavour animates to x/y 0, so a
      // finished entrance stays put); both targets still name x and y, so the
      // exit is one animation whose end releases the unmount below.
      const animation = this.animate(box, { opacity: 0, x: 0, y: 0 }, exitTransition(spring.fast));
      this.animation = animation;
      animation.finished.then(() => {
        if (this.exiting && this.animation === animation) this.detach();
      });
    }
    // Fallback release: animation callbacks can stall in throttled or
    // background tabs.
    this.exitTimer = setTimeout(() => {
      if (this.exiting) this.detach();
    }, exitFallbackMs(spring.fast));
  }

  private detach() {
    clearTimeout(this.exitTimer);
    this.exiting = false;
    this.animation?.stop();
    this.animation = null;
    if (this.overlayRef?.hasAttached()) this.overlayRef.detach();
    this.view = null;
    this.outer = null;
    this.box = null;
  }
}

/** How long a hoverable popup waits for the pointer to cross the gap, in ms. */
const HOVERABLE_GRACE_MS = 100;
