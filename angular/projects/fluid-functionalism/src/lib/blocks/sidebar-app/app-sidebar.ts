import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, model } from '@angular/core';
import { Icon } from '../../core/icon';
import type { IconName } from '../../core/icons';
import { Tooltip } from '../../tooltip';
import { MenuItem } from '../../menu-item';
import { Sidebar, SidebarContent } from '../../sidebar';
import {
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupActions,
  SidebarGroupLabel,
  SidebarHeader,
  injectSidebar,
  type SidebarCollapsible,
  type SidebarSide,
  type SidebarVariant,
} from '../../sidebar-core';
import { SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from '../../sidebar-menu';
import {
  SidebarBlockMenu,
  SidebarSearchField,
  SidebarUserFooter,
  SidebarWorkspaceHeader,
  WorkspaceTile,
} from '../sidebar';

// ---------------------------------------------------------------------------
// A complete app sidebar assembled from the workspace-header, search-field,
// and user-footer blocks: brand row with the peek cross-fade, search on the
// rows' rhythm, collapsible sections with label actions, badge-carrying
// rows, and the identity row anchoring the outer edge. Swap the seed data
// (the `sections` input) and the names below for your own.
// ---------------------------------------------------------------------------

/** One navigation row. `icon` is a slot of the icon map. */
export interface NavItem {
  label: string;
  icon: IconName;
  badge?: string;
}

/** One collapsible group of navigation rows. */
export interface NavSection {
  label: string;
  items: NavItem[];
}

const SHORTCUT_CHIP =
  'ml-auto inline-flex opacity-0 transition-opacity duration-80 group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100';
const SHORTCUT_KBD = 'font-sans text-[length:var(--fs-micro,11px)] leading-[var(--lh-micro,14px)] text-muted-foreground';
const AVATAR =
  'flex size-5 items-center justify-center rounded-full bg-muted-foreground text-[length:var(--fs-micro-compact,10px)] leading-[var(--lh-micro-compact,12px)] text-background';

/**
 * The app sidebar: an inset Sidebar with a workspace switcher, search, a
 * "New" row, the nav sections and the user row. Put it inside a
 * SidebarProvider, before the SidebarInset:
 *
 *   <ff-sidebar-provider peek="hover">
 *     <ff-app-sidebar [sections]="nav" [(active)]="page" />
 *     <main ffSidebarInset>…</main>
 *   </ff-sidebar-provider>
 *
 * The host is `display: contents` and mirrors the rail's `peer` state
 * (`data-state` / `data-variant` / `data-side`), so the inset — its sibling,
 * not the inner Sidebar's — still keys on it.
 */
@Component({
  selector: 'ff-app-sidebar',
  imports: [
    Icon,
    Tooltip,
    MenuItem,
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupActions,
    SidebarGroupAction,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuBadge,
    SidebarWorkspaceHeader,
    WorkspaceTile,
    SidebarBlockMenu,
    SidebarSearchField,
    SidebarUserFooter,
  ],
  host: {
    class: 'peer contents',
    '[attr.data-state]': "static() ? null : (sidebar.open() ? 'expanded' : 'collapsed')",
    '[attr.data-variant]': 'variant()',
    '[attr.data-side]': 'side()',
  },
  template: `
    <ff-sidebar
      [variant]="variant()"
      [side]="side()"
      [collapsible]="collapsible()"
      [bordered]="bordered()"
      [rail]="rail()"
      [railTooltipOpen]="railTooltipOpen()"
      [class]="userClass()"
    >
      <div ffSidebarHeader>
        <ff-sidebar-workspace-header name="Acme Inc" [checkedIndex]="0">
          <span ffWorkspaceTile>A</span>
          <ng-template ffSidebarBlockMenu>
            <ff-menu-item [index]="0" label="Acme Inc" [checked]="true" />
            <ff-menu-item [index]="1" label="Personal" />
            <ff-menu-item [index]="2" icon="plus" label="New workspace" />
          </ng-template>
        </ff-sidebar-workspace-header>
        <!-- Search + action rows are ONE block: the field reads as the list's
             first row, on the menu rows' own tight rhythm. -->
        <div class="flex flex-col">
          <ff-sidebar-search-field />
          <ul ffSidebarMenu>
            <li ffSidebarMenuItem>
              <button ffSidebarMenuButton icon="plus">
                New
                <!-- shortcut chip, revealed on row hover -->
                <span [class]="shortcutChip"><kbd [class]="shortcutKbd">⇧⌘O</kbd></span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <ff-sidebar-content>
        @for (section of sections(); track section.label) {
          <ff-sidebar-group collapsible>
            <ff-sidebar-group-label>{{ section.label }}</ff-sidebar-group-label>
            <div ffSidebarGroupActions>
              <ff-tooltip content="Add item" side="top">
                <button ffSidebarGroupAction aria-label="Add item"><ff-icon name="plus" /></button>
              </ff-tooltip>
            </div>
            <ul ffSidebarMenu>
              @for (item of section.items; track item.label) {
                <li ffSidebarMenuItem>
                  <button ffSidebarMenuButton [icon]="item.icon" [isActive]="item.label === active()" (click)="active.set(item.label)">
                    {{ item.label }}
                  </button>
                  @if (item.badge) {
                    <div ffSidebarMenuBadge>{{ item.badge }}</div>
                  }
                </li>
              }
            </ul>
          </ff-sidebar-group>
        }
      </ff-sidebar-content>

      <div ffSidebarFooter>
        <ff-sidebar-user-footer name="Jane Doe">
          <span [class]="avatar">J</span>
          <ng-template ffSidebarBlockMenu>
            <ff-menu-item [index]="0" icon="user" label="Profile" />
            <ff-menu-item [index]="1" icon="settings" label="Settings" />
            <ff-menu-item [index]="2" icon="arrow-left" label="Log out" />
          </ng-template>
        </ff-sidebar-user-footer>
      </div>
    </ff-sidebar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidebar {
  /** The navigation sections (React: `NAV_SECTIONS` from nav-data.ts). */
  readonly sections = input.required<readonly NavSection[]>();
  /** Label of the current row. Bind with `[(active)]`. */
  readonly active = model('Home');

  // The Sidebar props AppSidebar forwards (React: `Omit<SidebarProps, "children">`).
  readonly variant = input<SidebarVariant>('inset');
  readonly side = input<SidebarSide>('left');
  readonly collapsible = input<SidebarCollapsible>('offcanvas');
  readonly bordered = input(true, { transform: booleanAttribute });
  readonly rail = input(true, { transform: booleanAttribute });
  readonly railTooltipOpen = input<boolean | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  protected readonly sidebar = injectSidebar();
  protected readonly static = computed(() => this.collapsible() === 'none');
  protected readonly shortcutChip = SHORTCUT_CHIP;
  protected readonly shortcutKbd = SHORTCUT_KBD;
  protected readonly avatar = AVATAR;
}
