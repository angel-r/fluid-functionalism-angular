import { DOCUMENT, DestroyRef, type Signal, afterRenderEffect, computed, effect, inject, untracked } from '@angular/core';
import { cn, popupMotionClass } from '../core';
import { createPopupOverlay, type PopupAlign } from '../dropdown';

// ---------------------------------------------------------------------------
// The popover both date picker popups share (the React flavor's Popover over
// Base UI): a CDK overlay positioned under its anchor with the spring
// scale-in, held through its exit spring before the content unmounts.
//
// kind "trigger": the anchor is a button that toggles the popover; presses
// outside it and the popup, focus moving out of them, and Escape close it,
// and closing hands focus back to the trigger when it was inside (Base UI's
// finalFocus). The calendar moves focus inside on its own.
// kind "anchor": the anchor is a field that keeps focus (a time); presses
// outside the field and the popup close it, and the field handles its own
// blur and Escape.
//
// The component renders, in its own template:
//   positioner (display:none while closed) > dialog > motion wrapper >
//   @if (mounted()) { the elevated popup and its content }
// so DI from the component reaches the content and the popup leaves the DOM
// once its exit has played.
// ---------------------------------------------------------------------------

export type DatePickerPopoverKind = 'trigger' | 'anchor';
export type DatePickerDismissReason = 'outside-press' | 'focus-out' | 'escape-key';

export interface DatePickerPopoverOptions {
  open: Signal<boolean>;
  kind: DatePickerPopoverKind;
  /** The element that moves into the overlay. */
  positioner: () => HTMLElement | undefined;
  /** The element the open/close spring animates. */
  motion: () => HTMLElement | undefined;
  /** The trigger button, or the field to anchor to. */
  anchor: () => HTMLElement | undefined;
  align?: PopupAlign;
  /** A close the popover decided on (outside press, focus out, Escape). */
  dismiss: (reason: DatePickerDismissReason) => void;
  /** True while Escape belongs to the content (a range pick to undo). */
  escapeBlocked?: () => boolean;
}

/** The positioner's classes: above the page, exposing the available height. */
export const datePickerPositionerClass = 'z-50 outline-none [--popup-available-height:var(--available-height)]';
/** The motion wrapper's classes (the React frame's motion.div). */
export const datePickerMotionClass = cn('outline-none', popupMotionClass);
/** The elevated popup's base classes (the React frame's Elevated). */
export const datePickerPopupClass = 'rounded-xl outline-none select-none';

/** Creates the popover controller. Call in an injection context. */
export function createDatePickerPopover(options: DatePickerPopoverOptions) {
  const document = inject(DOCUMENT);
  const overlay = createPopupOverlay({
    positioner: options.positioner,
    motion: options.motion,
    anchor: options.anchor,
    placement: () => ({ side: 'bottom', align: options.align ?? 'start', sideOffset: 6, alignOffset: 0 }),
  });

  const inside = (node: Node | null) => {
    if (!node) return false;
    return !!options.anchor()?.contains(node) || !!options.positioner()?.contains(node);
  };
  const inPopup = (node: Node | null) => !!node && !!options.positioner()?.contains(node);

  // Open and close the overlay; the positioner query can resolve after the
  // first open (a default open), so the effect waits for it. After render:
  // the content mounts in the same pass as `open`, and the overlay picks its
  // side from the popup's measured height, which an unrendered popup lacks.
  afterRenderEffect(() => {
    const open = options.open();
    if (!options.positioner() || !options.anchor()) return;
    untracked(() => (open ? overlay.show() : overlay.hide()));
  });

  // Dismissal while open.
  effect((onCleanup) => {
    if (!options.open()) return;
    const onPointerDown = (e: Event) => {
      if (!inside(e.target as Node | null)) options.dismiss('outside-press');
    };
    const onFocusIn = (e: FocusEvent) => {
      if (!inside(e.target as Node | null)) options.dismiss('focus-out');
    };
    // Bubble phase: content that owns Escape (a range pick, a time field)
    // stops it before it gets here.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (options.escapeBlocked?.()) return;
      options.dismiss('escape-key');
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    if (options.kind === 'trigger') {
      document.addEventListener('focusin', onFocusIn, true);
      document.addEventListener('keydown', onKeyDown);
    }
    onCleanup(() => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('keydown', onKeyDown);
    });
  });

  // Closing hands focus back to the trigger when it was in the popup (or
  // nowhere, as the popup's content goes away).
  if (options.kind === 'trigger') {
    let wasOpen = false;
    effect(() => {
      const open = options.open();
      untracked(() => {
        if (wasOpen && !open) {
          const active = document.activeElement;
          if (!active || active === document.body || inPopup(active)) options.anchor()?.focus();
        }
        wasOpen = open;
      });
    });
  }

  inject(DestroyRef).onDestroy(() => overlay.dispose());

  return {
    /** Whether the popup content is rendered: open, or playing its exit. */
    mounted: computed(() => options.open() || overlay.attached()),
    /** Whether a node is inside the anchor or the popup. */
    contains: inside,
    updatePosition: overlay.updatePosition,
  };
}

export type DatePickerPopover = ReturnType<typeof createDatePickerPopover>;
