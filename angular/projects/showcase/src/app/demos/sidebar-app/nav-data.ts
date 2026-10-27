import type { NavSection } from '@angel-r/fluid-functionalism-angular';

// ---------------------------------------------------------------------------
// Seed navigation data — replace with your own. Icons are slots of the icon
// map (lucide by default; override with provideIcons()).
// ---------------------------------------------------------------------------

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Platform',
    items: [
      { label: 'Home', icon: 'star' },
      { label: 'Inbox', icon: 'mail', badge: '12' },
      { label: 'Calendar', icon: 'clock' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Notifications', icon: 'bell', badge: '3' },
      { label: 'Members', icon: 'users' },
      { label: 'Settings', icon: 'settings' },
    ],
  },
];
