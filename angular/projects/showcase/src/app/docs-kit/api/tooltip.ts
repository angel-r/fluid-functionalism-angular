// The API reference of /docs/tooltip: its PropsTables and the API section
// of /docs/tooltip.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const tooltipProps: PropDef[] = [
  {
    name: "content",
    type: "TooltipContent",
    description: "The content displayed inside the tooltip: text, a number, or a TemplateRef for richer markup.",
  },
  {
    name: "<ng-content />",
    type: "projected content",
    description: "The trigger element. It must be hoverable and focusable.",
  },
  {
    name: "side",
    type: '"top" | "right" | "bottom" | "left"',
    default: '"top"',
    description: "Preferred side of the trigger to render the tooltip.",
  },
  {
    name: "sideOffset",
    type: "number",
    default: "8",
    description: "Distance in pixels between the tooltip and the trigger.",
  },
  {
    name: "delayDuration",
    type: "number",
    default: "200",
    description: "Milliseconds to wait before showing the tooltip on hover. Defaults to the ambient `[ffTooltipProvider]` delay when one wraps it.",
  },
  {
    name: "followCursor",
    type: '"x" | "y"',
    description: "Track the cursor along one axis while hovering the trigger; the other axis stays anchored by side. Used by the Sidebar rail.",
  },
  {
    name: "forceOpen",
    type: "boolean",
    description: "Pins the tooltip open (true) or closed (false); undefined leaves it on hover and focus.",
  },
  {
    name: "openChange",
    type: "(open: boolean) => void",
    description: "Emitted when the tooltip's internal open state changes, before forceOpen is applied.",
  },
  {
    name: "class",
    type: "string",
    description: "Additional classes applied to the tooltip content box.",
  },
  {
    name: "contentClass",
    type: "string",
    description: "Classes for the portalled positioner element. Pass a z-index utility here to lift the whole tooltip above other fixed layers (defaults to z-50). The docs inspector uses it to clear the preview header.",
  },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "Tooltip", props: tooltipProps },
];
