import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { cn, injectSize, fieldTouchClass, Icon } from '@angel-r/fluid-functionalism-angular/core';
import { CommandMenu } from './command-menu';
import type { CommandMenuIcon } from './items';

/**
 * The search field. Keeps focus; arrows and Enter act on the list through
 * `aria-activedescendant`. The host is the field's row (icon + input);
 * `inputClass` reaches the `<input>` itself (React: `className`).
 */
@Component({
  selector: 'ff-command-menu-input',
  imports: [Icon],
  host: {
    'data-slot': 'command-menu-input',
    '[class]': 'hostClass()',
    // The label belongs to the <input>; keep the row itself unnamed.
    '[attr.aria-label]': 'null',
  },
  template: `
    @if (iconName() || iconDefinition()) {
      <ff-icon
        [name]="iconName()"
        [icon]="iconDefinition()"
        [size]="size().icon"
        [strokeWidth]="1.5"
        class="shrink-0 text-muted-foreground transition-[color,stroke-width] duration-80 group-focus-within/command-input:text-foreground group-focus-within/command-input:stroke-[2]"
      />
    }
    <input
      #field
      type="text"
      role="combobox"
      aria-expanded="true"
      aria-autocomplete="list"
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      [attr.aria-controls]="menu.listId"
      [attr.aria-activedescendant]="activeDescendant()"
      [attr.aria-label]="ariaLabel() ?? null"
      [attr.name]="name() ?? null"
      [value]="menu.currentQuery()"
      [placeholder]="placeholder()"
      [class]="fieldClass()"
      (input)="onInput($event)"
      (keydown)="onKeydown($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandMenuInput {
  readonly placeholder = input('Type a command or search…');
  /** Leading icon. Default: the search icon; `null` drops it. */
  readonly icon = input<CommandMenuIcon | null | undefined>(undefined);
  /** Classes merged onto the `<input>` (React: `className`). */
  readonly inputClass = input('');
  readonly ariaLabel = input<string | undefined>(undefined, { alias: 'aria-label' });
  readonly name = input<string | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });
  /** Every keydown in the field, before the menu acts on it. Call
   *  `preventDefault()` to keep the menu from handling the key. (React:
   *  `onKeyDown`.) */
  readonly inputKeydown = output<KeyboardEvent>();

  protected readonly menu = inject(CommandMenu);
  protected readonly size = injectSize();
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  private readonly resolvedIcon = computed<CommandMenuIcon | null>(() => {
    const icon = this.icon();
    return icon === undefined ? 'search' : icon;
  });
  protected readonly iconName = computed(() => {
    const icon = this.resolvedIcon();
    return typeof icon === 'string' ? icon : undefined;
  });
  protected readonly iconDefinition = computed(() => {
    const icon = this.resolvedIcon();
    return icon !== null && typeof icon !== 'string' ? icon : undefined;
  });

  protected readonly activeDescendant = computed(() => {
    const index = this.menu.activeIndex();
    return index === null ? null : `${this.menu.listId}-${index}`;
  });

  protected readonly hostClass = computed(() =>
    cn(
      'group/command-input flex shrink-0 items-center',
      this.size().variant === 'compact' ? 'h-10 gap-2 px-3' : 'h-12 gap-2.5 px-4',
      this.userClass(),
    ),
  );
  // rounded-none: the base :focus-visible rule hands focused elements the
  // shape radius, and a text input clips its caret to its corners.
  protected readonly fieldClass = computed(() =>
    cn(
      'min-w-0 flex-1 rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]',
      // One notch above the rows' body size: the field is the palette's
      // title line. The line box keeps the caret in proportion.
      this.size().variant === 'compact'
        ? 'text-[length:var(--fs-subtitle-compact,13px)] leading-5'
        : 'text-[length:var(--fs-subtitle,14px)] leading-6',
      fieldTouchClass,
      this.inputClass(),
    ),
  );

  /** The `<input>` element. */
  get inputElement(): HTMLInputElement {
    return this.field().nativeElement;
  }

  /** Moves focus into the field. */
  focus(options?: FocusOptions) {
    this.inputElement.focus(options);
  }

  protected onInput(e: Event) {
    const el = e.target as HTMLInputElement;
    this.menu.setQuery(el.value);
    // A controlled query the parent did not take keeps the field on it.
    const query = untracked(this.menu.currentQuery);
    if (el.value !== query) el.value = query;
  }

  protected onKeydown(e: KeyboardEvent) {
    this.inputKeydown.emit(e);
    if (e.defaultPrevented) return;
    // Keys inside an IME composition belong to the composer: Enter commits a
    // candidate, the arrows pick one. (Safari reports the commit as keyCode
    // 229 after compositionend.)
    if (e.isComposing || e.keyCode === 229) return;
    const menu = this.menu;
    const query = untracked(menu.currentQuery);
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        // With tabs under the field, ← and → switch tabs (wrapping) instead
        // of moving the caret. Modified presses keep their editing meaning —
        // Shift+Arrow in particular must still extend the selection.
        const tabs = untracked(menu.tabs);
        if (!tabs || tabs.tabs.length === 0 || e.shiftKey || e.altKey || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        const count = tabs.tabs.length;
        const current = tabs.tabs.findIndex((tab) => tab.value === tabs.value);
        const step = e.key === 'ArrowRight' ? 1 : -1;
        const next = ((current === -1 ? 0 : current) + step + count) % count;
        tabs.onValueChange(tabs.tabs[next].value);
        return;
      }
      case 'ArrowDown':
        e.preventDefault();
        menu.move(1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        menu.move(-1);
        return;
      case 'Home':
        if (query !== '') return; // the caret's own Home
        e.preventDefault();
        menu.move('first');
        return;
      case 'End':
        if (query !== '') return;
        e.preventDefault();
        menu.move('last');
        return;
      case 'Enter': {
        e.preventDefault();
        const row = untracked(menu.activeRow);
        if (row) menu.select(row);
        return;
      }
      case 'Escape':
        // In a dialog the shell closes on Escape. Inline, Escape clears what
        // was typed.
        if (menu.dialog || query === '') return;
        e.preventDefault();
        menu.setQuery('');
        return;
      default:
        return;
    }
  }
}
