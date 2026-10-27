// Demo 2 of /docs/fluid-hover, ported from app/docs/fluid-hover/demos.tsx
// (`MathList` / `ShowTheMathDemo`): the rule, drawn on the list it runs on.
// The dashed lines are the midpoints where the highlight flips, the blue line
// is the pointer, and the rail measures its distance to the winning centre.
import { ChangeDetectionStrategy, Component, ElementRef, computed, signal, viewChild } from '@angular/core';
import {
  FluidHover,
  FluidHoverHighlight,
  Switch,
  cn,
  injectShape,
} from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { FluidRow, ROWS } from './fluid-hover-rows';
import { mathCode } from './fluid-hover-snippets';

@Component({
  selector: 'app-show-the-math-demo',
  imports: [ComponentPreview, FluidHover, FluidHoverHighlight, FluidRow, Switch],
  host: { style: 'display: contents' },
  template: `
    <app-component-preview [code]="code">
      <div class="flex w-full max-w-sm flex-col items-center gap-4">
        <div [class]="frameClass()">
          <div
            #list
            ffFluidHover
            class="relative flex w-full flex-col gap-1 px-2 py-6"
            (mouseleave)="leave()"
            (mousemove)="move($event)"
          >
            <ff-fluid-hover-highlight [class]="shape().bg" />
            @for (label of rows; track label; let i = $index) {
              <app-fluid-row [index]="i">{{ label }}</app-fluid-row>
            }

            @if (showMath()) {
              <div class="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
                <!-- Midpoints between centres: the highlight flips here -->
                @for (y of boundaries(); track $index) {
                  <div class="absolute left-2 right-2 border-t border-dashed border-foreground/20" [style.top.px]="y"></div>
                }
                <!-- Cursor -->
                @if (hasCursor()) {
                  <div
                    class="absolute left-2 right-2 h-px bg-[color:var(--focus-ring,#6B97FF)] opacity-70"
                    [style.top.px]="cursorY() ?? 0"
                  ></div>
                }
                <!-- Rail: one dot per row centre, and the distance to the winner -->
                <div class="absolute inset-y-0 right-5 w-0">
                  @for (center of centers(); track $index; let i = $index) {
                    @if (center !== null) {
                      <div [class]="dotClass(i)" [style.top.px]="center"></div>
                    }
                  }
                  @if (segment(); as seg) {
                    <div
                      class="absolute left-0 w-px -translate-x-1/2 bg-[color:var(--focus-ring,#6B97FF)]"
                      [style.top.px]="seg.top"
                      [style.height.px]="seg.height"
                    ></div>
                    <span
                      class="absolute left-0 -translate-x-[calc(100%+8px)] -translate-y-1/2 whitespace-nowrap font-mono text-[11px] leading-3.5 text-foreground"
                      [style.top.px]="seg.labelTop"
                      >{{ seg.distance }}px</span
                    >
                  }
                </div>
              </div>
            }
          </div>
        </div>
        <ff-switch label="Show the math" [checked]="showMath()" (toggle)="showMath.set(!showMath())" />
      </div>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowTheMathDemo {
  protected readonly code = mathCode;
  protected readonly rows = ROWS;
  protected readonly shape = injectShape();
  protected readonly showMath = signal(true);
  protected readonly frameClass = computed(() => cn('w-full border border-border/60', this.shape().container));

  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  private readonly hover = viewChild(FluidHover);

  /** The pointer's y in list coordinates, or null outside the list. */
  protected readonly cursorY = signal<number | null>(null);
  protected readonly hasCursor = computed(() => this.cursorY() !== null);

  private readonly activeIndex = computed(() => this.hover()?.controller.activeIndex() ?? null);
  private readonly itemRects = computed(() => this.hover()?.controller.itemRects() ?? []);
  private readonly isMeasured = computed(() => this.hover()?.controller.isMeasured() ?? false);

  private readonly rect = computed(() => {
    const index = this.activeIndex();
    return this.isMeasured() && index !== null ? (this.itemRects()[index] ?? null) : null;
  });

  protected readonly centers = computed<(number | null)[]>(() => {
    if (!this.isMeasured()) return [];
    const rects = this.itemRects();
    return ROWS.map((_, i) => {
      const r = rects[i];
      return r ? r.top + r.height / 2 : null;
    });
  });

  /** The highlight flips where the cursor crosses the midpoint between two
   *  neighbouring centres. */
  protected readonly boundaries = computed(() => {
    const centers = this.centers();
    return centers.flatMap((c, i) => {
      const next = centers[i + 1];
      return c !== null && next != null ? [(c + next) / 2] : [];
    });
  });

  private readonly winner = computed(() => {
    const rect = this.rect();
    return rect ? rect.top + rect.height / 2 : null;
  });

  protected readonly segment = computed(() => {
    const cursor = this.cursorY();
    const winner = this.winner();
    if (cursor === null || winner === null) return null;
    return {
      top: Math.min(cursor, winner),
      height: Math.abs(cursor - winner),
      labelTop: (cursor + winner) / 2,
      distance: Math.round(Math.abs(cursor - winner)),
    };
  });

  protected dotClass(index: number): string {
    return cn(
      'absolute left-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors',
      index === this.activeIndex() ? 'bg-[color:var(--focus-ring,#6B97FF)]' : 'bg-foreground/25',
    );
  }

  protected move(event: MouseEvent): void {
    const box = this.list()?.nativeElement.getBoundingClientRect();
    if (box) this.cursorY.set(event.clientY - box.top);
  }

  protected leave(): void {
    this.cursorY.set(null);
  }
}
