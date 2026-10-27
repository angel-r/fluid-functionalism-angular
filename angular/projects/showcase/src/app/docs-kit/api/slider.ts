// The API reference of /docs/slider: its PropsTables and the API section
// of /docs/slider.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

// ---------------------------------------------------------------------------
// Props tables
// ---------------------------------------------------------------------------

export const sliderProps: PropDef[] = [
  {
    name: "size",
    type: '"default" | "compact"',
    default: "from the size context",
    description:
      "Step on the size ladder (see /docs/sizes). Default renders the pip/scrubber design; compact renders the dense design.",
  },
  {
    name: "variant",
    type: '"pips" | "scrubber"',
    default: '"pips"',
    description:
      'Default-step layout. "pips" shows discrete dot indicators; "scrubber" drags anywhere in the row for a continuous value. Ignored when the compact design renders.',
  },
  {
    name: "value",
    type: "number | [number, number]",
    description:
      "Current value. Pass an array to enable range mode with two thumbs. Required; two-way: `[(value)]`.",
  },
  {
    name: "valueChange",
    type: "(value: SliderValue) => void",
    description: "Emitted when the value changes via drag, click, or keyboard.",
  },
  {
    name: "min",
    type: "number",
    default: "0",
    description: "Minimum value.",
  },
  {
    name: "max",
    type: "number",
    default: "100",
    description: "Maximum value.",
  },
  {
    name: "step",
    type: "number",
    default: "1",
    description: "Step increment. Thumb snaps to the nearest step during drag.",
  },
  {
    name: "steps",
    type: "number[]",
    description:
      "Discrete list of allowed values, e.g. [0.1, 0.5, 0.7, 1.1, 1.3]. The thumb snaps only to these values and arrow keys walk the list. min/max derive from the list's extremes and step is ignored.",
  },
  {
    name: "showSteps",
    type: "boolean",
    default: "false",
    description: "Render dot indicators at each step position on the track.",
  },
  {
    name: "showValue",
    type: "boolean",
    default: "true",
    description: "Whether to display the current value label.",
  },
  {
    name: "valuePosition",
    type: '"left" | "right" | "top" | "bottom" | "tooltip"',
    default: '"left"',
    description:
      'Position of the value label. "tooltip" shows above the thumb during interaction.',
  },
  {
    name: "formatValue",
    type: "(v: number) => string",
    default: "String",
    description: "Custom formatter for the value label and the thumbs' aria-valuetext.",
  },
  {
    name: "label",
    type: "string",
    description:
      "Accessible label for the slider, also shown as prefix in the value display. Range thumbs read it as minimum and maximum.",
  },
  {
    name: "disabled",
    type: "boolean",
    default: "false",
    description: "Disables all interaction.",
  },
  {
    name: "trackClassName",
    type: "string",
    description: "Additional classes for the track. Setting it opts into the compact engine.",
  },
  {
    name: "trackStyle",
    type: "SliderStyle",
    description: "Inline styles for the track, merged with the component's own.",
  },
  {
    name: "fillClassName",
    type: "string",
    description: "Additional classes for the filled portion of the track.",
  },
  {
    name: "fillStyle",
    type: "SliderStyle",
    description: "Inline styles for the filled portion of the track.",
  },
  {
    name: "hideFill",
    type: "boolean",
    description: "Hides the filled portion, leaving only the thumb on the track.",
  },
  {
    name: "thumbColor",
    type: "string",
    description: "Overrides the thumb's background color.",
  },
  {
    name: "thumbBorderColor",
    type: "string",
    description: "Overrides the thumb's border color.",
  },
  {
    name: "class",
    type: "string",
    description: "Additional classes for the slider's root element.",
  },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "Slider", props: sliderProps },
];
