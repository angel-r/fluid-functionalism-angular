import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostAttributeToken,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  cn,
  injectShape,
  injectSize,
  typeClass,
  Icon,
  type IconDefinition,
  type IconName,
} from '@angel-r/fluid-functionalism-angular/core';
import { SidebarMenu } from './sidebar-menu';
import { SidebarMenuRow } from './sidebar-menu-item';
import { SidebarMenuRowLabel } from './row-label';
import { rowGutter } from './menu-utils';

export const sidebarMenuButtonVariants = cva(
  // The trailing gutter is an exact reservation published by the row (see
  // rowGutter): --row-gutter at rest, --row-gutter-hover once hover-revealed
  // actions are showing. One rule per state instead of a class per
  // count/badge/reveal combination.
  // Disabled stays in the layout, and pointer events pass through it to the
  // row, since a browser sends no mouse events to a disabled button: the
  // container keeps seeing the moves, and fluid hover simply never lights it.
  'peer/menu-button relative z-10 flex w-full cursor-pointer select-none items-center gap-2 pl-2 text-left outline-none disabled:opacity-50 disabled:pointer-events-none transition-[padding] duration-80 pr-[var(--row-gutter)] group-hover/menu-item:pr-[var(--row-gutter-hover)] group-focus-within/menu-item:pr-[var(--row-gutter-hover)] group-hover/menu-sub-item:pr-[var(--row-gutter-hover)] group-focus-within/menu-sub-item:pr-[var(--row-gutter-hover)] group-has-[[data-sidebar=menu-action]:is([data-state=open],[data-popup-open],[aria-expanded=true])]/menu-item:pr-[var(--row-gutter-hover)] group-has-[[data-sidebar=menu-action]:is([data-state=open],[data-popup-open],[aria-expanded=true])]/menu-sub-item:pr-[var(--row-gutter-hover)]',
  {
    variants: {
      variant: {
        default: '',
        outline: 'border border-border bg-background',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type SidebarMenuButtonVariant = NonNullable<VariantProps<typeof sidebarMenuButtonVariants>['variant']>;
export type SidebarMenuButtonSize = 'default' | 'sm' | 'lg';
export type SidebarMenuButtonStatus = 'active' | 'unread' | 'idle';
export type SidebarMenuSubButtonSize = 'sm' | 'md';

const ICON_BASE = 'shrink-0 transition-[color,stroke-width] duration-80';

/** Splits an `icon` input into ff-icon's `name` / `icon` inputs. */
function iconParts(icon: IconName | IconDefinition | undefined) {
  if (!icon) return null;
  return typeof icon === 'string' ? { name: icon, icon: undefined } : { name: undefined, icon };
}

/** The row's trailing reservation: at rest, hover-revealed actions claim no
 *  width (the label owns the row); once revealed the row widens. */
function gutters(row: SidebarMenuRow | null) {
  const hover = rowGutter(row?.actionCount() ?? 0, row?.hasBadge() ?? false);
  const rest = row?.actionsShowOnHover() ? rowGutter(0, row?.hasBadge() ?? false) : hover;
  return { rest: `${rest}px`, hover: `${hover}px` };
}

/** Registers the host as its row's button and mirrors its active flag. */
function bindRow(row: SidebarMenuRow | null, element: HTMLElement, active: () => boolean) {
  if (!row) return;
  row.setButtonEl(element);
  effect(() => row.setActive(active()));
  inject(DestroyRef).onDestroy(() => {
    row.setActive(false);
    row.setButtonEl(null);
  });
}

/**
 * A row's main control. Put it on a `<button>` (it adds `type="button"`), an
 * `<a>`, or any element another directive owns — a dropdown trigger, a router
 * link (React's `render` / `asChild`):
 *
 *   <button ffSidebarMenuButton icon="home" [isActive]="route === 'home'">Home</button>
 *   <a ffSidebarMenuButton routerLink="/inbox" icon="inbox">Inbox</a>
 */
@Component({
  selector: '[ffSidebarMenuButton]',
  imports: [Icon, SidebarMenuRowLabel],
  host: {
    'data-sidebar': 'menu-button',
    '[attr.type]': 'type',
    '[attr.data-size]': 'size()',
    '[attr.data-active]': "effectiveActive() ? 'true' : null",
    '[attr.data-status]': 'status() ?? null',
    '[attr.aria-current]': "effectiveActive() ? 'page' : null",
    '[attr.tabindex]': 'tabIndex()',
    '[class]': 'hostClass()',
    '[style.--row-gutter]': 'gutter().rest',
    '[style.--row-gutter-hover]': 'gutter().hover',
  },
  template: `
    @if (iconInput(); as i) {
      <ff-icon [name]="i.name" [icon]="i.icon" [size]="sizeClasses().icon" [strokeWidth]="lit() ? 2 : 1.5" [class]="iconClass()" />
    } @else if (resolvedDot()) {
      <span class="flex shrink-0 items-center justify-center" [style.width.px]="sizeClasses().icon" [style.height.px]="sizeClasses().icon">
        <span data-slot="sidebar-menu-dot" [class]="dotClass()"></span>
      </span>
    }
    <ff-sidebar-menu-row-label [lit]="lit()" [emphasized]="effectiveActive()" [textClass]="textClass()"><ng-content /></ff-sidebar-menu-row-label>
    @if (status() === 'unread') {
      <span class="sr-only">, unread</span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarMenuButton {
  /** Marks the current row: aria-current, the traveling active background,
   *  and the semibold weight shift. */
  readonly isActive = input(false, { transform: booleanAttribute });
  /** Row height: default follows the size ladder; lg is a 48px two-line row. */
  readonly size = input<SidebarMenuButtonSize>('default');
  readonly variant = input<SidebarMenuButtonVariant>('default');
  /** Leading icon — stroke width animates 1.5 → 2 with the row's state. */
  readonly icon = input<IconName | IconDefinition | undefined>(undefined);
  /** Semantic thread state for status-dot navigation. Drives the dot visuals
   *  (`active`/`unread` → filled, `idle` → ring), stamps `data-status`,
   *  appends visually-hidden "unread" text, and `"active"` implies
   *  `isActive`. */
  readonly status = input<SidebarMenuButtonStatus | undefined>(undefined);
  /** Visual-only dot in the icon column. Overrides the dot derived from
   *  `status`. Ignored when `icon` is set. */
  readonly dot = input<'filled' | 'ring' | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly scope = inject(SidebarMenu, { optional: true });
  private readonly row = inject(SidebarMenuRow, { optional: true });
  private readonly shape = injectShape();
  protected readonly sizeClasses = injectSize();

  protected readonly type =
    this.element.tagName === 'BUTTON' ? (inject(new HostAttributeToken('type'), { optional: true }) ?? 'button') : null;

  /** status="active" implies the row-active treatment. */
  readonly effectiveActive = computed(() => this.isActive() || this.status() === 'active');
  protected readonly lit = computed(() => this.effectiveActive() || (this.row?.isHovered() ?? false));
  protected readonly iconInput = computed(() => iconParts(this.icon()));
  protected readonly resolvedDot = computed(() => {
    const status = this.status();
    return this.dot() ?? (status ? (status === 'idle' ? 'ring' : 'filled') : undefined);
  });

  // Roving tabindex: the active rows' buttons are the menu's tab stops; with
  // no active row, the menu's first row keeps it keyboard-reachable.
  protected readonly tabIndex = computed(() =>
    this.effectiveActive() ? 0 : this.scope?.hasActive() ? -1 : this.row?.isFirstRow() ? 0 : -1,
  );
  protected readonly gutter = computed(() => gutters(this.row));

  protected readonly textClass = computed(() =>
    this.size() === 'sm' ? typeClass('body', 'compact') : this.sizeClasses().text,
  );
  protected readonly hostClass = computed(() => {
    const size = this.size();
    const height = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-12' : this.sizeClasses().variant === 'compact' ? 'h-7' : 'h-8';
    return cn(sidebarMenuButtonVariants({ variant: this.variant() }), height, this.shape().item, this.userClass());
  });
  protected readonly iconClass = computed(() =>
    cn(ICON_BASE, this.lit() ? 'text-foreground' : 'text-muted-foreground'),
  );
  protected readonly dotClass = computed(() => {
    const lit = this.lit();
    return cn(
      'size-2 rounded-full transition-colors duration-80',
      this.resolvedDot() === 'filled'
        ? lit
          ? 'bg-foreground/60'
          : 'bg-muted-foreground/50'
        : lit
          ? 'border border-foreground/60'
          : 'border border-muted-foreground/50',
    );
  });

  constructor() {
    bindRow(this.row, this.element, () => this.effectiveActive());
  }
}

/**
 * A nested row's control. An `<a>` by default in React; put it on an anchor,
 * a button, or any element:
 *
 *   <a ffSidebarMenuSubButton href="/docs" [isActive]="true">Docs</a>
 */
@Component({
  selector: '[ffSidebarMenuSubButton]',
  imports: [Icon, SidebarMenuRowLabel],
  host: {
    'data-sidebar': 'menu-sub-button',
    '[attr.type]': 'type',
    '[attr.data-size]': 'size()',
    '[attr.data-active]': "isActive() ? 'true' : null",
    '[attr.aria-current]': "isActive() ? 'page' : null",
    '[attr.tabindex]': 'isActive() ? 0 : -1',
    '[class]': 'hostClass()',
    '[style.--row-gutter]': 'gutter().rest',
    '[style.--row-gutter-hover]': 'gutter().hover',
  },
  template: `
    @if (iconInput(); as i) {
      <ff-icon [name]="i.name" [icon]="i.icon" [size]="sizeClasses().icon" [strokeWidth]="lit() ? 2 : 1.5" [class]="iconClass()" />
    }
    <!-- Sub-rows keep the parent rows' type size — only the row height steps down. -->
    <ff-sidebar-menu-row-label [lit]="lit()" [emphasized]="isActive()" [textClass]="textClass()"><ng-content /></ff-sidebar-menu-row-label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarMenuSubButton {
  readonly isActive = input(false, { transform: booleanAttribute });
  /** Row height: 24px (`sm`) or 28px (`md`, compact steps it to 24px). */
  readonly size = input<SidebarMenuSubButtonSize>('md');
  readonly icon = input<IconName | IconDefinition | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly row = inject(SidebarMenuRow, { optional: true });
  private readonly shape = injectShape();
  protected readonly sizeClasses = injectSize();

  protected readonly type =
    this.element.tagName === 'BUTTON' ? (inject(new HostAttributeToken('type'), { optional: true }) ?? 'button') : null;

  protected readonly lit = computed(() => this.isActive() || (this.row?.isHovered() ?? false));
  protected readonly iconInput = computed(() => iconParts(this.icon()));
  protected readonly gutter = computed(() => gutters(this.row));
  protected readonly textClass = computed(() =>
    this.size() === 'sm' ? typeClass('body', 'compact') : this.sizeClasses().text,
  );
  protected readonly hostClass = computed(() =>
    cn(
      'relative z-10 flex w-full cursor-pointer select-none items-center gap-2 pl-2 text-left outline-none',
      'transition-[padding] duration-80 pr-[var(--row-gutter)] group-hover/menu-sub-item:pr-[var(--row-gutter-hover)] group-focus-within/menu-sub-item:pr-[var(--row-gutter-hover)] group-has-[[data-sidebar=menu-action]:is([data-state=open],[data-popup-open],[aria-expanded=true])]/menu-sub-item:pr-[var(--row-gutter-hover)]',
      this.size() === 'sm' ? 'h-6' : this.sizeClasses().variant === 'compact' ? 'h-6' : 'h-7',
      this.shape().item,
      this.userClass(),
    ),
  );
  protected readonly iconClass = computed(() =>
    cn(ICON_BASE, this.lit() ? 'text-foreground' : 'text-muted-foreground'),
  );

  constructor() {
    bindRow(this.row, this.element, () => this.isActive());
  }
}
