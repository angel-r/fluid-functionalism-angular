import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  Combobox,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem as ComboboxItemRow,
  ComboboxList,
  ComboboxRow,
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
  COMBOBOX_COMPONENTS,
  COMBOBOX_COPY,
  COMBOBOX_DEFAULT_CODE,
  COMBOBOX_DEFAULT_VALUES,
  COMBOBOX_PRESET_DEF,
  DEFAULT_COMBOBOX_STATE,
  comboboxItemFromQuery,
  decodeComboboxPreset,
  deriveCombobox,
  encodeComboboxPreset,
  type ComboboxItem,
  type ComboboxPlayState,
} from './combobox-preset';

const PACKAGE = '@angel-r/fluid-functionalism-angular';

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const FRAMEWORKS: readonly ComboboxItem[] = [
  { value: 'next', label: 'Next.js' },
  { value: 'sveltekit', label: 'SvelteKit' },
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
  { value: 'solid', label: 'SolidStart' },
  { value: 'qwik', label: 'Qwik City' },
];

interface ComboboxView extends ComboboxItem {
  icon: IconName;
}

const VIEWS: readonly ComboboxView[] = [
  { value: 'shared', label: 'Shared with me', icon: 'users' },
  { value: 'starred', label: 'Starred', icon: 'star' },
  { value: 'recent', label: 'Recent', icon: 'clock' },
  { value: 'private', label: 'Private', icon: 'lock' },
  { value: 'inbox', label: 'Inbox', icon: 'mail' },
];

const TIMEZONES: readonly string[] = [
  '(UTC−12) Baker Island',
  '(UTC−10) Honolulu',
  '(UTC−9) Anchorage',
  '(UTC−8) Los Angeles',
  '(UTC−7) Denver',
  '(UTC−6) Mexico City',
  '(UTC−5) New York',
  '(UTC−4) Santiago',
  '(UTC−3) São Paulo',
  '(UTC−2) South Georgia',
  '(UTC−1) Azores',
  '(UTC+0) London',
  '(UTC+1) Paris',
  '(UTC+2) Cairo',
  '(UTC+3) Moscow',
  '(UTC+4) Dubai',
  '(UTC+5) Karachi',
  '(UTC+5:30) Mumbai',
  '(UTC+6) Dhaka',
  '(UTC+7) Bangkok',
  '(UTC+8) Singapore',
  '(UTC+9) Tokyo',
  '(UTC+10) Sydney',
  '(UTC+11) Nouméa',
  '(UTC+12) Auckland',
];

const INSTALL_USAGE = `<ff-combobox [items]="frameworks" [(value)]="framework">
  <ff-combobox-input placeholder="Select a framework…" />
  <ff-combobox-content>
    <ff-combobox-list />
  </ff-combobox-content>
</ff-combobox>`;

const INSTALL_PROPS: readonly string[] = [
  'items: the options; a string is its own value and label, an object carries value and label.',
  'multiple: any number of picks, shown as chips (pair with ff-combobox-chips).',
  'value: the selection, two-way with [(value)]; a string, or an array when multiple.',
  'onCreate: adds a last row that creates the typed query; return the new item to select it.',
  'hideSelected: multiple only; picked items leave the list.',
];

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const basicCode = `import { signal } from '@angular/core';
import {
  Combobox, ComboboxInput, ComboboxContent,
  ComboboxList, ComboboxItem, ComboboxEmpty,
} from '${PACKAGE}';

const FRAMEWORKS = [
  { value: 'next', label: 'Next.js' },
  { value: 'sveltekit', label: 'SvelteKit' },
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
];
protected readonly value = signal('');

<ff-combobox [items]="FRAMEWORKS" [(value)]="value">
  <ff-combobox-input placeholder="Select a framework…" />
  <ff-combobox-content>
    <ff-combobox-empty>No framework found.</ff-combobox-empty>
    <ff-combobox-list>
      <ng-template ffComboboxRow let-value="value" let-label="label">
        <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
      </ng-template>
    </ff-combobox-list>
  </ff-combobox-content>
</ff-combobox>`;

const iconsCode = `import {
  Combobox, ComboboxInput, ComboboxContent,
  ComboboxList, ComboboxItem, ComboboxEmpty,
} from '${PACKAGE}';

// Icon slot names resolve against the site's icon library.
const VIEWS = [
  { value: 'shared', label: 'Shared with me', icon: 'users' },
  { value: 'starred', label: 'Starred', icon: 'star' },
  { value: 'recent', label: 'Recent', icon: 'clock' },
  { value: 'private', label: 'Private', icon: 'lock' },
  { value: 'inbox', label: 'Inbox', icon: 'mail' },
];
protected readonly view = signal('');

<ff-combobox [items]="VIEWS" [(value)]="view">
  <ff-combobox-input icon="search" placeholder="Jump to view…" />
  <ff-combobox-content>
    <ff-combobox-empty>No view matches.</ff-combobox-empty>
    <ff-combobox-list>
      <ng-template ffComboboxRow let-item>
        <ff-combobox-item [value]="item.value" [icon]="item.icon">
          {{ item.label }}
        </ff-combobox-item>
      </ng-template>
    </ff-combobox-list>
  </ff-combobox-content>
</ff-combobox>`;

const multipleCode = `import {
  Combobox, ComboboxChips, ComboboxContent,
  ComboboxList, ComboboxItem, ComboboxEmpty,
} from '${PACKAGE}';

protected readonly values = signal<string[]>(['next', 'astro']);

<!-- multiple: values are string[]; ff-combobox-chips shows one chip per pick -->
<ff-combobox multiple [items]="FRAMEWORKS" [(value)]="values">
  <ff-combobox-chips placeholder="Add frameworks…" />
  <ff-combobox-content>
    <ff-combobox-empty>No framework found.</ff-combobox-empty>
    <ff-combobox-list>
      <ng-template ffComboboxRow let-value="value" let-label="label">
        <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
      </ng-template>
    </ff-combobox-list>
  </ff-combobox-content>
</ff-combobox>`;

const creatableCode = `import {
  Combobox, ComboboxChips, ComboboxContent,
  ComboboxList, ComboboxItem, ComboboxEmpty,
} from '${PACKAGE}';

// The library's own components; a created row joins them.
protected readonly components = signal(COMPONENTS);
protected readonly picked = signal<string[]>(['button', 'combobox']);

// onCreate: the last row creates the query when no label matches it exactly.
// Add the item to items and return it to select it.
protected create(query: string) {
  const item = { value: query.toLowerCase().replace(/\\s+/g, '-'), label: query };
  this.components.update((prev) => [...prev, item]);
  return item;
}

<ff-combobox multiple [items]="components" [(value)]="picked" [onCreate]="create">
  <ff-combobox-chips placeholder="Add components…" />
  <ff-combobox-content>
    <ff-combobox-empty>No component found.</ff-combobox-empty>
    <ff-combobox-list>
      <ng-template ffComboboxRow let-value="value" let-label="label">
        <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
      </ng-template>
    </ff-combobox-list>
  </ff-combobox-content>
</ff-combobox>`;

const hideSelectedCode = `import {
  Combobox, ComboboxChips, ComboboxContent,
  ComboboxList, ComboboxItem, ComboboxEmpty,
} from '${PACKAGE}';

<!-- hideSelected: a pick leaves the list; the chip is the way back -->
<ff-combobox multiple hideSelected [items]="COMPONENTS" [(value)]="values">
  <ff-combobox-chips placeholder="Add components…" />
  <ff-combobox-content>
    <ff-combobox-empty allSelected="Every component is added.">
      No component found.
    </ff-combobox-empty>
    <ff-combobox-list>
      <ng-template ffComboboxRow let-value="value" let-label="label">
        <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
      </ng-template>
    </ff-combobox-list>
  </ff-combobox-content>
</ff-combobox>`;

const variantsCode = `import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem } from '${PACKAGE}';

<!-- Bordered (default): framed at rest -->
<ff-combobox [items]="FRAMEWORKS" [(value)]="bordered">
  <ff-combobox-input variant="bordered" placeholder="Bordered" />
  …
</ff-combobox>

<!-- Borderless: invisible at rest -->
<ff-combobox [items]="FRAMEWORKS" [(value)]="borderless">
  <ff-combobox-input variant="borderless" placeholder="Borderless" />
  …
</ff-combobox>`;

const longListCode = `import {
  Combobox, ComboboxInput, ComboboxContent,
  ComboboxList, ComboboxItem, ComboboxEmpty,
} from '${PACKAGE}';

// String items are their own value and label.
const TIMEZONES = ['(UTC−8) Los Angeles', '(UTC−5) New York', '(UTC+0) London', /* … */];

<ff-combobox [items]="TIMEZONES" [(value)]="timezone">
  <ff-combobox-input icon="globe" placeholder="Search timezones…" />
  <ff-combobox-content>
    <ff-combobox-empty>No timezone matches.</ff-combobox-empty>
    <ff-combobox-list>
      <ng-template ffComboboxRow let-value="value" let-label="label">
        <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
      </ng-template>
    </ff-combobox-list>
  </ff-combobox-content>
</ff-combobox>`;

const statesCode = `import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem } from '${PACKAGE}';

<!-- Error -->
<ff-combobox [items]="FRAMEWORKS" [(value)]="errored">
  <ff-combobox-input placeholder="Select a framework…" error="Pick a framework to continue." />
  …
</ff-combobox>

<!-- Disabled -->
<ff-combobox [items]="FRAMEWORKS" disabled>
  <ff-combobox-input placeholder="Disabled" />
  …
</ff-combobox>`;

// ---------------------------------------------------------------------------
// Playground code, rebuilt from the rail's state
// ---------------------------------------------------------------------------

/** The seed the generated file carries, abridged the way the reference is. */
const SEED = `const COMPONENTS = [
  { value: 'accordion', label: 'Accordion' },
  { value: 'badge', label: 'Badge' },
  { value: 'button', label: 'Button' },
  /* … */
];`;

function buildComboboxCode(state: ComboboxPlayState): string {
  const derived = deriveCombobox(state);
  const parts = [
    'Combobox',
    state.multiple ? 'ComboboxChips' : 'ComboboxInput',
    'ComboboxContent',
    'ComboboxList',
    'ComboboxItem',
    'ComboboxEmpty',
  ];
  const field = state.multiple ? 'ff-combobox-chips' : 'ff-combobox-input';
  const root = [
    state.creatable ? '[items]="items"' : '[items]="COMPONENTS"',
    ...(state.multiple ? ['multiple', '[(value)]="values"'] : ['[(value)]="value"']),
    ...(derived.hideSelected ? ['hideSelected'] : []),
    ...(state.disabled ? ['disabled'] : []),
    ...(state.creatable ? ['[onCreate]="create"'] : []),
  ];
  const fieldAttrs = [
    `placeholder="${state.multiple ? COMBOBOX_COPY.placeholderMultiple : COMBOBOX_COPY.placeholder}"`,
    ...(state.variant !== 'bordered' ? [`variant="${state.variant}"`] : []),
    ...(state.icon ? ['icon="search"'] : []),
    ...(state.clearable ? ['clearable'] : []),
    ...(state.error ? [`error="${COMBOBOX_COPY.error}"`] : []),
    'class="w-[280px] max-w-full"',
  ];

  const lines: string[] = [];
  lines.push(`import { signal } from '@angular/core';`);
  lines.push(`import { ${parts.join(', ')} } from '${PACKAGE}';`);
  lines.push('');
  lines.push(SEED);
  lines.push('');
  if (state.creatable) lines.push('protected readonly items = signal(COMPONENTS);');
  if (state.multiple) {
    lines.push(
      `protected readonly values = signal<string[]>([${COMBOBOX_DEFAULT_VALUES.map((value) => `'${value}'`).join(', ')}]);`,
    );
  } else {
    lines.push(`protected readonly value = signal('');`);
  }
  if (state.creatable) {
    lines.push('');
    lines.push('// The typed label becomes the item; returning it selects it.');
    lines.push('protected create(query: string) {');
    lines.push(`  const item = { value: query.toLowerCase().replace(/\\s+/g, '-'), label: query };`);
    lines.push('  this.items.update((prev) => [...prev, item]);');
    lines.push('  return item;');
    lines.push('}');
  }
  lines.push('');
  lines.push(`<ff-combobox ${root.join(' ')}>`);
  lines.push(`  <${field} ${fieldAttrs.join(' ')} />`);
  lines.push('  <ff-combobox-content>');
  lines.push(
    derived.hideSelected
      ? `    <ff-combobox-empty allSelected="${COMBOBOX_COPY.allSelected}">${COMBOBOX_COPY.empty}</ff-combobox-empty>`
      : `    <ff-combobox-empty>${COMBOBOX_COPY.empty}</ff-combobox-empty>`,
  );
  lines.push('    <ff-combobox-list>');
  lines.push('      <ng-template ffComboboxRow let-value="value" let-label="label">');
  lines.push('        <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>');
  lines.push('      </ng-template>');
  lines.push('    </ff-combobox-list>');
  lines.push('  </ff-combobox-content>');
  lines.push('</ff-combobox>');
  return lines.join('\n');
}

@Component({
  selector: 'app-combobox-page',
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
    Combobox,
    ComboboxInput,
    ComboboxChips,
    ComboboxContent,
    ComboboxList,
    ComboboxRow,
    ComboboxItemRow,
    ComboboxEmpty,
  ],
  templateUrl: './combobox.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ComboboxPage {
  protected readonly copy = COMBOBOX_COPY;
  protected readonly presetDef = COMBOBOX_PRESET_DEF;
  protected readonly playSwitch = PLAY_SWITCH;
  protected readonly api = API_REFERENCE['combobox'];
  protected readonly installUsage = INSTALL_USAGE;
  protected readonly installProps = INSTALL_PROPS;

  protected readonly basicCode = basicCode;
  protected readonly iconsCode = iconsCode;
  protected readonly multipleCode = multipleCode;
  protected readonly creatableCode = creatableCode;
  protected readonly hideSelectedCode = hideSelectedCode;
  protected readonly variantsCode = variantsCode;
  protected readonly longListCode = longListCode;
  protected readonly statesCode = statesCode;

  protected readonly frameworks = FRAMEWORKS;
  protected readonly views = VIEWS;
  protected readonly timezones = TIMEZONES;
  protected readonly allComponents = COMBOBOX_COMPONENTS;
  protected readonly searchIcon: IconName = 'search';
  protected readonly variants = [
    { value: 'bordered', label: 'Bordered' },
    { value: 'borderless', label: 'Borderless' },
  ];

  // ── Demo state ──
  protected readonly framework = signal('');
  protected readonly view = signal('');
  protected readonly bordered = signal('');
  protected readonly borderless = signal('');
  protected readonly timezone = signal('');
  protected readonly errored = signal('');
  protected readonly stack = signal<string[]>(['next', 'astro']);
  protected readonly components = signal<readonly ComboboxItem[]>([...COMBOBOX_COMPONENTS]);
  protected readonly picked = signal<string[]>([...COMBOBOX_DEFAULT_VALUES]);
  protected readonly remaining = signal<string[]>([...COMBOBOX_DEFAULT_VALUES]);

  /** A created row joins the components; returning it selects it. */
  protected readonly create = (query: string): ComboboxItem => {
    const item = comboboxItemFromQuery(query);
    this.components.update((prev) => [...prev, item]);
    return item;
  };

  // ── Playground ──
  protected readonly playground = signal<ComboboxPlayState>({ ...DEFAULT_COMBOBOX_STATE });
  protected readonly derived = computed(() => deriveCombobox(this.playground()));
  protected readonly playgroundValue = signal('');
  protected readonly playgroundValues = signal<string[]>([...COMBOBOX_DEFAULT_VALUES]);
  protected readonly playgroundItems = signal<readonly ComboboxItem[]>([...COMBOBOX_COMPONENTS]);
  protected readonly playgroundCode = computed(() => buildComboboxCode(this.playground()));

  protected readonly playgroundCreate = (query: string): ComboboxItem => {
    const item = comboboxItemFromQuery(query);
    this.playgroundItems.update((prev) => [...prev, item]);
    return item;
  };

  // ── Get code (presets, D5) ──
  private readonly globals = injectPresetGlobals();
  protected readonly presetCode = computed(() =>
    encodeComboboxPreset({ ...this.playground(), ...this.globals() }),
  );
  private readonly defaultPresetCode = computed(() => COMBOBOX_DEFAULT_CODE);

  /** The prompt's snippet: the configuration's template plus the provider
   *  call the site's settings imply. */
  protected readonly promptSnippet = computed(
    () =>
      `// app.config.ts\nprovideFluid({ shape: '${this.globals().shape}', size: '${this.globals().size}' })\n\n${this.playgroundCode()}`,
  );

  /** The props the configuration sets, one line each. */
  protected readonly presetProps = computed<readonly string[]>(() => {
    const state = this.playground();
    return [
      ...(state.multiple
        ? ['multiple: any number of picks, shown as chips (ff-combobox-chips).']
        : []),
      `value: the ${state.multiple ? 'selections' : 'selection'}, two-way with [(value)].`,
      ...(this.derived().hideSelected ? ['hideSelected: picked items leave the list; the chips deselect.'] : []),
      ...(state.disabled ? ['disabled: disables the field and the popup.'] : []),
      ...(state.creatable ? ['onCreate: adds a last row that creates the typed query.'] : []),
      `variant: ${state.variant === 'borderless' ? 'invisible until hovered or focused.' : 'framed at rest.'}`,
      ...(state.icon ? ['icon: a leading icon inside the field.'] : []),
      ...(state.clearable ? ['clearable: a ✕ that clears the pick and the query.'] : []),
      ...(state.error ? ['error: a message under the field; it tints the ring.'] : []),
    ];
  });

  constructor() {
    usePresetUrl(this.presetCode, this.defaultPresetCode, (raw) => {
      const res = decodeComboboxPreset(raw);
      if (res.ok) this.playground.set({ ...res.preset });
    });
  }

  protected set<K extends keyof ComboboxPlayState>(key: K, value: ComboboxPlayState[K]): void {
    this.playground.update((prev) => ({ ...prev, [key]: value }));
  }

  protected randomize(): void {
    this.playground.set({
      multiple: Math.random() > 0.6,
      variant: Math.random() > 0.5 ? 'borderless' : 'bordered',
      icon: Math.random() > 0.5,
      clearable: Math.random() > 0.6,
      error: Math.random() > 0.85,
      disabled: Math.random() > 0.9,
      creatable: Math.random() > 0.6,
      hideSelected: Math.random() > 0.6,
    });
    this.playgroundValue.set('');
    this.playgroundValues.set([]);
  }
}
