import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ThinkingIndicator } from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-thinking-indicator-demo',
  imports: [DemoPage, DemoSection, ThinkingIndicator],
  template: `
    <app-demo-page
      title="Thinking indicator"
      description="Animated status indicator with morphing SVG and cycling text."
    >
      <app-demo-section title="Basic">
        <ff-thinking-indicator />
      </app-demo-section>
      <app-demo-section title="Compact">
        <ff-thinking-indicator size="compact" />
      </app-demo-section>
      <app-demo-section title="Text only">
        <ff-thinking-indicator [showIcon]="false" />
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ThinkingIndicatorDemo {}
