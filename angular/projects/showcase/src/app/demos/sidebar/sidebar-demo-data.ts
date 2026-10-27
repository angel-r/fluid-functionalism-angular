import type { IconName } from '@angel-r/fluid-functionalism-angular';

/**
 * Content for the Sidebar demo — one fictional AI product, shown doing a
 * different job in each section (mirrors app/docs/sidebar/example-data.ts).
 */

export const AI_WORKSPACE = 'Aurora AI';

/** Top-level product nav. Level-2 rows carry the counts, since a parent row
 *  spends its trailing slot on the chevron. */
export const AI_NAV: readonly {
  icon: IconName;
  label: string;
  children: readonly { label: string; badge?: string }[];
}[] = [
  {
    icon: 'message-circle',
    label: 'Chat',
    children: [{ label: 'Q3 board deck', badge: '12' }, { label: 'Postgres 16 plan', badge: '4' }, { label: 'Onboarding emails' }],
  },
  {
    icon: 'brain',
    label: 'Agents',
    children: [{ label: 'Support triage', badge: '18' }, { label: 'Release notes' }, { label: 'SQL analyst' }],
  },
  {
    icon: 'square-library',
    label: 'Knowledge',
    children: [{ label: 'Product docs', badge: '1.2k' }, { label: 'Support macros' }, { label: 'API reference' }],
  },
  {
    icon: 'play',
    label: 'Runs',
    children: [{ label: 'In progress', badge: '3' }, { label: 'Completed' }, { label: 'Failed', badge: '1' }],
  },
  {
    icon: 'check',
    label: 'Evals',
    children: [{ label: 'Refusal suite', badge: '98%' }, { label: 'Retrieval recall', badge: '91%' }, { label: 'Jailbreak probes' }],
  },
];

export interface WikiBranch {
  icon: IconName;
  label: string;
  children: readonly { icon: IconName; label: string }[];
}

/** The nesting example: Aurora AI's wiki. Three sections in three states —
 *  Private folded to its label, Shared open with its branches closed, Recent
 *  open down to level 2. */
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

/** Assistant threads for the status-dot treatment: `active` is streaming a
 *  reply, `unread` finished while you were away, `idle` is everything else. */
export const AI_THREADS: readonly { label: string; status: 'active' | 'unread' | 'idle'; badge: string }[] = [
  { label: 'Summarise the Q3 board deck', status: 'active', badge: '12' },
  { label: 'Migration plan for Postgres 16', status: 'unread', badge: '4' },
  { label: 'Why does retrieval miss the changelog?', status: 'idle', badge: '6' },
  { label: 'Rewrite the onboarding emails', status: 'idle', badge: '8' },
  { label: 'Debug the eval harness timeout', status: 'unread', badge: '9' },
  { label: 'Draft the launch announcement', status: 'idle', badge: '5' },
  { label: 'Compare embedding models', status: 'idle', badge: '3' },
];
