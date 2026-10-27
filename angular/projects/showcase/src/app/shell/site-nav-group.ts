// ---------------------------------------------------------------------------
// One labelled group of doc rows in the site's rail: the label with its count,
// the hairline under it, and the rows with their New dots. Ported from
// app/components/sidebar.tsx (NavGroup).
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@angel-r/fluid-functionalism-angular';
import { RouteLocation } from './route-location';
import { NEW_DOT, isNew } from './release-marks';

@Component({
  selector: 'app-site-nav-group',
  // The host stands in for React's fragment/root element: contents keeps it
  // out of the layout its children measured themselves against.
  host: { style: 'display: contents' },
  imports: [RouterLink, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton],
  templateUrl: './site-nav-group.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteNavGroup {
  /** Omitted for an unlabelled group (none on the site today). */
  readonly label = input<string | undefined>(undefined);
  readonly entries = input.required<readonly { slug: string; name: string }[]>();
  readonly ariaLabel = input.required<string>();

  protected readonly location = inject(RouteLocation);
  protected readonly newDot = NEW_DOT;
  protected readonly isNew = isNew;
}
