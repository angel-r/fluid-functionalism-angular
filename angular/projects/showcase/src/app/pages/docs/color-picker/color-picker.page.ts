// /docs/color-picker, ported from app/docs/color-picker/page.tsx: the inline
// panel and its popover trigger, the swatches, the OKLCH format, a controlled
// panel with its live value, a removable trigger, the eyedropper note, then
// the API reference. The snippets are the Angular API (S8).

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ColorPicker, ColorPickerPopover } from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';
import { apiReference } from '../../../docs-kit/api/color-picker';

const SWATCHES = ['#000000', '#FFFFFF', '#FF3B30', '#F0F0F0', '#E5E5E5', '#D0D0D0', 'rgba(0,0,0,0.5)'];

const basicCode = `import { ColorPicker } from "@angel-r/fluid-functionalism-angular";

<ff-color-picker defaultValue="#6B97FF" />`;

const popoverCode = `import { ColorPickerPopover } from "@angel-r/fluid-functionalism-angular";

<ff-color-picker-popover
  triggerLabel="Fill"
  defaultValue="#6B97FF"
/>`;

const swatchesCode = `import { ColorPicker } from "@angel-r/fluid-functionalism-angular";

readonly swatches = ["#000000", "#FFFFFF", "#FF3B30", "#F0F0F0", "#E5E5E5", "#D0D0D0", "rgba(0,0,0,0.5)"];

<ff-color-picker
  defaultValue="#6B97FF"
  [swatches]="swatches"
/>`;

const oklchCode = `import { ColorPicker } from "@angel-r/fluid-functionalism-angular";

<ff-color-picker defaultFormat="oklch" defaultValue="#6B97FF" />`;

const controlledCode = `import { ColorPicker } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

readonly color = signal("#6B97FF");

<ff-color-picker [(value)]="color" />
<p>Current: {{ color() }}</p>`;

const removeCode = `import { ColorPickerPopover } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

readonly color = signal<string | null>("#6B97FF");

@if (color(); as fill) {
  <ff-color-picker-popover
    triggerLabel="Fill"
    triggerShowRemove
    (triggerRemove)="color.set(null)"
    [value]="fill"
    (valueChange)="color.set($event ?? null)"
  />
} @else {
  <button (click)="color.set('#6B97FF')">+ Add fill</button>
}`;

@Component({
  selector: 'app-color-picker-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, ColorPicker, ColorPickerPopover],
  template: `
    <app-doc-page
      title="Color Picker"
      slug="color-picker"
      description="Color picker with HEX, RGB, HSL, and OKLCH formats, alpha channel, optional swatches, and an eyedropper. Available as an inline panel or popover."
      [installUsage]="basicCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Default">
        <app-component-preview [code]="basicCode">
          <ff-color-picker defaultValue="#6B97FF" />
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Popover">
        <app-component-preview [code]="popoverCode">
          <ff-color-picker-popover triggerLabel="Fill" defaultValue="#6B97FF" />
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="With Swatches">
        <app-component-preview [code]="swatchesCode">
          <ff-color-picker defaultValue="#6B97FF" [swatches]="swatches" />
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="OKLCH Format">
        <app-component-preview [code]="oklchCode">
          <ff-color-picker defaultFormat="oklch" defaultValue="#6B97FF" />
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Controlled">
        <app-component-preview [code]="controlledCode">
          <div class="flex flex-col gap-3 items-start">
            <ff-color-picker [(value)]="color" />
            <p class="text-site-body text-muted-foreground">
              Current: <span class="font-mono">{{ color() }}</span>
            </p>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Removable Trigger">
        <app-component-preview [code]="removeCode">
          @if (removableColor(); as fill) {
            <ff-color-picker-popover
              triggerLabel="Fill"
              triggerShowRemove
              (triggerRemove)="removableColor.set(null)"
              [value]="fill"
              (valueChange)="removableColor.set($event ?? null)"
            />
          } @else {
            <button
              type="button"
              (click)="removableColor.set('#6B97FF')"
              class="text-site-body text-muted-foreground hover:text-foreground border border-dashed border-border px-3 h-9 rounded-lg cursor-pointer"
            >
              + Add fill
            </button>
          }
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Eyedropper Support">
        <p class="text-site-body text-muted-foreground">
          The eyedropper uses the native
          <code class="font-mono text-site-caption">window.EyeDropper</code> API (Chromium-based browsers). It is
          automatically hidden in browsers that do not support it.
        </p>
      </app-doc-section>

      <app-doc-section title="API Reference">
        <app-props-table [groups]="api" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ColorPickerPage {
  protected readonly api = apiReference;
  /** One line per prop, for the page's install prompt. */
  protected readonly installProps = this.api.flatMap((table) =>
    table.props
      .filter((prop) => !prop.name.startsWith('<') && !prop.name.startsWith('...'))
      .map((prop) => `${prop.name}: ${prop.type}. ${prop.description}`),
  );

  protected readonly swatches = SWATCHES;
  protected readonly basicCode = basicCode;
  protected readonly popoverCode = popoverCode;
  protected readonly swatchesCode = swatchesCode;
  protected readonly oklchCode = oklchCode;
  protected readonly controlledCode = controlledCode;
  protected readonly removeCode = removeCode;

  protected readonly color = signal<string | undefined>('#6B97FF');
  protected readonly removableColor = signal<string | null>('#6B97FF');
}
