import {
  Directive,
  InjectionToken,
  type Signal,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { surfaceClasses } from './surface-classes';

// ---------------------------------------------------------------------------
// The surface level the children sit on, on an 8-step ladder (1 is the page).
// Raised components (menus, popovers, dialogs) read it and pick their own
// level relative to it instead of hard-coding one, then provide their new
// level to what they contain. A menu that hard-codes its background ends up
// the same color as the dialog it opens in and melts into it; reading the
// substrate lands it one step up wherever it opens, with no input passed down.
// ---------------------------------------------------------------------------

export const SURFACE_LEVEL = new InjectionToken<Signal<number>>('FF_SURFACE_LEVEL');

const pageLevel = signal(1).asReadonly();

const clampLevel = (value: number) => Math.max(1, Math.min(8, value));

/** The substrate level. No provider means the page itself. */
export function injectSurface(): Signal<number> {
  return inject(SURFACE_LEVEL, { optional: true }) ?? pageLevel;
}

/** Provides an explicit surface level to descendants: `<div [ffSurface]="3">`. */
@Directive({
  selector: '[ffSurface]',
  providers: [{ provide: SURFACE_LEVEL, useFactory: () => inject(SurfaceProvider).level }],
})
export class SurfaceProvider {
  readonly value = input.required<number, unknown>({ alias: 'ffSurface', transform: numberAttribute });
  // Clamped to the ladder: a deep stack keeps resolving to a real surface
  // token instead of a level with no background or shadow defined.
  readonly level = computed(() => clampLevel(this.value()));
}

/**
 * Raises an element `offset` steps above its substrate, applies the matching
 * surface background + shadow, and re-provides the new level to descendants
 * so further nesting walks up the ladder automatically.
 *
 * Conventional offsets: 2 — dropdown / popover / select menu; 4 — dialog.
 * `shadowLevel` pins the shadow weight regardless of nesting depth.
 */
@Directive({
  selector: '[ffElevated]',
  host: { '[class]': 'surfaceClass()' },
  providers: [{ provide: SURFACE_LEVEL, useFactory: () => inject(Elevated).level }],
})
export class Elevated {
  readonly offset = input.required<number, unknown>({ alias: 'ffElevated', transform: numberAttribute });
  readonly shadowLevel = input<number | undefined>(undefined);
  private readonly substrate =
    inject(SURFACE_LEVEL, { optional: true, skipSelf: true }) ?? pageLevel;
  readonly level = computed(() => Math.min(this.substrate() + this.offset(), 8));
  protected readonly surfaceClass = computed(() =>
    surfaceClasses(this.level(), this.shadowLevel() ?? this.level()),
  );
}
