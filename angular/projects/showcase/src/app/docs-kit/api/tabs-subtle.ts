// The API reference of /docs/tabs-subtle: its PropsTables and the API section
// of /docs/tabs-subtle.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const tabProps: PropDef[] = [
  { name: "selectedIndex", type: "number", description: "Index of the currently selected tab. Required; two-way with `(selectedIndexChange)`." },
  { name: "selectedIndexChange", type: "(index: number) => void", description: "Emitted when a tab is selected." },
  { name: "idPrefix", type: "string", description: "Prefix for ARIA IDs linking tabs to panels. Pass the same value to the panels." },
  { name: "activeLabel", type: "boolean", default: "false", description: "When true, only the selected tab shows its text label. Requires icons on tabs." },
  { name: "size", type: '"default" | "compact"', default: "from the size context", description: "Pins the tab row to one step of the size ladder (see /docs/sizes)." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the root container." },
  { name: "<ng-content />", type: "projected content", description: "TabsSubtleItem children." },
];

export const tabItemProps: PropDef[] = [
  { name: "index", type: "number", description: "Position index within the tab list. Required." },
  { name: "label", type: "string", description: "Text label for the tab. Required." },
  { name: "icon", type: "IconName | IconDefinition", description: "Icon displayed in the tab." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the tab button." },
];

export const tabPanelProps: PropDef[] = [
  { name: "index", type: "number", description: "Index of this panel. Required." },
  { name: "selectedIndex", type: "number", description: "Currently selected tab index. Required." },
  { name: "idPrefix", type: "string", description: "Must match the TabsSubtle idPrefix. Required." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the panel." },
  { name: "<ng-content />", type: "projected content", description: "Panel content, only rendered when selected." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "TabsSubtle", props: tabProps },
  { title: "TabsSubtleItem", props: tabItemProps },
  { title: "TabsSubtlePanel", props: tabPanelProps },
];
