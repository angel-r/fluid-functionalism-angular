// Renders the site toast (toast.ts) into a bottom-center slot of its own.
//
// Mounted once at boot by `provideToastHost()`, straight into <body>, so the
// toast exists whatever the page tree looks like: shortcut toasts need no
// layout from the shell, and the shell never has to render a placeholder.

import {
  type EnvironmentProviders,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  EnvironmentInjector,
  afterRenderEffect,
  computed,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  signal,
  viewChild,
} from '@angular/core';
import { ApplicationRef, createComponent } from '@angular/core';
import { cn, Icon, injectAnimateFluid, injectShape, enterTransition, exitTransition, spring } from '@angel-r/fluid-functionalism-angular';
import { SiteToastService, type ToastState } from './toast';

const BODY =
  'mx-auto flex h-9 w-max items-center gap-2 bg-foreground px-3 text-site-body text-background';

@Component({
  selector: 'app-site-toast',
  imports: [Icon],
  template: `
    @if (shown(); as state) {
      <div #enter class="pointer-events-none fixed inset-x-0 bottom-8 z-[100] flex justify-center px-4">
        <div [class]="bodyClass()" [style.font-variation-settings]="normalWeight">
          @if (state.kind === 'key') {
            <kbd aria-hidden [class]="chipClass()">{{ state.keyLabel }}</kbd>
          } @else {
            <span aria-hidden [class]="checkClass()">
              <ff-icon name="check" [size]="12" [strokeWidth]="2.5" />
            </span>
          }
          <span class="[text-box:trim-both_cap_alphabetic]">{{ state.message }}</span>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteToastHost {
  private readonly toast = inject(SiteToastService);
  private readonly animate = injectAnimateFluid();
  private readonly shape = injectShape();

  protected readonly normalWeight = "'wght' 400, 'opsz' 14";
  protected readonly bodyClass = computed(() => cn(BODY, this.shape().bg));
  protected readonly chipClass = computed(() =>
    cn(
      'inline-flex h-[18px] min-w-[18px] items-center justify-center bg-background/15 px-1 font-mono text-[11px] leading-none text-background',
      this.shape().bg,
    ),
  );
  protected readonly checkClass = computed(() =>
    cn('inline-flex h-[18px] w-[18px] items-center justify-center bg-background/15 text-background', this.shape().bg),
  );

  /** What is on screen. Held one exit animation longer than the service's
   *  state so a dismissal can play. */
  protected readonly shown = signal<ToastState | null>(null);

  private readonly enterEl = viewChild<ElementRef<HTMLElement>>('enter');
  private lastPress = 0;

  constructor() {
    afterRenderEffect(() => {
      const state = this.toast.state();
      const el = this.enterEl()?.nativeElement;
      const previous = this.shown();

      if (state) {
        this.shown.set(state);
        if (!el) return;
        if (!previous) {
          this.animate(
            el,
            { opacity: [0, 1], transform: ['translateY(6px) scale(0.96)', 'translateY(0) scale(1)'] },
            enterTransition(spring.slow),
          );
        } else if (state.kind === 'key' && state.press !== this.lastPress) {
          this.lastPress = state.press;
          // Pressed-state feedback: dip the scale, then spring back, so the
          // toast reads as a button being tapped again.
          this.animate(el.firstElementChild!, { scale: [0.95, 1] }, enterTransition(spring.fast));
        }
        return;
      }

      if (!previous) return;
      if (!el) {
        this.shown.set(null);
        return;
      }
      const animation = this.animate(
        el,
        { opacity: 0, transform: 'translateY(6px) scale(0.96)' },
        exitTransition(spring.fast),
      );
      animation.finished.then(() => {
        if (!this.toast.state()) this.shown.set(null);
      });
    });
  }
}

/** Mounts the toast host once, at boot, as a sibling of the app root. */
export function provideToastHost(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const document = inject(DOCUMENT);
      const appRef = inject(ApplicationRef);
      const injector = inject(EnvironmentInjector);
      const element = document.createElement('app-site-toast');
      document.body.appendChild(element);
      const ref = createComponent(SiteToastHost, { hostElement: element, environmentInjector: injector });
      appRef.attachView(ref.hostView);
    }),
  ]);
}
