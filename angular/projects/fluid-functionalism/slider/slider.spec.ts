/**
 * Slider behavior through the public components. Ports the slider case of
 * tests/omit.test.tsx (engine routing by presence, HTML attributes on the
 * root) and the slider lookup tests/color-picker-sync.test.tsx relies on
 * (`[aria-label="Hue"] [role="slider"]`), plus one test per rule of the React
 * source: the ARIA slider pattern on the hidden thumbs, pointer presses and
 * drags snapped to the grid, range thumbs, discrete step lists, click-to-edit
 * values, the hover preview tooltip and the disabled state.
 */
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { Slider, SliderComfortable } from './slider';
import type { SliderStyle, SliderValue, SliderVariant, ValuePosition } from './slider-math';
import type { SizeVariant } from '../core/size';

@Component({
  imports: [Slider],
  template: `
    <ff-slider
      data-testid="slider"
      class="w-72"
      [attr.aria-label]="ariaLabel()"
      [(value)]="value"
      (valueChange)="changes.push($event)"
      [size]="size()"
      [variant]="variant()"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [steps]="steps()"
      [showSteps]="showSteps()"
      [showValue]="showValue()"
      [valuePosition]="valuePosition()"
      [formatValue]="formatValue()"
      [label]="label()"
      [disabled]="disabled()"
      [hideFill]="hideFill()"
      [trackStyle]="trackStyle()"
      [thumbColor]="thumbColor()"
      [thumbBorderColor]="thumbBorderColor()"
    />
  `,
})
class Host {
  readonly value = signal<SliderValue>(40);
  readonly changes: SliderValue[] = [];
  readonly ariaLabel = signal<string | null>(null);
  readonly size = signal<SizeVariant | undefined>(undefined);
  readonly variant = signal<SliderVariant>('pips');
  readonly min = signal(0);
  readonly max = signal(100);
  readonly step = signal(1);
  readonly steps = signal<number[] | undefined>(undefined);
  readonly showSteps = signal<boolean | undefined>(undefined);
  readonly showValue = signal<boolean | undefined>(undefined);
  readonly valuePosition = signal<ValuePosition | undefined>(undefined);
  readonly formatValue = signal<(v: number) => string>(String);
  readonly label = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly hideFill = signal<boolean | undefined>(undefined);
  readonly trackStyle = signal<SliderStyle | undefined>(undefined);
  readonly thumbColor = signal<string | undefined>(undefined);
  readonly thumbBorderColor = signal<string | undefined>(undefined);
}

function setup(configure: (host: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  return harness(fixture);
}

function harness(fixture: ComponentFixture<Host>) {
  const root = () => fixture.nativeElement.querySelector('[data-testid="slider"]') as HTMLElement;
  const thumbs = () => Array.from(root().querySelectorAll<HTMLElement>('[role="slider"]'));
  const track = () => root().querySelector<HTMLElement>('[data-slot="slider-track"]')!;
  const row = () => root().querySelector<HTMLElement>('[data-slot="slider-row"]')!;
  const key = (thumb: HTMLElement, k: string, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
    thumb.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };
  return { fixture, host: fixture.componentInstance, root, thumbs, track, row, key };
}

/** jsdom has no layout: give an element a width and a left edge. */
function layout(el: HTMLElement, width: number, left = 0) {
  Object.defineProperty(el, 'offsetWidth', { configurable: true, value: width });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: width });
  el.getBoundingClientRect = () =>
    ({ left, width, top: 0, height: 32, right: left + width, bottom: 32, x: left, y: 0, toJSON() {} }) as DOMRect;
  el.setPointerCapture = vi.fn();
}

function pointer(target: HTMLElement, type: string, clientX: number, init: { button?: number; pointerType?: string } = {}) {
  const Ctor = (globalThis.PointerEvent ?? MouseEvent) as typeof MouseEvent;
  const event = new Ctor(type, { clientX, button: init.button ?? 0, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
  target.dispatchEvent(event);
  return event;
}

describe('Slider: engine routing (tests/omit.test.tsx)', () => {
  it('a number at the default step renders the comfortable row; compact-only props pick the compact design', () => {
    const comfortable = setup((h) => h.label.set('Volume'));
    expect(comfortable.root().getAttribute('data-testid')).toBe('slider');
    expect(comfortable.row()).toBeTruthy();
    expect(comfortable.track()).toBeNull();
    const comfortableMarkup = comfortable.root().innerHTML;
    comfortable.fixture.destroy();

    // Presence, not truthiness: an explicit false still routes.
    const compact = setup((h) => {
      h.label.set('Volume');
      h.showValue.set(false);
    });
    expect(compact.track()).toBeTruthy();
    expect(compact.row()).toBeNull();
    expect(compact.root().innerHTML).not.toBe(comfortableMarkup);
    expect(compact.root().hasAttribute('showvalue')).toBe(false);
  });

  it('an array value or size="compact" renders the compact design', () => {
    expect(setup((h) => h.value.set([20, 60])).track()).toBeTruthy();
    expect(setup((h) => h.size.set('compact')).track()).toBeTruthy();
  });

  it('keeps HTML attributes and classes on the root, where the color picker finds the thumb', () => {
    const { root } = setup((h) => {
      h.ariaLabel.set('Hue');
      h.showValue.set(false);
      h.hideFill.set(true);
      h.value.set(120);
      h.max.set(360);
    });
    expect(root().classList.contains('w-72')).toBe(true);
    const thumb = root().ownerDocument.querySelector('[aria-label="Hue"] [role="slider"]');
    expect(thumb?.getAttribute('aria-valuenow')).toBe('120');
  });
});

describe('Slider: hidden primitive mirrors Radix Slider boxes', () => {
  const parts = (root: HTMLElement) => {
    const thumb = root.querySelector<HTMLElement>('[role="slider"]')!;
    const wrapper = thumb.parentElement!;
    const primitive = wrapper.parentElement!;
    const range = primitive.firstElementChild!.firstElementChild as HTMLElement;
    return { thumb, wrapper, primitive, range };
  };

  it('compact: span root > span track > span range, thumb in a wrapper offset to stay in bounds', () => {
    const { root } = setup((h) => {
      h.size.set('compact');
      h.value.set(25);
    });
    const { thumb, wrapper, primitive, range } = parts(root());
    expect(primitive.tagName).toBe('SPAN');
    expect(primitive.classList.contains('opacity-0')).toBe(true);
    expect(primitive.style.getPropertyValue('--radix-slider-thumb-transform')).toBe('translateX(-50%)');
    expect(primitive.firstElementChild!.tagName).toBe('SPAN');
    expect(range.style.left).toBe('0%');
    expect(range.style.right).toBe('75%');
    expect(wrapper.tagName).toBe('SPAN');
    expect(wrapper.style.position).toBe('absolute');
    expect(wrapper.style.transform).toBe('var(--radix-slider-thumb-transform)');
    expect(wrapper.style.left).toBe('calc(25% + 5px)');
    expect(thumb.style.position).toBe('');
  });

  it('range: the range span runs between the two thumbs', () => {
    const { root } = setup((h) => h.value.set([20, 60]));
    const { range } = parts(root());
    expect(range.style.left).toBe('20%');
    expect(range.style.right).toBe('40%');
  });

  it('comfortable: a block host and an unsized thumb with no in-bounds offset', () => {
    const { root } = setup((h) => h.value.set(50));
    const host = root().querySelector<HTMLElement>('ff-slider-comfortable')!;
    expect(getComputedStyle(host).display).toBe('block');
    const { wrapper, primitive } = parts(root());
    expect(primitive.tagName).toBe('SPAN');
    expect(wrapper.style.left).toBe('calc(50% + 0px)');
  });
});

describe('Slider (compact): the ARIA slider pattern', () => {
  it('exposes role, value range, orientation and the label', () => {
    const { thumbs } = setup((h) => {
      h.size.set('compact');
      h.label.set('Volume');
    });
    expect(thumbs()).toHaveLength(1);
    const [thumb] = thumbs();
    expect(thumb.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb.getAttribute('aria-valuemax')).toBe('100');
    expect(thumb.getAttribute('aria-valuenow')).toBe('40');
    expect(thumb.getAttribute('aria-label')).toBe('Volume');
    expect(thumb.getAttribute('aria-orientation')).toBe('horizontal');
    expect(thumb.getAttribute('tabindex')).toBe('0');
    expect(thumb.hasAttribute('aria-valuetext')).toBe(false);
  });

  it('arrows move one step, Shift+arrows and PageUp/PageDown ten, Home/End the ends', () => {
    const { thumbs, key, host } = setup((h) => h.size.set('compact'));
    const thumb = thumbs()[0];
    expect(key(thumb, 'ArrowRight').defaultPrevented).toBe(true);
    expect(host.value()).toBe(41);
    key(thumb, 'ArrowUp');
    expect(host.value()).toBe(42);
    key(thumb, 'ArrowLeft');
    key(thumb, 'ArrowDown');
    expect(host.value()).toBe(40);
    key(thumb, 'ArrowRight', { shiftKey: true });
    expect(host.value()).toBe(50);
    key(thumb, 'PageDown');
    expect(host.value()).toBe(40);
    key(thumb, 'PageUp');
    expect(host.value()).toBe(50);
    key(thumb, 'End');
    expect(host.value()).toBe(100);
    expect(thumb.getAttribute('aria-valuenow')).toBe('100');
    key(thumb, 'Home');
    expect(host.value()).toBe(0);
    expect(host.changes).toEqual([41, 42, 41, 40, 50, 40, 50, 100, 0]);
  });

  it('stops at the ends and ignores other keys', () => {
    const { thumbs, key, host } = setup((h) => {
      h.size.set('compact');
      h.value.set(100);
    });
    key(thumbs()[0], 'ArrowRight');
    expect(key(thumbs()[0], 'a').defaultPrevented).toBe(false);
    expect(host.value()).toBe(100);
    expect(host.changes).toEqual([]);
  });

  it('keeps keyboard values on the step grid', () => {
    const { thumbs, key, host } = setup((h) => {
      h.size.set('compact');
      h.value.set(0.2);
      h.max.set(1);
      h.step.set(0.1);
    });
    key(thumbs()[0], 'ArrowRight');
    expect(host.value()).toBe(0.3);
  });
});

describe('Slider (compact): range mode', () => {
  it('renders two labelled thumbs and moves only the focused one, never past its sibling', () => {
    const { thumbs, key, host } = setup((h) => {
      h.value.set([20, 22]);
      h.label.set('Price');
    });
    const [lo, hi] = thumbs();
    expect(lo.getAttribute('aria-label')).toBe('Price minimum');
    expect(hi.getAttribute('aria-label')).toBe('Price maximum');
    key(lo, 'ArrowLeft');
    expect(host.value()).toEqual([19, 22]);
    key(hi, 'End');
    expect(host.value()).toEqual([19, 100]);
    key(lo, 'End');
    expect(host.value()).toEqual([100, 100]);
    key(hi, 'Home');
    expect(host.value()).toEqual([100, 100]);
  });

  it('names unlabelled thumbs Minimum and Maximum', () => {
    const { thumbs } = setup((h) => h.value.set([25, 75]));
    expect(thumbs().map((t) => t.getAttribute('aria-label'))).toEqual(['Minimum', 'Maximum']);
  });

  it('shows both ends in the value label', () => {
    const { root } = setup((h) => {
      h.value.set([25, 75]);
      h.formatValue.set((v) => `${v}%`);
    });
    expect(root().textContent).toContain('25%—75%');
  });
});

describe('Slider (compact): discrete steps', () => {
  const RATINGS = [0.1, 0.5, 0.7, 1.1, 1.3];

  it('runs the thumb on list indices, announces the formatted value and walks the list', () => {
    const { thumbs, key, host, root } = setup((h) => {
      h.value.set(0.7);
      h.steps.set(RATINGS);
      h.showSteps.set(true);
      h.label.set('Rating');
      h.formatValue.set((v) => `${v} A`);
    });
    const thumb = thumbs()[0];
    expect(thumb.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb.getAttribute('aria-valuemax')).toBe('4');
    expect(thumb.getAttribute('aria-valuenow')).toBe('2');
    expect(thumb.getAttribute('aria-valuetext')).toBe('0.7 A');
    key(thumb, 'ArrowRight');
    expect(host.value()).toBe(1.1);
    expect(thumb.getAttribute('aria-valuetext')).toBe('1.1 A');
    key(thumb, 'Home');
    expect(host.value()).toBe(0.1);
    // One dot per list entry.
    expect(root().querySelectorAll('[data-slot="slider-step-dot"]')).toHaveLength(5);
  });

  it('the value ghost reserves the width of the list maximum, not the max prop', () => {
    const { root } = setup((h) => {
      h.value.set(0.7);
      h.steps.set(RATINGS);
      h.label.set('Rating');
      h.formatValue.set((v) => `${v} A`);
    });
    const ghost = root().querySelector('.invisible.whitespace-nowrap');
    expect(ghost?.textContent?.trim()).toBe('Rating: 1.3 A');
  });

  it('draws one dot per grid step with showSteps', () => {
    const { root } = setup((h) => {
      h.step.set(25);
      h.showSteps.set(true);
    });
    expect(root().querySelectorAll('[data-slot="slider-step-dot"]')).toHaveLength(5);
  });
});

describe('Slider (compact): pointer', () => {
  // 220px track → 200px of thumb travel, 10px inset each end.
  it('a press snaps to the grid, captures the pointer, and a drag follows until release', () => {
    const { track, host, fixture } = setup((h) => h.size.set('compact'));
    const el = track();
    layout(el, 220);
    const down = pointer(el, 'pointerdown', 110);
    fixture.detectChanges();
    expect(down.defaultPrevented).toBe(true);
    expect(el.setPointerCapture).toHaveBeenCalledWith(1);
    expect(host.value()).toBe(50);

    pointer(el, 'pointermove', 160);
    fixture.detectChanges();
    expect(host.value()).toBe(75);
    // A drag sets the thumb under the cursor (no spring): 75% of 200px.
    const thumbVisual = el.querySelector<HTMLElement>('[data-slot="slider-thumb"]')!;
    expect(thumbVisual.style.transform).toBe('translateX(150px)');

    pointer(el, 'pointerup', 160);
    pointer(el, 'pointermove', 20);
    fixture.detectChanges();
    expect(host.value()).toBe(75);
  });

  it('presses past the ends clamp to min and max', () => {
    const { track, host, fixture } = setup((h) => h.size.set('compact'));
    layout(track(), 220);
    pointer(track(), 'pointerdown', -6);
    fixture.detectChanges();
    expect(host.value()).toBe(0);
    pointer(track(), 'pointermove', 400);
    fixture.detectChanges();
    expect(host.value()).toBe(100);
  });

  it('ignores secondary mouse buttons', () => {
    const { track, host, fixture } = setup((h) => h.size.set('compact'));
    layout(track(), 220);
    pointer(track(), 'pointerdown', 110, { button: 2 });
    fixture.detectChanges();
    expect(host.value()).toBe(40);
  });

  it('snaps presses to the nearest list entry', () => {
    const { track, host, fixture } = setup((h) => {
      h.value.set(0.1);
      h.steps.set([0.1, 0.5, 0.7, 1.1, 1.3]);
    });
    layout(track(), 220);
    // 0.75 of the travel → 1.0 raw → nearest entry 1.1.
    pointer(track(), 'pointerdown', 160);
    fixture.detectChanges();
    expect(host.value()).toBe(1.1);
  });
});

describe('Slider (compact): value display', () => {
  it('shows the label and formatted value, and hides it with showValue=false or in tooltip mode', () => {
    const shown = setup((h) => {
      h.size.set('compact');
      h.label.set('Opacity');
      h.formatValue.set((v) => `${v}%`);
    });
    expect(shown.root().textContent).toContain('Opacity: 40%');
    expect(setup((h) => h.showValue.set(false)).root().textContent).not.toContain('40');
    expect(setup((h) => h.valuePosition.set('tooltip')).root().textContent).not.toContain('40');
  });

  it('places the value before the track for left/top and after it for right/bottom', () => {
    const order = (position: ValuePosition) => {
      const { root, track } = setup((h) => h.valuePosition.set(position));
      const display = root().querySelector('[ffSliderValueDisplay], span.inline-grid')!;
      return display.compareDocumentPosition(track()) & Node.DOCUMENT_POSITION_FOLLOWING ? 'before' : 'after';
    };
    expect(order('left')).toBe('before');
    expect(order('top')).toBe('before');
    expect(order('right')).toBe('after');
    expect(order('bottom')).toBe('after');
  });

  it('click-to-edit: Enter commits the clamped, snapped number', () => {
    const { root, host, fixture } = setup((h) => {
      h.size.set('compact');
      h.step.set(5);
      h.formatValue.set((v) => `${v}%`);
    });
    const valueText = Array.from(root().querySelectorAll<HTMLElement>('span.cursor-text')).find((s) => s.textContent === '40%')!;
    valueText.click();
    fixture.detectChanges();
    const input = root().querySelector<HTMLInputElement>('input[type="number"]')!;
    expect(input.getAttribute('aria-label')).toBe('Edit slider value');
    // Seeded with the raw number, not the formatted "40%".
    expect(input.value).toBe('40');
    input.value = '62';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(host.value()).toBe(60);
    expect(root().querySelector('input[type="number"]')).toBeNull();

    root().querySelector<HTMLElement>('span.cursor-text')!.click();
    fixture.detectChanges();
    const again = root().querySelector<HTMLInputElement>('input[type="number"]')!;
    again.value = '500';
    again.dispatchEvent(new Event('input'));
    again.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(host.value()).toBe(100);
  });

  it('Escape and unparseable input cancel without a change', () => {
    const { root, host, fixture } = setup((h) => h.size.set('compact'));
    const open = () => {
      root().querySelector<HTMLElement>('span.cursor-text')!.click();
      fixture.detectChanges();
      return root().querySelector<HTMLInputElement>('input[type="number"]')!;
    };
    let input = open();
    input.value = '90';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(root().querySelector('input[type="number"]')).toBeNull();
    input = open();
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(root().querySelector('input[type="number"]')).toBeNull();
    expect(host.value()).toBe(40);
    expect(host.changes).toEqual([]);
  });

  it('labels range edit inputs start and end', () => {
    const { root, fixture } = setup((h) => h.value.set([25, 75]));
    root().querySelectorAll<HTMLElement>('span.cursor-text')[1].click();
    fixture.detectChanges();
    expect(root().querySelector('input')!.getAttribute('aria-label')).toBe('Edit slider value (end)');
  });
});

describe('Slider (compact): hover preview', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the snapped hover value after 100ms and hides it on leave', () => {
    vi.useFakeTimers();
    const { root, track, fixture } = setup((h) => {
      h.size.set('compact');
      h.formatValue.set((v) => `${v}%`);
    });
    layout(track(), 220);
    const area = track().parentElement!;
    area.dispatchEvent(new Event('pointerenter'));
    area.dispatchEvent(new MouseEvent('mousemove', { clientX: 160, bubbles: true }));
    fixture.detectChanges();
    expect(root().querySelector('[data-slot="slider-hover-tooltip"]')).toBeNull();
    vi.advanceTimersByTime(100);
    fixture.detectChanges();
    expect(root().querySelector('[data-slot="slider-hover-tooltip"]')?.textContent?.trim()).toBe('75%');
    area.dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
    expect(root().querySelector('[data-slot="slider-hover-tooltip"]')).toBeNull();
  });
});

describe('Slider (compact): disabled', () => {
  it('drops the thumb from the tab order, ignores keys and presses, and dims the root', () => {
    const { thumbs, key, track, host, fixture, root } = setup((h) => {
      h.size.set('compact');
      h.disabled.set(true);
    });
    const thumb = thumbs()[0];
    expect(thumb.hasAttribute('tabindex')).toBe(false);
    expect(thumb.getAttribute('aria-disabled')).toBe('true');
    expect(thumb.hasAttribute('data-disabled')).toBe(true);
    key(thumb, 'ArrowRight');
    layout(track(), 220);
    pointer(track(), 'pointerdown', 200);
    fixture.detectChanges();
    expect(host.value()).toBe(40);
    expect(root().querySelector('.opacity-50.pointer-events-none')).toBeTruthy();
  });
});

describe('Slider (compact): track styling', () => {
  it('applies trackStyle, hideFill and thumb colors', () => {
    const { root } = setup((h) => {
      h.hideFill.set(true);
      h.trackStyle.set({ background: 'red', borderWidth: 0 });
      h.thumbColor.set('rgb(0, 0, 255)');
      h.thumbBorderColor.set('rgb(255, 255, 255)');
    });
    const bg = root().querySelector<HTMLElement>('[data-slot="slider-track-bg"]')!;
    expect(bg.style.background).toContain('red');
    expect(bg.style.borderWidth).toBe('0px');
    expect(root().querySelector('[data-slot="slider-fill"]')).toBeNull();
    const knob = root().querySelector<HTMLElement>('[data-slot="slider-thumb"] > span')!;
    expect(knob.style.backgroundColor).toBe('rgb(0, 0, 255)');
    expect(knob.style.border).toContain('rgb(255, 255, 255)');
  });
});

describe('Slider (default step): comfortable design', () => {
  it('shows the label and formatted value and exposes one labelled slider', () => {
    const { root, thumbs } = setup((h) => {
      h.label.set('Quality');
      h.value.set(2);
      h.max.set(4);
      h.formatValue.set((v) => ['Off', 'Low', 'Medium', 'High', 'Ultra'][v]);
    });
    expect(thumbs()).toHaveLength(1);
    expect(thumbs()[0].getAttribute('aria-label')).toBe('Quality');
    expect(thumbs()[0].getAttribute('aria-valuemax')).toBe('4');
    expect(root().textContent).toContain('Quality');
    expect(root().textContent).toContain('Medium');
  });

  it('pips draws one dot per step; the scrubber draws none and has a grab handle', () => {
    const pips = setup((h) => h.max.set(4));
    expect(pips.root().querySelectorAll('[data-slot="slider-pip"]')).toHaveLength(5);
    const scrubber = setup((h) => h.variant.set('scrubber'));
    expect(scrubber.root().querySelectorAll('[data-slot="slider-pip"]')).toHaveLength(0);
    expect(scrubber.root().querySelector('[data-slot="slider-handle"]')).toBeTruthy();
  });

  it('keyboard changes the value and its text', () => {
    const { thumbs, key, host, root } = setup((h) => h.label.set('Volume'));
    key(thumbs()[0], 'ArrowRight');
    expect(host.value()).toBe(41);
    expect(root().textContent).toContain('41');
  });

  it('a press on the row jumps to the nearest pip; a drag follows; release ends it', () => {
    const { row, host, fixture } = setup((h) => {
      h.value.set(0);
      h.max.set(4);
    });
    layout(row(), 300);
    pointer(row(), 'pointerdown', 225);
    fixture.detectChanges();
    expect(host.value()).toBe(3);
    expect(row().setPointerCapture).toHaveBeenCalledWith(1);
    pointer(row(), 'pointermove', 40);
    fixture.detectChanges();
    expect(host.value()).toBe(1);
    pointer(row(), 'pointerup', 40);
    pointer(row(), 'pointermove', 300);
    fixture.detectChanges();
    expect(host.value()).toBe(1);
  });

  it('the scrubber maps presses continuously onto the step grid, the handle too', () => {
    const { row, host, fixture, root } = setup((h) => h.variant.set('scrubber'));
    layout(row(), 300);
    pointer(row(), 'pointerdown', 90);
    fixture.detectChanges();
    expect(host.value()).toBe(30);
    pointer(row(), 'pointerup', 90);
    const handle = root().querySelector<HTMLElement>('[data-slot="slider-handle"]')!;
    handle.setPointerCapture = vi.fn();
    pointer(handle, 'pointerdown', 150);
    fixture.detectChanges();
    expect(host.value()).toBe(50);
    pointer(handle, 'pointermove', 297);
    fixture.detectChanges();
    expect(host.value()).toBe(99);
  });

  it('disabled ignores presses and keys and dims the row', () => {
    const { row, thumbs, key, host, fixture } = setup((h) => h.disabled.set(true));
    layout(row(), 300);
    pointer(row(), 'pointerdown', 250);
    key(thumbs()[0], 'End');
    fixture.detectChanges();
    expect(host.value()).toBe(40);
    expect(row().classList.contains('opacity-50')).toBe(true);
    expect(thumbs()[0].hasAttribute('tabindex')).toBe(false);
  });
});

@Component({
  imports: [SliderComfortable],
  template: `<ff-slider-comfortable [(value)]="value" label="Roundness" [min]="0" [max]="4" class="h-10" />`,
})
class ComfortableHost {
  readonly value = signal(2);
}

describe('SliderComfortable (deprecated alias)', () => {
  it('renders the comfortable design directly, with the class on the row', () => {
    const fixture = TestBed.createComponent(ComfortableHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const row = el.querySelector<HTMLElement>('[data-slot="slider-row"]')!;
    expect(row.classList.contains('h-10')).toBe(true);
    const thumb = el.querySelector<HTMLElement>('[role="slider"]')!;
    thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(3);
  });
});
