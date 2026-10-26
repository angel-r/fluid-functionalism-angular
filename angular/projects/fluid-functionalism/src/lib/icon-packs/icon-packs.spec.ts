import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Icon } from '../core/icon';
import { defaultIcons, type IconDefinition, type IconName } from '../core/icons';
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

@Component({
  imports: [Icon],
  template: `<ff-icon [icon]="icon()" [strokeWidth]="stroke()" />`,
})
class Host {
  readonly icon = signal<IconDefinition>(tablerIcons['chevron-right']!);
  readonly stroke = signal(2);
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
});
