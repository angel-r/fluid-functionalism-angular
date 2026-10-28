// ---------------------------------------------------------------------------
// /docs/reveal, ported from app/docs/reveal/page.tsx: the 2 presets (default
// and subtle), the 2 modes (landing and product), the scroll and loading
// classes, and the reference tables.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { fontWeights } from '@angel-r/fluid-functionalism-angular';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';
import { apiReference } from '../../../docs-kit/api/reveal';
import { RevealPresetDemo } from './preset-demo';

@Component({
  selector: 'app-reveal-page',
  imports: [DocPage, DocSection, PropsTable, RevealPresetDemo],
  template: `
    <app-doc-page
      title="Reveal"
      slug="reveal"
      description="1 class reveals a whole page, on load and on scroll."
      [installUsage]="installUsage"
      [installProps]="installProps"
    >
      <app-doc-section title="Landing">
        <p class="text-site-body text-muted-foreground">
          2 modes, default and subtle, for a page read once: each section arrives as the reader
          reaches it, so the page tells its story in order. Add
          <code class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground"
            >reveal-landing</code
          >
          or
          <code class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground"
            >reveal-landing-subtle</code
          >
          to its container.
        </p>
        <app-reveal-preset-demo preset="Landing" />
      </app-doc-section>

      <app-doc-section title="Product">
        <p class="text-site-body text-muted-foreground">
          2 modes, default and subtle, for the app people come back to: the screen settles in once
          and nothing moves on scroll, so the 10th visit stays as calm as the first. Add
          <code class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground"
            >reveal-product</code
          >
          or
          <code class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground"
            >reveal-product-subtle</code
          >
          to its main column.
        </p>
        <app-reveal-preset-demo preset="Product" />
        <p class="text-site-body text-muted-foreground">
          Slow data shows shadcn's
          <code class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground"
            >Skeleton</code
          >. Wrap it and the real block in
          <code class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground"
            >reveal-swap</code
          >, and add
          <code class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground"
            >reveal-items</code
          >
          to both for rows one by one.
        </p>
      </app-doc-section>

      <!-- Two columns, no section title: the column headings carry it, as on
           the Fluid Hover page. -->
      <div class="grid gap-6 pt-6 sm:grid-cols-2">
        <div class="flex flex-col gap-2">
          <h2 class="text-site-title leading-none text-foreground" [style.font-variation-settings]="semibold">
            Set it up
          </h2>
          <ul class="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">
            <li class="pl-1 text-site-body text-muted-foreground">
              Put everything on screen at first paint in the hero, product shot included.
            </li>
            <li class="pl-1 text-site-body text-muted-foreground">
              Keep the header, sidebar, and footer outside the container.
            </li>
            <li class="pl-1 text-site-body text-muted-foreground">
              In a grid, add
              <code class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground"
                >reveal-scroll</code
              >
              to each card, and again inside it so its content follows, like the Showcase.
            </li>
            <li class="pl-1 text-site-body text-muted-foreground">
              Clip with
              <code class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground"
                >overflow: clip</code
              >, not
              <code class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground"
                >hidden</code
              >, around anything that reveals on scroll.
            </li>
          </ul>
        </div>
        <div class="flex flex-col gap-2">
          <h2 class="text-site-title leading-none text-foreground" [style.font-variation-settings]="semibold">
            Built in
          </h2>
          <ul class="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">
            <li class="pl-1 text-site-body text-muted-foreground">
              Just CSS: nothing to load, nothing to hydrate. Landing steps ride
              <code class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground"
                >spring.slow</code
              >, product steps
              <code class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground"
                >spring.moderate</code
              >, and scroll steps follow the scroll.
            </li>
            <li class="pl-1 text-site-body text-muted-foreground">
              Cards already on screen at load play right after the hero.
            </li>
            <li class="pl-1 text-site-body text-muted-foreground">
              Browsers without scroll timelines show every section in place.
            </li>
            <li class="pl-1 text-site-body text-muted-foreground">
              Reduced motion keeps the fades and stops the rise, scale, scroll motion, and pulse.
            </li>
          </ul>
        </div>
      </div>

      <app-doc-section title="Reference">
        @for (table of apiReference; track table.title) {
          <h3 class="mt-2 text-site-subtitle text-foreground" [style.font-variation-settings]="semibold">
            {{ table.title }}
          </h3>
          <app-props-table [props]="table.props" />
        }
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RevealPage {
  protected readonly semibold = fontWeights.semibold;
  protected readonly apiReference = apiReference;

  /** The shortest Angular usage, for the Installation row's copy prompt. */
  protected readonly installUsage = `<div class="reveal-landing">
  <section><!-- the hero: on screen at first paint --></section>
  <section><!-- one section per scroll step --></section>
  <section class="reveal-scroll"><!-- its own range, card by card --></section>
</div>`;

  /** One line per class, for the Installation row's copy prompt. */
  protected readonly installProps: readonly string[] = [
    '.reveal-landing — hero on load, every later section on scroll (spring.slow)',
    '.reveal-landing-subtle — the same, toned down (8px rise, 0.98 scale)',
    '.reveal-product — every block on load, nothing on scroll (spring.moderate)',
    '.reveal-product-subtle — the same, in 0.04s steps',
    '.reveal-scroll — inside a landing preset, makes a deeper element its own scroll section',
    '.reveal-swap — a skeleton and its real block in 1 cell, crossfading on load',
    '.reveal-items — children arrive one by one, 8 steps at most',
  ];
}
