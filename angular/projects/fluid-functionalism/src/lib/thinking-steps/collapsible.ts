import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { cn } from '../core/utils';
import { spring } from '../core/springs';
import { fontWeights } from '../core/font-weight';
import { injectShape } from '../core/shape';
import { injectSize } from '../core/size';
import { typeClass } from '../core/type-scale';
import { Icon } from '../core/icon';
import { ReducedMotion } from '../core/environment';
import { type FluidAnimation, animateFluid, enterTransition, exitTransition } from '../core/motion';
import { Layer, writeInitialStyles } from '../tabs/layer';

// ─── Shared collapsible parts ───────────────────────────────────────────────
//
// ThinkingSteps and ThinkingStepDetails are both single collapsible sections:
// a trigger row (button with aria-expanded / aria-controls, like Base UI's
// Collapsible.Trigger) and a panel with a sprung height. Internal: not part of
// the public API.

/** Safety net for the close: `hidden` lands even if a throttled tab stalls
 *  the height spring. Well past the spring's own settle time. */
const PANEL_EXIT_FALLBACK_MS = 600;

/**
 * Trigger row: hover background, dual-layer variable-weight label, and a
 * chevron that rotates from right (closed) to down (open). Mirrors the
 * library's accordion trigger styling.
 */
@Component({
  selector: 'ff-thinking-steps-trigger',
  imports: [Icon],
  template: `
    <div class="relative w-fit" (mouseenter)="hovered.set(true)" (mouseleave)="hovered.set(false)">
      <ng-container #hoverAnchor />
      <button
        type="button"
        [id]="triggerId()"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="panelId()"
        [attr.data-panel-open]="open() ? '' : null"
        [class]="buttonClass()"
        (click)="toggle.emit()"
      >
        <!-- Label with dual-layer text (invisible bold layer reserves width) -->
        <span [class]="labelBoxClass()">
          <span #sizer class="col-start-1 row-start-1 invisible" [style.font-variation-settings]="semibold" aria-hidden="true"></span>
          <span #label [class]="labelClass()" [style.font-variation-settings]="open() ? semibold : normal"><ng-content /></span>
        </span>
        <!-- Chevron — right when collapsed, rotates 90° down when expanded -->
        <span #chevron class="shrink-0 inline-flex items-center justify-center">
          <ff-icon name="chevron-right" [size]="size().icon" [strokeWidth]="highlighted() ? 2 : 1.5" [class]="chevronClass()" />
        </span>
      </button>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThinkingStepsTrigger {
  readonly open = input.required<boolean>();
  readonly triggerId = input.required<string>();
  readonly panelId = input.required<string>();
  /** Classes merged over the trigger button's own. */
  readonly rowClass = input('');
  readonly toggle = output<void>();

  private readonly shape = injectShape();
  protected readonly size = injectSize();
  private readonly reduced = inject(ReducedMotion).value;
  protected readonly semibold = fontWeights.semibold;
  protected readonly normal = fontWeights.normal;
  protected readonly hovered = signal(false);
  protected readonly highlighted = computed(() => this.open() || this.hovered());

  protected readonly buttonClass = computed(() => {
    const size = this.size();
    return cn(
      `relative z-10 flex items-center gap-2.5 ${this.shape().item} ${size.px} ${
        size.variant === 'compact' ? 'py-1.5' : 'py-2'
      } cursor-pointer outline-none select-none`,
      'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] focus-visible:ring-offset-0',
      this.rowClass(),
    );
  });
  protected readonly labelBoxClass = computed(() => cn('inline-grid text-left', this.size().text));
  protected readonly labelClass = computed(() =>
    cn(
      'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80',
      this.highlighted() ? 'text-foreground' : 'text-muted-foreground',
    ),
  );
  protected readonly chevronClass = computed(() =>
    cn('transition-[color,stroke-width] duration-80', this.highlighted() ? 'text-foreground' : 'text-muted-foreground'),
  );

  private readonly label = viewChild.required<ElementRef<HTMLElement>>('label');
  private readonly sizer = viewChild.required<ElementRef<HTMLElement>>('sizer');
  private readonly chevron = viewChild.required<ElementRef<HTMLElement>>('chevron');
  private readonly hoverAnchor = viewChild.required('hoverAnchor', { read: ElementRef });
  private readonly hoverTint = new Layer(() => this.hoverAnchor().nativeElement, this.reduced, 'hover-tint');

  constructor() {
    const destroyRef = inject(DestroyRef);

    // The invisible bold layer mirrors the projected label's text (projected
    // content renders once).
    afterNextRender(() => {
      const label = this.label().nativeElement;
      const sizer = this.sizer().nativeElement;
      const copy = () => {
        const text = label.textContent ?? '';
        if (sizer.textContent !== text) sizer.textContent = text;
      };
      copy();
      if (typeof MutationObserver === 'undefined') return;
      const mo = new MutationObserver(copy);
      mo.observe(label, { childList: true, characterData: true, subtree: true });
      destroyRef.onDestroy(() => mo.disconnect());
    });

    // The chevron turns on spring.fast; the state at mount is not animated.
    let chevronStyled = false;
    let chevronAnimation: FluidAnimation | null = null;
    afterRenderEffect(() => {
      const rotate = this.open() ? 90 : 0;
      const chevron = this.chevron().nativeElement;
      untracked(() => {
        if (!chevronStyled) {
          chevronStyled = true;
          writeInitialStyles(chevron, { rotate });
          return;
        }
        chevronAnimation?.stop();
        chevronAnimation = animateFluid(chevron, { rotate }, enterTransition(spring.fast), this.reduced());
      });
    });

    // Hover fill: fades in over 80ms, out on the fast exit tier.
    afterRenderEffect(() => {
      const hovered = this.hovered();
      const bg = this.shape().bg;
      untracked(() => {
        if (hovered) {
          this.hoverTint.show(
            `absolute inset-0 ${bg} bg-hover pointer-events-none`,
            { opacity: 1 },
            { duration: 0.08 },
            { opacity: 0 },
          );
        } else {
          this.hoverTint.hide({ keyframes: { opacity: 0 }, transition: exitTransition(spring.fast) });
        }
      });
    });

    destroyRef.onDestroy(() => {
      chevronAnimation?.stop();
      this.hoverTint.destroy();
    });
  }
}

/**
 * Collapsible panel with a sprung height. The open height is a self-measured
 * LAYOUT pixel value, not "auto": offsetHeight and ResizeObserver are
 * transform-immune, so under a scaled ancestor the spring doesn't overshoot
 * to scale× the real height. `hidden` (display: none) lands only once the
 * exit has finished, or it would freeze the exit mid-flight. The persistent
 * panel element keeps the trigger ↔ panel ARIA contract (the trigger's
 * `aria-controls` id lives on it).
 */
@Component({
  selector: 'ff-thinking-steps-panel',
  template: `
    <div
      [id]="panelId()"
      [hidden]="hidden()"
      [attr.data-open]="open() ? '' : null"
      [attr.data-closed]="open() ? null : ''"
    >
      <div #motion class="overflow-hidden">
        <div #measure [class]="measureClass()"><ng-content /></div>
      </div>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThinkingStepsPanel {
  readonly open = input.required({ transform: booleanAttribute });
  readonly panelId = input.required<string>();

  private readonly size = injectSize();
  private readonly reduced = inject(ReducedMotion).value;

  protected readonly measureClass = computed(() =>
    cn('px-3 pb-3 pt-1 text-muted-foreground', typeClass('body', this.size().variant === 'compact' ? 'compact' : 'default')),
  );

  private readonly contentHeight = signal<number | null>(null);
  private readonly exitComplete = linkedSignal<boolean, boolean>({
    source: this.open,
    computation: (open, previous) => (previous === undefined ? !open : false),
  });
  protected readonly hidden = computed(() => {
    // Read first, unconditionally: the linked signal must be seeded while
    // the panel is still open, or its first computation would run after a
    // close and read as "exit already complete".
    const exitComplete = this.exitComplete();
    return !this.open() && exitComplete;
  });

  private readonly motionEl = viewChild.required<ElementRef<HTMLElement>>('motion');
  private readonly measureEl = viewChild.required<ElementRef<HTMLElement>>('measure');

  private styled = false;
  // Panels open at mount take their first measured height with a SNAP, not a
  // spring; height changes after that spring.
  private needsSnap: boolean | null = null;
  private animation: FluidAnimation | null = null;
  private exitTimer: ReturnType<typeof setTimeout> | undefined;
  private lastTarget = '';

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const measure = this.measureEl().nativeElement;
      if (measure.offsetHeight > 0) this.contentHeight.set(measure.offsetHeight);
      if (typeof ResizeObserver === 'undefined') return;
      // Ignore the 0 reported while the panel is display: none.
      const ro = new ResizeObserver(() => {
        if (measure.offsetHeight > 0) this.contentHeight.set(measure.offsetHeight);
      });
      ro.observe(measure);
      destroyRef.onDestroy(() => ro.disconnect());
    });

    afterRenderEffect(() => {
      const open = this.open();
      const height = this.contentHeight();
      untracked(() => this.sync(open, height));
    });

    destroyRef.onDestroy(() => {
      this.animation?.stop();
      clearTimeout(this.exitTimer);
    });
  }

  private sync(open: boolean, measured: number | null) {
    if (this.needsSnap === null) this.needsSnap = open;
    // Re-measure as it opens, so the spring's target is the fresh layout
    // height from its first frame.
    let height = measured;
    const measure = this.measureEl().nativeElement;
    if (open && measure.offsetHeight > 0 && measure.offsetHeight !== height) {
      height = measure.offsetHeight;
      this.contentHeight.set(height);
    }

    const element = this.motionEl().nativeElement;
    // Open with nothing measured yet (no layout): keep the natural height.
    const target: number | 'auto' = open ? (height ?? 'auto') : 0;
    const key = `${open}:${target}`;
    if (key === this.lastTarget && this.styled) return;
    this.lastTarget = key;
    clearTimeout(this.exitTimer);

    if (!this.styled || target === 'auto' || (this.needsSnap && height !== null)) {
      this.animation?.stop();
      this.animation = null;
      this.snap(element, target);
      if (this.needsSnap && height !== null) {
        // Cleared a frame after the first measured height lands.
        requestAnimationFrame(() => (this.needsSnap = false));
      }
      if (!open) this.exitComplete.set(true);
      return;
    }

    this.animation?.stop();
    // bounce: 0 — pure height looks better without overshoot.
    const animation = animateFluid(
      element,
      { height: target },
      { ...enterTransition(spring.moderate), bounce: 0 },
      this.reduced(),
    );
    this.animation = animation;
    const done = () => {
      if (this.animation !== animation) return;
      this.animation = null;
      clearTimeout(this.exitTimer);
      if (!this.open()) this.exitComplete.set(true);
    };
    animation.finished.then(done, done);
    if (!open) this.exitTimer = setTimeout(done, PANEL_EXIT_FALLBACK_MS);
  }

  /** Applies a target with no animation, keeping motion's value store in step. */
  private snap(element: HTMLElement, target: number | 'auto') {
    if (target === 'auto') {
      this.styled = true;
      element.style.removeProperty('height');
      return;
    }
    if (!this.styled) {
      this.styled = true;
      writeInitialStyles(element, { height: target });
      return;
    }
    element.style.height = `${target}px`;
    animateFluid(element, { height: target }, { duration: 0 });
  }
}
