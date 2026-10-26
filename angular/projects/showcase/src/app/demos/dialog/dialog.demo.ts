import { ChangeDetectionStrategy, Component } from '@angular/core';
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
  type DialogSize,
} from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

const DIALOG_PARTS = [
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
];

@Component({
  selector: 'app-dialog-demo',
  imports: [DemoPage, DemoSection, DIALOG_PARTS],
  template: `
    <app-demo-page title="Dialog" description="3 widths, spring in and out.">
      <app-demo-section title="Basic">
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
      </app-demo-section>

      <app-demo-section title="Sizes">
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
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DialogDemo {
  protected readonly sizes: { size: DialogSize; label: string; description: string }[] = [
    { size: 'sm', label: 'Small', description: '400px: a confirmation, 1 field, a short message.' },
    { size: 'lg', label: 'Large', description: '540px: a short form, or a longer confirmation.' },
    { size: 'xl', label: 'Extra large', description: '880px: 2 columns, a table, or a sidebar beside a panel.' },
  ];
}
