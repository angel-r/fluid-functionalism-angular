// The API reference of /docs/switch: its PropsTables and the API section
// of /docs/switch.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const switchProps: PropDef[] = [
  { name: "label", type: "string", description: "Text label displayed next to the switch. Required." },
  { name: "checked", type: "boolean", default: "false", description: "Whether the switch is on. Two-way: `[(checked)]`; also a signal-forms checkbox control." },
  { name: "toggle", type: "() => void", description: "Emitted when the switch is toggled." },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the switch." },
  { name: "size", type: '"default" | "compact"', default: "from the size context", description: "Pins the switch to one step of the size ladder (see /docs/sizes)." },
  { name: "thumbTransition", type: "ValueAnimationTransition<number>", description: "Overrides the spring the thumb moves with. Leave unset for the component's own tier." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the labeled row." },
  { name: "touch", type: "() => void", description: "Emitted when focus leaves the switch, for signal forms' touched state." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "Switch", props: switchProps },
];
