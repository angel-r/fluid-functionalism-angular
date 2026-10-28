// ---------------------------------------------------------------------------
// The Sidebar page's section previews, ported from app/docs/sidebar/page.tsx:
// the nesting tree, the actions & badges shell, the header/footer stackings,
// the collapse/peek demo and the settings dialog.
//
// The two demos whose subject is a hover state pin it until the visitor's own
// cursor takes over (the reference's `inView && !cursorInside` gate), and
// portal their tooltips into their own frame so a pinned chip scrolls with the
// page instead of chasing its anchor.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { inView } from 'motion';
import {
  Button,
  DropdownContent,
  DropdownMenu,
  DropdownTrigger,
  Icon,
  MenuItem,
  type SidebarPeek,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupActions,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuActions,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSearchField,
  SettingsDialog,
  Tooltip,
  TooltipPortalContainer,
} from '@angel-r/fluid-functionalism-angular';
import { AI_THREADS, WIKI_PRIVATE, WIKI_RECENT, WIKI_SHARED } from './sidebar-data';
import {
  PinGutter,
  SidebarDemoBranches,
  SidebarDemoFooterUser,
  SidebarDemoHeader,
  SidebarDemoHeaderRow,
  SidebarDemoTopbar,
  TIP_KBD_CLASS,
} from './sidebar-parts';
import { SidebarDemoCallout } from './sidebar-callouts';
import { SidebarDemoRailShell } from './sidebar-shells';

const SEARCH_SHORTCUT = '⌘K';

/** Tracks whether an element is on screen (`useInView` in the reference): the
 *  pinned states must never be forced while the demo is scrolled away, or a
 *  force-opened tooltip shifts back into the viewport detached. */
@Directive({ selector: '[appInView]' })
class InViewGate {
  readonly amount = input(0.5, { alias: 'appInView' });
  readonly inView = signal(false);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const stop = inView(
        this.el,
        () => {
          this.inView.set(true);
          return () => this.inView.set(false);
        },
        { amount: this.amount() },
      );
      destroyRef.onDestroy(stop);
    });
  }
}

/** Two levels of nesting: section groups, and parent rows with sub-trees. One
 *  wiki, three sections, one per state — Private folded to its label, Shared
 *  open with its branches closed, Recent fully open down to level 2. */
@Component({
  selector: 'app-sidebar-demo-nesting',
  imports: [SidebarDemoRailShell, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarDemoHeader, SidebarDemoBranches],
  host: { style: 'display: contents' },
  template: `
    <app-sidebar-rail-shell>
      <app-sidebar-demo-header />
      <ff-sidebar-content>
        <ff-sidebar-group collapsible [defaultOpen]="false">
          <ff-sidebar-group-label>Private</ff-sidebar-group-label>
          <app-sidebar-demo-branches [branches]="privateBranches" />
        </ff-sidebar-group>
        <ff-sidebar-group collapsible>
          <ff-sidebar-group-label>Shared</ff-sidebar-group-label>
          <app-sidebar-demo-branches [branches]="sharedBranches" />
        </ff-sidebar-group>
        <ff-sidebar-group collapsible>
          <ff-sidebar-group-label>Recent</ff-sidebar-group-label>
          <app-sidebar-demo-branches [branches]="recentBranches" [initiallyOpen]="openBranches" />
        </ff-sidebar-group>
      </ff-sidebar-content>
    </app-sidebar-rail-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoNesting {
  protected readonly privateBranches = WIKI_PRIVATE;
  protected readonly sharedBranches = WIKI_SHARED;
  protected readonly recentBranches = WIKI_RECENT;
  protected readonly openBranches = ['Today', 'Yesterday'];
}

/** Actions & badges: everything a row and a section label can carry — status
 *  dots on assistant threads, counts, and the hover-revealed action cluster
 *  (branch / share / overflow menu, tooltipped) on every thread. Until the
 *  visitor's own cursor takes over, one row wears the hovered state as the
 *  section's subject: hover background, action cluster visible, and the Branch
 *  tooltip pinned open. */
@Component({
  selector: 'app-sidebar-demo-actions',
  imports: [
    SidebarDemoRailShell,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupActions,
    SidebarGroupAction,
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
    TooltipPortalContainer,
    InViewGate,
    PinGutter,
  ],
  host: { style: 'display: contents' },
  template: `
    <div
      #frame
      [appInView]="0.5"
      class="relative w-full self-stretch"
      (mouseenter)="cursorInside.set(true)"
      (mousemove)="cursorInside.set(true)"
      (pointerdown)="cursorInside.set(true)"
      (mouseleave)="cursorInside.set(false)"
    >
      <div [ffTooltipPortalContainer]="frameElement()">
        <app-sidebar-rail-shell>
          <app-sidebar-demo-header />
          <ff-sidebar-content>
            <!-- A section label that collapses its rows and carries its own
                 actions -->
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
                     the overflow menu — the badge keeps the rightmost slot
                     beside it. "active" maps to "unread" (same filled dot) so
                     no page reads as selected in this example. -->
                @for (thread of threads; track thread.label; let i = $index) {
                  <li ffSidebarMenuItem>
                    <button
                      ffSidebarMenuButton
                      [status]="thread.status === 'active' ? 'unread' : thread.status"
                      [class]="pinned(i) ? 'bg-hover' : ''"
                      [appPinGutter]="pinned(i)"
                    >
                      {{ thread.label }}
                    </button>
                    <div ffSidebarMenuBadge>{{ thread.badge }}</div>
                    <div ffSidebarMenuActions showOnHover [class]="pinned(i) ? 'opacity-100' : ''">
                      <ff-tooltip content="Branch thread" side="top" [forceOpen]="pinned(i) || undefined">
                        <!-- The tooltip's anchor also wears its own hover
                             treatment while pinned. -->
                        <button
                          ffSidebarMenuAction
                          aria-label="Branch thread"
                          [class]="pinned(i) ? 'bg-hover text-foreground' : ''"
                        >
                          <ff-icon name="corner-down-right" />
                        </button>
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
        </app-sidebar-rail-shell>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoActions {
  protected readonly threads = AI_THREADS;
  protected readonly cursorInside = signal(false);
  private readonly SPOTLIGHT_INDEX = 3;
  private readonly gate = viewChild.required(InViewGate);
  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  protected readonly frameElement = computed(() => this.frame().nativeElement);

  protected pinned(index: number) {
    return this.gate().inView() && !this.cursorInside() && index === this.SPOTLIGHT_INDEX;
  }
}

/** Header, footer & callout: the two ends of the rail, stacked vertically —
 *  every element on its own full-width row — against the horizontal packing
 *  that collapses the same pieces into icon buttons. */
@Component({
  selector: 'app-sidebar-demo-header-footer',
  imports: [
    SidebarDemoRailShell,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarSearchField,
    Button,
    Tooltip,
    Icon,
    SidebarDemoHeaderRow,
    SidebarDemoFooterUser,
    SidebarDemoCallout,
  ],
  host: { style: 'display: contents' },
  template: `
    <app-sidebar-rail-shell heightClass="aspect-square">
      <div ffSidebarHeader>
        @if (vertical()) {
          <app-sidebar-demo-header-row />
          <!-- Search and the action rows are ONE block: the header's gap-2
               separates it from the brand row, while inside it the search
               field reads as the list's first row (menu row rhythm). -->
          <div class="flex flex-col">
            <ff-sidebar-search-field />
            <ul ffSidebarMenu aria-label="Header actions">
              <li ffSidebarMenuItem>
                <button ffSidebarMenuButton icon="plus">
                  New thread
                  <!-- Shortcut chip, revealed on row hover — a labeled row
                       wants no tooltip. -->
                  <span
                    class="ml-auto inline-flex opacity-0 transition-opacity duration-80 group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100"
                  >
                    <kbd class="font-sans text-[11px] leading-3.5 text-muted-foreground">⇧⌘O</kbd>
                  </span>
                </button>
              </li>
            </ul>
          </div>
        } @else {
          <div class="flex items-center gap-1 pr-1.5">
            <div class="min-w-0 flex-1">
              <app-sidebar-demo-header-row />
            </div>
            <ff-tooltip [content]="searchTip" side="bottom">
              <button ffButton variant="ghost" size="icon-compact" aria-label="Search" class="size-6 shrink-0">
                <ff-icon name="search" />
              </button>
            </ff-tooltip>
            <ff-tooltip [content]="newThreadTip" side="bottom">
              <button ffButton variant="ghost" size="icon-compact" aria-label="New thread" class="size-6 shrink-0">
                <ff-icon name="plus" />
              </button>
            </ff-tooltip>
          </div>
        }
      </div>

      <ff-sidebar-content>
        <ff-sidebar-group>
          <ff-sidebar-group-label>Threads</ff-sidebar-group-label>
          <ul ffSidebarMenu>
            @for (thread of threads; track thread.label) {
              <li ffSidebarMenuItem>
                <button ffSidebarMenuButton [status]="thread.status">{{ thread.label }}</button>
              </li>
            }
          </ul>
        </ff-sidebar-group>
      </ff-sidebar-content>

      <div ffSidebarFooter>
        @if (!vertical()) {
          <app-sidebar-demo-callout variant="inline" />
        }
        @if (vertical()) {
          <!-- Actions stack above the user row, so identity stays anchored
               to the sidebar's outer edge — mirroring the brand row up top. -->
          <ul ffSidebarMenu aria-label="Footer actions">
            <li ffSidebarMenuItem>
              <button ffSidebarMenuButton icon="settings">Settings</button>
            </li>
            <li ffSidebarMenuItem>
              <button ffSidebarMenuButton icon="lightbulb">What's new</button>
            </li>
          </ul>
          <app-sidebar-demo-footer-user />
        } @else {
          <div class="flex items-center gap-1 pr-1.5">
            <div class="min-w-0 flex-1">
              <app-sidebar-demo-footer-user />
            </div>
            <button ffButton variant="ghost" size="icon-compact" aria-label="Settings" class="size-6 shrink-0">
              <ff-icon name="settings" />
            </button>
          </div>
        }
      </div>
    </app-sidebar-rail-shell>

    <!-- Tooltip content with the action's keystroke: the label re-applies the
         surface's text-box trim (a flex row escapes it) and the chip pulls its
         box back with -my-1, so the tooltip keeps its single-line height. -->
    <ng-template #searchTip>
      <span class="flex items-center gap-2">
        <span class="[text-box:trim-both_cap_alphabetic]">Search</span>
        <kbd [class]="tipKbd">{{ searchShortcut }}</kbd>
      </span>
    </ng-template>
    <ng-template #newThreadTip>
      <span class="flex items-center gap-2">
        <span class="[text-box:trim-both_cap_alphabetic]">New thread</span>
        <kbd [class]="tipKbd">⇧⌘O</kbd>
      </span>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoHeaderFooter {
  readonly stack = input<'vertical' | 'horizontal'>('vertical');
  protected readonly vertical = computed(() => this.stack() === 'vertical');
  protected readonly threads = AI_THREADS.slice(0, 3);
  protected readonly searchShortcut = SEARCH_SHORTCUT;
  protected readonly tipKbd = TIP_KBD_CLASS;
}

/** Collapse, peek & resize: the whole shell, since collapsing is about what the
 *  main region does with the space. The rail's tooltip is pinned open as the
 *  section's subject — a real hover takes over, and it pins again once the
 *  pointer leaves the preview. */
@Component({
  selector: 'app-sidebar-demo-collapse',
  imports: [
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuBadge,
    SidebarInset,
    SidebarDemoHeader,
    SidebarDemoTopbar,
    TooltipPortalContainer,
    InViewGate,
  ],
  host: { style: 'display: contents' },
  template: `
    <div
      #frame
      [appInView]="0.5"
      class="relative w-full self-stretch"
      (mouseenter)="cursorInside.set(true)"
      (mousemove)="cursorInside.set(true)"
      (pointerdown)="cursorInside.set(true)"
      (mouseleave)="cursorInside.set(false)"
    >
      <div [ffTooltipPortalContainer]="frameElement()">
        <div class="relative flex w-full overflow-hidden bg-background aspect-square">
          <ff-sidebar-provider
            class="h-full min-h-0"
            [persist]="false"
            [mobileBreakpoint]="0"
            [peek]="peek()"
            [open]="open()"
            (openChange)="open.set($event)"
          >
            <ff-sidebar variant="inset" [railTooltipOpen]="railPin()" class="h-full">
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
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoCollapse {
  readonly peek = input<SidebarPeek>('hover');
  readonly defaultOpen = input(true);
  protected readonly open = linkedSignal(() => this.defaultOpen());
  protected readonly threads = AI_THREADS.slice(0, 5);
  protected readonly cursorInside = signal(false);
  private readonly gate = viewChild.required(InViewGate);
  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  protected readonly frameElement = computed(() => this.frame().nativeElement);

  /** Pinned only while the rail exists to anchor it — never while collapsed,
   *  and never against the visitor's own hover. */
  protected readonly railPin = computed(() =>
    this.gate().inView() && !this.cursorInside() && this.open() ? true : undefined,
  );
}

/** React `SettingsDialogDemo`: the dialog-sidebar block behind a button. */
@Component({
  selector: 'app-sidebar-demo-settings-dialog',
  imports: [Button, SettingsDialog],
  host: { style: 'display: contents' },
  template: `
    <button ffButton variant="secondary" (click)="open.set(true)">Open settings</button>
    <ff-settings-dialog [open]="open()" (openChange)="open.set($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoSettingsDialog {
  protected readonly open = signal(false);
}
