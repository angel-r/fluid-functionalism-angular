// The Code tab of every /docs/fluid-hover preview, as Angular (the React page
// in app/docs/fluid-hover/demos.tsx carried JSX strings).

/** Blink or glide: one list, one highlight, real buttons for rows. */
export const fluidHoverCode = `import { Component } from '@angular/core';
import { FluidHover, FluidHoverHighlight, FluidHoverItem } from '@angel-r/fluid-functionalism-angular';

// One list, one highlight. The directive picks the row whose centre is nearest
// the cursor; the highlight springs to that row's rect on spring.fast.
@Component({
  selector: 'app-inbox-list',
  imports: [FluidHover, FluidHoverHighlight, FluidHoverItem],
  template: \`
    <div ffFluidHover class="relative flex flex-col p-2">
      <!-- The highlight reads the list: it sits on the nearest row and fades
           in fresh on every entry instead of sliding over from its last spot. -->
      <ff-fluid-hover-highlight class="rounded-lg" />
      @for (label of rows; track label; let i = $index) {
        <button
          type="button"
          [ffFluidHoverItem]="i"
          (click)="open(label)"
          class="relative z-10 flex h-9 w-full items-center px-3 text-left outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
        >
          {{ label }}
        </button>
      }
    </div>
  \`,
})
export class InboxList {
  readonly rows = ['Inbox', 'Drafts', 'Sent', 'Archive', 'Trash'];

  // Rows are real buttons: focusable, activatable from the keyboard, announced
  // by their label. The directive only lights them; it never moves focus.
  open(label: string) {}
}`;

/** Show the math: the rule, as the loop that runs per move. */
export const mathCode = `// Per mouse move (coalesced to one animation frame), for every row:
const center = rect.top + rect.height / 2;
const distance = Math.abs(cursorY - center);
if (distance < closestDistance) {
  closestDistance = distance;
  nearest = index;
}

// A row the cursor is inside always wins. Otherwise the nearest center does,
// so the cursor in a gap, in the padding, or past the last row still lands.
setActiveIndex(containing ?? nearest);`;

/** 3 axes: the one input that changes the rule. */
export const axesCode = `<!-- "y" (default): lists. Nearest by the vertical centre, top + height / 2. -->
<div ffFluidHover>…</div>

<!-- "x": strips. Nearest by the horizontal centre, left + width / 2. -->
<div ffFluidHover ffFluidHoverAxis="x">…</div>

<!-- "xy": grids. Nearest centre by straight-line distance across rows and columns. -->
<div ffFluidHover ffFluidHoverAxis="xy">…</div>`;

/** What it costs: the pick, timed by the meter with the same inputs. */
export const costCode = `import { pickNearest } from '@angel-r/fluid-functionalism-angular';

// The directive runs pickNearest once per animation frame: one loop over the
// cached row rects, no DOM reads per row. The meter times that same function
// on every move, with the same inputs.
const t0 = performance.now();
pickNearest({
  axis: 'y',
  point: { x: event.clientX, y: event.clientY },
  rects: hover.itemRects(),
  containerRect: container.getBoundingClientRect(),
  scroll: { x: container.scrollLeft, y: container.scrollTop },
  border: { x: container.clientLeft, y: container.clientTop },
  layoutSize: { width: container.offsetWidth, height: container.offsetHeight },
});
const workPerMove = performance.now() - t0;

// The highlight is 1 element that travels on a transform: while it moves,
// its top / left / width / height are never written.`;

/** When to split a list: one menu is one list, a divider starts another. */
export const listsCode = `<ff-sidebar-group>
  <ff-sidebar-group-label>Workspace</ff-sidebar-group-label>
  <ul ffSidebarMenu>                                      <!-- list 1 -->
    <li ffSidebarMenuItem>
      <button ffSidebarMenuButton icon="message-circle" [attr.aria-expanded]="open()" (click)="toggle()">
        Chat
        <span class="ml-auto flex size-6 items-center justify-center">
          <ff-icon name="chevron-right" [size]="16" [strokeWidth]="1.5" />  <!-- turns 90° while open -->
        </span>
      </button>
      <ff-sidebar-menu-sub [open]="open()">               <!-- children stay in list 1 -->
        <li ffSidebarMenuSubItem><a ffSidebarMenuSubButton href="#">Today</a></li>
        <li ffSidebarMenuSubItem><a ffSidebarMenuSubButton href="#">Yesterday</a></li>
      </ff-sidebar-menu-sub>
    </li>
    <li ffSidebarMenuItem><button ffSidebarMenuButton icon="brain">Agents</button></li>
    <li ffSidebarMenuItem>
      <button ffSidebarMenuButton icon="square-library" disabled>Knowledge</button>
    </li>
    <li ffSidebarMenuItem><button ffSidebarMenuButton icon="play">Runs</button></li>
  </ul>
</ff-sidebar-group>

<div ffSidebarSeparator></div>                            <!-- a different kind of thing follows -->

<ff-sidebar-group>
  <ff-sidebar-group-label>Account</ff-sidebar-group-label>
  <ul ffSidebarMenu>                                      <!-- list 2 -->
    <li ffSidebarMenuItem><button ffSidebarMenuButton icon="user">Profile</button></li>
    <li ffSidebarMenuItem><button ffSidebarMenuButton icon="arrow-left">Log out</button></li>
  </ul>
</ff-sidebar-group>`;
