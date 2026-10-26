import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  SelectionBackgrounds,
  buildBlocks,
  createMergeSplitBlocks,
  createSelectionRuns,
  type Boundary,
  type Run,
} from './merge-split';
import type { ItemRect } from '../fluid-hover/fluid-hover';

// Five 36px rows, 4px apart.
const rects: ItemRect[] = Array.from({ length: 5 }, (_, i) => ({ top: i * 40, left: 0, width: 200, height: 36 }));

describe('createSelectionRuns', () => {
  it('groups rows into runs and keeps ids across growth', () => {
    const checked = signal<number[]>([0, 1]);
    const runs = TestBed.runInInjectionContext(() => createSelectionRuns(checked));
    expect(runs()).toEqual([{ start: 0, end: 1, id: 1 }]);
    checked.set([0, 1, 2]);
    expect(runs()).toEqual([{ start: 0, end: 2, id: 1 }]);
  });

  it('after a split the upper run keeps the id and the lower run gets a new one', () => {
    const checked = signal<number[]>([0, 1, 2]);
    const runs = TestBed.runInInjectionContext(() => createSelectionRuns(checked));
    runs();
    checked.set([0, 2]);
    expect(runs()).toEqual([
      { start: 0, end: 0, id: 1 },
      { start: 2, end: 2, id: 2 },
    ]);
  });
});

describe('buildBlocks', () => {
  const R = 8;

  it('paints one fully rounded block per run', () => {
    const blocks = buildBlocks([{ start: 1, end: 2, id: 1 }], rects, R, [], []);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ key: 'sel-1', top: 40, height: 76, radii: [R, R, R, R], instant: false });
  });

  it('a converging merge splits the survivor at the bridge midpoint with sharp inner corners', () => {
    const runs: Run[] = [{ start: 0, end: 2, id: 1 }];
    const merge: Boundary = { tid: 1, kind: 'merge', survivorId: 1, otherId: 2, gapIndex: 1, phase: 'converge' };
    const [survivor, ghost] = buildBlocks(runs, rects, R, [merge], []);
    expect(survivor).toMatchObject({ top: 0, height: 58, radii: [R, R, 0, 0], delayCorners: true });
    expect(ghost).toMatchObject({ key: 'sel-2', top: 58, height: 58, radii: [0, 0, R, R], exitInstant: true });
    expect(ghost.enterFrom?.radii).toEqual([R, R, R, R]);
  });

  it('a committed merge swaps instantly and holds the absorbed half invisible', () => {
    const runs: Run[] = [{ start: 0, end: 2, id: 1 }];
    const merge: Boundary = { tid: 1, kind: 'merge', survivorId: 1, otherId: 2, gapIndex: 1, phase: 'commit' };
    const [survivor, ghost] = buildBlocks(runs, rects, R, [merge], []);
    expect(survivor).toMatchObject({ top: 0, height: 116, instant: true });
    expect(ghost).toMatchObject({ opacity: 0, instant: true, exitInstant: true });
  });

  it('the split safety net pins both halves at the seam on the first frame', () => {
    const prev: Run[] = [{ start: 0, end: 2, id: 1 }];
    const runs: Run[] = [
      { start: 0, end: 0, id: 1 },
      { start: 2, end: 2, id: 2 },
    ];
    const [up, lo] = buildBlocks(runs, rects, R, [], prev);
    expect(up).toMatchObject({ top: 0, height: 58, radii: [R, R, 0, 0], instant: true });
    expect(lo).toMatchObject({ top: 58, height: 58, radii: [0, 0, R, R], instant: true });
    expect(lo.enterFrom).toEqual({ top: 58, height: 58, radii: [0, 0, R, R] });
  });

  it('skips runs whose rows are not measured yet', () => {
    expect(buildBlocks([{ start: 0, end: 7, id: 1 }], rects, R, [], [])).toEqual([]);
  });
});

@Component({
  imports: [SelectionBackgrounds],
  template: `<div class="relative"><ff-selection-backgrounds [blocks]="blocks()" /></div>`,
})
class Host {
  readonly checked = signal<number[]>([0]);
  readonly rects = signal(rects);
  readonly runs = createSelectionRuns(this.checked);
  readonly blocks = createMergeSplitBlocks(this.runs, this.rects, () => 8);
}

describe('ff-selection-backgrounds', () => {
  it('renders one background per run, and a merge as two halves', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const count = () =>
      (fixture.nativeElement as HTMLElement).querySelectorAll('[data-slot="selection-background"]').length;
    expect(count()).toBe(1);
    fixture.componentInstance.checked.set([0, 2]);
    fixture.detectChanges();
    expect(count()).toBe(2);
    // Bridging row 1 merges the runs: survivor + converging ghost.
    fixture.componentInstance.checked.set([0, 1, 2]);
    fixture.detectChanges();
    const blocks = fixture.componentInstance.blocks();
    expect(blocks).toHaveLength(2);
    expect(blocks[0].radii).toEqual([8, 8, 0, 0]);
  });
});
