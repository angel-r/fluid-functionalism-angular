// ---------------------------------------------------------------------------
// The "Steady numbers" demo, ported from NumbersDemo and CountRow in
// app/docs/typography/demos.tsx: the same count climbing in proportional and
// tabular digits. The blue line marks the narrowest count's width; whatever
// runs past it is tinted red. The count climbs while the demo is on screen and
// holds while a pointer is inside; reduced motion shows the last count.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ReducedMotion, cn, typeClass } from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { Specimen } from './specimen';

// Measured at 13px: Inter's default "1" is 5.3px wide and its "0" 8.2px, so
// the line drifts 6.2px as the count climbs from 10 to 48. Tabular digits are
// all 8.4px, and the line holds still.
const COUNT_FROM = 10;
const COUNT_TO = 48;
const countLabel = (n: number) => `Installed ${n} of ${COUNT_TO} components`;
const TICK_MS = 120;
/** Ticks the finished count holds before the next run. */
const HOLD_TICKS = 10;
const CYCLE_TICKS = COUNT_TO - COUNT_FROM + 1 + HOLD_TICKS;

/** A row whose count climbs. The blue line marks the narrowest count's
 *  width; whatever runs past it is tinted red. */
@Component({
  selector: 'app-count-row',
  template: `
    <div #frame class="relative p-1" [class]="numeric()">
      @if (marks(); as m) {
        <span
          aria-hidden
          class="pointer-events-none absolute inset-y-2 z-20 w-px bg-[#6B97FF]"
          [style.left.px]="m.left + rest()"
        ></span>
        @if (over() >= 0.5) {
          <span
            aria-hidden
            class="pointer-events-none absolute z-20 bg-[#F2555A]/45"
            [style.left.px]="m.left + rest()"
            [style.width.px]="over()"
            [style.top.px]="m.top - 3"
            [style.height.px]="m.height + 6"
          ></span>
        }
      }
      <div [class]="rowClass">
        <span #labelEl class="whitespace-nowrap text-foreground">{{ labelText() }}</span>
      </div>
      <span #sizer aria-hidden [class]="sizerClass"></span>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountRow {
  /** `normal-nums` or `tabular-nums`. */
  readonly numeric = input('normal-nums');
  readonly count = input(COUNT_FROM);
  /** How far the label drifts between the narrowest and widest count, in px. */
  readonly driftChange = output<number>();

  protected readonly rowClass = cn('flex h-9 items-center px-2', typeClass('body'));
  /** A label with no row padding: what the sizer measures. */
  protected readonly sizerClass = cn('invisible absolute left-0 top-0 whitespace-nowrap', typeClass('body'));
  protected readonly marks = signal<{ left: number; widths: number[]; top: number; height: number } | null>(null);

  protected readonly labelText = computed(() => countLabel(this.count()));
  protected readonly rest = computed(() => (this.marks() ? Math.min(...this.marks()!.widths) : 0));
  protected readonly over = computed(() => {
    const marks = this.marks();
    return marks ? marks.widths[this.count() - COUNT_FROM] - this.rest() : 0;
  });

  private readonly frameRef = viewChild.required<ElementRef<HTMLElement>>('frame');
  private readonly labelRef = viewChild.required<ElementRef<HTMLElement>>('labelEl');
  private readonly sizerRef = viewChild.required<ElementRef<HTMLElement>>('sizer');
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  constructor() {
    afterNextRender(() => {
      const measure = () => {
        const frame = this.frameRef().nativeElement;
        const label = this.labelRef().nativeElement;
        const sizer = this.sizerRef().nativeElement;
        const widths: number[] = [];
        for (let n = COUNT_FROM; n <= COUNT_TO; n++) {
          sizer.textContent = countLabel(n);
          widths.push(sizer.getBoundingClientRect().width);
        }
        sizer.textContent = '';
        const f = frame.getBoundingClientRect();
        const l = label.getBoundingClientRect();
        this.marks.set({ left: l.left - f.left, widths, top: l.top - f.top, height: l.height });
        this.driftChange.emit(Math.max(...widths) - Math.min(...widths));
      };
      // Widths are only right once Inter has loaded.
      void this.document.fonts?.ready.then(() => measure());
      const observer = new ResizeObserver(() => measure());
      observer.observe(this.frameRef().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

const drift = (px: number | null) =>
  px === null ? '' : px < 0.25 ? ': holds still' : `: drifts ${px.toFixed(1)}px`;

@Component({
  selector: 'app-numbers-demo',
  imports: [ComponentPreview, Specimen, CountRow],
  template: `
    <app-component-preview [hideHeader]="true">
      <div
        #root
        class="grid w-full max-w-xl gap-5 sm:grid-cols-2"
        (mouseenter)="held.set(true)"
        (mouseleave)="held.set(false)"
      >
        <app-specimen [good]="false">
          <span specimen-caption>Proportional digits{{ drift(proportional()) }}</span>
          <app-count-row [numeric]="'normal-nums'" [count]="count()" (driftChange)="proportional.set($event)" />
        </app-specimen>
        <app-specimen [good]="true">
          <span specimen-caption>Tabular digits{{ drift(tabular()) }}</span>
          <app-count-row [numeric]="'tabular-nums'" [count]="count()" (driftChange)="tabular.set($event)" />
        </app-specimen>
      </div>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumbersDemo {
  protected readonly drift = drift;
  protected readonly proportional = signal<number | null>(null);
  protected readonly tabular = signal<number | null>(null);
  protected readonly held = signal(false);
  protected readonly count = signal(COUNT_FROM);

  private readonly inView = signal(false);
  private readonly reduced = inject(ReducedMotion).value;
  private readonly playing = computed(() => this.inView() && !this.reduced() && !this.held());
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const root = this.root()?.nativeElement;
      if (!root) return;
      const observer = new IntersectionObserver((entries) => this.inView.set(entries.some((e) => e.isIntersecting)), {
        threshold: 0.5,
      });
      observer.observe(root);
      this.destroyRef.onDestroy(() => observer.disconnect());

    });

    let tick = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    effect(() => {
      const playing = this.playing();
      untracked(() => {
        stop();
        if (!playing) {
          this.count.set(this.reduced() ? COUNT_TO : Math.min(COUNT_FROM + tick, COUNT_TO));
          return;
        }
        timer = setInterval(() => {
          tick = (tick + 1) % CYCLE_TICKS;
          this.count.set(Math.min(COUNT_FROM + tick, COUNT_TO));
        }, TICK_MS);
      });
    });
    this.destroyRef.onDestroy(stop);
  }
}
