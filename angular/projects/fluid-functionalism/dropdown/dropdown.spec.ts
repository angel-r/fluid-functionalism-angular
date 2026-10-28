/**
 * The inline Dropdown panel, DropdownLabel and DropdownSeparator through their
 * public interface. Ported from tests/dropdown-inline-shape.test.tsx (the
 * panel keeps the rounded container radius) plus one test per rule of the
 * React panel: group semantics, the shared dropdown context its rows read,
 * arrow / Home / End roving, focus lighting the row and the keyboard focus
 * ring, the selected backgrounds, and the size pin.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { shapeMap } from '../core/shape';
import { sizeMap } from '../core/size';
import { surfaceClasses } from '../core/surface-classes';
import { typeClass } from '../core/type-scale';
import { MenuItem } from '../menu-item/menu-item';
import { Dropdown, DropdownLabel, DropdownSeparator } from './dropdown';

const labels = ['Teamspaces', 'Recents', 'Favorites'];

@Component({
  imports: [Dropdown, MenuItem, DropdownLabel, DropdownSeparator],
  template: `
    <ff-dropdown
      aria-label="Views"
      class="extra-class"
      [checkedIndex]="checkedIndex()"
      [checkedIndices]="checkedIndices()"
      [size]="size()"
    >
      <ff-dropdown-label>Account</ff-dropdown-label>
      @for (label of labels; track label; let i = $index) {
        <ff-menu-item
          [index]="i"
          [label]="label"
          [checked]="kind() === 'action' ? undefined : isChecked(i)"
          (select)="selected(label)"
        />
      }
      <ff-dropdown-separator />
    </ff-dropdown>
  `,
})
class Host {
  readonly labels = labels;
  readonly checkedIndex = signal<number | undefined>(undefined);
  readonly checkedIndices = signal<number[] | undefined>(undefined);
  readonly size = signal<'default' | 'compact' | undefined>(undefined);
  readonly kind = signal<'action' | 'radio' | 'checkbox'>('action');
  readonly selected = vi.fn();
  isChecked(i: number) {
    return this.kind() === 'checkbox' ? !!this.checkedIndices()?.includes(i) : this.checkedIndex() === i;
  }
}

function setup(configure: (h: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const panel = () => el.querySelector<HTMLElement>('ff-dropdown')!;
  const row = (name: string) => el.querySelector<HTMLElement>(`[aria-label="${name}"]`)!;
  const detect = () => fixture.detectChanges();
  const key = (target: Element, k: string) => {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    detect();
    return event;
  };
  return { fixture, el, panel, row, detect, key, host: fixture.componentInstance };
}

const frames = (n = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(n);
  });

describe('inline dropdown: shape (dropdown-inline-shape)', () => {
  it("rounds the panel with the rounded shape's container radius", () => {
    const { panel } = setup((h) => h.checkedIndex.set(0));
    for (const cls of shapeMap.rounded.container.split(' ')) expect(panel().classList).toContain(cls);
  });
});

describe('inline dropdown: the panel', () => {
  it('is a named group, not a menu', () => {
    const { panel } = setup();
    expect(panel().getAttribute('role')).toBe('group');
    expect(panel().getAttribute('aria-label')).toBe('Views');
  });

  it('carries the panel classes, the raised surface two steps up, and the consumer class', () => {
    const { panel } = setup();
    for (const cls of ['relative', 'flex', 'flex-col', 'w-72', 'max-w-full', 'p-1', 'select-none', 'extra-class']) {
      expect(panel().classList).toContain(cls);
    }
    for (const cls of surfaceClasses(3, 3).split(' ')) expect(panel().classList).toContain(cls);
  });

  it('hands its rows the dropdown context: plain, radio, and checkbox rows', () => {
    const plain = setup();
    expect(plain.row('Recents').getAttribute('role')).toBe('menuitem');
    TestBed.resetTestingModule();
    const radio = setup((h) => {
      h.kind.set('radio');
      h.checkedIndex.set(1);
    });
    expect(radio.row('Recents').getAttribute('role')).toBe('menuitemradio');
    expect(radio.row('Recents').getAttribute('aria-checked')).toBe('true');
    expect(radio.row('Recents').getAttribute('tabindex')).toBe('0');
    TestBed.resetTestingModule();
    const checkbox = setup((h) => {
      h.kind.set('checkbox');
      h.checkedIndices.set([0, 2]);
    });
    expect(checkbox.row('Favorites').getAttribute('role')).toBe('menuitemcheckbox');
    expect(checkbox.row('Favorites').getAttribute('aria-checked')).toBe('true');
  });

  it('selects a clicked row once', () => {
    const { row, host } = setup();
    row('Recents').click();
    expect(host.selected).toHaveBeenCalledTimes(1);
    expect(host.selected).toHaveBeenCalledWith('Recents');
  });
});

describe('inline dropdown: keyboard', () => {
  it('moves focus with the arrow keys and wraps at both ends', () => {
    const { row, key } = setup();
    row('Teamspaces').focus();
    expect(key(row('Teamspaces'), 'ArrowDown').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(row('Recents'));
    key(row('Recents'), 'ArrowRight');
    expect(document.activeElement).toBe(row('Favorites'));
    key(row('Favorites'), 'ArrowDown');
    expect(document.activeElement).toBe(row('Teamspaces'));
    key(row('Teamspaces'), 'ArrowUp');
    expect(document.activeElement).toBe(row('Favorites'));
    key(row('Favorites'), 'ArrowLeft');
    expect(document.activeElement).toBe(row('Recents'));
  });

  it('jumps to the first and last row with Home and End', () => {
    const { row, key } = setup();
    row('Recents').focus();
    key(row('Recents'), 'End');
    expect(document.activeElement).toBe(row('Favorites'));
    key(row('Favorites'), 'Home');
    expect(document.activeElement).toBe(row('Teamspaces'));
  });

  it('selects a focused row with Enter and Space', () => {
    const { row, key, host } = setup();
    row('Recents').focus();
    key(row('Recents'), 'Enter');
    key(row('Recents'), ' ');
    expect(host.selected).toHaveBeenCalledTimes(2);
    expect(host.selected).toHaveBeenCalledWith('Recents');
  });

  it('ignores keys from outside the rows', () => {
    const { panel, key } = setup();
    expect(key(panel(), 'ArrowDown').defaultPrevented).toBe(false);
  });
});

describe('inline dropdown: focus', () => {
  it('lights the focused row and clears when focus leaves the panel', () => {
    const { panel, row, detect } = setup();
    row('Recents').focus();
    detect();
    expect(panel().getAttribute('data-fluid-hover-active-index')).toBe('1');
    expect(row('Recents').hasAttribute('data-fluid-hover-active')).toBe(true);
    row('Recents').blur();
    detect();
    expect(panel().hasAttribute('data-fluid-hover-active-index')).toBe(false);
  });

  it('draws the keyboard focus ring on a row focused by keyboard only', async () => {
    const height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 36 });
    try {
      const { el, row, detect } = setup();
      await frames();
      detect();
      row('Teamspaces').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      row('Recents').focus();
      detect();
      const ring = el.querySelector<HTMLElement>('[data-slot="focus-ring"]');
      expect(ring).not.toBeNull();
      for (const cls of shapeMap.rounded.focusRing.split(' ')) expect(ring!.classList).toContain(cls);
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', height);
    }
  });
});

describe('inline dropdown: selected backgrounds', () => {
  it('puts the selected background on the checked row', async () => {
    const height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 36 });
    try {
      const { el, detect } = setup((h) => {
        h.kind.set('radio');
        h.checkedIndex.set(1);
      });
      await frames();
      detect();
      const bg = el.querySelector<HTMLElement>('[data-slot="checked-background"]');
      expect(bg).not.toBeNull();
      expect(bg!.classList).toContain('bg-active');
      expect(bg!.style.height).toBe('36px');
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', height);
    }
  });

  it('merges contiguous checked rows into selection backgrounds in multiple mode', async () => {
    const height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 36 });
    try {
      const { el, detect } = setup((h) => {
        h.kind.set('checkbox');
        h.checkedIndices.set([0, 1]);
      });
      await frames();
      detect();
      expect(el.querySelectorAll('[data-slot="selection-background"]')).toHaveLength(1);
      expect(el.querySelector('[data-slot="checked-background"]')).toBeNull();
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', height);
    }
  });
});

describe('inline dropdown: size', () => {
  it('pins its rows to the compact step', () => {
    const { row } = setup((h) => h.size.set('compact'));
    expect(row('Recents').classList).toContain(sizeMap.compact.control);
  });

  it('follows the default step when no size is given', () => {
    const { row } = setup();
    expect(row('Recents').classList).toContain(sizeMap.default.control);
  });
});

describe('dropdown label and separator', () => {
  it('renders the label in the caption role, muted, and shrinks it to compact', () => {
    const { el, detect, host } = setup();
    const label = el.querySelector<HTMLElement>('ff-dropdown-label')!;
    for (const cls of ['px-2', 'py-1.5', 'shrink-0', 'text-muted-foreground', ...typeClass('caption').split(' ')]) {
      expect(label.classList).toContain(cls);
    }
    host.size.set('compact');
    detect();
    for (const cls of typeClass('caption', 'compact').split(' ')) expect(label.classList).toContain(cls);
    expect(label.textContent).toContain('Account');
  });

  it('renders the separator as a hairline with separator semantics', () => {
    const { el } = setup();
    const separator = el.querySelector<HTMLElement>('ff-dropdown-separator')!;
    expect(separator.getAttribute('role')).toBe('separator');
    for (const cls of ['my-1', '-mx-1', 'h-px', 'shrink-0', 'bg-border/60']) expect(separator.classList).toContain(cls);
  });

  // React renders both as divs: the hosts display as blocks through a host
  // style, so their class lists stay React's exactly.
  it('displays label and separator as blocks without a block class', () => {
    const { el } = setup();
    for (const part of ['ff-dropdown-label', 'ff-dropdown-separator']) {
      const host = el.querySelector<HTMLElement>(part)!;
      expect(host.style.display).toBe('block');
      expect(host.classList.contains('block')).toBe(false);
    }
  });
});
