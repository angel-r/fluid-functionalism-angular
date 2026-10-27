// The API reference of /docs/tabs: its PropsTables and the API section
// of /docs/tabs.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

/* ────────── Props data ────────── */

export const tabsProps: PropDef[] = [
  { name: "value", type: "string", description: "Controlled active tab value. Takes precedence over selectedIndex. Two-way: `[(value)]`; React's onValueChange is `(valueChange)`." },
  { name: "valueChange", type: "(value: string) => void", description: "Emitted when the active tab changes." },
  { name: "selectedIndex", type: "number", description: "Index-based controlled alternative. Two-way: `[(selectedIndex)]`; React's onSelect is `(selectedIndexChange)`." },
  { name: "selectedIndexChange", type: "(index: number) => void", description: "Emitted with the new index when the active tab changes." },
  { name: "defaultValue", type: "string", description: "Default active tab for uncontrolled usage." },
  { name: "size", type: '"default" | "compact"', default: "from the size context", description: "Pins the segmented control to one step of the size ladder (see /docs/sizes)." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the root container." },
  { name: "<ng-content />", type: "projected content", description: "TabsList and TabPanel children." },
];

export const tabsListProps: PropDef[] = [
  { name: "class", type: "string", default: '""', description: "Additional classes for the container." },
  { name: "<ng-content />", type: "projected content", description: "TabItem children." },
];

export const tabItemProps: PropDef[] = [
  { name: "value", type: "string", description: "Unique value identifying this tab, from the host directive `NgTab`." },
  { name: "icon", type: "IconName | IconDefinition", description: "Optional leading icon." },
  { name: "label", type: "string", description: "Text label for the tab. Required." },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the tab, so it cannot be selected or focused." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the tab button." },
];

export const tabPanelProps: PropDef[] = [
  { name: "value", type: "string", description: "Must match a TabItem value. Required." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the panel." },
  { name: "<ng-content />", type: "projected content", description: "Panel content, rendered when the matching tab is active." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "Tabs", props: tabsProps },
  { title: "TabsList", props: tabsListProps },
  { title: "TabItem", props: tabItemProps },
  { title: "TabPanel", props: tabPanelProps },
];
