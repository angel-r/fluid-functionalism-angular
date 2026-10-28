// The API reference of /docs/combobox: its PropsTables and the API section
// of /docs/combobox.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export const comboboxProps: PropDef[] = [
  { name: "items", type: "readonly (string | { value: string; label: string })[]", description: "The options. A string is its own value and label; an object carries value, label, and whatever your rows need." },
  { name: "multiple", type: "boolean", default: "false", description: "Any number of picks. Values become string[]; use ff-combobox-chips for the field." },
  { name: "value", type: "string | string[]", description: "Selected value. \"\" means none; an array when multiple. Two-way: `[(value)]`." },
  { name: "valueChange", type: "(value: string | string[]) => void", description: "Emits the pick, \"\" when cleared, or the array when multiple." },
  { name: "filter", type: "(item, query: string) => boolean", description: "Match an item against the query. Default: case-insensitive contains on the label." },
  { name: "onCreate", type: "(query: string) => item | void", description: "Adds a last row that creates the trimmed query whenever no label matches it exactly. Add the item to items and return it to select it." },
  { name: "createLabel", type: "(query: string) => string", default: 'Create “query”', description: "The create row's label. A string, not a node." },
  { name: "hideSelected", type: "boolean", default: "false", description: "Multiple only. Picked items leave the list, so it reads as what is left to add. Deselect from the chips." },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the field and the popup." },
  { name: "name", type: "string", description: "Form field name; a hidden input carries the value." },
  { name: "required", type: "boolean", description: "Marks the hidden form input required." },
  { name: "size", type: '"default" | "compact"', description: "Pins field and popup to one size step. Omitted, both follow the SizeProvider." },
];

export const inputProps: PropDef[] = [
  { name: "variant", type: '"bordered" | "borderless"', default: '"bordered"', description: "Framed at rest, or invisible until hovered or focused." },
  { name: "icon", type: "IconName | IconDefinition", description: "Leading icon inside the field." },
  { name: "placeholder", type: "string", default: '"Search…"', description: "Shown while nothing is typed or selected." },
  { name: "error", type: "string", description: "Error message under the field; tints the ring and sets aria-invalid." },
  { name: "clearable", type: "boolean", default: "false", description: "A ✕ that clears the pick and the query. Its slot is always reserved, so the width never changes." },
  { name: "size", type: '"default" | "compact"', description: "Size for the field alone. Prefer size on ff-combobox so the popup matches." },
];

export const chipsProps: PropDef[] = [
  { name: "variant", type: '"bordered" | "borderless"', default: '"bordered"', description: "Same field ladder as ff-combobox-input." },
  { name: "icon", type: "IconName | IconDefinition", description: "Leading icon inside the field." },
  { name: "placeholder", type: "string", default: '"Search…"', description: "Shown while nothing is selected or typed." },
  { name: "error", type: "string", description: "Error message under the field; tints the ring and sets aria-invalid." },
  { name: "clearable", type: "boolean", default: "false", description: "A ✕ that clears every chip and the query. Its slot is always reserved." },
  { name: "size", type: '"default" | "compact"', description: "Size for the field alone. Chips and input step down together." },
];

export const contentProps: PropDef[] = [
  { name: "<ng-content />", type: "projected content", description: "ff-combobox-empty and ff-combobox-list." },
  { name: "side", type: '"top" | "bottom" | "left" | "right"', default: '"bottom"', description: "Side of the field the popup prefers." },
  { name: "align", type: '"start" | "center" | "end"', default: '"start"', description: "Alignment against the field." },
  { name: "sideOffset", type: "number", default: "6", description: "Gap to the field, in px." },
];

export const listProps: PropDef[] = [
  { name: "<ng-content />", type: "projected content", description: "One ff-combobox-item per row, when you build them yourself. Without rows projected, use the row template below." },
  { name: "ng-template[ffComboboxRow]", type: "TemplateRef<ComboboxRowContext>", description: "Return a custom row per match: the template receives `$implicit` (the item) and `index`. The default renders one ff-combobox-item from each match." },
];

export const emptyProps: PropDef[] = [
  { name: "<ng-content />", type: "projected content", description: "Shown when nothing matches the query." },
  { name: "allSelected", type: "string", description: "Shown instead when hideSelected has emptied the list with nothing typed." },
];

export const itemProps: PropDef[] = [
  { name: "value", type: "string", description: "The item's value: the string itself, or the object's value." },
  { name: "icon", type: "IconName | IconDefinition", description: "Leading icon in the row." },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the row." },
  { name: "<ng-content />", type: "projected content", description: "The row label." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "Combobox", props: comboboxProps },
  { title: "ComboboxInput", props: inputProps },
  { title: "ComboboxChips", props: chipsProps },
  { title: "ComboboxContent", props: contentProps },
  { title: "ComboboxList", props: listProps },
  { title: "ComboboxItem", props: itemProps },
  { title: "ComboboxEmpty", props: emptyProps },
];
