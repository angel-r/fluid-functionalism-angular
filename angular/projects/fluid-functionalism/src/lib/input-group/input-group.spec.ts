/**
 * Input group: labelled fields sharing one fluid hover scope. Each field
 * draws its own state (rest, hovered, focused, error, disabled), wires its
 * label, error and invalid state for assistive tech, and keeps the 16px touch
 * size (tests/touch-fields.test.tsx: fields must not drop fieldTouchClass).
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InputField, InputGroup } from './input-group';
import { fieldTouchClass } from '../core/type-scale';
import type { SizeVariant } from '../core/size';

@Component({
  imports: [InputGroup, InputField],
  template: `
    <ff-input-group [size]="size()" class="extra">
      <ff-input-field
        [index]="0"
        label="Name"
        placeholder="Your name"
        [(value)]="name"
        [labelHidden]="labelHidden()"
        (touch)="touches = touches + 1"
      />
      <ff-input-field
        [index]="1"
        label="Email"
        placeholder="you@example.com"
        icon="mail"
        [(value)]="email"
        [error]="error()"
        [disabled]="disabled()"
        name="email"
        type="email"
      />
    </ff-input-group>
  `,
})
class Host {
  readonly name = signal('');
  readonly email = signal('bad@');
  readonly error = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly labelHidden = signal(false);
  readonly size = signal<SizeVariant | undefined>(undefined);
  touches = 0;
}

function setup(configure: (host: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const fields = Array.from(el.querySelectorAll<HTMLElement>('ff-input-field'));
  const field = (i: number) => {
    const root = fields[i];
    return {
      root,
      label: root.querySelector<HTMLLabelElement>('label')!,
      labelText: root.querySelectorAll<HTMLElement>('label > span')[1],
      input: root.querySelector<HTMLInputElement>('input')!,
      box: root.querySelector<HTMLElement>('[data-slot="input-container"]')!,
      error: root.querySelector<HTMLElement>('[data-slot="input-error"]'),
      // React renders the <svg> straight in the box; ff-icon's host is display: contents.
      icon: root.querySelector<SVGSVGElement>('[data-slot="input-container"] svg'),
    };
  };
  const group = fixture.debugElement.query(By.directive(InputGroup)).componentInstance as InputGroup;
  const flush = () => fixture.detectChanges();
  return { fixture, host: fixture.componentInstance, el, field, group, flush };
}

describe('InputGroup', () => {
  it('renders labelled text fields in a relative column', () => {
    const { el, field } = setup();
    const groupEl = el.querySelector('ff-input-group')!;
    expect(groupEl.className).toContain('relative');
    expect(groupEl.className).toContain('gap-3');
    expect(groupEl.className).toContain('extra');
    const name = field(0);
    expect(name.label.htmlFor).toBe(name.input.id);
    expect(name.labelText.textContent?.trim()).toBe('Name');
    expect(name.labelText.classList).toContain('text-muted-foreground');
    expect(name.input.type).toBe('text');
    expect(name.input.placeholder).toBe('Your name');
    expect(name.root.getAttribute('data-fluid-hover-index')).toBe('0');
    expect(field(1).input.type).toBe('email');
    expect(field(1).input.name).toBe('email');
    expect(field(1).input.value).toBe('bad@');
  });

  it('typing writes the value model, and the model writes the field', () => {
    const { host, field, flush } = setup();
    const { input } = field(0);
    input.value = 'Ada';
    input.dispatchEvent(new Event('input'));
    flush();
    expect(host.name()).toBe('Ada');
    host.name.set('Grace');
    flush();
    expect(input.value).toBe('Grace');
  });

  it('rests frameless, tints when hovered, and lifts to the card surface when focused', () => {
    const { field, group, flush, host } = setup();
    const { box, input, icon } = field(1);
    expect(box.classList).toContain('bg-transparent');
    expect(box.classList).toContain('ring-transparent');
    expect(icon!.classList).toContain('text-muted-foreground');
    expect(icon!.getAttribute('stroke-width')).toBe('1.5');
    expect(box.querySelector('[data-slot="input-icon"]')).toBeNull();

    group.hover.setActiveIndex(1);
    flush();
    expect(box.classList).toContain('bg-muted/50');
    expect(box.classList).toContain('ring-border');
    // Same node, so the CSS transition on color and stroke-width runs.
    expect(field(1).icon).toBe(icon);
    expect(icon!.classList).toContain('text-foreground');
    expect(icon!.getAttribute('stroke-width')).toBe('2');

    group.hover.setActiveIndex(null);
    input.focus();
    flush();
    expect(box.classList).toContain('bg-card');
    expect(box.classList).toContain('ring-border');
    expect(icon!.classList).toContain('text-foreground');
    expect(field(1).root.hasAttribute('data-focused')).toBe(true);

    input.blur();
    flush();
    expect(box.classList).toContain('bg-transparent');
    expect(host.touches).toBe(0);
  });

  it('renders the icon at the size step with the field', () => {
    const { field } = setup();
    const svg = field(1).icon!;
    expect(svg.getAttribute('class')).toContain('lucide-mail');
    expect(svg.getAttribute('width')).toBe('16');
    expect(field(0).icon).toBeNull();
  });

  it('an error shows its message, wires aria, and rings red only on hover or focus', () => {
    const { field, flush, group } = setup((h) => h.error.set('Please enter a valid email address.'));
    const { root, labelText, input, box, error } = field(1);
    expect(error!.textContent?.trim()).toBe('Please enter a valid email address.');
    expect(error!.className).toContain('text-destructive');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(error!.id);
    expect(root.hasAttribute('data-invalid')).toBe(true);
    expect(labelText.classList).toContain('text-destructive');
    expect(box.classList).toContain('ring-transparent');
    group.hover.setActiveIndex(1);
    flush();
    expect(box.classList).toContain('bg-destructive-light/60');
    expect(box.classList).toContain('ring-destructive/50');
    input.focus();
    flush();
    expect(box.classList).toContain('bg-card');
    expect(box.classList).toContain('ring-destructive/50');
  });

  it('no error: no message, no aria-invalid', () => {
    const { field } = setup();
    expect(field(1).error).toBeNull();
    expect(field(1).input.hasAttribute('aria-invalid')).toBe(false);
    expect(field(1).input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('disabled: the input is disabled and the field dims', () => {
    const { field } = setup((h) => h.disabled.set(true));
    const { root, input, box } = field(1);
    expect(input.disabled).toBe(true);
    expect(root.classList).toContain('opacity-50');
    expect(root.classList).toContain('pointer-events-none');
    expect(root.hasAttribute('data-disabled')).toBe(true);
    expect(box.classList).toContain('ring-border');
  });

  it('a hidden label stays for assistive tech', () => {
    const { field } = setup((h) => h.labelHidden.set(true));
    expect(field(0).label.classList).toContain('sr-only');
    expect(field(0).label.htmlFor).toBe(field(0).input.id);
  });

  it('a press anywhere on the field box focuses the input', () => {
    const { field } = setup();
    const { box, input } = field(0);
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    box.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it('keeps the 16px touch size on the input', () => {
    const { field } = setup();
    expect(field(0).input.className.split(/\s+/)).toContain(fieldTouchClass);
  });

  it('the compact size pins fields to the compact step', () => {
    const { field } = setup((h) => h.size.set('compact'));
    expect(field(0).box.classList).toContain('h-7');
    expect(field(0).box.classList).toContain('px-2');
    expect(field(0).label.classList).toContain('pl-2');
    expect(field(1).icon!.getAttribute('width')).toBe('14');
  });

  it('emits touch when the input loses focus', () => {
    const { field, host } = setup();
    field(0).input.focus();
    field(0).input.blur();
    expect(host.touches).toBe(1);
  });
});
