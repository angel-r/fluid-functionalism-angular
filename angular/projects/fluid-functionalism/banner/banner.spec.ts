/**
 * Ported from tests/banner.test.tsx: a dismiss finishes even while the parent
 * keeps updating the banner, focus leaves a closing banner for a neighbour,
 * the flex gap is taken back from the first open, a leaving banner takes no
 * clicks, and a re-open mid-dismiss keeps the scale continuous. Plus one test
 * per rule of the React Banner: role, data attributes, fill, glyphs, dismiss,
 * size, the parts' classes and BannerAction.
 */
import { Component, signal, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { SizeProvider, type SizeVariant } from '../core/size';
import type { IconName } from '../core/icons';
import {
  BANNER_PARTS,
  bannerMotion,
  type BannerContrast,
  type BannerMotionConfig,
  type BannerStatus,
  type BannerVariant,
} from './banner';

const closeMs = Number(bannerMotion.dismiss.row.duration) * 1000;

function expectClasses(el: Element, classes: string) {
  for (const c of classes.split(' ')) expect(el.classList.contains(c), c).toBe(true);
}

function mount<T>(type: Type<T>, configure: (host: T) => void = () => {}) {
  const fixture = TestBed.createComponent(type);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, host: fixture.componentInstance };
}

/** Polls `assertion` (running change detection each time) until it passes. */
async function waitFor(fixture: ComponentFixture<unknown>, assertion: () => void, timeout = 1000) {
  const until = performance.now() + timeout;
  for (;;) {
    fixture.detectChanges();
    try {
      assertion();
      return;
    } catch (error) {
      if (performance.now() > until) throw error;
      await new Promise((r) => setTimeout(r, 10));
    }
  }
}

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const byText = (root: HTMLElement, text: string) =>
  Array.from(root.querySelectorAll<HTMLElement>('*')).find((n) => n.textContent?.trim() === text && n.children.length === 0) ??
  null;
const bannerOf = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-slot="banner"]');
/** The element that fades and scales: the banner's parent. */
const contentOf = (root: HTMLElement) => bannerOf(root)!.parentElement as HTMLElement;
/** The row whose track opens and closes: the `<ff-banner>` host. */
const rowOf = (root: HTMLElement) => root.querySelector<HTMLElement>('ff-banner')!;

// ── Dismiss ──────────────────────────────────────────────

/** A dismissible banner whose parent hands it a new prop every 30ms, like a
 *  page with a live clock. */
@Component({
  imports: [BANNER_PARTS],
  template: `
    <ff-banner dismissible [motion]="config()" [attr.data-tick]="tick()">
      <p ffBannerTitle>Saved</p>
    </ff-banner>
  `,
})
class TickingHost {
  readonly tick = signal(0);
  readonly config = signal<BannerMotionConfig>(bannerMotion);
}

@Component({
  imports: [BANNER_PARTS],
  template: `
    <div>
      <button type="button">Before</button>
      <ff-banner dismissible>
        <p ffBannerTitle>Saved</p>
      </ff-banner>
      @if (after()) {
        <button type="button">After</button>
      }
    </div>
  `,
})
class NeighbourHost {
  readonly after = signal(true);
}

describe('Banner dismiss', () => {
  it('finishes even when the parent re-renders mid-dismiss', async () => {
    const { fixture, el, host } = mount(TickingHost);
    const id = setInterval(() => {
      host.tick.update((t) => t + 1);
      host.config.set({ ...bannerMotion });
      fixture.detectChanges();
    }, 30);
    try {
      el.querySelector<HTMLButtonElement>('[aria-label="Dismiss"]')!.click();
      await waitFor(fixture, () => expect(byText(el, 'Saved')).toBeNull(), closeMs * 4);
    } finally {
      clearInterval(id);
    }
  });

  it('moves keyboard focus to the next focusable element', () => {
    const { fixture, el } = mount(NeighbourHost);
    const dismiss = el.querySelector<HTMLButtonElement>('[aria-label="Dismiss"]')!;
    dismiss.focus();
    dismiss.click();
    fixture.detectChanges();
    expect(document.activeElement).toBe(byText(el, 'After'));
  });

  it('falls back to the previous focusable element when nothing follows', () => {
    const { fixture, el } = mount(NeighbourHost, (h) => h.after.set(false));
    const dismiss = el.querySelector<HTMLButtonElement>('[aria-label="Dismiss"]')!;
    dismiss.focus();
    dismiss.click();
    fixture.detectChanges();
    expect(document.activeElement).toBe(byText(el, 'Before'));
  });

  it('takes no clicks once it starts leaving', async () => {
    const { fixture, el } = mount(TickingHost);
    expect(contentOf(el).style.pointerEvents).toBe('auto');
    el.querySelector<HTMLButtonElement>('[aria-label="Dismiss"]')!.click();
    fixture.detectChanges();
    const content = contentOf(el);
    await waitFor(fixture, () => expect(content.style.pointerEvents).toBe('none'), closeMs * 2);
  });
});

// ── Gap ──────────────────────────────────────────────────

@Component({
  imports: [BANNER_PARTS],
  template: `
    <button type="button" data-testid="open" (click)="open.set(true)">Open</button>
    <div style="display: flex; flex-direction: column; row-gap: 12px" data-testid="column">
      @if (!alone()) {
        <p>Above</p>
      }
      <ff-banner [open]="open()">
        <p ffBannerTitle>Saved</p>
      </ff-banner>
      @if (!alone()) {
        <p>Below</p>
      }
    </div>
  `,
})
class GapHost {
  readonly open = signal(false);
  readonly alone = signal(false);
}

describe('Banner gap', () => {
  const gap = 12;

  it('takes the gap back from the very first open', async () => {
    const { fixture, el } = mount(GapHost);
    el.querySelector<HTMLButtonElement>('[data-testid="open"]')!.click();
    fixture.detectChanges();
    await frame();
    expect(parseFloat(rowOf(el).style.marginBottom)).toBeLessThan(-gap / 2);
  });

  it('takes the gap back on the first frame even when the open is held', async () => {
    const { fixture, el } = mount(GapHost);
    el.querySelector<HTMLButtonElement>('[data-testid="open"]')!.click();
    fixture.detectChanges();
    const until = performance.now() + 150;
    while (performance.now() < until) {
      // a long task between the open and the first frame
    }
    await frame();
    const row = rowOf(el);
    const open = parseFloat(row.style.gridTemplateRows);
    expect(open).toBeLessThan(1);
    expect(parseFloat(row.style.marginBottom)).toBeCloseTo((open - 1) * gap, 5);
  });

  it('takes nothing back when the banner is the only child', async () => {
    const { fixture, el } = mount(GapHost, (h) => h.alone.set(true));
    el.querySelector<HTMLButtonElement>('[data-testid="open"]')!.click();
    await waitFor(fixture, () => {
      const margin = rowOf(el).style.marginBottom;
      expect(margin === '' || parseFloat(margin) === 0).toBe(true);
    });
  });

  it('renders nothing while closed and hides its row from the flex gap', () => {
    const { el } = mount(GapHost);
    expect(bannerOf(el)).toBeNull();
    expect(rowOf(el).style.display).toBe('none');
  });
});

// ── Re-open ──────────────────────────────────────────────

@Component({
  imports: [BANNER_PARTS],
  template: `
    <button type="button" data-testid="flip" (click)="open.set(!open())">Flip</button>
    <ff-banner [open]="open()">
      <p ffBannerTitle>Saved</p>
    </ff-banner>
  `,
})
class FlipHost {
  readonly open = signal(true);
}

describe('Banner re-open', () => {
  it('keeps its scale continuous when re-opened mid-dismiss', async () => {
    const { fixture, el } = mount(FlipHost);
    const scaleOf = (node: HTMLElement) => {
      const match = node.style.transform.match(/scale\(([\d.]+)\)/);
      return match ? Number(match[1]) : 1;
    };
    const flip = el.querySelector<HTMLButtonElement>('[data-testid="flip"]')!;
    flip.click();
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, closeMs / 2));
    const before = scaleOf(contentOf(el));
    expect(before).toBeLessThan(1);
    flip.click();
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 34));
    const after = scaleOf(contentOf(el));
    expect(Math.abs(after - before)).toBeLessThan(0.05);
  });

  it('arrives already in place when open on first render', () => {
    const { el } = mount(FlipHost);
    expect(rowOf(el).style.gridTemplateRows).toBe('1fr');
    expect(contentOf(el).style.opacity).toBe('1');
    expect(contentOf(el).style.transformOrigin).toBe('top');
  });
});

// ── Rules of the React Banner ────────────────────────────

@Component({
  imports: [BANNER_PARTS, SizeProvider],
  template: `
    <div ffSizeProvider [size]="regionSize()">
      <ff-banner
        class="my-banner"
        [status]="status()"
        [contrast]="contrast()"
        [variant]="variant()"
        [icon]="icon()"
        [dismissible]="dismissible()"
        [dismissLabel]="dismissLabel()"
        [open]="open()"
        [size]="size()"
        [role]="role()"
        (dismiss)="dismissed()"
      >
        <p ffBannerTitle data-testid="title">Saved</p>
        @if (description()) {
          <p ffBannerDescription data-testid="description">More detail</p>
        }
        <div ffBannerActions data-testid="actions">
          <ff-banner-action variant="primary" (click)="primary()">Primary</ff-banner-action>
          <ff-banner-action>Secondary</ff-banner-action>
          <ff-banner-action variant="ghost" href="/docs" [external]="external()">Ghost</ff-banner-action>
        </div>
      </ff-banner>
    </div>
  `,
})
class RulesHost {
  readonly status = signal<BannerStatus>('default');
  readonly contrast = signal<BannerContrast>('low');
  readonly variant = signal<BannerVariant>('inline');
  readonly icon = signal<IconName | undefined>(undefined);
  readonly dismissible = signal(false);
  readonly dismissLabel = signal('Dismiss');
  readonly open = signal<boolean | undefined>(undefined);
  readonly size = signal<SizeVariant | undefined>(undefined);
  readonly regionSize = signal<SizeVariant | undefined>(undefined);
  readonly role = signal<string | undefined>(undefined);
  readonly description = signal(false);
  readonly external = signal(false);
  readonly dismissed = vi.fn();
  readonly primary = vi.fn();
}

function setupRules(configure: (host: RulesHost) => void = () => {}) {
  const { fixture, el, host } = mount(RulesHost, configure);
  const update = (fn: (h: RulesHost) => void) => {
    fn(host);
    fixture.detectChanges();
  };
  const get = (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
  const banner = () => bannerOf(el)!;
  const glyph = () => banner().querySelector<HTMLElement>(':scope > span[aria-hidden="true"]')!;
  const actions = () => Array.from(el.querySelectorAll<HTMLElement>('[data-slot="banner-action"]'));
  return { fixture, el, host, update, get, banner, glyph, actions };
}

describe('Banner rules', () => {
  it('announces errors and warnings as alerts, the rest as status; role overrides', () => {
    const { banner, update, el } = setupRules();
    expect(banner().getAttribute('role')).toBe('status');
    update((h) => h.status.set('error'));
    expect(banner().getAttribute('role')).toBe('alert');
    update((h) => h.status.set('warning'));
    expect(banner().getAttribute('role')).toBe('alert');
    update((h) => h.status.set('success'));
    expect(banner().getAttribute('role')).toBe('status');
    update((h) => h.role.set('note'));
    expect(banner().getAttribute('role')).toBe('note');
    expect(rowOf(el).hasAttribute('role')).toBe(false);
  });

  it('exposes status, contrast and variant as data attributes and the user class on the banner', () => {
    const { banner, update } = setupRules((h) => h.status.set('info'));
    expect(banner().getAttribute('data-status')).toBe('info');
    expect(banner().getAttribute('data-contrast')).toBe('low');
    expect(banner().getAttribute('data-variant')).toBe('inline');
    expectClasses(banner(), 'my-banner group/banner @container/banner relative grid w-full items-center text-foreground p-4 rounded-xl');
    update((h) => h.contrast.set('high'));
    expect(banner().getAttribute('data-contrast')).toBe('high');
  });

  it('paints the status tone and a translucent fill: neutral overlay low, tone wash high', () => {
    const { banner, update } = setupRules((h) => h.status.set('success'));
    const style = () => banner().style;
    expect(style().getPropertyValue('--banner-tone')).toBe('var(--success)');
    expect(style().getPropertyValue('--banner-fill')).toBe('var(--hover)');
    update((h) => h.contrast.set('high'));
    expect(style().getPropertyValue('--banner-fill')).toBe('color-mix(in oklab, var(--banner-tone) 12%, transparent)');
    update((h) => h.status.set('default'));
    expect(style().getPropertyValue('--banner-tone')).toBe('var(--foreground)');
    expect(style().getPropertyValue('--banner-fill')).toBe('color-mix(in oklab, var(--banner-tone) 8%, transparent)');
    update((h) => h.status.set('error'));
    expect(style().getPropertyValue('--banner-tone')).toBe('var(--destructive)');
    expect(style().backgroundImage).toContain('linear-gradient');
  });

  it('fixed runs edge to edge: sticky row, opaque background, square corners', () => {
    const { banner, el, update } = setupRules();
    expect(rowOf(el).classList.contains('sticky')).toBe(false);
    update((h) => h.variant.set('fixed'));
    expectClasses(rowOf(el), 'grid w-full sticky top-0 z-40');
    expect(banner().getAttribute('data-variant')).toBe('fixed');
    expect(banner().style.backgroundColor).toBe('var(--background)');
    expect(banner().classList.contains('rounded-xl')).toBe(false);
  });

  it('draws the outline info icon for default, a filled glyph for colored statuses, and a custom icon over both', () => {
    const { glyph, update } = setupRules();
    expect(glyph().querySelector('svg')).not.toBeNull();
    expect(glyph().querySelector('circle[fill="currentColor"]')).toBeNull();
    update((h) => h.status.set('success'));
    expect(glyph().querySelector('circle[fill="currentColor"]')).not.toBeNull();
    expect(glyph().querySelector('g.stroke-background path')!.getAttribute('d')).toBe('m8.5 12.25 2.5 2.5 4.5-5');
    update((h) => h.status.set('warning'));
    expect(glyph().querySelector('path[fill="currentColor"]')).not.toBeNull();
    expect(glyph().querySelector('g.stroke-background path')!.getAttribute('d')).toBe('M12 9.5v3.5M12 17h.01');
    update((h) => h.status.set('error'));
    expect(glyph().querySelector('g.stroke-background path')!.getAttribute('d')).toBe('M12 7.5v5M12 16.5h.01');
    update((h) => h.status.set('info'));
    expect(glyph().querySelector('g.stroke-background path')!.getAttribute('d')).toBe('M12 16.5v-5M12 7.5h.01');
    update((h) => h.icon.set('bell'));
    expect(glyph().querySelector('circle[fill="currentColor"]')).toBeNull();
    expect(glyph().querySelector('svg')).not.toBeNull();
    expect(glyph().querySelector('svg')!.getAttribute('width')).toBe('20');
    expectClasses(glyph(), 'col-start-1 row-start-1 flex items-center justify-center mr-3 h-5');
  });

  it('shows the dismiss button only when dismissible, with its label', () => {
    const { el, update } = setupRules();
    expect(el.querySelector('[aria-label="Dismiss"]')).toBeNull();
    update((h) => {
      h.dismissible.set(true);
      h.dismissLabel.set('Close banner');
    });
    const button = el.querySelector<HTMLButtonElement>('[aria-label="Close banner"]')!;
    expect(button.type).toBe('button');
    expectClasses(button, 'col-start-4 row-start-1 flex size-7 -my-1 -mr-1.5 ml-2 rounded-lg');
  });

  it('uncontrolled: the dismiss button hides the banner and emits dismiss', async () => {
    const { el, fixture, host, update } = setupRules((h) => h.dismissible.set(true));
    el.querySelector<HTMLButtonElement>('[aria-label="Dismiss"]')!.click();
    expect(host.dismissed).toHaveBeenCalledTimes(1);
    update(() => {});
    await waitFor(fixture, () => expect(bannerOf(el)).toBeNull(), closeMs * 4);
  });

  it('controlled: dismiss only emits, open decides', async () => {
    const { el, fixture, host, update } = setupRules((h) => {
      h.dismissible.set(true);
      h.open.set(true);
    });
    el.querySelector<HTMLButtonElement>('[aria-label="Dismiss"]')!.click();
    expect(host.dismissed).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, closeMs + 150));
    fixture.detectChanges();
    expect(bannerOf(el)).not.toBeNull();
    update((h) => h.open.set(false));
    await waitFor(fixture, () => expect(bannerOf(el)).toBeNull(), closeMs * 4);
  });

  it('follows the surrounding size, and size pins it and its parts', () => {
    const { banner, get, glyph, update } = setupRules((h) => h.regionSize.set('compact'));
    expectClasses(banner(), 'p-3');
    expectClasses(glyph(), 'mr-2.5 h-[18px]');
    expectClasses(get('title'), 'text-[length:var(--fs-subtitle-compact,13px)]');
    update((h) => h.size.set('default'));
    expectClasses(banner(), 'p-4');
    expectClasses(get('title'), 'text-[length:var(--fs-subtitle,14px)]');
    update((h) => {
      h.regionSize.set(undefined);
      h.size.set('compact');
    });
    expectClasses(banner(), 'p-3');
    expectClasses(get('actions'), '-my-[5px] ml-2.5');
  });

  it('places the parts on the grid with their slots', () => {
    const { get, update } = setupRules((h) => h.description.set(true));
    const title = get('title');
    expect(title.getAttribute('data-slot')).toBe('banner-title');
    expectClasses(title, 'col-start-2 row-start-1 min-w-0 text-foreground');
    expect(title.style.fontVariationSettings).toContain("'wght' 550");
    const description = get('description');
    expect(description.getAttribute('data-slot')).toBe('banner-description');
    expectClasses(description, 'col-start-2 row-start-2 mt-0.5 min-w-0 text-foreground');
    const actions = get('actions');
    expect(actions.getAttribute('data-slot')).toBe('banner-actions');
    expectClasses(actions, 'col-start-3 row-start-1 flex flex-wrap items-center gap-2 -my-1 ml-3');
    update((h) => h.description.set(false));
    expect(get('description')).toBeNull();
  });

  it('BannerAction is a compact library button ordered by variant; href renders a link', () => {
    const { actions, host, update } = setupRules();
    const [primary, secondary, ghost] = actions();
    expect(primary.tagName).toBe('BUTTON');
    expect((primary as HTMLButtonElement).type).toBe('button');
    expectClasses(primary, 'h-7 order-3 text-background');
    expectClasses(secondary, 'h-7 order-2 text-foreground');
    expect(ghost.tagName).toBe('A');
    expect(ghost.getAttribute('href')).toBe('/docs');
    expectClasses(ghost, 'h-7 order-1 text-foreground');
    expect(ghost.hasAttribute('target')).toBe(false);
    primary.click();
    expect(host.primary).toHaveBeenCalledTimes(1);
    update((h) => h.external.set(true));
    const link = actions()[2];
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
