/**
 * MenuItem through its public interface: the inline row (roles, roving tab
 * stop, activation by click / Enter / Space, the lit and checked styling, the
 * drawn check), the popup hand-off to the dropdown's primitive template, and
 * the fluid hover registration. The upstream dropdown tests
 * (dropdown-keyboard, dropdown-inline-shape) exercise MenuItem through the
 * Dropdown; the parts they pin on the row itself are ported here.
 */
import { Component, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { fontWeights } from '../core/font-weight';
import { shapeMap } from '../core/shape';
import { sizeMap } from '../core/size';
import { ACTIVE_ATTR, FluidHover } from '../fluid-hover/fluid-hover';
import {
  DROPDOWN_CONTEXT,
  MenuItem,
  MenuItemRow,
  type DropdownContextValue,
  type MenuItemTemplateContext,
} from './menu-item';

const checkedIndex = signal<number | undefined>(undefined);
const checkedIndices = signal<number[] | undefined>(undefined);
const activeIndex = signal<number | null>(null);
const registerItem = vi.fn();
const unregisterItem = vi.fn();

const panelContext: DropdownContextValue = {
  registerItem,
  unregisterItem,
  activeIndex,
  checkedIndex,
  checkedIndices,
  multiple: computed(() => checkedIndices() !== undefined),
};

@Component({
  imports: [MenuItem],
  providers: [{ provide: DROPDOWN_CONTEXT, useValue: panelContext }],
  template: `
    <div role="group">
      @for (row of rows(); track row.label; let i = $index) {
        <ff-menu-item
          [index]="i"
          [label]="row.label"
          [icon]="row.icon"
          [checked]="row.checked"
          [disabled]="row.disabled ?? false"
          class="extra-class"
          (select)="selected(row.label)"
        />
      }
    </div>
  `,
})
class Panel {
  readonly rows = signal<{ label: string; icon?: 'mail'; checked?: boolean; disabled?: boolean }[]>([
    { label: 'Teamspaces' },
    { label: 'Recents' },
    { label: 'Favorites' },
  ]);
  readonly selected = vi.fn();
}

type Rows = ReturnType<Panel['rows']>;

function setup(rows?: Rows) {
  const fixture = TestBed.createComponent(Panel);
  if (rows) fixture.componentInstance.rows.set(rows);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const row = (label: string) => el.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
  const detect = () => fixture.detectChanges();
  return { fixture, el, row, detect, selected: fixture.componentInstance.selected };
}

beforeEach(() => {
  checkedIndex.set(undefined);
  checkedIndices.set(undefined);
  activeIndex.set(null);
  registerItem.mockReset();
  unregisterItem.mockReset();
});

describe('menu item: roles', () => {
  it('a row with no checked state is a plain menuitem with no aria-checked', () => {
    const { row } = setup();
    expect(row('Recents').getAttribute('role')).toBe('menuitem');
    expect(row('Recents').hasAttribute('aria-checked')).toBe(false);
  });

  it('a boolean checked makes a radio row that announces its state, false included', () => {
    const { row } = setup([{ label: 'A', checked: true }, { label: 'B', checked: false }]);
    expect(row('A').getAttribute('role')).toBe('menuitemradio');
    expect(row('A').getAttribute('aria-checked')).toBe('true');
    expect(row('B').getAttribute('role')).toBe('menuitemradio');
    expect(row('B').getAttribute('aria-checked')).toBe('false');
  });

  it('under checkedIndices a boolean checked makes a checkbox row', () => {
    checkedIndices.set([0]);
    const { row } = setup([{ label: 'A', checked: true }, { label: 'B' }]);
    expect(row('A').getAttribute('role')).toBe('menuitemcheckbox');
    expect(row('A').getAttribute('aria-checked')).toBe('true');
    expect(row('B').getAttribute('role')).toBe('menuitem');
  });

  it('marks the row with its index and names it with its label', () => {
    const { row } = setup();
    expect(row('Favorites').getAttribute('data-fluid-hover-index')).toBe('2');
    expect(row('Favorites').textContent).toContain('Favorites');
  });
});

describe('menu item: roving tab stop', () => {
  it('the first row is the tab stop when nothing is checked', () => {
    const { row } = setup();
    expect(row('Teamspaces').getAttribute('tabindex')).toBe('0');
    expect(row('Recents').getAttribute('tabindex')).toBe('-1');
  });

  it('the checked row is the tab stop', () => {
    checkedIndex.set(2);
    const { row } = setup();
    expect(row('Favorites').getAttribute('tabindex')).toBe('0');
    expect(row('Teamspaces').getAttribute('tabindex')).toBe('-1');
  });

  it('the first checked row is the tab stop under checkedIndices', () => {
    checkedIndices.set([1, 2]);
    const { row } = setup();
    expect(row('Recents').getAttribute('tabindex')).toBe('0');
  });

  it('a disabled row is never the tab stop', () => {
    const { row } = setup([{ label: 'A', disabled: true }, { label: 'B' }]);
    expect(row('A').getAttribute('tabindex')).toBe('-1');
  });
});

describe('menu item: activation', () => {
  it('selects a clicked row once', () => {
    const { row, selected } = setup();
    row('Recents').click();
    expect(selected).toHaveBeenCalledTimes(1);
    expect(selected).toHaveBeenCalledWith('Recents');
  });

  it.each(['Enter', ' '])('selects a focused row with %j and prevents the default', (key) => {
    const { row, selected } = setup();
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    row('Recents').dispatchEvent(event);
    expect(selected).toHaveBeenCalledTimes(1);
    expect(selected).toHaveBeenCalledWith('Recents');
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores other keys', () => {
    const { row, selected } = setup();
    row('Recents').dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(selected).not.toHaveBeenCalled();
  });

  it('a disabled row neither selects nor reacts, and says so', () => {
    const { row, selected } = setup([{ label: 'A', disabled: true }]);
    row('A').click();
    row('A').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(selected).not.toHaveBeenCalled();
    expect(row('A').getAttribute('aria-disabled')).toBe('true');
    expect(row('A').classList).toContain('opacity-50');
    expect(row('A').classList).toContain('pointer-events-none');
  });
});

describe('menu item: styling', () => {
  it('carries the rounded row classes at the size step, plus the consumer class', () => {
    const { row } = setup();
    const size = sizeMap.default;
    for (const cls of [
      'relative', 'z-10', 'flex', size.control, 'shrink-0', 'items-center', size.gap,
      ...shapeMap.rounded.item.split(' '), size.itemPx, 'cursor-pointer', 'outline-none', 'extra-class',
    ]) {
      expect(row('Recents').classList).toContain(cls);
    }
    expect(row('Recents').hasAttribute('aria-disabled')).toBe(false);
  });

  it('the label is muted at rest and lifts to foreground on the lit row', () => {
    const { row, detect } = setup();
    const label = () => row('Recents').querySelector<HTMLElement>('span:not([aria-hidden]) > span:not([aria-hidden])')!;
    expect(label().classList).toContain('text-muted-foreground');
    activeIndex.set(1);
    detect();
    expect(label().classList).toContain('text-foreground');
    expect(label().classList).not.toContain('text-muted-foreground');
  });

  it('a checked row is foreground and semibold; an unchecked one is normal weight', () => {
    const { row } = setup([{ label: 'A', checked: true }, { label: 'B', checked: false }]);
    const visible = (r: HTMLElement) => r.querySelectorAll<HTMLElement>('.inline-grid.flex-1 > span')[1];
    const sizer = (r: HTMLElement) => r.querySelectorAll<HTMLElement>('.inline-grid.flex-1 > span')[0];
    expect(visible(row('A')).style.fontVariationSettings).toBe(fontWeights.semibold);
    expect(visible(row('A')).classList).toContain('text-foreground');
    expect(visible(row('B')).style.fontVariationSettings).toBe(fontWeights.normal);
    // The invisible bold sizer keeps the row width from jumping.
    expect(sizer(row('B')).getAttribute('aria-hidden')).toBe('true');
    expect(sizer(row('B')).style.fontVariationSettings).toBe(fontWeights.semibold);
  });

  it('renders the leading icon only when given one, thicker on the lit row', () => {
    const { row, detect } = setup([{ label: 'A', icon: 'mail' }, { label: 'B' }]);
    expect(row('B').querySelector('svg.lucide')).toBeNull();
    const icons = () => row('A').querySelectorAll<SVGElement>('svg.lucide-mail');
    expect(icons().length).toBe(2);
    expect(icons()[1].getAttribute('stroke-width')).toBe('1.5');
    expect(icons()[1].getAttribute('class')).toContain('text-muted-foreground');
    activeIndex.set(0);
    detect();
    expect(icons()[1].getAttribute('stroke-width')).toBe('2');
    expect(icons()[1].getAttribute('class')).toContain('text-foreground');
  });
});

describe('menu item: check mark', () => {
  const check = (r: HTMLElement) => r.querySelector('path[d="M4 12L9 17L20 6"]');

  it('shows the check on a checked row and none on an unchecked one', () => {
    const { row } = setup([{ label: 'A', checked: true }, { label: 'B', checked: false }, { label: 'C' }]);
    expect(check(row('A'))).not.toBeNull();
    expect(check(row('B'))).toBeNull();
    expect(check(row('C'))).toBeNull();
  });

  // React's motion.path renders a drawn check as pathLength 1 (attribute
  // pathLength="1", dash "1 1"); the exit animates that stroke down to 0,
  // so it needs the drawn length to start from.
  it('a check present at mount is a fully drawn, normalised stroke', () => {
    const { row } = setup([{ label: 'A', checked: true }]);
    const path = check(row('A'))!;
    expect(path.getAttribute('pathLength')).toBe('1');
    expect(path.getAttribute('stroke-dasharray')).toBe('1 1');
  });

  // A check that draws in starts undrawn in the very render that mounts it,
  // never one painted frame at full length before the draw begins.
  it('a newly checked row mounts its check undrawn', () => {
    const { fixture, row, detect } = setup([{ label: 'A', checked: false }]);
    fixture.componentInstance.rows.set([{ label: 'A', checked: true }]);
    detect();
    const path = check(row('A'))!;
    expect(path.getAttribute('pathLength')).toBe('1');
    expect(path.getAttribute('stroke-dasharray')).toBe('0 1');
  });

  it('draws the check in when the row becomes checked and removes it after unchecking', async () => {
    const { fixture, row, detect } = setup([{ label: 'A', checked: false }]);
    fixture.componentInstance.rows.set([{ label: 'A', checked: true }]);
    detect();
    expect(check(row('A'))).not.toBeNull();
    fixture.componentInstance.rows.set([{ label: 'A', checked: false }]);
    detect();
    await vi.waitFor(
      () => {
        detect();
        expect(check(row('A'))).toBeNull();
      },
      { timeout: 1000 },
    );
  });
});

describe('menu item: fluid hover registration', () => {
  it('registers each row element with the list at its index and unregisters on removal', () => {
    const { fixture, row, detect } = setup();
    expect(registerItem).toHaveBeenCalledWith(1, row('Recents'));
    const removed = row('Favorites');
    fixture.componentInstance.rows.set([{ label: 'Teamspaces' }, { label: 'Recents' }]);
    detect();
    expect(unregisterItem).toHaveBeenCalledWith(2, removed);
  });
});

@Component({
  imports: [FluidHover, MenuItem],
  template: `
    <div ffFluidHover #list="ffFluidHover" role="group">
      <ff-menu-item [index]="0" label="One" />
      <ff-menu-item [index]="1" label="Two" />
    </div>
  `,
})
class StaticList {
  readonly list = viewChild.required<FluidHover>('list');
}

describe('menu item: standalone in a fluid hover list', () => {
  it('registers with the enclosing [ffFluidHover] and lights with its active index', () => {
    const fixture = TestBed.createComponent(StaticList);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const controller = fixture.componentInstance.list().controller;
    controller.setActiveIndex(1);
    fixture.detectChanges();
    const two = el.querySelector<HTMLElement>('[aria-label="Two"]')!;
    expect(two.hasAttribute(ACTIVE_ATTR)).toBe(true);
    expect(two.querySelectorAll('.inline-grid.flex-1 > span')[1].classList).toContain('text-foreground');
  });
});

@Component({
  template: `<ff-menu-item [index]="0" label="Orphan" />`,
  imports: [MenuItem],
})
class Orphan {}

describe('menu item: outside a dropdown', () => {
  it('throws like useDropdown does', () => {
    expect(() => TestBed.createComponent(Orphan)).toThrow(/within a Dropdown/);
  });
});

// The popup path: the dropdown supplies a template that wraps the styled row
// in its menu-item primitive. This fake primitive owns role and activation.
@Component({
  imports: [MenuItem, MenuItemRow, NgTemplateOutlet],
  providers: [
    {
      provide: DROPDOWN_CONTEXT,
      useFactory: (): DropdownContextValue => ({
        ...panelContext,
        inMenu: true,
        menuItemTemplate: inject(Popup).primitive,
      }),
    },
  ],
  template: `
    <div role="menu">
      <ng-template #primitive let-o>
        <div
          [ffMenuItemRow]="o"
          [attr.role]="o.role"
          [attr.data-close]="o.closeOnClick"
          (click)="o.onActivate?.($event)"
        >
          <ng-container [ngTemplateOutlet]="o.content" />
        </div>
      </ng-template>
      <ff-menu-item [index]="0" label="Action" (select)="selected('Action')" />
      <ff-menu-item [index]="1" label="Radio" [checked]="false" />
      <ff-menu-item [index]="2" label="Off" [disabled]="true" (select)="selected('Off')" />
    </div>
  `,
})
class Popup {
  readonly primitive = viewChild<TemplateRef<MenuItemTemplateContext>>('primitive');
  readonly selected = vi.fn();
}

describe('menu item: popup hand-off', () => {
  function setupPopup() {
    const fixture = TestBed.createComponent(Popup);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const row = (label: string) => el.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
    return { fixture, el, row };
  }

  it('renders through the primitive template with the styled row and its content', () => {
    const { row } = setupPopup();
    expect(row('Action').getAttribute('role')).toBe('menuitem');
    expect(row('Action').getAttribute('data-fluid-hover-index')).toBe('0');
    expect(row('Action').classList).toContain('cursor-pointer');
    expect(row('Action').textContent).toContain('Action');
    // The primitive owns tabindex and keyboard handling, not the row.
    expect(row('Action').hasAttribute('tabindex')).toBe(false);
    expect(row('Radio').getAttribute('role')).toBe('menuitemradio');
  });

  it('hands the primitive an activation that emits select, and none when disabled', () => {
    const { fixture, row } = setupPopup();
    row('Action').click();
    row('Off').click();
    expect(fixture.componentInstance.selected).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.selected).toHaveBeenCalledWith('Action');
  });

  it('closes on click by default when not under checkedIndices', () => {
    const { row } = setupPopup();
    expect(row('Action').getAttribute('data-close')).toBe('true');
  });

  it('registers the primitive-wrapped row with the list', () => {
    const { row } = setupPopup();
    expect(registerItem).toHaveBeenCalledWith(0, row('Action'));
  });
});
