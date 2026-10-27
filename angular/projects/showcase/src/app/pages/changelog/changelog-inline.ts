// ---------------------------------------------------------------------------
// A sentence from the changelog's data: plain runs and inline code, nothing
// else. Ported from `InlineText` in app/changelog/changelog-view.tsx; the
// code chips' ground comes from the theme's `code:not(pre code)` rule.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Inline } from './changelog-data';

@Component({
  selector: 'app-changelog-inline',
  template: `
    @for (part of inline(); track $index) {
      @if (part.type === 'code') {
        <code>{{ part.value }}</code>
      } @else {
        <span>{{ part.value }}</span>
      }
    }
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogInline {
  readonly inline = input.required<readonly Inline[]>();
}
