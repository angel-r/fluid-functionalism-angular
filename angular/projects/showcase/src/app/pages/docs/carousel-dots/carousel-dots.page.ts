// ---------------------------------------------------------------------------
// /docs/carousel-dots, ported from app/docs/carousel-dots/page.tsx: a static
// carousel whose highlight glides between dots, the same carousel on autoplay
// (the pill fills, then the next slide comes in, paused on hover), and the API
// reference.
//
// The slide both demos page through is the reference's `Slide`: a label that
// slides sideways on a change, forward (+1) coming in from the right and back
// (-1) the other way, on spring.moderate.
// ---------------------------------------------------------------------------

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
import {
  CarouselDots,
  enterTransition,
  exitTransition,
  injectShape,
  spring,
} from '@angel-r/fluid-functionalism-angular';
import { API_REFERENCE } from '../../../docs-kit/api';
import type { PropDef } from '../../../docs-kit/api/types';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';

/** The install prompt's one line per prop. `<ng-content />` rows describe the
 *  projection, not an input, so they stay out. */
function promptProps(tables: readonly { props: PropDef[] }[]): string[] {
  return tables.flatMap((table) =>
    table.props
      .filter((prop) => !prop.name.startsWith('<ng-content'))
      .map(
        (prop) =>
          `${prop.name}: ${prop.type}${prop.default !== undefined ? ` (default ${prop.default})` : ''} — ${prop.description}`,
      ),
  );
}

const SLIDES = ['Inbox', 'Drafts', 'Sent', 'Archive'];
/** How far a slide's label travels sideways on a change, in px. */
const SLIDE_SHIFT = 24;

/** The slide both demos page through: a label that slides sideways. */
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
  selector: 'app-carousel-dots-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, CarouselDots, CarouselSlide],
  template: `
    <app-doc-page
      title="CarouselDots"
      slug="carousel-dots"
      description="Dots for a carousel, static or on autoplay."
      [installUsage]="staticCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Static">
        <p class="text-site-body text-muted-foreground">
          Hover a dot to see its click area, then click it. The highlight glides
          from dot to dot.
        </p>
        <app-component-preview [code]="staticCode">
          <div class="flex flex-col items-center gap-3">
            <app-carousel-slide [index]="staticSlide()" [direction]="staticDirection()" />
            <!-- Angular has no ".capture" pseudo-event: the pointerdown and
                 keydown bubble here first (the dots only listen to click), so
                 the flag is set before the change arrives. -->
            <div (pointerdown)="byHand = true" (keydown)="byHand = true">
              <ff-carousel-dots
                [count]="slides.length"
                [value]="staticSlide()"
                (valueChange)="change(staticSlide, staticDirection, $event)"
                [getLabel]="label"
              />
            </div>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Autoplay">
        <p class="text-site-body text-muted-foreground">
          Add
          <code class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground">autoplay</code>
          and the pill fills, then the next slide comes in. Hover the slide to pause.
          Reduced motion turns the timer off.
        </p>
        <app-component-preview [code]="autoplayCode">
          <div class="flex flex-col items-center gap-3">
            <div (mouseenter)="hovering.set(true)" (mouseleave)="hovering.set(false)">
              <app-carousel-slide [index]="autoSlide()" [direction]="autoDirection()" />
            </div>
            <div (pointerdown)="byHand = true" (keydown)="byHand = true">
              <ff-carousel-dots
                [count]="slides.length"
                [value]="autoSlide()"
                (valueChange)="change(autoSlide, autoDirection, $event)"
                [autoplay]="{ duration: 3000, paused: hovering() }"
                [getLabel]="label"
              />
            </div>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference">
        <app-props-table [props]="carouselTable" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CarouselDotsPage {
  protected readonly staticCode = `import { CarouselDots } from '@angel-r/fluid-functionalism-angular';
import { signal } from '@angular/core';

readonly slide = signal(0);

<ff-carousel-dots [count]="4" [(value)]="slide" />`;

  protected readonly autoplayCode = `import { CarouselDots } from '@angel-r/fluid-functionalism-angular';
import { signal } from '@angular/core';

readonly slide = signal(0);
readonly hovering = signal(false);

<div (mouseenter)="hovering.set(true)" (mouseleave)="hovering.set(false)">
  <app-carousel-slide [index]="slide()" />
</div>
<ff-carousel-dots
  [count]="4"
  [(value)]="slide"
  [autoplay]="{ duration: 3000, paused: hovering() }"
/>`;

  protected readonly carouselTable = API_REFERENCE['carousel-dots'][0].props;
  protected readonly installProps = promptProps(API_REFERENCE['carousel-dots']);

  protected readonly slides = SLIDES;
  protected readonly staticSlide = signal(0);
  protected readonly staticDirection = signal(1);
  protected readonly autoSlide = signal(0);
  protected readonly autoDirection = signal(1);
  protected readonly hovering = signal(false);
  protected readonly label = (index: number) => `Show ${SLIDES[index]}`;
  /** A dot picked by hand compares indices, so clicking back goes left;
   *  autoplay wrapping around keeps moving forward. */
  protected byHand = false;

  protected change(slide: WritableSignal<number>, direction: WritableSignal<number>, next: number): void {
    const picked = this.byHand;
    this.byHand = false;
    direction.set(picked ? (next > slide() ? 1 : -1) : 1);
    slide.set(next);
  }
}
