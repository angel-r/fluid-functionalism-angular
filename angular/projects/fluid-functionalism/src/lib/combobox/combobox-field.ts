import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { cva } from 'class-variance-authority';
import { cn } from '../core/utils';
import { Icon } from '../core/icon';
import type { IconDefinition, IconName } from '../core/icons';
import { injectShape } from '../core/shape';
import { injectSize, type SizeVariant } from '../core/size';
import { typeClass } from '../core/type-scale';
import { exitFallbackMs, spring } from '../core/springs';
import { type FluidAnimation, enterTransition, exitTransition, injectAnimateFluid } from '../core/motion';
import { Combobox, type ComboboxItemData, comboboxItemLabel } from './combobox-root';

export type ComboboxFieldVariant = 'bordered' | 'borderless';
export type ComboboxIcon = IconName | IconDefinition;

export const comboboxFieldVariants = cva(
  [
    'group flex items-center ring-1 cursor-text',
    'transition-all duration-80',
    'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        // Framed at rest; the fills step up on hover and focus like an
        // input field.
        bordered: 'ring-border bg-transparent hover:bg-muted/50 focus-within:bg-card',
        // Invisible at rest — the InputGroup field ladder: muted fill +
        // ring on hover, card fill when focused.
        borderless:
          'ring-transparent bg-transparent hover:bg-muted/50 hover:ring-border focus-within:bg-card focus-within:ring-border',
      },
    },
    defaultVariants: {
      variant: 'bordered',
    },
  },
);

// The clear and chevron buttons share one quiet style; they sit inside the
// field's ring so they need no frame of their own.
const fieldButtonClass =
  'flex shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-80 hover:text-foreground focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] data-[disabled]:pointer-events-none';
// The clear ✕ is a real icon button: the hover fill says "press me", where
// the chevron beside it only decorates the field it belongs to.
const clearButtonClass = cn(fieldButtonClass, 'hover:bg-hover active:bg-active transition-[color,background-color]');
// A chip's ✕ sits on the chip's own hover-tinted fill, so it steps up a notch.
const chipRemoveClass = cn(fieldButtonClass, 'rounded hover:bg-active');

const errorClass = 'text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] text-destructive pl-3';
const errorRingClass = 'ring-destructive/50 hover:ring-destructive/50 focus-within:ring-destructive/50';
const leadingIconClass =
  'shrink-0 text-muted-foreground transition-[color,stroke-width] duration-80 group-focus-within:text-foreground group-focus-within:stroke-[2]';
const inputBaseClass =
  'min-w-0 rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]';

/** Splits an icon input into the `name` / `icon` inputs of `<ff-icon>`. */
export function comboboxIconInputs(icon: ComboboxIcon | undefined | null) {
  if (icon === undefined || icon === null) return null;
  return typeof icon === 'string' ? { name: icon, icon: undefined } : { name: undefined, icon };
}

/**
 * The text input with the combobox keyboard model and ARIA wiring, shared by
 * the single field and the chips field.
 */
@Directive({
  selector: 'input[ffComboboxFieldInput]',
  host: {
    type: 'text',
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-haspopup': 'listbox',
    autocomplete: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
    '[attr.aria-expanded]': 'root.open() ? "true" : "false"',
    '[attr.aria-controls]': 'root.open() ? root.listId : null',
    '[attr.aria-activedescendant]': 'activeDescendant()',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-required]': 'root.required() ? "true" : null',
    '[disabled]': 'root.disabled()',
    '[value]': 'root.inputValue()',
    '(input)': 'onInput()',
    '(click)': 'onClick()',
    '(keydown)': 'root.onInputKeydown($event, element)',
  },
})
export class ComboboxFieldInput {
  readonly invalid = input(false);
  protected readonly root = inject(Combobox);
  readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  protected readonly activeDescendant = computed(() => {
    const h = this.root.safeHighlight();
    return this.root.open() && h ? `${this.root.listId}-${h.index}` : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(this.root.registerInput(this.element));
  }

  protected onInput() {
    this.root.setInputValue(this.element.value);
  }

  protected onClick() {
    if (!untracked(this.root.open)) this.root.setOpen(true);
  }
}

/** The trailing clear ✕ and chevron, shared by both fields. */
@Component({
  selector: 'ff-combobox-field-controls',
  imports: [Icon],
  host: { style: 'display: contents' },
  template: `
    @if (clearable()) {
      <!-- The ✕ only renders while there is something to clear; the fixed
           slot keeps the field's width steady either way. -->
      <span data-slot="combobox-clear-slot" [class]="slotClass()">
        @if (canClear()) {
          <button
            type="button"
            aria-label="Clear"
            [class]="clearClass()"
            [disabled]="root.disabled()"
            [attr.data-disabled]="root.disabled() ? '' : null"
            (mousedown)="$event.preventDefault()"
            (click)="root.clear()"
          >
            <ff-icon name="x" [size]="iconSize()" [strokeWidth]="1.5" />
          </button>
        }
      </span>
    }
    <!-- Not a tab stop: the field itself opens on ArrowDown or typing. The
         field's buttons keep focus in the input when pressed (Safari would
         otherwise blur it to nowhere and dismiss the popup). -->
    <button
      type="button"
      aria-label="Open"
      tabindex="-1"
      aria-haspopup="listbox"
      [attr.aria-expanded]="root.open() ? 'true' : 'false'"
      [attr.data-popup-open]="root.open() ? '' : null"
      [attr.data-disabled]="root.disabled() ? '' : null"
      [disabled]="root.disabled()"
      [class]="triggerClass()"
      (mousedown)="$event.preventDefault()"
      (click)="root.toggle()"
    >
      <svg
        [attr.width]="iconSize()"
        [attr.height]="iconSize()"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="transition-colors duration-80"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComboboxFieldControls {
  readonly clearable = input(false);
  readonly compact = input(false);
  readonly iconSize = input(16);
  protected readonly root = inject(Combobox);
  private readonly shape = injectShape();

  protected readonly canClear = computed(() => this.root.values().length > 0 || this.root.inputValue() !== '');
  protected readonly slotClass = computed(() =>
    cn('flex shrink-0 items-center justify-center', this.compact() ? 'size-5' : 'size-6'),
  );
  protected readonly clearClass = computed(() =>
    cn(clearButtonClass, this.shape().variant === 'pill' && 'rounded-full', this.compact() ? 'size-5' : 'size-6'),
  );
  protected readonly triggerClass = computed(() => cn(fieldButtonClass, this.compact() ? 'size-5' : 'size-6'));
}

/** Shared inputs and plumbing of the two fields. */
@Directive()
abstract class ComboboxFieldBase {
  readonly variant = input<ComboboxFieldVariant, ComboboxFieldVariant | undefined>('bordered', {
    transform: (v) => v ?? 'bordered',
  });
  /** Leading icon inside the field: an icon role or an icon definition. */
  readonly icon = input<ComboboxIcon | undefined>(undefined);
  readonly placeholder = input<string, string | undefined>('Search…', { transform: (v) => v ?? 'Search…' });
  /** Error message under the field; tints the ring and sets aria-invalid. */
  readonly error = input<string | undefined>(undefined);
  /** Render a ✕ that clears the selection and query. Its slot is always reserved. */
  readonly clearable = input(false, { transform: booleanAttribute });
  /** Size override for the field alone. Prefer `size` on `<ff-combobox>` so the popup matches. */
  readonly size = input<SizeVariant | undefined>(undefined);
  /** Forwarded to the text input. */
  readonly ariaLabel = input<string | undefined>(undefined, { alias: 'aria-label' });
  /** Forwarded to the text input as its id (pair with a `<label for>`). */
  readonly inputId = input<string | undefined>(undefined);
  /** Classes for the field (the popup's anchor). */
  readonly userClass = input('', { alias: 'class' });

  protected readonly root = inject(Combobox);
  protected readonly shape = injectShape();
  protected readonly sizeClasses = injectSize(() => this.size());
  protected readonly compact = computed(() => this.sizeClasses().variant === 'compact');
  protected readonly iconInputs = computed(() => comboboxIconInputs(this.icon()));
  protected readonly leadingIconClass = leadingIconClass;
  protected readonly errorClass = errorClass;

  protected readonly group = viewChild<ElementRef<HTMLElement>>('group');
  protected readonly fieldInput = viewChild.required(ComboboxFieldInput);

  constructor() {
    // The whole field is the popup's anchor, so the list spans it edge to edge.
    effect(() => {
      const group = this.group()?.nativeElement;
      if (group) this.root.anchor.set(group);
    });
    inject(DestroyRef).onDestroy(() => {
      const group = untracked(this.group)?.nativeElement;
      if (group && untracked(this.root.anchor) === group) this.root.anchor.set(null);
    });
  }

  /** A press on the field's padding or icon lands in the text input. */
  protected onGroupMousedown(e: MouseEvent) {
    const target = e.target as Element | null;
    if (!target || target.closest('input, button, [data-slot="combobox-chip"]')) return;
    e.preventDefault();
    this.fieldInput().element.focus();
  }

  /** The text input (the React forwarded ref). */
  get input(): HTMLInputElement {
    return this.fieldInput().element;
  }

  focus() {
    this.input.focus();
  }
}

/** The single-selection field: leading icon, text input, clear ✕, chevron. */
@Component({
  selector: 'ff-combobox-input',
  imports: [Icon, ComboboxFieldInput, ComboboxFieldControls],
  // The consumer's class styles the field, so the host draws no box (a
  // class it also carries never applies twice): the column below is the
  // layout element, React's plain wrapper div.
  host: {
    style: 'display: contents',
    // aria-label is forwarded to the input; the wrapper carries no name.
    '[attr.aria-label]': 'null',
  },
  template: `
    <div class="flex flex-col gap-1">
      <div
        #group
        data-slot="combobox-field"
        [class]="groupClass()"
        [attr.data-disabled]="root.disabled() ? '' : null"
        [attr.data-popup-open]="root.open() ? '' : null"
        (mousedown)="onGroupMousedown($event)"
        (focusout)="root.onFieldFocusout($event)"
      >
        @if (iconInputs(); as ic) {
          <ff-icon [name]="ic.name" [icon]="ic.icon" [size]="sizeClasses().icon" [strokeWidth]="1.5" [class]="leadingIconClass" />
        }
        <input
          ffComboboxFieldInput
          [invalid]="!!error()"
          [attr.placeholder]="placeholder()"
          [attr.aria-label]="ariaLabel() ?? null"
          [attr.id]="inputId() ?? null"
          [class]="inputClass()"
        />
        <ff-combobox-field-controls [clearable]="clearable()" [compact]="compact()" [iconSize]="sizeClasses().icon" />
      </div>
      @if (error()) {
        <span [class]="errorClass">{{ error() }}</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComboboxInput extends ComboboxFieldBase {
  protected readonly groupClass = computed(() => {
    const size = this.sizeClasses();
    const compact = this.compact();
    return cn(
      comboboxFieldVariants({ variant: this.variant() }),
      size.control,
      size.gap,
      compact ? 'px-2' : 'px-2.5',
      compact ? 'min-w-[128px]' : 'min-w-[160px]',
      this.shape().input,
      this.error() && errorRingClass,
      this.userClass(),
    );
  });

  protected readonly inputClass = computed(() =>
    cn(
      inputBaseClass,
      'flex-1',
      this.sizeClasses().field,
      // The caret is as tall as the line box (Chrome, Safari); the ladder's
      // leading keeps it in proportion to the field.
      this.compact() ? 'leading-5' : 'leading-6',
    ),
  );
}

interface ChipEntry {
  value: string;
  label: string;
  /** Dropped from the selection, still fading out (inert). */
  exiting: boolean;
}

/**
 * The multiple-selection field: one chip per selected item ahead of the text
 * input, wrapping onto new lines as they accumulate. Backspace in an empty
 * input removes the last chip; ArrowLeft walks into the chips, where
 * Backspace/Delete removes the focused one.
 */
@Component({
  selector: 'ff-combobox-chips',
  imports: [Icon, ComboboxFieldInput, ComboboxFieldControls],
  // The consumer's class styles the field, so the host draws no box (a
  // class it also carries never applies twice): the column below is the
  // layout element, React's plain wrapper div.
  host: {
    style: 'display: contents',
    // aria-label is forwarded to the input; the wrapper carries no name.
    '[attr.aria-label]': 'null',
  },
  template: `
    <div class="flex flex-col gap-1">
      <div
        #group
        data-slot="combobox-field"
        [class]="groupClass()"
        [attr.data-disabled]="root.disabled() ? '' : null"
        [attr.data-popup-open]="root.open() ? '' : null"
        (mousedown)="onGroupMousedown($event)"
        (focusout)="root.onFieldFocusout($event)"
      >
        @if (iconInputs(); as ic) {
          <!-- A row-height box keeps the icon centered on the first line. -->
          <span [class]="compact() ? 'flex shrink-0 items-center h-5' : 'flex shrink-0 items-center h-6'">
            <ff-icon [name]="ic.name" [icon]="ic.icon" [size]="sizeClasses().icon" [strokeWidth]="1.5" [class]="leadingIconClass" />
          </span>
        }
        <div #rows role="toolbar" aria-label="Selected" [class]="rowsClass()">
          @for (chip of chips(); track chip.value) {
            <!-- Chips pop in and out on the fast tier and slide into their new
                 slots; an exiting chip is lifted out of the flow at once and is
                 inert while it fades. They grow from the left edge, where the
                 typed text just was. -->
            <span
              class="inline-flex max-w-full shrink-0"
              style="transform-origin: 0% 50%"
              [attr.data-chip-value]="chip.value"
              [attr.data-exiting]="chip.exiting ? '' : null"
              [attr.inert]="chip.exiting ? '' : null"
              [style.pointer-events]="chip.exiting ? 'none' : null"
            >
              <div
                data-slot="combobox-chip"
                tabindex="-1"
                [attr.aria-label]="chip.label"
                [class]="chipClass()"
                (keydown)="onChipKeydown($event, chip.value)"
              >
                <span class="truncate">{{ chip.label }}</span>
                <button
                  type="button"
                  tabindex="-1"
                  [attr.aria-label]="'Remove ' + chip.label"
                  [class]="chipRemoveClass()"
                  [disabled]="root.disabled()"
                  (mousedown)="$event.preventDefault()"
                  (click)="root.remove(chip.value)"
                >
                  <ff-icon name="x" [size]="compact() ? 10 : 12" [strokeWidth]="2" />
                </button>
              </div>
            </span>
          }
          <!-- The field sizes to what is typed (size is the intrinsic width;
               flex-auto grows it across the rest of its row) so it stays beside
               the chips while it fits. It never animates: chips slide, the
               field snaps. -->
          <span class="flex min-w-6 flex-auto">
            <input
              ffComboboxFieldInput
              [invalid]="!!error()"
              [attr.size]="inputSize()"
              [attr.placeholder]="root.values().length ? null : placeholder()"
              [attr.aria-label]="ariaLabel() ?? null"
              [attr.id]="inputId() ?? null"
              [class]="inputClass()"
            />
          </span>
        </div>
        <ff-combobox-field-controls [clearable]="clearable()" [compact]="compact()" [iconSize]="sizeClasses().icon" />
      </div>
      @if (error()) {
        <span [class]="errorClass">{{ error() }}</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComboboxChips extends ComboboxFieldBase {
  private readonly injector = inject(Injector);
  private readonly animate = injectAnimateFluid();
  private readonly rows = viewChild.required<ElementRef<HTMLElement>>('rows');

  protected readonly chips = signal<ChipEntry[]>([]);
  private chipsSynced = false;
  private readonly exitTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** The field's pinned height (px); null until the first measure. */
  private fieldHeight: number | null = null;
  private heightAnimation: FluidAnimation | null = null;

  protected readonly groupClass = computed(() => {
    const size = this.sizeClasses();
    const compact = this.compact();
    return cn(
      comboboxFieldVariants({ variant: this.variant() }),
      // The spring owns the height; leaving it in transition-all would have
      // the 80ms CSS ease drag behind every spring frame.
      'transition-[color,background-color,border-radius,box-shadow,opacity]',
      // Grows with its chips. Rows top-align so the icon and controls hold
      // the first line while chips wrap; the vertical padding centers one
      // 24px (20px compact) row inside the ladder height.
      '!items-start',
      compact ? 'min-h-7 py-1' : 'min-h-9 py-1.5',
      size.gap,
      compact ? 'px-2' : 'px-2.5',
      compact ? 'min-w-[128px]' : 'min-w-[160px]',
      this.shape().input,
      this.error() && errorRingClass,
      this.userClass(),
    );
  });

  protected readonly rowsClass = computed(() =>
    cn(
      'relative flex min-w-0 flex-1 flex-wrap items-center gap-1',
      // A chip leads the field: the row pulls left so the chip sits an even
      // distance from every edge. An icon keeps the full inset.
      !this.icon() && this.root.values().length > 0 && '-ml-1',
    ),
  );

  protected readonly chipClass = computed(() =>
    cn(
      'inline-flex max-w-full shrink-0 items-center gap-0.5 bg-hover pl-2 pr-0.5 text-foreground outline-none',
      this.shape().variant === 'pill' ? 'rounded-full' : 'rounded-md',
      'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
      this.compact() ? 'h-5' : 'h-6',
      typeClass('caption', this.compact() ? 'compact' : 'default'),
    ),
  );

  protected readonly chipRemoveClass = computed(() =>
    cn(chipRemoveClass, this.shape().variant === 'pill' && 'rounded-full', this.compact() ? 'size-4' : 'size-5'),
  );

  protected readonly inputSize = computed(() => Math.max(1, this.root.inputValue().length + 1));

  protected readonly inputClass = computed(() =>
    cn(
      'w-full',
      inputBaseClass,
      this.sizeClasses().field,
      // Line box = row height, so the caret spans the chip row.
      this.compact() ? 'h-5 leading-5' : 'h-6 leading-6',
    ),
  );

  constructor() {
    super();
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(this.root.registerChips({ focusLast: () => this.focusLastChip() }));
    destroyRef.onDestroy(() => {
      this.exitTimers.forEach((t) => clearTimeout(t));
      this.heightAnimation?.stop();
    });

    effect(() => {
      const values = this.root.values();
      const byValue = this.root.itemsByValue();
      untracked(() => this.syncChips(values, byValue));
    });

    // The field springs to the chip rows' measured height (plus its vertical
    // padding) as chips wrap and unwrap, instead of snapping a row taller or
    // shorter. Measured from layout metrics, which ignore transforms.
    afterNextRender(() => {
      const rows = this.rows().nativeElement;
      const measure = () => this.measureRows(rows);
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(measure);
      ro.observe(rows);
      destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  private measureRows(rows: HTMLElement) {
    if (rows.offsetHeight <= 0) return;
    const target = rows.offsetHeight + (untracked(this.compact) ? 8 : 12);
    const group = untracked(this.group)?.nativeElement;
    if (!group) return;
    // First measure pins the field; every later one springs it.
    if (this.fieldHeight === null) group.style.height = `${target}px`;
    else if (this.fieldHeight !== target) {
      this.heightAnimation?.stop();
      this.heightAnimation = this.animate(group, { height: target }, enterTransition(spring.fast));
    }
    this.fieldHeight = target;
  }

  private chipWrappers(): HTMLElement[] {
    return Array.from(this.rows().nativeElement.querySelectorAll<HTMLElement>('[data-chip-value]'));
  }

  private liveChips(): HTMLElement[] {
    return this.chipWrappers()
      .filter((w) => !w.hasAttribute('data-exiting'))
      .map((w) => w.firstElementChild as HTMLElement);
  }

  private focusLastChip() {
    const last = this.liveChips().at(-1);
    if (!last) return false;
    last.focus();
    return true;
  }

  protected onChipKeydown(e: KeyboardEvent, value: string) {
    const live = this.liveChips();
    const index = live.findIndex((chip) => chip.parentElement?.getAttribute('data-chip-value') === value);
    if (index < 0) return;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        live[index - 1]?.focus();
        return;
      case 'ArrowRight':
        e.preventDefault();
        (live[index + 1] ?? this.input).focus();
        return;
      case 'Backspace':
      case 'Delete': {
        e.preventDefault();
        if (untracked(this.root.disabled)) return;
        const next = live[index + 1] ?? this.input;
        this.root.remove(value, false);
        next.focus();
        return;
      }
      case 'Escape':
        if (untracked(this.root.open)) {
          e.preventDefault();
          this.root.setOpen(false);
        }
        return;
      default:
        return;
    }
  }

  private syncChips(values: string[], byValue: Map<string, ComboboxItemData>) {
    const labelOf = (v: string) => {
      const item = byValue.get(v);
      return item ? comboboxItemLabel(item) : v;
    };
    const next: ChipEntry[] = values.map((v) => ({ value: v, label: labelOf(v), exiting: false }));
    // Chips present at the first render show as they are (initial={false}).
    if (!this.chipsSynced) {
      this.chipsSynced = true;
      this.chips.set(next);
      return;
    }
    const prev = untracked(this.chips);
    const wasLive = new Set(prev.filter((c) => !c.exiting).map((c) => c.value));
    const entering = values.filter((v) => !wasLive.has(v));
    const exiting: string[] = [];
    for (const chip of prev) {
      if (values.includes(chip.value)) continue;
      next.push(chip.exiting ? chip : { ...chip, exiting: true });
      if (!chip.exiting) exiting.push(chip.value);
    }
    const unchanged =
      next.length === prev.length &&
      next.every((c, i) => c.value === prev[i].value && c.label === prev[i].label && c.exiting === prev[i].exiting);
    if (unchanged) return;

    // Where every chip sits now, before the reflow: the slide starts here.
    const before = new Map<string, { left: number; top: number }>();
    for (const wrapper of this.chipWrappers()) {
      before.set(wrapper.getAttribute('data-chip-value')!, { left: wrapper.offsetLeft, top: wrapper.offsetTop });
    }
    this.chips.set(next);
    for (const v of entering) this.cancelExit(v);
    // Fallback release, so a stalled animation never leaves a ghost chip.
    for (const v of exiting) {
      this.exitTimers.set(
        v,
        setTimeout(() => this.dropExited(v), exitFallbackMs(spring.fast)),
      );
    }
    afterNextRender(() => this.animateChips(before, entering, exiting), { injector: this.injector });
  }

  private animateChips(before: Map<string, { left: number; top: number }>, entering: string[], exiting: string[]) {
    const wrappers = new Map(this.chipWrappers().map((w) => [w.getAttribute('data-chip-value')!, w]));
    // popLayout: lift exiting chips out of the flow at their old slots first,
    // so the field reflows now rather than after the fade.
    for (const v of exiting) {
      const el = wrappers.get(v);
      if (!el) continue;
      const at = before.get(v) ?? { left: el.offsetLeft, top: el.offsetTop };
      el.style.position = 'absolute';
      el.style.left = `${at.left}px`;
      el.style.top = `${at.top}px`;
      this.animate(el, { opacity: 0, scale: 0.9 }, exitTransition(spring.fast)).finished.then(() => this.dropExited(v));
    }
    for (const v of entering) {
      const el = wrappers.get(v);
      if (!el) continue;
      el.style.position = '';
      el.style.left = '';
      el.style.top = '';
      this.animate(el, { opacity: [0, 1], scale: [0.9, 1] }, enterTransition(spring.fast));
    }
    // layout: the chips that stayed slide from their old slots.
    for (const [v, el] of wrappers) {
      if (entering.includes(v) || el.hasAttribute('data-exiting')) continue;
      const at = before.get(v);
      if (!at) continue;
      const dx = at.left - el.offsetLeft;
      const dy = at.top - el.offsetTop;
      if (dx !== 0 || dy !== 0) this.animate(el, { x: [dx, 0], y: [dy, 0] }, enterTransition(spring.fast));
    }
  }

  private cancelExit(value: string) {
    clearTimeout(this.exitTimers.get(value));
    this.exitTimers.delete(value);
  }

  private dropExited(value: string) {
    this.cancelExit(value);
    this.chips.update((list) => {
      const filtered = list.filter((c) => !(c.value === value && c.exiting));
      return filtered.length === list.length ? list : filtered;
    });
  }
}
