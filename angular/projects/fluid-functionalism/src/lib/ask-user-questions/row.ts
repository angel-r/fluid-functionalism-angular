import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { cn } from '../core/utils';
import { fontWeights } from '../core/font-weight';
import { spring } from '../core/springs';
import { typeClass } from '../core/type-scale';
import { injectShape } from '../core/shape';
import { Icon } from '../core/icon';
import { focusRowOnPress } from '../radio-group/group-focus';
import { AuqPresence, fastWithFade } from './presence';

/**
 * One answer row: a numbered chip, the body (projected), and the
 * single-select submit arrow. Registered with the flow's fluid hover list by
 * the `[ffFluidHoverItem]` placed next to it. Selection, keyboard and click
 * handling stay with the flow, which binds them on the row.
 */
@Component({
  selector: '[ffAskUserQuestionRow]',
  imports: [Icon, NgTemplateOutlet, AuqPresence],
  template: `
    <!-- The arrow keeps the same animation in either slot. -->
    <ng-template #arrow>
      <span
        data-slot="auq-arrow"
        [ffAuqPresence]="showArrow()"
        [presenceFrom]="{ opacity: 0, scale: 0.6 }"
        [presenceEnter]="arrowEnter"
        [presenceExit]="arrowExit"
        [attr.aria-hidden]="arrowClickable() ? null : 'true'"
        [attr.role]="arrowClickable() ? 'button' : null"
        [class]="arrowClass()"
        (click)="onArrow($event)"
      >
        <ff-icon name="arrow-right" [size]="arrowSize()" [strokeWidth]="2" [class]="arrowIconClass()" />
      </span>
    </ng-template>

    <!-- The chip slot is a fixed 28x28 cell. topAlign floats it up so the
         chip lines up with the body's first line. -->
    <ng-template #chip>
      <span data-slot="auq-chip-slot" [class]="chipSlotClass()">
        <span data-slot="auq-chip" aria-hidden="true" [class]="chipClass()" [style.font-variation-settings]="chipWeight()">{{
          chipContent()
        }}</span>
        @if (chipPosition() === 'right') {
          <ng-container [ngTemplateOutlet]="arrow" />
        }
      </span>
    </ng-template>

    @if (chipPosition() === 'left') {
      <ng-container [ngTemplateOutlet]="chip" />
    }
    <span data-slot="auq-body" [class]="bodyClass()"><ng-content /></span>
    @if (chipPosition() === 'right') {
      <ng-container [ngTemplateOutlet]="chip" />
    } @else if (!multi()) {
      <!-- Right-edge arrow slot: the chip is on the left, so the submit
           affordance keeps its own slot at the trailing end. -->
      <span data-slot="auq-arrow-slot" [class]="rightSlotClass()">
        <ng-container [ngTemplateOutlet]="arrow" />
      </span>
    }
    <ng-content select="[ffAuqHiddenControl]" />
  `,
  host: {
    '[attr.data-fluid-hover-index]': 'index()',
    '[attr.data-state]': 'selected() ? "checked" : "unchecked"',
    '[attr.role]': 'rowRole()',
    '[attr.aria-checked]': 'rowRole() ? (checked() ? "true" : "false") : null',
    '[attr.aria-label]': 'ariaLabel() ?? null',
    '[attr.tabindex]': 'tabIndex()',
    '[class]': 'hostClass()',
    '(mousedown)': 'onMouseDown($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AskUserQuestionRow {
  readonly index = input.required<number>();
  readonly rowRole = input<'radio' | 'checkbox' | null>(null);
  readonly selected = input(false);
  /** aria-checked of a radio/checkbox row. */
  readonly checked = input(false);
  readonly tabIndex = input(-1);
  readonly chipContent = input<number | string>('');
  readonly chipFilled = input(false);
  readonly multi = input(false);
  readonly compact = input(false);
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly showArrow = input(false);
  /** Whether the arrow submits (the React `onArrowClick` being set). */
  readonly arrowClickable = input(false);
  readonly arrowSize = input(14);
  readonly bodyLayout = input<'inline' | 'stacked'>('inline');
  readonly topAlign = input(false);
  readonly chipPosition = input<'left' | 'right'>('right');
  readonly arrowClick = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly shape = injectShape();
  protected readonly arrowEnter = fastWithFade(0.08);
  protected readonly arrowExit = { duration: spring.fast.exit.duration };

  private readonly topShift = computed(() =>
    this.topAlign() ? (this.bodyLayout() === 'stacked' ? '-mt-[1px]' : '-mt-[5px]') : false,
  );

  protected readonly arrowClass = computed(() =>
    cn(
      'absolute inset-0 inline-flex items-center justify-center bg-foreground text-background',
      this.shape().bg,
      this.arrowClickable() && 'cursor-pointer',
    ),
  );
  protected readonly arrowIconClass = computed(() => (this.arrowSize() === 12 ? 'h-3 w-3' : 'h-3.5 w-3.5'));

  protected readonly chipSlotClass = computed(() =>
    cn('shrink-0 relative inline-flex items-center justify-center', this.compact() ? 'w-6 h-6' : 'w-7 h-7', this.topShift()),
  );

  protected readonly chipClass = computed(() =>
    cn(
      'absolute inline-flex items-center justify-center text-[length:var(--fs-micro,11px)] leading-[var(--lh-micro,14px)] transition-[opacity,font-variation-settings] duration-80',
      this.compact() ? 'w-[18px] h-[18px]' : 'w-5 h-5',
      this.multi() && this.shape().bg,
      this.multi()
        ? this.chipFilled()
          ? 'bg-foreground text-background'
          : 'border border-border text-muted-foreground'
        : this.chipFilled()
          ? 'text-foreground'
          : 'text-muted-foreground',
      // Only fade the chip when it shares a slot with the arrow.
      this.chipPosition() === 'right' && this.showArrow() && 'opacity-0',
    ),
  );
  protected readonly chipWeight = computed(() => (this.chipFilled() ? fontWeights.semibold : fontWeights.normal));

  protected readonly rightSlotClass = computed(() =>
    cn('shrink-0 w-7 h-7 relative inline-flex items-center justify-center', this.topShift()),
  );

  protected readonly bodyClass = computed(() =>
    cn(
      'min-w-0 flex-1',
      typeClass('body', this.compact() ? 'compact' : 'default'),
      this.bodyLayout() === 'stacked' ? 'flex flex-col gap-0.5' : 'inline-flex items-center gap-0',
    ),
  );

  protected readonly hostClass = computed(() => {
    const compact = this.compact();
    const left = this.chipPosition() === 'left';
    return cn(
      'relative z-10 flex cursor-pointer select-none outline-none',
      // Tighter gap when the chip leads: it reads as a list marker.
      left ? 'gap-2' : 'gap-3',
      // items-start when the body may exceed one line, so the chip tracks
      // the first line instead of sliding to the row's vertical centre.
      this.topAlign() ? 'items-start' : 'items-center',
      this.bodyLayout() === 'stacked'
        ? compact
          ? 'min-h-12 py-1.5'
          : 'min-h-14 py-2'
        : compact
          ? 'min-h-8 py-1'
          : 'min-h-10 py-1.5',
      left ? (this.multi() ? 'pl-1.5 pr-3' : 'pl-1.5 pr-1.5') : 'pl-3 pr-1.5',
      this.shape().item,
    );
  });

  protected onMouseDown(e: MouseEvent) {
    focusRowOnPress(e, this.host);
  }

  protected onArrow(e: MouseEvent) {
    if (!this.arrowClickable()) return;
    e.stopPropagation();
    this.arrowClick.emit();
  }
}
