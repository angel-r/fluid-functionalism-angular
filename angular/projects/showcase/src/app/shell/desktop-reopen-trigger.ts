// ---------------------------------------------------------------------------
// Desktop reopen affordance: collapsing the rail (the "[" key, the rail click)
// would otherwise leave NO visible way back — the layout's only trigger is the
// mobile one, hidden at xl. The trigger fades in at the rail's top-left with
// its own "Expand sidebar [" tooltip, and fades away once the rail is open
// again: the mirror of the right panel's "Properties panel" reopen button.
//
// Ported from app/components/sidebar-layout.tsx (DesktopReopenTrigger).
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SidebarTrigger, injectSidebar } from '@angel-r/fluid-functionalism-angular';
import { AppPresence } from './app-presence';

@Component({
  selector: 'app-desktop-reopen-trigger',
  // The host stands in for React's fragment/root element: contents keeps it
  // out of the layout its children measured themselves against.
  host: { style: 'display: contents' },
  imports: [AppPresence, SidebarTrigger],
  template: `
    <app-presence [visible]="!sidebar.open()" [class]="'max-xl:hidden fixed top-4 left-4 z-50'">
      <ff-sidebar-trigger />
    </app-presence>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesktopReopenTrigger {
  protected readonly sidebar = injectSidebar();
}
