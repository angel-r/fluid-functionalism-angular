// ---------------------------------------------------------------------------
// The page chrome of every docs page, ported from lib/docs/DocPage.tsx:
// title + prev/next arrows with tooltips, description, the Installation row
// with its Copy prompt, then the page's sections.
//
// React dropped the flavor toggle (D1), so the installation note is the page's
// own note (or its system entry's), then the generic one-prompt line.
//
// Inputs:
// - `title` (required): the page's h1.
// - `description`: the paragraph under the title, and the one-liner the install
//   prompt carries.
// - `intro`: optional short paragraph under the description, read before the
//   Installation row (the Typography page uses it).
// - `slug`: the page's docs slug. Selects the prev/next step from `docOrder`
//   (the first page steps back to /changelog) and turns the Installation row on.
// - `installSlug`: the library piece the page installs, when it is not the slug
//   itself (a system page: Surfaces installs `elevated`). Used to find the
//   system entry whose note describes that install.
// - `installNote`: replaces the note under "Installation".
// - `installPrompt`: replaces the generated install brief (the Skill page
//   installs an agent skill, not a component).
// - `showInstall` (default true): set false for a page that provides its own
//   installation block.
// - `installUsage`: optional Angular snippet for the install prompt, as the
//   page's Code tab shows it.
// - `installProps`: optional one-line prop descriptions for the install prompt.
//
// Projection: `<ng-content select="[doc-description]">` replaces the plain
// description when a page needs inline markup (the two system pages do). Put
// inline content on a `[doc-description]` element, no wrapper paragraph: the
// component renders it inside the styled paragraph. Everything else projects
// into the page column as usual.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, Icon, Tooltip, fontWeights, injectSizeVariant } from '@angel-r/fluid-functionalism-angular';
import { CopyPromptButton } from '../site/copy-prompt-button';
import { buildPagePrompt } from '../site/install-prompt';
import { docNames, docOrder, systemList } from '../site/nav-data';

/** The note under "Installation" when a page says nothing specific: one brief
 *  instead of a registry item, for pages under no system. */
// The React page's flavor note ("Same source under both flavors.") has no
// subject here: D1 removed the primitive choice and the port ships one
// implementation, so the note says what the command actually adds.
const GENERIC_NOTE = 'One package: the install command adds every component, not just this one.';

interface DocStep {
  href: string;
  name: string;
}

@Component({
  selector: 'app-doc-page',
  imports: [RouterLink, Button, Icon, Tooltip, CopyPromptButton],
  templateUrl: './doc-page.html',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocPage {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly intro = input('');
  readonly slug = input<string | undefined>(undefined);
  readonly installSlug = input<string | undefined>(undefined);
  readonly installNote = input<string | undefined>(undefined);
  readonly installPrompt = input<string | undefined>(undefined);
  readonly showInstall = input(true, { transform: booleanAttribute });
  readonly installUsage = input<string | undefined>(undefined);
  readonly installProps = input<readonly string[] | undefined>(undefined);

  protected readonly bold = fontWeights.bold;
  protected readonly semibold = fontWeights.semibold;

  private readonly sizeVariant = injectSizeVariant();

  /** Square buttons have no provider-following value, so the prev/next arrows
   *  derive their step explicitly (see /docs/sizes). */
  protected readonly iconSize = computed(() => (this.sizeVariant() === 'compact' ? 'icon-compact' : 'icon'));

  /** The system entry this page belongs to: by its own slug, or by the piece
   *  it installs. */
  private readonly system = computed(() => {
    const slug = this.slug();
    const installSlug = this.installSlug();
    return systemList.find(
      (entry) => entry.slug === slug || (installSlug !== undefined && entry.installSlug === installSlug),
    );
  });

  protected readonly showInstallRow = computed(() => !!this.slug() && this.showInstall());

  /** What the install adds, as the row shows it. */
  private readonly installNoteText = computed(
    () => this.installNote() ?? this.system()?.installNote,
  );

  protected readonly note = computed(() => this.installNoteText() ?? GENERIC_NOTE);

  protected readonly prompt = computed(() => {
    const explicit = this.installPrompt();
    if (explicit !== undefined) return explicit;
    const slug = this.slug() ?? '';
    return buildPagePrompt({
      name: (slug ? docNames.get(slug) : undefined) ?? this.title(),
      slug,
      description: this.description(),
      usage: this.installUsage(),
      props: this.installProps(),
      installNote: this.installNoteText(),
    });
  });

  protected readonly nav = computed<{ prev: DocStep | null; next: DocStep | null }>(() => {
    const slug = this.slug();
    const index = slug ? docOrder.findIndex((page) => page.slug === slug) : -1;
    if (index === -1) return { prev: null, next: null };
    // The first doc page steps back to the Changelog, which sits between the
    // Introduction and the systems in the sidebar.
    const prev =
      index > 0
        ? { href: `/docs/${docOrder[index - 1].slug}`, name: docOrder[index - 1].name }
        : { href: '/changelog', name: 'Changelog' };
    const next = index < docOrder.length - 1 ? { href: `/docs/${docOrder[index + 1].slug}`, name: docOrder[index + 1].name } : null;
    return { prev, next };
  });
}

/** One titled group inside a page.
 *
 * Input: `title`. Projects the section's content.
 *
 * The extra top padding (over the page's gap-8) lets each section breathe; the
 * heading's negative margin tucks the content against its title while the gap
 * gives what follows a fuller 16px. */
@Component({
  selector: 'app-doc-section',
  template: `
    <div class="flex flex-col gap-4 pt-6">
      <h2
        class="-mb-2 text-site-title text-foreground leading-none"
        [style.font-variation-settings]="semibold"
      >
        {{ title() }}
      </h2>
      <ng-content />
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocSection {
  readonly title = input.required<string>();
  protected readonly semibold = fontWeights.semibold;
}
