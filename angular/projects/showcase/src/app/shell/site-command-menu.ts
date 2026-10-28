// ---------------------------------------------------------------------------
// The site's own command menu: ⌘K anywhere. Every page, every setting the right
// panel offers, and a few actions, in one field. Ported from
// app/components/site-command-menu.tsx: the command menu component, dogfooded,
// with tabs narrowing the 40-odd rows and the last pages visited listed first.
//
// D1 dropped the Primitive rows and D4 dropped /compare; everything else is the
// reference's list, with the Angular install command (S8).
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  CommandMenu,
  CommandMenuDialog,
  CommandMenuEmpty,
  CommandMenuFooter,
  CommandMenuInput,
  CommandMenuList,
  CommandMenuTabs,
  type CommandMenuItemData,
} from '@angel-r/fluid-functionalism-angular';
import {
  GITHUB_REPO,
  GITHUB_URL,
  commandMenuTabs,
  componentList,
  pageOrder,
  shapeOptions,
  sitePages,
  sizeOptions,
  systemNavList,
  themeOptions,
} from '../site/nav-data';
import { ICON_LIBRARY_LABELS, ICON_LIBRARY_ORDER, type IconLibrary } from '../site/icon-map';
import { INSTALL_COMMAND } from '../site/install-brief';
import { SiteSettingsService } from '../site/site-settings.service';
import { SiteToastService } from '../site/toast';
import { RouteLocation } from './route-location';
import { markFor } from './release-marks';
import { SiteCommandMenuService } from './site-command-menu.service';

type Tab = 'all' | 'page' | 'setting' | 'action';

/** A row plus which tab it belongs to. */
interface SiteItem extends CommandMenuItemData {
  kind: Exclude<Tab, 'all'>;
}

@Component({
  selector: 'app-site-command-menu',
  // The host stands in for React's fragment/root element: contents keeps it
  // out of the layout its children measured themselves against.
  host: { style: 'display: contents' },
  imports: [
    CommandMenu,
    CommandMenuDialog,
    CommandMenuEmpty,
    CommandMenuFooter,
    CommandMenuInput,
    CommandMenuList,
    CommandMenuTabs,
  ],
  templateUrl: './site-command-menu.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteCommandMenu {
  protected readonly command = inject(SiteCommandMenuService);
  private readonly settings = inject(SiteSettingsService);
  private readonly toast = inject(SiteToastService);
  private readonly location = inject(RouteLocation);
  private readonly router = inject(Router);

  protected readonly tabs = commandMenuTabs;
  protected readonly tab = signal<Tab>('all');

  protected setTab(value: string): void {
    this.tab.set(value as Tab);
  }

  protected readonly visible = computed<readonly CommandMenuItemData[]>(() => {
    const tab = this.tab();
    const items = this.items();
    return tab === 'all' ? items : items.filter((item) => item.kind === tab);
  });

  private readonly items = computed<SiteItem[]>(() => {
    const current = (isCurrent: boolean) => (isCurrent ? 'Current' : undefined);
    const theme = this.settings.theme();
    const shape = this.settings.shape();
    const size = this.settings.size();
    const icons = this.settings.icons();
    const path = this.location.path();
    const currentComponent = componentList.find((component) => `/docs/${component.slug}` === path);
    const pageIndex = pageOrder.indexOf(path);

    const pages: SiteItem[] = [
      ...sitePages.map(
        (page): SiteItem => ({
          kind: 'page',
          value: page.href,
          label: page.label,
          action: `Open ${page.label}`,
          icon: page.icon,
          keywords: page.keywords,
          group: 'Pages',
          onSelect: () => this.go(page.href),
        }),
      ),
      ...systemNavList.map(
        (system): SiteItem => ({
          kind: 'page',
          value: `/docs/${system.slug}`,
          label: system.name,
          action: `Open ${system.name}`,
          description: markFor(system.slug),
          keywords: [system.slug, ...system.description.split(/\W+/)],
          group: 'System',
          onSelect: () => this.go(`/docs/${system.slug}`),
        }),
      ),
      ...componentList.map(
        (component): SiteItem => ({
          kind: 'page',
          value: `/docs/${component.slug}`,
          label: component.name,
          action: `Open ${component.name}`,
          description: markFor(component.slug),
          keywords: [component.slug, ...component.description.split(/\W+/)],
          group: 'Components',
          onSelect: () => this.go(`/docs/${component.slug}`),
        }),
      ),
    ];

    const settings: SiteItem[] = [
      ...themeOptions.map(
        (option): SiteItem => ({
          kind: 'setting',
          value: `theme:${option.value}`,
          label: `Theme: ${option.label}`,
          action: `Set theme to ${option.label}`,
          description: current(theme === option.value),
          icon: option.icon,
          keywords: ['theme', 'appearance', 'mode', option.value],
          group: 'Settings',
          onSelect: () => {
            this.settings.setTheme(option.value);
            this.toast.success(`Theme set to ${option.label}`);
          },
        }),
      ),
      ...shapeOptions.map(
        (option): SiteItem => ({
          kind: 'setting',
          value: `shape:${option.value}`,
          label: `Radius: ${option.label}`,
          action: `Set radius to ${option.label}`,
          description: current(shape === option.value),
          icon: option.icon,
          keywords: ['radius', 'shape', 'corners', option.value],
          group: 'Settings',
          onSelect: () => {
            this.settings.setShape(option.value);
            this.toast.success(`Radius set to ${option.label}`);
          },
        }),
      ),
      ...sizeOptions.map(
        (option): SiteItem => ({
          kind: 'setting',
          value: `size:${option.value}`,
          label: `Size: ${option.label}`,
          action: `Set size to ${option.label}`,
          description: current(size === option.value),
          icon: 'scaling',
          keywords: ['size', 'density', 'ladder', option.value],
          group: 'Settings',
          onSelect: () => {
            this.settings.setSize(option.value);
            this.toast.success(`Size set to ${option.label}`);
          },
        }),
      ),
      ...ICON_LIBRARY_ORDER.map(
        (library: IconLibrary): SiteItem => ({
          kind: 'setting',
          value: `icons:${library}`,
          label: `Icons: ${ICON_LIBRARY_LABELS[library]}`,
          action: `Set icons to ${ICON_LIBRARY_LABELS[library]}`,
          description: current(icons === library),
          icon: 'palette',
          keywords: ['icons', 'library', library],
          group: 'Settings',
          onSelect: () => {
            this.settings.setIcons(library);
            this.toast.success(`Icons set to ${ICON_LIBRARY_LABELS[library]}`);
          },
        }),
      ),
    ];

    const actions: SiteItem[] = [
      ...(currentComponent
        ? [
            {
              kind: 'action' as const,
              value: 'action:copy-install',
              label: 'Copy install command',
              description: currentComponent.name,
              icon: 'copy' as const,
              keywords: ['npm', 'install', 'package', 'provideFluid'],
              group: 'Actions',
              onSelect: () => {
                // The toast follows the write: no clipboard (an insecure
                // context) or a refused write must not announce a copy.
                navigator.clipboard
                  ?.writeText(INSTALL_COMMAND)
                  .then(() => this.toast.success('Install command copied'))
                  .catch(() => {});
              },
            },
          ]
        : []),
      ...(pageIndex > 0
        ? [
            {
              kind: 'action' as const,
              value: 'action:previous',
              label: 'Previous page',
              action: 'Go to the previous page',
              icon: 'arrow-left' as const,
              shortcut: 'left',
              group: 'Actions',
              onSelect: () => this.go(pageOrder[pageIndex - 1]),
            },
          ]
        : []),
      ...(pageIndex >= 0 && pageIndex < pageOrder.length - 1
        ? [
            {
              kind: 'action' as const,
              value: 'action:next',
              label: 'Next page',
              action: 'Go to the next page',
              icon: 'arrow-right' as const,
              shortcut: 'right',
              group: 'Actions',
              onSelect: () => this.go(pageOrder[pageIndex + 1]),
            },
          ]
        : []),
      {
        kind: 'action',
        value: 'action:github',
        label: 'Open on GitHub',
        description: GITHUB_REPO,
        icon: 'link',
        keywords: ['source', 'star', 'repository'],
        group: 'Actions',
        onSelect: () => window.open(GITHUB_URL, '_blank', 'noopener'),
      },
    ];

    return [...pages, ...settings, ...actions];
  });

  private go(href: string): void {
    this.command.remember(href);
    void this.router.navigateByUrl(href);
  }
}
