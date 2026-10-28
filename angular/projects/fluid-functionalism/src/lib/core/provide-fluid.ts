import { type EnvironmentProviders, makeEnvironmentProviders, isSignal } from '@angular/core';
import { FF_DEFAULT_SHAPE, RootShapeContext, ShapeContext, type ShapeVariant } from './shape';
import { FF_DEFAULT_SIZE, RootSizeContext, SizeContext, type SizeVariant } from './size';
import { provideIcons, provideIconsSource, type IconMap, type IconSource } from './icons';

export interface FluidOptions {
  /** Corner style of every component. Switchable at runtime through
   *  `injectShapeContext().setShape()`. */
  shape?: ShapeVariant;
  /** Size step of every control. Switchable at runtime through
   *  `injectSizeContext().setSize()`. */
  size?: SizeVariant;
  /** Icons by slot name. Slots left out keep Lucide. Pass a signal or a
   *  getter instead to swap packs at runtime (`injectIconsSource()` reads it). */
  icons?: Partial<IconMap> | IconSource;
}

/**
 * One call for the whole system, in `bootstrapApplication` providers:
 * shape, size and icons. Reduced motion follows the OS setting on its own
 * (see `ReducedMotion`), so there is nothing to configure for it.
 */
export function provideFluid(options: FluidOptions = {}): EnvironmentProviders {
  const { icons = {} } = options;
  return makeEnvironmentProviders([
    { provide: FF_DEFAULT_SHAPE, useValue: options.shape ?? 'rounded' },
    { provide: FF_DEFAULT_SIZE, useValue: options.size ?? 'default' },
    { provide: ShapeContext, useClass: RootShapeContext },
    { provide: SizeContext, useClass: RootSizeContext },
    isSignal(icons) || typeof icons === 'function'
      ? provideIconsSource(icons as IconSource)
      : provideIcons(icons as Partial<IconMap>),
  ]);
}
