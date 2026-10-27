// ---------------------------------------------------------------------------
// The Code tabs of the Sidebar page, ported from the snippet constants in
// app/docs/sidebar/page.tsx. Same structure, copy and comments; the API is the
// Angular one (attribute directives on the element they sit on, `ff-icon` by
// name, `signal()` for state).
//
// The chevron's 90° turn rides spring.fast in the shipped component; a snippet
// cannot carry a component method, so the template shows the target angle and
// the comment says how the turn is animated.
// ---------------------------------------------------------------------------

export const NESTING_CODE = `const open = signal<string | null>("Agents");

<li ffSidebarMenuItem>
  <!-- Level 1 — the row that owns the sub-tree. group/parent-row scopes the
      chevron reveal to this button (the <li> also wraps the sub-menu, so a
      child's hover must never light the parent's chevron), and the pinned
      gutter keeps the chevron from sliding on hover. -->
  <button
    ffSidebarMenuButton
    icon="brain"
    class="group/parent-row"
    style="--row-gutter: var(--row-gutter-hover)"
    [attr.aria-expanded]="open() === 'Agents'"
    (click)="open.set(open() === 'Agents' ? null : 'Agents')"
  >
    Agents
    <!-- one chevron-right glyph in an action-sized slot, sprung 90° to point
        down while open (animate the span with injectAnimateFluid() and
        spring.fast); at rest an open row hides it — hover/focus reveals -->
    <span class="ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center">
      <span class="inline-flex" [style.rotate]="open() === 'Agents' ? '90deg' : '0deg'">
        <ff-icon
          name="chevron-right"
          [size]="16"
          [strokeWidth]="1.5"
          [class]="open() === 'Agents'
            ? 'text-muted-foreground transition-opacity duration-80 opacity-0 group-hover/parent-row:opacity-100 group-focus-within/parent-row:opacity-100'
            : 'text-muted-foreground transition-opacity duration-80 opacity-100'"
        />
      </span>
    </span>
  </button>

  <!-- Level 2 — collapses on measured height, never an animated "auto" -->
  <ff-sidebar-menu-sub [open]="open() === 'Agents'">
    @for (agent of agents; track agent.label) {
      <li ffSidebarMenuSubItem>
        <a
          ffSidebarMenuSubButton
          href="#"
          [icon]="agent.icon"
          [isActive]="agent.label === current()"
        >
          {{ agent.label }}
        </a>
      </li>
    }
  </ff-sidebar-menu-sub>
</li>`;

export const ACTIONS_CODE = `<!-- The section label carries actions of its own -->
<ff-sidebar-group collapsible>
  <ff-sidebar-group-label>Threads</ff-sidebar-group-label>
  <div ffSidebarGroupActions>
    <button ffSidebarGroupAction aria-label="New thread"><ff-icon name="plus" /></button>
    <button ffSidebarGroupAction aria-label="Filter"><ff-icon name="sliders-horizontal" /></button>
  </div>

  <ul ffSidebarMenu>
    <!-- Status leads instead of an icon: active/unread fill the dot, idle
        rings it, and "unread" is announced to screen readers. The badge
        keeps the rightmost slot; the cluster reveals to its left and owns
        the row's gutter -->
    @for (thread of threads; track thread.label) {
      <li ffSidebarMenuItem>
        <button ffSidebarMenuButton [status]="thread.status">{{ thread.label }}</button>
        <div ffSidebarMenuBadge>{{ thread.badge }}</div>
        <div ffSidebarMenuActions showOnHover>
          <ff-tooltip content="Branch thread" side="top">
            <button ffSidebarMenuAction aria-label="Branch"><ff-icon name="corner-down-right" /></button>
          </ff-tooltip>
          <ff-tooltip content="Share thread" side="top">
            <button ffSidebarMenuAction aria-label="Share"><ff-icon name="link" /></button>
          </ff-tooltip>

          <!-- the overflow action opens a menu — no tooltip, like every other
              dropdown trigger, and 240px wide like the header/footer menus
              so all of the sidebar's popups read as one family -->
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
</ff-sidebar-group>`;

export const NO_ICON_RAIL_CODE = `// ❌ The icon rail. Collapsing to a strip of glyphs keeps the
// sidebar's cost without its value: every destination takes a
// hover, a beat, a tooltip — and section labels have no icon to
// shrink to, so the structure collapses to a divider. The nav
// becomes a quiz — which is why \`collapsible\` here is only
// "offcanvas" | "none".

// ✅ Collapsed means gone. The canvas gets every pixel back, and
// peek="hover" floats the REAL sidebar — labels and all — the
// moment the cursor reaches the collapsed edge or the trigger.
<ff-sidebar-provider peek="hover">
  <ff-sidebar variant="inset">…</ff-sidebar>
  <main ffSidebarInset>
    <ff-sidebar-trigger />
  </main>
</ff-sidebar-provider>`;

export const ALIGNMENT_CODE = `<!-- One rhythm everywhere: 24px icon buttons, gap-1, inside the
    section's p-2 with pr-1.5 — so every trailing icon centre lands
    26px in from the sidebar's inner edge, 28px to the next column.
    Header buttons, row action clusters and footer buttons all share
    the same axes; the guides trace the measured centres. -->

<div ffSidebarHeader>
  <div class="flex items-center gap-1 pr-1.5">
    <!-- -mr-1.5 puts the brand row's own chevron slot on the next 28px column -->
    <div class="min-w-0 flex-1 -mr-1.5"><!-- brand row --></div>
    <div class="flex items-center gap-1">
      <button ffButton variant="ghost" size="icon-compact" class="size-6 shrink-0"></button>
      <button ffButton variant="ghost" size="icon-compact" class="size-6 shrink-0"></button>
      <button ffButton variant="ghost" size="icon-compact" class="size-6 shrink-0"></button>
    </div>
  </div>
</div>

<!-- the label row's own cluster sits on the same trailing columns -->
<ff-sidebar-group collapsible>
  <ff-sidebar-group-label>Threads</ff-sidebar-group-label>
  <div ffSidebarGroupActions><!-- 3 SidebarGroupActions --></div>
</ff-sidebar-group>

<li ffSidebarMenuItem>
  <!-- the badge holds the rightmost slot; the cluster reveals to its left -->
  <button ffSidebarMenuButton [status]="status">{{ label }}</button>
  <div ffSidebarMenuBadge>{{ badge }}</div>
  <div ffSidebarMenuActions showOnHover><!-- 3 actions --></div>
</li>

<div ffSidebarFooter>
  <div class="flex items-center gap-1 pr-1.5">
    <div class="min-w-0 flex-1 -mr-1.5"><!-- user row --></div>
    <div class="flex items-center gap-1">
      <!-- icon buttons, as many as the row holds -->
    </div>
  </div>
</div>

<!-- The workspace and user menus hang off the same axes: the block's popup
    grid sizes the popup to the trigger +10px, shifts it -ml-1 onto the row's
    edge, and grids the items so tiles and labels land on the rows' 16px/32px
    axes. Both shipped blocks take it from SIDEBAR_MENU_POPUP, so a snippet
    never has to restate it. -->
<ff-sidebar-workspace-header name="Acme Inc" [checkedIndex]="0">
  <span ffWorkspaceTile>A</span>
  <ng-template ffSidebarBlockMenu><!-- switcher rows --></ng-template>
</ff-sidebar-workspace-header>`;

export const SETTINGS_DIALOG_CODE = `import { SettingsDialog } from '@angel-r/fluid-functionalism-angular';

const open = signal(false);

<button ffButton variant="secondary" (click)="open.set(true)">Open settings</button>
<ff-settings-dialog [open]="open()" (openChange)="open.set($event)" />

<!-- Inside the block — the same Sidebar, in a bounded frame: -->
<ff-dialog-content size="xl" class="flex h-[min(640px,calc(100dvh-4rem))] overflow-hidden p-0">
  <ff-sidebar-provider [persist]="false" [shortcut]="null" width="13rem" class="h-full min-h-0">
    <ff-sidebar collapsible="none" class="hidden h-full sm:flex bg-[rgb(var(--overlay)/0.03)]">
      <div ffSidebarHeader class="px-4 pt-5 pb-2">
        <h2 ffDialogTitle>Settings</h2>
      </div>
      <ff-sidebar-content>
        <ff-sidebar-group>
          <ff-sidebar-group-label>Workspace</ff-sidebar-group-label>
          <ul ffSidebarMenu [focusRing]="false">
            @for (s of sections; track s.id) {
              <li ffSidebarMenuItem>
                <button
                  ffSidebarMenuButton
                  [icon]="s.icon"
                  [isActive]="s.id === section()"
                  (click)="section.set(s.id)"
                >
                  {{ s.label }}
                </button>
              </li>
            }
          </ul>
        </ff-sidebar-group>
      </ff-sidebar-content>
    </ff-sidebar>
    <div class="flex min-w-0 flex-1 flex-col"><!-- header + ScrollArea panel --></div>
  </ff-sidebar-provider>
</ff-dialog-content>`;
