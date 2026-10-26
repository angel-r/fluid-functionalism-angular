import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FluidHover, FluidHoverHighlight, FluidHoverItem, Icon, injectShape, injectSize, type IconName } from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-fluid-hover-demo',
  imports: [DemoPage, DemoSection, FluidHover, FluidHoverItem, FluidHoverHighlight, Icon],
  template: `
    <app-demo-page
      title="Fluid hover"
      description="One highlight glides between rows instead of each row lighting up on its own. A pointer in a gap still lands on the nearest row, and a click there goes to the lit row."
    >
      <app-demo-section title="Vertical list">
        <div ffFluidHover class="relative flex w-64 flex-col gap-1 rounded-xl border border-border p-1" data-testid="list">
          <ff-fluid-hover-highlight [class]="shape().bg" />
          @for (row of rows; track row.label; let i = $index) {
            <button
              type="button"
              [ffFluidHoverItem]="i"
              class="relative z-10 flex items-center text-left text-foreground"
              [class]="[size().control, size().itemPx, size().gap, size().text, shape().item].join(' ')"
            >
              <ff-icon [name]="row.icon" [size]="size().icon" class="text-muted-foreground" />
              {{ row.label }}
            </button>
          }
        </div>
      </app-demo-section>
      <app-demo-section title="Horizontal strip (axis x)">
        <div ffFluidHover ffFluidHoverAxis="x" class="relative flex gap-1 rounded-xl border border-border p-1">
          <ff-fluid-hover-highlight [class]="shape().bg" />
          @for (tab of tabs; track tab; let i = $index) {
            <button type="button" [ffFluidHoverItem]="i" class="relative z-10 px-3 text-foreground" [class]="[size().control, size().text, shape().item].join(' ')">{{ tab }}</button>
          }
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FluidHoverDemo {
  protected readonly shape = injectShape();
  protected readonly size = injectSize();
  protected readonly rows: { label: string; icon: IconName }[] = [
    { label: 'Inbox', icon: 'inbox' },
    { label: 'Messages', icon: 'message-circle' },
    { label: 'Calendar', icon: 'calendar' },
    { label: 'Settings', icon: 'settings' },
  ];
  protected readonly tabs = ['Overview', 'Activity', 'Members', 'Billing'];
}
