import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { spring, exitFallbackMs } from '../core/springs';
import { Icon } from '../core/icon';
import { injectShape, nestedRadius } from '../core/shape';
import { type FluidAnimation, enterTransition, exitTransition, injectAnimateFluid } from '../core/motion';
import { FileThumbnail } from '../file-thumbnail/file-thumbnail';
import { Tooltip } from '../tooltip/tooltip';
import { writeInitialStyles } from '../tabs/layer';

/**
 * Composer-row tile: a FileThumbnail with enter/exit motion and a
 * hover-revealed remove (×) button. Internal to InputMessage.
 *
 * Enter: spring.fast (opacity 0 → 1, scale 0.9 → 1). Exit: the fast exit
 * tween, slightly quicker than the enter. `cursor-default` opts out of the
 * composer's `cursor-text`.
 */
@Component({
  selector: 'ff-input-message-file-tile',
  imports: [FileThumbnail, Tooltip, Icon],
  template: `
    <ff-file-thumbnail [file]="file()" [size]="size()" [radius]="radius()" />
    <ff-tooltip content="Remove" side="top">
      <!-- Light-mode palette (dark circle + white X) regardless of theme: the
           badge sits over arbitrary image/PDF content at a fixed contrast. -->
      <button
        type="button"
        [attr.aria-label]="'Remove ' + file().name"
        class="absolute top-1 right-1 w-5 h-5 rounded-full bg-neutral-900 text-white opacity-0 group-hover/tile:opacity-100 transition-opacity duration-80 flex items-center justify-center cursor-pointer outline-none focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
        (click)="onRemove($event)"
      >
        <ff-icon name="x" [size]="12" [strokeWidth]="2.5" />
      </button>
    </ff-tooltip>
  `,
  host: {
    class: 'relative shrink-0 cursor-default group/tile',
    '[attr.data-flip-key]': 'flipKey()',
    '[attr.data-flip-pop]': 'present() ? null : ""',
    '[attr.data-exiting]': 'present() ? null : ""',
    '[attr.inert]': 'present() ? null : ""',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputMessageFileTile {
  readonly file = input.required<File>();
  readonly size = input.required<number>();
  readonly flipKey = input.required<string>();
  /** False once the file was removed: the tile runs its exit, then emits `exited`. */
  readonly present = input(true);
  /** Play the enter animation (false for tiles present when the row mounts). */
  readonly animateEnter = input(true);
  readonly remove = output<void>();
  readonly exited = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly shape = injectShape();
  private readonly animate = injectAnimateFluid();
  // The tile sits 8px inside the composer's container edge: derive its curve
  // from that actual inset instead of reusing the popup-specific 4px pair.
  protected readonly radius = computed(() => nestedRadius(this.shape().containerRadius, 8));

  constructor() {
    let animation: FluidAnimation | null = null;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;

    afterNextRender(() => {
      if (!untracked(this.animateEnter) || !untracked(this.present)) return;
      // First paint at the `initial` frame; motion takes the transform over.
      writeInitialStyles(this.host, { opacity: 0 });
      this.host.style.transform = 'scale(0.9)';
      animation = this.animate(this.host, { opacity: 1, scale: [0.9, 1] }, enterTransition(spring.fast));
    });

    let exiting = false;
    afterRenderEffect(() => {
      const present = this.present();
      untracked(() => {
        if (present || exiting) return;
        exiting = true;
        animation?.stop();
        const exit = this.animate(this.host, { opacity: 0, scale: 0.9 }, exitTransition(spring.fast));
        animation = exit;
        const done = () => {
          clearTimeout(exitTimer);
          if (animation !== exit) return;
          animation = null;
          this.exited.emit();
        };
        exit.finished.then(done, done);
        exitTimer = setTimeout(done, exitFallbackMs(spring.fast));
      });
    });

    inject(DestroyRef).onDestroy(() => {
      animation?.stop();
      clearTimeout(exitTimer);
    });
  }

  protected onRemove(event: MouseEvent) {
    event.stopPropagation();
    this.remove.emit();
  }
}
