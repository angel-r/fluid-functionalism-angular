import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { injectSizeVariant } from '../core/size';
import { Icon } from '../core/icon';
import { Button, type ButtonSize, type ButtonVariant } from '../button';
import { Tooltip } from '../tooltip';
import { injectSidebar } from './sidebar-context';
import { SIDEBAR_SHORTCUT_KBD_CLASS, injectSidebarShortcutKey } from './sidebar-rail';

/**
 * Ghost icon button calling `toggleSidebar()`. The icon mirrors the sidebar's
 * side, and its tooltip names the action with the toggle keystroke. Projected
 * content replaces the icon; `class` lands on the button.
 *
 *   <ff-sidebar-trigger />
 */
@Component({
  selector: 'ff-sidebar-trigger',
  imports: [Button, Icon, Tooltip],
  host: { style: 'display: contents' },
  template: `
    <!-- A flex row escapes the surface's text-box trim, so the label
         re-applies it — otherwise the shortcut row would sit taller than a
         tooltip without a chip. -->
    <ng-template #tip>
      <span class="flex items-center gap-1.5">
        <span class="[text-box:trim-both_cap_alphabetic]">{{ collapsed() ? 'Expand sidebar' : 'Collapse sidebar' }}</span>
        <kbd [class]="kbdClass">{{ shortcutKey() }}</kbd>
      </span>
    </ng-template>
    <ff-tooltip side="bottom" [content]="tip">
      <button
        ffButton
        [variant]="variant()"
        [size]="size() ?? iconSize()"
        [class]="userClass()"
        data-sidebar="trigger"
        aria-label="Toggle Sidebar"
        (click)="sidebar.toggleSidebar()"
        (pointerenter)="onPointerEnter($event)"
        (pointerleave)="onPointerLeave()"
      >
        <ng-content><ff-icon [name]="sidebar.side() === 'right' ? 'panel-right' : 'panel-left'" /></ng-content>
      </button>
    </ff-tooltip>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarTrigger {
  /** Omitted, the icon size follows the surrounding SizeProvider. */
  readonly size = input<ButtonSize | undefined>(undefined);
  readonly variant = input<ButtonVariant>('ghost');
  readonly userClass = input('', { alias: 'class' });

  protected readonly sidebar = injectSidebar();
  protected readonly shortcutKey = injectSidebarShortcutKey();
  protected readonly kbdClass = SIDEBAR_SHORTCUT_KBD_CLASS;
  private readonly sizeVariant = injectSizeVariant();
  protected readonly iconSize = computed<ButtonSize>(() => (this.sizeVariant() === 'compact' ? 'icon-compact' : 'icon'));
  protected readonly collapsed = computed(() =>
    this.sidebar.isMobile() ? !this.sidebar.openMobile() : !this.sidebar.open(),
  );
  // With hover-peek enabled, the COLLAPSED trigger is a peek affordance too:
  // resting on it floats the rail out exactly like the edge strip — same
  // shared intent timer, so moving from the trigger into the peeked card (or
  // back) cancels the pending dismissal.
  private readonly hoverPeek = computed(
    () => this.sidebar.peek() === 'hover' && !this.sidebar.isMobile() && !this.sidebar.open(),
  );

  protected onPointerEnter(event: PointerEvent) {
    if (!this.hoverPeek() || event.pointerType !== 'mouse') return;
    if (this.sidebar.isPeeking()) this.sidebar.cancelPeekTimer();
    else this.sidebar.schedulePeek();
  }

  // While PEEKED the shell's geometric watcher owns dismissal — a leave fired
  // here can be the peek card sliding over a stationary cursor. This leave
  // only retires a pending intent timer.
  protected onPointerLeave() {
    if (this.hoverPeek() && !this.sidebar.isPeeking()) this.sidebar.cancelPeekTimer();
  }
}
