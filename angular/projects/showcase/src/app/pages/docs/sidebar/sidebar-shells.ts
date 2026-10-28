// ---------------------------------------------------------------------------
// The frames the Sidebar page's previews run inside, ported from
// `SidebarShellFrame`, `DemoProvider`, `DemoRailShell` and `DemoShell` in
// app/docs/sidebar/page.tsx.
//
// Every preview is a bounded app shell: the provider fills the frame instead
// of the viewport, writes no cookie, and stays a rail (`mobileBreakpoint` 0)
// because a drawer inside a small frame hides the thing being demonstrated.
// The playground is where the real drawer lives.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  type SidebarVariant,
  SidebarProvider,
} from '@angel-r/fluid-functionalism-angular';
import {
  SidebarDemoFooterUser,
  SidebarDemoHeader,
  SidebarDemoNav,
  SidebarDemoTopbar,
} from './sidebar-parts';

/** Every preview stage on this page. 640px gives the rail room to be a rail.
 *  On a phone the previews are rail-only, and the rails run 300–580px of
 *  content, so 560 shows almost all of it without scrolling — the stage is the
 *  point on a page where the prose is deliberately short. */
export const SHELL_HEIGHT = 'h-[560px] md:h-[640px]';

/** React `useNarrowFrame`: true below 768px, where the rail-only shells drop
 *  the mock main region and the rail takes the whole frame. Starts false and
 *  follows the media query, like React's effect. Injection context only. */
export function injectNarrowFrame() {
  const narrow = signal(false);
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = () => narrow.set(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => mql.removeEventListener('change', onChange));
  }
  return narrow.asReadonly();
}

/** Bounded app-shell frame every preview runs inside. Full-bleed shells don't
 *  want Inspect's rulers drawn over their chrome; every preview on this page
 *  passes `inspectRulers={false}` instead. */
@Component({
  selector: 'app-sidebar-demo-frame',
  host: { style: 'display: contents' },
  template: `
    <div [class]="'relative flex w-full overflow-hidden bg-background ' + heightClass()">
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoFrame {
  /** Override the frame's height — e.g. `aspect-square` for gallery rows. */
  readonly heightClass = input(SHELL_HEIGHT);
}

/** Rail-only shell: the examples whose subject lives entirely inside the
 *  sidebar. On a phone the mock main region is dropped and the rail takes the
 *  whole frame; above the breakpoint it sits beside the usual page. */
@Component({
  selector: 'app-sidebar-rail-shell',
  imports: [SidebarDemoFrame, SidebarProvider, Sidebar, SidebarInset, SidebarDemoTopbar],
  // Transparent host: the frame is the stage's flex item, like React's.
  host: { style: 'display: contents' },
  template: `
    <app-sidebar-demo-frame [heightClass]="heightClass()">
      <ff-sidebar-provider
        class="h-full min-h-0"
        [persist]="false"
        [mobileBreakpoint]="0"
        [width]="narrow() ? '100%' : railWidth"
      >
        <ff-sidebar collapsible="none" class="h-full">
          <ng-content />
        </ff-sidebar>
        @if (!narrow()) {
          <main ffSidebarInset class="min-h-0"><app-sidebar-demo-topbar /></main>
        }
      </ff-sidebar-provider>
    </app-sidebar-demo-frame>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoRailShell {
  readonly heightClass = input(SHELL_HEIGHT);
  protected readonly narrow = injectNarrowFrame();
  protected readonly railWidth = '16rem';
}

/** Standard demo shell — rail and main together, for the examples about that
 *  relationship (the three layouts). */
@Component({
  selector: 'app-sidebar-demo-shell',
  imports: [
    SidebarDemoFrame,
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarInset,
    SidebarDemoHeader,
    SidebarDemoNav,
    SidebarDemoFooterUser,
    SidebarDemoTopbar,
  ],
  // Transparent host: the frame is the stage's flex item, like React's.
  host: { style: 'display: contents' },
  template: `
    <app-sidebar-demo-frame>
      <ff-sidebar-provider
        class="h-full min-h-0"
        [persist]="false"
        [mobileBreakpoint]="0"
        [width]="narrow() ? '11rem' : '16rem'"
      >
        <ff-sidebar [variant]="variant()" class="h-full">
          <app-sidebar-demo-header />
          <ff-sidebar-content>
            <app-sidebar-demo-nav />
          </ff-sidebar-content>
          <div ffSidebarFooter>
            <app-sidebar-demo-footer-user />
          </div>
        </ff-sidebar>
        <!-- The floating card sits in a p-2 gutter — pad the main region's
             top so its header lines up with the card's. The inset variant's
             main is itself the card (own m-2), so it needs no extra padding. -->
        <main ffSidebarInset [class]="variant() === 'floating' ? 'min-h-0 pt-2' : 'min-h-0'">
          <app-sidebar-demo-topbar />
        </main>
      </ff-sidebar-provider>
    </app-sidebar-demo-frame>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDemoShell {
  readonly variant = input<SidebarVariant>('sidebar');
  protected readonly narrow = injectNarrowFrame();
}
