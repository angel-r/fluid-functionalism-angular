/**
 * InputCopy through its public interface. Ports the InputCopy case of
 * tests/touch-fields.test.tsx (the execCommand fallback selects the whole
 * value from a 16px textarea) and adds one test per rule of the React
 * component: the clipboard call, the 2000ms result window, the state-driven
 * accessible name, the failure state, disabled, the button variant labels,
 * alignment, and the tooltip contract (it says "Copied" only when it was
 * already showing, and stays suppressed until the pointer comes back).
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { type SizeVariant } from '../core/size';
import { INPUT_COPY_CLIPBOARD, type InputCopyAlign, type InputCopyVariant, InputCopy } from './input-copy';

const VALUE = 'npx shadcn@latest add @fluid/input-copy';

@Component({
  imports: [InputCopy],
  template: `
    <ff-input-copy
      data-testid="root"
      class="w-72"
      [value]="value()"
      [label]="label()"
      [disabled]="disabled()"
      [variant]="variant()"
      [align]="align()"
      [size]="size()"
      (copied)="copies = copies + 1"
    />
  `,
})
class Host {
  readonly value = signal(VALUE);
  readonly label = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly variant = signal<InputCopyVariant>('icon');
  readonly align = signal<InputCopyAlign>('right');
  readonly size = signal<SizeVariant | undefined>(undefined);
  copies = 0;
}

const CHECK_PATH = 'M6 12L10 16L18 8';
const ERROR_PATH = 'M9 9L15 15M15 9L9 15';
const SWAP_MS = 160; // exitFallbackMs(spring.fast): the wait-mode swap lands by then

let writeText: ReturnType<typeof vi.fn<(text: string) => Promise<void>>>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] });
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
  writeText = vi.fn((_text: string) => Promise.resolve());
});

afterEach(() => {
  vi.useRealTimers();
  delete (document.documentElement as { clientWidth?: number }).clientWidth;
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
});

function setup(configure: (host: Host) => void = () => {}, clipboard: boolean = true) {
  if (clipboard) {
    TestBed.configureTestingModule({
      providers: [{ provide: INPUT_COPY_CLIPBOARD, useValue: { writeText: (text: string) => writeText(text) } }],
    });
  }
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const root = el.querySelector<HTMLElement>('[data-testid="root"]')!;
  const button = () => root.querySelector<HTMLButtonElement>('button')!;
  button().getBoundingClientRect = () =>
    ({ top: 100, bottom: 136, left: 100, right: 388, width: 288, height: 36, x: 100, y: 100, toJSON() {} }) as DOMRect;
  const flush = (ms = 0) => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };
  // A press: pointerdown, then the click whose clipboard promise settles.
  const press = async () => {
    button().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }));
    button().click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  };
  const hover = () => {
    root.dispatchEvent(new MouseEvent('mouseenter'));
    button().dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse', relatedTarget: document.body }));
    fixture.detectChanges();
  };
  const leave = () => {
    button().dispatchEvent(
      new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: document.body, clientY: 500 }),
    );
    root.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
  };
  const popup = () => document.querySelector<HTMLElement>('[data-slot="tooltip-popup"]');
  const paths = () => Array.from(root.querySelectorAll('path')).map((p) => p.getAttribute('d'));
  return { fixture, host: fixture.componentInstance, root, button, flush, press, hover, leave, popup, paths };
}

describe('InputCopy: copy fallbacks on iOS (ported from tests/touch-fields.test.tsx)', () => {
  const select = HTMLTextAreaElement.prototype.select;
  const execCommand = document.execCommand;
  const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  let copied: { text: string; fontSize: string } | null;

  beforeEach(() => {
    copied = null;
    // No async Clipboard API, as on an http:// LAN address.
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('insecure context')) },
    });
    // iOS Safari: select() puts the caret at the end and selects nothing.
    HTMLTextAreaElement.prototype.select = function (this: HTMLTextAreaElement) {
      this.setSelectionRange(this.value.length, this.value.length);
    };
    // "Copy" whatever the script-made textarea has selected.
    document.execCommand = vi.fn(() => {
      const field = document.body.querySelector(':scope > textarea') as HTMLTextAreaElement;
      copied = {
        text: field.value.slice(field.selectionStart, field.selectionEnd),
        fontSize: field.style.fontSize,
      };
      return true;
    });
  });

  afterEach(() => {
    HTMLTextAreaElement.prototype.select = select;
    document.execCommand = execCommand;
    if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard);
    else delete (navigator as { clipboard?: unknown }).clipboard;
  });

  it('copies the whole value from a 16px field', async () => {
    const { press, host, button } = setup(() => {}, false);
    await press();
    expect(copied).toEqual({ text: VALUE, fontSize: '16px' });
    // The temporary field is gone and the copy counts as a success.
    expect(document.body.querySelector(':scope > textarea')).toBeNull();
    expect(host.copies).toBe(1);
    expect(button().getAttribute('aria-label')).toBe('Copied');
  });

  it('shows the failure state when the fallback fails too', async () => {
    document.execCommand = vi.fn(() => false);
    const { press, host, button, flush, paths } = setup(() => {}, false);
    await press();
    expect(button().getAttribute('aria-label')).toBe('Copy failed');
    expect(host.copies).toBe(0);
    flush(SWAP_MS);
    expect(paths()).toContain(ERROR_PATH);
    expect(button().querySelector('.text-destructive')).not.toBeNull();
  });
});

describe('InputCopy: copying', () => {
  it('writes the value through the clipboard seam and emits copied', async () => {
    const { press, host } = setup();
    await press();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(VALUE);
    expect(host.copies).toBe(1);
  });

  it('shows the check for 2000ms, then returns to the copy icon', async () => {
    const { press, button, flush, paths, root } = setup();
    expect(button().getAttribute('aria-label')).toBe('Copy to clipboard');
    expect(root.querySelector('svg.lucide-copy')).not.toBeNull();
    await press();
    expect(button().getAttribute('aria-label')).toBe('Copied');
    flush(SWAP_MS);
    expect(paths()).toContain(CHECK_PATH);
    expect(root.querySelector('svg.lucide-copy')).toBeNull();
    flush(2000 - SWAP_MS - 1);
    expect(button().getAttribute('aria-label')).toBe('Copied');
    flush(1);
    expect(button().getAttribute('aria-label')).toBe('Copy to clipboard');
    flush(SWAP_MS);
    expect(paths()).not.toContain(CHECK_PATH);
    expect(root.querySelector('svg.lucide-copy')).not.toBeNull();
  });

  it('a second copy restarts the 2000ms window and replays the check', async () => {
    const { press, button, flush, root } = setup();
    await press();
    flush(SWAP_MS);
    const firstCheck = root.querySelector('path');
    flush(1500);
    await press();
    flush(SWAP_MS);
    // A fresh glyph, so its draw replays.
    expect(root.querySelector('path')).not.toBe(firstCheck);
    flush(1000);
    expect(button().getAttribute('aria-label')).toBe('Copied');
    flush(2000);
    expect(button().getAttribute('aria-label')).toBe('Copy to clipboard');
  });

  it('a rejected write falls back and reports a failure when nothing copies', async () => {
    writeText.mockImplementation(() => Promise.reject(new Error('denied')));
    const execCommand = document.execCommand;
    document.execCommand = vi.fn(() => false);
    try {
      const { press, button, host } = setup();
      await press();
      expect(document.execCommand).toHaveBeenCalledWith('copy');
      expect(button().getAttribute('aria-label')).toBe('Copy failed');
      expect(host.copies).toBe(0);
    } finally {
      document.execCommand = execCommand;
    }
  });

  it('does nothing while disabled', async () => {
    const { press, button, root, host } = setup((h) => h.disabled.set(true));
    expect(button().disabled).toBe(true);
    expect(root.classList.contains('opacity-50')).toBe(true);
    expect(root.classList.contains('pointer-events-none')).toBe(true);
    await press();
    expect(writeText).not.toHaveBeenCalled();
    expect(host.copies).toBe(0);
  });
});

describe('InputCopy: structure', () => {
  it('names the button "Copy" plus the visible label', () => {
    const { root, button } = setup((h) => h.label.set('Install command'));
    const label = root.querySelector<HTMLElement>('span[id$="-label"]')!;
    expect(label.textContent?.trim()).toBe('Install command');
    expect(button().getAttribute('aria-label')).toBe('Copy');
    expect(button().getAttribute('aria-labelledby')).toBe(`${button().id} ${label.id}`);
  });

  it('has no labelledby without a label', () => {
    const { button } = setup();
    expect(button().hasAttribute('aria-labelledby')).toBe(false);
    expect(button().type).toBe('button');
  });

  it('shows the value in a mark, before the action when right-aligned', () => {
    const { button } = setup();
    const mark = button().querySelector('mark')!;
    expect(mark.textContent?.trim()).toBe(VALUE);
    const [first] = Array.from(button().children);
    expect(first.contains(mark)).toBe(true);
    expect(first.classList.contains('pl-0')).toBe(true);
  });

  it('puts the action first and pads the value when left-aligned', () => {
    const { button } = setup((h) => {
      h.align.set('left');
      h.label.set('Command');
    });
    const [first, second] = Array.from(button().children);
    expect(first.querySelector('mark')).toBeNull();
    expect(second.querySelector('mark')).not.toBeNull();
    expect(second.classList.contains('pl-1')).toBe(true);
  });

  it('steps the row padding down with the size ladder', () => {
    const { button, fixture, host } = setup();
    const valueSpan = () => button().querySelector('mark')!.parentElement!;
    expect(valueSpan().classList.contains('py-2')).toBe(true);
    host.size.set('compact');
    fixture.detectChanges();
    expect(valueSpan().classList.contains('py-1')).toBe(true);
  });

  it('button variant labels the action Copy, Copied, then Failed on error', async () => {
    const { press, root, flush } = setup((h) => h.variant.set('button'));
    const visibleLabel = () =>
      Array.from(root.querySelectorAll('span.col-start-1:not([aria-hidden])')).map((s) => s.textContent?.trim());
    expect(visibleLabel()).toEqual(['Copy']);
    await press();
    flush(SWAP_MS);
    expect(visibleLabel()).toEqual(['Copied']);
    flush(2000 + SWAP_MS);
    expect(visibleLabel()).toEqual(['Copy']);
    // No tooltip in the button variant.
    expect(document.querySelector('[data-slot="tooltip-popup"]')).toBeNull();
  });
});

describe('InputCopy: tooltip', () => {
  it('opens "Copy to clipboard" after a 500ms hover', () => {
    const { hover, flush, popup } = setup();
    hover();
    flush(499);
    expect(popup()).toBeNull();
    flush(1);
    expect(popup()?.textContent).toContain('Copy to clipboard');
  });

  it('says "Copied" when it was showing as the press began, then suppresses', async () => {
    const { hover, flush, popup, press } = setup();
    hover();
    flush(500);
    await press();
    // Forced open: still showing once any exit would have landed.
    flush(200);
    expect(popup()?.textContent).toContain('Copied');
    flush(1800);
    flush(200);
    expect(popup()).toBeNull();
    // Still suppressed under a resting cursor: no reopen as "Copy to clipboard".
    flush(1000);
    expect(popup()).toBeNull();
  });

  it('a click never summons a tooltip the user was not reading', async () => {
    const { flush, popup, press } = setup();
    await press();
    flush(600);
    expect(popup()).toBeNull();
  });

  it('leaving closes a "Copied" tooltip; coming back re-arms the hover tooltip', async () => {
    const { hover, leave, flush, popup, press } = setup();
    hover();
    flush(500);
    await press();
    flush(200);
    expect(popup()?.textContent).toContain('Copied');
    leave();
    flush(200);
    expect(popup()).toBeNull();
    flush(2000);
    hover();
    flush(500);
    expect(popup()?.textContent).toContain('Copy to clipboard');
  });
});
