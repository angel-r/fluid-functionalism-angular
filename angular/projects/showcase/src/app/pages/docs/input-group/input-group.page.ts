// ---------------------------------------------------------------------------
// /docs/input-group, ported from app/docs/input-group/page.tsx: a single
// field, a stack of two, and the validation state, plus the two API
// reference tables. The group owns one fluid hover scope, so the sections
// keep their own group instead of sharing rows.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { InputField, InputGroup } from '@angel-r/fluid-functionalism-angular';
import { fieldProps, groupProps } from '../../../docs-kit/api/input-group';
import type { PropDef } from '../../../docs-kit/api/types';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';

/** The install prompt's one line per prop. `<ng-content />` rows describe the
 *  projection, not an input, so they stay out. */
function promptProps(props: readonly PropDef[]): string[] {
  return props
    .filter((prop) => !prop.name.startsWith('<ng-content'))
    .map(
      (prop) =>
        `${prop.name}: ${prop.type}${prop.default !== undefined ? ` (default ${prop.default})` : ''} — ${prop.description}`,
    );
}

@Component({
  selector: 'app-input-group-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, InputGroup, InputField],
  template: `
    <app-doc-page
      title="InputGroup"
      description="Input field group with fluid hover and validation."
      slug="input-group"
      [installUsage]="basicCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Basic">
        <app-component-preview [code]="basicCode">
          <ff-input-group>
            <ff-input-field
              [index]="0"
              label="Search"
              placeholder="Search teamspaces..."
              icon="search"
              [(value)]="search"
            />
          </ff-input-group>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Multiple Fields">
        <app-component-preview [code]="multipleCode">
          <ff-input-group>
            <ff-input-field [index]="0" label="Name" placeholder="Your name" [(value)]="name" />
            <ff-input-field
              [index]="1"
              label="Email"
              placeholder="you@example.com"
              icon="mail"
              [(value)]="email"
            />
          </ff-input-group>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Error State">
        <app-component-preview [code]="errorCode">
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
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference — InputGroup">
        <app-props-table [props]="groupTable" />
      </app-doc-section>

      <app-doc-section title="API Reference — InputField">
        <app-props-table [props]="fieldTable" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InputGroupPage {
  protected readonly basicCode = `import { InputGroup, InputField } from '@angel-r/fluid-functionalism-angular';
import { signal } from '@angular/core';

readonly search = signal('');

<ff-input-group>
  <ff-input-field
    [index]="0"
    label="Search"
    placeholder="Search teamspaces..."
    icon="search"
    [(value)]="search"
  />
</ff-input-group>`;

  protected readonly multipleCode = `import { InputGroup, InputField } from '@angel-r/fluid-functionalism-angular';
import { signal } from '@angular/core';

readonly name = signal('');
readonly email = signal('');

<ff-input-group>
  <ff-input-field [index]="0" label="Name" placeholder="Your name" [(value)]="name" />
  <ff-input-field
    [index]="1"
    label="Email"
    placeholder="you@example.com"
    icon="mail"
    [(value)]="email"
  />
</ff-input-group>`;

  protected readonly errorCode = `import { InputGroup, InputField } from '@angel-r/fluid-functionalism-angular';
import { signal } from '@angular/core';

readonly errorEmail = signal('bad@');

<ff-input-group>
  <ff-input-field
    [index]="0"
    label="Email"
    placeholder="you@example.com"
    icon="mail"
    [(value)]="errorEmail"
    error="Please enter a valid email address."
  />
</ff-input-group>`;

  protected readonly installProps = promptProps([...groupProps, ...fieldProps]);
  protected readonly groupTable = groupProps;
  protected readonly fieldTable = fieldProps;

  protected readonly search = signal('');
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly errorEmail = signal('bad@');
}
