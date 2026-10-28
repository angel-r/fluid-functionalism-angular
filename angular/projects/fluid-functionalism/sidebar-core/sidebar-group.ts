import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { animate, type AnimationOptions, type AnimationPlaybackControls } from 'motion';
import {
  cn,
  spring,
  enterTransition,
  exitTransition,
  injectShape,
  injectSize,
  injectSizeVariant,
  typeClass,
  Icon,
} from '@angel-r/fluid-functionalism-angular/core';
import { wrapLeadingText } from './leading-text';

let nextId = 0;
const snap: AnimationOptions = { duration: 0 };

// ─── SidebarGroupAction / SidebarGroupActions ───────────────────────────────

/**
 * Header action cluster: 1–3 SidebarGroupActions laid out in a row over the
 * group label's right edge. Use instead of a lone action when a section needs
 * several controls: `<div ffSidebarGroupActions>`.
 */
@Directive({
  selector: '[ffSidebarGroupActions]',
  host: { 'data-sidebar': 'group-actions', '[class]': 'hostClass()' },
})
export class SidebarGroupActions {
  readonly userClass = input('', { alias: 'class' });
  private readonly actions = contentChildren(forwardRef(() => SidebarGroupAction), { descendants: true });
  /** How many actions the cluster holds. */
  readonly count = computed(() => this.actions().length);
  protected readonly hostClass = computed(() =>
    cn(
      // right-3.5 lands the last 24px action's centre 26px from the sidebar's
      // inner edge — the rows' badge/action axis.
      'absolute right-3.5 top-2 z-10 flex h-8 items-center gap-1',
      this.userClass(),
    ),
  );
}

/**
 * A control on the group's label row. Goes on the control itself (React's
 * `render` / `asChild`): `<button ffSidebarGroupAction aria-label="Add">`.
 */
@Directive({
  selector: '[ffSidebarGroupAction]',
  host: {
    'data-sidebar': 'group-action',
    '[attr.type]': "isButton ? 'button' : null",
    '[class]': 'hostClass()',
    '[style.--icon-size]': 'iconSize()',
  },
})
export class SidebarGroupAction {
  readonly userClass = input('', { alias: 'class' });
  protected readonly isButton = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'BUTTON';
  // True inside a SidebarGroupActions cluster, where each action sits in the
  // flex row instead of positioning itself absolutely.
  private readonly inCluster = !!inject(SidebarGroupActions, { optional: true });
  private readonly shape = injectShape();
  private readonly size = injectSize();
  protected readonly iconSize = computed(() => `${this.size().icon}px`);
  protected readonly hostClass = computed(() =>
    cn(
      this.inCluster
        ? 'relative flex size-6 items-center justify-center text-muted-foreground outline-none'
        : // size-6 matches the rows' action hit-box, and right-3.5 puts that
          // 24px box's centre 26px from the sidebar's inner edge.
          'absolute right-3.5 top-3 flex size-6 items-center justify-center text-muted-foreground outline-none',
      'hover:bg-hover hover:text-foreground transition-colors duration-80',
      'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
      // Normalize bare icons to the 1.5 stroke, thickening to 2 on hover — the
      // same treatment Button's icon-only span applies.
      '[&_svg]:size-[var(--icon-size)] [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-80 hover:[&_svg]:stroke-[2]',
      this.shape().item,
      this.userClass(),
    ),
  );
}

// ─── SidebarGroup ────────────────────────────────────────────────────────────

/**
 * A section of the sidebar. `collapsible` makes its SidebarGroupLabel a toggle
 * that collapses everything after it — a group-level accordion. Uncontrolled
 * by default; bind `[(open)]` to control it.
 *
 *   <ff-sidebar-group collapsible>
 *     <ff-sidebar-group-label>Projects</ff-sidebar-group-label>
 *     <button ffSidebarGroupAction aria-label="Add project">…</button>
 *     <div ffSidebarGroupContent>…</div>
 *   </ff-sidebar-group>
 *
 * The label and header actions stay put; everything else rides in the
 * collapse wrapper.
 */
@Component({
  selector: 'ff-sidebar-group',
  imports: [NgTemplateOutlet],
  host: {
    'data-sidebar': 'group',
    '[attr.data-state]': "collapsible() ? (isOpen() ? 'open' : 'closed') : null",
    '[class]': 'hostClass()',
  },
  template: `
    <ng-template #labelSlot><ng-content select="ff-sidebar-group-label, [ffSidebarGroupLabel]" /></ng-template>
    <ng-template #actionsSlot><ng-content select="[ffSidebarGroupAction], [ffSidebarGroupActions]" /></ng-template>
    <ng-template #restSlot><ng-content /></ng-template>
    @if (collapsing()) {
      <!-- Header hover scope: hovering anywhere on the row — the overlaid
           action cluster included — reveals the label's chevron. Kept
           position-static so the cluster still anchors to the group. -->
      <div class="group/group-header w-full">
        <ng-container [ngTemplateOutlet]="labelSlot" />
        <ng-container [ngTemplateOutlet]="actionsSlot" />
      </div>
      <div #collapse [id]="contentId" [attr.aria-hidden]="isOpen() ? null : true" [class]="collapseClass()">
        <div #content class="flex w-full min-w-0 flex-col">
          <ng-container [ngTemplateOutlet]="restSlot" />
        </div>
      </div>
    } @else {
      <ng-container [ngTemplateOutlet]="labelSlot" />
      <ng-container [ngTemplateOutlet]="actionsSlot" />
      <ng-container [ngTemplateOutlet]="restSlot" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarGroup {
  readonly collapsible = input(false, { transform: booleanAttribute });
  /** Controlled open state of a collapsible group. */
  readonly open = input<boolean | undefined>(undefined);
  readonly defaultOpen = input(true, { transform: booleanAttribute });
  readonly openChange = output<boolean>();
  readonly userClass = input('', { alias: 'class' });

  private readonly uncontrolled = linkedSignal(() => this.defaultOpen());
  readonly isOpen = computed(() => this.open() ?? this.uncontrolled());
  readonly contentId = `ff-sidebar-group-content-${++nextId}`;

  private readonly label = contentChild(forwardRef(() => SidebarGroupLabel));
  private readonly loneActions = contentChildren(SidebarGroupAction);
  private readonly clusters = contentChildren(SidebarGroupActions);
  /** Collapsing needs a label to toggle it; without one the group renders untouched. */
  protected readonly collapsing = computed(() => this.collapsible() && !!this.label());
  /** How many header action buttons overlay the label's right edge — the
   *  collapsible label pads itself so its chevron clears them. */
  readonly actionsCount = computed(
    () => this.loneActions().length + this.clusters().reduce((n, cluster) => n + cluster.count(), 0),
  );

  protected readonly hostClass = computed(() => cn('relative flex w-full min-w-0 flex-col p-2', this.userClass()));

  // Measured-height collapse: animate between 0 and the content's real
  // offsetHeight — never to "auto".
  private readonly contentHeight = signal<number | null>(null);
  // The collapse wrapper must clip while animating, but a permanently clipped
  // box shaves the 2px focus ring off a group's first and last rows — so
  // clipping lifts once an open group has settled.
  private readonly settledRaw = signal(untracked(this.isOpen));
  private readonly settled = computed(() => this.isOpen() && this.settledRaw());
  protected readonly collapseClass = computed(() =>
    cn(
      this.isOpen() && this.settled() ? 'overflow-visible' : 'overflow-hidden',
      this.contentHeight() === null && !this.isOpen() && 'h-0',
    ),
  );

  private readonly collapseEl = viewChild<ElementRef<HTMLElement>>('collapse');
  private readonly contentEl = viewChild<ElementRef<HTMLElement>>('content');
  private animation: AnimationPlaybackControls | null = null;
  private lastEl: HTMLElement | null = null;
  private prevOpen = untracked(this.isOpen);
  private toggling = false;

  constructor() {
    effect((onCleanup) => {
      const el = this.contentEl()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') {
        untracked(() => this.contentHeight.set(null));
        return;
      }
      const measure = () => this.contentHeight.set(el.offsetHeight);
      untracked(measure);
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      onCleanup(() => ro.disconnect());
    });

    effect(() => {
      const open = this.isOpen();
      const height = this.contentHeight();
      const el = this.collapseEl()?.nativeElement ?? null;
      untracked(() => this.animateCollapse(el, open, height));
    });

    inject(DestroyRef).onDestroy(() => this.animation?.stop());
  }

  toggle() {
    const next = !untracked(this.isOpen);
    this.uncontrolled.set(next);
    this.openChange.emit(next);
  }

  private animateCollapse(el: HTMLElement | null, open: boolean, height: number | null) {
    // Height animates only when THIS group toggles. When the measured height
    // changes underneath it instead — a nested sub-menu collapsing inside the
    // group — the wrapper must snap: a spring re-targeted every frame chases
    // the child's own animation and drags everything below the group late.
    if (open !== this.prevOpen) {
      this.prevOpen = open;
      this.toggling = true;
      if (!open) this.settledRaw.set(false);
    }
    if (!el) {
      this.lastEl = null;
      return;
    }
    const fresh = el !== this.lastEl;
    this.lastEl = el;
    const transition = fresh || !this.toggling ? snap : open ? enterTransition(spring.moderate) : exitTransition(spring.moderate);
    const target = height !== null ? { height: open ? height : 0, opacity: open ? 1 : 0 } : { opacity: open ? 1 : 0 };
    this.animation?.stop();
    const controls = animate(el, target, transition);
    this.animation = controls;
    const done = () => {
      if (this.animation !== controls) return;
      this.toggling = false;
      if (open) this.settledRaw.set(true);
    };
    controls.finished.then(done, done);
  }
}

// ─── SidebarGroupLabel ───────────────────────────────────────────────────────

const CHEVRON_OPEN_CLASS =
  'w-0 opacity-0 group-hover/group-header:w-6 group-hover/group-header:opacity-100 group-focus-within/group-header:w-6 group-focus-within/group-header:opacity-100 group-has-[[data-sidebar=group-action]:is([data-state=open],[data-popup-open],[aria-expanded=true])]/group-header:w-6 group-has-[[data-sidebar=group-action]:is([data-state=open],[data-popup-open],[aria-expanded=true])]/group-header:opacity-100 pointer-coarse:w-6 pointer-coarse:opacity-100';

/**
 * The group's caption row. Inside a collapsible group it becomes the toggle
 * (a `<button>`): hover only raises its contrast and reveals a chevron, kept
 * visible while collapsed as the reopen cue.
 *
 * `<ff-sidebar-group-label>Projects</ff-sidebar-group-label>` renders its own
 * `<div>` / `<button>`; `<a ffSidebarGroupLabel href="…">` composes the label
 * onto another element instead (React's `render` / `asChild`).
 */
@Component({
  selector: 'ff-sidebar-group-label, [ffSidebarGroupLabel]',
  imports: [NgTemplateOutlet, Icon],
  host: {
    '[style.display]': "ownsElement ? 'contents' : null",
    '[attr.data-sidebar]': "ownsElement ? null : 'group-label'",
    '[class]': "ownsElement ? '' : labelClass()",
    '[attr.aria-expanded]': 'ownsElement || !group ? null : group.isOpen()',
    '[attr.aria-controls]': 'ownsElement || !group ? null : group.contentId',
    '[style.--group-actions-pad]': 'ownsElement ? null : actionsPad()',
    '(click)': 'onHostClick()',
  },
  template: `
    <ng-template #inner>
      <ng-content />
      @if (group) {
        <!-- The chevron occupies an action-sized box, so it reads as one more
             icon in the row. One chevron-right glyph for both states, sprung
             90° to point down while the group is open. While open the box
             collapses to zero width at rest so the label keeps the full row;
             hover/focus (or an open action popup) reveals it. -->
        <span [class]="chevronBoxClass()">
          <span #chevron class="inline-flex">
            <ff-icon name="chevron-right" [size]="size().icon" [strokeWidth]="1.5" class="shrink-0" />
          </span>
        </span>
      }
    </ng-template>
    @if (!ownsElement) {
      <ng-container [ngTemplateOutlet]="inner" />
    } @else if (group) {
      <button
        #element
        type="button"
        data-sidebar="group-label"
        [class]="labelClass()"
        [attr.aria-expanded]="group.isOpen()"
        [attr.aria-controls]="group.contentId"
        [style.--group-actions-pad]="actionsPad()"
        (click)="group.toggle()"
      >
        <ng-container [ngTemplateOutlet]="inner" />
      </button>
    } @else {
      <div #element data-sidebar="group-label" [class]="labelClass()">
        <ng-container [ngTemplateOutlet]="inner" />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarGroupLabel {
  readonly userClass = input('', { alias: 'class' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** As `<ff-sidebar-group-label>` the label renders its own element; as an
   *  attribute, the host element is the label. */
  protected readonly ownsElement = this.host.tagName === 'FF-SIDEBAR-GROUP-LABEL';
  private readonly parent = inject(SidebarGroup, { optional: true });
  /** The collapsible group this label toggles, if any. */
  protected get group(): SidebarGroup | null {
    return this.parent?.collapsible() ? this.parent : null;
  }
  private readonly sizeVariant = injectSizeVariant();
  protected readonly size = injectSize();
  private readonly shape = injectShape();

  private readonly collapsible = computed(() => !!this.parent?.collapsible());
  // The action cluster overlays the label's right edge, so the label pads
  // past it: 24px per action plus 4px between them, plus that gap again, less
  // the 8px the group's padding gives back — 28n + 6.
  protected readonly actionsPad = computed(() => {
    const count = this.collapsible() ? (this.parent?.actionsCount() ?? 0) : 0;
    return count > 0 ? `${count * 28 + 6}px` : null;
  });
  protected readonly labelClass = computed(() => {
    const caption = typeClass('caption', this.sizeVariant());
    if (!this.collapsible()) {
      return cn('flex h-8 shrink-0 items-center gap-2 px-2 text-muted-foreground outline-none', caption, this.userClass());
    }
    return cn(
      'flex h-8 w-full shrink-0 cursor-pointer select-none items-center gap-2 px-2 text-left text-muted-foreground outline-none',
      'transition-colors duration-80 hover:text-muted-foreground',
      this.actionsPad() !== null && 'pr-[var(--group-actions-pad)]',
      'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
      this.shape().item,
      caption,
      this.userClass(),
    );
  });
  protected readonly chevronBoxClass = computed(() =>
    cn(
      'ml-auto flex h-6 shrink-0 items-center justify-center overflow-hidden',
      this.parent?.isOpen() ? CHEVRON_OPEN_CLASS : 'w-6 opacity-100',
    ),
  );

  private readonly element = viewChild<ElementRef<HTMLElement>>('element');
  private readonly chevron = viewChild<ElementRef<HTMLElement>>('chevron');
  private chevronAnimation: AnimationPlaybackControls | null = null;
  private lastChevron: HTMLElement | null = null;

  constructor() {
    // Truncate only the leading text; element children stay flex siblings.
    afterRenderEffect((onCleanup) => {
      const container = this.element()?.nativeElement ?? (this.ownsElement ? null : this.host);
      this.collapsible();
      if (!container) return;
      wrapLeadingText(container);
      if (typeof MutationObserver === 'undefined') return;
      const observer = new MutationObserver(() => wrapLeadingText(container));
      observer.observe(container, { childList: true });
      onCleanup(() => observer.disconnect());
    });

    // The motion wrapper is what turns: Tailwind's rotate-* sets the
    // standalone CSS `rotate`, which transition-transform never covers.
    effect(() => {
      const chevron = this.chevron()?.nativeElement;
      const open = !!this.parent?.isOpen();
      if (!chevron) return;
      untracked(() => {
        const fresh = chevron !== this.lastChevron;
        this.lastChevron = chevron;
        this.chevronAnimation?.stop();
        this.chevronAnimation = animate(chevron, { rotate: open ? 90 : 0 }, fresh ? snap : enterTransition(spring.fast));
      });
    });

    inject(DestroyRef).onDestroy(() => this.chevronAnimation?.stop());
  }

  protected onHostClick() {
    if (!this.ownsElement) this.group?.toggle();
  }
}
