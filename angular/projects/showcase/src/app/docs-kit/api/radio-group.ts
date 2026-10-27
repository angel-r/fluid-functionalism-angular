// The API reference of /docs/radio-group: its PropsTables and the API section
// of /docs/radio-group.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const groupProps: PropDef[] = [
  { name: "value", type: "string", description: "The selected item's value. Two-way: `[(value)]`; a press on an item with a `value` writes it. A value that matches no item selects nothing." },
  { name: "valueChange", type: "(value: string) => void", description: "Emitted when the selection changes through `value`." },
  { name: "selectedIndex", type: "number", description: "Index of the currently selected item, when not using `value`." },
  { name: "size", type: '"default" | "compact"', default: "from the size context", description: "Pins the group's rows to one step of the size ladder (see /docs/sizes). Omits to follow `provideFluid({ size })` or the surrounding `[ffSizeProvider]`." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the group container." },
  { name: "touch", type: "() => void", description: "Emitted when focus leaves the group, for signal forms' touched state." },
  { name: "<ng-content />", type: "projected content", description: "RadioItem children." },
];

export const itemProps: PropDef[] = [
  { name: "label", type: "string", description: "Text label for the radio item, also its accessible name. Required." },
  { name: "index", type: "number", description: "Position index within the group. Required." },
  { name: "selected", type: "boolean", description: "Whether this item is selected (per-item mode)." },
  { name: "select", type: "() => void", description: "Emitted when this item is pressed, Space/Enter, or an arrow lands on it." },
  { name: "value", type: "string", description: "The value written to the group's `value` when this item is pressed. Drives selection equality when both the item and the group have one." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the row." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "RadioGroup", props: groupProps },
  { title: "RadioItem", props: itemProps },
];
