import type { OverlayRef, PositionStrategy } from '@angular/cdk/overlay';

/**
 * CDK writes a right-anchored pane's `right` from the root's clientWidth. Under
 * `html { scrollbar-gutter: stable }` the root reports the full viewport while
 * the overlay box (a fixed or top-layer element) stops at the gutter, so an
 * end-aligned or side="left" popup lands one gutter width too far left of
 * where Floating UI puts React's. This re-measures `right` from the box the
 * pane actually sits in, after every positioning pass.
 */
export function fitToOverlayBox<S extends PositionStrategy & { reapplyLastPosition?(): void }>(strategy: S): S {
  let pane: HTMLElement | null = null;
  const fit = () => {
    const box = pane?.parentElement;
    if (!pane || !box || !pane.style.right) return;
    const gutter = pane.ownerDocument.documentElement.clientWidth - box.clientWidth;
    if (gutter) pane.style.right = `${parseFloat(pane.style.right) - gutter}px`;
  };
  const attach = strategy.attach.bind(strategy);
  strategy.attach = (ref: OverlayRef) => {
    pane = ref.overlayElement;
    attach(ref);
  };
  const apply = strategy.apply.bind(strategy);
  strategy.apply = () => {
    apply();
    fit();
  };
  const reapply = strategy.reapplyLastPosition?.bind(strategy);
  if (reapply) {
    strategy.reapplyLastPosition = () => {
      reapply();
      fit();
    };
  }
  return strategy;
}
