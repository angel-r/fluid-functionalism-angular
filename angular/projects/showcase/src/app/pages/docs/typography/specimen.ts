// One side of a before/after, as on the fluid hover page and in the
// reference's typography demos: a framed specimen with its verdict under it.
// Ported from the Specimen helper in app/docs/typography/demos.tsx.

import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import { cn, injectShape } from '@angel-r/fluid-functionalism-angular';

@Component({
  selector: 'app-specimen',
  template: `
    <div class="flex min-w-0 flex-col items-center gap-3">
      <div [class]="frameClass()"><ng-content /></div>
      <span
        class="flex items-center justify-center gap-2 text-center text-site-caption text-muted-foreground"
      >
        <span aria-hidden="true">{{ good() ? '✅' : '❌' }}</span>
        <span><ng-content select="[specimen-caption]" /></span>
      </span>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Specimen {
  readonly good = input(false, { transform: booleanAttribute });
  /** Extra classes for the framed box (height, padding). */
  readonly userClass = input('', { alias: 'class' });

  private readonly shape = injectShape();

  protected readonly frameClass = computed(() =>
    cn('w-full border border-border/60', this.shape().container, this.userClass()),
  );
}
