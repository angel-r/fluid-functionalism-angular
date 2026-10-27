import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  FluidHover,
  FluidHoverHighlight,
  FluidHoverItem,
  Icon,
  MobileDrawer,
  injectShape,
  injectSize,
  type IconName,
} from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-mobile-drawer-demo',
  imports: [DemoPage, DemoSection, MobileDrawer, FluidHover, FluidHoverItem, FluidHoverHighlight, Icon],
  template: `
    <app-demo-page
      title="Mobile drawer"
      description="A navigation panel that slides in from the left on a critically damped spring. Escape or a click on the scrim asks to close it; focus is trapped inside while open and goes back to the trigger after."
    >
      <app-demo-section title="Navigation drawer">
        <div class="flex flex-col items-center gap-3">
          <button
            #trigger
            type="button"
            class="inline-flex items-center border border-border text-foreground"
            [class]="[size().control, size().px, size().gap, size().text, shape().button].join(' ')"
            (click)="open.set(true)"
          >
            <ff-icon name="menu" [size]="size().icon" />
            Open menu
          </button>
          <p class="text-site-caption text-muted-foreground">Current page: {{ current() }}</p>
        </div>

        <ff-mobile-drawer [open]="open()" [triggerRef]="trigger" (close)="open.set(false)">
          <nav aria-label="Main" class="flex flex-col gap-4">
            <p class="px-2 text-site-caption font-medium text-muted-foreground">Workspace</p>
            <div ffFluidHover class="relative flex flex-col gap-0.5">
              <ff-fluid-hover-highlight [class]="shape().bg" />
              @for (link of links; track link.label; let i = $index) {
                <a
                  href="#"
                  [ffFluidHoverItem]="i"
                  class="relative z-10 flex items-center"
                  [class]="linkClass(link.label)"
                  [attr.aria-current]="current() === link.label ? 'page' : null"
                  (click)="go($event, link.label)"
                >
                  <ff-icon [name]="link.icon" [size]="size().icon" />
                  {{ link.label }}
                </a>
              }
            </div>
          </nav>
        </ff-mobile-drawer>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class MobileDrawerDemo {
  protected readonly shape = injectShape();
  protected readonly size = injectSize();
  protected readonly open = signal(false);
  protected readonly current = signal('Home');
  protected readonly links: { label: string; icon: IconName }[] = [
    { label: 'Home', icon: 'home' },
    { label: 'Inbox', icon: 'inbox' },
    { label: 'Messages', icon: 'message-circle' },
    { label: 'Calendar', icon: 'calendar' },
    { label: 'Settings', icon: 'settings' },
  ];

  protected linkClass(label: string) {
    const size = this.size();
    return [
      size.control,
      size.itemPx,
      size.gap,
      size.text,
      this.shape().item,
      this.current() === label ? 'text-foreground' : 'text-muted-foreground',
    ].join(' ');
  }

  protected go(event: MouseEvent, label: string) {
    event.preventDefault();
    this.current.set(label);
    this.open.set(false);
  }
}
