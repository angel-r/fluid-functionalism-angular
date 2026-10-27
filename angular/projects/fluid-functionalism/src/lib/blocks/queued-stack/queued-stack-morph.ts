import {
  DestroyRef,
  Directive,
  ElementRef,
  Injectable,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import { animate } from 'motion';
import { exitFallbackMs, spring } from '../../core/springs';
import { ReducedMotion } from '../../core/environment';
import { CHAT_MESSAGE_ENTRANCE_OVERRIDE, type ChatMessageEntranceOverride } from '../../chat-message/entrance';

// ---------------------------------------------------------------------------
// The queued→sent morph (React: a shared framer `layoutId` between the stack
// card and the sent bubble). The stack captures a dispatched card's box under
// its layout id; the bubble that mounts with the same id claims it, hides the
// card at once and springs from the card's box to its own (FLIP).
// ---------------------------------------------------------------------------

interface PendingMorph {
  rect: DOMRect;
  onClaim: () => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Hand-off point between `ff-queued-stack` (captures) and
 * `[ffQueuedStackMorph]` (claims). A capture is only claimable while the card
 * would still be exiting, the window in which framer matches a `layoutId`.
 */
@Injectable({ providedIn: 'root' })
export class QueuedStackMorphRegistry {
  private readonly pending = new Map<string, PendingMorph>();

  /** Record a departing card's box under `key`; `onClaim` hides the card. */
  capture(key: string, rect: DOMRect, onClaim: () => void) {
    const previous = this.pending.get(key);
    if (previous) clearTimeout(previous.timer);
    const timer = setTimeout(() => this.pending.delete(key), exitFallbackMs(spring.moderate));
    this.pending.set(key, { rect, onClaim, timer });
  }

  /** Take the box captured under `key` (once), or null when there is none. */
  claim(key: string): DOMRect | null {
    const entry = this.pending.get(key);
    if (!entry) return null;
    clearTimeout(entry.timer);
    this.pending.delete(key);
    entry.onClaim();
    return entry.rect;
  }
}

type Frames = Partial<Record<'opacity' | 'x' | 'y' | 'scale' | 'scaleX' | 'scaleY' | 'height', number>>;

/**
 * Writes frames straight onto the element so the very next paint shows them
 * (motion's instant path lands a frame later), and hands them to motion so its
 * value store starts in step (and any running animation of those values stops).
 * Internal to the block.
 */
export function setInstant(element: HTMLElement, frames: Frames) {
  const transform: string[] = [];
  if (frames.x !== undefined) transform.push(`translateX(${frames.x}px)`);
  if (frames.y !== undefined) transform.push(`translateY(${frames.y}px)`);
  if (frames.scale !== undefined) transform.push(`scale(${frames.scale})`);
  if (frames.scaleX !== undefined) transform.push(`scaleX(${frames.scaleX})`);
  if (frames.scaleY !== undefined) transform.push(`scaleY(${frames.scaleY})`);
  if (transform.length) element.style.transform = transform.join(' ');
  if (frames.opacity !== undefined) element.style.opacity = String(frames.opacity);
  if (frames.height !== undefined) element.style.height = `${frames.height}px`;
  animate(element, frames, { duration: 0 });
}

/**
 * Morph target for a message dispatched from `ff-queued-stack`: put it on the
 * sent bubble with the same id the stack's `morphLayoutId` returns.
 *
 *   <ff-chat-message from="user" [ffQueuedStackMorph]="'qm-' + turn.id">
 *     <span class="inline-block align-top" data-queued-morph-text>{{ turn.text }}</span>
 *   </ff-chat-message>
 *
 * Acts once, on its first render: when the stack captured a card under that
 * id it springs from the card's box to its own (spring.moderate) and replaces
 * the element's own entrance (React `initial={false}`). Descendants marked
 * `data-queued-morph-text` are counter-scaled so text doesn't stretch. A null
 * id, or no captured card, leaves the element alone.
 */
@Directive({
  selector: '[ffQueuedStackMorph]',
  providers: [{ provide: CHAT_MESSAGE_ENTRANCE_OVERRIDE, useExisting: QueuedStackMorph }],
})
export class QueuedStackMorph implements ChatMessageEntranceOverride {
  readonly layoutId = input<string | null | undefined>(undefined, { alias: 'ffQueuedStackMorph' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly registry = inject(QueuedStackMorphRegistry);
  private readonly reduced = inject(ReducedMotion).value;
  private readonly animations: { stop(): void }[] = [];

  private morphed: boolean | null = null;

  constructor() {
    // A chat message host asks first (its entrance waits on the answer); any
    // other host morphs on its first render.
    afterNextRender(() => this.takeOverEntrance());
    inject(DestroyRef).onDestroy(() => this.animations.forEach((a) => a.stop()));
  }

  /** Claims the card and starts the morph, once; true when it morphed. */
  takeOverEntrance(): boolean {
    if (this.morphed === null) {
      const key = this.layoutId();
      const from = key ? this.registry.claim(key) : null;
      this.morphed = !!from;
      if (from) this.morphFrom(from);
    }
    return this.morphed;
  }

  private morphFrom(from: DOMRect) {
    const host = this.host;
    const origin = host.style.transformOrigin;
    // Measure the untransformed box: the element may carry its entrance frame.
    host.style.transform = 'none';
    const to = host.getBoundingClientRect();
    if (this.reduced() || !to.width || !to.height || !from.width || !from.height) {
      setInstant(host, { opacity: 1, x: 0, y: 0, scale: 1 });
      return;
    }
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const scaleX = from.width / to.width;
    const scaleY = from.height / to.height;
    const texts = Array.from(host.querySelectorAll<HTMLElement>('[data-queued-morph-text]'));
    host.style.transformOrigin = '0 0';
    for (const text of texts) text.style.transformOrigin = '0 0';
    // One spring drives the whole morph, and the text is counter-scaled from
    // the box's scale on every frame (framer's layout scale correction), so it
    // keeps its size throughout. Separate springs on box and text would only
    // cancel out at both ends.
    const frame = (p: number) => {
      const sx = scaleX + (1 - scaleX) * p;
      const sy = scaleY + (1 - scaleY) * p;
      host.style.transform = `translateX(${dx * (1 - p)}px) translateY(${dy * (1 - p)}px) scaleX(${sx}) scaleY(${sy})`;
      for (const text of texts) text.style.transform = `scaleX(${1 / sx}) scaleY(${1 / sy})`;
    };
    setInstant(host, { opacity: 1, x: dx, y: dy, scale: 1, scaleX, scaleY });
    for (const text of texts) setInstant(text, { scaleX: 1 / scaleX, scaleY: 1 / scaleY });

    const { type, duration, bounce } = spring.moderate;
    const main = animate(0 as number, 1, { type, duration, bounce, onUpdate: frame });
    this.animations.push(main);
    // Rest pose, written through motion so its value store ends in step.
    const settle = () => {
      setInstant(host, { x: 0, y: 0, scaleX: 1, scaleY: 1 });
      for (const text of texts) setInstant(text, { scaleX: 1, scaleY: 1 });
      host.style.transformOrigin = origin;
      for (const text of texts) text.style.transformOrigin = '';
    };
    main.finished.then(settle, settle);
  }
}
