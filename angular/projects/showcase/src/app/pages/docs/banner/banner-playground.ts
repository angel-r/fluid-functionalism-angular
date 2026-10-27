// ---------------------------------------------------------------------------
// The Banner playground's state, its demo copy and its generated Angular
// snippet, ported from lib/docs/playgrounds/banner.tsx.
//
// One real Banner is driven by the controls, with the matching code kept in
// sync for the Code tab. Size is left to the site-wide control (the "Make
// them yours" panel / S), so it isn't repeated here. The fixed variant renders
// inside a mock page, between its header and its scrolling content.
//
// The snippet is a compilable standalone component plus the `provideFluid()`
// call the visitor's Shape and Size settings imply (S8, D5), so it regenerates
// with the settings.
// ---------------------------------------------------------------------------

import type { BannerContrast, BannerStatus, BannerVariant } from '@angel-r/fluid-functionalism-angular';
import type { PresetGlobals } from '../../../docs-kit/preset/preset-globals';

export interface BannerCopy {
  title: string;
  description: string;
  primary: string;
  secondary: string;
  ghost: string;
}

export const BANNER_COPY: Record<BannerStatus, BannerCopy> = {
  default: {
    title: 'Banner is new in Fluid Functionalism',
    description: '5 statuses, 2 contrasts and a dismiss that collapses its height.',
    primary: 'Read the docs',
    secondary: 'Changelog',
    ghost: 'Not now',
  },
  info: {
    title: 'The registry has new components',
    description: 'Run the install command again to pull the latest versions.',
    primary: 'Copy command',
    secondary: "What's new",
    ghost: 'Later',
  },
  success: {
    title: 'Fluid Functionalism is installed',
    description: 'Button, Card and Dialog were added to components/ui.',
    primary: 'Open the docs',
    secondary: 'Add more',
    ghost: 'Share',
  },
  warning: {
    title: 'Inter is missing its opsz axis',
    description: 'Labels shift when their weight changes. Add axes: ["opsz"] to your next/font call.',
    primary: 'Show the fix',
    secondary: 'Read the guide',
    ghost: 'Ignore',
  },
  error: {
    title: "Couldn't reach the registry",
    description: "shadcn couldn't fetch button.json from fluidfunctionalism.com.",
    primary: 'Retry',
    secondary: 'Status page',
    ghost: 'Report issue',
  },
};

export const BANNER_STATUSES: readonly { value: BannerStatus; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

export interface BannerPlayState {
  variant: BannerVariant;
  status: BannerStatus;
  contrast: BannerContrast;
  description: boolean;
  primary: boolean;
  secondary: boolean;
  ghost: boolean;
  dismissible: boolean;
}

export const DEFAULT_BANNER_STATE: BannerPlayState = {
  variant: 'inline',
  status: 'success',
  contrast: 'low',
  description: true,
  primary: true,
  secondary: true,
  ghost: false,
  dismissible: true,
};

/** Rolls the panel with the reference's odds: fixed is rare, ghost rarer. */
export function randomBannerState(): BannerPlayState {
  const statuses = BANNER_STATUSES.map((status) => status.value);
  const contrasts: readonly BannerContrast[] = ['low', 'high'];
  return {
    variant: Math.random() > 0.75 ? 'fixed' : 'inline',
    status: statuses[Math.floor(Math.random() * statuses.length)],
    contrast: contrasts[Math.floor(Math.random() * contrasts.length)],
    description: Math.random() > 0.4,
    primary: Math.random() > 0.3,
    secondary: Math.random() > 0.5,
    ghost: Math.random() > 0.6,
    dismissible: Math.random() > 0.3,
  };
}

export function buildBannerCode(state: BannerPlayState, globals: PresetGlobals): string {
  const copy = BANNER_COPY[state.status];
  const attrs: string[] = [];
  if (state.variant !== 'inline') attrs.push(`variant="${state.variant}"`);
  if (state.status !== 'default') attrs.push(`status="${state.status}"`);
  if (state.contrast !== 'low') attrs.push(`contrast="${state.contrast}"`);
  if (state.dismissible) attrs.push('dismissible');

  const lines: string[] = [];
  lines.push("import { Component } from '@angular/core';");
  lines.push("import { BANNER_PARTS, provideFluid } from '@angel-r/fluid-functionalism-angular';");
  lines.push('');
  lines.push('@Component({');
  lines.push("  selector: 'app-banner-demo',");
  lines.push('  imports: [BANNER_PARTS],');
  lines.push('  template: `');
  lines.push(`    <ff-banner${attrs.length ? ' ' + attrs.join(' ') : ''}>`);
  lines.push(`      <p ffBannerTitle>${copy.title}</p>`);
  if (state.description) {
    lines.push('      <p ffBannerDescription>');
    lines.push(`        ${copy.description}`);
    lines.push('      </p>');
  }
  // Written strongest first (that's the tab order); the banner lays them out
  // by variant.
  if (state.primary || state.secondary || state.ghost) {
    lines.push('      <div ffBannerActions>');
    if (state.primary) lines.push(`        <ff-banner-action variant="primary">${copy.primary}</ff-banner-action>`);
    if (state.secondary) lines.push(`        <ff-banner-action>${copy.secondary}</ff-banner-action>`);
    if (state.ghost) lines.push(`        <ff-banner-action variant="ghost">${copy.ghost}</ff-banner-action>`);
    lines.push('      </div>');
  }
  lines.push('    </ff-banner>');
  lines.push('  `,');
  lines.push('})');
  lines.push('export class BannerDemo {}');
  lines.push('');
  lines.push('// app.config.ts (once per app)');
  lines.push(`provideFluid({ shape: '${globals.shape}', size: '${globals.size}' })`);
  return lines.join('\n');
}
