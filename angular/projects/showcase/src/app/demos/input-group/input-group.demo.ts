import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { InputField, InputGroup } from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

@Component({
  selector: 'app-input-group-demo',
  imports: [DemoPage, DemoSection, InputGroup, InputField],
  template: `
    <app-demo-page title="InputGroup" description="Input field group with fluid hover and validation.">
      <app-demo-section title="Basic">
        <ff-input-group>
          <ff-input-field [index]="0" label="Search" placeholder="Search teamspaces..." icon="search" [(value)]="search" />
        </ff-input-group>
      </app-demo-section>
      <app-demo-section title="Multiple Fields">
        <ff-input-group>
          <ff-input-field [index]="0" label="Name" placeholder="Your name" [(value)]="name" />
          <ff-input-field [index]="1" label="Email" placeholder="you@example.com" icon="mail" [(value)]="email" />
        </ff-input-group>
      </app-demo-section>
      <app-demo-section title="Error State">
        <ff-input-group>
          <ff-input-field
            [index]="0"
            label="Email"
            placeholder="you@example.com"
            icon="mail"
            [(value)]="errorEmail"
            error="Please enter a valid email address."
          />
        </ff-input-group>
      </app-demo-section>
      <app-demo-section title="Compact and disabled">
        <ff-input-group size="compact">
          <ff-input-field [index]="0" label="Workspace" placeholder="acme" [(value)]="workspace" />
          <ff-input-field [index]="1" label="Owner" value="Read only" disabled />
        </ff-input-group>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InputGroupDemo {
  protected readonly search = signal('');
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly errorEmail = signal('bad@');
  protected readonly workspace = signal('');
}
