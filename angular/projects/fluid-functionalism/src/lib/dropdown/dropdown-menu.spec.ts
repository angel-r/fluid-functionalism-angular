/**
 * The popup dropdown (DropdownMenu, DropdownTrigger, DropdownContent) through
 * its public interface. Ported from tests/dropdown-keyboard.test.tsx: Enter
 * and Space on a focused row select it, and a click selects it exactly once,
 * for action, radio and checkbox rows; with a DropdownSearch the field is one
 * stop in the ring of rows and the highlight follows the "lit by" rules (the
 * field-only cases live in dropdown-search.spec.ts). Plus one test per rule
 * of the React popup: trigger ARIA, open focus, the close paths (pick,
 * Escape, outside press, focus leaving), controlled / default open, the
 * spring exit releasing the popup (popup-exit-sync), checkbox rows keeping
 * the menu open, the radio state, and the popup classes.
 */
import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { shapeMap } from '../core/shape';
import { sizeMap } from '../core/size';
import { surfaceClasses } from '../core/surface-classes';
import { MenuItem } from '../menu-item/menu-item';
import { DropdownEmpty, DropdownSearch } from '../dropdown-search/dropdown-search';
import { DropdownContent, DropdownMenu, DropdownTrigger } from './dropdown-menu';

const labels = ['Teamspaces', 'Recents', 'Favorites'];
type Kind = 'action' | 'radio' | 'checkbox';
const roles: Record<Kind, string> = { action: 'menuitem', radio: 'menuitemradio', checkbox: 'menuitemcheckbox' };

const frames = (n = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(n);
  });
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Popup exit spring fallback (exitFallbackMs(spring.fast)) plus slack. */
const EXIT_MS = 200;

beforeEach(() => {
  // jsdom reports a 0×0 viewport; the overlay positions against a real one.
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
});

afterEach(() => {
  delete (document.documentElement as { clientWidth?: number }).clientWidth;
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
});

/** The popup menus currently shown (closed popups sit hidden in place). */
function shownMenus() {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]')).filter(
    (m) => m.closest<HTMLElement>('[data-slot="dropdown-positioner"]')?.style.display !== 'none',
  );
}

function rowByName(name: string) {
  return document.querySelector<HTMLElement>(
    `[role^="menuitem"][aria-label="${name}"]`,
  )!;
}

const lit = () => document.querySelector<HTMLElement>('[data-fluid-hover-active]')?.getAttribute('aria-label') ?? null;

function key(target: Element, k: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

// ── Rows ────────────────────────────────────────────────────────────────

@Component({
  imports: [DropdownMenu, DropdownTrigger, DropdownContent, MenuItem],
  template: `
    <ff-dropdown-menu
      [open]="open()"
      [defaultOpen]="defaultOpen()"
      [disabled]="disabled()"
      [size]="size()"
      (openChange)="openChanges.push($event)"
    >
      <button type="button" ffDropdownTrigger data-testid="trigger">Open</button>
      <ff-dropdown-content
        class="extra-popup"
        [side]="side()"
        [checkedIndex]="kind() === 'radio' ? 0 : undefined"
        [checkedIndices]="kind() === 'checkbox' ? [0] : undefined"
      >
        @for (label of labels; track label; let i = $index) {
          <ff-menu-item
            [index]="i"
            [label]="label"
            [checked]="kind() === 'action' ? undefined : i === 0"
            [disabled]="label === disabledRow()"
            [closeOnClick]="closeOnClick()"
            (select)="selected(i)"
          />
        }
      </ff-dropdown-content>
    </ff-dropdown-menu>
    <button type="button" data-testid="outside">Outside</button>
  `,
})
class Rows {
  readonly labels = labels;
  readonly kind = signal<Kind>('action');
  readonly open = signal<boolean | undefined>(undefined);
  readonly defaultOpen = signal(true);
  readonly disabled = signal(false);
  readonly size = signal<'default' | 'compact' | undefined>(undefined);
  readonly side = signal<'top' | 'bottom' | 'left' | 'right'>('bottom');
  readonly disabledRow = signal<string | null>(null);
  readonly closeOnClick = signal<boolean | undefined>(undefined);
  readonly selected = vi.fn();
  readonly openChanges: boolean[] = [];
}

function setupRows(configure: (h: Rows) => void = () => {}) {
  const fixture = TestBed.createComponent(Rows);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const trigger = el.querySelector<HTMLElement>('[data-testid="trigger"]')!;
  const outside = el.querySelector<HTMLElement>('[data-testid="outside"]')!;
  const detect = () => fixture.detectChanges();
  return { fixture, host: fixture.componentInstance, el, trigger, outside, detect };
}

describe('dropdown popup: rows select once', () => {
  for (const kind of ['action', 'radio', 'checkbox'] as Kind[]) {
    it(`selects a focused ${kind} row with Enter`, () => {
      const { host, detect } = setupRows((h) => h.kind.set(kind));
      const row = rowByName('Recents');
      expect(row.getAttribute('role')).toBe(roles[kind]);
      row.focus();
      key(row, 'Enter');
      detect();
      expect(host.selected).toHaveBeenCalledTimes(1);
      expect(host.selected).toHaveBeenCalledWith(1);
    });

    it(`selects a focused ${kind} row with Space`, () => {
      const { host, detect } = setupRows((h) => h.kind.set(kind));
      const row = rowByName('Recents');
      row.focus();
      key(row, ' ');
      row.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      detect();
      expect(host.selected).toHaveBeenCalledTimes(1);
      expect(host.selected).toHaveBeenCalledWith(1);
    });

    it(`selects a clicked ${kind} row once`, () => {
      const { host, detect } = setupRows((h) => h.kind.set(kind));
      rowByName('Recents').click();
      detect();
      expect(host.selected).toHaveBeenCalledTimes(1);
      expect(host.selected).toHaveBeenCalledWith(1);
    });
  }

  it('ignores a disabled row and says so', () => {
    const { host, detect } = setupRows((h) => h.disabledRow.set('Recents'));
    const row = rowByName('Recents');
    expect(row.getAttribute('aria-disabled')).toBe('true');
    expect(row.hasAttribute('data-disabled')).toBe(true);
    row.click();
    key(row, 'Enter');
    detect();
    expect(host.selected).not.toHaveBeenCalled();
  });
});

describe('dropdown popup: semantics', () => {
  it('wires the trigger to the menu', () => {
    const { trigger } = setupRows();
    const [menu] = shownMenus();
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.hasAttribute('data-popup-open')).toBe(true);
    expect(menu.id).toBeTruthy();
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);
  });

  it('announces the radio state from checkedIndex and the checkbox state from checked', () => {
    const radio = setupRows((h) => h.kind.set('radio'));
    expect(rowByName('Teamspaces').getAttribute('aria-checked')).toBe('true');
    expect(rowByName('Recents').getAttribute('aria-checked')).toBe('false');
    radio.fixture.destroy();
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
    setupRows((h) => h.kind.set('checkbox'));
    expect(rowByName('Teamspaces').getAttribute('aria-checked')).toBe('true');
    expect(rowByName('Favorites').getAttribute('aria-checked')).toBe('false');
  });

  it('plain action rows carry no checked state', () => {
    setupRows();
    expect(rowByName('Recents').hasAttribute('aria-checked')).toBe(false);
  });

  it('keeps one roving tab stop among the rows', () => {
    setupRows();
    const stops = labels.map((l) => rowByName(l).getAttribute('tabindex'));
    expect(stops.filter((t) => t === '0')).toHaveLength(1);
    expect(stops.filter((t) => t === '-1')).toHaveLength(2);
  });

  it('wraps the rows in a display:contents group', () => {
    setupRows();
    const group = rowByName('Recents').closest('[role="group"]')!;
    expect(group.classList).toContain('contents');
  });
});

describe('dropdown popup: styling', () => {
  it('raises the popup two surface steps with the rounded container and the consumer class', () => {
    setupRows();
    const [menu] = shownMenus();
    for (const cls of [
      'flex',
      'flex-col',
      'w-72',
      'min-w-[var(--anchor-width)]',
      'max-w-full',
      'max-h-[min(480px,var(--available-height))]',
      'overflow-hidden',
      'select-none',
      'outline-none',
      'extra-popup',
      ...shapeMap.rounded.container.split(' '),
      ...surfaceClasses(3, 3).split(' '),
    ]) {
      expect(menu.classList).toContain(cls);
    }
  });

  it('stamps the resolved side on the positioner and sets the anchor width', () => {
    setupRows();
    const positioner = shownMenus()[0].closest<HTMLElement>('[data-slot="dropdown-positioner"]')!;
    expect(positioner.getAttribute('data-side')).toBe('bottom');
    expect(positioner.style.getPropertyValue('--anchor-width')).toBe('0px');
    expect(positioner.style.getPropertyValue('--available-height')).not.toBe('');
  });

  it('prefers the side it is given', () => {
    setupRows((h) => h.side.set('top'));
    const positioner = shownMenus()[0].closest<HTMLElement>('[data-slot="dropdown-positioner"]')!;
    expect(['top', 'bottom']).toContain(positioner.getAttribute('data-side'));
  });

  it('pins the popup rows to the compact step with a size', () => {
    setupRows((h) => h.size.set('compact'));
    expect(rowByName('Recents').classList).toContain(sizeMap.compact.control);
  });
});

describe('dropdown popup: open', () => {
  it('opens on a trigger click and closes on another', () => {
    const { host, trigger, detect } = setupRows((h) => h.defaultOpen.set(false));
    expect(shownMenus()).toHaveLength(0);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    trigger.click();
    detect();
    expect(shownMenus()).toHaveLength(1);
    expect(host.openChanges).toEqual([true]);
    trigger.click();
    detect();
    expect(host.openChanges).toEqual([true, false]);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens with defaultOpen without reporting it', () => {
    const { host } = setupRows();
    expect(shownMenus()).toHaveLength(1);
    expect(host.openChanges).toEqual([]);
  });

  it('focuses the first enabled row a couple of frames after opening', async () => {
    setupRows((h) => h.disabledRow.set('Teamspaces'));
    await frames(3);
    expect(document.activeElement).toBe(rowByName('Recents'));
  });

  it('lights the row focus lands on', async () => {
    const { detect } = setupRows();
    await frames(3);
    detect();
    expect(lit()).toBe('Teamspaces');
  });

  it('does not open while disabled', () => {
    const { host, trigger, detect } = setupRows((h) => {
      h.defaultOpen.set(false);
      h.disabled.set(true);
    });
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    trigger.click();
    detect();
    expect(shownMenus()).toHaveLength(0);
    expect(host.openChanges).toEqual([]);
  });
});

describe('dropdown popup: close', () => {
  it('closes on a pick, plays the exit, then hands focus back to the trigger', async () => {
    const { host, trigger, detect } = setupRows();
    rowByName('Recents').focus();
    rowByName('Recents').click();
    detect();
    expect(host.openChanges).toEqual([false]);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    // Still in the overlay while the exit spring plays.
    expect(shownMenus()).toHaveLength(1);
    await wait(EXIT_MS);
    expect(shownMenus()).toHaveLength(0);
  });

  it('keeps the menu open when a checkbox row is toggled', () => {
    const { host, detect } = setupRows((h) => h.kind.set('checkbox'));
    rowByName('Recents').click();
    key(rowByName('Favorites'), 'Enter');
    detect();
    expect(host.selected).toHaveBeenCalledTimes(2);
    expect(host.openChanges).toEqual([]);
  });

  it('keeps the menu open for a row with closeOnClick off', () => {
    const { host, detect } = setupRows((h) => h.closeOnClick.set(false));
    rowByName('Recents').click();
    detect();
    expect(host.selected).toHaveBeenCalledWith(1);
    expect(host.openChanges).toEqual([]);
  });

  it('closes with Escape and refocuses the trigger', () => {
    const { host, trigger, detect } = setupRows();
    rowByName('Recents').focus();
    key(rowByName('Recents'), 'Escape');
    detect();
    expect(host.openChanges).toEqual([false]);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on a press outside, not on a press inside', () => {
    const { host, outside, detect } = setupRows();
    rowByName('Recents').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    detect();
    expect(host.openChanges).toEqual([]);
    outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    detect();
    expect(host.openChanges).toEqual([false]);
  });

  it('closes when focus moves outside', () => {
    const { host, outside, detect } = setupRows();
    outside.focus();
    detect();
    expect(host.openChanges).toEqual([false]);
  });

  it('stays open while controlled open, reporting the close request once', async () => {
    const { host, detect } = setupRows((h) => h.open.set(true));
    key(rowByName('Recents'), 'Escape');
    detect();
    expect(host.openChanges).toEqual([false]);
    await wait(EXIT_MS);
    expect(shownMenus()).toHaveLength(1);
  });

  it('plays the exit when a controlled close lands', async () => {
    const { host, detect } = setupRows((h) => h.open.set(true));
    host.open.set(false);
    detect();
    expect(shownMenus()).toHaveLength(1);
    await wait(EXIT_MS);
    expect(shownMenus()).toHaveLength(0);
    expect(host.openChanges).toEqual([]);
  });

  it('reopens mid-exit without losing the popup', async () => {
    const { host, detect } = setupRows((h) => h.open.set(true));
    host.open.set(false);
    detect();
    host.open.set(true);
    detect();
    await wait(EXIT_MS);
    expect(shownMenus()).toHaveLength(1);
  });
});

describe('dropdown popup: keyboard navigation', () => {
  it('moves between rows with the arrow keys, Home and End', () => {
    setupRows();
    rowByName('Teamspaces').focus();
    key(rowByName('Teamspaces'), 'ArrowDown');
    expect(document.activeElement).toBe(rowByName('Recents'));
    key(rowByName('Recents'), 'End');
    expect(document.activeElement).toBe(rowByName('Favorites'));
    key(rowByName('Favorites'), 'Home');
    expect(document.activeElement).toBe(rowByName('Teamspaces'));
    key(rowByName('Teamspaces'), 'ArrowUp');
    expect(document.activeElement).toBe(rowByName('Favorites'));
  });

  it('jumps to a row by typing its first letter', async () => {
    setupRows();
    rowByName('Teamspaces').focus();
    key(rowByName('Teamspaces'), 'f');
    expect(document.activeElement).toBe(rowByName('Favorites'));
  });
});

// ── Search (dropdown-keyboard "dropdown search") ─────────────────────────

@Component({
  imports: [DropdownMenu, DropdownTrigger, DropdownContent, MenuItem, DropdownSearch, DropdownEmpty],
  template: `
    <ff-dropdown-menu [defaultOpen]="true">
      <button type="button" ffDropdownTrigger>Open</button>
      <ff-dropdown-content>
        <ff-dropdown-search [(value)]="query" [autoFocus]="autoFocus()" />
        @for (label of filtered(); track label; let i = $index) {
          <ff-menu-item [index]="i" [label]="label" [disabled]="label === disabled()" (select)="selected(label)" />
        } @empty {
          <ff-dropdown-empty>No results</ff-dropdown-empty>
        }
      </ff-dropdown-content>
    </ff-dropdown-menu>
  `,
})
class Searchable {
  readonly query = signal('');
  readonly autoFocus = signal(true);
  readonly disabled = signal<string | null>(null);
  readonly filtered = computed(() => labels.filter((l) => l.toLowerCase().includes(this.query().toLowerCase())));
  readonly selected = vi.fn();
}

function setupSearch(configure: (s: Searchable) => void = () => {}) {
  const fixture = TestBed.createComponent(Searchable);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const field = () => document.querySelector<HTMLInputElement>('[role="searchbox"]')!;
  const detect = () => fixture.detectChanges();
  const type = (value: string) => {
    field().value = value;
    field().dispatchEvent(new Event('input'));
    detect();
  };
  return { fixture, host: fixture.componentInstance, field, detect, type };
}

describe('dropdown popup: search', () => {
  it('picks nothing with Enter in the field', () => {
    const { host, field, type, detect } = setupSearch();
    field().focus();
    type('re');
    key(field(), 'Enter');
    detect();
    expect(host.selected).not.toHaveBeenCalled();
    expect(field()).not.toBeNull();
    expect(shownMenus()).toHaveLength(1);
  });

  it('picks the row arrowed onto from the field', () => {
    const { host, field, detect } = setupSearch();
    field().focus();
    key(field(), 'ArrowDown');
    key(document.activeElement!, 'Enter');
    detect();
    expect(host.selected).toHaveBeenCalledTimes(1);
    expect(host.selected).toHaveBeenCalledWith('Teamspaces');
  });

  it('leaves the row the open focuses unlit', () => {
    const { detect } = setupSearch();
    rowByName('Teamspaces').focus();
    detect();
    expect(lit()).toBeNull();
  });

  it("lights the row the open focuses when the field doesn't autofocus", () => {
    const { detect } = setupSearch((s) => s.autoFocus.set(false));
    rowByName('Teamspaces').focus();
    detect();
    expect(lit()).toBe('Teamspaces');
  });

  it('returns to the field from a disabled row past either end', () => {
    const first = setupSearch((s) => s.disabled.set('Teamspaces'));
    rowByName('Teamspaces').focus();
    key(rowByName('Teamspaces'), 'ArrowUp');
    expect(document.activeElement).toBe(first.field());
    first.fixture.destroy();
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
    const last = setupSearch((s) => s.disabled.set('Favorites'));
    rowByName('Favorites').focus();
    key(rowByName('Favorites'), 'ArrowDown');
    expect(document.activeElement).toBe(last.field());
  });

  it('highlights a row arrowed onto, and no row while the field has focus', () => {
    const { field, detect, type } = setupSearch();
    field().focus();
    key(field(), 'ArrowDown');
    detect();
    expect(document.activeElement).toBe(rowByName('Teamspaces'));
    expect(lit()).toBe('Teamspaces');
    field().focus();
    detect();
    expect(lit()).toBeNull();
    type('e');
    expect(lit()).toBeNull();
  });

  it('clears the highlight when ArrowUp returns to the field', () => {
    const { field, detect } = setupSearch();
    field().focus();
    key(field(), 'ArrowDown');
    detect();
    expect(lit()).toBe('Teamspaces');
    key(rowByName('Teamspaces'), 'ArrowUp');
    detect();
    expect(document.activeElement).toBe(field());
    expect(lit()).toBeNull();
  });

  it('returns to the field with ArrowUp on the first row', () => {
    const { field } = setupSearch();
    rowByName('Teamspaces').focus();
    key(rowByName('Teamspaces'), 'ArrowUp');
    expect(document.activeElement).toBe(field());
  });

  it('returns to the field with ArrowDown on the last row', () => {
    const { field } = setupSearch();
    rowByName('Favorites').focus();
    key(rowByName('Favorites'), 'ArrowDown');
    expect(document.activeElement).toBe(field());
  });

  it('leaves arrows between rows to the menu', () => {
    const { field } = setupSearch();
    rowByName('Recents').focus();
    key(rowByName('Recents'), 'ArrowUp');
    expect(document.activeElement).not.toBe(field());
    expect(document.activeElement).toBe(rowByName('Teamspaces'));
  });

  it('leaves the field for the first and last row', () => {
    const { field } = setupSearch();
    field().focus();
    key(field(), 'ArrowDown');
    expect(document.activeElement).toBe(rowByName('Teamspaces'));
    field().focus();
    key(field(), 'ArrowUp');
    expect(document.activeElement).toBe(rowByName('Favorites'));
  });

  it('takes focus on open instead of the first row, and drops the scroll fade', async () => {
    const { field } = setupSearch();
    await frames(3);
    expect(document.activeElement).toBe(field());
    const viewport = shownMenus()[0].querySelector('[data-slot="scroll-area-viewport"]')!;
    expect(viewport.classList).not.toContain('scroll-fade');
  });

  it('moves typing on a row into the field and filters', () => {
    const { host, field, detect } = setupSearch();
    rowByName('Recents').focus();
    key(rowByName('Recents'), 'f');
    detect();
    expect(document.activeElement).toBe(field());
    expect(host.query()).toBe('f');
    expect(rowByName('Favorites')).not.toBeNull();
    expect(rowByName('Recents')).toBeNull();
  });
});
