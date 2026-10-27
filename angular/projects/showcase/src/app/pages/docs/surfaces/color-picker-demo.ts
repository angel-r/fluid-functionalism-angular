// ---------------------------------------------------------------------------
// Color picker — the format dropdown sits one level above the picker panel.
// Ported from ColorPickerDemo of app/docs/surfaces/page.tsx: the picker opens
// its format menu inside the preview frame, so the popup stays in the demo.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ColorPicker, ColorPickerPortalContainer } from '@angel-r/fluid-functionalism-angular';
import { SurfacesPreview } from './preview';

const COLOR_PICKER_CODE = `<ff-color-picker defaultValue="#6B97FF" [formatOpen]="true" />

<!-- FormatDropdown sits inside the picker panel (substrate 3),
     so it lifts to surface-5 automatically. -->`;

@Component({
  selector: 'app-surfaces-color-picker-demo',
  imports: [ColorPicker, ColorPickerPortalContainer, SurfacesPreview],
  template: `
    <app-surfaces-preview [code]="colorPickerCode">
      <div
        #pickerPanel
        class="dark relative w-full rounded-2xl overflow-hidden flex items-start justify-center min-h-[520px] py-12 bg-background"
      >
        <div [ffColorPickerPortalContainer]="pickerPanel" style="display: contents">
          <ff-color-picker defaultValue="#6B97FF" [formatOpen]="true" />
        </div>
      </div>
    </app-surfaces-preview>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurfacesColorPickerDemo {
  protected readonly colorPickerCode = COLOR_PICKER_CODE;
}
