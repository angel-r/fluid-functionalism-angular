// The API reference of /docs/dropdown: its PropsTables and the API section
// of /docs/dropdown.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const dropdownProps: PropDef[] = [
  { name: "checkedIndex", type: "number", description: "The checked row." },
  { name: "checkedIndices", type: "readonly number[]", description: "Checked rows. Rows become checkboxes and touching picks share one background." },
  { name: "<ng-content />", type: "projected content", description: "ff-menu-item children." },
  { name: "aria-label", type: "string", description: "Name for the inline panel. It renders as a group; menu semantics belong to ff-dropdown-content." },
  { name: "size", type: '"default" | "compact"', description: "Pins the panel's rows to one size step. Omitted, they follow the SizeProvider." },
];

export const dropdownMenuProps: PropDef[] = [
  { name: "<ng-content />", type: "projected content", description: "ff-dropdown-trigger content and ff-dropdown-content." },
  { name: "open", type: "boolean", description: "Controlled open state. Two-way: `[(open)]`." },
  { name: "defaultOpen", type: "boolean", default: "false", description: "Initial open state." },
  { name: "openChange", type: "(open: boolean) => void", description: "Emitted when the menu opens or closes." },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the menu." },
  { name: "size", type: '"default" | "compact"', description: "Pins trigger-side content and the popup rows to one size step." },
];

export const dropdownTriggerProps: PropDef[] = [
  { name: "ffDropdownTrigger", type: "attribute directive", description: "Put it on the element that becomes the trigger, e.g. `<button ffButton ffDropdownTrigger>`. There is no render or asChild: the host element is the trigger." },
  { name: "<ng-content />", type: "projected content", description: "Trigger content, rendered inside the host element." },
];

export const dropdownContentProps: PropDef[] = [
  { name: "<ng-content />", type: "projected content", description: "ff-menu-item, ff-dropdown-label, ff-dropdown-separator." },
  { name: "checkedIndex", type: "number", description: "The checked row: drives the selected background and the radio value." },
  { name: "checkedIndices", type: "readonly number[]", description: "Checked rows. Rows become checkboxes that keep the menu open; touching picks share one background." },
  { name: "side", type: "\"top\" | \"bottom\" | \"left\" | \"right\"", default: "\"bottom\"", description: "Side of the trigger the popup prefers." },
  { name: "align", type: "\"start\" | \"center\" | \"end\"", default: "\"start\"", description: "Alignment against the trigger." },
  { name: "sideOffset", type: "number", default: "6", description: "Gap to the trigger, in px." },
  { name: "alignOffset", type: "number", default: "0", description: "Shift along the trigger edge, in px." },
];

export const subProps: PropDef[] = [
  { name: "<ng-content />", type: "projected content", description: "An ff-dropdown-sub-trigger and its ff-dropdown-sub-content." },
  { name: "open", type: "boolean", description: "Controlled open state. Two-way: `[(open)]`." },
  { name: "defaultOpen", type: "boolean", default: "false", description: "Initial open state." },
  { name: "openChange", type: "(open: boolean) => void", description: "Emitted when the submenu opens or closes." },
];

export const subTriggerProps: PropDef[] = [
  { name: "index", type: "number", description: "Position among the parent menu's rows." },
  { name: "label", type: "string", description: "Row text." },
  { name: "icon", type: "IconName | IconDefinition", description: "Leading icon. A chevron always trails the row." },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the row and its submenu." },
];

export const subContentProps: PropDef[] = [
  { name: "<ng-content />", type: "projected content", description: "ff-menu-item, ff-dropdown-label, ff-dropdown-separator, or another ff-dropdown-sub. Rows index from 0 again." },
  { name: "checkedIndex", type: "number", description: "The checked row, as in ff-dropdown-content." },
  { name: "checkedIndices", type: "readonly number[]", description: "Checked rows, as in ff-dropdown-content." },
  { name: "sideOffset", type: "number", default: "6", description: "Distance from the trigger row, in px. The default leaves a 2px gap past the menu's padding." },
  { name: "alignOffset", type: "number", default: "-4", description: "Shift along the trigger row. The default lines the first row up with it." },
];

export const searchProps: PropDef[] = [
  { name: "value", type: "string", description: "The query. Filter the rows you render against it; indices restart at 0. Two-way: `[(value)]`." },
  { name: "valueChange", type: "(value: string) => void", description: "Emits on every keystroke, and with \"\" on close (see clearOnClose)." },
  { name: "placeholder", type: "string", default: "\"Search…\"", description: "Placeholder text." },
  { name: "clearOnClose", type: "boolean", default: "true", description: "Reset the query on close so the menu reopens unfiltered." },
  { name: "autoFocus", type: "boolean", default: "true", description: "Focus the field on open. Typing on a row jumps back into it either way." },
];

export const emptyProps: PropDef[] = [
  { name: "<ng-content />", type: "projected content", description: "Shown in place of rows. A polite live region." },
];

export const labelProps: PropDef[] = [
  {
    name: "<ng-content />",
    type: "projected content",
    description: "Label text.",
  },
];

export const separatorProps: PropDef[] = [
  {
    name: "class",
    type: "string",
    description: "Extra classes.",
  },
];

export const menuItemProps: PropDef[] = [
  { name: "icon", type: "IconName | IconDefinition", description: "Leading icon." },
  { name: "label", type: "string", description: "Row text." },
  { name: "index", type: "number", description: "Position in the list." },
  { name: "checked", type: "boolean", default: "false", description: "Set it, even to false, for a radio row, or a checkbox row under checkedIndices. Leave it undefined for a plain action." },
  { name: "select", type: "() => void", description: "Emitted on select." },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the row." },
  { name: "closeOnClick", type: "boolean", default: "true", description: "Popup only: close on select. Defaults to false under checkedIndices." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "Dropdown", props: dropdownProps },
  { title: "MenuItem", props: menuItemProps },
  { title: "DropdownMenu", props: dropdownMenuProps },
  { title: "DropdownTrigger", props: dropdownTriggerProps },
  { title: "DropdownContent", props: dropdownContentProps },
  { title: "DropdownSub", props: subProps },
  { title: "DropdownSubTrigger", props: subTriggerProps },
  { title: "DropdownSubContent", props: subContentProps },
  { title: "DropdownSearch", props: searchProps },
  { title: "DropdownEmpty", props: emptyProps },
  { title: "DropdownLabel", props: labelProps },
  { title: "DropdownSeparator", props: separatorProps },
];
