// ---------------------------------------------------------------------------
// The Changelog (/changelog), ported from app/changelog/page.tsx and
// changelog-view.tsx: the title and its prev/next arrows, the copy-upgrade
// prompt, the month timeline with its index, the New / Breaking / Updated
// groups, the refs, the highlighted diffs and the live previews.
//
// The data is local module state (data/changelog.generated.ts, generated from
// content/changelog/*.md at build time), so the page never fetches anything.
// The diffs are the one async piece: shiki highlights them after the first
// paint, exactly as the reference did at build time.
// ---------------------------------------------------------------------------

import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  TemplateRef,
  afterNextRender,
  ViewContainerRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import {
  Button,
  Icon,
  ReducedMotion,
  Tooltip,
  fontWeights,
  injectSizeVariant,
} from '@angel-r/fluid-functionalism-angular';
import { docOrder } from '../../site/nav-data';
import { CopyPromptButton } from '../../site/copy-prompt-button';
import { RightRailService } from '../../site/right-rail';
import {
  KIND_DOT,
  KIND_LABEL,
  RELEASE_VIEWS,
  monthLabel,
  releasedLabel,
  type EntryView,
  type ReleaseView,
} from './changelog-data';
import { ChangelogInline } from './changelog-inline';
import { ChangelogIndex } from './changelog-index';
import { ChangelogMonthGlyph } from './changelog-month-glyph';
import { ChangelogRef } from './changelog-ref';
import { ChangelogStage } from './changelog-stage';
import { ChangelogTimelineMark } from './changelog-timeline-mark';
import { highlightDiff } from './diff-highlight';
import { hasPreview } from './previews';
import { buildMigrationPrompt, buildUpgradePrompt } from './prompts';

const ENTRY_SLUG = /^\/docs\/([^/#]+)$/;

function slugOf(entry: EntryView): string | undefined {
  return entry.href ? ENTRY_SLUG.exec(entry.href)?.[1] : undefined;
}

/** The slugs whose New entry gets a preview stage, keyed by entry id. */
const STAGE_BY_ENTRY: Readonly<Record<string, string>> = Object.fromEntries(
  RELEASE_VIEWS.flatMap((release) =>
    release.groups.flatMap((group) =>
      group.entries.flatMap((entry) => {
        const slug = slugOf(entry);
        return entry.kind === 'new' && slug && hasPreview(slug) ? [[entry.id, slug] as const] : [];
      }),
    ),
  ),
);

/** Each Breaking entry's migration prompt, built once: the sentences and the
 *  diff never change. */
const MIGRATION_PROMPTS: Readonly<Record<string, string>> = Object.fromEntries(
  RELEASE_VIEWS.flatMap((release) =>
    release.groups.flatMap((group) =>
      group.entries.flatMap((entry) =>
        entry.diff ? [[entry.id, buildMigrationPrompt({ entry, month: release.month })] as const] : [],
      ),
    ),
  ),
);

@Component({
  selector: 'app-changelog-page',
  imports: [
    RouterLink,
    Button,
    Icon,
    Tooltip,
    CopyPromptButton,
    ChangelogInline,
    ChangelogIndex,
    ChangelogMonthGlyph,
    ChangelogRef,
    ChangelogStage,
    ChangelogTimelineMark,
  ],
  templateUrl: './changelog.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ChangelogPage {
  protected readonly releases: readonly ReleaseView[] = RELEASE_VIEWS;
  protected readonly kindLabel = KIND_LABEL;
  protected readonly kindDot = KIND_DOT;
  protected readonly bold = fontWeights.bold;
  protected readonly semibold = fontWeights.semibold;
  protected readonly normal = fontWeights.normal;
  protected readonly next = docOrder[0];
  protected readonly upgradePrompt = buildUpgradePrompt();
  protected readonly monthOf = monthLabel;
  protected readonly releasedOn = releasedLabel;

  protected readonly iconSize = computed(() => (this.sizeVariant() === 'compact' ? 'icon-compact' : 'icon'));

  /** The month whose section crossed the top quarter of the window. */
  protected readonly activeMonth = signal<string | null>(RELEASE_VIEWS[0]?.month ?? null);

  /** The months whose link was just copied, for the glyph swap (each month
   *  holds its check for its own two seconds). */
  protected readonly copiedMonths = signal<Readonly<Record<string, true>>>({});

  /** The Breaking diffs, highlighted after the first paint. */
  protected readonly diffs = signal<Readonly<Record<string, SafeHtml>>>({});

  private readonly userPaused = signal<boolean | null>(null);
  /** Reduced motion starts the page paused; a visitor's choice wins over it. */
  protected readonly paused = computed(() => this.userPaused() ?? this.reduceMotion());

  private readonly sizeVariant = injectSizeVariant();
  private readonly reduceMotion = inject(ReducedMotion).value;
  private readonly document = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly rail = inject(RightRailService);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly releaseIndex = viewChild.required<TemplateRef<unknown>>('releaseIndex');

  private readonly copyTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private destroyed = false;

  constructor() {
    this.mountIndexCard();
    this.watchScroll();
    void this.highlightDiffs();
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.copyTimers.forEach((timer) => clearTimeout(timer));
      this.rail.clear();
    });
  }

  protected readonly stageByEntry = STAGE_BY_ENTRY;

  protected readonly migrationPrompts = MIGRATION_PROMPTS;

  /** The month's copy-link: the page's own URL plus the fragment, so the link
   *  works under the site's base path. */
  protected copyMonthLink(event: Event, month: string): void {
    event.preventDefault();
    const view = this.document.defaultView;
    view?.history.replaceState(view.history.state, '', `${view.location.search}#${month}`);
    void this.copyMonthUrl(month);
  }

  protected togglePaused(): void {
    this.userPaused.set(!this.paused());
  }

  private async copyMonthUrl(month: string): Promise<void> {
    const url = new URL(`changelog#${month}`, this.document.baseURI).toString();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    this.copiedMonths.set({ ...this.copiedMonths(), [month]: true });
    clearTimeout(this.copyTimers.get(month));
    this.copyTimers.set(
      month,
      setTimeout(() => {
        const next = { ...this.copiedMonths() };
        delete next[month];
        this.copiedMonths.set(next);
      }, 2000),
    );
  }

  /** Parks the Releases index in the desktop right rail: the only card that
   *  panel holds on this page (the shell hides its settings here). */
  private mountIndexCard(): void {
    afterRenderEffect(() => {
      this.rail.show(this.releaseIndex(), this.viewContainer);
    });
  }

  /** The month whose section crossed the top quarter of the window, or the last
   *  one at the bottom of the page. One rAF-coalesced pass per scroll/resize. */
  private watchScroll(): void {
    const view = this.document.defaultView;
    if (!view) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const months = this.releases.map((release) => release.month);
      if (months.length === 0) {
        this.activeMonth.set(null);
        return;
      }
      const root = this.document.documentElement;
      if (view.innerHeight + view.scrollY >= root.scrollHeight - 2) {
        this.activeMonth.set(months[months.length - 1]);
        return;
      }
      const line = view.innerHeight * 0.25;
      let current = months[0];
      for (const month of months) {
        const element = this.document.getElementById(month);
        if (element && element.getBoundingClientRect().top <= line) current = month;
      }
      this.activeMonth.set(current);
    };
    const schedule = () => {
      if (!frame) frame = view.requestAnimationFrame(update);
    };

    // The sections do not exist until the first render, and an update before
    // them reads a page too short to scroll and lights the last month.
    afterNextRender(update);
    view.addEventListener('scroll', schedule, { passive: true });
    view.addEventListener('resize', schedule);
    inject(DestroyRef).onDestroy(() => {
      if (frame) view.cancelAnimationFrame(frame);
      view.removeEventListener('scroll', schedule);
      view.removeEventListener('resize', schedule);
    });
  }

  /** Highlights every Breaking diff with shiki, once the page is on screen. */
  private async highlightDiffs(): Promise<void> {
    const highlighted: Record<string, SafeHtml> = {};
    await Promise.all(
      this.releases.flatMap((release) =>
        release.groups.flatMap((group) =>
          group.entries.flatMap((entry) =>
            entry.diff
              ? highlightDiff(entry.diff, entry.diffLang ?? 'tsx').then((html) => {
                  highlighted[entry.id] = this.sanitizer.bypassSecurityTrustHtml(html);
                })
              : [],
          ),
        ),
      ),
    );
    if (!this.destroyed) this.diffs.set(highlighted);
  }
}
