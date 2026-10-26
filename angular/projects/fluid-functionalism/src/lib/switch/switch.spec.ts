/**
 * Switch: a whole labeled row that toggles on a click anywhere, on Space or
 * Enter on the track, and on a drag released past the midpoint, exactly once
 * per gesture. The thumb mounts at its resting spot, and the size ladder
 * resizes the track.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Switch } from './switch';
import type { SizeVariant } from '../core/size';

@Component({
  imports: [Switch],
  template: `
    <ff-switch
      label="Notifications"
      [(checked)]="checked"
      [disabled]="disabled()"
      [size]="size()"
      class="extra"
      (toggle)="toggles = toggles + 1"
      (touch)="touches = touches + 1"
    />
  `,
})
class Host {
  readonly checked = signal(false);
  readonly disabled = signal(false);
  readonly size = signal<SizeVariant | undefined>(undefined);
  toggles = 0;
  touches = 0;
}

function setup(configure: (host: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const row = el.querySelector<HTMLElement>('ff-switch')!;
  const track = row.querySelector<HTMLElement>('[role="switch"]')!;
  const thumb = row.querySelector<HTMLElement>('[data-slot="switch-thumb"]')!;
  const label = row.querySelector<HTMLElement>('[data-slot="switch-label"]')!;
  const flush = () => fixture.detectChanges();
  return { fixture, host: fixture.componentInstance, row, track, thumb, label, flush };
}

function pointer(target: HTMLElement, type: string, init: { clientX?: number; pointerType?: string; button?: number } = {}) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: init.clientX ?? 0, button: init.button ?? 0 });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  target.dispatchEvent(event);
}

describe('Switch', () => {
  it('renders an unchecked switch named by its label', () => {
    const { row, track, label } = setup();
    expect(track.getAttribute('aria-checked')).toBe('false');
    expect(track.getAttribute('data-state')).toBe('unchecked');
    expect(track.hasAttribute('data-unchecked')).toBe(true);
    expect(track.getAttribute('tabindex')).toBe('0');
    expect(track.getAttribute('aria-labelledby')).toBe(label.id);
    expect(label.textContent?.trim()).toBe('Notifications');
    expect(label.classList).toContain('text-muted-foreground');
    expect(row.classList).toContain('extra');
    expect(row.classList).toContain('touch-none');
    expect(track.style.width).toBe('34px');
    expect(track.style.height).toBe('20px');
  });

  it('a click anywhere on the row toggles once', () => {
    const { host, row, track, label, flush } = setup();
    label.click();
    flush();
    expect(host.checked()).toBe(true);
    expect(host.toggles).toBe(1);
    expect(track.getAttribute('aria-checked')).toBe('true');
    expect(track.getAttribute('data-state')).toBe('checked');
    expect(track.hasAttribute('data-checked')).toBe(true);
    expect(label.classList).toContain('text-foreground');
    row.click();
    flush();
    expect(host.checked()).toBe(false);
    expect(host.toggles).toBe(2);
  });

  it('a click on the track toggles exactly once', () => {
    const { host, track, flush } = setup();
    track.click();
    flush();
    expect(host.checked()).toBe(true);
    expect(host.toggles).toBe(1);
  });

  it('Space and Enter on the track toggle it', () => {
    const { host, track, flush } = setup();
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    track.dispatchEvent(space);
    flush();
    expect(space.defaultPrevented).toBe(true);
    expect(host.checked()).toBe(true);
    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    flush();
    expect(host.checked()).toBe(false);
    expect(host.toggles).toBe(2);
  });

  it('follows the checked input from the parent', () => {
    const { host, track, flush } = setup();
    host.checked.set(true);
    flush();
    expect(track.getAttribute('aria-checked')).toBe('true');
  });

  it('disabled: ignores clicks and keys, and dims the row', () => {
    const { host, row, track, flush } = setup((h) => h.disabled.set(true));
    row.click();
    track.click();
    track.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    flush();
    expect(host.checked()).toBe(false);
    expect(host.toggles).toBe(0);
    expect(track.getAttribute('aria-disabled')).toBe('true');
    expect(track.hasAttribute('data-disabled')).toBe(true);
    expect(track.getAttribute('tabindex')).toBe('-1');
    expect(row.classList).toContain('opacity-50');
    expect(row.classList).toContain('pointer-events-none');
  });

  it('a drag released past the midpoint toggles once, and its click is swallowed', () => {
    const { host, row, flush } = setup();
    pointer(row, 'pointerdown', { clientX: 0 });
    pointer(row, 'pointermove', { clientX: 20 });
    pointer(row, 'pointerup', { clientX: 20 });
    row.click();
    flush();
    expect(host.checked()).toBe(true);
    expect(host.toggles).toBe(1);
  });

  it('a drag released short of the midpoint does not toggle', () => {
    const { host, row, flush } = setup();
    pointer(row, 'pointerdown', { clientX: 0 });
    pointer(row, 'pointermove', { clientX: 3 });
    pointer(row, 'pointerup', { clientX: 3 });
    row.click();
    flush();
    expect(host.checked()).toBe(false);
    expect(host.toggles).toBe(0);
  });

  it('a press that wobbles under the dead zone is still a click', () => {
    const { host, row, flush } = setup();
    pointer(row, 'pointerdown', { clientX: 0 });
    pointer(row, 'pointermove', { clientX: 1 });
    pointer(row, 'pointerup', { clientX: 1 });
    row.click();
    flush();
    expect(host.checked()).toBe(true);
    expect(host.toggles).toBe(1);
  });

  it('mounts the thumb at its resting spot, with no slide', () => {
    const off = setup();
    expect(off.thumb.style.transform).toBe('translateX(2px) translateY(2px)');
    expect(off.thumb.style.width).toBe('16px');
    TestBed.resetTestingModule();
    const on = setup((h) => h.checked.set(true));
    expect(on.thumb.style.transform).toBe('translateX(16px) translateY(2px)');
  });

  it('the compact step shrinks the track and the thumb', () => {
    const { track, thumb, row } = setup((h) => {
      h.size.set('compact');
      h.checked.set(true);
    });
    expect(track.style.width).toBe('28px');
    expect(track.style.height).toBe('16px');
    expect(thumb.style.width).toBe('12px');
    expect(thumb.style.transform).toBe('translateX(14px) translateY(2px)');
    expect(row.classList).toContain('py-1');
  });

  it('emits touch when the track loses focus', () => {
    const { host, track } = setup();
    track.dispatchEvent(new FocusEvent('blur'));
    expect(host.touches).toBe(1);
  });

  it('hover springs the thumb into a pill', async () => {
    vi.useRealTimers();
    const { row, thumb, flush } = setup();
    pointer(row, 'pointerenter', { pointerType: 'mouse' });
    flush();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(thumb.style.width).toBe('18px');
  });
});
