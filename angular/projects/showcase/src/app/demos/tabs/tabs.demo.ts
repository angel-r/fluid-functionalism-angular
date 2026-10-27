import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TabItem, TabPanel, Tabs, TabsList, type IconName } from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-tabs-demo',
  imports: [DemoPage, DemoSection, Tabs, TabsList, TabItem, TabPanel],
  template: `
    <app-demo-page
      title="Tabs"
      description="Segmented control tabs with sliding active indicator, fluid hover, and spring animations."
    >
      <app-demo-section title="Basic">
        <div class="flex w-full flex-col gap-4">
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
      </app-demo-section>

      <app-demo-section title="With Icons">
        <div class="flex w-full flex-col gap-4">
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
      </app-demo-section>

      <app-demo-section title="Controlled">
        <div class="flex w-full flex-col gap-4">
          <ff-tabs [(value)]="controlled">
            <ff-tabs-list>
              @for (tab of tabs.slice(0, 3); track tab.value) {
                <button ffTabItem [value]="tab.value" [label]="tab.label"></button>
              }
            </ff-tabs-list>
            @for (tab of tabs.slice(0, 3); track tab.value) {
              <ff-tab-panel [value]="tab.value">
                <p class="text-site-body text-muted-foreground pt-3">{{ tab.label }} content.</p>
              </ff-tab-panel>
            }
          </ff-tabs>
          <p class="text-site-caption text-muted-foreground">
            Active: <span class="text-foreground">{{ controlled() }}</span>
          </p>
        </div>
      </app-demo-section>

      <app-demo-section title="Compact">
        <div class="flex w-full flex-col gap-4">
          <ff-tabs size="compact" defaultValue="recents">
            <ff-tabs-list>
              @for (tab of tabs; track tab.value) {
                <button ffTabItem [value]="tab.value" [icon]="tab.icon" [label]="tab.label"></button>
              }
            </ff-tabs-list>
            @for (tab of tabs; track tab.value) {
              <ff-tab-panel [value]="tab.value">
                <p class="text-site-caption text-muted-foreground pt-2">{{ tab.label }} content.</p>
              </ff-tab-panel>
            }
          </ff-tabs>
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TabsDemo {
  protected readonly tabs: { value: string; label: string; icon: IconName }[] = [
    { value: 'library', label: 'Library', icon: 'square-library' },
    { value: 'recents', label: 'Recents', icon: 'clock' },
    { value: 'favorites', label: 'Favorites', icon: 'star' },
    { value: 'settings', label: 'Settings', icon: 'settings' },
  ];
  protected readonly controlled = signal('library');
}
