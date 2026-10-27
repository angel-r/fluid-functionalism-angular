// ---------------------------------------------------------------------------
// The skeleton pieces the Reveal demos load behind their slow data.
//
// shadcn's Skeleton is a `[data-slot="skeleton"]` box, and the reveal CSS
// (`theme.css`, `<generated:reveal>`) fades and pulses exactly that attribute,
// so the element carrying it has to be the box itself: the hosts here are
// `display: contents` and the markup inside is what React rendered.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cn } from '@angel-r/fluid-functionalism-angular';

/** shadcn's Skeleton: `bg-accent animate-pulse rounded-md` plus the caller's
 *  classes, merged the way `cn()` merges them in React. */
@Component({
  selector: 'app-reveal-skeleton',
  template: '<div data-slot="skeleton" [class]="hostClass()" [style.opacity]="opacity()"></div>',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevealSkeleton {
  readonly className = input('');
  readonly opacity = input<number | undefined>(undefined);

  protected readonly hostClass = computed(() => cn('bg-accent animate-pulse rounded-md', this.className()));
}

/** 1 line of text as a skeleton: a box the line's height, so a block of these
 *  is exactly as tall as the text it stands in for. */
@Component({
  selector: 'app-reveal-line',
  imports: [RevealSkeleton],
  template: `
    <span [class]="spanClass()">
      <app-reveal-skeleton [className]="skeletonClass()" />
    </span>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevealLine {
  readonly className = input('');
  readonly height = input('h-4');

  protected readonly spanClass = computed(() => cn('flex items-center', this.height()));
  protected readonly skeletonClass = computed(() => cn('h-2.5', this.className()));
}
