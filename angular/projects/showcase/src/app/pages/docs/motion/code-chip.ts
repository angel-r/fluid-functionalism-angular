// The inline code chip of the /docs/motion prose (React's local `Code`).
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-motion-code-chip',
  template: `<code
    class="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground"
    ><ng-content /></code
  >`,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeChip {}
