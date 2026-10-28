// ---------------------------------------------------------------------------
// DarkPreview of the surfaces page: wraps ComponentPreview so the whole
// preview (chrome included) renders in dark mode, regardless of the page
// theme. The painted bg-background fills behind the (transparent) tab bar; the
// radius matches the active shape so the dark fill doesn't poke past the
// preview's rounded corners.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { injectShape } from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview, type PreviewPadding } from '../../../docs-kit/component-preview';

@Component({
  selector: 'app-surfaces-preview',
  imports: [ComponentPreview],
  template: `
    <div [class]="wrapperClass()">
      <app-component-preview [code]="code()" [padding]="padding()">
        <ng-content />
      </app-component-preview>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurfacesPreview {
  readonly code = input.required<string>();
  readonly padding = input<PreviewPadding>('compact');

  private readonly shape = injectShape();

  protected readonly wrapperClass = computed(() => `dark bg-background ${this.shape().container}`);
}
