import { InjectionToken, type Provider, type Type, inject } from '@angular/core';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Brain,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Circle,
  Clock,
  Copy,
  CornerDownLeft,
  CornerDownRight,
  Dot,
  Ellipsis,
  EllipsisVertical,
  Folder,
  Globe,
  Heart,
  Home,
  Image,
  Inbox,
  Info,
  Lightbulb,
  Link,
  Loader,
  Lock,
  Mail,
  Menu,
  MessageCircle,
  Monitor,
  Moon,
  Paintbrush,
  Palette,
  PanelLeft,
  PanelRight,
  Pause,
  Pencil,
  Pipette,
  Play,
  Plus,
  RectangleHorizontal,
  Rocket,
  RotateCcw,
  Scaling,
  Search,
  Settings,
  Shield,
  SkipForward,
  SlidersHorizontal,
  SquareLibrary,
  Star,
  Sun,
  User,
  Users,
  X,
} from 'lucide';

// ---------------------------------------------------------------------------
// Components never import an icon directly: they look one up by the role it
// plays (`injectIcons()['chevron-down']`). That keeps the icon set swappable
// in one place, so an app on another library calls `provideIcons()` and
// every component follows. Lucide is the default and the only icon library
// this file depends on.
// ---------------------------------------------------------------------------

/** An SVG icon as a list of child elements: Lucide's vanilla format. */
export type IconNode = [tag: string, attrs: Record<string, string | number>][];

/**
 * SVG nodes plus how to frame them, for sets that differ from Lucide's 24×24
 * stroke frame: another viewBox, filled glyphs, a mirroring class, or a set
 * that switches weight with the stroke width (Phosphor light/regular).
 */
export interface IconFrame {
  /** Child nodes, or a function of the stroke width for weight-based sets. */
  nodes: IconNode | ((strokeWidth: number) => IconNode);
  /** Defaults to '0 0 24 24'. */
  viewBox?: string;
  /** Filled glyphs: `fill="currentColor"` and no stroke. */
  filled?: boolean;
  /** Extra classes on the <svg> (e.g. '-scale-x-100' to mirror a glyph). */
  class?: string;
}

/**
 * The whole contract an icon has to meet: SVG child nodes (rendered into a
 * 24×24 stroke <svg> by `<ff-icon>`), an `IconFrame`, or a component that
 * accepts the `size`, `strokeWidth` and `class` inputs and forwards them to
 * its <svg>. Components also animate stroke width through the class (1.5 → 2
 * on hover is a common cue); a filled icon set ignores it and simply loses
 * that cue.
 */
export type IconDefinition = IconNode | IconFrame | Type<unknown>;

// Names describe the role, not the glyph, so a library whose icon is called
// something else still fills the same slot (`more-horizontal` is Lucide's
// Ellipsis).
export type IconName =
  | 'chevron-right'
  | 'chevron-down'
  | 'pipette'
  | 'x'
  | 'copy'
  | 'menu'
  | 'dot'
  | 'monitor'
  | 'sun'
  | 'moon'
  | 'rectangle-horizontal'
  | 'circle'
  | 'square-library'
  | 'clock'
  | 'star'
  | 'settings'
  | 'plus'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'search'
  | 'loader'
  | 'users'
  | 'lock'
  | 'mail'
  | 'bell'
  | 'shield'
  | 'palette'
  | 'lightbulb'
  | 'rocket'
  | 'heart'
  | 'paintbrush'
  | 'brain'
  | 'globe'
  | 'user'
  | 'image'
  | 'link'
  | 'check'
  | 'rotate-ccw'
  | 'play'
  | 'pause'
  | 'home'
  | 'message-circle'
  | 'inbox'
  | 'pencil'
  | 'scaling'
  | 'skip-forward'
  | 'corner-down-right'
  | 'corner-down-left'
  | 'panel-left'
  | 'panel-right'
  | 'chevrons-up-down'
  | 'more-horizontal'
  | 'more-vertical'
  | 'calendar'
  | 'folder'
  | 'sliders-horizontal'
  | 'info';

export const defaultIcons: Record<IconName, IconDefinition> = {
  'chevron-right': ChevronRight as IconNode,
  'chevron-down': ChevronDown as IconNode,
  'pipette': Pipette as IconNode,
  'x': X as IconNode,
  'copy': Copy as IconNode,
  'menu': Menu as IconNode,
  'dot': Dot as IconNode,
  'monitor': Monitor as IconNode,
  'sun': Sun as IconNode,
  'moon': Moon as IconNode,
  'rectangle-horizontal': RectangleHorizontal as IconNode,
  'circle': Circle as IconNode,
  'square-library': SquareLibrary as IconNode,
  'clock': Clock as IconNode,
  'star': Star as IconNode,
  'settings': Settings as IconNode,
  'plus': Plus as IconNode,
  'arrow-left': ArrowLeft as IconNode,
  'arrow-right': ArrowRight as IconNode,
  'arrow-up': ArrowUp as IconNode,
  'arrow-down': ArrowDown as IconNode,
  'search': Search as IconNode,
  'loader': Loader as IconNode,
  'users': Users as IconNode,
  'lock': Lock as IconNode,
  'mail': Mail as IconNode,
  'bell': Bell as IconNode,
  'shield': Shield as IconNode,
  'palette': Palette as IconNode,
  'lightbulb': Lightbulb as IconNode,
  'rocket': Rocket as IconNode,
  'heart': Heart as IconNode,
  'paintbrush': Paintbrush as IconNode,
  'brain': Brain as IconNode,
  'globe': Globe as IconNode,
  'user': User as IconNode,
  'image': Image as IconNode,
  'link': Link as IconNode,
  'check': Check as IconNode,
  'rotate-ccw': RotateCcw as IconNode,
  'play': Play as IconNode,
  'pause': Pause as IconNode,
  'home': Home as IconNode,
  'message-circle': MessageCircle as IconNode,
  'inbox': Inbox as IconNode,
  'pencil': Pencil as IconNode,
  'scaling': Scaling as IconNode,
  'skip-forward': SkipForward as IconNode,
  'corner-down-right': CornerDownRight as IconNode,
  'corner-down-left': CornerDownLeft as IconNode,
  'panel-left': PanelLeft as IconNode,
  'panel-right': PanelRight as IconNode,
  'chevrons-up-down': ChevronsUpDown as IconNode,
  'more-horizontal': Ellipsis as IconNode,
  'more-vertical': EllipsisVertical as IconNode,
  'calendar': Calendar as IconNode,
  'folder': Folder as IconNode,
  'sliders-horizontal': SlidersHorizontal as IconNode,
  'info': Info as IconNode,
};

export const FF_ICONS = new InjectionToken<Record<IconName, IconDefinition>>('FF_ICONS', {
  factory: () => defaultIcons,
});

/**
 * Swap some or all icons for another library. Names left out keep their
 * default (Lucide) icon, so a partial map never leaves a component without one.
 */
export function provideIcons(icons: Partial<Record<IconName, IconDefinition>>): Provider {
  return { provide: FF_ICONS, useValue: { ...defaultIcons, ...icons } };
}

/** The full icon map. Falls back to the default (Lucide) set. */
export function injectIcons(): Record<IconName, IconDefinition> {
  return inject(FF_ICONS);
}
