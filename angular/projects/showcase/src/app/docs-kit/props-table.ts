// ---------------------------------------------------------------------------
// The API reference table of a docs page, ported from lib/docs/PropsTable.tsx.
//
// Inputs (pass exactly one):
// - `props`: one group of rows.
// - `groups`: several groups in ONE table, each under a heading row, so the
//   columns line up from group to group.
//
// The Default column disappears when no row has a default (an all-"—" column
// is noise). The table scrolls horizontally inside the shape system's
// ScrollArea, with the site's scroll-fade edge, and keeps a legible minimum
// width before it does.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ScrollArea, fontWeights } from '@angel-r/fluid-functionalism-angular';
import type { ApiTable, PropDef } from './api/types';

interface TableSection {
  title?: string;
  rows: PropDef[];
}

@Component({
  selector: 'app-props-table',
  imports: [ScrollArea],
  templateUrl: './props-table.html',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropsTable {
  readonly props = input<PropDef[] | undefined>(undefined);
  readonly groups = input<ApiTable[] | undefined>(undefined);

  protected readonly semibold = fontWeights.semibold;

  protected readonly sections = computed<TableSection[]>(() => {
    const groups = this.groups();
    const props = this.props();
    if ((groups === undefined) === (props === undefined)) {
      throw new Error('app-props-table takes exactly one of `props` or `groups`.');
    }
    return groups ? groups.map((group) => ({ title: group.title, rows: group.props })) : [{ rows: props! }];
  });

  protected readonly showDefault = computed(() => this.sections().some((section) => section.rows.some((row) => row.default !== undefined)));

  protected readonly columns = computed(() => (this.showDefault() ? 4 : 3));
}
