// A scripted pointer for demos, so a behaviour shows without the reader moving
// (reference: lib/docs/fake-cursor.tsx). The arrow's tip sits at (x, y) in the
// positioned parent; y rides a motion value, so a glide writes the DOM directly
// and never re-renders the demo.

import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, inject, input } from '@angular/core';
import type { MotionValue } from 'motion';

@Component({
  selector: 'app-fake-cursor',
  template: `
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        d="m4 4 7.07 17 2.51-7.39L21 11.07z"
        stroke-width="1.5"
        stroke-linejoin="round"
        class="fill-foreground stroke-background"
      />
    </svg>
  `,
  host: {
    'aria-hidden': 'true',
    // The arrow's tip sits 3px in from the SVG's corner.
    class: 'pointer-events-none absolute -left-[3px] -top-[3px] z-30',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FakeCursor {
  /** The tip's x, in the parent's coordinates. */
  readonly x = input(0);
  /** The tip's y, in the parent's coordinates, as a motion value. */
  readonly y = input.required<MotionValue<number>>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    afterRenderEffect((onCleanup) => {
      const y = this.y();
      const x = this.x();
      const write = (value: number) => {
        this.host.style.transform = `translate(${x}px, ${value}px)`;
      };
      write(y.get());
      const stop = y.on('change', write);
      onCleanup(() => stop());
    });
  }
}
