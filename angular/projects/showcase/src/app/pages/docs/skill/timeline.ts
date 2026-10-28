// ---------------------------------------------------------------------------
// The Skill page's "What it does" timeline, ported from app/docs/skill/
// timeline.tsx: one continuous line from the top of the first title to the
// end of the last description. With a mouse there are no resting dots: ONE dot
// glides between steps with fluid hover on the fast spring, lighting the lines
// above and below it (each brightest at the dot, fading away from it) and
// bringing the step's title up to full strength. Touch screens, which cannot
// hover, show every dot instead.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  input,
  viewChild,
  viewChildren,
} from '@angular/core';
import { animate, motionValue, type MotionValue, type ValueAnimationTransition } from 'motion';
import { fontWeights, spring, createFluidHover } from '@angel-r/fluid-functionalism-angular';

/** The dot: 6px, like CarouselDots. */
const DOT = 6;
/** The title's line is 16px tall with its text starting 5px down, so its
 *  vertical center sits 13px below the step's top. The dot centers there. */
const TITLE_CENTER = 13;
const DOT_TOP = TITLE_CENTER - DOT / 2;
/** One axis for everything: the line's center, 4px in. */
const AXIS = 4;
const LINE_LEFT = AXIS - 0.5;
const DOT_LEFT = AXIS - DOT / 2;
/** The highlight lines are drawn at this height and scaled to length, so the
 *  spring moves a transform, never layout. */
const LINE_BASE = 100;
/** The dot's size while hidden: it grows from nothing as it fades in. */
const DOT_HIDDEN_SCALE = 0;

/** Where the title's text starts inside a step, 8px above its center. */
const TITLE_TOP = TITLE_CENTER - 8;

/** The fast tier as a value transition (the shape `animate()` takes for a
 *  motion value, not the DOM keyframes shape). */
const FAST: ValueAnimationTransition<number> = {
  type: spring.fast.type,
  duration: spring.fast.duration,
  bounce: spring.fast.bounce,
};

export interface TimelineStep {
  title: string;
  body: string;
}

@Component({
  selector: 'app-skill-timeline',
  template: `
    <!-- mt-2: 16px under the section title instead of the usual 8px, so the
         heading doesn't crowd the line's first stretch. -->
    <ol
      #list
      class="relative mt-2 flex flex-col"
      (mousemove)="hover.onMouseMove($event)"
      (mouseenter)="hover.onMouseEnter()"
      (mouseleave)="hover.onMouseLeave()"
    >
      <!-- One continuous line, from the top of the first title to the end of
           the last description. -->
      @if (centers().length > 0) {
        <span
          aria-hidden="true"
          class="pointer-events-none absolute top-0 w-px bg-border"
          [style.left.px]="lineLeft"
          [style.top.px]="lineStart()"
          [style.height.px]="lineEnd() - lineStart()"
        ></span>
      }
      <!-- The gliding highlight: dot, line above, line below. -->
      <span
        #dot
        aria-hidden="true"
        class="pointer-events-none absolute top-0 z-10 rounded-full bg-foreground"
        [style.left.px]="dotLeft"
        [style.width.px]="dot"
        [style.height.px]="dot"
        style="opacity: 0"
      ></span>
      <span
        #aboveLine
        aria-hidden="true"
        class="pointer-events-none absolute top-0 z-10 w-px origin-top bg-gradient-to-t from-muted-foreground/70 to-transparent"
        [style.left.px]="lineLeft"
        [style.height.px]="lineBase"
        style="opacity: 0"
      ></span>
      <span
        #belowLine
        aria-hidden="true"
        class="pointer-events-none absolute top-0 z-10 w-px origin-top bg-gradient-to-b from-muted-foreground/70 to-transparent"
        [style.left.px]="lineLeft"
        [style.height.px]="lineBase"
        style="opacity: 0"
      ></span>
      @for (step of steps(); track step.title; let i = $index) {
        <li #step class="relative pb-4 pl-6 last:pb-0">
          <span
            aria-hidden="true"
            class="absolute rounded-full bg-[color-mix(in_oklab,var(--muted-foreground)_50%,var(--background))] shadow-[0_0_0_3px_var(--background)] [@media(hover:hover)]:hidden"
            [style.left.px]="dotLeft"
            [style.top.px]="dotTop"
            [style.width.px]="dot"
            [style.height.px]="dot"
          ></span>
          <span
            class="text-site-body transition-colors duration-80"
            [class]="active() === i ? 'text-foreground' : 'text-muted-foreground [@media(hover:none)]:text-foreground'"
            [style.font-variation-settings]="semibold"
          >
            {{ step.title }}
          </span>
          <p class="mt-0.5 text-site-body leading-4.5 text-muted-foreground transition-colors duration-80">
            {{ step.body }}
          </p>
        </li>
      }
    </ol>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillTimeline {
  readonly steps = input.required<readonly TimelineStep[]>();

  protected readonly dot = DOT;
  protected readonly dotTop = DOT_TOP;
  protected readonly dotLeft = DOT_LEFT;
  protected readonly lineLeft = LINE_LEFT;
  protected readonly lineBase = LINE_BASE;
  protected readonly semibold = fontWeights.semibold;

  private readonly listRef = viewChild.required<ElementRef<HTMLOListElement>>('list');
  private readonly stepRefs = viewChildren<ElementRef<HTMLLIElement>>('step');
  private readonly dotRef = viewChild.required<ElementRef<HTMLElement>>('dot');
  private readonly aboveRef = viewChild.required<ElementRef<HTMLElement>>('aboveLine');
  private readonly belowRef = viewChild.required<ElementRef<HTMLElement>>('belowLine');

  protected readonly hover = createFluidHover(() => this.listRef()?.nativeElement);

  protected readonly active = computed(() => {
    const index = this.hover.activeIndex();
    return this.hover.isMeasured() && index !== null ? index : null;
  });

  /** The dot centers, one per step, in the list's coordinates. */
  protected readonly centers = computed(() =>
    this.hover.itemRects().map((rect) => (rect ? rect.top + TITLE_CENTER : 0)),
  );
  protected readonly lineStart = computed(() => {
    const first = this.hover.itemRects()[0];
    return first ? first.top + TITLE_TOP : 0;
  });
  protected readonly lineEnd = computed(() => {
    const rects = this.hover.itemRects();
    const last = rects[rects.length - 1];
    return last ? last.top + last.height : 0;
  });

  // Positions live in motion values so they can jump or glide. While the
  // highlight is hidden they jump: it appears on the step you enter and fades
  // out where you left it. While it shows, they glide on the fast spring.
  private readonly dotY = motionValue(0);
  private readonly dotScale = motionValue(DOT_HIDDEN_SCALE);
  private readonly dotOpacity = motionValue(0);
  private readonly aboveY = motionValue(0);
  private readonly aboveScale = motionValue(0);
  private readonly aboveOpacity = motionValue(0);
  private readonly belowY = motionValue(0);
  private readonly belowScale = motionValue(0);
  private readonly belowOpacity = motionValue(0);

  private lastActive = 0;
  private wasShown = false;

  constructor() {
    effect((onCleanup) => {
      const items = this.stepRefs();
      items.forEach((ref, index) => this.hover.registerItem(index, ref.nativeElement));
      onCleanup(() => items.forEach((ref, index) => this.hover.unregisterItem(index, ref.nativeElement)));
    });

    afterNextRender(() => {
      const dot = this.dotRef().nativeElement;
      const above = this.aboveRef().nativeElement;
      const below = this.belowRef().nativeElement;
      const drawDot = () => {
        dot.style.transform = `translateY(${this.dotY.get()}px) scale(${this.dotScale.get()})`;
        dot.style.opacity = String(this.dotOpacity.get());
      };
      const drawAbove = () => {
        above.style.transform = `translateY(${this.aboveY.get()}px) scaleY(${this.aboveScale.get()})`;
        above.style.opacity = String(this.aboveOpacity.get());
      };
      const drawBelow = () => {
        below.style.transform = `translateY(${this.belowY.get()}px) scaleY(${this.belowScale.get()})`;
        below.style.opacity = String(this.belowOpacity.get());
      };
      for (const value of [this.dotY, this.dotScale, this.dotOpacity]) value.on('change', drawDot);
      for (const value of [this.aboveY, this.aboveScale, this.aboveOpacity]) value.on('change', drawAbove);
      for (const value of [this.belowY, this.belowScale, this.belowOpacity]) value.on('change', drawBelow);
      drawDot();
      drawAbove();
      drawBelow();
    });

    afterRenderEffect((onCleanup) => {
      const active = this.active();
      const centers = this.centers();
      const lineStart = this.lineStart();
      const lineEnd = this.lineEnd();
      if (active !== null) this.lastActive = active;
      const index = active ?? this.lastActive;
      const shown = active !== null;
      const center = centers[index];
      if (center === undefined) return;

      const above =
        centers[index - 1] !== undefined
          ? { y: centers[index - 1], scale: Math.max(center - DOT / 2 - centers[index - 1], 0) / LINE_BASE }
          : { y: lineStart, scale: Math.max(center - DOT / 2 - lineStart, 0) / LINE_BASE };
      const below =
        centers[index + 1] !== undefined
          ? { y: center + DOT / 2, scale: Math.max(centers[index + 1] - (center + DOT / 2), 0) / LINE_BASE }
          : { y: center + DOT / 2, scale: Math.max(lineEnd - (center + DOT / 2), 0) / LINE_BASE };

      const glide = this.wasShown && shown;
      this.wasShown = shown;

      const moves: ReadonlyArray<readonly [MotionValue<number>, number]> = [
        [this.dotY, center - DOT / 2],
        [this.aboveY, above.y],
        [this.aboveScale, above.scale],
        [this.belowY, below.y],
        [this.belowScale, below.scale],
      ];
      const controls = moves.map(([value, to]) => {
        if (glide) return animate(value, to, FAST);
        value.jump(to);
        return null;
      });
      onCleanup(() => controls.forEach((control) => control?.stop()));

      animate(this.dotScale, shown ? 1 : DOT_HIDDEN_SCALE, FAST);
      animate(this.dotOpacity, shown ? 1 : 0, shown ? FAST : { ...FAST, delay: spring.fast.duration / 2 });
      animate(this.aboveOpacity, shown ? 1 : 0, FAST);
      animate(this.belowOpacity, shown ? 1 : 0, FAST);
    });
  }
}
