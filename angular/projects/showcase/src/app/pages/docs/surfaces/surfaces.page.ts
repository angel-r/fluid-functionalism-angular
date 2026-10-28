// ---------------------------------------------------------------------------
// /docs/surfaces, ported from app/docs/surfaces/page.tsx: the problem (a role
// menu that melts into its dialog), the three pieces of the solution (tokens,
// substrate, the primitive), the interactive ladder, and the two examples.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { fontWeights } from '@angel-r/fluid-functionalism-angular';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { SiteSettingsService } from '../../../site/site-settings.service';
import { SurfacesColorPickerDemo } from './color-picker-demo';
import { SurfacesElevatedDemo } from './elevated-demo';
import { SurfacesElevationStackDemo } from './elevation-stack-demo';
import { SurfacesInviteDialogDemo } from './invite-dialog-demo';
import { SurfacesProblemDemo } from './problem-demo';
import { SurfacesSubstrateDemo } from './substrate-demo';
import { SurfacesTokensDemo } from './tokens-demo';

@Component({
  selector: 'app-surfaces-page',
  imports: [
    DocPage,
    DocSection,
    SurfacesColorPickerDemo,
    SurfacesElevatedDemo,
    SurfacesElevationStackDemo,
    SurfacesInviteDialogDemo,
    SurfacesProblemDemo,
    SurfacesSubstrateDemo,
    SurfacesTokensDemo,
  ],
  templateUrl: './surfaces.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SurfacesPage {
  protected readonly settings = inject(SiteSettingsService);
  protected readonly semibold = fontWeights.semibold;

  /** The install prompt's description and usage: the system entry's line, and
   *  the shortest Angular snippet that shows the ladder. */
  protected readonly promptDescription =
    'Eight-level surface and shadow ladder for elevation in light and dark mode.';
  protected readonly promptUsage = `<div [ffSurface]="5">
  <ff-dropdown>…</ff-dropdown>   <!-- lifts to surface-7 -->
</div>`;
  protected readonly promptProps = [
    '[ffElevated] offset: number. Lifts the element offset levels and re-provides the new level.',
    '[ffElevated] shadowLevel: number. Pins the shadow weight, whatever level the background lands on.',
    '[ffSurface] value: number. Provides an explicit substrate level to descendants.',
    'injectSurface(): Signal<number>. The substrate a component sits on (1 = the page).',
    'surfaceClasses(level, shadowLevel): string. The literal bg-surface-N and shadow-surface-N classes.',
  ];
}
