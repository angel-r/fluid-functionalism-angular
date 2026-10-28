// ---------------------------------------------------------------------------
// The toolbar demo of /docs/sizes: the same toolbar line at each step of the
// ladder. Ported from app/docs/sizes/toolbar-demo.tsx.
//
// It lives beside the page because the changelog's entry previews reuse it (a
// page file may only export the page). `ToolbarDemo` and its file path are a
// contract with pages/changelog: keep the export and the selector.
//
// The glyphs are the reference's direct lucide imports (Table2, SquareKanban,
// ListFilter, Plus, Search), so the site's icon-pack switch leaves them as
// drawn — exactly as upstream's direct icons are not swapped by `useIcon`.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import {
  Button,
  Icon,
  InputField,
  InputGroup,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SizeProvider,
  TabsSubtle,
  TabsSubtleItem,
  fontWeights,
  sizeMap,
  type IconNode,
  type SizeVariant,
} from '@angel-r/fluid-functionalism-angular';

export const SORT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'updated', label: 'Last updated' },
  { value: 'created', label: 'Created' },
  { value: 'name', label: 'Name' },
];

// Lucide glyphs the reference imports directly.
export const TABLE_ICON: IconNode = [
  [
    'path',
    {
      d: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18',
    },
  ],
];
export const BOARD_ICON: IconNode = [
  ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
  ['path', { d: 'M8 7v7' }],
  ['path', { d: 'M12 7v4' }],
  ['path', { d: 'M16 7v9' }],
];
export const LIST_FILTER_ICON: IconNode = [
  ['path', { d: 'M3 6h18' }],
  ['path', { d: 'M7 12h10' }],
  ['path', { d: 'M10 18h4' }],
];
export const PLUS_ICON: IconNode = [
  ['path', { d: 'M5 12h14' }],
  ['path', { d: 'M12 5v14' }],
];
export const SEARCH_ICON: IconNode = [
  ['circle', { cx: 11, cy: 11, r: 8 }],
  ['path', { d: 'm21 21-4.3-4.3' }],
];
export const CHEVRON_DOWN_ICON: IconNode = [['path', { d: 'm6 9 6 6 6-6' }]];

/** One step of the ladder: label, tabs, search, sort, filter, primary action,
 *  and the spec-sheet height guides over the row. */
@Component({
  selector: 'app-sizes-toolbar-row',
  imports: [
    Button,
    Icon,
    InputField,
    InputGroup,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SizeProvider,
    TabsSubtle,
    TabsSubtleItem,
  ],
  host: { style: 'display: contents' },
  template: `
    <div ffSizeProvider [size]="variant()" class="flex w-full flex-col items-start gap-3">
      <span class="text-site-caption text-muted-foreground select-none">
        {{ variant() === 'default' ? 'Default · 36px' : 'Compact · 28px' }}
      </span>
      <div class="relative w-full">
        <div [class]="rowClass()">
          <ff-tabs-subtle activeLabel [(selectedIndex)]="view">
            <button ffTabsSubtleItem [index]="0" [icon]="table" label="Table"></button>
            <button ffTabsSubtleItem [index]="1" [icon]="board" label="Board"></button>
          </ff-tabs-subtle>
          <div [class]="actionRowClass()">
            <!-- Mobile shows the trimmed toolbar — tabs, filter, primary
                 action; search and sort return at sm. display:contents keeps
                 the row's gap running through the wrapper at sm+. -->
            <div class="hidden sm:contents">
              <ff-input-group class="w-24">
                <ff-input-field
                  [index]="0"
                  label="Search"
                  labelHidden
                  [icon]="searchIcon"
                  placeholder="Search…"
                  [(value)]="query"
                />
              </ff-input-group>
              <ff-select [(value)]="sort">
                <ff-select-trigger placeholder="Sort by" class="min-w-36 w-36" />
                <ff-select-content>
                  @for (option of sortOptions; track option.value) {
                    <ff-select-item [index]="$index" [value]="option.value">{{ option.label }}</ff-select-item>
                  }
                </ff-select-content>
              </ff-select>
            </div>
            <button ffButton variant="tertiary" [size]="filterSize()" aria-label="Filter">
              <ff-icon [icon]="listFilter" />
            </button>
            <button ffButton [leadingIcon]="plus">New</button>
          </div>
        </div>

        <!-- Spec-sheet height guides: a blue line along the row's top and
             bottom edges, and a double-headed arrow with the height on the
             right. Desktop-only decoration — on phones it would collide with
             the wrapped controls. -->
        <div aria-hidden="true" class="pointer-events-none hidden sm:block">
          <div class="absolute inset-x-0 top-0 h-px" [style]="guideLine"></div>
          <div class="absolute inset-x-0 bottom-0 h-px" [style]="guideLine"></div>
          <div class="absolute right-0 inset-y-0 flex items-center gap-1">
            <svg width="8" [attr.height]="height()" [attr.viewBox]="'0 0 8 ' + height()" fill="none">
              <path
                [attr.d]="'M4,1.5 V' + (height() - 1.5)"
                stroke="#6B97FF"
                stroke-width="1.25"
                stroke-linecap="round"
              />
              <path
                d="M1.5,5 L4,1.5 L6.5,5"
                stroke="#6B97FF"
                stroke-width="1.25"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                [attr.d]="'M1.5,' + (height() - 5) + ' L4,' + (height() - 1.5) + ' L6.5,' + (height() - 5)"
                stroke="#6B97FF"
                stroke-width="1.25"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span class="text-site-caption tabular-nums text-foreground" [style.font-variation-settings]="semibold">
              {{ height() }}px
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SizesToolbarRow {
  readonly variant = input.required<SizeVariant>();

  protected readonly view = signal(0);
  protected readonly query = signal('');
  protected readonly sort = signal('updated');
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly semibold = fontWeights.semibold;
  protected readonly table = TABLE_ICON;
  protected readonly board = BOARD_ICON;
  protected readonly listFilter = LIST_FILTER_ICON;
  protected readonly plus = PLUS_ICON;
  protected readonly searchIcon = SEARCH_ICON;
  protected readonly guideLine = { backgroundColor: '#6B97FF', opacity: 0.5 };

  /** Control-to-control spacing comes from the ladder: gap is 8px at the
   *  default step and 4px at compact — density is spacing as much as height. */
  protected readonly gap = computed(() => sizeMap[this.variant()].gap);

  protected readonly height = computed(() => sizeMap[this.variant()].controlHeight);

  protected readonly filterSize = computed(() =>
    this.variant() === 'compact' ? 'icon-compact' : 'icon',
  );

  protected readonly rowClass = computed(() => `flex w-full flex-wrap items-center sm:pr-[44px] ${this.gap()}`);

  protected readonly actionRowClass = computed(() => `ml-auto flex items-center ${this.gap()}`);
}

/** The demo's body: both steps of the ladder, one above the other. */
@Component({
  selector: 'app-sizes-toolbar-demo',
  imports: [SizesToolbarRow],
  template: `
    <div class="flex w-full flex-col gap-8">
      <app-sizes-toolbar-row variant="default" />
      <app-sizes-toolbar-row variant="compact" />
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolbarDemo {}
