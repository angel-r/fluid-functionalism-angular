import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { cn } from '@angel-r/fluid-functionalism-angular/core';

/**
 * The scroll container of a virtualized list, table or grid. It owns no
 * layout of its own: it publishes its scroll offsets and its size as
 * signals, and every `*ffVirtualFor` inside it renders the slice of its data
 * that falls in view, plus `buffer` items on each side.
 *
 * Give it a bounded size (`class="h-96"`): a viewport that grows with its
 * content never scrolls, so it renders everything.
 */
@Component({
  selector: 'ff-virtual-scroll',
  exportAs: 'ffVirtualScroll',
  host: {
    'data-slot': 'virtual-scroll',
    '[class]': 'hostClass()',
  },
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtualScroll {
  /** Items rendered beyond each edge of the viewport, on every axis, so a
   *  fast scroll does not flash empty space before the next frame fills it. */
  readonly buffer = input(4);
  readonly userClass = input('', { alias: 'class' });

  /** The scrolling element. */
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private readonly top = signal(0);
  private readonly left = signal(0);
  private readonly height = signal(0);
  private readonly width = signal(0);

  /** Vertical scroll offset in px. */
  readonly scrollTop = this.top.asReadonly();
  /** Horizontal scroll offset in px. */
  readonly scrollLeft = this.left.asReadonly();
  /** Visible height of the viewport in px. */
  readonly viewportHeight = this.height.asReadonly();
  /** Visible width of the viewport in px. */
  readonly viewportWidth = this.width.asReadonly();

  protected readonly hostClass = computed(() => cn('relative block overflow-auto', this.userClass()));

  constructor() {
    // A plain listener, not a host binding: a template listener marks the
    // declaring view dirty on every scroll event, which would re-check the
    // whole page each frame. Here a scroll only writes signals, and only the
    // windows whose range actually changes do any work.
    const onScroll = () => {
      this.top.set(this.element.scrollTop);
      this.left.set(this.element.scrollLeft);
    };
    this.element.addEventListener('scroll', onScroll, { passive: true });

    let observer: ResizeObserver | undefined;
    afterNextRender({
      read: () => {
        this.measure();
        onScroll();
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(() => this.measure());
          observer.observe(this.element);
        }
      },
    });

    inject(DestroyRef).onDestroy(() => {
      this.element.removeEventListener('scroll', onScroll);
      observer?.disconnect();
    });
  }

  private measure() {
    this.height.set(this.element.clientHeight);
    this.width.set(this.element.clientWidth);
  }
}
