// ---------------------------------------------------------------------------
// The two-up frame every Skill example shares, ported from Compare in
// app/docs/skill/hero-shared.tsx: generic on the left, the skill on the right,
// each captioned, with the scripted cursor drawn over both sides while the
// script plays. It is also the root the cursor hit-tests in, and the element
// that tells the player whether a real pointer or keyboard took over.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { cn, injectShape } from '@angel-r/fluid-functionalism-angular';
import { FRAME_H, SkillPlayer, type Side } from './playback';

@Component({
  selector: 'app-skill-compare',
  template: `
    <div class="flex flex-col items-center gap-3">
      <div data-side="generic" [class]="frameClass()" [style.height.px]="bare() ? null : frameH">
        <ng-content select="[generic]" />
      </div>
      <span [class]="labelClass('generic')">
        <span aria-hidden="true">❌</span> Generic AI output
      </span>
    </div>
    <div class="flex flex-col items-center gap-3">
      <div data-side="skill" [class]="frameClass()" [style.height.px]="bare() ? null : frameH">
        <ng-content select="[skill]" />
      </div>
      <span [class]="labelClass('skill')">
        <span aria-hidden="true">✅</span> With the skill
      </span>
    </div>
    <span #cursor aria-hidden class="pointer-events-none absolute -left-[3px] -top-[3px] z-30 origin-top-left">
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path
          d="m4 4 7.07 17 2.51-7.39L21 11.07z"
          stroke-width="1.5"
          stroke-linejoin="round"
          class="fill-foreground stroke-background"
        />
      </svg>
    </span>
  `,
  host: {
    '[class]': 'hostClass',
    '(mouseenter)': 'player.pointerEnter($event)',
    '(mousemove)': 'player.pointerMove($event)',
    '(pointerdown)': 'player.pointerDown($event)',
    '(mouseleave)': 'player.pointerLeave($event)',
    '(focusin)': 'player.focusIn($event)',
    '(focusout)': 'player.focusOut($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillCompare {
  /** Lists fill their frame themselves; everything else is centered in a
   *  fixed-height frame. */
  readonly bare = input(false, { transform: booleanAttribute });
  /** The side whose turn it is; its caption darkens. */
  readonly active = input<Side | null>(null);
  /** Holds the script (the changelog's page-wide Pause). */
  readonly paused = input(false, { transform: booleanAttribute });

  protected readonly frameH = FRAME_H;
  protected readonly hostClass = 'relative grid w-full max-w-xl gap-5 sm:grid-cols-2';
  protected readonly player = inject(SkillPlayer);

  private readonly shape = injectShape();
  private readonly cursorRef = viewChild.required<ElementRef<HTMLElement>>('cursor');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly frameClass = computed(() =>
    cn('relative w-full overflow-hidden', !this.bare() && 'flex items-center justify-center', this.shape().container),
  );

  constructor() {
    afterNextRender(() => this.player.attach(this.host.nativeElement, this.cursorRef().nativeElement));
    effect(() => this.player.paused.set(this.paused()));
  }

  protected labelClass(side: Side): string {
    return [
      'text-site-caption transition-colors duration-150',
      this.active() === side ? 'text-foreground' : 'text-muted-foreground',
    ].join(' ');
  }
}
