import { ChangeDetectionStrategy, Component, booleanAttribute, input, signal } from '@angular/core';
import {
  DropdownContent,
  DropdownMenu,
  DropdownTrigger,
  Icon,
  MenuItem,
  SIDEBAR_MENU_POPUP,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from 'fluid-functionalism';
import { AI_NAV, AI_WORKSPACE, type WikiBranch } from './sidebar-demo-data';

/** The header every example shares: a workspace row and a search field.
 *  (The sidebar-workspace-header and sidebar-search-field blocks land in a
 *  later tier; these are their plain-part equivalents.) */
@Component({
  selector: 'app-sidebar-demo-header',
  imports: [SidebarHeader, SidebarInput, SidebarMenu, SidebarMenuItem, SidebarMenuButton, Icon],
  host: { class: 'contents' },
  template: `
    <div ffSidebarHeader>
      <ul ffSidebarMenu aria-label="Workspace">
        <li ffSidebarMenuItem>
          <button ffSidebarMenuButton aria-label="Switch workspace">
            <span class="-mx-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-foreground text-[11px] font-semibold text-background">A</span>
            <span class="min-w-0 truncate text-[13px] text-foreground">{{ workspace }}</span>
            <span class="ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center">
              <ff-icon name="chevrons-up-down" [size]="16" [strokeWidth]="1.5" class="text-muted-foreground" />
            </span>
          </button>
        </li>
      </ul>
      <input ffSidebarInput placeholder="Search" aria-label="Search" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoHeader {
  protected readonly workspace = AI_WORKSPACE;
}

/** The footer's user row, opening a dropdown on the sidebar menu grid. */
@Component({
  selector: 'app-sidebar-demo-footer-user',
  imports: [SidebarMenu, SidebarMenuItem, SidebarMenuButton, DropdownMenu, DropdownTrigger, DropdownContent, MenuItem, Icon],
  host: { class: 'contents' },
  template: `
    <ul ffSidebarMenu aria-label="User">
      <li ffSidebarMenuItem>
        <ff-dropdown-menu>
          <button ffSidebarMenuButton ffDropdownTrigger aria-label="Open user menu">
            <span class="-ml-0.5 -mr-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">MT</span>
            <span class="min-w-0 truncate text-[13px] text-foreground">Micka Touillaud</span>
            <span class="ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center">
              <ff-icon name="chevrons-up-down" [size]="16" [strokeWidth]="1.5" class="text-muted-foreground" />
            </span>
          </button>
          <ff-dropdown-content [class]="popupClass" side="top" align="start" [sideOffset]="6">
            <ff-menu-item [index]="0" icon="user" label="Profile" />
            <ff-menu-item [index]="1" icon="settings" label="Settings" />
            <ff-menu-item [index]="2" icon="arrow-left" label="Log out" />
          </ff-dropdown-content>
        </ff-dropdown-menu>
      </li>
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoFooterUser {
  protected readonly popupClass = SIDEBAR_MENU_POPUP;
}

/** The product's top-level nav under a collapsible section label. Flat in
 *  the layout examples (they are about the shell); `nested` keeps the tree. */
@Component({
  selector: 'app-sidebar-demo-nav',
  imports: [
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuBadge,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    Icon,
  ],
  host: { class: 'contents' },
  template: `
    <ff-sidebar-group collapsible>
      <ff-sidebar-group-label>Workspace</ff-sidebar-group-label>
      <ul ffSidebarMenu>
        @for (item of nav; track item.label) {
          <li ffSidebarMenuItem>
            @if (!nested()) {
              <button ffSidebarMenuButton [icon]="item.icon" [isActive]="item.label === current()" (click)="current.set(item.label)">
                {{ item.label }}
              </button>
            } @else {
              <!-- Parents only expand/collapse — the current-page highlight
                   lives on the selected child alone. -->
              <button
                ffSidebarMenuButton
                class="group/parent-row"
                style="--row-gutter: var(--row-gutter-hover)"
                [icon]="item.icon"
                [attr.aria-expanded]="!!open()[item.label]"
                (click)="toggle(item.label)"
              >
                {{ item.label }}
                <span class="ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center">
                  <span class="inline-flex transition-transform duration-80" [class.rotate-90]="!!open()[item.label]">
                    <ff-icon
                      name="chevron-right"
                      [size]="16"
                      [strokeWidth]="1.5"
                      [class]="chevronClass(!!open()[item.label])"
                    />
                  </span>
                </span>
              </button>
              <ff-sidebar-menu-sub [open]="!!open()[item.label]">
                @for (child of item.children; track child.label) {
                  <li ffSidebarMenuSubItem>
                    <a ffSidebarMenuSubButton href="#" [isActive]="child.label === current()" (click)="$event.preventDefault(); current.set(child.label)">
                      {{ child.label }}
                    </a>
                    @if (child.badge) {
                      <div ffSidebarMenuBadge>{{ child.badge }}</div>
                    }
                  </li>
                }
              </ff-sidebar-menu-sub>
            }
          </li>
        }
      </ul>
    </ff-sidebar-group>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoNav {
  readonly nested = input(false, { transform: booleanAttribute });
  protected readonly nav = AI_NAV;
  protected readonly open = signal<Record<string, boolean>>({ Chat: true });
  protected readonly current = signal(AI_NAV[0].label);

  protected toggle(label: string) {
    this.open.update((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  protected chevronClass(isOpen: boolean) {
    return `text-muted-foreground transition-opacity duration-80 ${
      isOpen ? 'opacity-0 group-hover/parent-row:opacity-100 group-focus-within/parent-row:opacity-100' : 'opacity-100'
    }`;
  }
}

/** One wiki section's branches: parent rows that fold their children. */
@Component({
  selector: 'app-sidebar-demo-branches',
  imports: [SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, Icon],
  host: { class: 'contents' },
  template: `
    <ul ffSidebarMenu>
      @for (branch of branches(); track branch.label) {
        <li ffSidebarMenuItem>
          <button
            ffSidebarMenuButton
            class="group/parent-row"
            style="--row-gutter: var(--row-gutter-hover)"
            [icon]="branch.icon"
            [attr.aria-expanded]="isOpen(branch.label)"
            (click)="toggle(branch.label)"
          >
            {{ branch.label }}
            <span class="ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center">
              <span class="inline-flex transition-transform duration-80" [class.rotate-90]="isOpen(branch.label)">
                <ff-icon
                  name="chevron-right"
                  [size]="16"
                  [strokeWidth]="1.5"
                  [class]="
                    'text-muted-foreground transition-opacity duration-80 ' +
                    (isOpen(branch.label)
                      ? 'opacity-0 group-hover/parent-row:opacity-100 group-focus-within/parent-row:opacity-100'
                      : 'opacity-100')
                  "
                />
              </span>
            </span>
          </button>
          <ff-sidebar-menu-sub [open]="isOpen(branch.label)">
            @for (child of branch.children; track child.label) {
              <li ffSidebarMenuSubItem>
                <a
                  ffSidebarMenuSubButton
                  href="#"
                  [icon]="child.icon"
                  [isActive]="child.label === current()"
                  (click)="$event.preventDefault(); current.set(child.label)"
                >
                  {{ child.label }}
                </a>
              </li>
            }
          </ff-sidebar-menu-sub>
        </li>
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoBranches {
  readonly branches = input.required<readonly WikiBranch[]>();
  /** Labels that start open. */
  readonly initiallyOpen = input<readonly string[]>([]);
  private readonly openState = signal<Record<string, boolean> | null>(null);
  protected readonly current = signal('');

  protected isOpen(label: string) {
    const state = this.openState();
    return state ? !!state[label] : this.initiallyOpen().includes(label);
  }

  protected toggle(label: string) {
    const base = this.openState() ?? Object.fromEntries(this.initiallyOpen().map((l) => [l, true]));
    this.openState.set({ ...base, [label]: !base[label] });
  }
}

/** The main region's bare topbar: the trigger and an optional caption. */
@Component({
  selector: 'app-sidebar-demo-topbar',
  imports: [SidebarTrigger],
  host: { class: 'contents' },
  template: `
    <header class="flex h-12 shrink-0 items-center gap-2 px-3">
      <ff-sidebar-trigger />
      <span class="text-[13px] text-muted-foreground">{{ title() }}</span>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoTopbar {
  readonly title = input('');
}
