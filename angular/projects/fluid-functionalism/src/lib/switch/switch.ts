import {
  ChangeDetectionStrategy,
  booleanAttribute,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { animate, motionValue, type MotionValue, type ValueAnimationTransition } from 'motion';
import { cn } from '../core/utils';
import { spring } from '../core/springs';
import { enterTransition } from '../core/motion';
import { ReducedMotion } from '../core/environment';
import { injectSize, type SizeVariant } from '../core/size';

// ---------------------------------------------------------------------------
// Switch is a whole labeled row: a click anywhere on it toggles, and the thumb
// can be dragged across the track. The thumb's x lives in a motion value that
// the pointer writes directly during a drag and that springs to its resting
// spot otherwise. Hover stretches the thumb into a pill; press stretches it
// further and squashes it.
//
// `checked` is a model: a toggle flips it and emits `toggle` (React's
// onToggle), so `[(checked)]` and `[checked]` + `(toggle)` both work. It also
// makes the switch a signal-forms checkbox control (`checked` model,
// `disabled` input, `touch` output).
// ---------------------------------------------------------------------------

// Track/thumb geometry per ladder step. The hover pill-extend is the same 2px
// at both steps; only the press extend/squash scales down with the thumb, so the
// compact switch keeps the same feel.
const METRICS = {
  default: {
    trackWidth: 34,
    trackHeight: 20,
    thumbSize: 16,
    pillExtend: 2,
    pressExtend: 4,
    pressShrink: 4,
  },
  compact: {
    trackWidth: 28,
    trackHeight: 16,
    thumbSize: 12,
    pillExtend: 2,
    pressExtend: 3,
    pressShrink: 3,
  },
} as const;

// 2px between a resting thumb and every track edge: each track is its thumb
// plus 4 (20 = 16 + 4, 16 = 12 + 4), so the thumb sits centered.
const THUMB_OFFSET = 2;
// Pointer travel (px) before a press turns into a drag. Under it the
// gesture stays a click, so a tap that wobbles a pixel still toggles.
const DRAG_DEAD_ZONE = 2;

let nextId = 0;

@Component({
  selector: 'ff-switch',
  template: `
    <span
      #track
      role="switch"
      data-slot="switch"
      [attr.aria-checked]="checked()"
      [attr.aria-labelledby]="labelId"
      [attr.aria-disabled]="disabled() || null"
      [attr.data-state]="checked() ? 'checked' : 'unchecked'"
      [attr.data-checked]="checked() ? '' : null"
      [attr.data-unchecked]="checked() ? null : ''"
      [attr.data-disabled]="disabled() ? '' : null"
      [attr.tabindex]="disabled() ? -1 : 0"
      [class]="trackClass"
      [style.width.px]="metrics().trackWidth"
      [style.height.px]="metrics().trackHeight"
      [style.background-color]="trackColor()"
      (click)="onTrackClick($event)"
      (keydown)="onTrackKeydown($event)"
      (blur)="touch.emit()"
    >
      <span #thumb data-slot="switch-thumb" class="absolute top-0 left-0 block rounded-full bg-white shadow-sm"></span>
    </span>
    <span [id]="labelId" data-slot="switch-label" [class]="labelClass()">{{ label() }}</span>
  `,
  host: {
    '[class]': 'hostClass()',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'hovered.set(false)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp()',
    '(pointercancel)': 'onPointerCancel()',
    '(click)': 'onRowClick()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Switch {
  /** Text label displayed next to the switch. */
  readonly label = input.required<string>();
  /** Whether the switch is on. Two-way bindable. */
  readonly checked = model(false);
  /** Disables the switch. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Overrides the thumb's spring (spring.moderate by default). */
  readonly thumbTransition = input<ValueAnimationTransition<number> | undefined>(undefined);
  /** Pins the switch to one step of the size ladder. Omitted, it follows the
   *  surrounding size provider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  /** Called by a click, the keyboard, or a drag released past the midpoint,
   *  after `checked` flipped. */
  readonly toggle = output<void>();
  /** The track lost focus (signal forms' touched state). */
  readonly touch = output<void>();

  protected readonly labelId = `ff-switch-label-${nextId++}`;
  protected readonly hovered = signal(false);
  private readonly pressed = signal(false);
  private readonly sizeClasses = injectSize(() => this.size());
  protected readonly metrics = computed(() => METRICS[this.sizeClasses().variant]);
  private readonly thumbTravel = computed(() => {
    const m = this.metrics();
    return m.trackWidth - m.thumbSize - THUMB_OFFSET * 2;
  });

  private readonly trackRef = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly thumbRef = viewChild.required<ElementRef<HTMLElement>>('thumb');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly reducedMotion = inject(ReducedMotion).value;

  // Drag state (plain fields, not signals: a drag must not re-render).
  private dragging = false;
  // didDrag outlives the pointerup by one frame so the click fired by the
  // same release can be swallowed.
  private didDrag = false;
  // Non-null only while a press is in progress; move, up and cancel ignore
  // events without it.
  private pointerStart: { clientX: number; originX: number } | null = null;
  private hasMounted = false;

  // The thumb's x is a motion value, not state: a drag writes it on every
  // pointermove without re-rendering, and springs pick up from wherever it was
  // left. y, width and height ride their own values so one render writes the
  // whole box.
  private readonly x: MotionValue<number> = motionValue(THUMB_OFFSET);
  private readonly y: MotionValue<number> = motionValue(THUMB_OFFSET);
  private readonly width: MotionValue<number> = motionValue(16);
  private readonly height: MotionValue<number> = motionValue(16);

  protected readonly trackClass = cn(
    'relative shrink-0 rounded-full outline-none cursor-pointer',
    'transition-colors duration-80',
    // Only on :focus-visible, so a click leaves no ring. The 2px offset is
    // filled with the background to part it from the track.
    'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  );

  // On: #6B97FF, darkening to #5C89F2 on hover. Off: --accent, mixing in 10%
  // of the overlay color on hover (darker in light mode, lighter in dark),
  // crossfaded by transition-colors over 80ms.
  protected readonly trackColor = computed(() =>
    this.checked()
      ? this.hovered()
        ? '#5C89F2'
        : '#6B97FF'
      : this.hovered()
        ? 'color-mix(in oklab, var(--accent), rgb(var(--overlay)) 10%)'
        : 'var(--accent)',
  );

  protected readonly hostClass = computed(() =>
    cn(
      // The whole row is the pointer target. touch-none stops the browser
      // from claiming a horizontal drag as a scroll (which would cancel it);
      // select-none keeps a drag from selecting the label.
      'relative z-10 flex items-center cursor-pointer select-none touch-none',
      this.sizeClasses().gap,
      this.sizeClasses().px,
      this.sizeClasses().variant === 'compact' ? 'py-1' : 'py-2',
      this.disabled() && 'opacity-50 pointer-events-none',
      this.userClass(),
    ),
  );

  protected readonly labelClass = computed(() =>
    cn(
      // text-box trim recenters the letterforms against the track; the track
      // is taller than the label, so layout doesn't change.
      '[text-box:trim-both_cap_alphabetic] transition-[color] duration-80',
      this.sizeClasses().text,
      // Brightens when on (muted → foreground over 80ms), so on/off reads in
      // the label as well as the track color.
      this.checked() ? 'text-foreground' : 'text-muted-foreground',
    ),
  );

  // Thumb shape. Press wins over hover: +pillExtend wide on hover,
  // +pressExtend wide and pressShrink shorter on press, with y moved down by
  // half the shrink so the thumb squashes toward its own center line.
  private readonly thumbBox = computed(() => {
    const m = this.metrics();
    const pressed = this.pressed();
    const width = pressed ? m.thumbSize + m.pressExtend : this.hovered() ? m.thumbSize + m.pillExtend : m.thumbSize;
    const height = pressed ? m.thumbSize - m.pressShrink : m.thumbSize;
    const y = pressed ? THUMB_OFFSET + m.pressShrink / 2 : THUMB_OFFSET;
    // When checked, the extra width grows leftward (x backs off by
    // extraWidth), so the outer edge stays pinned 2px from the track end
    // instead of poking past it.
    const extraWidth = width - m.thumbSize;
    const x = this.checked() ? THUMB_OFFSET + this.thumbTravel() - extraWidth : THUMB_OFFSET;
    return { x, y, width, height };
  });

  constructor() {
    const render = () => {
      const thumb = untracked(this.thumbRef).nativeElement;
      thumb.style.transform = `translateX(${this.x.get()}px) translateY(${this.y.get()}px)`;
      thumb.style.width = `${this.width.get()}px`;
      thumb.style.height = `${this.height.get()}px`;
    };
    const unsubscribe = [this.x, this.y, this.width, this.height].map((value) => value.on('change', render));

    // Sync the thumb with its box (hover, press, checked). Mid-drag the
    // pointer owns x, so x stands down; otherwise everything springs on
    // thumbTransition, or spring.moderate by default. The first render places
    // it with no animation, so a switch that mounts on doesn't slide across.
    afterRenderEffect(() => {
      const box = this.thumbBox();
      untracked(() => {
        if (!this.hasMounted) {
          this.hasMounted = true;
          this.x.set(box.x);
          this.y.set(box.y);
          this.width.set(box.width);
          this.height.set(box.height);
          render();
          return;
        }
        const transition = this.transition();
        if (!this.dragging) animate(this.x, box.x, transition);
        animate(this.y, box.y, transition);
        animate(this.width, box.width, transition);
        animate(this.height, box.height, transition);
      });
    });

    inject(DestroyRef).onDestroy(() => {
      unsubscribe.forEach((off) => off());
      [this.x, this.y, this.width, this.height].forEach((value) => value.destroy());
    });
  }

  /** Moves focus to the track. */
  focus(options?: FocusOptions) {
    this.trackRef().nativeElement.focus(options);
  }

  private transition(): ValueAnimationTransition<number> {
    if (this.reducedMotion()) return { duration: 0 };
    return this.thumbTransition() ?? (enterTransition(spring.moderate) as ValueAnimationTransition<number>);
  }

  private flip() {
    this.checked.set(!this.checked());
    this.toggle.emit();
  }

  // Hover is mouse-only: a finger has no hover, so on touch the thumb only
  // ever takes the press shape.
  protected onPointerEnter(e: PointerEvent) {
    if (e.pointerType === 'mouse') this.hovered.set(true);
  }

  protected onPointerDown(e: PointerEvent) {
    if (this.disabled()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.pressed.set(true);
    this.dragging = false;
    this.didDrag = false;
    // Start from where the thumb is now (even mid-spring), so the first drag
    // frame doesn't jump.
    this.pointerStart = { clientX: e.clientX, originX: this.x.get() };
    // Capture keeps move and up events on the row after the pointer leaves
    // it, so a drag can overshoot the track and still release.
    this.host.setPointerCapture?.(e.pointerId);
  }

  private dragRange() {
    // Clamp with the pressed width (the thumb stays stretched for the whole
    // drag), so it never pokes past either end of the track.
    const m = this.metrics();
    const min = THUMB_OFFSET;
    const max = m.trackWidth - THUMB_OFFSET - (m.thumbSize + m.pressExtend);
    return { min, max };
  }

  protected onPointerMove(e: PointerEvent) {
    if (!this.pointerStart) return;
    const delta = e.clientX - this.pointerStart.clientX;
    // Under the 2px dead zone this is still a click; past it, the thumb
    // follows the pointer 1:1.
    if (!this.dragging) {
      if (Math.abs(delta) < DRAG_DEAD_ZONE) return;
      this.dragging = true;
      this.x.stop();
    }
    const { min, max } = this.dragRange();
    this.x.set(Math.max(min, Math.min(max, this.pointerStart.originX + delta)));
  }

  protected onPointerUp() {
    if (!this.pointerStart) return;
    this.pressed.set(false);
    if (this.dragging) {
      // The release that ends a drag still fires a click; the row and the
      // track both check didDrag, so a drag never toggles twice.
      this.didDrag = true;
      this.dragging = false;
      const { min, max } = this.dragRange();
      // Past the midpoint of the drag range means on, short of it means off,
      // whichever side the drag started from.
      const shouldBeOn = this.x.get() > (min + max) / 2;
      // A side change toggles, and the new `checked` moves the thumb box, so
      // the sync effect springs on from where the drag let go. On the same
      // side the box may not change at all, so spring home here.
      if (shouldBeOn !== this.checked()) {
        this.flip();
      } else {
        const home = this.checked() ? THUMB_OFFSET + this.thumbTravel() : THUMB_OFFSET;
        animate(this.x, home, this.transition());
      }
      requestAnimationFrame(() => (this.didDrag = false));
    }
    this.pointerStart = null;
  }

  protected onPointerCancel() {
    if (!this.pointerStart) return;
    this.pressed.set(false);
    if (this.dragging) {
      this.dragging = false;
      // Gesture cancelled by the system: snap back without toggling.
      const home = this.checked() ? THUMB_OFFSET + this.thumbTravel() : THUMB_OFFSET;
      animate(this.x, home, this.transition());
    }
    this.pointerStart = null;
  }

  // A click anywhere on the row, label included, toggles, unless it is the
  // click that ends a drag.
  protected onRowClick() {
    if (this.disabled() || this.didDrag) return;
    this.flip();
  }

  // The track toggles itself; stopping the click here keeps the row's click
  // from toggling a second time.
  protected onTrackClick(e: MouseEvent) {
    e.stopPropagation();
    if (this.disabled() || this.didDrag) return;
    this.flip();
  }

  // The track is a span (as Base UI renders it), so it handles Space and
  // Enter itself; preventDefault keeps Space from scrolling the page.
  protected onTrackKeydown(e: KeyboardEvent) {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (this.disabled()) return;
    this.flip();
  }
}
