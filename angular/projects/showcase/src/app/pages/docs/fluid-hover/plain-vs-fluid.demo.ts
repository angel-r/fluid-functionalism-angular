// The framed version of the comparison (the reference's `PlainVsFluidDemo`):
// the preview chrome, its Code tab, and the play/pause control that holds the
// cursors on any frame — in the header, where React's `playbackButton` sits.
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentPreview, PreviewActionButton } from '../../../docs-kit/component-preview';
import { PlainVsFluidPreview } from './plain-vs-fluid.preview';
import { fluidHoverCode } from './fluid-hover-snippets';

@Component({
  selector: 'app-plain-vs-fluid-demo',
  imports: [ComponentPreview, PreviewActionButton, PlainVsFluidPreview],
  host: { style: 'display: contents' },
  template: `
    <app-component-preview [code]="code">
      <app-preview-action-button
        [icon]="paused() ? 'play' : 'pause'"
        [tooltip]="paused() ? 'Play' : 'Pause'"
        (pressed)="paused.update((v) => !v)"
      />
      <app-fluid-hover-plain-vs-fluid [paused]="paused()" />
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlainVsFluidDemo {
  protected readonly code = fluidHoverCode;
  protected readonly paused = signal(false);
}
