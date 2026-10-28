import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  HostAttributeToken,
  booleanAttribute,
  computed,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
} from '@angular/core';
import { cn, injectShape, injectSize, typeClass, fontWeights } from '@angel-r/fluid-functionalism-angular/core';
import { SIDEBAR_MENU_ACTIONS_CLUSTER, SidebarMenuRow } from './sidebar-menu-item';
import { ACTION_TOP, BADGE_TOP } from './menu-utils';

// ─── SidebarMenuAction ───────────────────────────────────────────────────────

/**
 * A trailing icon control on a row. Put it on a `<button>` (or on a dropdown
 * trigger: `<button ffSidebarMenuAction ffDropdownTrigger>`). Its click never
 * reaches the row.
 *
 *   <button ffSidebarMenuAction showOnHover aria-label="Share"><ff-icon name="link" /></button>
 */
@Directive({
  selector: '[ffSidebarMenuAction]',
  host: {
    'data-sidebar': 'menu-action',
    '[attr.type]': 'type',
    '[attr.data-show-on-hover]': "showOnHover() ? '' : null",
    '[class]': 'hostClass()',
    '[style.--icon-size]': "sizeClasses().icon + 'px'",
    // The action often sits on a row composed onto another element — keep
    // its click from also triggering the row.
    '(click)': '$event.stopPropagation()',
  },
})
export class SidebarMenuAction {
  /** Hide the action until the row is hovered or focused. The row reserves
   *  its width only while it shows. */
  readonly showOnHover = input(false, { transform: booleanAttribute });
  readonly userClass = input('', { alias: 'class' });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly row = inject(SidebarMenuRow, { optional: true });
  private readonly inCluster = inject(SIDEBAR_MENU_ACTIONS_CLUSTER, { optional: true }) ?? false;
  private readonly shape = injectShape();
  protected readonly sizeClasses = injectSize();

  protected readonly type =
    this.element.tagName === 'BUTTON' ? (inject(new HostAttributeToken('type'), { optional: true }) ?? 'button') : null;

  protected readonly hostClass = computed(() => {
    const inCluster = this.inCluster;
    const sub = this.row?.isSubRow ?? false;
    return cn(
      // right-1.5 centers the 24px hit-box on the same axis as the badge
      // (right-2 + min-w-5): both land 18px from the row's right edge. With a
      // badge on the same row the badge keeps that rightmost spot and the
      // action slides left of it. Inside a cluster the wrapper owns the
      // positioning and actions simply flow.
      inCluster
        ? 'relative flex size-6 shrink-0 items-center justify-center text-muted-foreground outline-none'
        : 'absolute right-1.5 z-10 flex size-6 items-center justify-center text-muted-foreground outline-none',
      !inCluster &&
        (sub
          ? 'group-has-[>[data-sidebar=menu-badge]]/menu-sub-item:right-8.5'
          : 'group-has-[>[data-sidebar=menu-badge]]/menu-item:right-8.5'),
      !inCluster && ACTION_TOP,
      'hover:bg-hover hover:text-foreground transition-[color,background-color,opacity] duration-80',
      'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
      // One icon size across the sidebar: row actions match the leading
      // icons and the section header's actions, all on the size ladder.
      // Normalize bare icons to the site's 1.5 stroke, thickening to 2 on
      // hover — Button's icon-only treatment.
      '[&_svg]:size-[var(--icon-size)] [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-80 hover:[&_svg]:stroke-[2]',
      this.shape().item,
      // Reveal on the OWN row only. A sub action must not use the menu-item
      // group — its nearest one is the parent li, which would light every
      // sibling sub action on any hover inside the sub-tree.
      !inCluster &&
        this.showOnHover() &&
        (sub
          ? 'opacity-0 group-hover/menu-sub-item:opacity-100 group-focus-within/menu-sub-item:opacity-100 data-[state=open]:opacity-100 aria-expanded:opacity-100'
          : // Tracks the row's own button (its peer), not the <li> — a row
            // that hosts a sub-menu wraps its children too, and hovering a
            // child should not light the parent's action.
            'opacity-0 peer-hover/menu-button:opacity-100 peer-focus-visible/menu-button:opacity-100 hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 aria-expanded:opacity-100'),
      this.userClass(),
    );
  });

  constructor() {
    // A lone action registers its own slot; inside a cluster the wrapper
    // registers the whole count and each action flows in its row.
    const row = this.row;
    if (this.inCluster || !row) return;
    effect(() => row.setActions(1, this.showOnHover()));
    inject(DestroyRef).onDestroy(() => row.setActions(0, false));
  }
}

// ─── SidebarMenuActions ──────────────────────────────────────────────────────

/**
 * Row-level cluster for more than one SidebarMenuAction. It owns the
 * positioning and publishes the whole count to the row, so the button
 * reserves the exact gutter the cluster occupies.
 *
 *   <div ffSidebarMenuActions showOnHover>
 *     <button ffSidebarMenuAction aria-label="Branch">…</button>
 *     <button ffSidebarMenuAction aria-label="Share">…</button>
 *   </div>
 */
@Directive({
  selector: '[ffSidebarMenuActions]',
  providers: [{ provide: SIDEBAR_MENU_ACTIONS_CLUSTER, useValue: true }],
  host: { 'data-sidebar': 'menu-actions', '[class]': 'hostClass()' },
})
export class SidebarMenuActions {
  /** Hide the cluster until the row is hovered or focused. */
  readonly showOnHover = input(false, { transform: booleanAttribute });
  readonly userClass = input('', { alias: 'class' });

  private readonly row = inject(SidebarMenuRow, { optional: true });
  private readonly actions = contentChildren(forwardRef(() => SidebarMenuAction), { descendants: true });

  protected readonly hostClass = computed(() => {
    const sub = this.row?.isSubRow ?? false;
    return cn(
      'absolute right-1.5 z-10 flex items-center gap-1',
      // The badge keeps the rightmost slot; the cluster sits left of it.
      sub
        ? 'group-has-[>[data-sidebar=menu-badge]]/menu-sub-item:right-8.5'
        : 'group-has-[>[data-sidebar=menu-badge]]/menu-item:right-8.5',
      ACTION_TOP,
      this.showOnHover() &&
        (sub
          ? 'opacity-0 transition-opacity duration-80 group-hover/menu-sub-item:opacity-100 group-focus-within/menu-sub-item:opacity-100 has-[[data-state=open]]:opacity-100 has-[[data-popup-open]]:opacity-100'
          : // Peer-scoped for the same reason as a lone action: the row's
            // <li> also wraps its sub-menu.
            'opacity-0 transition-opacity duration-80 peer-hover/menu-button:opacity-100 peer-focus-visible/menu-button:opacity-100 hover:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100 has-[[data-popup-open]]:opacity-100'),
      this.userClass(),
    );
  });

  constructor() {
    const row = this.row;
    if (!row) return;
    effect(() => row.setActions(this.actions().length, this.showOnHover()));
    inject(DestroyRef).onDestroy(() => row.setActions(0, false));
  }
}

// ─── SidebarMenuBadge ────────────────────────────────────────────────────────

/** `<div ffSidebarMenuBadge>12</div>`: a trailing count. Keeps the rightmost
 *  slot when the row also has actions. */
@Directive({
  selector: '[ffSidebarMenuBadge]',
  host: {
    'data-sidebar': 'menu-badge',
    '[class]': 'hostClass()',
    '[style.font-variation-settings]': 'lit() ? semibold : normal',
  },
})
export class SidebarMenuBadge {
  readonly userClass = input('', { alias: 'class' });

  private readonly row = inject(SidebarMenuRow, { optional: true });
  private readonly sizeClasses = injectSize();
  protected readonly semibold = fontWeights.semibold;
  protected readonly normal = fontWeights.normal;
  protected readonly lit = computed(() => this.row?.isActiveRow() ?? false);

  protected readonly hostClass = computed(() => {
    const variant = this.sizeClasses().variant;
    return cn(
      'pointer-events-none absolute right-2 z-10 flex h-5 min-w-5 items-center justify-center px-1 tabular-nums',
      BADGE_TOP,
      typeClass('micro', variant),
      'transition-[color,font-variation-settings] duration-80',
      this.lit() ? 'text-foreground' : 'text-muted-foreground',
      this.userClass(),
    );
  });

  constructor() {
    const row = this.row;
    if (!row) return;
    row.setHasBadge(true);
    inject(DestroyRef).onDestroy(() => row.setHasBadge(false));
  }
}

// ─── SidebarMenuSkeleton ─────────────────────────────────────────────────────

// Deterministic width cycle (not Math.random) so server and client render the
// same markup — a random width per render is a hydration mismatch.
export const SIDEBAR_MENU_SKELETON_WIDTHS = ['62%', '74%', '55%', '82%', '68%'] as const;
let skeletonSeq = 0;

/** `<div ffSidebarMenuSkeleton showIcon></div>`: a placeholder row while data
 *  lands. */
@Component({
  selector: '[ffSidebarMenuSkeleton]',
  host: { 'data-sidebar': 'menu-skeleton', '[class]': 'hostClass()' },
  template: `
    @if (showIcon()) {
      <div data-sidebar="menu-skeleton-icon" class="size-4 shrink-0 animate-pulse rounded-md bg-hover"></div>
    }
    <div data-sidebar="menu-skeleton-text" class="h-4 flex-1 animate-pulse rounded-md bg-hover" [style.max-width]="width"></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarMenuSkeleton {
  readonly showIcon = input(false, { transform: booleanAttribute });
  readonly userClass = input('', { alias: 'class' });

  private readonly sizeClasses = injectSize();
  protected readonly width = SIDEBAR_MENU_SKELETON_WIDTHS[skeletonSeq++ % SIDEBAR_MENU_SKELETON_WIDTHS.length];
  protected readonly hostClass = computed(() =>
    cn('flex items-center gap-2 px-2', this.sizeClasses().variant === 'compact' ? 'h-7' : 'h-8', this.userClass()),
  );
}
