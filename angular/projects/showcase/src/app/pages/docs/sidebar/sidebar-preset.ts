// ---------------------------------------------------------------------------
// Sidebar playground state: the single source for the playground rail, the
// code generator and the preset codec. Ported from
// lib/preset/sidebar-options.ts plus the sidebar registration in
// lib/preset/components.ts.
//
// Codec compat rules (same as shadcn's preset codec):
//   1. Never reorder existing value arrays — only append.
//   2. Every field's DEFAULT sits at index 0.
//   3. Only append new fields at the END of SIDEBAR_PRESET_FIELDS.
//   4. Stay under 53 bits total (JS safe-integer limit).
//
// D1 removed the primitive flavor from the site, so the playground never
// picks one: `flavor` still rides in the field table (index 0, "radix") so
// codes shared from the React site keep decoding.
// ---------------------------------------------------------------------------

import type { IconName } from '@angel-r/fluid-functionalism-angular';
import {
  type PresetComponentDef,
  type PresetField,
  decodePreset,
  encodePreset,
  registerPresetComponent,
} from '../../../docs-kit/preset/codec';

export type Count3 = 0 | 1 | 2 | 3;
export type Count2 = 0 | 1 | 2;
export type Stack = 'horizontal' | 'vertical';
export type SidebarDesign = 'sidebar' | 'floating' | 'inset';

export interface PlayState {
  // Layout
  design: SidebarDesign;
  /** What the collapsed edge does: nothing, or peek the sidebar back. */
  collapsedBehavior: 'none' | 'hover' | 'click';
  state: 'opened' | 'closed' | 'loading';
  // Header
  headerPrimary: 'dropdown' | 'logo' | 'none';
  headerStack: Stack;
  headerActions: Count2;
  // Sections
  sectionsCollapsible: boolean;
  sectionActions: Count3;
  // Content level 1
  l1Primary: 'threads' | 'menu';
  l1Children: boolean;
  l1Actions: Count3;
  l1Badges: boolean;
  // Content level 2 — the deepest level the menu nests to.
  l2Icon: boolean;
  l2Actions: Count3;
  l2Badges: boolean;
  // Footer
  footerPrimary: 'dropdown' | 'none';
  footerStack: Stack;
  footerActions: Count2;
  /** Anchored callout above the footer rows: an inline icon row or a
   *  banner card. */
  footerCallout: 'none' | 'inline' | 'banner';
  /** Render the callout as a sonner-style stack of cards instead of one. */
  footerCalloutStacked: boolean;
}

/** Site-level knobs that change what a preset INSTALLS (shape and size pin
 *  the providers in the emitted page). */
export interface PresetGlobals {
  flavor: 'radix' | 'base';
  shape: 'rounded' | 'pill';
  size: 'default' | 'compact';
}

export type SidebarPreset = PlayState & PresetGlobals;

export const DEFAULT_STATE: PlayState = {
  design: 'inset',
  collapsedBehavior: 'none',
  state: 'opened',
  headerPrimary: 'dropdown',
  headerStack: 'vertical',
  headerActions: 1,
  sectionsCollapsible: true,
  sectionActions: 1,
  l1Primary: 'threads',
  l1Children: false,
  l1Actions: 1,
  l1Badges: false,
  l2Icon: true,
  l2Actions: 1,
  l2Badges: true,
  footerPrimary: 'dropdown',
  footerStack: 'horizontal',
  footerActions: 2,
  footerCallout: 'none',
  footerCalloutStacked: false,
};

export const DEFAULT_GLOBALS: PresetGlobals = {
  flavor: 'radix',
  shape: 'rounded',
  size: 'default',
};

export const DEFAULT_PRESET: SidebarPreset = {
  ...DEFAULT_STATE,
  ...DEFAULT_GLOBALS,
};

// Value arrays are ordered DEFAULT-FIRST, which is why several differ from
// their natural order (e.g. headerActions [1, 0, 2]).
export const SIDEBAR_PRESET_FIELDS: readonly PresetField[] = [
  { key: 'design', values: ['inset', 'sidebar', 'floating'], bits: 3 },
  { key: 'collapsedBehavior', values: ['none', 'hover', 'click'], bits: 3 },
  { key: 'state', values: ['opened', 'closed', 'loading'], bits: 3 },
  { key: 'headerPrimary', values: ['dropdown', 'logo', 'none'], bits: 3 },
  { key: 'headerStack', values: ['vertical', 'horizontal'], bits: 1 },
  { key: 'headerActions', values: [1, 0, 2], bits: 3 },
  { key: 'sectionsCollapsible', values: [true, false], bits: 1 },
  { key: 'sectionActions', values: [1, 0, 2, 3], bits: 3 },
  { key: 'l1Primary', values: ['threads', 'menu'], bits: 2 },
  { key: 'l1Children', values: [false, true], bits: 1 },
  { key: 'l1Actions', values: [1, 0, 2, 3], bits: 3 },
  { key: 'l1Badges', values: [false, true], bits: 1 },
  { key: 'l2Icon', values: [true, false], bits: 1 },
  { key: 'l2Actions', values: [1, 0, 2, 3], bits: 3 },
  { key: 'l2Badges', values: [true, false], bits: 1 },
  { key: 'footerPrimary', values: ['dropdown', 'none'], bits: 2 },
  { key: 'footerStack', values: ['horizontal', 'vertical'], bits: 1 },
  { key: 'footerActions', values: [2, 0, 1], bits: 3 },
  { key: 'footerCallout', values: ['none', 'inline', 'banner'], bits: 3 },
  { key: 'footerCalloutStacked', values: [false, true], bits: 1 },
  { key: 'flavor', values: ['radix', 'base'], bits: 3 },
  { key: 'shape', values: ['rounded', 'pill'], bits: 2 },
  { key: 'size', values: ['default', 'compact'], bits: 2 },
];

// ── Demo content, shared by the playground preview and the generator ────────

/** One row action. `menu` marks the overflow action, which opens a dropdown
 *  instead of carrying a tooltip. */
export interface RowAction {
  icon: IconName;
  label: string;
  menu?: boolean;
}

/** Row actions are sliced from the END, so the overflow menu is the one you
 *  always keep: it stays rightmost and demos the dropdown at every count. */
export const ROW_ACTION_SET: readonly RowAction[] = [
  { icon: 'plus', label: 'Add' },
  { icon: 'pencil', label: 'Rename' },
  { icon: 'more-vertical', label: 'More options', menu: true },
];

export const GROUP_ACTION_SET: readonly { icon: IconName; label: string }[] = [
  { icon: 'plus', label: 'Add item' },
  { icon: 'sliders-horizontal', label: 'Section settings' },
  { icon: 'more-vertical', label: 'More options' },
];

export const SEARCH_SHORTCUT = '⌘K';

export const HEADER_ACTION_SET: readonly { icon: IconName; label: string; shortcut: string }[] = [
  { icon: 'plus', label: 'New', shortcut: '⇧⌘O' },
  { icon: 'users', label: 'Invite', shortcut: '⇧⌘I' },
];

export const FOOTER_ACTION_SET: readonly { icon: IconName; label: string }[] = [
  { icon: 'settings', label: 'Settings' },
  { icon: 'moon', label: 'Theme' },
];

/** Level-2 rows, hosted by every level-1 row while "Has children" is on. */
export const L2_ROWS: readonly { icon: IconName; label: string; badge?: string }[] = [
  { icon: 'folder', label: 'Design system', badge: '4' },
  { icon: 'folder', label: 'Marketing site', badge: '2' },
  { icon: 'folder', label: 'Travel app' },
];

export const SECTION_LABELS = {
  threads: ['fluid-functionalism', 'portfolio-site'],
  menu: ['Platform', 'Workspace'],
} as const;

// ── Registration (tag "s") ─────────────────────────────────────────────────

/** The sidebar's preset definition: the same tag, version and field table the
 *  React site registers, so a `?preset=` code means the same thing here. */
export const SIDEBAR_PRESET_DEF: PresetComponentDef = {
  tag: 's',
  label: 'Sidebar',
  docsPath: '/docs/sidebar',
  versions: { a: SIDEBAR_PRESET_FIELDS },
  currentVersion: 'a',
  defaults: DEFAULT_PRESET as unknown as PresetComponentDef['defaults'],
  installable: true,
};
// Decoding needs the registration to have run; encoding takes the def.
registerPresetComponent(SIDEBAR_PRESET_DEF);

export function encodeSidebarPreset(config: Partial<SidebarPreset>): string {
  return encodePreset(SIDEBAR_PRESET_DEF, config);
}

export type SidebarDecodeResult =
  | { ok: true; preset: SidebarPreset; version: string }
  | { ok: false; error: string };

export function decodeSidebarPreset(code: string): SidebarDecodeResult {
  const res = decodePreset(code);
  if (!res.ok) return res;
  if (res.def.tag !== 's') {
    return { ok: false, error: `Not a sidebar preset (tag "${res.def.tag}").` };
  }
  return {
    ok: true,
    preset: res.preset as unknown as SidebarPreset,
    version: res.version,
  };
}

export const SIDEBAR_DEFAULT_CODE = encodeSidebarPreset({});

/** A decoded preset's playground half: the site settings (flavor, shape, size)
 *  stay on the site — the rail hydrates from the rest. */
export function playStateOf(preset: SidebarPreset): PlayState {
  const { flavor, shape, size, ...play } = preset;
  return play;
}
