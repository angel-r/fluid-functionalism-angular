/**
 * TabsSubtle: a manual-activation tablist (arrows move focus, a click or
 * Enter/Space selects) with a selected pill, a hover pill and one shared focus
 * ring, plus a standalone TabsSubtlePanel linked through `idPrefix`.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ACTIVE_INDEX_ATTR } from '../fluid-hover/fluid-hover';
import { type SizeVariant } from '../core/size';
import { TabsSubtle, TabsSubtleItem, TabsSubtlePanel } from './tabs-subtle';

@Component({
  imports: [TabsSubtle, TabsSubtleItem, TabsSubtlePanel],
  template: `
    <ff-tabs-subtle
      [(selectedIndex)]="selected"
      (selectedIndexChange)="changes.push($event)"
      [idPrefix]="idPrefix()"
      [activeLabel]="activeLabel()"
      [size]="size()"
      aria-label="Filter results"
      class="w-80"
      data-testid="list"
    >
      @for (tab of tabs; track tab.label; let i = $index) {
        <button ffTabsSubtleItem [index]="i" [label]="tab.label" [icon]="withIcons() ? tab.icon : undefined"></button>
      }
    </ff-tabs-subtle>
    @for (tab of tabs; track tab.label; let i = $index) {
      <ff-tabs-subtle-panel [index]="i" [selectedIndex]="selected()" idPrefix="demo">
        <p>{{ tab.label }} content</p>
      </ff-tabs-subtle-panel>
    }
  `,
})
class Host {
  readonly selected = signal(0);
  readonly idPrefix = signal<string | undefined>('demo');
  readonly activeLabel = signal(false);
  readonly withIcons = signal(false);
  readonly size = signal<SizeVariant | undefined>(undefined);
  readonly changes: number[] = [];
  readonly tabs = [
    { label: 'Teamspaces', icon: 'square-library' as const },
    { label: 'Recents', icon: 'clock' as const },
    { label: 'Favorites', icon: 'star' as const },
    { label: 'Shared', icon: 'users' as const },
  ];
}

function setup(configure: (host: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  document.body.appendChild(fixture.nativeElement);
  const el = fixture.nativeElement as HTMLElement;
  const list = el.querySelector<HTMLElement>('[data-testid="list"]')!;
  const tabs = () => Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = () => Array.from(el.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  const key = (target: HTMLElement, k: string) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  return { fixture, host: fixture.componentInstance, el, list, tabs, panels, key };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('TabsSubtle: tablist semantics', () => {
  it('renders a tablist of tabs with the selected one marked and in the tab order', () => {
    const { list, tabs } = setup();
    expect(list.getAttribute('role')).toBe('tablist');
    expect(list.getAttribute('aria-label')).toBe('Filter results');
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false']);
    expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
    expect(tabs().every((t) => t.type === 'button')).toBe(true);
    expect(tabs().map((t) => t.getAttribute('data-fluid-hover-index'))).toEqual(['0', '1', '2', '3']);
  });

  it('merges the consumer class onto the list classes', () => {
    const { list } = setup();
    for (const c of ['relative', 'flex', 'items-center', 'select-none', 'overflow-x-auto', 'scrollbar-hide', '-mx-1', 'w-80']) {
      expect(list.classList.contains(c), c).toBe(true);
    }
  });

  it('a click selects: emits the index and, two-way bound, moves aria-selected', () => {
    const { fixture, host, tabs } = setup();
    tabs()[2].click();
    fixture.detectChanges();
    expect(host.changes).toEqual([2]);
    expect(host.selected()).toBe(2);
    expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
    expect(tabs()[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs()[2].getAttribute('tabindex')).toBe('0');
  });

  it('clicking the selected tab emits nothing', () => {
    const { fixture, host, tabs } = setup();
    tabs()[0].click();
    fixture.detectChanges();
    expect(host.changes).toEqual([]);
  });

  it('follows a selectedIndex set by the parent', () => {
    const { fixture, host, tabs } = setup();
    host.selected.set(3);
    fixture.detectChanges();
    expect(tabs()[3].getAttribute('aria-selected')).toBe('true');
    expect(tabs()[3].getAttribute('tabindex')).toBe('0');
  });
});

describe('TabsSubtle: keyboard (manual activation)', () => {
  it('ArrowRight / ArrowLeft move focus and wrap, without selecting', () => {
    const { tabs, key, host } = setup();
    tabs()[0].focus();
    key(tabs()[0], 'ArrowRight');
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs()[1].getAttribute('tabindex')).toBe('0');
    expect(tabs()[0].getAttribute('tabindex')).toBe('-1');
    key(tabs()[1], 'ArrowLeft');
    key(tabs()[0], 'ArrowLeft');
    expect(document.activeElement).toBe(tabs()[3]);
    key(tabs()[3], 'ArrowRight');
    expect(document.activeElement).toBe(tabs()[0]);
    expect(host.changes).toEqual([]);
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
  });

  it('Home and End jump to the ends', () => {
    const { tabs, key } = setup();
    tabs()[1].focus();
    key(tabs()[1], 'End');
    expect(document.activeElement).toBe(tabs()[3]);
    key(tabs()[3], 'Home');
    expect(document.activeElement).toBe(tabs()[0]);
  });

  it('a click after arrowing selects the focused tab', () => {
    const { fixture, tabs, key, host } = setup();
    tabs()[0].focus();
    key(tabs()[0], 'ArrowRight');
    (document.activeElement as HTMLElement).click();
    fixture.detectChanges();
    expect(host.changes).toEqual([1]);
  });
});

describe('TabsSubtle: idPrefix links tabs and panels', () => {
  it('ids and aria-controls derive from the prefix', () => {
    const { tabs, panels } = setup();
    expect(tabs().map((t) => t.id)).toEqual(['demo-tab-0', 'demo-tab-1', 'demo-tab-2', 'demo-tab-3']);
    expect(tabs()[1].getAttribute('aria-controls')).toBe('demo-panel-1');
    expect(panels()[1].id).toBe('demo-panel-1');
    expect(panels()[1].getAttribute('aria-labelledby')).toBe('demo-tab-1');
    expect(panels()[1].getAttribute('tabindex')).toBe('-1');
  });

  it('without a prefix the tabs carry no id or aria-controls', () => {
    const { tabs } = setup((h) => h.idPrefix.set(undefined));
    expect(tabs().some((t) => t.hasAttribute('id') || t.hasAttribute('aria-controls'))).toBe(false);
  });

  it('only the selected panel is visible and renders its content', () => {
    const { fixture, host, panels } = setup();
    expect(panels().map((p) => p.hidden)).toEqual([false, true, true, true]);
    expect(panels()[0].textContent).toContain('Teamspaces content');
    expect(panels()[1].textContent?.trim()).toBe('');
    host.selected.set(1);
    fixture.detectChanges();
    expect(panels().map((p) => p.hidden)).toEqual([true, false, true, true]);
    expect(panels()[1].textContent).toContain('Recents content');
    expect(panels()[0].textContent?.trim()).toBe('');
  });
});

describe('TabsSubtle: labels, icons and size', () => {
  const visibleLabel = (tab: HTMLElement) =>
    tab.querySelector<HTMLElement>('.inline-grid > span:not([aria-hidden])');

  it('the selected label is foreground and semibold; the rest muted and normal', () => {
    const { tabs } = setup();
    const selected = visibleLabel(tabs()[0])!;
    const other = visibleLabel(tabs()[1])!;
    expect(selected.className).toContain('text-foreground');
    expect(selected.style.fontVariationSettings).toContain("'wght' 550");
    expect(other.className).toContain('text-muted-foreground');
    expect(other.style.fontVariationSettings).toContain("'wght' 400");
    // The invisible semibold sizer reserves the bold width.
    const sizer = tabs()[1].querySelector<HTMLElement>('[aria-hidden="true"].invisible')!;
    expect(sizer.textContent).toBe('Recents');
  });

  it('activeLabel with icons shows only the selected label and names the rest with aria-label', () => {
    const { tabs } = setup((h) => {
      h.activeLabel.set(true);
      h.withIcons.set(true);
    });
    expect(visibleLabel(tabs()[0])?.textContent).toBe('Teamspaces');
    expect(tabs()[0].hasAttribute('aria-label')).toBe(false);
    expect(visibleLabel(tabs()[1])).toBeNull();
    expect(tabs()[1].getAttribute('aria-label')).toBe('Recents');
    expect(tabs()[1].querySelector('svg')).not.toBeNull();
    // A collapsing label drops the icon-to-label gap from the tab.
    expect(tabs()[1].className).not.toContain('gap-2');
  });

  it('activeLabel: selecting another tab grows its label in and collapses the old one out', async () => {
    const { fixture, host, tabs } = setup((h) => {
      h.activeLabel.set(true);
      h.withIcons.set(true);
    });
    host.selected.set(1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(visibleLabel(tabs()[1])?.textContent).toBe('Recents');
    expect(tabs()[1].hasAttribute('aria-label')).toBe(false);
    expect(tabs()[0].getAttribute('aria-label')).toBe('Teamspaces');
    // The old label stays mounted for its exit, then leaves.
    await vi.waitFor(
      () => {
        fixture.detectChanges();
        expect(visibleLabel(tabs()[0])).toBeNull();
      },
      { timeout: 1000 },
    );
  });

  it('activeLabel without icons keeps every label', () => {
    const { tabs } = setup((h) => h.activeLabel.set(true));
    expect(tabs().every((t) => visibleLabel(t) !== null && !t.hasAttribute('aria-label'))).toBe(true);
    expect(tabs()[1].className).toContain('gap-2');
  });

  it('size pins the tabs to a ladder step', () => {
    const { fixture, host, tabs } = setup();
    expect(tabs()[0].className).toContain('h-9');
    host.size.set('compact');
    fixture.detectChanges();
    expect(tabs()[0].className).toContain('h-7');
    expect(tabs()[0].className).toContain('px-2.5');
  });
});

describe('TabsSubtle: pills and focus ring', () => {
  // jsdom has no layout; give every element a box so the rects publish.
  function withLayout() {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(80);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(36);
  }
  const layer = (list: HTMLElement, slot: string) => list.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`);

  it('draws the selected pill once the tabs are measured', async () => {
    withLayout();
    const { fixture, list } = setup();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(layer(list, 'selected-pill').length).toBe(1);
    });
    expect(layer(list, 'selected-pill')[0].className).toContain('absolute bg-active pointer-events-none rounded-lg');
  });

  it('keyboard focus lights the tab, draws one focus ring, and leaving the list drops both', async () => {
    withLayout();
    const { fixture, list, tabs } = setup();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(layer(list, 'selected-pill').length).toBe(1);
    });
    // A Tab keypress first, so the focus that follows counts as :focus-visible.
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    tabs()[1].focus();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(list.getAttribute(ACTIVE_INDEX_ATTR)).toBe('1');
    expect(layer(list, 'focus-ring').length).toBe(1);
    expect(layer(list, 'focus-ring')[0].className).toContain('border-[color:var(--focus-ring,#6B97FF)]');
    // Hovering a tab other than the selected one shows the hover pill.
    expect(layer(list, 'hover-pill').length).toBe(1);
    const label = tabs()[1].querySelector<HTMLElement>('.inline-grid > span:not([aria-hidden])')!;
    expect(label.className).toContain('text-foreground');
    tabs()[1].blur();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(list.hasAttribute(ACTIVE_INDEX_ATTR)).toBe(false);
    await vi.waitFor(() => expect(layer(list, 'focus-ring').length).toBe(0), { timeout: 1000 });
  });
});
