// ---------------------------------------------------------------------------
// A slot in the desktop right panel (below "Make them yours") that any page
// can fill. Ported from lib/right-rail.tsx: the page keeps ownership of the
// content and projects a template into the rail's DOM node, so the page's
// signals and injection context still drive it.
//
// Used by the doc pages' playgrounds to park their controls in the rail while
// the live preview stays in the main column.
// ---------------------------------------------------------------------------

import {
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  Injectable,
  Injector,
  type TemplateRef,
  type ViewContainerRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ApplicationRef } from '@angular/core';
import { DomPortalOutlet, TemplatePortal } from '@angular/cdk/portal';

interface RailContent {
  template: TemplateRef<unknown>;
  viewContainer: ViewContainerRef;
  context?: unknown;
}

interface MountedRail {
  outlet: DomPortalOutlet;
  host: HTMLElement;
  content: RailContent;
}

@Injectable({ providedIn: 'root' })
export class RightRailService {
  private readonly document = inject(DOCUMENT);
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(Injector);

  private readonly host = signal<HTMLElement | null>(null);
  private readonly content = signal<RailContent | null>(null);

  /** True while a page has parked content in the rail. */
  readonly occupied = computed(() => this.content() !== null);

  /** True at ≥1280px, where the right panel is on screen. Below it the panel
   *  is a sheet, so pages render their controls inline instead. */
  readonly desktop = signal(false);

  private mounted: MountedRail | null = null;

  constructor() {
    const view = this.document.defaultView;
    if (view) {
      const query = view.matchMedia('(min-width: 1280px)');
      this.desktop.set(query.matches);
      const update = () => this.desktop.set(query.matches);
      query.addEventListener('change', update);
      inject(DestroyRef).onDestroy(() => query.removeEventListener('change', update));
    }
    effect(() => {
      const host = this.host();
      const content = this.content();
      if (!host || !content) {
        this.detach();
        return;
      }
      if (this.mounted?.host === host && this.mounted.content === content) return;
      this.detach();
      const outlet = new DomPortalOutlet(host, this.appRef, this.injector);
      outlet.attach(new TemplatePortal(content.template, content.viewContainer, content.context));
      this.mounted = { outlet, host, content };
    });
  }

  /** Registers the rail's DOM node. Called by `[appRightRailTarget]`. */
  mount(host: HTMLElement): void {
    this.host.set(host);
  }

  /** Forgets the node when the panel goes away. */
  unmount(host: HTMLElement): void {
    if (this.host() === host) this.host.set(null);
  }

  /** Parks a page's template in the rail. Pass the ViewContainerRef the
   *  template was declared in (`inject(ViewContainerRef)` on the page). */
  show(template: TemplateRef<unknown>, viewContainer: ViewContainerRef, context?: unknown): void {
    this.content.set({ template, viewContainer, context });
  }

  /** Empties the rail: the page is done with it or has moved inline. */
  clear(): void {
    this.content.set(null);
  }

  private detach(): void {
    if (!this.mounted) return;
    this.mounted.outlet.dispose();
    this.mounted = null;
  }
}

/**
 * The rail's target, rendered inside the right panel: `<div class="contents"
 * appRightRailTarget>`. `display: contents` keeps it out of the panel's flex
 * gap until a page fills it (that class is the caller's, so this directive
 * never fights it).
 */
@Directive({ selector: '[appRightRailTarget]' })
export class RailTarget {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly rail = inject(RightRailService);

  constructor() {
    this.rail.mount(this.element.nativeElement);
    inject(DestroyRef).onDestroy(() => this.rail.unmount(this.element.nativeElement));
  }
}
