// The API reference of /docs/card: its PropsTables and the API section
// of /docs/card.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

// ── Props ────────────────────────────────────────────────

export const groupProps: PropDef[] = [
  { name: "orientation", type: '"card" | "inline"', default: '"card"', description: "Per-card layout: stacked (media/header on top) or a horizontal row." },
  { name: "columns", type: "number", default: "1", description: "Grid columns. Greater than 1 enables 2-D fluid hover across rows and columns." },
  { name: "border", type: '"none" | "outlined"', default: '"none"', description: "Borderless (dividers only) or a drawn border." },
  { name: "separated", type: "boolean", default: "false", description: "Split into individually-shaped tiles with a gap instead of one divided block." },
  { name: "fluidHover", type: "boolean", default: "true", description: "Enable the fluid hover highlight." },
  { name: "<ng-content />", type: "projected content", description: "ff-card children. Each is auto-assigned its fluid hover index." },
];

export const cardProps: PropDef[] = [
  { name: "<ng-content />", type: "projected content", description: "Compositional parts: an img with ffCardImage, ff-card-media, [ffCardHeader], [ffCardContent], [ffCardFooter]." },
  { name: "cardClick", type: "() => void", description: "Binding it makes the whole card a clickable target (stretched button)." },
  { name: "href", type: "string", description: "Makes the whole card a link (stretched anchor)." },
  { name: "external", type: "boolean", default: "false", description: "Opens href in a new tab." },
  { name: "label", type: "string", description: "Accessible name for the stretched link/button when the whole card is clickable." },
  { name: "selected", type: "boolean", default: "false", description: "Persistent selected fill + title emphasis, on top of fluid hover. The group drops the hairline dividers around the selected card so the fill reads clean." },
  { name: "disabled", type: "boolean", default: "false", description: "Dims and disables the card." },
  { name: "dismissible", type: "boolean", default: "false", description: "Shows a dismiss (✕) button, revealed on hover or focus by default." },
  { name: "dismissOnHover", type: "boolean", default: "true", description: "Keeps the dismiss control hidden until the card is hovered or holds focus. Pass false for an always-visible ✕." },
  { name: "dismiss", type: "() => void", description: "Emitted when the dismiss button is pressed." },
];

export const partProps: PropDef[] = [
  { name: "[ffCardHeader]", type: "directive", description: "Title + description grid; pins the action to the top-right." },
  { name: "[ffCardTitle]", type: "directive", description: "Weight-animates normal → semibold when the card is selected (fluid hover previews via the highlight, not the weight)." },
  { name: "[ffCardDescription]", type: "directive", description: "Muted supporting text." },
  { name: "[ffCardAction]", type: "directive", description: "Top-right slot in the header (e.g. a menu button); stays clickable above the card overlay." },
  { name: "[ffCardContent]", type: "directive", description: "Body region below the header." },
  { name: "[ffCardFooter]", type: "directive", description: "Actions row. Trailing-right in inline cards, but drops below the text (natural order) in an inline card with an image; wraps under the content when stacked." },
  { name: "ff-card-media", type: "component", description: "Leading icon in a tinted 32×32 tile, or a brand logo / [logoA, logoB] tuple passed as `logo`. Logos get a subtle inset image outline." },
  { name: "img[ffCardImage]", type: "directive", description: "Full-bleed image, a top banner when stacked, a square leading image when inline. A 1px inset outline preserves pale edges without changing layout. Corners round only inside a framed tile (outlined, or a caller's overflow-hidden wrapper); a borderless card reads as a plain rectangle." },
  { name: "ff-card-feature", type: "component", description: "Icon + title + description row for feature lists, from the `icon`, `title` and `description` inputs." },
];

export const buttonProps: PropDef[] = [
  { name: "<ng-content />", type: "projected content", description: "Button label." },
  { name: "click", type: "(event: MouseEvent) => void", description: "Native click on the host, which is a button or an anchor carrying ffCardButton." },
  { name: "href", type: "string", description: "Set on an <a ffCardButton> to render the action as a link." },
  { name: "variant", type: '"primary" | "secondary" | "ghost" | "link"', default: '"ghost"', description: "Visual style." },
  { name: "icon", type: "IconName | IconDefinition", description: "Leading (or trailing) icon." },
  { name: "iconPosition", type: '"start" | "end"', description: "Icon side. Defaults to end for external actions, else start." },
  { name: "external", type: "boolean", default: "false", description: "Appends an outward arrow and opens href in a new tab." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "Card", props: cardProps },
  { title: "CardGroup", props: groupProps },
  { title: "Parts", props: partProps },
  { title: "CardButton", props: buttonProps },
];
