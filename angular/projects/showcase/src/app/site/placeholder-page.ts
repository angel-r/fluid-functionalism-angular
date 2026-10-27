// A page stub while the real one is being ported. Each route starts as one of
// these so the route table can be complete from T1 on; the task that owns the
// page replaces the file with the real component.

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-placeholder-page',
  template: `
    <section class="mx-auto flex w-full max-w-2xl flex-col gap-2 px-6 py-24">
      <h1 class="text-site-display text-foreground">{{ title() }}</h1>
      <p class="text-site-body text-muted-foreground">This page is not ported yet.</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderPage {
  readonly title = input('');
}
