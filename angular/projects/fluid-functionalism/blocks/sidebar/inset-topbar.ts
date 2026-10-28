import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cn } from '../../core';
import { SidebarTrigger, injectSidebar } from '../../sidebar-core';

// ---------------------------------------------------------------------------
// The main region's topbar. While the sidebar is only PEEKED the trigger
// hides (the overlay covers it anyway); after a pin it fades back in
// slightly late, so it appears at its settled position instead of riding
// the inset's slide.
// ---------------------------------------------------------------------------

/**
 * `<header ffSidebarInsetTopbar>`: a SidebarTrigger followed by the projected
 * content (a page title, a breadcrumb).
 *
 *   <header ffSidebarInsetTopbar><span class="text-[13px]">Inbox</span></header>
 */
@Component({
  selector: 'header[ffSidebarInsetTopbar]',
  imports: [SidebarTrigger],
  host: { '[class]': 'hostClass()' },
  template: `
    <ff-sidebar-trigger [class]="triggerClass()" />
    <ng-content />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarInsetTopbar {
  readonly userClass = input('', { alias: 'class' });

  private readonly sidebar = injectSidebar();
  protected readonly hostClass = computed(() =>
    cn('flex h-12 shrink-0 items-center gap-2 px-1.5', this.userClass()),
  );
  protected readonly triggerClass = computed(
    () => `transition-opacity delay-200 duration-160 ${this.sidebar.isPeeking() ? 'opacity-0' : 'opacity-100'}`,
  );
}
