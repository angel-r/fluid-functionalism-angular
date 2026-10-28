// ---------------------------------------------------------------------------
// The Skill page's examples, ported from app/docs/skill/examples.tsx and
// menu-example.tsx: each pairs what an agent writes on its own with what it
// writes following the skill's references — the real TabsSubtle, InputCopy and
// Button, next to a generic version with the flaw each reference fixes. A
// scripted cursor plays the generic side, then the skill side, turn by turn.
//
// `TabsExample` is imported by the changelog's New-entry preview, so its path,
// class name, selector and `paused` input are a stable contract.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { animate } from 'motion';
import {
  FluidHoverHighlight,
  FluidHover,
  FluidHoverItem,
  Icon,
  InputCopy,
  TabsSubtle,
  TabsSubtleItem,
  cn,
  fontWeights,
  injectAnimateFluid,
  injectShape,
  spring,
  enterTransition,
} from '@angel-r/fluid-functionalism-angular';
import { SkillCompare } from './compare';
import { SkillPlayer, type Side } from './playback';

// ---------------------------------------------------------------------------
// Tabs: subtle tabs, weight without reflow and a sliding pill
// ---------------------------------------------------------------------------

const TABS = ['Overview', 'Activity', 'Settings'];

/** Generic subtle tabs: font-semibold on the active tab widens it and
 *  shoves its neighbors; the active pill jumps instead of sliding, and each
 *  tab paints its own hover. */
@Component({
  selector: 'app-skill-generic-tabs',
  template: `
    <div role="tablist" class="inline-flex">
      @for (label of tabs; track label; let i = $index) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="selected() === i"
          (click)="pick.emit(i)"
          [class]="tabClass(i)"
        >
          {{ label }}
        </button>
      }
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class GenericTabs {
  readonly selected = input.required<number>();
  readonly pick = output<number>();
  protected readonly tabs = TABS;
  private readonly shape = injectShape();

  protected tabClass(index: number): string {
    return cn(
      'h-9 px-3 text-site-body text-muted-foreground [&:is(:hover,[data-script-hover])]:bg-muted/60',
      // The generic version, bold on purpose to show the reflow.
      this.selected() === index && 'bg-muted font-semibold text-foreground [&:is(:hover,[data-script-hover])]:bg-muted',
      this.shape().bg,
    );
  }
}

@Component({
  selector: 'app-skill-tabs-example',
  imports: [SkillCompare, GenericTabs, TabsSubtle, TabsSubtleItem],
  providers: [SkillPlayer],
  template: `
    <app-skill-compare [active]="player.playing() ? active() : null" [paused]="paused()">
      <div generic>
        <app-skill-generic-tabs [selected]="generic()" (pick)="generic.set($event)" />
      </div>
      <ff-tabs-subtle
        skill
        idPrefix="skill-example-tabs"
        aria-label="Example tabs"
        [selectedIndex]="skill()"
        (selectedIndexChange)="skill.set($event)"
      >
        @for (label of tabs; track label; let i = $index) {
          <button ffTabsSubtleItem [index]="i" [label]="label"></button>
        }
      </ff-tabs-subtle>
    </app-skill-compare>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsExample {
  /** Holds the script, for a page-wide pause (the changelog's previews). */
  readonly paused = input(false, { transform: booleanAttribute });

  protected readonly tabs = TABS;
  protected readonly player = inject(SkillPlayer);
  protected readonly generic = signal(0);
  protected readonly skill = signal(0);
  protected readonly active = signal<Side | null>(null);

  constructor() {
    this.player.loop(() =>
      this.player.turns(
        (side) => this.active.set(side),
        (side) => [
          ...this.player.clickStep(tabSelector(side), 1, () => this.select(side, 1), 700),
          ...this.player.clickStep(tabSelector(side), 2, () => this.select(side, 2), 700),
          ...this.player.clickStep(tabSelector(side), 0, () => this.select(side, 0), 900),
        ],
      ),
    );
  }

  private select(side: Side, index: number): void {
    (side === 'generic' ? this.generic : this.skill).set(index);
  }
}

const tabSelector = (side: Side) => `[data-side="${side}"] [role="tab"]`;

// ---------------------------------------------------------------------------
// Copy field: the action swaps in place, the field never reflows
// ---------------------------------------------------------------------------

/** The Angular skill's install command, the value every copy example shows. */
const COMMAND = 'npx skills add angel-r/fluid-functionalism-angular --skill fluid-functionalism-angular';

/** The generic read-only field: the command, truncated, with the copy action
 *  inside on the right, like shadcn's copy input. */
@Component({
  selector: 'app-skill-copy-field',
  template: `
    <div [class]="fieldClass">
      <span class="min-w-0 flex-1 truncate font-mono text-site-caption text-muted-foreground">{{ command }}</span>
      <ng-content />
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CopyField {
  protected readonly command = COMMAND;
  private readonly shape = injectShape();
  protected readonly fieldClass = cn(
    'flex h-9 w-full max-w-[240px] items-center gap-1 border border-border bg-background pl-3 pr-1',
    this.shape().bg,
  );
}

const actionClass =
  'flex h-7 shrink-0 items-center gap-1.5 px-1.5 text-site-caption text-muted-foreground [&:is(:hover,[data-script-hover])]:text-foreground';

/** Generic: the icon snaps to a check and "Copy" turns into "Copied!", which
 *  is wider, so the action grows and eats into the command text. */
@Component({
  selector: 'app-skill-generic-copy',
  imports: [CopyField, Icon],
  template: `
    <app-skill-copy-field>
      <button type="button" (click)="copy.emit()" [class]="actionClassValue()">
        <ff-icon [name]="copied() ? 'check' : 'copy'" [size]="14" [strokeWidth]="1.5" />
        {{ copied() ? 'Copied!' : 'Copy' }}
      </button>
    </app-skill-copy-field>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class GenericCopy {
  readonly copied = input.required<boolean>();
  readonly copy = output<void>();
  private readonly shape = injectShape();
  protected readonly actionClassValue = computed(() => cn(actionClass, this.shape().bg));
}

/** The reference stubs the one clipboard write a scripted click makes, so the
 *  visitor's clipboard is untouched and InputCopy still plays its feedback. */
function clickWithoutClipboard(button: HTMLElement | null, value: string): void {
  const clipboard = navigator.clipboard;
  if (!button || !clipboard) return;
  const own = Object.prototype.hasOwnProperty.call(clipboard, 'writeText');
  const writeText = clipboard.writeText;
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    if (own) clipboard.writeText = writeText;
    else Reflect.deleteProperty(clipboard, 'writeText');
  };
  clipboard.writeText = (text: string) => {
    if (text !== value) return writeText.call(clipboard, text);
    restore();
    return Promise.resolve();
  };
  window.setTimeout(restore, 1000);
  button.click();
}

/** InputCopy's hover is CSS group-hover on its button, which the scripted
 *  cursor can't trigger, so its look is mirrored for [data-script-hover]. */
const SKILL_COPY_CLASS =
  'w-full max-w-[240px] [&_button[data-script-hover]_mark]:bg-[#6B97FF]/20 [&_button[data-script-hover]_svg]:stroke-[2] [&_button[data-script-hover]_.text-muted-foreground]:text-foreground';

@Component({
  selector: 'app-skill-copy-example',
  imports: [SkillCompare, GenericCopy, InputCopy],
  providers: [SkillPlayer],
  template: `
    <app-skill-compare [active]="player.playing() ? active() : null" [paused]="paused()">
      <div generic>
        <app-skill-generic-copy [copied]="generic()" (copy)="generic.set(!generic())" />
      </div>
      <ff-input-copy skill align="left" [value]="command" [class]="skillClass" />
    </app-skill-compare>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyExample {
  readonly paused = input(false, { transform: booleanAttribute });

  protected readonly command = COMMAND;
  protected readonly skillClass = SKILL_COPY_CLASS;
  protected readonly player = inject(SkillPlayer);
  protected readonly generic = signal(false);
  protected readonly active = signal<Side | null>(null);

  constructor() {
    this.player.loop(
      () =>
        this.player.turns(
          (side) => this.active.set(side),
          (side) =>
            side === 'generic'
              ? [
                  // Aim for the small action button, the only part that copies.
                  ...this.player.clickStep('[data-side="generic"] button', 0, () => this.generic.set(true), 1400),
                  { ms: 600, run: () => this.generic.set(false) },
                ]
              : // Click the command itself: the whole field copies.
                this.player.clickStep('[data-side="skill"] mark', 0, () => {
                  clickWithoutClipboard(
                    this.player.root()?.querySelector<HTMLElement>('[data-side="skill"] button') ?? null,
                    COMMAND,
                  );
                }, 2300),
        ),
      // InputCopy reverts on its own timer; the generic "Copied!" waits on the script.
      () => this.generic.set(false),
    );
  }
}

// ---------------------------------------------------------------------------
// Menu: fluid hover, spring selection, weight without reflow
// ---------------------------------------------------------------------------

const ROWS = [
  { label: 'Inbox', count: 12 },
  { label: 'Drafts', count: 3 },
  { label: 'Sent', count: 48 },
  { label: 'Archive', count: 210 },
  { label: 'Trash', count: 7 },
];

/* Rows are h-9 (36px) stacked with no gap inside p-2 (8px), the same on
   both sides so the only difference is behavior. */
const ROW_H = 36;
const LIST_PAD = 8;
const rowTop = (i: number) => LIST_PAD + i * ROW_H;

const rowBase =
  'relative z-10 flex h-9 w-full shrink-0 items-center gap-2 px-3 text-left text-site-body text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]';

/** Generic: :hover per row with no transition, font-weight bold that widens
 *  the label, and a selected background that jumps. */
@Component({
  selector: 'app-skill-generic-list',
  imports: [Icon],
  template: `
    <div class="relative flex w-full flex-col p-2">
      @for (row of rows; track row.label; let i = $index) {
        <button type="button" (click)="pick.emit(i)" [class]="rowClass(i)">
          {{ row.label }}
          <span class="text-site-caption tabular-nums text-muted-foreground">{{ row.count }}</span>
          <!-- Static check: pops in and out with the selection. -->
          @if (selected() === i) {
            <ff-icon name="check" [size]="16" [strokeWidth]="2" class="ml-auto shrink-0" />
          }
        </button>
      }
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class GenericList {
  readonly selected = input.required<number>();
  readonly pick = output<number>();
  protected readonly rows = ROWS;
  private readonly shape = injectShape();

  protected rowClass(index: number): string {
    return cn(
      rowBase,
      // Hover louder than the selection: the cursor, not the pick, is what
      // the eye lands on. Scripted hover counts as hover.
      '[&:is(:hover,[data-script-hover])]:bg-selected dark:[&:is(:hover,[data-script-hover])]:bg-selected',
      // The generic version, bold on purpose to show the reflow.
      this.selected() === index && 'bg-selected/50 font-bold dark:bg-accent/40',
      this.shape().item,
    );
  }
}

/** One row of the skill list: the ghost span holds the width so the count
 *  never moves when the label gets heavier, and the check's path draws in. */
@Component({
  selector: 'app-skill-fluid-row',
  imports: [FluidHoverItem],
  template: `
    <button type="button" [ffFluidHoverItem]="index()" (click)="activate.emit()" [class]="rowBase">
      <span class="inline-grid">
        <span
          class="col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80"
          [style.font-variation-settings]="selected() ? semibold : normal"
        >
          {{ label() }}
        </span>
        <span
          aria-hidden="true"
          class="invisible col-start-1 row-start-1"
          [style.font-variation-settings]="semibold"
        >
          {{ label() }}
        </span>
      </span>
      <span class="text-site-caption tabular-nums text-muted-foreground">{{ count() }}</span>
      <span class="ml-auto flex size-4 shrink-0 items-center justify-center">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-foreground"
        >
          <path #checkPath d="M4 12L9 17L20 6" stroke-dasharray="0 1" />
        </svg>
      </span>
    </button>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class FluidRow {
  readonly index = input.required<number>();
  readonly label = input.required<string>();
  readonly count = input.required<number>();
  readonly selected = input.required<boolean>();
  readonly activate = output<void>();

  protected readonly rowBase = rowBase;
  protected readonly semibold = fontWeights.semibold;
  protected readonly normal = fontWeights.normal;
  private readonly path = viewChild<ElementRef<SVGPathElement>>('checkPath');

  constructor() {
    // The path draws in on 0.08s and erases on 0.04s inside a fixed slot, so
    // the row never changes width.
    afterRenderEffect((onCleanup) => {
      const selected = this.selected();
      const path = this.path()?.nativeElement;
      if (!path) return;
      const controls = animate(
        path,
        { pathLength: selected ? 1 : 0 },
        selected ? { duration: 0.08, ease: 'easeOut' } : { duration: 0.04, ease: 'easeIn' },
      );
      onCleanup(() => controls.stop());
    });
  }
}

/** With the skill: one fluid highlight, a selected background that springs
 *  on the moderate tier, and weight without reflow. */
@Component({
  selector: 'app-skill-list',
  imports: [FluidHover, FluidHoverHighlight, FluidRow],
  template: `
    <div
      ffFluidHover
      class="relative flex w-full flex-col p-2"
      (mouseover)="hover().controller.onMouseEnter()"
    >
      <div
        #pill
        aria-hidden
        [class]="pillClass()"
      ></div>
      <ff-fluid-hover-highlight [class]="shape().bg" />
      @for (row of rows; track row.label; let i = $index) {
        <app-skill-fluid-row
          [index]="i"
          [label]="row.label"
          [count]="row.count"
          [selected]="selected() === i"
          (activate)="pick.emit(i)"
        />
      }
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SkillList {
  readonly selected = input.required<number>();
  readonly pick = output<number>();

  protected readonly rows = ROWS;
  protected readonly shape = injectShape();
  protected readonly pillClass = computed(() =>
    cn('pointer-events-none absolute inset-x-2 top-0 h-9 bg-selected/50 dark:bg-accent/40', this.shape().bg),
  );
  protected readonly hover = viewChild.required(FluidHover);
  private readonly pill = viewChild.required<ElementRef<HTMLElement>>('pill');
  private readonly animate = injectAnimateFluid();

  constructor() {
    // The selection springs between rows on the moderate tier; the first
    // paint places it without travel.
    afterRenderEffect(() => {
      const selected = this.selected();
      const pill = this.pill().nativeElement;
      const y = rowTop(selected);
      this.animate(pill, { y }, this.placed ? enterTransition(spring.moderate) : { duration: 0 });
      this.placed = true;
    });
  }

  private placed = false;
}

@Component({
  selector: 'app-skill-menu-example',
  imports: [SkillCompare, GenericList, SkillList],
  providers: [SkillPlayer],
  template: `
    <app-skill-compare bare [active]="player.playing() ? active() : null" [paused]="paused()">
      <div generic>
        <app-skill-generic-list [selected]="generic()" (pick)="generic.set($event)" />
      </div>
      <app-skill-list skill [selected]="skill()" (pick)="skill.set($event)" />
    </app-skill-compare>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuExample {
  readonly paused = input(false, { transform: booleanAttribute });

  protected readonly player = inject(SkillPlayer);
  protected readonly generic = signal(0);
  protected readonly skill = signal(0);
  protected readonly active = signal<Side | null>(null);

  constructor() {
    /** One turn: glide to a row, sometimes click it. */
    const turn: ReadonlyArray<{ row: number; click?: boolean }> = [
      { row: 3, click: true },
      { row: 0, click: true },
      { row: 4 },
      { row: 1, click: true },
    ];
    const holdMs = 600;
    this.player.loop(() =>
      this.player.turns(
        (side) => this.active.set(side),
        (side) =>
          turn.flatMap(({ row, click }) =>
            click
              ? this.player.clickStep(rowSelector(side), row, () => this.select(side, row), holdMs)
              : [this.player.glideStep(rowSelector(side), row, holdMs)],
          ),
      ),
    );
  }

  private select(side: Side, index: number): void {
    (side === 'generic' ? this.generic : this.skill).set(index);
  }
}

const rowSelector = (side: Side) => `[data-side="${side}"] button`;

// ---------------------------------------------------------------------------
// Button press: 1px per side, not a scale
// ---------------------------------------------------------------------------

const buttonBase = 'relative inline-flex items-center justify-center text-background outline-none';

/** The same press on 2 sizes: the compact rung of the ladder above a wide
 *  default button. */
const SIZES = [
  { className: 'h-7 px-3 text-site-caption', label: 'Skip' },
  { className: 'h-9 w-full max-w-64 text-site-body', label: 'Continue' },
];

/** Generic: scale(0.9) takes 10% of each button, not a fixed amount. The
 *  48px button loses about 2px a side; the 256px one loses about 13px a side
 *  but under 2px top and bottom, so it squashes. */
@Component({
  selector: 'app-skill-generic-press',
  template: `
    <div class="flex w-full flex-col items-center gap-4">
      @for (size of sizes; track size.label; let i = $index) {
        <button
          type="button"
          [attr.data-pressed]="pressed() === i"
          (pointerdown)="pressedChange.emit(i)"
          (pointerup)="pressedChange.emit(null)"
          (pointerleave)="pressedChange.emit(null)"
          [class]="buttonClass(i)"
        >
          {{ size.label }}
        </button>
      }
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class GenericPress {
  readonly pressed = input.required<number | null>();
  readonly pressedChange = output<number | null>();
  protected readonly sizes = SIZES;
  private readonly shape = injectShape();

  protected buttonClass(index: number): string {
    return cn(
      buttonBase,
      SIZES[index].className,
      // Tailwind v4's scale-* sets the `scale` property, not transform.
      'bg-foreground transition-[scale,background-color] duration-150 ease-out',
      '[&:is(:hover,[data-script-hover]):not([data-pressed=true])]:bg-foreground/90',
      this.pressed() === index && 'scale-90 bg-[color-mix(in_oklab,var(--foreground)_80%,var(--background))]',
      this.shape().bg,
    );
  }
}

/** With the skill: the Button's press. The surface sits 1px inside and a
 *  same-color 1px spread fills it out; pressing collapses the spread, so the
 *  surface shrinks exactly 1px per side at any size. */
@Component({
  selector: 'app-skill-press',
  template: `
    <div class="flex w-full flex-col items-center gap-4">
      @for (size of sizes; track size.label; let i = $index) {
        <button
          type="button"
          [attr.data-pressed]="pressed() === i"
          (pointerdown)="pressedChange.emit(i)"
          (pointerup)="pressedChange.emit(null)"
          (pointerleave)="pressedChange.emit(null)"
          [class]="buttonClass(i)"
        >
          <span aria-hidden="true" [class]="surfaceClass(i)"></span>
          <span class="relative">{{ size.label }}</span>
        </button>
      }
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SkillPress {
  readonly pressed = input.required<number | null>();
  readonly pressedChange = output<number | null>();
  protected readonly sizes = SIZES;
  private readonly shape = injectShape();

  protected buttonClass(index: number): string {
    return cn(
      buttonBase,
      SIZES[index].className,
      // The Button's hover: the surface eases 10% toward the page.
      '[--btn-rest:var(--foreground)] [&:is(:hover,[data-script-hover])]:[--btn-rest:color-mix(in_oklab,var(--foreground)_90%,var(--background))]',
      this.shape().bg,
    );
  }

  protected surfaceClass(index: number): string {
    return cn(
      'absolute inset-px rounded-[inherit] bg-[var(--btn-bg)] transition-[box-shadow,background-color]',
      this.pressed() === index
        ? 'shadow-[0_0_0_0px_var(--btn-bg)] [--btn-bg:color-mix(in_oklab,var(--foreground)_80%,var(--background))] [transition-duration:80ms,80ms]'
        : 'shadow-[0_0_0_1px_var(--btn-bg)] [--btn-bg:var(--btn-rest)] [transition-duration:180ms,80ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1),ease]',
    );
  }
}

@Component({
  selector: 'app-skill-press-example',
  imports: [SkillCompare, GenericPress, SkillPress],
  providers: [SkillPlayer],
  template: `
    <app-skill-compare [active]="player.playing() ? active() : null" [paused]="paused()">
      <div generic>
        <app-skill-generic-press [pressed]="generic()" (pressedChange)="generic.set($event)" />
      </div>
      <app-skill-press skill [pressed]="skill()" (pressedChange)="skill.set($event)" />
    </app-skill-compare>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PressExample {
  readonly paused = input(false, { transform: booleanAttribute });

  protected readonly player = inject(SkillPlayer);
  protected readonly generic = signal<number | null>(null);
  protected readonly skill = signal<number | null>(null);
  protected readonly active = signal<Side | null>(null);

  constructor() {
    this.player.loop(
      () =>
        this.player.turns(
          (side) => this.active.set(side),
          (side) => [
            ...this.player.clickStep(buttonSelector(side), 0, () => this.set(side, 0), 260),
            { ms: 400, run: () => this.set(side, null) },
            ...this.player.clickStep(buttonSelector(side), 1, () => this.set(side, 1), 260),
            { ms: 800, run: () => this.set(side, null) },
          ],
        ),
      // Never leave a button held down for the visitor taking over.
      () => {
        this.generic.set(null);
        this.skill.set(null);
      },
    );
  }

  private set(side: Side, index: number | null): void {
    (side === 'generic' ? this.generic : this.skill).set(index);
  }
}

const buttonSelector = (side: Side) => `[data-side="${side}"] button`;
