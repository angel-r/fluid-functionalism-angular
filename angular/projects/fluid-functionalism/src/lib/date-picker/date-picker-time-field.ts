import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  InjectionToken,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { cn } from '../core/utils';
import { fontWeights } from '../core/font-weight';
import { injectSize } from '../core/size';
import { typeClass } from '../core/type-scale';
import { popupScrollAreaClass, popupViewportClass } from '../core/popup';
import { Elevated } from '../core/surface';
import { Icon } from '../core/icon';
import type { IconName } from '../core/icons';
import {
  FLUID_HOVER,
  FluidHoverItem,
  createFluidHover,
  type FluidHoverController,
} from '../fluid-hover/fluid-hover';
import { FluidHoverHighlight } from '../fluid-hover/fluid-hover-highlight';
import { ScrollArea } from '../scroll-area/scroll-area';
import { formatDuration, formatTime, nearestSlotIndex, parseTime, type TimeSlot } from './date-picker-time';
import {
  createDatePickerPopover,
  datePickerMotionClass,
  datePickerPopupClass,
  datePickerPositionerClass,
} from './date-picker-popover';

// ---------------------------------------------------------------------------
// Time field: an editable time with its own slot-list popover. The field is
// a segment of the date picker's hover scope; the list has its own fluid
// hover, and its rows never take focus (the field keeps it while the list
// moves, through aria-activedescendant).
// ---------------------------------------------------------------------------

/** The date picker's segment hover scope: the trigger, the time fields, the clear button. */
export const DATE_PICKER_SEGMENTS = new InjectionToken<FluidHoverController>('FF_DATE_PICKER_SEGMENTS');

let nextListId = 0;

@Component({
  selector: 'ff-date-picker-time-field',
  imports: [Elevated, Icon, FluidHoverItem, FluidHoverHighlight, ScrollArea],
  host: { style: 'display: contents' },
  providers: [{ provide: FLUID_HOVER, useFactory: () => inject(DatePickerTimeField).hover }],
  template: `
    <!-- The field sizes through invisible copies in the same grid cell: its
         own text (or placeholder) and the list's longest times, so it fits
         any font and keeps one width whichever time is picked. -->
    <span #segment data-slot="date-picker-time" [class]="fieldClass()" (click)="timeInput.focus()">
      @if (prefixIcon(); as icon) {
        <ff-icon [name]="icon" [size]="sizeClasses().icon" [strokeWidth]="1.5" class="shrink-0 text-muted-foreground" />
      }
      <span class="inline-grid">
        <span aria-hidden="true" class="invisible col-start-1 row-start-1 whitespace-pre tabular-nums">{{
          text() || placeholder()
        }}</span>
        @for (w of widestLabels(); track w) {
          <span aria-hidden="true" class="invisible col-start-1 row-start-1 whitespace-pre tabular-nums">{{ w }}</span>
        }
        <!-- size 1 drops a text input's intrinsic ~20ch width, so the
             invisible text copy decides the cell's width. -->
        <input
          #timeInput
          type="text"
          inputmode="text"
          size="1"
          role="combobox"
          aria-autocomplete="list"
          autocomplete="off"
          spellcheck="false"
          [attr.aria-label]="label()"
          [attr.aria-expanded]="open()"
          [attr.aria-controls]="open() ? listId : null"
          [attr.aria-activedescendant]="activeId()"
          [disabled]="disabled()"
          [placeholder]="placeholder()"
          [value]="text()"
          [class]="inputClass()"
          (focus)="onFocus()"
          (click)="openList()"
          (blur)="onBlur($event)"
          (input)="onInput($event)"
          (keydown)="onKeyDown($event)"
        />
      </span>
      <!-- The note steps aside while the time is being edited, keeping its
           space so the field doesn't shrink under the cursor. -->
      @if (duration(); as note) {
        <span [attr.data-editing]="editing() || null" [class]="editing() ? 'inline-flex invisible' : 'inline-flex'">
          <span data-slot="date-picker-duration" class="whitespace-nowrap text-muted-foreground">{{ note }}</span>
        </span>
      }
    </span>

    <div #positioner data-slot="date-picker-positioner" [class]="positionerClass" style="display: none">
      <div role="dialog" class="outline-none">
        <div #motion [class]="motionClass">
          @if (popover.mounted()) {
            <div data-slot="date-picker-popup" [ffElevated]="2" [shadowLevel]="3" [class]="popupClass">
              <ff-scroll-area [class]="scrollAreaClass" [viewportClass]="viewportClass">
                <div
                  #list
                  role="listbox"
                  [id]="listId"
                  [attr.aria-label]="label()"
                  [class]="listClass()"
                  (mousedown)="$event.preventDefault()"
                  (mouseenter)="hover.onMouseEnter()"
                  (mousemove)="hover.onMouseMove($event)"
                  (mouseleave)="hover.onMouseLeave()"
                  (click)="hover.onClick($event)"
                >
                  <ff-fluid-hover-highlight [hover]="hover" [hidden]="!open()" class="rounded-lg" />
                  @for (slot of slots(); track slot.minutes; let i = $index) {
                    <div
                      role="option"
                      [ffFluidHoverItem]="i"
                      [id]="listId + '-' + i"
                      [attr.aria-selected]="i === selectedIndex()"
                      [attr.data-fluid-hover-index]="i"
                      [class]="rowClass(i)"
                      (click)="pick(slot.minutes)"
                    >
                      <span class="inline-grid">
                        <!-- Trimmed like the visible label, so both boxes
                             match and the time shares a baseline with the
                             duration. -->
                        <span
                          aria-hidden="true"
                          class="invisible col-start-1 row-start-1 [text-box:trim-both_cap_alphabetic]"
                          [style.font-variation-settings]="semibold"
                          >{{ labels()[i] }}</span
                        >
                        @for (w of widestLabels(); track w) {
                          <span
                            aria-hidden="true"
                            class="invisible col-start-1 row-start-1 [text-box:trim-both_cap_alphabetic]"
                            [style.font-variation-settings]="semibold"
                            >{{ w }}</span
                          >
                        }
                        <span
                          class="col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]"
                          [style.font-variation-settings]="i === selectedIndex() ? semibold : normal"
                          >{{ labels()[i] }}</span
                        >
                      </span>
                      <!-- A description, a step quieter than the time it follows. -->
                      @if (slot.duration !== undefined) {
                        <span class="text-muted-foreground opacity-60 [text-box:trim-both_cap_alphabetic]">{{
                          durationLabel(slot.duration)
                        }}</span>
                      }
                    </div>
                  }
                </div>
              </ff-scroll-area>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePickerTimeField {
  /** Minutes after midnight, or null for an empty field. */
  readonly value = input<number | null>(null);
  readonly slots = input<TimeSlot[]>([]);
  readonly hourCycle = input<12 | 24>(24);
  readonly locale = input<string | undefined>(undefined);
  readonly placeholder = input('');
  readonly label = input('');
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The segment's slot in the date picker's hover scope. */
  readonly index = input(1);
  readonly segmentClass = input('');
  /** Where the list opens when there is no value (now, or the start). */
  readonly fallback = input<() => number>(() => 0);
  /** An icon inside the field, before the time (the start's clock, the end's
   *  arrow), so it shares the field's hover and click target. */
  readonly prefixIcon = input<IconName | undefined>(undefined);
  /** A muted note after the time, inside the field (the end's duration). */
  readonly duration = input<string | undefined>(undefined);
  /** A typed or picked time, in minutes after midnight. */
  readonly commit = output<number>();

  protected readonly sizeClasses = injectSize();
  private readonly segments = inject(DATE_PICKER_SEGMENTS, { optional: true });
  protected readonly listId = `ff-date-picker-times-${nextListId++}`;
  protected readonly semibold = fontWeights.semibold;
  protected readonly normal = fontWeights.normal;
  protected readonly positionerClass = datePickerPositionerClass;
  protected readonly motionClass = datePickerMotionClass;
  protected readonly popupClass = datePickerPopupClass;
  protected readonly scrollAreaClass = cn(
    popupScrollAreaClass,
    'max-h-[min(240px,var(--popup-available-height,240px))]',
  );
  protected readonly viewportClass = cn(popupViewportClass, 'scroll-fade');

  private readonly segment = viewChild<ElementRef<HTMLElement>>('segment');
  private readonly fieldRef = viewChild<ElementRef<HTMLInputElement>>('timeInput');
  private readonly positioner = viewChild<ElementRef<HTMLElement>>('positioner');
  private readonly motion = viewChild<ElementRef<HTMLElement>>('motion');
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  readonly open = signal(false);
  private readonly draft = signal<string | null>(null);
  /** The row an open lands on: the shown time, or the slot nearest the
   *  fallback when the field is empty. */
  private openTarget: number | null = null;

  readonly hover = createFluidHover(() => this.list()?.nativeElement, { gapClick: true });

  protected readonly compact = computed(() => this.sizeClasses().variant === 'compact');
  // Every row's time takes the width of the longest one, so the durations
  // after it line up in one column. Digits are tabular, so the longest string
  // is the widest; its AM/PM twin is measured too, as the letters differ.
  protected readonly labels = computed(() =>
    this.slots().map((slot) => formatTime(slot.minutes, this.hourCycle(), this.locale())),
  );
  protected readonly widestLabels = computed(() => {
    const longest = this.labels().reduce((a, b) => (b.length > a.length ? b : a), '');
    const twin = longest.replace(/AM|PM/, (m) => (m === 'AM' ? 'PM' : 'AM'));
    return twin === longest ? [longest] : [longest, twin];
  });
  private readonly display = computed(() => {
    const value = this.value();
    return value === null ? '' : formatTime(value, this.hourCycle(), this.locale());
  });
  protected readonly text = computed(() => this.draft() ?? this.display());
  protected readonly selectedIndex = computed(() => {
    const value = this.value();
    return value === null ? -1 : this.slots().findIndex((s) => s.minutes === value);
  });
  protected readonly editing = computed(() => this.open() || this.draft() !== null);
  protected readonly activeId = computed(() => {
    const active = this.hover.activeIndex();
    return active !== null && this.open() ? `${this.listId}-${active}` : null;
  });

  protected readonly fieldClass = computed(() =>
    cn(
      this.segmentClass(),
      // Icon-to-text gap matches Button's, at both sizes.
      this.compact() ? 'gap-1' : 'gap-1.5',
      'cursor-text has-[input:focus-visible]:ring-1 has-[input:focus-visible]:ring-[color:var(--focus-ring,#6B97FF)]',
      this.sizeClasses().field,
    ),
  );
  protected readonly inputClass = computed(() =>
    cn(
      'col-start-1 row-start-1 w-full min-w-0 bg-transparent p-0 text-left tabular-nums text-inherit outline-none placeholder:text-muted-foreground',
      this.sizeClasses().field,
      // The field's shape radius would clip the text selection's corners;
      // the rounded focus ring belongs to the whole segment instead.
      'rounded-none',
    ),
  );
  protected readonly listClass = computed(() =>
    cn(
      'relative flex flex-col p-1',
      this.slots().some((s) => s.duration !== undefined) ? 'min-w-[180px]' : 'min-w-[112px]',
    ),
  );

  protected readonly popover = createDatePickerPopover({
    open: this.open,
    kind: 'anchor',
    positioner: () => this.positioner()?.nativeElement,
    motion: () => this.motion()?.nativeElement,
    anchor: () => this.segment()?.nativeElement,
    align: 'start',
    dismiss: () => {
      this.commitDraft();
      this.closeList();
    },
  });

  constructor() {
    // The field is one segment of the picker's hover scope.
    effect((onCleanup) => {
      const el = this.segment()?.nativeElement;
      const index = this.index();
      const segments = this.segments;
      if (!el || !segments) return;
      untracked(() => segments.registerItem(index, el));
      onCleanup(() => segments.unregisterItem(index, el));
    });

    // The list opens on the shown time, centered. The popup mounts a frame
    // after `open`, so it retries each frame until the lit row is laid out
    // in its viewport, then stops: once per open.
    effect((onCleanup) => {
      if (!this.open()) return;
      untracked(() => this.hover.remeasure());
      let id = 0;
      let tries = 0;
      const attempt = () => {
        if (this.scrollToActive(true) || ++tries > 30) return;
        id = requestAnimationFrame(attempt);
      };
      id = requestAnimationFrame(attempt);
      onCleanup(() => cancelAnimationFrame(id));
    });

    inject(DestroyRef).onDestroy(() => this.open.set(false));
  }

  protected get field(): HTMLInputElement {
    return this.fieldRef()!.nativeElement;
  }

  protected rowClass(i: number) {
    const selected = i === this.selectedIndex();
    const active = i === this.hover.activeIndex();
    return cn(
      // The duration hugs the time: start-aligned, a small gap.
      'relative z-10 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg tabular-nums',
      this.sizeClasses().control,
      this.sizeClasses().itemPx,
      typeClass('body', this.compact() ? 'compact' : 'default'),
      'transition-[color] duration-80',
      selected || active ? 'text-foreground' : 'text-muted-foreground',
    );
  }

  protected durationLabel(minutes: number) {
    return formatDuration(minutes);
  }

  openList() {
    if (this.disabled() || this.open()) return;
    this.open.set(true);
    const slots = this.slots();
    const selected = this.selectedIndex();
    const target = selected >= 0 ? selected : nearestSlotIndex(slots, this.fallback()());
    this.openTarget = target >= 0 ? target : null;
    this.hover.setActiveIndex(target >= 0 ? target : null);
  }

  private closeList() {
    this.open.set(false);
    this.draft.set(null);
    this.hover.setActiveIndex(null);
  }

  /** An end list starts one step after its start; a typed end at or before
   *  the start is not a time it offers, so the draft is dropped instead. */
  private commitDraft() {
    const draft = this.draft();
    if (draft === null) return;
    const first = this.slots()[0];
    const floor = first?.duration !== undefined ? first.minutes - first.duration : -1;
    const parsed = parseTime(draft);
    if (parsed !== null && parsed > floor) this.commit.emit(parsed);
    this.draft.set(null);
  }

  protected pick(minutes: number) {
    this.commit.emit(minutes);
    this.closeList();
  }

  /** Centers the lit row once the list is laid out, and keeps a keyboard
   *  move in view. */
  private scrollToActive(center: boolean): boolean {
    const list = this.list()?.nativeElement;
    if (!list) return false;
    // Opening centers the shown time (always marked selected), or the lit
    // row when nothing is picked yet; a keyboard move follows the lit row.
    const lit = list.querySelector<HTMLElement>('[data-fluid-hover-active]');
    const target = this.openTarget;
    const row = center
      ? (list.querySelector<HTMLElement>('[aria-selected="true"]') ??
        (target !== null ? list.querySelector<HTMLElement>(`[data-fluid-hover-index="${target}"]`) : null) ??
        lit)
      : lit;
    const viewport = list.closest<HTMLElement>('[data-slot=scroll-area-viewport]');
    if (!row || !viewport || viewport.clientHeight === 0) return false;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (center) {
      viewport.scrollTop = top - viewport.clientHeight / 2 + row.offsetHeight / 2;
    } else if (top < viewport.scrollTop) {
      viewport.scrollTop = top - 4;
    } else if (bottom > viewport.scrollTop + viewport.clientHeight) {
      viewport.scrollTop = bottom - viewport.clientHeight + 4;
    }
    return true;
  }

  protected onFocus() {
    this.field.select();
    this.openList();
  }

  protected onBlur(e: FocusEvent) {
    if (this.list()?.nativeElement.contains(e.relatedTarget as Node | null)) return;
    this.commitDraft();
    this.closeList();
  }

  protected onInput(e: Event) {
    const next = (e.target as HTMLInputElement).value;
    this.draft.set(next);
    if (!this.open()) this.open.set(true);
    const parsed = parseTime(next);
    if (parsed !== null) {
      const i = nearestSlotIndex(this.slots(), parsed);
      this.hover.setActiveIndex(i >= 0 ? i : null);
      requestAnimationFrame(() => this.scrollToActive(true));
    }
  }

  protected onKeyDown(e: KeyboardEvent) {
    const slots = this.slots();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!this.open()) {
        this.openList();
        return;
      }
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const next = Math.min(Math.max((this.hover.activeIndex() ?? this.selectedIndex()) + dir, 0), slots.length - 1);
      this.hover.setActiveIndex(next);
      this.draft.set(formatTime(slots[next].minutes, this.hourCycle(), this.locale()));
      requestAnimationFrame(() => this.scrollToActive(false));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const draft = this.draft();
      const active = this.hover.activeIndex();
      if (draft !== null && parseTime(draft) !== null) {
        this.commitDraft();
      } else if (active !== null && slots[active]) {
        this.commit.emit(slots[active].minutes);
      }
      this.closeList();
      return;
    }
    if (e.key === 'Escape' && (this.open() || this.draft() !== null)) {
      e.preventDefault();
      e.stopPropagation();
      this.closeList();
    }
  }
}
