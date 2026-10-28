import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { inView } from 'motion';
import {
  Button,
  DropdownContent,
  DropdownMenu,
  DropdownTrigger,
  Icon,
  type IconName,
  MenuItem,
  SIDEBAR_MENU_POPUP,
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
  fontWeights,
} from '@angel-r/fluid-functionalism-angular';
import { AI_WORKSPACE, SIDEBAR_THREADS } from './sidebar-data';
import { PinGutter, SidebarDemoFooterUser, SidebarDemoTopbar, WORKSPACE_TILES } from './sidebar-parts';
import { SHELL_HEIGHT } from './sidebar-shells';

// ---------------------------------------------------------------------------
// Icon alignment — measured guides (React `AlignmentPreview`)
// ---------------------------------------------------------------------------

const ALIGN_HEADER_ICONS: readonly { icon: IconName; label: string }[] = [
  { icon: 'search', label: 'Search' },
  { icon: 'plus', label: 'New thread' },
  { icon: 'sliders-horizontal', label: 'Filters' },
];

const ALIGN_FOOTER_ICONS: readonly { icon: IconName; label: string }[] = [
  { icon: 'settings', label: 'Settings' },
  { icon: 'inbox', label: 'Inbox' },
];

/** Same frame as the page's other previews (React `SidebarShellFrame`). */
const FRAME = `relative flex w-full overflow-hidden bg-background ${SHELL_HEIGHT}`;

interface FrameBox {
  left: number;
  top: number;
  height: number;
}

/** Icon alignment: header buttons, row action clusters and footer buttons
 *  all on the same vertical axes. The guides aren't drawn from constants —
 *  every icon's centre is MEASURED and each distinct axis gets a line, so
 *  the demo proves the rhythm rather than asserting it. One row keeps its
 *  cluster pinned visible (until the visitor's cursor takes over) so the
 *  guides visibly thread header, row and footer at once. */
@Component({
  selector: 'app-sidebar-demo-alignment',
  imports: [
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarInset,
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
    Button,
    Icon,
    SidebarDemoTopbar,
    SidebarDemoFooterUser,
    PinGutter,
  ],
  // Transparent host: the frame is the stage's flex item, like React's.
  host: { style: 'display: contents' },
  template: `
    <div
      #frame
      class="relative w-full self-stretch"
      (mouseenter)="cursorInside.set(true)"
      (mousemove)="cursorInside.set(true)"
      (pointerdown)="cursorInside.set(true)"
      (mouseleave)="cursorInside.set(false)"
    >
      <div [class]="frameClass">
        <ff-sidebar-provider class="h-full min-h-0" [persist]="false" [mobileBreakpoint]="0">
          <ff-sidebar collapsible="none" class="h-full">
            <div ffSidebarHeader>
              <div class="flex items-center gap-1 pr-1.5">
                <!-- The workspace dropdown, on the grid: tile nudged -ml-0.5
                     onto the leading axis, chevron in a -mr-0.5 24px slot —
                     and the wrapper's -mr-1.5 puts that slot on the next 28px
                     column beside the three buttons. -->
                <div class="min-w-0 flex-1 -mr-1.5">
                  <ul ffSidebarMenu aria-label="Workspace">
                    <li ffSidebarMenuItem>
                      <ff-dropdown-menu>
                        <button ffSidebarMenuButton ffDropdownTrigger aria-label="Switch workspace">
                          <span
                            aria-hidden="true"
                            data-guide-img
                            class="-ml-0.5 -mr-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-foreground text-[10px] text-background"
                            [style.font-variation-settings]="semibold"
                          >
                            A
                          </span>
                          <span
                            data-guide-text
                            class="min-w-0 truncate text-[13px] text-foreground"
                            [style.font-variation-settings]="semibold"
                          >
                            {{ workspace }}
                          </span>
                          <span data-guide class="ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center">
                            <ff-icon name="chevron-down" [size]="16" [strokeWidth]="1.5" class="text-muted-foreground" />
                          </span>
                        </button>
                        <ff-dropdown-content [class]="popupClass" align="start" [sideOffset]="4" [checkedIndex]="0">
                          <ff-menu-item [index]="0" [icon]="tiles.acme" label="Acme Inc" [checked]="true" />
                          <ff-menu-item [index]="1" [icon]="tiles.fluid" label="Fluid Labs" />
                          <ff-menu-item [index]="2" [icon]="tiles.personal" label="Personal" />
                          <ff-menu-item [index]="3" icon="plus" label="New workspace" />
                        </ff-dropdown-content>
                      </ff-dropdown-menu>
                    </li>
                  </ul>
                </div>
                <div data-guide class="flex items-center gap-1">
                  @for (entry of headerIcons; track entry.label) {
                    <button ffButton variant="ghost" size="icon-compact" [attr.aria-label]="entry.label" class="size-6 shrink-0">
                      <ff-icon [name]="entry.icon" />
                    </button>
                  }
                </div>
              </div>
            </div>
            <ff-sidebar-content>
              <ff-sidebar-group collapsible data-guide-rows>
                <ff-sidebar-group-label>Threads</ff-sidebar-group-label>
                <!-- The section header's own actions sit on the same trailing
                     axes as everything else. -->
                <div ffSidebarGroupActions>
                  <button ffSidebarGroupAction aria-label="New thread"><ff-icon name="plus" /></button>
                  <button ffSidebarGroupAction aria-label="Filter threads"><ff-icon name="sliders-horizontal" /></button>
                  <button ffSidebarGroupAction aria-label="More options"><ff-icon name="more-horizontal" /></button>
                </div>
                <ul ffSidebarMenu>
                  <!-- Badges keep the rightmost slot; the hover cluster slides
                       in left of them. "active" implies the row-active
                       treatment — mapped to "unread" (same filled dot) so no
                       page reads as selected here. -->
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
                      @if (thread.badge) {
                        <div ffSidebarMenuBadge>{{ thread.badge }}</div>
                      }
                      <div ffSidebarMenuActions showOnHover [class]="pinned(i) ? 'opacity-100' : ''">
                        <button ffSidebarMenuAction aria-label="Branch thread"><ff-icon name="corner-down-right" /></button>
                        <button ffSidebarMenuAction aria-label="Share thread"><ff-icon name="link" /></button>
                        <button ffSidebarMenuAction aria-label="More options"><ff-icon name="more-vertical" /></button>
                      </div>
                    </li>
                  }
                </ul>
              </ff-sidebar-group>
            </ff-sidebar-content>
            <div ffSidebarFooter>
              <!-- The header's inline pattern, mirrored: the user row keeps
                   the leading run and the two icons sit past its chevron, on
                   the same trailing axes as everything above. -->
              <div class="flex items-center gap-1 pr-1.5">
                <!-- -mr-1.5 hands the row's trailing padding back to the
                     rhythm, so its chevron slot lands on the next 28px column
                     beside the icon buttons. -->
                <div class="min-w-0 flex-1 -mr-1.5">
                  <app-sidebar-demo-footer-user />
                </div>
                <div data-guide class="flex items-center gap-1">
                  @for (entry of footerIcons; track entry.label) {
                    <button ffButton variant="ghost" size="icon-compact" [attr.aria-label]="entry.label" class="size-6 shrink-0">
                      <ff-icon [name]="entry.icon" />
                    </button>
                  }
                </div>
              </div>
            </div>
          </ff-sidebar>
          <main ffSidebarInset class="min-h-0"><app-sidebar-demo-topbar /></main>
        </ff-sidebar-provider>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoAlignment {
  protected readonly frameClass = FRAME;
  protected readonly workspace = AI_WORKSPACE;
  protected readonly semibold = fontWeights.semibold;
  protected readonly popupClass = SIDEBAR_MENU_POPUP;
  protected readonly tiles = WORKSPACE_TILES;
  protected readonly headerIcons = ALIGN_HEADER_ICONS;
  protected readonly footerIcons = ALIGN_FOOTER_ICONS;
  protected readonly threads = SIDEBAR_THREADS;

  protected readonly cursorInside = signal(false);
  private readonly inView = signal(false);
  private readonly guides = signal<readonly number[]>([]);
  // The guides render in a body "portal" at z-[60] so they draw OVER the
  // body-level dropdown popups too — the menus sit below the lines, which
  // then vouch for the popup icons as well. Document-space coordinates keep
  // them glued to the frame while the page scrolls.
  private readonly frameBox = signal<FrameBox | null>(null);
  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');

  protected pinned(i: number) {
    return this.inView() && !this.cursorInside() && i === 1;
  }

  constructor() {
    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const root = this.frame().nativeElement;
      const window = document.defaultView!;
      const sameBox = (a: FrameBox | null, b: FrameBox) =>
        !!a && a.left === b.left && a.top === b.top && a.height === b.height;
      // Body-resize events only shift the frame's document offset — the guide
      // xs are frame-relative and unchanged — so that path refreshes just the
      // portal anchor instead of re-running the selector sweep.
      const measureFrameBox = () => {
        const rootRect = root.getBoundingClientRect();
        const next = { left: rootRect.left + window.scrollX, top: rootRect.top + window.scrollY, height: rootRect.height };
        this.frameBox.update((prev) => (sameBox(prev, next) ? prev : next));
      };
      const measure = () => {
        measureFrameBox();
        const rootRect = root.getBoundingClientRect();
        const xs: number[] = [];
        // Each icon contributes both edges of its 24px slot (the size-6
        // button box, centred on the glyph), so every column reads as a pair
        // of rails around the button. Row icons are scoped to the Threads
        // group — the footer's user row carries an off-rhythm trailing
        // chevron that would draw near-miss lines.
        root
          .querySelectorAll(
            '[data-guide] svg, [data-guide-img], [data-sidebar="menu-action"] svg, [data-sidebar="group-action"] svg, [data-guide-rows] [data-sidebar="menu-button"] svg, [data-guide-rows] [data-sidebar="menu-button"] .size-2',
          )
          .forEach((el) => {
            const rect = el.getBoundingClientRect();
            const center = rect.left + rect.width / 2 - rootRect.left;
            xs.push(center - 12, center + 12);
          });
        // Label-start axes get a single line at the text's leading edge — one
        // for the header's workspace name, one for the Threads group label.
        root
          .querySelectorAll('[data-guide-text], [data-guide-rows] [data-sidebar="group-label"] span.truncate')
          .forEach((el) => {
            xs.push(el.getBoundingClientRect().left - rootRect.left);
          });
        xs.sort((a, b) => a - b);
        // Merge edges within 2px — hidden clusters overlay the visible one.
        const merged: number[] = [];
        for (const x of xs) {
          if (!merged.length || x - merged[merged.length - 1] > 2) merged.push(x);
        }
        this.guides.update((prev) =>
          prev.length === merged.length && prev.every((v, i) => v === merged[i]) ? prev : merged,
        );
      };
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(root);
      // Content above the section changing height shifts the frame's document
      // offset without resizing it — watching the body catches that, but only
      // the cheap frame-box refresh rides it.
      const bodyObserver = new ResizeObserver(measureFrameBox);
      bodyObserver.observe(document.body);
      // React `useInView(frameRef, { amount: 0.5 })`.
      const stopInView = inView(
        root,
        () => {
          this.inView.set(true);
          return () => this.inView.set(false);
        },
        { amount: 0.5 },
      );
      destroyRef.onDestroy(() => {
        observer.disconnect();
        bodyObserver.disconnect();
        stopInView();
      });
    });

    // One line per measured axis, on the accent so they read as guides, not
    // chrome — appended to <body> above the dropdown popups (React portals
    // them with createPortal).
    const lines = new Map<number, HTMLSpanElement>();
    afterRenderEffect(() => {
      const box = this.frameBox();
      const guides = box ? this.guides() : [];
      for (const [x, line] of lines) {
        if (!guides.includes(x)) {
          line.remove();
          lines.delete(x);
        }
      }
      for (const x of guides) {
        let line = lines.get(x);
        if (!line) {
          line = document.createElement('span');
          line.setAttribute('aria-hidden', 'true');
          line.className = 'pointer-events-none absolute z-[60] w-px opacity-40';
          line.style.backgroundColor = 'var(--focus-ring, #6B97FF)';
          lines.set(x, line);
        }
        line.style.left = `${box!.left + x - 0.5}px`;
        line.style.top = `${box!.top}px`;
        line.style.height = `${box!.height}px`;
        // Keep DOM order sorted like React's keyed list.
        document.body.appendChild(line);
      }
    });
    destroyRef.onDestroy(() => lines.forEach((line) => line.remove()));
  }
}
