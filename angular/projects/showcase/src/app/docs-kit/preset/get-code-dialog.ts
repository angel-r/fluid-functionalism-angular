// ---------------------------------------------------------------------------
// The playground's bottom action, ported from `GetCodeDialog` in
// lib/docs/preset-ui.tsx (D5).
//
// Inputs:
// - `def` (required): the component's preset definition (the one it was
//   registered with, see codec.ts).
// - `code` (required): the encoded configuration the playground currently
//   holds.
// - `snippet` (required): the Angular snippet generated from that
//   configuration (the component's template, plus the `provideFluid()` call the
//   page's settings imply), copied verbatim into the prompt.
// - `props`: optional one-line descriptions of the props the snippet sets.
// - `description`: optional one-liner about the component.
//
// Installable configurations copy a prompt (the same brief as the doc page's
// Installation row, pointed at this configuration); share-only ones open a
// dialog with the playground link
// `https://angel-r.github.io/fluid-functionalism-angular/docs/<slug>?preset=<code>`.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  InputCopy,
} from '@angel-r/fluid-functionalism-angular';
import { SITE } from '../../site/install-brief';
import { buildPresetPrompt } from '../../site/install-prompt';
import { CopyPromptButton } from '../../site/copy-prompt-button';
import type { PresetComponentDef } from './codec';

@Component({
  selector: 'app-get-code-dialog',
  imports: [
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    InputCopy,
    CopyPromptButton,
  ],
  template: `
    @if (def().installable) {
      <app-copy-prompt-button [prompt]="prompt()" class="xl:w-full" />
    } @else {
      <ff-dialog>
        <button ffButton ffDialogTrigger variant="primary" size="sm" class="w-full">Share</button>
        <ff-dialog-content size="sm" class="max-w-[480px]">
          <div ffDialogHeader>
            <h2 ffDialogTitle>Share this configuration</h2>
            <p ffDialogDescription>Reopens the {{ def().label }} playground exactly as configured.</p>
          </div>
          <ff-input-copy [value]="link()" />
        </ff-dialog-content>
      </ff-dialog>
    }
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GetCodeDialog {
  readonly def = input.required<PresetComponentDef>();
  readonly code = input.required<string>();
  readonly snippet = input.required<string>();
  readonly props = input<readonly string[] | undefined>(undefined);
  readonly description = input<string | undefined>(undefined);

  /** The page's slug: the last segment of the def's docs path. */
  private readonly slug = computed(() => {
    const segments = this.def().docsPath.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? '';
  });

  protected readonly link = computed(() => `${SITE}/docs/${this.slug()}?preset=${this.code()}`);

  protected readonly prompt = computed(() =>
    buildPresetPrompt({
      name: this.def().label,
      slug: this.slug(),
      code: this.code(),
      snippet: this.snippet(),
      props: this.props(),
      description: this.description(),
    }),
  );
}
