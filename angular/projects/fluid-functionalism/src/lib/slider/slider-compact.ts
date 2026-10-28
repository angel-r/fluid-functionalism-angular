import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { cn, spring, enterTransition, fontWeights, injectShape } from '../core';
import {
  DOT_SIZE,
  HOVER_PREVIEW_BG,
  THUMB_SIZE,
  THUMB_SIZE_REST,
  TOOLTIP_TEXT_CLASS,
  TRACK_BG_HEIGHT,
  TRACK_INSET,
  nearestStepIndex,
  parseStepValues,
  pixelToValue,
  toStyleMap,
  toValueArray,
  radixRangeInsets,
  radixThumbLeft,
  valueToPixel,
  type HoverPreview,
  type SliderStyle,
  type SliderValue,
  type ValuePosition,
} from './slider-math';
import { injectMotionValues, injectTween, springTo, tooltipEnter, tooltipLeave } from './slider-motion';
import { SliderThumb } from './slider-thumb';
import { SliderValueDisplay, type SliderEditCommit } from './slider-value-display';

// ---------------------------------------------------------------------------
// SliderCompact — the compact-step design: a thumb on a pill track with
// ranges, step dots, a value list and a click-to-edit value.
//
// Pointer input is handled here, not by the hidden ARIA thumbs: a press snaps
// to the step grid and springs the thumb there (spring.moderate), a drag
// re-snaps on every move and sets the position directly, and release springs
// onto the final quantized value. The hidden thumbs handle focus, ARIA and
// keys only. Every moving layer (thumbs, fill, dot mask, tooltips) derives
// from one motion value per thumb, so they move together mid-spring.
// ---------------------------------------------------------------------------

const optionalBoolean = (v: unknown) => booleanAttribute(v);

@Component({
  selector: 'ff-slider-compact',
  imports: [NgTemplateOutlet, SliderThumb, SliderValueDisplay],
  host: { '[class]': 'hostClass()' },
  template: `
    <ng-template #valueDisplay>
      <!-- Not rendered in tooltip mode, where the thumb bubbles carry the value. -->
      @if (showValue() && valuePosition() !== 'tooltip') {
        <span
          ffSliderValueDisplay
          [values]="values()"
          [editingIndex]="editingIndex()"
          [min]="minValue()"
          [max]="maxValue()"
          [step]="step()"
          [stepValues]="stepValues()"
          [formatValue]="formatValue()"
          [label]="label()"
          [isRange]="isRange()"
          [isInteracting]="isInteracting()"
          (startEdit)="editingIndex.set($event)"
          (commitEdit)="commitEdit($event)"
          (cancelEdit)="editingIndex.set(null)"
        ></span>
      }
    </ng-template>

    @if (valuePosition() === 'top' || valuePosition() === 'left') {
      <ng-container *ngTemplateOutlet="valueDisplay" />
    }

    <!-- Track area. Tooltip mode adds 16px of top padding so the bubble above
         the thumb has room. -->
    <div
      class="relative flex-1 overflow-visible"
      [style.height.px]="areaHeight()"
      [style.padding-top.px]="valuePosition() === 'tooltip' ? 16 : 0"
      (pointerenter)="isHovered.set(true)"
      (pointerleave)="onAreaLeave()"
      (mousemove)="onAreaMouseMove($event)"
    >
      <!-- Tooltip values: shown while hovered or pressed, one bubble per thumb. -->
      @if (showValue() && valuePosition() === 'tooltip' && isInteracting()) {
        @for (i of thumbIndexes(); track i) {
          <div
            #thumbTooltip
            data-slot="slider-tooltip"
            class="absolute -translate-x-1/2 pointer-events-none z-20"
            style="top: -16px"
            (animate.enter)="enter($event)"
            (animate.leave)="leave($event)"
          >
            <span [class]="tooltipTextClass()" [style.font-variation-settings]="fw.normal">{{ formatValue()(values()[i]) }}</span>
          </div>
        }
      }

      <!-- Invisible ARIA slider. With a steps list it runs on indices
           (0..n-1, step 1), so arrow keys walk the list; aria-valuenow is then
           an index, so each thumb also announces the formatted value. -->
      <span
        dir="ltr"
        data-orientation="horizontal"
        class="absolute inset-0 opacity-0 pointer-events-none"
        style="--radix-slider-thumb-transform: translateX(-50%)"
        [style.height.px]="thumbSize"
        [attr.aria-disabled]="disabled()"
        [attr.data-disabled]="disabled() ? '' : null"
      >
        <span data-orientation="horizontal" class="w-full h-full">
          <span data-orientation="horizontal" [style.left]="ariaRange().left" [style.right]="ariaRange().right"></span>
        </span>
        @for (i of thumbIndexes(); track i) {
          <span
            style="transform: var(--radix-slider-thumb-transform); position: absolute"
            [style.left]="ariaThumbLeft(i)"
          >
            <span
              ffSliderThumb
              class="block outline-none"
              [style.width.px]="thumbSize"
              [style.height.px]="thumbSize"
              [value]="ariaValues()[i]"
              [min]="ariaMin()"
              [max]="ariaMax()"
              [step]="ariaStep()"
              [lowerBound]="i === 1 ? ariaValues()[0] : undefined"
              [upperBound]="i === 0 && isRange() ? ariaValues()[1] : undefined"
              [disabled]="disabled()"
              [label]="thumbAriaLabel(i)"
              [valueText]="stepValues() ? formatValue()(values()[i]) : undefined"
              (valueCommit)="onThumbCommit(i, $event)"
              (focusVisibleChange)="onThumbFocus(i, $event)"
            ></span>
          </span>
        }
      </span>

      <!-- Visual track with pointer handlers. py-2 adds 8px above and below
           the 20px thumb row, so the press target is 36px tall. -->
      <div
        #track
        data-slot="slider-track"
        class="relative w-full cursor-ew-resize py-2"
        [style.height.px]="thumbSize + 16"
        [style.opacity]="ready() ? 1 : 0"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp()"
        (pointercancel)="onPointerUp()"
      >
        <!-- Extended hit area — 8px beyond each edge. Presses out there clamp
             to min or max, so the ends are easy to hit. -->
        <div class="absolute cursor-ew-resize" style="left: -8px; right: -8px; top: 0; bottom: 0"></div>

        <!-- Hover value tooltip: waits out the 100ms delay, hides while
             pressed, and gives way in tooltip mode. -->
        @if (hoverTooltip(); as preview) {
          <div
            data-slot="slider-hover-tooltip"
            class="absolute -translate-x-1/2 pointer-events-none z-20"
            [style.left.px]="preview.cursorX"
            style="top: -20px"
            (animate.enter)="enter($event)"
            (animate.leave)="leave($event)"
          >
            <span [class]="tooltipTextClass()" [style.font-variation-settings]="fw.normal">{{ formatValue()(preview.snappedValue) }}</span>
          </div>
        }

        <!-- Track background. overflow-hidden clips the fill and hover bar to
             the pill, so they inherit its rounded ends. -->
        <div data-slot="slider-track-bg" [class]="trackBgClass()" [style]="trackBgStyle()">
          <!-- Filled range -->
          @if (!hideFill()) {
            <div #fill data-slot="slider-fill" [class]="fillClass()" [style]="fillUserStyle()"></div>
          }
          <!-- Hover preview: 40% accent, fading over 0.15s and hidden while
               pressed. The thumb end hides under the knob. -->
          <div
            #preview
            class="absolute h-full pointer-events-none z-[2]"
            [style.left.px]="hoverPreview() ? hoverPreview()!.left - trackInset : 0"
            [style.width.px]="hoverPreview()?.width ?? 0"
            [style.border-radius]="previewRadius()"
            [style.background-color]="previewBg"
          ></div>
        </div>

        <!-- Step dots — masked so the filled side is hidden. Muted at 30% and
             grown 1.25x on hover (spring.moderate). -->
        @if (stepDots().length > 0) {
          <div #dots class="absolute left-0 right-0 pointer-events-none" [style.top.px]="pillTop" [style.height.px]="trackBgHeight">
            @for (dot of stepDots(); track dot.value) {
              <div
                class="absolute pointer-events-none flex items-center justify-center"
                [style.left]="'calc(' + thumbSize / 2 + 'px + ' + dot.percent + ' * (100% - ' + thumbSize + 'px))'"
                style="top: 50%; width: 0; height: 0"
              >
                <div
                  #dot
                  data-slot="slider-step-dot"
                  class="rounded-full flex-shrink-0"
                  style="background-color: var(--muted-foreground); opacity: 0.3"
                ></div>
              </div>
            }
          </div>
        }

        <!-- Visual thumbs: pointer-events-none lets presses fall through to
             the track. A 20px box centered on the track holding the 16px knob. -->
        @for (i of thumbIndexes(); track i) {
          <span
            #thumbVisual
            data-slot="slider-thumb"
            class="flex items-center justify-center pointer-events-none"
            [style]="thumbBoxStyle"
          >
            <span
              class="block rounded-full"
              [style.width.px]="thumbSizeRest"
              [style.height.px]="thumbSizeRest"
              [style.background-color]="thumbColor() ?? 'white'"
              style="box-shadow: 0 1px 2px rgba(0,0,0,0.1)"
              [style.border]="thumbBorderColor() ? '1px solid ' + thumbBorderColor() : null"
            ></span>
            <!-- Focus ring: 24px, 4px outside the knob, shown only for
                 :focus-visible focus, so a pointer press never shows it. -->
            <span
              #ring
              class="absolute rounded-full border border-[color:var(--focus-ring,#6B97FF)] pointer-events-none"
              [style.width.px]="thumbSize + 4"
              [style.height.px]="thumbSize + 4"
            ></span>
          </span>
        }
      </div>
    </div>

    @if (valuePosition() === 'bottom' || valuePosition() === 'right') {
      <ng-container *ngTemplateOutlet="valueDisplay" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SliderCompact {
  readonly value = model.required<SliderValue>();
  readonly min = input(0, { transform: (v: number | undefined) => v ?? 0 });
  readonly max = input(100, { transform: (v: number | undefined) => v ?? 100 });
  readonly step = input(1, { transform: (v: number | undefined) => v ?? 1 });
  /** Discrete list of allowed values; min/max derive from its extremes and
   *  `step` is ignored. */
  readonly steps = input<number[] | undefined>(undefined);
  readonly showSteps = input(false, { transform: optionalBoolean });
  readonly showValue = input(true, { transform: (v: unknown) => (v === undefined ? true : booleanAttribute(v)) });
  readonly valuePosition = input<ValuePosition, ValuePosition | undefined>('left', { transform: (v) => v ?? 'left' });
  readonly formatValue = input<(v: number) => string, ((v: number) => string) | undefined>(String, {
    transform: (v) => v ?? String,
  });
  readonly label = input<string | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly trackClassName = input<string | undefined>(undefined);
  readonly trackStyle = input<SliderStyle | undefined>(undefined);
  readonly fillClassName = input<string | undefined>(undefined);
  readonly fillStyle = input<SliderStyle | undefined>(undefined);
  readonly hideFill = input(false, { transform: optionalBoolean });
  readonly thumbColor = input<string | undefined>(undefined);
  readonly thumbBorderColor = input<string | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  protected readonly fw = fontWeights;
  protected readonly thumbSize = THUMB_SIZE;
  protected readonly thumbSizeRest = THUMB_SIZE_REST;
  protected readonly trackInset = TRACK_INSET;
  protected readonly trackBgHeight = TRACK_BG_HEIGHT;
  // py-2's 8px plus 1px to center the 18px pill on the 20px thumb row.
  protected readonly pillTop = 8 + (THUMB_SIZE - TRACK_BG_HEIGHT) / 2;
  protected readonly previewBg = HOVER_PREVIEW_BG;
  protected readonly thumbBoxStyle = {
    width: `${THUMB_SIZE}px`,
    height: `${THUMB_SIZE}px`,
    'margin-top': `${-THUMB_SIZE / 2}px`,
    position: 'absolute',
    top: '50%',
    left: '0px',
    'z-index': '10',
  };
  protected readonly enter = tooltipEnter;
  protected readonly leave = tooltipLeave;

  private readonly shape = injectShape();
  private readonly tween = injectTween();
  private readonly destroyRef = inject(DestroyRef);

  // --- Derived values ---
  protected readonly isRange = computed(() => Array.isArray(this.value()));
  protected readonly values = computed(() => toValueArray(this.value()));
  protected readonly thumbIndexes = computed(() => (this.isRange() ? [0, 1] : [0]));
  // Keyed on the joined string so a fresh array with the same entries keeps
  // its identity.
  private readonly stepsKey = computed(() => this.steps()?.join(',') ?? '');
  protected readonly stepValues = computed(() => parseStepValues(this.stepsKey() ? this.stepsKey().split(',').map(Number) : null));
  protected readonly minValue = computed(() => this.stepValues()?.[0] ?? this.min());
  protected readonly maxValue = computed(() => this.stepValues()?.at(-1) ?? this.max());

  // The hidden thumbs run on indices in steps mode.
  protected readonly ariaValues = computed(() => {
    const list = this.stepValues();
    return list ? this.values().map((v) => nearestStepIndex(v, list)) : this.values();
  });
  protected readonly ariaMin = computed(() => (this.stepValues() ? 0 : this.minValue()));
  protected readonly ariaMax = computed(() => (this.stepValues() ? this.stepValues()!.length - 1 : this.maxValue()));
  /** The hidden range span and thumb wrappers, placed as Radix Slider places them. */
  protected readonly ariaRange = computed(() => radixRangeInsets(this.ariaValues(), this.ariaMin(), this.ariaMax()));
  protected ariaThumbLeft(i: number): string {
    return radixThumbLeft(this.ariaValues()[i], this.ariaMin(), this.ariaMax(), this.thumbSize);
  }
  protected readonly ariaStep = computed(() => (this.stepValues() ? 1 : this.step()));

  // --- State ---
  protected readonly isHovered = signal(false);
  protected readonly isPressed = signal(false);
  protected readonly editingIndex = signal<number | null>(null);
  protected readonly hoverPreview = signal<HoverPreview | null>(null);
  protected readonly focusedThumb = signal<number | null>(null);
  // Set 100ms into a hover; reset as soon as the hover ends.
  private readonly hoverDelayDone = signal(false);
  protected readonly ready = signal(false);
  // Also drives the value label's normal → semibold weight shift.
  protected readonly isInteracting = computed(() => this.isHovered() || this.isPressed());

  // The preview bar appears on the first move; only the tooltip waits, so
  // sweeping the cursor across the slider doesn't flash it.
  protected readonly hoverTooltip = computed(() => {
    const preview = this.hoverPreview();
    const show = this.isHovered() && this.hoverDelayDone();
    return preview && show && !this.isPressed() && this.valuePosition() !== 'tooltip' ? preview : null;
  });

  // --- Non-reactive drag bookkeeping ---
  // Layout width, unaffected by ancestor CSS transforms.
  private trackWidth = 0;
  // True while a pointer drag owns the thumbs; the value-sync and resize
  // handlers stand down so they never fight the pointer.
  private dragging = false;
  private activeDragThumb = 0;
  private initialSyncDone = false;

  // Each thumb's left offset in layout px.
  private readonly motionX = injectMotionValues(2);

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly thumbVisuals = viewChildren<ElementRef<HTMLElement>>('thumbVisual');
  private readonly rings = viewChildren<ElementRef<HTMLElement>>('ring');
  private readonly thumbTooltips = viewChildren<ElementRef<HTMLElement>>('thumbTooltip');
  private readonly fill = viewChild<ElementRef<HTMLElement>>('fill');
  private readonly dots = viewChild<ElementRef<HTMLElement>>('dots');
  private readonly dotEls = viewChildren<ElementRef<HTMLElement>>('dot');
  private readonly preview = viewChild.required<ElementRef<HTMLElement>>('preview');

  protected readonly hostClass = computed(() =>
    cn(
      // touch-none: a touch drag moves the thumb instead of scrolling.
      'flex flex-col gap-0 w-full select-none touch-none overflow-visible',
      this.valuePosition() === 'left' || this.valuePosition() === 'right' ? 'flex-row items-center gap-2 mb-2' : 'flex-col',
      this.disabled() && 'opacity-50 pointer-events-none',
      this.userClass(),
    ),
  );

  protected readonly areaHeight = computed(() => {
    const position = this.valuePosition();
    return position === 'left' || position === 'right' ? THUMB_SIZE + 16 : THUMB_SIZE + (position === 'tooltip' ? 16 : 0);
  });

  protected readonly tooltipTextClass = computed(() => cn(TOOLTIP_TEXT_CLASS, this.shape().bg));
  protected readonly trackBgClass = computed(() =>
    cn('absolute border border-border overflow-hidden rounded-full', this.trackClassName()),
  );
  // The user's trackStyle wins over the transparent default; a background
  // shorthand drops the default outright, since Angular applies style keys in
  // sorted order and the longhand would otherwise land after it.
  protected readonly trackBgStyle = computed(() => {
    const user = toStyleMap(this.trackStyle());
    const base: Record<string, string> = {
      height: `${TRACK_BG_HEIGHT}px`,
      top: `${this.pillTop}px`,
      left: `${TRACK_INSET}px`,
      right: `${TRACK_INSET}px`,
    };
    if (!('background' in user)) base['background-color'] = 'transparent';
    return { ...base, ...user };
  });
  protected readonly fillClass = computed(() =>
    cn('absolute h-full bg-selected/50 dark:bg-accent/40', this.fillClassName()),
  );
  protected readonly fillUserStyle = computed(() => toStyleMap(this.fillStyle()));
  protected readonly previewRadius = computed(() => {
    const p = this.hoverPreview();
    return p && p.cursorX > p.left ? '0 9999px 9999px 0' : '9999px 0 0 9999px';
  });

  // One dot per list entry or grid step, as a fraction of thumb travel; the
  // template applies the same THUMB_SIZE / 2 inset as valueToPixel.
  protected readonly stepDots = computed(() => {
    if (!this.showSteps()) return [];
    const min = this.minValue();
    const max = this.maxValue();
    const list = this.stepValues();
    if (list) return list.map((v) => ({ value: v, percent: max === min ? 0 : (v - min) / (max - min) }));
    const step = this.step();
    return Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => {
      const v = min + i * step;
      return { value: v, percent: (v - min) / (max - min) };
    });
  });

  constructor() {
    for (const mv of this.motionX) mv.on('change', () => this.paint());

    // Show the hover tooltip after a 100ms delay.
    effect((onCleanup) => {
      if (!this.isHovered()) {
        this.hoverDelayDone.set(false);
        return;
      }
      const id = setTimeout(() => this.hoverDelayDone.set(true), 100);
      onCleanup(() => clearTimeout(id));
    });

    // Initial sync: place the thumbs from the measured width with no
    // animation. The track stays at opacity 0 until `ready`, so the first
    // frame never shows thumbs parked at 0 sliding into place.
    afterNextRender({
      write: () => {
        const w = this.track().nativeElement.offsetWidth;
        this.trackWidth = w;
        const v = this.values();
        this.motionX[0].set(valueToPixel(v[0], this.minValue(), this.maxValue(), w));
        if (this.isRange() && v[1] !== undefined) this.motionX[1].set(valueToPixel(v[1], this.minValue(), this.maxValue(), w));
        this.initialSyncDone = true;
        this.ready.set(true);
        this.observeResize();
      },
    });

    // Keyboard and programmatic changes spring on spring.moderate. Skipped
    // mid-drag: the drag already placed the thumb.
    effect(() => {
      const v = this.values();
      const min = this.minValue();
      const max = this.maxValue();
      const isRange = this.isRange();
      untracked(() => {
        if (!this.initialSyncDone || this.dragging) return;
        const tw = this.trackWidth;
        if (tw <= 0) return;
        springTo(this.motionX[0], valueToPixel(v[0], min, max, tw), spring.moderate);
        if (isRange && v[1] !== undefined) springTo(this.motionX[1], valueToPixel(v[1], min, max, tw), spring.moderate);
      });
    });

    // Repaint motion-driven styles whenever their elements (re)appear.
    afterRenderEffect(() => {
      this.thumbVisuals();
      this.thumbTooltips();
      this.fill();
      this.dots();
      this.isRange();
      this.paint();
    });

    // Focus ring: opacity on spring.fast.
    afterRenderEffect(() => {
      const focused = this.focusedThumb();
      this.rings().forEach((ring, i) =>
        this.tween(ring.nativeElement, { opacity: focused === i ? 1 : 0 }, enterTransition(spring.fast)),
      );
    });

    // Hover preview bar: fades over 0.15s, hidden while pressed.
    afterRenderEffect(() => {
      const visible = this.hoverPreview() !== null && !this.isPressed();
      this.tween(this.preview().nativeElement, { opacity: visible ? 1 : 0 }, { duration: 0.15 });
    });

    // Step dots grow 1.25x while hovered.
    afterRenderEffect(() => {
      const size = this.isHovered() ? DOT_SIZE * 1.25 : DOT_SIZE;
      for (const dot of this.dotEls()) this.tween(dot.nativeElement, { width: size, height: size }, enterTransition(spring.moderate));
    });
  }

  // --- Motion-driven paint ---
  // Fill: single runs pill start → thumb center, range center → center;
  // `- TRACK_INSET` converts to the inset pill's own px. The dot mask feathers
  // 2px at each thumb center so dots on the filled side hide.
  private paint() {
    const x0 = this.motionX[0].get();
    const x1 = this.motionX[1].get();
    const xs = [x0, x1];
    const range = untracked(this.isRange);
    untracked(this.thumbVisuals).forEach((el, i) => (el.nativeElement.style.transform = `translateX(${xs[i]}px)`));
    untracked(this.thumbTooltips).forEach((el, i) => (el.nativeElement.style.left = `${xs[i] + THUMB_SIZE / 2}px`));
    const fill = untracked(this.fill)?.nativeElement;
    if (fill) {
      fill.style.left = `${range ? x0 + THUMB_SIZE / 2 - TRACK_INSET : 0}px`;
      fill.style.width = `${range ? x1 - x0 : x0 + THUMB_SIZE / 2 - TRACK_INSET}px`;
    }
    const dots = untracked(this.dots)?.nativeElement;
    if (dots) {
      const left = x0 + THUMB_SIZE / 2;
      const right = x1 + THUMB_SIZE / 2;
      const mask = range
        ? `linear-gradient(to right, black ${left - 2}px, transparent ${left}px, transparent ${right}px, black ${right + 2}px)`
        : `linear-gradient(to right, transparent ${left}px, black ${left + 2}px)`;
      dots.style.setProperty('-webkit-mask-image', mask);
      dots.style.setProperty('mask-image', mask);
    }
  }

  // On resize the thumbs spring (spring.moderate) to their new pixel spots
  // instead of jumping; skipped mid-drag.
  private observeResize() {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      this.trackWidth = w;
      if (this.dragging || !this.initialSyncDone) return;
      const v = this.values();
      springTo(this.motionX[0], valueToPixel(v[0], this.minValue(), this.maxValue(), w), spring.moderate);
      if (this.isRange() && v[1] !== undefined) springTo(this.motionX[1], valueToPixel(v[1], this.minValue(), this.maxValue(), w), spring.moderate);
    });
    ro.observe(this.track().nativeElement);
    this.destroyRef.onDestroy(() => ro.disconnect());
  }

  // --- Per-thumb accessible names ---
  protected thumbAriaLabel(index: number): string | undefined {
    const label = this.label();
    if (!this.isRange()) return label;
    if (!label) return index === 0 ? 'Minimum' : 'Maximum';
    return index === 0 ? `${label} minimum` : `${label} maximum`;
  }

  // Range mode replaces only the moving thumb's entry. Click-to-edit commits
  // come through here too.
  private emitChange(thumbIndex: number, newValue: number) {
    if (this.isRange()) {
      const next = [...this.values()] as [number, number];
      next[thumbIndex] = newValue;
      this.value.set(next);
    } else {
      this.value.set(newValue);
    }
  }

  // Each thumb stops half a thumb (10px) short of the other, so the 16px
  // knobs may overlap a little but never swap sides.
  private clampForRange(px: number, thumbIndex: number): number {
    if (!this.isRange()) return px;
    return thumbIndex === 0
      ? Math.min(px, this.motionX[1].get() - THUMB_SIZE * 0.5)
      : Math.max(px, this.motionX[0].get() + THUMB_SIZE * 0.5);
  }

  /** Cursor → clamped thumb offset in layout px, normalized for ancestor CSS
   *  scale so it matches the motion values. `null` when the track has no size. */
  private localThumbPx(clientX: number): { px: number; width: number } | null {
    const trackEl = this.track().nativeElement;
    const rect = trackEl.getBoundingClientRect();
    const width = trackEl.offsetWidth;
    if (width <= 0 || rect.width <= 0) return null;
    const scale = rect.width / width;
    const localX = (clientX - rect.left) / scale - THUMB_SIZE / 2;
    return { px: Math.max(0, Math.min(width - THUMB_SIZE, localX)), width };
  }

  private snapPx(px: number, width: number): number {
    const snapped = pixelToValue(px, this.minValue(), this.maxValue(), this.step(), width, this.stepValues());
    return this.clampForRange(valueToPixel(snapped, this.minValue(), this.maxValue(), width), this.activeDragThumb);
  }

  protected onPointerDown(e: PointerEvent) {
    if (this.disabled()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const local = this.localThumbPx(e.clientX);
    if (!local) return;
    // The nearer thumb takes the press; a tie (stacked thumbs) goes to the first.
    this.activeDragThumb = this.isRange()
      ? Math.abs(local.px - this.motionX[0].get()) <= Math.abs(local.px - this.motionX[1].get())
        ? 0
        : 1
      : 0;
    this.dragging = true;
    this.isPressed.set(true);
    const finalPx = this.snapPx(local.px, local.width);
    springTo(this.motionX[this.activeDragThumb], finalPx, spring.moderate);
    // Derived from the clamped pixel, so the emitted value matches where the
    // range clamp actually left the thumb.
    this.emitChange(
      this.activeDragThumb,
      pixelToValue(finalPx, this.minValue(), this.maxValue(), this.step(), local.width, this.stepValues()),
    );
    // Capture keeps the drag alive when the pointer leaves the track.
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  protected onPointerMove(e: PointerEvent) {
    if (!this.dragging) return;
    const local = this.localThumbPx(e.clientX);
    if (!local) return;
    // Set, not animated: the thumb steps along the grid under the cursor.
    const finalPx = this.snapPx(local.px, local.width);
    this.motionX[this.activeDragThumb].set(finalPx);
    this.emitChange(
      this.activeDragThumb,
      pixelToValue(finalPx, this.minValue(), this.maxValue(), this.step(), local.width, this.stepValues()),
    );
  }

  // Spring settle to the final quantized position: catches a thumb the range
  // clamp left between steps. Clearing the preview keeps the stale pre-drag
  // bar from fading back in.
  protected onPointerUp() {
    if (!this.dragging) return;
    this.dragging = false;
    this.isPressed.set(false);
    this.hoverPreview.set(null);
    const tw = this.trackWidth;
    const mv = this.motionX[this.activeDragThumb];
    const snapped = pixelToValue(mv.get(), this.minValue(), this.maxValue(), this.step(), tw, this.stepValues());
    springTo(mv, valueToPixel(snapped, this.minValue(), this.maxValue(), tw), spring.moderate);
  }

  // In steps mode the hidden thumbs run on indices; map back to values.
  // Ignored while a pointer drag owns the value.
  protected onThumbCommit(index: number, next: number) {
    if (this.dragging) return;
    const list = this.stepValues();
    this.emitChange(index, list ? list[Math.round(next)] : next);
  }

  protected onThumbFocus(index: number, visible: boolean) {
    if (visible) this.focusedThumb.set(index);
    else this.focusedThumb.update((prev) => (prev === index ? null : prev));
  }

  protected commitEdit({ index, value }: SliderEditCommit) {
    this.emitChange(index, value);
    this.editingIndex.set(null);
  }

  protected onAreaLeave() {
    this.isHovered.set(false);
    this.hoverPreview.set(null);
  }

  protected onAreaMouseMove(e: MouseEvent) {
    if (this.dragging) return;
    const trackEl = this.track().nativeElement;
    const rect = trackEl.getBoundingClientRect();
    const width = trackEl.offsetWidth;
    if (width <= 0 || rect.width <= 0) return;
    // Normalize to layout space so the THUMB_SIZE / TRACK_INSET constants
    // match the cursor's coordinate space under an ancestor CSS scale.
    const scale = rect.width / width;
    const layoutX = Math.max(0, Math.min(width, (e.clientX - rect.left) / scale));
    this.computeHoverPreview(layoutX, width);
  }

  // The bar previews what a click would change: it runs from the nearer
  // thumb's center (ties go to the first) to the snapped hover value.
  private computeHoverPreview(cursorX: number, trackWidth: number) {
    const min = this.minValue();
    const max = this.maxValue();
    const list = this.stepValues();
    const usable = trackWidth - THUMB_SIZE;
    const clampedPx = Math.max(0, Math.min(usable, cursorX - THUMB_SIZE / 2));
    const rawVal = usable > 0 ? (clampedPx / usable) * (max - min) + min : min;
    const snappedVal = list
      ? list[nearestStepIndex(rawVal, list)]
      : Math.max(min, Math.min(max, Math.round((rawVal - min) / this.step()) * this.step() + min));
    const snappedPercent = max === min ? 0 : (snappedVal - min) / (max - min);
    const snappedX = THUMB_SIZE / 2 + snappedPercent * usable;
    const c0 = this.motionX[0].get() + THUMB_SIZE / 2;
    const c1 = this.motionX[1].get() + THUMB_SIZE / 2;
    const nearest = this.isRange() && Math.abs(snappedX - c0) > Math.abs(snappedX - c1) ? c1 : c0;
    // Extend the bar to the track edges at the extremes so there's no gap.
    const edgeX = snappedVal === min ? 0 : snappedVal === max ? trackWidth : snappedX;
    this.hoverPreview.set({
      left: Math.min(nearest, edgeX),
      width: Math.abs(edgeX - nearest),
      snappedValue: snappedVal,
      cursorX: snappedX,
    });
  }
}
