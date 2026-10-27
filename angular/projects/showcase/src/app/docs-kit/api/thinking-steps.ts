// The API reference of /docs/thinking-steps: its PropsTables and the API section
// of /docs/thinking-steps.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

// ─── Props Tables ───────────────────────────────────────────────────────────

export const rootProps: PropDef[] = [
  { name: "size", type: '"default" | "compact"', default: "from the size context", description: "Step on the size ladder (see /docs/sizes). Wins over `provideFluid({ size })` and the surrounding `[ffSizeProvider]`." },
  { name: "defaultOpen", type: "boolean", default: "true", description: "Whether the accordion starts expanded (uncontrolled)." },
  { name: "open", type: "boolean", description: "Controlled open state. Use with openChange." },
  { name: "openChange", type: "(open: boolean) => void", description: "Emitted when the open state changes." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the root container." },
];

export const headerProps: PropDef[] = [
  { name: "<ng-content />", type: "projected content", default: '"Thinking"', description: "Header label text." },
];

export const stepProps: PropDef[] = [
  { name: "icon", type: "IconName", default: '"dot"', description: "Icon name from the icon library." },
  { name: "showIcon", type: "boolean", default: "true", description: "Show the icon. When false, displays a small dot instead." },
  { name: "label", type: "string", description: "Step label text. Required." },
  { name: "description", type: "string", description: "Optional secondary text below the label." },
  { name: "status", type: '"complete" | "active" | "pending"', default: '"complete"', description: "Step state. Pending steps are hidden; active steps show shimmer text." },
  { name: "delay", type: "number", default: "0.08", description: "Content fade-in delay in seconds, after the step's height starts expanding." },
  { name: "isLast", type: "boolean", default: "false", description: "Hides the connector line below this step." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the step row." },
];

export const detailsProps: PropDef[] = [
  { name: "summary", type: "string", description: "Collapsed label text (e.g. \"Explored 6 files\"). Required." },
  { name: "details", type: "string[]", description: "Shorthand list of detail lines rendered automatically." },
  { name: "defaultOpen", type: "boolean", default: "false", description: "Whether the nested accordion starts expanded." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the details block." },
  { name: "<ng-content />", type: "projected content", description: "Custom content inside the expanded area." },
];

export const sourceProps: PropDef[] = [
  { name: "color", type: "BadgeColor", default: '"gray"', description: "Badge color from the Tailwind palette." },
  { name: "delay", type: "number", default: "0", description: "Entrance animation delay in seconds." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the source badge." },
  { name: "<ng-content />", type: "projected content", description: "Source label text." },
];

export const imageProps: PropDef[] = [
  { name: "src", type: "string", description: "Image URL. The rendered image includes a theme-aware 1px inset outline. Required." },
  { name: "alt", type: "string", default: '""', description: "Alt text for accessibility." },
  { name: "caption", type: "string", description: "Optional caption below the image." },
  { name: "delay", type: "number", default: "0", description: "Entrance animation delay in seconds." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the image frame." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "ThinkingSteps", props: rootProps },
  { title: "ThinkingStepsHeader", props: headerProps },
  { title: "ThinkingStep", props: stepProps },
  { title: "ThinkingStepDetails", props: detailsProps },
  { title: "ThinkingStepSource", props: sourceProps },
  { title: "ThinkingStepImage", props: imageProps },
];
