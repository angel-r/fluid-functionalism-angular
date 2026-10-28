/**
 * Ported from tests/button-render.test.tsx (a link renders as a plain link,
 * a native button by default) plus one test per rule of the React Button:
 * size resolution, loading, disabled, active, icons and shape.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ShapeProvider } from '../core/shape';
import { SizeProvider, type SizeVariant } from '../core/size';
import type { IconName } from '../core/icons';
import { Button, type ButtonSize, type ButtonVariant } from './button';

@Component({
  imports: [Button, SizeProvider, ShapeProvider],
  template: `
    <div ffSizeProvider [size]="regionSize()" ffShapeProvider [defaultShape]="shape()">
      <button
        ffButton
        data-testid="button"
        class="w-full"
        [variant]="variant()"
        [size]="size()"
        [loading]="loading()"
        [disabled]="disabled()"
        [active]="active()"
        [leadingIcon]="leadingIcon()"
        [trailingIcon]="trailingIcon()"
        (click)="clicked()"
      >
        Save
      </button>
      <button ffButton type="submit" data-testid="submit">Send</button>
      <a ffButton href="/docs" data-testid="link">Read the docs</a>
    </div>
  `,
})
class Host {
  readonly variant = signal<ButtonVariant>('primary');
  readonly size = signal<ButtonSize | undefined>(undefined);
  readonly regionSize = signal<SizeVariant | undefined>(undefined);
  readonly shape = signal<'rounded' | 'pill'>('rounded');
  readonly loading = signal(false);
  readonly disabled = signal(false);
  readonly active = signal(false);
  readonly leadingIcon = signal<IconName | undefined>(undefined);
  readonly trailingIcon = signal<IconName | undefined>(undefined);
  readonly clicked = vi.fn();
}

/** Every token present, in any order (Angular's [class] binding reorders). */
function expectClasses(el: Element, classes: string) {
  for (const token of classes.split(' ')) expect(el.classList).toContain(token);
}

function setup(configure: (host: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const get = (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
  const button = get('button') as HTMLButtonElement;
  const update = (fn: (host: Host) => void) => {
    fn(fixture.componentInstance);
    fixture.detectChanges();
  };
  /** The surface layer: the first, aria-hidden span. */
  const bg = () => button.querySelector<HTMLElement>(':scope > span[aria-hidden="true"]')!;
  return { el, get, button, bg, update, host: fixture.componentInstance };
}

describe('Button: rendering as another element', () => {
  it('renders a plain link on an anchor host', () => {
    const { get } = setup();
    const link = get('link');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/docs');
    expect(link.textContent).toContain('Read the docs');
    expect(link.querySelector('button')).toBeNull();
    // No button semantics bolted onto the link.
    expect(link.getAttribute('role')).toBeNull();
    expect(link.hasAttribute('type')).toBe(false);
    expect(link.hasAttribute('disabled')).toBe(false);
    expectClasses(link, 'group relative isolate inline-flex h-9 px-4 text-background');
  });

  it('still renders a native button by default, type="button" unless set', () => {
    const { button, get } = setup();
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toContain('Save');
    expect(button.getAttribute('type')).toBe('button');
    expect(get('submit').getAttribute('type')).toBe('submit');
  });
});

describe('Button: variants and classes', () => {
  it('primary by default, with the surface layer and the trimmed label', () => {
    const { button, bg } = setup();
    expectClasses(button, 'group relative isolate inline-flex items-center justify-center whitespace-nowrap');
    expectClasses(button, 'text-background h-9 px-4 gap-1.5 rounded-lg w-full');
    expectClasses(bg(), 'absolute inset-px rounded-[inherit] [--btn-bg:var(--foreground)] bg-[var(--btn-bg)]');
    const label = button.querySelector('span.\\[text-box\\:trim-both_cap_alphabetic\\]')!;
    expect(label.textContent?.trim()).toBe('Save');
  });

  it('each variant sets its text color and surface', () => {
    const { button, bg, update } = setup((h) => h.variant.set('secondary'));
    expectClasses(button, 'text-foreground');
    expectClasses(bg(), '[--btn-bg:var(--tint)]');
    update((h) => h.variant.set('tertiary'));
    expectClasses(bg(), 'bg-transparent group-hover:bg-hover');
    update((h) => h.variant.set('ghost'));
    expectClasses(button, 'text-muted-foreground hover:text-foreground');
    expectClasses(bg(), 'bg-transparent shadow-[0_0_0_1px_transparent]');
  });

  it('active forces the pressed surface', () => {
    const { bg, update } = setup((h) => h.active.set(true));
    expectClasses(bg(), '[--btn-bg:color-mix(in_oklab,var(--foreground)_80%,var(--background))]');
    expect(bg().classList).not.toContain('group-hover:[--btn-bg:color-mix(in_oklab,var(--foreground)_90%,var(--background))]');
    update((h) => h.variant.set('ghost'));
    expectClasses(bg(), 'bg-active shadow-[0_0_0_1px_var(--active)]');
  });

  it('takes its radius from the shape context', () => {
    const { button } = setup((h) => h.shape.set('pill'));
    expectClasses(button, 'rounded-[20px]');
  });
});

describe('Button: size resolution', () => {
  it('explicit size, legacy aliases, SizeProvider, default', () => {
    const { button, update } = setup((h) => h.size.set('compact'));
    expectClasses(button, 'h-7 px-3 gap-1');
    update((h) => h.size.set('sm'));
    expectClasses(button, 'h-7 px-3');
    update((h) => h.size.set('lg'));
    expectClasses(button, 'h-9 px-4');
    update((h) => h.size.set('icon-lg'));
    expectClasses(button, 'h-9 p-0 [&_svg]:h-4'); // w-9 yields to the host's w-full, as cn() does in React
    update((h) => h.size.set('icon-sm'));
    expectClasses(button, 'h-7 p-0 [&_svg]:h-3.5');
    update((h) => {
      h.size.set(undefined);
      h.regionSize.set('compact');
    });
    expectClasses(button, 'h-7 px-3');
  });
});

describe('Button: icons', () => {
  it('renders leading and trailing icons at 16px and pulls the padding in', () => {
    const { button } = setup((h) => {
      h.leadingIcon.set('plus');
      h.trailingIcon.set('arrow-right');
    });
    const svgs = button.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
    expect(svgs[0].getAttribute('class')).toContain('lucide-plus');
    expect(svgs[0].getAttribute('class')).toContain('group-hover:stroke-[2]');
    expect(svgs[0].getAttribute('width')).toBe('16');
    expect(svgs[0].getAttribute('stroke-width')).toBe('1.5');
    expect(svgs[1].getAttribute('class')).toContain('lucide-arrow-right');
    expectClasses(button, 'pl-3 pr-3');
  });

  it('compact icons are 14px with 8px edge padding', () => {
    const { button } = setup((h) => {
      h.size.set('compact');
      h.leadingIcon.set('plus');
    });
    expect(button.querySelector('svg')!.getAttribute('width')).toBe('14');
    expectClasses(button, 'pl-2');
  });

  it('an icon-only button shows the projected glyph only, without edge padding', () => {
    const { button } = setup((h) => {
      h.size.set('icon');
      h.leadingIcon.set('plus');
    });
    expect(button.querySelector('svg')).toBeNull();
    expect(button.classList).not.toContain('pl-3');
    expect(button.querySelector('span.\\[\\&_svg\\]\\:stroke-\\[1\\.5\\]')!.textContent?.trim()).toBe('Save');
  });
});

describe('Button: loading and disabled', () => {
  it('loading disables the button, hides the label and shows the spinner', () => {
    const { button, host } = setup((h) => {
      h.loading.set(true);
      h.leadingIcon.set('loader');
    });
    expect(button.disabled).toBe(true);
    const hidden = button.querySelector('span.opacity-0')!;
    expect(hidden.textContent).toContain('Save');
    // The icons stay in the hidden copy at full stroke so the width holds.
    expect(hidden.querySelector('svg')!.getAttribute('stroke-width')).toBe('2');
    const spinner = button.querySelector('span.absolute.inset-0 svg')!;
    expect(spinner.getAttribute('class')).toBe('h-9 w-9');
    const path = spinner.querySelector('path')!;
    expect(path.getAttribute('pathLength')).toBe('100');
    expect(path.getAttribute('style')).toContain('spinner-move 2s linear infinite');
    button.click();
    expect(host.clicked).not.toHaveBeenCalled();
  });

  it('the compact spinner follows the 28px height', () => {
    const { button } = setup((h) => {
      h.loading.set(true);
      h.size.set('compact');
    });
    expect(button.querySelector('span.absolute.inset-0 svg')!.getAttribute('class')).toBe('h-7 w-7');
  });

  it('disabled sets the native attribute and blocks clicks', () => {
    const { button, host, update } = setup();
    button.click();
    expect(host.clicked).toHaveBeenCalledTimes(1);
    update((h) => h.disabled.set(true));
    expect(button.disabled).toBe(true);
    expectClasses(button, 'disabled:opacity-50 disabled:pointer-events-none');
    button.click();
    expect(host.clicked).toHaveBeenCalledTimes(1);
  });
});
