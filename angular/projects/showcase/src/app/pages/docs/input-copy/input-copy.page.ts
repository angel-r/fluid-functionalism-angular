// ---------------------------------------------------------------------------
// /docs/input-copy, ported from app/docs/input-copy/page.tsx: six sections
// (the two variants, both alignments, the disabled state, and the copy
// callback) plus the API reference. The visible values keep the reference's
// copy verbatim; the Code tabs show the Angular forms, and the Basic snippet
// is what the install prompt carries.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { InputCopy } from '@angel-r/fluid-functionalism-angular';
import { inputCopyProps } from '../../../docs-kit/api/input-copy';
import type { PropDef } from '../../../docs-kit/api/types';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';

/** The install prompt's one line per prop. */
function promptProps(props: readonly PropDef[]): string[] {
  return props
    .filter((prop) => !prop.name.startsWith('<ng-content'))
    .map(
      (prop) =>
        `${prop.name}: ${prop.type}${prop.default !== undefined ? ` (default ${prop.default})` : ''} — ${prop.description}`,
    );
}

@Component({
  selector: 'app-input-copy-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, InputCopy],
  template: `
    <app-doc-page
      title="InputCopy"
      description="Read-only input with a copy-to-clipboard button and animated check feedback."
      slug="input-copy"
      [installUsage]="basicCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Basic">
        <app-component-preview [code]="basicCode">
          <div class="w-72">
            <ff-input-copy [value]="installCommand" />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="With Label">
        <app-component-preview [code]="labelCode">
          <div class="w-72">
            <ff-input-copy label="Install command" [value]="installCommand" />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Button Variant">
        <app-component-preview [code]="buttonVariantCode">
          <div class="w-72">
            <ff-input-copy variant="button" [value]="installCommand" />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Left Aligned">
        <app-component-preview [code]="alignLeftCode">
          <div class="flex flex-col gap-4 w-72">
            <ff-input-copy align="left" [value]="installCommand" />
            <ff-input-copy variant="button" align="left" [value]="installCommand" />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Disabled">
        <app-component-preview [code]="disabledCode">
          <div class="w-72">
            <ff-input-copy label="Invite code" value="ABCD-1234-EFGH" disabled />
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Copy Callback">
        <app-component-preview [code]="callbackCode">
          <div class="w-72 flex flex-col gap-2">
            <ff-input-copy
              label="Share link"
              value="https://fluidfunctionalism.com/r/input-copy"
              (copied)="copyCount.set(copyCount() + 1)"
            />
            <p class="text-site-caption text-muted-foreground px-1">
              Copied {{ copyCount() }} {{ copyCount() === 1 ? 'time' : 'times' }}
            </p>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference">
        <app-props-table [props]="copyTable" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InputCopyPage {
  protected readonly installCommand = 'npx shadcn@latest add https://www.fluidfunctionalism.com/r/input-copy.json';

  protected readonly basicCode = `import { InputCopy } from '@angel-r/fluid-functionalism-angular';

<ff-input-copy value="npx shadcn@latest add https://www.fluidfunctionalism.com/r/input-copy.json" />`;

  protected readonly labelCode = `import { InputCopy } from '@angel-r/fluid-functionalism-angular';

<ff-input-copy
  label="Install command"
  value="npx shadcn@latest add https://www.fluidfunctionalism.com/r/input-copy.json"
/>`;

  protected readonly buttonVariantCode = `import { InputCopy } from '@angel-r/fluid-functionalism-angular';

<ff-input-copy
  variant="button"
  value="npx shadcn@latest add https://www.fluidfunctionalism.com/r/input-copy.json"
/>`;

  protected readonly alignLeftCode = `import { InputCopy } from '@angel-r/fluid-functionalism-angular';

<ff-input-copy
  align="left"
  value="npx shadcn@latest add https://www.fluidfunctionalism.com/r/input-copy.json"
/>
<ff-input-copy
  variant="button"
  align="left"
  value="npx shadcn@latest add https://www.fluidfunctionalism.com/r/input-copy.json"
/>`;

  protected readonly disabledCode = `import { InputCopy } from '@angel-r/fluid-functionalism-angular';

<ff-input-copy
  label="Invite code"
  value="ABCD-1234-EFGH"
  disabled
/>`;

  protected readonly callbackCode = `import { InputCopy } from '@angel-r/fluid-functionalism-angular';
import { signal } from '@angular/core';

readonly copyCount = signal(0);

<ff-input-copy
  label="Share link"
  value="https://fluidfunctionalism.com/r/input-copy"
  (copied)="copyCount.set(copyCount() + 1)"
/>

<p class="text-site-caption text-muted-foreground px-1">
  Copied {{ copyCount() }} {{ copyCount() === 1 ? 'time' : 'times' }}
</p>`;

  protected readonly installProps = promptProps(inputCopyProps);
  protected readonly copyTable = inputCopyProps;

  protected readonly copyCount = signal(0);
}
