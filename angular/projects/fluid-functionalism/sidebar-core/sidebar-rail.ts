import {
  ChangeDetectionStrategy,
  Component,
  type Signal,
  computed,
  input,
  signal,
} from '@angular/core';
import { cn, fontWeights } from '../core';
import { Tooltip } from '../tooltip';
import {
  SIDEBAR_COLLAPSE_SLOP,
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_KEYBOARD_SHORTCUT_RIGHT,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  injectSidebar,
} from './sidebar-context';

/** Keystroke chip rendered inside the (inverted) tooltip surface. */
export const SIDEBAR_SHORTCUT_KBD_CLASS =
  '-my-1 flex h-4 min-w-4 items-center justify-center rounded border border-background/30 px-1 font-sans text-[length:var(--fs-micro-compact,10px)] leading-[var(--lh-micro-compact,12px)] text-background';

/** The keystroke the tooltips show: the provider's binding, falling back to
 *  the side's default key even when the binding is disabled. */
export function injectSidebarShortcutKey(): Signal<string> {
  const sidebar = injectSidebar();
  return computed(
    () =>
      sidebar.shortcut() ??
      (sidebar.side() === 'right' ? SIDEBAR_KEYBOARD_SHORTCUT_RIGHT : SIDEBAR_KEYBOARD_SHORTCUT),
  );
}

interface DragState {
  startX: number;
  startWidth: number;
  moved: boolean;
  collapsed: boolean;
}

/**
 * The grab strip on the sidebar's inner edge, rendered by default inside the
 * desktop shell: drag it to resize (clamped), click it to collapse, and its
 * tooltip explains both with the toggle keystroke. Hovering it brightens the
 * edge border. `class` lands on the strip itself.
 */
@Component({
  selector: 'ff-sidebar-rail',
  imports: [Tooltip],
  host: { style: 'display: contents' },
  template: `
    <!-- The flex column escapes the tooltip surface's text-box trim, so BOTH
         lines re-apply it and the gap alone carries the line rhythm. -->
    <ng-template #tip>
      <span class="flex flex-col items-start gap-2">
        <span class="[text-box:trim-both_cap_alphabetic]"
          ><span [style.font-variation-settings]="semibold">Drag</span> to resize</span
        >
        <span class="flex items-center gap-1.5">
          <span class="[text-box:trim-both_cap_alphabetic]"
            ><span [style.font-variation-settings]="semibold">Click</span> to collapse</span
          >
          <kbd [class]="kbdClass">{{ shortcutKey() }}</kbd>
        </span>
      </span>
    </ng-template>
    <ff-tooltip
      [side]="sidebar.side() === 'left' ? 'right' : 'left'"
      [sideOffset]="8"
      followCursor="y"
      [forceOpen]="dragging() ? false : tooltipOpen()"
      [content]="tip"
    >
      <button
        type="button"
        data-sidebar="rail"
        aria-label="Resize or collapse sidebar"
        tabindex="-1"
        [class]="railClass()"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerCancel()"
      ></button>
    </ff-tooltip>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarRail {
  /** Pin the tooltip open/closed; `undefined` leaves it on hover. */
  readonly tooltipOpen = input<boolean | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  protected readonly sidebar = injectSidebar();
  protected readonly shortcutKey = injectSidebarShortcutKey();
  protected readonly kbdClass = SIDEBAR_SHORTCUT_KBD_CLASS;
  protected readonly semibold = fontWeights.semibold;
  protected readonly dragging = signal(false);
  private drag: DragState | null = null;

  protected readonly railClass = computed(() => {
    const left = this.sidebar.side() === 'left';
    return cn(
      // touch-none: without it the browser claims a touch drag for scrolling
      // and pointercancels the resize mid-gesture.
      'absolute inset-y-0 z-20 w-2 cursor-col-resize touch-none outline-none',
      // Positioned from context (not group-data selectors) so variant offsets
      // passed via class can win the merge.
      left ? 'right-0' : 'left-0',
      // Hovering brightens the edge border the shell draws by default; a
      // pinned tooltip brightens it too, so the spotlight reads as the hover
      // it stands in for.
      'after:absolute after:inset-y-0 after:w-px after:bg-transparent hover:after:bg-foreground/25 after:transition-colors after:duration-80',
      this.tooltipOpen() && 'after:bg-foreground/25',
      left ? 'after:right-0' : 'after:left-0',
      this.userClass(),
    );
  });

  protected onPointerDown(event: PointerEvent) {
    const strip = event.currentTarget as HTMLElement;
    const panel = strip.closest<HTMLElement>('[data-slot="sidebar"]');
    if (!panel) return;
    this.drag = { startX: event.clientX, startWidth: panel.offsetWidth, moved: false, collapsed: false };
    strip.setPointerCapture?.(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent) {
    const drag = this.drag;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      this.dragging.set(true);
      this.sidebar.setIsResizing(true);
    }
    const delta = this.sidebar.side() === 'left' ? dx : -dx;
    const raw = drag.startWidth + delta;
    // Dragged well past the minimum, toward the edge: preview the collapse
    // but keep the drag session alive — pulling back past the threshold
    // re-expands, so an overshoot isn't committed until release.
    if (raw < SIDEBAR_MIN_WIDTH - SIDEBAR_COLLAPSE_SLOP) {
      if (!drag.collapsed) {
        drag.collapsed = true;
        this.sidebar.setWidth(`${SIDEBAR_MIN_WIDTH}px`);
        this.sidebar.setOpen(false);
      }
      return;
    }
    if (drag.collapsed) {
      drag.collapsed = false;
      this.sidebar.setOpen(true);
    }
    const next = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, raw));
    this.sidebar.setWidth(`${next}px`);
  }

  protected onPointerUp(event: PointerEvent) {
    const drag = this.drag;
    this.drag = null;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    this.dragging.set(false);
    this.sidebar.setIsResizing(false);
    // A press that never turned into a drag is the collapse click.
    if (drag && !drag.moved) this.sidebar.toggleSidebar();
  }

  // A cancelled pointer (touch interruption, capture loss) ends the drag where
  // it stands — no collapse-click, capture is already released.
  protected onPointerCancel() {
    this.drag = null;
    this.dragging.set(false);
    this.sidebar.setIsResizing(false);
  }
}
