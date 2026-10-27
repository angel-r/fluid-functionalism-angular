// The API reference of /docs/button: its PropsTables and the API section
// of /docs/button.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const buttonProps: PropDef[] = [
  { name: "variant", type: '"primary" | "secondary" | "tertiary" | "ghost"', default: '"primary"', description: "Visual style of the button." },
  { name: "size", type: '"default" | "compact" | "icon" | "icon-compact"', default: "from SizeProvider", description: "Step on the size ladder (36px default, 28px compact — see /docs/sizes). Legacy sm/md/lg values resolve as aliases." },
  { name: "loading", type: "boolean", default: "false", description: "Shows a spinner and disables the button." },
  { name: "active", type: "boolean", default: "false", description: "Forces the pressed/held visual, e.g. while a dropdown or popover the button opened is showing." },
  { name: "leadingIcon", type: "IconName | IconDefinition", description: "Icon displayed before the label." },
  { name: "trailingIcon", type: "IconName | IconDefinition", description: "Icon displayed after the label." },
  { name: "type", type: '"button" | "submit" | "reset"', default: '"button"', description: "The native button type, so a button inside a form never submits it by accident." },
  { name: "selector", type: "attribute directive", default: "button[ffButton], a[ffButton]", description: "Put ffButton on the element that becomes the button. There is no asChild or render: an <a ffButton> is the link form." },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the button. Ignored on a link host." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "Button", props: buttonProps },
];
