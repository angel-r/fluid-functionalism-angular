// ---------------------------------------------------------------------------
// Move through levels — a stepped slider walks up the surface ladder, nesting
// one Elevated layer per level. Ported from the buildStack/ElevationStackDemo of
// app/docs/surfaces/page.tsx: the stage reserves the full 1→8 height with an
// invisible ghost stack, so the preview keeps its max size while you drag.
// ---------------------------------------------------------------------------

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import {
  Elevated,
  Slider,
  SurfaceProvider,
  surfaceClasses,
  type SliderValue,
} from '@angel-r/fluid-functionalism-angular';
import { SurfacesPreview } from './preview';

const ELEVATION_STACK_CODE = `<!-- Drag both knobs to pick the slice of the ladder to nest. -->
<div [ffSurface]="low()">            <!-- base = surface-{low} -->
  <div [ffElevated]="1">             <!-- surface-{low + 1} -->
    <!-- …nested up to surface-{high} -->
  </div>
</div>

<ff-slider [value]="range()" [min]="1" [max]="8" [step]="1" showSteps
  (valueChange)="setRange($event)" />`;

// Each surface's label is hidden until you hover *that* surface. Because the
// boxes nest (hovering an inner one also :hovers its ancestors), the second
// variant hides a label whenever a descendant surface is the one being
// hovered — so only the surface directly under the cursor shows its name.
const BOX_CLASS =
  'relative rounded-2xl p-6 flex items-center justify-center [&:hover>span]:opacity-100 [&:has([data-surface]:hover)>span]:opacity-0';
const LABEL_CLASS =
  'absolute top-2 left-2.5 text-site-caption text-muted-foreground opacity-0 transition-opacity duration-150';

/** Nested stack from surface-{low} (base) up to surface-{high}, each layer
 *  lifting +1 off the one it sits in via the real Elevated primitive.
 *  Innermost surface is a square; each enclosing surface wraps it with uniform
 *  padding, so the whole stack stays concentric squares. */
@Component({
  selector: 'app-elevation-stack',
  imports: [NgTemplateOutlet, Elevated, SurfaceProvider],
  template: `
    <div [ffSurface]="low()" [class]="baseClass()" data-surface>
      <span [class]="labelClass">surface-{{ low() }}</span>
      @if (low() < high()) {
        <ng-container [ngTemplateOutlet]="nested" [ngTemplateOutletContext]="{ $implicit: low() + 1 }" />
      }
    </div>

    <ng-template #nested let-level>
      <div [ffElevated]="1" data-surface [class]="innerClass(level)">
        <span [class]="labelClass">surface-{{ level }}</span>
        @if (level < high()) {
          <ng-container [ngTemplateOutlet]="nested" [ngTemplateOutletContext]="{ $implicit: level + 1 }" />
        }
      </div>
    </ng-template>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElevationStack {
  readonly low = input.required<number>();
  readonly high = input.required<number>();

  protected readonly labelClass = LABEL_CLASS;

  protected readonly baseClass = computed(
    () =>
      `${BOX_CLASS} ${surfaceClasses(this.low())}${this.low() === this.high() ? ' size-24' : ''}`,
  );

  protected innerClass(level: number): string {
    return `${BOX_CLASS}${level === this.high() ? ' size-24' : ''}`;
  }
}

@Component({
  selector: 'app-surfaces-elevation-stack-demo',
  imports: [ElevationStack, Slider, SurfacesPreview],
  template: `
    <app-surfaces-preview [code]="stackCode">
      <div class="dark w-full flex flex-col gap-6">
        <!-- The stage reserves the full 1→8 height (an invisible ghost stack),
             so the preview stays at its max size as you drag — no resizing. -->
        <div class="relative w-full max-w-[520px] mx-auto">
          <div class="invisible pointer-events-none" aria-hidden="true">
            <app-elevation-stack [low]="1" [high]="8" />
          </div>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <app-elevation-stack [low]="range()[0]" [high]="range()[1]" />
          </div>
        </div>
        <div class="w-full max-w-[520px] mx-auto px-1 pb-2">
          <ff-slider
            [value]="range()"
            [min]="1"
            [max]="8"
            [step]="1"
            showSteps
            (valueChange)="setRange($event)"
          />
        </div>
      </div>
    </app-surfaces-preview>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurfacesElevationStackDemo {
  protected readonly stackCode = ELEVATION_STACK_CODE;
  protected readonly range = signal<[number, number]>([1, 4]);

  /** Range mode always reports a tuple; a scalar write is ignored. */
  protected setRange(value: SliderValue): void {
    if (Array.isArray(value)) this.range.set([value[0], value[1]]);
  }
}
