import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Renderer2,
  type Signal,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  untracked,
} from '@angular/core';
import type { AnimationOptions } from 'motion';
import {
  cn,
  spring,
  shapeMap,
  SizeContext,
  type SizeVariant,
  SURFACE_LEVEL,
  enterTransition,
  exitTransition,
  injectAnimateFluid,
} from '@angel-r/fluid-functionalism-angular/core';
import type { ItemRect } from '@angel-r/fluid-functionalism-angular/fluid-hover';

// ---------------------------------------------------------------------------
// Small pieces the dropdown and select popups share.
// ---------------------------------------------------------------------------

/**
 * The selected background: one fill that springs (spring.moderate) from the
 * old checked row to the new one. A fresh one is placed, not animated
 * (React's `initial={false}`); it fades out on spring.moderate.exit. The host
 * is `display: contents`, so the container must be the offsetParent.
 */
@Component({
  selector: 'ff-popup-checked-background',
  template: '',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopupCheckedBackground {
  readonly rect = input<ItemRect | null>(null);
  readonly userClass = input('', { alias: 'class' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly animateFluid = injectAnimateFluid();
  private live: HTMLDivElement | null = null;
  private readonly className = computed(() =>
    cn('absolute bg-active pointer-events-none', shapeMap.rounded.bg, this.userClass()),
  );

  constructor() {
    effect(() => {
      const rect = this.rect();
      untracked(() => this.render(rect));
    });
    effect(() => {
      const className = this.className();
      if (this.live) this.live.className = className;
    });
    inject(DestroyRef).onDestroy(() => this.live?.remove());
  }

  private render(rect: ItemRect | null) {
    if (!rect) {
      const exiting = this.live;
      if (!exiting) return;
      this.live = null;
      this.animateFluid(exiting, { opacity: 0 }, exitTransition(spring.moderate)).finished.then(() =>
        exiting.remove(),
      );
      return;
    }
    const target = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    if (this.live) {
      this.animateFluid(this.live, { ...target, opacity: 1 }, {
        ...enterTransition(spring.moderate),
        opacity: { duration: 0.08 },
      } as AnimationOptions);
      return;
    }
    const element = this.renderer.createElement('div') as HTMLDivElement;
    element.className = this.className();
    element.setAttribute('data-slot', 'checked-background');
    element.setAttribute('aria-hidden', 'true');
    for (const [key, value] of Object.entries(target)) element.style.setProperty(key, `${value}px`);
    element.style.opacity = '1';
    this.renderer.appendChild(this.host, element);
    this.live = element;
  }
}

/**
 * The open state of a popup root: controlled through `open` when bound,
 * internal otherwise (seeded by `defaultOpen`). A request that matches the
 * effective state is not reported (React's `useControllableOpen`).
 */
export function createControllableOpen(
  open: Signal<boolean | undefined>,
  defaultOpen: Signal<boolean>,
  emit: (next: boolean) => void,
) {
  const internal = linkedSignal(() => untracked(defaultOpen));
  const value = computed(() => open() ?? internal());
  const set = (next: boolean) => {
    if (next === untracked(value)) return;
    internal.set(next);
    emit(next);
  };
  return { value, set };
}

/** A popup's surface level: two steps above the substrate (React `Elevated
 *  offset={2}`), provided to everything inside it, projected content
 *  included. Provide it as SURFACE_LEVEL from the component host. */
export function createRaisedSurface(offset = 2): Signal<number> {
  const substrate = inject(SURFACE_LEVEL, { optional: true, skipSelf: true });
  return computed(() => Math.min(Math.max(1, (substrate?.() ?? 1) + offset), 8));
}

/**
 * A SizeContext pinned by an optional `size` input: the size when set, else
 * the surrounding provider's (React `size ? <SizeProvider> : children`).
 * Provide it from the component host so projected content reads it too.
 */
export function createPinnedSize(size: Signal<SizeVariant | undefined>): SizeContext {
  const parent = inject(SizeContext, { optional: true, skipSelf: true });
  return {
    size: computed(() => size() ?? parent?.size() ?? 'default'),
    setSize: (next: SizeVariant) => parent?.setSize(next),
  };
}
