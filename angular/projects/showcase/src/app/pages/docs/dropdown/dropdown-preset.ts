// ---------------------------------------------------------------------------
// Playground state, the preset codec registration, and the demo content of
// /docs/dropdown, ported from lib/preset/dropdown-options.ts (D5).
//
// Codec compat rules (same as shadcn's preset codec):
//   1. Never reorder existing value arrays — only append.
//   2. Every field's DEFAULT sits at index 0.
//   3. Only append new fields at the END of DROPDOWN_PRESET_FIELDS.
//   4. Stay under 53 bits total (JS safe-integer limit).
//
// The tables keep the reference's `flavor` field even though D1 removed the
// toggle: it occupies the low bits of every published code, so dropping it
// would re-interpret them. It always encodes its default ("radix").
// ---------------------------------------------------------------------------

import {
  decodePreset,
  encodePreset,
  registerPresetComponent,
  type PresetComponentDef,
  type PresetField,
} from '../../../docs-kit/preset/codec';
import type { PresetGlobals } from '../../../docs-kit/preset/preset-globals';
import type { IconName } from '@angel-r/fluid-functionalism-angular';

/** Popup menu behind a trigger, or the always-visible inline panel. */
export type DropdownMode = 'menu' | 'inline';
/** Radio rows (one checked), checkbox rows (any number, merged
 *  backgrounds), or plain action rows. */
export type DropdownSelection = 'single' | 'multiple' | 'none';

export interface DropdownPlayState {
  mode: DropdownMode;
  selection: DropdownSelection;
  /** A ff-dropdown-search pinned at the top of the popup (menu mode only). */
  search: boolean;
  /** Leading icons on every row. */
  icons: boolean;
  /** Two labelled groups with a separator (never together with search). */
  groups: boolean;
  /** One row rendered disabled. */
  disabledRow: boolean;
  /** A last row that creates what was typed (needs search). */
  creatable: boolean;
  /** The Theme row opens a submenu (menu mode only). */
  submenu: boolean;
}

export interface DropdownItem {
  icon: IconName;
  label: string;
  group: string;
}

export const DEFAULT_DROPDOWN_STATE: DropdownPlayState = {
  mode: 'menu',
  selection: 'single',
  search: false,
  icons: true,
  groups: false,
  disabledRow: false,
  creatable: false,
  submenu: true,
};

// Value arrays are ordered DEFAULT-FIRST. The three site-global fields stay
// LAST, mirroring the reference's sidebar layout.
const GLOBAL_FIELDS: readonly PresetField[] = [
  { key: 'flavor', values: ['radix', 'base'], bits: 3 },
  { key: 'shape', values: ['rounded', 'pill'], bits: 2 },
  { key: 'size', values: ['default', 'compact'], bits: 2 },
];

/** Version "a": the table the first published codes used. Kept so those
 *  codes still decode (the new fields take their defaults). */
const DROPDOWN_PRESET_FIELDS_A: readonly PresetField[] = [
  { key: 'mode', values: ['menu', 'inline'], bits: 2 },
  { key: 'selection', values: ['single', 'multiple', 'none'], bits: 2 },
  { key: 'search', values: [false, true], bits: 1 },
  { key: 'icons', values: [true, false], bits: 1 },
  { key: 'groups', values: [false, true], bits: 1 },
  { key: 'disabledRow', values: [false, true], bits: 1 },
  ...GLOBAL_FIELDS,
];

/** Version "b" (2026-09-08): creatable, ahead of the globals so the tail
 *  keeps the sidebar's layout. A layout change, hence the bump. */
const DROPDOWN_PRESET_FIELDS_B: readonly PresetField[] = [
  { key: 'mode', values: ['menu', 'inline'], bits: 2 },
  { key: 'selection', values: ['single', 'multiple', 'none'], bits: 2 },
  { key: 'search', values: [false, true], bits: 1 },
  { key: 'icons', values: [true, false], bits: 1 },
  { key: 'groups', values: [false, true], bits: 1 },
  { key: 'disabledRow', values: [false, true], bits: 1 },
  { key: 'creatable', values: [false, true], bits: 1 },
  ...GLOBAL_FIELDS,
];

/** Version "c" (2026-10-05): submenu, on by default, ahead of the globals
 *  like creatable. Older codes decode with it off (versionDefaults). */
export const DROPDOWN_PRESET_FIELDS: readonly PresetField[] = [
  { key: 'mode', values: ['menu', 'inline'], bits: 2 },
  { key: 'selection', values: ['single', 'multiple', 'none'], bits: 2 },
  { key: 'search', values: [false, true], bits: 1 },
  { key: 'icons', values: [true, false], bits: 1 },
  { key: 'groups', values: [false, true], bits: 1 },
  { key: 'disabledRow', values: [false, true], bits: 1 },
  { key: 'creatable', values: [false, true], bits: 1 },
  { key: 'submenu', values: [true, false], bits: 1 },
  ...GLOBAL_FIELDS,
];

export const DROPDOWN_PRESET_DEF: PresetComponentDef = {
  tag: 'd',
  label: 'Dropdown',
  docsPath: '/docs/dropdown',
  versions: {
    a: DROPDOWN_PRESET_FIELDS_A,
    b: DROPDOWN_PRESET_FIELDS_B,
    c: DROPDOWN_PRESET_FIELDS,
  },
  currentVersion: 'c',
  defaults: { ...DEFAULT_DROPDOWN_STATE, flavor: 'radix', shape: 'rounded', size: 'default' },
  // Codes from before the submenu existed keep the menu they described.
  versionDefaults: { a: { submenu: false }, b: { submenu: false } },
  installable: true,
};
registerPresetComponent(DROPDOWN_PRESET_DEF);

export function encodeDropdownPreset(config: Partial<DropdownPlayState & PresetGlobals>): string {
  return encodePreset(DROPDOWN_PRESET_DEF, { flavor: 'radix', ...config });
}

export type DropdownDecodeResult =
  | { ok: true; preset: DropdownPlayState; version: string }
  | { ok: false; error: string };

export function decodeDropdownPreset(code: string): DropdownDecodeResult {
  const res = decodePreset(code);
  if (!res.ok) return res;
  if (res.def.tag !== 'd') {
    return { ok: false, error: `Not a dropdown preset (tag "${res.def.tag}").` };
  }
  return { ok: true, preset: res.preset as unknown as DropdownPlayState, version: res.version };
}

export const DROPDOWN_DEFAULT_CODE = encodeDropdownPreset({});

/** The playground's derived facts, shared by the preview and the prompt:
 *  a search field only lives in the popup, and it replaces the groups (a
 *  filtered list re-indexes from 0, which labelled sections can't follow).
 *  The create row reads the query, so it needs the search. A submenu is a
 *  popup too, so the inline panel has none. */
export function deriveDropdown(state: DropdownPlayState): {
  search: boolean;
  groups: boolean;
  creatable: boolean;
  submenu: boolean;
} {
  const search = state.mode === 'menu' && state.search;
  const groups = !search && state.groups;
  const creatable = search && state.creatable;
  const submenu = state.mode === 'menu' && state.submenu;
  return { search, groups, creatable, submenu };
}

// ── Demo content, shared by the preview and the prompt ──────────────────────

/** Six settings rows in two groups — icon slot names resolve against the
 *  site's icon library. */
export const DROPDOWN_ITEMS: readonly DropdownItem[] = [
  { icon: 'mail', label: 'Email', group: 'Account' },
  { icon: 'bell', label: 'Notifications', group: 'Account' },
  { icon: 'shield', label: 'Privacy', group: 'Account' },
  { icon: 'settings', label: 'General', group: 'Appearance' },
  { icon: 'palette', label: 'Theme', group: 'Appearance' },
  { icon: 'monitor', label: 'Display', group: 'Appearance' },
];

export const DROPDOWN_GROUPS: readonly string[] = ['Account', 'Appearance'];

/** The row rendered disabled when `disabledRow` is on. */
export const DROPDOWN_DISABLED_LABEL = 'Privacy';
/** Initial single selection / multiple selection. */
export const DROPDOWN_DEFAULT_SELECTED = 'Email';
export const DROPDOWN_DEFAULT_PICKED: readonly string[] = ['Email', 'Notifications'];

/** The row that opens a submenu when `submenu` is on, and what it holds:
 *  one theme picked out of three, a radio choice of its own. */
export const DROPDOWN_SUBMENU_LABEL = 'Theme';
export const DROPDOWN_THEMES: readonly { icon: IconName; label: string }[] = [
  { icon: 'sun', label: 'Light' },
  { icon: 'moon', label: 'Dark' },
  { icon: 'monitor', label: 'System' },
];
export const DROPDOWN_DEFAULT_THEME = 'System';

/** A row the create row makes from the query: the plus icon marks it as
 *  user-made. */
export const DROPDOWN_CREATED_ICON: IconName = 'plus';
