import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Icon } from '../core/icon';
import { defaultIcons, type IconDefinition, type IconName } from '../core/icons';
import * as root from '@angel-r/fluid-functionalism-angular';
import * as packs from '@angel-r/fluid-functionalism-angular/icon-packs';
import * as hugeicons from '@angel-r/fluid-functionalism-angular/icon-packs/hugeicons';
import * as phosphor from '@angel-r/fluid-functionalism-angular/icon-packs/phosphor';
import * as tabler from '@angel-r/fluid-functionalism-angular/icon-packs/tabler';
import * as untitledui from '@angel-r/fluid-functionalism-angular/icon-packs/untitledui';
import { hugeiconsIcons, phosphorIcons, tablerIcons, untitleduiIcons } from './index';

const slots = Object.keys(defaultIcons) as IconName[];

describe('icon packs', () => {
  it.each([
    ['tabler', tablerIcons, 59],
    ['phosphor', phosphorIcons, 59],
    // Play and Pause stay Lucide, as in the React packs.
    ['hugeicons', hugeiconsIcons, 57],
    ['untitledui', untitleduiIcons, 57],
  ] as const)('%s fills its slots with known names only', (_, pack, count) => {
    const keys = Object.keys(pack);
    expect(keys).toHaveLength(count);
    for (const key of keys) expect(slots).toContain(key);
  });

  it('leaves play and pause to Lucide where the React pack does', () => {
    expect(hugeiconsIcons.play).toBeUndefined();
    expect(untitleduiIcons.pause).toBeUndefined();
  });
});

const pascal = (slot: string) => slot.replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase());

describe('per-icon exports', () => {
  it.each([
    ['tabler', tabler, 'tablerIcons'],
    ['phosphor', phosphor, 'phosphorIcons'],
    ['hugeicons', hugeicons, 'hugeiconsIcons'],
    ['untitledui', untitledui, 'untitleduiIcons'],
  ] as const)('%s exports one prefixed constant per slot, shared with its map', (prefix, entry, mapName) => {
    const exports = entry as Record<string, unknown>;
    const map = exports[mapName] as Partial<Record<IconName, IconDefinition>>;
    const icons = Object.keys(exports).filter((name) => name !== mapName);
    expect(icons.sort()).toEqual(Object.keys(map).map((slot) => `${prefix}${pascal(slot)}`).sort());
    for (const [slot, glyph] of Object.entries(map)) {
      expect(exports[`${prefix}${pascal(slot)}`]).toBe(glyph);
    }
  });

  it('re-exports every icon from /icon-packs and the package root', () => {
    expect(packs.phosphorCheck).toBe(phosphorIcons.check);
    expect(packs.tablerMoreHorizontal).toBe(tablerIcons['more-horizontal']);
    expect(root.hugeiconsX).toBe(hugeiconsIcons.x);
    expect(root.untitleduiRotateCcw).toBe(untitleduiIcons['rotate-ccw']);
  });
});

@Component({
  imports: [Icon],
  template: `<ff-icon [icon]="icon()" [strokeWidth]="stroke()" />`,
})
class Host {
  readonly icon = signal<IconDefinition>(tablerIcons['chevron-right']!);
  readonly stroke = signal<number | undefined>(2);
}

describe('icon packs in ff-icon', () => {
  const svg = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement.querySelector('svg')!;

  it('draws Tabler nodes in the 24×24 stroke frame', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(svg(fixture).getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg(fixture).querySelector('path')!.getAttribute('d')).toBe('M9 6l6 6l-6 6');
  });

  it('draws Phosphor filled at 256, switching light/regular at stroke 1.75', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.icon.set(phosphorIcons['chevron-right']!);
    fixture.detectChanges();
    const el = svg(fixture);
    expect(el.getAttribute('viewBox')).toBe('0 0 256 256');
    expect(el.getAttribute('fill')).toBe('currentColor');
    const regular = el.querySelector('path')!.getAttribute('d');
    fixture.componentInstance.stroke.set(1.5);
    fixture.detectChanges();
    expect(svg(fixture)).toBe(el);
    expect(el.querySelector('path')!.getAttribute('d')).not.toBe(regular);
  });

  it('mirrors the Phosphor right-panel glyph', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.icon.set(phosphorIcons['panel-right']!);
    fixture.detectChanges();
    expect(svg(fixture).classList.contains('-scale-x-100')).toBe(true);
  });

  it('lets the svg stroke width win over Hugeicons per-node widths', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.icon.set(hugeiconsIcons.x!);
    fixture.detectChanges();
    for (const path of Array.from(svg(fixture).querySelectorAll('path'))) {
      expect(path.hasAttribute('stroke-width')).toBe(false);
    }
  });

  it('renders an unset stroke the way each React pack does', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.stroke.set(undefined);
    // Tabler: the component default, 2.
    fixture.detectChanges();
    expect(svg(fixture).getAttribute('stroke-width')).toBe('2');
    // Untitled UI: no stroke-width at all (the SVG default, 1).
    fixture.componentInstance.icon.set(untitleduiIcons['arrow-down']!);
    fixture.detectChanges();
    expect(svg(fixture).hasAttribute('stroke-width')).toBe(false);
    // Hugeicons: each node keeps its own width until a stroke is set.
    fixture.componentInstance.icon.set(hugeiconsIcons['chevron-right']!);
    fixture.detectChanges();
    expect(svg(fixture).hasAttribute('stroke-width')).toBe(false);
    expect(svg(fixture).querySelector('path')!.getAttribute('stroke-width')).toBe('1.5');
    fixture.componentInstance.stroke.set(2);
    fixture.detectChanges();
    expect(svg(fixture).getAttribute('stroke-width')).toBe('2');
    expect(svg(fixture).querySelector('path')!.hasAttribute('stroke-width')).toBe(false);
    // Phosphor: unset draws the light weight.
    fixture.componentInstance.icon.set(phosphorIcons['chevron-right']!);
    fixture.componentInstance.stroke.set(undefined);
    fixture.detectChanges();
    const light = svg(fixture).querySelector('path')!.getAttribute('d');
    fixture.componentInstance.stroke.set(1.5);
    fixture.detectChanges();
    expect(svg(fixture).querySelector('path')!.getAttribute('d')).toBe(light);
  });
});
