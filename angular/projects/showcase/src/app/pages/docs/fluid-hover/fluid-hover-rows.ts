// The bare row the /docs/fluid-hover demos share, ported from the `ROWS` /
// `rowClass` / `FluidRow` pieces of app/docs/fluid-hover/demos.tsx: a real
// button, registered with the enclosing list, so focus, activation and the
// label's announcement stay the row's own.
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FluidHoverItem } from '@angel-r/fluid-functionalism-angular';

/** The five labels every demo hovers. */
export const ROWS = ['Inbox', 'Drafts', 'Sent', 'Archive', 'Trash'];

/** The bare row: nothing competes with the mechanism. */
export const ROW_CLASS =
  'relative z-10 flex h-9 w-full shrink-0 items-center px-3 text-left text-site-body text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]';

@Component({
  selector: 'app-fluid-row',
  imports: [FluidHoverItem],
  template: `<button type="button" [ffFluidHoverItem]="index()" [class]="rowClass">
    <ng-content />
  </button>`,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluidRow {
  readonly index = input.required<number>();

  protected readonly rowClass = ROW_CLASS;
}
