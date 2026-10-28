import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
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
import { Dialog, type DialogRef, type DialogRole } from '@angular/cdk/dialog';
import type { Subscription } from 'rxjs';
import {
  exitFallbackMs,
  spring,
  enterTransition,
  exitTransition,
  injectAnimateFluid,
  type FluidAnimation,
  SURFACE_LEVEL,
  surfaceClasses,
} from '@angel-r/fluid-functionalism-angular/core';

// Built on the CDK Dialog: it provides everything the drawer needs — scroll
// lock, focus trap, focus restore after close — while leaving the slide
// animation to Motion. The dialog's own backdrop and Escape handling are off:
// the drawer draws its own animated scrim and only REPORTS dismissals
// (Escape, a backdrop click) through `close`; closing is the parent's job,
// by setting `open` to false. The overlay then stays attached until the exit
// tween has played.

const pageLevel = signal(1).asReadonly();

/**
 * A navigation drawer that slides in from the left edge.
 *
 *   <ff-mobile-drawer [open]="open()" [triggerRef]="menuButton" (close)="open.set(false)">
 *     <nav>…</nav>
 *   </ff-mobile-drawer>
 */
@Component({
  selector: 'ff-mobile-drawer',
  providers: [
    // The content sits two surface steps above the drawer's substrate.
    { provide: SURFACE_LEVEL, useFactory: () => inject(MobileDrawer).level },
  ],
  host: { style: 'display: contents' },
  template: `
    <ng-template #drawer>
      <!-- Overlay — same scrim as the library's dialogs: an always-on
           bg-black/40 base that stays visible for system-dark users, boosted
           to /80 in explicit dark mode. -->
      <div
        data-slot="mobile-drawer-backdrop"
        class="fixed inset-0 bg-black/40 dark:bg-black/80 z-40"
        style="opacity: 0"
        aria-hidden="true"
        (click)="close.emit()"
      ></div>
      <div
        data-slot="mobile-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        [class]="panelClass()"
        style="transform: translateX(-100%)"
      >
        <ng-content />
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileDrawer {
  readonly open = input.required<boolean>();
  /** Where focus returns after the drawer closes. Defaults to the element
   *  that had focus when it opened. */
  readonly triggerRef = input<HTMLElement | ElementRef<HTMLElement> | null | undefined>(undefined);
  /** A dismissal was requested (Escape, backdrop click). Set `open` to false. */
  readonly close = output<void>();

  private readonly substrate = inject(SURFACE_LEVEL, { optional: true, skipSelf: true }) ?? pageLevel;
  readonly level = computed(() => Math.min(this.substrate() + 2, 8));
  protected readonly panelClass = computed(
    () => `fixed top-0 left-0 bottom-0 w-64 ${surfaceClasses(this.level(), 3)} z-50 overflow-y-auto p-4`,
  );

  private readonly template = viewChild.required<TemplateRef<unknown>>('drawer');
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
      untracked(() => (open ? this.show() : this.hide()));
    });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.fallback);
      this.stopAnimations();
      this.release();
    });
  }

  private elements() {
    const root = this.ref?.overlayRef.overlayElement;
    return {
      backdrop: root?.querySelector<HTMLElement>('[data-slot="mobile-drawer-backdrop"]') ?? null,
      panel: root?.querySelector<HTMLElement>('[data-slot="mobile-drawer-panel"]') ?? null,
    };
  }

  private show() {
    clearTimeout(this.fallback);
    const fresh = !this.ref;
    if (fresh) this.mount();
    const { backdrop, panel } = this.elements();
    this.stopAnimations();
    if (backdrop) {
      this.animations.push(this.animate(backdrop, { opacity: fresh ? [0, 1] : 1 }, { duration: 0.16 }));
    }
    if (panel) {
      // spring.moderate: critically damped, so the panel decelerates into
      // x: 0 without overshooting (a bounce would expose the page through
      // the gap on the left edge).
      this.animations.push(
        this.animate(panel, { x: fresh ? ['-100%', 0] : 0 }, enterTransition(spring.moderate)),
      );
    }
  }

  private hide() {
    if (!this.ref) return;
    const { backdrop, panel } = this.elements();
    this.stopAnimations();
    if (backdrop) {
      this.animations.push(this.animate(backdrop, { opacity: 0 }, exitTransition(spring.moderate)));
    }
    if (panel) {
      const exit = this.animate(panel, { x: '-100%' }, exitTransition(spring.moderate));
      this.animations.push(exit);
      // Release the overlay once the exit tween has finished.
      exit.finished.then(() => {
        if (this.animations.includes(exit)) this.unmountIfClosed();
      });
    }
    // Fallback release: animation callbacks can stall in throttled or
    // background tabs. The longest exit is spring.moderate's.
    clearTimeout(this.fallback);
    this.fallback = setTimeout(() => this.unmountIfClosed(), exitFallbackMs(spring.moderate));
  }

  private mount() {
    const trigger = this.triggerRef();
    const ref = this.dialog.open(this.template(), {
      injector: this.injector,
      hasBackdrop: false,
      disableClose: true,
      closeOnNavigation: false,
      autoFocus: 'first-tabbable',
      restoreFocus: (trigger instanceof ElementRef ? trigger.nativeElement : trigger) ?? true,
      // The panel inside carries role="dialog" and its name; the container is
      // only the focus trap.
      role: null as unknown as DialogRole,
      ariaModal: null as unknown as boolean,
    });
    this.ref = ref;
    this.subscriptions = [
      ref.keydownEvents.subscribe((e) => {
        if (e.key === 'Escape' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          this.close.emit();
        }
      }),
      // Closed from outside (the dialog service closing everything): report it.
      ref.closed.subscribe(() => {
        if (this.ref !== ref) return;
        this.ref = null;
        this.unsubscribe();
        if (untracked(this.open)) this.close.emit();
      }),
    ];
  }

  private unmountIfClosed() {
    if (untracked(this.open)) return;
    clearTimeout(this.fallback);
    this.stopAnimations();
    this.release();
  }

  private release() {
    const ref = this.ref;
    this.ref = null;
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
