// ---------------------------------------------------------------------------
// The /demo slides. Ported from app/demo/page.tsx: the curated `slideOrder`,
// the "Make them yours" slide in its fixed place, and the preview each slide
// renders (React's `previewMap` today, a playground's own preview once a slug
// has one).
//
// One registry, so the slide shell never learns a slug: adding a slide, moving
// it or swapping its preview is an edit to this file alone.
//
// The reference also renders a slide for a slug whose only source is a
// playground (`playgroundMap`). The playgrounds are ported per doc page; until
// one is wired here its slug has no source and is skipped, exactly as React
// skips a slug with neither a preview nor a playground. `banner` is that case
// today.
// ---------------------------------------------------------------------------

import type { Type } from '@angular/core';
import { componentList } from '../../site/nav-data';
import { isNew } from '../../shell/release-marks';
import { PREVIEW_MAP } from '../home/bento-previews';

/** The settings slide's slug: the pen-free "Make them yours" slide, and the
 *  `?c=` value that addresses it. */
export const SETTINGS_SLUG = 'settings';

/** The stage width a slide gets when it names none: the width the previews
 *  are composed at (BASE_WIDTH on the reference page). */
export const DEFAULT_STAGE_WIDTH = 420;

export interface DemoSlide {
  slug: string;
  name: string;
  /** The live preview to mount; null on the settings slide. */
  preview: Type<unknown> | null;
  /** Max width of the scaling stage, in px. */
  maxWidth: number;
  isNew: boolean;
}

/** What a slug renders, and how wide its stage is. A playground-driven slide
 *  replaces an entry here with its adapter. */
interface SlideSource {
  preview: Type<unknown>;
  maxWidth?: number;
}

/** The reference's order, verbatim. `settings` takes the
 *  `__settings__` marker's place. */
const SLIDE_ORDER: readonly string[] = [
  'checkbox-group',
  'accordion',
  'tabs',
  'radio-group',
  'slider',
  'ask-user-questions',
  'input-message',
  'sidebar',
  'button',
  'dropdown',
  'combobox',
  'calendar',
  'date-picker',
  'command-menu',
  'color-picker',
  'input-group',
  'switch',
  'table',
  'card',
  'tabs-subtle',
  'thinking-indicator',
  'thinking-steps',
  'banner',
  SETTINGS_SLUG,
  'input-copy',
  'carousel-dots',
];

const PREVIEWS: Readonly<Record<string, SlideSource>> = Object.fromEntries(
  Object.entries(PREVIEW_MAP).map(([slug, preview]) => [slug, { preview }]),
);

const NAMES: ReadonlyMap<string, string> = new Map(
  componentList.map((component) => [component.slug, component.name]),
);

/** Every slide, in order. A slug with no source or no name is skipped. */
export const DEMO_SLIDES: readonly DemoSlide[] = SLIDE_ORDER.flatMap((slug): DemoSlide[] => {
  if (slug === SETTINGS_SLUG) {
    return [
      {
        slug,
        name: 'Make them yours',
        preview: null,
        maxWidth: DEFAULT_STAGE_WIDTH,
        isNew: false,
      },
    ];
  }
  const source = PREVIEWS[slug];
  const name = NAMES.get(slug);
  if (!source || !name) return [];
  return [
    {
      slug,
      name,
      preview: source.preview,
      maxWidth: source.maxWidth ?? DEFAULT_STAGE_WIDTH,
      isNew: isNew(slug),
    },
  ];
});
