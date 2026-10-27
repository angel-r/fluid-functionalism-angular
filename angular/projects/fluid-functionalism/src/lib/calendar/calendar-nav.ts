import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { cn } from '../core/utils';
import { Icon } from '../core/icon';
import { Button } from '../button';
import { Tooltip } from '../tooltip';
import { FluidHover, FluidHoverItem, type FluidHoverController } from '../fluid-hover/fluid-hover';
import { FluidHoverHighlight } from '../fluid-hover/fluid-hover-highlight';
import { CALENDAR_CONTEXT, isDisabledDay, type CalendarNavDirection } from './calendar-context';

/**
 * The previous / next chevrons. The pair shares one fluid hover highlight,
 * so each button's own hover fill stays off; the press feedback is kept.
 * Internal to the calendar.
 */
@Component({
  selector: 'ff-calendar-nav',
  imports: [FluidHover, FluidHoverItem, FluidHoverHighlight, Tooltip, Button, Icon],
  host: { style: 'display: contents' },
  template: `
    <div
      ffFluidHover
      #group="ffFluidHover"
      ffFluidHoverAxis="x"
      [ffFluidHoverGapClick]="false"
      [ffFluidHoverItemDisabled]="isDisabled"
      data-slot="calendar-nav"
      class="relative flex items-center"
      (focusin)="onFocus($event, group.controller)"
      (focusout)="onBlur($event, group.controller)"
    >
      <ff-fluid-hover-highlight [class]="highlightClass()" />
      @for (direction of buttons(); track direction; let i = $index) {
        <!-- One day column wide, the button centered in it like a day in its
             cell; the highlight measures the button's box, not the column. -->
        <span class="flex w-[var(--calendar-col,var(--cell-size))] justify-center">
          <span [ffFluidHoverItem]="i" class="relative flex">
            <ff-tooltip [content]="direction === 'previous' ? 'Previous month' : 'Next month'">
              <button
                ffButton
                type="button"
                variant="ghost"
                size="icon-compact"
                [attr.aria-label]="cal.navLabel(direction)"
                [attr.aria-disabled]="target(direction) ? null : true"
                [attr.data-calendar-nav]="direction"
                [disabled]="!target(direction)"
                (click)="cal.navigate(direction)"
                class="relative z-[1] !size-[min(var(--calendar-col,var(--cell-size)),var(--cell-size))] group-hover:[&>span:first-child]:!bg-transparent group-hover:[&>span:first-child]:!shadow-none"
              >
                <ff-icon name="chevron-right" [size]="16" [class]="chevronClass(direction)" />
              </button>
            </ff-tooltip>
          </span>
        </span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarNav {
  readonly buttons = input.required<CalendarNavDirection[]>();
  protected readonly cal = inject(CALENDAR_CONTEXT);
  protected readonly isDisabled = isDisabledDay;
  protected readonly highlightClass = computed(() => cn('z-0', this.cal.shape().button));

  protected target(direction: CalendarNavDirection) {
    return direction === 'previous' ? this.cal.previousMonth() : this.cal.nextMonth();
  }

  protected chevronClass(direction: CalendarNavDirection) {
    const flip = (direction === 'previous') !== this.cal.rtl();
    // Stacked months page up and down, so the chevrons point that way.
    if (this.cal.stacked()) return direction === 'previous' ? '-rotate-90' : 'rotate-90';
    return flip ? 'rotate-180' : '';
  }

  protected onFocus(e: FocusEvent, hover: FluidHoverController) {
    const target = e.target as HTMLElement;
    const idx = this.buttons().indexOf(target.getAttribute('data-calendar-nav') as CalendarNavDirection);
    let visible = false;
    try {
      visible = target.matches(':focus-visible');
    } catch {
      visible = false;
    }
    if (idx >= 0 && visible) hover.setActiveIndex(idx);
  }

  protected onBlur(e: FocusEvent, hover: FluidHoverController) {
    const current = e.currentTarget as HTMLElement;
    if (!current.contains(e.relatedTarget as Node | null)) hover.setActiveIndex(null);
  }
}
