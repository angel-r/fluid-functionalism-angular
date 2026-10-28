/**
 * ColorPickerPopover behavior through the public component, one test per
 * rule of the React source: the tile + hex trigger, the label positions, the
 * remove button, open/close (click, Escape, outside press, controlled open),
 * the value round-trip with the panel, the format menu rendering inside the
 * panel, the surface level and the size pin.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ColorPickerPopover } from './color-picker-popover';
import type { ColorChange } from './color-picker';
import type { SizeVariant } from '../core/size';

@Component({
  imports: [ColorPickerPopover],
  template: `
    <ff-color-picker-popover
      data-testid="popover"
      [(value)]="value"
      (colorChange)="changes.push($event)"
      [triggerLabel]="label()"
      [triggerLabelPosition]="labelPosition()"
      [triggerShowValue]="showValue()"
      [triggerShowRemove]="showRemove()"
      (triggerRemove)="removed = removed + 1"
      [open]="open()"
      (openChange)="openChanges.push($event)"
      [size]="size()"
      hideEyedropper
    />
    <button type="button" data-testid="outside">outside</button>
  `,
})
class Host {
  readonly value = signal<string | undefined>('#6B97FF');
  readonly changes: ColorChange[] = [];
  readonly label = signal<string | undefined>(undefined);
  readonly labelPosition = signal<'left' | 'right'>('left');
  readonly showValue = signal(true);
  readonly showRemove = signal(false);
  readonly open = signal<boolean | undefined>(undefined);
  readonly openChanges: boolean[] = [];
  readonly size = signal<SizeVariant | undefined>(undefined);
  removed = 0;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
});

afterEach(() => {
  vi.useRealTimers();
  delete (document.documentElement as { clientWidth?: number }).clientWidth;
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
});

function setup(configure: (host: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const host = fixture.componentInstance;
  const root = () => fixture.nativeElement.querySelector('[data-testid="popover"]') as HTMLElement;
  const trigger = () => root().querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!;
  const panel = () => document.querySelector<HTMLElement>('[role="dialog"]');
  const outside = () => fixture.nativeElement.querySelector('[data-testid="outside"]') as HTMLElement;
  const render = () => fixture.detectChanges();
  const flush = (ms = 0) => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };
  return { fixture, host, root, trigger, panel, outside, render, flush };
}

describe('ColorPickerPopover: trigger', () => {
  it('shows the tile and the 6-digit hex without alpha', () => {
    const { trigger, host, render } = setup((h) => h.value.set('#ff000080'));
    expect(trigger().textContent).toContain('FF0000');
    expect(trigger().querySelector('ff-color-tile')).not.toBeNull();
    host.showValue.set(false);
    render();
    expect(trigger().textContent).not.toContain('FF0000');
  });

  it('places the label left or right of the tile', () => {
    const { trigger, host, render } = setup((h) => h.label.set('Fill'));
    const labelIndex = () =>
      Array.from(trigger().children).findIndex((c) => c.textContent?.trim() === 'Fill');
    const tileIndex = () => Array.from(trigger().children).findIndex((c) => c.tagName === 'FF-COLOR-TILE');
    expect(labelIndex()).toBeLessThan(tileIndex());
    host.labelPosition.set('right');
    render();
    expect(labelIndex()).toBeGreaterThan(tileIndex());
  });

  it('removes without opening, by click and by Enter', () => {
    const { trigger, host, render, panel } = setup((h) => h.showRemove.set(true));
    const remove = trigger().querySelector<HTMLElement>('[role="button"][aria-label="Remove color"]')!;
    expect(remove.getAttribute('tabindex')).toBe('0');
    remove.click();
    render();
    remove.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    render();
    expect(host.removed).toBe(2);
    expect(panel()).toBeNull();
    expect(host.openChanges).toEqual([]);
  });

  it('pins the trigger to the compact step', () => {
    const { trigger } = setup((h) => h.size.set('compact'));
    expect(trigger().classList.contains('h-7')).toBe(true);
    expect(trigger().classList.contains('px-1.5')).toBe(true);
    expect(trigger().querySelector('ff-color-tile')!.getAttribute('style')).toContain('width: 16px');
  });
});

describe('ColorPickerPopover: open and close', () => {
  it('opens the panel on click and moves focus into it', () => {
    const { trigger, panel, render, host } = setup();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    trigger().click();
    render();
    expect(panel()).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(host.openChanges).toEqual([true]);
    expect(document.activeElement).toBe(panel());
    expect(panel()!.querySelector('ff-color-picker')).not.toBeNull();
  });

  it('closes on Escape, back to the trigger, after the exit', () => {
    const { trigger, panel, render, flush, host } = setup();
    trigger().click();
    render();
    panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    render();
    expect(host.openChanges).toEqual([true, false]);
    expect(document.activeElement).toBe(trigger());
    expect(panel()).not.toBeNull();
    flush(300);
    expect(panel()).toBeNull();
  });

  it('closes on a press outside', () => {
    const { trigger, outside, render, host } = setup();
    trigger().click();
    render();
    outside().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    render();
    expect(host.openChanges).toEqual([true, false]);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles closed from the trigger', () => {
    const { trigger, render, host } = setup();
    trigger().click();
    render();
    trigger().click();
    render();
    expect(host.openChanges).toEqual([true, false]);
  });

  it('ignores trigger clicks when controlled, still reporting them', () => {
    const { trigger, render, host, panel } = setup((h) => h.open.set(false));
    trigger().click();
    render();
    expect(host.openChanges).toEqual([true]);
    expect(panel()).toBeNull();
    host.open.set(true);
    render();
    expect(panel()).not.toBeNull();
  });
});

describe('ColorPickerPopover: panel', () => {
  it('writes panel edits back to the trigger and the bound value', () => {
    const { trigger, panel, render, host } = setup();
    trigger().click();
    render();
    const hex = panel()!.querySelector<HTMLInputElement>('input[aria-label="Hex value"]')!;
    hex.dispatchEvent(new FocusEvent('focus'));
    hex.value = '00ff00';
    hex.dispatchEvent(new Event('input', { bubbles: true }));
    hex.dispatchEvent(new FocusEvent('blur'));
    render();
    expect(host.value()).toBe('#00ff00');
    expect(host.changes.at(-1)?.parsed.g).toBe(255);
    expect(trigger().textContent).toContain('00FF00');
  });

  it('sits two surface levels above its substrate with a level-3 shadow', () => {
    const { trigger, panel, render } = setup();
    trigger().click();
    render();
    const picker = panel()!.querySelector<HTMLElement>('ff-color-picker')!;
    expect(picker.classList.contains('bg-surface-3')).toBe(true);
    expect(picker.classList.contains('shadow-surface-3')).toBe(true);
  });

  it('keeps the popover open on a format pick (the menu counts as inside)', () => {
    const { trigger, panel, render, host } = setup();
    trigger().click();
    render();
    const formatTrigger = panel()!.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;
    formatTrigger.click();
    render();
    // Rendered inside the panel where the popover API exists; jsdom has
    // none, so here it lands in the global overlay layer.
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    const rgb = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))[1];
    rgb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    rgb.click();
    render();
    expect(host.value()).toBe('rgb(107, 151, 255)');
    expect(host.openChanges).toEqual([true]);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('closes the format menu, not the popover, on Escape inside the menu', () => {
    const { trigger, panel, render, host } = setup();
    trigger().click();
    render();
    const formatTrigger = panel()!.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;
    formatTrigger.focus();
    formatTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    render();
    const row = document.activeElement as HTMLElement;
    expect(row.getAttribute('role')).toBe('menuitemradio');
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    render();
    expect(formatTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(host.openChanges).toEqual([true]);
  });
});
