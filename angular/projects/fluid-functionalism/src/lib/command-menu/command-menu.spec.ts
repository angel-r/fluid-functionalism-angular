/**
 * Command menu components through their public interface (ported from
 * tests/command-menu.test.tsx): rows under headings, filtering and the empty
 * state, the keyboard flow the field drives through aria-activedescendant,
 * tabs, the footer, IME, heading ids, Escape, custom rows, and the
 * dialog's shortcut peers, close-on-pick and fresh reopen.
 */
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { SizeProvider, type SizeVariant } from '../core/size';
import {
  COMMAND_MENU_IS_MAC,
  COMMAND_MENU_PARTS,
  type CommandMenuHint,
  type CommandMenuItemData,
  type CommandMenuTab,
} from './index';

const ITEMS: CommandMenuItemData[] = [
  { value: 'new', label: 'New file', description: 'Blank document', keywords: ['create'], group: 'Actions' },
  { value: 'theme', label: 'Toggle dark mode', group: 'Actions' },
  { value: 'locked', label: 'Export', group: 'Actions', disabled: true },
  { value: 'home', label: 'Home', group: 'Go to' },
  { value: 'calendar', label: 'Calendar', group: 'Go to' },
];

const TABS: CommandMenuTab[] = [
  { value: 'all', label: 'All' },
  { value: 'Actions', label: 'Actions' },
  { value: 'Go to', label: 'Go to' },
];

@Component({
  imports: [COMMAND_MENU_PARTS, SizeProvider],
  template: `
    <div ffSizeProvider [size]="size()">
      <ff-command-menu
        [items]="items()"
        [suggestions]="['calendar']"
        [query]="query()"
        (queryChange)="queries.push($event)"
        (itemSelect)="selected.push($event)"
      >
        <ff-command-menu-input aria-label="Search commands" />
        @if (withTabs()) {
          <ff-command-menu-tabs [tabs]="tabs" [value]="tab()" (valueChange)="tabChanges.push($event)" />
        }
        <ff-command-menu-list>
          <ff-command-menu-empty>No results.</ff-command-menu-empty>
        </ff-command-menu-list>
        @if (withFooter()) {
          <ff-command-menu-footer [hints]="hints()" />
        }
      </ff-command-menu>
    </div>
  `,
})
class MenuHost {
  readonly items = signal<CommandMenuItemData[]>(ITEMS);
  readonly query = signal<string | undefined>(undefined);
  readonly size = signal<SizeVariant | undefined>(undefined);
  readonly withTabs = signal(false);
  readonly withFooter = signal(false);
  readonly tab = signal('all');
  readonly hints = signal<CommandMenuHint[] | undefined>(undefined);
  readonly tabs = TABS;
  readonly selected: CommandMenuItemData[] = [];
  readonly queries: string[] = [];
  readonly tabChanges: string[] = [];
}

async function setup<T>(type: new () => T, configure: (host: T) => void = () => {}) {
  const fixture = TestBed.createComponent(type);
  configure(fixture.componentInstance);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

const settle = async (fixture: ComponentFixture<unknown>) => {
  fixture.detectChanges();
  await fixture.whenStable();
};

const field = () => document.querySelector<HTMLInputElement>('input[role="combobox"]')!;
const options = () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
const labels = () => options().map((el) => el.textContent?.trim());

function type(fixture: ComponentFixture<unknown>, value: string) {
  const input = field();
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return settle(fixture);
}

function press(fixture: ComponentFixture<unknown>, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  field().dispatchEvent(event);
  fixture.detectChanges();
  return event;
}

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [{ provide: COMMAND_MENU_IS_MAC, useValue: false }] });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('CommandMenu', () => {
  it('renders the rows under their headings, suggestions first', async () => {
    await setup(MenuHost);
    expect(labels()[0]).toContain('Calendar');
    expect(labels()).toHaveLength(5);
    const groups = Array.from(document.querySelectorAll('[role="group"]'));
    expect(groups.map((g) => document.getElementById(g.getAttribute('aria-labelledby')!)?.textContent?.trim())).toEqual([
      'Suggestions',
      'Actions',
      'Go to',
    ]);
    // Rows carry their state for the CSS and the fluid hover.
    const rows = options();
    expect(rows.map((r) => r.dataset['fluidHoverIndex'])).toEqual(['0', '1', '2', '3', '4']);
    expect(rows[3].getAttribute('aria-disabled')).toBe('true');
    expect(rows[3].classList.contains('pointer-events-none')).toBe(true);
    expect(rows[1].dataset['value']).toBe('new');
    expect(rows[1].textContent).toContain('Blank document');
  });

  it('displays the root as a block with the React root classes exactly', async () => {
    await setup(MenuHost);
    const root = document.querySelector<HTMLElement>('ff-command-menu')!;
    expect(root.style.display).toBe('block');
    for (const cls of ['relative', 'w-full', 'max-h-[inherit]', 'overflow-hidden']) expect(root.classList).toContain(cls);
    expect(root.classList.contains('block')).toBe(false);
  });

  it('filters as you type and shows the empty state when nothing matches', async () => {
    const fixture = await setup(MenuHost);
    const empty = document.querySelector<HTMLElement>('[data-slot="command-menu-empty"]')!;
    expect(empty.style.display).toBe('none');
    expect(empty.textContent?.trim()).toBe('');
    await type(fixture, 'dark');
    expect(labels()).toEqual(['Toggle dark mode']);
    expect(fixture.componentInstance.queries).toEqual(['dark']);
    await type(fixture, 'zzz');
    expect(options()).toHaveLength(0);
    // A block through the host style, so the class list stays React's.
    expect(empty.style.display).toBe('block');
    expect(empty.classList.contains('block')).toBe(false);
    expect(empty.getAttribute('role')).toBe('status');
    expect(empty.textContent?.trim()).toBe('No results.');
    expect(document.querySelector('[role="listbox"]')!.hasAttribute('data-empty')).toBe(true);
  });

  it('arrows move aria-activedescendant, skip disabled rows, wrap, and Enter runs', async () => {
    const fixture = await setup(MenuHost);
    const input = field();
    const rows = options();
    // The first row is highlighted on mount.
    expect(input.getAttribute('aria-activedescendant')).toBe(rows[0].id);
    expect(rows[0].getAttribute('aria-selected')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(document.querySelector('[role="listbox"]')!.id);

    expect(press(fixture, 'ArrowDown').defaultPrevented).toBe(true);
    expect(input.getAttribute('aria-activedescendant')).toBe(rows[1].id);
    press(fixture, 'ArrowDown');
    press(fixture, 'ArrowDown');
    // rows[3] is disabled: skipped.
    expect(input.getAttribute('aria-activedescendant')).toBe(rows[4].id);
    press(fixture, 'ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe(rows[0].id);

    press(fixture, 'ArrowUp');
    expect(input.getAttribute('aria-activedescendant')).toBe(rows[4].id);
    expect(rows[4].getAttribute('aria-selected')).toBe('true');
    expect(rows[0].getAttribute('aria-selected')).toBe('false');
    press(fixture, 'Enter');
    expect(fixture.componentInstance.selected.map((i) => i.value)).toEqual(['home']);
  });

  it('Home and End jump to the ends only while nothing is typed', async () => {
    const fixture = await setup(MenuHost);
    const rows = options();
    expect(press(fixture, 'End').defaultPrevented).toBe(true);
    expect(field().getAttribute('aria-activedescendant')).toBe(rows[4].id);
    press(fixture, 'Home');
    expect(field().getAttribute('aria-activedescendant')).toBe(rows[0].id);
    await type(fixture, 'e');
    expect(press(fixture, 'End').defaultPrevented).toBe(false);
  });

  it('a click runs the row; a disabled row does nothing', async () => {
    const fixture = await setup(MenuHost);
    const rows = options();
    rows[3].click();
    expect(fixture.componentInstance.selected).toEqual([]);
    rows[1].click();
    expect(fixture.componentInstance.selected.map((i) => i.value)).toEqual(['new']);
  });

  it('runs the item’s own onSelect before itemSelect', async () => {
    const order: string[] = [];
    const fixture = await setup(MenuHost, (host) =>
      host.items.set([{ value: 'a', label: 'A', onSelect: () => order.push('item') }]),
    );
    fixture.componentInstance.selected.push = (...items) => {
      order.push('root');
      return items.length;
    };
    options()[0].click();
    expect(order).toEqual(['item', 'root']);
  });

  it('a mousedown on the list does not take focus from the field', async () => {
    await setup(MenuHost);
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    options()[0].dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  });

  it('the highlight resets to the first enabled row when the rows change', async () => {
    const fixture = await setup(MenuHost);
    press(fixture, 'ArrowDown');
    press(fixture, 'ArrowDown');
    fixture.componentInstance.items.set([
      { value: 'x', label: 'X', disabled: true },
      { value: 'y', label: 'Y' },
    ]);
    await settle(fixture);
    expect(field().getAttribute('aria-activedescendant')).toBe(options()[1].id);
    // Same rows, new array: the highlight stays.
    press(fixture, 'ArrowUp');
    fixture.componentInstance.items.set([
      { value: 'x', label: 'X', disabled: true },
      { value: 'y', label: 'Y' },
    ]);
    await settle(fixture);
    expect(field().getAttribute('aria-activedescendant')).toBe(options()[1].id);
  });

  it('a controlled query wins over typing', async () => {
    const fixture = await setup(MenuHost, (host) => host.query.set('home'));
    expect(labels()).toEqual(['Home']);
    await type(fixture, 'cal');
    expect(fixture.componentInstance.queries).toEqual(['cal']);
    expect(field().value).toBe('home');
    expect(labels()).toEqual(['Home']);
  });

  it('with tabs, ← and → switch tabs from the field, wrapping', async () => {
    const fixture = await setup(MenuHost, (host) => {
      host.withTabs.set(true);
      host.withFooter.set(true);
    });
    expect(press(fixture, 'ArrowRight').defaultPrevented).toBe(true);
    expect(fixture.componentInstance.tabChanges.at(-1)).toBe('Actions');
    press(fixture, 'ArrowLeft');
    expect(fixture.componentInstance.tabChanges.at(-1)).toBe('Go to');
    // The footer knows the tabs are there.
    await settle(fixture);
    const footer = document.querySelector('[data-slot="command-menu-footer"]')!;
    expect(footer.textContent).toContain('Tabs');
    expect(footer.textContent).toContain('Select');
    expect(footer.textContent).not.toContain('Close');
    // A pointer pick on a tab reports it and keeps focus in the field.
    const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(tabs.map((t) => t.textContent?.trim())).toEqual(['AllAll', 'ActionsActions', 'Go toGo to']);
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    tabs[2].dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    tabs[2].click();
    expect(fixture.componentInstance.tabChanges.at(-1)).toBe('Go to');
  });

  it('without tabs the arrows keep moving the caret, and the footer drops the hint', async () => {
    const fixture = await setup(MenuHost, (host) => host.withFooter.set(true));
    expect(press(fixture, 'ArrowRight').defaultPrevented).toBe(false);
    expect(document.querySelector('[data-slot="command-menu-footer"]')!.textContent).not.toContain('Tabs');
  });

  it('leaves Shift+←/→ to the field so selection still extends', async () => {
    const fixture = await setup(MenuHost, (host) => host.withTabs.set(true));
    for (const key of ['ArrowLeft', 'ArrowRight']) {
      const event = press(fixture, key, { shiftKey: true });
      expect(fixture.componentInstance.tabChanges).toEqual([]);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it('the footer names Enter after the highlighted row, its action first', async () => {
    const fixture = await setup(MenuHost, (host) => {
      host.withFooter.set(true);
      host.items.set([
        { value: 'home', label: 'Home', action: 'Go to Home', group: 'Go to' },
        { value: 'new', label: 'New file', group: 'Actions' },
      ]);
    });
    const footer = document.querySelector<HTMLElement>('[data-slot="command-menu-footer"]')!;
    const action = () => footer.querySelector('[data-slot="command-menu-footer-action"]')?.textContent;
    expect(action()).toContain('Go to Home');
    expect(footer.textContent).not.toContain('Run');
    press(fixture, 'ArrowDown');
    expect(action()).toContain('New file');
    // No row, no Enter hint.
    await type(fixture, 'zzz');
    expect(action()).toBeUndefined();
  });

  it('footer hints replace the defaults and the Enter hint', async () => {
    await setup(MenuHost, (host) => {
      host.withFooter.set(true);
      host.hints.set([{ label: 'Open menu', keys: 'mod+k' }]);
    });
    const footer = document.querySelector<HTMLElement>('[data-slot="command-menu-footer"]')!;
    expect(footer.textContent).toContain('Open menu');
    expect(footer.textContent).not.toContain('Select');
    expect(footer.querySelector('[data-slot="command-menu-footer-action"]')).toBeNull();
    const caps = Array.from(footer.querySelectorAll('kbd span')).map((s) => s.textContent);
    expect(caps).toEqual(['Ctrl', 'K']);
  });

  it('keys inside an IME composition are left to the composer', async () => {
    const fixture = await setup(MenuHost);
    press(fixture, 'Enter', { isComposing: true });
    expect(fixture.componentInstance.selected).toEqual([]);
    press(fixture, 'Enter', { keyCode: 229 } as KeyboardEventInit);
    expect(fixture.componentInstance.selected).toEqual([]);
  });

  it('group headings get ids without spaces', async () => {
    await setup(MenuHost);
    const groups = Array.from(document.querySelectorAll('[role="group"]'));
    expect(groups.length).toBe(3);
    for (const group of groups) {
      const id = group.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(id).not.toMatch(/\s/);
      expect(document.getElementById(id as string)?.textContent).toBeTruthy();
    }
  });

  it('Escape clears the query inline', async () => {
    const fixture = await setup(MenuHost);
    await type(fixture, 'cal');
    expect(press(fixture, 'Escape').defaultPrevented).toBe(true);
    await settle(fixture);
    expect(field().value).toBe('');
    expect(labels()).toHaveLength(5);
    // Nothing typed: Escape is left alone.
    expect(press(fixture, 'Escape').defaultPrevented).toBe(false);
  });

  it('the pointer leaving the list keeps the highlight', async () => {
    const fixture = await setup(MenuHost);
    press(fixture, 'ArrowDown');
    await settle(fixture);
    const list = document.querySelector('[role="listbox"]')!;
    list.dispatchEvent(new MouseEvent('mouseleave'));
    await settle(fixture);
    expect(field().getAttribute('aria-activedescendant')).toBe(options()[1].id);
  });

  it('the field names itself and the rows follow the size ladder', async () => {
    const fixture = await setup(MenuHost);
    const input = field();
    expect(input.getAttribute('aria-label')).toBe('Search commands');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('autocomplete')).toBe('off');
    const row = document.querySelector('[data-slot="command-menu-input"]')!;
    expect(row.hasAttribute('aria-label')).toBe(false);
    expect(row.classList.contains('h-12')).toBe(true);
    expect(options()[0].classList.contains('h-9')).toBe(true);
    fixture.componentInstance.size.set('compact');
    await settle(fixture);
    expect(row.classList.contains('h-10')).toBe(true);
    expect(options()[0].classList.contains('h-7')).toBe(true);
  });
});

@Component({
  imports: [COMMAND_MENU_PARTS],
  template: `
    <ff-command-menu [items]="items" (itemSelect)="selected.push($event)">
      <ff-command-menu-input />
      <ff-command-menu-list>
        <ng-template ffCommandMenuRow let-item let-index="index">
          <ff-command-menu-item [value]="item.value" icon="star" [shortcut]="index === 0 ? 'mod+n' : undefined">
            <span class="custom">{{ item.label }} / {{ item.group }}</span>
          </ff-command-menu-item>
        </ng-template>
      </ff-command-menu-list>
    </ff-command-menu>
  `,
})
class CustomRowsHost {
  readonly items = ITEMS;
  readonly selected: CommandMenuItemData[] = [];
}

describe('CommandMenu custom rows', () => {
  it('a row template renders one item per row, numbered by the list', async () => {
    const fixture = await setup(CustomRowsHost);
    const rows = options();
    expect(rows.map((r) => r.querySelector('.custom')?.textContent)).toEqual([
      'New file / Actions',
      'Toggle dark mode / Actions',
      'Export / Actions',
      'Home / Go to',
      'Calendar / Go to',
    ]);
    expect(rows.map((r) => r.dataset['fluidHoverIndex'])).toEqual(['0', '1', '2', '3', '4']);
    // Children replace the label; the icon and caps stay.
    expect(rows[1].textContent).not.toContain('Blank document');
    expect(rows[1].querySelector('svg')).not.toBeNull();
    expect(Array.from(rows[0].querySelectorAll('kbd span')).map((s) => s.textContent)).toEqual(['Ctrl', 'N']);
    press(fixture, 'ArrowDown');
    press(fixture, 'Enter');
    expect(fixture.componentInstance.selected.map((i) => i.value)).toEqual(['theme']);
  });
});

@Component({
  imports: [COMMAND_MENU_PARTS],
  template: `
    <ff-command-menu-dialog [open]="false" (openChange)="root($event)">
      <ff-command-menu [items]="items"><ff-command-menu-input /><ff-command-menu-list /></ff-command-menu>
    </ff-command-menu-dialog>
    <button>outside</button>
    <div #scope>
      <button>inside</button>
      <ff-command-menu-dialog [open]="false" (openChange)="demo($event)" [shortcutScope]="scope">
        <ff-command-menu [items]="items"><ff-command-menu-input /><ff-command-menu-list /></ff-command-menu>
      </ff-command-menu-dialog>
    </div>
  `,
})
class PeersHost {
  readonly items = ITEMS;
  readonly root = vi.fn();
  readonly demo = vi.fn();
}

@Component({
  imports: [COMMAND_MENU_PARTS],
  template: `
    <ff-command-menu-dialog [shortcut]="shortcut()" (openChange)="changes.push($event)">
      <ff-command-menu [items]="items" [closeOnSelect]="closeOnSelect()" (itemSelect)="selected.push($event)">
        <ff-command-menu-input />
        <ff-command-menu-list />
        <ff-command-menu-footer />
      </ff-command-menu>
    </ff-command-menu-dialog>
    <input data-testid="elsewhere" />
  `,
})
class DialogHost {
  readonly items = ITEMS;
  readonly shortcut = signal<string | null>('mod+k');
  readonly closeOnSelect = signal(true);
  readonly changes: boolean[] = [];
  readonly selected: CommandMenuItemData[] = [];
}

const comboK = () =>
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true, cancelable: true }));
const popup = () => document.querySelector<HTMLElement>('[data-slot="dialog-popup"]');

describe('CommandMenuDialog', () => {
  it('a scoped dialog takes the combo only while focus is inside its element', async () => {
    const fixture = await setup(PeersHost);
    const { root, demo } = fixture.componentInstance;
    const button = (text: string) =>
      Array.from(document.querySelectorAll('button')).find((b) => b.textContent === text)!;
    // Focus outside: the root palette answers, though the demo mounted last.
    button('outside').focus();
    comboK();
    expect(root).toHaveBeenCalledWith(true);
    expect(demo).not.toHaveBeenCalled();
    // Focus inside the scope: the demo answers.
    button('inside').focus();
    comboK();
    expect(demo).toHaveBeenCalledWith(true);
    expect(root).toHaveBeenCalledTimes(1);
  });

  it('the combo toggles the dialog, named and described for screen readers', async () => {
    const fixture = await setup(DialogHost);
    expect(popup()).toBeNull();
    comboK();
    await settle(fixture);
    await vi.waitFor(() => expect(popup()).not.toBeNull());
    expect(fixture.componentInstance.changes).toEqual([true]);
    const p = popup()!;
    expect(document.getElementById(p.getAttribute('aria-labelledby')!)?.textContent).toBe('Command menu');
    expect(document.getElementById(p.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Search for a command to run.',
    );
    expect(p.classList.contains('max-h-[min(440px,76dvh)]')).toBe(true);
    expect(p.classList.contains('p-0')).toBe(true);
    expect(p.querySelector('[data-slot="dialog-close-button"]')).toBeNull();
    // The footer adds the dialog's Close hint.
    expect(p.querySelector('[data-slot="command-menu-footer"]')!.textContent).toContain('Close');
    comboK();
    await settle(fixture);
    expect(fixture.componentInstance.changes).toEqual([true, false]);
  });

  it('a bare-key combo stays out of fields; null binds nothing', async () => {
    const fixture = await setup(DialogHost, (host) => host.shortcut.set('/'));
    const elsewhere = document.querySelector<HTMLInputElement>('[data-testid="elsewhere"]')!;
    elsewhere.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    expect(fixture.componentInstance.changes).toEqual([]);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    expect(fixture.componentInstance.changes).toEqual([true]);
    fixture.componentInstance.shortcut.set(null);
    await settle(fixture);
    comboK();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    expect(fixture.componentInstance.changes).toEqual([true]);
  });

  it('a pick closes the dialog unless closeOnSelect is off', async () => {
    const fixture = await setup(DialogHost);
    comboK();
    await settle(fixture);
    await vi.waitFor(() => expect(popup()).not.toBeNull());
    fixture.componentInstance.closeOnSelect.set(false);
    await settle(fixture);
    press(fixture, 'Enter');
    expect(fixture.componentInstance.selected.map((i) => i.value)).toEqual(['new']);
    expect(fixture.componentInstance.changes).toEqual([true]);
    fixture.componentInstance.closeOnSelect.set(true);
    await settle(fixture);
    press(fixture, 'Enter');
    expect(fixture.componentInstance.changes).toEqual([true, false]);
  });

  it('Escape closes the dialog instead of clearing, and it reopens fresh', async () => {
    const fixture = await setup(DialogHost);
    comboK();
    await settle(fixture);
    await vi.waitFor(() => expect(popup()).not.toBeNull());
    await type(fixture, 'cal');
    press(fixture, 'ArrowDown');
    expect(labels()).toEqual(['Calendar']);
    const escape = press(fixture, 'Escape');
    await settle(fixture);
    expect(fixture.componentInstance.changes).toEqual([true, false]);
    expect(escape.defaultPrevented).toBe(true); // by the dialog shell
    await vi.waitFor(() => expect(popup()).toBeNull(), { timeout: 2000 });
    comboK();
    await settle(fixture);
    await vi.waitFor(() => expect(popup()).not.toBeNull());
    expect(field().value).toBe('');
    expect(labels()).toHaveLength(5);
    expect(field().getAttribute('aria-activedescendant')).toBe(options()[0].id);

    // Nothing typed, the highlight moved: a reopen still lights the first row.
    press(fixture, 'ArrowDown');
    press(fixture, 'ArrowDown');
    // Row 2 is disabled: skipped.
    expect(field().getAttribute('aria-activedescendant')).toBe(options()[3].id);
    comboK();
    await settle(fixture);
    await vi.waitFor(() => expect(popup()).toBeNull(), { timeout: 2000 });
    comboK();
    await settle(fixture);
    await vi.waitFor(() => expect(popup()).not.toBeNull());
    expect(field().getAttribute('aria-activedescendant')).toBe(options()[0].id);
  });
});
