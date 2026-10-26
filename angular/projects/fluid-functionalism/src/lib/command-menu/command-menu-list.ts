import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  InjectionToken,
  Injector,
  TemplateRef,
  afterRenderEffect,
  computed,
  contentChild,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { cn } from '../core/utils';
import { shapeMap } from '../core/shape';
import { injectSize } from '../core/size';
import { typeClass } from '../core/type-scale';
import { Icon } from '../core/icon';
import { ScrollArea } from '../scroll-area/scroll-area';
import { FluidHoverHighlight } from '../fluid-hover/fluid-hover-highlight';
import { CommandMenu } from './command-menu';
import { CommandMenuShortcut } from './command-menu-shortcut';
import type { CommandMenuIcon, CommandMenuItemData } from './items';

// The list keeps the smaller "rounded" radii whatever the rest of the UI is
// shaped, like every popup list: pill rows inside a square panel distort the
// concentric fit of the hover fill. The dialog shell follows the global
// shape through ff-dialog-content.
const listShape = shapeMap.rounded;

/** The flat index of the row a custom row template renders. Rows read it
 *  when no `[index]` is bound, so custom rows never number themselves. */
export const COMMAND_MENU_ROW_INDEX = new InjectionToken<number>('FF_COMMAND_MENU_ROW_INDEX');

export interface CommandMenuRowContext {
  /** The item the row renders. */
  $implicit: CommandMenuItemData;
  /** Its flat index in the visible rows. */
  index: number;
}

/**
 * Custom rows (React: `renderItem`): one ff-command-menu-item per visible
 * item, declared inside ff-command-menu-list.
 *
 *   <ng-template ffCommandMenuRow let-item>
 *     <ff-command-menu-item [value]="item.value">…</ff-command-menu-item>
 *   </ng-template>
 */
@Directive({ selector: 'ng-template[ffCommandMenuRow]' })
export class CommandMenuRow {
  readonly template = inject<TemplateRef<CommandMenuRowContext>>(TemplateRef);

  static ngTemplateContextGuard(_dir: CommandMenuRow, ctx: unknown): ctx is CommandMenuRowContext {
    return true;
  }
}

/**
 * One row. Reads its data from the root by `value`; any input set here
 * overrides it. Projected content replaces the label and description; the
 * icon and caps stay.
 */
@Component({
  selector: 'ff-command-menu-item',
  imports: [Icon, CommandMenuShortcut],
  host: {
    role: 'option',
    'data-slot': 'command-menu-item',
    '[id]': 'rowId()',
    '[attr.aria-selected]': 'isActive()',
    '[attr.aria-disabled]': 'item().disabled ? "true" : null',
    '[attr.data-fluid-hover-index]': 'rowIndex()',
    '[attr.data-value]': 'value()',
    '[class]': 'hostClass()',
    '(click)': 'onClick($event)',
  },
  template: `
    @if (iconName() || iconDefinition()) {
      <ff-icon
        [name]="iconName()"
        [icon]="iconDefinition()"
        [size]="size().icon"
        [strokeWidth]="isActive() ? 2 : 1.5"
        class="shrink-0 transition-[color,stroke-width] duration-80"
      />
    }
    <ng-content>
      <!-- py-1/-my-1 keeps truncate's overflow:hidden from clipping
           ascenders and descenders outside the trimmed box. -->
      <span class="flex min-w-0 flex-1 items-baseline gap-2">
        <span class="truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1">{{ item().label }}</span>
        <!-- The description shares the label's size, muted on both states
             of the row. -->
        @if (item().description) {
          <span class="min-w-0 truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1 text-muted-foreground">{{
            item().description
          }}</span>
        }
      </span>
    </ng-content>
    @if (item().shortcut; as shortcut) {
      <kbd ffCommandMenuShortcut [keys]="shortcut"></kbd>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandMenuItem {
  /** Which item this row is. Its data fills the row; inputs below override it. */
  readonly value = input.required<string>();
  /** The row's flat index. Rows the list renders (default or from a row
   *  template) know it already. */
  readonly index = input<number | undefined>(undefined);
  readonly label = input<string | undefined>(undefined);
  readonly description = input<string | undefined>(undefined);
  readonly icon = input<CommandMenuIcon | undefined>(undefined);
  readonly shortcut = input<string | undefined>(undefined);
  readonly disabled = input<boolean | undefined>(undefined);
  /** Overrides the item's `onSelect`. */
  readonly onSelect = input<(() => void) | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  private readonly menu = inject(CommandMenu);
  private readonly injectedIndex = inject(COMMAND_MENU_ROW_INDEX, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly size = injectSize();

  protected readonly rowIndex = computed(() => this.index() ?? this.injectedIndex ?? 0);
  protected readonly rowId = computed(() => `${this.menu.listId}-${this.rowIndex()}`);
  /** Whether the highlight sits on this row. */
  readonly isActive = computed(() => this.menu.activeIndex() === this.rowIndex());

  /** The item's data with this row's overrides applied. */
  readonly item = computed<CommandMenuItemData>(() => {
    const value = this.value();
    const data = this.menu.itemsByValue().get(value) ?? { value, label: value };
    const overrides: Partial<CommandMenuItemData> = {};
    const label = this.label();
    const description = this.description();
    const icon = this.icon();
    const shortcut = this.shortcut();
    const disabled = this.disabled();
    const onSelect = this.onSelect();
    if (label !== undefined) overrides.label = label;
    if (description !== undefined) overrides.description = description;
    if (icon !== undefined) overrides.icon = icon;
    if (shortcut !== undefined) overrides.shortcut = shortcut;
    if (disabled !== undefined) overrides.disabled = disabled;
    if (onSelect !== undefined) overrides.onSelect = onSelect;
    return { ...data, ...overrides };
  });

  protected readonly iconName = computed(() => {
    const icon = this.item().icon;
    return typeof icon === 'string' ? icon : undefined;
  });
  protected readonly iconDefinition = computed(() => {
    const icon = this.item().icon;
    return icon !== undefined && typeof icon !== 'string' ? icon : undefined;
  });

  protected readonly hostClass = computed(() => {
    const size = this.size();
    return cn(
      // Fixed height so the text-box trim on the label doesn't shrink the
      // row; shrink-0 because the list is a flex column.
      'relative z-10 flex shrink-0 items-center cursor-pointer select-none outline-none',
      size.control,
      size.gap,
      size.itemPx,
      size.text,
      listShape.item,
      'transition-[color] duration-80',
      this.isActive() ? 'text-foreground' : 'text-muted-foreground',
      this.item().disabled && 'opacity-50 pointer-events-none',
      this.userClass(),
    );
  });

  constructor() {
    effect((onCleanup) => {
      const index = this.rowIndex();
      const hover = this.menu.hover;
      untracked(() => hover.registerItem(index, this.host));
      onCleanup(() => hover.unregisterItem(index, this.host));
    });
  }

  protected onClick(e: MouseEvent) {
    if (e.defaultPrevented) return;
    this.menu.select(untracked(this.item));
  }
}

/**
 * The scrolling rows under a divider, grouped by heading, with the fluid
 * hover fill. Projected content (e.g. ff-command-menu-empty) sits above the
 * rows; an `<ng-template ffCommandMenuRow>` inside replaces the default rows.
 * `class` styles the scroll box, `listClass` the listbox inside it (React:
 * `className`).
 */
@Component({
  selector: 'ff-command-menu-list',
  imports: [ScrollArea, FluidHoverHighlight, NgTemplateOutlet, CommandMenuItem],
  host: {
    'data-slot': 'command-menu-list-area',
    '[class]': 'hostClass()',
  },
  template: `
    <!-- Not the popup viewport class: a palette is sized by its rows up to
         its shell's max-height, which leaves every box on the way
         indefinite, so a percentage height on the viewport never resolves.
         Flex does what percentages cannot: the area shrinks to what the
         shell leaves it, and the viewport shrinks with it (min-h-0) and
         scrolls; short content sizes both to the rows. -->
    <ff-scroll-area
      class="flex min-h-0 flex-1 flex-col"
      viewportClass="min-h-0 flex-1 [&>div[style]]:!block [&>div[style]]:!min-w-0 [--scroll-fade-size:32px] scroll-fade"
    >
      <!-- A row click must not blur the field: the palette is driven from
           the keyboard, and the click already picked. -->
      <div
        #list
        role="listbox"
        tabindex="-1"
        data-slot="command-menu-list"
        [id]="menu.listId"
        [attr.data-empty]="empty() ? '' : null"
        [class]="listClassName()"
        (mouseenter)="menu.hover.onMouseEnter()"
        (mousemove)="menu.hover.onMouseMove($event)"
        (mouseleave)="onMouseLeave()"
        (click)="menu.hover.onClick($event)"
        (mousedown)="$event.preventDefault()"
      >
        <ff-fluid-hover-highlight [hover]="menu.hover" [class]="highlightClass" />
        <ng-content />
        @for (section of menu.sections(); track section.id; let sectionIndex = $index) {
          <!-- Ids from the section's position, never its heading text: a
               heading with a space ("Go to") would split aria-labelledby
               into two ids that exist nowhere. -->
          <div role="group" class="flex flex-col" [attr.aria-labelledby]="section.heading ? headingId(sectionIndex) : null">
            @if (section.heading) {
              <div role="presentation" [id]="headingId(sectionIndex)" [class]="headingClass()">{{ section.heading }}</div>
            }
            @for (item of section.items; track item.value; let i = $index) {
              @if (rowTemplate(); as row) {
                <ng-container
                  *ngTemplateOutlet="
                    row.template;
                    context: { $implicit: item, index: section.start + i };
                    injector: rowInjector(section.start + i)
                  "
                />
              } @else {
                <ff-command-menu-item [value]="item.value" [index]="section.start + i" />
              }
            }
          </div>
        }
      </div>
    </ff-scroll-area>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandMenuList {
  /** Classes merged onto the listbox element (React: `className`). */
  readonly listClass = input('');
  readonly userClass = input('', { alias: 'class' });

  protected readonly menu = inject(CommandMenu);
  private readonly injector = inject(Injector);
  private readonly size = injectSize();
  protected readonly rowTemplate = contentChild(CommandMenuRow);
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  protected readonly highlightClass = listShape.bg;
  protected readonly empty = computed(() => this.menu.rows().length === 0);

  // scroll-divider draws the edges: the top hairline rides the header line
  // (pulled up 1px onto it) and strengthens once rows pass under it; the
  // bottom hairline stands while rows continue below and goes at the end,
  // which is why the footer draws no line of its own. With no footer the
  // list is the panel's last child and that hairline would land on the
  // panel's own bottom edge and double it, so it is dropped.
  protected readonly hostClass = computed(() =>
    cn(
      'scroll-divider flex min-h-0 flex-1 flex-col border-t border-border/60 [&::before]:!-top-px [&:last-child::after]:!hidden',
      this.userClass(),
    ),
  );
  protected readonly listClassName = computed(() =>
    cn(
      // The list is the fill's offsetParent, so rows and fill scroll together
      // inside the viewport. Padding collapses when empty.
      'relative flex flex-col gap-1 p-1 outline-none data-[empty]:p-0',
      this.listClass(),
    ),
  );
  protected readonly headingClass = computed(() => {
    const compact = this.size().variant === 'compact';
    return cn(
      'flex shrink-0 items-center text-muted-foreground',
      compact ? 'h-6 px-1.5' : 'h-7 px-2',
      typeClass('caption', compact ? 'compact' : 'default'),
    );
  });

  // The pointer leaving the list keeps the highlight where it was: Enter
  // still has a target, and the fill stays on the row the field points at.
  private lastActive: number | null = null;
  private readonly rowInjectors = new Map<number, Injector>();

  constructor() {
    afterRenderEffect(() => {
      const list = this.list().nativeElement;
      untracked(() => this.menu.listElement.set(list));
    });
    effect(() => {
      const index = this.menu.activeIndex();
      if (index !== null) this.lastActive = index;
    });
    inject(DestroyRef).onDestroy(() => {
      if (untracked(this.menu.listElement) === this.list().nativeElement) this.menu.listElement.set(null);
    });
  }

  protected headingId(sectionIndex: number) {
    return `${this.menu.listId}-group-${sectionIndex}`;
  }

  /** One stable injector per index, so a row template's outlet never
   *  rebuilds its view on change detection. */
  protected rowInjector(index: number): Injector {
    let injector = this.rowInjectors.get(index);
    if (!injector) {
      injector = Injector.create({
        providers: [{ provide: COMMAND_MENU_ROW_INDEX, useValue: index }],
        parent: this.injector,
      });
      this.rowInjectors.set(index, injector);
    }
    return injector;
  }

  protected onMouseLeave() {
    const last = this.lastActive;
    this.menu.hover.onMouseLeave();
    this.menu.hover.setActiveIndex(last);
  }
}

/** Shown in place of the rows when nothing matches. */
@Component({
  selector: 'ff-command-menu-empty',
  imports: [NgTemplateOutlet],
  host: {
    role: 'status',
    'aria-live': 'polite',
    'data-slot': 'command-menu-empty',
    '[class]': 'hostClass()',
    '[style.display]': 'empty() ? null : "none"',
  },
  template: `
    <ng-template #content><ng-content /></ng-template>
    @if (empty()) {
      <ng-container [ngTemplateOutlet]="content" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandMenuEmpty {
  readonly userClass = input('', { alias: 'class' });
  private readonly menu = inject(CommandMenu);
  private readonly size = injectSize();
  protected readonly empty = computed(() => this.menu.rows().length === 0);
  protected readonly hostClass = computed(() =>
    cn('block px-3 py-6 text-center text-muted-foreground', this.size().text, this.userClass()),
  );
}
