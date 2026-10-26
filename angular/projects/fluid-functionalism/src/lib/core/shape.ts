import {
  DOCUMENT,
  DestroyRef,
  Directive,
  Injectable,
  InjectionToken,
  type Signal,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';

export type ShapeVariant = 'pill' | 'rounded';

export interface ShapeClasses {
  /** The variant these classes belong to — handy for conditionals. */
  variant: ShapeVariant;
  item: string;
  bg: string;
  focusRing: string;
  mergedBg: string;
  container: string;
  button: string;
  input: string;
  // Numeric counterparts of `bg` / `mergedBg`, in px. Needed where individual
  // corners are animated (e.g. the selected-background merge/split animation),
  // which requires per-corner numeric border-radii rather than a class.
  bgRadius: number;
  /** Numeric counterpart of `container`. Popup shells use a 4px inset, so
   *  containerRadius = bgRadius + 4 keeps their curves concentric. */
  containerRadius: number;
  mergedRadius: number;
}

/**
 * Radius for a surface inset inside another rounded surface.
 *
 * `inset` is the interior spacing (usually parent padding); pass the parent's
 * border separately as `borderWidth`. Together they form the visible
 * edge-to-edge distance. Clamping at zero prevents an invalid negative radius.
 */
export function nestedRadius(outerRadius: number, inset: number, borderWidth = 0) {
  return Math.max(0, outerRadius - inset - borderWidth);
}

export const shapeMap: Record<ShapeVariant, ShapeClasses> = {
  pill: {
    variant: 'pill',
    item: 'rounded-[20px]',
    bg: 'rounded-[20px]',
    // +2px over `item` because the focus ring sits 2px outside the element
    // (top/left -2, width/height +4); this keeps the corners concentric so a
    // pill element gets a pill ring (matches the rounded-mode 8px→10px bump).
    focusRing: 'rounded-[22px]',
    mergedBg: 'rounded-2xl',
    container: 'rounded-3xl',
    button: 'rounded-[20px]',
    input: 'rounded-[20px]',
    bgRadius: 20,
    containerRadius: 24,
    mergedRadius: 16,
  },
  rounded: {
    variant: 'rounded',
    item: 'rounded-lg',
    bg: 'rounded-lg',
    focusRing: 'rounded-[10px]',
    mergedBg: 'rounded-lg',
    container: 'rounded-xl',
    button: 'rounded-lg',
    input: 'rounded-lg',
    bgRadius: 8,
    containerRadius: 12,
    mergedRadius: 8,
  },
};

/** The shape state a region shares: the React ShapeContext value. */
export abstract class ShapeContext {
  abstract readonly shape: Signal<ShapeVariant>;
  abstract readonly classes: Signal<ShapeClasses>;
  abstract setShape(next: ShapeVariant): void;
}

/** Initial shape for the app-level context created by `provideFluid()`. */
export const FF_DEFAULT_SHAPE = new InjectionToken<ShapeVariant>('FF_DEFAULT_SHAPE', {
  factory: () => 'rounded',
});

/**
 * Shared state for both shape providers. Switching runs under the
 * `.transitioning` guard (added + reflow-flushed first so the 180ms
 * border-radius cross-fade applies), and the current element radius is
 * published as `--shape-input-radius` on <html> so plain-CSS consumers (the
 * :focus-visible fallback ring) and overlay content stay in sync.
 */
function createShapeState(initial: () => ShapeVariant) {
  const document = inject(DOCUMENT);
  const shape = linkedSignal(initial);
  const classes = computed(() => shapeMap[shape()]);
  let timeout: ReturnType<typeof setTimeout> | undefined;

  effect(() => {
    document.documentElement.style.setProperty('--shape-input-radius', `${classes().bgRadius}px`);
  });
  inject(DestroyRef).onDestroy(() => clearTimeout(timeout));

  const setShape = (next: ShapeVariant) => {
    const root = document.documentElement;
    root.classList.add('transitioning');
    void root.offsetHeight;
    shape.set(next);
    clearTimeout(timeout);
    timeout = setTimeout(() => root.classList.remove('transitioning'), 200);
  };

  return { shape: shape.asReadonly(), classes, setShape };
}

/** App-level shape context, registered by `provideFluid()`. */
@Injectable()
export class RootShapeContext extends ShapeContext {
  private readonly defaultShape = inject(FF_DEFAULT_SHAPE);
  private readonly state = createShapeState(() => this.defaultShape);
  readonly shape = this.state.shape;
  readonly classes = this.state.classes;
  setShape(next: ShapeVariant) {
    this.state.setShape(next);
  }
}

/** Scopes a shape to a region: `<section ffShapeProvider defaultShape="pill">`. */
@Directive({
  selector: '[ffShapeProvider]',
  exportAs: 'ffShapeProvider',
  providers: [{ provide: ShapeContext, useExisting: ShapeProvider }],
})
export class ShapeProvider extends ShapeContext {
  readonly defaultShape = input<ShapeVariant>('rounded');
  private readonly state = createShapeState(() => this.defaultShape());
  readonly shape = this.state.shape;
  readonly classes = this.state.classes;
  setShape(next: ShapeVariant) {
    this.state.setShape(next);
  }
}

const roundedClasses = signal(shapeMap.rounded).asReadonly();

// Rounded is the default on every path: the shipped :focus-visible fallback
// ring assumes its 8px radius. A consumer with no provider gets the corners
// the docs show.
export function injectShape(): Signal<ShapeClasses> {
  return inject(ShapeContext, { optional: true })?.classes ?? roundedClasses;
}

export function injectShapeContext(): ShapeContext {
  const ctx = inject(ShapeContext, { optional: true });
  if (!ctx) throw new Error('injectShapeContext() requires provideFluid() or [ffShapeProvider]');
  return ctx;
}
