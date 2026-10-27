import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TabsSubtle, TabsSubtleItem, TabsSubtlePanel, type IconName } from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-tabs-subtle-demo',
  imports: [DemoPage, DemoSection, TabsSubtle, TabsSubtleItem, TabsSubtlePanel],
  template: `
    <app-demo-page title="TabsSubtle" description="Tab navigation with smooth pill animations.">
      <app-demo-section title="Basic">
        <div class="flex w-full flex-col gap-4">
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
      </app-demo-section>

      <app-demo-section title="With Icons">
        <div class="flex w-full flex-col gap-4">
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
      </app-demo-section>

      <app-demo-section title="Active Label">
        <div class="flex w-full flex-col gap-4">
          <ff-tabs-subtle activeLabel idPrefix="active-label-demo" [(selectedIndex)]="activeLabelSelected">
            @for (tab of tabs; track tab.label; let i = $index) {
              <button ffTabsSubtleItem [index]="i" [icon]="tab.icon" [label]="tab.label"></button>
            }
          </ff-tabs-subtle>
          @for (tab of tabs; track tab.label; let i = $index) {
            <ff-tabs-subtle-panel [index]="i" [selectedIndex]="activeLabelSelected()" idPrefix="active-label-demo">
              <p class="text-site-body text-muted-foreground px-3">{{ tab.label }} content goes here.</p>
            </ff-tabs-subtle-panel>
          }
        </div>
      </app-demo-section>

      <app-demo-section title="Compact">
        <ff-tabs-subtle size="compact" aria-label="Filter results" [(selectedIndex)]="compactSelected">
          @for (tab of tabs; track tab.label; let i = $index) {
            <button ffTabsSubtleItem [index]="i" [icon]="tab.icon" [label]="tab.label"></button>
          }
        </ff-tabs-subtle>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TabsSubtleDemo {
  protected readonly basicTabs = ['Teamspaces', 'Recents', 'Favorites', 'Shared'];
  protected readonly tabs: { icon: IconName; label: string }[] = [
    { icon: 'square-library', label: 'Teamspaces' },
    { icon: 'clock', label: 'Recents' },
    { icon: 'star', label: 'Favorites' },
    { icon: 'users', label: 'Shared' },
  ];
  protected readonly basicSelected = signal(0);
  protected readonly iconsSelected = signal(0);
  protected readonly activeLabelSelected = signal(0);
  protected readonly compactSelected = signal(0);
}
