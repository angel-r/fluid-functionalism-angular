// ---------------------------------------------------------------------------
// A month's mark on the timeline, ported from TimelineMark in
// app/changelog/changelog-view.tsx: the line's stretch down the 24px gutter
// from this month's dot to the end of its block, and the dot itself.
//
// The first month's line starts at its dot; the others run from the top of
// their block, across the divider above them. The month in view grows a step,
// on the same spring as the Releases pill in the rail.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { animate } from 'motion';
import { ReducedMotion, enterTransition, spring } from '@angel-r/fluid-functionalism-angular';

/** The middle of the title line, measured from the top of the block. */
const DOT_Y = 'calc(var(--lh-site-title, 22px) / 2)';
/** Below the divider's 64px + 1px + 64px, when the month has one. */
const DOT_Y_DIVIDED = 'calc(8rem + 1px + var(--lh-site-title, 22px) / 2)';

@Component({
  selector: 'app-changelog-timeline-mark',
  template: `
    <span
      aria-hidden
      class="absolute bottom-0 left-[2px] w-px bg-border"
      [style.top]="lineTop()"
    ></span>
    <!-- A filled dot for the month in the foreground color, the strongest on
         the page, so it reads over the faint line and apart from the entries'
         colored dots. 5px at 0 centers it on the line, with the same 3px gap
         the entry dots keep. -->
    <span
      #dot
      aria-hidden
      class="absolute left-0 size-[5px] -translate-y-1/2 rounded-full bg-foreground ring-[3px] ring-background"
      [style.top]="dotTop()"
    ></span>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogTimelineMark {
  readonly first = input(false);
  readonly active = input(false);

  protected readonly lineTop = computed(() => (this.first() ? DOT_Y : '0'));
  protected readonly dotTop = computed(() => (this.first() ? DOT_Y : DOT_Y_DIVIDED));

  private readonly reduceMotion = inject(ReducedMotion).value;
  private readonly dot = viewChild<ElementRef<HTMLElement>>('dot');
  /** Whether the dot has rendered once: like framer's `initial={false}`, the
   *  first state lands without a spring. */
  private landed = false;

  constructor() {
    afterRenderEffect(() => {
      const scale = this.active() ? 1.3 : 1;
      const element = this.dot()?.nativeElement;
      if (!element) return;
      const snap = !this.landed || this.reduceMotion();
      this.landed = true;
      animate(element, { scale }, snap ? { duration: 0 } : enterTransition(spring.moderate));
    });
  }
}
