// ---------------------------------------------------------------------------
// The site command menu's state: ⌘K opens it from anywhere, the sidebar's
// Search row opens it, and the last pages visited seed its suggestions.
// Ported from app/components/site-command-menu.tsx (SiteCommandMenuProvider).
//
// A root service instead of a provider: the menu is mounted once by the shell
// and /demo needs it too, so nothing is lost by keeping the state in the
// injector rather than in a wrapper component's template.
// ---------------------------------------------------------------------------

import { Injectable, signal } from '@angular/core';

/** Where the last visited pages live, and how many suggestions the menu
 *  lists. */
const RECENT_KEY = 'ff:command-menu-recent';
const RECENT_MAX = 3;

/** The saved page list, ignoring anything unreadable (private mode, a
 *  tampered value): the suggestions just stay empty. */
function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecent(list: readonly string[]): void {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Private mode, quota: the suggestions just stay empty.
  }
}

@Injectable({ providedIn: 'root' })
export class SiteCommandMenuService {
  private readonly openState = signal(false);
  /** Whether the dialog is open. */
  readonly open = this.openState.asReadonly();

  private readonly recentState = signal<readonly string[]>([]);
  /** The last pages visited, newest first: the rows listed under "Recent"
   *  while nothing is typed. Read when the menu opens, so the first render
   *  never disagrees with the browser. */
  readonly recent = this.recentState.asReadonly();

  setOpen(open: boolean): void {
    this.openState.set(open);
    if (open) this.recentState.set(readRecent());
  }

  /** Records a visit: the row leads the suggestions and leaves its own group,
   *  so it is listed once. */
  remember(href: string): void {
    const next = [href, ...readRecent().filter((value) => value !== href)].slice(0, RECENT_MAX);
    writeRecent(next);
    this.recentState.set(next);
  }
}
