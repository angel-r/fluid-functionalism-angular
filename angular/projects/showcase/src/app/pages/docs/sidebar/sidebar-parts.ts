// ---------------------------------------------------------------------------
// The shared demo scaffolding of the Sidebar page, ported from the helpers at
// the top of app/docs/sidebar/page.tsx: the workspace tiles, the header row
// and its search field, the footer's user row, the product nav, the wiki
// branches and the inset's topbar.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import {
  DropdownContent,
  DropdownMenu,
  DropdownTrigger,
  Icon,
  MenuItem,
  SIDEBAR_MENU_POPUP,
  SidebarBlockMenu,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInsetTopbar,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSearchField,
  SidebarWorkspaceHeader,
  WorkspaceTile,
  enterTransition,
  fontWeights,
  injectAnimateFluid,
  injectShape,
  spring,
} from '@angel-r/fluid-functionalism-angular';
import { AI_NAV, AI_WORKSPACE, type WikiBranch } from './sidebar-data';

// ---------------------------------------------------------------------------
// Workspace-switcher rows: letter tiles in grey shades as the switcher rows'
// icons. The visible square renders at the trigger's 20px, centred on the
// row's icon slot, so the tiles land on the sidebar's leading icon axis. Each
// tile is an icon component: it takes the icon contract's size / strokeWidth /
// class inputs.
// ---------------------------------------------------------------------------

@Directive()
abstract class LetterTile {
  readonly size = input(16);
  readonly strokeWidth = input(1.5);
  readonly userClass = input('', { alias: 'class' });
  protected abstract readonly letter: string;
  protected abstract readonly colors: string;
  private readonly shape = injectShape();
  protected readonly semibold = fontWeights.semibold;
  protected readonly tileClass = computed(
    () =>
      `absolute top-1/2 left-1/2 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-[10px] ${
        this.shape().bgRadius >= 20 ? 'rounded-full' : 'rounded-md'
      } ${this.colors}`,
  );
}

const LETTER_TILE_TEMPLATE = `
  <span [class]="'relative flex shrink-0 ' + userClass()" [style.width.px]="size()" [style.height.px]="size()">
    <span [class]="tileClass()" [style.font-variation-settings]="semibold">{{ letter }}</span>
  </span>
`;

@Component({ selector: 'app-sidebar-tile-acme', template: LETTER_TILE_TEMPLATE, host: { style: 'display: contents' } })
export class AcmeTile extends LetterTile {
  protected readonly letter = 'A';
  protected readonly colors = 'bg-foreground text-background';
}

@Component({ selector: 'app-sidebar-tile-fluid', template: LETTER_TILE_TEMPLATE, host: { style: 'display: contents' } })
export class FluidTile extends LetterTile {
  protected readonly letter = 'F';
  protected readonly colors = 'bg-muted-foreground text-background';
}

@Component({ selector: 'app-sidebar-tile-personal', template: LETTER_TILE_TEMPLATE, host: { style: 'display: contents' } })
export class PersonalTile extends LetterTile {
  protected readonly letter = 'P';
  protected readonly colors = 'bg-muted-foreground/60 text-background';
}

export const WORKSPACE_TILES = { acme: AcmeTile, fluid: FluidTile, personal: PersonalTile };

/** A chevron's rotation as React's `<motion.span animate={{ rotate }}
 *  transition={spring.fast}>`: written at mount, sprung on change. */
@Directive({ selector: '[appSpringRotate]' })
export class SpringRotate {
  readonly appSpringRotate = input.required<number>();
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly animate = injectAnimateFluid();

  constructor() {
    let current: number | null = null;
    afterRenderEffect(() => {
      const next = this.appSpringRotate();
      untracked(() => {
        if (current === null) {
          this.el.style.transform = next ? `rotate(${next}deg)` : 'none';
        } else if (next !== current) {
          this.animate(this.el, { rotate: [current, next] }, enterTransition(spring.fast));
        }
        current = next;
      });
    });
  }
}

/** React's pinned row passes `style={{ "--row-gutter": "var(--row-gutter-hover)" }}`
 *  over the gutter the row measured. An Angular `[style.--row-gutter]` binding
 *  set back to null would drop the button's own host value too, so the pin
 *  writes the inline property itself and puts the measured one back after. */
@Directive({ selector: '[appPinGutter]' })
export class PinGutter {
  readonly pinned = input(false, { alias: 'appPinGutter' });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    let saved: string | null = null;
    afterRenderEffect(() => {
      const pinned = this.pinned();
      untracked(() => {
        const style = this.el.style;
        if (pinned && saved === null) {
          saved = style.getPropertyValue('--row-gutter');
          style.setProperty('--row-gutter', 'var(--row-gutter-hover)');
        } else if (!pinned && saved !== null) {
          if (saved) style.setProperty('--row-gutter', saved);
          else style.removeProperty('--row-gutter');
          saved = null;
        }
      });
    });
  }
}

/** A 20px avatar standing in for the docs' /micka.png (the showcase ships no
 *  photo assets): a neutral portrait silhouette as an inline SVG data URI. */
export const AVATAR_SRC =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#e5e5e5"/>' +
      '<circle cx="20" cy="16" r="7" fill="#404040"/><path d="M6 40c1-8 7-12 14-12s13 4 14 12z" fill="#171717"/></svg>',
  );

/** React `DemoHeaderRow`: the header's brand row — the
 *  sidebar-workspace-header block with the switcher menu. */
@Component({
  selector: 'app-sidebar-demo-header-row',
  imports: [SidebarWorkspaceHeader, WorkspaceTile, SidebarBlockMenu, MenuItem],
  host: { class: 'contents' },
  template: `
    <ff-sidebar-workspace-header [name]="workspace" [checkedIndex]="0">
      <span ffWorkspaceTile>A</span>
      <ng-template ffSidebarBlockMenu>
        <ff-menu-item [index]="0" [icon]="tiles.acme" label="Acme Inc" [checked]="true" />
        <ff-menu-item [index]="1" [icon]="tiles.fluid" label="Fluid Labs" />
        <ff-menu-item [index]="2" [icon]="tiles.personal" label="Personal" />
        <ff-menu-item [index]="3" icon="plus" label="New workspace" />
      </ng-template>
    </ff-sidebar-workspace-header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoHeaderRow {
  protected readonly workspace = AI_WORKSPACE;
  protected readonly tiles = WORKSPACE_TILES;
}

/** React `DemoHeader`: the workspace row, then the search field, inside the
 *  header block every example shares. The page only ever uses the stacked
 *  variant (the horizontal packing assembles its own icon-button row). */
@Component({
  selector: 'app-sidebar-demo-header',
  imports: [SidebarHeader, SidebarSearchField, SidebarDemoHeaderRow],
  host: { class: 'contents' },
  template: `
    <div ffSidebarHeader>
      <app-sidebar-demo-header-row />
      <ff-sidebar-search-field />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoHeader {}

/** React `DemoFooterUser`: avatar, name and a chevron slot, opening its menu
 *  upward on the sidebar menu grid. It carries the alignment demo's
 *  data-guide hooks; they are inert everywhere else, and the guides only
 *  measure inside that demo's frame. */
@Component({
  selector: 'app-sidebar-demo-footer-user',
  imports: [SidebarMenu, SidebarMenuItem, SidebarMenuButton, DropdownMenu, DropdownTrigger, DropdownContent, MenuItem, Icon],
  host: { class: 'contents' },
  template: `
    <ul ffSidebarMenu aria-label="User">
      <li ffSidebarMenuItem>
        <ff-dropdown-menu>
          <button ffSidebarMenuButton ffDropdownTrigger aria-label="Open user menu">
            <!-- -ml-0.5 centres the 20px avatar on the rows' leading icon
                 axis (24px in); the chevron rides a 24px slot pulled -mr-0.5
                 onto the trailing action axis. -->
            <img
              [src]="avatar"
              alt=""
              width="20"
              height="20"
              data-guide-img
              style="color: transparent"
              class="-ml-0.5 -mr-0.5 size-5 shrink-0 rounded-full outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
            />
            <span class="min-w-0 truncate text-[13px] text-foreground">Micka Touillaud</span>
            <span data-guide class="ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center">
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
  protected readonly avatar = AVATAR_SRC;
  protected readonly popupClass = SIDEBAR_MENU_POPUP;
}

/** React `DemoMenu`: the product's top-level nav under a collapsible section
 *  label. The layout and collapse examples render it FLAT (`nested` false):
 *  those examples are about the shell, so plain selectable rows keep the
 *  rail quiet. The nesting example keeps the tree, one branch open. */
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
    SpringRotate,
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
                <!-- The chevron rides the label's trailing edge: at rest it
                     only shows on a closed row, so an open tree isn't a column
                     of arrows. -->
                <span class="ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center">
                  <span class="inline-flex" [appSpringRotate]="open()[item.label] ? 90 : 0">
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
                    <a
                      ffSidebarMenuSubButton
                      href="#"
                      [isActive]="child.label === current()"
                      (click)="$event.preventDefault(); current.set(child.label)"
                    >
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
  // The flat nav selects a top-level row; the tree starts on its first child.
  protected readonly current = linkedSignal(() =>
    this.nested() ? AI_NAV[0].children[0].label : AI_NAV[0].label,
  );

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
  imports: [
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    Icon,
    SpringRotate,
  ],
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
              <span class="inline-flex" [appSpringRotate]="isOpen(branch.label) ? 90 : 0">
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
  /** Coerce: a label absent from the map must read as CLOSED — an undefined
   *  `open` would fall through to the sub-menu's open-by-default. */
  private readonly openState = signal<Record<string, boolean> | null>(null);
  protected readonly current = signal('');

  protected isOpen(label: string) {
    const state = this.openState();
    return state ? !!state[label] : this.initiallyOpen().includes(label);
  }

  protected toggle(label: string) {
    const base = this.openState() ?? Object.fromEntries(this.initiallyOpen().map((label) => [label, true]));
    this.openState.set({ ...base, [label]: !base[label] });
  }
}

/** React `DemoInsetContent`: the main region's bare topbar. The region itself
 *  stays blank on purpose — skeleton page furniture competed with the rail. */
@Component({
  selector: 'app-sidebar-demo-topbar',
  imports: [SidebarInsetTopbar],
  host: { class: 'contents' },
  template: `
    <header ffSidebarInsetTopbar>
      <span class="text-[13px] text-muted-foreground">{{ title() }}</span>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoTopbar {
  readonly title = input('');
}

/** Tooltip content with the action's keystroke, on the same inverted surface
 *  treatment the sidebar trigger's tooltip uses. The label re-applies the
 *  surface's text-box trim (a flex row escapes it) and the chip pulls its box
 *  back with -my-1, so the tooltip keeps its single-line height. */
export const TIP_KBD_CLASS =
  '-my-1 flex h-4 min-w-4 items-center justify-center rounded border border-background/30 px-1 font-sans text-[10px] text-background';
