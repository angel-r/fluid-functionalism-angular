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
  untracked,
  viewChild,
} from '@angular/core';
import { spring, exitFallbackMs } from '../core/springs';
import { Icon } from '../core/icon';
import { type FluidAnimation, enterTransition, exitTransition, injectAnimateFluid } from '../core/motion';
import { writeInitialStyles } from '../tabs/layer';

export type SendGlyphMode = 'stop' | 'arrow';

/**
 * The send button's glyph: a stop square or the arrow-up (Send and Queue
 * share the arrow, so only the Stop⇄arrow swap animates). React
 * `AnimatePresence mode="wait"`: the old glyph exits (fade + scale to 0.6 on
 * the fast exit tween) before the new one enters on spring.fast. Reduced
 * motion keeps only the fade. Internal to InputMessage.
 */
@Component({
  selector: 'ff-input-message-send-glyph',
  imports: [Icon],
  template: `
    <span #glyph class="flex items-center justify-center leading-none" [attr.data-glyph]="shown()">
      @if (shown() === 'stop') {
        <span class="h-3 w-3 rounded-[3px] bg-current"></span>
      } @else {
        <!-- Override icon-sm's small 14px svg: the send glyph reads better a
             touch larger. size matches the attribute to the CSS so the svg
             box stays centered. -->
        <ff-icon name="arrow-up" [size]="compact() ? 15 : 19" [class]="arrowClass()" />
      }
    </span>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputMessageSendGlyph {
  readonly mode = input.required<SendGlyphMode>();
  readonly compact = input(false);

  private readonly animate = injectAnimateFluid();
  private readonly glyph = viewChild.required<ElementRef<HTMLElement>>('glyph');
  // Seeded with the first mode (initial={false}: no enter at mount), then
  // only advanced by the exit → enter sequence below.
  protected readonly shown = linkedSignal<SendGlyphMode, SendGlyphMode>({
    source: this.mode,
    computation: (mode, prev) => prev?.value ?? mode,
  });
  protected readonly arrowClass = computed(() =>
    this.compact() ? 'block !h-[15px] !w-[15px]' : 'block !h-[19px] !w-[19px]',
  );

  constructor() {
    let animation: FluidAnimation | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let exiting = false;

    const enter = (el: HTMLElement) => {
      writeInitialStyles(el, { opacity: 0 });
      el.style.transform = 'scale(0.6)';
      animation = this.animate(el, { opacity: 1, scale: [0.6, 1] }, enterTransition(spring.fast));
    };

    afterRenderEffect(() => {
      const mode = this.mode();
      untracked(() => {
        if (mode === this.shown() || exiting) return;
        exiting = true;
        const el = this.glyph().nativeElement;
        animation?.stop();
        const exit = this.animate(el, { opacity: 0, scale: 0.6 }, exitTransition(spring.fast));
        animation = exit;
        const done = () => {
          clearTimeout(timer);
          if (animation !== exit) return;
          animation = null;
          exiting = false;
          // The latest mode wins if it flipped again mid-exit.
          const next = untracked(this.mode);
          if (next !== untracked(this.shown)) this.shown.set(next);
          enter(el);
        };
        exit.finished.then(done, done);
        timer = setTimeout(done, exitFallbackMs(spring.fast));
      });
    });

    inject(DestroyRef).onDestroy(() => {
      animation?.stop();
      clearTimeout(timer);
    });
  }
}
