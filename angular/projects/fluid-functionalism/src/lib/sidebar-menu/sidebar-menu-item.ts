import {
  DestroyRef,
  Directive,
  ElementRef,
  InjectionToken,
  type Signal,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { cn } from '../core/utils';
import { SidebarMenu } from './sidebar-menu';

/**
 * What a row (`li[ffSidebarMenuItem]` / `li[ffSidebarMenuSubItem]`) shares
 * with the parts inside it: its hover / active state in the menu scope, and
 * the trailing controls it carries (registered by the action and badge parts,
 * turned into an exact padding reservation by the button).
 */
export abstract class SidebarMenuRow {
  abstract readonly element: HTMLElement;
  /** True inside SidebarMenuSubItem — actions center on the shorter row. */
  abstract readonly isSubRow: boolean;
  abstract readonly isHovered: Signal<boolean>;
  abstract readonly isActiveRow: Signal<boolean>;
  /** True when this row's button is the menu's first row. */
  abstract readonly isFirstRow: Signal<boolean>;
  abstract setActive(active: boolean): void;
  abstract setButtonEl(element: HTMLElement | null): void;
  abstract readonly actionCount: Signal<number>;
  abstract readonly actionsShowOnHover: Signal<boolean>;
  abstract readonly hasBadge: Signal<boolean>;
  abstract setActions(count: number, showOnHover: boolean): void;
  abstract setHasBadge(hasBadge: boolean): void;
}

/** True while rendering inside a SidebarMenuActions cluster, where each
 *  action flows in the wrapper's row instead of positioning itself. */
export const SIDEBAR_MENU_ACTIONS_CLUSTER = new InjectionToken<boolean>('FF_SIDEBAR_MENU_ACTIONS_CLUSTER');

@Directive()
abstract class MenuRowBase extends SidebarMenuRow {
  readonly userClass = input('', { alias: 'class' });
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly scope = inject(SidebarMenu, { optional: true });

  readonly isHovered = computed(() => this.scope?.hoveredRow() === this.element);
  readonly isActiveRow = computed(() => this.scope?.activeRows().includes(this.element) ?? false);
  readonly isFirstRow = computed(() => this.scope?.firstRow() === this.element);

  private readonly trailing = signal({ actionCount: 0, actionsShowOnHover: false, hasBadge: false });
  readonly actionCount = computed(() => this.trailing().actionCount);
  readonly actionsShowOnHover = computed(() => this.trailing().actionsShowOnHover);
  readonly hasBadge = computed(() => this.trailing().hasBadge);

  constructor() {
    super();
    const unregister = this.scope?.registerRow(this.element);
    if (unregister) inject(DestroyRef).onDestroy(unregister);
  }

  setActive(active: boolean) {
    this.scope?.setRowActive(this.element, active);
  }

  setButtonEl(element: HTMLElement | null) {
    this.scope?.setRowButton(this.element, element);
  }

  setActions(count: number, showOnHover: boolean) {
    this.trailing.update((prev) =>
      prev.actionCount === count && prev.actionsShowOnHover === showOnHover
        ? prev
        : { ...prev, actionCount: count, actionsShowOnHover: showOnHover },
    );
  }

  setHasBadge(hasBadge: boolean) {
    this.trailing.update((prev) => (prev.hasBadge === hasBadge ? prev : { ...prev, hasBadge }));
  }
}

/** `<li ffSidebarMenuItem>`: one top-level row. */
@Directive({
  selector: 'li[ffSidebarMenuItem]',
  providers: [{ provide: SidebarMenuRow, useExisting: SidebarMenuItem }],
  host: { 'data-sidebar': 'menu-item', '[class]': 'hostClass()' },
})
export class SidebarMenuItem extends MenuRowBase {
  readonly isSubRow = false;
  protected readonly hostClass = computed(() => cn('group/menu-item relative', this.userClass()));
}

/** `<li ffSidebarMenuSubItem>`: a row inside a SidebarMenuSub. */
@Directive({
  selector: 'li[ffSidebarMenuSubItem]',
  providers: [{ provide: SidebarMenuRow, useExisting: SidebarMenuSubItem }],
  host: { 'data-sidebar': 'menu-sub-item', '[class]': 'hostClass()' },
})
export class SidebarMenuSubItem extends MenuRowBase {
  readonly isSubRow = true;
  protected readonly hostClass = computed(() => cn('group/menu-sub-item relative', this.userClass()));
}
