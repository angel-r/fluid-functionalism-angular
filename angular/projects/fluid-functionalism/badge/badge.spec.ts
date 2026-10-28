/**
 * Badge: solid and dot variants, the color map, the size ladder (explicit >
 * legacy alias > SizeProvider > default) and the shape-driven radius.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ShapeProvider } from '../core/shape';
import { SizeProvider, type SizeVariant } from '../core/size';
import { Badge, badgeColors, type BadgeColor, type BadgeSize } from './badge';

@Component({
  imports: [Badge, SizeProvider, ShapeProvider],
  template: `
    <div ffSizeProvider [size]="regionSize()" ffShapeProvider [defaultShape]="shape()">
      <ff-badge [variant]="variant()" [color]="color()" [size]="size()" class="ml-1" data-testid="badge">Fiction</ff-badge>
      <span ffBadge color="blue" data-testid="attr">History</span>
    </div>
  `,
})
class Host {
  readonly variant = signal<'solid' | 'dot'>('solid');
  readonly color = signal<BadgeColor>('gray');
  readonly size = signal<BadgeSize | undefined>(undefined);
  readonly regionSize = signal<SizeVariant | undefined>(undefined);
  readonly shape = signal<'rounded' | 'pill'>('rounded');
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
  const badge = el.querySelector<HTMLElement>('[data-testid="badge"]')!;
  const update = (fn: (host: Host) => void) => {
    fn(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { el, badge, update };
}

describe('Badge', () => {
  it('renders a solid gray badge by default on the neutral accent fill', () => {
    const { badge } = setup();
    expectClasses(badge, 'inline-flex items-center whitespace-nowrap');
    expectClasses(badge, 'h-6 px-2.5');
    expectClasses(badge, 'rounded-lg');
    expectClasses(badge, 'ml-1');
    expect(badge.style.backgroundColor).toBe('var(--accent)');
    expect(badge.style.color).toBe('var(--foreground)');
    const label = badge.querySelector('span')!;
    expect(label.className).toBe('[text-box:trim-both_cap_alphabetic]');
    expect(label.textContent).toBe('Fiction');
    expect(badge.querySelectorAll('span').length).toBe(1);
  });

  it('tints a solid color 15% into the page background, text stays foreground', () => {
    const { badge } = setup((h) => h.color.set('red'));
    expect(badge.getAttribute('style')).toContain('color-mix(in srgb, #ef4444 15%, var(--background))');
    expect(badge.style.color).toBe('var(--foreground)');
  });

  it('dot variant draws an outline and a full-strength colored dot, no fill', () => {
    const { badge } = setup((h) => {
      h.variant.set('dot');
      h.color.set('violet');
    });
    expectClasses(badge, 'border border-border text-foreground');
    expect(badge.style.backgroundColor).toBe('');
    const [dot, label] = Array.from(badge.querySelectorAll('span'));
    expect(dot.className).toBe('shrink-0 rounded-full');
    expect(dot.style.width).toBe('7px');
    expect(dot.style.height).toBe('7px');
    expect(dot.style.backgroundColor).toBe('rgb(139, 92, 246)'); // badgeColors.violet, normalized by the DOM
    expect(label.textContent).toBe('Fiction');
  });

  it('a gray dot uses the muted foreground color', () => {
    const { badge } = setup((h) => h.variant.set('dot'));
    expect(badge.querySelector('span')!.style.backgroundColor).toBe('var(--muted-foreground)');
  });

  it('resolves size: explicit, legacy alias, SizeProvider, default', () => {
    const { badge, update } = setup((h) => h.size.set('compact'));
    expectClasses(badge, 'h-5 px-2');
    update((h) => h.size.set('lg'));
    expectClasses(badge, 'h-6 px-2.5');
    update((h) => h.size.set('sm'));
    expectClasses(badge, 'h-5 px-2');
    update((h) => {
      h.size.set(undefined);
      h.regionSize.set('compact');
    });
    expectClasses(badge, 'h-5 px-2');
    update((h) => {
      h.variant.set('dot');
    });
    expect(badge.querySelector('span')!.style.width).toBe('6px');
  });

  it('takes its radius from the shape context', () => {
    const { badge } = setup((h) => h.shape.set('pill'));
    expectClasses(badge, 'rounded-[20px]');
  });

  it('works as an attribute on a native span', () => {
    const { el } = setup();
    const attr = el.querySelector<HTMLElement>('[data-testid="attr"]')!;
    expect(attr.tagName).toBe('SPAN');
    expectClasses(attr, 'inline-flex');
    expect(attr.getAttribute('style')).toContain(badgeColors.blue);
  });
});
