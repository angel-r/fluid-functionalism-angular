// ---------------------------------------------------------------------------
// A New entry's stage, ported from the `staged` branch of Entry in
// app/changelog/changelog-view.tsx: the preview its Showcase tile renders (or a
// system page's own demo), in a bordered card, with the page-wide Play / Pause
// button on animated ones.
//
// The preview mounts once its stage is within 600px of the viewport, so the
// page's first paint carries none of them; `inView` (35% visible) decides
// whether an animated one plays.
// ---------------------------------------------------------------------------

import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Button, Icon, Tooltip, cn, injectShape, injectSizeVariant } from '@angel-r/fluid-functionalism-angular';
import { isAnimatedPreview, previewComponent, stagePadding, takesPausedInput } from './previews';

@Component({
  selector: 'app-changelog-stage',
  imports: [NgComponentOutlet, Button, Icon, Tooltip],
  template: `
    <div [class]="frameClass()">
      @if (animated()) {
        <ff-tooltip side="top" [content]="paused() ? 'Play all previews' : 'Pause all previews'">
          <button
            ffButton
            variant="ghost"
            [size]="iconSize()"
            class="absolute right-2 top-2 z-10"
            [attr.aria-label]="paused() ? 'Play all previews' : 'Pause all previews'"
            (click)="pauseToggle.emit()"
          >
            <ff-icon [name]="paused() ? 'play' : 'pause'" />
          </button>
        </ff-tooltip>
      }
      <div #stage [class]="stageClass()">
        @if (near() && preview(); as component) {
          @if (takesPaused()) {
            <ng-container
              [ngComponentOutlet]="component"
              [ngComponentOutletInputs]="pausedInputs()"
            />
          } @else {
            <ng-container [ngComponentOutlet]="component" />
          }
        }
      </div>
    </div>
  `,
  // The host stands in for React's root div: `contents` keeps its single child
  // in the entry's flow exactly where the reference puts it.
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogStage {
  readonly slug = input.required<string>();
  /** The page-wide pause: one control for every animated preview. */
  readonly paused = input(false, { transform: booleanAttribute });
  readonly pauseToggle = output<void>();

  protected readonly preview = computed(() => previewComponent(this.slug()));
  protected readonly animated = computed(() => isAnimatedPreview(this.slug()));
  protected readonly pausedInputs = computed(() => ({ paused: !this.playing() }));
  protected readonly takesPaused = computed(() => takesPausedInput(this.slug()));

  protected readonly iconSize = computed(() => (this.sizeVariant() === 'compact' ? 'icon-compact' : 'icon'));
  protected readonly frameClass = computed(() =>
    cn('bento-card-border relative mt-3 overflow-hidden border', this.shape().container),
  );
  protected readonly stageClass = computed(() =>
    cn('flex min-h-[260px] items-center justify-center', stagePadding(this.slug())),
  );

  private readonly shape = injectShape();
  private readonly sizeVariant = injectSizeVariant();
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  /** The stage's share of the viewport, at 35% visible (the reference's
   *  `useInView(stageRef, { amount: 0.35 })`). */
  private readonly inView = signal(false);
  /** Whether the preview's code has been mounted: once its stage is within
   *  600px of the viewport it is ready by the time it scrolls in. */
  protected readonly near = signal(false);

  protected readonly playing = computed(() => this.inView() && !this.paused());

  constructor() {
    afterRenderEffect((onCleanup) => {
      if (typeof IntersectionObserver === 'undefined') return;
      const element = this.stage()?.nativeElement;
      if (!element) return;

      const visibility = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) this.inView.set(entry.isIntersecting);
        },
        { threshold: 0.35 },
      );
      visibility.observe(element);

      let proximity: IntersectionObserver | null = null;
      if (!untracked(this.near)) {
        proximity = new IntersectionObserver(
          (entries) => {
            if (!entries[0]?.isIntersecting) return;
            this.near.set(true);
            proximity?.disconnect();
          },
          { rootMargin: '600px 0px' },
        );
        proximity.observe(element);
      }

      onCleanup(() => {
        visibility.disconnect();
        proximity?.disconnect();
      });
    });
  }
}
