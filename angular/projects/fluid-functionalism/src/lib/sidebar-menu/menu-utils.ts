import { InjectionToken } from '@angular/core';
import { animate, type AnimationOptions, type DOMKeyframesDefinition } from 'motion';
import { cn } from '../core/utils';
import type { SizeVariant } from '../core/size';
import type { ItemRect } from '../fluid-hover/fluid-hover';

// ─── Motion seam ─────────────────────────────────────────────────────────────

/** The animation driver the menu overlays and the sub-menu collapse use. */
export type SidebarMenuAnimate = (
  element: Element,
  keyframes: DOMKeyframesDefinition,
  options: AnimationOptions,
) => { finished: Promise<unknown>; stop(): void };

/**
 * Drives the menu's active backgrounds, focus ring, and the sub-menu's
 * measured-height collapse. Defaults to `motion`'s `animate`; override it to
 * inspect start / target / transition without running a spring (tests), the
 * way the React suite mocks `motion.div`.
 */
export const SIDEBAR_MENU_ANIMATE = new InjectionToken<SidebarMenuAnimate>('FF_SIDEBAR_MENU_ANIMATE', {
  providedIn: 'root',
  factory: () => (element, keyframes, options) => animate(element, keyframes, options),
});

// ─── Row predicates ──────────────────────────────────────────────────────────

/** True while the element sits inside a collapsed sub-tree — clipped away,
 *  so it must be invisible to hover, highlights, and keyboard order. Rows
 *  stay registered either way: unregistering on every toggle would churn the
 *  fluid hover measurements and blink the overlays. */
export function rowHidden(el: HTMLElement) {
  return el.closest('[data-sidebar="menu-sub"][data-state="closed"]') !== null;
}

/** True for a disabled row: it stays in the list (and in the layout) but is
 *  never lit, never takes a routed click, and is skipped by the keyboard.
 *  The engine registers the row's button (falling back to the row itself), so
 *  check the element first, then a button directly inside it. A sub-row's
 *  anchor carries aria-disabled instead of `disabled`. */
const DISABLED_CONTROL = ':disabled, [aria-disabled="true"]';
export function rowDisabled(el: HTMLElement) {
  return (
    el.matches(DISABLED_CONTROL) ||
    el.querySelector(
      `:scope > [data-sidebar="menu-button"]:is(${DISABLED_CONTROL}), :scope > [data-sidebar="menu-sub-button"]:is(${DISABLED_CONTROL})`,
    ) !== null
  );
}

/** Hidden or disabled: what hover, highlights, and the keyboard skip. */
export function rowSkipped(el: HTMLElement) {
  return rowHidden(el) || rowDisabled(el);
}

// ─── Overlay bookkeeping ─────────────────────────────────────────────────────

/** Stable keys for the per-level active overlays: one id per sub-menu <ul>
 *  (or the menu root), so the active background glides when the active row
 *  moves within its level instead of remounting. The root level is 0 in
 *  every menu (sub-menu ids start at 1). */
export const ROOT_LEVEL_ID = 0;
let overlayGroupSeq = 0;
const overlayGroupIds = new WeakMap<Element, number>();
export function overlayGroupId(el: Element) {
  let id = overlayGroupIds.get(el);
  if (id === undefined) {
    id = ++overlayGroupSeq;
    overlayGroupIds.set(el, id);
  }
  return id;
}

export function byDomOrder(a: HTMLElement, b: HTMLElement) {
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

export function sameElements(a: readonly HTMLElement[], b: readonly HTMLElement[]) {
  return a.length === b.length && a.every((el, i) => el === b[i]);
}

/** What the overlays need to know about a row, read from the DOM when the
 *  row set syncs: its level's overlay id (the root, or the sub-menu it sits
 *  in) and whether it was registered without a button (so the engine
 *  measured its whole <li>). */
export interface RowInfo {
  levelId: number;
  buttonless: boolean;
}

export function sameRowInfo(a: Map<HTMLElement, RowInfo>, b: Map<HTMLElement, RowInfo>) {
  if (a.size !== b.size) return false;
  for (const [row, info] of b) {
    const prev = a.get(row);
    if (!prev || prev.levelId !== info.levelId || prev.buttonless !== info.buttonless) return false;
  }
  return true;
}

export function sameRect(a: ItemRect | null, b: ItemRect | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

/** An overlay's target as of its last change, and whether that change moved
 *  it to a different row (spring) or only moved its row (snap). */
export interface OverlayTarget {
  row: HTMLElement | null;
  rect: ItemRect | null;
  rowChanged: boolean;
}

export const NO_TARGET: OverlayTarget = { row: null, rect: null, rowChanged: false };

export function retarget(prev: OverlayTarget, row: HTMLElement | null, rect: ItemRect | null): OverlayTarget {
  if (prev.row === row && sameRect(prev.rect, rect)) return prev;
  return { row, rect, rowChanged: prev.row !== row };
}

export interface ActiveRect {
  key: string;
  row: HTMLElement;
  rect: ItemRect;
}

/** retarget over the keyed active overlays; the same map when none moved. */
export function retargetAll(prev: Map<string, OverlayTarget>, next: readonly ActiveRect[]) {
  let changed = prev.size !== next.length;
  const out = new Map<string, OverlayTarget>();
  for (const { key, row, rect } of next) {
    const before = prev.get(key);
    const after = retarget(before ?? NO_TARGET, row, rect);
    if (after !== before) changed = true;
    out.set(key, after);
  }
  return changed ? out : prev;
}

// ─── Trailing-gutter math ────────────────────────────────────────────────────
//
// The label reserves exactly the trailing run it has to clear, plus one gap
// — the same rule the section header's label follows, so a row's chevron and
// a section header's chevron each sit one 4px gap from their action run.
// A run is: the badge's 24px slot (rightmost when present), the action
// cluster (24px apiece, 4px between), and a gap where both appear.
const ROW_BASE_PAD = 8;
const ROW_SLOT = 24;
const ROW_GAP = 4;
/** Where the run's rightmost element sits, measured from the row's right
 *  edge: a badge at right-2, an action cluster at right-1.5 (its wider box
 *  puts both on the same centre line). */
const ROW_BADGE_INSET = 8;
const ROW_ACTION_INSET = 6;

export function rowGutter(actionCount: number, hasBadge: boolean) {
  if (!actionCount && !hasBadge) return ROW_BASE_PAD;
  const actionsWidth = actionCount ? actionCount * ROW_SLOT + (actionCount - 1) * ROW_GAP : 0;
  const runWidth = (hasBadge ? ROW_SLOT : 0) + actionsWidth + (hasBadge && actionCount ? ROW_GAP : 0);
  const inset = hasBadge ? ROW_BADGE_INSET : ROW_ACTION_INSET;
  return inset + runWidth + ROW_GAP;
}

// ─── Row height ──────────────────────────────────────────────────────────────

// The row publishes its button's height as --row-h so the absolutely placed
// badge and actions can center on it. Fixed `top-*` offsets drifted 2px on
// every height but the one they were tuned for. Read through `:has()` on the
// button's data-size, so it is right from the server render on, and mirrors
// SidebarMenuButton / SidebarMenuSubButton's height classes.
export function rowHeightClass(isSubRow: boolean, variant: SizeVariant) {
  return isSubRow
    ? cn(
        variant === 'compact' ? '[--row-h:24px]' : '[--row-h:28px]',
        'has-[>[data-size=sm]]:[--row-h:24px]',
      )
    : cn(
        variant === 'compact' ? '[--row-h:28px]' : '[--row-h:32px]',
        'has-[>[data-size=sm]]:[--row-h:28px] has-[>[data-size=lg]]:[--row-h:48px]',
      );
}

// Vertical offsets that center a trailing part on the row: the badge is h-5,
// actions are size-6.
export const BADGE_TOP = 'top-[calc((var(--row-h,32px)_-_20px)/2)]';
export const ACTION_TOP = 'top-[calc((var(--row-h,32px)_-_24px)/2)]';
