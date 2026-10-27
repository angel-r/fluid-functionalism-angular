// ---------------------------------------------------------------------------
// The Typography page (S5), ported from app/docs/typography/page.tsx: the
// rules and no-gos, the 5-role specimen, the heading font switch, the editable
// markdown sample with its inspector, the spacing table, and the 5 tweaks.
//
// The `.typeset` sheet ships as typeset.css (generated from the reference's
// generateTypesetCss(typeStyles)); the page is the sheet's owner, so its
// styles are global, exactly where the React site's globals.css put them.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, DOCUMENT, DestroyRef, inject } from '@angular/core';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { fontWeights } from '@angel-r/fluid-functionalism-angular';
import { TYPESET_CSS } from './typeset-css';
import { TYPESET_SPACE, type SpaceKind } from './typeset';
import { TypeScaleSpecimen } from './type-scale-specimen';
import { HeadingFontDemo } from './heading-font-demo';
import { MARKDOWN_SAMPLE } from './typeset';
import { TypesetEditor } from './typeset-editor';
import { BalanceDemo, PrettyDemo, TrimDemo } from './tweaks';
import { NumbersDemo } from './numbers-demo';
import { WeightOpszDemo } from './weight-opsz-demo';

/** What the install adds, as the prompt lists it. */
const INSTALL_USAGE = `<article class="typeset">
  <!-- rendered markdown -->
</article>`;

const INSTALL_PROPS = [
  '`typeset` — class that sets the 5 roles, the spacing and every markdown element',
  '`typeset-compact` — the compact step of the size ladder (S)',
];

/** The sheet's gaps, named by the styles they sit around. A caption takes
 *  the same room as the space under a heading. */
const GAPS: ReadonlyArray<readonly [gap: SpaceKind, label: string]> = [
  ['section', 'Above display and title'],
  ['subsection', 'Above subtitle'],
  ['heading', 'Below display, title, and subtitle'],
  ['block', 'Between body blocks'],
  ['heading', 'Above caption'],
  ['item', 'Between list items'],
  ['rule', 'Around a divider'],
];

@Component({
  selector: 'app-typography-page',
  imports: [
    DocPage,
    DocSection,
    TypeScaleSpecimen,
    HeadingFontDemo,
    TypesetEditor,
    TrimDemo,
    BalanceDemo,
    PrettyDemo,
    NumbersDemo,
    WeightOpszDemo,
  ],
  templateUrl: './typography.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TypographyPage {
  protected readonly semibold = fontWeights.semibold;
  protected readonly sample = MARKDOWN_SAMPLE;
  protected readonly installUsage = INSTALL_USAGE;
  protected readonly installProps = INSTALL_PROPS;
  protected readonly gapHeadings = ['Gap', 'Default', 'Compact'];
  private readonly document = inject(DOCUMENT);

  constructor() {
    // The sheet loads and unloads with the page, global like the reference's
    // globals.css rules.
    const style = this.document.createElement('style');
    style.textContent = TYPESET_CSS;
    this.document.head.appendChild(style);
    inject(DestroyRef).onDestroy(() => style.remove());
  }
  protected readonly gaps = GAPS.map(([gap, label]) => ({
    label,
    default: TYPESET_SPACE[gap].default,
    compact: TYPESET_SPACE[gap].compact,
  }));
}
