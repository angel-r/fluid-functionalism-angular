// "All tokens" of /docs/motion, ported from app/docs/motion/page.tsx
// (`SpringReferenceSection`): one block per tier — the tokens, a track that
// fires the enter and then the matching exit, and the components that use it.
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { cn, enterTransition, exitTransition, fontWeights, spring } from '@angel-r/fluid-functionalism-angular';
import type { AnimationOptions } from 'motion';
import { SpringTrack } from './spring-track';

const TIERS = [
  {
    key: 'fast',
    trackWidth: 'w-1/3',
    spring: spring.fast,
    enterToken: 'spring.fast',
    exitToken: 'spring.fast.exit',
    enterMeta: '0.08s',
    exitMeta: '0.06s',
    components: [
      { label: 'Fluid hover', slug: '/docs/fluid-hover' },
      { label: 'Focus rings', slug: null },
      { label: 'Checkbox', slug: '/docs/checkbox-group' },
      { label: 'Radio', slug: '/docs/radio-group' },
      { label: 'Tooltip', slug: '/docs/tooltip' },
      { label: 'Table rows', slug: '/docs/table' },
      { label: 'Card grid', slug: '/docs/card' },
      { label: 'Input copy', slug: '/docs/input-copy' },
      { label: 'Slider', slug: '/docs/slider' },
      { label: 'Select', slug: '/docs/select' },
      { label: 'Combobox', slug: '/docs/combobox' },
      { label: 'Command menu', slug: '/docs/command-menu' },
      { label: 'Color picker', slug: '/docs/color-picker' },
      { label: 'Date picker', slug: '/docs/date-picker' },
      { label: 'Accordion', slug: '/docs/accordion' },
    ],
  },
  {
    key: 'moderate',
    trackWidth: 'w-2/3',
    spring: spring.moderate,
    enterToken: 'spring.moderate',
    exitToken: 'spring.moderate.exit',
    enterMeta: '0.16s bounce 0',
    exitMeta: '0.12s',
    components: [
      { label: 'Dropdown', slug: '/docs/dropdown' },
      { label: 'Tabs indicator', slug: '/docs/tabs' },
      { label: 'Carousel dots', slug: '/docs/carousel-dots' },
      { label: 'Calendar month', slug: '/docs/calendar' },
      { label: 'Banner dismiss', slug: '/docs/banner' },
      { label: 'Switch thumb', slug: '/docs/switch' },
      { label: 'Chat bubbles', slug: '/docs/chat-message' },
      { label: 'Mobile drawer', slug: null },
      { label: 'Sidebar', slug: '/docs/sidebar' },
      { label: 'Selection merge / split', slug: '/docs/checkbox-group' },
      { label: 'Reveal (product)', slug: '/docs/reveal' },
    ],
  },
  {
    key: 'slow',
    trackWidth: 'w-full',
    spring: spring.slow,
    enterToken: 'spring.slow',
    exitToken: 'spring.slow.exit',
    enterMeta: '0.24s bounce 0.12',
    exitMeta: '0.16s',
    components: [
      { label: 'Dialog', slug: '/docs/dialog' },
      { label: 'Ask-user questions', slug: '/docs/ask-user-questions' },
      { label: 'Thinking steps', slug: '/docs/thinking-steps' },
      { label: 'Reveal (landing)', slug: '/docs/reveal' },
    ],
  },
] as const;

type TierKey = (typeof TIERS)[number]['key'];

// ms to wait before reversing (covers spring settle + tiny pause)
const ENTER_SETTLE: Record<TierKey, number> = { fast: 220, moderate: 400, slow: 560 };
// ms the exit takes (blocks re-clicks until done)
const EXIT_SETTLE: Record<TierKey, number> = { fast: 150, moderate: 200, slow: 250 };

const TRACK_BASE =
  'flex h-7 cursor-pointer items-center rounded-full bg-muted px-0.5 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]';

@Component({
  selector: 'app-spring-reference',
  imports: [RouterLink, SpringTrack],
  host: { style: 'display: contents' },
  template: `
    <div class="flex flex-col">
      @for (tier of tiers; track tier.key; let i = $index) {
        <div [class]="i > 0 ? 'flex flex-col gap-4 border-t border-border py-6' : 'flex flex-col gap-4 py-6'">
          <div class="flex flex-col gap-0.5">
            <span class="text-site-body text-foreground" [style.font-variation-settings]="semibold">{{ tier.key }}</span>
            <span class="text-site-caption text-muted-foreground">
              → <code class="font-mono">{{ tier.enterToken }}</code> {{ tier.enterMeta }}
            </span>
            <span class="text-site-caption text-muted-foreground">
              ← <code class="font-mono">{{ tier.exitToken }}</code> {{ tier.exitMeta }}
            </span>
          </div>

          <!-- Track constrained to tier width -->
          <app-spring-track
            [atEnd]="atEnds()[i]"
            [transition]="transitions()[i]"
            [trackClass]="trackClasses()[i]"
            [ballClass]="ballClass"
            [ariaLabel]="'Play ' + tier.key + ' enter then exit'"
            (fires)="fire(i)"
          />

          <!-- Component chips — links where a page exists -->
          <div class="flex flex-wrap gap-x-3 gap-y-1">
            @for (chip of tier.components; track chip.label) {
              @if (chip.slug) {
                <a [routerLink]="chip.slug" class="text-site-body text-muted-foreground transition-colors hover:text-foreground">
                  {{ chip.label }}
                </a>
              } @else {
                <span class="text-site-body text-muted-foreground">{{ chip.label }}</span>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpringReference {
  protected readonly tiers = TIERS;
  protected readonly semibold = fontWeights.semibold;
  protected readonly ballClass = 'h-6 w-6 rounded-full bg-foreground';

  protected readonly atEnds = signal<boolean[]>([false, false, false]);
  protected readonly transitions = signal<AnimationOptions[]>(
    TIERS.map((tier) => enterTransition(tier.spring)),
  );
  protected readonly busy = signal<boolean[]>([false, false, false]);

  protected readonly trackClasses = computed(() =>
    TIERS.map((tier, i) => cn(TRACK_BASE, tier.trackWidth, this.atEnds()[i] ? 'justify-end' : 'justify-start')),
  );

  private readonly destroyRef = inject(DestroyRef);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      for (const timer of this.timers) clearTimeout(timer);
      this.timers.clear();
    });
  }

  protected fire(index: number): void {
    if (this.busy()[index]) return;
    const tier = TIERS[index];
    this.patch(this.busy, index, true);
    // Enter: L → R
    this.patch(this.transitions, index, enterTransition(tier.spring));
    this.patch(this.atEnds, index, true);
    // Exit: R → L (after the spring settles)
    this.later(() => {
      this.patch(this.transitions, index, exitTransition(tier.spring));
      this.patch(this.atEnds, index, false);
      this.later(() => this.patch(this.busy, index, false), EXIT_SETTLE[tier.key]);
    }, ENTER_SETTLE[tier.key]);
  }

  private later(action: () => void, ms: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      action();
    }, ms);
    this.timers.add(timer);
  }

  private patch<T>(target: WritableSignal<T[]>, index: number, value: T): void {
    target.update((list) => list.map((item, i) => (i === index ? value : item)));
  }
}
