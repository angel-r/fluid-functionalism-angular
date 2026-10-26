/**
 * Checkbox group: each row is its own focusable role="checkbox", a click on
 * the square or the row toggles it exactly once, Up/Down move focus only, and
 * contiguous checked rows merge into one background. Ported from
 * tests/checkbox-group-base.test.tsx and tests/group-focus-ring.test.tsx.
 */
import { Component, type Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CheckboxGroup, CheckboxItem } from './checkbox-group';
import { fontWeights } from '../core/font-weight';
import type { SizeVariant } from '../core/size';

const labels = ['Email', 'Push', 'SMS', 'Fax'];

/** The upstream pattern: the parent owns the set and toggles it per item. */
@Component({
  imports: [CheckboxGroup, CheckboxItem],
  template: `
    <ff-checkbox-group [checkedIndices]="checked()" [size]="size()" class="extra">
      @for (label of labels; track label; let i = $index) {
        <ff-checkbox-item [label]="label" [index]="i" [checked]="checked().has(i)" (toggle)="toggle(i)" />
      }
    </ff-checkbox-group>
  `,
})
class Settings {
  readonly labels = labels;
  readonly checked = signal<ReadonlySet<number>>(new Set());
  readonly size = signal<SizeVariant | undefined>(undefined);
  toggle(index: number) {
    this.checked.update((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }
}

/** The Angular shorthand: the group's two-way checkedIndices drives the rows. */
@Component({
  imports: [CheckboxGroup, CheckboxItem],
  template: `
    <ff-checkbox-group [(checkedIndices)]="checked">
      @for (label of labels; track label; let i = $index) {
        <ff-checkbox-item [label]="label" [index]="i" (toggle)="toggles.push(i)" />
      }
    </ff-checkbox-group>
  `,
})
class TwoWay {
  readonly labels = labels;
  readonly checked = signal<ReadonlySet<number>>(new Set([0]));
  readonly toggles: number[] = [];
}

/** Both wired at once must still toggle once per press. */
@Component({
  imports: [CheckboxGroup, CheckboxItem],
  template: `
    <ff-checkbox-group [(checkedIndices)]="checked">
      @for (label of labels; track label; let i = $index) {
        <ff-checkbox-item [label]="label" [index]="i" [checked]="checked().has(i)" (toggle)="toggle(i)" />
      }
    </ff-checkbox-group>
  `,
})
class Both extends Settings {}

function render<T>(type: Type<T>, configure: (host: T) => void = () => {}) {
  const fixture = TestBed.createComponent(type);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  // The row is the accessible checkbox; the square inside it is aria-hidden.
  const row = (label: string) => el.querySelector<HTMLElement>(`ff-checkbox-item[aria-label="${label}"]`)!;
  const square = (label: string) => row(label).querySelector<HTMLElement>('span[role="checkbox"]')!;
  const flush = () => fixture.detectChanges();
  const key = (target: HTMLElement, k: string) => {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    flush();
    return event;
  };
  return { fixture, host: fixture.componentInstance, el, row, square, flush, key };
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

describe('CheckboxGroup', () => {
  it('renders a group of checkbox rows, each its own tab stop', () => {
    const { el, row, square } = render(Settings);
    const group = el.querySelector('ff-checkbox-group')!;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.classList).toContain('extra');
    expect(row('Push').getAttribute('role')).toBe('checkbox');
    expect(row('Push').getAttribute('aria-checked')).toBe('false');
    for (const label of labels) expect(row(label).getAttribute('tabindex')).toBe('0');
    expect(row('SMS').getAttribute('data-fluid-hover-index')).toBe('2');
    expect(square('Push').getAttribute('aria-hidden')).toBe('true');
    expect(square('Push').getAttribute('tabindex')).toBe('-1');
    expect(row('Push').className).toContain('h-9');
  });

  it('checks and unchecks the item from the square', () => {
    const { row, square, flush, host } = render(Settings);
    square('Push').click();
    flush();
    expect(row('Push').getAttribute('aria-checked')).toBe('true');
    expect(square('Push').hasAttribute('data-checked')).toBe(true);
    expect([...host.checked()]).toEqual([1]);
    square('Push').click();
    flush();
    expect(row('Push').getAttribute('aria-checked')).toBe('false');
    expect(square('Push').hasAttribute('data-unchecked')).toBe(true);
  });

  it('checks the item from the row, as before', () => {
    const { row, flush } = render(Settings);
    row('Push').click();
    flush();
    expect(row('Push').getAttribute('aria-checked')).toBe('true');
  });

  it('two-way checkedIndices drives rows without per-item checked', () => {
    const { host, row, flush } = render(TwoWay);
    expect(row('Email').getAttribute('aria-checked')).toBe('true');
    row('SMS').click();
    flush();
    expect([...host.checked()].sort()).toEqual([0, 2]);
    expect(host.toggles).toEqual([2]);
    expect(row('SMS').getAttribute('aria-checked')).toBe('true');
    row('Email').click();
    flush();
    expect([...host.checked()]).toEqual([2]);
    expect(row('Email').getAttribute('aria-checked')).toBe('false');
  });

  it('two-way checkedIndices plus per-item toggle handlers still toggle once', () => {
    const { host, row, flush } = render(Both);
    row('Push').click();
    flush();
    expect([...host.checked()]).toEqual([1]);
    expect(row('Push').getAttribute('aria-checked')).toBe('true');
    row('Push').click();
    flush();
    expect([...host.checked()]).toEqual([]);
  });

  it('Space and Enter toggle the focused row', () => {
    const { row, key } = render(Settings);
    const space = key(row('SMS'), ' ');
    expect(space.defaultPrevented).toBe(true);
    expect(row('SMS').getAttribute('aria-checked')).toBe('true');
    key(row('SMS'), 'Enter');
    expect(row('SMS').getAttribute('aria-checked')).toBe('false');
  });

  it('Up/Down move focus only, wrapping; Home/End jump', () => {
    const { row, key } = render(Settings);
    row('Email').focus();
    key(row('Email'), 'ArrowUp');
    expect(document.activeElement).toBe(row('Fax'));
    key(row('Fax'), 'ArrowDown');
    expect(document.activeElement).toBe(row('Email'));
    key(row('Email'), 'End');
    expect(document.activeElement).toBe(row('Fax'));
    key(row('Fax'), 'Home');
    expect(document.activeElement).toBe(row('Email'));
    for (const label of labels) expect(row(label).getAttribute('aria-checked')).toBe('false');
  });

  it('the checked label is foreground and semibold, with the check mark drawn', async () => {
    const { host, row, flush } = render(Settings, (h) => h.checked.set(new Set([0])));
    const visible = (label: string) => row(label).querySelectorAll('span.inline-grid > span')[1] as HTMLElement;
    const check = (label: string) => row(label).querySelector('[data-slot="checkbox-check"]');
    expect(visible('Email').classList).toContain('text-foreground');
    expect(visible('Email').style.fontVariationSettings).toBe(fontWeights.semibold);
    expect(visible('Push').classList).toContain('text-muted-foreground');
    expect(visible('Push').style.fontVariationSettings).toBe(fontWeights.normal);
    expect(check('Email')).not.toBeNull();
    expect(check('Push')).toBeNull();
    host.toggle(0);
    flush();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(check('Email')).toBeNull();
  });

  it('the compact size pins rows and squares to the compact step', () => {
    const { row, square } = render(Settings, (h) => h.size.set('compact'));
    expect(row('Email').className).toContain('h-7');
    expect(square('Email').className).toContain('w-[14px]');
  });
});

describe('CheckboxGroup with layout', () => {
  beforeEach(() => {
    // jsdom never matches :focus-visible. Chrome matches it for any script
    // focus(), the mousedown redirect included, which is what the group faces.
    const matches = Element.prototype.matches;
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
      if (selector === ':focus-visible') return this === document.activeElement;
      return matches.call(this, selector);
    });
    // The ring and the backgrounds follow measured rects; jsdom lays nothing out.
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(36);
  });
  afterEach(() => vi.restoreAllMocks());

  it('draws no ring on a click, and draws it again on arrow keys', async () => {
    const { el, row, flush, key } = render(Settings);
    // Two frames: registration schedules the measurement, which then publishes.
    await nextFrame();
    await nextFrame();
    flush();
    const ring = () => el.querySelector('[class*="--focus-ring"]');

    row('Push').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    flush();
    expect(document.activeElement).toBe(row('Push'));
    expect(ring()).toBeNull();

    key(row('Push'), 'ArrowDown');
    expect(document.activeElement).toBe(row('SMS'));
    expect(ring()).not.toBeNull();
  });

  it('contiguous checked rows share one background block', async () => {
    const { el, flush } = render(Settings, (h) => h.checked.set(new Set([0, 1, 3])));
    await nextFrame();
    await nextFrame();
    flush();
    const blocks = el.querySelectorAll('[data-slot="selection-background"]');
    // Rows 0-1 merge into one block; row 3 stands alone.
    expect(blocks.length).toBe(2);
  });
});
