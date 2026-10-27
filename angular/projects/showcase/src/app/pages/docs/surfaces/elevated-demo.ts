// ---------------------------------------------------------------------------
// Elevated — the primitive in three nested layers. The preview shows the boxes;
// the Code tab shows the directive's source. Ported from the ElevatedDemo of
// app/docs/surfaces/page.tsx.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Elevated, surfaceClasses } from '@angel-r/fluid-functionalism-angular';
import { SurfacesPreview } from './preview';

const ELEVATED_SOURCE = `import { SURFACE_LEVEL, injectSurface, surfaceClasses } from '@angel-r/fluid-functionalism-angular';

@Directive({
  selector: '[ffElevated]',
  host: { '[class]': 'surfaceClass()' },
  // Re-provides the new level, so what opens inside lifts one step further.
  providers: [{ provide: SURFACE_LEVEL, useFactory: () => inject(Elevated).level }],
})
export class Elevated {
  readonly offset = input.required<number>({ alias: 'ffElevated' });
  // Pins the shadow's weight, whatever level the background lands on.
  readonly shadowLevel = input<number | undefined>(undefined);
  private readonly substrate = injectSurface();

  readonly level = computed(() => Math.min(this.substrate() + this.offset(), 8));
  protected readonly surfaceClass = computed(() =>
    surfaceClasses(this.level(), this.shadowLevel() ?? this.level()),
  );
}`;

@Component({
  selector: 'app-surfaces-elevated-demo',
  imports: [Elevated, SurfacesPreview],
  template: `
    <app-surfaces-preview [code]="elevatedSource">
      <div class="dark w-full">
        <div [class]="pageClass">
          <span class="text-site-caption text-muted-foreground">Page</span>
          <div [ffElevated]="2" class="rounded-2xl p-5 flex flex-col gap-3">
            <span class="text-site-caption text-muted-foreground">Card</span>
            <div [ffElevated]="2" class="rounded-2xl p-5 flex flex-col gap-3">
              <span class="text-site-caption text-muted-foreground">Popover</span>
              <div [ffElevated]="2" class="rounded-2xl p-5">
                <span class="text-site-caption text-muted-foreground">Menu</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </app-surfaces-preview>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurfacesElevatedDemo {
  protected readonly elevatedSource = ELEVATED_SOURCE;
  protected readonly pageClass = `flex flex-col gap-3 p-5 rounded-2xl w-full max-w-[480px] mx-auto ${surfaceClasses(1)}`;
}
