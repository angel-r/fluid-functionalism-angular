import {
  ChangeDetectionStrategy,
  booleanAttribute,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  cn,
  fontWeights,
  Icon,
  type IconDefinition,
  type IconName,
  injectShape,
  injectSize,
  type SizeVariant,
} from '@angel-r/fluid-functionalism-angular/core';
import { FLUID_HOVER, createFluidHover } from '@angel-r/fluid-functionalism-angular/fluid-hover';

// ---------------------------------------------------------------------------
// InputGroup stacks labelled text fields that share one fluid hover scope.
// At rest a field has no fill and no visible ring. The field nearest the
// pointer shows a faint fill and its ring; the focused field lifts to the
// card surface. There is no separate highlight element: each field draws its
// own state.
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-input-group',
  template: '<ng-content />',
  providers: [{ provide: FLUID_HOVER, useFactory: () => inject(InputGroup).hover }],
  host: {
    '[class]': 'hostClass()',
    '(mouseenter)': 'hover.onMouseEnter()',
    '(mousemove)': 'hover.onMouseMove($event)',
    '(mouseleave)': 'hover.onMouseLeave()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputGroup {
  /** Pins the group's fields to one step of the size ladder (default 36px,
   *  compact 28px). Omitted, they follow the surrounding size provider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly hover = createFluidHover(() => this.host);

  // `relative` makes this element the fields' offsetParent — the fluid hover
  // engine measures items via offsetTop and compares against
  // container-relative pointer coords, so both must share this origin.
  protected readonly hostClass = computed(() => cn('relative flex flex-col gap-3 w-72 max-w-full', this.userClass()));
}

let nextId = 0;

@Component({
  selector: 'ff-input-field',
  imports: [Icon],
  template: `
    <!-- Label — sr-only when hidden so the field keeps its accessible name and
         the for/id wiring. An invisible semibold copy shares the grid cell and
         reserves the bold width, so a heavier label never shifts the layout. -->
    <label [id]="labelId" [htmlFor]="inputId" [class]="labelClass()">
      <span class="col-start-1 row-start-1 invisible" [style.font-variation-settings]="semibold" aria-hidden="true">{{
        label()
      }}</span>
      <span [class]="labelTextClass()" [style.font-variation-settings]="normal">{{ label() }}</span>
    </label>

    <div data-slot="input-container" [class]="containerClass()" (mousedown)="onContainerMousedown($event)">
      <!-- The icon wakes with the field: muted → foreground and stroke
           1.5 → 2 over 80ms. ff-icon updates the same <svg> in place, so the
           CSS transition runs. -->
      @if (iconName(); as name) {
        <ff-icon [name]="name" [size]="sizeClasses().icon" [strokeWidth]="iconStroke()" [class]="iconClass()" />
      } @else if (icon()) {
        <ff-icon [icon]="iconDefinition()" [size]="sizeClasses().icon" [strokeWidth]="iconStroke()" [class]="iconClass()" />
      }
      @if (multiline()) {
        <!-- Enter keeps its native meaning here: a new line, never a submit. -->
        <textarea
          #control
          [id]="inputId"
          [rows]="minRows()"
          [attr.name]="name() || null"
          [attr.autocomplete]="autocomplete() ?? null"
          [value]="value()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [attr.aria-invalid]="error() ? 'true' : null"
          [attr.aria-describedby]="error() ? errorId : null"
          [attr.data-invalid]="error() ? '' : null"
          [class]="inputClass()"
          [style.font-variation-settings]="normal"
          (input)="onInput($event)"
          (focus)="isFocused.set(true)"
          (blur)="onBlur()"
        ></textarea>
      } @else {
        <input
          #control
          [id]="inputId"
          [type]="type()"
          [attr.name]="name() || null"
          [attr.autocomplete]="autocomplete() ?? null"
          [value]="value()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [attr.aria-invalid]="error() ? 'true' : null"
          [attr.aria-describedby]="error() ? errorId : null"
          [attr.data-invalid]="error() ? '' : null"
          [class]="inputClass()"
          [style.font-variation-settings]="normal"
          (input)="onInput($event)"
          (focus)="isFocused.set(true)"
          (blur)="onBlur()"
        />
      }
    </div>

    <!-- Error message, pinned visible while the error input stands. Same inset
         as the label above. -->
    @if (error(); as error) {
      <div data-slot="input-error" [id]="errorId" [class]="errorClass()" [style.font-variation-settings]="normal">
        {{ error }}
      </div>
    }
  `,
  host: {
    '[attr.data-fluid-hover-index]': 'index()',
    '[attr.data-invalid]': 'error() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-focused]': 'isFocused() ? "" : null',
    '[class]': 'hostClass()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputField {
  /** Label text above the input. */
  readonly label = input.required<string>();
  /** Keep the label for assistive tech but don't render it — for inline
   *  fields (a toolbar search) where the placeholder carries the meaning. */
  readonly labelHidden = input(false, { transform: booleanAttribute });
  /** Placeholder text. */
  readonly placeholder = input('');
  /** Leading icon inside the input: an icon role from the icon map, or an
   *  icon definition. */
  readonly icon = input<IconName | IconDefinition | undefined>(undefined);
  /** Position index within the group. */
  readonly index = input.required<number>();
  /** The input value. Two-way bindable (`[(value)]`); React's onChange is
   *  `(valueChange)`. */
  readonly value = model('');
  /** Error message shown below the input; marks the field invalid. */
  readonly error = input<string | undefined>(undefined);
  /** Disables the input. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Renders a textarea instead of the input, for free-text notes: it grows
   *  with its content from `minRows` to `maxRows`, then scrolls, and Enter
   *  inserts a new line. Label, placeholder, error and states are unchanged. */
  readonly multiline = input(false, { transform: booleanAttribute });
  /** With `multiline`, the rows the textarea shows when empty. */
  readonly minRows = input(3, { transform: numberAttribute });
  /** With `multiline`, the rows it grows to before it scrolls. */
  readonly maxRows = input(8, { transform: numberAttribute });
  /** The input's `type` (text by default). Ignored with `multiline`. */
  readonly type = input('text');
  /** The input's `name`, for native forms. */
  readonly name = input('');
  /** The input's `autocomplete` hint. */
  readonly autocomplete = input<string | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });
  /** The input lost focus (signal forms' touched state). */
  readonly touch = output<void>();

  private readonly id = nextId++;
  protected readonly inputId = `ff-input-field-${this.id}`;
  protected readonly labelId = `ff-input-field-${this.id}-label`;
  protected readonly errorId = `ff-input-field-${this.id}-error`;
  protected readonly semibold = fontWeights.semibold;
  protected readonly normal = fontWeights.normal;

  private readonly hover = inject(FLUID_HOVER, { optional: true });
  private readonly group = inject(InputGroup, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly control = viewChild.required<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('control');
  private readonly shape = injectShape();
  protected readonly sizeClasses = injectSize(() => this.group?.size());
  private readonly compact = computed(() => this.sizeClasses().variant === 'compact');
  protected readonly isFocused = signal(false);

  // Lit when nearest the pointer OR focused, so tabbing through the form
  // shows the same cue as hovering it.
  private readonly isActive = computed(() => this.hover?.activeIndex() === this.index());
  private readonly labelActive = computed(() => this.isActive() || this.isFocused());

  protected readonly iconName = computed(() => {
    const icon = this.icon();
    return typeof icon === 'string' ? icon : undefined;
  });
  protected readonly iconDefinition = computed(() => {
    const icon = this.icon();
    return typeof icon === 'string' ? undefined : icon;
  });

  protected readonly hostClass = computed(() =>
    cn('flex flex-col gap-1 cursor-text', this.disabled() && 'opacity-50 pointer-events-none', this.userClass()),
  );

  protected readonly labelClass = computed(() =>
    cn(
      this.labelHidden() ? 'sr-only' : 'inline-grid',
      this.sizeClasses().text,
      // One notch tighter than the ladder's control padding — the field ring
      // is invisible at rest, so the roomier inset reads as a gap.
      !this.labelHidden() && (this.compact() ? 'pl-2' : 'pl-2.5'),
    ),
  );

  protected readonly labelTextClass = computed(() =>
    cn('col-start-1 row-start-1', this.error() ? 'text-destructive' : 'text-muted-foreground'),
  );

  // The first match wins: disabled, error, focused, hovered, rest. An error
  // stays frameless at rest (the red label and message already carry it) and
  // shows its red ring on hover or focus. Focus lifts the field to the card
  // surface; hover only tints it.
  protected readonly containerClass = computed(() => {
    const focused = this.isFocused();
    const active = this.isActive();
    let bg: string;
    let ring: string;
    if (this.disabled()) {
      bg = 'bg-transparent';
      ring = 'ring-border';
    } else if (this.error()) {
      bg = focused ? 'bg-card' : active ? 'bg-destructive-light/60' : 'bg-transparent';
      ring = focused || active ? 'ring-destructive/50' : 'ring-transparent';
    } else if (focused) {
      bg = 'bg-card';
      ring = 'ring-border';
    } else if (active) {
      bg = 'bg-muted/50';
      ring = 'ring-border';
    } else {
      bg = 'bg-transparent';
      ring = 'ring-transparent';
    }
    const size = this.sizeClasses();
    const px = this.compact() ? 'px-2' : 'px-2.5';
    return cn(
      this.multiline()
        ? // Grows with the textarea. The vertical padding adds one row of the
          // body leading (20px, compact 18px) back up to the control height
          // (36px, compact 28px), so a one-row field lines up with the rest.
          `flex items-start ${size.gap} ${this.shape().input} ${px} ${this.compact() ? 'py-[5px]' : 'py-2'} ring-1 transition-all duration-80`
        : // Fixed height so the field sits exactly on the ladder's control height.
          `flex items-center ${size.gap} ${this.shape().input} ${px} ${size.control} ring-1 transition-all duration-80`,
      bg,
      ring,
    );
  });

  protected readonly iconStroke = computed(() => (this.labelActive() ? 2 : 1.5));
  protected readonly iconClass = computed(() =>
    cn(
      'shrink-0 transition-[color,stroke-width] duration-80',
      // Centred on the first line: (20 - 16) / 2, and (18 - 14) / 2 compact.
      this.multiline() && 'mt-0.5',
      this.labelActive() ? 'text-foreground' : 'text-muted-foreground',
    ),
  );

  protected readonly inputClass = computed(() =>
    cn(
      'w-full rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]',
      this.multiline() && 'block resize-none',
      this.sizeClasses().field,
    ),
  );

  protected readonly errorClass = computed(() =>
    cn(
      'text-destructive',
      this.compact()
        ? 'text-[length:var(--fs-caption-compact,11px)] leading-[var(--lh-caption-compact,14px)] pl-2'
        : 'text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] pl-2.5',
    ),
  );

  constructor() {
    effect((onCleanup) => {
      const index = this.index();
      const hover = this.hover;
      if (!hover) return;
      untracked(() => hover.registerItem(index, this.host));
      onCleanup(() => hover.unregisterItem(index, this.host));
    });

    // Multiline auto-grow: minRows to maxRows of the line height, scrolling
    // past maxRows (the same rule as input-message's composer).
    let lineHeight: { el: HTMLTextAreaElement; compact: boolean; value: number } | null = null;
    const resize = (el: HTMLTextAreaElement) => {
      el.style.height = 'auto';
      const compact = untracked(this.compact);
      if (!lineHeight || lineHeight.el !== el || lineHeight.compact !== compact) {
        // Cached: it only changes with the size step, the font or zoom.
        const parsed = parseFloat(getComputedStyle(el).lineHeight);
        lineHeight = { el, compact, value: Number.isNaN(parsed) ? (compact ? 18 : 20) : parsed };
      }
      const min = lineHeight.value * untracked(this.minRows);
      const max = lineHeight.value * untracked(this.maxRows);
      el.style.height = `${Math.min(Math.max(el.scrollHeight, min), max)}px`;
      el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
    };
    afterRenderEffect(() => {
      if (!this.multiline()) return;
      const el = this.control().nativeElement as HTMLTextAreaElement;
      this.value();
      this.minRows();
      this.maxRows();
      this.compact();
      untracked(() => resize(el));
    });
    // Re-measure when the width changes (a dialog opening, a phone rotating):
    // the same text wraps to a different number of lines. Width-gated so the
    // observer never loops on its own height writes.
    afterRenderEffect((onCleanup) => {
      if (!this.multiline() || typeof ResizeObserver === 'undefined') return;
      const el = this.control().nativeElement as HTMLTextAreaElement;
      let lastWidth = el.offsetWidth;
      const observer = new ResizeObserver(() => {
        if (el.offsetWidth === lastWidth) return;
        lastWidth = el.offsetWidth;
        resize(el);
      });
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
  }

  /** Moves focus to the input. */
  focus(options?: FocusOptions) {
    this.control().nativeElement.focus(options);
  }

  protected onInput(e: Event) {
    this.value.set((e.target as HTMLInputElement).value);
  }

  protected onBlur() {
    this.isFocused.set(false);
    this.touch.emit();
  }

  // A press anywhere on the box (icon, padding) focuses the input, without
  // disturbing the input's own caret placement.
  protected onContainerMousedown(e: MouseEvent) {
    const input = this.control().nativeElement;
    if (e.target === input) return;
    e.preventDefault();
    input.focus();
  }
}
