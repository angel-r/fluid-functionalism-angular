/**
 * Card: the compositional parts and their data-slot contract, the stretched
 * click target, selection, dismiss, the size ladder, inline/image layouts,
 * and CardGroup's layout, auto-indexing, divider rules and fluid hover
 * (only clickable cards join; gap clicks land on the highlighted card).
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { ACTIVE_ATTR } from '../fluid-hover/fluid-hover';
import { CARD_PARTS, CardGroup, type CardBorder, type CardOrientation } from './card';

const PARTS = [CARD_PARTS];

/** Every token present, in any order (Angular's [class] binding reorders). */
function expectClasses(el: Element, classes: string) {
  for (const token of classes.split(' ')) expect(el.classList).toContain(token);
}
function expectNoClasses(el: Element, classes: string) {
  for (const token of classes.split(' ')) expect(el.classList).not.toContain(token);
}

@Component({
  imports: PARTS,
  template: `
    <ff-card-group
      data-testid="group"
      [orientation]="orientation()"
      [columns]="columns()"
      [border]="border()"
      [separated]="separated()"
      [fluidHover]="fluidHover()"
    >
      @for (key of keys(); track key; let i = $index) {
        <ff-card [attr.data-testid]="'card-' + i" [label]="'Card ' + i" [selected]="selected() === i" (cardClick)="clicked(i)">
          <div ffCardHeader>
            <span ffCardTitle>Title {{ i }}</span>
            <p ffCardDescription>Description</p>
          </div>
          <div ffCardFooter><button ffCardButton (click)="action(i)">Connect</button></div>
        </ff-card>
      }
    </ff-card-group>
  `,
})
class GroupHost {
  readonly keys = signal(['a', 'b', 'c']);
  readonly orientation = signal<CardOrientation>('card');
  readonly columns = signal(1);
  readonly border = signal<CardBorder>('none');
  readonly separated = signal(false);
  readonly fluidHover = signal(true);
  readonly selected = signal<number | null>(null);
  readonly clicked = vi.fn();
  readonly action = vi.fn();
}

function setupGroup(configure: (host: GroupHost) => void = () => {}) {
  const fixture = TestBed.createComponent(GroupHost);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const get = (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
  const group = fixture.debugElement.query(By.directive(CardGroup)).componentInstance as CardGroup;
  const update = (fn: (host: GroupHost) => void) => {
    fn(fixture.componentInstance);
    fixture.detectChanges();
  };
  const highlight = (index: number | null) => {
    group.hover.setActiveIndex(index);
    fixture.detectChanges();
  };
  const bottom = (i: number) => get(`card-${i}`).querySelector<HTMLElement>(':scope > span.h-px');
  const right = (i: number) => get(`card-${i}`).querySelector<HTMLElement>(':scope > span.w-px');
  return { fixture, el, get, group, update, highlight, bottom, right, host: fixture.componentInstance };
}

describe('CardGroup: layout', () => {
  it('is a relative grid with one column by default and the card-group slot', () => {
    const { get } = setupGroup();
    const group = get('group');
    expect(group.getAttribute('data-slot')).toBe('card-group');
    expect(group.getAttribute('data-orientation')).toBe('card');
    expectClasses(group, 'relative grid gap-0');
    expect(group.style.gridTemplateColumns).toBe('repeat(1, minmax(0, 1fr))');
  });

  it('assigns each card its fluid hover index in order', () => {
    const { get, update } = setupGroup();
    expect([0, 1, 2].map((i) => get(`card-${i}`).getAttribute('data-fluid-hover-index'))).toEqual(['0', '1', '2']);
    update((h) => h.keys.set(['z', 'a', 'b', 'c']));
    expect(get('card-3').getAttribute('data-fluid-hover-index')).toBe('3');
  });

  it('outlined draws one shared frame; separated splits into gapped tiles with their own frame', () => {
    const { get, update } = setupGroup((h) => {
      h.border.set('outlined');
      h.columns.set(2);
    });
    expectClasses(get('group'), 'border border-border/60 overflow-hidden rounded-xl');
    expect(get('group').style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expectNoClasses(get('card-0'), 'rounded-xl border');
    update((h) => h.separated.set(true));
    expectClasses(get('group'), 'gap-2');
    expectNoClasses(get('group'), 'border overflow-hidden');
    expectClasses(get('card-0'), 'rounded-xl overflow-hidden border border-border/60');
    update((h) => h.border.set('none'));
    expectNoClasses(get('card-0'), 'rounded-xl overflow-hidden border');
  });
});

describe('CardGroup: dividers', () => {
  it('draws a hairline toward the card below, none after the last', () => {
    const { bottom, right } = setupGroup();
    expect(bottom(0)).not.toBeNull();
    expectClasses(bottom(0)!, 'absolute inset-x-0 bottom-0 h-px bg-border/60 pointer-events-none -z-10');
    expect(bottom(0)!.getAttribute('aria-hidden')).toBe('true');
    expect(bottom(1)).not.toBeNull();
    expect(bottom(2)).toBeNull();
    expect(right(0)).toBeNull();
  });

  it('drops the hairlines that touch the selected card', () => {
    const { bottom } = setupGroup((h) => h.selected.set(1));
    expect(bottom(0)).toBeNull();
    expect(bottom(1)).toBeNull();
  });

  it('drops the hairlines that touch the highlighted card', () => {
    const { bottom, highlight } = setupGroup();
    highlight(2);
    expect(bottom(0)).not.toBeNull();
    expect(bottom(1)).toBeNull();
    highlight(null);
    expect(bottom(1)).not.toBeNull();
  });

  it('in a grid, draws right hairlines that stop 1px short where both meet', () => {
    const { bottom, right } = setupGroup((h) => {
      h.columns.set(2);
      h.keys.set(['a', 'b', 'c', 'd']);
    });
    expect(right(0)).not.toBeNull();
    expectClasses(right(0)!, 'absolute top-0 right-0 w-px bottom-px');
    expect(bottom(0)).not.toBeNull();
    expect(right(1)).toBeNull();
    expect(bottom(1)).not.toBeNull();
    expectClasses(right(2)!, 'bottom-0');
    expect(bottom(2)).toBeNull();
    expect(right(3)).toBeNull();
  });

  it('separated tiles draw no dividers', () => {
    const { bottom } = setupGroup((h) => h.separated.set(true));
    expect(bottom(0)).toBeNull();
  });
});

describe('CardGroup: fluid hover', () => {
  it('a clickable card joins the highlight', () => {
    const { get, highlight } = setupGroup();
    highlight(1);
    expect(get('card-1').hasAttribute(ACTIVE_ATTR)).toBe(true);
    // jsdom has no layout, so the highlight fill never measures; its host is there.
    expect(get('group').querySelector('ff-fluid-hover-highlight')).not.toBeNull();
  });

  it('a click in the gap lands on the highlighted card, not on its actions', () => {
    const { get, highlight, host } = setupGroup();
    highlight(1);
    get('group').click();
    expect(host.clicked).toHaveBeenCalledWith(1);
    expect(host.clicked).toHaveBeenCalledTimes(1);
    expect(host.action).not.toHaveBeenCalled();
  });

  it('fluidHover=false turns the gap-click routing off', () => {
    const { get, highlight, host } = setupGroup((h) => h.fluidHover.set(false));
    highlight(1);
    get('group').click();
    expect(host.clicked).not.toHaveBeenCalled();
  });
});

@Component({
  imports: PARTS,
  template: `
    <ff-card-group data-testid="group">
      <ff-card data-testid="info"><div ffCardHeader><span ffCardTitle>Info</span></div></ff-card>
    </ff-card-group>
  `,
})
class InfoGroupHost {}

it('an informational card (no click target) stays out of the highlight', () => {
  const fixture = TestBed.createComponent(InfoGroupHost);
  fixture.detectChanges();
  const group = fixture.debugElement.query(By.directive(CardGroup)).componentInstance as CardGroup;
  group.hover.setActiveIndex(0);
  fixture.detectChanges();
  const card = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="info"]')!;
  expect(card.hasAttribute(ACTIVE_ATTR)).toBe(false);
  expect(card.querySelector('button, a')).toBeNull();
});

describe('Card: click target', () => {
  it('a card with a click listener renders a stretched button with its label', () => {
    const { get, host } = setupGroup();
    const overlay = get('card-0').querySelector<HTMLButtonElement>(':scope > button')!;
    expect(overlay.getAttribute('type')).toBe('button');
    expect(overlay.getAttribute('aria-label')).toBe('Card 0');
    expect(overlay.hasAttribute('aria-pressed')).toBe(false);
    expectClasses(overlay, 'absolute inset-0 z-20 outline-none rounded-[inherit]');
    overlay.click();
    expect(host.clicked).toHaveBeenCalledWith(0);
  });

  it('footer actions stay independently clickable above the overlay', () => {
    const { get, host } = setupGroup();
    const footer = get('card-0').querySelector<HTMLElement>('[data-slot="card-footer"]')!;
    expectClasses(footer, 'relative z-30');
    footer.querySelector('button')!.click();
    expect(host.action).toHaveBeenCalledWith(0);
    expect(host.clicked).not.toHaveBeenCalled();
  });
});

describe('Card: selected', () => {
  it('marks the card, paints the fill, presses the overlay and bolds the title', () => {
    const { get } = setupGroup((h) => h.selected.set(0));
    const card = get('card-0');
    expect(card.getAttribute('data-selected')).toBe('true');
    expect(get('card-1').hasAttribute('data-selected')).toBe(false);
    const fill = card.querySelector<HTMLElement>(':scope > span.bg-active')!;
    expectClasses(fill, 'absolute inset-0 -z-10 bg-active pointer-events-none rounded-xl');
    expect(card.querySelector(':scope > button')!.getAttribute('aria-pressed')).toBe('true');
    const [ghost, visible] = Array.from(card.querySelectorAll<HTMLElement>('[data-slot="card-title"] > span'));
    expect(ghost.getAttribute('aria-hidden')).toBe('true');
    expect(ghost.style.fontVariationSettings).toContain("'wght' 550");
    expect(visible.style.fontVariationSettings).toContain("'wght' 550");
    const other = get('card-1').querySelectorAll<HTMLElement>('[data-slot="card-title"] > span')[1];
    expect(other.style.fontVariationSettings).toContain("'wght' 400");
  });
});

@Component({
  imports: PARTS,
  template: `
    <ff-card
      data-testid="card"
      class="max-w-xs"
      [href]="href()"
      [external]="external()"
      [label]="label()"
      [disabled]="disabled()"
      [dismissible]="dismissible()"
      [dismissOnHover]="dismissOnHover()"
      [size]="size()"
      (cardClick)="clicked()"
      (dismiss)="dismissed()"
    >
      <img ffCardImage src="banner.png" />
      <div ffCardHeader>
        <span ffCardEyebrow>New</span>
        <span ffCardTitle>Meet the card</span>
        <p ffCardDescription>Supporting text</p>
        <div ffCardAction>…</div>
      </div>
      <div ffCardContent><ff-card-feature icon="paintbrush" title="Pixel-perfect" description="Token-driven" /></div>
      <div ffCardFooter></div>
    </ff-card>
  `,
})
class StandaloneHost {
  readonly href = signal<string | undefined>(undefined);
  readonly external = signal(false);
  readonly label = signal<string | undefined>('Open card');
  readonly disabled = signal(false);
  readonly dismissible = signal(false);
  readonly dismissOnHover = signal(true);
  readonly size = signal<'default' | 'compact' | undefined>(undefined);
  readonly clicked = vi.fn();
  readonly dismissed = vi.fn();
}

function setupStandalone(configure: (host: StandaloneHost) => void = () => {}) {
  const fixture = TestBed.createComponent(StandaloneHost);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const card = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-testid="card"]')!;
  const slot = (name: string) => card.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;
  return { fixture, card, slot, host: fixture.componentInstance };
}

describe('Card: standalone', () => {
  it('is its own rounded, clipped tile with the stacked layout and a hover tint', () => {
    const { card } = setupStandalone();
    expect(card.getAttribute('data-slot')).toBe('card');
    expect(card.getAttribute('data-orientation')).toBe('card');
    expect(card.hasAttribute('data-fluid-hover-index')).toBe(false);
    expectClasses(card, 'group/card relative z-10 min-w-0 min-h-[60px] flex flex-col pb-4');
    expectClasses(card, 'rounded-xl overflow-hidden max-w-xs transition-colors duration-80 hover:bg-hover');
  });

  it('renders every part with its data-slot and stacked spacing', () => {
    const { slot } = setupStandalone();
    expect(slot('card-image').tagName).toBe('IMG');
    expect(slot('card-image').getAttribute('alt')).toBe('');
    expectClasses(slot('card-image'), 'object-cover rounded-[2px] w-full aspect-[16/9]');
    expectClasses(slot('card-header'), 'grid auto-rows-min items-start gap-1 px-4 pt-4');
    expectClasses(slot('card-title'), 'inline-grid grid-cols-[minmax(0,1fr)] text-[length:var(--fs-subtitle,14px)]');
    expect(slot('card-title').tagName).toBe('SPAN');
    expectClasses(slot('card-description'), 'text-muted-foreground text-[length:var(--fs-subtitle,14px)]');
    expect(slot('card-description').tagName).toBe('P');
    expectClasses(slot('card-action'), 'relative z-30 col-start-2 row-span-2 row-start-1 self-start justify-self-end');
    expectClasses(slot('card-eyebrow'), 'text-muted-foreground text-[length:var(--fs-caption,12px)]');
    expectClasses(slot('card-content'), 'px-4 pt-3');
    expectClasses(slot('card-footer'), 'relative z-30 flex items-center gap-1 flex-wrap px-4 pt-3');
    const feature = slot('card-feature');
    expectClasses(feature, 'flex items-start gap-2');
    expect(feature.querySelector('svg')!.getAttribute('width')).toBe('16');
    expect(feature.textContent).toContain('Pixel-perfect');
    expect(feature.textContent).toContain('Token-driven');
  });

  it('compact tightens padding and type for every part', () => {
    const { card, slot } = setupStandalone((h) => h.size.set('compact'));
    expectClasses(card, 'pb-3');
    expectClasses(slot('card-header'), 'px-3 pt-3');
    expectClasses(slot('card-title'), 'text-[length:var(--fs-subtitle-compact,13px)]');
    expectClasses(slot('card-content'), 'px-3 pt-2.5');
    expectClasses(slot('card-footer'), 'px-3 pt-2.5');
    expectClasses(slot('card-feature'), 'gap-1');
  });

  it('href renders a stretched link; external opens a new tab', () => {
    const { card, host } = setupStandalone((h) => {
      h.href.set('#docs');
      h.external.set(true);
    });
    const link = card.querySelector<HTMLAnchorElement>(':scope > a')!;
    expect(link.getAttribute('href')).toBe('#docs');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('aria-label')).toBe('Open card');
    expect(card.querySelector(':scope > button')).toBeNull();
    link.click();
    expect(host.clicked).toHaveBeenCalledTimes(1);
  });

  it('disabled drops the click target and dims the card', () => {
    const { card } = setupStandalone((h) => h.disabled.set(true));
    expect(card.getAttribute('aria-disabled')).toBe('true');
    expectClasses(card, 'opacity-50 pointer-events-none');
    expect(card.querySelector(':scope > button, :scope > a')).toBeNull();
    expectNoClasses(card, 'hover:bg-hover');
  });

  it('dismissible shows a Dismiss control, revealed on hover by default', () => {
    const { card, host, fixture } = setupStandalone((h) => h.dismissible.set(true));
    const dismiss = card.querySelector<HTMLButtonElement>('button[aria-label="Dismiss"]')!;
    expect(dismiss.getAttribute('type')).toBe('button');
    expectClasses(dismiss, 'absolute right-2 top-2 z-30 h-7 w-7 rounded-lg');
    // Over a CardImage the control gets its own ground.
    expectClasses(dismiss, 'bg-card/70 backdrop-blur-sm hover:bg-card');
    expectClasses(dismiss, 'pointer-events-none opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100');
    const icon = dismiss.querySelector('svg')!;
    expect(icon.getAttribute('class')).toContain('lucide-x');
    expect(icon.getAttribute('width')).toBe('15');
    dismiss.click();
    expect(host.dismissed).toHaveBeenCalledTimes(1);
    expect(host.clicked).not.toHaveBeenCalled();
    fixture.componentInstance.dismissOnHover.set(false);
    fixture.detectChanges();
    expectNoClasses(dismiss, 'opacity-0 pointer-events-none');
  });
});

@Component({
  imports: PARTS,
  template: `
    <ff-card-group orientation="inline">
      <ff-card data-testid="plain" dismissible (cardClick)="noop()">
        <ff-card-media icon="shield" />
        <div ffCardHeader><span ffCardTitle>Row</span></div>
        <div ffCardFooter><button ffCardButton>Go</button></div>
      </ff-card>
      <ff-card data-testid="image" (cardClick)="noop()">
        <img ffCardImage src="banner.png" alt="Banner" />
        <div ffCardHeader><span ffCardTitle>Image row</span></div>
        <div ffCardFooter><button ffCardButton>Go</button></div>
      </ff-card>
    </ff-card-group>
  `,
})
class InlineHost {
  noop() {}
}

describe('Card: inline orientation', () => {
  function setupInline() {
    const fixture = TestBed.createComponent(InlineHost);
    fixture.detectChanges();
    const get = (id: string) => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    return { get };
  }

  it('lays a row out: leading media, flexible header, trailing footer', () => {
    const card = setupInline().get('plain');
    expect(card.getAttribute('data-orientation')).toBe('inline');
    expectClasses(card, 'flex flex-row items-center gap-3 pl-4');
    // The corner dismiss: the header yields right padding while revealed.
    expectClasses(card, '[&:hover_[data-slot=card-header]]:pr-10 [&:focus-within_[data-slot=card-header]]:pr-10');
    expectClasses(card.querySelector('[data-slot="card-header"]')!, 'min-w-0 flex-1 py-3.5');
    expectClasses(card.querySelector('[data-slot="card-footer"]')!, 'shrink-0 ml-auto pr-4');
    const media = card.querySelector<HTMLElement>('[data-slot="card-media"]')!;
    expectClasses(media, 'inline-flex items-center justify-center shrink-0 size-8 bg-hover rounded-lg');
    expectNoClasses(media, 'mb-2');
    expect(media.querySelector('svg')!.getAttribute('width')).toBe('18');
    for (const span of Array.from(card.querySelectorAll('[data-slot="card-title"] > span'))) {
      expectClasses(span, '[text-box:trim-both_cap_alphabetic]');
    }
  });

  it('with a CardImage, centres the text and actions in a column beside the image', () => {
    const card = setupInline().get('image');
    expectClasses(card, 'flex flex-row items-center gap-3');
    expectNoClasses(card, 'pl-4');
    const image = card.querySelector<HTMLElement>('[data-slot="card-image"]')!;
    expectClasses(image, 'size-40 shrink-0');
    expect(image.getAttribute('alt')).toBe('Banner');
    const column = card.querySelector<HTMLElement>(':scope > div')!;
    expectClasses(column, 'flex min-w-0 flex-1 flex-col justify-center gap-2 py-3.5 pr-4');
    const header = column.querySelector<HTMLElement>('[data-slot="card-header"]')!;
    expectClasses(header, 'min-w-0');
    expectNoClasses(header, 'flex-1');
    const footer = column.querySelector<HTMLElement>('[data-slot="card-footer"]')!;
    expectClasses(footer, 'flex-wrap');
    expectNoClasses(footer, 'ml-auto');
  });
});

@Component({
  imports: PARTS,
  template: `
    <a ffCardButton href="#docs" external icon="plus" data-testid="link">Docs</a>
    <button ffCardButton variant="primary" [disabled]="true" (click)="clicked()" data-testid="primary">Get started</button>
    <ff-card-media [logo]="['a.svg', 'b.svg']" logoAlt="Logo" data-testid="logos" />
    <ff-card-media data-testid="empty" />
  `,
})
class ActionsHost {
  readonly clicked = vi.fn();
}

describe('CardButton and CardMedia', () => {
  function setupActions() {
    const fixture = TestBed.createComponent(ActionsHost);
    fixture.detectChanges();
    const get = (id: string) => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    return { get, host: fixture.componentInstance };
  }

  it('an external link action opens a new tab, its icon trails and an outward arrow follows', () => {
    const link = setupActions().get('link');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.hasAttribute('type')).toBe(false);
    expectClasses(link, 'group/action relative z-30 inline-flex h-7 px-2.5 rounded-lg text-muted-foreground hover:bg-hover');
    expect(link.style.fontVariationSettings).toContain("'wght' 400");
    const children = Array.from(link.children);
    expect(children[0].className).toBe('[text-box:trim-both_cap_alphabetic]');
    const svgs = link.querySelectorAll('svg');
    expect(svgs[0].getAttribute('class')).toContain('lucide-plus');
    expect(svgs[0].getAttribute('width')).toBe('14');
    expect(svgs[1].getAttribute('class')).toContain('lucide-arrow-right');
    expect(svgs[1].getAttribute('class')).toContain('-rotate-45');
    expect(svgs[1].getAttribute('width')).toBe('13');
  });

  it('a button action is type="button", takes its variant and honors disabled', () => {
    const { get, host } = setupActions();
    const button = get('primary') as HTMLButtonElement;
    expect(button.getAttribute('type')).toBe('button');
    expectClasses(button, 'bg-foreground text-background hover:bg-foreground/90');
    expect(button.disabled).toBe(true);
    button.click();
    expect(host.clicked).not.toHaveBeenCalled();
  });

  it('a logo pair renders two outlined images joined by a connector', () => {
    const logos = setupActions().get('logos');
    expect(logos.getAttribute('data-slot')).toBe('card-media');
    expectClasses(logos, 'inline-flex items-center gap-1.5 shrink-0 mb-2');
    const imgs = Array.from(logos.querySelectorAll('img'));
    expect(imgs.map((i) => i.getAttribute('src'))).toEqual(['a.svg', 'b.svg']);
    expect(imgs[0].getAttribute('alt')).toBe('Logo');
    expect(imgs[0].getAttribute('width')).toBe('22');
    expect(imgs[0].style.width).toBe('22px');
    expect(imgs[0].getAttribute('class')).toContain('object-contain');
    expect(logos.querySelectorAll('span.w-2.h-px').length).toBe(1);
  });

  it('media with neither logo nor icon renders nothing', () => {
    const empty = setupActions().get('empty');
    expect(empty.children.length).toBe(0);
    expect(empty.hasAttribute('hidden')).toBe(true);
  });
});
