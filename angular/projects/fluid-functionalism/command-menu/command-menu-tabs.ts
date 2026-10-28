import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { cn, SizeContext, injectSizeVariant, type SizeVariant } from '@angel-r/fluid-functionalism-angular/core';
import { TabsSubtle, TabsSubtleItem } from '@angel-r/fluid-functionalism-angular/tabs-subtle';
import { CommandMenu, type CommandMenuTab, type CommandMenuTabsHandle } from './command-menu';

/**
 * Subtle tabs under the field. The tabs are state you own: derive `items`
 * from the value so the list follows. ← and → in the field switch tabs.
 * Projected content sits at the trailing edge of the tab row, hugging its
 * content (an ff-command-menu-filters, a button); the tabs take the rest.
 */
@Component({
  selector: 'ff-command-menu-tabs',
  imports: [TabsSubtle, TabsSubtleItem],
  host: {
    'data-slot': 'command-menu-tabs',
    '[class]': 'hostClass()',
  },
  template: `
    <!-- A pointer pick must not take focus from the field (the tabs are
         buttons); keyboard users still reach them with Tab. No overflow clip
         here: the tabs scroll themselves and keep 4px of room around the tabs
         for the 2px-outset focus ring, which a second scroll container this
         tight would crop. -->
    <div class="flex min-w-0 flex-1 items-center" (mousedown)="$event.preventDefault()">
      <ff-tabs-subtle size="compact" aria-label="Filter results" [selectedIndex]="selectedIndex()" (selectedIndexChange)="pick($event)">
        @for (tab of tabs(); track tab.value; let i = $index) {
          <button ffTabsSubtleItem [index]="i" [label]="tab.label" [icon]="tab.icon"></button>
        }
      </ff-tabs-subtle>
    </div>
    <div #trailing class="ml-auto flex shrink-0 items-center" [style.display]="hasTrailing() ? null : 'none'">
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandMenuTabs {
  readonly tabs = input.required<readonly CommandMenuTab[]>();
  /** The selected tab's value. */
  readonly value = input.required<string>();
  readonly userClass = input('', { alias: 'class' });
  /** A tab was picked, by pointer, Enter/Space, or ← / → in the field.
   *  (React: `onValueChange`.) */
  readonly valueChange = output<string>();

  private readonly menu = inject(CommandMenu);
  private readonly variant = injectSizeVariant();
  private readonly trailing = viewChild.required<ElementRef<HTMLElement>>('trailing');
  protected readonly hasTrailing = signal(false);

  protected readonly selectedIndex = computed(() =>
    Math.max(
      0,
      this.tabs().findIndex((tab) => tab.value === this.value()),
    ),
  );
  protected readonly hostClass = computed(() =>
    cn(
      'flex shrink-0 items-center',
      this.variant() === 'compact' ? 'gap-1 px-2 pb-1.5' : 'gap-2 px-2.5 pb-2',
      this.userClass(),
    ),
  );

  constructor() {
    // The field reads the latest tabs and value from the handle on each ← / →.
    effect((onCleanup) => {
      const handle: CommandMenuTabsHandle = {
        tabs: this.tabs(),
        value: this.value(),
        onValueChange: (value) => this.valueChange.emit(value),
      };
      untracked(() => this.menu.registerTabs(handle));
      onCleanup(() => this.menu.unregisterTabs(handle));
    });
    // The trailing slot renders only when something is projected into it.
    afterRenderEffect(() => {
      const el = this.trailing().nativeElement;
      const filled = Array.from(el.childNodes).some(
        (node) => node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim()),
      );
      untracked(() => this.hasTrailing.set(filled));
    });
  }

  protected pick(index: number) {
    const tab = this.tabs()[index];
    if (tab) this.valueChange.emit(tab.value);
  }
}

/** Pins projected content to the compact step of the size ladder. */
const compactSize: SizeContext = {
  size: signal<SizeVariant>('compact').asReadonly(),
  setSize: () => {},
};

/**
 * A borderless bar under the field for compact controls (borderless selects,
 * ghost buttons). Nothing frames it: the controls sit on the panel's own
 * surface and the list's divider closes the header. Inside
 * ff-command-menu-tabs it hugs its controls at the end of the tab row.
 */
@Component({
  selector: 'ff-command-menu-filters',
  providers: [{ provide: SizeContext, useValue: compactSize }],
  host: {
    'data-slot': 'command-menu-filters',
    '[class]': 'hostClass()',
  },
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandMenuFilters {
  readonly userClass = input('', { alias: 'class' });

  // The bar's own inset follows the menu's size; only its children are
  // pinned compact (its own provider would answer a plain inject).
  private readonly parentSize = inject(SizeContext, { optional: true, skipSelf: true });
  // Inside a tab row the bar hugs its controls; on its own it is a row of
  // the header, with the header's inset and wrapping room.
  private readonly inTabsRow = inject(CommandMenuTabs, { optional: true }) !== null;

  protected readonly hostClass = computed(() => {
    const compact = (this.parentSize?.size() ?? 'default') === 'compact';
    return cn(
      'flex shrink-0 items-center gap-1',
      // Controls hug their content: a select trigger drops the field width
      // it keeps in forms.
      '[&_[role=combobox]]:w-auto [&_[role=combobox]]:min-w-0',
      !this.inTabsRow && 'flex-wrap',
      !this.inTabsRow && (compact ? 'px-2 pb-1.5' : 'px-2.5 pb-2'),
      this.userClass(),
    );
  });
}
