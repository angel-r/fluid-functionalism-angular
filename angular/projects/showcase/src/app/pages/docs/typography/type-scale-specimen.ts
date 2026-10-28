// ---------------------------------------------------------------------------
// The "The scale" specimen, ported from TypeScaleSpecimen in
// app/docs/typography/demos.tsx: the 5 styles as a spec sheet — the name, a
// live sample, and the font size, line height and weight (with its optical
// size), all at the page's size step, so S switches every number.
//
// The numbers are read back from the DOM after every change that can restyle
// the samples (the size step, the heading font, its weight), because the
// heading font modes restyle the heading roles: the specimen reports what the
// page actually draws rather than mirroring those values.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import {
  ScrollArea,
  cn,
  fontWeights,
  injectShape,
  injectSizeVariant,
  typeClass,
  typeStyles,
  type TypeScaleRole,
} from '@angel-r/fluid-functionalism-angular';
import { HeadingFontService } from '../../../site/heading-font';
import { nearestGoogleFontWeight } from '../../../site/google-fonts';

/** The 5 styles the page counts, each with the sample it sets (its own job),
 *  its weight, and its color. The numbers come from typeStyles. */
const SPEC: ReadonlyArray<{
  role: TypeScaleRole;
  name: string;
  sample: string;
  weight: 'bold' | 'semibold' | 'normal';
  muted: boolean;
}> = [
  { role: 'display', name: 'Display', sample: 'Page titles', weight: 'bold', muted: false },
  { role: 'title', name: 'Title', sample: 'Section titles', weight: 'semibold', muted: false },
  { role: 'subtitle', name: 'Subtitle', sample: 'Sub-headings and card titles', weight: 'semibold', muted: false },
  { role: 'body', name: 'Body', sample: 'Labels, menu items, and paragraphs', weight: 'normal', muted: true },
  { role: 'caption', name: 'Caption', sample: 'Descriptions and meta rows', weight: 'normal', muted: true },
];

/** The roles that follow the heading font (right panel > Heading font, or F). */
const HEADING_ROLE: Record<TypeScaleRole, boolean> = {
  display: true,
  title: true,
  subtitle: true,
  body: false,
  caption: false,
  micro: false,
};

/** The axes a fontWeights token sets. */
const axes = (fvs: string) => ({
  wght: /'wght' (\d+)/.exec(fvs)?.[1] ?? '',
  opsz: /'opsz' (\d+)/.exec(fvs)?.[1] ?? '',
});

/** What a sample renders at, as the numbers columns show it. */
interface Measured {
  size: number;
  leading: number;
  wght: string;
  opsz: string;
}

/** Reads a sample's rendered size and weight. A family without variation
 *  settings reports its font-weight and automatic optical size. */
function measure(element: HTMLElement): Measured {
  const cs = getComputedStyle(element);
  const fvs = cs.fontVariationSettings;
  return {
    size: Math.round(parseFloat(cs.fontSize)),
    leading: Math.round(parseFloat(cs.lineHeight)),
    wght: /"wght" ([\d.]+)/.exec(fvs)?.[1] ?? cs.fontWeight,
    opsz: /"opsz" ([\d.]+)/.exec(fvs)?.[1] ?? 'auto',
  };
}

@Component({
  selector: 'app-type-scale-specimen',
  imports: [ScrollArea],
  template: `
    <ff-scroll-area orientation="horizontal" viewportClass="scroll-fade-x" [class]="scrollClass()">
      <div class="min-w-[560px]">
        <div [class]="cols + ' border-b border-border/60 py-2.5 text-site-caption text-muted-foreground'">
          <span>Style</span>
          <span>Sample</span>
          <span>Font size</span>
          <span>Line height</span>
          <span>Weight</span>
        </div>
        @for (row of rows(); track row.role) {
          <div [class]="cols + ' border-b border-border/40 py-4 last:border-b-0'">
            <span
              class="text-site-body text-foreground"
              [style.font-variation-settings]="semibold"
            >
              {{ row.name }}
            </span>
            <span
              #sample
              [class]="row.sampleClass"
              [style.font-variation-settings]="row.weightFvs"
            >
              {{ row.sample }}
            </span>
            <span [class]="num + ' text-foreground'">{{ row.size }}px</span>
            <span [class]="num + ' text-foreground'">{{ row.leading }}px</span>
            <span [class]="num + ' flex flex-col items-start'">
              <span class="text-foreground">{{ row.wght }}</span>
              <span class="text-muted-foreground">opsz {{ row.opsz }}</span>
            </span>
          </div>
        }
      </div>
    </ff-scroll-area>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeScaleSpecimen {
  protected readonly semibold = fontWeights.semibold;
  protected readonly cols = 'grid grid-cols-[80px_minmax(0,1fr)_64px_72px_56px] items-center gap-x-4 px-5';
  protected readonly num = 'font-mono text-site-caption tabular-nums';

  private readonly heading = inject(HeadingFontService);
  private readonly sizeVariant = injectSizeVariant();
  private readonly shape = injectShape();
  private readonly step = computed(() => (this.sizeVariant() === 'compact' ? 'compact' : 'default'));
  private readonly measured = signal<Partial<Record<TypeScaleRole, Measured>>>({});
  private measuredJson = '';
  private readonly samples = viewChildren<ElementRef<HTMLElement>>('sample');
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  protected readonly scrollClass = computed(() =>
    cn('w-full border border-border/60', this.shape().container),
  );

  protected readonly rows = computed(() =>
    SPEC.map(({ role, name, sample, weight, muted }) => {
      const step = this.step();
      const tokens = axes(fontWeights[weight]);
      const measured = this.measured()[role];
      const values = measured ?? {
        size: typeStyles[role][step].size,
        leading: typeStyles[role][step].leading,
        wght: tokens.wght,
        opsz: tokens.opsz,
      };
      return {
        role,
        name,
        sample,
        size: values.size,
        leading: values.leading,
        wght: values.wght,
        opsz: values.opsz,
        weightFvs: fontWeights[weight],
        sampleClass: cn(
          'min-w-0 truncate',
          typeClass(role, step),
          muted ? 'text-muted-foreground' : 'text-foreground',
          // One class each: tailwind-merge reads font-heading and
          // font-heading-display as rival font utilities and keeps one.
          role === 'display' ? 'font-heading-display' : HEADING_ROLE[role] ? 'font-heading' : '',
        ),
      };
    }),
  );

  constructor() {
    afterNextRender(() => {
      const measureAll = () => this.readSamples();
      void this.document.fonts?.ready.then(() => measureAll());
      const observer = new ResizeObserver(() => measureAll());
      const frame = this.samples()[0]?.nativeElement.parentElement;
      if (frame) observer.observe(frame);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    // The rendered values, read back after every change that can restyle the
    // samples.
    afterRenderEffect(() => {
      this.step();
      this.heading.font();
      this.heading.custom();
      this.heading.weight();
      untracked(() => this.readSamples());
    });
  }

  private readSamples(): void {
    const elements = this.samples();
    if (elements.length !== SPEC.length) return;
    const custom = this.heading.custom();
    const next: Partial<Record<TypeScaleRole, Measured>> = {};
    SPEC.forEach(({ role }, index) => {
      const measured = measure(elements[index].nativeElement);
      // A custom family draws its nearest cut: with no faux bold, a static
      // family asked for 700 shows its heaviest weight, so report that.
      if (this.heading.font() === 'custom' && custom && measured.opsz === 'auto') {
        measured.wght = String(nearestGoogleFontWeight(custom, Number(measured.wght)));
      }
      next[role] = measured;
    });
    const json = JSON.stringify(next);
    if (json === this.measuredJson) return;
    this.measuredJson = json;
    this.measured.set(next);
  }
}
