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
  untracked,
  viewChild,
} from '@angular/core';
import {
  cn,
  spring,
  fontWeights,
  injectShape,
  type SizeVariant,
  injectSize,
  injectSizeVariant,
  typeClass,
  Icon,
  type IconName,
  type FluidAnimation,
  enterTransition,
  injectAnimateFluid,
} from '../core';
import { provideSizeOverride } from '../tabs';
import { Badge, type BadgeColor } from '../badge';
import { ThinkingStepsPanel, ThinkingStepsTrigger } from './collapsible';

export type StepStatus = 'complete' | 'active' | 'pending';

let nextId = 0;

// ─── ThinkingSteps (root) ───────────────────────────────────────────────────

/**
 * Chain-of-thought display: a collapsible section of steps.
 *
 *   <ff-thinking-steps>
 *     <ff-thinking-steps-header />
 *     <ff-thinking-steps-content>
 *       <ff-thinking-step icon="search" label="Searched the web" />
 *     </ff-thinking-steps-content>
 *   </ff-thinking-steps>
 */
@Component({
  selector: 'ff-thinking-steps',
  template: `<ng-content />`,
  host: { '[class]': 'hostClass()' },
  // A size input pins every row inside to one ladder step.
  providers: [provideSizeOverride(ThinkingSteps, (root) => root.size())],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThinkingSteps {
  /** Step on the size ladder. Wins over the surrounding SizeProvider and
   *  propagates to every row inside. */
  readonly size = input<SizeVariant | undefined>(undefined);
  /** Whether it starts expanded (uncontrolled). */
  readonly defaultOpen = input(true, { transform: booleanAttribute });
  /** Controlled open state; `[(open)]`, or `[open]` + `(openChange)`. */
  readonly open = input<boolean | undefined>(undefined);
  /** Fires when a click asks for a new open state. (React: `onOpenChange`.) */
  readonly openChange = output<boolean>();
  readonly userClass = input('', { alias: 'class' });

  private readonly id = nextId++;
  readonly triggerId = `ff-thinking-steps-trigger-${this.id}`;
  readonly panelId = `ff-thinking-steps-panel-${this.id}`;

  private readonly internalOpen = linkedSignal(() => this.defaultOpen());
  /** The effective open state. */
  readonly isOpen = computed(() => this.open() ?? this.internalOpen());

  protected readonly hostClass = computed(() => cn('block w-80 max-w-full', this.userClass()));

  /** Flips the open state, as a click on the header does. */
  toggle() {
    const next = !this.isOpen();
    if (this.open() === undefined) this.internalOpen.set(next);
    this.openChange.emit(next);
  }
}

// ─── ThinkingStepsHeader ────────────────────────────────────────────────────

/** The trigger row of the root. Its content is the label (default "Thinking"). */
@Component({
  selector: 'ff-thinking-steps-header',
  imports: [ThinkingStepsTrigger],
  template: `
    <ff-thinking-steps-trigger
      [open]="root.isOpen()"
      [triggerId]="root.triggerId"
      [panelId]="root.panelId"
      [rowClass]="userClass()"
      (toggle)="root.toggle()"
      ><ng-content>Thinking</ng-content></ff-thinking-steps-trigger
    >
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThinkingStepsHeader {
  /** Classes merged over the trigger button's own. */
  readonly userClass = input('', { alias: 'class' });
  protected readonly root = inject(ThinkingSteps);
}

// ─── ThinkingStepsContent ───────────────────────────────────────────────────

/** The collapsible list of steps. */
@Component({
  selector: 'ff-thinking-steps-content',
  imports: [ThinkingStepsPanel],
  template: `
    <ff-thinking-steps-panel [open]="root.isOpen()" [panelId]="root.panelId">
      <div [class]="listClass()"><ng-content /></div>
    </ff-thinking-steps-panel>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThinkingStepsContent {
  /** Classes merged over the list's own (`flex flex-col`). */
  readonly userClass = input('', { alias: 'class' });
  protected readonly root = inject(ThinkingSteps);
  protected readonly listClass = computed(() => cn('flex flex-col', this.userClass()));
}

// ─── ThinkingStep ───────────────────────────────────────────────────────────

/**
 * One step. Pending steps render nothing; a step that appears grows its
 * height on spring.slow while its content fades in after `delay`. The
 * height springs to a measured LAYOUT pixel value (transform-immune), so a
 * scaled ancestor can't make the list overshoot as it builds.
 */
@Component({
  selector: 'ff-thinking-step',
  imports: [Icon],
  template: `
    @if (status() !== 'pending') {
      <!-- Outer: animates height to create space smoothly -->
      <div #outer [class]="outerClass()">
        <!-- Inner: fades content in after space starts opening, and is the
             element measured for the height above. -->
        <div #inner>
          <!-- Content row: the fluid hover target -->
          <div [class]="rowClass()">
            <!-- Icon column with continuous connector line -->
            <div class="flex flex-col items-center shrink-0 w-[14px]">
              <div class="pt-0.5">
                @if (showIcon()) {
                  <ff-icon [name]="icon()" [size]="compact() ? 12 : 14" [strokeWidth]="1.5" class="text-muted-foreground" />
                } @else {
                  <div class="w-[14px] h-[14px] flex items-center justify-center">
                    <div class="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"></div>
                  </div>
                }
              </div>
              <!-- Line stretches from icon to bottom of this step -->
              @if (!isLast()) {
                <div class="flex-1 w-px bg-border/60 mt-1"></div>
              }
            </div>
            <!-- Text content -->
            <div class="flex-1 flex flex-col gap-1 min-w-0">
              <span [class]="labelClass()" [style.font-variation-settings]="semibold">{{ label() }}@if (isActive()) {…}</span>
              @if (description()) {
                <span [class]="descriptionClass()">{{ description() }}</span>
              }
              <ng-content />
            </div>
          </div>
        </div>
      </div>
    }
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThinkingStep {
  /** Icon name from the icon library. */
  readonly icon = input<IconName>('dot');
  /** Show the icon. When false, displays a small dot instead. */
  readonly showIcon = input(true, { transform: booleanAttribute });
  /** Step label text. */
  readonly label = input.required<string>();
  /** Optional secondary text below the label. */
  readonly description = input<string | undefined>(undefined);
  /** Step state. Pending steps are hidden; active steps show shimmer text. */
  readonly status = input<StepStatus>('complete');
  /** Content fade-in delay in seconds, after the step's height starts expanding. */
  readonly delay = input(0.08);
  /** Hides the connector line below this step. */
  readonly isLast = input(false, { transform: booleanAttribute });
  /** Classes merged over the step's outer element. */
  readonly userClass = input('', { alias: 'class' });

  private readonly shape = injectShape();
  private readonly size = injectSize();
  private readonly animateFluid = injectAnimateFluid();
  protected readonly semibold = fontWeights.semibold;

  protected readonly isActive = computed(() => this.status() === 'active');
  protected readonly compact = computed(() => this.size().variant === 'compact');
  protected readonly outerClass = computed(() => cn('relative z-10 overflow-hidden', this.userClass()));
  protected readonly rowClass = computed(() => cn('flex gap-2.5 px-2 py-1.5', this.shape().item));
  protected readonly labelClass = computed(() =>
    cn(this.size().type.body, 'text-foreground', this.isActive() && 'shimmer-text'),
  );
  protected readonly descriptionClass = computed(() => cn(this.size().type.body, 'text-muted-foreground'));

  private readonly outer = viewChild<ElementRef<HTMLElement>>('outer');
  private readonly inner = viewChild<ElementRef<HTMLElement>>('inner');

  constructor() {
    // Each time the step mounts (it may start pending): height from 0 to the
    // measured content on spring.slow, content fading in after `delay`.
    afterRenderEffect((onCleanup) => {
      const outer = this.outer()?.nativeElement;
      const inner = this.inner()?.nativeElement;
      if (!outer || !inner) return;
      untracked(() => {
        outer.style.height = '0px';
        inner.style.opacity = '0';
        const fade = this.animateFluid(inner, { opacity: [0, 1] }, { duration: 0.24, delay: this.delay(), ease: 'easeOut' });
        let grow: FluidAnimation | null = null;
        let height: number | null = null;
        const sync = () => {
          if (inner.offsetHeight <= 0 || inner.offsetHeight === height) return;
          height = inner.offsetHeight;
          grow?.stop();
          grow = this.animateFluid(outer, { height }, enterTransition(spring.slow));
        };
        sync();
        const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync);
        ro?.observe(inner);
        onCleanup(() => {
          ro?.disconnect();
          fade.stop();
          grow?.stop();
        });
      });
    });
  }
}

// ─── ThinkingStepDetails (nested collapsible) ───────────────────────────────

/** A nested collapsible inside a step: a summary row over detail lines. */
@Component({
  selector: 'ff-thinking-step-details',
  imports: [ThinkingStepsTrigger, ThinkingStepsPanel],
  template: `
    <ff-thinking-steps-trigger
      [open]="open()"
      [triggerId]="triggerId"
      [panelId]="panelId"
      rowClass="py-1 px-3 gap-1.5"
      (toggle)="open.set(!open())"
      >{{ summary() }}</ff-thinking-steps-trigger
    >
    <ff-thinking-steps-panel [open]="open()" [panelId]="panelId">
      <div class="flex flex-col gap-0.5 pt-0.5">
        @for (item of details() ?? []; track $index) {
          <span [class]="detailClass()">{{ item }}</span>
        }
        <ng-content />
      </div>
    </ff-thinking-steps-panel>
  `,
  host: { '[class]': 'hostClass()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThinkingStepDetails {
  /** Collapsed label text (e.g. "Explored 6 files"). */
  readonly summary = input.required<string>();
  /** Shorthand list of detail lines rendered automatically. */
  readonly details = input<string[] | undefined>(undefined);
  /** Whether the nested section starts expanded. */
  readonly defaultOpen = input(false, { transform: booleanAttribute });
  readonly userClass = input('', { alias: 'class' });

  private readonly id = nextId++;
  protected readonly triggerId = `ff-thinking-step-details-trigger-${this.id}`;
  protected readonly panelId = `ff-thinking-step-details-panel-${this.id}`;
  protected readonly open = linkedSignal(() => this.defaultOpen());
  private readonly variant = injectSizeVariant();

  protected readonly hostClass = computed(() => cn('block mt-1 -ml-3', this.userClass()));
  protected readonly detailClass = computed(() =>
    cn('text-muted-foreground', typeClass('caption', this.variant() === 'compact' ? 'compact' : 'default')),
  );
}

// ─── ThinkingStepSources ────────────────────────────────────────────────────

/** A wrapping row of source badges. */
@Component({
  selector: 'ff-thinking-step-sources',
  template: `<ng-content />`,
  host: { '[class]': 'hostClass()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThinkingStepSources {
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() => cn('flex flex-wrap gap-1.5 mt-1', this.userClass()));
}

// ─── ThinkingStepSource ─────────────────────────────────────────────────────

/** One source badge; it pops in from a blur after `delay` seconds. */
@Component({
  selector: 'ff-thinking-step-source',
  imports: [Badge],
  template: `<ff-badge variant="solid" size="sm" [color]="color()" [class]="userClass()"><ng-content /></ff-badge>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThinkingStepSource {
  /** Badge color from the Tailwind palette. */
  readonly color = input<BadgeColor>('gray');
  /** Entrance animation delay in seconds. */
  readonly delay = input(0);
  /** Classes for the badge. */
  readonly userClass = input('', { alias: 'class' });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    const animateFluid = injectAnimateFluid();
    host.style.opacity = '0';
    host.style.filter = 'blur(4px)';
    afterNextRender(() => {
      const delay = this.delay();
      const animation = animateFluid(
        host,
        { opacity: [0, 1], scale: [0.85, 1], filter: ['blur(4px)', 'blur(0px)'] },
        { ...enterTransition(spring.moderate), delay, filter: { duration: 0.12, delay } },
      );
      destroyRef.onDestroy(() => animation.stop());
    });
  }
}

// ─── ThinkingStepImage ──────────────────────────────────────────────────────

/** An inline image in a step, with an optional caption. */
@Component({
  selector: 'ff-thinking-step-image',
  template: `
    <!-- Screenshots often end in white; an inset neutral hairline keeps the
         edge visible without changing the measured image or panel height. -->
    <img [src]="src()" [alt]="alt()" [class]="imageClass()" />
    @if (caption()) {
      <span [class]="captionClass()">{{ caption() }}</span>
    }
  `,
  host: { '[class]': 'hostClass()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThinkingStepImage {
  /** Image URL. */
  readonly src = input.required<string>();
  /** Alt text for accessibility. */
  readonly alt = input('');
  /** Optional caption below the image. */
  readonly caption = input<string | undefined>(undefined);
  /** Entrance animation delay in seconds. */
  readonly delay = input(0);
  readonly userClass = input('', { alias: 'class' });

  private readonly shape = injectShape();
  // The caption role of the type scale.
  private readonly variant = injectSizeVariant();

  protected readonly hostClass = computed(() => cn('block mt-1.5', this.userClass()));
  protected readonly imageClass = computed(() =>
    cn(
      'w-full max-w-[200px] object-cover outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
      this.shape().container,
    ),
  );
  protected readonly captionClass = computed(() =>
    cn(typeClass('caption', this.variant() === 'compact' ? 'compact' : 'default'), 'text-muted-foreground mt-1 block'),
  );

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    const animateFluid = injectAnimateFluid();
    host.style.opacity = '0';
    host.style.filter = 'blur(4px)';
    afterNextRender(() => {
      const delay = this.delay();
      const animation = animateFluid(
        host,
        { opacity: [0, 1], filter: ['blur(4px)', 'blur(0px)'] },
        { opacity: { duration: 0.2, delay, ease: 'easeOut' }, filter: { duration: 0.15, delay } },
      );
      destroyRef.onDestroy(() => animation.stop());
    });
  }
}
