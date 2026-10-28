// ---------------------------------------------------------------------------
// The whole Google Fonts catalog in a command menu, each row set in its own
// face. Ported from lib/docs/google-font-picker.tsx: before anything is typed
// it lists popular heading families (the picked one first), and typing matches
// names, prefix matches first, 50 rows at most.
//
// The catalog is a static import here (site/google-fonts-data.ts): the React
// site loaded the JSON on first open to keep it out of the layout bundle, but
// headings read the same file, so it is already in this bundle.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import {
  CommandMenu,
  CommandMenuDialog,
  CommandMenuEmpty,
  CommandMenuFooter,
  CommandMenuItem,
  CommandMenuInput,
  CommandMenuList,
  CommandMenuRow,
  type CommandMenuFilter,
  type CommandMenuItemData,
} from '@angel-r/fluid-functionalism-angular';
import { HeadingFontService } from '../site/heading-font';
import { GOOGLE_FONTS } from '../site/google-fonts-data';
import {
  POPULAR_GOOGLE_FONTS,
  googleFontPreviewHref,
  type GoogleFont,
} from '../site/google-fonts';

/** Rows per query: enough to scan, few enough to preview in one request. */
const LIMIT = 50;

/** How long typing pauses before the rows' preview faces load: one request
 *  per settled query, not one per keystroke. */
const PREVIEW_DELAY_MS = 200;

/** The rows arrive filtered; the menu shows them as they are. */
const KEEP_ALL: CommandMenuFilter = () => true;

const BY_NAME = new Map(GOOGLE_FONTS.map((font) => [font.n, font]));

const CATALOG_SIZE = GOOGLE_FONTS.length.toLocaleString('en-US');

@Component({
  selector: 'app-google-font-picker',
  // The host stands in for React's fragment/root element: contents keeps it
  // out of the layout its children measured themselves against.
  host: { style: 'display: contents' },
  imports: [
    CommandMenu,
    CommandMenuDialog,
    CommandMenuEmpty,
    CommandMenuFooter,
    CommandMenuItem,
    CommandMenuInput,
    CommandMenuList,
    CommandMenuRow,
  ],
  template: `
    <ff-command-menu-dialog
      [open]="open()"
      (openChange)="onOpenChange($event)"
      [shortcut]="null"
      title="Google Fonts"
      description="Pick a family for the site's headings."
    >
      <!-- Rendered in place, not hoisted: a stylesheet in <head> that
           suspends the first paint would hide the page for a font. -->
      @if (previewHref(); as href) {
        <link rel="stylesheet" [attr.href]="href" />
      }
      <ff-command-menu
        [items]="items()"
        [query]="query()"
        (queryChange)="query.set($event)"
        [filter]="keepAll"
        (itemSelect)="pick($event)"
      >
        <ff-command-menu-input [placeholder]="placeholder" />
        <ff-command-menu-list>
          <ng-template ffCommandMenuRow let-item>
            <ff-command-menu-item [value]="item.value">
              <span class="min-w-0 flex-1 truncate py-1 -my-1" [style.font-family]="family(item.value)">{{
                item.label
              }}</span>
            </ff-command-menu-item>
          </ng-template>
          <ff-command-menu-empty>No family matches.</ff-command-menu-empty>
        </ff-command-menu-list>
        <ff-command-menu-footer />
      </ff-command-menu>
    </ff-command-menu-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleFontPicker {
  protected readonly keepAll = KEEP_ALL;
  protected readonly placeholder = `Search ${CATALOG_SIZE} Google Fonts…`;

  protected readonly query = signal('');
  private readonly heading = inject(HeadingFontService);
  protected readonly open = this.heading.picking;

  /** The rows for the current query. */
  protected readonly results = computed<GoogleFont[]>(() => {
    const query = this.query().trim().toLowerCase();
    if (query === '') {
      const current = this.heading.custom()?.n ?? null;
      const names = current
        ? [current, ...POPULAR_GOOGLE_FONTS.filter((name) => name !== current)]
        : [...POPULAR_GOOGLE_FONTS];
      return names.map((name) => BY_NAME.get(name)).filter((font): font is GoogleFont => !!font);
    }
    const prefix: GoogleFont[] = [];
    const inner: GoogleFont[] = [];
    for (const font of GOOGLE_FONTS) {
      const name = font.n.toLowerCase();
      if (name.startsWith(query)) prefix.push(font);
      else if (name.includes(query)) inner.push(font);
    }
    return [...prefix, ...inner].slice(0, LIMIT);
  });

  protected readonly items = computed<CommandMenuItemData[]>(() =>
    this.results().map((font) => ({ value: font.n, label: font.n })),
  );

  /** The rows' preview faces. The previous sheet stays until typing settles,
   *  so rows already shown keep their faces. */
  private readonly resultsHref = computed(() => {
    const results = this.results();
    return results.length > 0 ? googleFontPreviewHref(results) : null;
  });
  /** The preview sheet is a stylesheet link, which Angular sanitizes as a
   *  resource URL: the href comes from googleFontPreviewHref(), never from
   *  input, so it is trusted here. */
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly previewHref = signal<SafeResourceUrl | null>(null);

  constructor() {
    effect((onCleanup) => {
      const href = this.resultsHref();
      if (!href) return;
      const settled = this.query().trim() === '';
      const timer = setTimeout(
        () => this.previewHref.set(this.sanitizer.bypassSecurityTrustResourceUrl(href)),
        settled ? 0 : PREVIEW_DELAY_MS,
      );
      onCleanup(() => clearTimeout(timer));
    });
  }

  /** A row's label, in its own family. */
  protected family(name: string): string {
    return `"${name}", var(--font-sans)`;
  }

  protected onOpenChange(open: boolean): void {
    if (open) {
      this.heading.browse();
      return;
    }
    this.heading.closePicker();
    this.query.set('');
  }

  protected pick(item: CommandMenuItemData): void {
    const font = BY_NAME.get(item.value);
    if (!font) return;
    this.heading.pick(font);
    this.query.set('');
  }
}
