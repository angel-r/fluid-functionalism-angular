// ---------------------------------------------------------------------------
// The Introduction (/docs), ported from app/docs/page.tsx: the install steps
// for the Angular package, five short sections on why the components feel
// different, and the Icons section.
//
// The page keeps the reference's structure: the title and description come
// from DocPage (no slug: the Introduction is not a step in docOrder, and its
// install block is its own, so the generic Installation row is off), then the
// sections, the two hairlines and the Icons section project into its column.
//
// Copy is the reference's, rewritten for the Angular package (S8): npm install
// with the install command, the theme import, and provideFluid(); no `npx
// shadcn`, no Radix/Base UI flavor (D1), and the panel's shortcuts are the
// site's own (T, R, S).
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  INSTALL_COMMAND,
  PACKAGE,
  THEME_IMPORT,
} from '../../site/install-brief';
import { DocPage } from '../../docs-kit/doc-page';
import { InputCopy, fontWeights } from '@angel-r/fluid-functionalism-angular';

/** One "why these components feel different" block. */
interface WhySection {
  title: string;
  body: string;
}

/** The provider call the install section shows: the library's one setup call,
 *  with the two settings that have a default spelled out. */
const PROVIDER_CALL = `import { provideFluid } from '${PACKAGE}';

bootstrapApplication(App, {
  providers: [provideFluid({ shape: 'rounded', size: 'default' })],
});`;

/** Swapping one icon library for another, as the Icons section shows it: pass
 *  the pack's glyphs to the same provider call, per slot. */
const ICONS_SNIPPET = `import { provideFluid, phosphorIcons } from '${PACKAGE}';

bootstrapApplication(App, {
  providers: [
    // Slots you leave out keep their Lucide default.
    provideFluid({
      icons: { search: phosphorIcons.search, 'chevron-right': phosphorIcons['chevron-right'] },
    }),
  ],
});`;

@Component({
  selector: 'app-intro-page',
  imports: [DocPage, InputCopy],
  templateUrl: './intro.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class IntroPage {
  protected readonly installCommand = INSTALL_COMMAND;
  protected readonly themeImport = THEME_IMPORT;
  protected readonly providerCall = PROVIDER_CALL;
  protected readonly iconsSnippet = ICONS_SNIPPET;

  protected readonly semibold = fontWeights.semibold;
  protected readonly normal = fontWeights.normal;

  /** The reference's five sections, in order. The last two describe this port
   *  instead of the React original: standalone components rather than
   *  shadcn/ui with two primitives, and the site's own settings shortcuts. */
  protected readonly sections: readonly WhySection[] = [
    {
      title: 'Motion that communicates',
      body: "Every animation here points at something. When two list items merge their backgrounds, the component tells you they belong together. The hover highlight follows your cursor before you click, so the row you're about to land on confirms itself first. Motion has a job to create meaning.",
    },
    {
      title: 'Hover as preview',
      body: 'The interaction starts before you click. The closest interactive thing to your cursor gets a faint highlight; buttons gain a little weight as you approach. By the time your finger lands, you\'ve had a moment to reconsider, which is mostly the point.',
    },
    {
      title: 'Spring physics, not durations',
      body: 'Animations use springs, not fixed-duration eases. Toggle a switch and immediately toggle it back: the spring picks up wherever it was and reverses, instead of finishing the first animation before starting the second. Three presets, named fast, moderate, and slow, cover most of the library.',
    },
    {
      title: 'Drop-in compatible',
      body: "Standalone, signal-based, zoneless: each component is a plain Angular component with typed inputs and outputs, styled with Tailwind classes copied from the React original. Your theme tokens (colors, radii, fonts) work as-is. One npm install brings the whole library, its icons and its motion.",
    },
    {
      title: 'Customize using the right panel',
      body: "The panel on the right lets you change things on the fly. Switch between light and dark mode, toggle the corner radius from rounded to pill, cycle through different icon libraries, or change the size step. Press T, R, or S to flip the first three from the keyboard. The icon switcher is a preview tool that lives on this site — installed components ship with Lucide only, and you can swap in your own icons (see Icons below).",
    },
  ];
}
