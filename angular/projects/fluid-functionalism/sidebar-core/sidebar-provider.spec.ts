/**
 * SidebarProvider through its public interface. Upstream's
 * tests/sidebar-hover.test.tsx exercises SidebarMenu (ported with
 * sidebar-menu); nothing upstream tests the provider, so these pin the rules
 * of registry/default/sidebar-core.tsx: the wrapper's DOM and CSS variables,
 * controlled/uncontrolled open state, the `sidebar_state` cookie, the
 * side-aware bare-key shortcut and its one-provider-answers rule, the mobile
 * drawer state, the live width, and the shared peek intent timer.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import {
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
  SidebarProvider,
  SidebarTrigger,
  injectSidebar,
  type SidebarContextValue,
  type SidebarPeek,
} from './index';

@Component({
  selector: 'test-sidebar-probe',
  template: `<span data-testid="state">{{ sidebar.state() }}</span>`,
})
class Probe {
  readonly sidebar = injectSidebar();
}

@Component({
  imports: [SidebarProvider, SidebarTrigger, Probe],
  template: `
    <ff-sidebar-provider
      data-testid="wrapper"
      class="h-full"
      [open]="open()"
      [persist]="persist()"
      [shortcut]="shortcut()"
      [width]="width()"
      [peek]="peek()"
      [defaultOpen]="defaultOpen()"
      (openChange)="changes.push($event)"
    >
      <test-sidebar-probe />
      <ff-sidebar-trigger />
      <input data-testid="field" />
    </ff-sidebar-provider>
  `,
})
class Host {
  readonly open = signal<boolean | undefined>(undefined);
  readonly defaultOpen = signal(true);
  readonly persist = signal(true);
  readonly shortcut = signal<string | null | undefined>(undefined);
  readonly width = signal('16rem');
  readonly peek = signal<SidebarPeek>('none');
  readonly changes: boolean[] = [];
}

@Component({
  imports: [SidebarProvider, Probe],
  template: `
    <ff-sidebar-provider data-testid="outer">
      <test-sidebar-probe data-testid="outer-probe" />
      <button type="button" data-testid="outer-button">Outer</button>
      <ff-sidebar-provider data-testid="inner">
        <test-sidebar-probe data-testid="inner-probe" />
        <button type="button" data-testid="inner-button">Inner</button>
      </ff-sidebar-provider>
    </ff-sidebar-provider>
  `,
})
class NestedHost {}

@Component({ imports: [Probe], template: `<test-sidebar-probe />` })
class OrphanHost {}

let matchMediaMatches = false;

beforeEach(() => {
  document.cookie = `${SIDEBAR_COOKIE_NAME}=; path=/; max-age=0`;
  matchMediaMatches = false;
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matchMediaMatches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function setup(configure: (h: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(s: string) => el.querySelector<T>(s)!;
  const sidebar = fixture.debugElement.query((d) => d.name === 'test-sidebar-probe').componentInstance
    .sidebar as SidebarContextValue;
  const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
    fixture.detectChanges();
  };
  return {
    fixture,
    host: fixture.componentInstance,
    wrapper: q('[data-testid="wrapper"]'),
    state: () => q('[data-testid="state"]').textContent,
    trigger: () => q<HTMLButtonElement>('[data-sidebar="trigger"]'),
    sidebar,
    press,
    flush: () => fixture.detectChanges(),
  };
}

describe('sidebar provider: wrapper', () => {
  it('renders the wrapper with its classes and width variables', () => {
    const { wrapper } = setup();
    expect(wrapper.getAttribute('data-slot')).toBe('sidebar-wrapper');
    for (const cls of ['group/sidebar-wrapper', 'relative', 'flex', 'min-h-svh', 'w-full', 'h-full']) {
      expect(wrapper.classList).toContain(cls);
    }
    expect(wrapper.style.getPropertyValue('--sidebar-width')).toBe('16rem');
    expect(wrapper.style.getPropertyValue('--sidebar-width-mobile')).toBe('18rem');
  });

  it('throws when used outside a provider', () => {
    expect(() => TestBed.createComponent(OrphanHost).detectChanges()).toThrowError(
      'injectSidebar must be used within a SidebarProvider',
    );
  });
});

describe('sidebar provider: open state', () => {
  it('starts expanded, toggles from the trigger, and reports it', () => {
    const { state, trigger, host, flush } = setup();
    expect(state()).toBe('expanded');
    trigger().click();
    flush();
    expect(state()).toBe('collapsed');
    expect(host.changes).toEqual([false]);
  });

  it('honors defaultOpen=false', () => {
    const { state } = setup((h) => h.defaultOpen.set(false));
    expect(state()).toBe('collapsed');
  });

  it('a controlled open stays where the parent puts it', () => {
    const { state, trigger, host, fixture } = setup((h) => h.open.set(false));
    expect(state()).toBe('collapsed');
    trigger().click();
    fixture.detectChanges();
    expect(host.changes).toEqual([true]);
    expect(state()).toBe('collapsed');
    host.open.set(true);
    fixture.detectChanges();
    expect(state()).toBe('expanded');
  });

  it('setOpen accepts an updater', () => {
    const { sidebar, state, flush } = setup();
    sidebar.setOpen((prev) => !prev);
    flush();
    expect(state()).toBe('collapsed');
  });

  it('persists the desktop state to the sidebar_state cookie', () => {
    const { trigger, flush } = setup();
    expect(SIDEBAR_COOKIE_MAX_AGE).toBe(604800);
    trigger().click();
    flush();
    expect(document.cookie).toContain(`${SIDEBAR_COOKIE_NAME}=false`);
  });

  it('writes no cookie with persist=false', () => {
    const { trigger, flush } = setup((h) => h.persist.set(false));
    trigger().click();
    flush();
    expect(document.cookie).not.toContain(SIDEBAR_COOKIE_NAME);
  });
});

describe('sidebar provider: shortcut', () => {
  it('toggles on a bare "[" by default', () => {
    const { press, state } = setup();
    press('[');
    expect(state()).toBe('collapsed');
    press('[');
    expect(state()).toBe('expanded');
  });

  it('defaults to "]" once a right sidebar registers', () => {
    const { press, state, sidebar, flush } = setup();
    sidebar.registerSide('right');
    flush();
    expect(sidebar.shortcut()).toBe(']');
    press('[');
    expect(state()).toBe('expanded');
    press(']');
    expect(state()).toBe('collapsed');
  });

  it('skips modified keys and typing targets', () => {
    const { press, state, fixture } = setup();
    press('[', { metaKey: true });
    press('[', { ctrlKey: true });
    press('[', { altKey: true });
    press('[', {}, (fixture.nativeElement as HTMLElement).querySelector('[data-testid="field"]')!);
    expect(state()).toBe('expanded');
  });

  it('takes a custom key, and null disables it', () => {
    const custom = setup((h) => h.shortcut.set('b'));
    custom.press('[');
    expect(custom.state()).toBe('expanded');
    custom.press('B');
    expect(custom.state()).toBe('collapsed');
    custom.fixture.destroy();
    const off = setup((h) => h.shortcut.set(null));
    off.press('[');
    expect(off.state()).toBe('expanded');
    expect(off.sidebar.shortcut()).toBeNull();
  });

  it('answers in the innermost provider holding focus, else the outermost', () => {
    const fixture = TestBed.createComponent(NestedHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const state = (id: string) => el.querySelector(`[data-testid="${id}"]`)!.textContent;
    const press = (target: EventTarget) => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: '[', bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    press(el.querySelector('[data-testid="inner-button"]')!);
    expect(state('inner-probe')).toBe('collapsed');
    expect(state('outer-probe')).toBe('expanded');
    press(el.querySelector('[data-testid="outer-button"]')!);
    expect(state('outer-probe')).toBe('collapsed');
    expect(state('inner-probe')).toBe('collapsed');
    press(document.body);
    expect(state('outer-probe')).toBe('expanded');
    expect(state('inner-probe')).toBe('collapsed');
  });
});

describe('sidebar provider: mobile', () => {
  it('below the breakpoint the toggle drives the drawer, not the rail', () => {
    matchMediaMatches = true;
    const { sidebar, trigger, state, flush } = setup();
    flush();
    expect(sidebar.isMobile()).toBe(true);
    trigger().click();
    flush();
    expect(sidebar.openMobile()).toBe(true);
    expect(state()).toBe('expanded');
  });
});

describe('sidebar provider: width', () => {
  it('a drag-resize updates the live width; a new width input resets it', () => {
    const { sidebar, wrapper, host, flush } = setup();
    sidebar.setWidth('200px');
    flush();
    expect(sidebar.width()).toBe('200px');
    expect(wrapper.style.getPropertyValue('--sidebar-width')).toBe('200px');
    host.width.set('20rem');
    flush();
    expect(sidebar.width()).toBe('20rem');
  });
});

describe('sidebar provider: peek timer', () => {
  it('peeks after the 150ms intent delay and dismisses 250ms after leave', () => {
    vi.useFakeTimers();
    const { sidebar, flush } = setup((h) => {
      h.defaultOpen.set(false);
      h.peek.set('hover');
    });
    sidebar.schedulePeek();
    vi.advanceTimersByTime(149);
    expect(sidebar.isPeeking()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(sidebar.isPeeking()).toBe(true);
    sidebar.scheduleDismissPeek();
    vi.advanceTimersByTime(249);
    expect(sidebar.isPeeking()).toBe(true);
    sidebar.schedulePeek();
    vi.advanceTimersByTime(300);
    expect(sidebar.isPeeking()).toBe(true);
    sidebar.scheduleDismissPeek();
    vi.advanceTimersByTime(250);
    expect(sidebar.isPeeking()).toBe(false);
    flush();
  });

  it('pinning the sidebar open, or peek="none", drops the peek', () => {
    const { sidebar, flush } = setup((h) => {
      h.defaultOpen.set(false);
      h.peek.set('click');
    });
    sidebar.setIsPeeking(true);
    flush();
    expect(sidebar.isPeeking()).toBe(true);
    sidebar.setOpen(true);
    flush();
    expect(sidebar.isPeeking()).toBe(false);
    sidebar.setOpen(false);
    flush();
    expect(sidebar.isPeeking()).toBe(false);
  });
});
