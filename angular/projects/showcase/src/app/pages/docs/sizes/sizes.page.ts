// ---------------------------------------------------------------------------
// /docs/sizes, ported from app/docs/sizes/page.tsx: the two-step size ladder
// (36px default, 28px compact) with the reference's toolbar demo, the frozen
// compact region, the live token inspector and the token table.
//
// The demo's Angular code lives in ./toolbar-demo.ts, which the changelog's
// entry previews also import.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Button,
  CheckboxGroup,
  CheckboxItem,
  Dropdown,
  Icon,
  MenuItem,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SizeProvider,
  TabsSubtle,
  TabsSubtleItem,
  fontWeights,
  injectShape,
  sizeMap,
  typeScale,
  type SizeVariant,
} from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';
import { API_REFERENCE } from '../../../docs-kit/api';
import { InspectOverlay, type InspectRaw } from '../../../docs-kit/inspect/inspect-overlay';
import {
  CHEVRON_DOWN_ICON,
  LIST_FILTER_ICON,
  PLUS_ICON,
  SORT_OPTIONS,
  ToolbarDemo,
} from './toolbar-demo';

// ---------------------------------------------------------------------------
// Token reference
// ---------------------------------------------------------------------------

interface TokenRow {
  token: string;
  applies: string;
  def: string;
  compact: string;
}

const TOKEN_ROWS: readonly TokenRow[] = [
  { token: 'control', applies: 'Controls and rows — shared so menu rows line up with their trigger', def: 'h-9 · 36px', compact: 'h-7 · 28px' },
  { token: 'segmentItem + segmentPad', applies: 'Segmented tabs inside their padded list', def: '28px + 4px = 36px', compact: '24px + 2px = 28px' },
  { token: 'text', applies: 'Labels inside controls (the body role)', def: '13px / 20px', compact: '12px / 18px' },
  { token: 'field', applies: "Text in editable fields: the body role, 16px on touch screens so iOS doesn't zoom on focus", def: '13px / 20px, 16px on touch', compact: '12px / 18px, 16px on touch' },
  { token: 'icon', applies: 'Leading/trailing icons, checkbox square, radio circle', def: '16px', compact: '14px' },
  { token: 'px / itemPx', applies: 'Control / row horizontal padding', def: '12px / 8px', compact: '10px / 6px' },
  { token: 'gap', applies: 'Icon-to-label and control-to-control gap', def: '8px', compact: '4px' },
];

/** The snippet the demo's Code tab shows. */
const TOOLBAR_CODE = `<div ffSizeProvider [size]="'compact'">
  <!-- One size provider pins the row; every control inside follows. -->
  <div class="flex items-center gap-1">
    <ff-tabs-subtle activeLabel [selectedIndex]="view" (selectedIndexChange)="view = $event">
      <button ffTabsSubtleItem [index]="0" [icon]="tableIcon" label="Table"></button>
      <button ffTabsSubtleItem [index]="1" [icon]="boardIcon" label="Board"></button>
    </ff-tabs-subtle>
    <div class="ml-auto flex items-center gap-1">
      <ff-input-group class="w-28">
        <ff-input-field [index]="0" label="Search" labelHidden icon="search"
          placeholder="Search…" [(value)]="query" />
      </ff-input-group>
      <ff-select [(value)]="sort">
        <ff-select-trigger placeholder="Sort by" />
        <ff-select-content>
          @for (option of sortOptions; track option.value) {
            <ff-select-item [index]="$index" [value]="option.value">{{ option.label }}</ff-select-item>
          }
        </ff-select-content>
      </ff-select>
      <button ffButton variant="tertiary" size="icon-compact" aria-label="Filter">
        <ff-icon icon="list-filter" />
      </button>
      <button ffButton leadingIcon="plus">New</button>
    </div>
  </div>
</div>`;

/** Maps an inspected element's raw measurements to the ladder tokens they
 *  came from, resolved for the active step — the inspector's tooltip shows
 *  the token table, not generic CSS. */
function tokenReadout(raw: InspectRaw, step: SizeVariant): Array<[string, string]> {
  const t = sizeMap[step];
  // ±1px so fractional browser zoom doesn't knock measurements off their
  // token match.
  const eq = (a: number, b: number) => Math.abs(a - b) < 1;
  const px = step === 'default' ? 12 : 10;
  const itemPx = step === 'default' ? 8 : 6;
  const gap = step === 'default' ? 8 : 4;
  const text = typeScale.body[step];

  const rows: Array<[string, string]> = [];
  if (eq(raw.height, t.controlHeight)) rows.push(['control', `${t.controlHeight}px`]);
  if (eq(raw.width, t.icon) && eq(raw.height, t.icon)) rows.push(['icon', `${t.icon}px`]);
  if (raw.fontSize !== null && eq(raw.fontSize, text)) rows.push(['text', `${text}px`]);
  if (eq(raw.pl, px) || eq(raw.pr, px)) rows.push(['px', `${px}px`]);
  else if (eq(raw.pl, itemPx) || eq(raw.pr, itemPx)) rows.push(['itemPx', `${itemPx}px`]);
  if (eq(raw.gap, gap)) rows.push(['gap', `${gap}px`]);
  return rows;
}

@Component({
  selector: 'app-sizes-page',
  imports: [
    RouterLink,
    Button,
    CheckboxGroup,
    CheckboxItem,
    Dropdown,
    Icon,
    MenuItem,
    ScrollArea,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SizeProvider,
    TabsSubtle,
    TabsSubtleItem,
    ComponentPreview,
    DocPage,
    DocSection,
    PropsTable,
    InspectOverlay,
    ToolbarDemo,
  ],
  templateUrl: './sizes.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SizesPage {
  private readonly shape = injectShape();

  protected readonly semibold = fontWeights.semibold;
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly tokenRows = TOKEN_ROWS;
  protected readonly tokenHeadings = ['Token', 'Applies to', 'Default', 'Compact'];
  protected readonly inspectorLabels = ['Design', 'Engineering'];
  protected readonly toolbarCode = TOOLBAR_CODE;

  protected readonly chevronDown = CHEVRON_DOWN_ICON;
  protected readonly listFilter = LIST_FILTER_ICON;
  protected readonly plus = PLUS_ICON;

  protected readonly frameClass = computed(
    () => `relative flex flex-col w-full border border-border/60 ${this.shape().container}`,
  );

  // ── Compact region (frozen-open menu) ──────────────────────────────────

  protected readonly regionIndex = signal(1);
  protected readonly regionStep = computed<SizeVariant>(() =>
    this.regionIndex() === 0 ? 'default' : 'compact',
  );
  protected readonly regionSort = signal(0);
  protected readonly regionGap = computed(() => sizeMap[this.regionStep()].gap);
  protected readonly regionRowClass = computed(() => `flex items-center ${this.regionGap()}`);
  protected readonly regionFilterSize = computed(() =>
    this.regionStep() === 'compact' ? 'icon-compact' : 'icon',
  );

  // ── Token inspector ────────────────────────────────────────────────────

  protected readonly inspectorIndex = signal(0);
  protected readonly inspectorStep = computed<SizeVariant>(() =>
    this.inspectorIndex() === 0 ? 'default' : 'compact',
  );
  protected readonly inspectorSort = signal('updated');
  protected readonly inspectorChecked = signal<ReadonlySet<number>>(new Set([0]));
  protected readonly inspectorGap = computed(() => sizeMap[this.inspectorStep()].gap);
  protected readonly inspectorRowClass = computed(
    () => `flex flex-wrap items-center ${this.inspectorGap()}`,
  );

  private readonly inspectorContent = viewChild<ElementRef<HTMLElement>>('inspectorContent');
  /** The preview region the inspector measures; present after the first
   *  render, so the overlay mounts once it resolves. */
  protected readonly inspectorFrame = computed(
    () => this.inspectorContent()?.nativeElement ?? null,
  );

  protected readonly readout = (raw: InspectRaw): Array<[string, string]> =>
    tokenReadout(raw, this.inspectorStep());
  /** The install prompt's description and usage: the system entry's line, and
   *  the shortest Angular snippet that shows the ladder. */
  protected readonly promptDescription =
    'A two-step size ladder: a 36px default and a 28px compact, shared by buttons, inputs, selects, tabs, and rows.';
  protected readonly promptUsage = `// The app-wide step, in app.config.ts providers:
provideFluid({ size: 'compact' }),

// Or pin one region; every control inside follows, menus included:
<div ffSizeProvider [size]="'compact'">
  <button ffButton>New</button>
  <ff-select [(value)]="sort">…</ff-select>
</div>`;
  protected readonly promptProps = [
    'provideFluid({ size }): "default" | "compact". The app-wide step; switch it with injectSizeContext().setSize().',
    '[ffSizeProvider] size: "default" | "compact". Pins every control in the region to one step.',
    '[ffSizeProvider] defaultSize: "default" | "compact". Uncontrolled initial step for the region.',
    'injectTypeScale(): font sizes in px per role, for the active step.',
    'size (on components): "default" | "compact". Per-component override that wins over the provider.',
  ];
  protected readonly round = Math.round;
  protected readonly providerProps = API_REFERENCE['sizes'][0].props;
  protected readonly consumerProps = API_REFERENCE['sizes'][1].props;

  protected toggleInspector(index: number): void {
    this.inspectorChecked.update((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }
}
