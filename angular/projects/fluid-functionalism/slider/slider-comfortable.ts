import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  effect,
  input,
  model,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { cn, spring, enterTransition, fontWeights, injectShape } from '@angel-r/fluid-functionalism-angular/core';
import {
  HOVER_PREVIEW_BG,
  PIP_SIZE,
  TOOLTIP_TEXT_CLASS,
  radixRangeInsets,
  radixThumbLeft,
  type HoverPreview,
  type SliderVariant,
} from './slider-math';
import { injectMotionValues, injectTween, springTo, tooltipEnter, tooltipLeave } from './slider-motion';
import { SliderThumb } from './slider-thumb';

const TEXT = 'text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)]';
const LINE_REST = 'color-mix(in srgb, var(--foreground) 25%, transparent)';
const LINE_HOVER = 'color-mix(in srgb, var(--foreground) 50%, transparent)';

// ---------------------------------------------------------------------------
// SliderComfortable — the default-step design: a 32px bordered row with the
// label at the start and the value at the end. "pips" draws a dot per step
// and springs the fill on every snap; "scrubber" fills continuously, glued to
// the cursor. Both mark the value with a 2px handle line, and label and value
// go muted → foreground on spring.fast while hovered or focused.
//
// The host is the outer wrapper (hover state and the preview live there, so
// the 8px gutters count as hovering); `class` lands on the bordered row.
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-slider-comfortable',
  imports: [SliderThumb],
  host: {
    class: 'relative w-full touch-none',
    style: 'display: block',
    '(pointerenter)': 'onEnter()',
    '(pointerleave)': 'onLeave()',
    '(mousemove)': 'onMouseMove($event)',
  },
  template: `
    <!-- Extended hit area — 8px beyond each edge. The row paints over its
         middle, so this only catches the gutters, which clamp to min or max. -->
    <div
      class="absolute cursor-ew-resize"
      style="left: -8px; right: -8px; top: 0; bottom: 0"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp()"
      (pointercancel)="onPointerUp()"
    ></div>

    <!-- Hover value tooltip — outside the overflow-hidden row -->
    @if (hoverTooltip(); as preview) {
      <div
        data-slot="slider-hover-tooltip"
        class="absolute -translate-x-1/2 pointer-events-none z-20"
        [style.left.px]="preview.cursorX"
        style="top: -30px"
        (animate.enter)="enter($event)"
        (animate.leave)="leave($event)"
      >
        <span [class]="tooltipTextClass()" [style.font-variation-settings]="fw.normal">{{ formatValue()(preview.snappedValue) }}</span>
      </div>
    }

    <!-- The focus ring is an outline 2px outside the row, which the row's own
         overflow-hidden can't clip. -->
    <div
      #row
      data-slot="slider-row"
      [class]="rowClass()"
      style="outline: 1px solid transparent"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp()"
      (pointercancel)="onPointerUp()"
    >
      <!-- Invisible ARIA slider for keyboard nav + a11y; [&_*]:pointer-events-none
           keeps its thumb off the hit path too, so presses always reach the row. -->
      <span
        dir="ltr"
        data-orientation="horizontal"
        class="absolute inset-0 opacity-0 pointer-events-none [&_*]:pointer-events-none"
        style="--radix-slider-thumb-transform: translateX(-50%)"
        [attr.aria-disabled]="disabled()"
        [attr.data-disabled]="disabled() ? '' : null"
      >
        <span data-orientation="horizontal" class="w-full h-full">
          <span data-orientation="horizontal" [style.left]="ariaRange().left" [style.right]="ariaRange().right"></span>
        </span>
        <!-- The thumb has no size here, so Radix adds no in-bounds offset. -->
        <span style="transform: var(--radix-slider-thumb-transform); position: absolute" [style.left]="ariaThumbLeft()">
          <span
            ffSliderThumb
            class="block outline-none"
            [value]="value()"
            [min]="min()"
            [max]="max()"
            [step]="step()"
            [disabled]="disabled()"
            [label]="label()"
            (valueCommit)="value.set($event)"
            (focusVisibleChange)="isFocused.set($event)"
          ></span>
        </span>
      </span>

      <!-- Hover preview: the 40% accent bar from the fill edge to the snapped
           hover value. Unrounded; at min or max the row's clip rounds it. -->
      <div
        #preview
        class="absolute inset-y-0 pointer-events-none z-[3]"
        [style.left.px]="hoverPreview()?.left ?? 0"
        [style.width.px]="hoverPreview()?.width ?? 0"
        [style.background-color]="previewBg"
      ></div>

      @if (variant() === 'pips') {
        <!-- Pips: dots layer — z-[1] -->
        <div #pipsLayer class="absolute inset-0 flex justify-between items-center px-3 pointer-events-none z-[1]">
          @for (pipValue of pipSteps(); track pipValue) {
            <div class="relative flex items-center justify-center" [style.width.px]="pipSize" [style.height.px]="pipSize">
              <div #pip data-slot="slider-pip" class="rounded-full" [style.width.px]="pipSize" [style.height.px]="pipSize"></div>
            </div>
          }
        </div>

        <!-- Pips: label + value BG layer — z-[2]. Transparent-text copies on
             bg-background, so pips never cross the words. -->
        <div class="absolute inset-0 flex items-center px-2 z-[2] pointer-events-none" aria-hidden="true">
          @if (label()) {
            <span [class]="text + ' px-2 bg-background text-transparent select-none'">{{ label() }}</span>
          }
          <span [class]="text + ' tabular-nums ml-auto px-2 bg-background text-transparent select-none'" [style.min-width]="valueMinWidth()">{{ formatValue()(value()) }}</span>
        </div>

        <!-- Pips: fill — z-[3] -->
        <div #pipsFill class="absolute left-0 top-0 bottom-0 pointer-events-none z-[3]" style="background-color: var(--active)"></div>

        <!-- Pips: handle line — z-[3]. Active shrinks the inset 8 → 7; color
             steps 25% → 50% → 100% foreground for rest, hover, focus. -->
        <div #line class="absolute rounded-full pointer-events-none z-[3]" style="width: 2px"></div>

        <!-- Pips: label + value text layer — z-[4] -->
        <div class="absolute inset-0 flex items-center px-2 z-[4] pointer-events-none">
          @if (label()) {
            <span #tinted [class]="text + ' px-2'">{{ label() }}</span>
          }
          <!-- minWidth reserves formatValue(max)'s length in ch. -->
          <span #tinted [class]="text + ' tabular-nums ml-auto px-2'" [style.min-width]="valueMinWidth()" style="text-align: right">{{ formatValue()(value()) }}</span>
        </div>
      } @else {
        <!-- Scrubber: fill, straight from fillPercent. -->
        <div #scrubFill class="absolute left-0 top-0 bottom-0 pointer-events-none" style="background-color: var(--active)"></div>

        <!-- Scrubber: handle line, same sizes and color steps as the pips line. -->
        <div #line class="absolute rounded-full pointer-events-none z-10" style="width: 2px"></div>

        @if (label()) {
          <span #tinted [class]="text + ' shrink-0 z-10'">{{ label() }}</span>
        }
        <div class="flex-1"></div>
        <span #tinted [class]="text + ' shrink-0 tabular-nums text-right z-10'" [style.min-width]="valueMinWidth()">{{ formatValue()(value()) }}</span>

        <!-- Resize handle: an 8px grab strip at the handle line, above the text. -->
        <div
          #handle
          data-slot="slider-handle"
          class="absolute top-0 bottom-0 w-2 cursor-ew-resize z-20"
          (pointerdown)="onHandleDown($event)"
          (pointermove)="onHandleMove($event)"
          (pointerup)="onHandleUp()"
          (pointercancel)="onHandleUp()"
        ></div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SliderComfortable {
  readonly value = model.required<number>();
  readonly min = input(0, { transform: (v: number | undefined) => v ?? 0 });
  readonly max = input(100, { transform: (v: number | undefined) => v ?? 100 });
  readonly step = input(1, { transform: (v: number | undefined) => v ?? 1 });
  readonly variant = input<SliderVariant, SliderVariant | undefined>('pips', { transform: (v) => v ?? 'pips' });
  readonly label = input<string | undefined>(undefined);
  readonly formatValue = input<(v: number) => string, ((v: number) => string) | undefined>(String, {
    transform: (v) => v ?? String,
  });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly userClass = input('', { alias: 'class' });

  protected readonly fw = fontWeights;
  protected readonly text = TEXT;
  protected readonly pipSize = PIP_SIZE;
  protected readonly previewBg = HOVER_PREVIEW_BG;
  protected readonly enter = tooltipEnter;
  protected readonly leave = tooltipLeave;

  private readonly shape = injectShape();
  private readonly tween = injectTween();

  protected readonly isHovered = signal(false);
  protected readonly isPressed = signal(false);
  protected readonly isFocused = signal(false);
  protected readonly hoverPreview = signal<HoverPreview | null>(null);
  private readonly hoverDelayDone = signal(false);
  // Hover or keyboard focus brightens the label and value and grows the line.
  private readonly isActive = computed(() => this.isHovered() || this.isFocused());

  protected readonly hoverTooltip = computed(() => {
    const preview = this.hoverPreview();
    return preview && this.isHovered() && this.hoverDelayDone() && !this.isPressed() ? preview : null;
  });

  protected readonly pipSteps = computed(() => {
    const min = this.min();
    const step = this.step();
    return Array.from({ length: Math.round((this.max() - min) / step) + 1 }, (_, i) => min + i * step);
  });
  // Small offset at min so the handle line stays visible: 8px for pips, 17px
  // for scrubber.
  private readonly zeroTarget = computed(() => (this.variant() === 'pips' ? 8 : 17));

  protected readonly rowClass = computed(() =>
    cn(
      'relative w-full h-8 select-none touch-none border border-border overflow-hidden outline-offset-2',
      this.variant() === 'scrubber' ? 'flex items-center gap-3 px-4 cursor-ew-resize' : 'cursor-ew-resize',
      this.shape().bg,
      this.disabled() && 'opacity-50 pointer-events-none',
      this.userClass(),
    ),
  );
  protected readonly tooltipTextClass = computed(() => cn(TOOLTIP_TEXT_CLASS, this.shape().bg));
  /** The hidden range span and thumb wrapper, placed as Radix Slider places them. */
  protected readonly ariaRange = computed(() => radixRangeInsets([this.value()], this.min(), this.max()));
  protected readonly ariaThumbLeft = computed(() => radixThumbLeft(this.value(), this.min(), this.max(), 0));
  protected readonly valueMinWidth = computed(() => `${String(this.formatValue()(this.max())).length}ch`);

  // Row presses and the scrubber's handle strip track their drags apart.
  private dragging = false;
  private handleDragging = false;
  private synced = false;
  private readonly fillPercent: ReturnType<typeof injectMotionValues>[number];
  private readonly zeroOffset: ReturnType<typeof injectMotionValues>[number];

  private readonly row = viewChild.required<ElementRef<HTMLElement>>('row');
  private readonly preview = viewChild.required<ElementRef<HTMLElement>>('preview');
  private readonly pipsLayer = viewChild<ElementRef<HTMLElement>>('pipsLayer');
  private readonly pipsFill = viewChild<ElementRef<HTMLElement>>('pipsFill');
  private readonly scrubFill = viewChild<ElementRef<HTMLElement>>('scrubFill');
  private readonly line = viewChild<ElementRef<HTMLElement>>('line');
  private readonly handle = viewChild<ElementRef<HTMLElement>>('handle');
  private readonly pips = viewChildren<ElementRef<HTMLElement>>('pip');
  private readonly tinted = viewChildren<ElementRef<HTMLElement>>('tinted');

  constructor() {
    [this.fillPercent, this.zeroOffset] = injectMotionValues(2);
    this.fillPercent.on('change', () => this.paint());
    this.zeroOffset.on('change', () => this.paint());

    effect((onCleanup) => {
      if (!this.isHovered()) {
        this.hoverDelayDone.set(false);
        return;
      }
      const id = setTimeout(() => this.hoverDelayDone.set(true), 100);
      onCleanup(() => clearTimeout(id));
    });

    // Sync the fill on programmatic and keyboard changes (spring.fast);
    // skipped during either drag. The first run places it with no animation.
    effect(() => {
      const value = this.value();
      const percent = this.percentOf(value);
      const zero = value === this.min() ? this.zeroTarget() : 0;
      untracked(() => {
        if (this.dragging || this.handleDragging) return;
        if (!this.synced) {
          this.synced = true;
          this.fillPercent.set(percent);
          this.zeroOffset.set(zero);
          return;
        }
        springTo(this.fillPercent, percent, spring.fast);
        springTo(this.zeroOffset, zero, spring.fast);
      });
    });

    afterRenderEffect(() => {
      this.pipsLayer();
      this.pipsFill();
      this.scrubFill();
      this.line();
      this.handle();
      this.paint();
    });

    // Focus outline, handle line, text tint and active pip, all on spring.fast.
    afterRenderEffect(() => {
      const focused = this.isFocused();
      const hovered = this.isHovered();
      const active = this.isActive();
      const fast = enterTransition(spring.fast);
      this.tween(this.row().nativeElement, { outlineColor: focused ? 'var(--focus-ring, #6B97FF)' : 'transparent' }, fast);
      this.tween(
        this.line()?.nativeElement,
        { top: active ? 7 : 8, bottom: active ? 7 : 8, backgroundColor: focused ? 'var(--foreground)' : hovered ? LINE_HOVER : LINE_REST },
        fast,
      );
      for (const el of this.tinted()) this.tween(el.nativeElement, { color: active ? 'var(--foreground)' : 'var(--muted-foreground)' }, fast);
    });

    // The active pip goes full foreground. At rest it only shows at min;
    // elsewhere the mask hides it behind the handle line.
    afterRenderEffect(() => {
      const value = this.value();
      const steps = this.pipSteps();
      this.pips().forEach((pip, i) => {
        const isActivePip = steps[i] === value;
        this.tween(
          pip.nativeElement,
          { backgroundColor: isActivePip ? 'var(--foreground)' : 'var(--muted-foreground)', opacity: isActivePip ? 1 : 0.3 },
          enterTransition(spring.fast),
        );
      });
    });

    afterRenderEffect(() => {
      const visible = this.hoverPreview() !== null && !this.isPressed();
      this.tween(this.preview().nativeElement, { opacity: visible ? 1 : 0 }, { duration: 0.15 });
    });
  }

  private percentOf(value: number): number {
    const min = this.min();
    const max = this.max();
    return max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  // --- Motion-driven paint ---
  // Scrubber: fill straight from fillPercent; the line sits 9px behind the
  // fill edge and the 8px grab strip ends at it, both pushed in by zeroOffset
  // at min. Pips: the fill edge runs from 20px at p = 0 to the full width at
  // p = 1, the line is centered 12px in from each edge at the extremes, and a
  // 2px-feathered mask hides the pips under the fill.
  private paint() {
    const p = this.fillPercent.get();
    const zo = this.zeroOffset.get();
    const pct = p * 100;
    const pipsOffset = 20 - 20 * p - zo * 2.5;
    const line = untracked(this.line)?.nativeElement;
    const scrubFill = untracked(this.scrubFill)?.nativeElement;
    if (scrubFill) {
      scrubFill.style.width = `${pct}%`;
      if (line) line.style.left = `calc(${pct}% - 9px + ${zo}px)`;
      const handle = untracked(this.handle)?.nativeElement;
      if (handle) handle.style.left = `calc(${pct}% - 8px + ${zo}px)`;
    }
    const pipsFill = untracked(this.pipsFill)?.nativeElement;
    if (pipsFill) {
      pipsFill.style.width = `calc(${pct}% + ${pipsOffset}px)`;
      if (line) line.style.left = `calc(${pct}% + ${11 - 24 * p}px)`;
      const layer = untracked(this.pipsLayer)?.nativeElement;
      if (layer) {
        const mask = `linear-gradient(to right, transparent calc(${pct}% + ${pipsOffset}px), black calc(${pct}% + ${pipsOffset + 2}px))`;
        layer.style.setProperty('-webkit-mask-image', mask);
        layer.style.setProperty('mask-image', mask);
      }
    }
  }

  protected onEnter() {
    if (!this.disabled()) this.isHovered.set(true);
  }

  protected onLeave() {
    if (this.disabled()) return;
    this.isHovered.set(false);
    this.hoverPreview.set(null);
  }

  protected onMouseMove(e: MouseEvent) {
    if (this.disabled() || this.dragging || this.handleDragging) return;
    this.computeHoverPreview(e.clientX);
  }

  private computeHoverPreview(clientX: number) {
    const el = this.row().nativeElement;
    const rect = el.getBoundingClientRect();
    // clientWidth (padding box): CSS % and absolute left/width resolve to it.
    const w = el.clientWidth;
    if (w <= 0 || rect.width <= 0) return;
    // Normalize the cursor to layout space; offsetWidth minus clientWidth is
    // the border, split across both sides.
    const scale = rect.width / el.offsetWidth;
    const borderLeft = (el.offsetWidth - w) / 2;
    const clamped = Math.max(0, Math.min(w, (clientX - rect.left) / scale - borderLeft));
    const min = this.min();
    const max = this.max();
    const step = this.step();
    const pips = this.pipSteps();
    let snappedVal: number;
    if (this.variant() === 'pips') {
      if (pips.length <= 1) return;
      snappedVal = pips[Math.max(0, Math.min(pips.length - 1, Math.round((clamped / w) * (pips.length - 1))))];
    } else {
      const raw = min + (clamped / w) * (max - min);
      snappedVal = Math.max(min, Math.min(max, Math.round((raw - min) / step) * step + min));
    }
    const snappedX = (max === min ? 0 : (snappedVal - min) / (max - min)) * w;
    // The current handle position; for pips, the visual fill edge offset.
    const p = this.fillPercent.get();
    const handleX = this.variant() === 'pips' ? p * w + (20 - 20 * p - this.zeroOffset.get() * 2.5) : p * w;
    // Extend the bar to the row edges at the extremes so there's no gap.
    const edgeX = snappedVal === min ? 0 : snappedVal === max ? w : snappedX;
    this.hoverPreview.set({ left: Math.min(handleX, edgeX), width: Math.abs(edgeX - handleX), snappedValue: snappedVal, cursorX: snappedX });
  }

  // Visual x over visual width: the ratio holds at any ancestor scale.
  // Clamping maps presses in the 8px gutters to min or max.
  private valueFromX(clientX: number): number {
    const rect = this.row().nativeElement.getBoundingClientRect();
    const min = this.min();
    const max = this.max();
    const clamped = Math.max(0, Math.min(rect.width, clientX - rect.left));
    if (this.variant() === 'pips') {
      const pips = this.pipSteps();
      if (pips.length <= 1) return min;
      return pips[Math.max(0, Math.min(pips.length - 1, Math.round((clamped / rect.width) * (pips.length - 1))))];
    }
    const step = this.step();
    const snapped = Math.round((min + (clamped / rect.width) * (max - min) - min) / step) * step + min;
    return Math.max(min, Math.min(max, snapped));
  }

  private place(newVal: number, mode: 'spring' | 'set') {
    this.value.set(newVal);
    const percent = Math.max(0, Math.min(1, (newVal - this.min()) / (this.max() - this.min())));
    if (mode === 'set') this.fillPercent.set(percent);
    else springTo(this.fillPercent, percent, spring.fast);
    springTo(this.zeroOffset, newVal === this.min() ? this.zeroTarget() : 0, spring.fast);
  }

  // A press anywhere jumps to the snapped value; the fill springs there.
  protected onPointerDown(e: PointerEvent) {
    if (this.disabled()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    this.dragging = true;
    this.isPressed.set(true);
    this.place(this.valueFromX(e.clientX), 'spring');
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  // Scrubber: set directly, so the fill stays glued to the cursor. Pips:
  // spring per snap, so each jump between pips eases.
  protected onPointerMove(e: PointerEvent) {
    if (!this.dragging) return;
    this.place(this.valueFromX(e.clientX), this.variant() === 'scrubber' ? 'set' : 'spring');
  }

  // No settle step on release: every move already landed on a snapped value.
  protected onPointerUp() {
    this.dragging = false;
    this.isPressed.set(false);
    this.hoverPreview.set(null);
  }

  // Grabbing the handle sets the fill from the first event with no spring;
  // stopPropagation keeps the row's press handler from also firing.
  protected onHandleDown(e: PointerEvent) {
    if (this.disabled()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    this.handleDragging = true;
    this.isPressed.set(true);
    this.place(this.valueFromX(e.clientX), 'set');
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  protected onHandleMove(e: PointerEvent) {
    if (!this.handleDragging) return;
    this.place(this.valueFromX(e.clientX), 'set');
  }

  protected onHandleUp() {
    this.handleDragging = false;
    this.isPressed.set(false);
    this.hoverPreview.set(null);
  }
}
