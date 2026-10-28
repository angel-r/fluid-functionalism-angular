import { Directive, InjectionToken, type Signal, computed, inject, input } from '@angular/core';
import { SizeContext, type SizeVariant } from '@angel-r/fluid-functionalism-angular/core';

// ---------------------------------------------------------------------------
// Shared pieces of the color picker: the portal container token, the size pin
// and the constants several parts read.
// ---------------------------------------------------------------------------

export const PANEL_WIDTH = 280;
export const SQUARE_HEIGHT = 156;

// 8px checkerboard from one conic-gradient, behind ColorTile and ColorSwatch
// so a translucent color reads as translucent (the alpha rail repeats it
// inline). --checker-a / --checker-b carry the light and dark values.
export const CHECKER_IMAGE =
  'conic-gradient(var(--checker-a) 0 25%, var(--checker-b) 0 50%, var(--checker-a) 0 75%, var(--checker-b) 0)';
export const CHECKER_SIZE = '8px 8px';

/** Where the format menu renders instead of the global overlay layer. */
export const COLOR_PICKER_PORTAL_CONTAINER = new InjectionToken<Signal<HTMLElement | null>>(
  'FF_COLOR_PICKER_PORTAL_CONTAINER',
);

/**
 * Renders descendant color picker popups (the format menu) inside the given
 * element, e.g. a CSS-scaled preview frame, so they scale with the picker:
 * `<div [ffColorPickerPortalContainer]="frame">`. ColorPickerPopover points
 * it at its own panel, so the format menu lives inside the popover's DOM.
 */
@Directive({
  selector: '[ffColorPickerPortalContainer]',
  providers: [
    { provide: COLOR_PICKER_PORTAL_CONTAINER, useFactory: () => inject(ColorPickerPortalContainer).value },
  ],
})
export class ColorPickerPortalContainer {
  readonly value = input<HTMLElement | null>(null, { alias: 'ffColorPickerPortalContainer' });
}

/**
 * The popups a popover owns beyond its own pane (the format menu's overlay).
 * Presses and focus inside them count as inside the popover, wherever the
 * overlay renders (inside the panel, or in the global layer when the popover
 * API is unavailable).
 */
export class PopupScope {
  private readonly panes = new Set<HTMLElement>();

  add(pane: HTMLElement): () => void {
    this.panes.add(pane);
    return () => this.panes.delete(pane);
  }

  contains(node: Node | null): boolean {
    if (!node) return false;
    for (const pane of this.panes) if (pane.contains(node)) return true;
    return false;
  }
}

export const COLOR_PICKER_POPUP_SCOPE = new InjectionToken<PopupScope>('FF_COLOR_PICKER_POPUP_SCOPE');

/**
 * A size context pinned by a component's `size` input, falling back to the
 * surrounding provider: the React `size ? <SizeProvider size={size}> : root`.
 * The owner provides it to its own view and overlay content.
 */
export class PinnedSizeContext extends SizeContext {
  readonly size: Signal<SizeVariant>;

  constructor(
    pin: () => SizeVariant | undefined,
    private readonly parent: SizeContext | null,
  ) {
    super();
    this.size = computed(() => pin() ?? parent?.size() ?? 'default');
  }

  setSize(next: SizeVariant) {
    this.parent?.setSize(next);
  }
}

/** Builds the pinned size for a component: call in its constructor/field init. */
export function createPinnedSize(pin: () => SizeVariant | undefined): PinnedSizeContext {
  return new PinnedSizeContext(pin, inject(SizeContext, { optional: true, skipSelf: true }));
}
