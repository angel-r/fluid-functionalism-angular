// ---------------------------------------------------------------------------
// Playground state and the preset codec registration of /docs/command-menu,
// ported from lib/preset/command-menu-options.ts (D5). The demo content lives
// in site/command-menu-data.ts, shared with the shell's own command menu.
//
// Codec compat rules (same as shadcn's preset codec):
//   1. Never reorder existing value arrays — only append.
//   2. Every field's DEFAULT sits at index 0.
//   3. Only append new fields at the END of COMMAND_MENU_PRESET_FIELDS.
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

/** The combos the playground offers for the dialog, ⌘K first: the
 *  component's own default. */
export type CommandMenuTrigger = 'mod+k' | 'mod+j' | 'mod+p' | 'mod+/';

export const COMMAND_MENU_TRIGGERS: readonly CommandMenuTrigger[] = [
  'mod+k',
  'mod+j',
  'mod+p',
  'mod+/',
];

/** The order versions a to c encoded the combo in (⌘J led while the
 *  playground kept away from the site's ⌘K). Frozen for their codes. */
const TRIGGERS_J_FIRST: readonly CommandMenuTrigger[] = ['mod+j', 'mod+k', 'mod+p', 'mod+/'];

export interface CommandMenuPlayState {
  /** The combo that toggles the dialog. */
  shortcut: CommandMenuTrigger;
  /** Rows keep their descriptions. */
  descriptions: boolean;
  /** Rows keep their shortcut caps. */
  shortcuts: boolean;
  /** Suggested rows listed first while nothing is typed. */
  suggestions: boolean;
  /** Subtle tabs under the field. */
  tabs: boolean;
  /** Borderless filter bar under the field (inside the tab row when both). */
  filters: boolean;
  /** Hint strip under the list: what the keys do. */
  footer: boolean;
}

export const DEFAULT_COMMAND_MENU_STATE: CommandMenuPlayState = {
  shortcut: 'mod+k',
  descriptions: true,
  shortcuts: true,
  suggestions: true,
  tabs: true,
  filters: false,
  footer: true,
};

// Value arrays are ordered DEFAULT-FIRST. The three site-global fields stay
// LAST, mirroring the reference's sidebar layout.
const GLOBAL_FIELDS: readonly PresetField[] = [
  { key: 'flavor', values: ['radix', 'base'], bits: 3 },
  { key: 'shape', values: ['rounded', 'pill'], bits: 2 },
  { key: 'size', values: ['default', 'compact'], bits: 2 },
];

/** Version "a": the first table. Kept so its codes still decode (the
 *  footer takes its default). */
const COMMAND_MENU_PRESET_FIELDS_A: readonly PresetField[] = [
  { key: 'shortcut', values: [...TRIGGERS_J_FIRST], bits: 3 },
  { key: 'descriptions', values: [true, false], bits: 1 },
  { key: 'shortcuts', values: [true, false], bits: 1 },
  { key: 'suggestions', values: [true, false], bits: 1 },
  { key: 'tabs', values: [false, true], bits: 1 },
  { key: 'filters', values: [false, true], bits: 1 },
  ...GLOBAL_FIELDS,
];

/** Version "b": the footer hint strip, ahead of the globals so the tail
 *  keeps the sidebar's layout. Kept for its published codes. */
const COMMAND_MENU_PRESET_FIELDS_B: readonly PresetField[] = [
  { key: 'shortcut', values: [...TRIGGERS_J_FIRST], bits: 3 },
  { key: 'descriptions', values: [true, false], bits: 1 },
  { key: 'shortcuts', values: [true, false], bits: 1 },
  { key: 'suggestions', values: [true, false], bits: 1 },
  { key: 'tabs', values: [false, true], bits: 1 },
  { key: 'filters', values: [false, true], bits: 1 },
  { key: 'footer', values: [true, false], bits: 1 },
  ...GLOBAL_FIELDS,
];

/** Version "c": tabs on by default (the design the Showcase and /demo
 *  show), so the `tabs` values flipped to keep the default at index 0. */
const COMMAND_MENU_PRESET_FIELDS_C: readonly PresetField[] = [
  { key: 'shortcut', values: [...TRIGGERS_J_FIRST], bits: 3 },
  { key: 'descriptions', values: [true, false], bits: 1 },
  { key: 'shortcuts', values: [true, false], bits: 1 },
  { key: 'suggestions', values: [true, false], bits: 1 },
  { key: 'tabs', values: [true, false], bits: 1 },
  { key: 'filters', values: [false, true], bits: 1 },
  { key: 'footer', values: [true, false], bits: 1 },
  ...GLOBAL_FIELDS,
];

/** Version "d": ⌘K is the default combo, the component's own, so the
 *  trigger values lead with it. */
export const COMMAND_MENU_PRESET_FIELDS: readonly PresetField[] = [
  { key: 'shortcut', values: [...COMMAND_MENU_TRIGGERS], bits: 3 },
  { key: 'descriptions', values: [true, false], bits: 1 },
  { key: 'shortcuts', values: [true, false], bits: 1 },
  { key: 'suggestions', values: [true, false], bits: 1 },
  { key: 'tabs', values: [true, false], bits: 1 },
  { key: 'filters', values: [false, true], bits: 1 },
  { key: 'footer', values: [true, false], bits: 1 },
  ...GLOBAL_FIELDS,
];

export const COMMAND_MENU_PRESET_DEF: PresetComponentDef = {
  tag: 'k',
  label: 'Command menu',
  docsPath: '/docs/command-menu',
  versions: {
    a: COMMAND_MENU_PRESET_FIELDS_A,
    b: COMMAND_MENU_PRESET_FIELDS_B,
    c: COMMAND_MENU_PRESET_FIELDS_C,
    d: COMMAND_MENU_PRESET_FIELDS,
  },
  currentVersion: 'd',
  defaults: { ...DEFAULT_COMMAND_MENU_STATE, flavor: 'radix', shape: 'rounded', size: 'default' },
  installable: true,
};
registerPresetComponent(COMMAND_MENU_PRESET_DEF);

export function encodeCommandMenuPreset(config: Partial<CommandMenuPlayState & PresetGlobals>): string {
  return encodePreset(COMMAND_MENU_PRESET_DEF, { flavor: 'radix', ...config });
}

export type CommandMenuDecodeResult =
  | { ok: true; preset: CommandMenuPlayState; version: string }
  | { ok: false; error: string };

export function decodeCommandMenuPreset(code: string): CommandMenuDecodeResult {
  const res = decodePreset(code);
  if (!res.ok) return res;
  if (res.def.tag !== 'k') {
    return { ok: false, error: `Not a command menu preset (tag "${res.def.tag}").` };
  }
  return { ok: true, preset: res.preset as unknown as CommandMenuPlayState, version: res.version };
}

export const COMMAND_MENU_DEFAULT_CODE = encodeCommandMenuPreset({});
