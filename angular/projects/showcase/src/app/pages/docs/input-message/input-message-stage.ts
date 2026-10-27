// ---------------------------------------------------------------------------
// The two DOM hooks the InputMessage stages need — ported from the
// ResizeObserver and scrollTop effects in app/docs/input-message/page.tsx.
//
// They are directives rather than the page's `viewChild` queries because the
// playground preview renders through `app-playground-layout`'s
// `ngTemplateOutlet`: the stage's nodes belong to an embedded view another
// component instantiates, so a query declared on the page never sees them. A
// directive receives its own host element wherever it renders.
// ---------------------------------------------------------------------------

import { Directive, DOCUMENT, ElementRef, afterNextRender, afterRenderEffect, DestroyRef, inject, input, output } from '@angular/core';

/** Reports its host's pixel height now and whenever it resizes. The composer
 *  floats over the transcript, which reserves room for it with that number. */
@Directive({ selector: '[appMeasureHeight]' })
export class MeasureHeight {
  readonly heightChange = output<number>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const el = this.host.nativeElement;
      this.heightChange.emit(el.offsetHeight);
      if (!this.view || typeof this.view.ResizeObserver === 'undefined') return;
      const observer = new this.view.ResizeObserver(() => this.heightChange.emit(el.offsetHeight));
      observer.observe(el);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

/** Keeps its host pinned to the bottom whenever the bound value changes — the
 *  transcript's equivalent of `el.scrollTop = el.scrollHeight`. Pass a value
 *  that changes with the content, the composer height and the queue. */
@Directive({ selector: '[appScrollPin]' })
export class ScrollPin {
  readonly appScrollPin = input.required<unknown>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      this.appScrollPin();
      const el = this.host.nativeElement;
      el.scrollTop = el.scrollHeight;
    });
  }
}
