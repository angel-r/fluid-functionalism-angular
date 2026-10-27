# Fluid Functionalism for Angular: writing custom UI that fits the system

Imported components already follow these rules. Read this before writing any
custom animation, hover treatment, or state-change styling in a project that
uses the package. The point is that your bespoke list moves at the same
magnitudes as the installed dropdown next to it. Live, interactive versions:
<https://angel-r.github.io/fluid-functionalism-angular/docs/motion>,
<https://angel-r.github.io/fluid-functionalism-angular/docs/fluid-hover>, and
<https://angel-r.github.io/fluid-functionalism-angular/docs/reveal>.

Everything below is imported from
`@angel-r/fluid-functionalism-angular` unless a sample says otherwise.

## Spring tokens (`spring`)

Three speeds cover everything. Pick by the size of what moves: the bigger the
thing, the slower the spring.

| Token | Duration | Bounce | Use for |
|---|---|---|---|
| `spring.fast` | 0.08s | 0 | Hover, focus rings, fades, tooltips, selection indicators |
| `spring.moderate` | 0.16s | 0 | Short travel and small expansion (indicators, switch thumbs) and panels that must land exactly (drawers) |
| `spring.slow` | 0.24s | 0.12 | Large surfaces: dialogs, side panels, stepped flows |

Never hand-write a `duration` or invent a fourth speed. Import the token, so
unrelated parts of the UI move at consistent magnitudes. Springs, not tweens,
for entrances, so an interrupted animation reverses from where it is instead
of finishing first.

**Retrofitting an existing app:** most hand-written values sit within a hair
of a tier, so adopt the token. A value that is *deliberately* outside the
tiers (a one-off cinematic entrance, a large canvas re-layout) can stay, but
hoist it into one named export next to the code that owns it, so it cannot
drift or get re-invented with slightly different numbers in the next file.
The same literal defined twice is how systems decay. Recommend, do not
bulldoze: whether a bespoke value is intent or drift is the author's call, so
name the nearest token and let them choose.

**Exits are tweens, one tier quicker**, so a dismissal reads crisp and final
instead of replaying the entrance in reverse. Each tier carries its own exit
token, and `enterTransition()` / `exitTransition()` turn a tier into the
motion config:

| Enter | Exit token | Exit value |
|---|---|---|
| `spring.fast` | `spring.fast.exit` | `{ duration: 0.06 }` |
| `spring.moderate` | `spring.moderate.exit` | `{ duration: 0.12 }` |
| `spring.slow` | `spring.slow.exit` | `{ duration: 0.16 }` |

```ts
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  enterTransition,
  exitTransition,
  injectAnimateFluid,
  spring,
} from '@angel-r/fluid-functionalism-angular';

@Component({
  selector: 'app-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #panel class="rounded-xl bg-card p-4">…</div>`,
})
export class Panel {
  readonly open = input(false);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly animateFluid = injectAnimateFluid();

  constructor() {
    afterRenderEffect(() => {
      const element = this.panel()?.nativeElement;
      if (!element) return;
      const open = this.open();
      this.animateFluid(
        element,
        { opacity: open ? 1 : 0, y: open ? 0 : 8, scale: open ? 1 : 0.97 },
        open ? enterTransition(spring.moderate) : exitTransition(spring.moderate),
      );
    });
  }
}
```

`injectAnimateFluid()` is `animate()` from `motion` with the reduced-motion
rule already applied, so it must be called in an injection context (a field
initializer or the constructor). `animateFluid()` is the same function when
you already hold the reduced-motion signal.

An animation that flips a target instead of unmounting has no exit step, so
it picks the transition off its own state: `open ? enterTransition(tier) :
exitTransition(tier)`.

## Transform and opacity only

Animate `transform` (`x`, `y`, `scale`) and `opacity`, never `top` / `left` /
`width` / `height`. Two reasons, one fix: layout properties are off the GPU's
fast path, and the reduced-motion rule only neutralises transform and
position animation, so a component moving via `top` ignores the OS setting. A
plain CSS transition on a positional property (`transition-[left,bottom]`) is
doubly exempt: it is not motion at all, so the reduced-motion rule never sees
it. Move it to `x`/`y` motion values to get both the compositor and reduced
motion back.

If you genuinely must animate a layout property, gate the movement on the
package's `ReducedMotion` signal (`inject(ReducedMotion).value`) and keep the
opacity fade. Reduced motion
means *fewer and gentler*, not *none*.

**Depicted UI is exempt.** A mockup frame, product screenshot rebuilt in code,
or demo that *portrays another product's interface* is not bound by these
rules. A per-row `:hover` inside a fake app frame is set dressing, not system
drift. Judge the app's own chrome, not what it depicts.

## Fluid hover for custom lists

One highlight per list: the engine picks the item whose centre is nearest the
cursor, and a single `bg-hover` overlay springs to its rect on
`spring.fast`. The cursor in a gap still lights the nearest row, and the
highlight never blinks off between rows.

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  FluidHover,
  FluidHoverHighlight,
  FluidHoverItem,
  injectShape,
  injectSize,
} from '@angel-r/fluid-functionalism-angular';

@Component({
  selector: 'app-thread-list',
  imports: [FluidHover, FluidHoverHighlight, FluidHoverItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative flex flex-col gap-1 p-1" [class]="shape().container" ffFluidHover>
      <ff-fluid-hover-highlight [class]="shape().bg" />
      @for (thread of threads; track thread.id; let i = $index) {
        <a
          [href]="thread.href"
          [ffFluidHoverItem]="i"
          class="relative z-10 flex items-center gap-2"
          [class]="[size().control, size().text, shape().item].join(' ')"
        >
          {{ thread.label }}
        </a>
      }
    </div>
  `,
})
export class ThreadList {
  protected readonly shape = injectShape();
  protected readonly size = injectSize();
  protected readonly threads = [
    { id: 1, label: 'Design review', href: 'threads/1' },
    { id: 2, label: 'Release notes', href: 'threads/2' },
    { id: 3, label: 'Incident 42', href: 'threads/3' },
  ];
}
```

Rules that keep it honest:

- **Render `<ff-fluid-hover-highlight />`**, never a hand-rolled animated
  fill. It handles measurement readiness, the pointer session (fade in at the
  nearest row instead of sliding across the screen), reduced motion and
  z-order. `class` carries the radius; `hidden` keeps state while a popup is
  closed; `from` seeds where a fresh entry starts.
- **Mark each item with `[ffFluidHoverItem]="index"`**, including rows that
  are only boxes around the real control; the engine resolves the first
  activator inside them for gap clicks.
- **Axis matches the shape:** `ffFluidHoverAxis="y"` for lists (the default),
  `"x"` for strips, `"xy"` for grids.
- **One list per group of alternatives.** A divider between different kinds
  of rows means a new container and a new highlight. Children of a parent row
  belong to the parent's list.
- **Only click targets register.** A row without `href` or a click handler
  does not join, because lighting it would promise a click with nowhere to
  land. Disabled rows stay registered but are skipped via
  `ffFluidHoverItemDisabled`.
- **The directive owns the gap click.** `ffFluidHoverGapClick` (default on)
  routes a click in a gap to the highlighted item's activator, so what is lit
  is what a click hits. Pass `false` where empty space should stay inert, or
  `{ maxDistance: 16 }` for a grid with generous whitespace.
- **Never re-measure on data changes.** Registration and item resizes trigger
  measurement themselves. Call `remeasure()` only when rects may be stale (a
  popup that kept rows registered while hidden: call it on open).
- Rows keep their own `:hover`-free styling: the overlay is the hover
  treatment. Content sits above it via `relative`.

For wiring outside a template (an imperative list, an overlay you create in
code), `createFluidHover(container, options)` returns the same controller:
`registerItem(index, element)`, `activeIndex`, `isMeasured`, `session`,
`remeasure()` and the mouse handlers. Call it in an injection context and
bind the handlers on the container element you own.

## Weight without reflow (ghost-span pattern)

State changes (selected, checked, active, open) make text heavier. A heavier
weight is wider, and animating it on a bare text node reflows the layout.
Reserve the width with an invisible copy at the heaviest weight while the
visible copy animates `font-variation-settings`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { fontWeights } from '@angel-r/fluid-functionalism-angular';

@Component({
  selector: 'app-weight-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-grid">
      <span
        class="col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80"
        [style.font-variation-settings]="active ? weights.semibold : weights.normal"
      >
        {{ label }}
      </span>
      <span
        aria-hidden="true"
        class="col-start-1 row-start-1 invisible"
        [style.font-variation-settings]="weights.semibold"
      >
        {{ label }}
      </span>
    </span>
  `,
})
export class WeightLabel {
  readonly label = 'Selected label';
  readonly active = true;
  protected readonly weights = fontWeights;
}
```

- Weight comes from `font-variation-settings` plus the `fontWeights` tokens,
  never `font-weight` or a Tailwind `font-*` class. The tokens pair a tighter
  optical size (`opsz`) with the heavier weight so the advance width barely
  changes.
- The transition property list must include `font-variation-settings`
  (`transition-[color,font-variation-settings] duration-80`); plain
  `transition-colors` snaps the weight.
- Standard pair: resting `normal` to active `semibold` (400 to 550). Do not
  invent new pairs.
- Skip the ghost span only when the weight is static for the node's lifetime
  or the element is already a fixed-size box.

## Icon swaps (copy to check, play to pause)

Two glyphs, one cell, crossfading with a touch of blur and scale: the slot
never resizes. The arriving glyph rides the tier's full duration and the
leaving one its exit token, so an appear always outlasts a disappear. Both
are tweens on purpose: a spring settles early and would invert that order,
and blur is a `filter` string a spring cannot drive.

```ts
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Icon, injectAnimateFluid, spring, injectSize } from '@angel-r/fluid-functionalism-angular';

const SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' };
const HIDDEN = { opacity: 0, scale: 0.6, filter: 'blur(4px)' };
const enter = { duration: spring.fast.duration, ease: 'easeOut' } as const;
const leave = { duration: spring.fast.exit.duration, ease: 'easeIn' } as const;

@Component({
  selector: 'app-copy-glyph',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="grid" [style.width.px]="size().icon" [style.height.px]="size().icon">
      <ff-icon #copy class="col-start-1 row-start-1" name="copy" [size]="size().icon" />
      <ff-icon #check class="col-start-1 row-start-1" name="check" [size]="size().icon" />
    </span>
  `,
})
export class CopyGlyph {
  readonly copied = input(false);
  protected readonly size = injectSize();
  // `{ read: ElementRef }` because a #ref on a component resolves to the
  // component instance, not its host element.
  private readonly copy = viewChild('copy', { read: ElementRef });
  private readonly check = viewChild('check', { read: ElementRef });
  private readonly animateFluid = injectAnimateFluid();

  constructor() {
    afterRenderEffect(() => {
      const copy = this.copy()?.nativeElement;
      const check = this.check()?.nativeElement;
      if (!copy || !check) return;
      const copied = this.copied();
      this.animateFluid(copy, copied ? HIDDEN : SHOWN, copied ? leave : enter);
      this.animateFluid(check, copied ? SHOWN : HIDDEN, copied ? enter : leave);
    });
  }
}
```

Keep the accessible label stable: sighted users see the check, and a screen
reader hears "Copied" from a visually hidden span in an `aria-live="polite"`
region. The component's own copy feedback (`ff-input-copy`) does this for
you.

## State backgrounds and elevation

- Hover and selection fills use the shared tokens `bg-hover` and `bg-active`
  (from the theme), not ad-hoc grays, so they read correctly on every surface
  level in light and dark.
- A custom popover or panel that floats above the page wraps itself in
  `[ffElevated]="2"` (`4` for a dialog-sized surface): it reads the current
  substrate level and applies the right `bg-surface-N` / `shadow-surface-N`,
  so nested popups stay visible at any depth. `[shadowLevel]` pins the shadow
  weight when the background must track the substrate.
- Sizes come from `injectSize()`: a 36px default and a 28px compact, shared
  by buttons, inputs, selects, tabs and rows. Match one of the two in custom
  rows (`size().control`, `size().text`, `size().px`, `size().itemPx`,
  `size().gap`, `size().icon`) instead of inventing a third height. Wrap a
  whole region in `[ffSizeProvider]` rather than setting size per control.
- Corner radii come from `injectShape()` (`item`, `bg`, `container`,
  `focusRing`, `mergedBg`, `button`, `input`), which follows the app's pill or
  rounded choice. `nestedRadius()` derives an inner radius for an inset
  surface.

## Never stack two measured-height collapses

A wrapper that animates to a ResizeObserver-measured height must spring only
when **it** toggles. When the measured height changes because a *child*
collapsed, snap (duration 0). Otherwise the outer wrapper chases a moving
target every frame, lags its own child and lands about 100ms late; each
nesting level multiplies the sludge. `createCollapsibleRegion()` is the
library's building block for this pattern when you need the same behaviour
outside a component.

## Page reveals

Appear and scroll animation for whole pages: 2 presets for the page, each
with a `-subtle` step, and 2 helpers for slow data (`reveal-swap`,
`reveal-items`). They are CSS classes in `styles/theme.css`, so the theme
import is all the setup they need. Put 1 class on the page's container, the
way you add `scroll-fade`. Live version:
<https://angel-r.github.io/fluid-functionalism-angular/docs/reveal>.

### Pick by context

| Class | For | On load | On scroll |
|---|---|---|---|
| `reveal-landing` | A page read once: a launch, pricing, a case study | 1st child is the hero; its children rise 12px and scale in from 0.94, 0.1s apart | Every later child does the same with the scroll, from its top edge 12px inside the viewport to 120px; every section leaves the same way at the top |
| `reveal-landing-subtle` | Same, quieter | 8px and 0.98, 0.06s apart | From 8px to 60px |
| `reveal-product` | The app people come back to | Every child fades in, 0.06s apart, no rise | Nothing |
| `reveal-product-subtle` | Same, quieter | Fade, 0.04s apart | Nothing |

Scroll reveals in an app are noise by the 10th visit: an app screen should
feel like it was already there.

### What moves

- Groups, not elements: a hero, a product shot, a row of cards, a quote.
  Never every line, and never a scroll-listener fade on each element.
- Everything on screen at first paint goes in the hero (the 1st child),
  product shot included: a later section that starts on screen sits half
  revealed, waiting for a scroll, instead of playing on load.
- For a grid, put `reveal-scroll` on each card: every card becomes a scroll
  section with the same values, and the section holding them stays still.
  Wrap a card that already animates `transform` and put the class on the
  wrapper: the CSS animation would override its transform.
- Every scroll section and `reveal-scroll` also plays a load step after the
  hero, a step apart, so cards already on screen at first paint arrive with
  the page instead of sitting there; off screen, the step plays unseen and
  the scroll takes over. A section cut by the bottom edge still settles half
  revealed, which is why first-paint content belongs in the hero.
- Nest a second `reveal-scroll` inside a card for its content: it follows
  half a range later on the way in and leaves half a range sooner, so the
  card frame arrives first and its content settles into it.
- A view timeline binds to the nearest scroll container, and `overflow:
  hidden` makes one even if it never scrolls. Clip a revealed element's
  ancestors with `overflow: clip` instead, or its animation never moves.
- Keep chrome still: put the header, nav, sidebar and footer outside the
  container. Backgrounds and dividers never move.
- Never animate a parent and its children both. Pick 1 level.
- Product reveals play once and have no exit. Landing sections follow the
  scroll on purpose, both ways: in at the bottom, and out at the top as a
  mirror of the way in (fade, lift, scale down).

### Timing

- No new token: landing steps ride `spring.slow` (0.24s, bounce 0.12), the
  tier for large surfaces, so pages move at the pace of dialogs. Product
  steps ride `spring.moderate` (0.16s, no bounce): app blocks are panels, and
  a fade has no travel for a bounce to act on. Both are written in CSS as
  `linear()`; scroll steps follow the scroll.
- Stagger siblings only, 0.04 to 0.1s apart, and cap it: the 4th step (8th
  for data rows) carries everything after it, so a list never queues.
- Travel stays small: 12px and a 0.94 scale at most on a landing page, none
  in the app. No blur, no rotation, no sideways travel.

### Bulletproof by default

- Pure CSS: no JavaScript, no hydration flash. The server renders everything
  visible; on-load steps start on first paint.
- Scroll-linked motion uses CSS view timelines. Browsers without them show
  the content still.
- Keep the LCP element (hero image, main headline) out of any reveal: Chrome
  does not count a paint at opacity 0.
- Animate `transform` and `opacity` only, so layout never shifts.
- A revealed landing section keeps a `transform`, which pins any
  `position: fixed` child to the section: keep fixed elements outside.

### Loading data in the app

Slow data waits on a placeholder marked `data-slot="skeleton"`. The theme
styles it: a 250ms fade-in on an even curve, then the pulse, on keyframes of
its own so it works without Tailwind's `animate-pulse`. There is no Skeleton
component in the package, so the block is yours; the marker is the contract.

```html
<main class="reveal-product">
  <app-header />
  <div class="reveal-swap">
    <app-threads-skeleton class="reveal-items" aria-hidden="true" />
    @if (threads(); as rows) {
      <app-threads class="reveal-items" [rows]="rows" />
    }
  </div>
</main>
```

- Build each skeleton the exact size of its real block (same paddings, line
  heights, avatar sizes) and measure both: the swap must not shift layout.
- Never replace a skeleton with data on the same frame: the data starts at
  opacity 0 and the space blinks empty. `reveal-swap` stacks both in 1 cell;
  render the skeleton, add the real block after it, and the skeleton fades
  out as the block fades in.
- `reveal-items` on both brings rows and metrics in one by one, each skeleton
  row handing over to its own real row. It works beside a preset too, for a
  sidebar.
- Load blocks independently: each request lands on its own time and in any
  order. Never fake a tidy sequence; give each metric its own swap.
- Keep skeletons inside a block: a skeleton that is itself an animated child
  loses its pulse.

### Accessibility

- Reduced motion keeps the fades, drops all travel and scale, turns
  scroll-linked motion off, and stops the skeleton pulse.
- Mark skeleton blocks `aria-hidden="true"`.

### When you demo it

- Show real content edge to edge, not grey boxes in a small frame.
- Put the controls where the eye is (intensity tabs, a primary Replay) and
  show the live values under the demo.
- Start a demo only once it is on screen, so people see it play instead of
  its end state.
