// "Three speeds" of /docs/motion, ported from app/docs/motion/page.tsx
// (`SpringTokensDemo`): one track per tier, all fired by a click or by the
// preview's replay control.
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { cn, enterTransition, fontWeights, spring } from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { SpringTrack } from './spring-track';
import { springTokensCode } from './motion-snippets';

const SPRING_TIERS = [
  { key: 'fast', transition: enterTransition(spring.fast), meta: '0.08s · bounce 0', usage: 'hover, fades' },
  { key: 'moderate', transition: enterTransition(spring.moderate), meta: '0.16s · bounce 0', usage: 'dropdowns, tabs' },
  { key: 'slow', transition: enterTransition(spring.slow), meta: '0.24s · bounce 0.12', usage: 'dialogs, drawers' },
];

const TRACK_BASE =
  'flex h-10 w-full cursor-pointer items-center rounded-full bg-muted px-1 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]';

@Component({
  selector: 'app-spring-tokens-demo',
  imports: [ComponentPreview, SpringTrack],
  host: { style: 'display: contents' },
  template: `
    <app-component-preview [code]="code" (replay)="atEnd.update((v) => !v)">
      <div class="flex w-full max-w-md flex-col gap-5">
        @for (tier of tiers; track tier.key) {
          <div class="flex flex-col gap-1.5">
            <div class="flex items-baseline gap-2 text-site-body">
              <span class="text-foreground" [style.font-variation-settings]="semibold">{{ tier.key }}</span>
              <span class="font-mono text-[11px] leading-3.5 text-muted-foreground">{{ tier.meta }}</span>
              <span class="ml-auto hidden text-site-caption text-muted-foreground sm:inline">{{ tier.usage }}</span>
            </div>
            <app-spring-track
              [atEnd]="atEnd()"
              [transition]="tier.transition"
              [trackClass]="trackClass()"
              [ballClass]="ballClass"
              [ariaLabel]="'Run the ' + tier.key + ' spring'"
              (fires)="atEnd.update((v) => !v)"
            />
          </div>
        }
        <p class="text-center text-site-caption text-muted-foreground">
          Click a track (or replay) to fire all three springs.
        </p>
      </div>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpringTokensDemo {
  protected readonly code = springTokensCode;
  protected readonly tiers = SPRING_TIERS;
  protected readonly ballClass = 'h-8 w-8 rounded-full bg-foreground';
  protected readonly atEnd = signal(false);
  protected readonly semibold = fontWeights.semibold;

  protected readonly trackClass = computed(() =>
    cn(TRACK_BASE, this.atEnd() ? 'justify-end' : 'justify-start'),
  );
}
