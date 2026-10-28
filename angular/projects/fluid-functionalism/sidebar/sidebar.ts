import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { cn, SURFACE_LEVEL } from '../core';
import { ScrollArea } from '../scroll-area';
import {
  injectSidebar,
  type SidebarCollapsible,
  type SidebarSide,
  type SidebarVariant,
  SidebarShell,
  injectSidebarContentLevel,
} from '../sidebar-core';
import { SidebarSheet, sheetLevel } from './sidebar-sheet';

const pageLevel = signal(1).asReadonly();

// ─── Sidebar ─────────────────────────────────────────────────────────────────

/**
 * The sidebar column. Offcanvas (the default) renders the desktop rail —
 * resize/collapse handle, collapsed peek — and, below the provider's mobile
 * breakpoint, a modal drawer; `collapsible="none"` renders a static,
 * always-open column.
 *
 *   <ff-sidebar-provider>
 *     <ff-sidebar variant="inset">
 *       <div ffSidebarHeader>…</div>
 *       <ff-sidebar-content>…</ff-sidebar-content>
 *       <div ffSidebarFooter>…</div>
 *     </ff-sidebar>
 *     <main ffSidebarInset>…</main>
 *   </ff-sidebar-provider>
 *
 * The host carries the `peer` class and the rail's `data-state` /
 * `data-variant` / `data-side`, so a later sibling `[ffSidebarInset]` keys on
 * them; in offcanvas mode it is `display: contents` around the rail.
 */
@Component({
  selector: 'ff-sidebar',
  imports: [NgTemplateOutlet, SidebarShell, SidebarSheet],
  // Projected content sits on `contentLevel`; the shell and the sheet in this
  // component's own view paint themselves relative to the page underneath, so
  // they get the substrate (React reads `useSurface()` above the provider).
  providers: [{ provide: SURFACE_LEVEL, useFactory: () => inject(Sidebar).contentLevel }],
  viewProviders: [{ provide: SURFACE_LEVEL, useFactory: () => inject(Sidebar).substrate }],
  host: {
    '[attr.data-slot]': "static() ? 'sidebar' : null",
    '[attr.data-state]': "static() ? null : (sidebar.open() ? 'expanded' : 'collapsed')",
    '[attr.data-collapsible]': "static() ? null : (sidebar.open() ? '' : 'offcanvas')",
    '[attr.data-variant]': 'variant()',
    '[attr.data-side]': 'side()',
    '[class]': 'hostClass()',
    '[style.width]': 'static() ? sidebar.width() : null',
  },
  template: `
    <ng-template #content><ng-content /></ng-template>
    @if (static()) {
      <div data-sidebar="sidebar" [class]="columnClass()">
        <ng-container [ngTemplateOutlet]="content" />
      </div>
    } @else {
      <!-- The sheet comes first: below the breakpoint it owns the content,
           so it must release it before the rail takes it back. -->
      @if (sidebar.isMobile()) {
        <ff-sidebar-sheet [side]="side()" [open]="sidebar.openMobile()" [content]="content" (close)="sidebar.setOpenMobile(false)" />
      }
      <!-- The desktop rail stays MOUNTED across the drawer breakpoint — its
           breakpoint classes fade it out instead of this component
           unmounting it, which would snap the rail away. -->
      <ff-sidebar-shell
        [side]="side()"
        [variant]="variant()"
        [bordered]="bordered()"
        [rail]="rail()"
        [railTooltipOpen]="railTooltipOpen()"
        [class]="userClass()"
      >
        @if (!sidebar.isMobile()) {
          <ng-container [ngTemplateOutlet]="content" />
        }
      </ff-sidebar-shell>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  /** Which edge the rail lives on. The provider mirrors it into the default
   *  shortcut ("[" left, "]" right), the trigger icon and the rail handle. */
  readonly side = input<SidebarSide>('left');
  /** Transparent rail, elevated floating card, or the inset pairing where
   *  SidebarInset becomes the card. */
  readonly variant = input<SidebarVariant>('sidebar');
  /** `"icon"` collapse is intentionally not supported — offcanvas or none. */
  readonly collapsible = input<SidebarCollapsible>('offcanvas');
  /** The `sidebar` variant's inner-edge border. */
  readonly bordered = input(true, { transform: booleanAttribute });
  /** Render the built-in resize/collapse rail. */
  readonly rail = input(true, { transform: booleanAttribute });
  /** Pin the rail's tooltip open (`true`) or closed (`false`); `undefined`
   *  leaves it on hover. Dragging always hides it. */
  readonly railTooltipOpen = input<boolean | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  protected readonly sidebar = injectSidebar();
  protected readonly static = computed(() => this.collapsible() === 'none');

  /** The surface under the sidebar (provided to this component's own view). */
  readonly substrate = inject(SURFACE_LEVEL, { optional: true, skipSelf: true }) ?? pageLevel;
  private readonly railLevel = injectSidebarContentLevel(this.variant);
  /** What the projected content sits on (provided as SURFACE_LEVEL): the
   *  page in a static column, two steps up in the mobile sheet, else the
   *  rail's level (one step up in a floating card or the peek card). */
  readonly contentLevel = computed(() => {
    if (this.static()) return this.substrate();
    if (this.sidebar.isMobile()) return sheetLevel(this.substrate());
    return this.railLevel();
  });

  protected readonly hostClass = computed(() =>
    this.static()
      ? cn('peer sticky top-0 flex h-svh shrink-0 flex-col', this.side() === 'right' && 'order-last', this.userClass())
      : 'peer contents',
  );
  protected readonly columnClass = computed(() =>
    cn(
      'flex h-full w-full min-h-0 flex-col',
      this.bordered() &&
        this.variant() === 'sidebar' &&
        (this.side() === 'left' ? 'border-r border-border' : 'border-l border-border'),
    ),
  );

  constructor() {
    // The provider mirrors the side into the default shortcut and the rail.
    effect(() => this.sidebar.registerSide(this.side()));
  }
}

// ─── SidebarContent ──────────────────────────────────────────────────────────

/**
 * The sidebar's scrolling region: a ScrollArea carrying the scroll-fade mask,
 * with the boundary hairline on its frame. Inside the mobile sheet it scrolls
 * natively instead (a nested ScrollArea would double-scroll). `class` goes to
 * the scroll frame; `viewportClass` to the viewport (React
 * `viewportClassName`). The host is `display: contents`.
 */
@Component({
  selector: 'ff-sidebar-content',
  imports: [NgTemplateOutlet, ScrollArea],
  host: { style: 'display: contents' },
  template: `
    <ng-template #children><ng-content /></ng-template>
    @if (sidebar.isMobile()) {
      <!-- scroll-divider can't sit on the scroller itself (its own fade mask
           would erase the line), so the region is wrapped the way ScrollArea
           wraps its viewport on desktop. -->
      <div class="scroll-divider [--scroll-divider-inset:8px] flex min-h-0 w-full flex-1 flex-col">
        <div data-sidebar="content" [class]="mobileClass()">
          <ng-container [ngTemplateOutlet]="children" />
        </div>
      </div>
    } @else {
      <!-- The scroll primitive wraps children in a sizer that sizes to
           content — rows would stop shrinking near the min width instead of
           truncating, so the viewport's direct child is forced back to a
           plain shrinkable block. -->
      <ff-scroll-area [class]="areaClass()" [viewportClass]="viewportClassName()" thumbSizing="track">
        <div data-sidebar="content" class="flex w-full min-w-0 flex-col">
          <ng-container [ngTemplateOutlet]="children" />
        </div>
      </ff-scroll-area>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarContent {
  readonly viewportClass = input('');
  readonly userClass = input('', { alias: 'class' });

  protected readonly sidebar = injectSidebar();
  protected readonly mobileClass = computed(() =>
    cn('scroll-fade flex min-h-0 w-full flex-1 flex-col overflow-y-auto', this.userClass()),
  );
  protected readonly areaClass = computed(() => cn('scroll-divider min-h-0 w-full flex-1', this.userClass()));
  protected readonly viewportClassName = computed(() =>
    cn('scroll-fade [&>div]:!block [&>div]:!min-w-0', this.viewportClass()),
  );
}
