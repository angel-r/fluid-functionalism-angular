// ---------------------------------------------------------------------------
// /docs/button, ported from app/docs/button/page.tsx: the playground (one real
// button driven by the rail's questions, its code kept in sync), the four
// variants inline and full width, the icons, the loading and disabled states,
// and the API reference.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  Button,
  Icon,
  Switch,
  fieldTouchClass,
  injectSizeVariant,
} from '@angel-r/fluid-functionalism-angular';
import { API_REFERENCE } from '../../../docs-kit/api';
import type { PropDef } from '../../../docs-kit/api/types';
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
  type PlayOption,
} from '../../../docs-kit/playground';
import { PropsTable } from '../../../docs-kit/props-table';

/** The install prompt's one line per prop. `<ng-content />` rows describe the
 *  projection, not an input, so they stay out. */
function promptProps(tables: readonly { props: PropDef[] }[]): string[] {
  return tables.flatMap((table) =>
    table.props
      .filter((prop) => !prop.name.startsWith('<ng-content'))
      .map(
        (prop) =>
          `${prop.name}: ${prop.type}${prop.default !== undefined ? ` (default ${prop.default})` : ''} — ${prop.description}`,
      ),
  );
}

type PlayVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost';
type PlaySize = 'compact' | 'default';

// "Icon only" swaps the text sizes for their square counterparts.
const ICON_ONLY_SIZE: Record<PlaySize, 'icon-compact' | 'icon'> = {
  compact: 'icon-compact',
  default: 'icon',
};

const PLAY_VARIANTS: readonly PlayVariant[] = ['primary', 'secondary', 'tertiary', 'ghost'];
const PLAY_SIZES: readonly PlaySize[] = ['compact', 'default'];
const LABELS = ['Get started', 'Learn more', 'Deploy', 'Continue', 'Ship it'] as const;

interface ButtonCodeOptions {
  variant: PlayVariant;
  size: PlaySize;
  iconOnly: boolean;
  leading: boolean;
  trailing: boolean;
  label: string;
  loading: boolean;
  active: boolean;
  disabled: boolean;
}

/** The playground state as the Angular snippet the Code tab shows: one line
 *  while it fits, one prop per line after that (the reference's 60-character
 *  rule). Icon-only buttons carry the label as their accessible name. */
function buildButtonCode(options: ButtonCodeOptions): string {
  const size = options.iconOnly ? ICON_ONLY_SIZE[options.size] : options.size;
  const props: string[] = [];
  if (options.variant !== 'primary') props.push(`variant="${options.variant}"`);
  if (size !== 'default') props.push(`size="${size}"`);
  if (!options.iconOnly && options.leading) props.push('leadingIcon="plus"');
  if (!options.iconOnly && options.trailing) props.push('trailingIcon="arrow-right"');
  if (options.loading) props.push('loading');
  if (options.active) props.push('active');
  if (options.disabled) props.push('disabled');
  if (options.iconOnly) props.push(`aria-label="${options.label}"`);
  const child = options.iconOnly ? '<ff-icon name="plus" />' : options.label;

  const oneLine = `<button ffButton${props.length ? ' ' + props.join(' ') : ''}>${child}</button>`;
  if (oneLine.length <= 60) return oneLine;
  return `<button ffButton\n${props.map((prop) => '  ' + prop).join('\n')}\n>\n  ${child}\n</button>`;
}

function pick<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

@Component({
  selector: 'app-button-page',
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
    Button,
    Icon,
    Switch,
  ],
  template: `
    <app-doc-page
      title="Button"
      slug="button"
      description="Versatile button with variants, sizes, loading state, and icon support."
      [installUsage]="variantsCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Playground">
        <app-playground-layout [preview]="playPreview" [controls]="playControls" />

        <!-- The playground's live preview: one real button, driven by the
             questions the rail asks. -->
        <ng-template #playPreview>
          <app-component-preview [code]="playCode()" minHeightClass="min-h-[280px]">
            <button
              ffButton
              [variant]="variant()"
              [size]="previewSize()"
              [leadingIcon]="previewLeading()"
              [trailingIcon]="previewTrailing()"
              [loading]="playLoading()"
              [active]="playActive()"
              [disabled]="playDisabled()"
              [attr.aria-label]="iconOnly() ? labelText() : null"
            >
              @if (iconOnly()) {
                <ff-icon name="plus" />
              } @else {
                {{ labelText() }}
              }
            </button>
          </app-component-preview>
        </ng-template>

        <!-- The controls, shown inline below the preview until the right
             rail exists (>=1280px). -->
        <ng-template #playControls>
          <app-playground-panel (shuffle)="randomize()">
            <app-play-section label="Button" />
            <div>
              <app-play-field label="Variant">
                <app-play-select
                  [value]="variant()"
                  [options]="variantOptions"
                  (valueChange)="setVariant($event)"
                />
              </app-play-field>
              <app-play-field label="Size">
                <app-play-select
                  [value]="size()"
                  [options]="sizeOptions"
                  (valueChange)="setSize($event)"
                />
              </app-play-field>
              <app-play-field label="Label" [disabled]="iconOnly()">
                <input
                  type="text"
                  [value]="label()"
                  (input)="setLabel($event)"
                  aria-label="Button label"
                  [class]="textClass"
                />
              </app-play-field>
              <ff-switch label="Icon only" [(checked)]="iconOnly" [class]="playSwitch" />
              <ff-switch
                label="Leading icon"
                [(checked)]="leading"
                [disabled]="iconOnly()"
                [class]="playSwitch"
              />
              <ff-switch
                label="Trailing icon"
                [(checked)]="trailing"
                [disabled]="iconOnly()"
                [class]="playSwitch"
              />
            </div>

            <app-play-divider />
            <app-play-section label="State" />
            <div>
              <ff-switch label="Loading" [(checked)]="playLoading" [class]="playSwitch" />
              <ff-switch label="Active" [(checked)]="playActive" [class]="playSwitch" />
              <ff-switch label="Disabled" [(checked)]="playDisabled" [class]="playSwitch" />
            </div>
          </app-playground-panel>
        </ng-template>
      </app-doc-section>

      <app-doc-section title="Variants">
        <p class="text-site-body text-muted-foreground">
          4 variants, inline or full width: add <code>class="w-full"</code> to stretch one to
          its container.
        </p>
        <app-component-preview [code]="variantsCode">
          <!-- w-fit: the frame hugs the inline row, and the full-width column
               below inherits exactly that width. -->
          <div class="flex w-fit max-w-full flex-col gap-8">
            <div class="flex items-center gap-2">
              <button ffButton variant="primary">Primary</button>
              <button ffButton variant="secondary">Secondary</button>
              <button ffButton variant="tertiary">Tertiary</button>
              <button ffButton variant="ghost">Ghost</button>
            </div>
            <div class="flex flex-col gap-2">
              <button ffButton variant="primary" class="w-full">Primary</button>
              <button ffButton variant="secondary" class="w-full">Secondary</button>
              <button ffButton variant="tertiary" class="w-full">Tertiary</button>
              <button ffButton variant="ghost" class="w-full">Ghost</button>
            </div>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="With Icons">
        <app-component-preview [code]="iconsCode">
          <div class="flex flex-wrap items-center gap-2">
            <button ffButton leadingIcon="plus">Create</button>
            <button ffButton variant="secondary" trailingIcon="arrow-right">Next</button>
            <button ffButton variant="tertiary" leadingIcon="search" trailingIcon="arrow-right">
              Search
            </button>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Loading & Disabled">
        <app-component-preview [code]="loadingCode">
          <div class="flex flex-wrap items-center gap-2">
            <button ffButton [loading]="loading()" (click)="load()">
              {{ loading() ? 'Loading' : 'Click me' }}
            </button>
            <button ffButton variant="secondary" loading leadingIcon="loader">Saving</button>
            <button ffButton disabled>Disabled</button>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference">
        <app-props-table [props]="buttonTable" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ButtonPage {
  protected readonly variantsCode = `import { Button } from '@angel-r/fluid-functionalism-angular';

<button ffButton>Primary</button>
<button ffButton variant="secondary">Secondary</button>
<button ffButton variant="tertiary">Tertiary</button>
<button ffButton variant="ghost">Ghost</button>

<!-- Full width: w-full stretches a button to its container. A w-fit
     container hugs the row above, so the column shares its width. -->
<div class="flex w-fit flex-col gap-8">
  <div class="flex items-center gap-2"><!-- the 4 buttons above --></div>
  <div class="flex flex-col gap-2">
    <button ffButton class="w-full">Primary</button>
    <button ffButton variant="secondary" class="w-full">Secondary</button>
    <button ffButton variant="tertiary" class="w-full">Tertiary</button>
    <button ffButton variant="ghost" class="w-full">Ghost</button>
  </div>
</div>`;

  protected readonly iconsCode = `import { Button } from '@angel-r/fluid-functionalism-angular';

<button ffButton leadingIcon="plus">Create</button>
<button ffButton variant="secondary" trailingIcon="arrow-right">Next</button>
<button ffButton variant="tertiary" leadingIcon="search" trailingIcon="arrow-right">
  Search
</button>`;

  protected readonly loadingCode = `import { Button } from '@angel-r/fluid-functionalism-angular';

<button ffButton loading>Loading</button>
<button ffButton variant="secondary" loading leadingIcon="loader">Saving</button>
<button ffButton disabled>Disabled</button>`;

  protected readonly buttonTable = API_REFERENCE['button'][0].props;
  protected readonly installProps = promptProps(API_REFERENCE['button']);

  // ── Playground ──────────────────────────────────────────
  private readonly globalSize = injectSizeVariant();

  protected readonly playSwitch = PLAY_SWITCH;
  /** The borderless label field, styled like the select rows; 16px on touch
   *  screens like every editable field. */
  protected readonly textClass = `h-7 w-[124px] rounded-md bg-transparent px-2 text-right text-site-body text-foreground transition-colors duration-80 hover:bg-hover focus:bg-hover outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] ${fieldTouchClass}`;

  protected readonly variant = signal<PlayVariant>('primary');
  // The Size control follows the site-wide step (right panel / S) until the
  // user picks a value here — then the explicit choice pins it.
  protected readonly sizeOverride = signal<PlaySize | null>(null);
  protected readonly size = computed<PlaySize>(() => this.sizeOverride() ?? this.globalSize());
  protected readonly iconOnly = signal(false);
  protected readonly leading = signal(false);
  protected readonly trailing = signal(false);
  protected readonly label = signal<string>(LABELS[0]);
  protected readonly playLoading = signal(false);
  protected readonly playActive = signal(false);
  protected readonly playDisabled = signal(false);

  // An emptied label field would render a collapsed button (and an empty
  // accessible name when icon-only) — fall back to the default label instead.
  protected readonly labelText = computed(() => (this.label().trim() === '' ? LABELS[0] : this.label()));

  protected readonly previewSize = computed(() => (this.iconOnly() ? ICON_ONLY_SIZE[this.size()] : this.size()));
  protected readonly previewLeading = computed(() => (!this.iconOnly() && this.leading() ? 'plus' : undefined));
  protected readonly previewTrailing = computed(() =>
    !this.iconOnly() && this.trailing() ? 'arrow-right' : undefined,
  );

  protected readonly playCode = computed(() =>
    buildButtonCode({
      variant: this.variant(),
      size: this.size(),
      iconOnly: this.iconOnly(),
      leading: this.leading(),
      trailing: this.trailing(),
      label: this.labelText(),
      loading: this.playLoading(),
      active: this.playActive(),
      disabled: this.playDisabled(),
    }),
  );

  protected readonly variantOptions: readonly PlayOption[] = [
    { value: 'primary', label: 'Primary' },
    { value: 'secondary', label: 'Secondary' },
    { value: 'tertiary', label: 'Tertiary' },
    { value: 'ghost', label: 'Ghost' },
  ];
  protected readonly sizeOptions: readonly PlayOption[] = [
    { value: 'compact', label: 'Compact' },
    { value: 'default', label: 'Default' },
  ];

  protected setVariant(value: string): void {
    this.variant.set(value as PlayVariant);
  }

  protected setSize(value: string): void {
    this.sizeOverride.set(value as PlaySize);
  }

  protected setLabel(event: Event): void {
    this.label.set((event.target as HTMLInputElement).value);
  }

  protected randomize(): void {
    this.variant.set(pick(PLAY_VARIANTS));
    this.sizeOverride.set(pick(PLAY_SIZES));
    this.iconOnly.set(Math.random() > 0.85);
    this.leading.set(Math.random() > 0.5);
    this.trailing.set(Math.random() > 0.75);
    this.label.set(pick(LABELS));
    this.playLoading.set(Math.random() > 0.85);
    this.playActive.set(Math.random() > 0.85);
    this.playDisabled.set(Math.random() > 0.9);
  }

  // ── Loading demo ────────────────────────────────────────
  protected readonly loading = signal(false);

  protected load(): void {
    this.loading.set(true);
    setTimeout(() => this.loading.set(false), 2000);
  }
}
