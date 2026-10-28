// ---------------------------------------------------------------------------
// Content for the Sidebar doc page's examples, ported from
// app/docs/sidebar/example-data.ts — one fictional AI product, shown doing a
// different job in each section.
//
// The spread across sections is the point — an assistant's thread list, an
// agent roster, retrieval sources and eval runs all want different parts of
// the component, and a nav of Home / Inbox / Calendar shows none of it.
// ---------------------------------------------------------------------------

import type { IconName } from '@angel-r/fluid-functionalism-angular';

export const AI_WORKSPACE = 'Aurora AI';

/** Top-level product nav — the layout and collapse examples. Every row owns a
 *  sub-tree, so those examples show the shape of a real tree rather than a
 *  flat list; only the first is open, or five expanded rows would outrun the
 *  frame. Level-2 rows carry the counts, since a parent row spends its
 *  trailing slot on the chevron. */
export const AI_NAV: readonly {
  icon: IconName;
  label: string;
  children: readonly { label: string; badge?: string }[];
}[] = [
  {
    icon: 'message-circle',
    label: 'Chat',
    children: [
      { label: 'Q3 board deck', badge: '12' },
      { label: 'Postgres 16 plan', badge: '4' },
      { label: 'Onboarding emails' },
    ],
  },
  {
    icon: 'brain',
    label: 'Agents',
    children: [
      { label: 'Support triage', badge: '18' },
      { label: 'Release notes' },
      { label: 'SQL analyst' },
    ],
  },
  {
    icon: 'square-library',
    label: 'Knowledge',
    children: [
      { label: 'Product docs', badge: '1.2k' },
      { label: 'Support macros' },
      { label: 'API reference' },
    ],
  },
  {
    icon: 'play',
    label: 'Runs',
    children: [
      { label: 'In progress', badge: '3' },
      { label: 'Completed' },
      { label: 'Failed', badge: '1' },
    ],
  },
  {
    icon: 'check',
    label: 'Evals',
    children: [
      { label: 'Refusal suite', badge: '98%' },
      { label: 'Retrieval recall', badge: '91%' },
      { label: 'Jailbreak probes' },
    ],
  },
];

/** One wiki section's branches: a level-1 row that owns a level-2 sub-tree. */
export interface WikiBranch {
  icon: IconName;
  label: string;
  children: readonly { icon: IconName; label: string }[];
}

/** The nesting example: Aurora AI's wiki, Notion-style. Three sections in
 *  three states — Private folded to its label, Shared open with its branches
 *  closed, Recent fully open down to level 2. */
export const WIKI_PRIVATE: readonly WikiBranch[] = [
  {
    icon: 'pencil',
    label: 'Drafts',
    children: [
      { icon: 'star', label: 'Onboarding revamp' },
      { icon: 'search', label: 'Competitor teardown' },
    ],
  },
  {
    icon: 'calendar',
    label: 'Weekly notes',
    children: [
      { icon: 'clock', label: 'Week 35 — planning' },
      { icon: 'mail', label: 'Week 34 — retro' },
    ],
  },
];

export const WIKI_SHARED: readonly WikiBranch[] = [
  {
    icon: 'brain',
    label: 'Engineering',
    children: [
      { icon: 'link', label: 'API guidelines' },
      { icon: 'play', label: 'Release process' },
    ],
  },
  {
    icon: 'globe',
    label: 'Product hub',
    children: [
      { icon: 'message-circle', label: 'Customer interviews' },
      { icon: 'star', label: 'Roadmap' },
    ],
  },
];

/** Recents grouped by day — pages the visitor was just on, echoing entries
 *  from the trees above the way a real wiki's recents do. Both branches
 *  render open so the example leads with a fully expanded tree. */
export const WIKI_RECENT: readonly WikiBranch[] = [
  {
    icon: 'clock',
    label: 'Today',
    children: [
      { icon: 'star', label: 'Onboarding revamp' },
      { icon: 'link', label: 'API guidelines' },
    ],
  },
  {
    icon: 'calendar',
    label: 'Yesterday',
    children: [
      { icon: 'message-circle', label: 'Customer interviews' },
      { icon: 'play', label: 'Release process' },
    ],
  },
];

/** Assistant threads for the status-dot treatment: `active` is the one
 *  streaming a reply, `unread` finished while you were away, `idle` is
 *  everything else. Every thread carries a badge — they count turns. */
export const AI_THREADS: readonly {
  label: string;
  status: 'active' | 'unread' | 'idle';
  badge: string;
}[] = [
  { label: 'Summarise the Q3 board deck', status: 'active', badge: '12' },
  { label: 'Migration plan for Postgres 16', status: 'unread', badge: '4' },
  { label: 'Why does retrieval miss the changelog?', status: 'idle', badge: '6' },
  { label: 'Rewrite the onboarding emails', status: 'idle', badge: '8' },
  { label: 'Debug the eval harness timeout', status: 'unread', badge: '9' },
  { label: 'Draft the launch announcement', status: 'idle', badge: '5' },
  { label: 'Compare embedding models', status: 'idle', badge: '3' },
];

export const AI_CALLOUT = {
  title: 'Aurora 2 is here',
  media: 'Longer context, faster agents',
  icon: 'See what changed',
} as const;

/** Clarity-blue mesh banner, the same art the React docs use (CARD_BANNER):
 *  four radial stops over a tinted plate. The callout pile scales its stops to
 *  step the intensity ladder. */
export const MESH_BANNER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Cdefs%3E%3CradialGradient id='a' cx='12%25' cy='16%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.9'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='90%25' cy='12%25' r='65%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.45'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='82%25' cy='94%25' r='75%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.8'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='d' cx='24%25' cy='90%25' r='68%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.55'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='320' height='180' fill='%23ffffff'/%3E%3Crect width='320' height='180' fill='%236B97FF' fill-opacity='0.2'/%3E%3Crect width='320' height='180' fill='url(%23a)'/%3E%3Crect width='320' height='180' fill='url(%23b)'/%3E%3Crect width='320' height='180' fill='url(%23c)'/%3E%3Crect width='320' height='180' fill='url(%23d)'/%3E%3C/svg%3E";

// ---------------------------------------------------------------------------
// The playground's and the alignment demo's rows: the same content the
// reference keeps in app/components/demo-data.ts (SIDEBAR_THREADS,
// SIDEBAR_ITEMS), copied here so this page owns its own columns.
// ---------------------------------------------------------------------------

/** Thread-style rows for the status-dot leading treatment — discussion
 *  titles, not page names, with the semantic status vocabulary. */
export const SIDEBAR_THREADS: readonly {
  label: string;
  badge?: string;
  status: 'active' | 'unread' | 'idle';
}[] = [
  { label: 'Sidebar component height in demo', status: 'active', badge: '2' },
  { label: 'Sidebar component creation', status: 'idle', badge: '5' },
  { label: 'Dark mode token audit', badge: '3', status: 'unread' },
  { label: 'Scrollbar fade regression', status: 'idle', badge: '1' },
  { label: 'Registry deploy pipeline', status: 'unread', badge: '7' },
];

/** Menu-style rows for the playground's "Menu" primary element. */
export const SIDEBAR_ITEMS: readonly {
  icon: IconName;
  label: string;
  badge?: string;
  active?: boolean;
}[] = [
  { icon: 'home', label: 'Home', active: true, badge: '3' },
  { icon: 'inbox', label: 'Inbox', badge: '12' },
  { icon: 'calendar', label: 'Calendar', badge: '5' },
  { icon: 'bell', label: 'Notifications', badge: '8' },
  { icon: 'star', label: 'Favorites', badge: '2' },
];
