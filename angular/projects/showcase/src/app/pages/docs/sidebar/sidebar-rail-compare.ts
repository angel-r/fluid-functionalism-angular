import {
  ChangeDetectionStrategy,
  Component,
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
  Icon,
  type IconName,
  ReducedMotion,
  enterTransition,
  exitTransition,
  fontWeights,
  injectAnimateFluid,
  injectShape,
  injectSurface,
  spring,
  surfaceClasses,
} from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview, PreviewActionButton } from '../../../docs-kit/component-preview';
import { AI_WORKSPACE } from './sidebar-data';
import { NO_ICON_RAIL_CODE } from './sidebar-snippets';

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
  imports: [Icon, RailPresence, RailFakeCursor, RailCompareLabel],
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

  /** Playback is held by the demo shell, which projects the button into the
   *  preview's header (`app-preview-action-button`). */
  readonly paused = input(false);
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

/** The comparison's frame: the play/pause control is projected into the
 *  preview's header (the slot the reference's `playbackButton` filled), so the
 *  loop can be held on any frame. */
@Component({
  selector: 'app-sidebar-demo-icon-rail-demo',
  imports: [ComponentPreview, PreviewActionButton, SidebarDemoIconRail],
  host: { style: 'display: contents' },
  template: `
    <app-component-preview [code]="code" padding="responsive" [inspectRulers]="false">
      <app-preview-action-button
        [icon]="paused() ? 'play' : 'pause'"
        [tooltip]="paused() ? 'Play' : 'Pause'"
        (pressed)="paused.update((value) => !value)"
      />
      <app-sidebar-demo-icon-rail [paused]="paused()" />
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoIconRailDemo {
  protected readonly code = NO_ICON_RAIL_CODE;
  protected readonly paused = signal(false);
}
