import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  type Signal,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { type AnimationOptions } from 'motion';
import { spring } from '../../core/springs';
import { fontWeights } from '../../core/font-weight';
import { Icon } from '../../core/icon';
import { injectShape, nestedRadius } from '../../core/shape';
import { injectSizeVariant } from '../../core/size';
import { typeClass } from '../../core/type-scale';
import { type FluidAnimation, enterTransition, exitTransition, injectAnimateFluid } from '../../core/motion';
import { FileThumbnail } from '../../file-thumbnail/file-thumbnail';
import { Tooltip } from '../../tooltip/tooltip';
import { type QueuedMessage } from '../../input-message/input-message.types';
import { type PresenceEntry, createPresenceList } from '../../input-message/presence';
import { QueuedStackMorphRegistry, setInstant } from './queued-stack-morph';

// ---------------------------------------------------------------------------
// Sonner-style queued-message stack, for an InputMessage that runs with
// `[showQueue]="false"`. Collapsed cards fan out on hover (tap on touch), drag
// reorders while expanded, a gutter arrow surfaces the total count once cards
// overflow the visible peeks, × removes and ✎/double-click edits a card back
// into the composer.
// ---------------------------------------------------------------------------

// Card height per ladder step — the compact step drops the card with it.
export const QUEUE_CARD_H = 44;
export const QUEUE_CARD_H_COMPACT = 38;
const STACK_PEEK = 12;
const STACK_SCALE = 0.05;
const STACK_GAP = 8;
const STACK_MAX_PEEK = 2;
/** Pointer travel (px) before a press on an expanded card becomes a drag. */
const DRAG_THRESHOLD = 4;
/** The enqueue recoil keeps the React source's own spring (a quick settle
 *  with bounce, no tier matches it). */
const STACK_BUMP: AnimationOptions = { type: 'spring', duration: 0.42, bounce: 0.5 };
const STACK_BUMP_Y = -7;
const STACK_TRANSITION: AnimationOptions = { ...enterTransition(spring.moderate), bounce: 0 };
/** Safety nets: unmount even if a throttled tab stalls the exit. */
const STACK_EXIT_FALLBACK_MS = Math.round(spring.moderate.duration * 1000) + 300;
const CARD_EXIT_FALLBACK_MS = Math.round(spring.moderate.exit.duration * 1000) + 100;
const COUNT_EXIT_FALLBACK_MS = Math.round(spring.fast.duration * 1000) + 100;

const CARD_ENTER = { opacity: 0, y: 14, scale: 0.96 };
const CARD_EXIT = { opacity: 0, scale: 0.9 };
const COUNT_HIDDEN = { opacity: 0, scale: 0.6 };
const COUNT_SHOWN = { opacity: 1, scale: 1 };

/** Height of the collapsed pile — consumers reserve transcript padding with it. */
export function collapsedStackHeight(count: number, cardH: number) {
  return cardH + Math.min(Math.max(count - 1, 0), STACK_MAX_PEEK) * STACK_PEEK;
}

/** The stack's card height at the current size step (React `useQueueCardHeight`).
 *  Injection context only. */
export function injectQueueCardHeight(): Signal<number> {
  const variant = injectSizeVariant();
  return computed(() => (variant() === 'compact' ? QUEUE_CARD_H_COMPACT : QUEUE_CARD_H));
}

interface CardTarget {
  y: number;
  scale: number;
  opacity: number;
}

interface CardState {
  el: HTMLElement;
  target: string;
  exiting: boolean;
  animation: FluidAnimation | null;
  timer?: ReturnType<typeof setTimeout>;
}

/**
 * The queued messages of an InputMessage as a Sonner-style stack overlaying
 * the composer (front card = next to dispatch). Place it inside the
 * `position: relative` box that holds the composer, with `bottom` set to the
 * composer height + 8:
 *
 *   <ff-queued-stack [(queue)]="queue" [bottom]="inputH + 8"
 *     [morphLayoutId]="morphId" (edit)="edit($event)" (remove)="remove($event)" />
 *   <ff-input-message [(queue)]="queue" [status]="status" [showQueue]="false" … />
 *
 * Dragging a card while expanded writes the reordered queue (`[(queue)]`).
 * With `morphLayoutId`, a text-only card dispatched while no drag is in
 * progress can morph into the sent bubble marked `[ffQueuedStackMorph]`.
 */
@Component({
  selector: 'ff-queued-stack',
  imports: [Icon, Tooltip, FileThumbnail],
  host: { style: 'display: contents' },
  template: `
    @if (mounted()) {
      <div
        #stack
        data-slot="queued-stack"
        class="absolute inset-x-0 z-10"
        [style.bottom.px]="bottom()"
        [attr.data-expanded]="expanded() ? '' : null"
        (mouseenter)="hovered.set(true)"
        (mouseleave)="hovered.set(false)"
      >
        <!-- Recoils as a whole on enqueue so a message landing behind the
             peek cap is still felt. -->
        <div #layer data-slot="queued-stack-layer" class="absolute inset-0">
          @if (isTouch() && expanded()) {
            <!-- Touch: the stack stays pinned open, so it needs an explicit
                 way back in the gutter slot the arrow + count occupied. -->
            <ff-tooltip content="Collapse" side="left">
              <button
                type="button"
                aria-label="Collapse queued messages"
                [class]="collapseClass()"
                [style.height.px]="cardH()"
                [style.width.px]="40"
                (pointerdown)="$event.stopPropagation()"
                (click)="collapse($event)"
              >
                <ff-icon name="chevron-down" [size]="18" [strokeWidth]="2" />
              </button>
            </ff-tooltip>
          } @else {
            <ff-tooltip [content]="countLabel()" side="left">
              <div
                class="absolute bottom-0 left-0 flex items-center justify-end gap-1 pr-1 text-muted-foreground"
                [style.height.px]="cardH()"
                [style.width.px]="40"
              >
                <!-- Total queued count, to the LEFT of the arrow, once the
                     stack overflows its visible peeks. -->
                @if (countMounted()) {
                  <span
                    #countBadge
                    data-slot="queued-stack-count"
                    class="pointer-events-none text-[length:var(--fs-micro-compact,10px)] leading-none tabular-nums text-muted-foreground"
                    [style.font-variation-settings]="semibold"
                  >{{ count() }}</span>
                }
                <ff-icon name="corner-down-right" [size]="16" [strokeWidth]="2" />
              </div>
            </ff-tooltip>
          }
          @for (entry of entries(); track entry.key) {
            <div
              #card
              data-slot="queued-stack-card"
              [attr.data-key]="entry.key"
              [attr.data-dragging]="draggingId() === entry.key ? '' : null"
              [class]="cardClass(entry.item)"
              [style.height.px]="cardH()"
              [style.z-index]="zIndexOf(entry)"
              [style.cursor]="expanded() ? 'grab' : 'default'"
              [style.touch-action]="expanded() ? 'none' : null"
              (dblclick)="edit.emit(entry.item)"
              (click)="onCardClick()"
              (pointerdown)="onCardPointerDown($event, entry.key)"
            >
              @if (entry.item.files.length > 0) {
                <div class="pointer-events-none flex shrink-0 items-center gap-1">
                  @for (file of entry.item.files.slice(0, 3); track $index) {
                    <ff-file-thumbnail [file]="file" [size]="compact() ? 24 : 28" [radius]="attachmentRadius()" />
                  }
                  @if (entry.item.files.length > 3) {
                    <span [class]="moreClass()" [style.border-radius.px]="attachmentRadius()"
                      >+{{ entry.item.files.length - 3 }}</span
                    >
                  }
                </div>
              }
              <span class="pointer-events-none min-w-0 flex-1 truncate">{{ cardLabel(entry.item) }}</span>
              <!-- Edit (same as double-click) then remove. Hover-capable
                   devices hide the group until the card is hovered; touch
                   always shows it. -->
              <div [class]="actionsClass()">
                <ff-tooltip content="Edit" side="top">
                  <button
                    type="button"
                    [attr.aria-label]="'Edit queued message: ' + entry.item.text"
                    [class]="actionClass()"
                    (pointerdown)="$event.stopPropagation()"
                    (click)="onEdit($event, entry.item)"
                  >
                    <ff-icon name="pencil" [size]="14" [strokeWidth]="2" />
                  </button>
                </ff-tooltip>
                <ff-tooltip content="Remove" side="top">
                  <button
                    type="button"
                    [attr.aria-label]="'Remove queued message: ' + entry.item.text"
                    [class]="actionClass()"
                    (pointerdown)="$event.stopPropagation()"
                    (click)="onRemove($event, entry.item)"
                  >
                    <ff-icon name="x" [size]="14" [strokeWidth]="2.5" />
                  </button>
                </ff-tooltip>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueuedStack {
  /** The queued messages, front (next to dispatch) first. Two-way
   *  (`[(queue)]`): dragging a card between slots writes the reordered queue. */
  readonly queue = model.required<QueuedMessage[]>();
  /** Distance from the container's bottom edge (usually composer height + 8). */
  readonly bottom = input(0);
  /** Shared-layout id per card so a dispatching card can morph into its sent
   *  bubble (`[ffQueuedStackMorph]`). Only text-only cards dispatched while no
   *  drag is in progress morph. */
  readonly morphLayoutId = input<((item: QueuedMessage) => string) | undefined>(undefined);
  /** Pull a card back into the composer (✎ button / double-click). */
  readonly edit = output<QueuedMessage>();
  /** Remove a card (× button). The consumer drops it from the queue. */
  readonly remove = output<QueuedMessage>();

  private readonly document = inject(DOCUMENT);
  private readonly morph = inject(QueuedStackMorphRegistry);
  private readonly animateFluid = injectAnimateFluid();
  protected readonly shape = injectShape();
  protected readonly compact = computed(() => this.variant() === 'compact');
  private readonly variant = injectSizeVariant();
  protected readonly cardH = injectQueueCardHeight();
  protected readonly semibold = fontWeights.semibold;
  // Default cards leave 8px around a 28px preview; compact leaves ~7px around
  // 24px inside 38px. The first preview reaches the card's leading corner, so
  // its curve follows the outer card concentrically.
  protected readonly attachmentRadius = computed(() => nestedRadius(this.shape().bgRadius, this.compact() ? 7 : 8));

  private readonly stackRef = viewChild<ElementRef<HTMLElement>>('stack');
  private readonly layerRef = viewChild<ElementRef<HTMLElement>>('layer');
  private readonly countRef = viewChild<ElementRef<HTMLElement>>('countBadge');
  private readonly cardRefs = viewChildren<ElementRef<HTMLElement>>('card');

  // ── Stack geometry.
  protected readonly count = computed(() => this.queue().length);
  private readonly open = computed(() => this.count() > 0);
  /** Collapsed, only the front card + STACK_MAX_PEEK peeks show; deeper ones
   *  surface as a count on the gutter arrow. */
  private readonly hiddenCount = computed(() => Math.max(0, this.count() - (STACK_MAX_PEEK + 1)));
  protected readonly countLabel = computed(() => `${this.count()} queued message${this.count() === 1 ? '' : 's'}`);

  // ── Interaction state.
  protected readonly hovered = signal(false);
  private readonly pointerDownId = signal<string | null>(null);
  protected readonly draggingId = signal<string | null>(null);
  private readonly dragY = signal(0);
  private dragStartY = 0;
  private endDrag: (() => void) | null = null;

  /** `(hover: none)`: no hover to fan the stack out, so a tap expands it. */
  protected readonly isTouch = signal(false);
  /** Touch tap-to-expand, pinned until the collapse button. Reset whenever the
   *  queue empties, so a fresh fill starts collapsed. */
  private readonly tapExpanded = linkedSignal({ source: () => this.count() === 0, computation: () => false });

  protected readonly expanded = computed(
    () => this.hovered() || this.pointerDownId() !== null || this.draggingId() !== null || this.tapExpanded(),
  );

  // ── Presence (React AnimatePresence) for the stack, its cards and the count.
  private readonly stackExiting = linkedSignal<boolean, boolean>({
    source: this.open,
    computation: (isOpen, prev) => (prev === undefined ? false : !isOpen),
  });
  // The exiting flags are read on every pass, even while shown: a linkedSignal
  // first read at the close has no previous value and would skip the exit.
  protected readonly mounted = computed(() => {
    const exiting = this.stackExiting();
    return this.open() || exiting;
  });
  private readonly countExiting = linkedSignal<boolean, boolean>({
    source: () => this.hiddenCount() > 0,
    computation: (shown, prev) => (prev === undefined ? false : !shown),
  });
  protected readonly countMounted = computed(() => {
    const exiting = this.countExiting();
    return this.hiddenCount() > 0 || exiting;
  });
  // `holdOnEmpty`: an emptied stack fades out with its last cards in place.
  private readonly presence = createPresenceList(() => this.queue(), (item) => item.id, true);
  protected readonly entries = this.presence.entries;
  private readonly indexOf = computed(() => new Map(this.queue().map((item, i) => [item.id, i] as const)));

  private readonly cards = new Map<string, CardState>();
  private readonly lastIndex = new Map<string, number>();
  private readonly claimed = new Set<string>();

  protected readonly collapseClass = computed(
    () =>
      `absolute bottom-0 left-0 flex items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] ${this.shape().button}`,
  );
  protected readonly actionsClass = computed(
    () => `shrink-0 items-center gap-1 ${this.isTouch() ? 'flex' : 'hidden group-hover/qm:flex'}`,
  );
  protected readonly actionClass = computed(
    () =>
      `flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center ${this.shape().button} text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]`,
  );
  protected readonly moreClass = computed(
    () =>
      `flex ${this.compact() ? 'h-6 w-6' : 'h-7 w-7'} items-center justify-center bg-background/40 text-[length:var(--fs-micro,11px)] leading-[var(--lh-micro,14px)] tabular-nums text-foreground`,
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.watchHoverNone(destroyRef);
    this.captureDispatches();
    this.animateStack(destroyRef);
    this.animateCount(destroyRef);
    this.animateCards();
    this.bumpOnEnqueue();
    destroyRef.onDestroy(() => {
      this.endDrag?.();
      for (const state of this.cards.values()) {
        state.animation?.stop();
        clearTimeout(state.timer);
      }
    });
  }

  // ── Template helpers ──────────────────────────────────────────────

  protected cardClass(item: QueuedMessage) {
    const compact = this.compact();
    const files = item.files.length > 0;
    // Equal left/right gutters (the left holds the queue icon) so the cards
    // sit centered above the composer. With attachments, 8px side padding
    // matches the ~8px around the 28px thumbnail; text-only cards get 14px.
    return `group/qm absolute bottom-0 left-10 right-10 flex select-none items-center bg-[color-mix(in_oklab,var(--accent),var(--background)_68%)] ${
      compact ? `gap-1.5 ${files ? 'pl-1.5' : 'pl-3'} pr-1` : `gap-2 ${files ? 'pl-2' : 'pl-3.5'} pr-1.5`
    } ${typeClass('subtitle', compact ? 'compact' : 'default')} text-muted-foreground shadow-surface-3 active:cursor-grabbing ${this.shape().bg}`;
  }

  protected cardLabel(item: QueuedMessage) {
    return item.text || `${item.files.length} attachment${item.files.length === 1 ? '' : 's'}`;
  }

  protected zIndexOf(entry: PresenceEntry<QueuedMessage>) {
    if (this.draggingId() === entry.key) return 200;
    const index = this.indexOf().get(entry.key) ?? this.lastIndex.get(entry.key) ?? 0;
    return 100 - index;
  }

  // ── Events ────────────────────────────────────────────────────────

  protected collapse(e: MouseEvent) {
    e.stopPropagation();
    this.tapExpanded.set(false);
  }

  protected onEdit(e: MouseEvent, item: QueuedMessage) {
    e.stopPropagation();
    this.edit.emit(item);
  }

  protected onRemove(e: MouseEvent, item: QueuedMessage) {
    e.stopPropagation();
    this.remove.emit(item);
  }

  /** Touch tap-to-expand: a collapsed pile fans out on tap. No-op once
   *  expanded so it doesn't swallow drags or button taps. */
  protected onCardClick() {
    if (this.isTouch() && !this.expanded()) this.tapExpanded.set(true);
  }

  /** Drag-to-reorder the expanded stack: the dragged card follows the pointer,
   *  the rest snap to slots; window listeners so release works anywhere. */
  protected onCardPointerDown(e: PointerEvent, key: string) {
    if (!this.expanded() || e.button !== 0) return;
    const index = this.indexOf().get(key);
    if (index === undefined) return;
    this.endDrag?.();
    this.dragStartY = e.clientY;
    this.dragY.set(this.slotY(index));
    this.pointerDownId.set(key);

    const view = this.document.defaultView;
    if (!view) return;
    let started = false;
    const onMove = (ev: Event) => {
      const clientY = (ev as PointerEvent).clientY;
      const el = this.stackRef()?.nativeElement;
      if (!el) return;
      if (!started) {
        if (Math.abs(clientY - this.dragStartY) < DRAG_THRESHOLD) return;
        started = true;
        this.draggingId.set(key);
      }
      const step = this.cardH() + STACK_GAP;
      const rect = el.getBoundingClientRect();
      const fromBottom = rect.bottom - clientY;
      const queue = this.queue();
      const slot = Math.max(0, Math.min(queue.length - 1, Math.floor(fromBottom / step)));
      const current = queue.findIndex((item) => item.id === key);
      if (current !== -1 && current !== slot) {
        const next = [...queue];
        const [moved] = next.splice(current, 1);
        next.splice(slot, 0, moved);
        this.queue.set(next);
      }
      const minY = -(this.queue().length - 1) * step;
      this.dragY.set(Math.max(minY, Math.min(0, clientY - rect.bottom + this.cardH() / 2)));
    };
    const onUp = () => this.endDrag?.();
    view.addEventListener('pointermove', onMove);
    view.addEventListener('pointerup', onUp);
    view.addEventListener('pointercancel', onUp);
    this.endDrag = () => {
      view.removeEventListener('pointermove', onMove);
      view.removeEventListener('pointerup', onUp);
      view.removeEventListener('pointercancel', onUp);
      this.endDrag = null;
      this.pointerDownId.set(null);
      this.draggingId.set(null);
    };
  }

  // ── Behavior ──────────────────────────────────────────────────────

  private slotY(index: number) {
    return -index * (this.cardH() + STACK_GAP);
  }

  private watchHoverNone(destroyRef: DestroyRef) {
    const mq = this.document.defaultView?.matchMedia?.('(hover: none)');
    if (!mq) return;
    const update = () => this.isTouch.set(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    destroyRef.onDestroy(() => mq.removeEventListener?.('change', update));
  }

  /** A text-only card leaving the queue while no drag is in progress offers
   *  its box under its layout id; the bubble that claims it morphs from it. */
  private captureDispatches() {
    let previous: QueuedMessage[] | null = null;
    effect(() => {
      const queue = this.queue();
      untracked(() => {
        const layoutId = this.morphLayoutId();
        const kept = new Set(queue.map((item) => item.id));
        if (previous && layoutId && this.pointerDownId() === null) {
          for (const item of previous) {
            if (kept.has(item.id) || item.files.length > 0) continue;
            const el = this.cards.get(item.id)?.el;
            if (el) this.morph.capture(layoutId(item), el.getBoundingClientRect(), () => this.claim(item.id));
          }
        }
        previous = queue;
      });
    });
  }

  /** The morph target took over: the card goes at once, no exit. */
  private claim(key: string) {
    this.claimed.add(key);
    const state = this.cards.get(key);
    if (!state) return;
    state.el.style.visibility = 'hidden';
    if (state.exiting) this.dropCard(key);
  }

  private dropCard(key: string) {
    const state = this.cards.get(key);
    if (state) {
      state.animation?.stop();
      clearTimeout(state.timer);
    }
    this.cards.delete(key);
    this.lastIndex.delete(key);
    this.claimed.delete(key);
    this.presence.done(key);
  }

  private animateStack(destroyRef: DestroyRef) {
    let current: HTMLElement | null = null;
    let height = 0;
    let exit: FluidAnimation | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      clearTimeout(timer);
      exit = null;
      if (untracked(this.open)) return;
      this.stackExiting.set(false);
      for (const state of this.cards.values()) state.animation?.stop();
      this.cards.clear();
      this.lastIndex.clear();
      this.claimed.clear();
      this.presence.reset();
    };

    afterRenderEffect(() => {
      const el = this.stackRef()?.nativeElement;
      const isOpen = this.open();
      // An exiting stack keeps its last height (its subtree is frozen).
      const target = isOpen
        ? this.expanded()
          ? this.count() * this.cardH() + Math.max(this.count() - 1, 0) * STACK_GAP
          : collapsedStackHeight(this.count(), this.cardH())
        : height;
      untracked(() => {
        if (!el) {
          current = null;
          return;
        }
        const fresh = el !== current;
        current = el;
        if (isOpen) {
          clearTimeout(timer);
          if (fresh) setInstant(el, { opacity: 0, height: 0 });
          if (fresh || exit || target !== height) {
            exit?.stop();
            exit = null;
            this.animateFluid(el, { opacity: 1, height: target }, STACK_TRANSITION);
          }
          height = target;
          return;
        }
        if (exit) return;
        const animation = this.animateFluid(el, { opacity: 0 }, STACK_TRANSITION);
        exit = animation;
        animation.finished.then(
          () => exit === animation && finish(),
          () => exit === animation && finish(),
        );
        timer = setTimeout(finish, STACK_EXIT_FALLBACK_MS);
      });
    });
    destroyRef.onDestroy(() => {
      clearTimeout(timer);
      exit?.stop();
    });
  }

  private animateCount(destroyRef: DestroyRef) {
    let current: HTMLElement | null = null;
    let exit: FluidAnimation | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      clearTimeout(timer);
      exit = null;
      if (untracked(this.hiddenCount) > 0) return;
      this.countExiting.set(false);
    };

    afterRenderEffect(() => {
      const el = this.countRef()?.nativeElement;
      const shown = this.hiddenCount() > 0;
      untracked(() => {
        if (!el) {
          current = null;
          return;
        }
        const fresh = el !== current;
        current = el;
        if (shown) {
          clearTimeout(timer);
          if (fresh) setInstant(el, COUNT_HIDDEN);
          if (fresh || exit) {
            exit?.stop();
            exit = null;
            this.animateFluid(el, COUNT_SHOWN, enterTransition(spring.fast));
          }
          return;
        }
        if (exit) return;
        const animation = this.animateFluid(el, COUNT_HIDDEN, enterTransition(spring.fast));
        exit = animation;
        animation.finished.then(
          () => exit === animation && finish(),
          () => exit === animation && finish(),
        );
        timer = setTimeout(finish, COUNT_EXIT_FALLBACK_MS);
      });
    });
    destroyRef.onDestroy(() => {
      clearTimeout(timer);
      exit?.stop();
    });
  }

  private cardTarget(index: number, key: string): CardTarget {
    const peek = Math.min(index, STACK_MAX_PEEK);
    if (this.expanded()) {
      const dragging = this.draggingId() === key;
      return { y: dragging ? this.dragY() : this.slotY(index), scale: dragging ? 1.03 : 1, opacity: 1 };
    }
    return {
      y: -peek * STACK_PEEK,
      scale: 1 - peek * STACK_SCALE,
      opacity: index <= STACK_MAX_PEEK ? 1 : 0,
    };
  }

  /** Each card springs to its slot (collapsed peek or expanded slot); new
   *  cards enter from below, removed ones fade and shrink before they go.
   *  Cards present when the stack mounts appear in place (`initial={false}`). */
  private animateCards() {
    let stackEl: HTMLElement | null = null;
    afterRenderEffect(() => {
      const els = this.cardRefs().map((ref) => ref.nativeElement);
      const entries = this.entries();
      const index = this.indexOf();
      const stack = this.stackRef()?.nativeElement ?? null;
      // Read every input of the targets so a change re-runs this effect.
      this.expanded();
      this.draggingId();
      this.dragY();
      this.cardH();
      untracked(() => {
        const stackMounting = stack !== stackEl;
        stackEl = stack;
        const byKey = new Map(els.map((el) => [el.getAttribute('data-key')!, el] as const));
        for (const entry of entries) {
          const el = byKey.get(entry.key);
          if (!el) continue;
          let state = this.cards.get(entry.key);
          if (state && state.el !== el) {
            state.animation?.stop();
            state = undefined;
          }
          if (!entry.present) {
            if (state && !state.exiting) this.exitCard(entry.key, state);
            continue;
          }
          const i = index.get(entry.key);
          if (i === undefined) continue; // Held by an emptied, exiting stack.
          this.lastIndex.set(entry.key, i);
          const target = this.cardTarget(i, entry.key);
          const targetKey = `${target.y}|${target.scale}|${target.opacity}`;
          if (!state) {
            state = { el, target: targetKey, exiting: false, animation: null };
            this.cards.set(entry.key, state);
            if (stackMounting) {
              setInstant(el, target);
              continue;
            }
            setInstant(el, CARD_ENTER);
            state.animation = this.animateFluid(el, { ...target }, enterTransition(spring.moderate));
            continue;
          }
          if (state.exiting || state.target === targetKey) continue;
          state.target = targetKey;
          const dragging = this.draggingId() === entry.key;
          state.animation = this.animateFluid(
            el,
            { ...target },
            dragging ? { duration: 0 } : enterTransition(spring.moderate),
          );
        }
      });
    });
  }

  private exitCard(key: string, state: CardState) {
    state.exiting = true;
    if (this.claimed.has(key)) {
      this.dropCard(key);
      return;
    }
    const animation = this.animateFluid(state.el, CARD_EXIT, exitTransition(spring.moderate));
    state.animation = animation;
    const done = () => state.animation === animation && this.dropCard(key);
    animation.finished.then(done, done);
    state.timer = setTimeout(() => this.cards.get(key) === state && this.dropCard(key), CARD_EXIT_FALLBACK_MS);
  }

  /** Enqueue feedback: once the collapsed stack hits its peek cap, a new
   *  message lands out of sight. Recoil the whole stack on every growth so each
   *  enqueue is felt — not while expanded, nor on the first fill (0 → N). */
  private bumpOnEnqueue() {
    let previous: number | null = null;
    afterRenderEffect(() => {
      const count = this.count();
      const expanded = this.expanded();
      const layer = this.layerRef()?.nativeElement;
      untracked(() => {
        const prev = previous ?? count;
        previous = count;
        if (!layer || !(count > prev && prev > 0 && !expanded)) return;
        setInstant(layer, { y: STACK_BUMP_Y });
        this.animateFluid(layer, { y: 0 }, STACK_BUMP);
      });
    });
  }
}
