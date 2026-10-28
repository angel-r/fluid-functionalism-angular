// ---------------------------------------------------------------------------
// The home page's bento grid. Ported from app/components/bento-grid.tsx.
//
// Band layout. At xl (3 cols) the grid reads as horizontal bands: each 2-wide
// card (medium/large) pairs with smalls filling the remaining column — a large
// (2 rows) takes two smalls, a medium takes one. `side: 'right'` pins that
// band's wide card to columns 2–3 (xl:col-start-2); the dense auto-flow
// backfills column 1 with the neighboring smalls, so the wide card alternates
// left/right band by band.
//
// The size mix is balanced so the grid fills with NO holes at xl:
// smalls needed = 2·(larges) + 1·(mediums) = 2·5 + 7 = 17 = smalls available.
// At md (2 cols) only smalls take one column, so an odd small count leaves a
// half row: the last small then spans the full row there (and goes back to one
// column at xl). Adding a card or changing a gridSize breaks the xl equation —
// rebalance before shipping or the bottom rows develop holes.
//
// The column count is driven from a signal (not just CSS breakpoints) so the
// cards can FLIP between layouts: a pure media-query change reflows the grid
// outside the commit, so the "before" boxes are never measured and the
// re-slot snaps. `null` is the pre-measurement state: the plain responsive
// classes keep the identical computed layout, so there is no first-paint flash
// and no animation on mount.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  type Type,
  afterNextRender,
  computed,
  inject,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { cn } from '@angel-r/fluid-functionalism-angular';
import { componentList, type ComponentEntry } from '../../site/nav-data';
import { MARKS } from '../../data/changelog.generated';
import { BentoCard } from './bento-card';
import { PREVIEW_MAP } from './bento-previews';

const displayOrder: readonly { slug: string; side?: 'right' }[] = [
  { slug: 'input-message' }, // band 1 · medium left
  { slug: 'thinking-indicator' },
  { slug: 'command-menu', side: 'right' }, // band 2 · large right
  { slug: 'combobox' },
  { slug: 'switch' },
  { slug: 'sidebar' }, // band 3 · large left
  { slug: 'radio-group' },
  { slug: 'chat-message' },
  { slug: 'card', side: 'right' }, // band 4 · medium right
  { slug: 'select' },
  { slug: 'thinking-steps' }, // band 5 · large left
  { slug: 'tabs-subtle' },
  { slug: 'checkbox-group' },
  { slug: 'ask-user-questions', side: 'right' }, // band 6 · large right
  { slug: 'slider' },
  { slug: 'dropdown' },
  { slug: 'tabs' }, // band 7 · medium left
  { slug: 'input-copy' },
  { slug: 'accordion', side: 'right' }, // band 8 · medium right
  { slug: 'input-group' },
  { slug: 'carousel-dots' }, // band 9 · medium left
  { slug: 'button' },
  { slug: 'table', side: 'right' }, // band 10 · medium right
  { slug: 'dialog' },
  { slug: 'color-picker' }, // band 11 · large left
  { slug: 'tooltip' },
  { slug: 'badge' },
  { slug: 'calendar', side: 'right' }, // band 12 · medium right
  { slug: 'date-picker' },
];

/** Stage padding overrides, by slug (the default is px-6 py-16). */
const STAGE_PADDING: Readonly<Record<string, string>> = {
  sidebar: 'px-4 py-8',
  table: 'px-6 py-6',
  card: 'px-6 py-5',
  'command-menu': 'px-6 py-8',
  calendar: 'px-4 py-2',
};

/** Grid footprint per card size. The reveal-scroll wrapper is the grid item,
 *  so it carries the span; the card inside fills it. */
const sizeClasses: Readonly<Record<NonNullable<ComponentEntry['gridSize']>, string>> = {
  large: 'md:col-span-2 md:row-span-2',
  medium: 'md:col-span-2',
  small: 'col-span-1',
};

/** The slugs the latest release added, or that landed since. */
const NEW_SLUGS = new Set([...MARKS.new, ...MARKS.ahead]);

type GridCols = 1 | 2 | 3;

interface BentoItem {
  slug: string;
  name: string;
  isNew: boolean;
  stagePadding: string | undefined;
  preview: Type<unknown>;
  wrapperClass: string;
}

@Component({
  selector: 'app-bento-grid',
  imports: [BentoCard, NgComponentOutlet],
  template: `
    @for (item of items(); track item.slug) {
      <div [class]="item.wrapperClass">
        <app-bento-card
          [slug]="item.slug"
          [name]="item.name"
          [isNew]="item.isNew"
          [previewClassName]="item.stagePadding"
        >
          <!-- The component follows its card in: a nested reveal-scroll runs
               half a range behind. It fills the stage and re-centers. -->
          <div class="reveal-scroll flex size-full min-h-0 items-center justify-center">
            <ng-container *ngComponentOutlet="item.preview" />
          </div>
        </app-bento-card>
      </div>
    }
  `,
  // The host IS React's grid root: Tailwind's `grid`/`gap-3` and the inline
  // template columns live here (host display: grid comes from `grid`).
  host: { '[class]': 'hostClass()', '[style.grid-template-columns]': 'templateColumns()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoGrid {
  private readonly cols = signal<GridCols | null>(null);
  private readonly injector = inject(Injector);
  private readonly cards = viewChildren(BentoCard);

  private pendingFlip = false;
  private beforeFlip: DOMRect[] = [];

  protected readonly hostClass = computed(() =>
    cn('grid gap-3 bento-grid', this.cols() === null && 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'),
  );

  protected readonly templateColumns = computed(() => {
    const cols = this.cols();
    return cols === null ? null : `repeat(${cols}, minmax(0, 1fr))`;
  });

  protected readonly items = computed<BentoItem[]>(() => this.buildItems());

  constructor() {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const md = window.matchMedia('(min-width: 768px)');
    const xl = window.matchMedia('(min-width: 1280px)');
    const read = (): GridCols => (xl.matches ? 3 : md.matches ? 2 : 1);

    // A window resize listener (reading mq.matches) rather than MediaQueryList
    // "change" events: the same signal in real browsers, and it also fires
    // under the synthetic resize an emulated environment dispatches. An
    // unchanged count returns early, so per-frame resizes inside a band cost
    // nothing.
    const update = () => {
      const next = read();
      if (next === untracked(this.cols)) return;
      if (untracked(this.cols) === null) {
        this.cols.set(next);
        return;
      }
      this.relayout(next);
    };

    update();
    window.addEventListener('resize', update);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', update));
  }

  /** Measures every card, applies the new column count, then springs each card
   *  from its old box to its new one. */
  private relayout(next: GridCols) {
    // Two breakpoints crossed inside one frame: the first change's boxes are
    // still the right origin, so the pending flip keeps them and lands on the
    // layout the latest count produces.
    if (!this.pendingFlip) {
      const cards = this.cards();
      for (const card of cards) card.stopFlip();
      this.beforeFlip = cards.map((card) => card.rect());
      this.pendingFlip = true;
      afterNextRender(
        () => {
          this.pendingFlip = false;
          const before = this.beforeFlip;
          this.cards().forEach((card, i) => card.flipFrom(before[i] ?? null));
        },
        { injector: this.injector },
      );
    }
    this.cols.set(next);
  }

  private buildItems(): BentoItem[] {
    const bySlug = new Map(componentList.map((entry) => [entry.slug, entry]));
    const ordered = displayOrder.flatMap(({ slug, side }) => {
      const entry = bySlug.get(slug);
      return entry ? [{ entry, side }] : [];
    });
    const smalls = ordered.filter(({ entry }) => (entry.gridSize ?? 'small') === 'small');
    const wideAtMd = smalls.length % 2 === 1 ? smalls[smalls.length - 1]?.entry.slug : undefined;

    return ordered.flatMap(({ entry, side }) => {
      const preview = PREVIEW_MAP[entry.slug];
      if (!preview) return [];
      const gridSize = entry.gridSize ?? 'small';
      return [
        {
          slug: entry.slug,
          name: entry.name,
          isNew: NEW_SLUGS.has(entry.slug),
          stagePadding: STAGE_PADDING[entry.slug],
          preview,
          wrapperClass: cn(
            'reveal-scroll flex',
            sizeClasses[gridSize],
            side === 'right' && 'xl:col-start-2',
            entry.slug === wideAtMd && 'md:col-span-2 xl:col-span-1',
          ),
        },
      ];
    });
  }
}
