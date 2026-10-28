import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  Button,
  COMMAND_MENU_PARTS,
  Elevated,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Switch,
  cn,
  formatShortcut,
  injectIsMac,
  injectShape,
  type CommandMenuItemData,
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
  COMMAND_MENU_COPY,
  COMMAND_MENU_SORTS,
  COMMAND_MENU_SUGGESTIONS,
  COMMAND_MENU_TABS,
  COMMAND_MENU_TYPES,
  commandMenuItems,
} from '../../../site/command-menu-data';
import { SiteToastService } from '../../../site/toast';
import {
  COMMAND_MENU_DEFAULT_CODE,
  COMMAND_MENU_PRESET_DEF,
  COMMAND_MENU_TRIGGERS,
  DEFAULT_COMMAND_MENU_STATE,
  decodeCommandMenuPreset,
  encodeCommandMenuPreset,
  type CommandMenuPlayState,
} from './command-menu-preset';

const PACKAGE = '@angel-r/fluid-functionalism-angular';

const INSTALL_USAGE = `<ff-command-menu [items]="items" (itemSelect)="run($event)">
  <ff-command-menu-input placeholder="Type a command or search…" />
  <ff-command-menu-list>
    <ff-command-menu-empty>No results.</ff-command-menu-empty>
  </ff-command-menu-list>
</ff-command-menu>`;

const INSTALL_PROPS: readonly string[] = [
  'items: the actions; `group` is the heading a row lists under, description and shortcut decorate it.',
  'suggestions: values listed first, under suggestionsLabel, while nothing is typed.',
  'itemSelect: a row was picked (after the item’s own handler).',
  'dialog: ff-command-menu-dialog wraps the menu in a modal on a global shortcut.',
  'closeOnSelect: inside a dialog, a pick closes it.',
];

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const basicCode = `import {
  CommandMenu, CommandMenuInput, CommandMenuList, CommandMenuEmpty,
} from '${PACKAGE}';

// Items are data. \`group\` is the heading a row lists under.
const ITEMS = [
  { value: 'new-file', label: 'New file', icon: 'plus', group: 'Actions' },
  { value: 'search', label: 'Search everywhere', icon: 'search', group: 'Actions' },
  { value: 'theme', label: 'Toggle dark mode', icon: 'moon', group: 'Actions' },
  { value: 'home', label: 'Home', icon: 'home', group: 'Go to' },
  { value: 'inbox', label: 'Inbox', icon: 'inbox', group: 'Go to' },
  { value: 'calendar', label: 'Calendar', icon: 'calendar', group: 'Go to' },
];

<!-- Inline: the panel is yours, the menu fills it -->
<div class="h-[360px] w-[520px] overflow-hidden rounded-xl border border-border">
  <ff-command-menu [items]="ITEMS" (itemSelect)="run($event)">
    <ff-command-menu-input placeholder="Type a command or search…" />
    <ff-command-menu-list>
      <ff-command-menu-empty>No results.</ff-command-menu-empty>
    </ff-command-menu-list>
  </ff-command-menu>
</div>`;

const detailsCode = `const ITEMS = [
  // description: text after the label, 1 contrast step lower. shortcut:
  // caps at the trailing edge, display only. keywords: extra filter terms.
  {
    value: 'new-file', label: 'New file', description: 'Blank document',
    icon: 'plus', shortcut: 'mod+n', keywords: ['create', 'document'], group: 'Actions',
  },
  {
    value: 'theme', label: 'Toggle dark mode', description: 'System, light, or dark',
    icon: 'moon', shortcut: 'mod+shift+l', group: 'Actions',
  },
  { value: 'settings', label: 'Settings', icon: 'settings', shortcut: 'mod+,', group: 'Go to' },
  // disabled: listed, greyed, skipped by the arrows and the pointer.
  { value: 'export', label: 'Export as PDF', description: 'Pro plan', icon: 'image', group: 'Actions', disabled: true },
];

<ff-command-menu [items]="ITEMS" (itemSelect)="run($event)">
  <ff-command-menu-input />
  <ff-command-menu-list>
    <ff-command-menu-empty>No results.</ff-command-menu-empty>
  </ff-command-menu-list>
</ff-command-menu>`;

const suggestionsCode = `<!-- suggestions: values listed first, under "Suggestions", while nothing
     is typed. A suggested row leaves its own group, so nothing repeats. -->
<ff-command-menu
  [items]="ITEMS"
  [suggestions]="['calendar', 'new-file', 'settings']"
  suggestionsLabel="Recent"
  (itemSelect)="run($event)"
>
  <ff-command-menu-input />
  <ff-command-menu-list>
    <ff-command-menu-empty>No results.</ff-command-menu-empty>
  </ff-command-menu-list>
</ff-command-menu>`;

const tabsCode = `import {
  CommandMenu, CommandMenuInput, CommandMenuTabs, CommandMenuList, CommandMenuEmpty,
} from '${PACKAGE}';

protected readonly tab = signal('all');
// The tabs are your state; derive the rows from them. ← and → in the
// field switch tabs, wrapping.
protected readonly visible = computed(() =>
  this.tab() === 'all' ? ITEMS : ITEMS.filter((item) => item.group === this.tab()),
);

<ff-command-menu [items]="visible()" (itemSelect)="run($event)">
  <ff-command-menu-input />
  <ff-command-menu-tabs
    [tabs]="[
      { value: 'all', label: 'All' },
      { value: 'Actions', label: 'Actions' },
      { value: 'Go to', label: 'Go to' },
      { value: 'Help', label: 'Help' },
    ]"
    [(value)]="tab"
  />
  <ff-command-menu-list>
    <ff-command-menu-empty>No results.</ff-command-menu-empty>
  </ff-command-menu-list>
</ff-command-menu>`;

const filtersCode = `import {
  CommandMenu, CommandMenuInput, CommandMenuFilters, CommandMenuList, CommandMenuEmpty,
  Select, SelectTrigger, SelectContent, SelectItem,
} from '${PACKAGE}';

protected readonly type = signal('all');
protected readonly sort = signal('default');
protected readonly visible = computed(() => {
  let rows = this.type() === 'all' ? ITEMS : ITEMS.filter((item) => item.group === this.type());
  return this.sort() === 'az' ? [...rows].sort((a, b) => a.label.localeCompare(b.label)) : rows;
});

<!-- ff-command-menu-filters: a compact, borderless row under the field.
     Compose borderless selectors or ghost buttons; the list's divider closes it. -->
<ff-command-menu [items]="visible()" (itemSelect)="run($event)">
  <ff-command-menu-input />
  <ff-command-menu-filters>
    <ff-select [(value)]="type">
      <ff-select-trigger variant="borderless" />
      <ff-select-content>
        <ff-select-item value="all" index="0">All types</ff-select-item>
        <ff-select-item value="Actions" index="1">Actions</ff-select-item>
        <ff-select-item value="Go to" index="2">Go to</ff-select-item>
        <ff-select-item value="Help" index="3">Help</ff-select-item>
      </ff-select-content>
    </ff-select>
    <ff-select [(value)]="sort">
      <ff-select-trigger variant="borderless" />
      <ff-select-content>
        <ff-select-item value="default" index="0">Default order</ff-select-item>
        <ff-select-item value="az" index="1">A to Z</ff-select-item>
      </ff-select-content>
    </ff-select>
  </ff-command-menu-filters>
  <ff-command-menu-list>
    <ff-command-menu-empty>No results.</ff-command-menu-empty>
  </ff-command-menu-list>
</ff-command-menu>`;

const dialogCode = `import {
  Button, CommandMenuDialog, CommandMenu, CommandMenuInput, CommandMenuList,
  CommandMenuEmpty, CommandMenuShortcut,
} from '${PACKAGE}';

protected readonly open = signal(false);

<button ffButton variant="secondary" (click)="open.set(true)">
  Open<kbd ffCommandMenuShortcut keys="mod+k" class="ml-1"></kbd>
</button>

<!-- shortcut toggles the dialog from anywhere on the page. Default "mod+k":
     ⌘K on a Mac, Ctrl+K elsewhere. Null binds nothing. A pick closes the
     dialog (closeOnSelect on ff-command-menu). -->
<ff-command-menu-dialog [(open)]="open" shortcut="mod+k">
  <ff-command-menu [items]="ITEMS" [suggestions]="['calendar', 'new-file']" (itemSelect)="run($event)">
    <ff-command-menu-input />
    <ff-command-menu-list>
      <ff-command-menu-empty>No results.</ff-command-menu-empty>
    </ff-command-menu-list>
  </ff-command-menu>
</ff-command-menu-dialog>`;

const footerCode = `import {
  CommandMenu, CommandMenuInput, CommandMenuList, CommandMenuEmpty, CommandMenuFooter,
} from '${PACKAGE}';

<!-- Default hints follow the menu: Select ↑↓, Tabs ← → when tabs are
     mounted, Close Esc in a dialog, and at the trailing edge the highlighted
     row's action ↵ (its label, unless the item sets action). Pass hints to
     replace them. -->
<ff-command-menu [items]="ITEMS" (itemSelect)="run($event)">
  <ff-command-menu-input />
  <ff-command-menu-list>
    <ff-command-menu-empty>No results.</ff-command-menu-empty>
  </ff-command-menu-list>
  <ff-command-menu-footer />
</ff-command-menu>

<ff-command-menu-footer
  [hints]="[
    { label: 'Select', keys: ['up', 'down'] },
    { label: 'Open', keys: 'enter' },
    { label: 'Open menu', keys: 'mod+k' },
  ]"
/>`;

const customRowsCode = `import { CommandMenu, CommandMenuInput, CommandMenuList, CommandMenuItem } from '${PACKAGE}';

<!-- One ff-command-menu-item per visible row from the row template. Props set
     here override the item's data; children replace the label. -->
<ff-command-menu [items]="ITEMS" (itemSelect)="run($event)">
  <ff-command-menu-input />
  <ff-command-menu-list>
    <ng-template ffCommandMenuRow let-item>
      <ff-command-menu-item [value]="item.value">
        <span class="flex min-w-0 flex-1 items-baseline gap-2">
          <span class="truncate">{{ item.label }}</span>
          <span class="truncate text-muted-foreground">{{ item.group }}</span>
        </span>
      </ff-command-menu-item>
    </ng-template>
  </ff-command-menu-list>
</ff-command-menu>`;

// ---------------------------------------------------------------------------
// Playground code, rebuilt from the rail's state
// ---------------------------------------------------------------------------

interface SampleItem {
  value: string;
  label: string;
  action?: string;
  description?: string;
  icon: string;
  shortcut?: string;
  group: string;
}

const SAMPLE: readonly SampleItem[] = [
  { value: 'new-file', label: 'New file', description: 'Blank document', icon: 'plus', shortcut: 'mod+n', group: 'Actions' },
  { value: 'theme', label: 'Toggle dark mode', description: 'System, light, or dark', icon: 'moon', shortcut: 'mod+shift+l', group: 'Actions' },
  { value: 'calendar', label: 'Calendar', action: 'Go to Calendar', description: 'Today', icon: 'calendar', group: 'Go to' },
  { value: 'settings', label: 'Settings', action: 'Go to Settings', description: 'Account and workspace', icon: 'settings', shortcut: 'mod+,', group: 'Go to' },
];

const listLiteral = (name: string, entries: readonly { value: string; label: string }[]): string =>
  `const ${name} = [${entries.map((entry) => `{ value: '${entry.value}', label: '${entry.label}' }`).join(', ')}];`;

function buildCommandMenuCode(state: CommandMenuPlayState): string {
  const parts = [
    'CommandMenuDialog',
    'CommandMenu',
    'CommandMenuInput',
    ...(state.tabs ? ['CommandMenuTabs'] : []),
    ...(state.filters ? ['CommandMenuFilters'] : []),
    'CommandMenuList',
    'CommandMenuEmpty',
    ...(state.footer ? ['CommandMenuFooter'] : []),
  ];
  const sampleRow = (item: SampleItem): string => {
    const props = [
      `value: '${item.value}'`,
      `label: '${item.label}'`,
      ...(item.action ? [`action: '${item.action}'`] : []),
      ...(state.descriptions && item.description ? [`description: '${item.description}'`] : []),
      `icon: '${item.icon}'`,
      ...(state.shortcuts && item.shortcut ? [`shortcut: '${item.shortcut}'`] : []),
      `group: '${item.group}'`,
    ];
    return `  { ${props.join(', ')} },`;
  };
  const scoped = state.tabs || state.filters;
  const lists = [
    ...(state.tabs ? [listLiteral('TABS', COMMAND_MENU_TABS)] : []),
    ...(state.filters ? [listLiteral('TYPES', COMMAND_MENU_TYPES), listLiteral('SORTS', COMMAND_MENU_SORTS)] : []),
  ];
  const root = [
    `[items]="${scoped ? 'visible()' : 'ITEMS'}"`,
    ...(state.suggestions
      ? [`[suggestions]="[${COMMAND_MENU_SUGGESTIONS.map((value) => `'${value}'`).join(', ')}]"`]
      : []),
    '(itemSelect)="run($event)"',
  ].join(' ');

  const lines: string[] = [];
  lines.push(`import { computed, signal } from '@angular/core';`);
  lines.push(`import {`);
  lines.push(`  ${parts.join(',\n  ')},`);
  lines.push(`} from '${PACKAGE}';`);
  if (state.filters) {
    lines.push(`import { Select, SelectTrigger, SelectContent, SelectItem } from '${PACKAGE}';`);
  }
  lines.push('');
  lines.push('const ITEMS = [');
  for (const item of SAMPLE) lines.push(sampleRow(item));
  lines.push('  /* … */');
  lines.push('];');
  for (const list of lists) lines.push(list);
  lines.push('');
  lines.push('protected readonly open = signal(false);');
  if (state.tabs) lines.push(`protected readonly tab = signal('all');`);
  if (state.filters) {
    lines.push(`protected readonly type = signal('all');`);
    lines.push(`protected readonly sort = signal('default');`);
  }
  if (scoped) {
    lines.push('');
    lines.push('// The header controls are your state: derive the rows from them.');
    lines.push('protected readonly visible = computed(() => {');
    lines.push('  let visible = ITEMS;');
    if (state.tabs) lines.push(`  if (this.tab() !== 'all') visible = visible.filter((item) => item.group === this.tab());`);
    if (state.filters) {
      lines.push(`  if (this.type() !== 'all') visible = visible.filter((item) => item.group === this.type());`);
      lines.push(`  if (this.sort() === 'az') visible = [...visible].sort((a, b) => a.label.localeCompare(b.label));`);
    }
    lines.push('  return visible;');
    lines.push('});');
  }
  lines.push('');
  lines.push('<!-- shortcut: the combo that toggles the dialog from anywhere ("mod+k" if omitted).');
  lines.push('     mod is ⌘ on a Mac, Ctrl elsewhere. -->');
  lines.push(
    `<ff-command-menu-dialog [(open)]="open"${state.shortcut === 'mod+k' ? '' : ` shortcut="${state.shortcut}"`}>`,
  );
  lines.push(`  <ff-command-menu ${root}>`);
  lines.push(`    <ff-command-menu-input placeholder="${COMMAND_MENU_COPY.placeholder}" />`);
  const select = (value: string, entries: string, indent: number): string[] => {
    const pad = ' '.repeat(indent);
    return [
      `${pad}<ff-select [(value)]="${value}">`,
      `${pad}  <ff-select-trigger variant="borderless" />`,
      `${pad}  <ff-select-content>`,
      `${pad}    @for (option of ${entries}; track option.value; let i = $index) {`,
      `${pad}      <ff-select-item [index]="i" [value]="option.value">{{ option.label }}</ff-select-item>`,
      `${pad}    }`,
      `${pad}  </ff-select-content>`,
      `${pad}</ff-select>`,
    ];
  };
  // Filters inside the tabs share the row (hugging their controls); alone
  // they are a row of their own.
  const filters = state.filters
    ? ['<ff-command-menu-filters>', ...select('type', 'TYPES', 2), ...select('sort', 'SORTS', 2), '</ff-command-menu-filters>']
    : [];
  if (state.tabs) {
    if (state.filters) {
      lines.push('    <ff-command-menu-tabs [tabs]="TABS" [(value)]="tab">');
      lines.push('      <!-- Trailing children hug the row\'s end -->');
      lines.push(...filters.map((line) => `      ${line}`));
      lines.push('    </ff-command-menu-tabs>');
    } else {
      lines.push('    <ff-command-menu-tabs [tabs]="TABS" [(value)]="tab" />');
    }
  } else {
    lines.push(...filters.map((line) => `    ${line}`));
  }
  lines.push('    <ff-command-menu-list>');
  lines.push(`      <ff-command-menu-empty>${COMMAND_MENU_COPY.empty}</ff-command-menu-empty>`);
  lines.push('    </ff-command-menu-list>');
  if (state.footer) {
    lines.push('    <!-- Hints follow the menu: tabs add ← →, a dialog adds Esc -->');
    lines.push('    <ff-command-menu-footer />');
  }
  lines.push('  </ff-command-menu>');
  lines.push('</ff-command-menu-dialog>');
  lines.push('');
  lines.push('<!-- Inline instead: drop the dialog and give ff-command-menu a height. -->');
  return lines.join('\n');
}

@Component({
  selector: 'app-command-menu-page',
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
    COMMAND_MENU_PARTS,
    Button,
    Elevated,
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    Switch,
  ],
  templateUrl: './command-menu.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CommandMenuPage {
  private readonly toast = inject(SiteToastService);
  private readonly shape = injectShape();
  protected readonly mac = injectIsMac();

  protected readonly copy = COMMAND_MENU_COPY;
  protected readonly tabs = COMMAND_MENU_TABS;
  protected readonly types = COMMAND_MENU_TYPES;
  protected readonly sorts = COMMAND_MENU_SORTS;
  protected readonly suggestions = COMMAND_MENU_SUGGESTIONS;
  protected readonly presetDef = COMMAND_MENU_PRESET_DEF;
  protected readonly playSwitch = PLAY_SWITCH;
  protected readonly api = API_REFERENCE['command-menu'];
  protected readonly installUsage = INSTALL_USAGE;
  protected readonly installProps = INSTALL_PROPS;

  protected readonly basicCode = basicCode;
  protected readonly detailsCode = detailsCode;
  protected readonly suggestionsCode = suggestionsCode;
  protected readonly tabsCode = tabsCode;
  protected readonly filtersCode = filtersCode;
  protected readonly dialogCode = dialogCode;
  protected readonly footerCode = footerCode;
  protected readonly customRowsCode = customRowsCode;

  protected readonly plain = commandMenuItems({ descriptions: false, shortcuts: false });
  protected readonly full = commandMenuItems();

  // ── Demo state ──
  protected readonly tab = signal('all');
  protected readonly footerTab = signal('all');
  protected readonly type = signal('all');
  protected readonly sort = signal('default');
  protected readonly open = signal(false);
  protected readonly openNoKey = signal(false);

  protected readonly tabbed = computed(() =>
    this.tab() === 'all' ? this.full : this.full.filter((item) => item.group === this.tab()),
  );
  protected readonly filtered = computed(() => {
    const rows = this.type() === 'all' ? this.full : this.full.filter((item) => item.group === this.type());
    return this.sort() === 'az' ? [...rows].sort((a, b) => a.label.localeCompare(b.label)) : rows;
  });

  /** The inline frame every example sits in: a surface the rows size, up to
   *  a cap the list scrolls past. */
  protected readonly panelClass = computed(() =>
    cn('flex max-h-[360px] w-full max-w-[520px] flex-col overflow-hidden', this.shape().container),
  );

  protected readonly dialogCopy = computed(() =>
    this.mac
      ? 'Press ⌘P anywhere on this page: this demo binds its own combo, and the default ⌘K opens the playground above. A pick or Escape closes it.'
      : 'Press Ctrl+P anywhere on this page: this demo binds its own combo, and the default Ctrl+K opens the playground above. A pick or Escape closes it.',
  );

  // ── Playground ──
  protected readonly playground = signal<CommandMenuPlayState>({ ...DEFAULT_COMMAND_MENU_STATE });
  protected readonly playOpen = signal(false);
  protected readonly playTab = signal('all');
  protected readonly playType = signal('all');
  protected readonly playSort = signal('default');

  /** The rail's combo labels draw the platform's own modifier, like the caps
   *  in the rows. */
  protected readonly shortcutOptions = computed(() =>
    COMMAND_MENU_TRIGGERS.map((value) => ({
      value,
      label: formatShortcut(value, this.mac).join(this.mac ? '' : '+'),
    })),
  );

  /** Descriptions and caps come and go with the rail; the icons keep their
   *  resolved definitions. */
  protected readonly playItems = computed(() => {
    const state = this.playground();
    let visible = this.full.map(({ description, shortcut, ...item }) => ({
      ...item,
      ...(state.descriptions && description !== undefined ? { description } : {}),
      ...(state.shortcuts && shortcut !== undefined ? { shortcut } : {}),
    }));
    if (state.tabs && this.playTab() !== 'all') {
      visible = visible.filter((item) => item.group === this.playTab());
    }
    if (state.filters && this.playType() !== 'all') {
      visible = visible.filter((item) => item.group === this.playType());
    }
    if (state.filters && this.playSort() === 'az') {
      visible = [...visible].sort((a, b) => a.label.localeCompare(b.label));
    }
    return visible;
  });

  /** The panel is sized by its rows up to a cap; the list scrolls past it. */
  protected readonly playPanelClass = computed(() =>
    cn('flex w-full max-w-[560px] flex-col overflow-hidden', this.shape().container, 'max-h-[400px]'),
  );

  protected readonly playgroundCode = computed(() => buildCommandMenuCode(this.playground()));

  // ── Get code (presets, D5) ──
  private readonly globals = injectPresetGlobals();
  protected readonly presetCode = computed(() =>
    encodeCommandMenuPreset({ ...this.playground(), ...this.globals() }),
  );
  private readonly defaultPresetCode = computed(() => COMMAND_MENU_DEFAULT_CODE);

  protected readonly promptSnippet = computed(
    () =>
      `// app.config.ts\nprovideFluid({ shape: '${this.globals().shape}', size: '${this.globals().size}' })\n\n${this.playgroundCode()}`,
  );

  protected readonly presetProps = computed<readonly string[]>(() => {
    const state = this.playground();
    return [
      `shortcut: the combo that toggles the dialog (${state.shortcut === 'mod+k' ? '"mod+k", the default' : `"${state.shortcut}"`}).`,
      ...(state.tabs ? ['CommandMenuTabs value: the active tab, two-way with [(value)].'] : []),
      ...(state.filters ? ['Select value: the type and sort controls, two-way with [(value)].'] : []),
      ...(state.suggestions ? ['suggestions: values listed first while nothing is typed.'] : []),
      ...(state.footer ? ['CommandMenuFooter: the hint strip drawn from the menu’s own state.'] : []),
      'itemSelect: a row was picked.',
    ];
  });

  constructor() {
    usePresetUrl(this.presetCode, this.defaultPresetCode, (raw) => {
      const res = decodeCommandMenuPreset(raw);
      if (res.ok) this.playground.set({ ...res.preset });
    });
  }

  protected run(item: CommandMenuItemData): void {
    this.toast.success(`Ran “${item.label}”`);
  }

  protected set<K extends keyof CommandMenuPlayState>(key: K, value: CommandMenuPlayState[K]): void {
    this.playground.update((prev) => ({ ...prev, [key]: value }));
  }

  protected randomize(): void {
    this.playground.set({
      shortcut: COMMAND_MENU_TRIGGERS[Math.floor(Math.random() * COMMAND_MENU_TRIGGERS.length)],
      descriptions: Math.random() > 0.3,
      shortcuts: Math.random() > 0.3,
      suggestions: Math.random() > 0.4,
      tabs: Math.random() > 0.6,
      filters: Math.random() > 0.7,
      footer: Math.random() > 0.3,
    });
  }
}
