import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  numberAttribute,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { Observable, Subject } from 'rxjs';
import { cn } from '../core/utils';
import { fontWeights } from '../core/font-weight';
import { typeClass } from '../core/type-scale';
import { injectShape } from '../core/shape';
import { SizeContext, injectSize, type SizeVariant } from '../core/size';
import { Icon } from '../core/icon';
import type { IconDefinition, IconName } from '../core/icons';
import { createFluidHover } from '../fluid-hover/fluid-hover';
import { FluidHoverHighlight } from '../fluid-hover/fluid-hover-highlight';

// ---------------------------------------------------------------------------
// Card is shadcn/ui's compositional card — the same parts and `data-slot`
// contract (Card, CardHeader, CardTitle, CardDescription, CardAction,
// CardContent, CardFooter) — with the Fluid Functionalism layer on top:
// design tokens, a weight-animated title, and a sibling CardGroup that owns
// layout (stacked list, inline rows, or grid) plus the magnetic fluid hover
// highlight that previews where a click will land.
//
// Unlike stock shadcn, the surface is transparent and borderless by default:
// cards inherit whatever substrate their parent provides (see the Surfaces
// system) and lean on hairline dividers / the fluid hover highlight rather than
// a drawn frame. A Card renders fine on its own; inside a CardGroup it
// registers itself so the group's highlight can find it.
// ---------------------------------------------------------------------------

export type CardOrientation = 'card' | 'inline';
export type CardBorder = 'none' | 'outlined';
/** A brand logo, or a tuple for a connected logo pair (a trigger — target). */
export type CardLogo = string | [string, string];
/** An icon by role name from the icon map, or an icon definition. */
export type CardIcon = IconName | IconDefinition;

const focusRing = 'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]';
const overlayClass = `absolute inset-0 z-20 outline-none ${focusRing} rounded-[inherit]`;

/** Splits an icon input into the `name` / `icon` inputs of `<ff-icon>`. */
function iconInputs(icon: CardIcon | undefined) {
  if (icon === undefined || icon === null) return null;
  return typeof icon === 'string' ? { name: icon, icon: undefined } : { name: undefined, icon };
}

// ── CardGroup ────────────────────────────────────────────

/**
 * `<ff-card-group>` lays its cards out (stacked list, inline rows, or grid),
 * assigns each its fluid hover index, and draws the magnetic highlight.
 */
@Component({
  selector: 'ff-card-group',
  imports: [FluidHoverHighlight],
  template: `
    <!-- Fluid hover highlight — a single magnetic layer that springs to the
         card nearest the cursor, previewing where a click will land. -->
    <ff-fluid-hover-highlight [hover]="hover" [hidden]="!fluidHover()" [class]="highlightClass()" />
    <ng-content />
  `,
  host: {
    'data-slot': 'card-group',
    '[attr.data-orientation]': 'orientation()',
    '[class]': 'hostClass()',
    '[style.grid-template-columns]': 'gridColumns()',
    '(mouseenter)': 'onMouseEnter()',
    '(mousemove)': 'onMouseMove($event)',
    '(mouseleave)': 'onMouseLeave()',
    '(click)': 'onClick($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardGroup {
  /** How each card lays its own content out. "card" — stacked vertically
   *  (media/header on top). "inline" — a horizontal row (leading media,
   *  trailing footer), like a Table row. */
  readonly orientation = input<CardOrientation>('card');
  /** Number of grid columns. >1 enables 2-D fluid hover across rows and columns. */
  readonly columns = input(1, { transform: numberAttribute });
  /** "none" — borderless, separated only by subtle dividers. "outlined" —
   *  draws a border: one shared frame when grouped, or one per card when
   *  `separated`. */
  readonly border = input<CardBorder>('none');
  /** Split the group into individually-shaped cards with a gap between them
   *  (a grid of tiles) instead of one continuous divided block. */
  readonly separated = input(false, { transform: booleanAttribute });
  /** Enable the magnetic fluid-hover highlight. */
  readonly fluidHover = input(true, { transform: booleanAttribute });
  readonly userClass = input('', { alias: 'class' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly shape = injectShape();

  // >1 column wraps into a grid, where nearest-item must be resolved in two
  // dimensions; a single column is a plain vertical list. A card grid has
  // generous whitespace, so a gap click only routes when it lands within a
  // hand's width of the highlighted card.
  readonly hover = createFluidHover(
    () => this.host,
    () => ({ axis: this.columns() > 1 ? 'xy' : 'y', gapClick: { maxDistance: 16 } }),
  );

  /** The cards in order: each one's position is its fluid hover index. */
  readonly cards = contentChildren(Card);
  readonly count = computed(() => this.cards().length);
  /** Index of the persistently-selected card, or -1. Its neighbours drop the
   *  hairline that would otherwise cut across the selection fill. */
  readonly selectedIndex = computed(() => this.cards().findIndex((card) => card.selected()));
  readonly activeIndex = this.hover.activeIndex;
  readonly outlined = computed(() => this.border() === 'outlined');
  /** Inner hairline dividers are drawn between adjacent cards. */
  readonly divided = computed(() => !this.separated());

  protected readonly gridColumns = computed(() => `repeat(${Math.max(1, this.columns())}, minmax(0, 1fr))`);
  protected readonly highlightClass = computed(() => cn('z-0', this.shape().container));
  protected readonly hostClass = computed(() =>
    cn(
      'relative grid',
      // A shared frame clips the highlight + dividers to its rounded corners;
      // separated tiles clip themselves.
      this.outlined() && !this.separated() && `border border-border/60 overflow-hidden ${this.shape().container}`,
      this.separated() ? 'gap-2' : 'gap-0',
      this.userClass(),
    ),
  );

  protected onMouseEnter() {
    if (this.fluidHover()) this.hover.onMouseEnter();
  }
  protected onMouseMove(e: MouseEvent) {
    if (this.fluidHover()) this.hover.onMouseMove(e);
  }
  protected onMouseLeave() {
    if (this.fluidHover()) this.hover.onMouseLeave();
  }
  protected onClick(e: MouseEvent) {
    if (this.fluidHover()) this.hover.onClick(e);
  }
}

// ── CardImage ────────────────────────────────────────────
// FF addition: the prominent, full-bleed image (distinct from a small logo).
// Stacked → a top banner; inline → a full-height leading image on the left that
// bleeds past the card's left inset to sit flush against the edge.

/** `<img ffCardImage src="…" />` */
@Directive({
  selector: 'img[ffCardImage]',
  host: {
    'data-slot': 'card-image',
    '[attr.alt]': 'alt()',
    '[class]': 'hostClass()',
  },
})
export class CardImage {
  readonly alt = input('');
  readonly userClass = input('', { alias: 'class' });
  private readonly card = inject(Card, { optional: true });

  // The image keeps a fixed 2px corner radius in every state — stacked or
  // inline, framed or borderless — rather than inheriting a frame's larger
  // clip. The inset outline paints over the edge pixels, so it neither
  // changes this geometry nor disappears when a pale image meets the page.
  protected readonly hostClass = computed(() =>
    cn(
      'object-cover rounded-[2px] outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
      this.card?.orientation() === 'inline' ? 'size-40 shrink-0' : 'w-full aspect-[16/9]',
      this.userClass(),
    ),
  );
}

// ── Card ─────────────────────────────────────────────────

/**
 * `<ff-card>`: the card surface. Bind `(cardClick)` or set `href` to make the
 * whole card one interactive target (a stretched button or link); fluid hover
 * previews it inside a CardGroup.
 */
@Component({
  selector: 'ff-card',
  imports: [Icon, NgTemplateOutlet],
  providers: [{ provide: SizeContext, useFactory: () => inject(Card).sizeContext }],
  template: `
    <ng-template #image><ng-content select="img[ffCardImage]" /></ng-template>
    <ng-template #rest><ng-content /></ng-template>

    <!-- Persistent selected fill + dividers sit behind the static content
         (-z-10); the stretched overlay (z-20) sits above content so the whole
         card is clickable, and actions/dismiss (z-30) rise above the overlay
         to stay independently interactive. -->
    @if (selected()) {
      <span aria-hidden="true" [class]="fillClass()"></span>
    }
    <!-- Dividers between borderless neighbours. Where both hairlines meet,
         the vertical one stops 1px short so the horizontal hairline owns the
         crossing pixel. -->
    @if (showBottom()) {
      <span aria-hidden="true" class="absolute inset-x-0 bottom-0 h-px bg-border/60 pointer-events-none -z-10"></span>
    }
    @if (showRight()) {
      <span aria-hidden="true" [class]="rightDividerClass()"></span>
    }

    <!-- Stretched overlay makes the whole card the click target while keeping
         action buttons (higher z) independently clickable. A disabled card
         drops the overlay entirely so it can't be tabbed to or activated. -->
    @if (clickable() && !disabled()) {
      @if (href()) {
        <a
          [attr.href]="href()"
          [attr.target]="external() ? '_blank' : null"
          [attr.rel]="external() ? 'noopener noreferrer' : null"
          [attr.aria-label]="label() ?? null"
          [class]="overlayClass"
          (click)="clicks.next()"
        ></a>
      } @else {
        <button
          type="button"
          [attr.aria-label]="label() ?? null"
          [attr.aria-pressed]="selected() || null"
          [class]="overlayClass"
          (click)="clicks.next()"
        ></button>
      }
    }

    <ng-container [ngTemplateOutlet]="image" />
    @if (inlineImage()) {
      <!-- Inline image cards wrap their non-image parts in a centred column
           so the title, description, and actions hug together beside it. -->
      <div [class]="columnClass()"><ng-container [ngTemplateOutlet]="rest" /></div>
    } @else {
      <ng-container [ngTemplateOutlet]="rest" />
    }

    <!-- Dismiss control sits above the stretched overlay. -->
    @if (dismissible()) {
      <button type="button" aria-label="Dismiss" [class]="dismissClass()" (click)="dismiss.emit()">
        <ff-icon name="x" [size]="compact() ? 13 : 15" [strokeWidth]="1.5" />
      </button>
    }
  `,
  host: {
    'data-slot': 'card',
    '[attr.data-fluid-hover-index]': 'index() ?? null',
    '[attr.data-selected]': 'selected() || null',
    '[attr.data-orientation]': 'orientation()',
    '[attr.aria-disabled]': 'disabled() || null',
    '[class]': 'hostClass()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {
  /** Makes the whole card a link (a stretched anchor). */
  readonly href = input<string | undefined>(undefined);
  /** Opens `href` in a new tab. */
  readonly external = input(false, { transform: booleanAttribute });
  /** Accessible name for the stretched link/button when the whole card is
   *  clickable (the card's visible title isn't wired up automatically). */
  readonly label = input<string | undefined>(undefined);
  /** Persistent selected state, on top of the transient fluid hover. */
  readonly selected = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Shows a dismiss (✕) button in the corner. */
  readonly dismissible = input(false, { transform: booleanAttribute });
  /** Keep the dismiss control hidden until the card is hovered or holds
   *  focus. Pass false for an always-visible control. */
  readonly dismissOnHover = input(true, { transform: booleanAttribute });
  /** Pins the card (and every ladder-aware part inside it) to one step of the
   *  size ladder. Omitted, it follows the surrounding SizeProvider. */
  readonly sizeInput = input<SizeVariant | undefined>(undefined, { alias: 'size' });
  readonly userClass = input('', { alias: 'class' });
  /** Called when the dismiss button is pressed. */
  readonly dismiss = output<void>();

  /** @internal Stretched-target clicks; `cardClick` relays them. */
  protected readonly clicks = new Subject<void>();
  private readonly clickListeners = signal(0);
  /**
   * The React `onClick`: binding it makes the whole card a click target (a
   * stretched button, or the link's own click when `href` is set).
   */
  readonly cardClick = outputFromObservable(
    new Observable<void>((subscriber) => {
      untracked(() => this.clickListeners.update((n) => n + 1));
      const subscription = this.clicks.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        untracked(() => this.clickListeners.update((n) => n - 1));
      };
    }),
  );

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly group = inject(CardGroup, { optional: true });
  private readonly parentSize = inject(SizeContext, { optional: true, skipSelf: true });
  private readonly shape = injectShape();

  /** The size every part inside this card reads. */
  readonly sizeContext: SizeContext = {
    size: computed(() => this.sizeInput() ?? this.parentSize?.size() ?? 'default'),
    setSize: (next: SizeVariant) => {
      if (this.sizeInput() === undefined) this.parentSize?.setSize(next);
    },
  };
  readonly compact = computed(() => this.sizeContext.size() === 'compact');

  private readonly imageChild = contentChild(CardImage, { descendants: false });
  /** An inline card holding a full CardImage centres its text + actions in a
   *  column beside the image. */
  readonly hasImage = computed(() => !!this.imageChild());
  readonly orientation = computed<CardOrientation>(() => this.group?.orientation() ?? 'card');
  readonly clickable = computed(() => !!this.href() || this.clickListeners() > 0);
  /** Title weight follows the persistent selected state only — fluid hover
   *  previews via the highlight fill, not by bolding the label. */
  readonly emphasized = this.selected;
  /** Assigned by the enclosing CardGroup: this card's position in it. */
  readonly index = computed<number | undefined>(() => {
    const i = this.group?.cards().indexOf(this) ?? -1;
    return i < 0 ? undefined : i;
  });

  private readonly isInline = computed(() => this.orientation() === 'inline');
  protected readonly inlineImage = computed(() => this.isInline() && this.hasImage());

  // Divider geometry: draw a hairline toward the neighbour below / to the
  // right, but drop it next to the active OR selected card so the highlight
  // and selection fill read clean (the same trick Table uses on row borders).
  private readonly dividers = computed(() => {
    const group = this.group;
    const index = this.index();
    if (!group || index === undefined || !group.divided()) return { bottom: false, right: false };
    const columns = group.columns();
    const count = group.count();
    const active = group.activeIndex() ?? -1;
    const selected = group.selectedIndex();
    const col = index % columns;
    const hasBelow = index + columns < count;
    const hasRight = col < columns - 1 && index + 1 < count;
    const touchesBelow = (i: number) => i === index || i === index + columns;
    const touchesRight = (i: number) => i === index || i === index + 1;
    return {
      bottom: hasBelow && !(touchesBelow(active) || touchesBelow(selected)),
      right: hasRight && !(touchesRight(active) || touchesRight(selected)),
    };
  });
  protected readonly showBottom = computed(() => this.dividers().bottom);
  protected readonly showRight = computed(() => this.dividers().right);

  protected readonly overlayClass = overlayClass;
  protected readonly fillClass = computed(() =>
    cn('absolute inset-0 -z-10 bg-active pointer-events-none', this.shape().container),
  );
  protected readonly rightDividerClass = computed(() =>
    cn('absolute top-0 right-0 w-px bg-border/60 pointer-events-none -z-10', this.showBottom() ? 'bottom-px' : 'bottom-0'),
  );
  protected readonly columnClass = computed(() =>
    cn('flex min-w-0 flex-1 flex-col justify-center gap-2', this.compact() ? 'py-2.5 pr-3' : 'py-3.5 pr-4'),
  );
  protected readonly dismissClass = computed(() =>
    cn(
      `absolute right-2 top-2 z-30 flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer outline-none transition-colors duration-80 ${focusRing}`,
      // Over media the control needs its own ground, or the icon reads
      // against whatever the image happens to be.
      this.hasImage() ? 'bg-card/70 backdrop-blur-sm hover:bg-card' : 'hover:bg-hover',
      // Revealed on hover / focus. pointer-events gates alongside opacity: an
      // invisible control must not swallow taps meant for the card. Keyboard
      // focus still reaches it.
      this.dismissOnHover() &&
        'pointer-events-none opacity-0 transition-opacity duration-80 group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100',
      this.shape().button,
    ),
  );

  protected readonly hostClass = computed(() => {
    const group = this.group;
    const compact = this.compact();
    const separated = group ? group.separated() : true;
    const outlined = group ? group.outlined() : false;
    // A standalone card (no group) is its own tile — always rounded + clipped.
    // Inside a group, a separated tile carries its own rounding + clip only
    // when it draws a visible frame; a card in a continuous block leans on
    // the shared group frame for both.
    const tileShape = !group
      ? cn(this.shape().container, 'overflow-hidden')
      : separated && outlined
        ? cn(this.shape().container, 'overflow-hidden border border-border/60')
        : '';
    return cn(
      'group/card relative z-10 min-w-0 min-h-[60px]',
      this.inlineImage()
        ? cn('flex flex-row items-center', compact ? 'gap-2.5' : 'gap-3')
        : this.isInline()
          ? cn('flex flex-row items-center', compact ? 'gap-2.5 pl-3' : 'gap-3 pl-4')
          : cn('flex flex-col', compact ? 'pb-3' : 'pb-4'),
      // Standalone cards can't lean on the group highlight, so they carry
      // their own hover tint when interactive.
      !group && this.clickable() && !this.disabled() && 'transition-colors duration-80 hover:bg-hover',
      // Inline rows are single-line, so the corner dismiss would sit on the
      // title's tail: the header yields right padding whenever the control is
      // present — only while it's revealed in the on-hover case.
      this.dismissible() &&
        this.isInline() &&
        (this.dismissOnHover()
          ? '[&:hover_[data-slot=card-header]]:pr-10 [&:focus-within_[data-slot=card-header]]:pr-10'
          : '[&_[data-slot=card-header]]:pr-10'),
      tileShape,
      this.disabled() && 'opacity-50 pointer-events-none',
      this.userClass(),
    );
  });

  constructor() {
    // Only a card that can be clicked joins the highlight: a highlight on an
    // informational card would promise a click that has nowhere to land.
    effect((onCleanup) => {
      const group = this.group;
      const index = this.index();
      if (!group || index === undefined || !this.clickable()) return;
      untracked(() => group.hover.registerItem(index, this.host));
      onCleanup(() => group.hover.unregisterItem(index, this.host));
    });
    inject(DestroyRef).onDestroy(() => this.clicks.complete());
  }
}

// ── CardHeader ───────────────────────────────────────────
// shadcn's header grid: title + description stack, with CardAction pinned to
// the top-right column. In an inline card it becomes the flexible text column
// between the leading media and trailing footer.

/** `<div ffCardHeader>` */
@Directive({
  selector: '[ffCardHeader]',
  host: { 'data-slot': 'card-header', '[class]': 'hostClass()' },
})
export class CardHeader {
  readonly userClass = input('', { alias: 'class' });
  private readonly card = inject(Card, { optional: true });
  private readonly size = injectSize();
  protected readonly hostClass = computed(() => {
    const orientation = this.card?.orientation() ?? 'card';
    const inlineImage = orientation === 'inline' && !!this.card?.hasImage();
    const compact = this.size().variant === 'compact';
    return cn(
      'grid auto-rows-min items-start gap-1 has-data-[slot=card-action]:grid-cols-[1fr_auto]',
      inlineImage
        ? 'min-w-0'
        : orientation === 'inline'
          ? cn('min-w-0 flex-1', compact ? 'py-2.5' : 'py-3.5')
          : compact
            ? 'px-3 pt-3'
            : 'px-4 pt-4',
      this.userClass(),
    );
  });
}

// ── CardTitle ────────────────────────────────────────────

/**
 * `<span ffCardTitle>Title</span>`. Ghost-span pattern: an invisible semibold
 * copy reserves the width so the resting→selected weight animation never
 * reflows the row. Projected content renders once, so the ghost mirrors the
 * title's text.
 */
@Component({
  selector: '[ffCardTitle]',
  template: `
    <span #ghost [class]="ghostClass()" [style.font-variation-settings]="weights.semibold" aria-hidden="true"></span>
    <span
      #visible
      [class]="visibleClass()"
      [style.font-variation-settings]="emphasized() ? weights.semibold : weights.normal"
      ><ng-content
    /></span>
  `,
  host: { 'data-slot': 'card-title', '[class]': 'hostClass()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardTitle {
  readonly userClass = input('', { alias: 'class' });
  private readonly card = inject(Card, { optional: true });
  private readonly size = injectSize();
  protected readonly weights = fontWeights;
  // normal → semibold on emphasis, matching nav-item / menu-item / table.
  protected readonly emphasized = computed(() => !!this.card?.emphasized());
  // Inline rows trim the title to cap height so it centres tightly against
  // the media/actions; stacked cards keep the natural line box.
  private readonly trim = computed(() =>
    this.card?.orientation() === 'inline' ? '[text-box:trim-both_cap_alphabetic]' : '',
  );
  // Truncation support: a consumer's `truncate` lands on this grid, whose
  // text-overflow can't ellipsize; the cell spans render the … instead, and
  // minmax(0,1fr) clamps the track to the clipped grid's width.
  protected readonly hostClass = computed(() =>
    cn(
      'inline-grid grid-cols-[minmax(0,1fr)]',
      typeClass('subtitle', this.size().variant === 'compact' ? 'compact' : 'default'),
      this.userClass(),
    ),
  );
  protected readonly ghostClass = computed(() =>
    cn('col-start-1 row-start-1 invisible min-w-0 overflow-hidden text-ellipsis', this.trim()),
  );
  protected readonly visibleClass = computed(() =>
    cn(
      'col-start-1 row-start-1 min-w-0 overflow-hidden text-ellipsis text-foreground transition-[font-variation-settings] duration-80',
      this.trim(),
    ),
  );

  private readonly ghost = viewChild.required<ElementRef<HTMLElement>>('ghost');
  private readonly visible = viewChild.required<ElementRef<HTMLElement>>('visible');

  constructor() {
    afterRenderEffect((onCleanup) => {
      const ghost = this.ghost().nativeElement;
      const visible = this.visible().nativeElement;
      const sync = () => {
        ghost.textContent = visible.textContent;
      };
      sync();
      if (typeof MutationObserver === 'undefined') return;
      const observer = new MutationObserver(sync);
      observer.observe(visible, { childList: true, characterData: true, subtree: true });
      onCleanup(() => observer.disconnect());
    });
  }
}

// ── CardDescription ──────────────────────────────────────

/** `<p ffCardDescription>` */
@Directive({
  selector: '[ffCardDescription]',
  host: { 'data-slot': 'card-description', '[class]': 'hostClass()' },
})
export class CardDescription {
  readonly userClass = input('', { alias: 'class' });
  private readonly size = injectSize();
  protected readonly hostClass = computed(() =>
    cn(
      'text-muted-foreground',
      typeClass('subtitle', this.size().variant === 'compact' ? 'compact' : 'default'),
      this.userClass(),
    ),
  );
}

// ── CardAction ───────────────────────────────────────────
// Pinned to the header's top-right column (shadcn's slot). Sits above the
// stretched overlay so any control inside stays independently clickable.

/** `<div ffCardAction>` */
@Directive({
  selector: '[ffCardAction]',
  host: { 'data-slot': 'card-action', '[class]': 'hostClass()' },
})
export class CardAction {
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() =>
    cn('relative z-30 col-start-2 row-span-2 row-start-1 self-start justify-self-end', this.userClass()),
  );
}

// ── CardContent ──────────────────────────────────────────

/** `<div ffCardContent>` */
@Directive({
  selector: '[ffCardContent]',
  host: { 'data-slot': 'card-content', '[class]': 'hostClass()' },
})
export class CardContent {
  readonly userClass = input('', { alias: 'class' });
  private readonly card = inject(Card, { optional: true });
  private readonly size = injectSize();
  protected readonly hostClass = computed(() => {
    const compact = this.size().variant === 'compact';
    return cn(
      this.card?.orientation() === 'inline' ? '' : compact ? 'px-3 pt-2.5' : 'px-4 pt-3',
      this.userClass(),
    );
  });
}

// ── CardFooter ───────────────────────────────────────────
// Actions row. Rises above the stretched overlay (z-30) so buttons stay
// clickable. In an inline card it becomes the trailing, right-aligned slot.

/** `<div ffCardFooter>` */
@Directive({
  selector: '[ffCardFooter]',
  host: { 'data-slot': 'card-footer', '[class]': 'hostClass()' },
})
export class CardFooter {
  readonly userClass = input('', { alias: 'class' });
  private readonly card = inject(Card, { optional: true });
  private readonly size = injectSize();
  protected readonly hostClass = computed(() => {
    const orientation = this.card?.orientation() ?? 'card';
    const inlineImage = orientation === 'inline' && !!this.card?.hasImage();
    const compact = this.size().variant === 'compact';
    return cn(
      'relative z-30 flex items-center gap-1',
      inlineImage
        ? // Under the text, left-aligned in natural order (the inline wrapper
          // owns the spacing).
          'flex-wrap'
        : orientation === 'inline'
          ? cn('shrink-0 ml-auto', compact ? 'pr-3' : 'pr-4')
          : cn('flex-wrap', compact ? 'px-3 pt-2.5' : 'px-4 pt-3'),
      this.userClass(),
    );
  });
}

// ── CardMedia ────────────────────────────────────────────
// FF addition: a leading icon or brand logo(s). Not part of shadcn's anatomy,
// but the connective tissue most product cards need. A tuple renders a
// connected logo pair (e.g. a trigger — target).

/** `<ff-card-media icon="shield" />` or `<ff-card-media [logo]="src" />` */
@Component({
  selector: 'ff-card-media',
  imports: [Icon],
  template: `
    @if (logos().length) {
      @for (src of logos(); track $index) {
        <span class="inline-flex items-center gap-1.5">
          @if ($index > 0) {
            <span aria-hidden="true" class="w-2 h-px bg-border"></span>
          }
          <img
            [src]="src"
            [alt]="logoAlt() ?? ''"
            [attr.width]="size()"
            [attr.height]="size()"
            [class]="logoClass()"
            [style.width.px]="size()"
            [style.height.px]="size()"
          />
        </span>
      }
    } @else if (iconInputs(); as icon) {
      <ff-icon
        [name]="icon.name"
        [icon]="icon.icon"
        [size]="compact() ? 16 : 18"
        [strokeWidth]="1.5"
        class="text-muted-foreground"
      />
    }
  `,
  host: {
    '[attr.data-slot]': 'empty() ? null : "card-media"',
    '[attr.hidden]': 'empty() ? "" : null',
    '[class]': 'hostClass()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardMedia {
  readonly logo = input<CardLogo | undefined>(undefined);
  readonly logoAlt = input<string | undefined>(undefined);
  readonly icon = input<CardIcon | undefined>(undefined);
  /** Logo size in px. */
  readonly size = input(22, { transform: numberAttribute });
  readonly userClass = input('', { alias: 'class' });

  private readonly card = inject(Card, { optional: true });
  private readonly shape = injectShape();
  private readonly sizeClasses = injectSize();
  protected readonly compact = computed(() => this.sizeClasses().variant === 'compact');
  protected readonly logos = computed(() => {
    const logo = this.logo();
    return logo ? (Array.isArray(logo) ? logo : [logo]) : [];
  });
  protected readonly iconInputs = computed(() => iconInputs(this.icon()));
  protected readonly empty = computed(() => !this.logos().length && !this.iconInputs());
  protected readonly logoClass = computed(() =>
    // Inset image edge: no layout change, theme-neutral ink.
    cn('object-contain outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10', this.shape().bg),
  );
  protected readonly hostClass = computed(() => {
    if (this.empty()) return this.userClass();
    // Stacked: sits in the header grid; an extra 8px makes the gap below the
    // icon read 12px (header gap-1 + mb-2). Inline: leading slot — the card
    // owns the left inset, so no extra padding here.
    const wrap = cn(this.card?.orientation() === 'inline' ? '' : 'mb-2', this.userClass());
    if (this.logos().length) return cn('inline-flex items-center gap-1.5 shrink-0', wrap);
    // The icon sits in a 32×32 tinted tile so it reads as a media slot rather
    // than a bare glyph; an overlay tint, so it blends over the highlight.
    return cn('inline-flex items-center justify-center shrink-0 size-8 bg-hover', this.shape().bg, wrap);
  });
}

// ── CardEyebrow ──────────────────────────────────────────

/** @deprecated No eyebrows: a card starts with its title. Kept for parity. */
@Directive({
  selector: '[ffCardEyebrow]',
  host: {
    'data-slot': 'card-eyebrow',
    '[class]': 'hostClass()',
    '[style.font-variation-settings]': 'semibold',
  },
})
export class CardEyebrow {
  readonly userClass = input('', { alias: 'class' });
  private readonly size = injectSize();
  protected readonly semibold = fontWeights.semibold;
  protected readonly hostClass = computed(() =>
    cn(
      typeClass('caption', this.size().variant === 'compact' ? 'compact' : 'default'),
      'text-muted-foreground',
      this.userClass(),
    ),
  );
}

// ── CardFeature ──────────────────────────────────────────
// FF addition: an icon + title + description row, for feature lists inside
// CardContent.

/** `<ff-card-feature icon="brain" title="…" description="…" />` */
@Component({
  selector: 'ff-card-feature',
  imports: [Icon],
  template: `
    @if (iconInputs(); as icon) {
      <ff-icon
        [name]="icon.name"
        [icon]="icon.icon"
        [size]="size().icon"
        [strokeWidth]="1.5"
        class="mt-0.5 shrink-0 text-muted-foreground"
      />
    }
    <div class="flex flex-col gap-0.5 min-w-0">
      <span [class]="titleClass()" [style.font-variation-settings]="semibold">{{ title() }}</span>
      @if (description()) {
        <span [class]="descriptionClass()">{{ description() }}</span>
      }
    </div>
  `,
  host: {
    'data-slot': 'card-feature',
    // `title` is an input here, not the native tooltip attribute.
    '[attr.title]': 'null',
    '[class]': 'hostClass()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardFeature {
  readonly icon = input<CardIcon | undefined>(undefined);
  readonly title = input.required<string>();
  readonly description = input<string | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  protected readonly size = injectSize();
  protected readonly semibold = fontWeights.semibold;
  protected readonly iconInputs = computed(() => iconInputs(this.icon()));
  protected readonly hostClass = computed(() => cn('flex items-start', this.size().gap, this.userClass()));
  protected readonly titleClass = computed(() =>
    cn('text-foreground [text-box:trim-both_cap_alphabetic]', this.size().text),
  );
  protected readonly descriptionClass = computed(() =>
    cn('text-muted-foreground', typeClass('caption', this.size().variant === 'compact' ? 'compact' : 'default')),
  );
}

// ── CardButton ───────────────────────────────────────────
// Self-contained action button for the footer (keeps Card free of a Button
// dependency, so it installs standalone). Put it on an anchor for a link.

export type CardButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link';

const CARD_BUTTON_VARIANTS: Record<CardButtonVariant, string> = {
  primary: 'bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/80',
  secondary: 'bg-accent text-foreground hover:bg-accent/80 active:bg-accent',
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-hover active:bg-active',
  link: 'text-foreground underline-offset-4 hover:underline !px-0 !h-auto',
};

/** `<button ffCardButton>Connect</button>` or `<a ffCardButton href="…">` */
@Component({
  selector: 'button[ffCardButton], a[ffCardButton]',
  imports: [Icon, NgTemplateOutlet],
  template: `
    <ng-template #glyph>
      @if (iconInputs(); as icon) {
        <ff-icon
          [name]="icon.name"
          [icon]="icon.icon"
          [size]="compact() ? 12 : 14"
          [strokeWidth]="1.5"
          class="shrink-0 transition-[stroke-width] duration-80 group-hover/action:stroke-[2]"
        />
      }
    </ng-template>
    @if (position() === 'start') {
      <ng-container [ngTemplateOutlet]="glyph" />
    }
    <span class="[text-box:trim-both_cap_alphabetic]"><ng-content /></span>
    @if (position() === 'end') {
      <ng-container [ngTemplateOutlet]="glyph" />
    }
    @if (external()) {
      <ff-icon
        name="arrow-right"
        [size]="13"
        [strokeWidth]="1.5"
        class="shrink-0 -rotate-45 transition-[stroke-width] duration-80 group-hover/action:stroke-[2]"
      />
    }
  `,
  host: {
    '[class]': 'hostClass()',
    '[style.font-variation-settings]': 'normal',
    '[attr.type]': 'isNativeButton ? "button" : null',
    '[attr.disabled]': 'isNativeButton && disabled() ? "" : null',
    '[attr.target]': '!isNativeButton && external() ? "_blank" : null',
    '[attr.rel]': '!isNativeButton && external() ? "noopener noreferrer" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardButton {
  readonly variant = input<CardButtonVariant>('ghost');
  readonly icon = input<CardIcon | undefined>(undefined);
  /** Icon side. Defaults to end for external actions, else start. */
  readonly iconPosition = input<'start' | 'end' | undefined>(undefined);
  /** Opens the href in a new tab and appends an outward arrow glyph. */
  readonly external = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly userClass = input('', { alias: 'class' });

  protected readonly isNativeButton =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'BUTTON';
  private readonly shape = injectShape();
  private readonly size = injectSize();
  protected readonly normal = fontWeights.normal;
  protected readonly compact = computed(() => this.size().variant === 'compact');
  protected readonly position = computed(() => this.iconPosition() ?? (this.external() ? 'end' : 'start'));
  protected readonly iconInputs = computed(() => iconInputs(this.icon()));
  protected readonly hostClass = computed(() =>
    cn(
      'group/action relative z-30 inline-flex items-center justify-center gap-1.5 h-7 px-2.5 cursor-pointer outline-none',
      typeClass('caption', this.compact() ? 'compact' : 'default'),
      'transition-colors duration-80',
      focusRing,
      'disabled:opacity-50 disabled:pointer-events-none',
      this.shape().button,
      CARD_BUTTON_VARIANTS[this.variant()],
      this.userClass(),
    ),
  );
}

/** Every card part, for a standalone `imports: [CARD_PARTS]`. */
export const CARD_PARTS = [
  Card,
  CardGroup,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
  CardMedia,
  CardImage,
  CardEyebrow,
  CardFeature,
  CardButton,
] as const;
