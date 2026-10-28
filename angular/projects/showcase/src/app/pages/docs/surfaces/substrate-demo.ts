// ---------------------------------------------------------------------------
// Substrate — page → popover → dialog: the same menu on three substrates, each
// landing two levels up, with the dark hex values read off the tokens. Ported
// from the SubstrateDemo of app/docs/surfaces/page.tsx.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  Dropdown,
  MenuItem,
  SurfaceProvider,
  fontWeights,
  type IconName,
} from '@angel-r/fluid-functionalism-angular';
import { SurfacesPreview } from './preview';

const SUBSTRATE_CODE = `<!-- Substrate flows through DI: [ffSurface] provides it.
     The default substrate is 1 (the page background). -->

<ff-dropdown />                        <!-- surface-3, on the page -->

<div [ffSurface]="3">                  <!-- inside a popover -->
  <ff-dropdown />                      <!-- surface-5 -->
</div>

<div [ffSurface]="5">                  <!-- inside a dialog -->
  <ff-dropdown />                      <!-- surface-7 -->
</div>

<!-- Inside any elevated component: -->
const substrate = injectSurface();     // 1, 3, or 5
const level = Math.min(substrate() + 2, 8);`;

// Dark-mode surface hex map — used to label the demo with raw color values.
// Kept in sync with the --surface-N tokens in the theme.
const SURFACE_HEX_DARK: Record<number, string> = {
  1: '#171717',
  2: '#1E1E1E',
  3: '#252525',
  4: '#2C2C2C',
  5: '#333333',
  6: '#3A3A3A',
  7: '#414141',
  8: '#484848',
};

interface Scenario {
  substrate: number;
  label: string;
}

const SCENARIOS: readonly Scenario[] = [
  { substrate: 1, label: 'On the page' },
  { substrate: 3, label: 'Inside a popover' },
  { substrate: 5, label: 'Inside a dialog' },
];

const MENU_ITEMS: readonly { icon: IconName; label: string }[] = [
  { icon: 'star', label: 'Favorites' },
  { icon: 'clock', label: 'Recents' },
  { icon: 'lock', label: 'Private' },
];

/** A color swatch with its token name and hex value. */
@Component({
  selector: 'app-surface-swatch',
  template: `
    <div class="flex items-center gap-2 text-[11px] leading-3.5 font-mono">
      <span
        aria-hidden="true"
        class="w-3 h-3 rounded-sm border border-border/40 shrink-0"
        [style.backgroundColor]="hex()"
      ></span>
      <span class="text-muted-foreground">{{ label() }}</span>
      <span class="ml-auto text-foreground">{{ hex() }}</span>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurfaceSwatch {
  readonly label = input.required<string>();
  readonly hex = input.required<string>();
}

@Component({
  selector: 'app-surfaces-substrate-demo',
  imports: [Dropdown, MenuItem, SurfaceProvider, SurfacesPreview, SurfaceSwatch],
  template: `
    <app-surfaces-preview [code]="substrateCode">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        @for (scenario of scenarios; track scenario.substrate) {
          <div class="flex flex-col gap-3">
            <div
              class="dark flex flex-col gap-3 rounded-2xl p-4 border border-border/40"
              [style.backgroundColor]="'var(--surface-' + scenario.substrate + ')'"
            >
              <span class="text-site-caption text-foreground" [style.font-variation-settings]="semibold">
                {{ scenario.label }}
              </span>
              <div [ffSurface]="scenario.substrate" style="display: contents">
                <ff-dropdown class="w-full" [checkedIndex]="0">
                  @for (item of menuItems; track item.label; let i = $index) {
                    <ff-menu-item [index]="i" [icon]="item.icon" [label]="item.label" [checked]="i === 0" />
                  }
                </ff-dropdown>
              </div>
            </div>
            <div class="flex flex-col gap-1 px-1 pb-4">
              <app-surface-swatch label="BG" [hex]="darkHex[scenario.substrate]" />
              <app-surface-swatch label="Menu" [hex]="darkHex[menuLevel(scenario.substrate)]" />
              <div class="flex items-center gap-2 text-[11px] leading-3.5 font-mono pt-1">
                <span class="text-muted-foreground">Hover</span>
                <span class="ml-auto text-foreground">+6%</span>
              </div>
              <div class="flex items-center gap-2 text-[11px] leading-3.5 font-mono">
                <span class="text-muted-foreground">Selected</span>
                <span class="ml-auto text-foreground">+10%</span>
              </div>
            </div>
          </div>
        }
      </div>
    </app-surfaces-preview>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurfacesSubstrateDemo {
  protected readonly substrateCode = SUBSTRATE_CODE;
  protected readonly scenarios = SCENARIOS;
  protected readonly menuItems = MENU_ITEMS;
  protected readonly darkHex = SURFACE_HEX_DARK;
  protected readonly semibold = fontWeights.semibold;

  protected menuLevel(substrate: number): number {
    return Math.min(substrate + 2, 8);
  }
}
