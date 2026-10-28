import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { cn, fontWeights, injectShape, injectSize, typeClass } from '@angel-r/fluid-functionalism-angular/core';

// ---------------------------------------------------------------------------
// ColorInput — one field of the panel's input row, two variants behind one
// API:
//
// - text (default): a draft-based text input (the hex field). Typing edits a
//   local draft that commits on blur (Enter blurs, Escape reverts). While the
//   field has focus, outside value changes leave the draft alone.
// - scrubbable: a numeric channel. React builds it on Base UI's NumberField;
//   here it is a hand-written spinbutton. Two gestures share one field: drag
//   sideways to scrub (pointer lock, a virtual ↔ cursor, 1px of travel per
//   step); press without dragging to edit as text (focus + select all). At
//   rest the input ignores the pointer so every press reaches the scrub area;
//   once editing, presses go to the input for caret placement. Keys: arrows
//   move by nudgeStep (default 1), Shift+arrows and PageUp/PageDown by
//   nudgeShiftStep (default 10), Home/End jump to min/max.
// ---------------------------------------------------------------------------

export type ColorInputAlign = 'left' | 'center' | 'right';
export type ColorInputMode = 'numeric' | 'decimal' | 'text';

const optionalNumber = (v: unknown): number | undefined =>
  v === undefined || v === null || v === '' ? undefined : Number(v);

const BASE_CLASS =
  'flex items-center bg-transparent hover:bg-hover active:bg-active transition-colors duration-80 focus-within:ring-1 focus-within:ring-[color:var(--focus-ring,#6B97FF)] select-none';
// The inset halves on touch screens, as on the channel fields: an 8-digit hex
// in 16px digits needs the room.
const TEXT_CLASS =
  'flex items-center px-2 pointer-coarse:px-1 bg-transparent hover:bg-hover active:bg-active transition-colors duration-80 focus-within:ring-1 focus-within:ring-[color:var(--focus-ring,#6B97FF)] select-none';

// Stands in for the OS cursor, which pointer lock hides: a black ↔ arrow with
// a white stroke and drop shadow, legible on any surface.
const SCRUB_CURSOR_SVG =
  '<svg width="24" height="14" viewBox="0 0 24 14" fill="#000" stroke="#fff" stroke-width="1" aria-hidden="true"><path d="M0.5 7l5-5v3.5h13V2l5 5-5 5V8.5h-13V12l-5-5z" /></svg>';

@Component({
  selector: 'ff-color-input',
  host: {
    '[class]': 'hostClass()',
    '[style.width]': 'width() ?? null',
  },
  template: `
    <ng-template #prefixTpl>
      @if (prefix()) {
        <span [class]="prefixClass()">{{ prefix() }}</span>
      }
    </ng-template>
    @if (scrubbable()) {
      <div
        #scrubArea
        data-slot="color-input-scrub-area"
        [class]="scrubAreaClass()"
        (pointerdown)="onScrubPointerDown($event)"
      >
        <ng-container *ngTemplateOutlet="prefixTpl" />
        <input
          #field
          type="text"
          role="spinbutton"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          [attr.aria-label]="ariaLabel()"
          [attr.inputmode]="resolvedInputMode()"
          [attr.aria-valuenow]="fieldValue()"
          [attr.aria-valuemin]="wrap() ? null : (min() ?? null)"
          [attr.aria-valuemax]="wrap() ? null : (max() ?? null)"
          [value]="draft()"
          [class]="inputClass()"
          [style.font-variation-settings]="fontWeight"
          (input)="draft.set($any($event.target).value)"
          (pointerdown)="onInputPointerDown($event)"
          (focus)="onScrubFocus($event)"
          (blur)="onScrubBlur()"
          (keydown)="onScrubKeyDown($event)"
        />
      </div>
    } @else {
      <ng-container *ngTemplateOutlet="prefixTpl" />
      <input
        #field
        [attr.aria-label]="ariaLabel()"
        [attr.inputmode]="resolvedInputMode()"
        [value]="draft()"
        [class]="inputClass()"
        [style.font-variation-settings]="fontWeight"
        (input)="draft.set($any($event.target).value)"
        (focus)="onTextFocus($event)"
        (blur)="onTextBlur()"
        (keydown)="onTextKeyDown($event)"
      />
    }
  `,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorInput {
  /** The display string the parent owns ("50%", "0.12", "6B97FF"). */
  readonly value = input.required<string>();
  readonly ariaLabel = input.required<string>();
  readonly width = input<string | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });
  readonly inputClassName = input<string | undefined>(undefined, { alias: 'inputClass' });
  readonly align = input<ColorInputAlign>('left');
  readonly prefix = input<string | undefined>(undefined);
  readonly inputMode = input<ColorInputMode | undefined>(undefined);
  readonly nudgeStep = input<number | undefined, unknown>(undefined, { transform: optionalNumber });
  readonly nudgeShiftStep = input<number | undefined, unknown>(undefined, { transform: optionalNumber });
  readonly hasPercent = input(false, { transform: booleanAttribute });
  readonly decimals = input<number | undefined, unknown>(undefined, { transform: optionalNumber });
  readonly scrubbable = input(false, { transform: booleanAttribute });
  readonly min = input<number | undefined, unknown>(undefined, { transform: optionalNumber });
  readonly max = input<number | undefined, unknown>(undefined, { transform: optionalNumber });
  /** With min and max, wrap (modulo) instead of clamping: angular values like hue. */
  readonly wrap = input(false, { transform: booleanAttribute });
  /** Fires with a display string in the same shape `value` uses. */
  readonly commit = output<string>();

  private readonly document = inject(DOCUMENT);
  private readonly shape = injectShape();
  private readonly sizeClasses = injectSize();
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly scrubArea = viewChild<ElementRef<HTMLElement>>('scrubArea');
  protected readonly fontWeight = fontWeights.normal;

  /** true = text mode (caret, typing); false = scrub mode (ew-resize cursor,
   *  input transparent to the pointer). Text fields are always editable. */
  protected readonly editing = signal(false);
  /** Set while the field holds focus for typing, so outside value changes
   *  leave the draft alone. */
  private interacting = false;
  /** Set on a scrub press, so the focus it gives the input is not taken as
   *  keyboard/programmatic focus. */
  private pointerDown = false;

  /** The parsed numeric value, or null for non-numeric text (hex). */
  protected readonly fieldValue = computed(() => {
    const n = parseFloat(this.value().replace('%', ''));
    return Number.isNaN(n) ? null : n;
  });

  /** The text the input shows at rest: the value (scrub fields re-format it). */
  private readonly restText = computed(() => {
    if (!this.scrubbable()) return this.value();
    const n = this.fieldValue();
    return n == null ? this.value() : this.formatField(n);
  });

  protected readonly draft = linkedSignal<string, string>({
    source: this.restText,
    computation: (text, previous) => (previous && this.interacting ? previous.value : text),
  });

  protected readonly resolvedInputMode = computed(
    () => this.inputMode() ?? (this.scrubbable() ? 'numeric' : 'text'),
  );
  private readonly compact = computed(() => this.sizeClasses().variant === 'compact');

  protected readonly hostClass = computed(() =>
    cn(
      this.scrubbable() ? BASE_CLASS : TEXT_CLASS,
      this.sizeClasses().control,
      this.shape().input,
      this.userClass(),
    ),
  );
  protected readonly prefixClass = computed(() =>
    cn('text-muted-foreground mr-1 select-none', typeClass('caption', this.compact() ? 'compact' : 'default')),
  );
  // Touch screens get 16px digits, and "100%" is 47px wide at 16px: the inset
  // halves there so it fits a 56px channel cell.
  protected readonly scrubAreaClass = computed(() =>
    cn('flex flex-1 min-w-0 items-center self-stretch px-2 pointer-coarse:px-1', !this.editing() && 'cursor-ew-resize'),
  );
  protected readonly inputClass = computed(() =>
    cn(
      'flex-1 min-w-0 bg-transparent text-foreground outline-none tabular-nums',
      this.sizeClasses().field,
      this.align() === 'center' && 'text-center',
      this.align() === 'right' && 'text-right',
      this.scrubbable() && !this.editing() && 'pointer-events-none',
      this.inputClassName(),
    ),
  );

  // ── Scrub gesture state ─────────────────────────────────────────────
  private scrubbing = false;
  private moved = false;
  private accumulated = 0;
  private scrubValue = 0;
  private lastX = 0;
  private cursorX = 0;
  private cursorY = 0;
  private cursorEl: HTMLElement | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.endScrub(false));
  }

  // ── Number helpers ──────────────────────────────────────────────────

  private formatNumber(n: number) {
    const decimals = this.decimals();
    return decimals != null ? n.toFixed(decimals) : String(Math.round(n));
  }

  private formatField(n: number) {
    const formatted = this.formatNumber(n);
    return this.hasPercent() ? `${formatted}%` : formatted;
  }

  /**
   * Clamps (or wraps), rounds to the field's precision and returns the
   * display string. The text field's wrap also maps max itself to min
   * (360 → 0), harmless for hue; the scrub field wraps only outside the
   * range (361 → 1, -1 → 359; exactly max stays put).
   */
  private bound(n: number): number {
    const min = this.min();
    const max = this.max();
    if (this.wrap() && min != null && max != null) {
      if (this.scrubbable() && n >= min && n <= max) return n;
      const range = max - min;
      return ((((n - min) % range) + range) % range) + min;
    }
    let bounded = n;
    if (min != null) bounded = Math.max(min, bounded);
    if (max != null) bounded = Math.min(max, bounded);
    return bounded;
  }

  private commitNumber(n: number) {
    const text = this.formatField(this.bound(n));
    this.draft.set(text);
    this.commit.emit(text);
  }

  // ── Text variant ────────────────────────────────────────────────────

  protected onTextFocus(e: FocusEvent) {
    this.interacting = true;
    // Focus selects everything, so typing replaces the old value.
    (e.target as HTMLInputElement).select();
  }

  protected onTextBlur() {
    this.interacting = false;
    const draft = this.draft();
    if (draft === this.value()) return;
    const numeric = parseFloat(draft.replace('%', ''));
    if (!Number.isNaN(numeric) && (this.min() != null || this.max() != null)) {
      this.commitNumber(numeric);
    } else {
      this.commit.emit(draft);
    }
  }

  protected onTextKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLInputElement;
    if (e.key === 'Enter') {
      target.blur();
    } else if (e.key === 'Escape') {
      this.draft.set(this.value());
      target.value = this.value();
      target.blur();
    } else if (
      // Arrow nudges only apply when the field declares a step. The hex
      // field declares none, so there the arrows keep moving the caret.
      (this.nudgeStep() != null || this.nudgeShiftStep() != null) &&
      (e.key === 'ArrowUp' || e.key === 'ArrowDown')
    ) {
      e.preventDefault();
      const step = e.shiftKey ? (this.nudgeShiftStep() ?? 10) : (this.nudgeStep() ?? 1);
      const cur = parseFloat(this.draft().replace('%', ''));
      if (Number.isNaN(cur)) return;
      this.commitNumber(cur + (e.key === 'ArrowUp' ? 1 : -1) * step);
    }
  }

  // ── Scrub variant: keyboard and typing ──────────────────────────────

  /** The value keyboard steps start from: the typed text while editing. */
  private currentNumber(): number | null {
    if (this.editing()) {
      const typed = parseFloat(this.draft().replace('%', ''));
      if (!Number.isNaN(typed)) return typed;
    }
    return this.fieldValue();
  }

  protected onScrubKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLInputElement;
    if (e.key === 'Enter') {
      target.blur();
      return;
    }
    if (e.key === 'Escape') {
      // Revert the draft: restore the committed value's text before blurring
      // so the blur commit is a no-op.
      this.draft.set(this.restText());
      target.value = this.restText();
      target.blur();
      return;
    }
    const step = this.nudgeStep() ?? 1;
    const largeStep = this.nudgeShiftStep() ?? 10;
    const cur = this.currentNumber();
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowUp':
        next = cur == null ? null : cur + (e.shiftKey ? largeStep : step);
        break;
      case 'ArrowDown':
        next = cur == null ? null : cur - (e.shiftKey ? largeStep : step);
        break;
      case 'PageUp':
        next = cur == null ? null : cur + largeStep;
        break;
      case 'PageDown':
        next = cur == null ? null : cur - largeStep;
        break;
      // Wrapping fields have no bounds (React gives NumberField none).
      case 'Home':
        next = this.wrap() ? null : (this.min() ?? null);
        break;
      case 'End':
        next = this.wrap() ? null : (this.max() ?? null);
        break;
      default:
        return;
    }
    if (next == null) return;
    e.preventDefault();
    this.commitNumber(roundToStep(next, step));
  }

  protected onScrubFocus(e: FocusEvent) {
    if (this.pointerDown) return; // scrub-initiated focus
    this.interacting = true;
    this.editing.set(true);
    (e.target as HTMLInputElement).select();
  }

  protected onScrubBlur() {
    const wasEditing = this.editing();
    this.interacting = false;
    this.editing.set(false);
    if (!wasEditing) return;
    // Commit-on-blur typing: an unreadable draft reverts; a changed number
    // commits through the clamp (or wrap).
    const typed = parseFloat(this.draft().replace('%', ''));
    if (Number.isNaN(typed)) {
      this.draft.set(this.restText());
      return;
    }
    if (this.formatField(this.bound(typed)) === this.restText()) {
      this.draft.set(this.restText());
      return;
    }
    this.commitNumber(typed);
  }

  /** While editing, the input handles caret placement and text selection
   *  itself instead of starting a scrub gesture. */
  protected onInputPointerDown(e: PointerEvent) {
    if (this.editing()) e.stopPropagation();
  }

  // ── Scrub variant: pointer gesture ──────────────────────────────────

  protected onScrubPointerDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.editing()) return;
    e.preventDefault();
    this.pointerDown = true;
    this.scrubbing = true;
    this.moved = false;
    this.accumulated = 0;
    this.scrubValue = this.fieldValue() ?? 0;
    this.lastX = e.clientX;
    this.cursorX = e.clientX;
    this.cursorY = e.clientY;
    // The input holds focus during the gesture (the focus ring shows), as
    // Base UI's ScrubArea does.
    this.field()?.nativeElement.focus({ preventScroll: true });
    this.document.addEventListener('pointermove', this.onDocPointerMove);
    this.document.addEventListener('pointerup', this.onDocPointerUp);
    this.document.addEventListener('pointercancel', this.onDocPointerUp);
  }

  private readonly onDocPointerMove = (e: PointerEvent) => {
    if (!this.scrubbing) return;
    const area = this.scrubArea()?.nativeElement;
    const locked = !!area && this.document.pointerLockElement === area;
    const dx = locked ? (e.movementX ?? 0) : e.clientX - this.lastX;
    this.lastX = e.clientX;
    if (dx === 0) return;
    if (!this.moved) {
      this.moved = true;
      if (e.pointerType === 'mouse') this.lockPointer(area);
    }
    this.moveCursor(dx, locked ? (e.movementY ?? 0) : e.clientY - this.cursorY);
    this.accumulated += dx;
    // pixelSensitivity 1: one step per pixel of travel.
    const steps = Math.trunc(this.accumulated);
    if (steps === 0) return;
    this.accumulated -= steps;
    const step = this.nudgeStep() ?? 1;
    let next = roundToStep(this.scrubValue + steps * step, step);
    // Bounded fields clamp as they scrub; wrapping fields run free and wrap
    // on commit.
    if (!this.wrap()) {
      const min = this.min();
      const max = this.max();
      if (min != null) next = Math.max(min, next);
      if (max != null) next = Math.min(max, next);
    }
    this.scrubValue = next;
    this.commitNumber(next);
  };

  private readonly onDocPointerUp = () => {
    if (!this.scrubbing) return;
    this.endScrub(true);
  };

  private endScrub(finish: boolean) {
    this.document.removeEventListener('pointermove', this.onDocPointerMove);
    this.document.removeEventListener('pointerup', this.onDocPointerUp);
    this.document.removeEventListener('pointercancel', this.onDocPointerUp);
    if (this.document.pointerLockElement && this.document.pointerLockElement === this.scrubArea()?.nativeElement) {
      this.document.exitPointerLock?.();
    }
    this.cursorEl?.remove();
    this.cursorEl = null;
    const wasScrubbing = this.scrubbing;
    this.scrubbing = false;
    if (!finish || !wasScrubbing) return;
    const input = this.field()?.nativeElement;
    this.pointerDown = false;
    if (this.moved) {
      // After a scrub, drop the focus the gesture placed on the input so the
      // field returns to its rest state.
      input?.blur();
    } else {
      // A press without a drag enters edit mode (focus + select).
      this.interacting = true;
      this.editing.set(true);
      input?.focus();
      input?.select();
    }
  }

  private lockPointer(area: HTMLElement | undefined) {
    if (!area?.requestPointerLock) return;
    try {
      const result = area.requestPointerLock() as unknown;
      if (result instanceof Promise) result.catch(() => undefined);
    } catch {
      // Pointer lock refused (iframe sandbox, unsupported): scrub without it.
    }
    this.showCursor();
  }

  private showCursor() {
    const el = this.document.createElement('span');
    el.setAttribute('data-slot', 'color-input-scrub-cursor');
    el.className = 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]';
    el.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:2147483647;';
    el.innerHTML = SCRUB_CURSOR_SVG;
    this.document.body.appendChild(el);
    this.cursorEl = el;
    this.positionCursor();
  }

  private moveCursor(dx: number, dy: number) {
    const view = this.document.defaultView;
    const width = view?.innerWidth || 0;
    this.cursorX += dx;
    this.cursorY += dy;
    // The virtual cursor wraps around the viewport edges, as the real one
    // would keep travelling under pointer lock.
    if (width > 0) this.cursorX = ((this.cursorX % width) + width) % width;
    this.positionCursor();
  }

  private positionCursor() {
    if (!this.cursorEl) return;
    this.cursorEl.style.transform = `translate3d(${this.cursorX - 12}px, ${this.cursorY - 7}px, 0)`;
  }
}

/** Drops float noise from step arithmetic (0.12 + 0.01 → 0.13). */
function roundToStep(n: number, step: number) {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number(n.toFixed(Math.min(10, decimals + 2)));
}
