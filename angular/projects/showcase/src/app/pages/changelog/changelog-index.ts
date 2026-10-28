// ---------------------------------------------------------------------------
// The Releases index: the right rail's only card on /changelog, ported from
// ReleaseIndexCard in app/changelog/changelog-view.tsx. One 32px row per month,
// a filled pill on the month in view that glides as the page scrolls, and the
// house fluid hover under it.
//
// The month labels are stacked twice: an invisible semibold copy reserves the
// selected state's width, so the weight change never reflows the row.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { animate } from 'motion';
import {
  FluidHover,
  FluidHoverHighlight,
  FluidHoverItem,
  ReducedMotion,
  cn,
  enterTransition,
  fontWeights,
  injectShape,
  spring,
} from '@angel-r/fluid-functionalism-angular';
import { monthLabel, type ReleaseView } from './changelog-data';

@Component({
  selector: 'app-changelog-index',
  imports: [FluidHover, FluidHoverHighlight, FluidHoverItem],
  template: `
    <aside aria-label="Releases" [class]="asideClass()">
      <!-- The same header as "Make them yours": 8px above and below a 28px
           row (the height of its star button), the title centered in it. -->
      <div class="py-2">
        <h2
          class="flex h-7 items-center text-site-title text-foreground"
          [style.font-variation-settings]="semibold"
        >
          Releases
        </h2>
      </div>
      <!-- mt-2.5: "Make them yours" starts its 28px rows 12px under the
           header; these rows are 32px, so 10px puts the first month's text as
           far under the title as "Theme" sits. -->
      <div #list ffFluidHover class="relative -mx-2 mt-2.5 flex flex-col">
        <!-- The month in view: a filled pill that glides as the page scrolls,
             under the hover highlight's lighter fill. -->
        @if (activeRect()) {
          <div #pill aria-hidden [class]="pillClass()"></div>
        }
        <ff-fluid-hover-highlight [class]="shape().bg" />
        @for (release of releases(); track release.month; let i = $index) {
          <a
            [href]="'#' + release.month"
            [ffFluidHoverItem]="i"
            [attr.aria-current]="release.month === activeMonth() ? 'location' : null"
            (click)="select($event, release.month)"
            [class]="rowClass(release.month)"
          >
            <span class="inline-grid">
              <span
                aria-hidden
                class="invisible col-start-1 row-start-1 [text-box:trim-both_cap_alphabetic]"
                [style.font-variation-settings]="semibold"
                >{{ label(release.month) }}</span
              >
              <span
                class="col-start-1 row-start-1 transition-[font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]"
                [style.font-variation-settings]="release.month === activeMonth() ? semibold : normal"
                >{{ label(release.month) }}</span
              >
            </span>
          </a>
        }
      </div>
    </aside>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogIndex {
  readonly releases = input.required<readonly ReleaseView[]>();
  readonly activeMonth = input<string | null>(null);

  protected readonly semibold = fontWeights.semibold;
  protected readonly normal = fontWeights.normal;
  protected readonly shape = injectShape();
  protected readonly label = monthLabel;

  protected readonly asideClass = computed(() => cn('p-4 bg-muted', this.shape().container));
  protected readonly pillClass = computed(() => cn('absolute left-0 top-0 bg-active pointer-events-none', this.shape().bg));

  private readonly document = inject(DOCUMENT);
  private readonly reduced = inject(ReducedMotion).value;
  private readonly hover = viewChild(FluidHover);
  private readonly pill = viewChild<ElementRef<HTMLElement>>('pill');

  /** The rect the month in view's row occupies, once the list measured it. */
  protected readonly activeRect = computed(() => {
    const controller = this.hover()?.controller;
    const months = this.releases();
    const index = months.findIndex((release) => release.month === this.activeMonth());
    if (!controller || index === -1 || !controller.isMeasured()) return null;
    return controller.itemRects()[index] ?? null;
  });

  /** The rect the pill last animated to, so the first one it mounts on snaps
   *  into place instead of sliding in from the list's corner. */
  private laidOut: string | null = null;

  constructor() {
    afterRenderEffect(() => {
      const rect = this.activeRect();
      if (!rect) {
        this.laidOut = null;
        return;
      }
      const pill = this.pill()?.nativeElement;
      if (!pill) return;
      const key = `${rect.left}:${rect.top}:${rect.width}:${rect.height}`;
      if (key !== this.laidOut) {
        const target = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
        animate(pill, target, this.laidOut === null || this.reduced() ? { duration: 0 } : enterTransition(spring.moderate));
        this.laidOut = key;
      }
    });
  }

  protected rowClass(month: string): string {
    return cn(
      'relative z-10 flex h-8 items-center px-2 text-site-body outline-none transition-[color,opacity] duration-80',
      'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
      this.shape().item,
      month === this.activeMonth() ? 'text-foreground' : 'text-muted-foreground',
    );
  }

  /** A month picked in the index scrolls the page to it, without a jump in the
   *  URL bar's history. */
  protected select(event: Event, month: string): void {
    event.preventDefault();
    this.document.getElementById(month)?.scrollIntoView({
      behavior: this.reduced() ? 'auto' : 'smooth',
      block: 'start',
    });
    const view = this.document.defaultView;
    view?.history.replaceState(view.history.state, '', `${view.location.search}#${month}`);
  }
}
