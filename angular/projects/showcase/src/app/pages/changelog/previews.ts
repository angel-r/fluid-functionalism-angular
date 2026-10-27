// ---------------------------------------------------------------------------
// What a New entry shows under its sentence: the live component, the same
// preview its Showcase tile renders, or the system page's own demo. A slug with
// neither (a page-less change) shows its text alone. Ported from
// app/changelog/previews.tsx.
//
// The Showcase tiles come from the home grid's registry; the three system pages
// have no tile, so their own page's demo stands in. Nothing here is lazy: the
// page mounts a stage only once it nears the viewport (see ChangelogStage), so
// the first paint carries none of them.
// ---------------------------------------------------------------------------

import type { Type } from '@angular/core';
import { PREVIEW_MAP } from '../home/bento-previews';
import { PlainVsFluidPreview } from '../docs/fluid-hover/plain-vs-fluid.preview';
import { ToolbarDemo } from '../docs/sizes/toolbar-demo';
import { TabsExample } from '../docs/skill/examples';

/** System pages have no Showcase tile: their own page's demo stands in. */
const SYSTEM_PREVIEWS: Readonly<Record<string, Type<unknown>>> = {
  'fluid-hover': PlainVsFluidPreview,
  sizes: ToolbarDemo,
  skill: TabsExample,
};

/** The slugs whose preview reads the page's playback state, and so take a
 *  `paused` input. */
const PAUSED_PREVIEWS: Readonly<Record<string, true>> = {
  'carousel-dots': true,
  'fluid-hover': true,
  skill: true,
};

/** The previews that animate by themselves: the changelog gives these a Play /
 *  Pause button. */
const ANIMATED_PREVIEWS: Readonly<Record<string, true>> = {
  'carousel-dots': true,
  'fluid-hover': true,
  skill: true,
};

/** Stage padding by slug, where a preview needs more room than the default
 *  px-6 py-12 leaves (the Showcase grid's overrides, same reasons). */
const STAGE_PADDING: Readonly<Record<string, string>> = {
  sidebar: 'px-4 py-8',
  card: 'px-6 py-5',
  'command-menu': 'px-6 py-8',
  'fluid-hover': 'px-6 py-8',
  sizes: 'px-6 py-8',
  skill: 'px-4 py-6',
};

/** The default stage padding, for every slug the table leaves out. */
const DEFAULT_PADDING = 'px-6 py-12';

export function hasPreview(slug: string): boolean {
  return slug in SYSTEM_PREVIEWS || slug in PREVIEW_MAP;
}

/** The component a slug's stage renders. */
export function previewComponent(slug: string): Type<unknown> | null {
  return SYSTEM_PREVIEWS[slug] ?? PREVIEW_MAP[slug] ?? null;
}

/** Whether the preview takes a `paused` input (a scripted cursor, an autoplay). */
export function takesPausedInput(slug: string): boolean {
  return slug in PAUSED_PREVIEWS;
}

export function isAnimatedPreview(slug: string): boolean {
  return slug in ANIMATED_PREVIEWS;
}

/** The stage's padding classes for a slug. */
export function stagePadding(slug: string): string {
  return STAGE_PADDING[slug] ?? DEFAULT_PADDING;
}
