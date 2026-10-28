// Demo 4 of /docs/fluid-hover, ported from app/docs/fluid-hover/demos.tsx
// (`CostList` / `CostDemo`): 200 rows in a scroll frame and a meter that
// measures, not estimates — the pick is the library's own exported function
// timed on every move with the real rects, and the layout-write count watches
// the highlight's inline style while it travels.
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  FluidHover,
  FluidHoverHighlight,
  cn,
  injectShape,
  pickNearest,
} from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { FluidRow } from './fluid-hover-rows';
import { costCode } from './fluid-hover-snippets';

const COST_ROW_COUNT = 200;
const COST_ROWS = Array.from({ length: COST_ROW_COUNT }, (_, i) => `Message ${String(i + 1).padStart(3, '0')}`);

interface CostMeter {
  moves: number;
  /** The longest gap between two animation frames while the pointer was
   *  inside, in ms. Everything counts here: Angular, the directive, motion, paint. */
  longestFrameMs: number;
  /** Mean of the last `COST_WINDOW` picks. `performance.now()` is coarsened to
   *  0.1ms in most browsers, so one reading is 0 or 0.1; the mean over a window
   *  is the honest number. */
  avgMs: number;
  maxMs: number;
  layoutWrites: number;
  transformFrames: number;
  highlights: number;
}

const COST_WINDOW = 100;

const EMPTY_METER: CostMeter = {
  moves: 0,
  longestFrameMs: 0,
  avgMs: 0,
  maxMs: 0,
  layoutWrites: 0,
  transformFrames: 0,
  highlights: 0,
};

/** One frame at 60Hz, the budget every move has to fit in. */
const FRAME_MS = 1000 / 60;

@Component({
  selector: 'app-cost-demo-list',
  imports: [FluidHover, FluidHoverHighlight, FluidRow],
  host: { style: 'display: contents' },
  template: `
    <div
      #list
      ffFluidHover
      class="relative flex max-h-64 w-full flex-col overflow-y-auto p-2"
      (mouseenter)="enter()"
      (mouseleave)="leave()"
      (mousemove)="move($event)"
    >
      <ff-fluid-hover-highlight [class]="shape().bg" />
      @for (label of rows; track label; let i = $index) {
        <app-fluid-row [index]="i">{{ label }}</app-fluid-row>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CostList {
  readonly meter = output<CostMeter>();

  protected readonly rows = COST_ROWS;
  protected readonly shape = injectShape();

  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  private readonly hover = viewChild(FluidHover);
  private readonly destroyRef = inject(DestroyRef);

  // The meter lives in plain fields and is published once per frame, so
  // measuring never adds a render per move to what it measures.
  private value: CostMeter = EMPTY_METER;
  private inside = false;
  private readonly window: number[] = [];
  private publishRaf: number | null = null;

  constructor() {
    afterNextRender(() => {
      const container = this.list()?.nativeElement;
      if (!container) return;
      let raf = 0;
      let previous = { el: null as Element | null, transform: '', layout: '' };
      let last = performance.now();
      const tick = () => {
        raf = requestAnimationFrame(tick);
        const now = performance.now();
        const frame = now - last;
        last = now;
        if (this.inside && frame > this.value.longestFrameMs) {
          this.value = { ...this.value, longestFrameMs: frame };
          this.publish();
        }
        // Watch the highlight's inline style frame by frame: a transform change
        // is a frame of travel, a change to any layout property is a layout write.
        const elements = container.querySelectorAll<HTMLElement>('[data-slot="fluid-hover-highlight"]');
        const el = elements[elements.length - 1] ?? null;
        if (this.value.highlights !== elements.length) {
          this.value = { ...this.value, highlights: elements.length };
          this.publish();
        }
        if (!el) {
          previous = { el: null, transform: '', layout: '' };
          return;
        }
        const transform = el.style.transform;
        const layout = `${el.style.top}|${el.style.left}|${el.style.width}|${el.style.height}`;
        if (previous.el === el) {
          const travelling = transform !== previous.transform;
          const layoutChanged = layout !== previous.layout;
          if (travelling || layoutChanged) {
            this.value = {
              ...this.value,
              transformFrames: this.value.transformFrames + (travelling ? 1 : 0),
              layoutWrites: this.value.layoutWrites + (layoutChanged ? 1 : 0),
            };
            this.publish();
          }
        }
        previous = { el, transform, layout };
      };
      raf = requestAnimationFrame(tick);
      this.destroyRef.onDestroy(() => {
        cancelAnimationFrame(raf);
        if (this.publishRaf !== null) cancelAnimationFrame(this.publishRaf);
      });
    });
  }

  protected enter(): void {
    this.inside = true;
    this.hover()?.controller.onMouseEnter();
  }

  protected leave(): void {
    this.inside = false;
    this.hover()?.controller.onMouseLeave();
  }

  protected move(event: MouseEvent): void {
    this.inside = true;
    this.timePick(event);
    this.hover()?.controller.onMouseMove(event);
  }

  private publish(): void {
    if (this.publishRaf !== null) return;
    this.publishRaf = requestAnimationFrame(() => {
      this.publishRaf = null;
      this.meter.emit({ ...this.value });
    });
  }

  /** The directive's own pick, timed with the same inputs it gets. */
  private timePick(event: MouseEvent): void {
    const container = this.list()?.nativeElement;
    const controller = this.hover()?.controller;
    if (!container || !controller) return;
    const t0 = performance.now();
    pickNearest({
      axis: 'y',
      point: { x: event.clientX, y: event.clientY },
      rects: controller.itemRects(),
      containerRect: container.getBoundingClientRect(),
      scroll: { x: container.scrollLeft, y: container.scrollTop },
      border: { x: container.clientLeft, y: container.clientTop },
      layoutSize: { width: container.offsetWidth, height: container.offsetHeight },
    });
    const ms = performance.now() - t0;
    this.window.push(ms);
    if (this.window.length > COST_WINDOW) this.window.shift();
    this.value = {
      ...this.value,
      moves: this.value.moves + 1,
      avgMs: this.window.reduce((a, b) => a + b, 0) / this.window.length,
      maxMs: Math.max(this.value.maxMs, ms),
    };
    this.publish();
  }
}

@Component({
  selector: 'app-cost-stat',
  template: `
    <div class="flex flex-col items-center gap-0.5 text-center">
      <span class="font-mono text-site-body tabular-nums text-foreground">{{ value() }}</span>
      <span class="text-site-caption text-muted-foreground">{{ label() }}</span>
      <span class="text-[11px] leading-3.5 text-muted-foreground">{{ hint() }}</span>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CostStat {
  readonly value = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input.required<string>();
}

@Component({
  selector: 'app-cost-demo',
  imports: [ComponentPreview, CostList, CostStat],
  host: { style: 'display: contents' },
  template: `
    <app-component-preview [code]="code">
      <div class="flex w-full max-w-md flex-col items-center gap-4">
        <div [class]="frameClass()">
          <app-cost-demo-list (meter)="meter.set($event)" />
        </div>
        <!-- Three numbers, one per claim in the copy: the loop, the element, the
             layout. Moves counts up so the reader sees the meter is live. -->
        <div class="grid w-full grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <app-cost-stat [value]="moves()" label="moves" hint="counts as you hover" />
          <app-cost-stat
            [value]="meter().avgMs.toFixed(3) + ' ms'"
            label="pick per move"
            [hint]="pickShare()"
          />
          <app-cost-stat
            [value]="meter().longestFrameMs.toFixed(1) + ' ms'"
            label="longest frame"
            [hint]="'everything included, budget ' + frameMs + ' ms'"
          />
          <app-cost-stat
            [value]="layoutWrites()"
            label="layout writes"
            hint="a top/left animation writes 1 every frame"
          />
        </div>
      </div>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostDemo {
  protected readonly code = costCode;
  protected readonly meter = signal<CostMeter>(EMPTY_METER);
  protected readonly frameMs = FRAME_MS.toFixed(1);
  protected readonly moves = computed(() => String(this.meter().moves));
  protected readonly layoutWrites = computed(() => String(this.meter().layoutWrites));
  protected readonly pickShare = computed(
    () => `${((this.meter().avgMs / FRAME_MS) * 100).toFixed(2)}% of a ${FRAME_MS.toFixed(1)} ms frame`,
  );

  private readonly shape = injectShape();
  protected readonly frameClass = computed(() => cn('w-full border border-border/60', this.shape().container));
}
