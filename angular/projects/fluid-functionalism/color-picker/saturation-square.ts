import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { injectShape, nestedRadius } from '@angel-r/fluid-functionalism-angular/core';
import { clamp01, hsvToRgb } from './color-math';
import { SQUARE_HEIGHT } from './shared';

// ---------------------------------------------------------------------------
// SaturationSquare
//
// The HSV plane at the current hue: x = saturation 0 → 1, y = value 1 → 0.
// Pointer position maps straight to state with no color math, and because
// only S and V change here, dragging into the gray or black edge leaves the
// hue untouched. Keyboard: arrows nudge S (left/right) and V (up/down) by
// 0.01, Shift by 0.1, clamped at the edges.
//
// role="application" hands the arrow keys to this widget. The 2px focus ring
// shows only when :focus-visible matches (keyboard), never after a press.
// cursor-none hides the OS cursor: the ghost ring stands in for it, and while
// dragging the thumb sits under the pointer.
// ---------------------------------------------------------------------------

export interface SaturationChange {
  s: number;
  v: number;
}

@Component({
  selector: 'ff-color-saturation',
  host: {
    role: 'application',
    'aria-label': 'Saturation and brightness',
    tabindex: '0',
    class: 'relative w-full select-none touch-none cursor-none outline-none',
    '[style.height.px]': 'height',
    '[style.border-radius.px]': 'radius()',
    '[style.box-shadow]': 'focused() ? "0 0 0 2px var(--focus-ring, #6B97FF)" : null',
    '[style.display]': '"block"',
    '(focus)': 'onFocus()',
    '(blur)': 'focused.set(false)',
    '(pointerenter)': 'hovered.set(true)',
    '(pointerleave)': 'onPointerLeave()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'dragging.set(false)',
    '(keydown)': 'onKeyDown($event)',
  },
  template: `
    <!-- Black rising from the bottom over white → pure hue: exactly the HSV
         plane for this hue, drawn by CSS. -->
    <div class="absolute inset-0 overflow-hidden" [style.border-radius.px]="radius()" [style.background]="plane()"></div>
    <!-- 18px thumb filled with the live color; 1px white border plus a 1px
         black ring keeps it visible on light and dark regions alike. It never
         lags the pointer (React animates it with duration 0). -->
    <div
      data-slot="color-saturation-thumb"
      class="absolute pointer-events-none rounded-full"
      [style.left.%]="s() * 100"
      [style.top.%]="(1 - v()) * 100"
      style="width: 18px; height: 18px; transform: translate(-50%, -50%); border: 1px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,1)"
      [style.background-color]="thumbColor()"
    ></div>
    <!-- Ghost ring: the stand-in cursor while hovering. Same 18px as the
         thumb but hollow and 55% white, so it never reads as the value.
         Hidden while dragging, when the real thumb is under the pointer. -->
    @if (hovered() && !dragging() && cursorPos(); as pos) {
      <div
        data-slot="color-saturation-ghost"
        class="absolute pointer-events-none rounded-full"
        [style.left.%]="pos.x"
        [style.top.%]="pos.y"
        style="width: 18px; height: 18px; transform: translate(-50%, -50%); border: 2px solid rgba(255, 255, 255, 0.55); box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2)"
      ></div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaturationSquare {
  readonly h = input.required<number>();
  readonly s = input.required<number>();
  readonly v = input.required<number>();
  readonly change = output<SaturationChange>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly shape = injectShape();
  protected readonly height = SQUARE_HEIGHT;
  // The square is the first surface inside the picker's 12px padding. Its
  // corner follows the panel: rounded 12 - 12 = 0, pill 24 - 12 = 12.
  protected readonly radius = computed(() => nestedRadius(this.shape().containerRadius, 12));
  protected readonly dragging = signal(false);
  protected readonly focused = signal(false);
  protected readonly hovered = signal(false);
  protected readonly cursorPos = signal<{ x: number; y: number } | null>(null);

  protected readonly plane = computed(
    () => `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${this.h()}, 100%, 50%))`,
  );
  protected readonly thumbColor = computed(() => {
    const { r, g, b } = hsvToRgb(this.h(), this.s(), this.v());
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  });

  private relative(clientX: number, clientY: number) {
    const rect = this.host.getBoundingClientRect();
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    };
  }

  private updateFromPointer(clientX: number, clientY: number) {
    const { x, y } = this.relative(clientX, clientY);
    this.change.emit({ s: x, v: 1 - y });
  }

  protected onFocus() {
    try {
      if (this.host.matches(':focus-visible')) this.focused.set(true);
    } catch {
      // Selector unsupported: no ring.
    }
  }

  protected onPointerLeave() {
    this.hovered.set(false);
    this.cursorPos.set(null);
  }

  // Primary button only. The press itself sets the color (no drag needed),
  // and pointer capture keeps the drag alive past the edges, where the clamp
  // pins the thumb to the border.
  protected onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    this.dragging.set(true);
    try {
      this.host.setPointerCapture?.(e.pointerId);
    } catch {
      // No active pointer with that id (synthetic events).
    }
    this.updateFromPointer(e.clientX, e.clientY);
  }

  // The ghost ring's position, tracked apart from the value: it follows every
  // move so hover previews where a press will land.
  protected onPointerMove(e: PointerEvent) {
    const { x, y } = this.relative(e.clientX, e.clientY);
    this.cursorPos.set({ x: x * 100, y: y * 100 });
    if (!this.dragging()) return;
    this.updateFromPointer(e.clientX, e.clientY);
  }

  protected onKeyDown(e: KeyboardEvent) {
    const step = e.shiftKey ? 0.1 : 0.01;
    const s = this.s();
    const v = this.v();
    let next: SaturationChange | null = null;
    if (e.key === 'ArrowLeft') next = { s: clamp01(s - step), v };
    else if (e.key === 'ArrowRight') next = { s: clamp01(s + step), v };
    else if (e.key === 'ArrowUp') next = { s, v: clamp01(v + step) };
    else if (e.key === 'ArrowDown') next = { s, v: clamp01(v - step) };
    if (!next) return;
    e.preventDefault();
    this.change.emit(next);
  }
}
