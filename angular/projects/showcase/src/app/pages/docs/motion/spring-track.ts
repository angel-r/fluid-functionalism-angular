// The track the /docs/motion demos fire: a ball that rides to the far end and
// back. React animated it with `layout` + `transition={token}`; the port runs
// that same FLIP by hand — the ball's layout position is measured before and
// after, and the difference is sprung away on the tier's transition.
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { injectAnimateFluid, type FluidAnimation } from '@angel-r/fluid-functionalism-angular';
import type { AnimationOptions } from 'motion';

@Component({
  selector: 'app-spring-track',
  template: `
    <button type="button" [class]="trackClass()" [attr.aria-label]="ariaLabel()" (click)="fires.emit()">
      <div #ball [class]="ballClass()"></div>
    </button>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpringTrack {
  /** Which end the ball sits on. */
  readonly atEnd = input(false, { transform: booleanAttribute });
  /** The tier's transition for this leg. */
  readonly transition = input.required<AnimationOptions>();
  readonly trackClass = input.required<string>();
  readonly ballClass = input.required<string>();
  readonly ariaLabel = input.required<string>();

  readonly fires = output<void>();

  private readonly ball = viewChild.required<ElementRef<HTMLElement>>('ball');
  private readonly animate = injectAnimateFluid();

  constructor() {
    let previous: number | null = null;
    let run: FluidAnimation | null = null;
    afterRenderEffect(() => {
      // Both inputs matter: `atEnd` re-slots the ball, `transition` says which
      // leg this is.
      this.atEnd();
      const transition = this.transition();
      untracked(() => {
        const ball = this.ball().nativeElement;
        // offsetLeft is the layout box, untouched by the running transform.
        const left = ball.offsetLeft;
        if (previous !== null && left !== previous) {
          run?.stop();
          run = this.animate(ball, { x: [previous - left, 0] }, transition);
        }
        previous = left;
      });
    });
  }
}
