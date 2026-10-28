// The site's icon-playground data: the multi-library map behind the "press I
// to cycle icon library" switcher and the right panel's Icons row. Ported from
// lib/docs/icon-map.tsx; the packs are the library's own generated sets, so a
// pack that leaves a slot out keeps the Lucide glyph there.

import {
  defaultIcons,
  hugeiconsIcons,
  phosphorIcons,
  tablerIcons,
  untitleduiIcons,
  type IconMap,
} from '@angel-r/fluid-functionalism-angular';

export type IconLibrary = 'lucide' | 'tabler' | 'phosphor' | 'hugeicons' | 'untitledui';

export const ICON_LIBRARY_ORDER: readonly IconLibrary[] = [
  'lucide',
  'tabler',
  'phosphor',
  'hugeicons',
  'untitledui',
];

export const ICON_LIBRARY_LABELS: Record<IconLibrary, string> = {
  lucide: 'Lucide',
  tabler: 'Tabler',
  phosphor: 'Phosphor',
  hugeicons: 'HugeIcons',
  untitledui: 'Untitled UI',
};

/** Each pack's overrides, merged over Lucide when it is installed. */
export const ICON_PACKS: Record<IconLibrary, Partial<IconMap>> = {
  lucide: {},
  tabler: tablerIcons,
  phosphor: phosphorIcons,
  hugeicons: hugeiconsIcons,
  untitledui: untitleduiIcons,
};

/** The full map one library resolves to. */
export function iconMapFor(library: IconLibrary): IconMap {
  return { ...defaultIcons, ...ICON_PACKS[library] };
}
