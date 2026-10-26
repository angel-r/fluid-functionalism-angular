/**
 * Select through its public interface. Upstream has no select behavior test,
 * so this pins one test per rule of the React select: the combobox trigger
 * (ARIA, placeholder, label resolved before the popup ever opened, variants,
 * error, size), the listbox popup (options, selection state, open focus),
 * picking (by click, Enter and Space; the selection acknowledgment delaying
 * the close; never deselecting), the close paths (Escape, outside press,
 * trigger toggle), controlled and uncontrolled values, disabled items and
 * select, the hidden form input, the selected background and the keyboard-
 * only focus ring, and the group / label / separator parts.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { shapeMap } from '../core/shape';
import { sizeMap } from '../core/size';
import { surfaceClasses } from '../core/surface-classes';
import { typeClass } from '../core/type-scale';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from './select';

const frames = (n = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(n);
  });
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** selectionAckMs (300) + the exit fallback, with slack. */
const ACK_MS = 320;
const EXIT_MS = 200;

beforeEach(() => {
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
});

afterEach(() => {
  delete (document.documentElement as { clientWidth?: number }).clientWidth;
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
});

const fruits = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'grape', label: 'Grape' },
];

@Component({
  imports: [Select, SelectTrigger, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator],
  template: `
    <ff-select
      [value]="value()"
      [defaultValue]="defaultValue()"
      [disabled]="disabled()"
      [name]="name()"
      [required]="required()"
      [size]="size()"
      (valueChange)="changes.push($event)"
    >
      <ff-select-trigger
        data-testid="wrapper"
        class="extra-trigger"
        aria-label="Fruit"
        [variant]="variant()"
        [placeholder]="placeholder()"
        [error]="error()"
        [icon]="icon()"
      />
      <ff-select-content class="extra-popup">
        <ff-select-group>
          <ff-select-label>Fruits</ff-select-label>
          @for (fruit of fruits; track fruit.value; let i = $index) {
            <ff-select-item [index]="i" [value]="fruit.value" [disabled]="fruit.value === disabledValue()">{{
              fruit.label
            }}</ff-select-item>
          }
        </ff-select-group>
        <ff-select-separator />
      </ff-select-content>
    </ff-select>
    <button type="button" data-testid="outside">Outside</button>
  `,
})
class Host {
  readonly fruits = fruits;
  readonly value = signal<string | undefined>(undefined);
  readonly defaultValue = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly name = signal<string | undefined>(undefined);
  readonly required = signal(false);
  readonly size = signal<'default' | 'compact' | undefined>(undefined);
  readonly variant = signal<'bordered' | 'borderless'>('bordered');
  readonly placeholder = signal<string | undefined>(undefined);
  readonly error = signal<string | undefined>(undefined);
  readonly icon = signal<'star' | undefined>(undefined);
  readonly disabledValue = signal<string | null>(null);
  readonly changes: string[] = [];
}

function setup(configure: (h: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.autoDetectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const trigger = () => el.querySelector<HTMLButtonElement>('[role="combobox"]')!;
  const wrapper = () => trigger().parentElement!;
  const outside = el.querySelector<HTMLElement>('[data-testid="outside"]')!;
  const value = () => trigger().querySelector<HTMLElement>('[data-slot="select-value"]')!;
  return { fixture, host: fixture.componentInstance, el, trigger, wrapper, outside, value };
}

function shownListbox() {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('[role="listbox"]')).find(
      (l) => l.closest<HTMLElement>('[data-slot="select-positioner"]')?.style.display !== 'none',
    ) ?? null
  );
}

const option = (label: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((o) => o.textContent?.trim() === label)!;

function key(target: Element, k: string) {
  const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  TestBed.tick();
  return event;
}

describe('select trigger', () => {
  it('is a combobox for a listbox, closed, with the placeholder', () => {
    const { trigger, value } = setup();
    expect(trigger().tagName).toBe('BUTTON');
    expect(trigger().getAttribute('type')).toBe('button');
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-label')).toBe('Fruit');
    expect(value().textContent?.trim()).toBe('Select…');
    expect(value().hasAttribute('data-placeholder')).toBe(true);
  });

  it('takes a custom placeholder', () => {
    const { value } = setup((h) => h.placeholder.set('Pick a fruit'));
    expect(value().textContent?.trim()).toBe('Pick a fruit');
  });

  it('shows the label of the default value before the popup ever opened', () => {
    const { value } = setup((h) => h.defaultValue.set('banana'));
    expect(value().textContent?.trim()).toBe('Banana');
    expect(value().hasAttribute('data-placeholder')).toBe(false);
  });

  it('carries the bordered classes at the default step, the shape radius and the consumer class', () => {
    const { trigger, wrapper } = setup();
    for (const cls of [
      'group',
      'inline-flex',
      'items-center',
      'justify-between',
      'border',
      'border-border',
      'bg-transparent',
      'hover:bg-hover',
      'focus-visible:ring-1',
      sizeMap.default.control,
      sizeMap.default.px,
      sizeMap.default.gap,
      'min-w-[160px]',
      ...shapeMap.rounded.input.split(' '),
      'extra-trigger',
    ]) {
      expect(trigger().classList).toContain(cls);
    }
    for (const cls of ['flex', 'flex-col', 'gap-1']) expect(wrapper().classList).toContain(cls);
    expect(wrapper().classList).not.toContain('extra-trigger');
  });

  it('has a borderless variant', () => {
    const { trigger } = setup((h) => h.variant.set('borderless'));
    expect(trigger().classList).toContain('border-transparent');
    expect(trigger().classList).not.toContain('border-border');
  });

  it('shows an error under the trigger and marks it invalid', () => {
    const { trigger, wrapper } = setup((h) => h.error.set('Pick one'));
    expect(trigger().getAttribute('aria-invalid')).toBe('true');
    expect(trigger().classList).toContain('border-destructive/50');
    const message = wrapper().querySelector<HTMLElement>('.text-destructive')!;
    expect(message.textContent?.trim()).toBe('Pick one');
    expect(message.classList).toContain('pl-3');
  });

  it('carries no aria-invalid without an error', () => {
    const { trigger } = setup();
    expect(trigger().hasAttribute('aria-invalid')).toBe(false);
  });

  it('renders the leading icon only when given one', () => {
    const plain = setup();
    expect(plain.trigger().querySelectorAll('svg')).toHaveLength(1);
    plain.fixture.destroy();
    const withIcon = setup((h) => h.icon.set('star'));
    expect(withIcon.trigger().querySelectorAll('svg')).toHaveLength(2);
  });

  it('pins trigger and rows to the compact step with a size', async () => {
    const { trigger } = setup((h) => h.size.set('compact'));
    expect(trigger().classList).toContain(sizeMap.compact.control);
    expect(trigger().classList).toContain('min-w-[128px]');
    trigger().click(); TestBed.tick();
    expect(option('Apple').classList).toContain(sizeMap.compact.control);
  });

  it('is disabled with the select', () => {
    const { trigger, host } = setup((h) => h.disabled.set(true));
    expect(trigger().disabled).toBe(true);
    trigger().click(); TestBed.tick();
    expect(shownListbox()).toBeNull();
    expect(host.changes).toEqual([]);
  });
});

describe('select popup', () => {
  it('opens on a trigger click: a listbox of options wired to the trigger', () => {
    const { trigger } = setup((h) => h.defaultValue.set('banana'));
    expect(shownListbox()).toBeNull();
    trigger().click(); TestBed.tick();
    const listbox = shownListbox()!;
    expect(listbox).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(listbox.id);
    expect(trigger().hasAttribute('data-popup-open')).toBe(true);
    expect(option('Banana').getAttribute('aria-selected')).toBe('true');
    expect(option('Apple').getAttribute('aria-selected')).toBe('false');
    expect(option('Banana').getAttribute('data-value')).toBe('banana');
    expect(option('Banana').getAttribute('data-fluid-hover-index')).toBe('1');
  });

  it('opens from the keyboard with ArrowDown', () => {
    const { trigger } = setup();
    expect(key(trigger(), 'ArrowDown').defaultPrevented).toBe(true);
    expect(shownListbox()).not.toBeNull();
  });

  it('focuses the selected option on open, else the first enabled one', async () => {
    const selected = setup((h) => h.defaultValue.set('cherry'));
    selected.trigger().click(); TestBed.tick();
    await frames(3);
    expect(document.activeElement).toBe(option('Cherry'));
    selected.fixture.destroy();
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
    const none = setup((h) => h.disabledValue.set('apple'));
    none.trigger().click(); TestBed.tick();
    await frames(3);
    expect(document.activeElement).toBe(option('Banana'));
  });

  it('raises the popup two surface steps with the rounded container and the consumer class', () => {
    const { trigger } = setup();
    trigger().click(); TestBed.tick();
    const listbox = shownListbox()!;
    for (const cls of [
      'flex',
      'flex-col',
      'min-w-[var(--anchor-width)]',
      'max-h-[min(300px,var(--available-height))]',
      'overflow-hidden',
      'select-none',
      'outline-none',
      'extra-popup',
      ...shapeMap.rounded.container.split(' '),
      ...surfaceClasses(3, 3).split(' '),
    ]) {
      expect(listbox.classList).toContain(cls);
    }
    const positioner = listbox.closest<HTMLElement>('[data-slot="select-positioner"]')!;
    expect(positioner.getAttribute('data-side')).toBe('bottom');
  });

  it('styles the rows: muted at rest, foreground and checked on the selected one', () => {
    const { trigger } = setup((h) => h.defaultValue.set('banana'));
    trigger().click(); TestBed.tick();
    for (const cls of ['relative', 'z-10', 'flex', sizeMap.default.control, 'shrink-0', 'cursor-pointer', 'rounded-lg']) {
      expect(option('Apple').classList).toContain(cls);
    }
    expect(option('Apple').classList).toContain('text-muted-foreground');
    expect(option('Banana').classList).toContain('text-foreground');
    expect(option('Banana').querySelector('svg path')?.getAttribute('d')).toBe('M4 12L9 17L20 6');
    expect(option('Apple').querySelector('svg')).toBeNull();
    // The check slot is always there, so a selection never resizes the row.
    expect(option('Apple').querySelector('[aria-hidden="true"].w-4.h-4')).not.toBeNull();
  });
});

describe('select picking', () => {
  it('picks a clicked option, acknowledges, then closes and refocuses the trigger', async () => {
    const { trigger, host, value } = setup();
    trigger().click(); TestBed.tick();
    option('Cherry').click(); TestBed.tick();
    expect(host.changes).toEqual(['cherry']);
    expect(value().textContent?.trim()).toBe('Cherry');
    expect(option('Cherry').getAttribute('aria-selected')).toBe('true');
    // Held open for the acknowledgment.
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    // Real timers: under a loaded parallel run the acknowledgment and exit
    // timers can fire late, so poll past them instead of sleeping exactly.
    await vi.waitFor(() => expect(trigger().getAttribute('aria-expanded')).toBe('false'), { timeout: ACK_MS * 5 });
    expect(document.activeElement).toBe(trigger());
    await vi.waitFor(() => expect(shownListbox()).toBeNull(), { timeout: EXIT_MS * 5 });
  });

  it('picks the focused option with Enter and with Space', () => {
    const { trigger, host } = setup();
    trigger().click(); TestBed.tick();
    option('Banana').focus();
    expect(key(option('Banana'), 'Enter').defaultPrevented).toBe(true);
    option('Grape').focus();
    key(option('Grape'), ' ');
    expect(host.changes).toEqual(['banana', 'grape']);
  });

  it('never deselects: picking the selected option keeps it, reporting no change', async () => {
    const { trigger, host, value } = setup((h) => h.defaultValue.set('apple'));
    trigger().click(); TestBed.tick();
    option('Apple').click(); TestBed.tick();
    expect(value().textContent?.trim()).toBe('Apple');
    expect(option('Apple').getAttribute('aria-selected')).toBe('true');
    expect(host.changes).toEqual([]);
    await vi.waitFor(() => expect(trigger().getAttribute('aria-expanded')).toBe('false'), { timeout: ACK_MS * 5 });
  });

  it('ignores a disabled option and skips it with the arrows', async () => {
    const { trigger, host } = setup((h) => h.disabledValue.set('banana'));
    trigger().click(); TestBed.tick();
    await frames(3);
    expect(option('Banana').getAttribute('aria-disabled')).toBe('true');
    option('Banana').click(); TestBed.tick();
    expect(host.changes).toEqual([]);
    expect(document.activeElement).toBe(option('Apple'));
    key(option('Apple'), 'ArrowDown');
    expect(document.activeElement).toBe(option('Cherry'));
  });

  it('keeps a controlled value until the parent changes it, still reporting picks', () => {
    const { trigger, host, value } = setup((h) => h.value.set('apple'));
    trigger().click(); TestBed.tick();
    option('Grape').click(); TestBed.tick();
    expect(host.changes).toEqual(['grape']);
    expect(value().textContent?.trim()).toBe('Apple');
    host.value.set('grape');
    TestBed.tick();
    expect(value().textContent?.trim()).toBe('Grape');
  });
});

describe('select close', () => {
  it('closes immediately with Escape and refocuses the trigger', () => {
    const { trigger } = setup();
    trigger().click(); TestBed.tick();
    option('Apple').focus();
    key(option('Apple'), 'Escape');
    TestBed.tick();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger());
  });

  it('closes on a press outside, not on a press inside', () => {
    const { trigger, outside } = setup();
    trigger().click(); TestBed.tick();
    option('Apple').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    TestBed.tick();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    TestBed.tick();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on a second trigger click, cancelling a pending acknowledgment', async () => {
    const { trigger } = setup();
    trigger().click(); TestBed.tick();
    option('Apple').click(); TestBed.tick();
    trigger().click(); TestBed.tick();
    TestBed.tick();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    trigger().click(); TestBed.tick();
    TestBed.tick();
    await wait(ACK_MS);
    // The cancelled acknowledgment doesn't close the reopened popup.
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });
});

describe('select overlays', () => {
  it('puts the selected background on the selected row', async () => {
    const height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 36 });
    try {
      const { trigger } = setup((h) => h.defaultValue.set('cherry'));
      trigger().click(); TestBed.tick();
      await frames(4);
      TestBed.tick();
      const bg = shownListbox()!.querySelector<HTMLElement>('[data-slot="checked-background"]');
      expect(bg).not.toBeNull();
      expect(bg!.style.height).toBe('36px');
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', height);
    }
  });

  it('draws the focus ring for keyboard navigation only', async () => {
    const height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 36 });
    // Chrome reports every scripted focus as :focus-visible, so the option
    // the open focuses matches it too; the trigger, clicked, does not.
    const matches = Element.prototype.matches;
    const spy = vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
      if (selector === ':focus-visible') return this.getAttribute('role') === 'option' && document.activeElement === this;
      return matches.call(this, selector);
    });
    try {
      const { trigger } = setup();
      trigger().click(); TestBed.tick();
      await frames(4);
      TestBed.tick();
      const ring = () => shownListbox()!.querySelector('[data-slot="focus-ring"]');
      expect(ring()).toBeNull();
      key(document.activeElement!, 'ArrowDown');
      TestBed.tick();
      expect(ring()).not.toBeNull();
    } finally {
      spy.mockRestore();
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', height);
    }
  });
});

describe('select form and parts', () => {
  it('submits through a hidden input named after the select', () => {
    const { el } = setup((h) => {
      h.name.set('fruit');
      h.required.set(true);
      h.defaultValue.set('grape');
    });
    const input = el.querySelector<HTMLInputElement>('input[name="fruit"]')!;
    expect(input.value).toBe('grape');
    expect(input.required).toBe(true);
    expect(input.getAttribute('aria-hidden')).toBe('true');
    expect(input.tabIndex).toBe(-1);
  });

  it('renders the group, its caption label and the separator', () => {
    const { trigger } = setup();
    trigger().click(); TestBed.tick();
    const listbox = shownListbox()!;
    const group = listbox.querySelector<HTMLElement>('ff-select-group')!;
    expect(group.getAttribute('role')).toBe('group');
    const label = listbox.querySelector<HTMLElement>('ff-select-label')!;
    for (const cls of ['px-2', 'py-1.5', 'shrink-0', 'text-muted-foreground', ...typeClass('caption').split(' ')]) {
      expect(label.classList).toContain(cls);
    }
    const separator = listbox.querySelector<HTMLElement>('ff-select-separator')!;
    expect(separator.getAttribute('role')).toBe('separator');
    for (const cls of ['my-1', '-mx-1', 'h-px', 'shrink-0', 'bg-border/60']) expect(separator.classList).toContain(cls);
  });
});
