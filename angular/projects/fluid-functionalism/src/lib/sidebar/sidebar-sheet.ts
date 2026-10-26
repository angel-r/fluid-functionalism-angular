import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  type TemplateRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Dialog, type DialogRef, type DialogRole } from '@angular/cdk/dialog';
import type { Subscription } from 'rxjs';
import { cn } from '../core/utils';
import { exitFallbackMs, spring } from '../core/springs';
import { enterTransition, exitTransition, injectAnimateFluid, type FluidAnimation } from '../core/motion';
import { SURFACE_LEVEL } from '../core/surface';
import { surfaceClasses } from '../core/surface-classes';
import { injectSidebar, type SidebarSide } from '../sidebar-core/sidebar-context';

const pageLevel = signal(1).asReadonly();

/** The surface step the mobile sheet's content sits on: two above the page. */
export function sheetLevel(substrate: number) {
  return Math.min(substrate + 2, 8);
}

// ─── Mobile sheet ────────────────────────────────────────────────────────────
//
// Built on the CDK Dialog (React: Base UI Dialog): scroll lock, focus trap,
// focus restore, Escape + outside-press dismissal, while leaving the slide to
// Motion. The dialog is held OPEN through the exit: a dismissal slides the
// panel offscreen first, and only when the tween lands does the close
// propagate (`close`). A parent-driven close gets the same exit.

/** Internal: the drawer `ff-sidebar` renders below the mobile breakpoint. */
@Component({
  selector: 'ff-sidebar-sheet',
  imports: [NgTemplateOutlet],
  host: { style: 'display: contents' },
  template: `
    <ng-template #sheet>
      <!-- Scrim: an always-on bg-black/40 base that stays visible for
           system-dark users, boosted to /80 in explicit dark mode. -->
      <div
        data-slot="sidebar-sheet-backdrop"
        class="fixed inset-0 bg-black/40 dark:bg-black/80 z-40"
        style="opacity: 0"
        aria-hidden="true"
        (click)="requestClose()"
      ></div>
      <!-- The panel takes initial focus itself: left to the focus trap, the
           first nav row would read as selected the moment the drawer opens. -->
      <div
        data-sidebar="sidebar"
        data-mobile="true"
        [attr.data-side]="side()"
        role="dialog"
        aria-modal="true"
        aria-label="Sidebar"
        tabindex="-1"
        [class]="panelClass()"
        [style.width]="sidebar.widthMobile()"
      >
        <ng-container [ngTemplateOutlet]="content()" />
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarSheet {
  readonly side = input.required<SidebarSide>();
  readonly open = input.required<boolean>();
  /** The sidebar's content, rendered inside the panel. */
  readonly content = input.required<TemplateRef<unknown>>();
  /** The sheet finished closing after a dismissal (Escape, scrim press). */
  readonly close = output<void>();

  protected readonly sidebar = injectSidebar();
  private readonly substrate = inject(SURFACE_LEVEL, { optional: true, skipSelf: true }) ?? pageLevel;
  private readonly level = computed(() => sheetLevel(this.substrate()));
  private readonly closing = signal(false);
  /** True while the dialog is attached (open, or playing its exit). */
  readonly mounted = signal(false);

  protected readonly panelClass = computed(() =>
    cn(
      'fixed inset-y-0 z-50 flex flex-col overflow-hidden outline-none',
      !(this.open() && !this.closing()) && 'pointer-events-none',
      this.side() === 'left' ? 'left-0' : 'right-0',
      surfaceClasses(this.level(), 3),
    ),
  );

  private readonly template = viewChild.required<TemplateRef<unknown>>('sheet');
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);
  private readonly animate = injectAnimateFluid();

  private ref: DialogRef<unknown, unknown> | null = null;
  private subscriptions: Subscription[] = [];
  private animations: FluidAnimation[] = [];
  private fallback: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const open = this.open();
      untracked(() => (open ? this.show() : this.startExit()));
    });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.fallback);
      this.stopAnimations();
      this.release();
    });
  }

  private offscreen() {
    return this.side() === 'left' ? '-100%' : '100%';
  }

  private elements() {
    const root = this.ref?.overlayRef.overlayElement;
    return {
      backdrop: root?.querySelector<HTMLElement>('[data-slot="sidebar-sheet-backdrop"]') ?? null,
      panel: root?.querySelector<HTMLElement>('[data-mobile="true"]') ?? null,
    };
  }

  private show() {
    clearTimeout(this.fallback);
    this.closing.set(false);
    const fresh = !this.ref;
    if (fresh) this.mount();
    const { backdrop, panel } = this.elements();
    this.stopAnimations();
    if (backdrop) {
      this.animations.push(this.animate(backdrop, { opacity: fresh ? [0, 1] : 1 }, { duration: spring.moderate.duration }));
    }
    if (panel) {
      if (fresh) panel.style.transform = `translateX(${this.offscreen()})`;
      // spring.moderate: critically damped, so the panel decelerates into
      // x: 0 without overshooting and exposing the page behind its edge.
      this.animations.push(
        this.animate(panel, { x: fresh ? [this.offscreen(), 0] : 0 }, enterTransition(spring.moderate)),
      );
    }
  }

  /** A dismissal from inside the sheet (Escape, a scrim press). */
  protected requestClose() {
    this.startExit();
  }

  private startExit() {
    if (!this.ref || this.closing()) return;
    this.closing.set(true);
    const { backdrop, panel } = this.elements();
    this.stopAnimations();
    if (backdrop) this.animations.push(this.animate(backdrop, { opacity: 0 }, exitTransition(spring.moderate)));
    if (panel) {
      const exit = this.animate(panel, { x: this.offscreen() }, exitTransition(spring.moderate));
      this.animations.push(exit);
      exit.finished.then(() => {
        if (this.animations.includes(exit)) this.finishClose();
      });
    }
    // Fallback: animation callbacks stall in throttled tabs.
    clearTimeout(this.fallback);
    this.fallback = setTimeout(() => this.finishClose(), exitFallbackMs(spring.moderate));
  }

  private finishClose() {
    if (!this.closing()) return;
    clearTimeout(this.fallback);
    this.closing.set(false);
    this.stopAnimations();
    this.release();
    if (untracked(this.open)) this.close.emit();
  }

  private mount() {
    const ref = this.dialog.open(this.template(), {
      injector: this.injector,
      hasBackdrop: false,
      disableClose: true,
      closeOnNavigation: false,
      autoFocus: '[data-mobile="true"]',
      restoreFocus: true,
      // The panel inside carries role="dialog" and its name; the container is
      // only the focus trap.
      role: null as unknown as DialogRole,
      ariaModal: null as unknown as boolean,
    });
    this.ref = ref;
    this.mounted.set(true);
    this.subscriptions = [
      ref.keydownEvents.subscribe((e) => {
        if (e.key === 'Escape' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          this.requestClose();
        }
      }),
      // Closed from outside (the dialog service closing everything).
      ref.closed.subscribe(() => {
        if (this.ref !== ref) return;
        this.ref = null;
        this.mounted.set(false);
        this.unsubscribe();
        if (untracked(this.open)) this.close.emit();
      }),
    ];
  }

  private release() {
    const ref = this.ref;
    this.ref = null;
    this.mounted.set(false);
    this.unsubscribe();
    ref?.close();
  }

  private unsubscribe() {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
  }

  private stopAnimations() {
    const running = this.animations;
    this.animations = [];
    running.forEach((a) => a.stop());
  }
}
