/**
 * Dropdown submenus. Ported from tests/dropdown-submenu.test.tsx: while a
 * submenu is open its trigger row stays lit in the parent menu, pointer moves
 * over the parent don't move the highlight, focus on a submenu row never
 * lights the parent row with the same index, a click on a submenu row picks
 * it and reaches no trigger, closing hands the highlight back (focused row,
 * else nothing), nested submenus keep every trigger lit, and the submenu
 * opens toward the reading direction's end. Plus the keyboard path the menu
 * primitive owns (→ opens and focuses the first row, ← closes back to the
 * trigger) and the trigger row's ARIA.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BidiModule } from '@angular/cdk/bidi';
import { vi } from 'vitest';
import { MenuItem } from '../menu-item/menu-item';
import {
  DropdownContent,
  DropdownMenu,
  DropdownSub,
  DropdownSubContent,
  DropdownSubTrigger,
  DropdownTrigger,
} from './dropdown-menu';

const frame = () => new Promise<void>((resolve) => setTimeout(resolve, 32));

async function waitFor(check: () => void, timeout = 1000) {
  const start = Date.now();
  for (;;) {
    try {
      check();
      return;
    } catch (error) {
      if (Date.now() - start > timeout) throw error;
      await frame();
    }
  }
}

beforeEach(() => {
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
});

afterEach(() => {
  delete (document.documentElement as { clientWidth?: number }).clientWidth;
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
});

function shownMenus() {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]')).filter(
    (m) => m.closest<HTMLElement>('[data-slot="dropdown-positioner"]')?.style.display !== 'none',
  );
}

const row = (name: string) => document.querySelector<HTMLElement>(`[role^="menuitem"][aria-label="${name}"]`)!;

/** The highlighted row index the menu's fluid hover reports, or null. */
function activeIn(menu: HTMLElement) {
  return (
    menu.querySelector('[data-fluid-hover-active-index]')?.getAttribute('data-fluid-hover-active-index') ?? null
  );
}

function key(target: Element, k: string) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
}

// The submenu is held open (controlled, closing ignored), so only the
// dropdown's own handling decides what the parent highlights.
@Component({
  imports: [DropdownMenu, DropdownTrigger, DropdownContent, DropdownSub, DropdownSubTrigger, DropdownSubContent, MenuItem],
  template: `
    <ff-dropdown-menu [open]="rootOpen()">
      <button type="button" ffDropdownTrigger>Open</button>
      <ff-dropdown-content>
        <ff-menu-item [index]="0" label="Rename" />
        <ff-dropdown-sub [open]="subOpen()">
          <ff-dropdown-sub-trigger [index]="1" label="Move to" (click)="onTriggerClick()" />
          <ff-dropdown-sub-content>
            <ff-menu-item [index]="0" label="Inbox" (select)="onPick('Inbox')" />
            <ff-menu-item [index]="1" label="Archive" (select)="onPick('Archive')" />
          </ff-dropdown-sub-content>
        </ff-dropdown-sub>
        <ff-menu-item [index]="2" label="Delete" />
      </ff-dropdown-content>
    </ff-dropdown-menu>
  `,
})
class Held {
  readonly rootOpen = signal(true);
  readonly subOpen = signal(false);
  readonly onTriggerClick = vi.fn();
  readonly onPick = vi.fn();
}

async function setupHeld() {
  const fixture = TestBed.createComponent(Held);
  fixture.autoDetectChanges();
  const host = fixture.componentInstance;
  // Let the menu's open autofocus land on its first row, then open the
  // submenu, as a user would.
  await waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('Rename'));
  host.subOpen.set(true);
  await waitFor(() => expect(shownMenus()).toHaveLength(2));
  const [parent, sub] = shownMenus();
  await waitFor(() => expect(activeIn(parent)).toBe('1'));
  return { fixture, host, parent, sub };
}

describe('dropdown submenu', () => {
  it('renders the submenu beside a trigger row with a chevron', async () => {
    const { parent, sub } = await setupHeld();
    const trigger = row('Move to');
    expect(parent.contains(trigger)).toBe(true);
    expect(trigger.getAttribute('role')).toBe('menuitem');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(sub.id);
    expect(trigger.querySelector('svg')).not.toBeNull();
    expect(sub.contains(row('Inbox'))).toBe(true);
  });

  it('gives the submenu its own narrower popup', async () => {
    const { sub } = await setupHeld();
    expect(sub.classList).toContain('w-56');
    expect(sub.classList).not.toContain('w-72');
  });

  it('keeps the trigger lit while the pointer crosses the parent', async () => {
    const { parent } = await setupHeld();
    expect(activeIn(parent)).toBe('1');
    const list = parent.querySelector<HTMLElement>('[data-fluid-hover-active-index]')!;
    list.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 5, clientY: 500 }));
    await frame();
    expect(activeIn(parent)).toBe('1');
    row('Delete').dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
    parent.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: document.body }));
    await frame();
    expect(activeIn(parent)).toBe('1');
  });

  it('re-entering the parent keeps the held highlight instead of re-keying it', async () => {
    const size = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 36 });
    try {
      const { parent } = await setupHeld();
      await frame();
      const before = parent.querySelector('[data-slot="fluid-hover-highlight"]');
      expect(before).not.toBeNull();
      const del = row('Delete');
      parent.dispatchEvent(new MouseEvent('mouseenter', { relatedTarget: document.body }));
      del.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
      del.focus();
      await frame();
      expect(activeIn(parent)).toBe('2');
      const after = parent.querySelectorAll('[data-slot="fluid-hover-highlight"]');
      expect(after).toHaveLength(1);
      expect(after[0]).toBe(before);
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', size);
    }
  });

  it('does not light the parent row a submenu row shares an index with', async () => {
    const { parent, sub } = await setupHeld();
    row('Inbox').focus();
    await frame();
    expect(activeIn(sub)).toBe('0');
    expect(activeIn(parent)).toBe('1');
  });

  it("a click on a submenu row picks it and never reaches the parent's rows", async () => {
    const { host } = await setupHeld();
    row('Archive').click();
    expect(host.onPick).toHaveBeenCalledTimes(1);
    expect(host.onPick).toHaveBeenCalledWith('Archive');
    expect(host.onTriggerClick).not.toHaveBeenCalled();
  });

  it('on close, the highlight goes to the focused parent row', async () => {
    const { host, parent } = await setupHeld();
    expect(activeIn(parent)).toBe('1');
    host.subOpen.set(false);
    await frame();
    expect(activeIn(parent)).toBe('0');
  });

  it('on close with the pointer elsewhere, the highlight follows focus or clears', async () => {
    const { host, parent } = await setupHeld();
    (document.activeElement as HTMLElement | null)?.blur();
    host.subOpen.set(false);
    await frame();
    const focused = document.activeElement?.closest('[data-fluid-hover-index]');
    expect(activeIn(parent)).toBe(
      focused && parent.contains(focused) ? focused.getAttribute('data-fluid-hover-index') : null,
    );
  });

  it('when the whole menu closes, its last highlight fades out with it', async () => {
    const { host, parent } = await setupHeld();
    host.subOpen.set(false);
    host.rootOpen.set(false);
    await frame();
    expect(activeIn(parent)).toBe('1');
  });
});

// A submenu inside a submenu: the middle menu is both a held child of the
// root and the host of the innermost one.
@Component({
  imports: [DropdownMenu, DropdownTrigger, DropdownContent, DropdownSub, DropdownSubTrigger, DropdownSubContent, MenuItem],
  template: `
    <ff-dropdown-menu [defaultOpen]="true">
      <button type="button" ffDropdownTrigger>Open</button>
      <ff-dropdown-content>
        <ff-menu-item [index]="0" label="Rename" />
        <ff-dropdown-sub [open]="depth() >= 1">
          <ff-dropdown-sub-trigger [index]="1" label="Move to" (click)="onMoveTo()" />
          <ff-dropdown-sub-content>
            <ff-menu-item [index]="0" label="Inbox" />
            <ff-dropdown-sub [open]="depth() >= 2">
              <ff-dropdown-sub-trigger [index]="1" label="Archive" (click)="onArchive()" />
              <ff-dropdown-sub-content>
                <ff-menu-item [index]="0" label="2025" (select)="onPick('2025')" />
                <ff-menu-item [index]="1" label="2026" (select)="onPick('2026')" />
              </ff-dropdown-sub-content>
            </ff-dropdown-sub>
          </ff-dropdown-sub-content>
        </ff-dropdown-sub>
      </ff-dropdown-content>
    </ff-dropdown-menu>
  `,
})
class Nested {
  readonly depth = signal(0);
  readonly onMoveTo = vi.fn();
  readonly onArchive = vi.fn();
  readonly onPick = vi.fn();
}

async function setupNested() {
  const fixture = TestBed.createComponent(Nested);
  fixture.autoDetectChanges();
  const host = fixture.componentInstance;
  await waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('Rename'));
  host.depth.set(1);
  await waitFor(() => expect(shownMenus()).toHaveLength(2));
  host.depth.set(2);
  await waitFor(() => expect(shownMenus()).toHaveLength(3));
  const [root, middle, inner] = shownMenus();
  return { fixture, host, root, middle, inner };
}

describe('dropdown nested submenus', () => {
  it('renders all 3 menus, each submenu in its own popup', async () => {
    const { root, middle, inner } = await setupNested();
    expect(root.contains(row('Move to'))).toBe(true);
    expect(middle.contains(row('Archive'))).toBe(true);
    expect(inner.contains(row('2026'))).toBe(true);
  });

  it('keeps both triggers lit, each in its own menu', async () => {
    const { root, middle } = await setupNested();
    await waitFor(() => {
      expect(activeIn(root)).toBe('1');
      expect(activeIn(middle)).toBe('1');
    });
  });

  it('focus in the innermost menu lights a row there only', async () => {
    const { root, middle, inner } = await setupNested();
    row('2025').focus();
    await frame();
    expect(activeIn(inner)).toBe('0');
    expect(activeIn(middle)).toBe('1');
    expect(activeIn(root)).toBe('1');
  });

  it('a click in the innermost menu picks once and reaches no trigger', async () => {
    const { host } = await setupNested();
    row('2026').click();
    expect(host.onPick).toHaveBeenCalledTimes(1);
    expect(host.onPick).toHaveBeenCalledWith('2026');
    expect(host.onMoveTo).not.toHaveBeenCalled();
    expect(host.onArchive).not.toHaveBeenCalled();
  });
});

// Opens toward the reading direction's end.
@Component({
  imports: [BidiModule, DropdownMenu, DropdownTrigger, DropdownContent, DropdownSub, DropdownSubTrigger, DropdownSubContent, MenuItem],
  template: `
    <div [dir]="dir()">
      <ff-dropdown-menu [defaultOpen]="true">
        <button type="button" ffDropdownTrigger>Open</button>
        <ff-dropdown-content>
          <ff-dropdown-sub [defaultOpen]="true" (openChange)="subChanges.push($event)">
            <ff-dropdown-sub-trigger [index]="0" label="Move to" />
            <ff-dropdown-sub-content>
              <ff-menu-item [index]="0" label="Inbox" (select)="picked()" />
            </ff-dropdown-sub-content>
          </ff-dropdown-sub>
          <ff-menu-item [index]="1" label="Delete" />
        </ff-dropdown-content>
      </ff-dropdown-menu>
    </div>
  `,
})
class Sided {
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly subChanges: boolean[] = [];
  readonly picked = vi.fn();
}

describe('dropdown submenu side', () => {
  it.each([
    ['ltr', 'right'],
    ['rtl', 'left'],
  ] as const)('in %s it opens on the %s', async (dir, side) => {
    // jsdom lays nothing out: put the rows mid-viewport so either side fits
    // and the overlay keeps the preferred one instead of flipping.
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ top: 100, bottom: 136, left: 400, right: 600, width: 200, height: 36, x: 400, y: 100, toJSON() {} } as DOMRect);
    try {
      const fixture = TestBed.createComponent(Sided);
      fixture.componentInstance.dir.set(dir);
      fixture.autoDetectChanges();
      await waitFor(() => {
        const menus = shownMenus();
        expect(menus).toHaveLength(2);
        expect(menus[1].closest('[data-side]')?.getAttribute('data-side')).toBe(side);
      });
    } finally {
      rect.mockRestore();
    }
  });
});

describe('dropdown submenu keyboard', () => {
  async function setupKeys() {
    const fixture = TestBed.createComponent(Sided);
    fixture.autoDetectChanges();
    const host = fixture.componentInstance;
    await waitFor(() => expect(shownMenus()).toHaveLength(2));
    // Close the default-open submenu with ← from inside it.
    row('Inbox').focus();
    key(row('Inbox'), 'ArrowLeft');
    await waitFor(() => expect(shownMenus()).toHaveLength(1));
    return { fixture, host };
  }

  it('← closes the submenu back to its trigger row, reporting the close', async () => {
    const { host } = await setupKeys();
    expect(document.activeElement).toBe(row('Move to'));
    expect(row('Move to').getAttribute('aria-expanded')).toBe('false');
    expect(host.subChanges).toEqual([false]);
  });

  it('→ on the trigger row opens the submenu and focuses its first row', async () => {
    const { host } = await setupKeys();
    key(row('Move to'), 'ArrowRight');
    await waitFor(() => expect(shownMenus()).toHaveLength(2));
    expect(document.activeElement).toBe(row('Inbox'));
    expect(host.subChanges).toEqual([false, true]);
  });

  it('hovering the trigger row opens the submenu after a short delay, focus staying in the parent', async () => {
    const { host } = await setupKeys();
    row('Move to').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await waitFor(() => expect(shownMenus()).toHaveLength(2));
    expect(host.subChanges).toEqual([false, true]);
    expect(document.activeElement).toBe(row('Move to'));
  });

  it('Enter on a submenu row picks it and closes the whole menu', async () => {
    const { host } = await setupKeys();
    key(row('Move to'), 'ArrowRight');
    await waitFor(() => expect(document.activeElement).toBe(row('Inbox')));
    key(row('Inbox'), 'Enter');
    expect(host.picked).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(shownMenus()).toHaveLength(0));
  });
});
