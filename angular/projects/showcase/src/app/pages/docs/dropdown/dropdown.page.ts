import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  Button,
  Dropdown,
  DropdownContent,
  DropdownEmpty,
  DropdownLabel,
  DropdownMenu,
  DropdownSearch,
  DropdownSeparator,
  DropdownSub,
  DropdownSubContent,
  DropdownSubTrigger,
  DropdownTrigger,
  MenuItem,
  Switch,
  type IconName,
} from '@angel-r/fluid-functionalism-angular';
import { API_REFERENCE } from '../../../docs-kit/api';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import {
  PLAY_SWITCH,
  PlayDivider,
  PlayField,
  PlaySection,
  PlaySelect,
  PlaygroundLayout,
  PlaygroundPanel,
} from '../../../docs-kit/playground';
import { GetCodeDialog } from '../../../docs-kit/preset/get-code-dialog';
import { injectPresetGlobals } from '../../../docs-kit/preset/preset-globals';
import { usePresetUrl } from '../../../docs-kit/preset/preset-url';
import { PropsTable } from '../../../docs-kit/props-table';
import {
  DEFAULT_DROPDOWN_STATE,
  DROPDOWN_CREATED_ICON,
  DROPDOWN_DEFAULT_CODE,
  DROPDOWN_DEFAULT_PICKED,
  DROPDOWN_DEFAULT_SELECTED,
  DROPDOWN_DEFAULT_THEME,
  DROPDOWN_DISABLED_LABEL,
  DROPDOWN_GROUPS,
  DROPDOWN_ITEMS,
  DROPDOWN_PRESET_DEF,
  DROPDOWN_SUBMENU_LABEL,
  DROPDOWN_THEMES,
  decodeDropdownPreset,
  deriveDropdown,
  encodeDropdownPreset,
  type DropdownItem,
  type DropdownPlayState,
} from './dropdown-preset';

const PACKAGE = '@angel-r/fluid-functionalism-angular';

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const VIEWS: readonly { icon: IconName; label: string }[] = [
  { icon: 'square-library', label: 'Teamspaces' },
  { icon: 'clock', label: 'Recents' },
  { icon: 'star', label: 'Favorites' },
  { icon: 'users', label: 'Shared' },
  { icon: 'lock', label: 'Private' },
];

const FOLDERS: readonly string[] = ['Inbox', 'Design', 'Engineering', 'Marketing', 'Archive'];

const STATUSES: readonly string[] = ['Open', 'In progress', 'In review', 'Blocked', 'Done', 'Archived'];

const COMPONENTS: readonly string[] = [
  'Accordion',
  'Badge',
  'Button',
  'Card',
  'CheckboxGroup',
  'ColorPicker',
  'Combobox',
  'Dialog',
  'Dropdown',
  'InputGroup',
  'RadioGroup',
  'Select',
  'Sidebar',
  'Slider',
  'Switch',
  'Table',
  'Tabs',
];

const LABELS: readonly string[] = [
  'Bug',
  'Feature',
  'Docs',
  'Design',
  'Performance',
  'Accessibility',
  'Refactor',
  'Testing',
  'Infrastructure',
  'Security',
  'Good first issue',
  'Help wanted',
];

const LANGUAGES: readonly string[] = [
  'Auto detect',
  'Albanian (Albania)',
  'Arabic',
  'Bengali',
  'Chinese (Simplified)',
  'Chinese (Traditional)',
  'Czech',
  'Danish',
  'Dutch',
  'English (UK)',
  'English (US)',
  'Finnish',
  'French',
  'German',
  'Greek',
  'Hebrew',
  'Hindi',
  'Hungarian',
  'Indonesian',
  'Italian',
  'Japanese',
  'Korean',
  'Norwegian',
  'Polish',
  'Portuguese (Brazil)',
  'Portuguese (Portugal)',
  'Romanian',
  'Russian',
  'Spanish',
  'Swedish',
  'Thai',
  'Turkish',
  'Ukrainian',
  'Vietnamese',
];

const matching = (list: readonly string[], query: string): string[] =>
  list.filter((item) => item.toLowerCase().includes(query.toLowerCase()));

const toggled = <T,>(list: readonly T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

const INSTALL_USAGE = `<ff-dropdown-menu>
  <button ffButton ffDropdownTrigger variant="ghost">Open menu</button>
  <ff-dropdown-content [checkedIndex]="view">
    <ff-menu-item [index]="0" icon="mail" label="Email" />
    <ff-menu-item [index]="1" icon="bell" label="Notifications" />
  </ff-dropdown-content>
</ff-dropdown-menu>`;

const INSTALL_PROPS: readonly string[] = [
  'checkedIndex: single selection; the checked row draws a check and the menu keeps its place.',
  'checkedIndices: multiple selection; rows become checkboxes and keep the menu open.',
  'MenuItem index: the row position inside its popup (or inline panel); rows register in that order.',
  'MenuItem closeOnClick: whether activating the row closes the popup.',
  'DropdownSearch value: the query, two-way with [(value)]; filter the rows you render.',
];

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const basicCode = `import { signal } from '@angular/core';
import { Dropdown, MenuItem } from '${PACKAGE}';

const ITEMS = [
  { icon: 'square-library', label: 'Teamspaces' },
  { icon: 'clock', label: 'Recents' },
  { icon: 'star', label: 'Favorites' },
  { icon: 'users', label: 'Shared' },
  { icon: 'lock', label: 'Private' },
];
protected readonly selected = signal<number | null>(0);

<ff-dropdown aria-label="Views" [checkedIndex]="selected() === null ? undefined : selected()">
  @for (item of ITEMS; track item.label; let i = $index) {
    <ff-menu-item
      [index]="i"
      [icon]="item.icon"
      [label]="item.label"
      [checked]="selected() === i"
      (select)="selected.set(selected() === i ? null : i)"
    />
  }
</ff-dropdown>`;

const groupsCode = `import { Dropdown, DropdownLabel, DropdownSeparator, MenuItem } from '${PACKAGE}';

<ff-dropdown aria-label="Settings">
  <ff-dropdown-label>Account</ff-dropdown-label>
  <ff-menu-item [index]="0" icon="mail" label="Email" />
  <ff-menu-item [index]="1" icon="bell" label="Notifications" />
  <ff-menu-item [index]="2" icon="shield" label="Privacy" />
  <ff-dropdown-separator />
  <ff-dropdown-label>Appearance</ff-dropdown-label>
  <ff-menu-item [index]="3" icon="settings" label="General" />
  <ff-menu-item [index]="4" icon="palette" label="Theme" />
  <ff-menu-item [index]="5" icon="monitor" label="Display" />
</ff-dropdown>`;

const triggeredCode = `import { signal } from '@angular/core';
import { Button, DropdownMenu, DropdownTrigger, DropdownContent, MenuItem } from '${PACKAGE}';

const ITEMS = [
  { icon: 'square-library', label: 'Teamspaces' },
  { icon: 'clock', label: 'Recents' },
  { icon: 'star', label: 'Favorites' },
  { icon: 'users', label: 'Shared' },
  { icon: 'lock', label: 'Private' },
];
protected readonly view = signal(0);

<ff-dropdown-menu>
  <button ffButton ffDropdownTrigger variant="ghost">Open menu</button>
  <ff-dropdown-content [checkedIndex]="view()">
    @for (item of ITEMS; track item.label; let i = $index) {
      <ff-menu-item
        [index]="i"
        [icon]="item.icon"
        [label]="item.label"
        [checked]="view() === i"
        (select)="view.set(i)"
      />
    }
  </ff-dropdown-content>
</ff-dropdown-menu>`;

const submenuCode = `import {
  Button, DropdownMenu, DropdownTrigger, DropdownContent,
  DropdownSub, DropdownSubTrigger, DropdownSubContent, MenuItem,
} from '${PACKAGE}';

const FOLDERS = ['Inbox', 'Design', 'Engineering', 'Marketing', 'Archive'];

<ff-dropdown-menu>
  <button ffButton ffDropdownTrigger variant="ghost">Q3 report.pdf</button>
  <ff-dropdown-content>
    <ff-dropdown-sub>
      <ff-dropdown-sub-trigger [index]="0" icon="folder" label="Move to" />
      <ff-dropdown-sub-content>
        @for (folder of FOLDERS; track folder; let i = $index) {
          <ff-menu-item [index]="i" [label]="folder" (select)="move(folder)" />
        }
      </ff-dropdown-sub-content>
    </ff-dropdown-sub>
    <ff-dropdown-sub>
      <ff-dropdown-sub-trigger [index]="1" icon="link" label="Share" />
      <ff-dropdown-sub-content>
        <ff-menu-item [index]="0" icon="link" label="Copy link" (select)="copyLink()" />
        <ff-menu-item [index]="1" icon="mail" label="Email" (select)="email()" />
      </ff-dropdown-sub-content>
    </ff-dropdown-sub>
    <ff-menu-item [index]="2" icon="pencil" label="Rename" (select)="rename()" />
  </ff-dropdown-content>
</ff-dropdown-menu>`;

const multipleCode = `import { signal } from '@angular/core';
import { Button, DropdownMenu, DropdownTrigger, DropdownContent, MenuItem } from '${PACKAGE}';

const STATUSES = ['Open', 'In progress', 'In review', 'Blocked', 'Done', 'Archived'];

protected readonly checked = signal<number[]>([0, 1, 2]);

protected toggle(index: number) {
  this.checked.update((prev) =>
    prev.includes(index) ? prev.filter((x) => x !== index) : [...prev, index],
  );
}

<!-- checkedIndices turns rows into checkbox items that keep the menu open,
     and contiguous checked rows share one merged background. -->
<ff-dropdown-menu>
  <button ffButton ffDropdownTrigger variant="ghost">Status</button>
  <ff-dropdown-content [checkedIndices]="checked()">
    @for (status of STATUSES; track status; let i = $index) {
      <ff-menu-item
        [index]="i"
        [label]="status"
        [checked]="checked().includes(i)"
        (select)="toggle(i)"
      />
    }
  </ff-dropdown-content>
</ff-dropdown-menu>`;

const searchableCode = `import { computed, signal } from '@angular/core';
import {
  Button, DropdownMenu, DropdownTrigger, DropdownContent,
  DropdownSearch, DropdownEmpty, MenuItem,
} from '${PACKAGE}';

const LANGUAGES = ['Auto detect', 'Albanian (Albania)', 'Arabic', 'Bengali', /* … */];
protected readonly language = signal('Auto detect');
protected readonly query = signal('');

// Filter the rows you render; the popup re-indexes from 0 each time.
protected readonly matches = computed(() =>
  LANGUAGES.filter((l) => l.toLowerCase().includes(this.query().toLowerCase())),
);

<ff-dropdown-menu>
  <button ffButton ffDropdownTrigger variant="ghost" trailingIcon="chevron-down">
    {{ language() }}
  </button>
  <ff-dropdown-content [checkedIndex]="matches().indexOf(language())">
    <ff-dropdown-search [(value)]="query" placeholder="Search languages" />
    @for (l of matches(); track l; let i = $index) {
      <ff-menu-item [index]="i" [label]="l" [checked]="language() === l" (select)="language.set(l)" />
    }
    @if (matches().length === 0) {
      <ff-dropdown-empty>No languages found</ff-dropdown-empty>
    }
  </ff-dropdown-content>
</ff-dropdown-menu>`;

const searchableMultipleCode = `import { computed, signal } from '@angular/core';
import {
  Button, DropdownMenu, DropdownTrigger, DropdownContent,
  DropdownSearch, DropdownEmpty, MenuItem,
} from '${PACKAGE}';

const LABELS = ['Bug', 'Feature', 'Docs', 'Design', 'Performance', /* … */];
protected readonly labels = signal<string[]>(['Bug', 'Design']);
protected readonly query = signal('');
protected readonly matches = computed(() =>
  LABELS.filter((l) => l.toLowerCase().includes(this.query().toLowerCase())),
);
// Both checked rows and indices are read off the FILTERED list.
protected readonly checkedIndices = computed(() =>
  this.matches().flatMap((l, i) => (this.labels().includes(l) ? [i] : [])),
);
protected toggle(label: string) {
  this.labels.update((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]));
}

<ff-dropdown-menu>
  <button ffButton ffDropdownTrigger variant="ghost">Labels · {{ labels().length }}</button>
  <ff-dropdown-content [checkedIndices]="checkedIndices()">
    <ff-dropdown-search [(value)]="query" placeholder="Search labels" />
    @for (l of matches(); track l; let i = $index) {
      <ff-menu-item
        [index]="i"
        [label]="l"
        [checked]="labels().includes(l)"
        (select)="toggle(l)"
      />
    }
    @if (matches().length === 0) {
      <ff-dropdown-empty>No labels found</ff-dropdown-empty>
    }
  </ff-dropdown-content>
</ff-dropdown-menu>`;

const creatableCode = `import { computed, signal } from '@angular/core';
import {
  Button, DropdownMenu, DropdownTrigger, DropdownContent,
  DropdownSearch, DropdownEmpty, MenuItem,
} from '${PACKAGE}';

// The library's own components; a created row joins them.
protected readonly components = signal(['Accordion', 'Badge', 'Button', /* … */]);
protected readonly used = signal<string[]>(['Button', 'Combobox']);
protected readonly query = signal('');
protected readonly matches = computed(() =>
  this.components().filter((c) => c.toLowerCase().includes(this.query().toLowerCase())),
);
protected readonly checkedIndices = computed(() =>
  this.matches().flatMap((c, i) => (this.used().includes(c) ? [i] : [])),
);

// A create row while the query matches no label exactly. Last, after the
// real matches, so ↑ from the search field reaches it in one press.
protected readonly canCreate = computed(() => {
  const query = this.query().trim();
  return query !== '' && !this.components().some((c) => c.toLowerCase() === query.toLowerCase());
});

<ff-dropdown-menu>
  <button ffButton ffDropdownTrigger variant="ghost">Components · {{ used().length }}</button>
  <ff-dropdown-content [checkedIndices]="checkedIndices()">
    <ff-dropdown-search [(value)]="query" placeholder="Search components" />
    @for (c of matches(); track c; let i = $index) {
      <ff-menu-item
        [index]="i"
        [label]="c"
        [checked]="used().includes(c)"
        (select)="toggle(c)"
      />
    }
    @if (canCreate()) {
      <ff-menu-item
        [index]="matches().length"
        icon="plus"
        [label]="'Create “' + query().trim() + '”'"
        [closeOnClick]="false"
        (select)="create()"
      />
    }
    @if (matches().length === 0 && !canCreate()) {
      <ff-dropdown-empty>No components found</ff-dropdown-empty>
    }
  </ff-dropdown-content>
</ff-dropdown-menu>`;

// ---------------------------------------------------------------------------
// Playground code, rebuilt from the rail's state
// ---------------------------------------------------------------------------

function buildDropdownCode(state: DropdownPlayState): string {
  const derived = deriveDropdown(state);
  const isMenu = state.mode === 'menu';
  const iconAttr = (icon: string) => (state.icons ? ` icon="${icon}"` : '');
  const row = (label: string, index: number, icon: string): string => {
    const disabled = state.disabledRow && label === DROPDOWN_DISABLED_LABEL ? ' disabled' : '';
    const selection =
      state.selection === 'single'
        ? ` [checked]="selected() === '${label}'" (select)="selected.set('${label}')"`
        : state.selection === 'multiple'
          ? ` [checked]="picked().includes('${label}')" (select)="toggle('${label}')"`
          : '';
    return `<ff-menu-item [index]="${index}"${iconAttr(icon)} label="${label}"${disabled}${selection} />`;
  };
  const subRow = (index: number, icon: string): string[] => [
    '<ff-dropdown-sub>',
    `  <ff-dropdown-sub-trigger [index]="${index}"${iconAttr(icon)} label="${DROPDOWN_SUBMENU_LABEL}" />`,
    '  <ff-dropdown-sub-content [checkedIndex]="THEMES.indexOf(theme())">',
    ...DROPDOWN_THEMES.map(
      (theme, i) =>
        `    <ff-menu-item [index]="${i}"${iconAttr(theme.icon)} label="${theme.label}" [checked]="theme() === '${theme.label}'" (select)="theme.set('${theme.label}')" />`,
    ),
    '  </ff-dropdown-sub-content>',
    '</ff-dropdown-sub>',
  ];
  const subAt = DROPDOWN_ITEMS.findIndex((item) => item.label === DROPDOWN_SUBMENU_LABEL);
  const anyRow = (label: string, index: number, icon: string): string[] =>
    derived.submenu && label === DROPDOWN_SUBMENU_LABEL ? subRow(index, icon) : [row(label, index, icon)];
  const rows = derived.groups
    ? [
        '<ff-dropdown-label>Account</ff-dropdown-label>',
        ...DROPDOWN_ITEMS.slice(0, 3).flatMap((item, i) => anyRow(item.label, i, item.icon)),
        '<ff-dropdown-separator />',
        '<ff-dropdown-label>Appearance</ff-dropdown-label>',
        ...DROPDOWN_ITEMS.slice(3).flatMap((item, i) => anyRow(item.label, i + 3, item.icon)),
      ]
    : derived.submenu
      ? [
          // Rows up to the submenu, abridged, then the submenu and the rest.
          ...DROPDOWN_ITEMS.slice(0, 2).map((item, i) => row(item.label, i, item.icon)),
          `<!-- …${subAt - 2} more -->`,
          ...DROPDOWN_ITEMS.slice(subAt).flatMap((item, i) => anyRow(item.label, subAt + i, item.icon)),
        ]
      : [
          ...DROPDOWN_ITEMS.slice(0, 3).map((item, i) => row(item.label, i, item.icon)),
          '<!-- …3 more -->',
        ];

  const container =
    state.selection === 'single'
      ? ' [checkedIndex]="checkedIndex() === -1 ? undefined : checkedIndex()"'
      : state.selection === 'multiple'
        ? ' [checkedIndices]="checkedIndices()"'
        : '';

  const lines: string[] = [];
  lines.push(`import { computed, signal } from '@angular/core';`);
  lines.push(`import {`);
  const parts = isMenu
    ? [
        'Button',
        'DropdownMenu',
        'DropdownTrigger',
        'DropdownContent',
        ...(derived.search ? ['DropdownSearch', 'DropdownEmpty'] : []),
        ...(derived.groups ? ['DropdownLabel', 'DropdownSeparator'] : []),
        ...(derived.submenu ? ['DropdownSub', 'DropdownSubTrigger', 'DropdownSubContent'] : []),
        'MenuItem',
      ]
    : [
        'Dropdown',
        ...(derived.groups ? ['DropdownLabel', 'DropdownSeparator'] : []),
        'MenuItem',
      ];
  lines.push(`  ${parts.join(',\n  ')},`);
  lines.push(`} from '${PACKAGE}';`);
  lines.push('');
  lines.push('const ITEMS = [');
  for (const item of DROPDOWN_ITEMS) {
    lines.push(`  { icon: '${item.icon}', label: '${item.label}', group: '${item.group}' },`);
  }
  lines.push('];');
  if (derived.submenu) {
    lines.push(`const THEMES = [${DROPDOWN_THEMES.map((theme) => `'${theme.label}'`).join(', ')}];`);
  }
  lines.push('');

  if (derived.search) {
    lines.push(`protected readonly query = signal('');`);
    if (derived.creatable) lines.push('protected readonly items = signal(ITEMS);');
    lines.push(
      `protected readonly rows = computed(() => ${derived.creatable ? 'this.items()' : 'ITEMS'}.filter((row) => row.label.toLowerCase().includes(this.query().toLowerCase())));`,
    );
    if (derived.creatable) {
      lines.push('protected readonly canCreate = computed(() => {');
      lines.push('  const query = this.query().trim();');
      lines.push(
        '  return query !== "" && !this.items().some((row) => row.label.toLowerCase() === query.toLowerCase());',
      );
      lines.push('});');
    }
  }
  if (!derived.search && state.selection !== 'none') {
    lines.push('protected readonly rows = ITEMS;');
  }
  if (state.selection === 'single') {
    lines.push(`protected readonly selected = signal<string | null>('${DROPDOWN_DEFAULT_SELECTED}');`);
    lines.push('protected readonly checkedIndex = computed(() => this.rows().findIndex((row) => row.label === this.selected()));');
    if (isMenu) lines.push('protected readonly triggerLabel = computed(() => this.selected() ?? \'Choose\');');
  } else if (state.selection === 'multiple') {
    lines.push(
      `protected readonly picked = signal<string[]>([${DROPDOWN_DEFAULT_PICKED.map((label) => `'${label}'`).join(', ')}]);`,
    );
    lines.push('protected readonly checkedIndices = computed(() => this.rows().flatMap((row, i) => (this.picked().includes(row.label) ? [i] : [])));');
    if (isMenu) lines.push('protected readonly triggerLabel = computed(() => `Filters · ${this.picked().length}`);');
    lines.push('');
    lines.push('protected toggle(label: string) {');
    lines.push('  this.picked.update((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]));');
    lines.push('}');
  }
  if (derived.submenu) {
    lines.push('');
    lines.push(`protected readonly theme = signal('${DROPDOWN_DEFAULT_THEME}');`);
  }
  lines.push('');

  const indent = (block: readonly string[], spaces: number): string[] =>
    block.map((line) => `${' '.repeat(spaces)}${line}`);

  const search = derived.search
    ? ['<ff-dropdown-search [(value)]="query" placeholder="Search…" />']
    : [];
  const create = derived.creatable
    ? [
        '@if (canCreate()) {',
        '  <ff-menu-item',
        '    [index]="rows().length"',
        ...(state.icons ? ['    icon="plus"'] : []),
        '    [label]="\'Create “\' + query().trim() + \'”\'"',
        ...(state.selection === 'multiple' ? ['    [closeOnClick]="false"'] : []),
        '    (select)="createFromQuery()"',
        '  />',
        '}',
      ]
    : [];
  const empty = derived.search
    ? [`@if (rows().length === 0${derived.creatable ? ' && !canCreate()' : ''}) {`, '  <ff-dropdown-empty>No results.</ff-dropdown-empty>', '}']
    : [];

  if (!isMenu) {
    lines.push(`<ff-dropdown aria-label="Settings"${container}>`);
    lines.push(...indent(rows, 2));
    lines.push('</ff-dropdown>');
    return lines.join('\n');
  }
  lines.push('<ff-dropdown-menu>');
  if (state.selection === 'none') {
    lines.push('  <button ffButton ffDropdownTrigger variant="ghost" trailingIcon="chevron-down">Open menu</button>');
  } else {
    lines.push('  <button ffButton ffDropdownTrigger variant="ghost" trailingIcon="chevron-down">');
    lines.push('    {{ triggerLabel() }}');
    lines.push('  </button>');
  }
  lines.push(`  <ff-dropdown-content${container}>`);
  lines.push(...indent([...search, ...rows, ...create, ...empty], 4));
  lines.push('  </ff-dropdown-content>');
  lines.push('</ff-dropdown-menu>');
  return lines.join('\n');
}

interface PlayRow {
  key: string;
  item?: DropdownItem;
  index?: number;
  group?: string;
  separator?: boolean;
}

@Component({
  selector: 'app-dropdown-page',
  imports: [
    DocPage,
    DocSection,
    ComponentPreview,
    PropsTable,
    PlaygroundLayout,
    PlaygroundPanel,
    PlayField,
    PlaySelect,
    PlaySection,
    PlayDivider,
    GetCodeDialog,
    Switch,
    Button,
    Dropdown,
    DropdownMenu,
    DropdownTrigger,
    DropdownContent,
    DropdownSub,
    DropdownSubTrigger,
    DropdownSubContent,
    DropdownSearch,
    DropdownEmpty,
    DropdownLabel,
    DropdownSeparator,
    MenuItem,
  ],
  templateUrl: './dropdown.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DropdownPage {
  protected readonly presetDef = DROPDOWN_PRESET_DEF;
  protected readonly playSwitch = PLAY_SWITCH;
  protected readonly api = API_REFERENCE['dropdown'];
  protected readonly installUsage = INSTALL_USAGE;
  protected readonly installProps = INSTALL_PROPS;

  protected readonly basicCode = basicCode;
  protected readonly groupsCode = groupsCode;
  protected readonly triggeredCode = triggeredCode;
  protected readonly submenuCode = submenuCode;
  protected readonly multipleCode = multipleCode;
  protected readonly searchableCode = searchableCode;
  protected readonly searchableMultipleCode = searchableMultipleCode;
  protected readonly creatableCode = creatableCode;

  protected readonly items = VIEWS;
  protected readonly folders = FOLDERS;
  protected readonly statuses = STATUSES;
  protected readonly themes = DROPDOWN_THEMES;
  protected readonly submenuLabel = DROPDOWN_SUBMENU_LABEL;
  protected readonly disabledLabel = DROPDOWN_DISABLED_LABEL;
  protected readonly createdIcon = DROPDOWN_CREATED_ICON;
  protected readonly modes = [
    { value: 'menu', label: 'Menu' },
    { value: 'inline', label: 'Inline panel' },
  ];
  protected readonly selections = [
    { value: 'single', label: 'Single' },
    { value: 'multiple', label: 'Multiple' },
    { value: 'none', label: 'Actions' },
  ];

  // ── Demo state ──
  protected readonly selected = signal<number | null>(0);
  protected readonly view = signal(0);
  /** `checkedIndex` takes a number; a cleared single pick is no index. */
  protected readonly checkedView = computed(() => this.selected() ?? undefined);
  protected readonly language = signal('Auto detect');
  protected readonly query = signal('');
  protected readonly languageMatches = computed(() => matching(LANGUAGES, this.query()));

  protected readonly statusesChecked = signal<number[]>([0, 1, 2]);

  protected readonly labels = signal<string[]>(['Bug', 'Design']);
  protected readonly labelQuery = signal('');
  protected readonly labelMatches = computed(() => matching(LABELS, this.labelQuery()));
  protected readonly labelChecked = computed(() =>
    this.labelMatches().flatMap((label, i) => (this.labels().includes(label) ? [i] : [])),
  );

  protected readonly components = signal<string[]>([...COMPONENTS]);
  protected readonly used = signal<string[]>(['Button', 'Combobox']);
  protected readonly componentQuery = signal('');
  protected readonly componentMatches = computed(() => matching(this.components(), this.componentQuery()));
  protected readonly usedChecked = computed(() =>
    this.componentMatches().flatMap((component, i) => (this.used().includes(component) ? [i] : [])),
  );
  protected readonly componentQueryText = computed(() => this.componentQuery().trim());
  protected readonly canCreateComponent = computed(
    () =>
      this.componentQueryText() !== '' &&
      !this.components().some((component) => component.toLowerCase() === this.componentQueryText().toLowerCase()),
  );

  protected toggleStatus(index: number): void {
    this.statusesChecked.update((prev) => toggled(prev, index));
  }

  protected toggleLabel(label: string): void {
    this.labels.update((prev) => toggled(prev, label));
  }

  protected toggleUsed(component: string): void {
    this.used.update((prev) => toggled(prev, component));
  }

  protected createComponent(): void {
    const label = this.componentQueryText();
    this.components.update((prev) => [...prev, label]);
    this.toggleUsed(label);
    this.componentQuery.set('');
  }

  // ── Playground ──
  protected readonly playground = signal<DropdownPlayState>({ ...DEFAULT_DROPDOWN_STATE });
  protected readonly derived = computed(() => deriveDropdown(this.playground()));
  protected readonly playgroundSelected = signal<string | null>(DROPDOWN_DEFAULT_SELECTED);
  protected readonly picked = signal<string[]>([...DROPDOWN_DEFAULT_PICKED]);
  protected readonly playgroundQuery = signal('');
  protected readonly theme = signal(DROPDOWN_DEFAULT_THEME);
  protected readonly playgroundItems = signal<readonly DropdownItem[]>([...DROPDOWN_ITEMS]);

  protected readonly rows = computed(() => {
    if (!this.derived().search) return this.playgroundItems();
    const query = this.playgroundQuery().toLowerCase();
    return this.playgroundItems().filter((item) => item.label.toLowerCase().includes(query));
  });

  protected readonly checkedIndex = computed(() =>
    this.rows().findIndex((item) => item.label === this.playgroundSelected()),
  );
  protected readonly checkedIndices = computed(() =>
    this.rows().flatMap((item, i) => (this.picked().includes(item.label) ? [i] : [])),
  );
  protected readonly themeIndex = computed(() =>
    DROPDOWN_THEMES.findIndex((theme) => theme.label === this.theme()),
  );
  /** Only the active selection model reaches the container, as in the
   *  reference's `selectionProps`. */
  protected readonly playgroundCheckedIndex = computed(() =>
    this.playground().selection === 'single' && this.checkedIndex() !== -1
      ? this.checkedIndex()
      : undefined,
  );
  protected readonly playgroundCheckedIndices = computed(() =>
    this.playground().selection === 'multiple' ? this.checkedIndices() : undefined,
  );
  protected readonly playgroundCanCreate = computed(() => {
    const query = this.playgroundQuery().trim();
    return (
      this.derived().creatable &&
      query !== '' &&
      !this.playgroundItems().some((item) => item.label.toLowerCase() === query.toLowerCase())
    );
  });
  protected readonly triggerLabel = computed(() => {
    if (this.playground().selection === 'single') return this.playgroundSelected() ?? 'Choose';
    if (this.playground().selection === 'multiple') return `Filters · ${this.picked().length}`;
    return 'Open menu';
  });

  /** The rows in render order: group headings and hairlines ride their first
   *  row, and every row keeps its flat index for the fluid hover. */
  protected readonly playRows = computed<readonly PlayRow[]>(() => {
    const rows = this.rows();
    if (!this.derived().groups) {
      return rows.map((item, index) => ({ key: item.label, item, index }));
    }
    const out: PlayRow[] = [];
    for (const group of DROPDOWN_GROUPS) {
      const inGroup = rows.filter((item) => item.group === group);
      const start = rows.findIndex((item) => item.group === group);
      inGroup.forEach((item, i) => {
        out.push({
          key: item.label,
          item,
          index: start + i,
          group: i === 0 ? group : undefined,
          separator: i === 0 && start > 0,
        });
      });
    }
    return out;
  });

  protected readonly playgroundCode = computed(() => buildDropdownCode(this.playground()));

  protected rowChecked(label: string): boolean | undefined {
    const selection = this.playground().selection;
    if (selection === 'single') return this.playgroundSelected() === label;
    if (selection === 'multiple') return this.picked().includes(label);
    return undefined;
  }

  protected pick(label: string): void {
    const selection = this.playground().selection;
    if (selection === 'single') this.playgroundSelected.set(label);
    else if (selection === 'multiple') this.picked.update((prev) => toggled(prev, label));
  }

  protected createFromQuery(): void {
    const label = this.playgroundQuery().trim();
    this.playgroundItems.update((prev) => [
      ...prev,
      { icon: DROPDOWN_CREATED_ICON, label, group: DROPDOWN_GROUPS[1] },
    ]);
    if (this.playground().selection === 'single') this.playgroundSelected.set(label);
    else if (this.playground().selection === 'multiple') this.picked.update((prev) => toggled(prev, label));
    this.playgroundQuery.set('');
  }

  // ── Get code (presets, D5) ──
  private readonly globals = injectPresetGlobals();
  protected readonly presetCode = computed(() =>
    encodeDropdownPreset({ ...this.playground(), ...this.globals() }),
  );
  private readonly defaultPresetCode = computed(() => DROPDOWN_DEFAULT_CODE);

  protected readonly promptSnippet = computed(
    () =>
      `// app.config.ts\nprovideFluid({ shape: '${this.globals().shape}', size: '${this.globals().size}' })\n\n${this.playgroundCode()}`,
  );

  protected readonly presetProps = computed<readonly string[]>(() => {
    const state = this.playground();
    const derived = this.derived();
    return [
      `mode: ${state.mode === 'menu' ? 'a popup behind any trigger (ff-dropdown-menu).' : 'an always-visible inline panel (ff-dropdown).'}`,
      ...(state.selection === 'single'
        ? ['checkedIndex: single selection; the checked row draws a check.']
        : state.selection === 'multiple'
          ? ['checkedIndices: multiple selection; rows become checkboxes and keep the menu open.']
          : []),
      ...(derived.search ? ['DropdownSearch value: the query, two-way with [(value)].'] : []),
      ...(derived.groups
        ? ['DropdownLabel and DropdownSeparator: the labelled sections.']
        : []),
      ...(derived.submenu
        ? ['DropdownSub with DropdownSubTrigger and DropdownSubContent: the Theme submenu.']
        : []),
      ...(state.disabledRow ? [`MenuItem disabled: the ${DROPDOWN_DISABLED_LABEL} row.`] : []),
      ...(derived.creatable ? ['MenuItem closeOnClick: the create row keeps the menu open.'] : []),
    ];
  });

  constructor() {
    usePresetUrl(this.presetCode, this.defaultPresetCode, (raw) => {
      const res = decodeDropdownPreset(raw);
      if (res.ok) this.playground.set({ ...res.preset });
    });
  }

  protected set<K extends keyof DropdownPlayState>(key: K, value: DropdownPlayState[K]): void {
    this.playground.update((prev) => ({ ...prev, [key]: value }));
  }

  protected randomize(): void {
    this.playground.set({
      mode: Math.random() > 0.5 ? 'inline' : 'menu',
      selection: (['single', 'multiple', 'none'] as const)[Math.floor(Math.random() * 3)],
      search: Math.random() > 0.6,
      icons: Math.random() > 0.3,
      groups: Math.random() > 0.6,
      disabledRow: Math.random() > 0.7,
      creatable: Math.random() > 0.6,
      submenu: Math.random() > 0.4,
    });
    this.playgroundQuery.set('');
    this.playgroundItems.set([...DROPDOWN_ITEMS]);
  }
}
