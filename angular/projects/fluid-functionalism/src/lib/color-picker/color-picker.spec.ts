/**
 * ColorPicker panel behavior through the public component. Ports
 * tests/color-picker-sync.test.tsx (a controlled picker follows its value,
 * skips its own emitted string coming back, keeps the held hue on a gray)
 * and adds one test per rule of the React source: the saturation square,
 * the hue/alpha rails, the format menu, the channel fields, the swatch strip,
 * the eyedropper and the size pin.
 */
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { ColorPicker, type ColorChange } from './color-picker';
import type { ColorFormat } from './color-math';
import type { SizeVariant } from '../core/size';

@Component({
  imports: [ColorPicker],
  template: `
    <ff-color-picker
      data-testid="picker"
      [value]="value()"
      (valueChange)="onValue($event)"
      (colorChange)="changes.push($event)"
      [format]="format()"
      (formatChange)="formats.push($event)"
      [defaultValue]="defaultValue()"
      [defaultFormat]="defaultFormat()"
      [swatches]="swatches()"
      [hideEyedropper]="hideEyedropper()"
      [formatOpen]="formatOpen()"
      [size]="size()"
    />
    <button type="button" data-testid="outside">outside</button>
  `,
})
class Host {
  readonly value = signal<string | undefined>(undefined);
  /** Whether the host writes emitted values back (a controlled parent). */
  echo = false;
  readonly emitted: (string | undefined)[] = [];
  readonly changes: ColorChange[] = [];
  readonly formats: (ColorFormat | undefined)[] = [];
  readonly format = signal<ColorFormat | undefined>(undefined);
  readonly defaultValue = signal('#6B97FF');
  readonly defaultFormat = signal<ColorFormat>('hex');
  readonly swatches = signal<string[] | undefined>(undefined);
  readonly hideEyedropper = signal(true);
  readonly formatOpen = signal<boolean | undefined>(undefined);
  readonly size = signal<SizeVariant | undefined>(undefined);

  onValue(v: string | undefined) {
    this.emitted.push(v);
    if (this.echo) this.value.set(v);
  }
}

beforeEach(() => {
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
});

afterEach(() => {
  vi.useRealTimers();
  delete (window as { EyeDropper?: unknown }).EyeDropper;
  delete (document.documentElement as { clientWidth?: number }).clientWidth;
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
});

function setup(configure: (host: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  return harness(fixture);
}

function harness(fixture: ComponentFixture<Host>) {
  const host = fixture.componentInstance;
  const root = () => fixture.nativeElement.querySelector('[data-testid="picker"]') as HTMLElement;
  const field = (label: string) => root().querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  const hexField = () => field('Hex value');
  const hue = () =>
    root()
      .querySelector('[aria-label="Hue"] [role="slider"], [role="slider"][aria-label="Hue"]')
      ?.getAttribute('aria-valuenow');
  const render = () => fixture.detectChanges();
  const key = (el: Element, k: string, init: KeyboardEventInit = {}) => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
    render();
  };
  const type = (input: HTMLInputElement, text: string) => {
    input.dispatchEvent(new FocusEvent('focus'));
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    key(input, 'Enter');
    input.dispatchEvent(new FocusEvent('blur'));
    render();
  };
  const last = () => host.changes.at(-1);
  return { fixture, host, root, field, hexField, hue, render, key, type, last };
}

describe('ColorPicker controlled sync (ported from tests/color-picker-sync.test.tsx)', () => {
  it('shows a value changed from outside', () => {
    const { host, hexField, render } = setup((h) => h.value.set('#ff0000'));
    expect(hexField().value).toBe('FF0000');
    host.value.set('#00ff00');
    render();
    expect(hexField().value).toBe('00FF00');
  });

  it('keeps the held hue when the outside value is a gray', () => {
    const { host, hexField, hue, render } = setup((h) => h.value.set('#00ff00'));
    expect(hue()).toBe('120');
    host.value.set('#808080');
    render();
    expect(hexField().value).toBe('808080');
    expect(hue()).toBe('120');
  });

  it('does not re-parse its own emitted string', () => {
    const { host, hexField, type } = setup((h) => {
      h.value.set('#6b97ff');
      h.echo = true;
    });
    type(hexField(), '123456');
    expect(host.emitted.at(-1)?.toLowerCase()).toBe('#123456');
    expect(hexField().value).toBe('123456');
  });
});

describe('ColorPicker: value', () => {
  it('starts uncontrolled at defaultValue and emits value plus parsed color', () => {
    const { host, hexField, type, last } = setup();
    expect(hexField().value).toBe('6B97FF');
    type(hexField(), 'ff0000');
    expect(host.emitted.at(-1)).toBe('#ff0000');
    expect(last()?.value).toBe('#ff0000');
    expect(last()?.parsed).toMatchObject({ r: 255, g: 0, b: 0, rgb: 'rgb(255, 0, 0)', hsl: 'hsl(0, 100%, 50%)' });
  });

  it('starts an unparseable first value at pure red', () => {
    const { hexField } = setup((h) => h.value.set('not a color'));
    expect(hexField().value).toBe('FF0000');
  });

  it('ignores a later value that does not parse', () => {
    const { host, hexField, render } = setup((h) => h.value.set('#00ff00'));
    host.value.set('garbage');
    render();
    expect(hexField().value).toBe('00FF00');
  });

  it('drops an unreadable hex entry and keeps the color', () => {
    const { host, hexField, field, type } = setup((h) => h.value.set('#ff000080'));
    type(hexField(), 'zz');
    expect(host.changes).toHaveLength(0);
    // As in React, the rejected draft stays in the field until the value
    // changes; the color itself is untouched.
    expect(field('Alpha').value).toBe('50%');
  });

  it('reads 8-digit hex as alpha', () => {
    const { hexField, field, type, last } = setup();
    type(hexField(), 'FF000080');
    expect(last()?.value).toBe('#ff000080');
    expect(field('Alpha').value).toBe('50%');
  });

  it('reverts the hex draft on Escape', () => {
    const { host, hexField, key, render } = setup();
    const input = hexField();
    input.dispatchEvent(new FocusEvent('focus'));
    input.value = '000000';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    key(input, 'Escape');
    input.dispatchEvent(new FocusEvent('blur'));
    render();
    expect(host.changes).toHaveLength(0);
    expect(hexField().value).toBe('6B97FF');
  });
});

describe('ColorPicker: saturation square', () => {
  const square = (root: HTMLElement) => root.querySelector<HTMLElement>('[role="application"]')!;

  it('has the application role and label', () => {
    const { root } = setup();
    const el = square(root());
    expect(el.getAttribute('aria-label')).toBe('Saturation and brightness');
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('nudges S and V by 0.01 with arrows and 0.1 with Shift, clamped', () => {
    const { root, key, last } = setup((h) => h.value.set('#808080'));
    // #808080: s = 0, v ≈ 0.502
    key(square(root()), 'ArrowRight');
    expect(last()?.parsed.s).toBeCloseTo(0.01, 5);
    key(square(root()), 'ArrowUp', { shiftKey: true });
    expect(last()?.parsed.v).toBeCloseTo(0.602, 2);
    key(square(root()), 'ArrowLeft', { shiftKey: true });
    expect(last()?.parsed.s).toBe(0);
  });

  it('sets S and V from a press, keeping the hue', () => {
    const { root, render, last, hue } = setup((h) => h.value.set('#00ff00'));
    const el = square(root());
    el.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON() {} }) as DOMRect;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 50, clientY: 100, pointerType: 'mouse', button: 0 }));
    render();
    expect(last()?.parsed).toMatchObject({ s: 0.25, v: 0 });
    // Black: the hue survives.
    expect(hue()).toBe('120');
    el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 200, clientY: 0, pointerType: 'mouse' }));
    render();
    expect(last()?.value).toBe('#00ff00');
  });

  it('ignores a non-primary mouse button', () => {
    const { root, render, host } = setup();
    const el = square(root());
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5, pointerType: 'mouse', button: 2 }));
    render();
    expect(host.changes).toHaveLength(0);
  });
});

describe('ColorPicker: rails', () => {
  const thumb = (root: HTMLElement, label: string) =>
    root.querySelector<HTMLElement>(`[aria-label="${label}"] [role="slider"]`)!;

  it('moves the hue from the hue rail', () => {
    const { root, key, last } = setup((h) => h.value.set('#ff0000'));
    key(thumb(root(), 'Hue'), 'ArrowRight');
    expect(last()?.parsed.h).toBe(1);
  });

  it('sets alpha in whole percents from the alpha rail', () => {
    const { root, key, last } = setup((h) => h.value.set('#ff0000'));
    expect(thumb(root(), 'Alpha').getAttribute('aria-valuenow')).toBe('100');
    key(thumb(root(), 'Alpha'), 'ArrowLeft');
    expect(last()?.parsed.a).toBe(0.99);
    expect(last()?.value).toBe('#ff0000fc');
  });

  it("drops each rail root's bottom margin, as the React stack's [&>*]:mb-0 does", () => {
    const { root } = setup();
    for (const label of ['Hue', 'Alpha']) {
      const host = root().querySelector<HTMLElement>(`ff-slider[aria-label="${label}"]`)!;
      expect(host.classList.contains('[&>*]:mb-0')).toBe(true);
      expect(host.firstElementChild!.classList.contains('mb-2')).toBe(true);
    }
  });
});

describe('ColorPicker: format menu', () => {
  const trigger = (root: HTMLElement) => root.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;
  const menu = () => document.querySelector<HTMLElement>('[role="menu"]');
  const items = () => Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'));

  it('opens on click, lists the four formats and marks the current one', () => {
    const { root, render } = setup();
    expect(trigger(root()).textContent).toContain('HEX');
    expect(trigger(root()).getAttribute('aria-expanded')).toBe('false');
    trigger(root()).click();
    render();
    expect(menu()).not.toBeNull();
    expect(trigger(root()).getAttribute('aria-expanded')).toBe('true');
    expect(trigger(root()).hasAttribute('data-popup-open')).toBe(true);
    expect(items().map((i) => i.textContent?.trim().slice(0, 5))).toEqual(['HEXHE', 'RGBRG', 'HSLHS', 'OKLCH']);
    expect(items().map((i) => i.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false', 'false']);
  });

  it('switches format, re-emitting the same color in it, and closes', async () => {
    vi.useFakeTimers();
    const { host, root, render, field, last } = setup();
    trigger(root()).click();
    render();
    items()[1].click();
    render();
    expect(host.formats).toEqual(['rgb']);
    expect(last()?.value).toBe('rgb(107, 151, 255)');
    expect(trigger(root()).textContent).toContain('RGB');
    expect(field('Red').value).toBe('107');
    expect(field('Green').value).toBe('151');
    expect(field('Blue').value).toBe('255');
    expect(trigger(root()).getAttribute('aria-expanded')).toBe('false');
    vi.advanceTimersByTime(500);
    render();
    expect(menu()).toBeNull();
  });

  it('opens from the keyboard onto the first row, roves and picks with Enter', () => {
    const { host, root, key } = setup();
    trigger(root()).focus();
    key(trigger(root()), 'ArrowDown');
    expect(document.activeElement).toBe(items()[0]);
    key(items()[0], 'ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    key(items()[1], 'ArrowUp');
    key(items()[0], 'ArrowUp');
    expect(document.activeElement).toBe(items()[3]);
    key(items()[3], 'Enter');
    expect(host.formats).toEqual(['oklch']);
    expect(document.activeElement).toBe(trigger(root()));
  });

  it('jumps by typeahead and closes on Escape back to the trigger', () => {
    const { host, root, key } = setup();
    trigger(root()).focus();
    key(trigger(root()), 'ArrowUp');
    expect(document.activeElement).toBe(items()[3]);
    key(items()[3], 'h');
    expect(document.activeElement).toBe(items()[0]);
    key(items()[0], 'Escape');
    expect(trigger(root()).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger(root()));
    expect(host.formats).toEqual([]);
  });

  it('closes on a press outside', () => {
    const { root, render, fixture } = setup();
    trigger(root()).click();
    render();
    const outside = fixture.nativeElement.querySelector('[data-testid="outside"]') as HTMLElement;
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    render();
    expect(trigger(root()).getAttribute('aria-expanded')).toBe('false');
  });

  it('stays open when controlled, ignoring picks', () => {
    const { host, root, render } = setup((h) => h.formatOpen.set(true));
    expect(menu()).not.toBeNull();
    items()[2].click();
    render();
    expect(host.formats).toEqual(['hsl']);
    expect(trigger(root()).getAttribute('aria-expanded')).toBe('true');
    expect(menu()).not.toBeNull();
  });

  it('lifts the popup two surface levels above the panel', () => {
    const { root, render } = setup();
    trigger(root()).click();
    render();
    expect(root().classList.contains('bg-surface-3')).toBe(true);
    expect(menu()!.classList.contains('bg-surface-5')).toBe(true);
    expect(menu()!.classList.contains('shadow-surface-3')).toBe(true);
    expect(menu()!.classList.contains('p-1')).toBe(true);
  });

  it('follows a controlled format', () => {
    const { host, render, root, field } = setup((h) => h.format.set('hsl'));
    expect(trigger(root()).textContent).toContain('HSL');
    expect(field('Hue').value).toBe('222');
    host.format.set('oklch');
    render();
    expect(field('Chroma').value).toBe('0.16');
  });
});

describe('ColorPicker: channel fields', () => {
  it('names each RGB field with a spinbutton and its bounds', () => {
    const { field } = setup((h) => h.defaultFormat.set('rgb'));
    const red = field('Red');
    expect(red.getAttribute('role')).toBe('spinbutton');
    expect(red.getAttribute('aria-valuenow')).toBe('107');
    expect(red.getAttribute('aria-valuemin')).toBe('0');
    expect(red.getAttribute('aria-valuemax')).toBe('255');
  });

  it('nudges by 1, Shift and PageUp by 10, clamped at max', () => {
    const { field, key, last } = setup((h) => {
      h.defaultFormat.set('rgb');
      h.value.set('rgb(250, 0, 0)');
    });
    key(field('Green'), 'ArrowUp');
    expect(last()?.value).toBe('rgb(250, 1, 0)');
    key(field('Green'), 'ArrowUp', { shiftKey: true });
    expect(last()?.value).toBe('rgb(250, 11, 0)');
    key(field('Green'), 'PageUp');
    expect(last()?.value).toBe('rgb(250, 21, 0)');
    key(field('Red'), 'ArrowUp', { shiftKey: true });
    expect(last()?.value).toBe('rgb(255, 21, 0)');
    key(field('Red'), 'Home');
    expect(last()?.value).toBe('rgb(0, 21, 0)');
  });

  it('wraps the HSL hue past 360 and leaves it unbounded for ARIA', () => {
    const { field, key, last } = setup((h) => {
      h.defaultFormat.set('hsl');
      h.value.set('hsl(355, 100%, 50%)');
    });
    expect(field('Hue').hasAttribute('aria-valuemax')).toBe(false);
    key(field('Hue'), 'ArrowUp', { shiftKey: true });
    expect(last()?.value).toBe('hsl(5, 100%, 50%)');
  });

  it('commits typed text on blur through the clamp, and reverts on Escape', () => {
    const { field, type, key, render, last, host } = setup((h) => h.defaultFormat.set('rgb'));
    type(field('Green'), '999');
    expect(last()?.value).toBe('rgb(107, 255, 255)');
    const count = host.changes.length;
    type(field('Red'), '10');
    expect(last()?.value).toBe('rgb(10, 255, 255)');
    const red = field('Red');
    red.dispatchEvent(new FocusEvent('focus'));
    red.value = '200';
    red.dispatchEvent(new Event('input', { bubbles: true }));
    key(red, 'Escape');
    red.dispatchEvent(new FocusEvent('blur'));
    render();
    expect(host.changes.length).toBe(count + 1);
    expect(field('Red').value).toBe('10');
  });

  it('steps OKLCH chroma by 0.01 and holds the OKLCH hue', () => {
    const { field, key, last } = setup((h) => h.defaultFormat.set('oklch'));
    const hueBefore = field('Hue').value;
    key(field('Chroma'), 'ArrowUp');
    expect(field('Chroma').value).toBe('0.17');
    expect(field('Hue').value).toBe(hueBefore);
    expect(last()?.value.startsWith('oklch(')).toBe(true);
  });

  it('sets alpha from its percent field in every format', () => {
    const { field, type, last } = setup();
    type(field('Alpha'), '50');
    expect(last()?.value).toBe('#6b97ff80');
    expect(field('Alpha').value).toBe('50%');
  });

  it('scrubs one step per pixel of horizontal travel', () => {
    const { root, field, render, last } = setup((h) => h.defaultFormat.set('rgb'));
    const red = field('Red');
    const area = red.parentElement as HTMLElement;
    expect(area.classList.contains('cursor-ew-resize')).toBe(true);
    expect(red.classList.contains('pointer-events-none')).toBe(true);
    area.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 100, clientY: 10, pointerType: 'pen' }));
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 105, clientY: 10, pointerType: 'pen' }));
    render();
    expect(last()?.value).toBe('rgb(112, 151, 255)');
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 102, clientY: 10, pointerType: 'pen' }));
    render();
    expect(last()?.value).toBe('rgb(109, 151, 255)');
    document.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'pen' }));
    render();
    expect(document.activeElement).not.toBe(red);
    expect(root()).toBeTruthy();
  });

  it('enters text editing on a press without a drag', () => {
    const { field, render, host } = setup((h) => h.defaultFormat.set('rgb'));
    const red = field('Red');
    const area = red.parentElement as HTMLElement;
    area.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 100, pointerType: 'mouse', button: 0 }));
    document.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse' }));
    render();
    expect(document.activeElement).toBe(red);
    expect(red.classList.contains('pointer-events-none')).toBe(false);
    expect(area.classList.contains('cursor-ew-resize')).toBe(false);
    expect(host.changes).toHaveLength(0);
  });
});

describe('ColorPicker: swatches', () => {
  const swatches = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLButtonElement>('button[aria-label^="Select color"]'));

  it('hides the strip without swatches', () => {
    const { root } = setup();
    expect(swatches(root())).toHaveLength(0);
  });

  it('marks the swatch matching the current color, whatever its notation', () => {
    const { root } = setup((h) => {
      h.value.set('#ffffff');
      h.swatches.set(['#000000', 'rgb(255, 255, 255)', 'rgba(0,0,0,0.5)']);
    });
    const list = swatches(root());
    expect(list.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Select color #000000',
      'Select color rgb(255, 255, 255)',
      'Select color rgba(0,0,0,0.5)',
    ]);
    expect(list[1].style.boxShadow).toMatch(/#6B97FF|rgb\(107, 151, 255\)/i);
    expect(list[0].style.boxShadow).not.toMatch(/#6B97FF|rgb\(107, 151, 255\)/i);
  });

  it('picks a swatch, translucent ones included', () => {
    const { root, render, last } = setup((h) => h.swatches.set(['#000000', 'rgba(0,0,0,0.5)']));
    swatches(root())[1].click();
    render();
    expect(last()?.value).toBe('#00000080');
    expect(swatches(root())[1].style.boxShadow).toMatch(/#6B97FF|rgb\(107, 151, 255\)/i);
  });
});

describe('ColorPicker: eyedropper', () => {
  const button = (root: HTMLElement) => root.querySelector<HTMLButtonElement>('button[aria-label="Pick color from screen"]');

  it('hides itself where window.EyeDropper is missing', () => {
    const { root } = setup((h) => h.hideEyedropper.set(false));
    expect(button(root())).toBeNull();
  });

  it('picks a color from the screen', async () => {
    (window as unknown as { EyeDropper: unknown }).EyeDropper = class {
      open() {
        return Promise.resolve({ sRGBHex: '#00ff00' });
      }
    };
    const { root, render, last } = setup((h) => h.hideEyedropper.set(false));
    button(root())!.click();
    await Promise.resolve();
    await Promise.resolve();
    render();
    expect(last()?.value).toBe('#00ff00');
  });

  it('swallows a cancelled pick', async () => {
    (window as unknown as { EyeDropper: unknown }).EyeDropper = class {
      open() {
        return Promise.reject(new Error('AbortError'));
      }
    };
    const { root, render, host } = setup((h) => h.hideEyedropper.set(false));
    button(root())!.click();
    await Promise.resolve();
    await Promise.resolve();
    render();
    expect(host.changes).toHaveLength(0);
  });

  it('stays hidden with hideEyedropper even where supported', () => {
    (window as unknown as { EyeDropper: unknown }).EyeDropper = class {};
    const { root } = setup();
    expect(button(root())).toBeNull();
  });
});

describe('ColorPicker: size', () => {
  it('pins its controls to the compact step', () => {
    const { root } = setup((h) => {
      h.size.set('compact');
      h.defaultFormat.set('rgb');
    });
    const trigger = root().querySelector<HTMLElement>('button[aria-haspopup="menu"]')!;
    expect(trigger.classList.contains('h-7')).toBe(true);
    expect(root().querySelector('ff-color-input')!.classList.contains('h-7')).toBe(true);
  });

  it('defaults to the 36px step and a 280px panel', () => {
    const { root } = setup();
    const trigger = root().querySelector<HTMLElement>('button[aria-haspopup="menu"]')!;
    expect(trigger.classList.contains('h-9')).toBe(true);
    expect(root().style.width).toBe('280px');
  });
});
