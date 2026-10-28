// "Slow in, faster out" of /docs/motion, ported from app/docs/motion/page.tsx
// (`ModalFrame` / `ModalExitDemo`): the same enter, two exit speeds.
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  Button,
  enterTransition,
  exitTransition,
  injectAnimateFluid,
  spring,
  type FluidAnimation,
} from '@angel-r/fluid-functionalism-angular';
import type { AnimationOptions, DOMKeyframesDefinition } from 'motion';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { modalCode } from './motion-snippets';

/** Keyframes plus the transition they run with. */
interface Pose {
  readonly to: DOMKeyframesDefinition;
  readonly transition: AnimationOptions;
}

/**
 * One AnimatePresence child: paints `initial` before the first frame, runs
 * `enter` once rendered, runs `exit` when `showing` turns false and then emits
 * `exited` so the owner unmounts it.
 */
@Directive({ selector: '[appModalPose]' })
class ModalPose {
  readonly showing = input.required<boolean>({ alias: 'appModalPose' });
  readonly initial = input.required<{ opacity?: number; scale?: number }>();
  readonly enter = input.required<Pose>();
  readonly exit = input.required<Pose>();
  readonly exited = output<void>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly animate = injectAnimateFluid();

  constructor() {
    let mounted = false;
    let run: FluidAnimation | null = null;
    afterRenderEffect(() => {
      const showing = this.showing();
      const enter = this.enter();
      const exit = this.exit();
      untracked(() => {
        if (!mounted) {
          mounted = true;
          const initial = this.initial();
          if (initial.opacity !== undefined) this.el.style.opacity = String(initial.opacity);
          if (initial.scale !== undefined) this.el.style.transform = `scale(${initial.scale})`;
        }
        run?.stop();
        const pose = showing ? enter : exit;
        const animation = this.animate(this.el, pose.to, pose.transition);
        run = animation;
        if (!showing) {
          animation.finished.then(() => {
            if (run === animation) this.exited.emit();
          });
        }
      });
    });
  }
}

const CARD_INITIAL = { opacity: 0, scale: 0.95 } as const;
const BACKDROP_INITIAL = { opacity: 0 } as const;

@Component({
  selector: 'app-modal-frame',
  imports: [ModalPose],
  template: `
    <div
      aria-hidden="true"
      class="relative flex h-[200px] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-background"
    >
      @if (present()) {
        <!-- subtle backdrop -->
        <div
          class="absolute inset-0 bg-foreground/5"
          [appModalPose]="open()"
          [initial]="backdropInitial"
          [enter]="enterBackdrop"
          [exit]="exitBackdrop()"
        ></div>
        <!-- modal card -->
        <div
          class="relative z-10 flex w-4/5 flex-col gap-2.5 rounded-xl border border-border bg-card p-4 shadow-xl"
          [appModalPose]="open()"
          [initial]="cardInitial"
          [enter]="enterCard"
          [exit]="exitCard()"
          (exited)="onExited()"
        >
          <!-- close affordance -->
          <div class="absolute right-3 top-3 h-4 w-4 rounded-full bg-foreground/10"></div>
          <!-- title -->
          <div class="h-3 w-1/2 rounded-full bg-foreground/10"></div>
          <!-- body -->
          <div class="mt-1 h-2 w-full rounded-full bg-foreground/6"></div>
          <div class="h-2 w-full rounded-full bg-foreground/6"></div>
          <div class="h-2 w-2/5 rounded-full bg-foreground/6"></div>
          <!-- footer actions -->
          <div class="mt-3 flex justify-end gap-2">
            <div class="h-6 w-16 rounded-md bg-foreground/10"></div>
            <div class="h-6 w-16 rounded-md bg-foreground/10"></div>
          </div>
        </div>
      }
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ModalFrame {
  readonly open = input(false, { transform: booleanAttribute });
  readonly exitTransition = input.required<AnimationOptions>();

  protected readonly cardInitial = CARD_INITIAL;
  protected readonly backdropInitial = BACKDROP_INITIAL;
  protected readonly enterBackdrop: Pose = { to: { opacity: 1 }, transition: enterTransition(spring.slow) };
  protected readonly enterCard: Pose = { to: { opacity: 1, scale: 1 }, transition: enterTransition(spring.slow) };

  protected readonly exitBackdrop = computed<Pose>(() => ({
    to: { opacity: 0 },
    transition: this.exitTransition(),
  }));
  protected readonly exitCard = computed<Pose>(() => ({
    to: { opacity: 0, scale: 0.95 },
    transition: this.exitTransition(),
  }));

  /** Mounted while open, and until the exit has played out. */
  protected readonly present = linkedSignal<boolean, boolean>({
    source: () => this.open(),
    computation: (open, previous) => open || (previous?.value ?? false),
  });

  protected onExited(): void {
    if (!this.open()) this.present.set(false);
  }
}

@Component({
  selector: 'app-modal-exit-demo',
  imports: [ComponentPreview, ModalFrame, Button],
  host: { style: 'display: contents' },
  template: `
    <app-component-preview [code]="code" minHeightClass="min-h-[320px]">
      <div class="flex w-full max-w-2xl flex-col items-center gap-4">
        <div class="grid w-full gap-5 sm:grid-cols-2">
          <!-- Same exit time -->
          <div class="flex flex-col items-center gap-3">
            <app-modal-frame [open]="openSame()" [exitTransition]="sameExit" />
            <button
              ffButton
              variant="secondary"
              size="sm"
              aria-label="Toggle the modal with the same exit speed"
              (click)="openSame.update((v) => !v)"
            >
              Toggle modal
            </button>
            <span class="flex items-center justify-center gap-2 text-site-caption text-muted-foreground">
              <span aria-hidden="true">❌</span> Same exit time — drags on the way out
            </span>
          </div>
          <!-- Faster exit -->
          <div class="flex flex-col items-center gap-3">
            <app-modal-frame [open]="openFaster()" [exitTransition]="fasterExit" />
            <button
              ffButton
              variant="secondary"
              size="sm"
              aria-label="Toggle the modal with the faster exit speed"
              (click)="openFaster.update((v) => !v)"
            >
              Toggle modal
            </button>
            <span class="flex items-center justify-center gap-2 text-site-caption text-muted-foreground">
              <span aria-hidden="true">✅</span> Faster exit — gone a tier quicker
            </span>
          </div>
        </div>
        <p class="text-center text-site-caption text-muted-foreground">
          Toggle one, then the other — both open on <span class="font-mono">spring.slow</span>; only the close differs.
        </p>
      </div>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalExitDemo {
  protected readonly code = modalCode;

  // Independent state per side, so you can toggle one, then the other, and feel
  // the difference back to back rather than all at once.
  protected readonly openSame = signal(false);
  protected readonly openFaster = signal(false);

  protected readonly sameExit: AnimationOptions = { duration: 0.4 };
  protected readonly fasterExit: AnimationOptions = exitTransition(spring.slow);
}
