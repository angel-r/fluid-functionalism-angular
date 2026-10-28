import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { animate } from 'motion';
import {
  cn,
  fontWeights,
  typeClass,
  ReducedMotion,
  injectSizeVariant,
  type SizeVariant,
} from '../core';

// The glyph is one path morphing circle → infinity → circle → infinity →
// circle. All 3 shapes share the same commands (a move, 4 curves, a close),
// so the morph interpolates point for point. circleA and circleB trace the
// same circle in opposite directions: each pass through the infinity sign
// keeps flowing the same way instead of unwinding.
export const thinkingIndicatorPaths = {
  circleA:
    'M 12 8 C 14.21 8 16 9.79 16 12 C 16 14.21 14.21 16 12 16 C 9.79 16 8 14.21 8 12 C 8 9.79 9.79 8 12 8 Z',
  infinity:
    'M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z',
  circleB:
    'M 12 16 C 14.21 16 16 14.21 16 12 C 16 9.79 14.21 8 12 8 C 9.79 8 8 9.79 8 12 C 8 14.21 9.79 16 12 16 Z',
} as const;

// The label moves to the next word every 4000ms.
export const thinkingIndicatorWords = ['Thinking', 'Moonwalking', 'Planning', 'Refining'] as const;

const longestWord = thinkingIndicatorWords.reduce((a, b) => (a.length >= b.length ? a : b));
const wordClass = 'col-start-1 row-start-1 shimmer-text';
// The source's own word-roll tween: the exit (0.16s) is quicker than the
// entrance (0.24s), so the old word clears before the new one lands.
const wordEase = [0.4, 0, 0.2, 1] as const;

/**
 * `<ff-thinking-indicator />`: a status line with a morphing glyph and a
 * cycling, shimmering word.
 */
@Component({
  selector: 'ff-thinking-indicator',
  template: `
    <!-- Static announcement — the cycling word display below is aria-hidden
         so screen readers hear one "Thinking…" instead of a re-announcement
         every 4 seconds. -->
    <span class="sr-only">Thinking…</span>
    @if (showIcon()) {
      <svg
        aria-hidden="true"
        [attr.width]="glyphSize()"
        [attr.height]="glyphSize()"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-muted-foreground shrink-0"
      >
        @if (reduced()) {
          <path [attr.d]="paths.infinity" />
        } @else {
          <path #morph [attr.d]="paths.circleA" />
        }
      </svg>
    }
    <!-- Every word sits in the same grid cell. overflow-hidden clips them as
         they roll in from below and out the top, like a slot. -->
    <span #display aria-hidden="true" [class]="displayClass()" [style.font-variation-settings]="normalWeight">
      <!-- An invisible copy of the longest word reserves the width, so the
           cycle never shifts what sits next to the indicator. -->
      <span class="col-start-1 row-start-1 invisible shimmer-text">{{ longestWord }}</span>
    </span>
  `,
  host: {
    role: 'status',
    '[class]': 'hostClass()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThinkingIndicator {
  /** Show the morphing circle⇄infinity glyph before the label. Set to `false`
   *  for a text-only indicator (e.g. inline before a streamed reply). */
  readonly showIcon = input(true, { transform: booleanAttribute });
  /** Step on the size ladder. Wins over the surrounding SizeProvider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  protected readonly paths = thinkingIndicatorPaths;
  protected readonly longestWord = longestWord;
  protected readonly normalWeight = fontWeights.normal;
  // Reduced motion drops the infinite glyph morph and the word cycling — a
  // static glyph and label carry the same meaning without the movement.
  protected readonly reduced = inject(ReducedMotion).value;
  private readonly compact = computed(() => this.variant() === 'compact');
  private readonly variant = injectSizeVariant(() => this.size());
  protected readonly glyphSize = computed(() => (this.compact() ? 18 : 20));
  protected readonly displayClass = computed(() =>
    cn('inline-grid overflow-hidden', typeClass('body', this.compact() ? 'compact' : 'default')),
  );
  protected readonly hostClass = computed(() => cn('flex items-center gap-2 px-3 py-2', this.userClass()));

  private readonly display = viewChild.required<ElementRef<HTMLElement>>('display');
  private readonly morph = viewChild<ElementRef<SVGPathElement>>('morph');
  private readonly document = inject(DOCUMENT);
  private index = 0;
  private current: HTMLElement | null = null;

  constructor() {
    // 4 equal quarters over 6s, easeInOut, forever.
    afterRenderEffect((onCleanup) => {
      const path = this.morph()?.nativeElement;
      if (!path) return;
      const { circleA, infinity, circleB } = thinkingIndicatorPaths;
      const controls = animate(
        path,
        { d: [circleA, infinity, circleB, infinity, circleA] },
        { duration: 6, ease: 'easeInOut', repeat: Infinity, times: [0, 0.25, 0.5, 0.75, 1] },
      );
      onCleanup(() => controls.stop());
    });

    // The word cycle. The first word is already there on mount (React's
    // initial={false}); each tick rolls the next one in from below while the
    // outgoing one leaves through the top.
    afterRenderEffect((onCleanup) => {
      const display = this.display().nativeElement;
      if (this.reduced()) {
        this.show(display, thinkingIndicatorWords[0], false);
        return;
      }
      this.show(display, thinkingIndicatorWords[this.index], false);
      const interval = setInterval(() => {
        this.index = (this.index + 1) % thinkingIndicatorWords.length;
        this.show(display, thinkingIndicatorWords[this.index], true);
      }, 4000);
      onCleanup(() => clearInterval(interval));
    });

    inject(DestroyRef).onDestroy(() => this.current?.remove());
  }

  private show(display: HTMLElement, word: string, animated: boolean) {
    const previous = this.current;
    if (previous && previous.textContent === word && !animated) return;
    const span = this.document.createElement('span');
    span.className = wordClass;
    span.textContent = word;
    display.appendChild(span);
    this.current = span;
    if (!previous) return;
    if (!animated) {
      previous.remove();
      return;
    }
    // Both words overlap in the one grid cell (React's popLayout).
    animate(previous, { y: '-80%', opacity: 0 }, { duration: 0.16, ease: wordEase }).finished.then(() =>
      previous.remove(),
    );
    animate(span, { y: ['80%', 0], opacity: [0, 1] }, { duration: 0.24, ease: wordEase });
  }
}
