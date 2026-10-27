// The API reference of /docs/checkbox-group: its PropsTables and the API section
// of /docs/checkbox-group.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const groupProps: PropDef[] = [
  { name: "checkedIndices", type: "ReadonlySet<number>", description: "Set of checked item indices. Used for merged background rendering. Two-way: `[(checkedIndices)]`." },
  { name: "<ng-content />", type: "projected content", description: "ff-checkbox-item children." },
];

export const itemProps: PropDef[] = [
  { name: "label", type: "string", description: "Text label for the checkbox (also its accessible name)." },
  { name: "index", type: "number", description: "Position index within the group." },
  { name: "checked", type: "boolean", description: "Whether this item is checked. Omitted, the group's checkedIndices decide." },
  { name: "toggle", type: "() => void", description: "Emitted when this item is toggled." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "CheckboxGroup", props: groupProps },
  { title: "CheckboxItem", props: itemProps },
];
