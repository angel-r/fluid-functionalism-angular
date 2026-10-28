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
  signal,
  untracked,
} from '@angular/core';
import type { AnimationOptions } from 'motion';
import { cn, spring, enterTransition, exitTransition, injectAnimateFluid } from '../core';
import type { FluidHoverController, ItemRect } from '../fluid-hover';

// ---------------------------------------------------------------------------
// Shared plumbing of the row groups (radio group, checkbox group): one focus
// ring that springs between rows, shown for keyboard focus only, and the
// row mousedown that pins focus to the row without earning that ring.
// ---------------------------------------------------------------------------

/**
 * True only while a row's mousedown handler moves focus onto the row. Chrome
 * reports a focus() call from script as :focus-visible, so without this flag
 * every click would draw the keyboard focus ring. focus() fires its focus
 * events synchronously, so the flag never outlives that one call.
 */
const pointerFocus = { redirect: false };

const INTERACTIVE =
  'button:not([tabindex="-1"]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Pins focus to the row on press: the group keydown handler only finds
 * targets among the row wrappers, so focus anywhere else dead-zones arrow-key
 * nav. Prevents the native focus move (click still fires) and lands focus on
 * the row instead. Genuinely interactive children keep their own focus.
 */
export function focusRowOnPress(e: MouseEvent, row: HTMLElement) {
  const interactive = (e.target as HTMLElement | null)?.closest?.(INTERACTIVE);
  if (interactive && interactive !== row) return;
  e.preventDefault();
  pointerFocus.redirect = true;
  try {
    row.focus();
  } finally {
    pointerFocus.redirect = false;
  }
}

/** The rows of a group, in DOM order: only the row wrappers, never the hidden
 *  primitive inside a row that carries the same role. */
export function groupRows(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-fluid-hover-index]'));
}

/**
 * Focus drives the same activeIndex as hover, so the highlight, the border
 * and the label color follow the keyboard too. The focus ring shows for
 * keyboard focus only, never after a click. Bind `onFocusIn` / `onFocusOut`
 * to the container's focusin / focusout.
 */
export function createGroupFocus(
  hover: FluidHoverController,
  container: HTMLElement,
  onLeave: () => void = () => {},
) {
  const focusedIndex = signal<number | null>(null);
  const focusRect: Signal<ItemRect | null> = computed(() => {
    const index = focusedIndex();
    return index !== null ? (hover.itemRects()[index] ?? null) : null;
  });

  const onFocusIn = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    const indexAttr = target.closest?.('[data-fluid-hover-index]')?.getAttribute('data-fluid-hover-index');
    if (indexAttr == null) return;
    const index = Number(indexAttr);
    hover.setActiveIndex(index);
    // A row focused by its own mousedown gets no ring, even though the
    // browser reports that focus as :focus-visible.
    focusedIndex.set(!pointerFocus.redirect && target.matches(':focus-visible') ? index : null);
  };

  const onFocusOut = (e: FocusEvent) => {
    // Don't clear hover when focus moves to another item within the group.
    if (container.contains(e.relatedTarget as Node | null)) return;
    focusedIndex.set(null);
    hover.setActiveIndex(null);
    onLeave();
  };

  return { focusedIndex: focusedIndex.asReadonly(), focusRect, onFocusIn, onFocusOut };
}

/**
 * The group's one focus ring. It springs between rows on spring.fast, sits
 * 2px outside the row (pass `shape().focusRing`, the row radius + 2px, as
 * `class` so the corners stay concentric), and fades out on spring.fast.exit.
 * The host is `display: contents`; the container must be the offsetParent.
 */
@Component({
  selector: 'ff-group-focus-ring',
  template: '',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupFocusRing {
  readonly rect = input<ItemRect | null>(null);
  readonly userClass = input('', { alias: 'class' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly animateFluid = injectAnimateFluid();
  private live: HTMLDivElement | null = null;
  private readonly className = computed(() =>
    cn(
      'absolute pointer-events-none z-20 border border-[color:var(--focus-ring,#6B97FF)]',
      this.userClass(),
    ),
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
      this.animateFluid(exiting, { opacity: 0 }, exitTransition(spring.fast)).finished.then(() => exiting.remove());
      return;
    }
    const target = { left: rect.left - 2, top: rect.top - 2, width: rect.width + 4, height: rect.height + 4 };
    if (this.live) {
      this.animateFluid(this.live, { ...target, opacity: 1 }, {
        ...enterTransition(spring.fast),
        opacity: { duration: 0.08 },
      } as AnimationOptions);
      return;
    }
    // initial={false}: a fresh ring mounts in place instead of sliding in.
    const element = this.renderer.createElement('div') as HTMLDivElement;
    element.className = this.className();
    element.setAttribute('data-slot', 'focus-ring');
    element.setAttribute('aria-hidden', 'true');
    for (const [key, value] of Object.entries(target)) element.style.setProperty(key, `${value}px`);
    this.renderer.appendChild(this.host, element);
    this.live = element;
  }
}
