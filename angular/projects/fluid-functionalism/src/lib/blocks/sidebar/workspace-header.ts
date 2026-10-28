import { ChangeDetectionStrategy, Component, computed, contentChild, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { cn, Icon, injectShape, injectSize, fontWeights } from '../../core';
import { SidebarTrigger, injectSidebar } from '../../sidebar-core';
import { SIDEBAR_MENU_POPUP, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../sidebar-menu';
import { DropdownContent, DropdownMenu, DropdownTrigger } from '../../dropdown';
import { BlockMenuOutlet, SidebarBlockMenu } from './block-menu';

// ---------------------------------------------------------------------------
// Workspace brand row for a sidebar header.
//
// While the sidebar is only PEEKING (a collapsed rail floated out by
// `peek="hover"` / `peek="click"`), the overlay itself covers the pointer's
// one way to pin the sidebar open — so a SidebarTrigger takes the tile's
// slot: a sibling positioned over the row (the menu-action pattern), never a
// button nested inside the row button. The trigger and the tile CROSS-FADE in
// place — neither element ever moves, only opacity — and the row's constant
// pl-8 keeps the name pinned on the rows' 32px text axis while they swap.
// Without peek enabled the trigger simply never shows.
// ---------------------------------------------------------------------------

const NAME_CLASS =
  'min-w-0 truncate text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)] text-foreground';

/**
 * The workspace row of a sidebar header: a workspace switcher, or — without
 * a menu — a non-interactive logo lockup. Projected content is the 20px mark
 * for the leading slot (a `span[ffWorkspaceTile]`, a logo, an avatar); the
 * header positions and cross-fades it, the mark owns its colors and rounding.
 *
 *   <ff-sidebar-workspace-header name="Acme Inc" [checkedIndex]="0">
 *     <span ffWorkspaceTile>A</span>
 *     <ng-template ffSidebarBlockMenu>
 *       <ff-menu-item [index]="0" label="Acme Inc" [checked]="true" />
 *       <ff-menu-item [index]="1" label="Personal" />
 *     </ng-template>
 *   </ff-sidebar-workspace-header>
 */
@Component({
  selector: 'ff-sidebar-workspace-header',
  imports: [
    NgTemplateOutlet,
    Icon,
    SidebarTrigger,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    DropdownMenu,
    DropdownTrigger,
    DropdownContent,
    BlockMenuOutlet,
  ],
  host: { style: 'display: contents' },
  template: `
    <!-- The tile sits absolutely in the row's leading slot — 20px at left-1.5
         centres it on the rows' 16px leading icon axis. -->
    <ng-template #tileSlot>
      <span aria-hidden="true" [class]="tileSlotClass()"><ng-content /></span>
    </ng-template>
    <ng-template #nameSpan>
      <span [class]="nameClass" [style.font-variation-settings]="semibold">{{ name() }}</span>
    </ng-template>

    @if (menu(); as m) {
      <!-- @container: the row hides its dropdown chevron once it gets too
           narrow to show a useful slice of the name (squeezed by trailing
           header actions or a mid-drag width). -->
      <ul ffSidebarMenu aria-label="Workspace" class="@container">
        <li ffSidebarMenuItem>
          <ff-sidebar-trigger
            size="icon-compact"
            [attr.aria-hidden]="peeking() ? null : 'true'"
            [attr.inert]="peeking() ? null : ''"
            [class]="'absolute left-1 top-1/2 z-20 -translate-y-1/2 ' + triggerFade()"
          />
          <ff-dropdown-menu>
            <button ffSidebarMenuButton ffDropdownTrigger aria-label="Switch workspace" class="pl-8">
              <ng-container [ngTemplateOutlet]="tileSlot" />
              <ng-container [ngTemplateOutlet]="nameSpan" />
              <span class="ml-auto inline-flex @max-[7rem]:hidden">
                <ff-icon name="chevron-down" [size]="size().icon" [strokeWidth]="1.5" class="text-muted-foreground" />
              </span>
            </button>
            <!-- Trigger-width popup on the shared sidebar menu grid: items
                 start at the row's edge, icon slots land on the leading axis,
                 and the check sits on the chevron's vertical axis. -->
            <ff-dropdown-content [class]="popupClass" align="start" [sideOffset]="4" [checkedIndex]="checkedIndex()">
              <ng-container [ffBlockMenuOutlet]="m.template" />
            </ff-dropdown-content>
          </ff-dropdown-menu>
        </li>
      </ul>
    } @else {
      <!-- Not interactive, so it renders outside a SidebarMenu — a menu row
           would track the traveling hover background. -->
      <div class="relative flex h-8 items-center pl-8 pr-2">
        <ff-sidebar-trigger
          size="icon-compact"
          [attr.aria-hidden]="peeking() ? null : 'true'"
          [attr.inert]="peeking() ? null : ''"
          [class]="'absolute left-1 top-1/2 -translate-y-1/2 ' + triggerFade()"
        />
        <ng-container [ngTemplateOutlet]="tileSlot" />
        <ng-container [ngTemplateOutlet]="nameSpan" />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarWorkspaceHeader {
  /** Workspace or product name shown in the row. */
  readonly name = input.required<string>();
  /** Index of the checked menu row, forwarded to the DropdownContent. */
  readonly checkedIndex = input<number | undefined>(undefined);

  /** The `<ng-template ffSidebarBlockMenu>` rows. Omitted, the row is a
   *  non-interactive logo lockup instead of a workspace switcher. */
  protected readonly menu = contentChild(SidebarBlockMenu);
  protected readonly size = injectSize();
  private readonly sidebar = injectSidebar();
  protected readonly peeking = this.sidebar.isPeeking;
  protected readonly semibold = fontWeights.semibold;
  protected readonly nameClass = NAME_CLASS;
  protected readonly popupClass = SIDEBAR_MENU_POPUP;

  protected readonly tileSlotClass = computed(
    () =>
      `pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 transition-opacity duration-80 ${
        this.peeking() ? 'opacity-0' : 'opacity-100'
      }`,
  );
  // No hover/press fill on this trigger (the Button's first child is its bg
  // layer): its box is off-axis from the tile slot it overlays, so a
  // background reads as a second, non-concentric rectangle behind the glyph.
  // [&_svg]:size-4 matches the topbar trigger's 16px glyph — icon-compact
  // would otherwise draw this one at 14px.
  protected readonly triggerFade = computed(
    () =>
      `[&>span:first-child]:hidden [&_svg]:size-4 transition-opacity duration-80 ${
        this.peeking() ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`,
  );
}

/**
 * The 20px letter-tile treatment the switcher's trigger and its menu rows
 * share — squared to the shape system, semibold 10px glyph.
 *
 *   <span ffWorkspaceTile>A</span>
 */
@Component({
  selector: '[ffWorkspaceTile]',
  host: { '[class]': 'hostClass()', '[style.font-variation-settings]': 'semibold' },
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceTile {
  readonly userClass = input('', { alias: 'class' });

  private readonly shape = injectShape();
  protected readonly semibold = fontWeights.semibold;
  protected readonly hostClass = computed(() =>
    cn(
      'flex size-5 shrink-0 items-center justify-center bg-foreground text-[length:var(--fs-micro-compact,10px)] leading-[var(--lh-micro-compact,12px)] text-background',
      this.shape().bgRadius >= 20 ? 'rounded-full' : 'rounded-md',
      this.userClass(),
    ),
  );
}
