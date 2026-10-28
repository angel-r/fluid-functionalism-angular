// ---------------------------------------------------------------------------
// The site's own navigation rail: the library's Sidebar, dogfooded. Ported from
// app/components/sidebar.tsx (SiteSidebar): the Search trigger, the three fixed
// rows, then System and Components at 1280's sheet or the desktop rail. Below
// the breakpoint the sheet also carries the settings block, which lives in the
// right panel on desktop.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  fontWeights,
  injectIsMac,
  injectSidebar,
} from '@angel-r/fluid-functionalism-angular';
import { mainNav, componentList, systemNavList } from '../site/nav-data';
import { SiteCommandMenuService } from './site-command-menu.service';
import { RouteLocation } from './route-location';
import { NEW_DOT } from './release-marks';
import { SiteNavGroup } from './site-nav-group';
import { GitHubStarButton } from './github-star-button';
import { SettingsContent } from './settings-content';

@Component({
  selector: 'app-site-sidebar',
  // The host stands in for React's fragment/root element: contents keeps it
  // out of the layout its children measured themselves against.
  host: { style: 'display: contents' },
  imports: [
    RouterLink,
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SiteNavGroup,
    GitHubStarButton,
    SettingsContent,
  ],
  templateUrl: './site-sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteSidebar {
  protected readonly mainNav = mainNav;
  protected readonly systemNavList = systemNavList;
  protected readonly componentList = componentList;
  protected readonly newDot = NEW_DOT;
  protected readonly semibold = fontWeights.semibold;
  /** ⌘K on a Mac, Ctrl K elsewhere. */
  protected readonly shortcutLabel = injectIsMac() ? '⌘K' : 'Ctrl K';

  protected readonly location = inject(RouteLocation);
  protected readonly sidebar = injectSidebar();
  private readonly commandMenu = inject(SiteCommandMenuService);

  protected openCommandMenu(): void {
    this.commandMenu.setOpen(true);
  }
}
