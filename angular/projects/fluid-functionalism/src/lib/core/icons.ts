import {
  InjectionToken,
  computed,
  inject,
  isSignal,
  type Provider,
  type Signal,
  type Type,
} from '@angular/core';
import { lucideIcons } from './lucide-icons';

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
  /**
   * Child nodes, or a function of the stroke width for weight-based sets
   * (`undefined` when the caller passes none).
   */
  nodes: IconNode | ((strokeWidth: number | undefined) => IconNode);
  /** Defaults to '0 0 24 24'. */
  viewBox?: string;
  /** Filled glyphs: `fill="currentColor"` and no stroke. */
  filled?: boolean;
  /** Extra classes on the <svg> (e.g. '-scale-x-100' to mirror a glyph). */
  class?: string;
  /**
   * The <svg> stroke-width when the caller passes none. Defaults to 2
   * (Lucide, Tabler); `null` leaves the attribute off, as the React Untitled UI
   * and Hugeicons components do, so the SVG default or per-node widths apply.
   */
  unsetStrokeWidth?: number | null;
}

/**
 * Nodes that keep their own stroke widths until the caller sets one, then
 * defer to the <svg>'s (Hugeicons: React's HugeiconsIcon only sets a stroke
 * when it is given one).
 */
export function perNodeStroke(nodes: IconNode): (strokeWidth: number | undefined) => IconNode {
  const stripped: IconNode = nodes.map(([tag, attrs]) => {
    const { ['stroke-width']: _, ...rest } = attrs;
    return [tag, rest];
  });
  return (strokeWidth) => (strokeWidth === undefined ? nodes : stripped);
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

export type IconMap = Record<IconName, IconDefinition>;

export const defaultIcons: IconMap = lucideIcons;

export const FF_ICONS = new InjectionToken<IconMap>('FF_ICONS', {
  factory: () => defaultIcons,
});

/** A map to read at render, or a signal (or getter) of one, so icons can
 *  change while the app runs. */
export type IconSource = Signal<Partial<IconMap>> | (() => Partial<IconMap>);

/**
 * The map `<ff-icon>` actually reads. It is a signal so a site can switch
 * icon packs at runtime: `provideIcons()` installs a constant one,
 * `provideIconsSource()` installs a live one. The default derives from
 * `FF_ICONS`, so providers that only call `provideIcons()` keep working.
 */
export const FF_ICON_SOURCE = new InjectionToken<Signal<IconMap>>('FF_ICON_SOURCE', {
  factory: () => {
    const icons = inject(FF_ICONS);
    return computed(() => icons);
  },
});

/**
 * Swap some or all icons for another library. Names left out keep their
 * default (Lucide) icon, so a partial map never leaves a component without one.
 */
export function provideIcons(icons: Partial<IconMap>): Provider {
  return { provide: FF_ICONS, useValue: { ...defaultIcons, ...icons } };
}

/**
 * Icons from a source that can change at runtime (the docs site's pack
 * switcher). Every `<ff-icon>` repaints when the source emits; names left out
 * keep whatever `provideIcons()` installed, then Lucide.
 */
export function provideIconsSource(source: IconSource): Provider {
  return {
    provide: FF_ICON_SOURCE,
    useFactory: () => {
      const read = isSignal(source) ? source : computed(source as () => Partial<IconMap>);
      const base = inject(FF_ICONS);
      return computed<IconMap>(() => ({ ...base, ...read() }));
    },
  };
}

/** The static icon map. Falls back to the default (Lucide) set. */
export function injectIcons(): IconMap {
  return inject(FF_ICONS);
}

/** The map components render from, as a signal. */
export function injectIconsSource(): Signal<IconMap> {
  return inject(FF_ICON_SOURCE);
}
