// Every doc page's API reference, keyed by page slug. One module per page
// (docs-kit/api/<slug>.ts), ported from lib/docs/api/index.ts. Pages that
// show a PropsTable read their tables from here.
import type { ApiTable } from './types';
import { apiReference as accordionApi } from './accordion';
import { apiReference as askUserQuestionsApi } from './ask-user-questions';
import { apiReference as badgeApi } from './badge';
import { apiReference as bannerApi } from './banner';
import { apiReference as buttonApi } from './button';
import { apiReference as calendarApi } from './calendar';
import { apiReference as cardApi } from './card';
import { apiReference as carouselDotsApi } from './carousel-dots';
import { apiReference as chatMessageApi } from './chat-message';
import { apiReference as checkboxGroupApi } from './checkbox-group';
import { apiReference as colorPickerApi } from './color-picker';
import { apiReference as comboboxApi } from './combobox';
import { apiReference as commandMenuApi } from './command-menu';
import { apiReference as datePickerApi } from './date-picker';
import { apiReference as dialogApi } from './dialog';
import { apiReference as dropdownApi } from './dropdown';
import { apiReference as fluidHoverApi } from './fluid-hover';
import { apiReference as inputCopyApi } from './input-copy';
import { apiReference as inputGroupApi } from './input-group';
import { apiReference as inputMessageApi } from './input-message';
import { apiReference as radioGroupApi } from './radio-group';
import { apiReference as revealApi } from './reveal';
import { apiReference as scrollbarsApi } from './scrollbars';
import { apiReference as selectApi } from './select';
import { apiReference as sidebarApi } from './sidebar';
import { apiReference as sizesApi } from './sizes';
import { apiReference as sliderApi } from './slider';
import { apiReference as switchApi } from './switch';
import { apiReference as tableApi } from './table';
import { apiReference as tabsSubtleApi } from './tabs-subtle';
import { apiReference as tabsApi } from './tabs';
import { apiReference as thinkingIndicatorApi } from './thinking-indicator';
import { apiReference as thinkingStepsApi } from './thinking-steps';
import { apiReference as tooltipApi } from './tooltip';

export const API_REFERENCE: Record<string, ApiTable[]> = {
  'accordion': accordionApi,
  'ask-user-questions': askUserQuestionsApi,
  'badge': badgeApi,
  'banner': bannerApi,
  'button': buttonApi,
  'calendar': calendarApi,
  'card': cardApi,
  'carousel-dots': carouselDotsApi,
  'chat-message': chatMessageApi,
  'checkbox-group': checkboxGroupApi,
  'color-picker': colorPickerApi,
  'combobox': comboboxApi,
  'command-menu': commandMenuApi,
  'date-picker': datePickerApi,
  'dialog': dialogApi,
  'dropdown': dropdownApi,
  'fluid-hover': fluidHoverApi,
  'input-copy': inputCopyApi,
  'input-group': inputGroupApi,
  'input-message': inputMessageApi,
  'radio-group': radioGroupApi,
  'reveal': revealApi,
  'scrollbars': scrollbarsApi,
  'select': selectApi,
  'sidebar': sidebarApi,
  'sizes': sizesApi,
  'slider': sliderApi,
  'switch': switchApi,
  'table': tableApi,
  'tabs-subtle': tabsSubtleApi,
  'tabs': tabsApi,
  'thinking-indicator': thinkingIndicatorApi,
  'thinking-steps': thinkingStepsApi,
  'tooltip': tooltipApi,
};
