import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cn, Icon } from '../core';

// The footer ← / → icons hint at the ArrowLeft/ArrowRight keys, which mobile
// has no equivalent for, so they render desktop-only. They are icon
// components (the `size` / `strokeWidth` / `class` icon contract), so they go
// through the Button's icon slots and keep its tighter icon-side padding.

@Component({
  selector: 'ff-auq-arrow-left-key',
  imports: [Icon],
  template: `<ff-icon name="arrow-left" [size]="size()" [strokeWidth]="strokeWidth()" [class]="iconClass()" />`,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuqArrowLeftKey {
  readonly size = input<number | string>(16);
  readonly strokeWidth = input<number | string>(1.5);
  readonly userClass = input('', { alias: 'class' });
  protected readonly iconClass = computed(() => cn(this.userClass(), 'hidden sm:block'));
}

@Component({
  selector: 'ff-auq-arrow-right-key',
  imports: [Icon],
  template: `<ff-icon name="arrow-right" [size]="size()" [strokeWidth]="strokeWidth()" [class]="iconClass()" />`,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuqArrowRightKey {
  readonly size = input<number | string>(16);
  readonly strokeWidth = input<number | string>(1.5);
  readonly userClass = input('', { alias: 'class' });
  protected readonly iconClass = computed(() => cn(this.userClass(), 'hidden sm:block'));
}
