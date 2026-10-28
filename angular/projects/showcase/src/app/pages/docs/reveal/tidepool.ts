// ---------------------------------------------------------------------------
// Tidepool, a made-up shared inbox: its landing page and the app itself.
// Ported from app/docs/reveal/demos.tsx.
//
// The reveal presets are pure CSS and select on structure (`> *`,
// `.reveal-swap > :first-child`), so each component that stood in for a React
// root <div> IS that div here: the host carries React's exact class list,
// display utility included (flex / grid), instead of wrapping the classes in an
// inner element that the preset selectors would no longer see.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { Button, Icon, type IconName, cn, fontWeights, injectShape } from '@angel-r/fluid-functionalism-angular';
import { RevealLine, RevealSkeleton } from './skeleton';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface Thread {
  from: string;
  initials: string;
  subject: string;
  tag: string;
  time: string;
  unread: boolean;
}

interface Stat {
  label: string;
  value: string;
}

interface NavItem {
  icon: IconName;
  label: string;
  count?: string;
}

const THREADS: Thread[] = [
  {
    from: 'Maya Chen',
    initials: 'MC',
    subject: 'Invoice 2041 is missing the VAT line',
    tag: 'Billing',
    time: '9:41',
    unread: true,
  },
  {
    from: 'Rafael Ortiz',
    initials: 'RO',
    subject: 'Can we move the onboarding call?',
    tag: 'Sales',
    time: '9:12',
    unread: true,
  },
  {
    from: 'Lena Park',
    initials: 'LP',
    subject: 'Card ending 4242 expires in May',
    tag: 'Billing',
    time: '8:55',
    unread: false,
  },
  {
    from: 'Ines Duarte',
    initials: 'ID',
    subject: 'Love the new export, one question',
    tag: 'Support',
    time: 'Mon',
    unread: false,
  },
  {
    from: 'Tom Becker',
    initials: 'TB',
    subject: 'SSO for the second workspace?',
    tag: 'Sales',
    time: 'Mon',
    unread: false,
  },
];

const STATS: Stat[] = [
  { label: 'Open', value: '38' },
  { label: 'First reply', value: '42m' },
  { label: 'Waiting', value: '5' },
];

const NAV: NavItem[] = [
  { icon: 'inbox', label: 'Inbox', count: '38' },
  { icon: 'user', label: 'Assigned to me', count: '5' },
  { icon: 'clock', label: 'Snoozed', count: '2' },
  { icon: 'check', label: 'Done' },
];

const TEAMS = ['Support', 'Billing', 'Sales'];

const FEATURES = [
  {
    title: '1 inbox',
    body: 'Support, sales, and billing in one list, sorted by who owes a reply.',
  },
  {
    title: 'Claim, then type',
    body: 'A name on the thread before the draft. Nobody answers twice.',
  },
  {
    title: 'Quiet nudges',
    body: 'A thread waiting 4 hours pings its owner once. Only its owner.',
  },
];

const LANDING_NUMBERS = [
  { value: '40m', label: 'First reply' },
  { value: '3×', label: 'Threads per agent' },
  { value: '0', label: 'Double replies' },
];

const STEPS = [
  {
    title: 'Forward your address',
    body: 'Point support@ at Tidepool. Old threads come along.',
  },
  {
    title: 'Invite the team',
    body: 'Everyone sees the same inbox and who owns what.',
  },
  {
    title: 'Set your nudges',
    body: 'Pick how long a customer can wait before someone hears.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    note: 'For a team of up to 3',
    price: '$0',
    perks: ['1 shared inbox', 'Claims and nudges', '30 days of history'],
  },
  {
    name: 'Team',
    note: 'Per seat, per month',
    price: '$12',
    perks: ['Unlimited inboxes', 'Shared drafts', 'Reports and CSV export'],
  },
];

// ---------------------------------------------------------------------------
// The sidebar
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-tidepool-sidebar-items',
  imports: [Icon],
  host: { role: 'navigation', class: 'reveal-items flex flex-col gap-0.5' },
  template: `
    @for (item of nav; track item.label; let i = $index) {
      <span
        [class]="
          cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-site-caption',
            i === 0 ? 'bg-muted text-foreground' : 'text-muted-foreground'
          )
        "
      >
        <ff-icon [name]="item.icon" [size]="16" [strokeWidth]="1.5" class="shrink-0" />
        <span class="flex-1 truncate">{{ item.label }}</span>
        @if (item.count) {
          <span class="tabular-nums">{{ item.count }}</span>
        }
      </span>
    }
    <span class="px-2 pt-4 pb-1.5 text-site-caption text-muted-foreground">Teams</span>
    @for (team of teams; track team) {
      <span class="flex items-center gap-2 rounded-md px-2 py-1.5 text-site-caption text-muted-foreground">
        <span class="flex size-4 items-center justify-center">
          <span class="size-1.5 rounded-full bg-muted-foreground"></span>
        </span>
        {{ team }}
      </span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TidepoolSidebarItems {
  protected readonly nav = NAV;
  protected readonly teams = TEAMS;
  protected readonly cn = cn;
}

@Component({
  selector: 'app-tidepool-sidebar-skeleton',
  imports: [RevealLine, RevealSkeleton],
  host: {
    'aria-hidden': 'true',
    class: 'reveal-items flex flex-col gap-0.5',
  },
  template: `
    @for (item of nav; track item.label; let i = $index) {
      <span class="flex items-center gap-2 px-2 py-1.5">
        <app-reveal-skeleton className="size-4 rounded-sm" />
        <app-reveal-line [className]="navWidths[i]" />
      </span>
    }
    <span class="px-2 pt-4 pb-1.5">
      <app-reveal-line className="w-10" />
    </span>
    @for (team of teams; track team; let i = $index) {
      <span class="flex items-center gap-2 px-2 py-1.5">
        <app-reveal-skeleton className="size-4 rounded-sm" />
        <app-reveal-line [className]="teamWidths[i]" />
      </span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TidepoolSidebarSkeleton {
  protected readonly nav = NAV;
  protected readonly teams = TEAMS;
  protected readonly navWidths = ['w-12', 'w-24', 'w-16', 'w-10'];
  protected readonly teamWidths = ['w-14', 'w-12', 'w-10'];
}

// ---------------------------------------------------------------------------
// The stats: each metric is its own request, so each card swaps from its
// skeleton on its own — a new element lands in the grid and plays its step.
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-tidepool-stat-card',
  host: { '[class]': 'cardClass()' },
  template: `
    <span class="truncate text-site-caption text-muted-foreground">{{ stat().label }}</span>
    <span
      class="text-[24px] leading-[28px] text-foreground tabular-nums"
      [style.font-variation-settings]="semibold"
    >
      {{ stat().value }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TidepoolStatCard {
  readonly stat = input.required<Stat>();
  protected readonly semibold = fontWeights.semibold;

  private readonly shape = injectShape();
  protected readonly cardClass = computed(() => cn('flex flex-col gap-1 bg-muted p-4', this.shape().container));
}

@Component({
  selector: 'app-tidepool-stats',
  imports: [RevealLine, TidepoolStatCard],
  host: { class: 'reveal-items grid grid-cols-3 gap-3' },
  template: `
    @for (stat of stats; track stat.label; let i = $index) {
      @if (ready() === undefined) {
        <app-tidepool-stat-card [stat]="stat" />
      } @else {
        <div class="reveal-swap">
          <div [class]="cardClass()">
            <app-reveal-line className="w-14" />
            <app-reveal-line className="h-5 w-10" height="h-7" />
          </div>
          @if (ready()?.[i]) {
            <app-tidepool-stat-card [stat]="stat" />
          }
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TidepoolStats {
  readonly ready = input<boolean[] | undefined>(undefined);
  protected readonly stats = STATS;

  private readonly shape = injectShape();
  protected readonly cardClass = computed(() => cn('flex flex-col gap-1 bg-muted p-4', this.shape().container));
}

// ---------------------------------------------------------------------------
// The threads
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-tidepool-threads',
  host: { class: 'reveal-items flex flex-col divide-y divide-border' },
  template: `
    @for (t of threads; track t.subject) {
      <div class="flex items-center gap-3 py-2.5">
        <span [class]="cn('size-1.5 shrink-0 rounded-full', t.unread ? 'bg-foreground' : 'bg-transparent')"></span>
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-site-micro text-muted-foreground"
        >
          {{ t.initials }}
        </span>
        <span
          class="w-24 shrink-0 truncate text-site-caption text-foreground"
          [style.font-variation-settings]="t.unread ? semibold : null"
        >
          {{ t.from }}
        </span>
        <span
          [class]="
            cn('min-w-0 flex-1 truncate text-site-caption', t.unread ? 'text-foreground' : 'text-muted-foreground')
          "
        >
          {{ t.subject }}
        </span>
        <span
          class="hidden shrink-0 rounded-full border border-border px-2 text-[11px] leading-[18px] text-muted-foreground @xl:inline"
        >
          {{ t.tag }}
        </span>
        <span class="w-9 shrink-0 text-right text-site-caption text-muted-foreground tabular-nums">
          {{ t.time }}
        </span>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TidepoolThreads {
  protected readonly threads = THREADS;
  protected readonly semibold = fontWeights.semibold;
  protected readonly cn = cn;
}

@Component({
  selector: 'app-tidepool-threads-skeleton',
  imports: [RevealLine, RevealSkeleton],
  host: {
    'aria-hidden': 'true',
    class: 'reveal-items flex flex-col divide-y divide-border',
  },
  template: `
    @for (t of threads; track t.subject; let i = $index) {
      <div class="flex items-center gap-3 py-2.5">
        <span class="size-1.5 shrink-0"></span>
        <app-reveal-skeleton className="size-7 shrink-0 rounded-full" />
        <app-reveal-line className="w-20" />
        <span class="min-w-0 flex-1">
          <app-reveal-line className="w-full" />
        </span>
        <app-reveal-skeleton
          className="hidden h-[20px] w-14 shrink-0 rounded-full @xl:block"
          [opacity]="1 - i * 0.05"
        />
        <app-reveal-line className="ml-auto w-8" />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TidepoolThreadsSkeleton {
  protected readonly threads = THREADS;
}

// ---------------------------------------------------------------------------
// The app screen: a sidebar beside the preset, and a main column that takes it.
// With `ready`, each data block shows its skeleton until it is ready; without,
// the screen renders loaded.
// ---------------------------------------------------------------------------

export interface AppReady {
  sidebar: boolean;
  stats: boolean[];
  threads: boolean;
}

@Component({
  selector: 'app-tidepool-app-screen',
  imports: [
    Button,
    Icon,
    TidepoolSidebarItems,
    TidepoolSidebarSkeleton,
    TidepoolStats,
    TidepoolThreads,
    TidepoolThreadsSkeleton,
  ],
  host: { class: 'flex h-full min-h-[500px] text-left' },
  template: `
    <aside class="hidden w-48 shrink-0 flex-col gap-4 border-r border-border p-3 sm:flex">
      <span class="flex items-center gap-2 px-2 py-1">
        <span
          class="flex size-6 items-center justify-center rounded-md bg-foreground text-[12px] leading-4 text-background"
          [style.font-variation-settings]="bold"
        >
          T
        </span>
        <span class="text-site-body text-foreground" [style.font-variation-settings]="semibold">Tidepool</span>
      </span>
      @if (ready(); as state) {
        <div class="reveal-swap">
          <app-tidepool-sidebar-skeleton />
          @if (state.sidebar) {
            <app-tidepool-sidebar-items />
          }
        </div>
      } @else {
        <app-tidepool-sidebar-items />
      }
      <span class="mt-auto flex items-center gap-2 px-2 py-1 text-site-caption text-muted-foreground">
        <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] leading-3">AL</span>
        Ana Lima
      </span>
    </aside>
    <main [class]="mainClassName()">
      <div class="flex items-center justify-between gap-4">
        <div class="flex min-w-0 flex-col">
          <span class="text-[20px] leading-[26px] text-foreground" [style.font-variation-settings]="bold">
            Inbox
          </span>
          <span class="truncate text-site-caption text-muted-foreground">38 open, 5 waiting on you</span>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="hidden h-7 w-40 items-center gap-2 rounded-full border border-border px-3 text-site-caption text-muted-foreground @lg:flex"
          >
            <ff-icon name="search" [size]="16" [strokeWidth]="1.5" class="shrink-0" />
            Search
          </span>
          <button ffButton size="compact" tabindex="-1">New thread</button>
        </div>
      </div>
      <app-tidepool-stats [ready]="ready()?.stats" />
      @if (ready(); as state) {
        <div class="reveal-swap">
          <app-tidepool-threads-skeleton />
          @if (state.threads) {
            <app-tidepool-threads />
          }
        </div>
      } @else {
        <app-tidepool-threads />
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TidepoolAppScreen {
  readonly mainClass = input<string | undefined>(undefined);
  readonly ready = input<AppReady | undefined>(undefined);

  protected readonly bold = fontWeights.bold;
  protected readonly semibold = fontWeights.semibold;
  protected readonly mainClassName = computed(() =>
    cn('@container flex min-w-0 flex-1 flex-col gap-6 p-6', this.mainClass()),
  );
}

function between(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** The app with real-world data: every request takes its own time, drawn fresh
 *  on each replay, so blocks land in a different order each run. The sidebar is
 *  quick, each metric is its own request, and the threads are the slowest on
 *  average. */
@Component({
  selector: 'app-tidepool-product',
  imports: [TidepoolAppScreen],
  host: { style: 'display: contents' },
  template: `<app-tidepool-app-screen [mainClass]="mainClass()" [ready]="ready()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TidepoolProduct {
  readonly mainClass = input.required<string>();

  protected readonly ready = signal<AppReady>({
    sidebar: false,
    stats: STATS.map(() => false),
    threads: false,
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const timers = [
        setTimeout(() => this.ready.update((r) => ({ ...r, sidebar: true })), between(150, 450)),
        ...STATS.map((_, i) =>
          setTimeout(
            () => this.ready.update((r) => ({ ...r, stats: r.stats.map((on, j) => on || j === i) })),
            between(400, 1300),
          ),
        ),
        setTimeout(() => this.ready.update((r) => ({ ...r, threads: true })), between(700, 1600)),
      ];
      destroyRef.onDestroy(() => timers.forEach(clearTimeout));
    });
  }
}

// ---------------------------------------------------------------------------
// The landing page. Nav and footer sit outside the preset, so they stay put.
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-tidepool-landing',
  imports: [Button, TidepoolAppScreen],
  host: { class: 'flex flex-col' },
  template: `
    <header class="flex items-center justify-between px-6 py-5 text-site-caption sm:px-10">
      <span class="text-site-body text-foreground" [style.font-variation-settings]="bold">Tidepool</span>
      <span class="flex gap-5 text-muted-foreground">
        <span class="hidden sm:inline">Product</span>
        <span class="hidden sm:inline">Pricing</span>
        <span class="text-foreground">Sign in</span>
      </span>
    </header>

    <div [class]="contentClass()">
      <section class="flex flex-col items-center gap-3 pt-16 text-center">
        <span class="text-site-caption text-muted-foreground">The shared inbox for support teams</span>
        <h3
          class="max-w-lg text-[36px] leading-[40px] text-foreground sm:text-[48px] sm:leading-[52px]"
          [style.font-variation-settings]="bold"
        >
          Every email, answered once.
        </h3>
        <p class="max-w-sm text-balance text-site-subtitle text-muted-foreground">
          Claim a thread, reply together, and see who is waiting on you.
        </p>
        <div class="flex gap-2 pt-1">
          <button ffButton tabindex="-1">Start free</button>
          <button ffButton variant="secondary" tabindex="-1">Book a demo</button>
        </div>
        <!-- The product shot is on screen at first paint, so it belongs to the
             hero: it plays on load with the copy instead of waiting half
             revealed for a scroll. -->
        <div [class]="shotClass()">
          <div [class]="shotFrameClass()">
            <app-tidepool-app-screen />
          </div>
        </div>
      </section>

      <section class="grid gap-8 sm:grid-cols-3">
        @for (feature of features; track feature.title) {
          <div class="flex flex-col gap-1.5">
            <span class="text-site-body text-foreground" [style.font-variation-settings]="semibold">
              {{ feature.title }}
            </span>
            <span class="text-site-body text-muted-foreground">{{ feature.body }}</span>
          </div>
        }
      </section>

      <section class="grid grid-cols-3 gap-6 border-y border-border py-10 text-center">
        @for (n of numbers; track n.label) {
          <div class="flex flex-col gap-1">
            <span class="text-[32px] leading-[38px] text-foreground tabular-nums" [style.font-variation-settings]="bold">
              {{ n.value }}
            </span>
            <span class="text-site-caption text-muted-foreground">{{ n.label }}</span>
          </div>
        }
      </section>

      <section class="flex flex-col items-center gap-4 text-center">
        <p class="max-w-lg text-[24px] leading-[32px] text-foreground" [style.font-variation-settings]="semibold">
          &ldquo;First reply went from 6 hours to 40 minutes. Nobody answers the same customer twice.&rdquo;
        </p>
        <span class="text-site-caption text-muted-foreground">Ana Lima, Head of Support, Northwind</span>
      </section>

      <section class="flex flex-col gap-6">
        <h4 class="text-[22px] leading-[28px] text-foreground" [style.font-variation-settings]="bold">
          Live in an afternoon
        </h4>
        <ol class="grid gap-6 sm:grid-cols-3">
          @for (step of steps; track step.title; let n = $index) {
            <li class="flex flex-col gap-1.5">
              <span class="text-site-caption text-muted-foreground tabular-nums">{{ n + 1 }}</span>
              <span class="text-site-body text-foreground" [style.font-variation-settings]="semibold">
                {{ step.title }}
              </span>
              <span class="text-site-body text-muted-foreground">{{ step.body }}</span>
            </li>
          }
        </ol>
      </section>

      <section class="flex flex-col items-center gap-6">
        <h4 class="text-[22px] leading-[28px] text-foreground" [style.font-variation-settings]="bold">
          Simple pricing
        </h4>
        <div class="grid w-full gap-3 sm:grid-cols-2">
          @for (plan of plans; track plan.name) {
            <div [class]="planClass()">
              <div class="flex flex-col gap-1">
                <span class="text-site-body text-foreground" [style.font-variation-settings]="semibold">
                  {{ plan.name }}
                </span>
                <span class="text-site-caption text-muted-foreground">{{ plan.note }}</span>
              </div>
              <span
                class="text-[32px] leading-[38px] text-foreground tabular-nums"
                [style.font-variation-settings]="bold"
              >
                {{ plan.price }}
              </span>
              <ul class="flex flex-col gap-1.5 text-site-caption text-muted-foreground">
                @for (perk of plan.perks; track perk) {
                  <li>{{ perk }}</li>
                }
              </ul>
            </div>
          }
        </div>
      </section>

      <section class="flex flex-col items-center gap-5 text-center">
        <h4 class="text-[28px] leading-[34px] text-foreground" [style.font-variation-settings]="bold">
          Answer once.
        </h4>
        <button ffButton tabindex="-1">Start free</button>
      </section>
    </div>

    <footer class="flex justify-between border-t border-border px-6 py-5 text-site-caption text-muted-foreground sm:px-10">
      <span>© Tidepool</span>
      <span class="flex gap-5">
        <span>Privacy</span>
        <span>Terms</span>
      </span>
    </footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TidepoolLanding {
  readonly className = input.required<string>();

  protected readonly features = FEATURES;
  protected readonly numbers = LANDING_NUMBERS;
  protected readonly steps = STEPS;
  protected readonly plans = PLANS;
  protected readonly bold = fontWeights.bold;
  protected readonly semibold = fontWeights.semibold;

  private readonly shape = injectShape();
  protected readonly contentClass = computed(() =>
    cn('flex flex-col gap-28 px-6 pb-28 sm:px-10', this.className()),
  );
  protected readonly shotClass = computed(() => cn('mt-9 w-full bg-muted p-3 sm:p-6', this.shape().container));
  protected readonly shotFrameClass = computed(() =>
    cn('pointer-events-none overflow-hidden border border-border bg-background select-none', this.shape().container),
  );
  protected readonly planClass = computed(() => cn('flex flex-col gap-4 bg-muted p-6', this.shape().container));
}
