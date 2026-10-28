// ---------------------------------------------------------------------------
// /docs/tabs, ported from app/docs/tabs/page.tsx: the default tabs, the same
// row with icons, the controlled binding with its live value, and the four
// API tables (Tabs, TabsList, TabItem, TabPanel).
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TabItem, TabPanel, Tabs, TabsList, type IconName } from '@angel-r/fluid-functionalism-angular';
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
  selector: 'app-tabs-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, Tabs, TabsList, TabItem, TabPanel],
  template: `
    <app-doc-page
      title="Tabs"
      slug="tabs"
      description="Segmented control tabs with sliding active indicator, fluid hover, and spring animations."
      [installUsage]="basicCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Basic">
        <app-component-preview [code]="basicCode">
          <div class="flex flex-col gap-4 w-full">
            <ff-tabs defaultValue="library">
              <ff-tabs-list>
                @for (tab of tabs; track tab.value) {
                  <button ffTabItem [value]="tab.value" [label]="tab.label"></button>
                }
              </ff-tabs-list>
              @for (tab of tabs; track tab.value) {
                <ff-tab-panel [value]="tab.value">
                  <p class="text-site-body text-muted-foreground pt-3">{{ tab.label }} content.</p>
                </ff-tab-panel>
              }
            </ff-tabs>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="With Icons">
        <app-component-preview [code]="iconsCode">
          <div class="flex flex-col gap-4 w-full">
            <ff-tabs defaultValue="library">
              <ff-tabs-list>
                @for (tab of tabs; track tab.value) {
                  <button ffTabItem [value]="tab.value" [icon]="tab.icon" [label]="tab.label"></button>
                }
              </ff-tabs-list>
              @for (tab of tabs; track tab.value) {
                <ff-tab-panel [value]="tab.value">
                  <p class="text-site-body text-muted-foreground pt-3">{{ tab.label }} content.</p>
                </ff-tab-panel>
              }
            </ff-tabs>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Controlled">
        <app-component-preview [code]="controlledCode">
          <div class="flex flex-col gap-4 w-full">
            <ff-tabs [(value)]="controlled">
              <ff-tabs-list>
                @for (tab of controlledTabs; track tab.value) {
                  <button ffTabItem [value]="tab.value" [label]="tab.label"></button>
                }
              </ff-tabs-list>
              @for (tab of controlledTabs; track tab.value) {
                <ff-tab-panel [value]="tab.value">
                  <p class="text-site-body text-muted-foreground pt-3">{{ tab.label }} content.</p>
                </ff-tab-panel>
              }
            </ff-tabs>
            <p class="text-site-caption text-muted-foreground">
              Active: <span class="text-foreground">{{ controlled() }}</span>
            </p>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference — Tabs">
        <app-props-table [props]="tabsTable" />
      </app-doc-section>

      <app-doc-section title="API Reference — TabsList">
        <app-props-table [props]="listTable" />
      </app-doc-section>

      <app-doc-section title="API Reference — TabItem">
        <app-props-table [props]="itemTable" />
      </app-doc-section>

      <app-doc-section title="API Reference — TabPanel">
        <app-props-table [props]="panelTable" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TabsPage {
  protected readonly basicCode = `import { TabItem, TabPanel, Tabs, TabsList } from '@angel-r/fluid-functionalism-angular';

<ff-tabs defaultValue="library">
  <ff-tabs-list>
    <button ffTabItem value="library" label="Library"></button>
    <button ffTabItem value="recents" label="Recents"></button>
    <button ffTabItem value="favorites" label="Favorites"></button>
    <button ffTabItem value="settings" label="Settings"></button>
  </ff-tabs-list>
  <ff-tab-panel value="library">Library content.</ff-tab-panel>
  <ff-tab-panel value="recents">Recents content.</ff-tab-panel>
  <ff-tab-panel value="favorites">Favorites content.</ff-tab-panel>
  <ff-tab-panel value="settings">Settings content.</ff-tab-panel>
</ff-tabs>`;

  protected readonly iconsCode = `import { TabItem, TabPanel, Tabs, TabsList } from '@angel-r/fluid-functionalism-angular';

<ff-tabs defaultValue="library">
  <ff-tabs-list>
    <button ffTabItem value="library" icon="square-library" label="Library"></button>
    <button ffTabItem value="recents" icon="clock" label="Recents"></button>
    <button ffTabItem value="favorites" icon="star" label="Favorites"></button>
    <button ffTabItem value="settings" icon="settings" label="Settings"></button>
  </ff-tabs-list>
  <ff-tab-panel value="library">Library content.</ff-tab-panel>
  <ff-tab-panel value="recents">Recents content.</ff-tab-panel>
  <ff-tab-panel value="favorites">Favorites content.</ff-tab-panel>
  <ff-tab-panel value="settings">Settings content.</ff-tab-panel>
</ff-tabs>`;

  protected readonly controlledCode = `import { TabItem, TabPanel, Tabs, TabsList } from '@angel-r/fluid-functionalism-angular';
import { signal } from '@angular/core';

readonly value = signal('library');

<ff-tabs [(value)]="value">
  <ff-tabs-list>
    <button ffTabItem value="library" label="Library"></button>
    <button ffTabItem value="recents" label="Recents"></button>
    <button ffTabItem value="favorites" label="Favorites"></button>
  </ff-tabs-list>
  <ff-tab-panel value="library">Library content.</ff-tab-panel>
  <ff-tab-panel value="recents">Recents content.</ff-tab-panel>
  <ff-tab-panel value="favorites">Favorites content.</ff-tab-panel>
</ff-tabs>`;

  protected readonly tabsTable = API_REFERENCE['tabs'][0].props;
  protected readonly listTable = API_REFERENCE['tabs'][1].props;
  protected readonly itemTable = API_REFERENCE['tabs'][2].props;
  protected readonly panelTable = API_REFERENCE['tabs'][3].props;
  protected readonly installProps = promptProps(API_REFERENCE['tabs']);

  protected readonly tabs: readonly { value: string; label: string; icon: IconName }[] = [
    { value: 'library', label: 'Library', icon: 'square-library' },
    { value: 'recents', label: 'Recents', icon: 'clock' },
    { value: 'favorites', label: 'Favorites', icon: 'star' },
    { value: 'settings', label: 'Settings', icon: 'settings' },
  ];
  protected readonly controlledTabs = this.tabs.slice(0, 3);
  protected readonly controlled = signal('library');
}
