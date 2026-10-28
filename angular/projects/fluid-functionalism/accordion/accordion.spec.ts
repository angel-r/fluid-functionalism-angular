/**
 * Accordion / AccordionGroup: collapsible sections with a sprung height
 * animation and a spinning chevron. The group adds fluid hover across its
 * triggers, a tinted block behind open items and one shared focus ring.
 * Includes the accordion cases of tests/omit.test.tsx.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { type SizeVariant } from '../core/size';
import { ACTIVE_INDEX_ATTR } from '../fluid-hover/fluid-hover';
import { Accordion, AccordionContent, AccordionGroup, AccordionItem, AccordionTrigger } from './accordion';

const ITEMS = [
  { value: 'a', label: 'First', body: 'First body' },
  { value: 'b', label: 'Second', body: 'Second body' },
  { value: 'c', label: 'Third', body: 'Third body' },
];

@Component({
  imports: [AccordionGroup, AccordionItem, AccordionTrigger, AccordionContent],
  template: `
    <ff-accordion-group
      [type]="type()"
      [defaultValue]="defaultValue()"
      [value]="value()"
      (valueChange)="onValue($event)"
      [highlight]="highlight()"
      [size]="size()"
      class="w-96"
      data-testid="group"
      aria-label="FAQ"
    >
      @for (item of items; track item.value; let i = $index) {
        <ff-accordion-item [value]="item.value" [index]="i" [disabled]="item.value === disabledValue()">
          <ff-accordion-trigger>{{ item.label }}</ff-accordion-trigger>
          <ff-accordion-content>{{ item.body }}</ff-accordion-content>
        </ff-accordion-item>
      }
    </ff-accordion-group>
  `,
})
class GroupHost {
  readonly items = ITEMS;
  readonly type = signal<'single' | 'multiple'>('single');
  readonly defaultValue = signal<string | string[] | undefined>('a');
  readonly value = signal<string | string[] | undefined>(undefined);
  readonly highlight = signal<'trigger' | 'item'>('item');
  readonly size = signal<SizeVariant | undefined>(undefined);
  readonly disabledValue = signal<string | null>(null);
  readonly echo = signal(true);
  readonly changes: (string | string[])[] = [];
  onValue(v: string | string[]) {
    this.changes.push(v);
    if (this.echo() && this.value() !== undefined) this.value.set(v);
  }
}

@Component({
  imports: [Accordion, AccordionItem, AccordionTrigger, AccordionContent],
  template: `
    <ff-accordion data-testid="solo" [defaultValue]="defaultValue()">
      <ff-accordion-item value="a" [highlight]="highlight()">
        <ff-accordion-trigger class="px-6">Only</ff-accordion-trigger>
        <ff-accordion-content class="text-red-500">Only body</ff-accordion-content>
      </ff-accordion-item>
    </ff-accordion>
  `,
})
class SoloHost {
  readonly defaultValue = signal<string | undefined>(undefined);
  readonly highlight = signal<'trigger' | 'item'>('item');
}

async function render<T>(type: new () => T, configure: (host: T) => void = () => {}) {
  const fixture = TestBed.createComponent(type);
  configure(fixture.componentInstance);
  document.body.appendChild(fixture.nativeElement);
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  await settle();
  const el = fixture.nativeElement as HTMLElement;
  const triggers = () => Array.from(el.querySelectorAll<HTMLButtonElement>('button[aria-expanded]'));
  const panels = () => Array.from(el.querySelectorAll<HTMLElement>('[role="region"]'));
  const expanded = () => triggers().map((t) => t.getAttribute('aria-expanded') === 'true');
  const key = async (target: HTMLElement, k: string) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    await settle();
  };
  return { fixture, host: fixture.componentInstance, el, triggers, panels, expanded, key, settle };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('AccordionGroup (omit.test.tsx)', () => {
  it('passes HTML attributes to the root, keeps its own props off it, and still opens', async () => {
    const { el, triggers, expanded, settle } = await render(GroupHost);
    const root = el.querySelector<HTMLElement>('[data-testid="group"]')!;
    expect(root.getAttribute('aria-label')).toBe('FAQ');
    for (const attr of ['type', 'collapsible', 'defaultvalue', 'value']) {
      expect(root.hasAttribute(attr), attr).toBe(false);
    }
    expect(expanded()[1]).toBe(false);
    triggers()[1].click();
    await settle();
    expect(expanded()[1]).toBe(true);
  });

  it('merges the consumer class onto the root classes', async () => {
    const { el } = await render(GroupHost);
    const root = el.querySelector<HTMLElement>('[data-testid="group"]')!;
    for (const c of ['relative', 'flex', 'flex-col', 'max-w-full', 'w-96']) expect(root.classList.contains(c), c).toBe(true);
    expect(root.classList.contains('w-72')).toBe(false);
  });
});

describe('Accordion (standalone, omit.test.tsx)', () => {
  it('renders its root without a style attribute', async () => {
    const { el } = await render(SoloHost);
    const root = el.querySelector<HTMLElement>('[data-testid="solo"]')!;
    expect(root.hasAttribute('style')).toBe(false);
    for (const c of ['w-72', 'max-w-full', 'flex', 'flex-col']) expect(root.classList.contains(c), c).toBe(true);
  });
});

describe('Accordion: trigger and panel semantics', () => {
  it('links each trigger button to its region panel', async () => {
    const { triggers, panels } = await render(GroupHost);
    const [trigger] = triggers();
    const [panel] = panels();
    expect(trigger.type).toBe('button');
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(trigger.id);
    expect(trigger.id).not.toBe('');
  });

  it('defaultValue opens its item; closed panels are hidden', async () => {
    const { expanded, panels, triggers } = await render(GroupHost);
    expect(expanded()).toEqual([true, false, false]);
    expect(panels().map((p) => p.hidden)).toEqual([false, true, true]);
    expect(panels()[0].textContent).toContain('First body');
    expect(triggers()[0].hasAttribute('data-panel-open')).toBe(true);
    expect(triggers()[1].hasAttribute('data-panel-open')).toBe(false);
  });

  it('a disabled item cannot be toggled', async () => {
    const { triggers, expanded, settle, host } = await render(GroupHost, (h) => h.disabledValue.set('b'));
    expect(triggers()[1].disabled).toBe(true);
    triggers()[1].click();
    await settle();
    expect(expanded()[1]).toBe(false);
    expect(host.changes).toEqual([]);
  });
});

describe('Accordion: single and multiple', () => {
  it('single: opening another item closes the first, and the open one collapses on click', async () => {
    const { triggers, expanded, host, settle } = await render(GroupHost);
    triggers()[1].click();
    await settle();
    expect(expanded()).toEqual([false, true, false]);
    triggers()[1].click();
    await settle();
    expect(expanded()).toEqual([false, false, false]);
    expect(host.changes).toEqual(['b', '']);
  });

  it('multiple: items open independently and changes report arrays', async () => {
    const { triggers, expanded, host, settle } = await render(GroupHost, (h) => {
      h.type.set('multiple');
      h.defaultValue.set(['a', 'c']);
    });
    expect(expanded()).toEqual([true, false, true]);
    triggers()[1].click();
    await settle();
    expect(expanded()).toEqual([true, true, true]);
    triggers()[0].click();
    await settle();
    expect(expanded()).toEqual([false, true, true]);
    expect(host.changes).toEqual([
      ['a', 'c', 'b'],
      ['c', 'b'],
    ]);
  });

  it('controlled: follows value two-way', async () => {
    const { triggers, expanded, host, settle } = await render(GroupHost, (h) => h.value.set('c'));
    expect(expanded()).toEqual([false, false, true]);
    triggers()[0].click();
    await settle();
    expect(host.value()).toBe('a');
    expect(expanded()).toEqual([true, false, false]);
  });

  it('controlled without an echo: reports the click but stays put', async () => {
    const { triggers, expanded, host, settle } = await render(GroupHost, (h) => {
      h.value.set('c');
      h.echo.set(false);
    });
    triggers()[0].click();
    await settle();
    expect(host.changes).toEqual(['a']);
    expect(expanded()).toEqual([false, false, true]);
  });
});

describe('Accordion: keyboard', () => {
  it('ArrowDown / ArrowUp move between triggers and wrap; Home / End jump', async () => {
    const { triggers, key } = await render(GroupHost);
    triggers()[0].focus();
    await key(triggers()[0], 'ArrowDown');
    expect(document.activeElement).toBe(triggers()[1]);
    await key(triggers()[1], 'ArrowUp');
    await key(triggers()[0], 'ArrowUp');
    expect(document.activeElement).toBe(triggers()[2]);
    await key(triggers()[2], 'ArrowDown');
    expect(document.activeElement).toBe(triggers()[0]);
    await key(triggers()[0], 'End');
    expect(document.activeElement).toBe(triggers()[2]);
    await key(triggers()[2], 'Home');
    expect(document.activeElement).toBe(triggers()[0]);
  });
});

describe('Accordion: height animation and exit', () => {
  it('a closed panel starts collapsed; closing keeps the panel visible until its exit lands', async () => {
    // jsdom has no layout: give the panel bodies a measurable height.
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(40);
    const { fixture, triggers, panels, settle } = await render(GroupHost);
    // As in React, the region itself is the clipping motion element.
    const motion = (i: number) => panels()[i];
    expect(motion(1).style.height).toBe('0px');
    expect(motion(0).style.height).toBe('40px');
    expect(motion(1).classList.contains('overflow-hidden')).toBe(true);
    triggers()[0].click();
    await settle();
    expect(triggers()[0].getAttribute('aria-expanded')).toBe('false');
    expect(panels()[0].hidden).toBe(false);
    await vi.waitFor(
      () => {
        fixture.detectChanges();
        expect(panels()[0].hidden).toBe(true);
      },
      { timeout: 1000 },
    );
    expect(motion(0).style.height).toBe('0px');
  });

  it('opening un-hides the panel at once', async () => {
    const { triggers, panels, settle } = await render(GroupHost);
    triggers()[2].click();
    await settle();
    expect(panels()[2].hidden).toBe(false);
  });

  it('the chevron turns to 90deg when open', async () => {
    const { fixture, el, triggers, settle } = await render(GroupHost);
    const chevron = (i: number) => triggers()[i].querySelector<HTMLElement>('span.shrink-0')!;
    expect(chevron(0).style.transform).toContain('rotate(90deg)');
    triggers()[1].click();
    await settle();
    await vi.waitFor(
      () => {
        fixture.detectChanges();
        expect(chevron(1).style.transform).toMatch(/rotate\(90deg\)/);
      },
      { timeout: 1000 },
    );
    expect(el.querySelector('svg.lucide-chevron-right')).not.toBeNull();
  });
});

describe('Accordion: trigger label', () => {
  const visible = (t: HTMLElement) => t.querySelector<HTMLElement>('.inline-grid > span:not([aria-hidden])')!;

  it('an open trigger is foreground and semibold, a closed one muted and normal, with a bold sizer', async () => {
    const { triggers } = await render(GroupHost);
    expect(visible(triggers()[0]).className).toContain('text-foreground');
    expect(visible(triggers()[0]).style.fontVariationSettings).toContain("'wght' 550");
    expect(visible(triggers()[1]).className).toContain('text-muted-foreground');
    expect(visible(triggers()[1]).style.fontVariationSettings).toContain("'wght' 400");
    const sizer = triggers()[1].querySelector<HTMLElement>('[aria-hidden="true"].invisible')!;
    expect(sizer.textContent?.trim()).toBe('Second');
  });

  it('size compact tightens the row and the panel padding', async () => {
    const { triggers, panels, host, settle } = await render(GroupHost);
    expect(triggers()[0].classList.contains('py-2')).toBe(true);
    host.size.set('compact');
    await settle();
    expect(triggers()[0].classList.contains('py-1')).toBe(true);
    expect(triggers()[0].classList.contains('px-2.5')).toBe(true);
    const measure = panels()[0].firstElementChild as HTMLElement;
    expect(measure.classList.contains('pb-2.5')).toBe(true);
  });

  it('standalone: the trigger class merges onto the button and the content class onto the clip', async () => {
    const { triggers, panels } = await render(SoloHost);
    expect(triggers()[0].classList.contains('px-6')).toBe(true);
    expect(triggers()[0].classList.contains('px-3')).toBe(false);
    expect(triggers()[0].className).toContain('focus-visible:ring-1');
    expect(panels()[0].classList.contains('text-red-500')).toBe(true);
  });
});

describe('AccordionGroup: highlight layers', () => {
  const layer = (el: HTMLElement, slot: string) => el.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`);

  it('marks rows for fluid hover and tints open items with highlight "item"', async () => {
    const { el } = await render(GroupHost);
    const items = Array.from(el.querySelectorAll('ff-accordion-item'));
    expect(items.map((i) => i.getAttribute('data-fluid-hover-index'))).toEqual(['0', '1', '2']);
    expect(items[0].hasAttribute('data-open')).toBe(true);
    expect(layer(el, 'expanded-bg').length).toBe(1);
    expect(layer(el, 'expanded-bg')[0].className).toContain('bg-accent/20 dark:bg-accent/12 pointer-events-none');
  });

  it('highlight "trigger" holds no tint on an open item that is not hovered', async () => {
    const { el } = await render(GroupHost, (h) => h.highlight.set('trigger'));
    expect(layer(el, 'expanded-bg').length).toBe(0);
  });

  it('keyboard focus lights the row and draws the focus ring', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(36);
    const { fixture, el, triggers, settle } = await render(GroupHost);
    const root = el.querySelector<HTMLElement>('[data-testid="group"]')!;
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    triggers()[1].focus();
    await settle();
    expect(root.getAttribute(ACTIVE_INDEX_ATTR)).toBe('1');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(layer(el, 'focus-ring').length).toBe(1);
    });
    expect(layer(el, 'focus-ring')[0].className).toContain('border-[color:var(--focus-ring,#6B97FF)]');
    triggers()[1].blur();
    await settle();
    expect(root.hasAttribute(ACTIVE_INDEX_ATTR)).toBe(false);
  });
});

describe('Accordion (standalone): tints', () => {
  const layer = (el: HTMLElement, slot: string) => el.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`);

  it('an open item holds its tint with highlight "item"; hovering the trigger adds the hover fill', async () => {
    const { el, settle } = await render(SoloHost, (h) => h.defaultValue.set('a'));
    expect(layer(el, 'open-tint').length).toBe(1);
    const wrapper = el.querySelector('ff-accordion-trigger > div')!;
    wrapper.dispatchEvent(new MouseEvent('mouseenter'));
    await settle();
    expect(layer(el, 'hover-tint').length).toBe(1);
    expect(layer(el, 'hover-tint')[0].className).toContain('absolute inset-0 rounded-lg bg-hover pointer-events-none');
  });

  it('with highlight "trigger" the tint shows only while the open row is hovered', async () => {
    const { el, settle } = await render(SoloHost, (h) => {
      h.defaultValue.set('a');
      h.highlight.set('trigger');
    });
    expect(layer(el, 'open-tint').length).toBe(0);
    el.querySelector('ff-accordion-trigger > div')!.dispatchEvent(new MouseEvent('mouseenter'));
    await settle();
    expect(layer(el, 'open-tint').length).toBe(1);
  });
});
