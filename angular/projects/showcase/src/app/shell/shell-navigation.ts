// ---------------------------------------------------------------------------
// The shell's navigation behaviour, inside the sidebar provider:
//
// - the mobile sheet closes whenever the route changes (React's
//   CloseSheetOnNavigate);
// - ArrowLeft / ArrowRight walk the site's page order, the way the reference's
//   SidebarLayout does. Fields, sliders, tablists, radiogroups, listboxes and
//   menus own their arrows, so the walk skips them.
//
// The arrow walk keeps its cursor in a field, not in a closure over the
// current path: held keys keep advancing because the handler updates the
// cursor before it navigates, instead of waiting for the route to land.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, DOCUMENT, DestroyRef, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { injectSidebar } from '@angel-r/fluid-functionalism-angular';
import { pageOrder } from '../site/nav-data';
import { RouteLocation } from './route-location';

/** Roles that use the arrow keys themselves. */
const ARROW_OWNERS = '[role=slider],[role=tablist],[role=radiogroup],[role=listbox],[role=menu],[role=menubar]';

@Component({
  selector: 'app-shell-navigation',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellNavigation {
  private readonly sidebar = injectSidebar();
  private readonly location = inject(RouteLocation);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  private expectedIndex = pageOrder.indexOf(this.location.path());

  constructor() {
    effect(() => {
      const path = this.location.path();
      untracked(() => {
        this.expectedIndex = pageOrder.indexOf(path);
        this.sidebar.setOpenMobile(false);
      });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

      const target = event.target instanceof HTMLElement ? event.target : null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      ) {
        return;
      }
      const role = target?.getAttribute('role');
      if (role === 'slider' || role === 'tablist' || role === 'radiogroup' || role === 'listbox' || role === 'menu') return;
      // Also skip when focus is inside a component that uses the arrows.
      if (target?.closest(ARROW_OWNERS)) return;

      const current = this.expectedIndex;
      if (current === -1) return;
      const next = event.key === 'ArrowLeft' ? current - 1 : current + 1;
      if (next < 0 || next >= pageOrder.length) return;

      event.preventDefault();
      this.expectedIndex = next;
      void this.router.navigateByUrl(pageOrder[next]);
    };

    this.document.addEventListener('keydown', onKeyDown);
    inject(DestroyRef).onDestroy(() => this.document.removeEventListener('keydown', onKeyDown));
  }
}
