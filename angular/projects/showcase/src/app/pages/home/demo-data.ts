// ---------------------------------------------------------------------------
// Shared demo content for the home page's bento previews.
// Ported from app/components/demo-data.ts: the same copy the React tile shows,
// plus the two data sets the reference keeps elsewhere but the tiles read
// (the Combobox picks from lib/preset/combobox-options.ts and the
// AskUserQuestions flow written next to the preview in bento-previews.tsx).
//
// The `shadcnVariant` fields and the sidebar nav rows are not here: they only
// feed the /compare page and the Sidebar docs page, neither of which the home
// page renders.
// ---------------------------------------------------------------------------

import type { AskUserQuestion, IconName } from '@angel-r/fluid-functionalism-angular';

export interface AccordionItemData {
  value: string;
  title: string;
  content: string;
}

export const ACCORDION_ITEMS: readonly AccordionItemData[] = [
  {
    value: 'item-1',
    title: 'What is Fluid Functionalism?',
    content:
      'A design philosophy where every animation serves a functional purpose — motion is information, not decoration.',
  },
  {
    value: 'item-2',
    title: 'How does fluid hover work?',
    content: 'The closest item to your cursor is highlighted before you click, reducing targeting errors.',
  },
  {
    value: 'item-3',
    title: 'Why spring physics?',
    content: 'Springs respond naturally to interruption — if a user reverses mid-transition, the animation adapts.',
  },
  {
    value: 'item-4',
    title: 'Is it compatible with shadcn/ui?',
    content: 'Yes. Your existing theme, radius tokens, and setup apply automatically.',
  },
  {
    value: 'item-5',
    title: 'How do I install a component?',
    content: 'One CLI command — dependencies and shared utilities resolve themselves.',
  },
];

export interface BadgeItem {
  label: string;
  color: 'blue' | 'green' | 'red';
}

export const BADGE_ITEMS: readonly BadgeItem[] = [
  { label: 'Published', color: 'blue' },
  { label: 'Active', color: 'green' },
  { label: 'Declined', color: 'red' },
];

export interface ButtonItem {
  label: string;
  variant: 'primary' | 'secondary' | 'tertiary' | 'ghost';
}

export const BUTTON_ITEMS: readonly ButtonItem[] = [
  { label: 'Primary', variant: 'primary' },
  { label: 'Secondary', variant: 'secondary' },
  { label: 'Tertiary', variant: 'tertiary' },
  { label: 'Ghost', variant: 'ghost' },
];

export interface CheckboxItemData {
  id: string;
  label: string;
}

export const CHECKBOX_ITEMS: readonly CheckboxItemData[] = [
  { id: 'spring', label: 'Spring physics' },
  { id: 'fluid-hover', label: 'Fluid hover' },
  { id: 'weight', label: 'Font weight transitions' },
  { id: 'kbd', label: 'Keyboard navigation' },
  { id: 'dark', label: 'Dark mode support' },
];

export const DIALOG_COPY = {
  trigger: 'Open Dialog',
  title: 'Create teamspace',
  description: 'Add a new teamspace to organize your projects.',
  cancel: 'Cancel',
  confirm: 'Create',
} as const;

export interface DropdownItemData {
  value: string;
  icon: IconName;
  label: string;
}

export const DROPDOWN_ITEMS: readonly DropdownItemData[] = [
  { value: 'spring', icon: 'circle', label: 'Spring animations' },
  { value: 'fluid-hover', icon: 'star', label: 'Fluid hover' },
  { value: 'weight', icon: 'plus', label: 'Font weight shifts' },
  { value: 'a11y', icon: 'heart', label: 'Accessible by default' },
  { value: 'primitives', icon: 'check', label: 'Radix or Base UI' },
  { value: 'clarity', icon: 'brain', label: 'Functional clarity' },
];

export interface InputFieldData {
  key: string;
  label: string;
  placeholder: string;
  icon: IconName;
}

export const INPUT_FIELDS: readonly InputFieldData[] = [
  { key: 'name', label: 'Name', placeholder: 'Your name', icon: 'user' },
  { key: 'email', label: 'Email', placeholder: 'you@example.com', icon: 'mail' },
  { key: 'website', label: 'Website', placeholder: 'fluidfunctionalism.com', icon: 'globe' },
];

export interface RadioItemData {
  value: string;
  label: string;
}

export const RADIO_ITEMS: readonly RadioItemData[] = [
  { value: 'fast', label: 'Fast spring' },
  { value: 'moderate', label: 'Moderate spring' },
  { value: 'slow', label: 'Slow spring' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'none', label: 'No animation' },
];

export const RADIO_DEFAULT = 'moderate';

export const SELECT_PLACEHOLDER = 'Select role...';
export const SELECT_ROLES = ['Owner', 'Editor', 'Viewer', 'Guest'] as const;
export const SELECT_DEFAULT = 'Viewer';

export interface SidebarThread {
  label: string;
  badge?: string;
  status: 'active' | 'unread' | 'idle';
}

/** Thread-style rows for the status-dot leading treatment — discussion
 *  titles, not page names, with the semantic status vocabulary
 *  (active/unread → filled dot, idle → ring). */
export const SIDEBAR_THREADS: readonly SidebarThread[] = [
  { label: 'Sidebar component height in demo', status: 'active', badge: '2' },
  { label: 'Sidebar component creation', status: 'idle', badge: '5' },
  { label: 'Dark mode token audit', badge: '3', status: 'unread' },
  { label: 'Scrollbar fade regression', status: 'idle', badge: '1' },
  { label: 'Registry deploy pipeline', status: 'unread', badge: '7' },
];

export const SLIDER_OPACITY = { label: 'Opacity', initial: 35 } as const;
export const SLIDER_VOLUME = { label: 'Volume', initial: 60 } as const;

export const SWITCH_ITEMS = [
  { id: 'notifications', label: 'Notifications', initial: true },
  { id: 'sound', label: 'Sound effects', initial: false },
] as const;

export const TABLE_COLUMNS = ['Name', 'Role', 'Status'] as const;
export const TABLE_ROWS = [
  ['Alice', 'Engineer', 'Active'],
  ['Bob', 'Designer', 'Away'],
  ['Carol', 'PM', 'Active'],
  ['Dan', 'Engineer', 'Offline'],
  ['Erin', 'Researcher', 'Active'],
  ['Farid', 'Support', 'Away'],
  ['Gwen', 'Designer', 'Active'],
] as const;

/** How many rows a bento tile shows: the other three need more height than a
 *  300px grid row leaves. */
export const TABLE_TILE_ROWS = 4;

export interface TabItemData {
  value: string;
  label: string;
}

export const TABS_ITEMS: readonly TabItemData[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'settings', label: 'Settings' },
  { value: 'logs', label: 'Logs' },
];

export const TABS_DEFAULT = 'overview';

export const TOOLTIP_COPY = {
  trigger: 'Hover me',
  content: 'Copy to clipboard',
} as const;

export interface ComboboxItemData {
  value: string;
  label: string;
}

/** The Combobox playground's item list (lib/preset/combobox-options.ts). */
export const COMBOBOX_COMPONENTS: readonly ComboboxItemData[] = [
  { value: 'accordion', label: 'Accordion' },
  { value: 'badge', label: 'Badge' },
  { value: 'button', label: 'Button' },
  { value: 'card', label: 'Card' },
  { value: 'checkbox-group', label: 'CheckboxGroup' },
  { value: 'color-picker', label: 'ColorPicker' },
  { value: 'combobox', label: 'Combobox' },
  { value: 'dialog', label: 'Dialog' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'input-group', label: 'InputGroup' },
  { value: 'radio-group', label: 'RadioGroup' },
  { value: 'select', label: 'Select' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'slider', label: 'Slider' },
  { value: 'switch', label: 'Switch' },
  { value: 'table', label: 'Table' },
  { value: 'tabs', label: 'Tabs' },
];

/** The two chips the tile opens with. */
export const COMBOBOX_DEFAULT_VALUES = ['button', 'combobox'];

export const COMBOBOX_COPY = {
  placeholderMultiple: 'Add components…',
  empty: 'No component found.',
} as const;

/** The docs page's first "Example" flow, so the tile and the page stay in
 *  sync with the canonical demo the docs link to. */
export const ASK_USER_EXAMPLE_QUESTIONS: AskUserQuestion[] = [
  {
    id: 'role',
    title: 'How do you plan to use Fluid Functionalism?',
    options: [
      { id: 'design', title: 'Designer', description: 'Prototyping flows and pages' },
      { id: 'eng', title: 'Engineer', description: 'Shipping production UI' },
      { id: 'pm', title: 'PM', description: 'Aligning the team on patterns' },
      { id: 'founder', title: 'Founder', description: 'Bootstrapping a product' },
    ],
  },
  {
    id: 'shape',
    title: 'Which shape language fits your brand?',
    options: [
      { id: 'rounded', title: 'Rounded', description: 'Soft, familiar corners' },
      { id: 'pill', title: 'Pill', description: 'Fully rounded, friendly' },
    ],
  },
  {
    id: 'components',
    title: 'Which components are you reaching for first?',
    multiSelect: true,
    options: [
      { id: 'input', title: 'InputMessage', description: 'Chat-style composer with attachments' },
      { id: 'thinking', title: 'ThinkingSteps', description: 'Streamed reasoning steps' },
      { id: 'ask', title: 'AskUserQuestions', description: 'Stepped question flows' },
      { id: 'tabs', title: 'TabsSubtle', description: 'Quiet segmented tabs' },
      { id: 'nav', title: 'NavMenu', description: 'Sidebar navigation' },
    ],
    nextLabel: 'Continue',
  },
  {
    id: 'drew',
    title: 'What drew you to Fluid Functionalism?',
    options: [
      { id: 'motion', title: 'Motion', description: 'Springs that feel alive' },
      { id: 'craft', title: 'Craft', description: 'Pixel-level polish' },
      { id: 'tokens', title: 'Tokens', description: 'Shape and elevation systems' },
    ],
    allowOther: true,
    otherPlaceholder: 'Something else?',
  },
  {
    id: 'frameworks',
    title: 'Where will you ship these components?',
    multiSelect: true,
    options: [
      { id: 'next', title: 'Next.js', description: 'App Router projects' },
      { id: 'remix', title: 'Remix', description: 'Full-stack apps' },
      { id: 'vite', title: 'Vite + React', description: 'SPAs and dashboards' },
      { id: 'astro', title: 'Astro', description: 'Content-first sites' },
    ],
  },
  {
    id: 'themes',
    title: 'Which theme mode do you support?',
    options: [
      { id: 'light', title: 'Light only' },
      { id: 'dark', title: 'Dark only' },
      { id: 'system', title: 'System-aware' },
      { id: 'toggle', title: 'User toggle' },
    ],
  },
  {
    id: 'missing',
    title: "What's missing from the registry today?",
    multiSelect: true,
    options: [
      { id: 'data', title: 'Data table', description: 'Sortable, filterable rows' },
      { id: 'calendar', title: 'Calendar', description: 'Date picker and range' },
      { id: 'command', title: 'Command menu', description: 'Fast keyboard launcher' },
    ],
    allowOther: true,
    otherPlaceholder: 'Tell us what to build next…',
    nextLabel: 'Send feedback',
  },
  {
    id: 'recommend',
    title: 'Would you recommend Fluid Functionalism to a teammate?',
    skippable: false,
    options: [
      { id: 'yes', title: 'Yes', description: 'Already have' },
      { id: 'soon', title: 'Soon', description: 'Once it covers more ground' },
      { id: 'unsure', title: 'Not sure yet', description: 'Still evaluating' },
    ],
  },
];
