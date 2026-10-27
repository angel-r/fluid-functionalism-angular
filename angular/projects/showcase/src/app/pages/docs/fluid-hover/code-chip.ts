// The inline code chip used throughout the /docs/fluid-hover prose (React's
// local `Code` component in app/docs/fluid-hover/page.tsx).
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-code-chip',
  template: `<code
    class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground"
    ><ng-content /></code
  >`,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeChip {}
