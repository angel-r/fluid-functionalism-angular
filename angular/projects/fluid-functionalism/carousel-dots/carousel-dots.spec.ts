/**
 * CarouselDots through its public interface: one labelled button per slide,
 * the current one marked and filled, clicks and the autoplay clock reported
 * through `value`/`valueChange`, and reduced motion turning the clock off.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { motionValue } from 'motion';
import { afterEach, vi } from 'vitest';
import { ReducedMotion } from '../core/environment';
import { CarouselDots, type CarouselDotsAutoplay } from './carousel-dots';

@Component({
  imports: [CarouselDots],
  template: `
    <ff-carousel-dots
      data-testid="dots"
      class="mt-2"
      [count]="count()"
      [(value)]="value"
      (valueChange)="changes.push($event)"
      [autoplay]="autoplay()"
      [progress]="progress()"
      [getLabel]="getLabel()"
    />
  `,
})
class Host {
  readonly count = signal(4);
  readonly value = signal(0);
  readonly autoplay = signal<boolean | CarouselDotsAutoplay | undefined>(undefined);
  readonly progress = signal<number | ReturnType<typeof motionValue<number>> | undefined>(undefined);
  readonly getLabel = signal<(index: number) => string>((i) => `Go to slide ${i + 1}`);
  readonly changes: number[] = [];
}

function setup(configure: (host: Host) => void = () => {}, reduced = false) {
  if (reduced) {
    TestBed.configureTestingModule({
      providers: [{ provide: ReducedMotion, useValue: { value: signal(true).asReadonly() } }],
    });
  }
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const root = el.querySelector<HTMLElement>('[data-testid="dots"]')!;
  const buttons = () => Array.from(root.querySelectorAll<HTMLButtonElement>('button'));
  const fill = () => root.querySelector<HTMLElement>('button[aria-current="true"] span span');
  return { fixture, host: fixture.componentInstance, root, buttons, fill };
}

const fillAt = (p: number) => `translateX(calc(${p - 1} * (100% - 6px)))`;
/** The progress a fill transform encodes. */
const progressOf = (transform: string) => Number(/calc\((-?[\d.]+) \*/.exec(transform)![1]) + 1;

afterEach(() => vi.useRealTimers());

describe('CarouselDots: structure', () => {
  it('renders a labelled group with one button per slide', () => {
    const { root, buttons } = setup();
    expect(root.getAttribute('role')).toBe('group');
    expect(root.getAttribute('aria-label')).toBe('Slides');
    for (const c of ['relative', 'flex', 'w-fit', 'items-center', 'mt-2']) expect(root.classList).toContain(c);
    expect(buttons().map((b) => b.getAttribute('aria-label'))).toEqual([
      'Go to slide 1',
      'Go to slide 2',
      'Go to slide 3',
      'Go to slide 4',
    ]);
    expect(buttons().every((b) => b.type === 'button')).toBe(true);
  });

  it('uses getLabel for each accessible name', () => {
    const { buttons } = setup((h) => h.getLabel.set((i) => `Show ${['A', 'B', 'C', 'D'][i]}`));
    expect(buttons()[2].getAttribute('aria-label')).toBe('Show C');
  });

  it('marks only the current dot, and only it carries the fill', () => {
    const { buttons, fixture, host } = setup((h) => h.value.set(1));
    expect(buttons().map((b) => b.getAttribute('aria-current'))).toEqual([null, 'true', null, null]);
    expect(buttons().filter((b) => b.querySelector('span span')).length).toBe(1);
    host.value.set(3);
    fixture.detectChanges();
    expect(buttons().map((b) => b.getAttribute('aria-current'))).toEqual([null, null, null, 'true']);
  });

  it('follows count', () => {
    const { buttons, fixture, host } = setup();
    host.count.set(2);
    fixture.detectChanges();
    expect(buttons().length).toBe(2);
  });

  it('renders a fluid hover highlight around the click areas', () => {
    const { root } = setup();
    expect(root.querySelector('ff-fluid-hover-highlight')).not.toBeNull();
  });
});

describe('CarouselDots: selection', () => {
  it('a click reports the clicked index and moves the current dot', () => {
    const { buttons, host, fixture } = setup();
    buttons()[2].click();
    fixture.detectChanges();
    expect(host.changes).toEqual([2]);
    expect(host.value()).toBe(2);
    expect(buttons()[2].getAttribute('aria-current')).toBe('true');
  });
});

describe('CarouselDots: fill', () => {
  it('a static pill is solid', () => {
    const { fill } = setup();
    expect(fill()!.style.transform).toBe(fillAt(1));
  });

  it('a number progress drives the fill, clamped to 0..1', () => {
    const { fill, host, fixture } = setup((h) => h.progress.set(0.25));
    expect(fill()!.style.transform).toBe(fillAt(0.25));
    host.progress.set(3);
    fixture.detectChanges();
    expect(fill()!.style.transform).toBe(fillAt(1));
  });

  it('a MotionValue progress moves the fill without change detection', () => {
    const mv = motionValue(0.5);
    const { fill } = setup((h) => h.progress.set(mv));
    expect(fill()!.style.transform).toBe(fillAt(0.5));
    mv.set(0.75);
    expect(fill()!.style.transform).toBe(fillAt(0.75));
  });

  it('progress takes precedence over autoplay', () => {
    const { fill } = setup((h) => {
      h.autoplay.set(true);
      h.progress.set(0.4);
    });
    expect(fill()!.style.transform).toBe(fillAt(0.4));
  });
});

describe('CarouselDots: autoplay', () => {
  function fake() {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'clearTimeout'] });
  }

  it('starts empty, fills over duration, then asks for the next slide once', () => {
    fake();
    const { fill, host, fixture } = setup((h) => h.autoplay.set({ duration: 1000 }));
    expect(fill()!.style.transform).toBe(fillAt(0));
    vi.advanceTimersByTime(500);
    expect(progressOf(fill()!.style.transform)).toBeCloseTo(0.5, 1);
    expect(host.changes).toEqual([]);
    vi.advanceTimersByTime(520);
    fixture.detectChanges();
    expect(host.changes).toEqual([1]);
    expect(host.value()).toBe(1);
    // The new slide restarts the fill from empty.
    expect(progressOf(fill()!.style.transform)).toBeLessThan(0.05);
    vi.advanceTimersByTime(3000);
    fixture.detectChanges();
    expect(host.changes.length).toBeGreaterThan(1);
  });

  it('wraps to the first slide after the last by default', () => {
    fake();
    const { host, fixture } = setup((h) => {
      h.value.set(3);
      h.autoplay.set({ duration: 500 });
    });
    vi.advanceTimersByTime(600);
    fixture.detectChanges();
    expect(host.changes).toEqual([0]);
  });

  it('loop: false stops on the last slide with a full pill', () => {
    fake();
    const { host, fill, fixture } = setup((h) => {
      h.value.set(3);
      h.autoplay.set({ duration: 500, loop: false });
    });
    vi.advanceTimersByTime(1500);
    fixture.detectChanges();
    expect(host.changes).toEqual([]);
    expect(fill()!.style.transform).toBe(fillAt(1));
  });

  it('paused holds the fill where it is', () => {
    fake();
    const { host, fill, fixture } = setup((h) => h.autoplay.set({ duration: 1000 }));
    vi.advanceTimersByTime(300);
    host.autoplay.set({ duration: 1000, paused: true });
    fixture.detectChanges();
    const held = fill()!.style.transform;
    vi.advanceTimersByTime(2000);
    expect(fill()!.style.transform).toBe(held);
    expect(host.changes).toEqual([]);
  });

  it('autoplay: true uses the 3000ms default', () => {
    fake();
    const { host, fixture } = setup((h) => h.autoplay.set(true));
    vi.advanceTimersByTime(2800);
    fixture.detectChanges();
    expect(host.changes).toEqual([]);
    vi.advanceTimersByTime(400);
    fixture.detectChanges();
    expect(host.changes).toEqual([1]);
  });

  it('reduced motion turns the timer off', () => {
    fake();
    const { host, fill, fixture } = setup((h) => h.autoplay.set({ duration: 500 }), true);
    vi.advanceTimersByTime(2000);
    fixture.detectChanges();
    expect(host.changes).toEqual([]);
    expect(fill()!.style.transform).toBe(fillAt(0));
  });
});
