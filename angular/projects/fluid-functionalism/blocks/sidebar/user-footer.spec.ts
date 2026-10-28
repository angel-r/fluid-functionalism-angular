/**
 * SidebarUserFooter through its public interface, pinning
 * registry/blocks/sidebar-user-footer.tsx: a User menu row (avatar on the
 * leading axis, name, chevrons on the trailing axis) whose button opens the
 * user menu upward on the sidebar menu grid.
 */
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MenuItem } from '../../menu-item';
import { SIDEBAR_MENU_POPUP } from '../../sidebar-menu';
import { SidebarBlockMenu, SidebarUserFooter } from './index';

@Component({
  imports: [SidebarUserFooter, SidebarBlockMenu, MenuItem],
  template: `
    <ff-sidebar-user-footer name="Jane Doe" class="min-w-0 flex-1">
      <span data-testid="avatar" class="size-5 rounded-full">J</span>
      <ng-template ffSidebarBlockMenu>
        <ff-menu-item [index]="0" icon="user" label="Profile" (select)="picked('Profile')" />
        <ff-menu-item [index]="1" icon="arrow-left" label="Log out" (select)="picked('Log out')" />
      </ng-template>
    </ff-sidebar-user-footer>
  `,
})
class Host {
  readonly picked = vi.fn();
}

beforeEach(() => {
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
});

afterEach(() => {
  delete (document.documentElement as { clientWidth?: number }).clientWidth;
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
});

function shownMenus() {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]')).filter(
    (m) => m.closest<HTMLElement>('[data-slot="dropdown-positioner"]')?.style.display !== 'none',
  );
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = el.querySelector<HTMLElement>('button[aria-label="Open user menu"]')!;
  return { fixture, el, button };
}

describe('SidebarUserFooter', () => {
  it('renders the identity row inside a User menu, with classes on the menu', () => {
    const { el, button } = setup();
    const menu = el.querySelector<HTMLElement>('ul[aria-label="User"]')!;
    expect(menu.getAttribute('data-sidebar')).toBe('menu');
    expect(menu.classList.contains('min-w-0')).toBe(true);
    expect(menu.classList.contains('flex-1')).toBe(true);
    expect(menu.contains(button)).toBe(true);
    expect(button.getAttribute('data-sidebar')).toBe('menu-button');
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    expect(button.textContent).toContain('Jane Doe');
    // Avatar in a 20px slot pulled onto the leading icon axis.
    const avatarSlot = el.querySelector<HTMLElement>('[data-testid="avatar"]')!.parentElement!;
    expect(button.contains(avatarSlot)).toBe(true);
    for (const token of ['-ml-0.5', '-mr-0.5', 'size-5', 'shrink-0']) {
      expect(avatarSlot.classList.contains(token)).toBe(true);
    }
    // Chevrons in a 24px slot on the trailing action axis.
    const chevronSlot = button.querySelector('svg.lucide-chevrons-up-down')!.closest('span')!;
    for (const token of ['ml-auto', '-mr-0.5', 'size-6']) {
      expect(chevronSlot.classList.contains(token)).toBe(true);
    }
  });

  it('opens the user menu on the sidebar menu grid', async () => {
    const { fixture, button } = setup();
    expect(shownMenus()).toHaveLength(0);
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const [menu] = shownMenus();
    for (const token of SIDEBAR_MENU_POPUP.split(' ')) expect(menu.classList.contains(token)).toBe(true);
    const rows = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual(['Profile', 'Log out']);
  });

  it('runs the picked row and closes the menu', async () => {
    const { fixture, button } = setup();
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    shownMenus()[0].querySelector<HTMLElement>('[aria-label="Log out"]')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.picked).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.picked).toHaveBeenCalledWith('Log out');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
