import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { inView } from 'motion';
import type { AnimationOptions, DOMKeyframesDefinition } from 'motion';
import {
  Button,
  DropdownContent,
  DropdownMenu,
  DropdownTrigger,
  Icon,
  type IconName,
  MenuItem,
  ReducedMotion,
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
  Tooltip,
  enterTransition,
  exitTransition,
  fontWeights,
  injectAnimateFluid,
  injectShape,
  injectSurface,
  spring,
  surfaceClasses,
} from '@angel-r/fluid-functionalism-angular';
import { SidebarDemoTopbar } from './sidebar-demo-parts';
import { AI_WORKSPACE } from './sidebar-demo-data';

// ---------------------------------------------------------------------------
// Shared motion pieces: React's `<motion.span animate>` (FakeCursor) and
// `<AnimatePresence>` children (tooltip, peek card), on vanilla `motion`.
// ---------------------------------------------------------------------------

/** Keyframes plus the transition they run with. */
interface Pose {
  readonly to: DOMKeyframesDefinition;
  readonly transition: AnimationOptions;
}

/** Writes a pose's end values as inline styles — the frame React renders
 *  before an animation starts (`initial`). Only opacity and x are used here. */
function applyPose(el: HTMLElement, values: { opacity?: number; x?: number | string }) {
  if (values.opacity !== undefined) el.style.opacity = String(values.opacity);
  if (values.x !== undefined) {
    const x = typeof values.x === 'number' ? `${values.x}px` : values.x;
    el.style.transform = x === '0px' ? 'none' : `translateX(${x})`;
  }
}

/**
 * One AnimatePresence child: paints `initial` before the first frame, runs
 * `enter` once rendered, runs `exit` when `exiting` turns true and then emits
 * `exited` so the owner unmounts it. Turning `exiting` back off mid-exit
 * re-runs `enter` from wherever the exit left it, like a re-keyed child.
 */
@Directive({ selector: '[appRailPresence]' })
class RailPresence {
  readonly exiting = input(false, { alias: 'appRailPresence' });
  readonly initial = input.required<{ opacity?: number; x?: number | string }>();
  readonly enter = input.required<Pose>();
  readonly exit = input.required<Pose>();
  readonly exited = output<void>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly animate = injectAnimateFluid();

  constructor() {
    let mounted = false;
    let run: { stop(): void } | null = null;
    afterRenderEffect(() => {
      const exiting = this.exiting();
      untracked(() => {
        if (!mounted) {
          mounted = true;
          applyPose(this.el, this.initial());
        }
        run?.stop();
        const pose = exiting ? this.exit() : this.enter();
        const animation = this.animate(this.el, pose.to, pose.transition);
        run = animation;
        if (exiting) {
          animation.finished.then(() => {
            if (run === animation) this.exited.emit();
          });
        }
      });
    });
    inject(DestroyRef).onDestroy(() => run?.stop());
  }
}

/** React `FakeCursor`: `initial={false}` (placed, not animated, at mount),
 *  then every new point springs there on `spring.slow`. */
@Component({
  selector: 'app-rail-fake-cursor',
  host: {
    'aria-hidden': 'true',
    class: 'pointer-events-none absolute left-0 top-0 z-30',
  },
  template: `
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        d="m4 4 7.07 17 2.51-7.39L21 11.07z"
        stroke-width="1.5"
        stroke-linejoin="round"
        class="fill-foreground stroke-background"
      />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class RailFakeCursor {
  readonly x = input.required<number>();
  readonly y = input.required<number>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly animate = injectAnimateFluid();

  constructor() {
    let placed = false;
    afterRenderEffect(() => {
      const x = this.x();
      const y = this.y();
      untracked(() => {
        if (!placed) {
          placed = true;
          // Seed motion's values so the first spring starts from here.
          this.el.style.transform = `translateX(${x}px) translateY(${y}px)`;
          this.animate(this.el, { x, y }, { duration: 0 });
          return;
        }
        this.animate(this.el, { x, y }, enterTransition(spring.slow));
      });
    });
  }
}

/** React `CompareLabel`. */
@Component({
  selector: 'app-rail-compare-label',
  host: { class: 'text-site-caption text-muted-foreground text-center' },
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class RailCompareLabel {}

// ---------------------------------------------------------------------------
// Why no icon rail? — scripted comparison (React `IconRailVsPeekPreview` +
// `IconRailVsPeekDemo`)
// ---------------------------------------------------------------------------

/** One clock drives both panels so the contrast is the point: while the left
 *  cursor is still quizzing tooltips one icon at a time, the right cursor's
 *  single hover already brought the whole sidebar back. */
const RAIL_PHASES = ['rest', 'hover-0', 'hover-1', 'hover-2', 'hover-3', 'away'] as const;
type RailPhase = (typeof RAIL_PHASES)[number];
const RAIL_PHASE_MS: Record<RailPhase, number> = {
  rest: 900,
  'hover-0': 1600,
  'hover-1': 1600,
  'hover-2': 1600,
  'hover-3': 1600,
  away: 1500,
};

/** Two labeled sections of three — the peek shows them as-is; the rail has
 *  nowhere to put the labels, so between its groups all that survives is a
 *  divider. */
const RAIL_GROUPS: readonly {
  label: string;
  items: readonly { icon: IconName; label: string }[];
}[] = [
  {
    label: 'Workspace',
    items: [
      { icon: 'message-circle', label: 'Chat' },
      { icon: 'brain', label: 'Agents' },
      { icon: 'square-library', label: 'Knowledge' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: 'play', label: 'Runs' },
      { icon: 'star', label: 'Evals' },
      { icon: 'settings', label: 'Settings' },
    ],
  },
];
const RAIL_ITEMS = RAIL_GROUPS.flatMap((group) => group.items);

/** The cursor quizzes these rail indices — from the first item down and
 *  across the divider, where the section context is exactly what the rail
 *  can't show. */
const RAIL_HOVER_TARGETS = [0, 1, 2, 3] as const;

/* Geometry the cursors aim at: the rail opens with the size-6 workspace tile
   (mb-1), so its size-8 icons start at y=40 in a gap-1 column (centers 36px
   apart, first at y=56); the divider between groups (my-1 h-px, plus the
   column gap on both sides) pushes the second group down 13px. The peek
   trigger is size-7 inset pl-3.5 pt-3.5 into the corner (center at 28,28). */
const railIconCenterY = (index: number) => (index < 3 ? 56 + 36 * index : 177 + 36 * (index - 3));

/** A presence entry: `id` keys the DOM node, `key` is what React keys on. */
interface PresenceEntry {
  readonly id: number;
  readonly key: number;
  readonly exiting: boolean;
}

/** AnimatePresence bookkeeping for one keyed slot: `show(key)` mounts it (or
 *  revives it mid-exit), `show(null)` sends whatever is shown out. */
function presenceSlot() {
  let nextId = 0;
  const entries = signal<readonly PresenceEntry[]>([]);
  return {
    entries: entries.asReadonly(),
    show(key: number | null) {
      entries.update((list) => {
        const revived = key === null ? undefined : list.find((e) => e.key === key);
        const next = list.map((e) =>
          e === revived ? { ...e, exiting: false } : e.exiting ? e : { ...e, exiting: true },
        );
        return key !== null && !revived ? [...next, { id: nextId++, key, exiting: false }] : next;
      });
    },
    remove(id: number) {
      entries.update((list) => list.filter((e) => e.id !== id || !e.exiting));
    },
  };
}

@Component({
  selector: 'app-sidebar-demo-icon-rail',
  imports: [Icon, Tooltip, RailPresence, RailFakeCursor, RailCompareLabel],
  // Transparent host: the comparison is the stage's flex item, like React's.
  host: { style: 'display: contents' },
  template: `
    <div #container class="flex w-full flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
      <div class="flex w-full min-w-0 max-w-[340px] flex-col gap-2">
        <div [class]="panelClass()">
          <div class="absolute inset-y-0 left-0 flex w-11 flex-col items-center gap-1 border-r border-border/60 pt-2">
            <span aria-hidden="true" [class]="railTileClass()" [style.font-variation-settings]="semibold">A</span>
            @for (group of groups; track group.label; let g = $index) {
              <!-- The section label has no icon to shrink to — all that's
                   left of it is this line. -->
              @if (g > 0) {
                <span aria-hidden="true" class="my-1 h-px w-6 bg-border"></span>
              }
              @for (item of group.items; track item.label; let i = $index) {
                <span
                  [class]="
                    'flex size-8 items-center justify-center rounded-lg transition-colors duration-80 ' +
                    (hoverIndex() === g * 3 + i ? 'bg-hover text-foreground' : 'text-muted-foreground')
                  "
                >
                  <ff-icon [name]="item.icon" [size]="16" [strokeWidth]="1.5" />
                </span>
              }
            }
          </div>
          <!-- The tooltip arrives late on purpose — the hover-and-wait IS the cost. -->
          @for (tip of tips.entries(); track tip.id) {
            <span
              class="absolute z-20 rounded-md bg-foreground px-2 py-1 text-[11px] leading-none text-background"
              [style.left.px]="52"
              [style.top.px]="iconCenterY(tip.key) - 10"
              [appRailPresence]="tip.exiting"
              [initial]="tipInitial"
              [enter]="tipEnter()"
              [exit]="tipExit"
              (exited)="tips.remove(tip.id)"
            >
              {{ items[tip.key].label }}
            </span>
          }
          @if (!reduced()) {
            <app-rail-fake-cursor
              [x]="hoverIndex() !== null ? 20 : 210"
              [y]="hoverIndex() !== null ? iconCenterY(hoverIndex()!) + 2 : 260"
            />
          }
        </div>
        <app-rail-compare-label>
          <span aria-hidden="true">❌</span> Icon rail: six glyphs, one tooltip at a time
        </app-rail-compare-label>
      </div>

      <div class="flex w-full min-w-0 max-w-[340px] flex-col gap-2">
        <div [class]="panelClass()">
          <!-- All the chrome a collapsed sidebar leaves behind: the trigger,
               inset 14px into the corner. Hover shows only while the cursor is
               actually on it — once the peek covers it, no state lingers
               behind. -->
          <div class="flex items-start pl-3.5 pt-3.5">
            <span
              [class]="
                'flex size-7 items-center justify-center rounded-md transition-colors duration-80 ' +
                (effective() === 'hover-0' ? 'bg-hover text-foreground' : 'text-muted-foreground')
              "
            >
              <ff-icon name="panel-left" [size]="16" [strokeWidth]="1.5" />
            </span>
          </div>
          <!-- The peek card wears the real overlay treatment: one surface
               above the substrate, overlay shadow, no border — same recipe as
               the component's own peek, in its floating-variant gutter. -->
          @for (peek of peeks.entries(); track peek.id) {
            <div
              [class]="peekClass()"
              [appRailPresence]="peek.exiting"
              [initial]="peekInitial"
              [enter]="peekEnter"
              [exit]="peekExit"
              (exited)="peeks.remove(peek.id)"
            >
              <div class="flex items-center gap-2 px-1 pb-1 pt-0.5">
                <span [class]="peekTileClass()" [style.font-variation-settings]="semibold">A</span>
                <span class="text-[12px] text-foreground" [style.font-variation-settings]="semibold">{{ workspace }}</span>
              </div>
              <!-- The same six items, with the structure the rail dropped:
                   both section labels, shown normally. -->
              @for (group of groups; track group.label; let g = $index) {
                <!-- Regular SidebarGroupLabel metrics: h-8, px-2, 12px. -->
                <span class="flex h-8 shrink-0 items-center px-2 text-[12px] text-muted-foreground">{{ group.label }}</span>
                @for (item of group.items; track item.label; let i = $index) {
                  <div [class]="'flex h-7 shrink-0 items-center gap-2 rounded-lg px-2 ' + (g === 0 && i === 0 ? 'bg-active' : '')">
                    <span class="text-muted-foreground">
                      <ff-icon [name]="item.icon" [size]="14" [strokeWidth]="1.5" />
                    </span>
                    <span class="text-[12px] text-foreground">{{ item.label }}</span>
                    <!-- The active row keeps its menu action visible — one more
                         thing the rail has no room for. -->
                    @if (g === 0 && i === 0) {
                      <span class="ml-auto text-muted-foreground">
                        <ff-icon name="more-vertical" [size]="14" [strokeWidth]="1.5" />
                      </span>
                    }
                  </div>
                }
              }
            </div>
          }
          <!-- One hover on the trigger opens the peek; then the cursor is
               already picking a destination while the other panel is still
               waiting on tooltips. -->
          @if (!reduced()) {
            <app-rail-fake-cursor
              [x]="effective() === 'hover-0' ? 26 : engaged() ? 72 : 210"
              [y]="effective() === 'hover-0' ? 26 : engaged() ? 90 : 260"
            />
          }
        </div>
        <app-rail-compare-label>
          <span aria-hidden="true">✅</span> Peek on hover: the whole sidebar, one hover
        </app-rail-compare-label>
      </div>
    </div>

    <!-- The docs keep the play/pause control in the preview header, outside
         the stage: here it is pinned to the stage's corner, out of the flow. -->
    <div class="absolute right-3 top-3 z-30">
      <ff-tooltip [content]="paused() ? 'Play' : 'Pause'" side="top">
        <button
          type="button"
          [class]="playbackClass()"
          [attr.aria-label]="paused() ? 'Play' : 'Pause'"
          (click)="paused.update((v) => !v)"
        >
          <ff-icon [name]="paused() ? 'play' : 'pause'" [size]="16" [strokeWidth]="1.5" />
        </button>
      </ff-tooltip>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoIconRail {
  protected readonly groups = RAIL_GROUPS;
  protected readonly items = RAIL_ITEMS;
  protected readonly workspace = AI_WORKSPACE;
  protected readonly semibold = fontWeights.semibold;
  protected readonly iconCenterY = railIconCenterY;

  private readonly shape = injectShape();
  // Same surface math as the real peek card: one step above the substrate,
  // wearing the overlay shadow.
  private readonly substrate = injectSurface();
  protected readonly reduced = inject(ReducedMotion).value;

  /** The docs' playback button (`playbackButton` on ComponentPreview). */
  protected readonly paused = signal(false);
  private readonly inView = signal(false);
  private readonly phase = signal<RailPhase>('rest');
  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');

  // Reduced motion holds the frame that tells the story — a tooltip mid-quiz
  // on the left, the peek open on the right — with no cursors and no loop.
  protected readonly effective = computed<RailPhase>(() => (this.reduced() ? 'hover-1' : this.phase()));
  protected readonly hoverIndex = computed<number | null>(() => {
    const effective = this.effective();
    return effective.startsWith('hover-') ? RAIL_HOVER_TARGETS[Number(effective.slice('hover-'.length))] : null;
  });
  protected readonly engaged = computed(() => this.hoverIndex() !== null);

  protected readonly tips = presenceSlot();
  protected readonly peeks = presenceSlot();

  protected readonly tipInitial = { opacity: 0, x: -4 };
  protected readonly tipEnter = computed<Pose>(() => ({
    to: { opacity: 1, x: 0 },
    transition: { ...enterTransition(spring.fast), delay: this.reduced() ? 0 : 0.5 },
  }));
  protected readonly tipExit: Pose = { to: { opacity: 0 }, transition: exitTransition(spring.fast) };
  protected readonly peekInitial = { x: '-108%' };
  protected readonly peekEnter: Pose = { to: { x: 0 }, transition: enterTransition(spring.moderate) };
  protected readonly peekExit: Pose = { to: { x: '-108%' }, transition: exitTransition(spring.moderate) };

  protected readonly panelClass = computed(
    () => `relative z-20 h-80 overflow-hidden border border-border bg-background ${this.shape().container}`,
  );
  private readonly tileRadius = computed(() => (this.shape().bgRadius >= 20 ? 'rounded-full' : 'rounded-md'));
  protected readonly railTileClass = computed(
    () =>
      `mb-1 flex size-6 shrink-0 items-center justify-center bg-foreground text-[11px] leading-3.5 text-background ${this.tileRadius()}`,
  );
  protected readonly peekTileClass = computed(
    () => `flex size-5 items-center justify-center bg-foreground text-[10px] text-background ${this.tileRadius()}`,
  );
  protected readonly peekClass = computed(
    () =>
      `absolute inset-y-2 left-2 z-10 flex w-44 flex-col overflow-hidden p-2 ${this.shape().container} ${surfaceClasses(
        Math.min(this.substrate() + 1, 8),
        3,
      )}`,
  );
  protected readonly playbackClass = computed(
    () =>
      `w-10 h-10 flex items-center justify-center ${this.shape().button} text-muted-foreground hover:text-foreground hover:bg-hover transition-colors duration-100 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]`,
  );

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    // Pausing clears the timer and freezes the current phase in place;
    // resuming picks the loop back up from that phase.
    effect((onCleanup) => {
      if (!this.inView() || this.reduced() || this.paused()) return;
      let index = RAIL_PHASES.indexOf(untracked(this.phase));
      let timer: ReturnType<typeof setTimeout>;
      const step = () => {
        const current = RAIL_PHASES[index];
        this.phase.set(current);
        timer = setTimeout(() => {
          index = (index + 1) % RAIL_PHASES.length;
          step();
        }, RAIL_PHASE_MS[current]);
      };
      untracked(step);
      onCleanup(() => clearTimeout(timer));
    });

    // AnimatePresence: the tooltip is keyed by the hovered index, the peek
    // card is one child present while engaged.
    effect(() => {
      const hoverIndex = this.hoverIndex();
      untracked(() => this.tips.show(hoverIndex));
    });
    effect(() => {
      const engaged = this.engaged();
      untracked(() => this.peeks.show(engaged ? 0 : null));
    });

    afterNextRender(() => {
      // The stage plays the docs' preview frame: it anchors the control.
      const stage = host.parentElement ?? host;
      stage.style.position = 'relative';
      // React `useInView(containerRef, { amount: 0.35 })`.
      const stop = inView(
        this.container().nativeElement,
        () => {
          this.inView.set(true);
          return () => this.inView.set(false);
        },
        { amount: 0.35 },
      );
      destroyRef.onDestroy(stop);
    });
  }
}

// ---------------------------------------------------------------------------
// Icon alignment — measured guides (React `AlignmentPreview`)
// ---------------------------------------------------------------------------

/** Thread rows: the same status-dot content the playground's first example
 *  shows (React SIDEBAR_THREADS from app/components/demo-data). */
const SIDEBAR_THREADS: readonly { label: string; badge?: string; status: 'active' | 'unread' | 'idle' }[] = [
  { label: 'Sidebar component height in demo', status: 'active', badge: '2' },
  { label: 'Sidebar component creation', status: 'idle', badge: '5' },
  { label: 'Dark mode token audit', badge: '3', status: 'unread' },
  { label: 'Scrollbar fade regression', status: 'idle', badge: '1' },
  { label: 'Registry deploy pipeline', status: 'unread', badge: '7' },
];

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
const FRAME = 'relative flex w-full overflow-hidden bg-background h-[560px] md:h-[640px]';

/** A 20px avatar standing in for the docs' /micka.png — the same data URI
 *  sidebar-demo-parts.ts uses. */
const AVATAR_SRC =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#e5e5e5"/>' +
      '<circle cx="20" cy="16" r="7" fill="#404040"/><path d="M6 40c1-8 7-12 14-12s13 4 14 12z" fill="#171717"/></svg>',
  );

// Workspace-switcher rows (React `WorkspaceMenuItems`): local copies of the
// letter tiles in sidebar-demo-parts.ts, which keeps them private.
@Directive()
abstract class AlignLetterTile {
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

@Component({ selector: 'app-align-tile-acme', template: LETTER_TILE_TEMPLATE, host: { style: 'display: contents' } })
class AcmeTile extends AlignLetterTile {
  protected readonly letter = 'A';
  protected readonly colors = 'bg-foreground text-background';
}

@Component({ selector: 'app-align-tile-fluid', template: LETTER_TILE_TEMPLATE, host: { style: 'display: contents' } })
class FluidTile extends AlignLetterTile {
  protected readonly letter = 'F';
  protected readonly colors = 'bg-muted-foreground text-background';
}

@Component({ selector: 'app-align-tile-personal', template: LETTER_TILE_TEMPLATE, host: { style: 'display: contents' } })
class PersonalTile extends AlignLetterTile {
  protected readonly letter = 'P';
  protected readonly colors = 'bg-muted-foreground/60 text-background';
}

/** React `DemoFooterUser`: a local twin of SidebarDemoFooterUser that carries
 *  the alignment demo's data-guide hooks (the shared one has none). */
@Component({
  selector: 'app-align-footer-user',
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
class AlignFooterUser {
  protected readonly avatar = AVATAR_SRC;
  protected readonly popupClass = SIDEBAR_MENU_POPUP;
}

/**
 * React's pinned row passes `style={{ "--row-gutter": "var(--row-gutter-hover)" }}`
 * over the gutter the row measured. An Angular `[style.--row-gutter]` binding
 * set back to null would drop the button's own host value too, so the pin
 * writes the inline property itself and puts the measured one back after.
 */
@Directive({ selector: '[appPinGutter]' })
class PinGutter {
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
    AlignFooterUser,
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
                  <app-align-footer-user />
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
  protected readonly tiles = { acme: AcmeTile, fluid: FluidTile, personal: PersonalTile };
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
