// ---------------------------------------------------------------------------
// The "5 tweaks" demos that need no loop, ported from TrimDemo, BalanceDemo
// and PrettyDemo in app/docs/typography/demos.tsx:
// - Trimmed labels measure a chip's line box around its capitals and baseline
//   and tint what the line box adds past them.
// - Balanced headings and pretty paragraphs show the same text under `wrap`
//   and under the property the page recommends.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { cn, fontWeights, injectShape, typeClass } from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { Specimen } from './specimen';

// Measured at 13px on a 20px line: the line box reaches 5.3px past the
// capitals and 5.3px past the baseline (Inter's two are equal), so 8px of
// padding reads as 13px. Trimmed, the box stops at the capitals and the
// baseline, and 8px reads as 8px.
const TRIM = '[text-box:trim-both_cap_alphabetic]';
const CHIP_LABEL = 'Draft saved';
/** Inter's cap height in ems, from the font's OS/2 table (1490 / 2048). */
const INTER_CAP_HEIGHT = 1490 / 2048;

/** A chip with 8px of padding on every side. Blue lines mark its label's
 *  capitals and baseline; what the line box adds past them is tinted red. */
@Component({
  selector: 'app-trim-chip',
  template: `
    <div #chip [class]="chipClass()">
      @if (marks(); as m) {
        @if (m.cap - m.top >= 0.5) {
          <span
            aria-hidden
            class="pointer-events-none absolute bg-[#F2555A]/45"
            [style.left.px]="m.left"
            [style.width.px]="m.width"
            [style.top.px]="m.top"
            [style.height.px]="m.cap - m.top"
          ></span>
        }
        @if (m.bottom - m.base >= 0.5) {
          <span
            aria-hidden
            class="pointer-events-none absolute bg-[#F2555A]/45"
            [style.left.px]="m.left"
            [style.width.px]="m.width"
            [style.top.px]="m.base"
            [style.height.px]="m.bottom - m.base"
          ></span>
        }
      }
      <!-- text-box needs a block container: the label is a flex item. -->
      <span #label class="relative z-10 whitespace-nowrap" [class]="trimmed() ? trim : ''">
        <span #baseline aria-hidden class="inline-block h-0 w-0 align-baseline"></span>
        {{ chipLabel }}
      </span>
      @if (marks(); as m) {
        @for (y of [m.cap, m.base]; track $index) {
          <span
            aria-hidden
            class="pointer-events-none absolute inset-x-0 z-20 h-px -translate-y-1/2 bg-[#6B97FF]"
            [style.top.px]="y"
          ></span>
        }
      }
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrimChip {
  /** Trimmed, the label's box stops at the capitals and the baseline. */
  readonly trimmed = input(false, { transform: booleanAttribute });
  /** The cap height above the label's top, in px: what trim removes. */
  readonly aboveChange = output<number>();

  protected readonly chipLabel = CHIP_LABEL;
  protected readonly trim = TRIM;
  protected readonly shape = injectShape();
  protected readonly chipClass = computed(() =>
    cn('relative inline-flex bg-[var(--tint)] p-2 text-foreground', this.shape().bg, typeClass('body')),
  );
  protected readonly marks = signal<{
    left: number;
    width: number;
    top: number;
    bottom: number;
    cap: number;
    base: number;
  } | null>(null);

  private readonly chipRef = viewChild.required<ElementRef<HTMLElement>>('chip');
  private readonly labelRef = viewChild.required<ElementRef<HTMLElement>>('label');
  private readonly baselineRef = viewChild.required<ElementRef<HTMLElement>>('baseline');
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  constructor() {
    afterNextRender(() => {
      const measure = () => {
        const chip = this.chipRef().nativeElement;
        const label = this.labelRef().nativeElement;
        const baseline = this.baselineRef().nativeElement;
        const c = chip.getBoundingClientRect();
        const l = label.getBoundingClientRect();
        const base = baseline.getBoundingClientRect().bottom - c.top;
        const cap = base - parseFloat(getComputedStyle(label).fontSize) * INTER_CAP_HEIGHT;
        this.marks.set({
          left: l.left - c.left,
          width: l.width,
          top: l.top - c.top,
          bottom: l.bottom - c.top,
          cap,
          base,
        });
        this.aboveChange.emit(cap);
      };
      // Metrics are only right once Inter has loaded.
      void this.document.fonts?.ready.then(() => measure());
      const observer = new ResizeObserver(() => measure());
      observer.observe(this.chipRef().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

const above = (px: number | null) =>
  px === null ? '' : `: ${Math.round(px)}px above the capitals`;

@Component({
  selector: 'app-trim-demo',
  imports: [ComponentPreview, Specimen, TrimChip],
  template: `
    <app-component-preview [hideHeader]="true">
      <div class="grid w-full max-w-xl gap-5 sm:grid-cols-2">
        <app-specimen
          [good]="false"
          class="flex h-16 items-center justify-center"
        >
          <span specimen-caption>Untrimmed{{ above(plain()) }}</span>
          <app-trim-chip (aboveChange)="plain.set($event)" />
        </app-specimen>
        <app-specimen [good]="true" class="flex h-16 items-center justify-center">
          <span specimen-caption>Trimmed{{ trims() ? above(trimmed()) : ': not in this browser yet' }}</span>
          <app-trim-chip
            [trimmed]="true"
            (aboveChange)="
              trimmed.set($event);
              trims.set(CSS.supports('text-box', 'trim-both cap alphabetic'))
            "
          />
        </app-specimen>
      </div>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrimDemo {
  protected readonly above = above;
  protected readonly plain = signal<number | null>(null);
  protected readonly trimmed = signal<number | null>(null);
  /** A browser without text-box sets both chips the same. */
  protected readonly trims = signal(true);
  protected readonly CSS = CSS;

  protected readonly trimChip = TrimChip;
}

// Measured at 214px: wrap sets the headline 4 words over 2 (199px, then
// 97px), balance 3 over 3 with the first line the longer (171px, 126px).
const HEADLINE = 'Give every component the same motion';
const PARAGRAPH =
  'Hover glides from item to item instead of blinking, so the highlight always sits under your cursor.';
const SAMPLE = 'w-[214px] max-w-full';

@Component({
  selector: 'app-balance-demo',
  imports: [ComponentPreview, Specimen],
  template: `
    <app-component-preview [hideHeader]="true">
      <div class="grid w-full max-w-xl gap-5 sm:grid-cols-2">
        <app-specimen [good]="false" class="px-4 py-5">
          <span specimen-caption><code>wrap</code> leaves a short last line</span>
          <p [class]="wrapClass" [style.font-variation-settings]="semibold">{{ headline }}</p>
        </app-specimen>
        <app-specimen [good]="true" class="px-4 py-5">
          <span specimen-caption><code>balance</code> evens the lines</span>
          <p [class]="balanceClass" [style.font-variation-settings]="semibold">{{ headline }}</p>
        </app-specimen>
      </div>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BalanceDemo {
  protected readonly headline = HEADLINE;
  protected readonly semibold = fontWeights.semibold;
  protected readonly wrapClass = cn(typeClass('title'), SAMPLE, 'text-foreground', '[text-wrap:wrap]');
  protected readonly balanceClass = cn(typeClass('title'), SAMPLE, 'text-foreground', '[text-wrap:balance]');
}

@Component({
  selector: 'app-pretty-demo',
  imports: [ComponentPreview, Specimen],
  template: `
    <app-component-preview [hideHeader]="true">
      <div class="grid w-full max-w-xl gap-5 sm:grid-cols-2">
        <app-specimen [good]="false" class="px-4 py-5">
          <span specimen-caption><code>wrap</code> leaves one word alone</span>
          <p [class]="wrapClass">{{ paragraph }}</p>
        </app-specimen>
        <app-specimen [good]="true" class="px-4 py-5">
          <span specimen-caption><code>pretty</code> brings a word down to join it</span>
          <p [class]="prettyClass">{{ paragraph }}</p>
        </app-specimen>
      </div>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrettyDemo {
  protected readonly paragraph = PARAGRAPH;
  protected readonly wrapClass = cn(typeClass('body'), SAMPLE, 'text-muted-foreground', '[text-wrap:wrap]');
  protected readonly prettyClass = cn(typeClass('body'), SAMPLE, 'text-muted-foreground', '[text-wrap:pretty]');
}
