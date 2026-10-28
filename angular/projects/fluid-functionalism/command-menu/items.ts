import type { IconDefinition, IconName } from '../core';

/** A row's icon: a role name from the icon map, or an icon definition. */
export type CommandMenuIcon = IconName | IconDefinition;

export interface CommandMenuItemData {
  /** Unique id. Doubles as the row's key and `aria-activedescendant` target. */
  value: string;
  label: string;
  /** What the footer names Enter while the row is highlighted, e.g. "Open
   *  Showcase" for a row labelled "Showcase". Defaults to the label. */
  action?: string;
  /** Secondary text after the label: the label's size, in the muted
   *  color. */
  description?: string;
  icon?: CommandMenuIcon;
  /** Keys shown at the row's trailing edge, e.g. `"mod+p"` or `"⌘⇧P"`.
   *  Display only: bind the combo yourself. */
  shortcut?: string;
  /** Extra terms the filter matches besides label and description. */
  keywords?: readonly string[];
  /** Heading the row is listed under. Groups keep the order their first
   *  item appears in; ungrouped items form an unlabelled section. */
  group?: string;
  disabled?: boolean;
  /** Runs when the row is picked, before the root's `itemSelect`. */
  onSelect?: () => void;
}

/** Contiguous slice of the visible rows under one heading. */
export interface CommandMenuSection {
  id: string;
  heading: string | null;
  items: CommandMenuItemData[];
  /** Flat index of the section's first row. */
  start: number;
}

export type CommandMenuFilter = (item: CommandMenuItemData, query: string) => boolean;

/** Every word of the query appears somewhere in the label, description, or
 *  keywords, case-insensitively. Order is kept: rows never re-sort under
 *  the cursor as the query grows. */
export function defaultCommandMenuFilter(item: CommandMenuItemData, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [item.label, item.description ?? '', ...(item.keywords ?? [])].join(' ').toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/** Groups the visible rows into sections, suggestions first while the query
 *  is empty. */
export function sectionRows(
  visible: readonly CommandMenuItemData[],
  suggestions: readonly string[] | undefined,
  suggestionsLabel: string,
  query: string,
): CommandMenuSection[] {
  const sections: CommandMenuSection[] = [];
  const byHeading = new Map<string | null, CommandMenuSection>();
  const suggested = new Set(query === '' ? (suggestions ?? []) : []);
  let index = 0;
  const push = (heading: string | null, id: string, item: CommandMenuItemData) => {
    let section = byHeading.get(heading);
    if (!section) {
      section = { id, heading, items: [], start: 0 };
      byHeading.set(heading, section);
      sections.push(section);
    }
    section.items.push(item);
  };
  // Suggested rows lead, in the order `suggestions` lists them, and leave
  // their own group so nothing is listed twice.
  if (suggested.size > 0) {
    const pool = new Map(visible.map((item) => [item.value, item]));
    for (const value of suggestions ?? []) {
      const item = pool.get(value);
      if (item) push(suggestionsLabel, 'suggestions', item);
    }
  }
  for (const item of visible) {
    if (suggested.has(item.value)) continue;
    push(item.group ?? null, item.group ? `group:${item.group}` : 'ungrouped', item);
  }
  for (const section of sections) {
    section.start = index;
    index += section.items.length;
  }
  return sections;
}
