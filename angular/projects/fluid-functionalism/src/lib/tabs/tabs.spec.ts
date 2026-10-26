/**
 * Tabs: a segmented control built on @angular/aria/tabs. Arrow keys move
 * focus and select in one step; the value is controlled (`value` or
 * `selectedIndex`) or uncontrolled (`defaultValue`, else the first tab).
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { type SizeVariant } from '../core/size';
import { ACTIVE_INDEX_ATTR } from '../fluid-hover/fluid-hover';
import { TabItem, TabPanel, Tabs, TabsList } from './tabs';

const VALUES = ['library', 'recents', 'favorites', 'settings'];

@Component({
  imports: [Tabs, TabsList, TabItem, TabPanel],
  template: `
    <ff-tabs
      [value]="value()"
      (valueChange)="onValue($event)"
      [selectedIndex]="selectedIndex()"
      (selectedIndexChange)="indexChanges.push($event)"
      [defaultValue]="defaultValue()"
      [size]="size()"
      data-testid="root"
    >
      <ff-tabs-list class="w-fit" data-testid="list">
        @for (v of values; track v) {
          <button ffTabItem [value]="v" [label]="v" [icon]="v === 'settings' ? 'settings' : undefined"></button>
        }
      </ff-tabs-list>
      @for (v of values; track v) {
        <ff-tab-panel [value]="v">
          <p>{{ v }} content</p>
        </ff-tab-panel>
      }
    </ff-tabs>
  `,
})
class Host {
  readonly values = VALUES;
  readonly value = signal<string | undefined>(undefined);
  readonly selectedIndex = signal<number | undefined>(undefined);
  readonly defaultValue = signal<string | undefined>(undefined);
  readonly size = signal<SizeVariant | undefined>(undefined);
  /** When true the parent echoes changes back (two-way); false keeps it fixed. */
  readonly echo = signal(true);
  readonly valueChanges: string[] = [];
  readonly indexChanges: number[] = [];
  onValue(v: string) {
    this.valueChanges.push(v);
    if (this.echo() && this.value() !== undefined) this.value.set(v);
  }
}

async function setup(configure: (host: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  document.body.appendChild(fixture.nativeElement);
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  await settle();
  const el = fixture.nativeElement as HTMLElement;
  const list = el.querySelector<HTMLElement>('[data-testid="list"]')!;
  const tabs = () => Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = () => Array.from(el.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  const selected = () => tabs().map((t) => t.getAttribute('aria-selected') === 'true');
  const key = async (target: HTMLElement, k: string) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    await settle();
  };
  return { fixture, host: fixture.componentInstance, el, list, tabs, panels, selected, key, settle };
}

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, 'warn');
});

afterEach(() => {
  // The primitive reports misuse (a panel without content, a tab without a
  // panel) through console.warn; a correct composition reports nothing.
  expect(warn).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('Tabs: semantics', () => {
  it('renders a tablist of tabs linked to their panels', async () => {
    const { list, tabs, panels } = await setup();
    expect(list.getAttribute('role')).toBe('tablist');
    expect(tabs().length).toBe(4);
    expect(tabs().every((t) => t.type === 'button')).toBe(true);
    expect(tabs().map((t) => t.getAttribute('data-fluid-hover-index'))).toEqual(['0', '1', '2', '3']);
    const panel = panels()[1];
    expect(tabs()[1].getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs()[1].id);
  });

  it('with no value or defaultValue the first tab is selected', async () => {
    const { selected, panels } = await setup();
    expect(selected()).toEqual([true, false, false, false]);
    expect(panels().map((p) => p.hidden)).toEqual([false, true, true, true]);
    expect(panels()[0].textContent).toContain('library content');
    expect(panels()[1].textContent).not.toContain('recents content');
  });

  it('defaultValue picks the initial tab', async () => {
    const { selected } = await setup((h) => h.defaultValue.set('favorites'));
    expect(selected()).toEqual([false, false, true, false]);
  });
});

describe('Tabs: selection', () => {
  it('uncontrolled: a click selects, shows its panel and reports value and index', async () => {
    const { tabs, selected, panels, host, settle } = await setup();
    tabs()[2].click();
    await settle();
    expect(selected()).toEqual([false, false, true, false]);
    expect(panels().map((p) => p.hidden)).toEqual([true, true, false, true]);
    expect(panels()[2].textContent).toContain('favorites content');
    expect(host.valueChanges).toEqual(['favorites']);
    expect(host.indexChanges).toEqual([2]);
  });

  it('controlled by value: follows the parent, two-way', async () => {
    const { tabs, selected, host, settle } = await setup((h) => h.value.set('recents'));
    expect(selected()).toEqual([false, true, false, false]);
    tabs()[3].click();
    await settle();
    expect(host.value()).toBe('settings');
    expect(selected()).toEqual([false, false, false, true]);
    host.value.set('library');
    await settle();
    expect(selected()).toEqual([true, false, false, false]);
  });

  it('controlled by value without an echo: reports the click but keeps the selection', async () => {
    const { tabs, selected, host, settle } = await setup((h) => {
      h.value.set('recents');
      h.echo.set(false);
    });
    tabs()[0].click();
    await settle();
    expect(host.valueChanges).toEqual(['library']);
    expect(selected()).toEqual([false, true, false, false]);
  });

  it('selectedIndex selects by position', async () => {
    const { selected, host, settle } = await setup((h) => h.selectedIndex.set(3));
    expect(selected()).toEqual([false, false, false, true]);
    host.selectedIndex.set(1);
    await settle();
    expect(selected()).toEqual([false, true, false, false]);
  });

  it('value takes precedence over selectedIndex', async () => {
    const { selected } = await setup((h) => {
      h.selectedIndex.set(3);
      h.value.set('recents');
    });
    expect(selected()).toEqual([false, true, false, false]);
  });
});

describe('Tabs: keyboard', () => {
  it('arrows move focus and select in one step, wrapping at the ends', async () => {
    const { tabs, selected, key, host } = await setup();
    tabs()[0].focus();
    await key(tabs()[0], 'ArrowRight');
    expect(document.activeElement).toBe(tabs()[1]);
    expect(selected()).toEqual([false, true, false, false]);
    await key(tabs()[1], 'ArrowLeft');
    await key(tabs()[0], 'ArrowLeft');
    expect(document.activeElement).toBe(tabs()[3]);
    expect(selected()).toEqual([false, false, false, true]);
    expect(host.valueChanges).toEqual(['recents', 'library', 'settings']);
  });

  it('Home and End select the first and last tab', async () => {
    const { tabs, selected, key } = await setup((h) => h.defaultValue.set('recents'));
    tabs()[1].focus();
    await key(tabs()[1], 'End');
    expect(selected()).toEqual([false, false, false, true]);
    await key(tabs()[3], 'Home');
    expect(selected()).toEqual([true, false, false, false]);
  });

  it('roving tabindex: only the selected tab is in the tab order', async () => {
    const { tabs } = await setup((h) => h.defaultValue.set('favorites'));
    expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '-1', '0', '-1']);
  });
});

describe('Tabs: rendering', () => {
  const visibleLabel = (tab: HTMLElement) => tab.querySelector<HTMLElement>('.inline-grid > span:not([aria-hidden])')!;

  it('list and tab classes follow the segmented control and the size ladder', async () => {
    const { list, tabs, host, settle } = await setup();
    for (const c of ['relative', 'inline-flex', 'items-center', 'select-none', 'bg-muted', 'p-1', 'rounded-xl', 'w-fit']) {
      expect(list.classList.contains(c), c).toBe(true);
    }
    const tabClasses = 'relative z-10 flex items-center px-3 cursor-pointer bg-transparent border-none outline-none h-7 gap-2';
    for (const c of tabClasses.split(' ')) expect(tabs()[0].classList.contains(c), c).toBe(true);
    host.size.set('compact');
    await settle();
    expect(list.classList.contains('p-0.5')).toBe(true);
    expect(tabs()[0].classList.contains('h-6')).toBe(true);
    expect(tabs()[0].classList.contains('gap-1')).toBe(true);
  });

  it('the selected label is semibold and foreground, with an invisible bold sizer', async () => {
    const { tabs } = await setup();
    expect(visibleLabel(tabs()[0]).className).toContain('text-foreground');
    expect(visibleLabel(tabs()[0]).style.fontVariationSettings).toContain("'wght' 550");
    expect(visibleLabel(tabs()[1]).className).toContain('text-muted-foreground');
    expect(visibleLabel(tabs()[1]).style.fontVariationSettings).toContain("'wght' 400");
    const sizer = tabs()[1].querySelector<HTMLElement>('[aria-hidden="true"].invisible')!;
    expect(sizer.textContent).toBe('recents');
  });

  it('renders a leading icon when given', async () => {
    const { tabs } = await setup();
    expect(tabs()[3].querySelector('svg')).not.toBeNull();
    expect(tabs()[0].querySelector('svg')).toBeNull();
  });

  it('draws the raised selected pill once measured, and a focus ring for keyboard focus', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(80);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(28);
    const { fixture, list, tabs, settle } = await setup();
    const layer = (slot: string) => list.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(layer('selected-pill').length).toBe(1);
    });
    // On the page (surface 1) the pill lifts to surface 4.
    expect(layer('selected-pill')[0].className).toContain('bg-surface-4 shadow-surface-4');
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    tabs()[2].focus();
    await settle();
    expect(list.getAttribute(ACTIVE_INDEX_ATTR)).toBe('2');
    expect(layer('focus-ring').length).toBe(1);
    expect(layer('hover-pill').length).toBe(1);
    expect(layer('hover-pill')[0].className).toContain('bg-hover');
  });
});
