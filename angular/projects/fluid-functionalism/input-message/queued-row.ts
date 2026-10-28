import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
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
import {
  cn,
  spring,
  exitFallbackMs,
  fontWeights,
  Icon,
  injectSizeVariant,
  injectTouchPrimary,
  type FluidAnimation,
  enterTransition,
  exitTransition,
  injectAnimateFluid,
} from '../core';
import { Tooltip } from '../tooltip';
import { writeInitialStyles } from '../tabs';
import { type QueuedMessage } from './input-message.types';

/** Pointer travel (px) before a press on a row becomes a drag. */
const DRAG_THRESHOLD = 3;

/**
 * A pending message in the queue: a recessed, draggable row that reads as
 * "staged, not live". Double-click (or Enter/F2) edits it back into the
 * composer; the hover-revealed × (or Delete/Backspace) removes it; drag — or
 * Alt+↑/↓ — reorders. Top of the list is next to dispatch. Internal to
 * InputMessage (the React `Reorder.Item`).
 */
@Component({
  selector: 'li[ffInputMessageQueuedRow]',
  imports: [Icon, Tooltip],
  template: `
    @if (fileCount() > 0) {
      <span class="flex shrink-0 items-center gap-0.5 text-muted-foreground">
        <ff-icon name="image" [size]="13" />
        @if (item().text) {
          <span class="tabular-nums">{{ fileCount() }}</span>
        }
      </span>
    }
    <!-- py-1/-my-1 keeps truncate's overflow:hidden from clipping
         ascenders/descenders outside the trimmed box. -->
    <span class="min-w-0 flex-1 truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1">{{ label() }}</span>
    <ff-tooltip content="Remove" side="top">
      <!-- The pointer-down must not start a drag, nor the click reach the
           row's double-click/edit handler. -->
      <button
        type="button"
        [attr.aria-label]="'Remove queued message: ' + label()"
        [class]="removeClass()"
        (pointerdown)="$event.stopPropagation()"
        (click)="onRemoveClick($event)"
      >
        <ff-icon name="x" [size]="13" [strokeWidth]="2.5" />
      </button>
    </ff-tooltip>
  `,
  host: {
    '[class]': 'hostClass()',
    '[style.font-variation-settings]': 'fontWeight',
    style: 'touch-action: pan-x',
    tabindex: '0',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.data-flip-key]': 'item().id',
    '[attr.data-exiting]': 'present() ? null : ""',
    '[attr.inert]': 'present() ? null : ""',
    '(dblclick)': 'edit.emit(item())',
    '(keydown)': 'onKeydown($event)',
    '(pointerdown)': 'onPointerDown($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputMessageQueuedRow {
  readonly item = input.required<QueuedMessage>();
  readonly index = input.required<number>();
  readonly total = input.required<number>();
  readonly present = input(true);
  readonly animateEnter = input(true);
  readonly edit = output<QueuedMessage>();
  readonly remove = output<QueuedMessage>();
  /** Keyboard (Alt+↑/↓) or drag reorder by one slot. */
  readonly move = output<-1 | 1>();
  readonly exited = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly variant = injectSizeVariant();
  private readonly isTouch = injectTouchPrimary();
  private readonly animate = injectAnimateFluid();
  protected readonly fontWeight = fontWeights.normal;

  protected readonly fileCount = computed(() => this.item().files.length);
  protected readonly label = computed(() => {
    const count = this.fileCount();
    return this.item().text || `${count} attachment${count === 1 ? '' : 's'}`;
  });
  protected readonly ariaLabel = computed(() => `Queued message ${this.index() + 1} of ${this.total()}: ${this.label()}`);

  protected readonly hostClass = computed(() =>
    cn(
      // Fixed height so the text-box trim on the label doesn't shrink the row.
      'group/qrow flex items-center gap-2 rounded-lg bg-muted',
      this.variant() === 'compact'
        ? 'h-7 px-2 text-[length:var(--fs-body-compact,12px)] leading-[var(--lh-body-compact,18px)]'
        : 'h-8 px-2.5 text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)]',
      'text-foreground select-none outline-none',
      'cursor-grab active:cursor-grabbing',
      'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
    ),
  );

  protected readonly removeClass = computed(() =>
    cn(
      'shrink-0 flex h-5 w-5 items-center justify-center rounded-full',
      'text-muted-foreground hover:text-foreground hover:bg-hover',
      // Hover devices reveal × on row-hover; touch has no hover, so keep it
      // persistently visible there.
      this.isTouch() ? 'opacity-100' : 'opacity-0 group-hover/qrow:opacity-100 focus-visible:opacity-100',
      'transition-opacity duration-80 cursor-pointer outline-none',
      'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
    ),
  );

  private animation: FluidAnimation | null = null;
  private drag: { pointerId: number; startY: number; active: boolean; pending: boolean } | null = null;
  private stopDrag: (() => void) | null = null;

  constructor() {
    let exitTimer: ReturnType<typeof setTimeout> | undefined;

    // Enter: spring.fast chip category; reduced motion drops the scale
    // (animateFluid keeps only the fade then).
    afterNextRender(() => {
      if (!untracked(this.animateEnter) || !untracked(this.present)) return;
      writeInitialStyles(this.host, { opacity: 0 });
      this.host.style.transform = 'scale(0.97)';
      this.animation = this.animate(this.host, { opacity: 1, scale: [0.97, 1] }, enterTransition(spring.fast));
    });

    // Exit slightly faster than the enter (the fast exit tween).
    let exiting = false;
    afterRenderEffect(() => {
      const present = this.present();
      untracked(() => {
        if (present || exiting) return;
        exiting = true;
        this.stopDrag?.();
        this.animation?.stop();
        const exit = this.animate(this.host, { opacity: 0, scale: 0.97 }, exitTransition(spring.fast));
        this.animation = exit;
        const done = () => {
          clearTimeout(exitTimer);
          if (this.animation !== exit) return;
          this.animation = null;
          this.exited.emit();
        };
        exit.finished.then(done, done);
        exitTimer = setTimeout(done, exitFallbackMs(spring.fast));
      });
    });

    // A reorder landed: the row may swap again.
    afterRenderEffect(() => {
      this.index();
      untracked(() => {
        if (this.drag) this.drag.pending = false;
      });
    });

    inject(DestroyRef).onDestroy(() => {
      this.stopDrag?.();
      this.animation?.stop();
      clearTimeout(exitTimer);
    });
  }

  protected onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      this.edit.emit(this.item());
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.remove.emit(this.item());
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      this.move.emit(e.key === 'ArrowUp' ? -1 : 1);
    }
  }

  protected onRemoveClick(e: MouseEvent) {
    e.stopPropagation();
    this.remove.emit(this.item());
  }

  // ── Drag reorder (Reorder.Item, axis y) ───────────────────────────
  // The row follows the pointer through `translate`; once its center passes
  // a neighbor's center the two swap (`move`), and the drag origin shifts by
  // the row's layout jump so it stays under the pointer. Neighbors slide via
  // the list's layout animation; on release the row springs home.
  protected onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || !this.present()) return;
    this.stopDrag?.();
    this.drag = { pointerId: e.pointerId, startY: e.clientY, active: false, pending: false };
    const view = this.document.defaultView;
    if (!view) return;
    const controller = new AbortController();
    const opts = { signal: controller.signal };
    view.addEventListener('pointermove', (ev) => this.onPointerMove(ev as PointerEvent), opts);
    view.addEventListener('pointerup', () => this.endDrag(), opts);
    view.addEventListener('pointercancel', () => this.endDrag(), opts);
    this.stopDrag = () => {
      controller.abort();
      this.stopDrag = null;
    };
  }

  private onPointerMove(e: PointerEvent) {
    const drag = this.drag;
    if (!drag || (e.pointerId !== undefined && drag.pointerId !== undefined && e.pointerId !== drag.pointerId)) return;
    const el = this.host;
    let dy = e.clientY - drag.startY;
    if (!drag.active) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      drag.active = true;
      this.animation?.stop();
      el.setAttribute('data-flip-skip', '');
      el.setAttribute('data-dragging', '');
      el.style.position = 'relative';
      el.style.zIndex = '1';
    }
    if (!drag.pending) {
      const next = this.sibling('next');
      const prev = this.sibling('previous');
      const center = el.offsetTop + el.offsetHeight / 2;
      if (dy > 0 && next && dy > next.offsetTop + next.offsetHeight / 2 - center) {
        drag.startY += next.offsetTop + next.offsetHeight - el.offsetHeight - el.offsetTop;
        drag.pending = true;
        this.move.emit(1);
      } else if (dy < 0 && prev && dy < prev.offsetTop + prev.offsetHeight / 2 - center) {
        drag.startY += prev.offsetTop - el.offsetTop;
        drag.pending = true;
        this.move.emit(-1);
      }
      dy = e.clientY - drag.startY;
    }
    el.style.translate = `0px ${dy}px`;
  }

  private endDrag() {
    const drag = this.drag;
    this.drag = null;
    this.stopDrag?.();
    if (!drag?.active) return;
    const el = this.host;
    const from = el.style.translate || '0px 0px';
    el.style.removeProperty('translate');
    el.removeAttribute('data-dragging');
    const home = this.animate(el, { translate: [from, '0px 0px'] }, enterTransition(spring.fast));
    this.animation = home;
    const settle = () => {
      el.removeAttribute('data-flip-skip');
      el.style.removeProperty('z-index');
      el.style.removeProperty('position');
    };
    home.finished.then(settle, settle);
  }

  private sibling(direction: 'next' | 'previous'): HTMLElement | null {
    let node = direction === 'next' ? this.host.nextElementSibling : this.host.previousElementSibling;
    while (node && (!(node instanceof HTMLElement) || node.hasAttribute('data-exiting') || !node.hasAttribute('data-flip-key'))) {
      node = direction === 'next' ? node.nextElementSibling : node.previousElementSibling;
    }
    return node as HTMLElement | null;
  }
}
