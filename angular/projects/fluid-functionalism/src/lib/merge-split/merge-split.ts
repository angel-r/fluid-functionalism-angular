import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Renderer2,
  type Signal,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { animate, type AnimationOptions } from 'motion';
import { spring } from '../core/springs';
import type { ItemRect } from '../fluid-hover/fluid-hover';

// Edge spring for the selected-bg merge/split: spring.moderate (critically
// damped) so converging edges meet exactly instead of overshooting. On a merge
// the inner corners trail by `cornerDelay`, staying rounded until the halves meet.
const mergeSpring = spring.moderate;
const cornerDelay = 0.07;
// A boundary resolves after its motion finishes (merge → swap to one block;
// split → drop), driven by a duration timer rather than an animation-complete
// callback, which an interrupted animation might never deliver. The buffer
// biases late, by which point the halves have met/parted, so it's unseen.
const convergeMs = (mergeSpring.duration + cornerDelay) * 1000 + 80;
const splitMs = mergeSpring.duration * 1000 + 80;

type Rect = { top: number; left: number; width: number; height: number };
type Radii = [number, number, number, number]; // tl, tr, br, bl

/** A selected-background block for one render. A run is normally one block;
 *  mid merge/split it is drawn as two abutting halves with sharp inner corners. */
export interface SelBlock extends Rect {
  key: string;
  radii: Radii;
  instant: boolean; // skip the spring (the zero-shift swap, the split snap-in)
  exitInstant: boolean; // drop without the fade (absorbed half at the swap)
  delayCorners: boolean; // trail the corner straightening (merge converge)
  cornerDelay?: number; // optional per-block delay override
  opacity?: number; // override the opacity (commit ghost = 0)
  // State a fresh block animates *from* on mount, so it springs into place
  // instead of snapping when continuity is lost (fast toggling) or the block is
  // inherently new (a split's lower half). Continuous blocks ignore it.
  enterFrom?: { top: number; height: number; radii: Radii };
}

/** A contiguous run of selected/checked rows, with a stable id so the block
 *  can morph across renders rather than exit + re-enter. */
export type Run = { start: number; end: number; id: number };

/** One in-flight merge or split. Geometry is recomputed from the live runs
 *  each render so rapid toggles redirect instead of freezing. */
export interface Boundary {
  tid: number;
  kind: 'merge' | 'split';
  survivorId: number; // persisting run (merged run / split's upper run)
  otherId: number; // merge: absorbed run; split: new lower run
  gapIndex: number; // bridging/deselected row — where the halves meet
  phase: 'converge' | 'commit' | 'splitIn' | 'diverge';
}

/**
 * Groups sorted row indices into contiguous runs and ids them against the
 * previous grouping: a run reuses the id of the first of its rows that had
 * one, unless an earlier run already took it (after a split the upper run
 * keeps the id and the lower run gets a new one).
 */
export function assignRunIds(
  sorted: readonly number[],
  prev: ReadonlyMap<number, number>,
  lastId: number,
): { runs: Run[]; byRow: Map<number, number>; lastId: number } {
  const spans: { start: number; end: number }[] = [];
  for (const idx of sorted) {
    const last = spans[spans.length - 1];
    if (last && idx === last.end + 1) last.end = idx;
    else spans.push({ start: idx, end: idx });
  }
  const usedIds = new Set<number>();
  const byRow = new Map<number, number>();
  const runs = spans.map((span) => {
    let stableId: number | null = null;
    for (let i = span.start; i <= span.end; i++) {
      const prevId = prev.get(i);
      if (prevId !== undefined && !usedIds.has(prevId)) {
        stableId = prevId;
        break;
      }
    }
    const id = stableId ?? ++lastId;
    usedIds.add(id);
    for (let i = span.start; i <= span.end; i++) byRow.set(i, id);
    return { ...span, id };
  });
  return { runs, byRow, lastId };
}

/**
 * Groups checked row indices into contiguous runs with ids that survive
 * changes: a run keeps its id while any of its rows was in a run last time,
 * so a growing/shrinking block morphs instead of swapping. Feed the result to
 * `createMergeSplitBlocks`.
 */
export function createSelectionRuns(checkedIndices: () => readonly number[]): Signal<Run[]> {
  let state: { key: string; runs: Run[]; byRow: Map<number, number>; lastId: number } | null = null;
  return computed(() => {
    const sorted = [...checkedIndices()].sort((a, b) => a - b);
    const key = sorted.join(',');
    if (state?.key === key) return state.runs;
    state = { key, ...assignRunIds(sorted, state?.byRow ?? new Map(), state?.lastId ?? 0) };
    return state.runs;
  });
}

/** Two runs within `outer`, ordered, separated by exactly one row (a single-row
 *  bridge — the only shape a click can merge or split). */
export function bridgePair(outer: Run, runs: readonly Run[]) {
  const inside = runs
    .filter((r) => r.start >= outer.start && r.end <= outer.end)
    .sort((a, b) => a.start - b.start);
  if (inside.length !== 2) return null;
  const [up, lo] = inside;
  return lo.start === up.end + 2 ? { up, lo, gap: up.end + 1 } : null;
}

/**
 * The blocks to paint for `runs`: one per run, overridden into abutting halves
 * for any run in an in-flight boundary. Pure, so the merge/split choreography
 * is testable without layout.
 */
export function buildBlocks(
  runs: readonly Run[],
  itemRects: readonly (ItemRect | undefined)[],
  R: number,
  boundaries: readonly Boundary[],
  prevRuns: readonly Run[],
): SelBlock[] {
  const rectOf = (start: number, end: number): Rect | null => {
    const s = itemRects[start];
    const e = itemRects[end];
    if (!s || !e) return null;
    return {
      top: s.top,
      left: Math.min(s.left, e.left),
      width: Math.max(s.width, e.width),
      height: e.top + e.height - s.top,
    };
  };
  const blocks: SelBlock[] = [];
  for (const run of runs) {
    const r = rectOf(run.start, run.end);
    if (r) {
      blocks.push({
        key: `sel-${run.id}`,
        ...r,
        radii: [R, R, R, R],
        instant: false,
        exitInstant: false,
        delayCorners: false,
      });
    }
  }
  const byId = new Map(blocks.map((b) => [b.key, b]));
  for (const b of boundaries) {
    const gap = itemRects[b.gapIndex];
    const sv = byId.get(`sel-${b.survivorId}`);
    if (!gap || !sv) continue;
    const midY = gap.top + gap.height / 2;
    if (b.kind === 'merge') {
      if (b.phase === 'commit') {
        // Zero-shift swap: survivor jumps to the full union (already covered by
        // its top half + the absorbed bottom half). The absorbed half is held
        // one render at opacity 0 so removing it next render can't flash a
        // one-frame overlap with the now-full survivor.
        sv.instant = true;
        blocks.push({
          key: `sel-${b.otherId}`,
          top: midY,
          left: sv.left,
          width: sv.width,
          height: sv.top + sv.height - midY,
          radii: [0, 0, R, R],
          instant: true,
          exitInstant: true,
          delayCorners: false,
          opacity: 0,
        });
        continue;
      }
      // converge: survivor → top half, absorbed run → bottom-half ghost, inner
      // corners straightening to sharp. Lower merges trail slightly, with a
      // baseline and a small cap.
      const mergeCornerDelay = Math.min(
        cornerDelay + 0.03,
        Math.max(cornerDelay, cornerDelay + (midY / Math.max(gap.height, 1)) * 0.002),
      );
      const bottom = sv.top + sv.height;
      sv.height = midY - sv.top;
      sv.radii = [R, R, 0, 0];
      sv.delayCorners = true;
      sv.cornerDelay = mergeCornerDelay;
      blocks.push({
        key: `sel-${b.otherId}`,
        top: midY,
        left: sv.left,
        width: sv.width,
        height: bottom - midY,
        radii: [0, 0, R, R],
        // Mount at full corners so a fresh ghost still animates the
        // straightening with the same delay as the survivor.
        enterFrom: { top: midY, height: bottom - midY, radii: [R, R, R, R] },
        instant: false,
        exitInstant: true,
        delayCorners: true,
        cornerDelay: mergeCornerDelay,
      });
    } else if (b.phase === 'splitIn') {
      pinAtSeam(byId.get(`sel-${b.survivorId}`), byId.get(`sel-${b.otherId}`), midY, R);
    }
    // diverge: nothing to override — the steady blocks spring to their real
    // rects from the seam; the timer drops the boundary.
  }

  // Split safety net, pinned synchronously: the split boundary is created in
  // an effect after the selection changes, so on the very frame a split first
  // appears its fresh lower half would mount at its final rect and snap.
  // Detecting it here (previous runs vs current) pins both halves at the seam
  // regardless of effect timing.
  for (const p of prevRuns) {
    const c = bridgePair(p, runs);
    const gap = c && itemRects[c.gap];
    if (!c || !gap) continue;
    pinAtSeam(byId.get(`sel-${c.up.id}`), byId.get(`sel-${c.lo.id}`), gap.top + gap.height / 2, R);
  }

  return blocks;
}

/** Pins both halves of a split at the seam (identical to the single block);
 *  the diverge render then springs them to their real rects. */
function pinAtSeam(up: SelBlock | undefined, lo: SelBlock | undefined, midY: number, R: number) {
  if (!up || !lo) return;
  const bottom = lo.top + lo.height;
  up.height = midY - up.top;
  up.radii = [R, R, 0, 0];
  up.instant = true;
  lo.top = midY;
  lo.height = bottom - midY;
  lo.radii = [0, 0, R, R];
  lo.instant = true;
  lo.enterFrom = { top: midY, height: bottom - midY, radii: [0, 0, R, R] };
}

// ── Merge / split boundary animation ─────────────────────────────
// When one unselected row bridges two selected runs, their inner edges glide to
// the bridging row's midpoint (facing corners straightening to sharp), then swap
// to one block with no visible motion — instead of the surviving block
// spring-growing over the whole union. Deselecting a middle row plays the
// inverse: snap into two abutting halves, then glide apart.
//
// Given the contiguous selection `runs` (with stable ids), the measured
// `itemRects`, and the corner radius to round to, this returns the blocks to
// paint. Render them with <ff-selection-backgrounds>. Injection context only.
export function createMergeSplitBlocks(
  runs: Signal<Run[]>,
  itemRects: Signal<ItemRect[]>,
  radius: () => number,
): Signal<SelBlock[]> {
  const boundaries = signal<Boundary[]>([]);
  const prevRuns = signal<Run[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  let tid = 0;
  const runsSig = computed(() => runs().map((g) => `${g.id}:${g.start}-${g.end}`).join('|'));

  // Detect merges/splits and drop any boundary the latest selection
  // invalidated (e.g. the bridge row was toggled again mid-flight).
  effect(() => {
    runsSig();
    untracked(() => {
      const prev = prevRuns();
      const cur = runs();
      const found: Boundary[] = [];
      for (const c of cur) {
        const p = bridgePair(c, prev); // two prev runs collapsed into one
        if (p && (c.id === p.up.id || c.id === p.lo.id)) {
          found.push({
            tid: ++tid,
            kind: 'merge',
            survivorId: c.id,
            otherId: c.id === p.up.id ? p.lo.id : p.up.id,
            gapIndex: p.gap,
            phase: 'converge',
          });
        }
      }
      for (const p of prev) {
        const c = bridgePair(p, cur); // one prev run split into two
        if (c) {
          found.push({ tid: ++tid, kind: 'split', survivorId: c.up.id, otherId: c.lo.id, gapIndex: c.gap, phase: 'splitIn' });
        }
      }
      prevRuns.set(cur.map((r) => ({ ...r })));
      // Resolve each new boundary after its motion window (merge → swap to one
      // block; split → drop), so an interrupted animation can't strand a half.
      for (const b of found) {
        timers.set(
          b.tid,
          setTimeout(
            () => {
              timers.delete(b.tid);
              boundaries.update((bs) =>
                bs.flatMap((x) =>
                  x.tid !== b.tid ? [x] : x.kind === 'merge' ? [{ ...x, phase: 'commit' as const }] : [],
                ),
              );
            },
            b.kind === 'merge' ? convergeMs : splitMs,
          ),
        );
      }
      const stillValid = (b: Boundary) =>
        b.kind === 'merge'
          ? cur.some((c) => c.id === b.survivorId && b.gapIndex > c.start && b.gapIndex < c.end)
          : cur.some((c) => c.id === b.survivorId && c.end === b.gapIndex - 1) &&
            cur.some((c) => c.id === b.otherId && c.start === b.gapIndex + 1);
      const active = boundaries();
      for (const b of active) {
        if (stillValid(b)) continue;
        clearTimeout(timers.get(b.tid));
        timers.delete(b.tid);
      }
      boundaries.set([...active.filter(stillValid), ...found]);
    });
  });

  // Follow-up frame: a fresh split holds its abutting frame once then
  // diverges; a committed merge is dropped.
  effect((onCleanup) => {
    if (!boundaries().some((b) => b.phase === 'splitIn' || b.phase === 'commit')) return;
    const frame = requestAnimationFrame(() =>
      boundaries.update((bs) =>
        bs.flatMap((b) =>
          b.phase === 'commit' ? [] : [{ ...b, phase: b.phase === 'splitIn' ? ('diverge' as const) : b.phase }],
        ),
      ),
    );
    onCleanup(() => cancelAnimationFrame(frame));
  });

  inject(DestroyRef).onDestroy(() => timers.forEach(clearTimeout));

  return computed(() => buildBlocks(runs(), itemRects(), radius(), boundaries(), prevRuns()));
}

const radiusKeys = [
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
] as const;

function blockTarget(b: SelBlock) {
  return {
    top: b.top,
    left: b.left,
    width: b.width,
    height: b.height,
    borderTopLeftRadius: b.radii[0],
    borderTopRightRadius: b.radii[1],
    borderBottomRightRadius: b.radii[2],
    borderBottomLeftRadius: b.radii[3],
    opacity: b.opacity ?? 1,
  };
}

function applyStyles(element: HTMLElement, target: ReturnType<typeof blockTarget>) {
  for (const [key, value] of Object.entries(target)) {
    element.style.setProperty(
      key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
      key === 'opacity' ? String(value) : `${value}px`,
    );
  }
}

function blockTransition(b: SelBlock): AnimationOptions {
  if (b.instant) return { duration: 0 };
  const base = { type: mergeSpring.type, duration: mergeSpring.duration, bounce: mergeSpring.bounce };
  const corner = b.delayCorners ? { ...base, delay: b.cornerDelay ?? cornerDelay } : base;
  const perValue: Record<string, AnimationOptions> = { opacity: { duration: 0.08 } };
  for (const key of radiusKeys) perValue[key] = corner;
  return { ...base, ...perValue } as AnimationOptions;
}

/**
 * Renders the blocks from `createMergeSplitBlocks` — one per run, or two
 * abutting halves mid merge/split. Corners are driven numerically so a
 * merge/split can straighten and re-round individual corners. The host is
 * `display: contents`; the container must be the rows' offsetParent.
 */
@Component({
  selector: 'ff-selection-backgrounds',
  template: '',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectionBackgrounds {
  readonly blocks = input.required<SelBlock[]>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly live = new Map<string, HTMLDivElement>();

  constructor() {
    effect(() => {
      const blocks = this.blocks();
      untracked(() => this.render(blocks));
    });
    inject(DestroyRef).onDestroy(() => this.live.forEach((el) => el.remove()));
  }

  private render(blocks: SelBlock[]) {
    const keys = new Set(blocks.map((b) => b.key));
    for (const [key, element] of this.live) {
      if (keys.has(key)) continue;
      this.live.delete(key);
      const exitInstant = element.dataset['exitInstant'] === 'true';
      animate(element, { opacity: 0 }, exitInstant ? { duration: 0 } : { duration: mergeSpring.exit.duration }).finished.then(
        () => element.remove(),
      );
    }
    for (const b of blocks) {
      let element = this.live.get(b.key);
      const target = blockTarget(b);
      if (!element) {
        element = this.renderer.createElement('div') as HTMLDivElement;
        element.className = 'absolute bg-active pointer-events-none';
        element.setAttribute('aria-hidden', 'true');
        element.setAttribute('data-slot', 'selection-background');
        this.renderer.appendChild(this.host, element);
        this.live.set(b.key, element);
        element.dataset['exitInstant'] = String(b.exitInstant);
        if (!b.enterFrom) {
          // No entry state: mount straight at the target (initial={false}).
          applyStyles(element, target);
          continue;
        }
        // Spring from the entry state, as explicit [from, to] keyframes.
        const from = blockTarget({ ...b, top: b.enterFrom.top, height: b.enterFrom.height, radii: b.enterFrom.radii });
        const keyframes: Record<string, [number, number]> = {};
        for (const key of Object.keys(target) as (keyof typeof target)[]) keyframes[key] = [from[key], target[key]];
        animate(element, keyframes, blockTransition(b));
        continue;
      }
      element.dataset['exitInstant'] = String(b.exitInstant);
      animate(element, target, blockTransition(b));
    }
  }
}
