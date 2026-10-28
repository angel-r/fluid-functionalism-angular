import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cn, injectSizeVariant, typeClass } from '../core';
import { formatShortcut, injectIsMac } from './shortcut';

/**
 * The caps of a shortcut, on a `<kbd>`: `<kbd ffCommandMenuShortcut keys="mod+k">`.
 * Rows and footer hints draw theirs with it; use it on a trigger button too.
 */
@Component({
  selector: 'kbd[ffCommandMenuShortcut]',
  host: {
    'data-slot': 'command-menu-shortcut',
    '[class]': 'hostClass()',
  },
  template: `
    @for (cap of caps(); track $index) {
      <span [class]="capClass()">{{ cap }}</span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandMenuShortcut {
  /** The combo, in the trigger syntax (`"mod+p"`) or pre-formatted (`"⌘P"`).
   *  A list draws each entry as its own cap: `['up', 'down']`. */
  readonly keys = input.required<string | readonly string[]>();
  readonly userClass = input('', { alias: 'class' });

  private readonly mac = injectIsMac();
  private readonly variant = injectSizeVariant();

  protected readonly caps = computed(() => {
    const keys = this.keys();
    return (typeof keys === 'string' ? [keys] : keys).flatMap((k) => formatShortcut(k, this.mac));
  });
  protected readonly hostClass = computed(() =>
    cn('ml-auto inline-flex shrink-0 items-center gap-0.5 align-middle font-sans', this.userClass()),
  );
  protected readonly capClass = computed(() => {
    const compact = this.variant() === 'compact';
    return cn(
      'flex items-center justify-center rounded-[5px] bg-hover text-muted-foreground',
      compact ? 'h-4 min-w-4 px-1' : 'h-5 min-w-5 px-1',
      typeClass('micro', compact ? 'compact' : 'default'),
    );
  });
}
