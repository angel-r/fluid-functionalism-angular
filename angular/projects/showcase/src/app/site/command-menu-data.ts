// The demo actions shared by the command menu doc page, its playground, the
// /demo slide and the preset generator. Ported from lib/docs/command-menu-items.ts
// and the demo-content half of lib/preset/command-menu-options.ts; icons are
// slot names, resolved against the site's current icon library at render.

import { injectIconsSource, type IconDefinition, type IconName } from '@angel-r/fluid-functionalism-angular';

export const COMMAND_MENU_GROUPS = ['Actions', 'Go to', 'Help'] as const;

/** The demo actions, with icons as slot names so the generated file reads
 *  them from the installed icon context. */
export const COMMAND_MENU_ITEMS: readonly {
  value: string;
  label: string;
  /** Names Enter in the footer while highlighted; defaults to the label. */
  action?: string;
  description?: string;
  icon: IconName;
  shortcut?: string;
  keywords?: readonly string[];
  group: (typeof COMMAND_MENU_GROUPS)[number];
  disabled?: boolean;
}[] = [
  // Actions
  { value: 'new-file', label: 'New file', description: 'Blank document', icon: 'plus', shortcut: 'mod+n', keywords: ['create', 'document'], group: 'Actions' },
  { value: 'search', label: 'Search everywhere', description: 'Files, people, messages', icon: 'search', shortcut: 'mod+shift+f', keywords: ['find'], group: 'Actions' },
  { value: 'theme', label: 'Toggle dark mode', description: 'System, light, or dark', icon: 'moon', shortcut: 'mod+shift+l', keywords: ['appearance', 'theme'], group: 'Actions' },
  { value: 'copy-link', label: 'Copy link', description: 'To this page', icon: 'link', shortcut: 'mod+shift+c', keywords: ['share', 'url'], group: 'Actions' },
  { value: 'invite', label: 'Invite people', description: 'Send an email invite', icon: 'users', keywords: ['team', 'member'], group: 'Actions' },
  { value: 'export', label: 'Export as PDF', description: 'Pro plan', icon: 'image', keywords: ['download'], group: 'Actions', disabled: true },
  // Go to
  { value: 'home', label: 'Home', action: 'Go to Home', icon: 'home', group: 'Go to' },
  { value: 'inbox', label: 'Inbox', action: 'Go to Inbox', description: '3 unread', icon: 'inbox', keywords: ['mail', 'notifications'], group: 'Go to' },
  { value: 'calendar', label: 'Calendar', action: 'Go to Calendar', description: 'Today', icon: 'calendar', keywords: ['events', 'schedule'], group: 'Go to' },
  { value: 'starred', label: 'Starred', action: 'Go to Starred', icon: 'star', keywords: ['favorites'], group: 'Go to' },
  { value: 'recent', label: 'Recent', action: 'Go to Recent', description: 'Last 7 days', icon: 'clock', keywords: ['history'], group: 'Go to' },
  { value: 'settings', label: 'Settings', action: 'Go to Settings', description: 'Account and workspace', icon: 'settings', shortcut: 'mod+,', keywords: ['preferences'], group: 'Go to' },
  // Help
  { value: 'docs', label: 'Documentation', icon: 'square-library', keywords: ['help', 'guide'], group: 'Help' },
  { value: 'whats-new', label: "What's new", description: 'Release notes', icon: 'rocket', keywords: ['changelog', 'updates'], group: 'Help' },
  { value: 'support', label: 'Contact support', description: 'Reply within a day', icon: 'message-circle', keywords: ['help', 'chat'], group: 'Help' },
];

/** Values listed first while nothing is typed: the last things used. */
export const COMMAND_MENU_SUGGESTIONS = ['calendar', 'new-file', 'settings'] as const;

/** The header controls every preview and generator share: one tab per
 *  group behind "All", the same groups as a filter select, and the sort. */
export const COMMAND_MENU_TABS: readonly { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  ...COMMAND_MENU_GROUPS.map((group) => ({ value: group, label: group })),
];
export const COMMAND_MENU_TYPES: readonly { value: string; label: string }[] = [
  { value: 'all', label: 'All types' },
  ...COMMAND_MENU_GROUPS.map((group) => ({ value: group, label: group })),
];
export const COMMAND_MENU_SORTS: readonly { value: string; label: string }[] = [
  { value: 'default', label: 'Default order' },
  { value: 'az', label: 'A to Z' },
];

export const COMMAND_MENU_COPY = {
  placeholder: 'Type a command or search…',
  empty: 'No results.',
  trigger: 'Open command menu',
} as const;

/** A demo row with its icon resolved for the current icon library. */
export interface CommandMenuItem {
  value: string;
  label: string;
  action?: string;
  description?: string;
  icon: IconDefinition;
  shortcut?: string;
  keywords?: readonly string[];
  group: (typeof COMMAND_MENU_GROUPS)[number];
  disabled?: boolean;
}

export interface CommandMenuItemOptions {
  /** Keep the rows' descriptions. @default true */
  descriptions?: boolean;
  /** Keep the rows' shortcut caps. @default true */
  shortcuts?: boolean;
  /** Only these groups. Default: every group. */
  groups?: readonly string[];
}

/** The demo actions with icons resolved for the current icon library. Call it
 *  from an injection context (a component field or constructor). */
export function commandMenuItems(options: CommandMenuItemOptions = {}): CommandMenuItem[] {
  const icons = injectIconsSource();
  const { descriptions = true, shortcuts = true, groups } = options;
  return COMMAND_MENU_ITEMS.filter((item) => !groups || groups.includes(item.group)).map(
    ({ icon, description, shortcut, ...item }) => ({
      ...item,
      icon: icons()[icon],
      ...(descriptions && description !== undefined && { description }),
      ...(shortcuts && shortcut !== undefined && { shortcut }),
    }),
  );
}
