// Demo 5 of /docs/fluid-hover, ported from app/docs/fluid-hover/demos.tsx
// (`ListsSidebar` / `ListsCallouts` / `ListsDemo`): when to split a list.
//
// A sidebar with the three cases a real nav has: a parent with children, a
// disabled row, and a second group behind a divider. One menu is one list: the
// highlight glides into the children and skips the disabled row. The second
// group is its own list: the highlight stops at the divider and a new one
// starts on the other side.
//
// The arrows are measured against the real rows on mount and on resize, so they
// land where the rows are rather than where a hand-tuned number says they
// should be.
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
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  Icon,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  cn,
  enterTransition,
  fontWeights,
  injectAnimateFluid,
  injectShape,
  spring,
} from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { listsCode } from './fluid-hover-snippets';

/** A chevron's rotation as React's `<motion.span animate={{ rotate }}
 *  transition={spring.fast}>`: written at mount, sprung on change. */
@Directive({ selector: '[appSpringRotate]' })
class SpringRotate {
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

@Component({
  selector: 'app-lists-sidebar',
  imports: [
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    SidebarSeparator,
    Icon,
    SpringRotate,
  ],
  host: { style: 'display: contents' },
  template: `
    <ff-sidebar-provider [persist]="false" [shortcut]="null" width="100%" class="h-full min-h-0">
      <ff-sidebar collapsible="none" [bordered]="false" class="h-full">
        <ff-sidebar-content class="pt-1">
          <ff-sidebar-group>
            <ff-sidebar-group-label>Workspace</ff-sidebar-group-label>
            <ul ffSidebarMenu>
              <li ffSidebarMenuItem>
                <!-- The parent only expands and collapses; the chevron rides
                     the label's trailing edge and turns 90° while open. -->
                <button
                  ffSidebarMenuButton
                  class="group/parent-row"
                  style="--row-gutter: var(--row-gutter-hover)"
                  icon="message-circle"
                  [attr.aria-expanded]="open()"
                  (click)="open.update((v) => !v)"
                >
                  Chat
                  <span class="ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center">
                    <span class="inline-flex" [appSpringRotate]="open() ? 90 : 0">
                      <ff-icon
                        name="chevron-right"
                        [size]="16"
                        [strokeWidth]="1.5"
                        [class]="chevronClass()"
                      />
                    </span>
                  </span>
                </button>
                <ff-sidebar-menu-sub [open]="open()">
                  @for (label of children; track label) {
                    <li ffSidebarMenuSubItem>
                      <a
                        ffSidebarMenuSubButton
                        href="#"
                        [isActive]="current() === label"
                        (click)="$event.preventDefault(); current.set(label)"
                      >
                        {{ label }}
                      </a>
                    </li>
                  }
                </ff-sidebar-menu-sub>
              </li>
              <li ffSidebarMenuItem>
                <button ffSidebarMenuButton icon="brain" [isActive]="current() === 'Agents'" (click)="current.set('Agents')">
                  Agents
                </button>
              </li>
              <li ffSidebarMenuItem>
                <button ffSidebarMenuButton icon="square-library" disabled>Knowledge</button>
              </li>
              <li ffSidebarMenuItem>
                <button ffSidebarMenuButton icon="play" [isActive]="current() === 'Runs'" (click)="current.set('Runs')">
                  Runs
                </button>
              </li>
            </ul>
          </ff-sidebar-group>
          <div ffSidebarSeparator></div>
          <ff-sidebar-group>
            <ff-sidebar-group-label>Account</ff-sidebar-group-label>
            <ul ffSidebarMenu>
              <li ffSidebarMenuItem>
                <button ffSidebarMenuButton icon="user" [isActive]="current() === 'Profile'" (click)="current.set('Profile')">
                  Profile
                </button>
              </li>
              <li ffSidebarMenuItem>
                <button ffSidebarMenuButton icon="arrow-left" [isActive]="current() === 'Log out'" (click)="current.set('Log out')">
                  Log out
                </button>
              </li>
            </ul>
          </ff-sidebar-group>
        </ff-sidebar-content>
      </ff-sidebar>
    </ff-sidebar-provider>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ListsSidebar {
  protected readonly open = signal(true);
  protected readonly current = signal('Today');
  protected readonly children = ['Today', 'Yesterday'];
  protected readonly chevronClass = computed(
    () =>
      `text-muted-foreground transition-opacity duration-80 ${
        this.open()
          ? 'opacity-0 group-hover/parent-row:opacity-100 group-focus-within/parent-row:opacity-100'
          : 'opacity-100'
      }`,
  );
}

// Three callouts around the sidebar, one per case.
const CANVAS_W = 640;
const CANVAS_H = 400;
const SIDEBAR_LEFT = 200;
const SIDEBAR_TOP = 16;
const SIDEBAR_W = 260;
const LABEL_W = 140;
/** Arrows stop this far outside the sidebar frame, never inside it. */
const ARROW_GAP = 6;
const ANNOTATION_BLUE = 'var(--focus-ring, #6B97FF)';

interface Callout {
  key: string;
  title: string;
  line: string;
  color: string;
  /** Which side of the sidebar the label sits on. Its vertical position follows
   *  the target, so the arrow is short and level. */
  side: 'left' | 'right';
  /** Row labels the arrow points at: the arrow ends level with the mean of
   *  their centres, just outside the frame. */
  targets: string[];
}

const CALLOUTS: Callout[] = [
  {
    key: 'one',
    title: '1 list',
    line: 'Children ride with their parent.',
    color: ANNOTATION_BLUE,
    side: 'left',
    targets: ['Today', 'Yesterday'],
  },
  {
    key: 'skip',
    title: 'Skipped',
    line: 'Disabled rows are passed over.',
    color: ANNOTATION_BLUE,
    side: 'right',
    targets: ['Knowledge'],
  },
  {
    key: 'two',
    title: 'New list',
    line: 'A divider means a different kind.',
    color: ANNOTATION_BLUE,
    side: 'left',
    targets: ['Profile', 'Log out'],
  },
];

const LABEL_LEFT = { left: 14, right: SIDEBAR_LEFT + SIDEBAR_W + 40 } as const;

/** A quadratic curve from `s` to `e`, bowed by `curve` px off the chord. */
function arrowPath(s: { x: number; y: number }, e: { x: number; y: number }, curve: number) {
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = (s.x + e.x) / 2 + (-dy / len) * curve;
  const cy = (s.y + e.y) / 2 + (dx / len) * curve;
  const f = (n: number) => Math.round(n * 10) / 10;
  return `M${f(s.x)},${f(s.y)} Q${f(cx)},${f(cy)} ${f(e.x)},${f(e.y)}`;
}

/** The row's label, with the ghost-span mirror collapsed back to one copy. */
function rowLabel(el: Element) {
  return el.textContent?.replace(/(.+)\1/, '$1').trim() ?? '';
}

interface CalloutEnd {
  y: number;
  edge: number;
}

@Component({
  selector: 'app-lists-demo',
  imports: [ComponentPreview, ListsSidebar],
  host: { style: 'display: contents' },
  template: `
    <app-component-preview [code]="code" padding="none" [inspectRulers]="false">
      <div class="w-full overflow-x-auto">
        <div
          #canvas
          class="relative mx-auto shrink-0"
          [style.width.px]="canvasW"
          [style.height.px]="canvasH"
        >
          <div
            [class]="frameClass()"
            [style.left.px]="sidebarLeft"
            [style.top.px]="sidebarTop"
            [style.width.px]="sidebarW"
          >
            <app-lists-sidebar />
          </div>

          <svg
            class="pointer-events-none absolute inset-0"
            [attr.width]="canvasW"
            [attr.height]="canvasH"
            [attr.viewBox]="'0 0 ' + canvasW + ' ' + canvasH"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="ff-lists-arrow"
                viewBox="0 0 12 12"
                markerWidth="12"
                markerHeight="12"
                refX="8.5"
                refY="6"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path
                  d="M3,2.5 L8.5,6 L3,9.5"
                  fill="none"
                  stroke="context-stroke"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </marker>
            </defs>
            @for (arrow of arrows(); track arrow.key) {
              <path
                [attr.d]="arrow.d"
                [attr.stroke]="arrow.color"
                stroke-width="1.5"
                stroke-linecap="round"
                fill="none"
                marker-end="url(#ff-lists-arrow)"
              />
            }
          </svg>

          @for (callout of callouts; track callout.key) {
            <div
              [attr.data-callout]="callout.key"
              class="pointer-events-none absolute flex flex-col items-start gap-0.5"
              [style.left.px]="labelLeft[callout.side]"
              style="width: max-content"
              [style.max-width.px]="labelW"
              [style.top.px]="(ends()[callout.key]?.y ?? 0) - 9"
              [style.visibility]="ends()[callout.key] === undefined ? 'hidden' : null"
            >
              <span class="text-site-caption text-foreground" [style.font-variation-settings]="semibold">{{
                callout.title
              }}</span>
              <span class="text-balance text-[11px] leading-3.5 text-muted-foreground">{{ callout.line }}</span>
            </div>
          }
        </div>
      </div>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListsDemo {
  protected readonly code = listsCode;
  protected readonly callouts = CALLOUTS;
  protected readonly semibold = fontWeights.semibold;
  protected readonly canvasW = CANVAS_W;
  protected readonly canvasH = CANVAS_H;
  protected readonly sidebarLeft = SIDEBAR_LEFT;
  protected readonly sidebarTop = SIDEBAR_TOP;
  protected readonly sidebarW = SIDEBAR_W;
  protected readonly labelW = LABEL_W;
  protected readonly labelLeft = LABEL_LEFT;

  /** Per callout: the y the arrow points at and the label's near text edge,
   *  both in canvas space, so the arrow starts a few px past the text. */
  protected readonly ends = signal<Record<string, CalloutEnd>>({});

  protected readonly arrows = computed(() => {
    const ends = this.ends();
    return CALLOUTS.flatMap((callout) => {
      const end = ends[callout.key];
      if (!end) return [];
      // Level with the target: from just past the label's text to just outside
      // the frame, with a small bow so it reads as drawn.
      const start =
        callout.side === 'left' ? { x: end.edge + 6, y: end.y } : { x: end.edge - 6, y: end.y };
      const target =
        callout.side === 'left'
          ? { x: SIDEBAR_LEFT - ARROW_GAP, y: end.y }
          : { x: SIDEBAR_LEFT + SIDEBAR_W + ARROW_GAP, y: end.y };
      return [
        {
          key: callout.key,
          color: callout.color,
          d: arrowPath(start, target, callout.side === 'left' ? -6 : 6),
        },
      ];
    });
  });

  private readonly shape = injectShape();
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvas = viewChild<ElementRef<HTMLElement>>('canvas');

  protected readonly frameClass = computed(() =>
    cn('absolute h-[368px] overflow-hidden border border-border/60 bg-background', this.shape().container),
  );

  constructor() {
    afterNextRender(() => {
      const canvas = this.canvas()?.nativeElement;
      if (!canvas) return;
      const measure = () => {
        const box = canvas.getBoundingClientRect();
        const buttons = [
          ...canvas.querySelectorAll<HTMLElement>('[data-sidebar="menu-button"], [data-sidebar="menu-sub-button"]'),
        ];
        const next: Record<string, CalloutEnd> = {};
        for (const callout of CALLOUTS) {
          const rects = callout.targets
            .map((label) => buttons.find((button) => rowLabel(button) === label))
            .filter((button): button is HTMLElement => !!button)
            .map((button) => button.getBoundingClientRect());
          if (rects.length === 0) continue;
          const y = rects.reduce((a, r) => a + r.top + r.height / 2, 0) / rects.length - box.top;
          // The glyphs' own extent, not any box: a flex item stretches to the
          // label's max width even when its balanced lines are shorter, so read
          // the line boxes of the text itself through a Range.
          const label = canvas.querySelector<HTMLElement>(`[data-callout="${callout.key}"]`);
          const lines: DOMRect[] = [];
          for (const el of label ? [...label.children] : []) {
            const range = document.createRange();
            range.selectNodeContents(el);
            lines.push(...range.getClientRects());
          }
          const edge =
            lines.length > 0
              ? (callout.side === 'left'
                  ? Math.max(...lines.map((r) => r.right))
                  : Math.min(...lines.map((r) => r.left))) - box.left
              : callout.side === 'left'
                ? LABEL_LEFT.left + LABEL_W
                : LABEL_LEFT.right;
          next[callout.key] = { y, edge };
        }
        this.ends.set(next);
      };
      measure();
      // The sidebar mounts its rows after the first render and the canvas
      // itself never resizes, so watch the subtree for the rows arriving and
      // the rows for size changes (the sub-tree collapsing, a size step flip).
      const mo = new MutationObserver(measure);
      mo.observe(canvas, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] });
      const ro = new ResizeObserver(measure);
      ro.observe(canvas);
      for (const el of canvas.querySelectorAll('[data-sidebar="menu"]')) ro.observe(el);
      this.destroyRef.onDestroy(() => {
        mo.disconnect();
        ro.disconnect();
      });
    });
  }
}
