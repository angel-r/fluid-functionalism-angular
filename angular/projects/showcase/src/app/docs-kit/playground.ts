// ---------------------------------------------------------------------------
// Shared scaffolding for doc-page playgrounds, ported from
// lib/docs/playground.tsx: the control rows, the muted panel with its shuffle
// header, and the layout that parks the controls in the desktop right rail
// while the preview stays in the page column.
//
// Components:
// - `app-play-field` (`PlayField`): a 36px label/control row. Inputs: `label`,
//   `disabled`. Projects the control.
// - `app-play-select` (`PlaySelect`): a borderless select sized for the panel.
//   Inputs: `value`, `options` (`{ value, label }[]`). Output: `valueChange`.
// - `app-play-section` (`PlaySection`): a full-contrast heading for a group of
//   rows. Input: `label`.
// - `app-play-divider` (`PlayDivider`): the full-bleed hairline between groups.
// - `app-playground-panel` (`PlaygroundPanel`): the muted card with its title
//   row and shuffle button. Inputs: `title` (default "Playground variant").
//   Output: `shuffle`. Projects the fields.
// - `app-playground-overlay` (`PlaygroundOverlay`): pins floating UI to the
//   bottom centre of the preview area (which must be the nearest positioned
//   ancestor). Projects the overlay.
// - `app-playground-layout` (`PlaygroundLayout`): preview in the column;
//   controls in the right rail at >=1280px (the rail slot is
//   `RightRailService`), inline below the preview otherwise. They fade with the
//   preview's visibility (`.inview-fade-block`), so scrolling past the preview
//   empties the rail. Inputs: `preview` and `controls`, as `<ng-template>` refs.
//
// `PLAY_SWITCH` reverses the library Switch into a settings row (label left,
// toggle right), matching the borderless-select rows.
// ---------------------------------------------------------------------------

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  ViewContainerRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  Select,
  SelectContent,
  SelectItem,
  SURFACE_LEVEL,
  SelectTrigger,
  cn,
  fontWeights,
} from '@angel-r/fluid-functionalism-angular';
import { RightRailService } from '../site/right-rail';

/** Reversed layout turns the library Switch (toggle -> label) into a settings
 *  row (label <- left, toggle -> right). */
export const PLAY_SWITCH = 'w-full flex-row-reverse justify-between h-9 px-1 py-0';

export interface PlayOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-play-field',
  template: `
    <div [class]="rowClass()">
      <span class="text-site-body text-muted-foreground">{{ label() }}</span>
      <ng-content />
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayField {
  readonly label = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly rowClass = computed(() =>
    cn('flex h-9 items-center justify-between px-1', this.disabled() && 'opacity-40 pointer-events-none'),
  );
}

@Component({
  selector: 'app-play-select',
  imports: [Select, SelectTrigger, SelectContent, SelectItem],
  template: `
    <ff-select [value]="value()" (valueChange)="valueChange.emit($event)">
      <ff-select-trigger variant="borderless" class="min-w-0 w-auto h-7 px-2 text-site-body" />
      <ff-select-content>
        @for (option of options(); track option.value; let index = $index) {
          <ff-select-item [index]="index" [value]="option.value">{{ option.label }}</ff-select-item>
        }
      </ff-select-content>
    </ff-select>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaySelect {
  readonly value = input.required<string>();
  readonly options = input.required<readonly PlayOption[]>();
  readonly valueChange = output<string>();
}

@Component({
  selector: 'app-play-section',
  template: `
    <div class="px-1 pb-1 pt-2 text-site-body text-foreground" [style.font-variation-settings]="semibold">
      {{ label() }}
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaySection {
  readonly label = input.required<string>();
  protected readonly semibold = fontWeights.semibold;
}

/** Hairline between two control groups, full bleed across the panel. */
@Component({
  selector: 'app-play-divider',
  template: `<div class="my-2 -mx-3 border-t border-border/60"></div>`,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayDivider {}

/** Pins a playground's overlay to the bottom centre of the preview area. */
@Component({
  selector: 'app-playground-overlay',
  template: `
    <div class="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center [&>*]:pointer-events-auto">
      <ng-content />
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaygroundOverlay {}

/** The muted controls card: a title row with a shuffle button, fields below. */
@Component({
  selector: 'app-playground-panel',
  template: `
    <div class="w-full rounded-lg bg-muted p-3">
      <div class="flex items-center justify-between px-1 pt-1 pb-2">
        <h2 class="text-site-title text-foreground leading-none" [style.font-variation-settings]="semibold">
          {{ title() }}
        </h2>
        <button
          type="button"
          (click)="shuffle.emit()"
          aria-label="Randomize properties"
          title="Randomize"
          class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-hover transition-colors duration-80 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m18 14 4 4-4 4" />
            <path d="m18 2 4 4-4 4" />
            <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
            <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
            <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
          </svg>
        </button>
      </div>
      <ng-content />
    </div>
  `,
  // The fields are projected, so they resolve DI from this host element, not
  // from the card div: the level goes on the host (React's SurfaceProvider
  // around the card). Popups opened from a field then sit two steps up.
  providers: [{ provide: SURFACE_LEVEL, useValue: signal(2) }],
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaygroundPanel {
  readonly title = input('Playground variant');
  readonly shuffle = output<void>();
  protected readonly semibold = fontWeights.semibold;
}

/** Preview in the main column; controls in the desktop right rail, or inline
 *  below the preview on narrower screens. */
@Component({
  selector: 'app-playground-layout',
  imports: [NgTemplateOutlet],
  template: `
    <ng-container [ngTemplateOutlet]="preview()" />
    @if (!desktop()) {
      <div class="mt-3"><ng-container [ngTemplateOutlet]="controls()" /></div>
    }
    <ng-template #railControls>
      <div class="inview-fade-block" [attr.data-shown]="shown()">
        <ng-container [ngTemplateOutlet]="controls()" />
      </div>
    </ng-template>
  `,
  // The host stands in for React's root div (its IntersectionObserver target),
  // so it needs a box: a display:contents host has none to intersect.
  host: { style: 'display: block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaygroundLayout {
  /** The live preview, as the page declares it. */
  readonly preview = input.required<TemplateRef<unknown>>();
  /** The controls card, as the page declares it. */
  readonly controls = input.required<TemplateRef<unknown>>();

  protected readonly rail = inject(RightRailService);
  protected readonly desktop = this.rail.desktop;
  protected readonly shown = signal(true);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly railControls = viewChild.required<TemplateRef<unknown>>('railControls');

  constructor() {
    // Park the controls in the rail on wide screens; below that they render
    // inline under the preview (the rail is emptied, so the page never holds
    // two copies). The service mounts them as soon as the panel's slot exists.
    afterRenderEffect(() => {
      if (this.desktop()) this.rail.show(this.railControls(), this.viewContainer);
      else this.rail.clear();
    });

    // The rail controls only show while the playground is on screen: once it
    // scrolls out of view they disappear.
    afterRenderEffect((onCleanup) => {
      if (typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) this.shown.set(entry.isIntersecting);
        },
        { rootMargin: '0px 0px -20% 0px' },
      );
      observer.observe(this.host);
      onCleanup(() => observer.disconnect());
    });

    inject(DestroyRef).onDestroy(() => this.rail.clear());
  }
}
