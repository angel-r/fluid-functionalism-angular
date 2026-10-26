import type { Type } from '@angular/core';

/**
 * One entry per showcase page. Each demo lives in `demos/<slug>/<slug>.demo.ts`
 * and default-exports its standalone component, so routes stay lazy.
 */
export interface DemoEntry {
  slug: string;
  title: string;
  group: 'Foundations' | 'Components' | 'Blocks';
  load: () => Promise<{ default: Type<unknown> }>;
}

export const demos: DemoEntry[] = [
  {
    slug: 'foundations',
    title: 'Foundations',
    group: 'Foundations',
    load: () => import('./foundations/foundations.demo'),
  },
  {
    slug: 'fluid-hover',
    title: 'Fluid hover',
    group: 'Foundations',
    load: () => import('./fluid-hover/fluid-hover.demo'),
  },
  {
    slug: 'button',
    title: 'Button',
    group: 'Components',
    load: () => import('./button/button.demo'),
  },
  {
    slug: 'badge',
    title: 'Badge',
    group: 'Components',
    load: () => import('./badge/badge.demo'),
  },
  {
    slug: 'thinking-indicator',
    title: 'Thinking indicator',
    group: 'Components',
    load: () => import('./thinking-indicator/thinking-indicator.demo'),
  },
  {
    slug: 'card',
    title: 'Card',
    group: 'Components',
    load: () => import('./card/card.demo'),
  },
  {
    slug: 'slider',
    title: 'Slider',
    group: 'Components',
    load: () => import('./slider/slider.demo'),
  },
  {
    slug: 'tooltip',
    title: 'Tooltip',
    group: 'Components',
    load: () => import('./tooltip/tooltip.demo'),
  },
  {
    slug: 'scroll-area',
    title: 'Scroll area',
    group: 'Components',
    load: () => import('./scroll-area/scroll-area.demo'),
  },
  {
    slug: 'file-thumbnail',
    title: 'File thumbnail',
    group: 'Components',
    load: () => import('./file-thumbnail/file-thumbnail.demo'),
  },
  {
    slug: 'carousel-dots',
    title: 'Carousel dots',
    group: 'Components',
    load: () => import('./carousel-dots/carousel-dots.demo'),
  },
  {
    slug: 'radio-group',
    title: 'Radio group',
    group: 'Components',
    load: () => import('./radio-group/radio-group.demo'),
  },
  {
    slug: 'checkbox-group',
    title: 'Checkbox group',
    group: 'Components',
    load: () => import('./checkbox-group/checkbox-group.demo'),
  },
  {
    slug: 'input-group',
    title: 'Input group',
    group: 'Components',
    load: () => import('./input-group/input-group.demo'),
  },
  {
    slug: 'switch',
    title: 'Switch',
    group: 'Components',
    load: () => import('./switch/switch.demo'),
  },
  {
    slug: 'accordion',
    title: 'Accordion',
    group: 'Components',
    load: () => import('./accordion/accordion.demo'),
  },
  {
    slug: 'tabs',
    title: 'Tabs',
    group: 'Components',
    load: () => import('./tabs/tabs.demo'),
  },
  {
    slug: 'tabs-subtle',
    title: 'Tabs subtle',
    group: 'Components',
    load: () => import('./tabs-subtle/tabs-subtle.demo'),
  },
  {
    slug: 'menu-item',
    title: 'Menu item',
    group: 'Components',
    load: () => import('./menu-item/menu-item.demo'),
  },
  {
    slug: 'dropdown-search',
    title: 'Dropdown search',
    group: 'Components',
    load: () => import('./dropdown-search/dropdown-search.demo'),
  },
  {
    slug: 'mobile-drawer',
    title: 'Mobile drawer',
    group: 'Components',
    load: () => import('./mobile-drawer/mobile-drawer.demo'),
  },
  {
    slug: 'table',
    title: 'Table',
    group: 'Components',
    load: () => import('./table/table.demo'),
  },
  {
    slug: 'banner',
    title: 'Banner',
    group: 'Components',
    load: () => import('./banner/banner.demo'),
  },
  {
    slug: 'dialog',
    title: 'Dialog',
    group: 'Components',
    load: () => import('./dialog/dialog.demo'),
  },
  {
    slug: 'input-copy',
    title: 'Input copy',
    group: 'Components',
    load: () => import('./input-copy/input-copy.demo'),
  },
  {
    slug: 'thinking-steps',
    title: 'Thinking steps',
    group: 'Components',
    load: () => import('./thinking-steps/thinking-steps.demo'),
  },
  {
    slug: 'chat-message',
    title: 'Chat message',
    group: 'Components',
    load: () => import('./chat-message/chat-message.demo'),
  },
  {
    slug: 'dropdown',
    title: 'Dropdown',
    group: 'Components',
    load: () => import('./dropdown/dropdown.demo'),
  },
  {
    slug: 'select',
    title: 'Select',
    group: 'Components',
    load: () => import('./select/select.demo'),
  },
  {
    slug: 'combobox',
    title: 'Combobox',
    group: 'Components',
    load: () => import('./combobox/combobox.demo'),
  },
  {
    slug: 'calendar',
    title: 'Calendar',
    group: 'Components',
    load: () => import('./calendar/calendar.demo'),
  },
  {
    slug: 'color-picker',
    title: 'Color picker',
    group: 'Components',
    load: () => import('./color-picker/color-picker.demo'),
  },
  {
    slug: 'ask-user-questions',
    title: 'Ask user questions',
    group: 'Components',
    load: () => import('./ask-user-questions/ask-user-questions.demo'),
  },
  {
    slug: 'sidebar',
    title: 'Sidebar',
    group: 'Components',
    load: () => import('./sidebar/sidebar.demo'),
  },
  {
    slug: 'command-menu',
    title: 'Command menu',
    group: 'Components',
    load: () => import('./command-menu/command-menu.demo'),
  },
  {
    slug: 'date-picker',
    title: 'Date picker',
    group: 'Components',
    load: () => import('./date-picker/date-picker.demo'),
  },
  {
    slug: 'input-message',
    title: 'Input message',
    group: 'Components',
    load: () => import('./input-message/input-message.demo'),
  },
  {
    slug: 'queued-stack',
    title: 'Queued stack',
    group: 'Blocks',
    load: () => import('./queued-stack/queued-stack.demo'),
  },
  {
    slug: 'dialog-sidebar',
    title: 'Dialog sidebar',
    group: 'Blocks',
    load: () => import('./dialog-sidebar/dialog-sidebar.demo'),
  },
  {
    slug: 'sidebar-app',
    title: 'Sidebar app',
    group: 'Blocks',
    load: () => import('./sidebar-app/sidebar-app.demo'),
  },
];
