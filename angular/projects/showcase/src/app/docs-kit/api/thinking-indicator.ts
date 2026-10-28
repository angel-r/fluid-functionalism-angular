// The API reference of /docs/thinking-indicator: its PropsTables and the API section
// of /docs/thinking-indicator.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const indicatorProps: PropDef[] = [
  { name: "size", type: '"default" | "compact"', default: "from the size context", description: "Step on the size ladder (see /docs/sizes). Wins over `provideFluid({ size })` and the surrounding `[ffSizeProvider]`." },
  { name: "showIcon", type: "boolean", default: "true", description: "Show the morphing circle⇄infinity glyph before the label. Set to false for a text-only indicator." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the status line." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "ThinkingIndicator", props: indicatorProps },
];
