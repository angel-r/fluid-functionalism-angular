import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  DropdownEmpty,
  DropdownSearch,
  DropdownSearchHost,
  Elevated,
  FluidHoverHighlight,
  MenuItem,
} from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';
import { DemoMenuPanel } from '../menu-item/menu-item.demo';

const FOLDERS = ['Inbox', 'Archive', 'Drafts', 'Projects', 'Receipts', 'Travel', 'Family', 'Newsletters'];
const LABELS = ['Bug', 'Feature', 'Docs', 'Design', 'Question', 'Performance', 'Security'];

@Component({
  selector: 'app-dropdown-search-demo',
  imports: [
    DemoPage,
    DemoSection,
    DemoMenuPanel,
    DropdownSearch,
    DropdownSearchHost,
    DropdownEmpty,
    Elevated,
    FluidHoverHighlight,
    MenuItem,
  ],
  template: `
    <app-demo-page
      title="Dropdown search"
      description="A field pinned to the top of a menu. Filter the rows you render against its value; arrows leave the field for the first or last row and come back to it past either end, and typing on a row lands in the field."
    >
      <app-demo-section title="Move to folder">
        <div class="flex flex-col items-center gap-3">
          <div
            demoMenuPanel
            role="menu"
            #folders="demoMenuPanel"
            ffDropdownSearchHost
            [ffElevated]="2"
            [shadowLevel]="3"
            aria-label="Move to folder"
            class="relative flex max-h-72 w-72 max-w-full flex-col overflow-y-auto rounded-xl p-1 select-none"
          >
            <ff-fluid-hover-highlight [hover]="folders.hover" class="rounded-lg" />
            <ff-dropdown-search [(value)]="folderQuery" placeholder="Search folders" [autoFocus]="false" />
            @for (folder of filteredFolders(); track folder; let i = $index) {
              <ff-menu-item [index]="i" [label]="folder" (select)="moved.set(folder)" />
            } @empty {
              <ff-dropdown-empty>No folders match "{{ folderQuery() }}"</ff-dropdown-empty>
            }
          </div>
          <p class="text-site-caption text-muted-foreground">Moved to: {{ moved() }}</p>
        </div>
      </app-demo-section>

      <app-demo-section title="Filter checkable labels">
        <div
          demoMenuPanel
          role="menu"
          #labels="demoMenuPanel"
          ffDropdownSearchHost
          [checkedIndices]="checkedVisible()"
          [ffElevated]="2"
          [shadowLevel]="3"
          aria-label="Labels"
          class="relative flex max-h-72 w-72 max-w-full flex-col overflow-y-auto rounded-xl p-1 select-none"
        >
          <ff-fluid-hover-highlight [hover]="labels.hover" class="rounded-lg" />
          <ff-dropdown-search [(value)]="labelQuery" placeholder="Search labels" [autoFocus]="false" />
          @for (label of filteredLabels(); track label; let i = $index) {
            <ff-menu-item [index]="i" [label]="label" [checked]="picked().includes(label)" (select)="toggle(label)" />
          } @empty {
            <ff-dropdown-empty>No labels found</ff-dropdown-empty>
          }
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DropdownSearchDemo {
  protected readonly folderQuery = signal('');
  protected readonly moved = signal('nothing yet');
  protected readonly filteredFolders = computed(() =>
    FOLDERS.filter((f) => f.toLowerCase().includes(this.folderQuery().toLowerCase())),
  );

  protected readonly labelQuery = signal('');
  protected readonly picked = signal(['Bug', 'Docs']);
  protected readonly filteredLabels = computed(() =>
    LABELS.filter((l) => l.toLowerCase().includes(this.labelQuery().toLowerCase())),
  );
  /** Checked rows by their index in the filtered list (rows re-index as you type). */
  protected readonly checkedVisible = computed(() =>
    this.filteredLabels().flatMap((label, i) => (this.picked().includes(label) ? [i] : [])),
  );

  protected toggle(label: string) {
    this.picked.update((current) =>
      current.includes(label) ? current.filter((l) => l !== label) : [...current, label],
    );
  }
}
