// The API reference of /docs/scrollbars: its PropsTables and the API section
// of /docs/scrollbars.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export const scrollAreaProps: PropDef[] = [
  {
    name: "orientation",
    type: '"vertical" | "horizontal" | "both"',
    default: '"vertical"',
    description: "Which axes get scrollbars.",
  },
  {
    name: "viewportClass",
    type: "string",
    description:
      "Classes for the inner scrolling viewport (React: `viewportClassName`), where the scroll-fade utility goes.",
  },
  {
    name: "thumbSizing",
    type: '"inset" | "track"',
    default: '"inset"',
    description:
      "How the thumb is measured. Inset fits it inside its own margins; track measures the whole track and floors at 18px, so the margins only shift it. Every component list uses track.",
  },
  {
    name: "class",
    type: "string",
    description:
      "Classes for the outer container: set the height/width constraint here.",
  },
  {
    name: "<ng-content />",
    type: "projected content",
    description: "The scrolling content, laid out inside the viewport.",
  },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "ScrollArea", props: scrollAreaProps },
];
