import { ChangeDetectionStrategy, Component, ElementRef, booleanAttribute, input, model, viewChild } from '@angular/core';
import { Icon, injectSize } from '../../core';
import { SidebarInput } from '../../sidebar-core';

// ---------------------------------------------------------------------------
// The header's search field, on the menu rows' own rhythm. The leading icon
// sits on the rows' 16px leading axis; pl-8 starts the text on the rows'
// 32px text axis; and the shortcut chip waits at the trailing edge, revealed
// on hover/focus — the placeholder owns the field at rest.
// ---------------------------------------------------------------------------

/**
 * A SidebarInput labelled "Search", with a leading search icon and a
 * shortcut chip.
 *
 *   <ff-sidebar-search-field [(value)]="query" />
 *   <ff-sidebar-search-field placeholder="Find a page" [shortcut]="null" />
 */
@Component({
  selector: 'ff-sidebar-search-field',
  imports: [Icon, SidebarInput],
  host: { style: 'display: contents' },
  template: `
    <div class="group/search relative">
      <ff-icon
        name="search"
        [size]="size().icon"
        [strokeWidth]="1.5"
        class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        #field
        ffSidebarInput
        aria-label="Search"
        class="pl-8 pr-12"
        [attr.name]="name() ?? null"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [value]="value()"
        (input)="value.set(field.value)"
      />
      @if (shortcut()) {
        <kbd
          class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-sans text-[length:var(--fs-micro,11px)] leading-[var(--lh-micro,14px)] text-muted-foreground opacity-0 transition-opacity duration-80 group-hover/search:opacity-100 group-focus-within/search:opacity-100"
          >{{ shortcut() }}</kbd
        >
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarSearchField {
  readonly placeholder = input('Search…');
  /** Keystroke shown in the trailing chip. Pass null to drop the chip. */
  readonly shortcut = input<string | null>('⌘K');
  /** The query. Bind with `[(value)]`. */
  readonly value = model('');
  readonly name = input<string | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly size = injectSize();
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  /** Moves focus into the field (e.g. from a ⌘K handler). */
  focus(options?: FocusOptions) {
    this.field().nativeElement.focus(options);
  }
}
