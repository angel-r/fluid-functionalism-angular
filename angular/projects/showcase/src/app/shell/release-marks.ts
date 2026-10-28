// ---------------------------------------------------------------------------
// The site's New and Updated marks: the dots in the sidebar, the descriptions
// in the command menu, the badges on the home grid. Ported from
// lib/changelog/marks.tsx, with the data the build step generated
// (data/changelog.generated.ts, latestMarks in lib/changelog/load.ts).
//
// "New" is what the latest release lists plus what landed since (AHEAD);
// "Updated" is what the latest release changed.
// ---------------------------------------------------------------------------

import { MARKS } from '../data/changelog.generated';

const added = new Set(MARKS.new);
const ahead = new Set(MARKS.ahead);
const updated = new Set(MARKS.updated);

/** New in the latest release, or landed since: the New dots and badges. */
export function isNew(slug: string): boolean {
  return added.has(slug) || ahead.has(slug);
}

/** Changed by the latest release. */
export function isUpdated(slug: string): boolean {
  return updated.has(slug);
}

/** What the command menu writes beside a page: "New", "Updated", or nothing. */
export function markFor(slug: string): string | undefined {
  if (isNew(slug)) return 'New';
  return isUpdated(slug) ? 'Updated' : undefined;
}

/** The New dot's fill: the changelog's blue (KIND_DOT.new in
 *  lib/changelog/kind-style.ts). */
export const NEW_DOT = 'bg-[var(--info)]';
