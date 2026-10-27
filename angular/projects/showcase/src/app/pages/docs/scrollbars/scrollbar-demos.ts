// ---------------------------------------------------------------------------
// The live demos of /docs/scrollbars, ported from app/docs/scrollbars/page.tsx.
//
// The problem pairs a plain `overflow-y-auto` list with a real ScrollArea,
// both driven by one scripted cursor (a pointer that slides in, scrolls and
// slides out). Over the plain list nothing shows; over ScrollArea the cursor's
// position is fed in as pointer events, so the scrollbar shows on hover and the
// fades follow the scroll. A real pointer inside the demo takes over; the
// script resumes when it leaves.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { animate, easeInOut, inView, motionValue, transform, type AnimationPlaybackControls } from 'motion';
import {
  ScrollArea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  injectShape,
} from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const RELEASES = Array.from({ length: 24 }, (_, i) => `v1.${23 - i}.0 — maintenance release`);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CITIES = [
  'Amsterdam', 'Berlin', 'Copenhagen', 'Dublin', 'Helsinki', 'Lisbon',
  'London', 'Madrid', 'Oslo', 'Paris', 'Prague', 'Stockholm',
  'Vienna', 'Warsaw', 'Zurich',
];

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const PROBLEM_CODE = `// ❌ Native overflow. On macOS the scrollbar is hidden until
// you happen to scroll, so the list looks like it just stops —
// and when it does show, it's the OS default.
<div class="h-56 w-64 overflow-y-auto border border-border">
  <div class="flex flex-col p-3">
    @for (release of releases; track release) {
      <div class="px-3 py-2 text-body text-foreground whitespace-nowrap">
        {{ release }}
      </div>
    }
  </div>
</div>

// ✅ ScrollArea. A scrollbar that stays discoverable on hover,
// plus a shadcn scroll-fade on the viewport so the edge dissolves
// when there's more below.
<ff-scroll-area viewportClass="scroll-fade" class="h-56 w-64 border border-border">
  <div class="flex flex-col p-3">
    @for (release of releases; track release) {
      <div class="px-3 py-2 text-body text-foreground whitespace-nowrap">
        {{ release }}
      </div>
    }
  </div>
</ff-scroll-area>`;

const HORIZONTAL_CODE = `import { ScrollArea } from "@angel-r/fluid-functionalism-angular";

// scroll-fade-x fades the left/right edges instead.
<ff-scroll-area orientation="horizontal" viewportClass="scroll-fade-x" class="w-full">
  <div class="flex gap-2 p-3 w-max">
    @for (month of months; track month) {
      <div
        class="flex items-center justify-center h-20 w-28 shrink-0 border border-border text-body text-foreground"
      >
        {{ month }}
      </div>
    }
  </div>
</ff-scroll-area>`;

const FADE_CODE = `/* theme.css — vendored from shadcn's scroll-fade utility.
   A mask dissolves the content toward the edges with more to
   scroll; a scroll-driven animation (elided here — see the full
   utility in the library's theme.css) keeps the true start/end
   edge crisp. */
.scroll-fade {
  --scroll-fade-size: 48px;
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 var(--scroll-fade-size),
    #000 calc(100% - var(--scroll-fade-size)),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 var(--scroll-fade-size),
    #000 calc(100% - var(--scroll-fade-size)),
    transparent 100%
  );
}

/* Apply it to any scroll container, or to a ScrollArea viewport. */
<ff-scroll-area viewportClass="scroll-fade" class="h-64 w-72 border border-border">
  <div class="flex flex-col p-3">
    @for (release of releases; track release) {
      <div class="px-3 py-2 text-body text-foreground whitespace-nowrap">
        {{ release }}
      </div>
    }
  </div>
</ff-scroll-area>`;

const TABLE_CODE = `import { ScrollArea, Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
  from "@angel-r/fluid-functionalism-angular";

// orientation="both" adds both scrollbars and the corner. w-max
// lets the table grow past the viewport instead of squeezing in.
<ff-scroll-area orientation="both" class="h-80 w-full">
  <ff-table class="w-max">
    <thead ffTableHeader>
      <tr ffTableRow>
        <th ffTableHead class="whitespace-nowrap">City</th>
        @for (m of months; track m) {
          <th ffTableHead class="text-right whitespace-nowrap">{{ m }}</th>
        }
      </tr>
    </thead>
    <tbody ffTableBody>
      @for (city of cities; track city; let r = $index) {
        <tr ffTableRow [index]="r">
          <td ffTableCell class="text-foreground whitespace-nowrap">{{ city }}</td>
          @for (m of months; track m; let c = $index) {
            <td ffTableCell class="text-right tabular-nums whitespace-nowrap">
              {{ metric(r, c) }}
            </td>
          }
        </tr>
      }
    </tbody>
  </ff-table>
</ff-scroll-area>`;

// ---------------------------------------------------------------------------
// The rows both lists share
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-scrollbar-release-rows',
  host: { style: 'display: contents' },
  template: `
    <div class="flex flex-col p-3">
      @for (release of releases; track release) {
        <div class="px-3 py-2 text-site-body text-foreground whitespace-nowrap">{{ release }}</div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ScrollbarReleaseRows {
  protected readonly releases = RELEASES;
}

// ---------------------------------------------------------------------------
// The problem, with a scripted cursor
// ---------------------------------------------------------------------------

/* Geometry: each list is w-64 h-56 (256 × 224). The cursor rests left of
   the list, in the gap or the padding, and comes to a stop inside it. */
const LIST_W = 256;
const LIST_H = 224;
const OUT = { x: -22, y: 150 };
const IN = { x: 132, y: 112 };
const SCROLL_TO = 200;
/** Seconds per leg: in, rest, scroll down, rest, scroll up, rest, out, rest. */
const LEGS_S = [0.8, 0.7, 1.2, 0.6, 1.0, 0.5, 0.7, 1.3];
const LOOP_S = LEGS_S.reduce((a, b) => a + b, 0);
/** Where each leg ends, as offsets (0..1) into the loop. */
const TIMES = LEGS_S.reduce<number[]>((acc, leg) => [...acc, acc[acc.length - 1] + leg / LOOP_S], [0]);
const XS = [OUT.x, IN.x, IN.x, IN.x, IN.x, IN.x, IN.x, OUT.x, OUT.x];
const YS = [OUT.y, IN.y, IN.y, IN.y, IN.y, IN.y, IN.y, OUT.y, OUT.y];
const SCROLLS = [0, 0, 0, SCROLL_TO, SCROLL_TO, 0, 0, 0, 0];
const toX = transform(TIMES, XS, { ease: easeInOut });
const toY = transform(TIMES, YS, { ease: easeInOut });
const toScroll = transform(TIMES, SCROLLS, { ease: easeInOut });

@Component({
  selector: 'app-scrollbar-problem-preview',
  imports: [ScrollArea, ScrollbarReleaseRows],
  host: { style: 'display: contents' },
  template: `
    <div
      #root
      class="flex flex-col sm:flex-row gap-6 items-center sm:items-start"
      (mouseenter)="userInside.set(true)"
      (mousemove)="userInside.set(true)"
      (pointerdown)="userInside.set(true)"
      (mouseleave)="userInside.set(false)"
    >
      <div class="flex flex-col gap-2">
        <div class="relative">
          <div #plain [class]="'h-56 w-64 overflow-y-auto border border-border ' + shape().container">
            <app-scrollbar-release-rows />
          </div>
          @if (scripted()) {
            <span #fakeCursor aria-hidden="true" class="pointer-events-none absolute -left-[3px] -top-[3px] z-30">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  d="m4 4 7.07 17 2.51-7.39L21 11.07z"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                  class="fill-foreground stroke-background"
                />
              </svg>
            </span>
          }
        </div>
        <span class="text-site-caption text-muted-foreground text-center">
          <span aria-hidden="true">❌</span> The native scrollbar hides until you scroll, so the list looks cut off
        </span>
      </div>
      <div class="flex flex-col gap-2">
        <div class="relative">
          <ff-scroll-area
            #fluid
            viewportClass="scroll-fade"
            [class]="'h-56 w-64 border border-border ' + shape().container"
          >
            <app-scrollbar-release-rows />
          </ff-scroll-area>
          @if (scripted()) {
            <span #fakeCursor aria-hidden="true" class="pointer-events-none absolute -left-[3px] -top-[3px] z-30">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  d="m4 4 7.07 17 2.51-7.39L21 11.07z"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                  class="fill-foreground stroke-background"
                />
              </svg>
            </span>
          }
        </div>
        <span class="text-site-caption text-muted-foreground text-center">
          <span aria-hidden="true">✅</span> ScrollArea shows its scrollbar on hover and fades the edges
        </span>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ScrollbarProblemPreview {
  protected readonly shape = injectShape();
  protected readonly userInside = signal(false);
  private readonly inViewNow = signal(false);
  private readonly reduced = signal(
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  // A real pointer inside the demo owns both lists until it leaves.
  protected readonly scripted = computed(() => this.inViewNow() && !this.reduced() && !this.userInside());

  private readonly root = viewChild.required<ElementRef<HTMLElement>>('root');
  private readonly plain = viewChild.required<ElementRef<HTMLElement>>('plain');
  private readonly fluid = viewChild.required<unknown, ElementRef<HTMLElement>>('fluid', { read: ElementRef });
  private readonly cursors = viewChildren<ElementRef<HTMLElement>>('fakeCursor');

  private readonly progress = motionValue(0);
  private controls: AnimationPlaybackControls | null = null;
  private hovering = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      this.controls?.stop();
      this.progress.destroy();
    });
    afterNextRender(() => {
      const stopInView = inView(
        this.root().nativeElement,
        () => {
          this.inViewNow.set(true);
          return () => this.inViewNow.set(false);
        },
        { amount: 0.35 },
      );
      destroyRef.onDestroy(stopInView);
    });

    // The script is one animation, paused and resumed in place so a visiting
    // pointer holds the current frame.
    effect(() => {
      if (!this.scripted()) {
        this.controls?.pause();
        // Handing over to a real pointer: drop the scripted hover first.
        this.setFluidHover(false);
        return;
      }
      if (this.controls) {
        this.controls.play();
        return;
      }
      this.controls = animate(this.progress, [0, 1], { duration: LOOP_S, ease: 'linear', repeat: Infinity });
    });

    // Every frame of the script: move the cursors, scroll both lists and
    // hover the fluid one while the cursor is inside it.
    destroyRef.onDestroy(this.progress.on('change', () => this.frame()));
    // A cursor that just mounted starts where the script is.
    afterRenderEffect(() => {
      this.cursors();
      this.paintCursors();
    });
  }

  private frame() {
    if (!this.scripted()) return;
    const p = this.progress.get();
    const top = toScroll(p);
    this.plain().nativeElement.scrollTop = top;
    const viewport = this.fluid().nativeElement.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (viewport) viewport.scrollTop = top;
    this.paintCursors();
    const cx = toX(p);
    const cy = toY(p);
    this.setFluidHover(cx >= 0 && cx <= LIST_W && cy >= 0 && cy <= LIST_H);
  }

  private paintCursors() {
    const p = this.progress.get();
    const value = `translateX(${toX(p)}px) translateY(${toY(p)}px)`;
    for (const cursor of this.cursors()) cursor.nativeElement.style.transform = value;
  }

  /** Tell ScrollArea the pointer is over it or has left, the way a mouse would. */
  private setFluidHover(on: boolean) {
    const root = this.fluid().nativeElement;
    if (this.hovering === on) return;
    this.hovering = on;
    root.dispatchEvent(new PointerEvent(on ? 'pointermove' : 'pointerleave', { bubbles: on, pointerType: 'mouse' }));
  }
}

// ---------------------------------------------------------------------------
// The frames
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-scrollbar-problem-demo',
  imports: [ComponentPreview, ScrollbarProblemPreview],
  host: { style: 'display: contents' },
  template: `
    <app-component-preview [code]="code" padding="responsive">
      <app-scrollbar-problem-preview />
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ScrollbarProblemDemo {
  protected readonly code = PROBLEM_CODE;
}

@Component({
  selector: 'app-scrollbar-horizontal-demo',
  imports: [ComponentPreview, ScrollArea],
  host: { style: 'display: contents' },
  template: `
    <app-component-preview [code]="code" padding="none" minHeightClass="min-h-0">
      <ff-scroll-area orientation="horizontal" viewportClass="scroll-fade-x" class="w-full">
        <div class="flex gap-2 p-3 w-max">
          @for (month of months; track month) {
            <div
              [class]="
                'flex items-center justify-center h-20 w-28 shrink-0 border border-border text-site-body text-foreground ' +
                shape().bg
              "
            >
              {{ month }}
            </div>
          }
        </div>
      </ff-scroll-area>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ScrollbarHorizontalDemo {
  protected readonly code = HORIZONTAL_CODE;
  protected readonly months = MONTHS;
  protected readonly shape = injectShape();
}

@Component({
  selector: 'app-scrollbar-fade-demo',
  imports: [ComponentPreview, ScrollArea, ScrollbarReleaseRows],
  host: { style: 'display: contents' },
  template: `
    <app-component-preview [code]="code" padding="responsive">
      <ff-scroll-area viewportClass="scroll-fade" [class]="'h-64 w-72 border border-border ' + shape().container">
        <app-scrollbar-release-rows />
      </ff-scroll-area>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ScrollbarFadeDemo {
  protected readonly code = FADE_CODE;
  protected readonly shape = injectShape();
}

@Component({
  selector: 'app-scrollbar-table-demo',
  imports: [
    ComponentPreview,
    ScrollArea,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
  ],
  host: { style: 'display: contents' },
  template: `
    <app-component-preview [code]="code" padding="none">
      <ff-scroll-area orientation="both" class="h-80 w-full">
        <ff-table class="w-max">
          <thead ffTableHeader>
            <tr ffTableRow>
              <th ffTableHead class="whitespace-nowrap">City</th>
              @for (month of months; track month) {
                <th ffTableHead class="text-right whitespace-nowrap">{{ month }}</th>
              }
            </tr>
          </thead>
          <tbody ffTableBody>
            @for (city of cities; track city; let r = $index) {
              <tr ffTableRow [index]="r">
                <td ffTableCell class="text-foreground whitespace-nowrap">{{ city }}</td>
                @for (month of months; track month; let c = $index) {
                  <td ffTableCell class="text-right tabular-nums whitespace-nowrap">{{ metric(r, c) }}</td>
                }
              </tr>
            }
          </tbody>
        </ff-table>
      </ff-scroll-area>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ScrollbarTableDemo {
  protected readonly code = TABLE_CODE;
  protected readonly months = MONTHS;
  protected readonly cities = CITIES;

  /** Deterministic fake metric so the table renders identically on every pass. */
  protected metric(row: number, col: number) {
    return (((row + 3) * (col + 7) * 37) % 900) + 100;
  }
}

export { ScrollbarFadeDemo, ScrollbarHorizontalDemo, ScrollbarProblemDemo, ScrollbarTableDemo };
