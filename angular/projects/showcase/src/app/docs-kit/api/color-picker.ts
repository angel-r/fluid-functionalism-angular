// The API reference of /docs/color-picker: its PropsTables and the API section
// of /docs/color-picker.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const colorPickerProps: PropDef[] = [
  { name: "value", type: "string", description: "The color value (any of the supported formats). Two-way: `[(value)]`." },
  { name: "defaultValue", type: "string", default: '"#6B97FF"', description: "Initial color when value is not bound." },
  { name: "colorChange", type: "{ value: string; parsed: ParsedColor }", description: "Fired on every change. Carries the formatted string plus a parsed color object with all formats." },
  { name: "format", type: '"hex" | "rgb" | "hsl" | "oklch"', description: "The selected format. Two-way: `[(format)]`." },
  { name: "defaultFormat", type: '"hex" | "rgb" | "hsl" | "oklch"', default: '"hex"', description: "Initial format when format is not bound." },
  { name: "formatChange", type: "(format: ColorFormat) => void", description: "Fired when the user switches format." },
  { name: "swatches", type: "readonly string[]", description: "Optional preset swatches (any CSS color, named colors included). When omitted, the strip is hidden." },
  { name: "hideEyedropper", type: "boolean", default: "false", description: "Force-hide the eyedropper button (it is automatically hidden in unsupported browsers)." },
];

export const popoverProps: PropDef[] = [
  { name: "triggerLabel", type: "string", description: "Optional label rendered alongside the color tile." },
  { name: "triggerLabelPosition", type: '"left" | "right"', default: '"left"', description: "Position of the label relative to the color tile." },
  { name: "triggerShowValue", type: "boolean", default: "true", description: "Show the hex value (without alpha) next to the tile." },
  { name: "triggerShowRemove", type: "boolean", default: "false", description: "Render an X button on the trigger." },
  { name: "triggerRemove", type: "() => void", description: "Fired when the X button is clicked." },
  { name: "triggerClass", type: "string", description: "Custom classes on the trigger button. `class` on the host styles the panel instead." },
  { name: "...ColorPicker inputs", type: "ColorPickerProps", description: "All ColorPicker inputs are forwarded to the panel, and it reports through the same `colorChange`." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "ColorPicker", props: colorPickerProps },
  { title: "ColorPickerPopover", props: popoverProps },
];
