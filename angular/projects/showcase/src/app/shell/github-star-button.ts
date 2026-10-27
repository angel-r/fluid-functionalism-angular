// ---------------------------------------------------------------------------
// The GitHub star button beside "Make them yours" (D2: the port's fork).
// Ported from app/components/right-panel.tsx (GitHubStarButton): one fetch per
// page load shared by every instance, the count formatted like the original
// ("1.1k"), and on any failure only the count goes — the button stays.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  Button,
  injectShape,
  type IconFrame,
} from '@angel-r/fluid-functionalism-angular';
import { GITHUB_REPO, GITHUB_URL } from '../site/nav-data';

/** The GitHub mark, as an icon frame: filled, on the 16×16 grid the mark is
 *  drawn on. */
const GITHUB_ICON: IconFrame = {
  viewBox: '0 0 16 16',
  filled: true,
  nodes: [
    [
      'path',
      {
        d: 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z',
      },
    ],
  ],
};

/** "1.1k" past a thousand, the number itself below it. */
export function formatStars(count: number): string {
  if (count >= 1000) {
    const thousands = count / 1000;
    return thousands % 1 === 0 ? `${thousands}k` : `${thousands.toFixed(1)}k`;
  }
  return String(count);
}

// One fetch per page load, shared by every instance (the right panel and the
// mobile sheet's footer). Without the cache, each sheet open remounted the
// button and refired the unauthenticated API call — GitHub rate-limits those
// per IP, after which the count silently disappeared.
let cachedStars: number | null = null;
let starsRequest: Promise<number | null> | null = null;

function fetchStars(): Promise<number | null> {
  if (typeof fetch !== 'function') return Promise.resolve(null);
  starsRequest ??= fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((data: { stargazers_count?: number } | null) => {
      if (data?.stargazers_count != null) cachedStars = data.stargazers_count;
      return cachedStars;
    })
    .catch(() => null);
  return starsRequest;
}

@Component({
  selector: 'app-github-star-button',
  // The host stands in for React's fragment/root element: contents keeps it
  // out of the layout its children measured themselves against.
  host: { style: 'display: contents' },
  imports: [Button],
  template: `
    <button
      ffButton
      variant="ghost"
      size="sm"
      [leadingIcon]="icon"
      aria-label="View on GitHub"
      [class]="buttonClass()"
      (click)="openRepository()"
    >
      @if (label(); as label) {
        <span class="tabular-nums">{{ label }}</span>
      }
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GitHubStarButton {
  protected readonly icon = GITHUB_ICON;
  private readonly shape = injectShape();
  protected readonly buttonClass = computed(() => this.shape().button);

  private readonly stars = signal<number | null>(cachedStars);
  protected readonly label = computed(() => {
    const stars = this.stars();
    return stars === null ? null : formatStars(stars);
  });

  constructor() {
    if (cachedStars !== null) return;
    void fetchStars().then((count) => {
      if (count !== null) this.stars.set(count);
    });
  }

  protected openRepository(): void {
    window.open(GITHUB_URL, '_blank', 'noopener,noreferrer');
  }
}
