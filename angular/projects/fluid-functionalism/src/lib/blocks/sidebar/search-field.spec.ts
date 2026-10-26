/**
 * SidebarSearchField through its public interface, pinning
 * registry/blocks/sidebar-app/search-field.tsx: a SidebarInput on the menu
 * rows' rhythm (leading search icon, text on the 32px axis), labelled
 * "Search", with a shortcut chip revealed on hover / focus that `null` drops.
 */
import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SidebarSearchField } from './index';

@Component({
  imports: [SidebarSearchField],
  template: `<ff-sidebar-search-field [shortcut]="shortcut()" [(value)]="query" />`,
})
class Defaults {
  readonly shortcut = signal<string | null>('⌘K');
  readonly query = signal('');
  readonly field = viewChild.required(SidebarSearchField);
}

@Component({
  imports: [SidebarSearchField],
  template: `<ff-sidebar-search-field placeholder="Find a page" />`,
})
class Placeholder {}

function setup() {
  const fixture = TestBed.createComponent(Defaults);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const input = el.querySelector<HTMLInputElement>('input')!;
  return { fixture, el, input };
}

describe('SidebarSearchField', () => {
  it('renders a labelled sidebar input with a leading search icon on the rows axis', () => {
    const { el, input } = setup();
    expect(input.getAttribute('data-sidebar')).toBe('input');
    expect(input.getAttribute('aria-label')).toBe('Search');
    expect(input.placeholder).toBe('Search…');
    expect(input.classList.contains('pl-8')).toBe(true);
    expect(input.classList.contains('pr-12')).toBe(true);
    const wrapper = input.parentElement!;
    expect(wrapper.classList.contains('group/search')).toBe(true);
    expect(wrapper.classList.contains('relative')).toBe(true);
    const icon = el.querySelector<SVGElement>('svg.lucide-search')!;
    for (const token of ['pointer-events-none', 'absolute', 'left-2', 'text-muted-foreground']) {
      expect(icon.classList.contains(token)).toBe(true);
    }
  });

  it('shows the shortcut chip only on hover or focus', () => {
    const { el } = setup();
    const kbd = el.querySelector<HTMLElement>('kbd')!;
    expect(kbd.textContent!.trim()).toBe('⌘K');
    for (const token of [
      'opacity-0',
      'group-hover/search:opacity-100',
      'group-focus-within/search:opacity-100',
      'pointer-events-none',
    ]) {
      expect(kbd.classList.contains(token)).toBe(true);
    }
  });

  it('shows a custom shortcut and drops the chip for null', () => {
    const { fixture, el } = setup();
    fixture.componentInstance.shortcut.set('/');
    fixture.detectChanges();
    expect(el.querySelector('kbd')!.textContent!.trim()).toBe('/');
    fixture.componentInstance.shortcut.set(null);
    fixture.detectChanges();
    expect(el.querySelector('kbd')).toBeNull();
  });

  it('takes a custom placeholder', () => {
    const fixture = TestBed.createComponent(Placeholder);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('input')!.placeholder).toBe('Find a page');
  });

  it('binds the query two-way', () => {
    const { fixture, input } = setup();
    input.value = 'inbox';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.query()).toBe('inbox');
    fixture.componentInstance.query.set('members');
    fixture.detectChanges();
    expect(input.value).toBe('members');
  });

  it('focuses the field through focus()', () => {
    const { fixture, input } = setup();
    fixture.componentInstance.field().focus();
    expect(document.activeElement).toBe(input);
  });
});
