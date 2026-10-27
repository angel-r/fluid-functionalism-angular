// ---------------------------------------------------------------------------
// Playground state, the preset codec registration, and the demo content of
// /docs/combobox, ported from lib/preset/combobox-options.ts (D5).
//
// Codec compat rules (same as shadcn's preset codec):
//   1. Never reorder existing value arrays — only append.
//   2. Every field's DEFAULT sits at index 0.
//   3. Only append new fields at the END of COMBOBOX_PRESET_FIELDS.
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

export type ComboboxFieldVariant = 'bordered' | 'borderless';

export interface ComboboxPlayState {
  /** Any number of picks, shown as chips. */
  multiple: boolean;
  variant: ComboboxFieldVariant;
  /** Leading search icon in the field. */
  icon: boolean;
  /** The ✕ that clears the selection (its slot is always reserved). */
  clearable: boolean;
  /** Error message under the field. */
  error: boolean;
  disabled: boolean;
  /** A last row that creates what was typed. */
  creatable: boolean;
  /** Multiple only: picked items leave the list. */
  hideSelected: boolean;
}

export interface ComboboxItem {
  value: string;
  label: string;
}

export const DEFAULT_COMBOBOX_STATE: ComboboxPlayState = {
  multiple: true,
  variant: 'bordered',
  icon: false,
  clearable: false,
  error: false,
  disabled: false,
  creatable: false,
  hideSelected: false,
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
const COMBOBOX_PRESET_FIELDS_A: readonly PresetField[] = [
  { key: 'multiple', values: [true, false], bits: 1 },
  { key: 'variant', values: ['bordered', 'borderless'], bits: 2 },
  { key: 'icon', values: [false, true], bits: 1 },
  { key: 'clearable', values: [false, true], bits: 1 },
  { key: 'error', values: [false, true], bits: 1 },
  { key: 'disabled', values: [false, true], bits: 1 },
  ...GLOBAL_FIELDS,
];

/** Version "b" (2026-09-08): creatable + hideSelected, ahead of the globals
 *  so the tail keeps the sidebar's layout. A layout change, hence the bump. */
export const COMBOBOX_PRESET_FIELDS: readonly PresetField[] = [
  { key: 'multiple', values: [true, false], bits: 1 },
  { key: 'variant', values: ['bordered', 'borderless'], bits: 2 },
  { key: 'icon', values: [false, true], bits: 1 },
  { key: 'clearable', values: [false, true], bits: 1 },
  { key: 'error', values: [false, true], bits: 1 },
  { key: 'disabled', values: [false, true], bits: 1 },
  { key: 'creatable', values: [false, true], bits: 1 },
  { key: 'hideSelected', values: [false, true], bits: 1 },
  ...GLOBAL_FIELDS,
];

export const COMBOBOX_PRESET_DEF: PresetComponentDef = {
  tag: 'b',
  label: 'Combobox',
  docsPath: '/docs/combobox',
  versions: { a: COMBOBOX_PRESET_FIELDS_A, b: COMBOBOX_PRESET_FIELDS },
  currentVersion: 'b',
  defaults: { ...DEFAULT_COMBOBOX_STATE, flavor: 'radix', shape: 'rounded', size: 'default' },
  installable: true,
};
registerPresetComponent(COMBOBOX_PRESET_DEF);

export function encodeComboboxPreset(config: Partial<ComboboxPlayState & PresetGlobals>): string {
  return encodePreset(COMBOBOX_PRESET_DEF, { flavor: 'radix', ...config });
}

export type ComboboxDecodeResult =
  | { ok: true; preset: ComboboxPlayState; version: string }
  | { ok: false; error: string };

export function decodeComboboxPreset(code: string): ComboboxDecodeResult {
  const res = decodePreset(code);
  if (!res.ok) return res;
  if (res.def.tag !== 'b') {
    return { ok: false, error: `Not a combobox preset (tag "${res.def.tag}").` };
  }
  return { ok: true, preset: res.preset as unknown as ComboboxPlayState, version: res.version };
}

export const COMBOBOX_DEFAULT_CODE = encodeComboboxPreset({});

/** The playground's derived facts, shared by the preview and the prompt:
 *  hiding picked rows needs chips to deselect from, so it only applies in
 *  multiple mode. */
export function deriveCombobox(state: ComboboxPlayState): { hideSelected: boolean } {
  return { hideSelected: state.multiple && state.hideSelected };
}

/** How a created row becomes an item: the typed label, slugged as its value. */
export function comboboxItemFromQuery(query: string): ComboboxItem {
  return { value: query.toLowerCase().replace(/\s+/g, '-'), label: query };
}

// ── Demo content, shared by the preview and the prompt ──────────────────────

/** The library's own components: long enough for the list to scroll. */
export const COMBOBOX_COMPONENTS: readonly ComboboxItem[] = [
  { value: 'accordion', label: 'Accordion' },
  { value: 'badge', label: 'Badge' },
  { value: 'button', label: 'Button' },
  { value: 'card', label: 'Card' },
  { value: 'checkbox-group', label: 'CheckboxGroup' },
  { value: 'color-picker', label: 'ColorPicker' },
  { value: 'combobox', label: 'Combobox' },
  { value: 'dialog', label: 'Dialog' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'input-group', label: 'InputGroup' },
  { value: 'radio-group', label: 'RadioGroup' },
  { value: 'select', label: 'Select' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'slider', label: 'Slider' },
  { value: 'switch', label: 'Switch' },
  { value: 'table', label: 'Table' },
  { value: 'tabs', label: 'Tabs' },
];

/** The two chips a multiple combobox starts with. */
export const COMBOBOX_DEFAULT_VALUES: readonly string[] = ['button', 'combobox'];

export const COMBOBOX_COPY = {
  placeholder: 'Pick a component…',
  placeholderMultiple: 'Add components…',
  empty: 'No component found.',
  allSelected: 'Every component is added.',
  error: 'Pick one to continue.',
} as const;
