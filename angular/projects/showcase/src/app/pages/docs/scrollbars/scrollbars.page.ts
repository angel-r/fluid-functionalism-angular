// ---------------------------------------------------------------------------
// /docs/scrollbars, ported from app/docs/scrollbars/page.tsx: the problem, the
// scrollbar, the fade, the two examples and the API reference.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { fontWeights } from '@angel-r/fluid-functionalism-angular';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';
import { scrollAreaProps } from '../../../docs-kit/api/scrollbars';
import {
  ScrollbarFadeDemo,
  ScrollbarHorizontalDemo,
  ScrollbarProblemDemo,
  ScrollbarTableDemo,
} from './scrollbar-demos';

@Component({
  selector: 'app-scrollbars-page',
  imports: [
    DocPage,
    DocSection,
    PropsTable,
    ScrollbarProblemDemo,
    ScrollbarHorizontalDemo,
    ScrollbarFadeDemo,
    ScrollbarTableDemo,
  ],
  template: `
    <app-doc-page
      title="Scrollbars"
      slug="scrollbars"
      description="A scrollbar that stays out of the way but never disappears."
      [installUsage]="installUsage"
      [installProps]="installProps"
    >
      <app-doc-section title="The problem">
        <div class="flex flex-col gap-3 text-site-body text-muted-foreground">
          <p>
            macOS hides the scrollbar until you start scrolling, so a clipped list gives no sign it
            has more below. And the moment it does appear, it's the grey OS default sitting on top of
            your design. You either get no affordance or the wrong one.
          </p>
        </div>
        <app-scrollbar-problem-demo />
      </app-doc-section>

      <app-doc-section title="The scrollbar">
        <p class="text-site-body text-muted-foreground">
          The thumb rests narrow and low-contrast, then widens and darkens on hover so it stays quiet
          until you reach for it. Press
          <kbd class="px-1 py-0.5 rounded bg-muted text-site-caption font-mono">R</kbd>
          to see the radius follow the shape system. On touch-primary devices the whole thing steps
          aside for native overflow scrolling, where platform physics beat any custom scrollbar.
        </p>
        <p class="text-site-body text-muted-foreground">
          Scrollbar machinery adapted from
          <a
            href="https://lina.sameer.sh"
            target="_blank"
            rel="noreferrer"
            class="underline underline-offset-2"
          >
            Lina
          </a>
          .
        </p>
      </app-doc-section>

      <app-doc-section title="The fade">
        <p class="text-site-body text-muted-foreground">
          The baseline edge treatment is shadcn's
          <a
            href="https://ui.shadcn.com/docs/utils/scroll-fade"
            target="_blank"
            rel="noreferrer"
            class="underline underline-offset-2"
          >
            scroll-fade
          </a>
          , vendored as a CSS utility in the library's
          <code class="px-1 py-0.5 rounded bg-[light-dark(#EBEBED,#2C2C2C)] text-site-caption text-foreground"
            >theme.css</code
          >. A mask dissolves the content toward the edges that have more to scroll, and a
          scroll-driven animation keeps the true start and end crisp. Drop
          <code class="px-1 py-0.5 rounded bg-[light-dark(#EBEBED,#2C2C2C)] text-site-caption text-foreground"
            >scroll-fade</code
          >
          (or
          <code class="px-1 py-0.5 rounded bg-[light-dark(#EBEBED,#2C2C2C)] text-site-caption text-foreground"
            >scroll-fade-x</code
          >) on the viewport and it rides under the scrollbar — no JavaScript.
        </p>
        <app-scrollbar-fade-demo />
      </app-doc-section>

      <app-doc-section title="Examples">
        <h3 class="text-site-subtitle text-foreground mt-2" [style.font-variation-settings]="semibold">
          Horizontal
        </h3>
        <p class="text-site-body text-muted-foreground">A row wider than its container, faded with the x variant.</p>
        <app-scrollbar-horizontal-demo />

        <h3 class="text-site-subtitle text-foreground mt-2" [style.font-variation-settings]="semibold">
          Double overflow
        </h3>
        <p class="text-site-body text-muted-foreground">
          A table taller and wider than its box.
          <code class="px-1 py-0.5 rounded bg-[light-dark(#EBEBED,#2C2C2C)] text-site-caption text-foreground"
            >orientation="both"</code
          >
          adds both scrollbars and the corner.
        </p>
        <app-scrollbar-table-demo />
      </app-doc-section>

      <app-doc-section title="API reference">
        <h3 class="text-site-subtitle text-foreground mt-2" [style.font-variation-settings]="semibold">
          ScrollArea
        </h3>
        <app-props-table [props]="scrollAreaProps" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ScrollbarsPage {
  protected readonly semibold = fontWeights.semibold;
  protected readonly scrollAreaProps = scrollAreaProps;

  /** The shortest Angular usage, for the Installation row's copy prompt. */
  protected readonly installUsage = `import { ScrollArea } from '@angel-r/fluid-functionalism-angular';

@Component({
  imports: [ScrollArea],
  template: \`
    <ff-scroll-area viewportClass="scroll-fade" class="h-64 w-full border border-border">
      <div class="flex flex-col p-3">…</div>
    </ff-scroll-area>
  \`,
})
export class Releases {}`;

  /** One line per prop, for the Installation row's copy prompt. */
  protected readonly installProps: readonly string[] = [
    'orientation — "vertical" (default), "horizontal" or "both": which axes get scrollbars',
    'viewportClass — classes for the inner viewport; the scroll-fade utility goes here',
    'thumbSizing — "inset" (default) or "track"',
    'class — the outer container; set the height/width constraint here',
  ];
}
