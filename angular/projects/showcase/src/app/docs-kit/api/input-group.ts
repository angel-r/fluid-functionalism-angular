// The API reference of /docs/input-group: its PropsTables and the API section
// of /docs/input-group.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const groupProps: PropDef[] = [
  { name: "size", type: '"default" | "compact"', default: "from the size context", description: "Pins the group's fields to one step of the size ladder (see /docs/sizes). Default is a 36px field, compact 28px." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the group container." },
  { name: "<ng-content />", type: "projected content", description: "InputField children." },
];

export const fieldProps: PropDef[] = [
  { name: "label", type: "string", description: "Label text above the input. Required." },
  { name: "labelHidden", type: "boolean", default: "false", description: "Keep the label for assistive tech but don't render it, for inline fields (a toolbar search) where the placeholder carries the meaning." },
  { name: "index", type: "number", description: "Position index within the group. Required." },
  { name: "value", type: "string", description: "The input value. Two-way: `[(value)]`; React's onChange is `(valueChange)`." },
  { name: "valueChange", type: "(value: string) => void", description: "Emitted when the input value changes." },
  { name: "placeholder", type: "string", default: '""', description: "Placeholder text." },
  { name: "icon", type: "IconName | IconDefinition", description: "Leading icon inside the input." },
  { name: "error", type: "string", description: "Error message shown below the input; marks the field invalid." },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the input." },
  { name: "type", type: "string", default: '"text"', description: "The input's `type`, text by default." },
  { name: "name", type: "string", default: '""', description: "The input's `name`, for native forms." },
  { name: "autocomplete", type: "string", description: "The input's `autocomplete` hint." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the field wrapper." },
  { name: "touch", type: "() => void", description: "Emitted when the field loses focus, for signal forms' touched state." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "InputGroup", props: groupProps },
  { title: "InputField", props: fieldProps },
];
