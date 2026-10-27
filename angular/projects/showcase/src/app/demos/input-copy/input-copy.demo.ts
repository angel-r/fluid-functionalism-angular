import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { InputCopy } from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-input-copy-demo',
  imports: [DemoPage, DemoSection, InputCopy],
  template: `
    <app-demo-page
      title="Input copy"
      description="Read-only input with a copy-to-clipboard button and animated check feedback."
    >
      <app-demo-section title="Basic">
        <div class="w-72">
          <ff-input-copy [value]="installCommand" />
        </div>
      </app-demo-section>

      <app-demo-section title="With label">
        <div class="w-72">
          <ff-input-copy label="Install command" [value]="installCommand" />
        </div>
      </app-demo-section>

      <app-demo-section title="Button variant">
        <div class="w-72">
          <ff-input-copy variant="button" [value]="installCommand" />
        </div>
      </app-demo-section>

      <app-demo-section title="Left aligned">
        <div class="flex w-72 flex-col gap-4">
          <ff-input-copy align="left" [value]="installCommand" />
          <ff-input-copy variant="button" align="left" [value]="installCommand" />
        </div>
      </app-demo-section>

      <app-demo-section title="Compact">
        <div class="w-72">
          <ff-input-copy size="compact" label="Install command" [value]="installCommand" />
        </div>
      </app-demo-section>

      <app-demo-section title="Disabled">
        <div class="w-72">
          <ff-input-copy label="Invite code" value="ABCD-1234-EFGH" disabled />
        </div>
      </app-demo-section>

      <app-demo-section title="Copy callback">
        <div class="flex w-72 flex-col gap-2">
          <ff-input-copy
            label="Share link"
            value="https://fluidfunctionalism.com/r/input-copy"
            (copied)="copyCount.set(copyCount() + 1)"
          />
          <p class="text-site-caption px-1 text-muted-foreground">
            Copied {{ copyCount() }} {{ copyCount() === 1 ? 'time' : 'times' }}
          </p>
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InputCopyDemo {
  protected readonly installCommand = 'npx shadcn@latest add https://www.fluidfunctionalism.com/r/input-copy.json';
  protected readonly copyCount = signal(0);
}
