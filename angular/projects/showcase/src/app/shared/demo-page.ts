import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Page frame every demo uses: a title, a one-line description, sections. */
@Component({
  selector: 'app-demo-page',
  template: `
    <header class="mb-10 flex max-w-2xl flex-col gap-2">
      <h1 class="text-site-display font-semibold text-foreground">{{ title() }}</h1>
      @if (description()) {
        <p class="text-site-body text-muted-foreground">{{ description() }}</p>
      }
    </header>
    <div class="flex flex-col gap-12"><ng-content /></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoPage {
  readonly title = input.required<string>();
  readonly description = input<string>();
}

/** One titled example inside a demo page, on a bordered preview stage. */
@Component({
  selector: 'app-demo-section',
  template: `
    <section class="flex flex-col gap-3">
      <h2 class="text-site-subtitle font-medium text-foreground">{{ title() }}</h2>
      <div class="flex min-h-40 flex-wrap items-center justify-center gap-6 rounded-xl border border-border p-8">
        <ng-content />
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoSection {
  readonly title = input.required<string>();
}
