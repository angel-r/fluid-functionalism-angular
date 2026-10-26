import { ChangeDetectionStrategy, Component, input, linkedSignal } from '@angular/core';
import {
  DropdownContent,
  DropdownMenu,
  DropdownTrigger,
  Icon,
  MenuItem,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupActions,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuActions,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  Tooltip,
  type SidebarPeek,
  type SidebarVariant,
} from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';
import {
  SidebarDemoBranches,
  SidebarDemoFooterUser,
  SidebarDemoHeader,
  SidebarDemoNav,
  SidebarDemoTopbar,
} from './sidebar-demo-parts';
import { AI_THREADS, WIKI_PRIVATE, WIKI_RECENT, WIKI_SHARED } from './sidebar-demo-data';

/** Every preview runs inside a bounded frame: the provider fills it instead
 *  of the viewport, writes no cookie, and stays a rail (`mobileBreakpoint` 0)
 *  because a drawer inside a small frame hides the thing being demonstrated. */
const FRAME = 'relative flex h-[560px] w-full overflow-hidden rounded-lg border border-border bg-background md:h-[640px]';

/** Rail and main together — the three layouts. */
@Component({
  selector: 'app-sidebar-demo-shell',
  imports: [
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarInset,
    SidebarDemoHeader,
    SidebarDemoNav,
    SidebarDemoFooterUser,
    SidebarDemoTopbar,
  ],
  host: { class: 'block w-full' },
  template: `
    <div [class]="frame">
      <ff-sidebar-provider class="h-full min-h-0" [persist]="false" [mobileBreakpoint]="0">
        <ff-sidebar [variant]="variant()" class="h-full">
          <app-sidebar-demo-header />
          <ff-sidebar-content>
            <app-sidebar-demo-nav />
          </ff-sidebar-content>
          <div ffSidebarFooter>
            <app-sidebar-demo-footer-user />
          </div>
        </ff-sidebar>
        <!-- The floating card sits in a p-2 gutter — pad the main region's
             top so its header lines up with the card's. -->
        <main ffSidebarInset [class]="variant() === 'floating' ? 'min-h-0 pt-2' : 'min-h-0'">
          <app-sidebar-demo-topbar [title]="caption()" />
        </main>
      </ff-sidebar-provider>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SidebarDemoShell {
  readonly variant = input<SidebarVariant>('sidebar');
  readonly caption = input('');
  protected readonly frame = FRAME;
}

/** Two levels of nesting: section groups, and parent rows with sub-trees. */
@Component({
  selector: 'app-sidebar-demo-nesting',
  imports: [
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarInset,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarDemoHeader,
    SidebarDemoBranches,
    SidebarDemoTopbar,
  ],
  host: { class: 'block w-full' },
  template: `
    <div [class]="frame">
      <ff-sidebar-provider class="h-full min-h-0" [persist]="false" [mobileBreakpoint]="0">
        <ff-sidebar collapsible="none" class="h-full">
          <app-sidebar-demo-header />
          <ff-sidebar-content>
            <!-- One wiki, three sections, one per state: Private folded to its
                 label, Shared open with its branches closed, Recent fully open
                 down to level 2. -->
            <ff-sidebar-group collapsible [defaultOpen]="false">
              <ff-sidebar-group-label>Private</ff-sidebar-group-label>
              <app-sidebar-demo-branches [branches]="private" />
            </ff-sidebar-group>
            <ff-sidebar-group collapsible>
              <ff-sidebar-group-label>Shared</ff-sidebar-group-label>
              <app-sidebar-demo-branches [branches]="shared" />
            </ff-sidebar-group>
            <ff-sidebar-group collapsible>
              <ff-sidebar-group-label>Recent</ff-sidebar-group-label>
              <app-sidebar-demo-branches [branches]="recent" [initiallyOpen]="['Today', 'Yesterday']" />
            </ff-sidebar-group>
          </ff-sidebar-content>
        </ff-sidebar>
        <main ffSidebarInset class="min-h-0"><app-sidebar-demo-topbar /></main>
      </ff-sidebar-provider>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SidebarDemoNesting {
  protected readonly frame = FRAME;
  protected readonly private = WIKI_PRIVATE;
  protected readonly shared = WIKI_SHARED;
  protected readonly recent = WIKI_RECENT;
}

/** Everything a row and a section label can carry: status dots, counts, and
 *  the hover-revealed action cluster (tooltipped, plus an overflow menu). */
@Component({
  selector: 'app-sidebar-demo-actions',
  imports: [
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarInset,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupAction,
    SidebarGroupActions,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuBadge,
    SidebarMenuActions,
    SidebarMenuAction,
    DropdownMenu,
    DropdownTrigger,
    DropdownContent,
    MenuItem,
    Tooltip,
    Icon,
    SidebarDemoHeader,
    SidebarDemoFooterUser,
    SidebarDemoTopbar,
  ],
  host: { class: 'block w-full' },
  template: `
    <div [class]="frame">
      <ff-sidebar-provider class="h-full min-h-0" [persist]="false" [mobileBreakpoint]="0">
        <ff-sidebar collapsible="none" class="h-full">
          <app-sidebar-demo-header />
          <ff-sidebar-content>
            <!-- A section label that collapses its rows and carries its own actions -->
            <ff-sidebar-group collapsible>
              <ff-sidebar-group-label>Threads</ff-sidebar-group-label>
              <div ffSidebarGroupActions>
                <ff-tooltip content="New thread" side="top">
                  <button ffSidebarGroupAction aria-label="New thread"><ff-icon name="plus" /></button>
                </ff-tooltip>
                <ff-tooltip content="Filter threads" side="top">
                  <button ffSidebarGroupAction aria-label="Filter threads"><ff-icon name="sliders-horizontal" /></button>
                </ff-tooltip>
              </div>
              <ul ffSidebarMenu>
                <!-- Every thread carries the full cluster: branch, share, and
                     the overflow menu — the badge keeps the rightmost slot.
                     "active" maps to "unread" (same filled dot) so no page
                     reads as selected in this example. -->
                @for (thread of threads; track thread.label) {
                  <li ffSidebarMenuItem>
                    <button ffSidebarMenuButton [status]="thread.status === 'active' ? 'unread' : thread.status">
                      {{ thread.label }}
                    </button>
                    <div ffSidebarMenuBadge>{{ thread.badge }}</div>
                    <div ffSidebarMenuActions showOnHover>
                      <ff-tooltip content="Branch thread" side="top">
                        <button ffSidebarMenuAction aria-label="Branch thread"><ff-icon name="corner-down-right" /></button>
                      </ff-tooltip>
                      <ff-tooltip content="Share thread" side="top">
                        <button ffSidebarMenuAction aria-label="Share thread"><ff-icon name="link" /></button>
                      </ff-tooltip>
                      <ff-dropdown-menu>
                        <button ffSidebarMenuAction ffDropdownTrigger aria-label="More options">
                          <ff-icon name="more-vertical" />
                        </button>
                        <ff-dropdown-content class="min-w-[240px] w-[240px]" align="start" [sideOffset]="4">
                          <ff-menu-item [index]="0" icon="pencil" label="Rename" />
                          <ff-menu-item [index]="1" icon="x" label="Delete" />
                        </ff-dropdown-content>
                      </ff-dropdown-menu>
                    </div>
                  </li>
                }
              </ul>
            </ff-sidebar-group>
          </ff-sidebar-content>
          <div ffSidebarFooter>
            <app-sidebar-demo-footer-user />
          </div>
        </ff-sidebar>
        <main ffSidebarInset class="min-h-0"><app-sidebar-demo-topbar /></main>
      </ff-sidebar-provider>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SidebarDemoActions {
  protected readonly frame = FRAME;
  protected readonly threads = AI_THREADS;
}

/** Drag to resize, click the rail to collapse, press "[" — and open the
 *  collapsed sidebar as a peek on hover or click. */
@Component({
  selector: 'app-sidebar-demo-collapse',
  imports: [
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarInset,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuBadge,
    SidebarDemoHeader,
    SidebarDemoTopbar,
  ],
  host: { class: 'block w-full' },
  template: `
    <div class="relative flex aspect-square max-h-[640px] w-full overflow-hidden rounded-lg border border-border bg-background">
      <ff-sidebar-provider
        class="h-full min-h-0"
        [persist]="false"
        [mobileBreakpoint]="0"
        [peek]="peek()"
        [open]="open()"
        (openChange)="open.set($event)"
      >
        <ff-sidebar variant="inset" class="h-full">
          <app-sidebar-demo-header />
          <ff-sidebar-content>
            <ff-sidebar-group>
              <ff-sidebar-group-label>Threads</ff-sidebar-group-label>
              <ul ffSidebarMenu>
                @for (thread of threads; track thread.label) {
                  <li ffSidebarMenuItem>
                    <button ffSidebarMenuButton [status]="thread.status">{{ thread.label }}</button>
                    <div ffSidebarMenuBadge>{{ thread.badge }}</div>
                  </li>
                }
              </ul>
            </ff-sidebar-group>
          </ff-sidebar-content>
        </ff-sidebar>
        <main ffSidebarInset class="min-h-0"><app-sidebar-demo-topbar /></main>
      </ff-sidebar-provider>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SidebarDemoCollapse {
  readonly peek = input<SidebarPeek>('hover');
  readonly defaultOpen = input(true);
  protected readonly open = linkedSignal(() => this.defaultOpen());
  protected readonly threads = AI_THREADS.slice(0, 5);

}

@Component({
  selector: 'app-sidebar-demo',
  imports: [DemoPage, DemoSection, SidebarDemoShell, SidebarDemoNesting, SidebarDemoActions, SidebarDemoCollapse],
  template: `
    <app-demo-page
      title="Sidebar"
      description="A sidebar built from composable parts. Drag its edge to resize, collapse it away, and on mobile it becomes a drawer."
    >
      <p class="text-site-body text-muted-foreground">
        3 layout options: <code>sidebar</code> default, <code>floating</code> to elevate the sidebar in a higher
        surface, <code>inset</code> to make your content stand out.
      </p>
      <app-demo-section title="Layouts — Sidebar">
        <app-sidebar-demo-shell caption="Sidebar" />
      </app-demo-section>
      <app-demo-section title="Layouts — Floating">
        <app-sidebar-demo-shell variant="floating" caption="Floating" />
      </app-demo-section>
      <app-demo-section title="Layouts — Inset">
        <app-sidebar-demo-shell variant="inset" caption="Inset" />
      </app-demo-section>

      <app-demo-section title="Nesting">
        <app-sidebar-demo-nesting />
      </app-demo-section>

      <app-demo-section title="Actions & badges">
        <app-sidebar-demo-actions />
      </app-demo-section>

      <p class="text-site-body text-muted-foreground">
        Drag to resize, click to collapse, or press <code>[</code>. Open the collapsed sidebar on
        <code>hover</code> or <code>click</code>.
      </p>
      <app-demo-section title="Resize, collapse & peek — on hover">
        <app-sidebar-demo-collapse />
      </app-demo-section>
      <app-demo-section title="Resize, collapse & peek — on click">
        <app-sidebar-demo-collapse peek="click" [defaultOpen]="false" />
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SidebarDemo {}
