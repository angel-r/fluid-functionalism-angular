// ---------------------------------------------------------------------------
// The Callouts section, ported from `DemoCallout` and `FooterCalloutStack` in
// lib/docs/playgrounds/sidebar.tsx plus `StackedCalloutPreview` in
// app/docs/sidebar/page.tsx.
//
// The single callout: a Card on a surface one step above the rail, rising
// another under the pointer, so the card itself answers the hover.
//
// The pile: Sonner's geometry — cards peek out 12px apiece behind the front
// one, scaling down a step each, capped at two visible peeks. Only the INLINE
// pile fans out on hover (banner cards are too tall to fan inside a footer);
// either way, dismissing the front card reveals and promotes the one below.
// Each card keeps its own step of the brand-blue ladder. The container is IN
// FLOW — the footer sits at the column's bottom.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { type AnimationOptions, type DOMKeyframesDefinition } from 'motion';
import {
  CARD_PARTS,
  type FluidAnimation,
  type IconName,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  enterTransition,
  injectAnimateFluid,
  injectShape,
  injectSurface,
  spring,
  surfaceClasses,
  surfaceHoverClasses,
} from '@angel-r/fluid-functionalism-angular';
import { AI_CALLOUT, AI_THREADS, MESH_BANNER } from './sidebar-data';
import { SidebarDemoFooterUser, SidebarDemoHeader } from './sidebar-parts';
import { SidebarDemoRailShell } from './sidebar-shells';

/** The callout card's surface: one step above the rail, rising another under
 *  the pointer, so the card itself answers the hover. */
function calloutSurface(substrate: number, container: string) {
  const level = Math.min(substrate + 1, 8);
  return `${container} overflow-hidden transition-[background-color,box-shadow] duration-80 ${surfaceClasses(
    level,
    2,
  )} ${surfaceHoverClasses(level + 1, 3)} shadow-[var(--shadow-2-inset)] hover:shadow-[var(--shadow-3-inset)]`;
}

/** React `DemoCallout`: the anchored callout. Dismiss really removes the card;
 *  the demo brings it back a beat later so the section keeps its subject. */
@Component({
  selector: 'app-sidebar-demo-callout',
  imports: [CARD_PARTS],
  host: { class: 'contents' },
  template: `
    @if (!dismissed()) {
      @if (variant() === 'inline') {
        <ff-card-group orientation="inline" [fluidHover]="false">
          <ff-card
            size="compact"
            dismissible
            href="sidebar"
            [label]="label"
            [class]="cardClass()"
            (dismiss)="dismiss()"
          >
            <ff-card-media icon="brain" [size]="18" />
            <!-- The dismiss clearance is hover-only (Card pads the header
                 while the ✕ is revealed), so the resting title keeps the full
                 row. -->
            <div ffCardHeader class="gap-[2px] py-3">
              <span ffCardTitle class="truncate">{{ callout.title }}</span>
              <p ffCardDescription [class]="descriptionClass">{{ callout.icon }}</p>
            </div>
          </ff-card>
        </ff-card-group>
      } @else {
        <ff-card
          size="compact"
          dismissible
          href="sidebar"
          [label]="label"
          [class]="cardClass()"
          (dismiss)="dismiss()"
        >
          <img ffCardImage [src]="banner" class="aspect-[2/1] max-h-28" />
          <div ffCardHeader class="gap-0 pt-3">
            <span ffCardTitle class="truncate">{{ callout.title }}</span>
            <p ffCardDescription [class]="descriptionClass">{{ callout.media }}</p>
          </div>
        </ff-card>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoCallout {
  readonly variant = input<'inline' | 'banner'>('inline');
  private readonly substrate = injectSurface();
  private readonly shape = injectShape();
  protected readonly callout = AI_CALLOUT;
  protected readonly banner = MESH_BANNER;
  protected readonly label = `${AI_CALLOUT.title} — ${AI_CALLOUT.media}`;
  protected readonly descriptionClass =
    'truncate text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)]';
  protected readonly dismissed = signal(false);
  protected readonly cardClass = computed(
    () =>
      `${calloutSurface(this.substrate(), this.shape().container)}${this.variant() === 'inline' ? ' min-h-0 pl-2.5' : ''}`,
  );
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected dismiss() {
    this.dismissed.set(true);
    this.timer = setTimeout(() => this.dismissed.set(false), 1600);
  }
}

// ---------------------------------------------------------------------------
// Stacked footer callouts
// ---------------------------------------------------------------------------

interface CalloutItem {
  id: string;
  icon: IconName;
  title: string;
  desc: string;
}

const CALLOUT_STACK: readonly CalloutItem[] = [
  { id: 'sidebar', icon: 'panel-left', title: 'Sidebar is here', desc: 'New in Fluid Functionalism' },
  { id: 'stars', icon: 'star', title: '500 stars', desc: 'Find the hidden mosaic' },
  { id: 'motion', icon: 'play', title: 'Motion guidelines', desc: 'Three spring tiers, one page' },
];

const CALLOUT_PEEK = 12;
const CALLOUT_SCALE = 0.05;
const CALLOUT_GAP = 4;
const CALLOUT_MAX_PEEK = 2;
/** Brand-mesh intensity per card (by its place in CALLOUT_STACK — a card
 *  keeps its own tint when promotion moves it forward). */
const CALLOUT_MESH_STEPS = [1, 0.4, 0.66] as const;
/** The inline tile's flat equivalent of the same ladder (the second card is
 *  the lightest, so the pile alternates instead of just fading back). */
const CALLOUT_TILE_TINTS = ['bg-[#6B97FF]/25', 'bg-[#6B97FF]/[0.08]', 'bg-[#6B97FF]/15'] as const;
/** Height fallbacks until the first card is measured. */
const CALLOUT_INLINE_H = 64;
const CALLOUT_BANNER_H = 180;
/** The exit: a quick fade-and-shrink (React `exit.transition`). */
const CARD_EXIT = { opacity: 0, scale: 0.9 };
const CARD_EXIT_TRANSITION = { duration: 0.12 };
/** Safety net: drop an exiting card even if a throttled tab stalls its exit. */
const CARD_EXIT_FALLBACK_MS = 220;

/** Scales every opacity stop in the brand-blue mesh, so one asset yields the
 *  whole intensity ladder. */
function meshAt(src: string, k: number): string {
  return src.replace(
    /(stop-opacity='|fill-opacity=')([0-9.]+)/g,
    (_, prefix: string, value: string) => `${prefix}${Math.round(Number(value) * k * 1000) / 1000}`,
  );
}

interface CardFrames {
  y: number;
  scale: number;
  opacity: number;
}

/** The write-and-animate call `injectAnimateFluid()` returns. */
type AnimateFn = (
  element: Element,
  keyframes: DOMKeyframesDefinition,
  transition: AnimationOptions,
) => FluidAnimation;

/** Writes frames onto an element motion has not animated yet, so it paints at
 *  them on its first frame (motion's own instant path lands a frame later),
 *  and seeds motion's value store with the same values. */
function setInstant(
  el: HTMLElement,
  frames: Partial<CardFrames> & { height?: number },
  animate: AnimateFn,
) {
  if (frames.y !== undefined || frames.scale !== undefined) {
    const transform: string[] = [];
    if (frames.y) transform.push(`translateY(${frames.y}px)`);
    if (frames.scale !== undefined && frames.scale !== 1) transform.push(`scale(${frames.scale})`);
    el.style.transform = transform.join(' ') || 'none';
  }
  if (frames.opacity !== undefined) el.style.opacity = String(frames.opacity);
  if (frames.height !== undefined) el.style.height = `${frames.height}px`;
  animate(el, frames, { duration: 0 });
}

/** One rendered card. `present: false` while its exit runs (React
 *  `AnimatePresence` keeps an exiting child in its slot, frozen). */
interface CalloutEntry {
  key: string;
  item: CalloutItem;
  present: boolean;
}

interface CardState {
  el: HTMLElement;
  target: string;
  exiting: boolean;
  animation: FluidAnimation | null;
  timer?: ReturnType<typeof setTimeout>;
}

@Component({
  selector: 'app-sidebar-demo-callout-stack',
  imports: [CARD_PARTS],
  host: { class: 'contents' },
  template: `
    <div #stack class="relative" (mouseenter)="hovered.set(true)" (mouseleave)="hovered.set(false)">
      @for (entry of entries(); track entry.key) {
        <!-- Cards scale from their bottom edge, so each peek stays anchored
             to the pile's floor. -->
        <div
          #card
          class="absolute inset-x-0 bottom-0"
          style="transform-origin: bottom center"
          [attr.data-key]="entry.key"
          [style.z-index]="zIndexOf(entry)"
        >
          @if (variant() === 'inline') {
            <ff-card-group orientation="inline" [fluidHover]="false">
              <ff-card
                size="compact"
                dismissible
                href="sidebar"
                [label]="entry.item.title + ' — ' + entry.item.desc"
                [class]="surface() + ' min-h-0 pl-2.5'"
                (dismiss)="dismiss(entry.key)"
              >
                <!-- Full brand color on the glyph — the tinted tile carries
                     the intensity step, the icon stays at full strength. -->
                <ff-card-media
                  [icon]="entry.item.icon"
                  [size]="18"
                  [class]="tintOf(entry.key) + ' [&_svg]:text-[#6B97FF]'"
                />
                <div ffCardHeader class="gap-[2px] py-3">
                  <span ffCardTitle class="truncate">{{ entry.item.title }}</span>
                  <p ffCardDescription [class]="descriptionClass">{{ entry.item.desc }}</p>
                </div>
              </ff-card>
            </ff-card-group>
          } @else {
            <ff-card
              size="compact"
              dismissible
              href="sidebar"
              [label]="entry.item.title + ' — ' + entry.item.desc"
              [class]="surface() + ' min-h-0'"
              (dismiss)="dismiss(entry.key)"
            >
              <img ffCardImage [src]="meshOf(entry.key)" class="aspect-[2/1] max-h-28" />
              <div ffCardHeader class="gap-0 pt-3">
                <span ffCardTitle class="truncate">{{ entry.item.title }}</span>
                <p ffCardDescription [class]="descriptionClass">{{ entry.item.desc }}</p>
              </div>
            </ff-card>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoCalloutStack {
  readonly variant = input<'inline' | 'banner'>('inline');
  /** The last card was dismissed. (React: `onEmpty`.) */
  readonly empty = output<void>();

  private readonly substrate = injectSurface();
  private readonly shape = injectShape();
  private readonly animate = injectAnimateFluid();
  protected readonly descriptionClass =
    'truncate text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)]';
  protected readonly surface = computed(() => calloutSurface(this.substrate(), this.shape().container));

  private readonly cards = signal<readonly CalloutItem[]>([...CALLOUT_STACK]);
  // Banner cards never fan out — a hover-expanded pile of banners would
  // swallow the whole rail. The inline pile expands under the pointer.
  protected readonly hovered = signal(false);
  private readonly expanded = computed(() => this.variant() === 'inline' && this.hovered());

  // Cards share one anatomy, so the FRONT card's measured height drives the
  // whole pile's geometry — a banner's height follows the rail's width.
  // offsetHeight, never the transformed box.
  private readonly cardH = linkedSignal<number>(() =>
    this.variant() === 'banner' ? CALLOUT_BANNER_H : CALLOUT_INLINE_H,
  );
  private readonly frontId = computed(() => this.cards()[0]?.id);

  /** Removed cards stay rendered in their slot until their exit lands. */
  protected readonly entries = linkedSignal<readonly CalloutItem[], CalloutEntry[]>({
    source: this.cards,
    computation: (next, prev) => {
      const nextKeys = new Set(next.map((card) => card.id));
      const result: CalloutEntry[] = next.map((item) => ({ key: item.id, item, present: true }));
      prev?.value.forEach((entry, index) => {
        if (nextKeys.has(entry.key)) return;
        result.splice(Math.min(index, result.length), 0, { ...entry, present: false });
      });
      return result;
    },
  });
  private readonly indexOf = computed(() => new Map(this.cards().map((card, i) => [card.id, i] as const)));
  /** Each card's last slot: an exiting card keeps it (and its z-index). */
  private readonly lastIndex = new Map<string, number>();

  private readonly stackRef = viewChild.required<ElementRef<HTMLElement>>('stack');
  private readonly cardRefs = viewChildren<ElementRef<HTMLElement>>('card');
  private readonly states = new Map<string, CardState>();

  constructor() {
    this.measureFront();
    this.animateHeight();
    this.animateCards();
    inject(DestroyRef).onDestroy(() => {
      for (const state of this.states.values()) {
        state.animation?.stop();
        clearTimeout(state.timer);
      }
    });
  }

  protected zIndexOf(entry: CalloutEntry) {
    const i = this.indexOf().get(entry.key) ?? this.lastIndex.get(entry.key) ?? 0;
    return 100 - i;
  }

  /** The tint follows the CARD, not the slot — promotion keeps it. */
  protected tintOf(key: string) {
    return CALLOUT_TILE_TINTS[this.stepOf(key)] ?? CALLOUT_TILE_TINTS[2];
  }

  protected meshOf(key: string) {
    return meshAt(MESH_BANNER, CALLOUT_MESH_STEPS[this.stepOf(key)] ?? 0.4);
  }

  private stepOf(key: string) {
    return CALLOUT_STACK.findIndex((card) => card.id === key);
  }

  protected dismiss(id: string) {
    const next = this.cards().filter((card) => card.id !== id);
    this.cards.set(next);
    if (next.length === 0) this.empty.emit();
  }

  /** The front card's height, followed with a ResizeObserver. */
  private measureFront() {
    afterRenderEffect((onCleanup) => {
      const id = this.frontId();
      const el = this.cardRefs()
        .map((ref) => ref.nativeElement)
        .find((node) => node.getAttribute('data-key') === id);
      if (!el || typeof ResizeObserver === 'undefined') return;
      untracked(() => {
        const measure = () => {
          if (el.offsetHeight) this.cardH.set(el.offsetHeight);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        onCleanup(() => ro.disconnect());
      });
    });
  }

  /** The container springs to a measured height (never "auto"): collapsed,
   *  the front card plus its visible peeks; expanded, every card and gap. */
  private animateHeight() {
    let current: number | null = null;
    afterRenderEffect(() => {
      const el = this.stackRef().nativeElement;
      const count = this.cards().length;
      const cardH = this.cardH();
      const target = this.expanded()
        ? count * cardH + Math.max(count - 1, 0) * CALLOUT_GAP
        : cardH + Math.min(Math.max(count - 1, 0), CALLOUT_MAX_PEEK) * CALLOUT_PEEK;
      untracked(() => {
        if (current === null) setInstant(el, { height: target }, this.animate);
        else if (target !== current) {
          this.animate(el, { height: target }, { ...enterTransition(spring.moderate), bounce: 0 });
        }
        current = target;
      });
    });
  }

  private cardTarget(i: number, cardH: number, expanded: boolean): CardFrames {
    const peek = Math.min(i, CALLOUT_MAX_PEEK);
    return expanded
      ? { y: -i * (cardH + CALLOUT_GAP), scale: 1, opacity: 1 }
      : { y: -peek * CALLOUT_PEEK, scale: 1 - peek * CALLOUT_SCALE, opacity: i <= CALLOUT_MAX_PEEK ? 1 : 0 };
  }

  /** Each card springs to its slot (peek or fanned out); a dismissed one fades
   *  and shrinks before it goes. Cards present at mount appear in place
   *  (`initial={false}`). */
  private animateCards() {
    let mounted = false;
    afterRenderEffect(() => {
      const els = this.cardRefs().map((ref) => ref.nativeElement);
      const entries = this.entries();
      const index = this.indexOf();
      const expanded = this.expanded();
      const cardH = this.cardH();
      untracked(() => {
        const atMount = !mounted;
        mounted = true;
        const byKey = new Map(els.map((el) => [el.getAttribute('data-key')!, el] as const));
        for (const entry of entries) {
          const el = byKey.get(entry.key);
          if (!el) continue;
          let state = this.states.get(entry.key);
          if (state && state.el !== el) {
            state.animation?.stop();
            state = undefined;
          }
          if (!entry.present) {
            if (state && !state.exiting) this.exitCard(entry.key, state);
            continue;
          }
          const i = index.get(entry.key);
          if (i === undefined) continue;
          this.lastIndex.set(entry.key, i);
          const target = this.cardTarget(i, cardH, expanded);
          const targetKey = `${target.y}|${target.scale}|${target.opacity}`;
          if (!state) {
            state = { el, target: targetKey, exiting: false, animation: null };
            this.states.set(entry.key, state);
            if (atMount) {
              setInstant(el, target, this.animate);
              continue;
            }
            setInstant(el, { opacity: 0, y: 14, scale: 0.96 }, this.animate);
            state.animation = this.animate(el, { ...target }, enterTransition(spring.moderate));
            continue;
          }
          if (state.exiting || state.target === targetKey) continue;
          state.target = targetKey;
          state.animation = this.animate(el, { ...target }, enterTransition(spring.moderate));
        }
      });
    });
  }

  private exitCard(key: string, state: CardState) {
    state.exiting = true;
    const animation = this.animate(state.el, CARD_EXIT, CARD_EXIT_TRANSITION);
    state.animation = animation;
    const done = () => state.animation === animation && this.dropCard(key);
    animation.finished.then(done, done);
    state.timer = setTimeout(() => this.states.get(key) === state && this.dropCard(key), CARD_EXIT_FALLBACK_MS);
  }

  private dropCard(key: string) {
    const state = this.states.get(key);
    if (state) clearTimeout(state.timer);
    this.states.delete(key);
    this.lastIndex.delete(key);
    this.entries.update((list) => list.filter((entry) => entry.present || entry.key !== key));
  }
}

/** React `StackedCalloutPreview`: the footer pile as its own subject — hover
 *  fans the inline pile out, dismissing the front card promotes the next, and
 *  each card keeps its own step of the brand-blue ladder. Emptying the pile
 *  brings it back a beat later so the demo stays stocked. */
@Component({
  selector: 'app-sidebar-demo-callouts',
  imports: [
    SidebarDemoRailShell,
    SidebarDemoHeader,
    SidebarDemoFooterUser,
    SidebarDemoCalloutStack,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
  ],
  host: { style: 'display: contents' },
  template: `
    <app-sidebar-rail-shell heightClass="aspect-square">
      <app-sidebar-demo-header />
      <ff-sidebar-content>
        <ff-sidebar-group>
          <ff-sidebar-group-label>Threads</ff-sidebar-group-label>
          <ul ffSidebarMenu>
            @for (thread of threads; track thread.label) {
              <li ffSidebarMenuItem>
                <button ffSidebarMenuButton [status]="thread.status">{{ thread.label }}</button>
                <div ffSidebarMenuBadge>{{ thread.badge }}</div>
              </li>
            }
          </ul>
        </ff-sidebar-group>
      </ff-sidebar-content>
      <div ffSidebarFooter>
        @if (!hidden()) {
          <app-sidebar-demo-callout-stack [variant]="variant()" (empty)="onEmpty()" />
        }
        <app-sidebar-demo-footer-user />
      </div>
    </app-sidebar-rail-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoCallouts {
  readonly variant = input<'inline' | 'banner'>('inline');
  protected readonly threads = AI_THREADS.slice(0, 3);
  /** An emptied pile unmounts, then comes back fully stocked (a fresh stack,
   *  like React's `key` bump). */
  protected readonly hidden = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected onEmpty() {
    this.hidden.set(true);
    this.timer = setTimeout(() => this.hidden.set(false), 1600);
  }
}
