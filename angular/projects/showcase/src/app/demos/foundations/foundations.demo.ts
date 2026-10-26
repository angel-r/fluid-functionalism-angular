import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Elevated, Icon, defaultIcons, typeScaleRoles, type IconName } from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-foundations-demo',
  imports: [DemoPage, DemoSection, Elevated, Icon],
  template: `
    <app-demo-page
      title="Foundations"
      description="Tokens every component shares: the surface ladder, the six-role type scale, and the swappable icon map."
    >
      <app-demo-section title="Surfaces (Elevated)">
        <div [ffElevated]="1" class="flex flex-col gap-3 rounded-xl p-4">
          <span class="text-caption text-muted-foreground">offset 1</span>
          <div [ffElevated]="2" class="flex flex-col gap-3 rounded-xl p-4">
            <span class="text-caption text-muted-foreground">offset 2 (menu)</span>
            <div [ffElevated]="4" class="rounded-xl p-4 text-caption text-muted-foreground">offset 4 (dialog)</div>
          </div>
        </div>
      </app-demo-section>
      <app-demo-section title="Type scale">
        <div class="flex w-full flex-col gap-2">
          @for (role of roles; track role) {
            <div class="flex items-baseline gap-4">
              <span class="w-20 text-caption text-muted-foreground">{{ role }}</span>
              <span [class]="'text-' + role + ' text-foreground'">The quick brown fox</span>
            </div>
          }
        </div>
      </app-demo-section>
      <app-demo-section title="Icons">
        <div class="grid w-full grid-cols-8 gap-4 text-muted-foreground">
          @for (name of icons; track name) {
            <div class="flex flex-col items-center gap-1" [title]="name">
              <ff-icon [name]="name" [size]="16" />
              <span class="truncate text-micro">{{ name }}</span>
            </div>
          }
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FoundationsDemo {
  protected readonly roles = typeScaleRoles;
  protected readonly icons = Object.keys(defaultIcons) as IconName[];
}
