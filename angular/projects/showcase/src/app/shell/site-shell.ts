// ---------------------------------------------------------------------------
// The site layout around every page: the sidebar (rail at ≥1280px, sheet
// below), the main inset holding the router outlet, and the right panel. Ported
// from app/components/sidebar-layout.tsx + app/layout.tsx.
//
// /demo is the one route marked `data: { shell: false }`: it renders full
// screen, with no sidebar and no right panel, and the site command menu still
// works (the React isFullscreen branch). The provider stays mounted either way
// so the outlet is never recreated by the switch; [ is disabled there because
// there is no rail to toggle.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, DOCUMENT, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  SIDEBAR_COOKIE_NAME,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@angel-r/fluid-functionalism-angular';
import { RouteLocation } from './route-location';
import { SiteSidebar } from './site-sidebar';
import { RightPanel } from './right-panel';
import { SiteCommandMenu } from './site-command-menu';
import { GoogleFontPicker } from './google-font-picker';
import { ShellNavigation } from './shell-navigation';
import { SidebarShortcutToast } from './sidebar-shortcut-toast';
import { DesktopReopenTrigger } from './desktop-reopen-trigger';

/** The site switches rail ↔ sheet at xl (1280px), not the component's 768
 *  default, so the provider reads the same breakpoint as the responsive
 *  classes. */
const MOBILE_BREAKPOINT = 1280;

@Component({
  selector: 'app-site-shell',
  // The host stands in for React's fragment/root element: contents keeps it
  // out of the layout its children measured themselves against.
  host: { style: 'display: contents' },
  imports: [
    RouterOutlet,
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
    SiteSidebar,
    RightPanel,
    SiteCommandMenu,
    GoogleFontPicker,
    ShellNavigation,
    SidebarShortcutToast,
    DesktopReopenTrigger,
  ],
  templateUrl: './site-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteShell {
  protected readonly location = inject(RouteLocation);
  protected readonly mobileBreakpoint = MOBILE_BREAKPOINT;

  private readonly document = inject(DOCUMENT);
  /** The rail's last position, from the provider's own cookie: the React site
   *  reads it on the server so the rail paints where it was left; here the
   *  cookie is the only copy, and reading it before the provider mounts
   *  avoids a post-boot collapse. */
  protected readonly defaultOpen = this.readSidebarState();

  /** The provider's own class, as the reference passes it: the page floor,
   *  and the 404's rule that hides the right panel. */
  protected readonly providerClass = 'min-h-screen [&:has([data-not-found])_[data-site-right-panel]]:hidden';

  /** `null` disables the bare-key toggle: with the rail gone, "[" would toast
   *  about a sidebar that is not on screen. */
  protected readonly shortcut = computed(() => (this.location.shell() ? undefined : null));

  private readSidebarState(): boolean {
    const match = this.document.cookie.match(new RegExp(`(?:^|; )${SIDEBAR_COOKIE_NAME}=([^;]*)`));
    return match?.[1] !== 'false';
  }
}
