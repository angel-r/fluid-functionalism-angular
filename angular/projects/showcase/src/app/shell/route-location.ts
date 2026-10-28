// ---------------------------------------------------------------------------
// Where the visitor is: the current path, and whether that route wants the
// site shell (app/components/sidebar-layout.tsx reads both from the router).
//
// The React shell called usePathname() in five places; one root service keeps
// a signal in step with the router instead, so every piece of chrome updates
// together on navigation.
// ---------------------------------------------------------------------------

import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/** The one route that renders full screen, as a URL suffix: the reference
 *  compares literal paths for the same reason. */
const FULLSCREEN_SUFFIX = '/demo';

@Injectable({ providedIn: 'root' })
export class RouteLocation {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  private readonly pathState = signal(this.currentPath());
  /** The current path, e.g. "/docs/button": no query, no fragment. */
  readonly path = this.pathState.asReadonly();

  private readonly shellState = signal(this.routeKeepsShell());
  /** False on routes that render without the sidebar and right panel. */
  readonly shell = this.shellState.asReadonly();

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.pathState.set(this.currentPath());
        this.shellState.set(this.routeKeepsShell());
      });
  }

  private currentPath(): string {
    return this.router.url.split('?')[0].split('#')[0] || '/';
  }

  /** Only a route marked `data: { shell: false }` goes full screen. Before the
   *  first navigation resolves (the app renders first in an SPA), the
   *  browser's own address is the only source, so /demo never flashes the
   *  shell on a reload. */
  private routeKeepsShell(): boolean {
    if (!this.router.navigated) {
      const path = (this.document.location?.pathname ?? '').replace(/\/+$/, '');
      if (path.endsWith(FULLSCREEN_SUFFIX)) return false;
    }
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    return route.data?.['shell'] !== false;
  }
}
