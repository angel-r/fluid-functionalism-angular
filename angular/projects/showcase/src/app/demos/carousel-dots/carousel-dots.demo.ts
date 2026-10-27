import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  type WritableSignal,
  effect,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { animate } from 'motion';
import { CarouselDots, enterTransition, exitTransition, injectShape, spring } from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

const SLIDES = ['Inbox', 'Drafts', 'Sent', 'Archive'];
/** How far a slide's label travels sideways on a change, in px. */
const SLIDE_SHIFT = 24;

/**
 * The slide both demos page through: a label that slides sideways. Forward
 * (+1) comes in from the right and leaves to the left, back (-1) the other way.
 */
@Component({
  selector: 'app-carousel-slide',
  template: `
    <div
      #stage
      class="relative grid size-40 place-items-center overflow-hidden border border-border/60 bg-background"
      [class]="shape().container"
    ></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CarouselSlide {
  readonly index = input.required<number>();
  readonly direction = input(1);
  protected readonly shape = injectShape();
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  constructor() {
    let current: HTMLElement | null = null;
    effect(() => {
      const index = this.index();
      const dir = untracked(this.direction);
      const stage = this.stage().nativeElement;
      untracked(() => {
        const label = document.createElement('span');
        label.className = 'col-start-1 row-start-1 text-site-body text-foreground';
        label.textContent = SLIDES[index];
        stage.appendChild(label);
        if (current) {
          const leaving = current;
          animate(leaving, { opacity: 0, x: -dir * SLIDE_SHIFT }, exitTransition(spring.moderate)).finished.then(() =>
            leaving.remove(),
          );
          animate(label, { opacity: [0, 1], x: [dir * SLIDE_SHIFT, 0] }, enterTransition(spring.moderate));
        }
        current = label;
      });
    });
  }
}

@Component({
  selector: 'app-carousel-dots-demo',
  imports: [DemoPage, DemoSection, CarouselDots, CarouselSlide],
  template: `
    <app-demo-page title="Carousel dots" description="Dots for a carousel, static or on autoplay.">
      <app-demo-section title="Static">
        <div class="flex flex-col items-center gap-3">
          <app-carousel-slide [index]="staticSlide()" [direction]="staticDirection()" />
          <div (pointerdown.capture)="byHand = true" (keydown.capture)="byHand = true">
            <ff-carousel-dots
              [count]="slides.length"
              [value]="staticSlide()"
              (valueChange)="change(staticSlide, staticDirection, $event)"
              [getLabel]="label"
            />
          </div>
        </div>
      </app-demo-section>

      <app-demo-section title="Autoplay">
        <div class="flex flex-col items-center gap-3">
          <div (mouseenter)="hovering.set(true)" (mouseleave)="hovering.set(false)">
            <app-carousel-slide [index]="autoSlide()" [direction]="autoDirection()" />
          </div>
          <div (pointerdown.capture)="byHand = true" (keydown.capture)="byHand = true">
            <ff-carousel-dots
              [count]="slides.length"
              [value]="autoSlide()"
              (valueChange)="change(autoSlide, autoDirection, $event)"
              [autoplay]="{ duration: 3000, paused: hovering() }"
              [getLabel]="label"
            />
          </div>
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CarouselDotsDemo {
  protected readonly slides = SLIDES;
  protected readonly staticSlide = signal(0);
  protected readonly staticDirection = signal(1);
  protected readonly autoSlide = signal(0);
  protected readonly autoDirection = signal(1);
  protected readonly hovering = signal(false);
  protected readonly label = (i: number) => `Show ${SLIDES[i]}`;
  /** A dot picked by hand compares indices, so clicking back goes left;
   *  autoplay wrapping around keeps moving forward. */
  protected byHand = false;

  protected change(slide: WritableSignal<number>, direction: WritableSignal<number>, next: number) {
    const picked = this.byHand;
    this.byHand = false;
    direction.set(picked ? (next > slide() ? 1 : -1) : 1);
    slide.set(next);
  }
}
