import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { cn } from '../core/utils';
import { fontWeights } from '../core/font-weight';

/**
 * A row's label with the ghost-span weight treatment. Leading text of the
 * projected content becomes the label: it moves into the visible cell of an
 * inline grid whose ghost cell reserves the width at the heaviest weight, so
 * the row never reflows when the weight animates. Element children after the
 * text (dots, trailing icons, a chevron) stay flex siblings of the label —
 * outside the text-box-trimmed span, which would clip an inline SVG, and where
 * `ml-auto` can push a trailing control to the row's end. Without leading
 * text, the content renders in a plain flex span. (React: `MenuRowLabel`.)
 *
 * Internal to SidebarMenuButton / SidebarMenuSubButton; the host is
 * `display: contents`.
 */
@Component({
  selector: 'ff-sidebar-menu-row-label',
  host: { style: 'display: contents' },
  template: `
    <span [class]="gridClass()">
      <!-- Ghost: reserves width at the heaviest weight, hidden from AT. Both
           cells truncate so a long label clips with an ellipsis instead of
           wrapping the row. The trim box spans cap height to baseline, so the
           overflow clip would shave ascenders and descenders — symmetric
           padding extends the clip box past both and the negative margins
           cancel it out of the row's height. -->
      <span
        data-slot="sidebar-menu-label-ghost"
        class="col-start-1 row-start-1 invisible truncate pt-[0.25em] -mt-[0.25em] pb-[0.25em] -mb-[0.25em] [text-box:trim-both_cap_alphabetic]"
        [style.font-variation-settings]="semibold"
        aria-hidden="true"
        >{{ text() }}</span
      >
      <!-- Visible: animates between weights in the same cell. -->
      <span
        #visible
        data-slot="sidebar-menu-label"
        [class]="visibleClass()"
        [style.font-variation-settings]="emphasized() ? semibold : normal"
      ></span>
    </span>
    <span #rest [class]="restClass()"><ng-content /></span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarMenuRowLabel {
  readonly lit = input(false, { transform: booleanAttribute });
  readonly emphasized = input(false, { transform: booleanAttribute });
  readonly textClass = input('');

  protected readonly semibold = fontWeights.semibold;
  protected readonly normal = fontWeights.normal;

  /** The label text (the leading text of the content), or '' when none. */
  readonly text = signal('');
  readonly hasLabel = computed(() => this.text().trim() !== '');

  private readonly visible = viewChild.required<ElementRef<HTMLElement>>('visible');
  private readonly rest = viewChild.required<ElementRef<HTMLElement>>('rest');

  protected readonly gridClass = computed(() =>
    cn('inline-grid min-w-0 text-left', this.textClass(), !this.hasLabel() && 'hidden'),
  );
  protected readonly visibleClass = computed(() =>
    cn(
      'col-start-1 row-start-1 truncate pt-[0.25em] -mt-[0.25em] pb-[0.25em] -mb-[0.25em] transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]',
      this.lit() ? 'text-foreground' : 'text-muted-foreground',
    ),
  );
  // With a label, the rest renders as the button's own flex children (a
  // fragment in React); without one, everything sits in one flex span.
  protected readonly restClass = computed(() =>
    this.hasLabel()
      ? 'contents'
      : cn(
          'flex min-w-0 flex-1 items-center gap-2 transition-colors duration-80',
          this.lit() ? 'text-foreground' : 'text-muted-foreground',
          this.textClass(),
        ),
  );

  constructor() {
    let observer: MutationObserver | null = null;
    afterNextRender(() => {
      this.sync();
      if (typeof MutationObserver === 'undefined') return;
      observer = new MutationObserver(() => this.sync());
      observer.observe(this.rest().nativeElement, { childList: true });
      observer.observe(this.visible().nativeElement, { childList: true, characterData: true, subtree: true });
    });
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }

  /** Moves leading text nodes of the content into the visible cell (Angular
   *  keeps updating moved text nodes in place) and mirrors the ghost. */
  private sync() {
    const rest = this.rest().nativeElement;
    const visible = this.visible().nativeElement;
    const leading: Text[] = [];
    for (const node of Array.from(rest.childNodes)) {
      if (node.nodeType === Node.COMMENT_NODE) continue;
      if (node.nodeType !== Node.TEXT_NODE) break;
      leading.push(node as Text);
    }
    if (leading.some((node) => node.data.trim() !== '')) {
      for (const node of leading) visible.appendChild(node);
    }
    this.text.set(visible.textContent ?? '');
  }
}
