import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ColorPicker, ColorPickerPopover } from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

const SWATCHES = ['#000000', '#FFFFFF', '#FF3B30', '#F0F0F0', '#E5E5E5', '#D0D0D0', 'rgba(0,0,0,0.5)'];

@Component({
  selector: 'app-color-picker-demo',
  imports: [DemoPage, DemoSection, ColorPicker, ColorPickerPopover],
  template: `
    <app-demo-page
      title="Color Picker"
      description="Color picker with HEX, RGB, HSL, and OKLCH formats, alpha channel, optional swatches, and an eyedropper. Available as an inline panel or popover."
    >
      <app-demo-section title="Default">
        <ff-color-picker defaultValue="#6B97FF" />
      </app-demo-section>

      <app-demo-section title="Popover">
        <ff-color-picker-popover triggerLabel="Fill" defaultValue="#6B97FF" />
      </app-demo-section>

      <app-demo-section title="With Swatches">
        <ff-color-picker defaultValue="#6B97FF" [swatches]="swatches" />
      </app-demo-section>

      <app-demo-section title="OKLCH Format">
        <ff-color-picker defaultFormat="oklch" defaultValue="#6B97FF" />
      </app-demo-section>

      <app-demo-section title="Controlled">
        <div class="flex flex-col gap-3 items-start">
          <ff-color-picker [(value)]="color" />
          <p class="text-site-body text-muted-foreground">
            Current: <span class="font-mono">{{ color() }}</span>
          </p>
        </div>
      </app-demo-section>

      <app-demo-section title="Removable Trigger">
        @if (removableColor(); as value) {
          <ff-color-picker-popover
            triggerLabel="Fill"
            triggerShowRemove
            (triggerRemove)="removableColor.set(null)"
            [value]="value"
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
      </app-demo-section>

      <app-demo-section title="Eyedropper Support">
        <p class="text-site-body text-muted-foreground">
          The eyedropper uses the native
          <code class="font-mono text-site-caption">window.EyeDropper</code> API (Chromium-based browsers). It is
          automatically hidden in browsers that do not support it.
        </p>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ColorPickerDemo {
  protected readonly swatches = SWATCHES;
  protected readonly color = signal<string | undefined>('#6B97FF');
  protected readonly removableColor = signal<string | null>('#6B97FF');
}
