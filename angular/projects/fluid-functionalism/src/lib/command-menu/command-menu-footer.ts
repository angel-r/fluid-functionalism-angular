import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { cn, injectSizeVariant, typeClass } from '../core';
import { CommandMenu } from './command-menu';
import { CommandMenuShortcut } from './command-menu-shortcut';

export interface CommandMenuHint {
  label: string;
  /** A combo, or a list of separate caps. */
  keys: string | readonly string[];
}

/**
 * The hint strip under the list: what the keys do here. The default hints
 * follow the menu (tabs add ← →, a dialog adds Esc), and the highlighted
 * row's action names Enter at the trailing edge. `hints` replaces them;
 * projected content replaces the strip's content entirely.
 */
@Component({
  selector: 'ff-command-menu-footer',
  imports: [CommandMenuShortcut],
  host: {
    'data-slot': 'command-menu-footer',
    '[class]': 'hostClass()',
  },
  template: `
    <ng-content>
      @for (hint of resolvedHints(); track hint.label) {
        <span class="flex shrink-0 items-center gap-1.5">
          <span>{{ hint.label }}</span>
          <kbd ffCommandMenuShortcut class="ml-0" [keys]="hint.keys"></kbd>
        </span>
      }
      @if (action(); as action) {
        <span data-slot="command-menu-footer-action" class="ml-auto flex min-w-0 items-center gap-1.5 text-foreground">
          <span class="truncate">{{ action }}</span>
          <kbd ffCommandMenuShortcut keys="enter" class="ml-0"></kbd>
        </span>
      }
    </ng-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandMenuFooter {
  /** Replaces the default hints, the highlighted row's Enter hint included. */
  readonly hints = input<readonly CommandMenuHint[] | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  private readonly menu = inject(CommandMenu);
  private readonly variant = injectSizeVariant();

  // The Enter hint names the highlighted row, so it reads as the thing Enter
  // does ("Open Showcase") rather than a generic "Run". It sits at the
  // trailing edge so its changing width never moves the other hints. No
  // row, no hint.
  protected readonly action = computed(() => {
    if (this.hints()) return null;
    const row = this.menu.activeRow();
    return row ? (row.action ?? row.label) : null;
  });
  protected readonly resolvedHints = computed<readonly CommandMenuHint[]>(
    () =>
      this.hints() ?? [
        { label: 'Select', keys: ['up', 'down'] },
        ...(this.menu.tabsMounted() ? [{ label: 'Tabs', keys: ['left', 'right'] }] : []),
        ...(this.menu.dialog ? [{ label: 'Close', keys: 'esc' }] : []),
      ],
  );
  protected readonly hostClass = computed(() => {
    const compact = this.variant() === 'compact';
    return cn(
      'flex shrink-0 items-center overflow-hidden text-muted-foreground',
      compact ? 'h-8 gap-3 px-3' : 'h-10 gap-4 px-4',
      typeClass('caption', compact ? 'compact' : 'default'),
      this.userClass(),
    );
  });
}
