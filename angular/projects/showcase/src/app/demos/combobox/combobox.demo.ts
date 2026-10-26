import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  Combobox,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxRow,
  type IconName,
} from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

interface Option {
  value: string;
  label: string;
}

interface View extends Option {
  icon: IconName;
}

const FRAMEWORKS: Option[] = [
  { value: 'next', label: 'Next.js' },
  { value: 'sveltekit', label: 'SvelteKit' },
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
  { value: 'solid', label: 'SolidStart' },
  { value: 'qwik', label: 'Qwik City' },
];

const VIEWS: View[] = [
  { value: 'shared', label: 'Shared with me', icon: 'users' },
  { value: 'starred', label: 'Starred', icon: 'star' },
  { value: 'recent', label: 'Recent', icon: 'clock' },
  { value: 'private', label: 'Private', icon: 'lock' },
  { value: 'inbox', label: 'Inbox', icon: 'mail' },
];

/** The library's own components: long enough for the list to scroll. */
const COMPONENTS: Option[] = [
  { value: 'accordion', label: 'Accordion' },
  { value: 'badge', label: 'Badge' },
  { value: 'button', label: 'Button' },
  { value: 'card', label: 'Card' },
  { value: 'checkbox-group', label: 'CheckboxGroup' },
  { value: 'color-picker', label: 'ColorPicker' },
  { value: 'combobox', label: 'Combobox' },
  { value: 'dialog', label: 'Dialog' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'input-group', label: 'InputGroup' },
  { value: 'radio-group', label: 'RadioGroup' },
  { value: 'select', label: 'Select' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'slider', label: 'Slider' },
  { value: 'switch', label: 'Switch' },
  { value: 'table', label: 'Table' },
  { value: 'tabs', label: 'Tabs' },
];

const DEFAULT_PICKS = ['button', 'combobox'];

const TIMEZONES = [
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

function itemFromQuery(query: string): Option {
  return { value: query.toLowerCase().replace(/\s+/g, '-'), label: query };
}

@Component({
  selector: 'app-combobox-demo',
  imports: [
    DemoPage,
    DemoSection,
    Combobox,
    ComboboxInput,
    ComboboxChips,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxEmpty,
    ComboboxRow,
  ],
  template: `
    <app-demo-page title="Combobox" description="Type to filter a list. 1 pick, or chips.">
      <!-- Items are data on the root; the list stamps the row template once
           per match. Type, then press Enter to pick the highlighted row. -->
      <app-demo-section title="Basic">
        <ff-combobox [items]="frameworks" [(value)]="framework">
          <ff-combobox-input placeholder="Select a framework…" />
          <ff-combobox-content>
            <ff-combobox-empty>No framework found.</ff-combobox-empty>
            <ff-combobox-list>
              <ng-template ffComboboxRow let-value="value" let-label="label">
                <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
              </ng-template>
            </ff-combobox-list>
          </ff-combobox-content>
        </ff-combobox>
      </app-demo-section>

      <app-demo-section title="With icons">
        <ff-combobox [items]="views" [(value)]="view">
          <ff-combobox-input icon="search" placeholder="Jump to view…" />
          <ff-combobox-content>
            <ff-combobox-empty>No view matches.</ff-combobox-empty>
            <ff-combobox-list>
              <ng-template ffComboboxRow let-item>
                <ff-combobox-item [value]="item.value" [icon]="item.icon">{{ item.label }}</ff-combobox-item>
              </ng-template>
            </ff-combobox-list>
          </ff-combobox-content>
        </ff-combobox>
      </app-demo-section>

      <!-- multiple + chips: 1 chip per pick, touching picks share one
           background. Backspace in an empty field drops the last chip. -->
      <app-demo-section title="Multiple selection">
        <ff-combobox multiple [items]="frameworks" [(value)]="stack">
          <ff-combobox-chips placeholder="Add frameworks…" class="w-[360px] max-w-full" />
          <ff-combobox-content>
            <ff-combobox-empty>No framework found.</ff-combobox-empty>
            <ff-combobox-list>
              <ng-template ffComboboxRow let-value="value" let-label="label">
                <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
              </ng-template>
            </ff-combobox-list>
          </ff-combobox-content>
        </ff-combobox>
      </app-demo-section>

      <!-- onCreate adds a last row whenever the query matches no label
           exactly. Type a component that is not there, then press Enter. -->
      <app-demo-section title="Create from the query">
        <ff-combobox multiple [items]="components()" [(value)]="picked" [onCreate]="create">
          <ff-combobox-chips placeholder="Add components…" class="w-[360px] max-w-full" />
          <ff-combobox-content>
            <ff-combobox-empty>No component found.</ff-combobox-empty>
            <ff-combobox-list>
              <ng-template ffComboboxRow let-value="value" let-label="label">
                <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
              </ng-template>
            </ff-combobox-list>
          </ff-combobox-content>
        </ff-combobox>
      </app-demo-section>

      <!-- hideSelected takes a pick out of the list, so it reads as what is
           left to add. Remove a chip to bring its row back. -->
      <app-demo-section title="Hide picked rows">
        <ff-combobox multiple hideSelected [items]="allComponents" [(value)]="remaining">
          <ff-combobox-chips placeholder="Add components…" class="w-[360px] max-w-full" />
          <ff-combobox-content>
            <ff-combobox-empty allSelected="Every component is added.">No component found.</ff-combobox-empty>
            <ff-combobox-list>
              <ng-template ffComboboxRow let-value="value" let-label="label">
                <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
              </ng-template>
            </ff-combobox-list>
          </ff-combobox-content>
        </ff-combobox>
      </app-demo-section>

      <app-demo-section title="Variants">
        <div class="flex flex-wrap items-center gap-3">
          <ff-combobox [items]="frameworks" [(value)]="bordered">
            <ff-combobox-input variant="bordered" placeholder="Bordered" />
            <ff-combobox-content>
              <ff-combobox-empty>No framework found.</ff-combobox-empty>
              <ff-combobox-list>
                <ng-template ffComboboxRow let-value="value" let-label="label">
                  <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
                </ng-template>
              </ff-combobox-list>
            </ff-combobox-content>
          </ff-combobox>
          <ff-combobox [items]="frameworks" [(value)]="borderless">
            <ff-combobox-input variant="borderless" placeholder="Borderless" />
            <ff-combobox-content>
              <ff-combobox-empty>No framework found.</ff-combobox-empty>
              <ff-combobox-list>
                <ng-template ffComboboxRow let-value="value" let-label="label">
                  <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
                </ng-template>
              </ff-combobox-list>
            </ff-combobox-content>
          </ff-combobox>
        </div>
      </app-demo-section>

      <!-- String items are their own value and label. The list scrolls past
           300px. -->
      <app-demo-section title="Long list">
        <ff-combobox [items]="timezones" [(value)]="timezone">
          <ff-combobox-input icon="globe" placeholder="Search timezones…" class="w-[280px]" />
          <ff-combobox-content>
            <ff-combobox-empty>No timezone matches.</ff-combobox-empty>
            <ff-combobox-list>
              <ng-template ffComboboxRow let-value="value" let-label="label">
                <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
              </ng-template>
            </ff-combobox-list>
          </ff-combobox-content>
        </ff-combobox>
      </app-demo-section>

      <app-demo-section title="Compact and clearable">
        <ff-combobox size="compact" [items]="frameworks" [(value)]="compact">
          <ff-combobox-input clearable placeholder="Select a framework…" />
          <ff-combobox-content>
            <ff-combobox-empty>No framework found.</ff-combobox-empty>
            <ff-combobox-list>
              <ng-template ffComboboxRow let-value="value" let-label="label">
                <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
              </ng-template>
            </ff-combobox-list>
          </ff-combobox-content>
        </ff-combobox>
      </app-demo-section>

      <app-demo-section title="Error & disabled">
        <div class="flex flex-wrap items-start gap-3">
          <ff-combobox [items]="frameworks" [(value)]="errored">
            <ff-combobox-input placeholder="Select a framework…" error="Pick a framework to continue." />
            <ff-combobox-content>
              <ff-combobox-empty>No framework found.</ff-combobox-empty>
              <ff-combobox-list>
                <ng-template ffComboboxRow let-value="value" let-label="label">
                  <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
                </ng-template>
              </ff-combobox-list>
            </ff-combobox-content>
          </ff-combobox>
          <ff-combobox [items]="frameworks" disabled>
            <ff-combobox-input placeholder="Disabled" />
            <ff-combobox-content>
              <ff-combobox-list>
                <ng-template ffComboboxRow let-value="value" let-label="label">
                  <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
                </ng-template>
              </ff-combobox-list>
            </ff-combobox-content>
          </ff-combobox>
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ComboboxDemo {
  protected readonly frameworks = FRAMEWORKS;
  protected readonly views = VIEWS;
  protected readonly timezones = TIMEZONES;
  protected readonly allComponents = COMPONENTS;

  protected readonly framework = signal('');
  protected readonly view = signal('');
  protected readonly bordered = signal('');
  protected readonly borderless = signal('');
  protected readonly timezone = signal('');
  protected readonly compact = signal('');
  protected readonly errored = signal('');
  protected readonly stack = signal<string[]>(['next', 'astro']);
  protected readonly components = signal<Option[]>(COMPONENTS);
  protected readonly picked = signal<string[]>(DEFAULT_PICKS);
  protected readonly remaining = signal<string[]>(DEFAULT_PICKS);

  /** A created row joins the components; returning it selects it. */
  protected readonly create = (query: string): Option => {
    const item = itemFromQuery(query);
    this.components.update((prev) => [...prev, item]);
    return item;
  };
}
