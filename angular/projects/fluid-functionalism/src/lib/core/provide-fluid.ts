import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { FF_DEFAULT_SHAPE, RootShapeContext, ShapeContext, type ShapeVariant } from './shape';
import { FF_DEFAULT_SIZE, RootSizeContext, SizeContext, type SizeVariant } from './size';
import { provideIcons, type IconDefinition, type IconName } from './icons';

export interface FluidOptions {
  /** Corner style of every component. Switchable at runtime through
   *  `injectShapeContext().setShape()`. */
  shape?: ShapeVariant;
  /** Size step of every control. Switchable at runtime through
   *  `injectSizeContext().setSize()`. */
  size?: SizeVariant;
  /** Icons by slot name. Slots left out keep Lucide. */
  icons?: Partial<Record<IconName, IconDefinition>>;
}

/**
 * One call for the whole system, in `bootstrapApplication` providers:
 * shape, size and icons. Reduced motion follows the OS setting on its own
 * (see `ReducedMotion`), so there is nothing to configure for it.
 */
export function provideFluid(options: FluidOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: FF_DEFAULT_SHAPE, useValue: options.shape ?? 'rounded' },
    { provide: FF_DEFAULT_SIZE, useValue: options.size ?? 'default' },
    { provide: ShapeContext, useClass: RootShapeContext },
    { provide: SizeContext, useClass: RootSizeContext },
    provideIcons(options.icons ?? {}),
  ]);
}
