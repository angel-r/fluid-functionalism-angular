// The API reference of /docs/reveal: its PropsTable and the API section
// of /docs/reveal.md both read these, so the two cannot drift.
//
// The presets are pure CSS here: `projects/fluid-functionalism/styles/theme.css`
// carries them as classes, with the spring tiers baked in as `linear()` on
// `--reveal-motion`. The values below mirror that block.
import type { ApiTable, PropDef } from './types';

/** "12px rise, 0.94 scale, 0.1s steps, from 12px to 120px of scroll." */
const landingValues = (p: { distance: number; scale: number; step: number; scrollStart: number; scroll: number }) =>
  `${p.distance}px rise, ${p.scale} scale, ${p.step}s steps on spring.slow, written as linear() in --reveal-motion, from ${p.scrollStart}px to ${p.scroll}px of scroll.`;

const presets = {
  "reveal-landing": { spring: "slow", distance: 12, scale: 0.94, step: 0.1, scrollStart: 12, scroll: 120 },
  "reveal-landing-subtle": { spring: "slow", distance: 8, scale: 0.98, step: 0.06, scrollStart: 8, scroll: 60 },
  "reveal-product": { spring: "moderate", step: 0.06 },
  "reveal-product-subtle": { spring: "moderate", step: 0.04 },
} as const;

const landing = presets["reveal-landing"];
const landingSubtle = presets["reveal-landing-subtle"];
const product = presets["reveal-product"];
const productSubtle = presets["reveal-product-subtle"];

export const revealPresets: PropDef[] = [
  {
    name: ".reveal-landing",
    type: "class",
    description: `A page read once. The hero plays on load, every later section rises on scroll, and each leaves the same way at the top: ${landingValues(landing)}`,
  },
  {
    name: ".reveal-landing-subtle",
    type: "class",
    description: landingValues(landingSubtle),
  },
  {
    name: ".reveal-product",
    type: "class",
    description: `The app. Every block fades in on load, ${product.step}s apart on spring.moderate. Nothing moves on scroll.`,
  },
  {
    name: ".reveal-product-subtle",
    type: "class",
    description: `${productSubtle.step}s steps.`,
  },
  {
    name: ".reveal-scroll",
    type: "class",
    description:
      "Inside a landing preset, makes a deeper element a scroll section of its own, like each card of a grid. The section holding it stays still. Nested in another, it follows half a range later: the card, then its content.",
  },
];

export const revealLoading: PropDef[] = [
  {
    name: ".reveal-swap",
    type: "class",
    description:
      "Stacks a skeleton and its real block. Add the block when the data lands and one crossfades into the other.",
  },
  {
    name: ".reveal-items",
    type: "class",
    description:
      "Children arrive one by one, 8 steps at most. Works inside a preset or beside it, like a sidebar.",
  },
];

/** The values row under each demo, from the same data as the CSS. */
export const PRESET_SPECS: Record<string, { label: string; value: string }[]> = Object.fromEntries(
  Object.entries(presets).map(([name, p]) => [
    name,
    [
      { label: "Spring", value: `spring.${p.spring}` },
      { label: "Rise", value: "distance" in p && p.distance ? `${p.distance}px` : "None" },
      { label: "Scale", value: "scale" in p && p.scale ? String(p.scale) : "None" },
      { label: "Step", value: `${p.step}s` },
      { label: "Scroll", value: "scroll" in p && p.scroll ? `${p.scrollStart}–${p.scroll}px` : "None" },
    ],
  ]),
);

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "Presets", props: revealPresets },
  { title: "Loading", props: revealLoading },
];
