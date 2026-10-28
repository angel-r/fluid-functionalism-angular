import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { AnimationOptions } from 'motion';
import { cn, spring, enterTransition, exitTransition } from '../core';
import { SidebarMenu } from './sidebar-menu';
import { SIDEBAR_MENU_ANIMATE } from './menu-utils';

const snap: AnimationOptions = { duration: 0 };

/**
 * A row's sub-tree: `<ul data-sidebar="menu-sub">` inside a measured-height
 * collapse wrapper (the host). Its rows register with the surrounding
 * SidebarMenu, so one hover background glides from a parent row into its
 * children.
 *
 *   <li ffSidebarMenuItem>
 *     <button ffSidebarMenuButton [attr.aria-expanded]="open()" (click)="open.set(!open())">Agents</button>
 *     <ff-sidebar-menu-sub [open]="open()">
 *       <li ffSidebarMenuSubItem><a ffSidebarMenuSubButton href="#">Support triage</a></li>
 *     </ff-sidebar-menu-sub>
 *   </li>
 *
 * `class` lands on the wrapper; `listClass` on the inner `<ul>` (React's
 * `className`).
 */
@Component({
  selector: 'ff-sidebar-menu-sub',
  host: {
    'data-slot': 'sidebar-menu-sub-wrapper',
    '[class]': 'wrapperClass()',
  },
  template: `
    <ul
      #list
      data-sidebar="menu-sub"
      [attr.data-state]="open() ? 'open' : 'closed'"
      [attr.aria-hidden]="open() ? null : true"
      [class]="listClassName()"
    >
      <ng-content />
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarMenuSub {
  /** Built-in measured-height collapse. Omitted, the sub-menu is always
   *  visible; wire it to state (with a toggling row button) for a
   *  collapsible tree. */
  readonly open = input(true, { transform: booleanAttribute });
  /** Extra classes for the inner `<ul>`. */
  readonly listClass = input('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly scope = inject(SidebarMenu, { optional: true });
  private readonly animate = inject(SIDEBAR_MENU_ANIMATE);
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  // Measured-height collapse: animate between 0 and the content's real
  // offsetHeight — never to "auto", which measures wrong under a scaled
  // ancestor.
  private readonly contentHeight = signal<number | null>(null);
  private readonly measured = computed(() => this.contentHeight() !== null);

  protected readonly wrapperClass = computed(() =>
    // `block`: the host is a custom element (inline by default) standing in
    // for React's wrapper <div>.
    cn('block overflow-hidden', !this.measured() && !this.open() && 'h-0'),
  );
  protected readonly listClassName = computed(() =>
    cn(
      // ml-[15px] (a margin, not a translate, so the rows' measured rects
      // include it) + 1px border + pl-2 lands the sub-row label (+ the row's
      // own pl-2 = 32px) exactly on the parent label's x (px-2 + 16px icon +
      // gap-2 = 32px).
      'relative ml-[15px] flex min-w-0 flex-col border-l border-border pl-2 select-none',
      this.listClass(),
    ),
  );

  constructor() {
    // Toggling flips the rows' visibility in place (they stay registered),
    // so the scope re-reads what is visible.
    effect(() => {
      this.open();
      untracked(() => this.scope?.refreshVisibility());
    });

    let observer: ResizeObserver | null = null;
    afterNextRender(() => {
      const el = this.list().nativeElement;
      if (typeof ResizeObserver === 'undefined') return;
      const measure = () => this.contentHeight.set(el.offsetHeight);
      measure();
      observer = new ResizeObserver(measure);
      observer.observe(el);
    });

    // Same rule as SidebarGroup: spring only when this sub-tree itself
    // toggles. A height change coming from a nested sub collapsing inside it
    // snaps, so the wrapper tracks its content instead of chasing it with a
    // second spring and moving everything below late.
    let started = false;
    let prevOpen = untracked(this.open);
    let toggling = false;
    let last = '';
    effect(() => {
      const open = this.open();
      const height = this.contentHeight();
      untracked(() => {
        if (open !== prevOpen) {
          prevOpen = open;
          toggling = true;
        }
        const target: Record<string, number> =
          height !== null ? { height: open ? height : 0, opacity: open ? 1 : 0 } : { opacity: open ? 1 : 0 };
        const key = JSON.stringify(target);
        if (started && key === last) return;
        last = key;
        if (!started) {
          // `initial={false}`: the first state is applied, not animated.
          started = true;
          this.applyNow(target);
          this.animate(this.host, target, snap);
          return;
        }
        const transition = toggling ? (open ? enterTransition(spring.moderate) : exitTransition(spring.moderate)) : snap;
        if (height !== null && transition === snap) this.applyNow(target);
        const controls = this.animate(this.host, target, transition);
        controls.finished.then(() => (toggling = false), () => undefined);
      });
    });

    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }

  private applyNow(target: Record<string, number>) {
    if ('height' in target) this.host.style.height = `${target['height']}px`;
    this.host.style.opacity = String(target['opacity']);
  }
}
