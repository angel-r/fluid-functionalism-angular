/**
 * The sidebar's smaller parts through their public interface, pinning
 * registry/default/sidebar-core.tsx: SidebarTrigger (toggle, side-aware icon,
 * tooltip with the keystroke, hover-peek affordance), SidebarInset /
 * SidebarInput / header / footer / separator / group content, and the
 * SidebarGroup family (collapsible label toggle, ARIA wiring, collapse
 * wrapper, chevron, header action cluster and its label padding, leading-text
 * truncation, attribute composition).
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { ShapeProvider } from '../core/shape';
import { SizeProvider, type SizeVariant } from '../core/size';
import { typeClass } from '../core/type-scale';
import {
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupActions,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  type SidebarContextValue,
  type SidebarPeek,
} from './index';

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete (document.documentElement as { clientWidth?: number }).clientWidth;
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
});

// ── Trigger ──────────────────────────────────────────────

@Component({
  imports: [SidebarProvider, SidebarTrigger, SizeProvider],
  template: `
    <div ffSizeProvider [size]="size()">
      <ff-sidebar-provider [defaultOpen]="defaultOpen()" [peek]="peek()">
        <ff-sidebar-trigger data-testid="host" (click)="clicks = clicks + 1" />
        @if (custom()) {
          <ff-sidebar-trigger><span data-testid="custom">Menu</span></ff-sidebar-trigger>
        }
      </ff-sidebar-provider>
    </div>
  `,
})
class TriggerHost {
  readonly size = signal<SizeVariant>('default');
  readonly defaultOpen = signal(true);
  readonly peek = signal<SidebarPeek>('none');
  readonly custom = signal(false);
  clicks = 0;
}

function setupTrigger(configure: (h: TriggerHost) => void = () => {}) {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] });
  const fixture = TestBed.createComponent(TriggerHost);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const trigger = () => el.querySelector<HTMLButtonElement>('[data-sidebar="trigger"]')!;
  const sidebar = fixture.debugElement.query((d) => d.name === 'ff-sidebar-provider').injector.get(
    SidebarProvider,
  ) as SidebarContextValue;
  const flush = (ms = 0) => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };
  return { fixture, el, trigger, sidebar, flush };
}

describe('sidebar trigger', () => {
  it('is a ghost icon button named "Toggle Sidebar" that toggles the sidebar', () => {
    const { trigger, sidebar, flush, fixture } = setupTrigger();
    expect(trigger().getAttribute('aria-label')).toBe('Toggle Sidebar');
    expect(trigger().classList).toContain('h-9');
    expect(trigger().classList).toContain('w-9');
    expect(trigger().querySelector('svg.lucide-panel-left')).not.toBeNull();
    trigger().click();
    flush();
    expect(sidebar.open()).toBe(false);
    expect(fixture.componentInstance.clicks).toBe(1);
  });

  it('mirrors its icon for a right sidebar and shrinks in compact regions', () => {
    const { trigger, sidebar, flush } = setupTrigger((h) => h.size.set('compact'));
    expect(trigger().classList).toContain('h-7');
    sidebar.registerSide('right');
    flush();
    expect(trigger().querySelector('svg.lucide-panel-right')).not.toBeNull();
  });

  it('projected content replaces the icon', () => {
    const { el } = setupTrigger((h) => h.custom.set(true));
    const custom = el.querySelector('[data-testid="custom"]')!;
    expect(custom.closest('[data-sidebar="trigger"]')!.querySelector('svg')).toBeNull();
  });

  it('its tooltip names the action and shows the keystroke', () => {
    const { trigger, sidebar, flush } = setupTrigger();
    trigger().dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
    flush(200);
    const popup = () => document.querySelector('[data-slot="tooltip-popup"]')!;
    expect(popup().textContent).toContain('Collapse sidebar');
    expect(popup().querySelector('kbd')!.textContent).toBe('[');
    sidebar.setOpen(false);
    flush();
    expect(popup().textContent).toContain('Expand sidebar');
  });

  it('with hover-peek, resting on the collapsed trigger floats the rail out', () => {
    const { trigger, sidebar, flush } = setupTrigger((h) => {
      h.defaultOpen.set(false);
      h.peek.set('hover');
    });
    trigger().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    flush(150);
    expect(sidebar.isPeeking()).toBe(true);
  });
});

// ── Sections ─────────────────────────────────────────────

@Component({
  imports: [
    SidebarInset,
    SidebarInput,
    SidebarHeader,
    SidebarFooter,
    SidebarSeparator,
    SidebarGroupContent,
    SizeProvider,
    ShapeProvider,
  ],
  template: `
    <div ffSizeProvider [size]="size()" ffShapeProvider [defaultShape]="shape()">
      <div data-testid="header" ffSidebarHeader class="px-4"></div>
      <input data-testid="input" ffSidebarInput placeholder="Search" />
      <div data-testid="separator" ffSidebarSeparator></div>
      <div data-testid="group-content" ffSidebarGroupContent></div>
      <div data-testid="footer" ffSidebarFooter></div>
      <main data-testid="inset" ffSidebarInset></main>
    </div>
  `,
})
class SectionsHost {
  readonly size = signal<SizeVariant>('default');
  readonly shape = signal<'rounded' | 'pill'>('rounded');
}

describe('sidebar sections', () => {
  function setupSections(configure: (h: SectionsHost) => void = () => {}) {
    const fixture = TestBed.createComponent(SectionsHost);
    configure(fixture.componentInstance);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
  }

  it('header, footer, separator and group content carry their slots and classes', () => {
    const get = setupSections();
    expect(get('header').getAttribute('data-sidebar')).toBe('header');
    for (const cls of ['flex', 'shrink-0', 'flex-col', 'gap-2', 'p-2', 'px-4']) expect(get('header').classList).toContain(cls);
    expect(get('footer').getAttribute('data-sidebar')).toBe('footer');
    for (const cls of ['mt-auto', 'flex', 'shrink-0', 'flex-col', 'gap-2', 'p-2']) expect(get('footer').classList).toContain(cls);
    const separator = get('separator');
    expect(separator.getAttribute('data-sidebar')).toBe('separator');
    expect(separator.getAttribute('role')).toBe('separator');
    expect(separator.getAttribute('aria-orientation')).toBe('horizontal');
    for (const cls of ['mx-2', 'h-px', 'shrink-0', 'bg-border']) expect(separator.classList).toContain(cls);
    expect(get('group-content').getAttribute('data-sidebar')).toBe('group-content');
    expect(get('group-content').classList).toContain('w-full');
  });

  it('the input follows the field ladder, size and shape', () => {
    const get = setupSections();
    const input = get('input');
    expect(input.getAttribute('data-sidebar')).toBe('input');
    for (const cls of ['w-full', 'bg-transparent', 'px-3', 'hover:bg-muted/50', 'focus:bg-card', 'h-8', 'rounded-lg', 'pointer-coarse:text-[16px]']) {
      expect(input.classList).toContain(cls);
    }
    const compact = setupSections((h) => {
      h.size.set('compact');
      h.shape.set('pill');
    });
    expect(compact('input').classList).toContain('h-7');
    expect(compact('input').classList).toContain('rounded-[20px]');
  });

  it('the inset is the main column, a card next to an inset rail', () => {
    const get = setupSections();
    const inset = get('inset');
    expect(inset.getAttribute('data-slot')).toBe('sidebar-inset');
    for (const cls of ['relative', 'flex', 'min-h-0', 'w-full', 'min-w-0', 'flex-1', 'flex-col', 'bg-background', 'peer-data-[variant=inset]:m-2', 'peer-data-[variant=inset]:rounded-xl', 'peer-data-[variant=inset]:bg-surface-2']) {
      expect(inset.classList).toContain(cls);
    }
    const pill = setupSections((h) => h.shape.set('pill'));
    expect(pill('inset').classList).toContain('peer-data-[variant=inset]:rounded-3xl');
  });
});

// ── Group ────────────────────────────────────────────────

@Component({
  imports: [SidebarGroup, SidebarGroupLabel, SidebarGroupAction, SidebarGroupActions, SidebarGroupContent],
  template: `
    <ff-sidebar-group data-testid="group" [collapsible]="collapsible()" [(open)]="open" (openChange)="changes.push($event)">
      <ff-sidebar-group-label data-testid="label">Projects<span data-testid="count">3</span></ff-sidebar-group-label>
      @if (cluster()) {
        <div ffSidebarGroupActions data-testid="cluster">
          <button ffSidebarGroupAction aria-label="Add">+</button>
          <button ffSidebarGroupAction aria-label="More">…</button>
        </div>
      } @else {
        <button ffSidebarGroupAction data-testid="action" aria-label="Add">+</button>
      }
      <div ffSidebarGroupContent data-testid="rows">Rows</div>
    </ff-sidebar-group>
  `,
})
class GroupHost {
  readonly collapsible = signal(true);
  readonly cluster = signal(false);
  readonly open = signal<boolean | undefined>(undefined);
  readonly changes: boolean[] = [];
}

@Component({
  imports: [SidebarGroup, SidebarGroupLabel],
  template: `
    <ff-sidebar-group collapsible>
      <a ffSidebarGroupLabel href="#projects" data-testid="link">Projects</a>
      <div data-testid="rows">Rows</div>
    </ff-sidebar-group>
  `,
})
class ComposedGroupHost {}

describe('sidebar group', () => {
  function setupGroup(configure: (h: GroupHost) => void = () => {}) {
    const fixture = TestBed.createComponent(GroupHost);
    configure(fixture.componentInstance);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const get = (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    const labelEl = () => el.querySelector<HTMLElement>('[data-sidebar="group-label"]')!;
    return { fixture, el, get, labelEl, flush: () => fixture.detectChanges() };
  }

  it('a plain group renders its label as a caption row, untouched', () => {
    const { get, labelEl } = setupGroup((h) => h.collapsible.set(false));
    const group = get('group')!;
    expect(group.getAttribute('data-sidebar')).toBe('group');
    expect(group.hasAttribute('data-state')).toBe(false);
    for (const cls of ['relative', 'flex', 'w-full', 'min-w-0', 'flex-col', 'p-2']) expect(group.classList).toContain(cls);
    const label = labelEl();
    expect(label.tagName).toBe('DIV');
    for (const cls of ['flex', 'h-8', 'shrink-0', 'items-center', 'gap-2', 'px-2', 'text-muted-foreground', ...typeClass('caption', 'default').split(' ')]) {
      expect(label.classList).toContain(cls);
    }
    expect(group.querySelector('[aria-hidden]')).toBeNull();
  });

  it('truncates the leading text only; element children stay flex siblings', () => {
    const { labelEl, get } = setupGroup((h) => h.collapsible.set(false));
    const truncated = labelEl().querySelector('span.truncate')!;
    expect(truncated.textContent).toBe('Projects');
    expect(truncated.classList).toContain('min-w-0');
    expect(truncated.contains(get('count'))).toBe(false);
  });

  it('a collapsible label is a toggle wired to the collapse wrapper', () => {
    const { get, labelEl, fixture, flush } = setupGroup();
    const group = get('group')!;
    const label = labelEl();
    expect(label.tagName).toBe('BUTTON');
    expect(label.getAttribute('type')).toBe('button');
    expect(group.getAttribute('data-state')).toBe('open');
    expect(label.getAttribute('aria-expanded')).toBe('true');
    const wrapper = document.getElementById(label.getAttribute('aria-controls')!)!;
    expect(wrapper.contains(get('rows'))).toBe(true);
    expect(wrapper.contains(label)).toBe(false);
    expect(wrapper.hasAttribute('aria-hidden')).toBe(false);
    expect(wrapper.classList).toContain('overflow-visible');
    expect(label.closest('.group\\/group-header')).not.toBeNull();
    label.click();
    flush();
    expect(fixture.componentInstance.changes).toEqual([false]);
    expect(group.getAttribute('data-state')).toBe('closed');
    expect(label.getAttribute('aria-expanded')).toBe('false');
    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper.classList).toContain('overflow-hidden');
    expect(wrapper.classList).toContain('h-0');
  });

  it('the chevron hides while open (revealed on hover) and stays as the reopen cue', () => {
    const { labelEl, flush } = setupGroup();
    // svg < ff-icon (display: contents) < turning span < box
    const chevronBox = () => labelEl().querySelector('svg.lucide-chevron-right')!.closest('span.inline-flex')!.parentElement!;
    expect(chevronBox().classList).toContain('w-0');
    expect(chevronBox().classList).toContain('group-hover/group-header:w-6');
    labelEl().click();
    flush();
    expect(chevronBox().classList).toContain('w-6');
    expect(chevronBox().classList).toContain('opacity-100');
  });

  it('follows a controlled [(open)]', () => {
    const { get, fixture, flush } = setupGroup((h) => h.open.set(false));
    expect(get('group')!.getAttribute('data-state')).toBe('closed');
    fixture.componentInstance.open.set(true);
    flush();
    expect(get('group')!.getAttribute('data-state')).toBe('open');
  });

  it('pads the label past one header action, and past a cluster', () => {
    const one = setupGroup();
    expect(one.labelEl().style.getPropertyValue('--group-actions-pad')).toBe('34px');
    expect(one.labelEl().classList).toContain('pr-[var(--group-actions-pad)]');
    const action = one.get('action')!;
    expect(action.getAttribute('data-sidebar')).toBe('group-action');
    expect(action.getAttribute('type')).toBe('button');
    for (const cls of ['absolute', 'right-3.5', 'top-3', 'size-6', 'hover:bg-hover', 'rounded-lg']) {
      expect(action.classList).toContain(cls);
    }
    expect(action.style.getPropertyValue('--icon-size')).toBe('16px');
    expect(action.closest('.group\\/group-header')).not.toBeNull();
    const two = setupGroup((h) => h.cluster.set(true));
    two.flush();
    expect(two.labelEl().style.getPropertyValue('--group-actions-pad')).toBe('62px');
    const cluster = two.get('cluster')!;
    expect(cluster.getAttribute('data-sidebar')).toBe('group-actions');
    for (const cls of ['absolute', 'right-3.5', 'top-2', 'z-10', 'flex', 'h-8', 'items-center', 'gap-1']) {
      expect(cluster.classList).toContain(cls);
    }
    const inCluster = cluster.querySelector<HTMLElement>('[data-sidebar="group-action"]')!;
    expect(inCluster.classList).toContain('relative');
    expect(inCluster.classList).not.toContain('absolute');
  });

  it('a label composed onto another element becomes the toggle itself', () => {
    const fixture = TestBed.createComponent(ComposedGroupHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector<HTMLElement>('[data-testid="link"]')!;
    expect(link.getAttribute('data-sidebar')).toBe('group-label');
    expect(link.getAttribute('aria-expanded')).toBe('true');
    expect(link.hasAttribute('type')).toBe(false);
    expect(link.classList).toContain('cursor-pointer');
    expect(link.querySelector('svg.lucide-chevron-right')).not.toBeNull();
    link.click();
    fixture.detectChanges();
    expect(link.getAttribute('aria-expanded')).toBe('false');
  });
});
