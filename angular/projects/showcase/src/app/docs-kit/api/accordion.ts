// The API reference of /docs/accordion: its PropsTables and the API section
// of /docs/accordion.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const rootProps: PropDef[] = [
  { name: "type", type: '"single" | "multiple"', default: '"single"', description: "Whether one or multiple items can be expanded." },
  { name: "collapsible", type: "boolean", default: "true", description: "Accepted for API parity: single mode is always collapsible in the Angular port." },
  { name: "defaultValue", type: "string | string[]", description: "Initially expanded item value(s)." },
  { name: "value", type: "string | string[]", description: "Controlled expanded value(s). Two-way: `[(value)]`." },
  { name: "valueChange", type: "(value: string | string[]) => void", description: "Emitted when the expanded state changes." },
  { name: "highlight", type: '"trigger" | "item"', default: '"item"', description: "What an open item tints: item holds a block across the row and its panel, trigger scopes it to the row and shows it on hover. Same input on ff-accordion-item standalone." },
];

export const itemProps: PropDef[] = [
  { name: "value", type: "string", description: "Unique identifier for this item." },
  { name: "index", type: "number", description: "Position index for fluid hover. Required inside ff-accordion-group, omit for standalone." },
  { name: "disabled", type: "boolean", default: "false", description: "Whether this item is disabled." },
  { name: "highlight", type: '"trigger" | "item"', default: '"item"', description: "Standalone only: what the open item tints. Inside a group the group decides for all its rows." },
];

export const triggerProps: PropDef[] = [
  { name: "<ng-content />", type: "projected content", description: "Trigger label content." },
];

export const contentProps: PropDef[] = [
  { name: "<ng-content />", type: "projected content", description: "Collapsible content." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "Accordion / AccordionGroup", props: rootProps },
  { title: "AccordionItem", props: itemProps },
  { title: "AccordionTrigger", props: triggerProps },
  { title: "AccordionContent", props: contentProps },
];
