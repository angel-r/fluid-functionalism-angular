/**
 * Ported from the "dropdown search" block of tests/dropdown-keyboard.test.tsx:
 * the field is one stop in the ring of rows — arrowing off the first or last
 * row returns to it, its own ↓ / ↑ leave it, and Enter there picks nothing.
 * Here the rows sit in a static role="menu" hosted by [ffDropdownSearchHost],
 * so the field is tested without the dropdown popup around it. The popup
 * highlight cases ("lit") belong to the dropdown.
 */
import { Component, computed, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SizeProvider } from '../core/size';
import { SurfaceProvider } from '../core/surface';
import { DropdownEmpty, DropdownSearch, DropdownSearchHost } from './dropdown-search';

const labels = ['Teamspaces', 'Recents', 'Projects', 'Favorites'];

@Component({
  imports: [DropdownSearch, DropdownSearchHost, DropdownEmpty],
  template: `
    <div role="menu" [ffDropdownSearchHost]="open()" #host="ffDropdownSearchHost" (keydown)="menuKeys.push($event.key)">
      @if (mounted()) {
        <ff-dropdown-search
          [(value)]="query"
          [autoFocus]="autoFocus()"
          [clearOnClose]="clearOnClose()"
          [placeholder]="placeholder()"
          class="extra-class"
        />
      }
      @for (label of filtered(); track label) {
        <div
          role="menuitem"
          tabindex="-1"
          [attr.aria-label]="label"
          [attr.aria-disabled]="label === disabled() || null"
          (keydown.enter)="selected(label)"
        >
          {{ label }}
        </div>
      } @empty {
        <ff-dropdown-empty>No results</ff-dropdown-empty>
      }
    </div>
  `,
})
class Searchable {
  readonly host = viewChild.required<DropdownSearchHost>('host');
  readonly open = signal(true);
  readonly mounted = signal(true);
  readonly query = signal('');
  readonly autoFocus = signal(true);
  readonly clearOnClose = signal(true);
  readonly placeholder = signal<string | undefined>(undefined);
  readonly disabled = signal<string | null>(null);
  readonly filtered = computed(() =>
    labels.filter((l) => l.toLowerCase().includes(this.query().toLowerCase())),
  );
  readonly selected = vi.fn();
  readonly menuKeys: string[] = [];
}

function setup(configure: (s: Searchable) => void = () => {}) {
  const fixture = TestBed.createComponent(Searchable);
  const cmp = fixture.componentInstance;
  configure(cmp);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const field = () => el.querySelector<HTMLInputElement>('[role="searchbox"]')!;
  const row = (name: string) => el.querySelector<HTMLElement>(`[aria-label="${name}"]`)!;
  const detect = () => fixture.detectChanges();
  const key = (target: Element, k: string, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    detect();
    return event;
  };
  return { fixture, cmp, el, field, row, detect, key };
}

describe('dropdown search: the field', () => {
  it('is a searchbox with the default placeholder and no autocorrection', () => {
    const { field } = setup();
    expect(field().getAttribute('type')).toBe('text');
    expect(field().getAttribute('placeholder')).toBe('Search…');
    expect(field().getAttribute('autocomplete')).toBe('off');
    expect(field().getAttribute('autocorrect')).toBe('off');
    expect(field().getAttribute('spellcheck')).toBe('false');
  });

  it('takes a custom placeholder', () => {
    const { field } = setup((s) => s.placeholder.set('Search labels'));
    expect(field().getAttribute('placeholder')).toBe('Search labels');
  });

  it('two-way binds the query, so the rows filter on typing', () => {
    const { cmp, field, el, detect } = setup();
    field().value = 're';
    field().dispatchEvent(new Event('input'));
    detect();
    expect(cmp.query()).toBe('re');
    expect(Array.from(el.querySelectorAll('[role="menuitem"]')).map((r) => r.getAttribute('aria-label'))).toEqual([
      'Recents',
    ]);
  });

  it('reflects a query set from outside', () => {
    const { cmp, field, detect } = setup();
    cmp.query.set('fav');
    detect();
    expect(field().value).toBe('fav');
  });

  it('picks nothing with Enter in the field and keeps a form from submitting', () => {
    const { cmp, field, key } = setup();
    field().focus();
    const event = key(field(), 'Enter');
    expect(event.defaultPrevented).toBe(true);
    expect(cmp.selected).not.toHaveBeenCalled();
    expect(field().isConnected).toBe(true);
  });

  it('keeps typing keys from the menu (typeahead) but lets Escape and Tab through', () => {
    const { cmp, field, key } = setup();
    key(field(), 'a');
    key(field(), 'Escape');
    key(field(), 'Tab');
    expect(cmp.menuKeys).toEqual(['Escape', 'Tab']);
  });
});

describe('dropdown search: one stop in the ring of rows', () => {
  it('leaves the field for the first and last row', () => {
    const { field, row, key } = setup();
    field().focus();
    expect(key(field(), 'ArrowDown').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(row('Teamspaces'));
    field().focus();
    key(field(), 'ArrowUp');
    expect(document.activeElement).toBe(row('Favorites'));
  });

  it('picks the row arrowed onto from the field', () => {
    const { cmp, field, key } = setup();
    field().focus();
    key(field(), 'ArrowDown');
    key(document.activeElement!, 'Enter');
    expect(cmp.selected).toHaveBeenCalledTimes(1);
    expect(cmp.selected).toHaveBeenCalledWith('Teamspaces');
  });

  it('skips disabled rows when leaving the field', () => {
    const { field, row, key } = setup((s) => s.disabled.set('Teamspaces'));
    field().focus();
    key(field(), 'ArrowDown');
    expect(document.activeElement).toBe(row('Recents'));
  });

  it('returns to the field with ArrowUp on the first row', () => {
    const { field, row, key } = setup();
    row('Teamspaces').focus();
    const event = key(row('Teamspaces'), 'ArrowUp');
    expect(document.activeElement).toBe(field());
    expect(event.defaultPrevented).toBe(true);
  });

  it('returns to the field with ArrowDown on the last row', () => {
    const { field, row, key } = setup();
    row('Favorites').focus();
    key(row('Favorites'), 'ArrowDown');
    expect(document.activeElement).toBe(field());
  });

  it('returns to the field from a disabled row past either end', () => {
    const first = setup((s) => s.disabled.set('Teamspaces'));
    first.row('Teamspaces').focus();
    first.key(first.row('Teamspaces'), 'ArrowUp');
    expect(document.activeElement).toBe(first.field());
    first.fixture.destroy();
    const last = setup((s) => s.disabled.set('Favorites'));
    last.row('Favorites').focus();
    last.key(last.row('Favorites'), 'ArrowDown');
    expect(document.activeElement).toBe(last.field());
  });

  it('leaves arrows between rows to the menu', () => {
    const { cmp, field, row, key } = setup();
    row('Recents').focus();
    const event = key(row('Recents'), 'ArrowUp');
    expect(document.activeElement).not.toBe(field());
    expect(event.defaultPrevented).toBe(false);
    expect(cmp.menuKeys).toEqual(['ArrowUp']);
  });
});

describe('dropdown search: typing on a row lands in the field', () => {
  it('moves a typed character into the field', () => {
    const { cmp, field, row, key } = setup();
    row('Recents').focus();
    const event = key(row('Recents'), 'r');
    expect(document.activeElement).toBe(field());
    expect(cmp.query()).toBe('r');
    expect(event.defaultPrevented).toBe(true);
    expect(cmp.menuKeys).toEqual([]);
  });

  it('moves Backspace into the field as a deletion', () => {
    const { cmp, field, row, key, detect } = setup();
    cmp.query.set('pro');
    detect();
    row('Projects').focus();
    key(row('Projects'), 'Backspace');
    expect(document.activeElement).toBe(field());
    expect(cmp.query()).toBe('pr');
  });

  it('leaves Space and modified keys to the row', () => {
    const { cmp, field, row, key } = setup();
    row('Recents').focus();
    key(row('Recents'), ' ');
    key(row('Recents'), 'a', { ctrlKey: true });
    expect(document.activeElement).not.toBe(field());
    expect(cmp.query()).toBe('');
    expect(cmp.menuKeys).toEqual([' ', 'a']);
  });
});

describe('dropdown search: open, close and focus', () => {
  it('resets the query when the popup reopens', () => {
    const { cmp, detect } = setup();
    cmp.query.set('abc');
    detect();
    cmp.open.set(false);
    detect();
    cmp.open.set(true);
    detect();
    expect(cmp.query()).toBe('');
  });

  it('keeps the query across a reopen with clearOnClose off', () => {
    const { cmp, detect } = setup((s) => s.clearOnClose.set(false));
    cmp.query.set('abc');
    detect();
    cmp.open.set(false);
    detect();
    cmp.open.set(true);
    detect();
    expect(cmp.query()).toBe('abc');
  });

  it('resets the query when the field unmounts with its popup', () => {
    const { cmp, detect } = setup();
    cmp.query.set('abc');
    detect();
    cmp.mounted.set(false);
    detect();
    expect(cmp.query()).toBe('');
  });

  it('opens unfiltered: a query left over at mount is cleared', () => {
    const { cmp } = setup((s) => s.query.set('stale'));
    expect(cmp.query()).toBe('');
  });

  it('takes focus a couple of frames after opening', async () => {
    const { field } = setup();
    await vi.waitFor(() => expect(document.activeElement).toBe(field()), { timeout: 1000 });
  });

  it('leaves focus alone with autoFocus off', async () => {
    const { field } = setup((s) => s.autoFocus.set(false));
    await new Promise((r) => setTimeout(r, 100));
    expect(document.activeElement).not.toBe(field());
  });
});

describe('dropdown search host', () => {
  it('knows whether a field is mounted and whether it takes focus', () => {
    const { cmp, detect } = setup((s) => s.autoFocus.set(false));
    const host = cmp.host();
    expect(host.hasSearch()).toBe(true);
    expect(host.searchMounted()).toBe(true);
    expect(host.searchTakesFocus()).toBe(false);
    cmp.mounted.set(false);
    detect();
    expect(host.hasSearch()).toBe(false);
    expect(host.searchMounted()).toBe(false);
  });
});

@Component({
  imports: [DropdownSearch, SurfaceProvider, SizeProvider],
  template: `
    <div [ffSurface]="3">
      <ff-dropdown-search value="" data-testid="raised" />
    </div>
    <div ffSizeProvider size="compact">
      <ff-dropdown-search value="" data-testid="compact" />
    </div>
    <ff-dropdown-search value="" data-testid="page" aria-label="Filter" />
  `,
})
class Styled {}

describe('dropdown search: styling', () => {
  function styled() {
    const fixture = TestBed.createComponent(Styled);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
  }

  it('sticks to the top of the popup over the substrate surface', () => {
    const get = styled();
    for (const cls of [
      'group/search', 'sticky', 'top-0', 'z-20', '-mx-1', '-mt-1', 'mb-0.5', 'flex', 'shrink-0', 'items-center',
      'border-b', 'border-border/60', 'bg-surface-1', 'h-9', 'gap-2', 'px-3',
    ]) {
      expect(get('page').classList).toContain(cls);
    }
    expect(get('raised').classList).toContain('bg-surface-3');
  });

  it('shrinks to the compact step', () => {
    const get = styled();
    expect(get('compact').classList).toContain('h-7');
    expect(get('compact').classList).toContain('px-2.5');
    expect(get('compact').querySelector('input')!.classList).toContain('leading-5');
    expect(get('page').querySelector('input')!.classList).toContain('leading-6');
  });

  it('draws the search icon and forwards aria-label to the field', () => {
    const get = styled();
    expect(get('page').querySelector('svg.lucide-search')!.getAttribute('stroke-width')).toBe('1.5');
    expect(get('page').querySelector('input')!.getAttribute('aria-label')).toBe('Filter');
  });

  it('is simply open outside a popup host and still takes focus', async () => {
    const get = styled();
    const input = get('page').querySelector('input')!;
    await vi.waitFor(() => expect([get('raised'), get('compact'), get('page')].some((h) => h.contains(document.activeElement))).toBe(true), {
      timeout: 1000,
    });
    expect(input).toBeTruthy();
  });
});

describe('dropdown empty', () => {
  it('is a polite live region with the muted empty-state classes', () => {
    const { cmp, el, detect } = setup();
    cmp.query.set('zzz');
    detect();
    const empty = el.querySelector<HTMLElement>('ff-dropdown-empty')!;
    expect(empty.getAttribute('role')).toBe('status');
    expect(empty.getAttribute('aria-live')).toBe('polite');
    expect(empty.textContent).toContain('No results');
    for (const cls of ['px-2', 'py-6', 'text-center', 'text-muted-foreground']) {
      expect(empty.classList).toContain(cls);
    }
  });
});
