// ---------------------------------------------------------------------------
// /docs/tabs-subtle, ported from app/docs/tabs-subtle/page.tsx: the pill tabs
// with text labels, the same row with icons, the collapsed-to-the-active-label
// row, and the three API tables (TabsSubtle, TabsSubtleItem, TabsSubtlePanel).
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  TabsSubtle,
  TabsSubtleItem,
  TabsSubtlePanel,
  type IconName,
} from '@angel-r/fluid-functionalism-angular';
import { API_REFERENCE } from '../../../docs-kit/api';
import type { PropDef } from '../../../docs-kit/api/types';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';

/** The install prompt's one line per prop. `<ng-content />` rows describe the
 *  projection, not an input, so they stay out. */
function promptProps(tables: readonly { props: PropDef[] }[]): string[] {
  return tables.flatMap((table) =>
    table.props
      .filter((prop) => !prop.name.startsWith('<ng-content'))
      .map(
        (prop) =>
          `${prop.name}: ${prop.type}${prop.default !== undefined ? ` (default ${prop.default})` : ''} — ${prop.description}`,
      ),
  );
}

@Component({
  selector: 'app-tabs-subtle-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, TabsSubtle, TabsSubtleItem, TabsSubtlePanel],
  template: `
    <app-doc-page
      title="TabsSubtle"
      slug="tabs-subtle"
      description="Tab navigation with smooth pill animations."
      [installUsage]="basicCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Basic">
        <app-component-preview [code]="basicCode">
          <div class="flex flex-col gap-4 w-full">
            <ff-tabs-subtle idPrefix="basic-demo" [(selectedIndex)]="basicSelected">
              @for (label of basicTabs; track label; let i = $index) {
                <button ffTabsSubtleItem [index]="i" [label]="label"></button>
              }
            </ff-tabs-subtle>
            @for (label of basicTabs; track label; let i = $index) {
              <ff-tabs-subtle-panel [index]="i" [selectedIndex]="basicSelected()" idPrefix="basic-demo">
                <p class="text-site-body text-muted-foreground px-3">{{ label }} content goes here.</p>
              </ff-tabs-subtle-panel>
            }
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="With Icons">
        <app-component-preview [code]="iconsCode">
          <div class="flex flex-col gap-4 w-full">
            <ff-tabs-subtle idPrefix="icons-demo" [(selectedIndex)]="iconsSelected">
              @for (tab of tabs; track tab.label; let i = $index) {
                <button ffTabsSubtleItem [index]="i" [icon]="tab.icon" [label]="tab.label"></button>
              }
            </ff-tabs-subtle>
            @for (tab of tabs; track tab.label; let i = $index) {
              <ff-tabs-subtle-panel [index]="i" [selectedIndex]="iconsSelected()" idPrefix="icons-demo">
                <p class="text-site-body text-muted-foreground px-3">{{ tab.label }} content goes here.</p>
              </ff-tabs-subtle-panel>
            }
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Active Label">
        <app-component-preview [code]="activeLabelCode">
          <div class="flex flex-col gap-4 w-full">
            <ff-tabs-subtle
              activeLabel
              idPrefix="active-label-demo"
              [(selectedIndex)]="activeLabelSelected"
            >
              @for (tab of tabs; track tab.label; let i = $index) {
                <button ffTabsSubtleItem [index]="i" [icon]="tab.icon" [label]="tab.label"></button>
              }
            </ff-tabs-subtle>
            @for (tab of tabs; track tab.label; let i = $index) {
              <ff-tabs-subtle-panel
                [index]="i"
                [selectedIndex]="activeLabelSelected()"
                idPrefix="active-label-demo"
              >
                <p class="text-site-body text-muted-foreground px-3">{{ tab.label }} content goes here.</p>
              </ff-tabs-subtle-panel>
            }
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference — TabsSubtle">
        <app-props-table [props]="tabsTable" />
      </app-doc-section>

      <app-doc-section title="API Reference — TabsSubtleItem">
        <app-props-table [props]="itemTable" />
      </app-doc-section>

      <app-doc-section title="API Reference — TabsSubtlePanel">
        <app-props-table [props]="panelTable" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TabsSubtlePage {
  protected readonly basicCode = `import { TabsSubtle, TabsSubtleItem, TabsSubtlePanel } from '@angel-r/fluid-functionalism-angular';
import { signal } from '@angular/core';

readonly tabs = ['Teamspaces', 'Recents', 'Favorites', 'Shared'];
readonly selected = signal(0);

<ff-tabs-subtle idPrefix="demo" [(selectedIndex)]="selected">
  @for (label of tabs; track label; let i = $index) {
    <button ffTabsSubtleItem [index]="i" [label]="label"></button>
  }
</ff-tabs-subtle>
@for (label of tabs; track label; let i = $index) {
  <ff-tabs-subtle-panel [index]="i" [selectedIndex]="selected()" idPrefix="demo">
    <p>{{ label }} content</p>
  </ff-tabs-subtle-panel>
}`;

  protected readonly iconsCode = `import { TabsSubtle, TabsSubtleItem, TabsSubtlePanel, type IconName } from '@angel-r/fluid-functionalism-angular';
import { signal } from '@angular/core';

readonly tabs: { icon: IconName; label: string }[] = [
  { icon: 'square-library', label: 'Teamspaces' },
  { icon: 'clock', label: 'Recents' },
  { icon: 'star', label: 'Favorites' },
  { icon: 'users', label: 'Shared' },
];
readonly selected = signal(0);

<ff-tabs-subtle idPrefix="demo" [(selectedIndex)]="selected">
  @for (tab of tabs; track tab.label; let i = $index) {
    <button ffTabsSubtleItem [index]="i" [icon]="tab.icon" [label]="tab.label"></button>
  }
</ff-tabs-subtle>
@for (tab of tabs; track tab.label; let i = $index) {
  <ff-tabs-subtle-panel [index]="i" [selectedIndex]="selected()" idPrefix="demo">
    <p>{{ tab.label }} content</p>
  </ff-tabs-subtle-panel>
}`;

  protected readonly activeLabelCode = `import { TabsSubtle, TabsSubtleItem, type IconName } from '@angel-r/fluid-functionalism-angular';
import { signal } from '@angular/core';

readonly tabs: { icon: IconName; label: string }[] = [
  { icon: 'square-library', label: 'Teamspaces' },
  { icon: 'clock', label: 'Recents' },
  { icon: 'star', label: 'Favorites' },
  { icon: 'users', label: 'Shared' },
];
readonly selected = signal(0);

<ff-tabs-subtle activeLabel idPrefix="demo" [(selectedIndex)]="selected">
  @for (tab of tabs; track tab.label; let i = $index) {
    <button ffTabsSubtleItem [index]="i" [icon]="tab.icon" [label]="tab.label"></button>
  }
</ff-tabs-subtle>`;

  protected readonly tabsTable = API_REFERENCE['tabs-subtle'][0].props;
  protected readonly itemTable = API_REFERENCE['tabs-subtle'][1].props;
  protected readonly panelTable = API_REFERENCE['tabs-subtle'][2].props;
  protected readonly installProps = promptProps(API_REFERENCE['tabs-subtle']);

  protected readonly basicTabs = ['Teamspaces', 'Recents', 'Favorites', 'Shared'];
  protected readonly tabs: readonly { icon: IconName; label: string }[] = [
    { icon: 'square-library', label: 'Teamspaces' },
    { icon: 'clock', label: 'Recents' },
    { icon: 'star', label: 'Favorites' },
    { icon: 'users', label: 'Shared' },
  ];
  protected readonly basicSelected = signal(0);
  protected readonly iconsSelected = signal(0);
  protected readonly activeLabelSelected = signal(0);
}
