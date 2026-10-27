// ---------------------------------------------------------------------------
// The skeleton chrome the Banner page wraps its demos in, ported from
// lib/docs/playgrounds/banner.tsx (`SkeletonLines`, `MockPage`, the held height
// of the inline page).
//
// MockPage stands in for a real page: a header strip, the banner (projected),
// then content that scrolls on its own below both. SkeletonLines are the muted
// bars that stand in for the page text around an inline banner, and
// BannerInlinePage stacks that page and holds the height it had while the
// banner was open.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { cn } from '@angel-r/fluid-functionalism-angular';

const ROW_WIDTHS = [92, 84, 88, 60, 95, 78, 86, 70, 50, 90, 82, 94, 66, 88, 74, 58];

/** Muted skeleton bars standing in for the page around the banner. */
@Component({
  selector: 'app-skeleton-lines',
  template: `
    <div class="flex flex-col gap-3" aria-hidden="true">
      @for (width of widths(); track $index) {
        <div class="h-4 rounded-full bg-muted" [style.width.%]="width"></div>
      }
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonLines {
  readonly widths = input.required<readonly number[]>();
}

/** A skeleton page for the fixed banner: a header, the banner right under it,
 *  and page content that scrolls on its own below both. */
@Component({
  selector: 'app-banner-mock-page',
  template: `
    <div [class]="rootClass()">
      <div class="flex h-11 shrink-0 items-center gap-4 border-b border-border/60 px-4" aria-hidden="true">
        <div class="size-5 rounded-md bg-muted"></div>
        <div class="flex items-center gap-3">
          <div class="h-2.5 w-10 rounded-full bg-muted"></div>
          <div class="h-2.5 w-12 rounded-full bg-muted"></div>
          <div class="h-2.5 w-9 rounded-full bg-muted"></div>
        </div>
        <div class="ml-auto size-6 rounded-full bg-muted"></div>
      </div>
      <ng-content />
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="flex flex-col gap-3 p-5" aria-hidden="true">
          <div class="h-3 w-1/3 rounded-full bg-muted"></div>
          @for (width of rowWidths; track $index) {
            <div class="h-2.5 rounded-full bg-muted" [style.width.%]="width"></div>
          }
        </div>
      </div>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerMockPage {
  /** The page's height, as a Tailwind class (`h-[240px]` by default). */
  readonly heightClass = input('h-[240px]');

  protected readonly rowWidths = ROW_WIDTHS;
  protected readonly rootClass = computed(() =>
    cn('flex w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background', this.heightClass()),
  );
}

/** The inline demo page: lighter skeleton lines, the banner, fuller ones. Holds
 *  the page at the tallest height it has had while the banner was open. */
@Component({
  selector: 'app-banner-inline-page',
  imports: [SkeletonLines],
  template: `
    <div class="w-full max-w-[560px]" [style.minHeight.px]="held() || null">
      <div #page class="flex flex-col gap-3">
        <app-skeleton-lines [widths]="[45]" />
        <ng-content />
        <app-skeleton-lines [widths]="[85, 60]" />
      </div>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerInlinePage {
  /** Whether the banner is showing: only then is the page's height held. */
  readonly open = input.required<boolean>();
  /** Every control's value: a change re-measures, as the reference's
   *  `resetKey` does. */
  readonly resetKey = input.required<string>();

  protected readonly held = signal(0);

  private readonly page = viewChild<ElementRef<HTMLElement>>('page');
  private pageWidth = 0;

  constructor() {
    // Holds the page at the tallest height it has had while the banner was
    // open: a dismiss then never shrinks the page (which would re-centre it in
    // the preview), and a tall banner (a narrow screen, wrapped actions) is
    // never cut.
    afterRenderEffect(() => {
      this.resetKey();
      const page = this.page()?.nativeElement;
      if (page && untracked(() => this.open())) this.held.set(page.offsetHeight);
    });

    // A resize re-measures; a width change measures afresh, the same width
    // only ever grows the held height.
    afterRenderEffect((onCleanup) => {
      const page = this.page()?.nativeElement;
      if (!page || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => {
        if (!untracked(() => this.open())) return;
        const height = page.offsetHeight;
        if (page.offsetWidth !== this.pageWidth) {
          this.pageWidth = page.offsetWidth;
          this.held.set(height);
        } else {
          this.held.update((held) => Math.max(held, height));
        }
      });
      observer.observe(page);
      onCleanup(() => observer.disconnect());
    });
  }
}
