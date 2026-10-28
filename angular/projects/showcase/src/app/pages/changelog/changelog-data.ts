// ---------------------------------------------------------------------------
// The changelog's view model, ported from lib/changelog/parse.ts' labels and
// app/changelog/changelog-view.tsx' ids. The data itself is generated at build
// time (data/changelog.generated.ts), so this page reads only local module
// state: no fetch, no node:fs.
//
// Every entry gets the id the reference gives it (`<month>-<kind>-<index>`),
// which keys its diff and its preview stage.
// ---------------------------------------------------------------------------

import type { ChangeEntry, ChangeKind, Inline, Release } from '../../data/changelog.generated';
import { RELEASES } from '../../data/changelog.generated';

export type { ChangeEntry, ChangeKind, ChangeRef, Inline } from '../../data/changelog.generated';

/** One entry with the id the page keys it by. */
export interface EntryView extends ChangeEntry {
  id: string;
}

export interface GroupView {
  kind: ChangeKind;
  entries: EntryView[];
}

export interface ReleaseView extends Omit<Release, 'groups'> {
  groups: GroupView[];
}

/** One color per kind, shared by the changelog's entry dots and the
 *  sidebar's: blue for New, red for Breaking, and for Updated the gray of
 *  the timeline's line (--border, which is translucent: a dot that sits on
 *  the line needs an opaque base under it). */
export const KIND_LABEL: Record<ChangeKind, string> = {
  breaking: 'Breaking',
  new: 'New',
  updated: 'Updated',
};

export const KIND_DOT: Record<ChangeKind, string> = {
  new: 'bg-[var(--info)]',
  updated: 'bg-border',
  breaking: 'bg-[var(--destructive)]',
};

/** Every release, newest month first, with its entries' ids. */
export const RELEASE_VIEWS: readonly ReleaseView[] = RELEASES.map((release) => ({
  ...release,
  groups: release.groups.map((group) => ({
    kind: group.kind,
    entries: group.entries.map((entry, i) => ({ ...entry, id: `${release.month}-${group.kind}-${i}` })),
  })),
}));

/** The same sentence text `/changelog.md` renders: inline code keeps its
 *  backticks. */
export function inlineToText(inline: readonly Inline[]): string {
  return inline.map((part) => (part.type === 'code' ? `\`${part.value}\`` : part.value)).join('');
}

/** `2026-09` → "September 2026", in UTC so a visitor's zone never shifts the
 *  month. */
export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** `2026-09-05` → "Sep 5", the release date the month's heading shows. */
export function releasedLabel(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
