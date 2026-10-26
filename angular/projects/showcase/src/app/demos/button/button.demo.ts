import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Button, Icon } from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-button-demo',
  imports: [DemoPage, DemoSection, Button, Icon],
  template: `
    <app-demo-page title="Button" description="Versatile button with variants, sizes, loading state, and icon support.">
      <app-demo-section title="Variants">
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
      </app-demo-section>

      <app-demo-section title="With icons">
        <div class="flex flex-wrap items-center gap-2">
          <button ffButton leadingIcon="plus">Create</button>
          <button ffButton variant="secondary" trailingIcon="arrow-right">Next</button>
          <button ffButton variant="tertiary" leadingIcon="search" trailingIcon="arrow-right">Search</button>
        </div>
      </app-demo-section>

      <app-demo-section title="Sizes">
        <div class="flex flex-wrap items-center gap-2">
          <button ffButton variant="tertiary">Default</button>
          <button ffButton variant="tertiary" size="compact">Compact</button>
          <button ffButton variant="tertiary" size="icon" aria-label="Settings">
            <ff-icon name="settings" />
          </button>
          <button ffButton variant="tertiary" size="icon-compact" aria-label="Add">
            <ff-icon name="plus" />
          </button>
        </div>
      </app-demo-section>

      <app-demo-section title="Loading &amp; disabled">
        <div class="flex flex-wrap items-center gap-2">
          <button ffButton [loading]="loading()" (click)="load()">{{ loading() ? 'Loading' : 'Click me' }}</button>
          <button ffButton variant="secondary" loading leadingIcon="loader">Saving</button>
          <button ffButton disabled>Disabled</button>
        </div>
      </app-demo-section>

      <app-demo-section title="As a link">
        <a ffButton variant="secondary" href="https://github.com/mickadesign/fluid-functionalism" target="_blank" rel="noopener noreferrer" trailingIcon="arrow-right">
          Read the source
        </a>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ButtonDemo {
  protected readonly loading = signal(false);

  protected load() {
    this.loading.set(true);
    setTimeout(() => this.loading.set(false), 2000);
  }
}
