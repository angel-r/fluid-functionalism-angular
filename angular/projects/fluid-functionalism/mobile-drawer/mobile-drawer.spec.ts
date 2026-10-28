/**
 * MobileDrawer through its public interface. There is no upstream behavior
 * test for it (tests/popup-exit-sync only keeps the React exit hook's copies
 * identical); these pin the rules of registry/base/mobile-drawer.tsx: the
 * drawer mounts in an overlay while open, only reports dismissals (Escape,
 * backdrop) and lets the parent close it, plays its exit before unmounting,
 * raises its content two surface steps, and hands focus back on close.
 */
import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { injectSurface, SurfaceProvider } from '../core/surface';
import { surfaceClasses } from '../core/surface-classes';
import { MobileDrawer } from './mobile-drawer';

@Component({
  selector: 'test-surface-probe',
  template: `<span data-testid="probe">{{ surface() }}</span>`,
})
class SurfaceProbe {
  readonly surface = injectSurface();
}

@Component({
  imports: [MobileDrawer, SurfaceProbe, SurfaceProvider],
  template: `
    <button #trigger type="button" data-testid="trigger">Menu</button>
    <div [ffSurface]="substrate()">
      <ff-mobile-drawer [open]="open()" [triggerRef]="trigger" (close)="onClose()">
        <nav data-testid="content">
          <a href="#one">One</a>
          <test-surface-probe />
        </nav>
      </ff-mobile-drawer>
    </div>
  `,
})
class Host {
  readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  readonly open = signal(false);
  readonly substrate = signal(1);
  readonly onClose = vi.fn();
}

const panel = () => document.querySelector<HTMLElement>('[data-slot="mobile-drawer-panel"]');
const backdrop = () => document.querySelector<HTMLElement>('[data-slot="mobile-drawer-backdrop"]');
const probe = () => document.querySelector<HTMLElement>('[data-testid="probe"]');

async function setup(configure: (h: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  await fixture.whenStable();
  const host = fixture.componentInstance;
  const set = async (open: boolean) => {
    host.open.set(open);
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { fixture, host, set };
}

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
});

describe('mobile drawer: mounting', () => {
  it('renders nothing while closed', async () => {
    await setup();
    expect(panel()).toBeNull();
    expect(backdrop()).toBeNull();
  });

  it('mounts the panel and backdrop in an overlay when opened, with the content inside', async () => {
    const { fixture, set } = await setup();
    await set(true);
    expect(panel()).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).contains(panel())).toBe(false);
    expect(panel()!.querySelector('[data-testid="content"]')).not.toBeNull();
  });

  it('is a modal dialog named Navigation', async () => {
    const { set } = await setup();
    await set(true);
    expect(panel()!.getAttribute('role')).toBe('dialog');
    expect(panel()!.getAttribute('aria-modal')).toBe('true');
    expect(panel()!.getAttribute('aria-label')).toBe('Navigation');
  });

  it('carries the drawer and scrim classes', async () => {
    const { set } = await setup();
    await set(true);
    for (const cls of [
      'fixed', 'top-0', 'left-0', 'bottom-0', 'w-64', ...surfaceClasses(3, 3).split(' '), 'z-50', 'overflow-y-auto', 'p-4',
    ]) {
      expect(panel()!.classList).toContain(cls);
    }
    for (const cls of ['fixed', 'inset-0', 'bg-black/40', 'dark:bg-black/80', 'z-40']) {
      expect(backdrop()!.classList).toContain(cls);
    }
  });
});

describe('mobile drawer: surface', () => {
  it('raises its content two steps above the page', async () => {
    const { set } = await setup();
    await set(true);
    expect(probe()!.textContent).toBe('3');
  });

  it('raises its content two steps above its substrate, capped at 8', async () => {
    const raised = await setup((h) => h.substrate.set(4));
    await raised.set(true);
    expect(probe()!.textContent).toBe('6');
    expect(panel()!.classList).toContain(surfaceClasses(6, 3).split(' ')[0]);
    raised.fixture.destroy();
    const top = await setup((h) => h.substrate.set(7));
    await top.set(true);
    expect(probe()!.textContent).toBe('8');
  });
});

describe('mobile drawer: dismissal', () => {
  it('reports Escape and stays open until the parent closes it', async () => {
    const { host, set } = await setup();
    await set(true);
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    panel()!.dispatchEvent(event);
    expect(host.onClose).toHaveBeenCalledTimes(1);
    expect(panel()).not.toBeNull();
  });

  it('reports a backdrop click', async () => {
    const { host, set } = await setup();
    await set(true);
    backdrop()!.click();
    expect(host.onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores clicks inside the panel', async () => {
    const { host, set } = await setup();
    await set(true);
    panel()!.click();
    expect(host.onClose).not.toHaveBeenCalled();
  });
});

describe('mobile drawer: exit', () => {
  it('keeps the panel through its exit, then unmounts it', async () => {
    const { host, set } = await setup();
    await set(true);
    await set(false);
    expect(panel()).not.toBeNull();
    await vi.waitFor(() => expect(panel()).toBeNull(), { timeout: 1000 });
    expect(host.onClose).not.toHaveBeenCalled();
  });

  it('a reopen during the exit keeps the same panel', async () => {
    const { set } = await setup();
    await set(true);
    const first = panel();
    await set(false);
    await set(true);
    await new Promise((r) => setTimeout(r, 400));
    expect(panel()).toBe(first);
  });
});

describe('mobile drawer: focus', () => {
  it('moves focus into the drawer on open and back to the trigger on close', async () => {
    const { host, set } = await setup();
    host.trigger().nativeElement.focus();
    await set(true);
    await vi.waitFor(() => {
      const active = document.activeElement;
      expect(active?.closest('.cdk-overlay-container')).not.toBeNull();
    });
    await set(false);
    await vi.waitFor(() => expect(document.activeElement).toBe(host.trigger().nativeElement), { timeout: 1000 });
  });
});
