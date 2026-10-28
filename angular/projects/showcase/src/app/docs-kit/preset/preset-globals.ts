// ---------------------------------------------------------------------------
// The site-level knobs that ride along in every preset snippet, ported from
// `usePresetGlobals` in lib/docs/preset-ui.tsx (D5). The reference also had a
// primitive flavor; D1 removed it, so the shape and size steps are what a
// generated snippet pins in its `provideFluid()` call.
//
// `injectPresetGlobals()` must run in an injection context (a page's field
// initializer). It tracks the live settings, so a snippet regenerates when the
// visitor changes Shape or Size in the right panel.
// ---------------------------------------------------------------------------

import { computed, inject, type Signal } from '@angular/core';
import { injectShapeContext, injectSizeContext } from '@angel-r/fluid-functionalism-angular';

export interface PresetGlobals {
  shape: 'rounded' | 'pill';
  size: 'default' | 'compact';
}

export function injectPresetGlobals(): Signal<PresetGlobals> {
  const shape = injectShapeContext();
  const size = injectSizeContext();
  return computed(() => ({ shape: shape.shape(), size: size.size() }));
}
