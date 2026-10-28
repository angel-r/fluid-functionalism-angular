/**
 * Combobox through its public interface. Upstream has no behavior test for
 * the combobox (tests/preset-combobox.test.mjs covers the docs preset codec,
 * which is out of scope), so this adds one test per rule of the React
 * component: the combobox/listbox ARIA wiring with aria-activedescendant,
 * filtering, the always-on highlight and its keyboard loop, picking (Enter,
 * click), dismissal (Escape, outside press) with the field reverting, the
 * clear ✕ and chevron, the empty state, the create row, multiple selection
 * with chips (Backspace, ✕, ArrowLeft into the chips), hideSelected, the
 * size pin, error and disabled states, form inputs, and the popup exit.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import type { SizeVariant } from '../core/size';
import type { IconName } from '../core/icons';
import {
  Combobox,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxRow,
  type ComboboxFieldVariant,
} from './index';

interface Framework {
  value: string;
  label: string;
}

const FRAMEWORKS: Framework[] = [
  { value: 'next', label: 'Next.js' },
  { value: 'sveltekit', label: 'SvelteKit' },
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
];

const EXIT_FALLBACK_MS = 160; // exitFallbackMs(spring.fast)

@Component({
  imports: [Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty, ComboboxRow],
  template: `
    <ff-combobox
      [items]="items()"
      [(value)]="value"
      (valueChange)="changes.push($event)"
      [filter]="filter()"
      [onCreate]="onCreate()"
      [createLabel]="createLabel()"
      [disabled]="disabled()"
      [name]="name()"
      [required]="required()"
      [size]="size()"
    >
      <ff-combobox-input
        [placeholder]="placeholder()"
        [clearable]="clearable()"
        [error]="error()"
        [variant]="variant()"
        [icon]="icon()"
        class="field-extra"
      />
      <ff-combobox-content [side]="side()" class="popup-extra">
        <ff-combobox-empty>No framework found.</ff-combobox-empty>
        <ff-combobox-list>
          <ng-template ffComboboxRow let-value="value" let-label="label">
            <ff-combobox-item [value]="value" [disabled]="value === disabledRow()">{{ label }}</ff-combobox-item>
          </ng-template>
        </ff-combobox-list>
      </ff-combobox-content>
    </ff-combobox>
    <button type="button" data-testid="outside">Outside</button>
  `,
})
class SingleHost {
  readonly items = signal<Framework[]>(FRAMEWORKS);
  readonly value = signal('');
  readonly changes: string[] = [];
  readonly filter = signal<((item: Framework, query: string) => boolean) | undefined>(undefined);
  readonly onCreate = signal<((query: string) => Framework | void) | undefined>(undefined);
  readonly createLabel = signal<((query: string) => string) | undefined>(undefined);
  readonly disabled = signal(false);
  readonly name = signal<string | undefined>(undefined);
  readonly required = signal(false);
  readonly size = signal<SizeVariant | undefined>(undefined);
  readonly placeholder = signal<string | undefined>(undefined);
  readonly clearable = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly variant = signal<ComboboxFieldVariant>('bordered');
  readonly icon = signal<IconName | undefined>(undefined);
  readonly side = signal<'top' | 'bottom'>('bottom');
  readonly disabledRow = signal<string | null>(null);
}

@Component({
  imports: [Combobox, ComboboxChips, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty, ComboboxRow],
  template: `
    <ff-combobox
      multiple
      [items]="items()"
      [(value)]="value"
      (valueChange)="changes.push($event)"
      [hideSelected]="hideSelected()"
      [onCreate]="onCreate()"
      name="frameworks"
    >
      <ff-combobox-chips placeholder="Add frameworks…" [clearable]="true" />
      <ff-combobox-content>
        <ff-combobox-empty allSelected="Every framework is added.">No framework found.</ff-combobox-empty>
        <ff-combobox-list>
          <ng-template ffComboboxRow let-item>
            <ff-combobox-item [value]="item.value">{{ item.label }}</ff-combobox-item>
          </ng-template>
        </ff-combobox-list>
      </ff-combobox-content>
    </ff-combobox>
    <button type="button" data-testid="outside">Outside</button>
  `,
})
class MultipleHost {
  readonly items = signal<Framework[]>(FRAMEWORKS);
  readonly value = signal<string[]>(['next', 'astro']);
  readonly changes: string[][] = [];
  readonly hideSelected = signal(false);
  readonly onCreate = signal<((query: string) => Framework | void) | undefined>(undefined);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] });
  // jsdom reports a 0×0 viewport; the overlay positions against a real one.
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
});

afterEach(() => {
  vi.useRealTimers();
  delete (document.documentElement as { clientWidth?: number }).clientWidth;
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
});

function harness<T>(fixture: { nativeElement: unknown; detectChanges(): void; componentInstance: T }) {
  const el = fixture.nativeElement as HTMLElement;
  const input = () => el.querySelector<HTMLInputElement>('input[role="combobox"]')!;
  const listbox = () => document.querySelector<HTMLElement>('[role="listbox"]');
  const options = () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
  const labels = () => options().map((o) => o.textContent!.trim());
  const popup = () => document.querySelector<HTMLElement>('[data-slot="combobox-popup"]');
  const highlighted = () => {
    const id = input().getAttribute('aria-activedescendant');
    return id ? document.getElementById(id) : null;
  };
  const render = () => fixture.detectChanges();
  const flush = (ms = 0) => {
    vi.advanceTimersByTime(ms);
    render();
  };
  const key = (k: string, target: HTMLElement = input()) => {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    render();
    return event;
  };
  const type = (text: string) => {
    input().focus();
    input().value = text;
    input().dispatchEvent(new Event('input', { bubbles: true }));
    render();
  };
  const click = (target: HTMLElement) => {
    target.click();
    render();
  };
  const openByClick = () => {
    input().focus();
    click(input());
  };
  render();
  return { el, host: fixture.componentInstance, input, listbox, options, labels, popup, highlighted, render, flush, key, type, click, openByClick };
}

function setupSingle(configure: (host: SingleHost) => void = () => {}) {
  const fixture = TestBed.createComponent(SingleHost);
  configure(fixture.componentInstance);
  return harness(fixture);
}

function setupMultiple(configure: (host: MultipleHost) => void = () => {}) {
  const fixture = TestBed.createComponent(MultipleHost);
  configure(fixture.componentInstance);
  return harness(fixture);
}

describe('Combobox: field', () => {
  it('renders a collapsed combobox input with the default placeholder and no popup', () => {
    const { input, listbox } = setupSingle();
    expect(input().getAttribute('type')).toBe('text');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().getAttribute('aria-autocomplete')).toBe('list');
    expect(input().getAttribute('autocomplete')).toBe('off');
    expect(input().hasAttribute('aria-controls')).toBe(false);
    expect(input().placeholder).toBe('Search…');
    expect(listbox()).toBeNull();
  });

  it('puts the class on the field group (the popup anchor) with the bordered ladder', () => {
    const { el } = setupSingle();
    const group = el.querySelector<HTMLElement>('[data-slot="combobox-field"]')!;
    expect(group.classList.contains('field-extra')).toBe(true);
    expect(group.classList.contains('ring-border')).toBe(true);
    expect(group.classList.contains('h-9')).toBe(true);
    expect(group.classList.contains('min-w-[160px]')).toBe(true);
    expect(group.classList.contains('rounded-lg')).toBe(true);
  });

  // React: a plain "flex flex-col gap-1" wrapper around the field, the
  // className on the field only. The host draws no box, so a consumer class
  // it also carries never applies twice.
  it('wraps the field in a plain column and draws no host box', () => {
    const { el } = setupSingle();
    const host = el.querySelector<HTMLElement>('ff-combobox-input')!;
    expect(host.style.display).toBe('contents');
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe('DIV');
    expect(wrapper.className).toBe('flex flex-col gap-1');
    expect(wrapper.firstElementChild!.getAttribute('data-slot')).toBe('combobox-field');
  });

  it('switches to the borderless ladder', () => {
    const { el } = setupSingle((h) => h.variant.set('borderless'));
    const group = el.querySelector<HTMLElement>('[data-slot="combobox-field"]')!;
    expect(group.classList.contains('ring-transparent')).toBe(true);
    expect(group.classList.contains('hover:ring-border')).toBe(true);
  });

  it('renders a leading icon', () => {
    const { el } = setupSingle((h) => h.icon.set('search'));
    const group = el.querySelector<HTMLElement>('[data-slot="combobox-field"]')!;
    expect(group.querySelector('svg.lucide-search')).not.toBeNull();
  });

  it('shows an error under the field and marks the input invalid', () => {
    const { el, input } = setupSingle((h) => h.error.set('Pick a framework to continue.'));
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(el.textContent).toContain('Pick a framework to continue.');
    const group = el.querySelector<HTMLElement>('[data-slot="combobox-field"]')!;
    expect(group.classList.contains('ring-destructive/50')).toBe(true);
  });
});

describe('Combobox: opening and ARIA', () => {
  it('opens on click: listbox with one option per item, first row highlighted', () => {
    const { input, listbox, labels, options, highlighted, openByClick } = setupSingle();
    openByClick();
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(listbox()).not.toBeNull();
    expect(input().getAttribute('aria-controls')).toBe(listbox()!.id);
    expect(labels()).toEqual(['Next.js', 'SvelteKit', 'Nuxt', 'Remix', 'Astro']);
    expect(options().every((o) => o.getAttribute('aria-selected') === 'false')).toBe(true);
    expect(highlighted()).toBe(options()[0]);
    expect(options()[0].hasAttribute('data-highlighted')).toBe(true);
    expect(options()[0].getAttribute('data-value')).toBe('next');
    expect(options()[0].getAttribute('data-fluid-hover-index')).toBe('0');
  });

  it('renders the popup on its elevated surface in the overlay, on the preferred side', () => {
    const { popup, openByClick } = setupSingle();
    openByClick();
    const surface = popup()!;
    expect(surface.classList.contains('popup-extra')).toBe(true);
    expect(surface.classList.contains('rounded-xl')).toBe(true);
    expect(surface.classList.contains('min-w-[var(--anchor-width)]')).toBe(true);
    // [ffElevated]="2" over the page: surface level 3.
    expect(Array.from(surface.classList).some((c) => c.startsWith('bg-surface-'))).toBe(true);
    expect(surface.closest('[data-side]')!.getAttribute('data-side')).toBe('bottom');
  });

  it('opens with ArrowDown on the first row and ArrowUp on the last', () => {
    const a = setupSingle();
    a.input().focus();
    a.key('ArrowDown');
    expect(a.highlighted()).toBe(a.options()[0]);
    a.key('Escape');
    a.flush(EXIT_FALLBACK_MS);
    a.key('ArrowUp');
    expect(a.highlighted()).toBe(a.options()[4]);
  });

  it('toggles from the chevron, which is not a tab stop', () => {
    const { el, input, listbox, click, flush } = setupSingle();
    const chevron = el.querySelector<HTMLButtonElement>('button[aria-label="Open"]')!;
    expect(chevron.tabIndex).toBe(-1);
    // A press keeps focus in the input rather than blurring it to the button.
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    chevron.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    click(chevron);
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(input());
    click(chevron);
    expect(input().getAttribute('aria-expanded')).toBe('false');
    flush(EXIT_FALLBACK_MS);
    expect(listbox()).toBeNull();
  });
});

describe('Combobox: filtering', () => {
  it('filters case- and accent-insensitively on the label and highlights the first match', () => {
    const { labels, type, highlighted, options, input } = setupSingle((h) =>
      h.items.set([...FRAMEWORKS, { value: 'sp', label: 'São Paulo' }]),
    );
    type('S');
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(labels()).toEqual(['Next.js', 'SvelteKit', 'Astro', 'São Paulo']);
    expect(highlighted()).toBe(options()[0]);
    type('sao');
    expect(labels()).toEqual(['São Paulo']);
  });

  it('uses a custom filter', () => {
    const { labels, type } = setupSingle((h) =>
      h.filter.set((item, query) => item.label.toLowerCase().startsWith(query.toLowerCase())),
    );
    type('n');
    expect(labels()).toEqual(['Next.js', 'Nuxt']);
  });

  it('shows the empty message and marks the list empty when nothing matches', () => {
    const { type, listbox, options } = setupSingle();
    const empty = () => document.querySelector<HTMLElement>('ff-combobox-empty')!;
    type('Next');
    expect(empty().getAttribute('role')).toBe('status');
    expect(empty().textContent!.trim()).toBe('');
    expect(listbox()!.hasAttribute('data-empty')).toBe(false);
    type('zzz');
    expect(options()).toHaveLength(0);
    expect(listbox()!.hasAttribute('data-empty')).toBe(true);
    expect(empty().textContent!.trim()).toBe('No framework found.');
  });
});

describe('Combobox: keyboard highlight', () => {
  // React's autoHighlight="always" turns off Base UI's allowEscape: the
  // highlight wraps straight from one end to the other, never onto the input.
  it('moves with the arrows and wraps straight past either end', () => {
    const { key, highlighted, options, openByClick } = setupSingle();
    openByClick();
    key('ArrowDown');
    expect(highlighted()).toBe(options()[1]);
    key('ArrowUp');
    key('ArrowUp');
    expect(highlighted()).toBe(options()[4]);
    key('ArrowDown');
    expect(highlighted()).toBe(options()[0]);
  });


  it('drives the fluid hover highlight from the keyboard', () => {
    const { key, options, openByClick } = setupSingle();
    openByClick();
    key('ArrowDown');
    expect(options()[1].hasAttribute('data-fluid-hover-active')).toBe(true);
    expect(options()[0].hasAttribute('data-fluid-hover-active')).toBe(false);
  });

  it('lets the pointer move the highlight', () => {
    const { options, openByClick, highlighted, render } = setupSingle();
    openByClick();
    options()[3].dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    render();
    expect(highlighted()).toBe(options()[3]);
  });
});

describe('Combobox: picking', () => {
  it('Enter picks the highlighted row, shows its label, and closes', () => {
    const { key, type, host, input, listbox, flush } = setupSingle();
    type('rem');
    const enter = key('Enter');
    expect(enter.defaultPrevented).toBe(true);
    expect(host.value()).toBe('remix');
    expect(host.changes).toEqual(['remix']);
    expect(input().value).toBe('Remix');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    flush(EXIT_FALLBACK_MS);
    expect(listbox()).toBeNull();
  });

  it('a click on a row picks it', () => {
    const { options, openByClick, click, host, input } = setupSingle();
    openByClick();
    click(options()[2]);
    expect(host.value()).toBe('nuxt');
    expect(input().value).toBe('Nuxt');
    expect(input().getAttribute('aria-expanded')).toBe('false');
  });

  it('a disabled row is marked and cannot be picked', () => {
    const { options, openByClick, click, host } = setupSingle((h) => h.disabledRow.set('nuxt'));
    openByClick();
    expect(options()[2].getAttribute('aria-disabled')).toBe('true');
    click(options()[2]);
    expect(host.value()).toBe('');
  });

  it('opening with a selection lists every item and checks the picked row', () => {
    const { openByClick, labels, options, input } = setupSingle((h) => h.value.set('nuxt'));
    expect(input().value).toBe('Nuxt');
    openByClick();
    expect(labels()).toHaveLength(5);
    expect(options()[2].getAttribute('aria-selected')).toBe('true');
    expect(options()[2].hasAttribute('data-selected')).toBe(true);
    expect(options()[2].querySelector('[data-slot="combobox-check"]')).not.toBeNull();
    expect(options()[0].querySelector('[data-slot="combobox-check"]')).toBeNull();
  });

  it('re-syncs the field when the value changes from outside', () => {
    const { host, render, input } = setupSingle();
    host.value.set('astro');
    render();
    expect(input().value).toBe('Astro');
  });
});

describe('Combobox: dismissal', () => {
  it('Escape closes and reverts the field to the selection', () => {
    const { type, key, input, host } = setupSingle((h) => h.value.set('nuxt'));
    type('Sve');
    key('Escape');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().value).toBe('Nuxt');
    expect(host.value()).toBe('nuxt');
  });

  it('a press outside closes', () => {
    const { el, openByClick, input, render } = setupSingle();
    openByClick();
    el.querySelector('[data-testid="outside"]')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    render();
    expect(input().getAttribute('aria-expanded')).toBe('false');
  });

  it('a press inside the popup keeps the input focused', () => {
    const { openByClick, options } = setupSingle();
    openByClick();
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    options()[1].dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  });

  it('keeps the popup mounted through the exit, then removes it', () => {
    const { openByClick, key, popup, flush } = setupSingle();
    openByClick();
    key('Escape');
    expect(popup()).not.toBeNull();
    flush(EXIT_FALLBACK_MS);
    expect(popup()).toBeNull();
  });
});

describe('Combobox: clear', () => {
  it('reserves the slot, shows ✕ only with something to clear, and clears pick and query', () => {
    const { el, host, input, click, type } = setupSingle((h) => h.clearable.set(true));
    const clear = () => el.querySelector<HTMLButtonElement>('button[aria-label="Clear"]');
    expect(el.querySelector('[data-slot="combobox-clear-slot"]')).not.toBeNull();
    expect(clear()).toBeNull();
    type('x');
    expect(clear()).not.toBeNull();
    host.value.set('remix');
    type('Remix');
    click(clear()!);
    expect(host.value()).toBe('');
    expect(host.changes.at(-1)).toBe('');
    expect(input().value).toBe('');
    expect(document.activeElement).toBe(input());
  });
});

describe('Combobox: create row', () => {
  it('offers a last row for a query no label matches exactly, and creates on Enter', () => {
    const created: string[] = [];
    const { type, labels, key, host, render, input } = setupSingle((h) =>
      h.onCreate.set((query) => {
        created.push(query);
        const item = { value: query.toLowerCase(), label: query };
        h.items.update((items) => [...items, item]);
        return item;
      }),
    );
    type('next.JS');
    expect(labels()).toEqual(['Next.js']);
    type('  Gatsby ');
    expect(labels()).toEqual(['Create “Gatsby”']);
    expect(document.querySelector('[role="option"] svg.lucide-plus')).not.toBeNull();
    key('Enter');
    render();
    expect(created).toEqual(['Gatsby']);
    expect(host.value()).toBe('gatsby');
    expect(input().value).toBe('Gatsby');
  });

  it('keeps the single pick when onCreate returns nothing, and honors createLabel', () => {
    const { type, labels, key, host } = setupSingle((h) => {
      h.value.set('nuxt');
      h.onCreate.set(() => undefined);
      h.createLabel.set((q) => `Add ${q}`);
    });
    type('Qwik');
    expect(labels()).toEqual(['Add Qwik']);
    key('Enter');
    expect(host.value()).toBe('nuxt');
    expect(host.changes).toEqual([]);
  });
});

describe('Combobox: states', () => {
  it('disabled: the input is disabled, the field marked, and nothing opens', () => {
    const { el, input, click, listbox } = setupSingle((h) => h.disabled.set(true));
    expect(input().disabled).toBe(true);
    expect(el.querySelector('[data-slot="combobox-field"]')!.hasAttribute('data-disabled')).toBe(true);
    click(el.querySelector<HTMLButtonElement>('button[aria-label="Open"]')!);
    expect(listbox()).toBeNull();
  });

  it('size pins the field and the popup rows to the compact step', () => {
    const { el, openByClick, options } = setupSingle((h) => h.size.set('compact'));
    expect(el.querySelector('[data-slot="combobox-field"]')!.classList.contains('h-7')).toBe(true);
    openByClick();
    expect(options()[0].classList.contains('h-7')).toBe(true);
    expect(options()[0].classList.contains('px-1.5')).toBe(true);
  });

  it('a name renders the hidden form input carrying the value', () => {
    const { el } = setupSingle((h) => {
      h.name.set('framework');
      h.value.set('astro');
      h.required.set(true);
    });
    const hidden = el.querySelector<HTMLInputElement>('input[type="hidden"][name="framework"]')!;
    expect(hidden.value).toBe('astro');
    expect(hidden.required).toBe(true);
  });

  // Base UI always renders an unnamed input clipped to 1px at the viewport's
  // top-left corner, carrying a single combobox's value.
  it('always renders the clipped 1px input with the single value', () => {
    const { el } = setupSingle((h) => h.value.set('astro'));
    const clipped = el.querySelector<HTMLInputElement>('input[aria-hidden="true"]')!;
    expect(clipped).not.toBeNull();
    expect(clipped.hasAttribute('name')).toBe(false);
    expect(clipped.value).toBe('astro');
    expect(clipped.tabIndex).toBe(-1);
    expect(clipped.style.position).toBe('fixed');
    expect(clipped.style.clipPath).toBe('inset(50%)');
  });
});

describe('Combobox: multiple', () => {
  it('renders a chip per pick and a multiselectable listbox with the picks checked', () => {
    const { el, openByClick, listbox, options, input } = setupMultiple();
    const chips = Array.from(el.querySelectorAll<HTMLElement>('[data-slot="combobox-chip"]'));
    expect(chips.map((c) => c.getAttribute('aria-label'))).toEqual(['Next.js', 'Astro']);
    expect(el.querySelector('[role="toolbar"]')!.getAttribute('aria-label')).toBe('Selected');
    // Placeholder only while nothing is picked.
    expect(input().hasAttribute('placeholder')).toBe(false);
    openByClick();
    expect(listbox()!.getAttribute('aria-multiselectable')).toBe('true');
    expect(options().map((o) => o.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false', 'true']);
  });

  it('a pick from the unfiltered list toggles and keeps the popup open', () => {
    const { openByClick, options, click, host, input } = setupMultiple();
    openByClick();
    click(options()[1]);
    expect(host.value()).toEqual(['next', 'astro', 'sveltekit']);
    expect(input().getAttribute('aria-expanded')).toBe('true');
    click(options()[0]);
    expect(host.value()).toEqual(['astro', 'sveltekit']);
    expect(host.changes).toEqual([
      ['next', 'astro', 'sveltekit'],
      ['astro', 'sveltekit'],
    ]);
  });

  it('a pick made while filtering closes and clears the query', () => {
    const { type, key, host, input } = setupMultiple();
    type('rem');
    key('Enter');
    expect(host.value()).toEqual(['next', 'astro', 'remix']);
    expect(input().value).toBe('');
    expect(input().getAttribute('aria-expanded')).toBe('false');
  });

  it('Backspace in an empty field removes the last chip', () => {
    const { key, host, flush, el, input } = setupMultiple();
    input().focus();
    key('Backspace');
    expect(host.value()).toEqual(['next']);
    flush(EXIT_FALLBACK_MS);
    const chips = Array.from(el.querySelectorAll<HTMLElement>('[data-slot="combobox-chip"]'));
    expect(chips.map((c) => c.getAttribute('aria-label'))).toEqual(['Next.js']);
  });

  it("a chip's ✕ removes that pick", () => {
    const { el, click, host } = setupMultiple();
    click(el.querySelector<HTMLButtonElement>('button[aria-label="Remove Next.js"]')!);
    expect(host.value()).toEqual(['astro']);
  });

  it('ArrowLeft walks into the chips, Backspace removes the focused one, ArrowRight comes back', () => {
    const { el, key, input, host } = setupMultiple();
    const chip = (label: string) => el.querySelector<HTMLElement>(`[data-slot="combobox-chip"][aria-label="${label}"]`)!;
    input().focus();
    key('ArrowLeft');
    expect(document.activeElement).toBe(chip('Astro'));
    key('ArrowLeft', chip('Astro'));
    expect(document.activeElement).toBe(chip('Next.js'));
    key('ArrowRight', chip('Next.js'));
    expect(document.activeElement).toBe(chip('Astro'));
    key('Backspace', chip('Astro'));
    expect(host.value()).toEqual(['next']);
    expect(document.activeElement).toBe(input());
    key('ArrowLeft');
    key('ArrowRight', chip('Next.js'));
    expect(document.activeElement).toBe(input());
  });

  it('the clear ✕ drops every chip', () => {
    const { el, click, host } = setupMultiple();
    click(el.querySelector<HTMLButtonElement>('button[aria-label="Clear"]')!);
    expect(host.value()).toEqual([]);
  });

  it('hideSelected takes picks out of the list and says so once every item is a chip', () => {
    const { openByClick, labels, host, render } = setupMultiple((h) => h.hideSelected.set(true));
    openByClick();
    expect(labels()).toEqual(['SvelteKit', 'Nuxt', 'Remix']);
    host.value.set(FRAMEWORKS.map((f) => f.value));
    render();
    expect(labels()).toEqual([]);
    expect(document.querySelector('ff-combobox-empty')!.textContent!.trim()).toBe('Every framework is added.');
  });

  it('the create row adds the returned item to the picks', () => {
    const { type, key, host } = setupMultiple((h) =>
      h.onCreate.set((query) => {
        const item = { value: query.toLowerCase(), label: query };
        h.items.update((items) => [...items, item]);
        return item;
      }),
    );
    type('Qwik');
    key('Enter');
    expect(host.value()).toEqual(['next', 'astro', 'qwik']);
  });

  it('wraps the chips field in a plain column and draws no host box', () => {
    const { el } = setupMultiple();
    const host = el.querySelector<HTMLElement>('ff-combobox-chips')!;
    expect(host.style.display).toBe('contents');
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.className).toBe('flex flex-col gap-1');
    expect(wrapper.firstElementChild!.getAttribute('data-slot')).toBe('combobox-field');
  });

  it('a name renders one hidden input per pick', () => {
    const { el } = setupMultiple();
    const hidden = Array.from(el.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="frameworks"]'));
    expect(hidden.map((i) => i.value)).toEqual(['next', 'astro']);
  });

  it('the clipped 1px input of a multiple combobox stays empty', () => {
    const { el } = setupMultiple();
    const clipped = el.querySelector<HTMLInputElement>('input[aria-hidden="true"]')!;
    expect(clipped.value).toBe('');
  });
});
