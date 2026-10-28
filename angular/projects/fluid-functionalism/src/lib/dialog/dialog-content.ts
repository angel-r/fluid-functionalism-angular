import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  type EmbeddedViewRef,
  Injector,
  type TemplateRef,
  ViewContainerRef,
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
import { Dialog as CdkDialog, type DialogRef, type DialogRole } from '@angular/cdk/dialog';
import { type FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import type { Subscription } from 'rxjs';
import {
  cn,
  exitFallbackMs,
  spring,
  enterTransition,
  exitTransition,
  injectAnimateFluid,
  type FluidAnimation,
  SURFACE_LEVEL,
  surfaceClasses,
  injectShape,
  injectSizeVariant,
  Icon,
} from '../core';
import { Button } from '../button';
import { Dialog } from './dialog';

/** A dialog sits this many surface steps above its substrate. */
const DIALOG_OFFSET = 4;

const pageLevel = signal(1).asReadonly();

/** Width: sm 400, lg 540, xl 880 (each one notch narrower in compact regions). */
export type DialogSize = 'sm' | 'lg' | 'xl';
/** Centered, or anchored 12dvh from the top. */
export type DialogPosition = 'center' | 'top';

// Two ways to mount, one look:
//  - modal, no `container`: the CDK Dialog. It brings the focus trap, focus
//    restore, scroll lock and hides the rest of the page from assistive tech.
//    Its own backdrop and Escape handling are off: the content draws its own
//    animated scrim and routes dismissals through the root's open state, so
//    the overlay stays attached until the exit spring has played.
//  - a `container` or `modal: false`: the panel renders into the container
//    (or the body) without the CDK Dialog, which always traps focus and hides
//    its siblings. A focus trap is added back only when modal.

/**
 * The dialog's panel and scrim. Renders nothing while the dialog is closed;
 * opening mounts it in an overlay, springs it in, and provides the dialog's
 * surface level (+4) to everything inside.
 */
@Component({
  selector: 'ff-dialog-content',
  imports: [Button, Icon],
  providers: [{ provide: SURFACE_LEVEL, useFactory: () => inject(DialogContent).level }],
  host: { style: 'display: contents' },
  template: `
    <ng-template #panel>
      <div
        data-slot="dialog-backdrop"
        role="presentation"
        [class]="backdropClass()"
        [attr.data-open]="dialog.isOpen() ? '' : null"
        [attr.data-closed]="dialog.isOpen() ? null : ''"
        style="opacity: 0"
        (click)="dialog.setOpen(false)"
      ></div>
      <div
        data-slot="dialog-popup"
        role="dialog"
        tabindex="-1"
        [id]="dialog.popupId"
        [attr.aria-modal]="dialog.modal() ? 'true' : null"
        [attr.aria-labelledby]="dialog.titleId()"
        [attr.aria-describedby]="dialog.descriptionId()"
        [attr.data-open]="dialog.isOpen() ? '' : null"
        [attr.data-closed]="dialog.isOpen() ? null : ''"
        [class]="popupClass()"
      >
        <ng-content />
        @if (showCloseButton()) {
          <button
            ffButton
            variant="ghost"
            size="icon-sm"
            class="absolute right-3 top-3"
            data-slot="dialog-close-button"
            (click)="dialog.setOpen(false)"
          >
            <ff-icon name="x" />
            <span class="sr-only">Close</span>
          </button>
        }
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogContent {
  /** Width: sm 400, lg 540, xl 880 (each one notch narrower in compact
   *  regions). `xl` is the canvas for composed layouts — a sidebar beside a
   *  panel — which usually pair it with `class="p-0"` and a fixed height. */
  readonly size = input<DialogSize>('sm');
  /** Portal target. When set, the scrim and panel render inside this element
   *  (positioned `absolute`) instead of covering the viewport (`fixed`). Pair
   *  with a `position: relative; overflow: hidden` container — and usually
   *  `[modal]="false"` on the root — to scope a dialog to a bounded region. */
  readonly container = input<HTMLElement | null | undefined>(undefined);
  /** The ✕ in the top-right corner. Drop it when the content has its own way
   *  out, e.g. a command menu that closes on Escape and on a pick. */
  readonly showCloseButton = input(true, { transform: booleanAttribute });
  /** Where the panel sits: centered, or anchored 12dvh from the top so a panel
   *  whose height follows its content keeps its top edge still. */
  readonly position = input<DialogPosition>('center');
  readonly userClass = input('', { alias: 'class' });

  protected readonly dialog = inject(Dialog);
  private readonly substrate = inject(SURFACE_LEVEL, { optional: true, skipSelf: true }) ?? pageLevel;
  /** The dialog's own surface level, provided to its content. */
  readonly level = computed(() => Math.min(this.substrate() + DIALOG_OFFSET, 8));
  private readonly shape = injectShape();
  // The size ladder narrows the dialog one notch in compact regions — width
  // only, the padding stays put.
  private readonly sizeVariant = injectSizeVariant();
  private readonly compact = computed(() => this.sizeVariant() === 'compact');

  protected readonly backdropClass = computed(() =>
    cn(this.container() ? 'absolute' : 'fixed', 'inset-0 z-50 bg-black/40 dark:bg-black/80'),
  );
  protected readonly popupClass = computed(() => {
    const size = this.size();
    const compact = this.compact();
    return cn(
      this.container() ? 'absolute' : 'fixed',
      'left-1/2 z-50 w-[calc(100%-2rem)]',
      this.position() === 'top' ? 'top-[12dvh]' : 'top-1/2',
      surfaceClasses(this.level()),
      'p-6 focus:outline-none',
      size === 'sm' && (compact ? 'max-w-[360px]' : 'max-w-[400px]'),
      size === 'lg' && (compact ? 'max-w-[480px]' : 'max-w-[540px]'),
      size === 'xl' && (compact ? 'max-w-[800px]' : 'max-w-[880px]'),
      this.shape().container,
      this.userClass(),
    );
  });

  private readonly template = viewChild.required<TemplateRef<unknown>>('panel');
  private readonly cdkDialog = inject(CdkDialog);
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private readonly injector = inject(Injector);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly document = inject(DOCUMENT);
  private readonly animate = injectAnimateFluid();

  private mounted: Mounted | null = null;
  private animations: FluidAnimation[] = [];
  private fallback: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const ready = signal(false);
    afterNextRender(() => ready.set(true));
    effect(() => {
      if (!ready()) return;
      const open = this.dialog.isOpen();
      untracked(() => (open ? this.show() : this.hide()));
    });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.fallback);
      this.stopAnimations();
      this.release();
    });
  }

  // ── Motion ──────────────────────────────────────────────

  private show() {
    clearTimeout(this.fallback);
    const fresh = !this.mounted;
    if (fresh) this.mount();
    const { backdrop, popup } = this.elements();
    const y = this.position() === 'top' ? 0 : '-50%';
    this.stopAnimations();
    if (backdrop) {
      this.animations.push(
        this.animate(backdrop, { opacity: fresh ? [0, 1] : 1 }, enterTransition(spring.slow)),
      );
    }
    if (popup) {
      if (fresh) {
        // The first frame, before Motion's first tick.
        popup.style.opacity = '0';
        popup.style.transform = `translateX(-50%) translateY(${y === 0 ? '0px' : y}) scale(0.97)`;
      }
      this.animations.push(
        this.animate(
          popup,
          fresh
            ? { opacity: [0, 1], scale: [0.97, 1], x: ['-50%', '-50%'], y: [y, y] }
            : { opacity: 1, scale: 1, x: '-50%', y },
          enterTransition(spring.slow),
        ),
      );
    }
  }

  private hide() {
    if (!this.mounted) return;
    const { backdrop, popup } = this.elements();
    const y = this.position() === 'top' ? 0 : '-50%';
    this.stopAnimations();
    if (backdrop) {
      this.animations.push(this.animate(backdrop, { opacity: 0 }, exitTransition(spring.slow)));
    }
    if (popup) {
      const exit = this.animate(popup, { opacity: 0, scale: 0.97, x: '-50%', y }, exitTransition(spring.slow));
      this.animations.push(exit);
      // Release the overlay once the exit spring has finished.
      exit.finished.then(() => {
        if (this.animations.includes(exit)) this.unmountIfClosed();
      });
    }
    // Fallback for throttled tabs, where animation callbacks can stall.
    clearTimeout(this.fallback);
    this.fallback = setTimeout(() => this.unmountIfClosed(), exitFallbackMs(spring.slow));
  }

  private stopAnimations() {
    const running = this.animations;
    this.animations = [];
    running.forEach((a) => a.stop());
  }

  // ── Mounting ────────────────────────────────────────────

  private elements() {
    return {
      backdrop: this.mounted?.find('dialog-backdrop') ?? null,
      popup: this.mounted?.find('dialog-popup') ?? null,
    };
  }

  private mount() {
    const container = this.container();
    this.mounted = this.dialog.modal() && !container ? this.mountModal() : this.mountInline(container ?? null);
  }

  /** The CDK Dialog path: modal over the whole viewport. */
  private mountModal(): Mounted {
    const trigger = this.dialog.triggerElement;
    const ref: DialogRef<unknown, unknown> = this.cdkDialog.open(this.template(), {
      injector: this.injector,
      hasBackdrop: false,
      disableClose: true,
      closeOnNavigation: false,
      autoFocus: 'first-tabbable',
      restoreFocus: trigger ?? true,
      // The popup inside carries role="dialog" and its names; the container
      // is only the focus trap.
      role: null as unknown as DialogRole,
      ariaModal: null as unknown as boolean,
    });
    const subscriptions: Subscription[] = [
      ref.keydownEvents.subscribe((e) => {
        if (e.key === 'Escape' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          this.dialog.setOpen(false);
        }
      }),
      // Closed from outside (the dialog service closing everything): sync.
      ref.closed.subscribe(() => {
        if (this.mounted?.ref !== ref) return;
        this.mounted = null;
        subscriptions.forEach((s) => s.unsubscribe());
        this.dialog.setOpen(false);
      }),
    ];
    return {
      ref,
      find: (slot) => ref.overlayRef.overlayElement.querySelector<HTMLElement>(`[data-slot="${slot}"]`),
      release: () => {
        subscriptions.forEach((s) => s.unsubscribe());
        ref.close();
      },
    };
  }

  /** The scoped path: into `container` (or the body), modal only on request. */
  private mountInline(container: HTMLElement | null): Mounted {
    const document = this.document;
    const target = container ?? document.body;
    const previous = document.activeElement as HTMLElement | null;
    const view: EmbeddedViewRef<unknown> = this.viewContainer.createEmbeddedView(this.template(), undefined, {
      injector: this.injector,
    });
    view.detectChanges();
    view.rootNodes.forEach((node: Node) => target.appendChild(node));
    const find = (slot: string) =>
      (view.rootNodes as Node[]).find(
        (node): node is HTMLElement => node instanceof HTMLElement && node.dataset['slot'] === slot,
      ) ?? null;
    const popup = find('dialog-popup');

    let trap: FocusTrap | null = null;
    if (popup) {
      trap = this.focusTrapFactory.create(popup);
      // Non-modal: focus moves in, but Tab is free to leave.
      trap.enabled = this.dialog.modal();
      if (!trap.focusInitialElement()) popup.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        this.dialog.setOpen(false);
      }
    };
    // Outside press dismisses, as Base UI's: the scrim covers only the
    // container, so a press anywhere off the panel counts.
    const onPointerDown = (e: PointerEvent) => {
      const node = e.target as Node | null;
      if (!node || popup?.contains(node) || this.dialog.triggerElement?.contains(node)) return;
      this.dialog.setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);

    return {
      ref: null,
      find,
      release: () => {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('pointerdown', onPointerDown);
        const active = document.activeElement;
        const focusInside = !active || active === document.body || (popup?.contains(active) ?? false);
        trap?.destroy();
        view.destroy();
        if (focusInside) (this.dialog.triggerElement ?? previous)?.focus?.();
      },
    };
  }

  private unmountIfClosed() {
    if (untracked(this.dialog.isOpen)) return;
    clearTimeout(this.fallback);
    this.stopAnimations();
    this.release();
  }

  private release() {
    const mounted = this.mounted;
    this.mounted = null;
    mounted?.release();
  }
}

interface Mounted {
  /** The CDK dialog, on the modal path. */
  ref: DialogRef<unknown, unknown> | null;
  /** Looks up the scrim or the popup by its data-slot. */
  find(slot: string): HTMLElement | null;
  release(): void;
}
