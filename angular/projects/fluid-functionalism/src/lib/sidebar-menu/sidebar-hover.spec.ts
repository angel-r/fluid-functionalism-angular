/**
 * Ported from tests/sidebar-hover.test.tsx. The React suite mocks
 * `motion.div` to read each overlay's start, target and transition; here the
 * menu's own overlays go through the SIDEBAR_MENU_ANIMATE seam (a recorder),
 * and the hover highlight — FluidHoverHighlight, driven by real `motion` — is
 * read from the inline transform it settles on. Row registration,
 * measurement and the hover engine stay real.
 */
import { Component, signal, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { SIDEBAR_MENU_ANIMATE, type SidebarMenuAnimate } from './menu-utils';
import { SidebarMenu } from './sidebar-menu';
import { SidebarMenuItem } from './sidebar-menu-item';
import { SidebarMenuButton } from './sidebar-menu-button';

const recorder: SidebarMenuAnimate = (element, keyframes, options) => {
  element.setAttribute('data-target', JSON.stringify(keyframes));
  element.setAttribute('data-transition', JSON.stringify(options));
  return { finished: Promise.resolve(), stop: () => {} };
};

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [{ provide: SIDEBAR_MENU_ANIMATE, useValue: recorder }] });
  // Supply layout boxes, which jsdom does not calculate.
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(36);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 36));
  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
    return Number(this.dataset['top'] ?? 0);
  });
});

afterEach(() => vi.restoreAllMocks());

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const menu = el.querySelector<HTMLElement>('ul[data-sidebar="menu"]')!;
  const detect = () => fixture.detectChanges();
  return { fixture, el, menu, detect };
}

/** Waits until the rows are measured and the active background is up. */
async function measured(fixture: ComponentFixture<unknown>) {
  const el = fixture.nativeElement as HTMLElement;
  await vi.waitFor(
    () => {
      fixture.detectChanges();
      expect(el.querySelector('.bg-active')).not.toBeNull();
    },
    { timeout: 2000 },
  );
}

@Component({
  imports: [SidebarMenu, SidebarMenuItem, SidebarMenuButton],
  template: `
    <ul ffSidebarMenu aria-label="Components">
      <li ffSidebarMenuItem><button ffSidebarMenuButton data-top="40">Accordion</button></li>
      <li ffSidebarMenuItem><button ffSidebarMenuButton data-top="80">Button</button></li>
      <li ffSidebarMenuItem><button ffSidebarMenuButton data-top="120" isActive>Carousel Dot</button></li>
    </ul>
  `,
})
class HoverHost {}

it('starts each sidebar hover session at the pointer, even with another route active', async () => {
  const { fixture, el, menu, detect } = await render(HoverHost);
  await measured(fixture);
  const overlays = () => el.querySelectorAll<HTMLElement>('[data-slot="fluid-hover-highlight"]');
  const overlay = () => overlays()[overlays().length - 1] ?? null;
  const moveTo = async (y: number, index: string) => {
    menu.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 10, clientY: y }));
    await vi.waitFor(() => expect(menu.getAttribute('data-fluid-hover-active-index')).toBe(index), { timeout: 2000 });
    detect();
  };
  /** The first transform motion writes on a freshly mounted highlight. */
  const firstTransform = async (node: HTMLElement) => {
    await vi.waitFor(() => expect(node.style.transform).not.toBe(''), { timeout: 2000 });
    return node.style.transform;
  };

  expect(overlay()).toBeNull();
  expect(el.querySelector('.bg-active')).not.toBeNull();
  menu.dispatchEvent(new MouseEvent('mouseenter'));
  await moveTo(50, '0');
  const first = overlay()!;
  expect(first).not.toBeNull();
  // Fades in at the hovered row (y 40), not sliding over from the active one.
  expect(await firstTransform(first)).toContain('translateY(40px)');
  await vi.waitFor(() => expect(first.style.opacity).toBe('1'), { timeout: 2000 });

  await moveTo(90, '1');
  expect(overlay()).toBe(first);
  await vi.waitFor(() => expect(first.style.transform).toContain('translateY(80px)'), { timeout: 2000 });

  menu.dispatchEvent(new MouseEvent('mouseleave'));
  detect();
  await vi.waitFor(() => expect(overlays().length).toBe(0), { timeout: 2000 });

  menu.dispatchEvent(new MouseEvent('mouseenter'));
  await moveTo(90, '1');
  const second = overlay()!;
  expect(second).not.toBeNull();
  expect(second).not.toBe(first);
  expect(await firstTransform(second)).toContain('translateY(80px)');
});

@Component({
  imports: [SidebarMenu, SidebarMenuItem, SidebarMenuButton],
  template: `
    <ul ffSidebarMenu aria-label="Components">
      @if (extra()) {
        <li ffSidebarMenuItem><button ffSidebarMenuButton data-top="40">New</button></li>
      }
      @for (label of labels; track label; let i = $index) {
        <li ffSidebarMenuItem>
          <button ffSidebarMenuButton [attr.data-top]="40 * (i + (extra() ? 2 : 1))" [isActive]="label === active()">
            {{ label }}
          </button>
        </li>
      }
    </ul>
  `,
})
class ActiveHost {
  readonly labels = ['Accordion', 'Button', 'Card'];
  readonly extra = signal(false);
  readonly active = signal('Button');
}

it('springs the active background to a new row, snaps it when only its row moves', async () => {
  const { fixture, el } = await render(ActiveHost);
  await measured(fixture);
  const active = () => el.querySelector<HTMLElement>('.bg-active')!;
  const target = () => JSON.parse(active().dataset['target']!);
  const springs = () => JSON.parse(active().dataset['transition']!).duration !== 0;
  expect(target()).toMatchObject({ top: 80 });

  // A row lands above: the active row itself moved, so the background snaps.
  fixture.componentInstance.extra.set(true);
  await vi.waitFor(
    () => {
      fixture.detectChanges();
      expect(target()).toMatchObject({ top: 120 });
    },
    { timeout: 2000 },
  );
  expect(springs()).toBe(false);

  // The selection moves: a different row, so the background glides.
  fixture.componentInstance.active.set('Card');
  await vi.waitFor(
    () => {
      fixture.detectChanges();
      expect(target()).toMatchObject({ top: 160 });
    },
    { timeout: 2000 },
  );
  expect(springs()).toBe(true);
});
