import { ChangeDetectionStrategy, Component, computed, contentChild, input } from '@angular/core';
import { cn, Icon, injectSize } from '@angel-r/fluid-functionalism-angular/core';
import { SIDEBAR_MENU_POPUP, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@angel-r/fluid-functionalism-angular/sidebar-menu';
import { DropdownContent, DropdownMenu, DropdownTrigger } from '@angel-r/fluid-functionalism-angular/dropdown';
import { BlockMenuOutlet, SidebarBlockMenu } from './block-menu';

// ---------------------------------------------------------------------------
// Footer user row: identity anchors the sidebar's outer edge. The 20px
// avatar pulls -ml-0.5 to centre on the rows' leading icon axis; the
// chevron rides a 24px slot pulled -mr-0.5 onto the trailing action axis —
// the same axes every other sidebar row uses. Its menu opens upward on the
// shared sidebar menu grid, so labels and trailing glyphs line up with the
// trigger row exactly.
// ---------------------------------------------------------------------------

/**
 * The footer's user row, opening the user menu. Projected content is the
 * 20px avatar (e.g. `<img class="size-5 rounded-full outline-1
 * -outline-offset-1 outline-black/10 dark:outline-white/10" …>`); the row
 * positions it on the leading icon axis, the element owns its look. `class`
 * lands on the wrapping SidebarMenu — pass "min-w-0 flex-1" when the row
 * shares a horizontal footer line with icon buttons.
 *
 *   <ff-sidebar-user-footer name="Jane Doe">
 *     <img src="/jane.png" alt="" class="size-5 rounded-full" />
 *     <ng-template ffSidebarBlockMenu>
 *       <ff-menu-item [index]="0" icon="user" label="Profile" />
 *       <ff-menu-item [index]="1" icon="arrow-left" label="Log out" />
 *     </ng-template>
 *   </ff-sidebar-user-footer>
 */
@Component({
  selector: 'ff-sidebar-user-footer',
  imports: [Icon, SidebarMenu, SidebarMenuItem, SidebarMenuButton, DropdownMenu, DropdownTrigger, DropdownContent, BlockMenuOutlet],
  host: { style: 'display: contents' },
  template: `
    <ul ffSidebarMenu aria-label="User" [class]="menuClass()">
      <li ffSidebarMenuItem>
        <ff-dropdown-menu>
          <button ffSidebarMenuButton ffDropdownTrigger aria-label="Open user menu">
            <span class="-ml-0.5 -mr-0.5 flex size-5 shrink-0 items-center justify-center"><ng-content /></span>
            <span class="min-w-0 truncate text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)] text-foreground">{{ name() }}</span>
            <span class="ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center">
              <ff-icon name="chevrons-up-down" [size]="size().icon" [strokeWidth]="1.5" class="text-muted-foreground" />
            </span>
          </button>
          <ff-dropdown-content [class]="popupClass" side="top" align="start" [sideOffset]="6">
            <ng-container [ffBlockMenuOutlet]="menu().template" />
          </ff-dropdown-content>
        </ff-dropdown-menu>
      </li>
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarUserFooter {
  /** Display name shown in the row. */
  readonly name = input.required<string>();
  readonly userClass = input('', { alias: 'class' });

  /** The `<ng-template ffSidebarBlockMenu>` rows of the user menu. */
  protected readonly menu = contentChild.required(SidebarBlockMenu);
  protected readonly size = injectSize();
  protected readonly popupClass = SIDEBAR_MENU_POPUP;
  protected readonly menuClass = computed(() => cn(this.userClass()));
}
