// ---------------------------------------------------------------------------
// The month heading's copy-link glyph: the link icon crossfades into a check
// for two seconds after the month's URL is copied, on spring.fast both ways
// (the reference's AnimatePresence popLayout swap, stacked on one grid cell so
// the 20px target never moves).
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  input,
  viewChild,
} from '@angular/core';
import { Icon, enterTransition, exitTransition, injectAnimateFluid, spring } from '@angel-r/fluid-functionalism-angular';

const SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' };
const HIDDEN = { opacity: 0, scale: 0.6, filter: 'blur(4px)' };

@Component({
  selector: 'app-changelog-month-glyph',
  imports: [Icon],
  template: `
    <span class="grid place-items-center">
      <span #linkGlyph class="col-start-1 row-start-1 grid place-items-center">
        <ff-icon name="link" [size]="14" />
      </span>
      <span
        #checkGlyph
        class="col-start-1 row-start-1 grid place-items-center"
        style="opacity: 0; transform: scale(0.6); filter: blur(4px)"
      >
        <ff-icon name="check" [size]="14" />
      </span>
    </span>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogMonthGlyph {
  readonly copied = input(false);

  private readonly animate = injectAnimateFluid();
  private readonly linkGlyph = viewChild<ElementRef<HTMLElement>>('linkGlyph');
  private readonly checkGlyph = viewChild<ElementRef<HTMLElement>>('checkGlyph');

  constructor() {
    afterRenderEffect(() => {
      const copied = this.copied();
      const link = this.linkGlyph()?.nativeElement;
      const check = this.checkGlyph()?.nativeElement;
      if (!link || !check) return;
      this.animate(link, copied ? HIDDEN : SHOWN, copied ? exitTransition(spring.fast) : enterTransition(spring.fast));
      this.animate(check, copied ? SHOWN : HIDDEN, copied ? enterTransition(spring.fast) : exitTransition(spring.fast));
    });
  }
}
