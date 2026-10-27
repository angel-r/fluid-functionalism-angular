import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService, injectShapeContext, injectSizeContext } from '@angel-r/fluid-functionalism-angular';
import { demos } from './demos/registry';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected readonly shape = injectShapeContext();
  protected readonly size = injectSizeContext();
  protected readonly groups = computed(() =>
    (['Foundations', 'Components', 'Blocks'] as const)
      .map((group) => ({ group, items: demos.filter((d) => d.group === group) }))
      .filter((g) => g.items.length > 0),
  );
}
