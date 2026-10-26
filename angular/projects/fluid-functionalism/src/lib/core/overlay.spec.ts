import type { OverlayRef, PositionStrategy } from '@angular/cdk/overlay';
import { fitToOverlayBox } from './overlay';

/** A stand-in for CDK's exact-position strategy: writes `right` like CDK does. */
function fakeStrategy(write: (pane: HTMLElement) => void) {
  let pane: HTMLElement | null = null;
  const strategy: PositionStrategy & { reapplyLastPosition(): void } = {
    attach: (ref: OverlayRef) => {
      pane = ref.overlayElement;
    },
    apply: () => write(pane!),
    reapplyLastPosition: () => write(pane!),
    dispose: () => {},
  };
  return strategy;
}

function overlay(boxWidth: number, documentWidth: number) {
  const box = document.createElement('div');
  const pane = document.createElement('div');
  box.appendChild(pane);
  document.body.appendChild(box);
  Object.defineProperty(box, 'clientWidth', { configurable: true, value: boxWidth });
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: documentWidth });
  return { pane, ref: { overlayElement: pane } as unknown as OverlayRef };
}

describe('fitToOverlayBox', () => {
  afterEach(() => {
    delete (document.documentElement as { clientWidth?: number }).clientWidth;
    document.body.innerHTML = '';
  });

  it('measures a right-anchored pane from the overlay box, not the root, on every apply', () => {
    // html { scrollbar-gutter: stable }: the root reports 1280, the overlay box 1270.
    const { pane, ref } = overlay(1270, 1280);
    const strategy = fitToOverlayBox(fakeStrategy((p) => (p.style.right = '100px')));
    strategy.attach(ref);
    strategy.apply();
    expect(pane.style.right).toBe('90px');
    strategy.apply();
    expect(pane.style.right).toBe('90px');
    strategy.reapplyLastPosition!();
    expect(pane.style.right).toBe('90px');
  });

  it('leaves left-anchored panes and gutter-free pages alone', () => {
    const left = overlay(1270, 1280);
    const a = fitToOverlayBox(fakeStrategy((p) => (p.style.left = '40px')));
    a.attach(left.ref);
    a.apply();
    expect(left.pane.style.left).toBe('40px');
    expect(left.pane.style.right).toBe('');

    const flush = overlay(1280, 1280);
    const b = fitToOverlayBox(fakeStrategy((p) => (p.style.right = '100px')));
    b.attach(flush.ref);
    b.apply();
    expect(flush.pane.style.right).toBe('100px');
  });
});
