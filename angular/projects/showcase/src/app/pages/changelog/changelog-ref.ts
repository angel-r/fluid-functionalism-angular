// ---------------------------------------------------------------------------
// One ref on a changelog entry: the pull request's number or the commit's short
// sha, in a 20px mono chip that tints under the pointer. Ported from RefChip in
// app/changelog/changelog-view.tsx.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ChangeRef } from './changelog-data';

/** Where the reference links its refs: the upstream repository the releases
 *  shipped in, whose commits and pull requests these refs name. */
const REPO = 'https://github.com/mickadesign/fluid-functionalism';

@Component({
  selector: 'app-changelog-ref',
  template: `
    <a
      [href]="href()"
      target="_blank"
      rel="noopener noreferrer"
      [attr.aria-label]="label()"
      class="flex h-5 items-center rounded-md px-1.5 font-mono text-site-caption tabular-nums text-muted-foreground outline-none transition-colors duration-80 hover:bg-active hover:text-foreground focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
    >
      <span class="[text-box:trim-both_cap_alphabetic]">{{ text() }}</span>
    </a>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogRef {
  readonly gitRef = input.required<ChangeRef>();

  protected readonly href = computed(() => {
    const ref = this.gitRef();
    return ref.type === 'pr' ? `${REPO}/pull/${ref.number}` : `${REPO}/commit/${ref.sha}`;
  });

  protected readonly label = computed(() => {
    const ref = this.gitRef();
    return ref.type === 'pr' ? `Pull request ${ref.number} on GitHub` : `Commit ${ref.sha} on GitHub`;
  });

  protected readonly text = computed(() => {
    const ref = this.gitRef();
    return ref.type === 'pr' ? `#${ref.number}` : ref.sha.slice(0, 7);
  });
}
