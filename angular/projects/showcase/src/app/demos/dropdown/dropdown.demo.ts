import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
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
  type IconName,
} from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

const ITEMS: { icon: IconName; label: string }[] = [
  { icon: 'square-library', label: 'Teamspaces' },
  { icon: 'clock', label: 'Recents' },
  { icon: 'star', label: 'Favorites' },
  { icon: 'users', label: 'Shared' },
  { icon: 'lock', label: 'Private' },
];

const FOLDERS = ['Inbox', 'Design', 'Engineering', 'Marketing', 'Archive'];

const STATUSES = ['Open', 'In progress', 'In review', 'Blocked', 'Done', 'Archived'];

const COMPONENTS = [
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

const LABELS = [
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

const LANGUAGES = [
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

const matching = (list: readonly string[], query: string) =>
  list.filter((item) => item.toLowerCase().includes(query.toLowerCase()));

const toggled = <T,>(list: readonly T[], item: T) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

@Component({
  selector: 'app-dropdown-demo',
  imports: [
    DemoPage,
    DemoSection,
    Button,
    Dropdown,
    DropdownLabel,
    DropdownSeparator,
    DropdownMenu,
    DropdownTrigger,
    DropdownContent,
    DropdownSub,
    DropdownSubTrigger,
    DropdownSubContent,
    DropdownSearch,
    DropdownEmpty,
    MenuItem,
  ],
  template: `
    <app-demo-page title="Dropdown" description="2 forms: an inline panel, or a popup on any trigger.">
      <app-demo-section title="Basic">
        <ff-dropdown aria-label="Views" [checkedIndex]="selected() ?? undefined">
          @for (item of items; track item.label; let i = $index) {
            <ff-menu-item
              [index]="i"
              [icon]="item.icon"
              [label]="item.label"
              [checked]="selected() === i"
              (select)="selected.set(selected() === i ? null : i)"
            />
          }
        </ff-dropdown>
      </app-demo-section>

      <app-demo-section title="Groups">
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
        </ff-dropdown>
      </app-demo-section>

      <app-demo-section title="Triggered menu">
        <ff-dropdown-menu>
          <button ffButton ffDropdownTrigger variant="ghost">Open menu</button>
          <ff-dropdown-content [checkedIndex]="view()">
            @for (item of items; track item.label; let i = $index) {
              <ff-menu-item
                [index]="i"
                [icon]="item.icon"
                [label]="item.label"
                [checked]="view() === i"
                (select)="view.set(i)"
              />
            }
          </ff-dropdown-content>
        </ff-dropdown-menu>
      </app-demo-section>

      <app-demo-section title="Submenus">
        <ff-dropdown-menu>
          <button ffButton ffDropdownTrigger variant="ghost">Q3 report.pdf</button>
          <ff-dropdown-content>
            <ff-dropdown-sub>
              <ff-dropdown-sub-trigger [index]="0" icon="folder" label="Move to" />
              <ff-dropdown-sub-content>
                @for (folder of folders; track folder; let i = $index) {
                  <ff-menu-item [index]="i" [label]="folder" (select)="lastAction.set('Moved to ' + folder)" />
                }
              </ff-dropdown-sub-content>
            </ff-dropdown-sub>
            <ff-dropdown-sub>
              <ff-dropdown-sub-trigger [index]="1" icon="link" label="Share" />
              <ff-dropdown-sub-content>
                <ff-menu-item [index]="0" icon="link" label="Copy link" (select)="lastAction.set('Link copied')" />
                <ff-menu-item [index]="1" icon="mail" label="Email" (select)="lastAction.set('Shared by email')" />
              </ff-dropdown-sub-content>
            </ff-dropdown-sub>
            <ff-menu-item [index]="2" icon="pencil" label="Rename" (select)="lastAction.set('Renamed')" />
          </ff-dropdown-content>
        </ff-dropdown-menu>
      </app-demo-section>

      <app-demo-section title="Multiple selection">
        <ff-dropdown-menu>
          <button ffButton ffDropdownTrigger variant="ghost">Status</button>
          <ff-dropdown-content [checkedIndices]="statuses()">
            @for (status of statusList; track status; let i = $index) {
              <ff-menu-item
                [index]="i"
                [label]="status"
                [checked]="statuses().includes(i)"
                (select)="statuses.set(toggled(statuses(), i))"
              />
            }
          </ff-dropdown-content>
        </ff-dropdown-menu>
      </app-demo-section>

      <app-demo-section title="Searchable menu">
        <ff-dropdown-menu>
          <button ffButton ffDropdownTrigger variant="ghost" trailingIcon="chevron-down">{{ language() }}</button>
          <ff-dropdown-content [checkedIndex]="languageMatches().indexOf(language())">
            <ff-dropdown-search [(value)]="languageQuery" placeholder="Search languages" />
            @for (l of languageMatches(); track l; let i = $index) {
              <ff-menu-item [index]="i" [label]="l" [checked]="language() === l" (select)="language.set(l)" />
            }
            @if (languageMatches().length === 0) {
              <ff-dropdown-empty>No languages found</ff-dropdown-empty>
            }
          </ff-dropdown-content>
        </ff-dropdown-menu>
      </app-demo-section>

      <app-demo-section title="Searchable multiple selection">
        <ff-dropdown-menu>
          <button ffButton ffDropdownTrigger variant="ghost">Labels · {{ labels().length }}</button>
          <ff-dropdown-content [checkedIndices]="labelChecked()">
            <ff-dropdown-search [(value)]="labelQuery" placeholder="Search labels" />
            @for (l of labelMatches(); track l; let i = $index) {
              <ff-menu-item
                [index]="i"
                [label]="l"
                [checked]="labels().includes(l)"
                (select)="labels.set(toggled(labels(), l))"
              />
            }
            @if (labelMatches().length === 0) {
              <ff-dropdown-empty>No labels found</ff-dropdown-empty>
            }
          </ff-dropdown-content>
        </ff-dropdown-menu>
      </app-demo-section>

      <app-demo-section title="Create from the query">
        <ff-dropdown-menu>
          <button ffButton ffDropdownTrigger variant="ghost">Components · {{ used().length }}</button>
          <ff-dropdown-content [checkedIndices]="usedChecked()">
            <ff-dropdown-search [(value)]="componentQuery" placeholder="Search components" />
            @for (c of componentMatches(); track c; let i = $index) {
              <ff-menu-item
                [index]="i"
                [label]="c"
                [checked]="used().includes(c)"
                (select)="used.set(toggled(used(), c))"
              />
            }
            <!-- A create row while the query matches no label exactly. Last,
                 after the real matches, so ↑ from the search field reaches it
                 in one press. -->
            @if (canCreate()) {
              <ff-menu-item
                [index]="componentMatches().length"
                icon="plus"
                [label]="'Create “' + componentQ() + '”'"
                [closeOnClick]="false"
                (select)="create()"
              />
            }
            @if (componentMatches().length === 0 && !canCreate()) {
              <ff-dropdown-empty>No components found</ff-dropdown-empty>
            }
          </ff-dropdown-content>
        </ff-dropdown-menu>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DropdownDemo {
  protected readonly items = ITEMS;
  protected readonly folders = FOLDERS;
  protected readonly statusList = STATUSES;
  protected readonly toggled = toggled;

  protected readonly selected = signal<number | null>(0);
  protected readonly view = signal(0);
  protected readonly lastAction = signal<string | null>(null);
  protected readonly statuses = signal<number[]>([0, 1, 2]);

  protected readonly language = signal('Auto detect');
  protected readonly languageQuery = signal('');
  protected readonly languageMatches = computed(() => matching(LANGUAGES, this.languageQuery()));

  protected readonly labels = signal<string[]>(['Bug', 'Design']);
  protected readonly labelQuery = signal('');
  protected readonly labelMatches = computed(() => matching(LABELS, this.labelQuery()));
  // Both checked rows and indices are read off the FILTERED list.
  protected readonly labelChecked = computed(() =>
    this.labelMatches().flatMap((l, i) => (this.labels().includes(l) ? [i] : [])),
  );

  // The library's own components; a created row joins them.
  protected readonly components = signal<string[]>(COMPONENTS);
  protected readonly used = signal<string[]>(['Button', 'Combobox']);
  protected readonly componentQuery = signal('');
  protected readonly componentMatches = computed(() => matching(this.components(), this.componentQuery()));
  protected readonly usedChecked = computed(() =>
    this.componentMatches().flatMap((c, i) => (this.used().includes(c) ? [i] : [])),
  );
  protected readonly componentQ = computed(() => this.componentQuery().trim());
  protected readonly canCreate = computed(() => {
    const q = this.componentQ().toLowerCase();
    return q !== '' && !this.components().some((c) => c.toLowerCase() === q);
  });

  protected create() {
    const q = this.componentQ();
    this.components.update((c) => [...c, q]);
    this.used.update((u) => toggled(u, q));
    this.componentQuery.set('');
  }
}
