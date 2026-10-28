import { DestroyRef, type Signal, inject, untracked } from '@angular/core';
import type { FluidHoverController } from '../fluid-hover';

// ---------------------------------------------------------------------------
// Submenus inside a dropdown popup: the primitive-free half.
//
// The menu primitive owns opening and closing a submenu (hover, → / ←,
// Escape). The fluid hover would still follow the pointer across the parent's
// other rows on its way to the open submenu, so the highlight would point at
// "Share" while the "Move to" submenu stays open. createSubmenuHost stops
// that: while a submenu is open, the parent's highlight stays on its trigger
// and only moves when focus does.
// ---------------------------------------------------------------------------

/** Distance from the trigger row to its submenu, in px. Measured from the
 *  row, which sits inside the popup's 4px padding, so this leaves a 2px gap
 *  between the two surfaces. */
export const SUBMENU_SIDE_OFFSET = 6;
/** Pulls the submenu up by the popup's padding (p-1), so its first row
 *  lines up with the trigger row. */
export const SUBMENU_ALIGN_OFFSET = -4;

const ROW_SELECTOR = '[data-fluid-hover-index]';

/**
 * The parent popup's side of its submenus. Use `onMouseEnter`, `onMouseMove`
 * and `onMouseLeave` in place of the hover controller's own, skip clearing on
 * blur while `holding()`, and hand `onSubmenuOpenChange` to the rows through
 * the dropdown context. `open` is the parent popup's own state. Call in an
 * injection context.
 */
export function createSubmenuHost(
  container: () => HTMLElement | null | undefined,
  hover: Pick<FluidHoverController, 'setActiveIndex' | 'onMouseEnter' | 'onMouseMove' | 'onMouseLeave'>,
  open: Signal<boolean>,
) {
  let openIndex: number | null = null;
  // The pointer's last position. While a submenu is open it is read from the
  // document: the pointer is over the submenu then, so the parent hears no
  // moves.
  let pointer: { x: number; y: number } | null = null;
  let stopListening: (() => void) | null = null;

  const listen = () => {
    if (stopListening) return;
    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener('pointermove', onMove, { capture: true, passive: true });
    stopListening = () => {
      document.removeEventListener('pointermove', onMove, { capture: true });
      stopListening = null;
    };
  };

  inject(DestroyRef).onDestroy(() => stopListening?.());

  const onSubmenuOpenChange = (index: number, isOpen: boolean) => {
    if (isOpen) {
      openIndex = index;
      hover.setActiveIndex(index);
      listen();
      return;
    }
    if (openIndex !== index) return;
    openIndex = null;
    stopListening?.();
    // The whole menu is closing (a pick, Escape, a press outside): leave its
    // last highlight to fade out with it.
    if (!untracked(open)) return;
    // Hand the highlight back: to the focused row (the row the primitive
    // moved to, or the trigger after ←), else to the row under the pointer,
    // else to nothing.
    const root = container();
    if (!root) return;
    const focused = (document.activeElement as HTMLElement | null)?.closest?.(ROW_SELECTOR);
    if (focused && root.contains(focused)) {
      hover.setActiveIndex(Number(focused.getAttribute('data-fluid-hover-index')));
      return;
    }
    const p = pointer;
    const r = root.getBoundingClientRect();
    if (p && p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom) {
      hover.onMouseMove(new MouseEvent('mousemove', { clientX: p.x, clientY: p.y }));
    } else {
      hover.setActiveIndex(null);
    }
  };

  /** Whether a submenu opened from these rows is open. */
  const holding = () => openIndex !== null;

  // Entering the popup starts a fresh hover session, which re-keys the
  // highlight to fade in from the checked row. A held highlight stays put.
  const onMouseEnter = () => {
    if (openIndex !== null) return;
    hover.onMouseEnter();
  };

  const onMouseMove = (e: MouseEvent) => {
    pointer = { x: e.clientX, y: e.clientY };
    // The trigger stays lit while its submenu is open, whatever row the
    // pointer crosses: focus moves the highlight instead.
    if (openIndex !== null) return;
    hover.onMouseMove(e);
  };

  const onMouseLeave = () => {
    if (openIndex !== null) return;
    hover.onMouseLeave();
  };

  return { onSubmenuOpenChange, holding, onMouseEnter, onMouseMove, onMouseLeave };
}

export type SubmenuHost = ReturnType<typeof createSubmenuHost>;
