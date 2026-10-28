export {
  CommandMenu,
  COMMAND_MENU_DIALOG,
  type CommandMenuDialogContext,
  type CommandMenuTab,
  type CommandMenuTabsHandle,
} from './command-menu';
export { CommandMenuInput } from './command-menu-input';
export { CommandMenuTabs, CommandMenuFilters } from './command-menu-tabs';
export {
  CommandMenuList,
  CommandMenuItem,
  CommandMenuRow,
  CommandMenuEmpty,
  COMMAND_MENU_ROW_INDEX,
  type CommandMenuRowContext,
} from './command-menu-list';
export { CommandMenuShortcut } from './command-menu-shortcut';
export { CommandMenuFooter, type CommandMenuHint } from './command-menu-footer';
export { CommandMenuDialog, type CommandMenuShortcutScope } from './command-menu-dialog';
export {
  defaultCommandMenuFilter,
  sectionRows,
  type CommandMenuFilter,
  type CommandMenuIcon,
  type CommandMenuItemData,
  type CommandMenuSection,
} from './items';
export {
  parseShortcut,
  matchesShortcut,
  hasModifier,
  formatShortcut,
  isMacPlatform,
  injectIsMac,
  COMMAND_MENU_IS_MAC,
  type ParsedShortcut,
} from './shortcut';

/** Every command menu part, for a component's `imports`. */
import { CommandMenu as _CommandMenu } from './command-menu';
import { CommandMenuInput as _CommandMenuInput } from './command-menu-input';
import { CommandMenuTabs as _CommandMenuTabs, CommandMenuFilters as _CommandMenuFilters } from './command-menu-tabs';
import {
  CommandMenuList as _CommandMenuList,
  CommandMenuItem as _CommandMenuItem,
  CommandMenuRow as _CommandMenuRow,
  CommandMenuEmpty as _CommandMenuEmpty,
} from './command-menu-list';
import { CommandMenuShortcut as _CommandMenuShortcut } from './command-menu-shortcut';
import { CommandMenuFooter as _CommandMenuFooter } from './command-menu-footer';
import { CommandMenuDialog as _CommandMenuDialog } from './command-menu-dialog';

export const COMMAND_MENU_PARTS = [
  _CommandMenu,
  _CommandMenuDialog,
  _CommandMenuInput,
  _CommandMenuTabs,
  _CommandMenuFilters,
  _CommandMenuList,
  _CommandMenuItem,
  _CommandMenuRow,
  _CommandMenuEmpty,
  _CommandMenuShortcut,
  _CommandMenuFooter,
] as const;
