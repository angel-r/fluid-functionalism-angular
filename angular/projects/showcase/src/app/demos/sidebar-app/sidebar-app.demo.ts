import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AppSidebar, SidebarInset, SidebarInsetTopbar, SidebarProvider } from 'fluid-functionalism';
import { DemoPage } from '../../shared/demo-page';
import { NAV_SECTIONS } from './nav-data';

// ---------------------------------------------------------------------------
// Paste-and-run app shell (registry/blocks/sidebar-app/page.tsx). peek="hover"
// floats the collapsed rail back out the moment the cursor reaches its edge
// or the trigger; pinning it open from that peek is seamless. State persists
// to the "sidebar_state" cookie — read it on the server for a flicker-free
// `defaultOpen`. Here the shell runs in a viewport-tall frame instead of the
// whole page.
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-sidebar-app-demo',
  imports: [DemoPage, SidebarProvider, SidebarInset, SidebarInsetTopbar, AppSidebar],
  template: `
    <app-demo-page
      title="Sidebar app"
      description="A complete app shell: workspace switcher, search, collapsible sections with badges, and the user menu. Collapse it with the trigger or [, then hover its edge to peek."
    >
      <div class="relative flex h-[calc(100svh-12rem)] min-h-[560px] w-full overflow-hidden rounded-lg border border-border bg-background">
        <ff-sidebar-provider peek="hover" class="h-full min-h-0">
          <ff-app-sidebar class="h-full" [sections]="sections" [(active)]="active" />
          <div ffSidebarInset class="min-h-0">
            <header ffSidebarInsetTopbar>
              <span class="text-[13px] text-muted-foreground">{{ active() }}</span>
            </header>
            <main class="flex flex-1 flex-col gap-4 p-4">
              <!-- your page -->
            </main>
          </div>
        </ff-sidebar-provider>
      </div>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SidebarAppDemo {
  protected readonly sections = NAV_SECTIONS;
  protected readonly active = signal('Home');
}
