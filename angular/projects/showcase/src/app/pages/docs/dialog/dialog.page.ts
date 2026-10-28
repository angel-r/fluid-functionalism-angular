// /docs/dialog, ported from app/docs/dialog/page.tsx: the basic dialog with
// its header and footer, the three widths, the dialog-sidebar block, then the
// API reference (three tables, one table with group headings). Motion lives in
// the component: the panel enters and exits on the library's springs.

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  SettingsDialog,
  type DialogSize,
} from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';
import { apiReference } from '../../../docs-kit/api/dialog';

const basicCode = `import {
  Button, Dialog, DialogTrigger, DialogContent,
  DialogHeader, DialogFooter, DialogTitle,
  DialogDescription, DialogClose,
} from "@angel-r/fluid-functionalism-angular";

<ff-dialog>
  <button ffButton ffDialogTrigger variant="tertiary">Open dialog</button>
  <ff-dialog-content size="sm">
    <div ffDialogHeader>
      <h2 ffDialogTitle>Create teamspace</h2>
      <p ffDialogDescription>
        Add a new teamspace to organize your projects.
      </p>
    </div>
    <div ffDialogFooter>
      <button ffButton ffDialogClose variant="ghost">Cancel</button>
      <button ffButton>Create</button>
    </div>
  </ff-dialog-content>
</ff-dialog>`;

const sizesCode = `import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, Button } from "@angel-r/fluid-functionalism-angular";

<!-- sm 400 · lg 540 · xl 880; 1 notch narrower in compact regions -->
<ff-dialog>
  <button ffButton ffDialogTrigger variant="secondary">Small</button>
  <ff-dialog-content size="sm">…</ff-dialog-content>
</ff-dialog>

<ff-dialog>
  <button ffButton ffDialogTrigger variant="secondary">Large</button>
  <ff-dialog-content size="lg">…</ff-dialog-content>
</ff-dialog>

<ff-dialog>
  <button ffButton ffDialogTrigger variant="secondary">Extra large</button>
  <ff-dialog-content size="xl">…</ff-dialog-content>
</ff-dialog>`;

const sidebarCode = `import { SettingsDialog } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

readonly settingsOpen = signal(false);

<button ffButton variant="secondary" (click)="settingsOpen.set(true)">Open settings</button>
<ff-settings-dialog [open]="settingsOpen()" (openChange)="settingsOpen.set($event)" />

<!-- The xl dialog drops its padding and takes a fixed height; the Sidebar
     runs the full left edge and the panel scrolls beside it. -->
<ff-dialog-content size="xl" class="flex h-[min(640px,calc(100dvh-4rem))] overflow-hidden p-0">
  <ff-sidebar-provider [persist]="false" [shortcut]="null" width="13rem" class="h-full min-h-0">
    <!-- a Sidebar of sections beside a scrolling panel -->
  </ff-sidebar-provider>
</ff-dialog-content>`;

@Component({
  selector: 'app-dialog-page',
  imports: [
    DocPage,
    DocSection,
    ComponentPreview,
    PropsTable,
    Button,
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
    DialogClose,
    SettingsDialog,
  ],
  template: `
    <app-doc-page
      title="Dialog"
      slug="dialog"
      description="3 widths, spring in and out."
      [installUsage]="basicCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Basic">
        <app-component-preview [code]="basicCode">
          <ff-dialog>
            <button ffButton ffDialogTrigger variant="tertiary">Open dialog</button>
            <ff-dialog-content>
              <div ffDialogHeader>
                <h2 ffDialogTitle>Create teamspace</h2>
                <p ffDialogDescription>
                  Add a new teamspace to organize your projects and collaborate with your team.
                </p>
              </div>
              <div ffDialogFooter>
                <button ffButton ffDialogClose variant="ghost">Cancel</button>
                <button ffButton>Create</button>
              </div>
            </ff-dialog-content>
          </ff-dialog>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Sizes">
        <p class="text-site-body text-muted-foreground">
          3 widths: <code>sm</code> for a confirmation, <code>lg</code> for a short form, <code>xl</code> for a
          layout of its own.
        </p>
        <app-component-preview [code]="sizesCode">
          <div class="flex flex-wrap items-center gap-2">
            @for (item of sizes; track item.size) {
              <ff-dialog>
                <button ffButton ffDialogTrigger variant="secondary">{{ item.label }}</button>
                <ff-dialog-content [size]="item.size">
                  <div ffDialogHeader>
                    <h2 ffDialogTitle>{{ item.label }} dialog</h2>
                    <p ffDialogDescription>{{ item.description }}</p>
                  </div>
                  <div ffDialogFooter>
                    <button ffButton ffDialogClose variant="ghost">Close</button>
                  </div>
                </ff-dialog-content>
              </ff-dialog>
            }
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="With a sidebar">
        <p class="text-site-body text-muted-foreground">
          The <code>dialog-sidebar</code> block: an <code>xl</code> dialog, a Sidebar of sections, a scrolling panel.
          Below <code>sm</code> a Select takes over.
        </p>
        <app-component-preview [code]="sidebarCode">
          <button ffButton variant="secondary" (click)="settingsOpen.set(true)">Open settings</button>
          <ff-settings-dialog [open]="settingsOpen()" (openChange)="settingsOpen.set($event)" />
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference">
        <app-props-table [groups]="api" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DialogPage {
  protected readonly api = apiReference;
  /** One line per prop, for the page's install prompt. */
  protected readonly installProps = this.api.flatMap((table) =>
    table.props
      .filter((prop) => !prop.name.startsWith('<') && !prop.name.startsWith('...'))
      .map((prop) => `${prop.name}: ${prop.type}. ${prop.description}`),
  );

  protected readonly basicCode = basicCode;
  protected readonly sizesCode = sizesCode;
  protected readonly sidebarCode = sidebarCode;

  protected readonly settingsOpen = signal(false);

  protected readonly sizes: { size: DialogSize; label: string; description: string }[] = [
    { size: 'sm', label: 'Small', description: '400px: a confirmation, 1 field, a short message.' },
    { size: 'lg', label: 'Large', description: '540px: a short form, or a longer confirmation.' },
    {
      size: 'xl',
      label: 'Extra large',
      description: '880px: 2 columns, a table, or a sidebar beside a panel.',
    },
  ];
}
