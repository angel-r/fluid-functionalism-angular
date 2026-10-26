/**
 * Radio group: rows are the focusable role="radio" elements, selection takes
 * the value, selectedIndex or per-item API, arrows move focus and select
 * (wrapping), and the shared focus ring shows for keyboard focus only.
 * Ported from tests/group-focus-ring.test.tsx plus one test per rule.
 */
import { Component, type Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RadioGroup, RadioItem } from './radio-group';
import { fontWeights } from '../core/font-weight';
import type { SizeVariant } from '../core/size';

const labels = ['Apples', 'Bananas', 'Cherries'];

@Component({
  imports: [RadioGroup, RadioItem],
  template: `
    <ff-radio-group [(value)]="value" [size]="size()" class="extra" data-testid="group">
      @for (label of labels; track label; let i = $index) {
        <ff-radio-item [label]="label" [index]="i" [value]="label.toLowerCase()" (select)="selects.push(i)" />
      }
    </ff-radio-group>
  `,
})
class ValueHost {
  readonly labels = labels;
  readonly value = signal<string | undefined>('apples');
  readonly size = signal<SizeVariant | undefined>(undefined);
  readonly selects: number[] = [];
}

@Component({
  imports: [RadioGroup, RadioItem],
  template: `
    <ff-radio-group [selectedIndex]="selectedIndex()">
      @for (label of labels; track label; let i = $index) {
        <ff-radio-item [label]="label" [index]="i" />
      }
    </ff-radio-group>
  `,
})
class IndexHost {
  readonly labels = labels;
  readonly selectedIndex = signal<number | undefined>(0);
}

@Component({
  imports: [RadioGroup, RadioItem],
  template: `
    <ff-radio-group>
      @for (label of labels; track label; let i = $index) {
        <ff-radio-item [label]="label" [index]="i" [selected]="selected() === i" (select)="selected.set(i)" />
      }
    </ff-radio-group>
  `,
})
class ItemHost {
  readonly labels = labels;
  readonly selected = signal<number | null>(null);
}

function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const row = (label: string) => el.querySelector<HTMLElement>(`[role="radio"][aria-label="${label}"]`)!;
  const group = el.querySelector<HTMLElement>('ff-radio-group')!;
  const flush = () => fixture.detectChanges();
  const key = (target: HTMLElement, k: string) => {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    flush();
    return event;
  };
  return { fixture, host: fixture.componentInstance, el, row, group, flush, key };
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

describe('RadioGroup', () => {
  it('renders a radiogroup of radio rows with a roving tab stop on the selected row', () => {
    const { group, row } = render(ValueHost);
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.classList).toContain('w-72');
    expect(group.classList).toContain('extra');
    expect(row('Apples').getAttribute('aria-checked')).toBe('true');
    expect(row('Bananas').getAttribute('aria-checked')).toBe('false');
    expect(row('Apples').getAttribute('tabindex')).toBe('0');
    expect(row('Bananas').getAttribute('tabindex')).toBe('-1');
    expect(row('Cherries').getAttribute('data-fluid-hover-index')).toBe('2');
    expect(row('Apples').className).toContain('h-9');
  });

  it('with no selection the first row stays tabbable', () => {
    const { host, row, flush } = render(ValueHost);
    host.value.set(undefined);
    flush();
    expect(row('Apples').getAttribute('aria-checked')).toBe('false');
    expect(row('Apples').getAttribute('tabindex')).toBe('0');
    expect(row('Bananas').getAttribute('tabindex')).toBe('-1');
  });

  it('value mode: a click selects the row, updates the model and emits select', () => {
    const { host, row, flush } = render(ValueHost);
    row('Bananas').click();
    flush();
    expect(host.value()).toBe('bananas');
    expect(host.selects).toEqual([1]);
    expect(row('Bananas').getAttribute('aria-checked')).toBe('true');
    expect(row('Apples').getAttribute('aria-checked')).toBe('false');
    expect(row('Bananas').getAttribute('tabindex')).toBe('0');
  });

  it('arrows move focus and select, wrapping at both ends; Home and End jump', () => {
    const { host, row, key } = render(ValueHost);
    row('Apples').focus();
    key(row('Apples'), 'ArrowUp');
    expect(document.activeElement).toBe(row('Cherries'));
    expect(host.value()).toBe('cherries');
    key(row('Cherries'), 'ArrowDown');
    expect(document.activeElement).toBe(row('Apples'));
    expect(host.value()).toBe('apples');
    key(row('Apples'), 'ArrowRight');
    expect(host.value()).toBe('bananas');
    key(row('Bananas'), 'ArrowLeft');
    expect(host.value()).toBe('apples');
    const end = key(row('Apples'), 'End');
    expect(end.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(row('Cherries'));
    expect(host.value()).toBe('cherries');
    key(row('Cherries'), 'Home');
    expect(document.activeElement).toBe(row('Apples'));
    expect(host.value()).toBe('apples');
  });

  it('Space and Enter select the focused row', () => {
    const { host, row, key } = render(ValueHost);
    const space = key(row('Bananas'), ' ');
    expect(space.defaultPrevented).toBe(true);
    expect(host.value()).toBe('bananas');
    key(row('Cherries'), 'Enter');
    expect(host.value()).toBe('cherries');
  });

  it('selectedIndex mode marks the row at that index', () => {
    const { host, row, flush } = render(IndexHost);
    expect(row('Apples').getAttribute('aria-checked')).toBe('true');
    host.selectedIndex.set(2);
    flush();
    expect(row('Cherries').getAttribute('aria-checked')).toBe('true');
    expect(row('Apples').getAttribute('aria-checked')).toBe('false');
  });

  it('per-item mode: selected wins and select reports the press', () => {
    const { host, row, flush } = render(ItemHost);
    expect(row('Apples').getAttribute('tabindex')).toBe('0');
    row('Cherries').click();
    flush();
    expect(host.selected()).toBe(2);
    expect(row('Cherries').getAttribute('aria-checked')).toBe('true');
    expect(row('Cherries').getAttribute('tabindex')).toBe('0');
    expect(row('Apples').getAttribute('tabindex')).toBe('-1');
  });

  it('the selected label is foreground and semibold; the rest are muted', () => {
    const { row } = render(ValueHost);
    const visible = (label: string) => row(label).querySelectorAll('span > span')[1] as HTMLElement;
    expect(visible('Apples').classList).toContain('text-foreground');
    expect(visible('Apples').style.fontVariationSettings).toBe(fontWeights.semibold);
    expect(visible('Bananas').classList).toContain('text-muted-foreground');
    expect(visible('Bananas').style.fontVariationSettings).toBe(fontWeights.normal);
  });

  it('a focused row is the active one: highlight index, darker border, foreground label', () => {
    const { group, row } = render(ValueHost);
    row('Bananas').focus();
    TestBed.tick();
    expect(group.getAttribute('data-fluid-hover-active-index')).toBe('1');
    const border = row('Bananas').querySelector<HTMLElement>('[data-slot="radio-border"]')!;
    expect(border.classList).toContain('border-neutral-400');
    row('Bananas').blur();
    TestBed.tick();
    expect(group.hasAttribute('data-fluid-hover-active-index')).toBe(false);
    expect(border.classList).toContain('border-border');
  });

  it('the selected row shows its dot, which leaves when deselected', async () => {
    const { host, row, flush } = render(ValueHost);
    const dot = (label: string) => row(label).querySelector('[data-slot="radio-dot"]');
    expect(dot('Apples')).not.toBeNull();
    expect(dot('Bananas')).toBeNull();
    host.value.set('bananas');
    flush();
    expect(dot('Bananas')).not.toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(dot('Apples')).toBeNull();
  });

  it('the compact size pins every row to the compact control height', () => {
    const { host, row, flush } = render(ValueHost);
    host.size.set('compact');
    flush();
    expect(row('Apples').className).toContain('h-7');
    expect(row('Apples').querySelector('[data-slot="radio-circle"]')!.className).toContain('w-[14px]');
  });

  it('a value that matches no row selects nothing', () => {
    const { host, row, flush } = render(ValueHost);
    host.value.set('durian');
    flush();
    for (const label of labels) expect(row(label).getAttribute('aria-checked')).toBe('false');
    expect(row('Apples').getAttribute('tabindex')).toBe('0');
  });
});

describe('RadioGroup focus ring', () => {
  beforeEach(() => {
    // jsdom never matches :focus-visible. Chrome matches it for any script
    // focus(), the mousedown redirect included, which is what the group faces.
    const matches = Element.prototype.matches;
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
      if (selector === ':focus-visible') return this === document.activeElement;
      return matches.call(this, selector);
    });
    // The ring follows the row's measured rect; jsdom lays nothing out.
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(36);
  });
  afterEach(() => vi.restoreAllMocks());

  it('draws no ring on a click, and draws it again on arrow keys', async () => {
    const { el, row, flush, key } = render(IndexHost);
    // Two frames: registration schedules the measurement, which then publishes.
    await nextFrame();
    await nextFrame();
    flush();
    const ring = () => el.querySelector('[class*="--focus-ring"]');

    row('Bananas').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    flush();
    expect(document.activeElement).toBe(row('Bananas'));
    expect(ring()).toBeNull();

    key(row('Bananas'), 'ArrowDown');
    expect(document.activeElement).toBe(row('Cherries'));
    expect(ring()).not.toBeNull();
  });

  it('shows the selected background on the selected row only', async () => {
    const { el, host, flush } = render(IndexHost);
    await nextFrame();
    await nextFrame();
    flush();
    const bg = () => el.querySelector('[data-slot="radio-selected-background"]');
    expect(bg()).not.toBeNull();
    expect(bg()!.className).toContain('bg-active');
    host.selectedIndex.set(undefined);
    flush();
    expect(bg()).toBeNull();
  });
});
