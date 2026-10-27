// /docs/fluid-hover, ported from app/docs/fluid-hover/page.tsx: five sections
// with their live demos, the two-column "Use when / Skip when" pair, and the
// Reference tables (the directive's options, the controller's return value and
// the highlight's inputs).
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { fontWeights } from '@angel-r/fluid-functionalism-angular';
import { controllerReturn, directiveOptions, highlightProps } from '../../../docs-kit/api/fluid-hover';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';
import { AxesDemo } from './axes.demo';
import { CodeChip } from './code-chip';
import { CostDemo } from './cost.demo';
import { ListsDemo } from './lists.demo';
import { PlainVsFluidDemo } from './plain-vs-fluid.demo';
import { ShowTheMathDemo } from './show-the-math.demo';

/** The page's API tables, with the page's own headings, and one install-prompt
 *  line per prop. */
const API_TABLES = [
  ['Options', directiveOptions],
  ['Returns', controllerReturn],
  ['ff-fluid-hover-highlight', highlightProps],
] as const;

const INSTALL_USAGE = `<div ffFluidHover class="relative">
  <ff-fluid-hover-highlight class="rounded-lg" />
  <button [ffFluidHoverItem]="0">Inbox</button>
  <button [ffFluidHoverItem]="1">Drafts</button>
</div>`;

const INSTALL_PROPS = API_TABLES.flatMap(([title, table]) =>
  table.map((prop) => {
    const fallback = prop.default === undefined ? '' : ` (default: ${prop.default})`;
    return `${title}.${prop.name}: ${prop.type}${fallback} — ${prop.description}`;
  }),
);

/** One column of the "Use when / Skip when" pair. */
@Component({
  selector: 'app-use-list',
  template: `
    <div class="flex flex-col gap-2">
      <h2 class="text-site-title leading-none text-foreground" [style.font-variation-settings]="semibold">
        {{ title() }}
      </h2>
      <ul class="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">
        @for (item of items(); track item) {
          <li class="pl-1 text-site-body text-muted-foreground">{{ item }}</li>
        }
      </ul>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class UseList {
  readonly title = input.required<string>();
  readonly items = input.required<readonly string[]>();

  protected readonly semibold = fontWeights.semibold;
}

@Component({
  selector: 'app-fluid-hover-page',
  imports: [
    DocPage,
    DocSection,
    PropsTable,
    CodeChip,
    UseList,
    PlainVsFluidDemo,
    ShowTheMathDemo,
    AxesDemo,
    ListsDemo,
    CostDemo,
  ],
  templateUrl: './fluid-hover.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FluidHoverPage {
  protected readonly semibold = fontWeights.semibold;

  protected readonly directiveOptions = directiveOptions;
  protected readonly controllerReturn = controllerReturn;
  protected readonly highlightProps = highlightProps;

  protected readonly installUsage = INSTALL_USAGE;
  protected readonly installProps = INSTALL_PROPS;

  protected readonly useWhen = [
    'Everything in the list can be clicked: a menu, a list, tabs, a grid of links.',
    'The items sit close together.',
    'The items stay where they are while you look at them.',
  ];

  protected readonly skipWhen = [
    'A wrong click would hurt.',
    'Only some of the cards can be clicked.',
    'There is a lot of empty space around the items.',
    'Rows change place as you scroll.',
  ];
}
