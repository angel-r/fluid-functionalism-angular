import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
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
import {
  Button,
  CARD_PARTS,
  type FluidAnimation,
  Icon,
  type IconName,
  MenuItem,
  SettingsDialog,
  Sidebar,
  SidebarBlockMenu,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSearchField,
  SidebarWorkspaceHeader,
  Tooltip,
  WorkspaceTile,
  enterTransition,
  fontWeights,
  injectAnimateFluid,
  injectShape,
  injectSurface,
  spring,
  surfaceClasses,
  surfaceHoverClasses,
} from '@angel-r/fluid-functionalism-angular';
import { SidebarDemoFooterUser, SidebarDemoHeader, SidebarDemoTopbar } from './sidebar-demo-parts';
import { AI_THREADS, AI_WORKSPACE } from './sidebar-demo-data';

// ---------------------------------------------------------------------------
// The Header & footer, Callouts and Inside a dialog sections of the React
// docs page (app/docs/sidebar/page.tsx), with the footer callout stack of
// lib/docs/playgrounds/sidebar.tsx.
// ---------------------------------------------------------------------------

/** The rail-only shell's square frame (React `SidebarShellFrame` with
 *  `heightClass="aspect-square"`). */
const FRAME = 'relative flex w-full overflow-hidden bg-background aspect-square';
/** The provider's default rail width (React passes `width={undefined}`). */
const RAIL_WIDTH = '16rem';

/** The callout's copy (app/docs/sidebar/example-data.ts `AI_CALLOUT`). */
const AI_CALLOUT = {
  title: 'Aurora 2 is here',
  media: 'Longer context, faster agents',
  icon: 'See what changed',
} as const;

const SEARCH_SHORTCUT = '⌘K';

// Clarity-blue mesh banner, the same art the React docs use (CARD_BANNER).
const BANNER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Cdefs%3E%3CradialGradient id='a' cx='12%25' cy='16%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.9'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='90%25' cy='12%25' r='65%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.45'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='82%25' cy='94%25' r='75%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.8'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='d' cx='24%25' cy='90%25' r='68%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.55'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='320' height='180' fill='%23ffffff'/%3E%3Crect width='320' height='180' fill='%236B97FF' fill-opacity='0.2'/%3E%3Crect width='320' height='180' fill='url(%23a)'/%3E%3Crect width='320' height='180' fill='url(%23b)'/%3E%3Crect width='320' height='180' fill='url(%23c)'/%3E%3Crect width='320' height='180' fill='url(%23d)'/%3E%3C/svg%3E";

/** React `useNarrowFrame`: true below 768px, where the rail-only shells drop
 *  the mock main region and the rail takes the whole frame. Starts false and
 *  follows the media query, like React's effect. Injection context only. */
function injectNarrowFrame() {
  const narrow = signal(false);
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = () => narrow.set(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => mql.removeEventListener('change', onChange));
  }
  return narrow.asReadonly();
}

/** The callout card's surface: one step above the rail, rising another under
 *  the pointer, so the card itself answers the hover. */
function calloutSurface(substrate: number, container: string) {
  const level = Math.min(substrate + 1, 8);
  return `${container} overflow-hidden transition-[background-color,box-shadow] duration-80 ${surfaceClasses(
    level,
    2,
  )} ${surfaceHoverClasses(level + 1, 3)} shadow-[var(--shadow-2-inset)] hover:shadow-[var(--shadow-3-inset)]`;
}

// ---------------------------------------------------------------------------
// Local twin of the parts file's workspace-switcher tiles (not exported
// there): letter tiles in grey shades as the switcher rows' icons.
// ---------------------------------------------------------------------------

@Directive()
abstract class DemoLetterTile {
  readonly size = input(16);
  readonly strokeWidth = input(1.5);
  readonly userClass = input('', { alias: 'class' });
  protected abstract readonly letter: string;
  protected abstract readonly colors: string;
  private readonly shape = injectShape();
  protected readonly semibold = fontWeights.semibold;
  protected readonly tileClass = computed(
    () =>
      `absolute top-1/2 left-1/2 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-[10px] ${
        this.shape().bgRadius >= 20 ? 'rounded-full' : 'rounded-md'
      } ${this.colors}`,
  );
}

const LETTER_TILE_TEMPLATE = `
  <span [class]="'relative flex shrink-0 ' + userClass()" [style.width.px]="size()" [style.height.px]="size()">
    <span [class]="tileClass()" [style.font-variation-settings]="semibold">{{ letter }}</span>
  </span>
`;

@Component({ selector: 'app-demo-x-tile-acme', template: LETTER_TILE_TEMPLATE, host: { style: 'display: contents' } })
class AcmeTile extends DemoLetterTile {
  protected readonly letter = 'A';
  protected readonly colors = 'bg-foreground text-background';
}

@Component({ selector: 'app-demo-x-tile-fluid', template: LETTER_TILE_TEMPLATE, host: { style: 'display: contents' } })
class FluidTile extends DemoLetterTile {
  protected readonly letter = 'F';
  protected readonly colors = 'bg-muted-foreground text-background';
}

@Component({ selector: 'app-demo-x-tile-personal', template: LETTER_TILE_TEMPLATE, host: { style: 'display: contents' } })
class PersonalTile extends DemoLetterTile {
  protected readonly letter = 'P';
  protected readonly colors = 'bg-muted-foreground/60 text-background';
}

/** React `DemoHeaderRow`: the header's brand row alone — the
 *  sidebar-workspace-header block with the shared switcher menu. */
@Component({
  selector: 'app-sidebar-demo-header-row',
  imports: [SidebarWorkspaceHeader, WorkspaceTile, SidebarBlockMenu, MenuItem],
  host: { class: 'contents' },
  template: `
    <ff-sidebar-workspace-header [name]="workspace" [checkedIndex]="0">
      <span ffWorkspaceTile>A</span>
      <ng-template ffSidebarBlockMenu>
        <ff-menu-item [index]="0" [icon]="tiles.acme" label="Acme Inc" [checked]="true" />
        <ff-menu-item [index]="1" [icon]="tiles.fluid" label="Fluid Labs" />
        <ff-menu-item [index]="2" [icon]="tiles.personal" label="Personal" />
        <ff-menu-item [index]="3" icon="plus" label="New workspace" />
      </ng-template>
    </ff-sidebar-workspace-header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SidebarDemoHeaderRow {
  protected readonly workspace = AI_WORKSPACE;
  protected readonly tiles = { acme: AcmeTile, fluid: FluidTile, personal: PersonalTile };
}

/** React `DemoCallout`: the anchored callout — a Card on a surface one step
 *  above the rail. Dismiss really removes the card; it comes back a beat
 *  later so the section keeps its subject. */
@Component({
  selector: 'app-sidebar-demo-callout',
  imports: [CARD_PARTS],
  host: { class: 'contents' },
  template: `
    @if (!dismissed()) {
      @if (variant() === 'inline') {
        <ff-card-group orientation="inline" [fluidHover]="false">
          <ff-card size="compact" dismissible [href]="href" [label]="label" [class]="cardClass()" (dismiss)="dismiss()">
            <ff-card-media icon="brain" [size]="18" />
            <!-- The dismiss clearance is hover-only (Card pads the header
                 while the ✕ is revealed), so the resting title keeps the
                 full row. -->
            <div ffCardHeader class="gap-[2px] py-3">
              <span ffCardTitle class="truncate">{{ callout.title }}</span>
              <p ffCardDescription [class]="descriptionClass">{{ callout.icon }}</p>
            </div>
          </ff-card>
        </ff-card-group>
      } @else {
        <ff-card size="compact" dismissible [href]="href" [label]="label" [class]="cardClass()" (dismiss)="dismiss()">
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
class SidebarDemoCallout {
  readonly variant = input<'inline' | 'banner'>('inline');
  private readonly substrate = injectSurface();
  private readonly shape = injectShape();
  protected readonly callout = AI_CALLOUT;
  protected readonly banner = BANNER;
  /** React links the card to its own docs page; here, this showcase page. */
  protected readonly href = 'sidebar';
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
// Stacked footer callouts (React `FooterCalloutStack`): a Sonner-style pile on
// the queued-message stack's geometry — cards peek out 12px apiece behind the
// front one, scaling down a step each, capped at two visible peeks. Only the
// INLINE pile fans out on hover (banner cards are too tall to fan inside a
// footer); either way, dismissing the front card reveals and promotes the one
// below. Each card keeps its own step of the brand-blue ladder. The container
// is IN FLOW — the footer sits at the column's bottom.
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

type CardFrames = { y: number; scale: number; opacity: number };

/** Writes frames onto an element motion has not animated yet, so it paints
 *  at them on its first frame (motion's own instant path lands a frame
 *  later), and seeds motion's value store with the same values. */
function setInstant(el: HTMLElement, frames: Partial<CardFrames> & { height?: number }, animate: AnimateFn) {
  const transform: string[] = [];
  if (frames.y) transform.push(`translateY(${frames.y}px)`);
  if (frames.scale !== undefined && frames.scale !== 1) transform.push(`scale(${frames.scale})`);
  if (frames.y !== undefined || frames.scale !== undefined) el.style.transform = transform.join(' ') || 'none';
  if (frames.opacity !== undefined) el.style.opacity = String(frames.opacity);
  if (frames.height !== undefined) el.style.height = `${frames.height}px`;
  animate(el, frames, { duration: 0 });
}

type AnimateFn = ReturnType<typeof injectAnimateFluid>;

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
                [href]="href"
                [label]="entry.item.title + ' — ' + entry.item.desc"
                [class]="surface() + ' min-h-0 pl-2.5'"
                (dismiss)="dismiss(entry.key)"
              >
                <!-- Full brand color on the glyph — the tinted tile carries the
                     intensity step, the icon stays at full strength. -->
                <ff-card-media [icon]="entry.item.icon" [size]="18" [class]="tintOf(entry.key) + ' [&_svg]:text-[#6B97FF]'" />
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
              [href]="href"
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
class SidebarDemoCalloutStack {
  readonly variant = input<'inline' | 'banner'>('inline');
  /** The last card was dismissed. (React: `onEmpty`.) */
  readonly empty = output<void>();

  private readonly substrate = injectSurface();
  private readonly shape = injectShape();
  private readonly animate = injectAnimateFluid();
  protected readonly href = 'sidebar';
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
      const nextKeys = new Set(next.map((c) => c.id));
      const result: CalloutEntry[] = next.map((item) => ({ key: item.id, item, present: true }));
      prev?.value.forEach((entry, index) => {
        if (nextKeys.has(entry.key)) return;
        result.splice(Math.min(index, result.length), 0, { ...entry, present: false });
      });
      return result;
    },
  });
  private readonly indexOf = computed(() => new Map(this.cards().map((c, i) => [c.id, i] as const)));
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
    return meshAt(BANNER, CALLOUT_MESH_STEPS[this.stepOf(key)] ?? 0.4);
  }

  private stepOf(key: string) {
    return CALLOUT_STACK.findIndex((c) => c.id === key);
  }

  protected dismiss(id: string) {
    const next = this.cards().filter((c) => c.id !== id);
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
      const n = this.cards().length;
      const cardH = this.cardH();
      const target = this.expanded()
        ? n * cardH + Math.max(n - 1, 0) * CALLOUT_GAP
        : cardH + Math.min(Math.max(n - 1, 0), CALLOUT_MAX_PEEK) * CALLOUT_PEEK;
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

  /** Each card springs to its slot (peek or fanned out); a dismissed one
   *  fades and shrinks before it goes. Cards present at mount appear in
   *  place (`initial={false}`). */
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
    this.entries.update((list) => list.filter((e) => e.present || e.key !== key));
  }
}

// ---------------------------------------------------------------------------
// Section previews
// ---------------------------------------------------------------------------

/** React `HeaderFooterPreview`: the two ends of the rail, stacked vertically
 *  — every element on its own full-width row — against the horizontal
 *  packing that collapses the same pieces into icon buttons. */
@Component({
  selector: 'app-sidebar-demo-header-footer',
  imports: [
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarInset,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarSearchField,
    Button,
    Tooltip,
    Icon,
    SidebarDemoHeaderRow,
    SidebarDemoCallout,
    SidebarDemoFooterUser,
    SidebarDemoTopbar,
  ],
  // Transparent host: the frame is the stage's flex item, like React's.
  host: { style: 'display: contents' },
  template: `
    <!-- Tooltip content with the action's keystroke: the label re-applies the
         surface's text-box trim (a flex row escapes it) and the chip pulls its
         box back with -my-1, so the tooltip keeps its single-line height. -->
    <ng-template #searchTip>
      <span class="flex items-center gap-2">
        <span class="[text-box:trim-both_cap_alphabetic]">Search</span>
        <kbd [class]="tipKbd">{{ searchShortcut }}</kbd>
      </span>
    </ng-template>
    <ng-template #newThreadTip>
      <span class="flex items-center gap-2">
        <span class="[text-box:trim-both_cap_alphabetic]">New thread</span>
        <kbd [class]="tipKbd">⇧⌘O</kbd>
      </span>
    </ng-template>

    <div [class]="frame">
      <ff-sidebar-provider
        class="h-full min-h-0"
        [persist]="false"
        [mobileBreakpoint]="0"
        [width]="narrow() ? '100%' : railWidth"
      >
        <ff-sidebar collapsible="none" class="h-full">
          <div ffSidebarHeader>
            @if (vertical()) {
              <app-sidebar-demo-header-row />
              <!-- Search and the action rows are ONE block: the header's gap-2
                   separates it from the brand row, while inside it the search
                   field reads as the list's first row (menu row rhythm). -->
              <div class="flex flex-col">
                <ff-sidebar-search-field />
                <ul ffSidebarMenu aria-label="Header actions">
                  <li ffSidebarMenuItem>
                    <button ffSidebarMenuButton icon="plus">
                      New thread
                      <!-- Shortcut chip, revealed on row hover — a labeled row
                           wants no tooltip. -->
                      <span
                        class="ml-auto inline-flex opacity-0 transition-opacity duration-80 group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100"
                      >
                        <kbd class="font-sans text-[11px] leading-3.5 text-muted-foreground">⇧⌘O</kbd>
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            } @else {
              <div class="flex items-center gap-1 pr-1.5">
                <div class="min-w-0 flex-1">
                  <app-sidebar-demo-header-row />
                </div>
                <ff-tooltip [content]="searchTip" side="bottom">
                  <button ffButton variant="ghost" size="icon-compact" aria-label="Search" class="size-6 shrink-0">
                    <ff-icon name="search" />
                  </button>
                </ff-tooltip>
                <ff-tooltip [content]="newThreadTip" side="bottom">
                  <button ffButton variant="ghost" size="icon-compact" aria-label="New thread" class="size-6 shrink-0">
                    <ff-icon name="plus" />
                  </button>
                </ff-tooltip>
              </div>
            }
          </div>

          <ff-sidebar-content>
            <ff-sidebar-group>
              <ff-sidebar-group-label>Threads</ff-sidebar-group-label>
              <ul ffSidebarMenu>
                @for (thread of threads; track thread.label) {
                  <li ffSidebarMenuItem>
                    <button ffSidebarMenuButton [status]="thread.status">{{ thread.label }}</button>
                  </li>
                }
              </ul>
            </ff-sidebar-group>
          </ff-sidebar-content>

          <div ffSidebarFooter>
            @if (!vertical()) {
              <app-sidebar-demo-callout variant="inline" />
            }
            @if (vertical()) {
              <!-- Actions stack above the user row, so identity stays anchored
                   to the sidebar's outer edge — mirroring the brand row up top. -->
              <ul ffSidebarMenu aria-label="Footer actions">
                <li ffSidebarMenuItem>
                  <button ffSidebarMenuButton icon="settings">Settings</button>
                </li>
                <li ffSidebarMenuItem>
                  <button ffSidebarMenuButton icon="lightbulb">What's new</button>
                </li>
              </ul>
              <app-sidebar-demo-footer-user />
            } @else {
              <div class="flex items-center gap-1 pr-1.5">
                <div class="min-w-0 flex-1">
                  <app-sidebar-demo-footer-user />
                </div>
                <button ffButton variant="ghost" size="icon-compact" aria-label="Settings" class="size-6 shrink-0">
                  <ff-icon name="settings" />
                </button>
              </div>
            }
          </div>
        </ff-sidebar>
        @if (!narrow()) {
          <main ffSidebarInset class="min-h-0"><app-sidebar-demo-topbar /></main>
        }
      </ff-sidebar-provider>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoHeaderFooter {
  readonly stack = input<'vertical' | 'horizontal'>('vertical');
  protected readonly vertical = computed(() => this.stack() === 'vertical');
  protected readonly narrow = injectNarrowFrame();
  protected readonly frame = FRAME;
  protected readonly railWidth = RAIL_WIDTH;
  protected readonly threads = AI_THREADS.slice(0, 3);
  protected readonly searchShortcut = SEARCH_SHORTCUT;
  protected readonly tipKbd =
    '-my-1 flex h-4 min-w-4 items-center justify-center rounded border border-background/30 px-1 font-sans text-[10px] text-background';
}

/** React `StackedCalloutPreview`: the footer pile as its own subject — hover
 *  fans the inline pile out, dismissing the front card promotes the next, and
 *  each card keeps its own step of the brand-blue ladder. Emptying the pile
 *  brings it back a beat later so the demo stays stocked. */
@Component({
  selector: 'app-sidebar-demo-callouts',
  imports: [
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarInset,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuBadge,
    SidebarDemoHeader,
    SidebarDemoCalloutStack,
    SidebarDemoFooterUser,
    SidebarDemoTopbar,
  ],
  // Transparent host: the frame is the stage's flex item, like React's.
  host: { style: 'display: contents' },
  template: `
    <div [class]="frame">
      <ff-sidebar-provider
        class="h-full min-h-0"
        [persist]="false"
        [mobileBreakpoint]="0"
        [width]="narrow() ? '100%' : railWidth"
      >
        <ff-sidebar collapsible="none" class="h-full">
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
        </ff-sidebar>
        @if (!narrow()) {
          <main ffSidebarInset class="min-h-0"><app-sidebar-demo-topbar /></main>
        }
      </ff-sidebar-provider>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoCallouts {
  readonly variant = input<'inline' | 'banner'>('inline');
  protected readonly narrow = injectNarrowFrame();
  protected readonly frame = FRAME;
  protected readonly railWidth = RAIL_WIDTH;
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

/** React `SettingsDialogDemo`: the dialog-sidebar block behind a button. */
@Component({
  selector: 'app-sidebar-demo-settings-dialog',
  imports: [Button, SettingsDialog],
  host: { style: 'display: contents' },
  template: `
    <button ffButton variant="secondary" (click)="open.set(true)">Open settings</button>
    <ff-settings-dialog [open]="open()" (openChange)="open.set($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoSettingsDialog {
  protected readonly open = signal(false);
}
