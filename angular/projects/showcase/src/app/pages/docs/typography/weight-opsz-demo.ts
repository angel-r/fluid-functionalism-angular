// ---------------------------------------------------------------------------
// The "Weight without reflow" demo, ported from WeightOpszDemo and WeightItem
// in app/docs/typography/demos.tsx: the same menu item drawn twice — weight
// alone, which widens the label, and weight paired with an optical size,
// which does not. A scripted pointer clicks the row on and off while the demo
// is on screen; a real pointer inside takes over, and reduced motion leaves
// it to the reader with the item on.
//
// Measurements come from hidden copies of the label at both weights, so the
// blue line marks the unselected width and whatever runs past it is tinted
// red.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { animate, easeInOut, motionValue, type AnimationPlaybackControls, type MotionValue } from 'motion';
import {
  FluidHoverHighlight,
  ReducedMotion,
  cn,
  fontWeights,
  injectShape,
  typeClass,
  type ItemRect,
} from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { FakeCursor } from './fake-cursor';
import { Specimen } from './specimen';

const MENU_LABEL = 'Open the settings dialog';

/** One menu item that behaves like a sidebar row: a hover background under
 *  the pointer, and a click that sets the active background and turns the
 *  label semibold. The blue line marks the unselected width; whatever runs
 *  past it is tinted red. */
@Component({
  selector: 'app-weight-item',
  imports: [FluidHoverHighlight, FakeCursor],
  template: `
    <div #frame class="relative p-1" (mouseenter)="visit.update((v) => v + 1)">
      <!-- The active background, in on the click. -->
      <div
        aria-hidden
        class="pointer-events-none absolute bg-active transition-opacity duration-80"
        [class.opacity-0]="!selected() || !shown()"
        [style.left.px]="marks()?.row?.left ?? 0"
        [style.top.px]="marks()?.row?.top ?? 0"
        [style.width.px]="marks()?.row?.width ?? 0"
        [style.height.px]="marks()?.row?.height ?? 0"
        [class]="shape().bg"
      ></div>
      <ff-fluid-hover-highlight [rect]="hoverRect()" [session]="visit()" [class]="shape().bg" />
      @if (marks(); as m) {
        <span
          aria-hidden
          class="pointer-events-none absolute inset-y-2 z-20 w-px bg-[#6B97FF]"
          [style.left.px]="m.edge"
        ></span>
        <!-- What spills past the line, tinted over the selected label's end. -->
        @if (selected() && m.over >= 0.5) {
          <span
            aria-hidden
            class="pointer-events-none absolute z-20 bg-[#F2555A]/45"
            [style.left.px]="m.edge"
            [style.width.px]="m.over"
            [style.top.px]="m.top - 3"
            [style.height.px]="m.height + 6"
          ></span>
        }
      }
      <div
        #row
        (mouseenter)="pointerOver.set(true)"
        (mouseleave)="pointerOver.set(false)"
        (click)="toggle.emit()"
        [class]="rowClass"
      >
        <span
          #label
          class="whitespace-nowrap transition-[color,font-variation-settings] duration-80"
          [class]="hovered() ? 'text-foreground' : 'text-muted-foreground'"
          [style.font-variation-settings]="settings()[selected() ? 1 : 0]"
        >
          {{ menuLabel }}
        </span>
      </div>
      @for (setting of settings(); track $index) {
        <span
          #sizer
          aria-hidden
          [class]="sizerClass"
          [style.font-variation-settings]="setting"
        >
          {{ menuLabel }}
        </span>
      }
      @if (showCursor()) {
        <app-fake-cursor [x]="cursorX" [y]="cursorY()" />
      }
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeightItem {
  /** The two weights, unselected then selected. */
  readonly settings = input.required<readonly [string, string]>();
  readonly selected = input.required<boolean>();
  /** The scripted pointer: whether it is over the item. */
  readonly cursorOver = input(false);
  readonly showCursor = input(false);
  readonly cursorY = input.required<MotionValue<number>>();
  readonly toggle = output<void>();
  /** How much wider the selected label draws, in px. */
  readonly delta = output<number>();

  protected readonly menuLabel = MENU_LABEL;
  protected readonly cursorX = 56;
  protected readonly rowClass = cn('relative z-10 flex h-9 cursor-pointer items-center gap-2 px-2', typeClass('body'));
  /** The label's own metrics, with no row padding: what the sizers measure. */
  protected readonly sizerClass = cn('invisible absolute left-0 top-0 whitespace-nowrap', typeClass('body'));
  protected readonly shape = injectShape();
  protected readonly pointerOver = signal(false);
  protected readonly visit = signal(0);
  protected readonly marks = signal<{
    edge: number;
    over: number;
    top: number;
    height: number;
    row: ItemRect;
  } | null>(null);
  protected readonly shown = signal(false);

  protected readonly hovered = computed(() => (this.showCursor() ? this.cursorOver() : this.pointerOver()));
  protected readonly hoverRect = computed<ItemRect | null>(() => {
    const marks = this.marks();
    return marks && this.hovered() ? marks.row : null;
  });

  private readonly frameRef = viewChild.required<ElementRef<HTMLElement>>('frame');
  private readonly rowRef = viewChild.required<ElementRef<HTMLElement>>('row');
  private readonly labelRef = viewChild.required<ElementRef<HTMLElement>>('label');
  private readonly sizers = viewChildren<ElementRef<HTMLElement>>('sizer');
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  constructor() {
    afterNextRender(() => {
      const measure = () => {
        const frame = this.frameRef().nativeElement;
        const row = this.rowRef().nativeElement;
        const label = this.labelRef().nativeElement;
        const [off, on] = this.sizers().map((sizer) => sizer.nativeElement.getBoundingClientRect().width);
        if (off === undefined || on === undefined) return;
        const f = frame.getBoundingClientRect();
        const l = label.getBoundingClientRect();
        this.marks.set({
          edge: l.left - f.left + off,
          over: on - off,
          top: l.top - f.top,
          height: l.height,
          row: { top: row.offsetTop, left: row.offsetLeft, width: row.offsetWidth, height: row.offsetHeight },
        });
        this.delta.emit(on - off);
      };
      // Widths are only right once Inter has loaded.
      void this.document.fonts?.ready.then(() => measure());
      const observer = new ResizeObserver(() => measure());
      observer.observe(this.frameRef().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
      // The background fades in at mount, as AnimatePresence's first child does.
      requestAnimationFrame(() => this.shown.set(true));
    });
  }
}

/** One script: the cursor comes down onto the label, rests a beat, clicks it
 *  on, holds long enough to read the result, clicks it off, and leaves. */
const OUT_Y = -28;
const IN_Y = 24;
const ITEM_TOP = 4;
const ITEM_BOTTOM = 40;
const GLIDE_S = 0.6;
const REST_S = 0.2;
const ON_S = 1.4;
const OFF_S = 0.6;
const AWAY_S = 0.4;
const LOOP_S = GLIDE_S + REST_S + ON_S + OFF_S + GLIDE_S + AWAY_S;
const at = (s: number) => s / LOOP_S;
const CLICK_ON = at(GLIDE_S + REST_S);
const CLICK_OFF = at(GLIDE_S + REST_S + ON_S);
const LEAVE = at(GLIDE_S + REST_S + ON_S + OFF_S);
const Y_TIMES = [0, at(GLIDE_S), LEAVE, LEAVE + at(GLIDE_S), 1];
const Y_KEYS = [OUT_Y, IN_Y, IN_Y, OUT_Y, OUT_Y];
const selectedAt = (p: number) => p >= CLICK_ON && p < CLICK_OFF;

/** The y of the scripted pointer at `p`: the same keyframes and ease the
 *  reference builds with useTransform. */
function yAt(p: number): number {
  let index = 0;
  while (index < Y_TIMES.length - 2 && p > Y_TIMES[index + 1]) index++;
  const span = Y_TIMES[index + 1] - Y_TIMES[index];
  const local = span === 0 ? 1 : (p - Y_TIMES[index]) / span;
  const eased = easeInOut(Math.min(Math.max(local, 0), 1));
  return Y_KEYS[index] + (Y_KEYS[index + 1] - Y_KEYS[index]) * eased;
}

const wider = (px: number | null) =>
  px === null ? '' : Math.abs(px) < 0.25 ? ': same width' : `: ${Math.abs(px).toFixed(1)}px wider`;

@Component({
  selector: 'app-weight-opsz-demo',
  imports: [ComponentPreview, Specimen, WeightItem],
  template: `
    <app-component-preview [hideHeader]="true">
      <div
        #root
        class="grid w-full max-w-xl gap-5 sm:grid-cols-2"
        (mouseenter)="userInside.set(true)"
        (mousemove)="userInside.set(true)"
        (pointerdown)="userInside.set(true)"
        (mouseleave)="userInside.set(false)"
      >
        <app-specimen [good]="false">
          <span specimen-caption>Weight only{{ wider(plain()) }}</span>
          <app-weight-item
            [settings]="plainSettings"
            [selected]="selected()"
            [cursorOver]="scriptOver()"
            [showCursor]="scripted()"
            [cursorY]="y"
            (toggle)="selected.set(!selected())"
            (delta)="plain.set($event)"
          />
        </app-specimen>
        <app-specimen [good]="true">
          <span specimen-caption>Weight + optical size{{ wider(paired()) }}</span>
          <app-weight-item
            [settings]="pairedSettings"
            [selected]="selected()"
            [cursorOver]="scriptOver()"
            [showCursor]="scripted()"
            [cursorY]="y"
            (toggle)="selected.set(!selected())"
            (delta)="paired.set($event)"
          />
        </app-specimen>
      </div>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeightOpszDemo {
  protected readonly wider = wider;
  protected readonly plain = signal<number | null>(null);
  protected readonly paired = signal<number | null>(null);
  protected readonly selected = signal(true);
  protected readonly userInside = signal(false);
  protected readonly scriptOver = signal(true);
  protected readonly plainSettings = ["'wght' 400", "'wght' 550"] as const;
  protected readonly pairedSettings = [fontWeights.normal, fontWeights.semibold] as const;
  protected readonly y = motionValue(OUT_Y);

  protected readonly inView = signal(false);
  private readonly reduced = inject(ReducedMotion).value;
  protected readonly scripted = computed(() => this.inView() && !this.reduced() && !this.userInside());

  private controls: AnimationPlaybackControls | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');

  constructor() {
    afterNextRender(() => {
      const root = this.root()?.nativeElement;
      if (!root) return;
      const observer = new IntersectionObserver((entries) => this.inView.set(entries.some((e) => e.isIntersecting)), {
        threshold: 0.5,
      });
      observer.observe(root);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    // One animation, paused and resumed in place, so the reader's pointer
    // holds the current frame.
    afterNextRender(() => {
      const progress = motionValue(0);
      progress.on('change', (p) => {
        this.y.set(yAt(p));
        this.selected.set(selectedAt(p));
        const value = yAt(p);
        this.scriptOver.set(value >= ITEM_TOP && value <= ITEM_BOTTOM);
      });
      this.controls = animate(progress, [0, 1], { duration: LOOP_S, ease: 'linear', repeat: Infinity });
      if (!this.scripted()) this.controls.pause();
    });

    afterRenderEffect(() => {
      const scripted = this.scripted();
      untracked(() => {
        if (scripted) this.controls?.play();
        else this.controls?.pause();
      });
    });
  }
}
