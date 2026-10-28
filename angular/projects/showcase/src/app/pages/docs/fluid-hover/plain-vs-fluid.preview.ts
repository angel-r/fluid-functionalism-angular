// Demo 1 of /docs/fluid-hover, ported from app/docs/fluid-hover/demos.tsx
// (`PlainVsFluidPreview`): plain :hover next to fluid hover.
//
// Two scripted cursors ride the same clock down and up both lists, through the
// gaps and past the last row, so the difference shows without the reader
// moving. The plain list's cursor toggles a fake :hover on whichever row it is
// inside; the fluid list's cursor feeds real mouse coordinates into the
// directive, so the right-hand highlight is the library's own behaviour. A real
// pointer inside the demo takes over; the script resumes when it leaves.
//
// `paused` holds the cursors on the current frame (the page's play/pause
// control feeds it). The frame itself — the preview chrome — belongs to the
// caller, so the changelog can reuse the comparison.
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  FluidHover,
  FluidHoverHighlight,
  ReducedMotion,
  cn,
  injectShape,
} from '@angel-r/fluid-functionalism-angular';
import { FluidRow, ROWS, ROW_CLASS } from './fluid-hover-rows';

/* Geometry the cursors ride: rows are h-9 (36px) in a gap-1 (4px) column
   inside p-2 (8px). The cursor turns around 2px inside the padding at both
   ends, so it spends a beat above the first row and below the last. */
const ROW_H = 36;
const ROW_GAP = 4;
const LIST_PAD = 8;
const CURSOR_X = 120;
const CURSOR_TOP = 2;
const CURSOR_BOTTOM = LIST_PAD * 2 + ROWS.length * ROW_H + (ROWS.length - 1) * ROW_GAP - 2;

/** One pass is three round trips, each faster than the last: reading speed,
 *  pointing speed, then a flick. Seconds per leg. */
const CURSOR_LEGS_S = [2, 2, 0.8, 0.8, 0.3, 0.3];
const CURSOR_KEYFRAMES = [CURSOR_TOP, CURSOR_BOTTOM, CURSOR_TOP, CURSOR_BOTTOM, CURSOR_TOP, CURSOR_BOTTOM, CURSOR_TOP];
const CURSOR_PASS_S = CURSOR_LEGS_S.reduce((a, b) => a + b, 0);

/** Cubic-bezier easing: the curve motion's `easeInOut` runs (0.42, 0, 0.58, 1). */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-4) break;
      const slope = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(slope) < 1e-6) break;
      t -= dx / slope;
    }
    if (sampleX(t) < x - 1e-4 || sampleX(t) > x + 1e-4) {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        if (sampleX(mid) < x) lo = mid;
        else hi = mid;
      }
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

const easeInOut = cubicBezier(0.42, 0, 0.58, 1);

/** The cursor's y (list coordinates) `elapsed` ms into one pass. */
function cursorAt(elapsedMs: number): number {
  const t = (elapsedMs / 1000) % CURSOR_PASS_S;
  let start = 0;
  for (let i = 0; i < CURSOR_LEGS_S.length; i++) {
    const leg = CURSOR_LEGS_S[i];
    if (t <= start + leg || i === CURSOR_LEGS_S.length - 1) {
      const progress = Math.min(1, Math.max(0, (t - start) / leg));
      const from = CURSOR_KEYFRAMES[i];
      const to = CURSOR_KEYFRAMES[i + 1];
      return from + (to - from) * easeInOut(progress);
    }
    start += leg;
  }
  return CURSOR_TOP;
}

/** Which row a y (in list coordinates) is inside, or null in a gap or the
 *  padding. This is what plain :hover would report. */
function rowUnder(y: number): number | null {
  if (y < LIST_PAD) return null;
  const i = Math.floor((y - LIST_PAD) / (ROW_H + ROW_GAP));
  const within = y - LIST_PAD - i * (ROW_H + ROW_GAP) < ROW_H;
  return i < ROWS.length && within ? i : null;
}

/**
 * The comparison, without its frame: two lists side by side, both ridden by
 * scripted cursors. Input: `paused`.
 */
@Component({
  selector: 'app-fluid-hover-plain-vs-fluid',
  imports: [FluidHover, FluidHoverHighlight, FluidRow],
  host: { style: 'display: contents' },
  template: `
    <div
      #root
      class="flex w-full max-w-xl flex-col items-center gap-4"
      (mouseenter)="userInside.set(true)"
      (mousemove)="userInside.set(true)"
      (pointerdown)="userInside.set(true)"
      (mouseleave)="userInside.set(false)"
    >
      <div class="grid w-full gap-5 sm:grid-cols-2">
        <div class="flex flex-col items-center gap-3">
          <div [class]="frameClass()">
            <div class="relative flex w-full flex-col gap-1 p-2">
              @for (label of rows; track label; let i = $index) {
                <button type="button" [class]="plainRowClass(i)">{{ label }}</button>
              }
              @if (scripted()) {
                <span #plainCursor aria-hidden="true" class="pointer-events-none absolute -left-[3px] -top-[3px] z-30">
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
          </div>
          <span class="flex items-center justify-center gap-2 text-site-caption text-muted-foreground">
            <span aria-hidden="true">❌</span> Plain <code class="font-mono">:hover</code> blinks at every gap
          </span>
        </div>
        <div class="flex flex-col items-center gap-3">
          <div [class]="frameClass()">
            <div #fluidList ffFluidHover class="relative flex w-full flex-col gap-1 p-2">
              <ff-fluid-hover-highlight [class]="shape().bg" />
              @for (label of rows; track label; let i = $index) {
                <app-fluid-row [index]="i">{{ label }}</app-fluid-row>
              }
              @if (scripted()) {
                <span #fluidCursor aria-hidden="true" class="pointer-events-none absolute -left-[3px] -top-[3px] z-30">
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
          </div>
          <span class="flex items-center justify-center gap-2 text-site-caption text-muted-foreground">
            <span aria-hidden="true">✅</span> Fluid hover glides, one pass, one target
          </span>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlainVsFluidPreview {
  /** Holds the cursors on the current frame. */
  readonly paused = input(false, { transform: booleanAttribute });

  protected readonly rows = ROWS;
  protected readonly shape = injectShape();
  protected readonly fakeIndex = signal<number | null>(null);

  private readonly reduced = inject(ReducedMotion).value;
  private readonly destroyRef = inject(DestroyRef);
  private readonly inView = signal(false);
  protected readonly userInside = signal(false);
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  private readonly fluidList = viewChild<ElementRef<HTMLElement>>('fluidList');
  private readonly hover = viewChild(FluidHover);
  private readonly plainCursor = viewChild<ElementRef<HTMLElement>>('plainCursor');
  private readonly fluidCursor = viewChild<ElementRef<HTMLElement>>('fluidCursor');

  /** The cursors, while the script is in charge (one per list). */
  private readonly cursors = computed(() =>
    [this.plainCursor()?.nativeElement, this.fluidCursor()?.nativeElement].filter(
      (el): el is HTMLElement => !!el,
    ),
  );

  /** A real pointer inside the demo owns both lists until it leaves. */
  protected readonly scripted = computed(() => this.inView() && !this.reduced() && !this.userInside());
  private readonly running = computed(() => this.scripted() && !this.paused());

  /** The plain row, lit like :hover would when the scripted cursor is inside
   *  it — React's `cn(rowClass, "hover:bg-hover", fakeIndex === i && "bg-hover", shape.item)`. */
  protected plainRowClass(index: number): string {
    return cn(ROW_CLASS, 'hover:bg-hover', this.scripted() && this.fakeIndex() === index && 'bg-hover', this.shape().item);
  }

  protected readonly frameClass = computed(() => cn('w-full border border-border/60', this.shape().container));

  /** The frame the script is held on, in ms into the pass, and its y. */
  private elapsedMs = 0;
  private y = CURSOR_TOP;
  private wasScripted = false;

  constructor() {
    afterNextRender(() => {
      const root = this.root()?.nativeElement;
      if (!root || typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(([entry]) => this.inView.set(entry.intersectionRatio >= 0.35), {
        threshold: [0.35],
      });
      observer.observe(root);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    // The script is one animation, paused and resumed in place so the pause
    // button and a visiting pointer both hold the current frame.
    effect((onCleanup) => {
      if (!this.running()) return;
      const startedAt = performance.now() - this.elapsedMs;
      let raf = 0;
      const loop = (now: number) => {
        this.elapsedMs = now - startedAt;
        this.step();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      onCleanup(() => cancelAnimationFrame(raf));
    });

    // Each scripted entry is a fresh session, like a real pointer coming in.
    effect(() => {
      const scripted = this.scripted();
      const hover = this.hover();
      if (!hover || scripted === this.wasScripted) return;
      this.wasScripted = scripted;
      if (scripted) hover.controller.onMouseEnter();
      else {
        hover.controller.onMouseLeave();
        this.fakeIndex.set(null);
      }
    });

    // A cursor that just mounted starts at the held frame, not at (0, 0).
    effect(() => {
      for (const el of this.cursors()) el.style.transform = `translateX(${CURSOR_X}px) translateY(${this.y}px)`;
    });
  }

  /** Every frame of the cursor: the plain list gets what :hover would say, the
   *  fluid list gets the same point as a real mouse move. */
  private step(): void {
    const y = cursorAt(this.elapsedMs);
    this.y = y;
    for (const el of this.cursors()) el.style.transform = `translateX(${CURSOR_X}px) translateY(${y}px)`;
    const row = rowUnder(y);
    if (row !== this.fakeIndex()) this.fakeIndex.set(row);
    const box = this.fluidList()?.nativeElement.getBoundingClientRect();
    const hover = this.hover();
    if (!box || !hover) return;
    hover.controller.onMouseMove({ clientX: box.left + CURSOR_X, clientY: box.top + y } as MouseEvent);
  }
}
