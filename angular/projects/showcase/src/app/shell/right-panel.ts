// ---------------------------------------------------------------------------
// The desktop right column: "Make them yours", the install prompt, the credit,
// and the slot playgrounds park their controls in. Ported from
// app/components/right-panel.tsx (RightPanel): "]" shows and hides it, and the
// collapsed panel leaves its own reopen trigger in the top-right corner.
//
// The width (256px) and its 16px right margin animate together so the page
// reflows into the space instead of snapping; the inner column keeps its true
// width and fades. Below xl the panel fades out where it stands
// (xl-fade-block) and the content widens into it.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  Button,
  Icon,
  ScrollArea,
  SIDEBAR_SHORTCUT_KBD_CLASS,
  Tooltip,
  SurfaceProvider as FluidSurface,
  cn,
  enterTransition,
  exitTransition,
  fontWeights,
  injectAnimateFluid,
  injectShape,
  spring,
} from '@angel-r/fluid-functionalism-angular';
import { SiteToastService } from '../site/toast';
import { RailTarget } from '../site/right-rail';
import { RouteLocation } from './route-location';
import { GitHubStarButton } from './github-star-button';
import { SettingsContent } from './settings-content';
import { AppPresence } from './app-presence';

/** The panel's own width and its right margin, in px. */
const PANEL_WIDTH = 256;
const PANEL_MARGIN = 16;

@Component({
  selector: 'app-right-panel',
  // The host stands in for React's fragment/root element: contents keeps it
  // out of the layout its children measured themselves against.
  host: { style: 'display: contents' },
  imports: [
    AppPresence,
    Button,
    Icon,
    ScrollArea,
    Tooltip,
    FluidSurface,
    RailTarget,
    GitHubStarButton,
    SettingsContent,
  ],
  templateUrl: './right-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RightPanel {
  protected readonly open = signal(true);
  protected readonly semibold = fontWeights.semibold;
  protected readonly kbdClass = SIDEBAR_SHORTCUT_KBD_CLASS;

  private readonly location = inject(RouteLocation);
  private readonly toast = inject(SiteToastService);
  private readonly document = inject(DOCUMENT);
  private readonly animate = injectAnimateFluid();
  private readonly shape = injectShape();

  protected readonly asideClass = computed(() => cn('p-4', this.shape().container, 'bg-muted'));

  /** The changelog's rail holds its Releases index alone: nothing on that
   *  page reacts to the settings, which stay a ⌘K or a shortcut away. */
  protected readonly showSettings = computed(() => this.location.path() !== '/changelog');

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly inner = viewChild<ElementRef<HTMLElement>>('inner');

  constructor() {
    // The listener registers once; the signal keeps the current value in
    // reach so the toast can announce the result without a side effect in
    // the state write.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== ']') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Below xl the panel doesn't render, so a shortcut that visibly does
      // nothing (but toasts and flips state) would read as broken.
      if (!window.matchMedia('(min-width: 1280px)').matches) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      event.preventDefault();
      const next = !untracked(this.open);
      this.open.set(next);
      this.toast.shortcut(']', next ? 'Properties panel expanded' : 'Properties panel collapsed');
    };
    this.document.addEventListener('keydown', onKeyDown);
    inject(DestroyRef).onDestroy(() => this.document.removeEventListener('keydown', onKeyDown));

    afterRenderEffect(() => {
      const open = this.open();
      const panel = this.panel()?.nativeElement;
      const inner = this.inner()?.nativeElement;
      if (!panel || !inner) return;
      const transition = open ? enterTransition(spring.slow) : exitTransition(spring.slow);
      untracked(() => {
        this.animate(panel, { width: open ? PANEL_WIDTH : 0, marginRight: open ? PANEL_MARGIN : 0 }, transition);
        this.animate(inner, { opacity: open ? 1 : 0 }, transition);
      });
    });
  }

  protected expand(): void {
    this.open.set(true);
  }
}
