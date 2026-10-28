// The API reference of /docs/select: its PropsTables and the API section
// of /docs/select.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

// ---------------------------------------------------------------------------
// Props definitions
// ---------------------------------------------------------------------------

export const selectProps: PropDef[] = [
  {
    name: "value",
    type: "string",
    description: "Controlled selected value. Bind with `[(value)]`, or `[value]` + `(valueChange)`.",
  },
  {
    name: "defaultValue",
    type: "string",
    description: "Uncontrolled initial value.",
  },
  {
    name: "valueChange",
    type: "(value: string) => void",
    description: "Emitted when the selected value changes.",
  },
  {
    name: "disabled",
    type: "boolean",
    default: "false",
    description: "Disables the entire select.",
  },
  {
    name: "name",
    type: "string",
    description: "Name for form submission, rendered as a hidden input.",
  },
  {
    name: "required",
    type: "boolean",
    default: "false",
    description: "Marks the select as required in forms.",
  },
  {
    name: "size",
    type: '"default" | "compact"',
    default: "from the size context",
    description: "Pins the trigger and the popup to one step of the size ladder (see /docs/sizes).",
  },
];

export const triggerProps: PropDef[] = [
  {
    name: "variant",
    type: '"bordered" | "borderless"',
    default: '"bordered"',
    description: "Visual style of the trigger.",
  },
  {
    name: "icon",
    type: "IconName | IconDefinition",
    description: "Optional icon displayed before the value.",
  },
  {
    name: "placeholder",
    type: "string",
    default: '"Select…"',
    description: "Text shown when no value is selected.",
  },
  {
    name: "error",
    type: "string",
    description: "Error message shown below the trigger.",
  },
  {
    name: "size",
    type: '"default" | "compact"',
    default: "from the size context",
    description: "Size override for the trigger alone. Prefer `size` on `<ff-select>` so the popup matches.",
  },
  {
    name: "aria-label",
    type: "string",
    description: "Accessible name for the trigger button, forwarded to it.",
  },
  {
    name: "class",
    type: "string",
    description: "Classes for the trigger button.",
  },
];

export const itemProps: PropDef[] = [
  {
    name: "index",
    type: "number",
    description: "Position index within the content for fluid hover. Required.",
  },
  {
    name: "value",
    type: "string",
    description: "Unique value for this option. Required.",
  },
  {
    name: "icon",
    type: "IconName | IconDefinition",
    description: "Optional icon displayed before the label.",
  },
  {
    name: "disabled",
    type: "boolean",
    default: "false",
    description: "Disables this individual item.",
  },
  {
    name: "class",
    type: "string",
    description: "Additional classes for the option row.",
  },
  {
    name: "<ng-content />",
    type: "projected content",
    description: "The option label, which also serves as the trigger's text and the typeahead term.",
  },
];

export const contentProps: PropDef[] = [
  {
    name: "class",
    type: "string",
    description: "Additional classes for the menu container.",
  },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "Select", props: selectProps },
  { title: "SelectTrigger", props: triggerProps },
  { title: "SelectContent", props: contentProps },
  { title: "SelectItem", props: itemProps },
];
