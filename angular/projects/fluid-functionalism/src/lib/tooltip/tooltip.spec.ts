/**
 * Tooltip through its public interface. Ports the upstream "renders its popup
 * when forced open" case (tests/omit.test.tsx) and adds one test per rule of
 * the Base UI behavior the React version relies on: hover delay, instant
 * focus-visible open, close on leave / Escape / press, exit-then-unmount,
 * forceOpen + onOpenChange (the input-copy contract), provider skip-delay
 * grouping, cursor follow, and DI reaching the overlay content.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { ShapeProvider } from '../core/shape';
import { Tooltip, TooltipProvider, type TooltipSide } from './tooltip';

@Component({
  imports: [Tooltip],
  template: `
    <ff-tooltip
      [content]="content()"
      [side]="side()"
      [sideOffset]="sideOffset()"
      [delayDuration]="delayDuration()"
      [forceOpen]="forceOpen()"
      [followCursor]="followCursor()"
      [class]="boxClass()"
      [contentClass]="contentClass()"
      (openChange)="changes.push($event)"
    >
      <button type="button" data-testid="trigger">Share</button>
    </ff-tooltip>
    <button type="button" data-testid="outside">Outside</button>
  `,
})
class Host {
  readonly content = signal('Copy link');
  readonly side = signal<TooltipSide>('top');
  readonly sideOffset = signal(8);
  readonly delayDuration = signal<number | undefined>(undefined);
  readonly forceOpen = signal<boolean | undefined>(undefined);
  readonly followCursor = signal<'x' | 'y' | undefined>(undefined);
  readonly boxClass = signal('');
  readonly contentClass = signal<string | undefined>(undefined);
  readonly changes: boolean[] = [];
}

@Component({
  imports: [Tooltip, ShapeProvider],
  template: `
    <section ffShapeProvider defaultShape="pill">
      <ng-template #rich><span data-testid="rich">Keyboard shortcut</span></ng-template>
      <ff-tooltip [content]="rich" [forceOpen]="true">
        <button type="button">Save</button>
      </ff-tooltip>
    </section>
  `,
})
class RichHost {}

@Component({
  imports: [Tooltip, TooltipProvider],
  template: `
    <div ffTooltipProvider [delayDuration]="400" [skipDelayDuration]="300">
      <ff-tooltip content="A"><button type="button" data-testid="a">A</button></ff-tooltip>
      <ff-tooltip content="B"><button type="button" data-testid="b">B</button></ff-tooltip>
    </div>
  `,
})
class GroupHost {}

const EXIT_FALLBACK_MS = 160; // exitFallbackMs(spring.fast)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] });
  // jsdom reports a 0×0 viewport; the overlay positions against a real one.
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
  const el = fixture.nativeElement as HTMLElement;
  const trigger = el.querySelector<HTMLElement>('[data-testid="trigger"]')!;
  const outside = el.querySelector<HTMLElement>('[data-testid="outside"]')!;
  // jsdom has no layout: give the trigger a box well inside the viewport so
  // the preferred side fits and "away from the popup" has a direction.
  trigger.getBoundingClientRect = () =>
    ({ top: 100, bottom: 120, left: 100, right: 160, width: 60, height: 20, x: 100, y: 100, toJSON() {} }) as DOMRect;
  const popup = () => document.querySelector<HTMLElement>('[data-slot="tooltip-popup"]');
  const box = () => popup()?.firstElementChild as HTMLElement | undefined;
  fixture.detectChanges();
  const flush = (ms = 0) => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };
  const hover = (target = trigger) => {
    target.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse', relatedTarget: outside }));
    fixture.detectChanges();
  };
  const leave = (target = trigger) => {
    // Leaves away from the popup (the tooltip sits on top; this exits below).
    target.dispatchEvent(
      new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: outside, clientY: 500 }),
    );
    fixture.detectChanges();
  };
  return { fixture, host: fixture.componentInstance, trigger, outside, popup, box, flush, hover, leave };
}

describe('Tooltip: forced open (ported from tests/omit.test.tsx)', () => {
  it('renders its popup when forced open', () => {
    const { trigger, popup } = setup((h) => h.forceOpen.set(true));
    expect(trigger.textContent).toContain('Share');
    expect(document.body.textContent).toContain('Copy link');
    expect(popup()).not.toBeNull();
  });
});

describe('Tooltip: hover', () => {
  it('opens after the 200ms default delay and reports it', () => {
    const { hover, flush, popup, host, trigger } = setup();
    hover();
    flush(199);
    expect(popup()).toBeNull();
    flush(1);
    expect(popup()).not.toBeNull();
    expect(popup()!.textContent).toContain('Copy link');
    expect(host.changes).toEqual([true]);
    expect(trigger.hasAttribute('data-popup-open')).toBe(true);
  });

  it('honors delayDuration', () => {
    const { hover, flush, popup } = setup((h) => h.delayDuration.set(500));
    hover();
    flush(400);
    expect(popup()).toBeNull();
    flush(100);
    expect(popup()).not.toBeNull();
  });

  it('delayDuration 0 opens at once', () => {
    const { hover, popup, fixture } = setup((h) => h.delayDuration.set(0));
    hover();
    fixture.detectChanges();
    expect(popup()).not.toBeNull();
  });

  it('leaving before the delay cancels the open', () => {
    const { hover, leave, flush, popup, host } = setup();
    hover();
    flush(100);
    leave();
    flush(500);
    expect(popup()).toBeNull();
    expect(host.changes).toEqual([]);
  });

  it('leaving closes it: the exit plays, then the popup unmounts', () => {
    const { hover, leave, flush, popup, host, trigger } = setup();
    hover();
    flush(200);
    leave();
    expect(host.changes).toEqual([true, false]);
    expect(trigger.hasAttribute('data-popup-open')).toBe(false);
    // Still mounted while the exit runs...
    expect(popup()).not.toBeNull();
    flush(EXIT_FALLBACK_MS);
    // ...and gone once it has had time to finish.
    expect(popup()).toBeNull();
  });

  it('the popup is hoverable: leaving toward it and entering it keeps it open', () => {
    const { hover, flush, popup, host, trigger, fixture } = setup();
    hover();
    flush(200);
    // Exits through the top edge, toward the popup.
    trigger.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', clientY: 99 }));
    fixture.detectChanges();
    flush(50);
    popup()!.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    flush(500);
    expect(popup()).not.toBeNull();
    expect(host.changes).toEqual([true]);
    popup()!.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    fixture.detectChanges();
    flush(EXIT_FALLBACK_MS);
    expect(popup()).toBeNull();
    expect(host.changes).toEqual([true, false]);
  });

  it('ignores touch pointers', () => {
    const { trigger, outside, flush, popup, fixture } = setup();
    trigger.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch', relatedTarget: outside }));
    fixture.detectChanges();
    flush(500);
    expect(popup()).toBeNull();
  });
});

describe('Tooltip: keyboard and press', () => {
  it('opens at once on keyboard focus and closes on blur', () => {
    const { trigger, outside, popup, fixture, flush } = setup();
    // jsdom grants :focus-visible to a scripted focus only after a keydown,
    // and that modality leaks between tests: set it explicitly.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    trigger.focus();
    fixture.detectChanges();
    expect(popup()).not.toBeNull();
    outside.focus();
    fixture.detectChanges();
    flush(EXIT_FALLBACK_MS);
    expect(popup()).toBeNull();
  });

  it('Escape closes it', () => {
    const { hover, flush, popup, host } = setup();
    hover();
    flush(200);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    flush(EXIT_FALLBACK_MS);
    expect(popup()).toBeNull();
    expect(host.changes).toEqual([true, false]);
  });

  it('a click on the trigger closes it, and it stays closed until the pointer leaves', () => {
    const { hover, leave, flush, popup, trigger } = setup();
    hover();
    flush(200);
    trigger.click();
    flush(EXIT_FALLBACK_MS);
    expect(popup()).toBeNull();
    hover();
    flush(500);
    expect(popup()).toBeNull();
    leave();
    hover();
    flush(200);
    expect(popup()).not.toBeNull();
  });
});

describe('Tooltip: forceOpen and openChange', () => {
  it('forceOpen false keeps it closed but still reports the hover', () => {
    const { hover, flush, popup, host } = setup((h) => h.forceOpen.set(false));
    hover();
    flush(200);
    expect(popup()).toBeNull();
    expect(host.changes).toEqual([true]);
  });

  it('forceOpen true stays open on leave and reports the close request', () => {
    const { hover, leave, flush, popup, host } = setup((h) => h.forceOpen.set(true));
    hover();
    flush(200);
    leave();
    flush(EXIT_FALLBACK_MS);
    expect(popup()).not.toBeNull();
    expect(host.changes).toEqual([false]);
  });

  it('dropping forceOpen closes a forced tooltip with its exit', () => {
    const { host, flush, popup } = setup((h) => h.forceOpen.set(true));
    host.forceOpen.set(undefined);
    flush();
    expect(popup()).not.toBeNull();
    flush(EXIT_FALLBACK_MS);
    expect(popup()).toBeNull();
  });
});

describe('Tooltip: content and placement', () => {
  it('styles the content box like the React popup', () => {
    const { box, popup } = setup((h) => {
      h.forceOpen.set(true);
      h.boxClass.set('max-w-xs');
      h.side.set('right');
    });
    const b = box()!;
    for (const c of ['bg-foreground', 'text-background', 'px-2', 'py-1', 'rounded-lg', 'max-w-xs']) {
      expect(b.classList).toContain(c);
    }
    expect(b.className).toContain('[text-box:trim-both_cap_alphabetic]');
    expect(b.style.fontVariationSettings).toContain("'wght' 400");
    expect(popup()!.getAttribute('data-side')).toBe('right');
  });

  it('puts contentClass (and the default z-50) on the positioner', () => {
    const { popup } = setup((h) => {
      h.forceOpen.set(true);
      h.contentClass.set('z-[60]');
    });
    const pane = popup()!.closest('.cdk-overlay-pane')!;
    expect(pane.classList).toContain('z-[60]');
    expect(pane.getAttribute('data-side')).toBe('top');
  });

  it('renders template content with the trigger-side DI (shape) reaching it', () => {
    const fixture = TestBed.createComponent(RichHost);
    fixture.detectChanges();
    fixture.detectChanges();
    const rich = document.querySelector('[data-testid="rich"]')!;
    expect(rich.textContent).toBe('Keyboard shortcut');
    expect(rich.parentElement!.classList).toContain('rounded-[20px]');
  });

  it('followCursor tracks the pointer along its axis', () => {
    const { trigger, popup, fixture } = setup((h) => {
      h.forceOpen.set(true);
      h.followCursor.set('y');
    });
    // 30px below the trigger's center (110).
    trigger.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientY: 140, clientX: 5 }));
    fixture.detectChanges();
    expect(popup()!.style.transform).toBe('translateY(30px)');
  });
});

describe('TooltipProvider: grouped delay', () => {
  it('uses the provider delay, then skips it for a neighbour opened within skipDelayDuration', () => {
    const fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const a = el.querySelector<HTMLElement>('[data-testid="a"]')!;
    const b = el.querySelector<HTMLElement>('[data-testid="b"]')!;
    const text = () => Array.from(document.querySelectorAll('[data-slot="tooltip-popup"]')).map((p) => p.textContent?.trim());
    const over = (t: HTMLElement, from: HTMLElement | null) => {
      t.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse', relatedTarget: from }));
      fixture.detectChanges();
    };
    const out = (t: HTMLElement, to: HTMLElement | null) => {
      t.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: to, clientY: 500 }));
      fixture.detectChanges();
    };
    over(a, null);
    vi.advanceTimersByTime(399);
    fixture.detectChanges();
    expect(text()).toEqual([]);
    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(text()).toEqual(['A']);
    out(a, b);
    over(b, a);
    expect(text()).toContain('B');
    out(b, null);
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(text()).toEqual([]);
    // Past the skip window: the full delay again.
    over(a, null);
    vi.advanceTimersByTime(200);
    fixture.detectChanges();
    expect(text()).toEqual([]);
    vi.advanceTimersByTime(200);
    fixture.detectChanges();
    expect(text()).toEqual(['A']);
  });
});
