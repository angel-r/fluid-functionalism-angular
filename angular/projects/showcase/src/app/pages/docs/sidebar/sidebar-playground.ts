// ---------------------------------------------------------------------------
// The Sidebar page's playground, ported from `SidebarPlayground` in
// lib/docs/playgrounds/sidebar.tsx.
//
// The verdict is the reference's: the panel mirrors the sidebar's own anatomy
// top to bottom — Layout, Header, Sections, the three content levels, Footer —
// so a control's position tells you what it touches. Each content level
// answers the same few questions: what leads the row, whether it nests, how
// many actions, badges on or off.
//
// The preview is pinned to a rail (`mobileBreakpoint` 0): a drawer inside the
// stage hides the thing being demonstrated, so shuffling and every rail
// control looked inert at phone widths.
//
// State lives in sidebar-preset.ts (shared with the codec); the template the
// Code tab shows is regenerated from it by sidebar-code.ts.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  Button,
  CARD_PARTS,
  DropdownContent,
  DropdownMenu,
  DropdownTrigger,
  Icon,
  type IconName,
  MenuItem,
  SIDEBAR_MENU_POPUP,
  Sidebar,
  SidebarBlockMenu,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupActions,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarInsetTopbar,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuActions,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSearchField,
  SidebarUserFooter,
  SidebarWorkspaceHeader,
  Switch,
  Tooltip,
  WorkspaceTile,
  injectSize,
  injectShape,
  injectSurface,
  surfaceClasses,
  surfaceHoverClasses,
} from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import {
  PLAY_SWITCH,
  PlayDivider,
  PlayField,
  type PlayOption,
  PlaySection,
  PlaySelect,
  PlaygroundLayout,
  PlaygroundPanel,
} from '../../../docs-kit/playground';
import { GetCodeDialog } from '../../../docs-kit/preset/get-code-dialog';
import { injectPresetGlobals } from '../../../docs-kit/preset/preset-globals';
import { usePresetUrl } from '../../../docs-kit/preset/preset-url';
import { MESH_BANNER } from './sidebar-data';
import {
  DEFAULT_STATE,
  FOOTER_ACTION_SET,
  GROUP_ACTION_SET,
  HEADER_ACTION_SET,
  L2_ROWS,
  type PlayState,
  ROW_ACTION_SET,
  type RowAction,
  SEARCH_SHORTCUT,
  SECTION_LABELS,
  SIDEBAR_DEFAULT_CODE,
  SIDEBAR_PRESET_DEF,
  decodeSidebarPreset,
  encodeSidebarPreset,
  playStateOf,
} from './sidebar-preset';
import { buildSidebarPlaygroundCode } from './sidebar-code';
import { SIDEBAR_ITEMS, SIDEBAR_THREADS } from './sidebar-data';
import { AVATAR_SRC, SpringRotate, WORKSPACE_TILES } from './sidebar-parts';
import { SidebarDemoCalloutStack } from './sidebar-callouts';
import { SHELL_HEIGHT } from './sidebar-shells';

/** The props the playground's install prompt carries: the API this
 *  configuration actually sets. */
export const SIDEBAR_PROP_LINES: readonly string[] = [
  'ff-sidebar-provider: open, openChange, defaultOpen, persist, peek, shortcut, mobileBreakpoint, width',
  'ff-sidebar: side, variant ("sidebar" | "floating" | "inset"), collapsible ("offcanvas" | "none"), rail, railTooltipOpen',
  'ff-sidebar-group: collapsible, open, defaultOpen, openChange',
  'ffSidebarMenuButton: icon, status, isActive, size, variant',
  'ff-sidebar-menu-sub: open (measured-height collapse)',
  'ffSidebarMenuAction: showOnHover; ffSidebarMenuActions: showOnHover',
];

const COUNT_OPTIONS_2: readonly PlayOption[] = [
  { value: '0', label: 'None' },
  { value: '1', label: 'One' },
  { value: '2', label: 'Two' },
];

const COUNT_OPTIONS_3: readonly PlayOption[] = [...COUNT_OPTIONS_2, { value: '3', label: 'Three' }];

const DESIGN_OPTIONS: readonly PlayOption[] = [
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'floating', label: 'Floating' },
  { value: 'inset', label: 'Inset' },
];

const COLLAPSED_OPTIONS: readonly PlayOption[] = [
  { value: 'none', label: 'None' },
  { value: 'hover', label: 'On hover' },
  { value: 'click', label: 'On click' },
];

const STATE_OPTIONS: readonly PlayOption[] = [
  { value: 'opened', label: 'Opened' },
  { value: 'closed', label: 'Closed' },
  { value: 'loading', label: 'Loading' },
];

const HEADER_PRIMARY_OPTIONS: readonly PlayOption[] = [
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'logo', label: 'Brand logo' },
  { value: 'none', label: 'None' },
];

const HEADER_STACK_OPTIONS: readonly PlayOption[] = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
];

const L1_PRIMARY_OPTIONS: readonly PlayOption[] = [
  { value: 'menu', label: 'Menu' },
  { value: 'threads', label: 'Thread' },
];

const FOOTER_PRIMARY_OPTIONS: readonly PlayOption[] = [
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'none', label: 'None' },
];

const FOOTER_STACK_OPTIONS: readonly PlayOption[] = HEADER_STACK_OPTIONS;

const CALLOUT_OPTIONS: readonly PlayOption[] = [
  { value: 'none', label: 'None' },
  { value: 'inline', label: 'Inline' },
  { value: 'banner', label: 'Banner' },
];

const pick = <T>(options: readonly T[]): T => options[Math.floor(Math.random() * options.length)];

/** One level-1 row, whichever primary element is on. */
interface PlayRow {
  key: string;
  label: string;
  badge?: string;
  status?: 'active' | 'unread' | 'idle';
  icon?: IconName;
  active?: boolean;
}

/** The playground's single callout (React `FooterCallout`): the card resting
 *  one surface step above the rail. Dismissing it clears the playground's own
 *  state instead of bringing the card back. */
@Component({
  selector: 'app-sidebar-playground-callout',
  imports: [CARD_PARTS],
  host: { class: 'contents' },
  template: `
    @if (variant() === 'inline') {
      <ff-card-group orientation="inline" [fluidHover]="false">
        <ff-card
          size="compact"
          dismissible
          href="sidebar"
          label="Sidebar is here — new in Fluid Functionalism"
          [class]="cardClass()"
          (dismiss)="dismiss.emit()"
        >
          <!-- The icon row drops the card's 60px floor and tightens its
               inset; there's one line of text beside the icon. -->
          <ff-card-media icon="panel-left" [size]="18" />
          <div ffCardHeader class="gap-[2px] py-3">
            <span ffCardTitle class="truncate">Sidebar is here</span>
            <p ffCardDescription [class]="descriptionClass">New in Fluid Functionalism</p>
          </div>
        </ff-card>
      </ff-card-group>
    } @else {
      <ff-card
        size="compact"
        dismissible
        href="sidebar"
        label="Sidebar is here — new in Fluid Functionalism"
        [class]="cardClass()"
        (dismiss)="dismiss.emit()"
      >
        <!-- Capped so a drag-resized rail doesn't grow the banner with it. -->
        <img ffCardImage [src]="banner" class="aspect-[2/1] max-h-28" />
        <div ffCardHeader class="gap-0 pt-3">
          <span ffCardTitle class="truncate">Sidebar is here</span>
          <p ffCardDescription [class]="descriptionClass">New in Fluid Functionalism</p>
        </div>
      </ff-card>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarPlaygroundCallout {
  readonly variant = input.required<'inline' | 'banner'>();
  readonly dismiss = output<void>();

  private readonly substrate = injectSurface();
  private readonly shape = injectShape();
  protected readonly banner = MESH_BANNER;
  protected readonly descriptionClass =
    'truncate text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)]';
  protected readonly cardClass = computed(() => {
    const level = Math.min(this.substrate() + 1, 8);
    return `${this.shape().container} overflow-hidden transition-[background-color,box-shadow] duration-80 ${surfaceClasses(
      level,
      2,
    )} ${surfaceHoverClasses(level + 1, 3)} shadow-[var(--shadow-2-inset)] hover:shadow-[var(--shadow-3-inset)]${
      this.variant() === 'inline' ? ' min-h-0 pl-2.5' : ''
    }`;
  });
}

/** One level's row actions: a tooltipped action, or the overflow menu (a
 *  dropdown whose 240px content matches the header/footer popups, so every
 *  menu in the sidebar reads as one family).
 *
 * `clustered` renders the `ffSidebarMenuActions` wrapper in here rather than
 * around this component: the cluster measures its own content to register the
 * row's gutter, and a content query never crosses a component boundary. */
@Component({
  selector: 'app-sidebar-playground-actions',
  imports: [
    DropdownMenu,
    DropdownTrigger,
    DropdownContent,
    MenuItem,
    Tooltip,
    Icon,
    SidebarMenuAction,
  ],
  host: { style: 'display: contents' },
  template: `
    @if (clustered()) {
      <div ffSidebarMenuActions showOnHover>
        @for (action of actions(); track action.icon) {
          @if (action.menu) {
            <ff-dropdown-menu>
              <button ffSidebarMenuAction ffDropdownTrigger [attr.aria-label]="action.label">
                <ff-icon [name]="action.icon" />
              </button>
              <ff-dropdown-content class="min-w-0 w-[240px]" align="start" [sideOffset]="4">
                <ff-menu-item [index]="0" icon="pencil" label="Rename" />
                <ff-menu-item [index]="1" icon="link" label="Share" />
                <ff-menu-item [index]="2" icon="x" label="Delete" />
              </ff-dropdown-content>
            </ff-dropdown-menu>
          } @else {
            <ff-tooltip [content]="action.label" side="top">
              <button ffSidebarMenuAction [attr.aria-label]="action.label">
                <ff-icon [name]="action.icon" />
              </button>
            </ff-tooltip>
          }
        }
      </div>
    } @else {
      @for (action of actions(); track action.icon) {
        @if (action.menu) {
          <ff-dropdown-menu>
            <button ffSidebarMenuAction showOnHover ffDropdownTrigger [attr.aria-label]="action.label">
              <ff-icon [name]="action.icon" />
            </button>
            <ff-dropdown-content class="min-w-0 w-[240px]" align="start" [sideOffset]="4">
              <ff-menu-item [index]="0" icon="pencil" label="Rename" />
              <ff-menu-item [index]="1" icon="link" label="Share" />
              <ff-menu-item [index]="2" icon="x" label="Delete" />
            </ff-dropdown-content>
          </ff-dropdown-menu>
        } @else {
          <ff-tooltip [content]="action.label" side="top">
            <button ffSidebarMenuAction showOnHover [attr.aria-label]="action.label">
              <ff-icon [name]="action.icon" />
            </button>
          </ff-tooltip>
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarPlaygroundActions {
  readonly actions = input.required<readonly RowAction[]>();
  /** A lone action reveals on the row's hover; inside the cluster the row
   *  owns the reveal, so the actions themselves stay in flow. */
  readonly clustered = input(true, { transform: booleanAttribute });
}

@Component({
  selector: 'app-sidebar-playground',
  imports: [
    PlaygroundLayout,
    ComponentPreview,
    PlaygroundPanel,
    PlaySection,
    PlayField,
    PlaySelect,
    PlayDivider,
    Switch,
    GetCodeDialog,
    SidebarPlaygroundCallout,
    SidebarPlaygroundActions,
    SidebarDemoCalloutStack,
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarInset,
    SidebarInsetTopbar,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupActions,
    SidebarGroupAction,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuBadge,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    SidebarMenuSkeleton,
    SidebarSearchField,
    SidebarWorkspaceHeader,
    WorkspaceTile,
    SidebarBlockMenu,
    SidebarUserFooter,
    MenuItem,
    Tooltip,
    Button,
    Icon,
    SpringRotate,
  ],
  templateUrl: './sidebar-playground.html',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarPlayground {
  protected readonly state = signal<PlayState>(DEFAULT_STATE);
  // Nested rows start open, so switching a level on shows the tree at once.
  private readonly closedRows = signal<Record<string, boolean>>({});
  // Which row the user last clicked — leaf and sub rows are selectable, so the
  // active highlight follows the pointer around the preview. Null falls back to
  // the demo data's own active row.
  private readonly selected = signal<string | null>(null);

  private readonly shape = injectShape();
  private readonly size = injectSize();
  private readonly globals = injectPresetGlobals();

  protected readonly playSwitch = PLAY_SWITCH;
  protected readonly shellHeight = SHELL_HEIGHT;
  protected readonly presetDef = SIDEBAR_PRESET_DEF;
  protected readonly propLines = SIDEBAR_PROP_LINES;
  protected readonly tiles = WORKSPACE_TILES;
  protected readonly avatar = AVATAR_SRC;
  protected readonly searchShortcut = SEARCH_SHORTCUT;
  protected readonly description =
    'A sidebar built from composable parts. Drag its edge to resize, collapse it away, and on mobile it becomes a drawer.';
  protected readonly popupClass = SIDEBAR_MENU_POPUP;
  protected readonly l2Rows = L2_ROWS;
  protected readonly tipKbd =
    '-my-1 flex h-4 min-w-4 items-center justify-center rounded border border-background/30 px-1 font-sans text-[10px] text-background';

  // The playground's own settings, as the site holds them: shape and size ride
  // along in the preset code and in the generated `provideFluid()` call.
  protected readonly presetCode = computed(() => encodeSidebarPreset({ ...this.state(), ...this.globals() }));
  protected readonly code = computed(() => buildSidebarPlaygroundCode(this.state(), this.globals()));

  // ── Derived preview state ──
  protected readonly loading = computed(() => this.state().state === 'loading');
  protected readonly headerHorizontal = computed(() => this.state().headerStack === 'horizontal');
  protected readonly footerHorizontal = computed(() => this.state().footerStack === 'horizontal');
  protected readonly headerActionSet = computed(() => HEADER_ACTION_SET.slice(0, this.state().headerActions));
  // Only icon menus nest; a thread row is a leaf.
  protected readonly l1CanNest = computed(() => this.state().l1Primary === 'menu');
  protected readonly l1Children = computed(() => this.l1CanNest() && this.state().l1Children);
  protected readonly footerActionSet = computed(() => FOOTER_ACTION_SET.slice(0, this.state().footerActions));
  protected readonly sectionLabels = computed(() => SECTION_LABELS[this.state().l1Primary]);
  protected readonly groupActionSet = computed(() => GROUP_ACTION_SET.slice(0, this.state().sectionActions));
  protected readonly l1ActionSet = computed<readonly RowAction[]>(() => {
    const count = this.state().l1Actions;
    // `slice(-0)` returns the WHOLE set — zero means no actions.
    return count === 0 ? [] : ROW_ACTION_SET.slice(-count);
  });
  protected readonly l2ActionSet = computed<readonly RowAction[]>(() => {
    const count = this.state().l2Actions;
    return count === 0 ? [] : ROW_ACTION_SET.slice(-count);
  });
  protected readonly calloutVariant = computed<'inline' | 'banner'>(() =>
    this.state().footerCallout === 'banner' ? 'banner' : 'inline',
  );
  protected readonly designOptions = DESIGN_OPTIONS;
  protected readonly collapsedOptions = COLLAPSED_OPTIONS;
  protected readonly stateOptions = STATE_OPTIONS;
  protected readonly headerPrimaryOptions = HEADER_PRIMARY_OPTIONS;
  protected readonly headerStackOptions = HEADER_STACK_OPTIONS;
  protected readonly l1PrimaryOptions = L1_PRIMARY_OPTIONS;
  protected readonly footerPrimaryOptions = FOOTER_PRIMARY_OPTIONS;
  protected readonly footerStackOptions = FOOTER_STACK_OPTIONS;
  protected readonly calloutOptions = CALLOUT_OPTIONS;
  protected readonly count2Options = COUNT_OPTIONS_2;
  protected readonly count3Options = COUNT_OPTIONS_3;
  protected readonly headerActionCount = computed(() => String(this.state().headerActions));
  protected readonly sectionActionCount = computed(() => String(this.state().sectionActions));
  protected readonly l1ActionCount = computed(() => String(this.state().l1Actions));
  protected readonly l2ActionCount = computed(() => String(this.state().l2Actions));
  protected readonly footerActionCount = computed(() => String(this.state().footerActions));

  /** The icon ladder step the chevron rides. */
  protected readonly iconSize = computed(() => this.size().icon);

  /** Row actions for one level: a single action uses the canonical part, more
   *  than one goes through the cluster that owns the row's gutter. */
  protected readonly l1Single = computed(() => this.state().l1Actions === 1);
  protected readonly l2Single = computed(() => this.state().l2Actions === 1);

  /** A promo card with no rows under it has nothing to be spaced from, so the
   *  footer drops its bottom padding and the card sits flush on the edge.
   *  Flush only in the inset variant: there the rail has no card edge of its
   *  own, so the callout can land on the bottom. */
  protected readonly calloutOnlyFooter = computed(
    () =>
      this.state().footerCallout !== 'none' &&
      this.state().footerPrimary === 'none' &&
      this.footerActionSet().length === 0 &&
      this.state().design === 'inset',
  );

  /** `SIDEBAR_THREADS` / `SIDEBAR_ITEMS`, keyed per section. */
  protected readonly rows = computed<readonly PlayRow[][]>(() => {
    const source: readonly PlayRow[] =
      this.state().l1Primary === 'threads'
        ? SIDEBAR_THREADS.map((thread) => ({
            key: thread.label,
            label: thread.label,
            badge: thread.badge,
            status: thread.status,
          }))
        : SIDEBAR_ITEMS.map((item) => ({
            key: item.label,
            label: item.label,
            badge: item.badge,
            icon: item.icon,
            active: item.active,
          }));
    // Two sections of three and two rows; loading shows the first four alone.
    return [
      source.slice(0, 3).map((row) => ({ ...row, key: `0/${row.key}` })),
      source.slice(3, 5).map((row) => ({ ...row, key: `1/${row.key}` })),
    ];
  });

  protected readonly skeletonRows = computed(() =>
    (this.state().l1Primary === 'threads' ? SIDEBAR_THREADS : SIDEBAR_ITEMS).slice(0, 4),
  );

  constructor() {
    // The rail's configuration bit-packs into a stateless code. A pasted
    // `?preset=` hydrates the rail once; the address bar then tracks the
    // configuration.
    usePresetUrl(this.presetCode, computed(() => SIDEBAR_DEFAULT_CODE), (raw) => {
      const result = decodeSidebarPreset(raw);
      if (result.ok) this.state.set(playStateOf(result.preset));
    });
  }

  protected set(key: keyof PlayState, value: string | number | boolean) {
    this.state.update((prev) => ({ ...prev, [key]: value }) as PlayState);
  }

  /** Count controls hand back the option's string value. */
  protected setCount(
    key: 'headerActions' | 'sectionActions' | 'l1Actions' | 'l2Actions' | 'footerActions',
    value: string,
  ) {
    this.set(key, Number(value));
  }

  protected isRowOpen(key: string) {
    return !this.closedRows()[key];
  }

  protected toggleRow(key: string) {
    this.closedRows.update((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  protected selectRow(key: string) {
    this.selected.set(key);
  }

  /** Click a leaf to select it; until the first click the demo data's own
   *  active row holds the highlight. */
  protected isActive(row: PlayRow) {
    const selected = this.selected();
    return selected ? selected === row.key : row.active;
  }

  /** `status="active"` implies row-active by design, so once the user selects
   *  a different thread the streaming one demotes to "unread" — the dot stays
   *  filled, but the highlight follows the selection alone. */
  protected statusOf(row: PlayRow) {
    const selected = this.selected();
    return row.status === 'active' && selected && selected !== row.key ? 'unread' : row.status;
  }

  protected subKey(parentKey: string, label: string) {
    return `${parentKey}/${label}`;
  }

  /** Same treatment as a collapsible section label: while the row is open the
   *  chevron waits for hover, and once collapsed it stays put as the cue to
   *  reopen. */
  protected chevronClass(open: boolean) {
    return `text-muted-foreground transition-opacity duration-80 ${
      open ? 'opacity-0 group-hover/parent-row:opacity-100 group-focus-within/parent-row:opacity-100' : 'opacity-100'
    }`;
  }

  /** Selection keys are row labels, which differ between the two primary
   *  element modes — switching clears it. */
  protected selectedReset() {
    this.selected.set(null);
  }

  protected randomize() {
    // Selection keys are row labels, which differ between the two primary
    // element modes — clear it so the data's own active row takes over.
    this.selected.set(null);
    this.state.update((prev) => ({
      // `state` is deliberately not rolled: shuffling is for trying shapes,
      // and landing on closed or loading hides the very thing being shuffled.
      state: prev.state,
      design: pick(['sidebar', 'floating', 'inset'] as const),
      collapsedBehavior: pick(['none', 'none', 'hover', 'click'] as const),
      headerPrimary: pick(['dropdown', 'dropdown', 'logo', 'none'] as const),
      headerStack: pick(['horizontal', 'vertical'] as const),
      headerActions: pick([0, 1, 2, 2] as const),
      sectionsCollapsible: Math.random() > 0.25,
      sectionActions: pick([0, 1, 2, 3] as const),
      l1Primary: pick(['threads', 'menu'] as const),
      l1Children: Math.random() > 0.5,
      l1Actions: pick([0, 1, 1, 2, 3] as const),
      l1Badges: Math.random() > 0.5,
      l2Icon: Math.random() > 0.4,
      l2Actions: pick([0, 1, 2] as const),
      l2Badges: Math.random() > 0.5,
      footerPrimary: pick(['dropdown', 'dropdown', 'none'] as const),
      footerStack: pick(['horizontal', 'horizontal', 'vertical'] as const),
      footerActions: pick([0, 1, 2, 2] as const),
      footerCallout: pick(['none', 'inline', 'banner', 'banner'] as const),
      footerCalloutStacked: Math.random() > 0.65,
    } as PlayState));
  }

  /** The provider's open state, as the "State" control drives it. */
  protected readonly open = computed(() => this.state().state !== 'closed');
}
