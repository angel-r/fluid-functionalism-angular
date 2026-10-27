// ---------------------------------------------------------------------------
// Toasts the sidebar's "[" toggle the way the settings shortcuts toast theirs:
// a bare "[" press arms a short window, and the provider's own open-state
// change within it surfaces the result. Pointer-driven toggles (trigger
// clicks, the rail) stay silent, like every other setting.
//
// Ported from app/components/sidebar-layout.tsx (SidebarShortcutToast). A
// zero-render component so it sits inside the provider and listens where the
// state lives.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, DOCUMENT, DestroyRef, effect, inject } from '@angular/core';
import { injectSidebar } from '@angel-r/fluid-functionalism-angular';
import { SiteToastService } from '../site/toast';

/** A shortcut keydown and the state write it causes land within a frame or
 *  two of each other; the window only exists so a stale keypress cannot claim
 *  a later pointer-driven change. */
const MATCH_WINDOW_MS = 300;

@Component({
  selector: 'app-sidebar-shortcut-toast',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarShortcutToast {
  private readonly sidebar = injectSidebar();
  private readonly toast = inject(SiteToastService);
  private readonly document = inject(DOCUMENT);
  private pendingAt: number | null = null;

  constructor() {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '[') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      this.pendingAt = performance.now();
    };
    this.document.addEventListener('keydown', onKeyDown);
    inject(DestroyRef).onDestroy(() => this.document.removeEventListener('keydown', onKeyDown));

    // Announce the change only when the shortcut just fired: a trigger click
    // opens the same state and must stay silent.
    let previous: boolean | null = null;
    effect(() => {
      const open = this.sidebar.open();
      if (previous === null) {
        previous = open;
        return;
      }
      if (previous === open) return;
      previous = open;
      const at = this.pendingAt;
      if (at === null || performance.now() - at > MATCH_WINDOW_MS) return;
      this.pendingAt = null;
      this.toast.shortcut('[', open ? 'Sidebar expanded' : 'Sidebar collapsed');
    });
  }
}
