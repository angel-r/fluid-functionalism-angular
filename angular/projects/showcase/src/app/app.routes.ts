import { Routes } from '@angular/router';

// ---------------------------------------------------------------------------
// The site's route table (S7): the original site's paths under the base href,
// one lazy chunk per page, plus a redirect for every route the old showcase
// shipped (D7) and the 404 for anything else.
//
// Pages default-export their component, so a route only needs the import.
// Route `data.shell: false` marks the pages that render without the site
// shell (/demo). Placeholder pages are stubs the owning task replaces.
// ---------------------------------------------------------------------------

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Fluid Functionalism',
    loadComponent: () => import('./pages/home/home.page'),
  },
  {
    path: 'docs',
    pathMatch: 'full',
    title: 'Introduction · Fluid Functionalism',
    loadComponent: () => import('./pages/intro/intro.page'),
  },
  {
    path: 'changelog',
    title: 'Changelog · Fluid Functionalism',
    loadComponent: () => import('./pages/changelog/changelog.page'),
  },

  // Docs pages, system and component slugs (S5, S6).
  { path: 'docs/fluid-hover', title: 'Fluid Hover · Fluid Functionalism', loadComponent: () => import('./pages/docs/fluid-hover/fluid-hover.page') },
  { path: 'docs/motion', title: 'Motion · Fluid Functionalism', loadComponent: () => import('./pages/docs/motion/motion.page') },
  { path: 'docs/reveal', title: 'Reveal · Fluid Functionalism', loadComponent: () => import('./pages/docs/reveal/reveal.page') },
  { path: 'docs/scrollbars', title: 'Scrollbars · Fluid Functionalism', loadComponent: () => import('./pages/docs/scrollbars/scrollbars.page') },
  { path: 'docs/sizes', title: 'Sizes · Fluid Functionalism', loadComponent: () => import('./pages/docs/sizes/sizes.page') },
  { path: 'docs/skill', title: 'Skill · Fluid Functionalism', loadComponent: () => import('./pages/docs/skill/skill.page') },
  { path: 'docs/surfaces', title: 'Surfaces · Fluid Functionalism', loadComponent: () => import('./pages/docs/surfaces/surfaces.page') },
  { path: 'docs/typography', title: 'Typography · Fluid Functionalism', loadComponent: () => import('./pages/docs/typography/typography.page') },
  { path: 'docs/accordion', title: 'Accordion · Fluid Functionalism', loadComponent: () => import('./pages/docs/accordion/accordion.page') },
  { path: 'docs/ask-user-questions', title: 'AskUserQuestions · Fluid Functionalism', loadComponent: () => import('./pages/docs/ask-user-questions/ask-user-questions.page') },
  { path: 'docs/badge', title: 'Badge · Fluid Functionalism', loadComponent: () => import('./pages/docs/badge/badge.page') },
  { path: 'docs/banner', title: 'Banner · Fluid Functionalism', loadComponent: () => import('./pages/docs/banner/banner.page') },
  { path: 'docs/button', title: 'Button · Fluid Functionalism', loadComponent: () => import('./pages/docs/button/button.page') },
  { path: 'docs/calendar', title: 'Calendar · Fluid Functionalism', loadComponent: () => import('./pages/docs/calendar/calendar.page') },
  { path: 'docs/card', title: 'Card · Fluid Functionalism', loadComponent: () => import('./pages/docs/card/card.page') },
  { path: 'docs/carousel-dots', title: 'CarouselDots · Fluid Functionalism', loadComponent: () => import('./pages/docs/carousel-dots/carousel-dots.page') },
  { path: 'docs/chat-message', title: 'ChatMessage · Fluid Functionalism', loadComponent: () => import('./pages/docs/chat-message/chat-message.page') },
  { path: 'docs/checkbox-group', title: 'CheckboxGroup · Fluid Functionalism', loadComponent: () => import('./pages/docs/checkbox-group/checkbox-group.page') },
  { path: 'docs/color-picker', title: 'ColorPicker · Fluid Functionalism', loadComponent: () => import('./pages/docs/color-picker/color-picker.page') },
  { path: 'docs/combobox', title: 'Combobox · Fluid Functionalism', loadComponent: () => import('./pages/docs/combobox/combobox.page') },
  { path: 'docs/command-menu', title: 'CommandMenu · Fluid Functionalism', loadComponent: () => import('./pages/docs/command-menu/command-menu.page') },
  { path: 'docs/date-picker', title: 'DatePicker · Fluid Functionalism', loadComponent: () => import('./pages/docs/date-picker/date-picker.page') },
  { path: 'docs/dialog', title: 'Dialog · Fluid Functionalism', loadComponent: () => import('./pages/docs/dialog/dialog.page') },
  { path: 'docs/dropdown', title: 'Dropdown · Fluid Functionalism', loadComponent: () => import('./pages/docs/dropdown/dropdown.page') },
  { path: 'docs/input-copy', title: 'InputCopy · Fluid Functionalism', loadComponent: () => import('./pages/docs/input-copy/input-copy.page') },
  { path: 'docs/input-group', title: 'InputGroup · Fluid Functionalism', loadComponent: () => import('./pages/docs/input-group/input-group.page') },
  { path: 'docs/input-message', title: 'InputMessage · Fluid Functionalism', loadComponent: () => import('./pages/docs/input-message/input-message.page') },
  { path: 'docs/radio-group', title: 'RadioGroup · Fluid Functionalism', loadComponent: () => import('./pages/docs/radio-group/radio-group.page') },
  { path: 'docs/select', title: 'Select · Fluid Functionalism', loadComponent: () => import('./pages/docs/select/select.page') },
  { path: 'docs/sidebar', title: 'Sidebar · Fluid Functionalism', loadComponent: () => import('./pages/docs/sidebar/sidebar.page') },
  { path: 'docs/slider', title: 'Slider · Fluid Functionalism', loadComponent: () => import('./pages/docs/slider/slider.page') },
  { path: 'docs/switch', title: 'Switch · Fluid Functionalism', loadComponent: () => import('./pages/docs/switch/switch.page') },
  { path: 'docs/table', title: 'Table · Fluid Functionalism', loadComponent: () => import('./pages/docs/table/table.page') },
  { path: 'docs/tabs', title: 'Tabs · Fluid Functionalism', loadComponent: () => import('./pages/docs/tabs/tabs.page') },
  { path: 'docs/tabs-subtle', title: 'TabsSubtle · Fluid Functionalism', loadComponent: () => import('./pages/docs/tabs-subtle/tabs-subtle.page') },
  { path: 'docs/thinking-indicator', title: 'ThinkingIndicator · Fluid Functionalism', loadComponent: () => import('./pages/docs/thinking-indicator/thinking-indicator.page') },
  { path: 'docs/thinking-steps', title: 'ThinkingSteps · Fluid Functionalism', loadComponent: () => import('./pages/docs/thinking-steps/thinking-steps.page') },
  { path: 'docs/tooltip', title: 'Tooltip · Fluid Functionalism', loadComponent: () => import('./pages/docs/tooltip/tooltip.page') },

  // Full-screen: no shell, no right panel.
  {
    path: 'demo',
    title: 'Demo · Fluid Functionalism',
    data: { shell: false },
    loadComponent: () => import('./pages/demo/demo.page'),
  },

  // Every route the previous showcase shipped, to its new page (D7).
  { path: 'foundations', redirectTo: 'docs/surfaces' },
  { path: 'fluid-hover', redirectTo: 'docs/fluid-hover' },
  { path: 'button', redirectTo: 'docs/button' },
  { path: 'badge', redirectTo: 'docs/badge' },
  { path: 'thinking-indicator', redirectTo: 'docs/thinking-indicator' },
  { path: 'card', redirectTo: 'docs/card' },
  { path: 'slider', redirectTo: 'docs/slider' },
  { path: 'tooltip', redirectTo: 'docs/tooltip' },
  { path: 'scroll-area', redirectTo: 'docs/scrollbars' },
  { path: 'file-thumbnail', redirectTo: 'docs/input-message' },
  { path: 'carousel-dots', redirectTo: 'docs/carousel-dots' },
  { path: 'radio-group', redirectTo: 'docs/radio-group' },
  { path: 'checkbox-group', redirectTo: 'docs/checkbox-group' },
  { path: 'input-group', redirectTo: 'docs/input-group' },
  { path: 'switch', redirectTo: 'docs/switch' },
  { path: 'accordion', redirectTo: 'docs/accordion' },
  { path: 'tabs', redirectTo: 'docs/tabs' },
  { path: 'tabs-subtle', redirectTo: 'docs/tabs-subtle' },
  { path: 'menu-item', redirectTo: 'docs/dropdown' },
  { path: 'dropdown-search', redirectTo: 'docs/dropdown' },
  { path: 'mobile-drawer', redirectTo: 'docs/sidebar' },
  { path: 'table', redirectTo: 'docs/table' },
  { path: 'banner', redirectTo: 'docs/banner' },
  { path: 'dialog', redirectTo: 'docs/dialog' },
  { path: 'input-copy', redirectTo: 'docs/input-copy' },
  { path: 'thinking-steps', redirectTo: 'docs/thinking-steps' },
  { path: 'chat-message', redirectTo: 'docs/chat-message' },
  { path: 'dropdown', redirectTo: 'docs/dropdown' },
  { path: 'select', redirectTo: 'docs/select' },
  { path: 'combobox', redirectTo: 'docs/combobox' },
  { path: 'calendar', redirectTo: 'docs/calendar' },
  { path: 'color-picker', redirectTo: 'docs/color-picker' },
  { path: 'ask-user-questions', redirectTo: 'docs/ask-user-questions' },
  { path: 'sidebar', redirectTo: 'docs/sidebar' },
  { path: 'command-menu', redirectTo: 'docs/command-menu' },
  { path: 'date-picker', redirectTo: 'docs/date-picker' },
  { path: 'input-message', redirectTo: 'docs/input-message' },
  { path: 'queued-stack', redirectTo: 'docs/input-message' },
  { path: 'dialog-sidebar', redirectTo: 'docs/dialog' },
  { path: 'sidebar-app', redirectTo: 'docs/sidebar' },

  // Everything else: "A little out of place." (S2). GitHub Pages serves this
  // app for unknown paths (the deploy copies index.html to 404.html).
  { path: '**', loadComponent: () => import('./shell/not-found/not-found.page') },
];
