// ---------------------------------------------------------------------------
// A presence wrapper: renders its content while `visible`, fades and scales it
// out first when it turns false. The site used Motion's AnimatePresence for
// this on the two reopen triggers (left and right rails); with no exit
// callback in Angular, the element is held here until the spring lands.
//
// The projected content rides an ngTemplateOutlet: projection into a
// conditional slot is only guaranteed once, and these triggers mount and
// unmount on every collapse.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  type OnDestroy,
  afterRenderEffect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  exitFallbackMs,
  injectAnimateFluid,
  enterTransition,
  exitTransition,
  spring,
  type FluidAnimation,
} from '@angel-r/fluid-functionalism-angular';

@Component({
  selector: 'app-presence',
  imports: [NgTemplateOutlet],
  // The host stands in for React's fragment/root element: contents keeps it
  // out of the layout its children measured themselves against.
  host: { style: 'display: contents' },
  template: `
    <ng-template #children><ng-content /></ng-template>
    @if (shown()) {
      <!-- The first paint of the fresh box is invisible; the enter spring owns
           it from there (React's initial={{ opacity: 0, scale: 0.95 }}). -->
      <div #box [class]="userClass()" style="opacity: 0">
        <ng-container [ngTemplateOutlet]="children" />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppPresence implements OnDestroy {
  readonly visible = input.required<boolean>();
  /** Classes for the animated box (the reference put them on its motion.div). */
  readonly userClass = input('', { alias: 'class' });

  protected readonly shown = signal(false);
  private readonly box = viewChild<ElementRef<HTMLElement>>('box');
  private readonly animate = injectAnimateFluid();
  private leaving: FluidAnimation | null = null;
  private fallback: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    afterRenderEffect(() => {
      const visible = this.visible();
      const shown = this.shown();
      const box = this.box()?.nativeElement ?? null;
      untracked(() => {
        if (visible) {
          this.cancelLeave();
          if (!shown) {
            this.shown.set(true);
            return;
          }
          if (box) this.animate(box, { opacity: [0, 1], scale: [0.95, 1] }, enterTransition(spring.fast));
          return;
        }
        if (!shown) return;
        if (!box) {
          this.shown.set(false);
          return;
        }
        this.startLeave(box);
      });
    });
  }

  ngOnDestroy(): void {
    this.cancelLeave();
  }

  private startLeave(box: HTMLElement): void {
    this.cancelLeave();
    const animation = this.animate(box, { opacity: 0, scale: 0.95 }, exitTransition(spring.fast));
    this.leaving = animation;
    // Fallback: animation callbacks stall in throttled tabs.
    this.fallback = setTimeout(() => this.finishLeave(animation), exitFallbackMs(spring.fast));
    animation.finished.then(() => this.finishLeave(animation));
  }

  private finishLeave(animation: FluidAnimation): void {
    if (this.leaving !== animation) return;
    this.cancelLeave();
    this.shown.set(false);
  }

  private cancelLeave(): void {
    clearTimeout(this.fallback);
    this.fallback = undefined;
    const leaving = this.leaving;
    this.leaving = null;
    leaving?.stop();
  }
}
