// The API reference of /docs/virtual-scroll: its PropsTables and the API
// section of /docs/virtual-scroll.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const virtualScrollProps: PropDef[] = [
  { name: "buffer", type: "number", default: "4", description: "Items rendered beyond each edge of the viewport, on every axis, so a fast scroll does not flash empty space." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the scroll container. Give it a bounded size (`h-96`): a viewport that grows with its content never scrolls." },
  { name: "scrollTop / scrollLeft", type: "Signal<number>", description: "Read-only scroll offsets in px." },
  { name: "viewportHeight / viewportWidth", type: "Signal<number>", description: "Read-only visible size in px, kept current by a ResizeObserver." },
  { name: "<ng-content />", type: "projected content", description: "Any layout holding one or more `*ffVirtualFor`: a list, an `ff-table`, or rows of cells for a grid." },
];

export const virtualForProps: PropDef[] = [
  { name: "of", type: "T[] | Signal<T[]>", description: "The data. Pass a signal itself (`of rows`, not `of rows()`) so the template that declares the rows does not read it." },
  { name: "axis", type: '"y" | "x"', default: '"y"', description: "`y` renders rows, `x` renders columns. Nest an `x` inside a `y` for a two-axis grid." },
  { name: "itemSize", type: "number", default: "measured", description: "The size of every item along the axis, in px. Fixed: every row (or column) has the same size. Omitted, it is the distance measured between the first two rendered items, so borders and gaps count; set it for columns and whenever you know it." },
  { name: "let i = index", type: "number", description: "The item's index in the whole data, not in the rendered window." },
  { name: "let n = count", type: "number", description: "The length of the whole data." },
  { name: "renderedRange", type: "Signal<{ start: number; end: number }>", description: "The rendered slice, buffer included (`end` exclusive). Read it through `viewChild(VirtualFor)`." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "VirtualScroll", props: virtualScrollProps },
  { title: "VirtualFor", props: virtualForProps },
];
