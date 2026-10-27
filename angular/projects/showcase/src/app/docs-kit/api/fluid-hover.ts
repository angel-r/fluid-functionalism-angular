// The API reference of /docs/fluid-hover: its PropsTables and the API section
// of /docs/fluid-hover.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const directiveOptions: PropDef[] = [
  { name: "ffFluidHoverAxis", type: '"y" | "x" | "xy"', default: '"y"', description: "Which way the list runs: y for lists, x for strips, xy for grids." },
  { name: "ffFluidHoverItemDisabled", type: "(el: HTMLElement) => boolean", description: "Skips an item: never lit, never clicked. Runs on every move, so keep it cheap." },
  { name: "ffFluidHoverGapClick", type: "boolean | { maxDistance?: number }", default: "true", description: "A click between items goes to the lit one. false turns it off. maxDistance limits it to clicks within that many px." },
  { name: "ffFluidHoverItem", type: "number", description: "Put it on each row with its index. Indices start at 0 and must not change while the list is on screen." },
];

export const controllerReturn: PropDef[] = [
  { name: "onMouseEnter / onMouseMove / onMouseLeave / onClick", type: "(event: MouseEvent) => void", description: "Bind them on the container. Mouse only. The directive binds these for you; with createFluidHover() they are yours to wire, and onClick is the gap click." },
  { name: "registerItem", type: "(index, element | null) => void", description: "Give it to each row, or use [ffFluidHoverItem], which registers and cleans up for you." },
  { name: "unregisterItem", type: "(index, element) => void", description: "Releases a slot only if that element still holds it, so a row moving off an index cleans up after the new row registered." },
  { name: "activeIndex", type: "Signal<number | null>", description: "The lit item, or null. Also set as data-fluid-hover-active on the item." },
  { name: "setActiveIndex", type: "(index | null) => void", description: "Light an item yourself, for keyboard focus. The controller never moves focus." },
  { name: "itemRects", type: "Signal<ItemRect[]>", description: "Each item's box inside the container. Survives a parent scale, not a rotation." },
  { name: "isMeasured", type: "Signal<boolean>", description: "True once every item has a box. Measured again on register and on resize." },
  { name: "remeasure", type: "() => void", description: "Measure again and hide the highlight until done. Call it when a popup opens." },
  { name: "measureItems", type: "() => void", description: "Re-read the boxes synchronously without touching isMeasured, for layout that moves rows frame by frame." },
  { name: "session", type: "Signal<number>", description: "Counts pointer entries. The highlight fades in fresh on each one." },
];

export const highlightProps: PropDef[] = [
  { name: "hover", type: "FluidHoverController", description: "The controller. Omitted, it reads the enclosing [ffFluidHover]." },
  { name: "hidden", type: "boolean", default: "false", description: "Show nothing, keep the state. A closed popup." },
  { name: "rect", type: "ItemRect | null", description: "For lists that resolve their own rect: the box to sit on, in the container's space. Wins over hover." },
  { name: "session", type: "number", default: "0", description: "With rect: re-keys the highlight so it fades in at from ?? rect instead of sliding over." },
  { name: "from", type: "ItemRect | null", description: "Where a fresh entry fades in from. Dropdowns pass the checked row when the pointer enters." },
  { name: "class", type: "string", description: "Radius and z-index. The container must be position: relative." },
  { name: "transition", type: "AnimationOptions | false", default: "spring.fast", description: "The travel. false snaps in place after a reflow." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "[ffFluidHover] options", props: directiveOptions },
  { title: "createFluidHover() return value", props: controllerReturn },
  { title: "ff-fluid-hover-highlight", props: highlightProps },
];
