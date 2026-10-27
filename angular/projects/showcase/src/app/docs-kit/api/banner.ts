// The API reference of /docs/banner: its PropsTables and the API section
// of /docs/banner.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const bannerProps: PropDef[] = [
  { name: "status", type: '"default" | "info" | "success" | "warning" | "error"', default: '"default"', description: "Sets the color and the icon." },
  { name: "contrast", type: '"low" | "high"', default: '"low"', description: "low colors only the icon. high tints the whole banner." },
  { name: "variant", type: '"inline" | "fixed"', default: '"inline"', description: "fixed spans the full width and sticks to the top." },
  { name: "icon", type: "IconName | IconDefinition", description: "Replaces the status icon. Rendered in the status color." },
  { name: "dismissible", type: "boolean", default: "false", description: "Shows a ✕ button." },
  { name: "dismiss", type: "() => void", description: "Emitted when the ✕ is pressed." },
  { name: "dismissLabel", type: "string", default: '"Dismiss"', description: "Label read by screen readers for the ✕." },
  { name: "open", type: "boolean", description: "Controls visibility. Without it, the ✕ hides the banner." },
  { name: "size", type: '"default" | "compact"', default: "from SizeProvider", description: "Default or compact." },
  { name: "motion", type: "BannerMotionConfig", default: "bannerMotion", description: "Overrides the appear and dismiss values for this banner." },
  { name: "role", type: "string", description: "Overrides the role: errors and warnings default to \"alert\", the rest to \"status\"." },
];

export const partProps: PropDef[] = [
  { name: "[ffBannerTitle]", type: "directive", description: "The message." },
  { name: "[ffBannerDescription]", type: "directive", description: "Optional text under the title." },
  { name: "[ffBannerActions]", type: "directive", description: "Up to 3 ff-banner-action. Primary sits at the edge, or first under a description." },
];

export const actionProps: PropDef[] = [
  { name: "variant", type: '"primary" | "secondary" | "ghost"', default: '"secondary"', description: "The button style." },
  { name: "href", type: "string", description: "Renders a link instead of a button." },
  { name: "external", type: "boolean", default: "false", description: "Opens the link in a new tab." },
  { name: "click", type: "(event: MouseEvent) => void", description: "Bind the native click on the host; it fires when the action is pressed." },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the action button. Ignored when href turns it into a link." },
  { name: "loading", type: "boolean", default: "false", description: "Shows a spinner and disables the action." },
  { name: "leadingIcon", type: "IconName | IconDefinition", description: "Icon before the label." },
  { name: "trailingIcon", type: "IconName | IconDefinition", description: "Icon after the label." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "Banner", props: bannerProps },
  { title: "Parts", props: partProps },
  { title: "BannerAction", props: actionProps },
];
