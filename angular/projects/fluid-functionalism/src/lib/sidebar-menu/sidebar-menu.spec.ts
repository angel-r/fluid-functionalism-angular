/**
 * SidebarMenu and its parts through their public interface, pinning
 * registry/default/sidebar-menu.tsx: the row attributes and roving tabindex,
 * status dots, the ghost-span label, the trailing-gutter reservation, row
 * actions / badges / skeletons, keyboard navigation, the collapsible sub-tree,
 * the traveling focus ring, and which rows hover skips.
 */
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { fontWeights } from '../core/font-weight';
import {
  SIDEBAR_MENU_ANIMATE,
  SIDEBAR_MENU_SKELETON_WIDTHS,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuActions,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  rowGutter,
  type SidebarMenuAnimate,
} from './index';

const PARTS = [
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuActions,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
];

const recorder: SidebarMenuAnimate = (element, keyframes, options) => {
  element.setAttribute('data-target', JSON.stringify(keyframes));
  element.setAttribute('data-transition', JSON.stringify(options));
  return { finished: Promise.resolve(), stop: () => {} };
};

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [{ provide: SIDEBAR_MENU_ANIMATE, useValue: recorder }] });
});
afterEach(() => vi.restoreAllMocks());

/** Layout boxes jsdom lacks: rows 36px tall, stacked by their data-top. */
function mockLayout() {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(36);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 36));
  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
    return Number(this.dataset['top'] ?? 0);
  });
}

async function settle(fixture: ComponentFixture<unknown>) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function query(fixture: ComponentFixture<unknown>) {
  const el = fixture.nativeElement as HTMLElement;
  return {
    el,
    one: (selector: string) => el.querySelector<HTMLElement>(selector)!,
    all: (selector: string) => Array.from(el.querySelectorAll<HTMLElement>(selector)),
    byId: (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!,
  };
}

// ─── Rows, tabindex, status ──────────────────────────────────────────────────

@Component({
  imports: PARTS,
  template: `
    <ul ffSidebarMenu aria-label="Nav" [size]="size()">
      @for (label of labels; track label) {
        <li ffSidebarMenuItem>
          <button ffSidebarMenuButton [isActive]="label === active()" [attr.data-testid]="label">{{ label }}</button>
        </li>
      }
    </ul>
  `,
})
class RowsHost {
  readonly labels = ['Home', 'Inbox', 'Docs'];
  readonly active = signal<string | null>('Inbox');
  readonly size = signal<'default' | 'compact' | undefined>(undefined);
}

describe('SidebarMenu rows', () => {
  it('stamps the row parts and marks the active row', async () => {
    const fixture = TestBed.createComponent(RowsHost);
    await settle(fixture);
    const { one, byId } = query(fixture);
    expect(one('ul').getAttribute('data-sidebar')).toBe('menu');
    expect(one('ul').classList).toContain('relative');
    const li = one('li');
    expect(li.getAttribute('data-sidebar')).toBe('menu-item');
    expect(li.classList).toContain('group/menu-item');
    const inbox = byId('Inbox');
    expect(inbox.getAttribute('data-sidebar')).toBe('menu-button');
    expect(inbox.getAttribute('type')).toBe('button');
    expect(inbox.getAttribute('data-size')).toBe('default');
    expect(inbox.getAttribute('data-active')).toBe('true');
    expect(inbox.getAttribute('aria-current')).toBe('page');
    expect(byId('Home').hasAttribute('aria-current')).toBe(false);
    expect(inbox.classList).toContain('h-8');
  });

  it('rows rendered before the menu is attached still get the active background', async () => {
    // A dialog renders its content first and appends it to the overlay after:
    // the rows register while detached and must not be dropped for good.
    mockLayout();
    const fixture = TestBed.createComponent(RowsHost);
    const host = fixture.nativeElement as HTMLElement;
    const parent = host.parentNode!;
    host.remove();
    await settle(fixture);
    parent.appendChild(host);
    const layer = () => query(fixture).one('[data-slot="sidebar-menu-active-layer"]');
    await vi.waitFor(
      async () => {
        await new Promise((r) => requestAnimationFrame(r));
        fixture.detectChanges();
        expect(layer().querySelectorAll('.bg-active')).toHaveLength(1);
      },
      { timeout: 2000 },
    );
  });

  it('roving tabindex: the active row is the tab stop, else the first row', async () => {
    const fixture = TestBed.createComponent(RowsHost);
    await settle(fixture);
    const { byId } = query(fixture);
    expect(byId('Inbox').tabIndex).toBe(0);
    expect(byId('Home').tabIndex).toBe(-1);
    expect(byId('Docs').tabIndex).toBe(-1);
    fixture.componentInstance.active.set(null);
    await settle(fixture);
    expect(byId('Home').tabIndex).toBe(0);
    expect(byId('Inbox').tabIndex).toBe(-1);
  });

  it('`size` pins the rows to a ladder step', async () => {
    const fixture = TestBed.createComponent(RowsHost);
    fixture.componentInstance.size.set('compact');
    await settle(fixture);
    expect(query(fixture).byId('Home').classList).toContain('h-7');
  });
});

@Component({
  imports: PARTS,
  template: `
    <ul ffSidebarMenu>
      <li ffSidebarMenuItem><button ffSidebarMenuButton status="unread" data-testid="unread">Unread</button></li>
      <li ffSidebarMenuItem><button ffSidebarMenuButton status="idle" data-testid="idle">Idle</button></li>
      <li ffSidebarMenuItem><button ffSidebarMenuButton status="active" data-testid="active">Active</button></li>
      <li ffSidebarMenuItem><button ffSidebarMenuButton status="idle" dot="filled" data-testid="dot">Dot</button></li>
      <li ffSidebarMenuItem><button ffSidebarMenuButton icon="home" dot="ring" data-testid="icon">Icon</button></li>
    </ul>
  `,
})
class StatusHost {}

describe('SidebarMenuButton status and dots', () => {
  it('maps status to data-status, dots, hidden "unread" text, and active', async () => {
    const fixture = TestBed.createComponent(StatusHost);
    await settle(fixture);
    const { byId } = query(fixture);
    const dot = (id: string) => byId(id).querySelector<HTMLElement>('[data-slot="sidebar-menu-dot"]');
    expect(byId('unread').getAttribute('data-status')).toBe('unread');
    expect(byId('unread').querySelector('.sr-only')?.textContent).toBe(', unread');
    expect(dot('unread')!.classList).toContain('bg-muted-foreground/50');
    expect(dot('idle')!.classList).toContain('border-muted-foreground/50');
    expect(byId('idle').querySelector('.sr-only')).toBeNull();
    // "active" implies the row-active treatment.
    expect(byId('active').getAttribute('aria-current')).toBe('page');
    expect(dot('active')!.classList).toContain('bg-foreground/60');
    // An explicit dot overrides the status-derived one.
    expect(dot('dot')!.classList).toContain('bg-muted-foreground/50');
    // An icon wins over any dot.
    expect(dot('icon')).toBeNull();
    expect(byId('icon').querySelector('svg')).not.toBeNull();
  });
});

// ─── Label ───────────────────────────────────────────────────────────────────

@Component({
  imports: PARTS,
  template: `
    <ul ffSidebarMenu>
      <li ffSidebarMenuItem>
        <button ffSidebarMenuButton [isActive]="active()" data-testid="text">
          {{ label() }}
          <span data-testid="chevron" class="ml-auto">›</span>
        </button>
      </li>
      <li ffSidebarMenuItem>
        <button ffSidebarMenuButton data-testid="elements"><span data-testid="avatar">A</span></button>
      </li>
    </ul>
  `,
})
class LabelHost {
  readonly label = signal('Agents');
  readonly active = signal(false);
}

describe('SidebarMenuButton label', () => {
  it('splits the leading text into a ghost-reserved label, trailing elements stay siblings', async () => {
    const fixture = TestBed.createComponent(LabelHost);
    await settle(fixture);
    const { byId } = query(fixture);
    const button = byId('text');
    const ghost = button.querySelector<HTMLElement>('[data-slot="sidebar-menu-label-ghost"]')!;
    const visible = button.querySelector<HTMLElement>('[data-slot="sidebar-menu-label"]')!;
    expect(visible.textContent!.trim()).toBe('Agents');
    expect(ghost.textContent!.trim()).toBe('Agents');
    expect(ghost.getAttribute('aria-hidden')).toBe('true');
    expect(ghost.style.fontVariationSettings).toBe(fontWeights.semibold);
    expect(visible.style.fontVariationSettings).toBe(fontWeights.normal);
    expect(visible.contains(byId('chevron'))).toBe(false);
    expect(byId('chevron').parentElement!.classList).toContain('contents');

    fixture.componentInstance.label.set('Agents and tools');
    fixture.componentInstance.active.set(true);
    await settle(fixture);
    await vi.waitFor(() => expect(ghost.textContent!.trim()).toBe('Agents and tools'));
    expect(visible.textContent!.trim()).toBe('Agents and tools');
    expect(visible.style.fontVariationSettings).toBe(fontWeights.semibold);
    expect(visible.classList).toContain('text-foreground');
  });

  it('without leading text the content sits in one flex span', async () => {
    const fixture = TestBed.createComponent(LabelHost);
    await settle(fixture);
    const wrapper = query(fixture).byId('avatar').parentElement!;
    expect(wrapper.classList).toContain('flex-1');
    expect(wrapper.classList).toContain('text-muted-foreground');
  });
});

// ─── Trailing gutter, actions, badges ────────────────────────────────────────

@Component({
  imports: PARTS,
  template: `
    <ul ffSidebarMenu>
      <li ffSidebarMenuItem data-testid="row-action" (click)="rowClicks = rowClicks + 1">
        <button ffSidebarMenuButton data-testid="b-action">Action</button>
        <button ffSidebarMenuAction aria-label="Share" data-testid="action" (click)="actionClicks = actionClicks + 1">S</button>
      </li>
      <li ffSidebarMenuItem>
        <button ffSidebarMenuButton data-testid="b-hover">Hover</button>
        <button ffSidebarMenuAction showOnHover data-testid="hover-action">S</button>
      </li>
      <li ffSidebarMenuItem>
        <button ffSidebarMenuButton [isActive]="true" data-testid="b-badge">Badge</button>
        <div ffSidebarMenuBadge data-testid="badge">12</div>
      </li>
      <li ffSidebarMenuItem>
        <button ffSidebarMenuButton data-testid="b-cluster">Cluster</button>
        <div ffSidebarMenuBadge>4</div>
        <div ffSidebarMenuActions showOnHover data-testid="cluster">
          <button ffSidebarMenuAction data-testid="in-cluster">1</button>
          <button ffSidebarMenuAction>2</button>
          <button ffSidebarMenuAction>3</button>
        </div>
      </li>
    </ul>
  `,
})
class TrailingHost {
  rowClicks = 0;
  actionClicks = 0;
}

describe('trailing controls', () => {
  it('reserves the exact gutter the trailing run needs', async () => {
    const fixture = TestBed.createComponent(TrailingHost);
    await settle(fixture);
    const { byId } = query(fixture);
    const gutter = (id: string) => [
      byId(id).style.getPropertyValue('--row-gutter'),
      byId(id).style.getPropertyValue('--row-gutter-hover'),
    ];
    expect(gutter('b-action')).toEqual(['34px', '34px']);
    // Hover-revealed actions claim no width at rest.
    expect(gutter('b-hover')).toEqual(['8px', '34px']);
    expect(gutter('b-badge')).toEqual(['36px', '36px']);
    expect(gutter('b-cluster')).toEqual(['36px', '120px']);
    expect(rowGutter(3, true)).toBe(120);
  });

  it('positions a lone action, flows actions inside a cluster', async () => {
    const fixture = TestBed.createComponent(TrailingHost);
    await settle(fixture);
    const { byId } = query(fixture);
    const action = byId('action');
    expect(action.getAttribute('data-sidebar')).toBe('menu-action');
    expect(action.getAttribute('type')).toBe('button');
    expect(action.classList).toContain('absolute');
    expect(action.classList).toContain('top-1');
    expect(action.style.getPropertyValue('--icon-size')).toBe('16px');
    expect(byId('hover-action').hasAttribute('data-show-on-hover')).toBe(true);
    expect(byId('hover-action').classList).toContain('peer-hover/menu-button:opacity-100');
    const inCluster = byId('in-cluster');
    expect(inCluster.classList).toContain('relative');
    expect(inCluster.classList).not.toContain('absolute');
    const cluster = byId('cluster');
    expect(cluster.getAttribute('data-sidebar')).toBe('menu-actions');
    expect(cluster.classList).toContain('opacity-0');
  });

  it("an action's click never reaches the row", async () => {
    const fixture = TestBed.createComponent(TrailingHost);
    await settle(fixture);
    query(fixture).byId('action').click();
    expect(fixture.componentInstance.actionClicks).toBe(1);
    expect(fixture.componentInstance.rowClicks).toBe(0);
  });

  it("the badge lights with its row's active state", async () => {
    mockLayout();
    const fixture = TestBed.createComponent(TrailingHost);
    await settle(fixture);
    const badge = query(fixture).byId('badge');
    expect(badge.getAttribute('data-sidebar')).toBe('menu-badge');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(badge.classList).toContain('text-foreground');
    });
    expect(badge.style.fontVariationSettings).toBe(fontWeights.semibold);
  });
});

// ─── Skeleton ────────────────────────────────────────────────────────────────

@Component({
  imports: PARTS,
  template: `<div ffSidebarMenuSkeleton showIcon data-testid="s1"></div><div ffSidebarMenuSkeleton data-testid="s2"></div>`,
})
class SkeletonHost {}

it('SidebarMenuSkeleton renders a deterministic placeholder row', async () => {
  const fixture = TestBed.createComponent(SkeletonHost);
  await settle(fixture);
  const { byId } = query(fixture);
  expect(byId('s1').getAttribute('data-sidebar')).toBe('menu-skeleton');
  expect(byId('s1').querySelector('[data-sidebar="menu-skeleton-icon"]')).not.toBeNull();
  expect(byId('s2').querySelector('[data-sidebar="menu-skeleton-icon"]')).toBeNull();
  const width = byId('s1').querySelector<HTMLElement>('[data-sidebar="menu-skeleton-text"]')!.style.maxWidth;
  expect(SIDEBAR_MENU_SKELETON_WIDTHS as readonly string[]).toContain(width);
  expect(byId('s1').classList).toContain('h-8');
});

// ─── Sub-tree, keyboard, hover skips ─────────────────────────────────────────

@Component({
  imports: PARTS,
  template: `
    <ul ffSidebarMenu data-testid="menu">
      <li ffSidebarMenuItem>
        <button ffSidebarMenuButton data-testid="parent" data-top="0">Agents</button>
        <ff-sidebar-menu-sub [open]="open()" data-testid="wrapper">
          <li ffSidebarMenuSubItem>
            <a ffSidebarMenuSubButton href="#" data-testid="child" data-top="36" [isActive]="childActive()">Triage</a>
          </li>
          <li ffSidebarMenuSubItem>
            <a ffSidebarMenuSubButton href="#" size="sm" data-testid="child-sm" data-top="72">Notes</a>
          </li>
        </ff-sidebar-menu-sub>
      </li>
      <li ffSidebarMenuItem>
        <button ffSidebarMenuButton data-testid="disabled" data-top="108" disabled>Off</button>
      </li>
      <li ffSidebarMenuItem>
        <button ffSidebarMenuButton data-testid="last" data-top="144">Runs</button>
        @if (popup()) {
          <button ffSidebarMenuAction data-popup-open data-testid="popup">…</button>
        }
      </li>
    </ul>
  `,
})
class TreeHost {
  readonly open = signal(true);
  readonly childActive = signal(false);
  readonly popup = signal(false);
}

describe('SidebarMenuSub', () => {
  it('collapses its sub-tree: closed state, hidden from AT, zero height', async () => {
    const fixture = TestBed.createComponent(TreeHost);
    await settle(fixture);
    const { byId, one } = query(fixture);
    const wrapper = byId('wrapper');
    const list = one('[data-sidebar="menu-sub"]');
    expect(wrapper.getAttribute('data-slot')).toBe('sidebar-menu-sub-wrapper');
    expect(list.getAttribute('data-state')).toBe('open');
    expect(list.classList).toContain('ml-[15px]');
    fixture.componentInstance.open.set(false);
    await settle(fixture);
    expect(list.getAttribute('data-state')).toBe('closed');
    expect(list.getAttribute('aria-hidden')).toBe('true');
    // Unmeasured (no ResizeObserver in jsdom): the class collapses it.
    expect(wrapper.classList).toContain('h-0');
    expect(JSON.parse(wrapper.dataset['target']!)).toEqual({ opacity: 0 });
    // A toggle springs (the exit tween of the moderate tier).
    expect(JSON.parse(wrapper.dataset['transition']!)).toEqual({ duration: 0.12 });
  });

  it('sub-buttons: anchors, roving only when active, two heights', async () => {
    const fixture = TestBed.createComponent(TreeHost);
    await settle(fixture);
    const { byId } = query(fixture);
    const child = byId('child');
    expect(child.getAttribute('data-sidebar')).toBe('menu-sub-button');
    expect(child.closest('li')!.getAttribute('data-sidebar')).toBe('menu-sub-item');
    expect(child.hasAttribute('type')).toBe(false);
    expect(child.tabIndex).toBe(-1);
    expect(child.getAttribute('data-size')).toBe('md');
    expect(child.classList).toContain('h-7');
    expect(byId('child-sm').classList).toContain('h-6');
    fixture.componentInstance.childActive.set(true);
    await settle(fixture);
    expect(child.tabIndex).toBe(0);
    expect(child.getAttribute('aria-current')).toBe('page');
  });
});

describe('SidebarMenu keyboard', () => {
  const press = (target: HTMLElement, key: string) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

  it('arrows, Home and End walk every visible button, sub rows included, and wrap', async () => {
    const fixture = TestBed.createComponent(TreeHost);
    await settle(fixture);
    const { byId } = query(fixture);
    let reachedDocument = 0;
    const onDoc = () => reachedDocument++;
    document.addEventListener('keydown', onDoc);
    try {
      byId('parent').focus();
      press(byId('parent'), 'ArrowDown');
      expect(document.activeElement).toBe(byId('child'));
      press(byId('child'), 'End');
      expect(document.activeElement).toBe(byId('last'));
      press(byId('last'), 'ArrowDown');
      expect(document.activeElement).toBe(byId('parent'));
      press(byId('parent'), 'ArrowUp');
      expect(document.activeElement).toBe(byId('last'));
      press(byId('last'), 'Home');
      expect(document.activeElement).toBe(byId('parent'));
      expect(reachedDocument).toBe(0);

      fixture.componentInstance.open.set(false);
      await settle(fixture);
      press(byId('parent'), 'ArrowDown');
      expect(document.activeElement).not.toBe(byId('child'));
    } finally {
      document.removeEventListener('keydown', onDoc);
    }
  });
});

describe('SidebarMenu hover skips', () => {
  const hoverAt = async (fixture: ComponentFixture<TreeHost>, y: number) => {
    const menu = query(fixture).byId('menu');
    menu.dispatchEvent(new MouseEvent('mouseenter'));
    menu.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 10, clientY: y }));
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    fixture.detectChanges();
    return menu.getAttribute('data-fluid-hover-active-index');
  };
  const measuredMenu = async () => {
    mockLayout();
    const fixture = TestBed.createComponent(TreeHost);
    await settle(fixture);
    // The engine marks the container once rows are measured and hit-tested.
    await vi.waitFor(async () => expect(await hoverAt(fixture, 10)).toBe('0'), { timeout: 2000 });
    return fixture;
  };

  it('a disabled row is never lit', async () => {
    const fixture = await measuredMenu();
    // y 120 is inside the disabled row (108–144): the nearest enabled row wins.
    expect(await hoverAt(fixture, 120)).not.toBe('3');
  });

  it('rows inside a collapsed sub-tree are skipped, and a hover riding one clears', async () => {
    const fixture = await measuredMenu();
    expect(await hoverAt(fixture, 40)).toBe('1');
    fixture.componentInstance.open.set(false);
    await settle(fixture);
    await vi.waitFor(() => expect(query(fixture).byId('menu').hasAttribute('data-fluid-hover-active-index')).toBe(false));
    expect(await hoverAt(fixture, 40)).toBe('0');
  });

  it('an open popup anchored in the sidebar freezes hover tracking', async () => {
    const fixture = await measuredMenu();
    fixture.componentInstance.popup.set(true);
    await settle(fixture);
    expect(await hoverAt(fixture, 150)).toBe('0');
  });
});

// ─── Focus ring ──────────────────────────────────────────────────────────────

@Component({
  imports: PARTS,
  template: `
    <ul ffSidebarMenu [focusRing]="ring()">
      <li ffSidebarMenuItem><button ffSidebarMenuButton data-testid="a" data-top="0">A</button></li>
      <li ffSidebarMenuItem><button ffSidebarMenuButton data-testid="b" data-top="36">B</button></li>
    </ul>
  `,
})
class RingHost {
  readonly ring = signal(true);
}

describe('SidebarMenu focus ring', () => {
  const ringOf = (fixture: ComponentFixture<RingHost>) =>
    query(fixture).one('[data-slot="sidebar-menu-ring-layer"]').firstElementChild as HTMLElement | null;
  const keyboardFocus = async (fixture: ComponentFixture<RingHost>, id: string) => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    query(fixture).byId(id).focus();
    await settle(fixture);
  };
  const render = async (ring = true) => {
    mockLayout();
    const fixture = TestBed.createComponent(RingHost);
    fixture.componentInstance.ring.set(ring);
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
    await new Promise((r) => requestAnimationFrame(r));
    await settle(fixture);
    return fixture;
  };

  it('keyboard focus draws the ring around the focused row; a pointer press retires it', async () => {
    const fixture = await render();
    await keyboardFocus(fixture, 'b');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(ringOf(fixture)).not.toBeNull();
    });
    const ring = ringOf(fixture)!;
    expect(ring.classList).toContain('z-20');
    expect(JSON.parse(ring.dataset['target']!)).toEqual({ left: -2, top: 34, width: 204, height: 40 });
    query(fixture).one('ul').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await settle(fixture);
    await vi.waitFor(() => expect(ringOf(fixture)).toBeNull());
    fixture.nativeElement.remove();
  });

  it('`focusRing` off moves only the hover background', async () => {
    const fixture = await render(false);
    await keyboardFocus(fixture, 'b');
    await new Promise((r) => requestAnimationFrame(r));
    fixture.detectChanges();
    expect(ringOf(fixture)).toBeNull();
    expect(query(fixture).one('ul').getAttribute('data-fluid-hover-active-index')).toBe('1');
    fixture.nativeElement.remove();
  });
});
