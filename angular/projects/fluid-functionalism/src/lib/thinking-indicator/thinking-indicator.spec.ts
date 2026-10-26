/**
 * ThinkingIndicator: one static announcement for screen readers, the morphing
 * glyph, the 4000ms word cycle, the size ladder, and the reduced-motion path
 * (static glyph and label, no cycling).
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ReducedMotion } from '../core/environment';
import { SizeProvider, type SizeVariant } from '../core/size';
import { ThinkingIndicator, thinkingIndicatorPaths, thinkingIndicatorWords } from './thinking-indicator';

@Component({
  imports: [ThinkingIndicator, SizeProvider],
  template: `
    <div ffSizeProvider [size]="regionSize()">
      <ff-thinking-indicator [showIcon]="showIcon()" [size]="size()" class="pl-0" data-testid="indicator" />
    </div>
  `,
})
class Host {
  readonly showIcon = signal(true);
  readonly size = signal<SizeVariant | undefined>(undefined);
  readonly regionSize = signal<SizeVariant | undefined>(undefined);
}

function setup(options: { reduced?: boolean; configure?: (host: Host) => void } = {}) {
  TestBed.configureTestingModule({
    providers: [{ provide: ReducedMotion, useValue: { value: signal(options.reduced ?? false).asReadonly() } }],
  });
  const fixture = TestBed.createComponent(Host);
  options.configure?.(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const indicator = el.querySelector<HTMLElement>('[data-testid="indicator"]')!;
  const display = indicator.querySelector<HTMLElement>(':scope > span[aria-hidden="true"]')!;
  /** The word spans after the width-reserving ghost; the last one is current. */
  const words = () => Array.from(display.children).slice(1) as HTMLElement[];
  const current = () => words().at(-1)!.textContent;
  const update = (fn: (host: Host) => void) => {
    fn(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { fixture, indicator, display, words, current, update };
}

/** Every token present, in any order (Angular's [class] binding reorders). */
function expectClasses(el: Element, classes: string) {
  for (const token of classes.split(' ')) expect(el.classList).toContain(token);
}

afterEach(() => vi.useRealTimers());

describe('ThinkingIndicator', () => {
  it('announces "Thinking…" once and hides the cycling display from screen readers', () => {
    const { indicator, display } = setup();
    expect(indicator.getAttribute('role')).toBe('status');
    expectClasses(indicator, 'flex items-center gap-2 px-3 py-2 pl-0');
    const sr = indicator.querySelector('.sr-only')!;
    expect(sr.textContent).toBe('Thinking…');
    expectClasses(display, 'inline-grid overflow-hidden');
    expect(display.style.fontVariationSettings).toContain("'wght' 400");
  });

  it('reserves the longest word with an invisible shimmer copy', () => {
    const { display } = setup();
    const ghost = display.children[0] as HTMLElement;
    expect(ghost.textContent).toBe('Moonwalking');
    expectClasses(ghost, 'col-start-1 row-start-1 invisible shimmer-text');
  });

  it('starts on the first word with no entrance (initial={false})', () => {
    const { words, current } = setup();
    expect(words().length).toBe(1);
    expect(current()).toBe(thinkingIndicatorWords[0]);
    expectClasses(words()[0], 'col-start-1 row-start-1 shimmer-text');
    expect(words()[0].style.opacity).toBe('');
  });

  it('moves to the next word every 4000ms and wraps around', () => {
    vi.useFakeTimers();
    const { current } = setup();
    vi.advanceTimersByTime(3999);
    expect(current()).toBe('Thinking');
    vi.advanceTimersByTime(1);
    expect(current()).toBe('Moonwalking');
    vi.advanceTimersByTime(4000);
    expect(current()).toBe('Planning');
    vi.advanceTimersByTime(8000);
    expect(current()).toBe('Thinking');
  });

  it('stops cycling when destroyed', () => {
    vi.useFakeTimers();
    const { fixture, display } = setup();
    const clear = vi.spyOn(globalThis, 'clearInterval');
    fixture.destroy();
    expect(clear).toHaveBeenCalled();
    vi.advanceTimersByTime(8000);
    // A live cycle would have reached "Planning" by now.
    expect(display.textContent).not.toContain('Planning');
  });

  it('renders the morphing glyph, 20px by default and 18px compact', () => {
    const { indicator, update } = setup();
    const svg = indicator.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('width')).toBe('20');
    expect(svg.getAttribute('stroke-width')).toBe('1.5');
    expect(svg.getAttribute('class')).toBe('text-muted-foreground shrink-0');
    expect(svg.querySelector('path')!.getAttribute('d')).toBe(thinkingIndicatorPaths.circleA);
    update((h) => h.size.set('compact'));
    expect(indicator.querySelector('svg')!.getAttribute('width')).toBe('18');
    expect(indicator.querySelector('svg')!.getAttribute('height')).toBe('18');
  });

  it('follows the surrounding SizeProvider, explicit size wins', () => {
    const { indicator, display, update } = setup({ configure: (h) => h.regionSize.set('compact') });
    expect(indicator.querySelector('svg')!.getAttribute('width')).toBe('18');
    expectClasses(display, 'text-[length:var(--fs-body-compact,12px)] leading-[var(--lh-body-compact,18px)]');
    update((h) => h.size.set('default'));
    expect(indicator.querySelector('svg')!.getAttribute('width')).toBe('20');
    expectClasses(display, 'text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)]');
  });

  it('showIcon=false renders a text-only indicator', () => {
    const { indicator } = setup({ configure: (h) => h.showIcon.set(false) });
    expect(indicator.querySelector('svg')).toBeNull();
    expect(indicator.querySelector('.sr-only')).not.toBeNull();
  });

  it('reduced motion shows a static infinity glyph and the first word, no cycling', () => {
    vi.useFakeTimers();
    const { indicator, words, current } = setup({ reduced: true });
    expect(indicator.querySelector('path')!.getAttribute('d')).toBe(thinkingIndicatorPaths.infinity);
    vi.advanceTimersByTime(12000);
    expect(words().length).toBe(1);
    expect(current()).toBe('Thinking');
  });
});
