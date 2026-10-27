// ---------------------------------------------------------------------------
// The page's shared prose: its description, the shortest Angular usage the
// Installation prompt carries, and the one-line props the preset prompt lists.
// The page and its playground both read them, so the doc chrome and the Share
// dialog describe the same component.
// ---------------------------------------------------------------------------

import { componentProps } from '../../../docs-kit/api/ask-user-questions';

export const PAGE_DESCRIPTION =
  "Stepped question flow with 2–5 options, single or multi-select, inline 'other' input, optional skip, and multi-question navigation.";

export const INSTALL_USAGE = `<ff-ask-user-questions [questions]="questions" />`;

/** One line per prop, as the page's install brief spells them. */
export const INSTALL_PROPS: readonly string[] = componentProps.map(
  (prop) =>
    `${prop.name}: ${prop.type}${prop.default !== undefined ? ` (default ${prop.default})` : ''} — ${prop.description}`,
);
