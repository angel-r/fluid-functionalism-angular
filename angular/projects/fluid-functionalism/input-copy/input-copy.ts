import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  InjectionToken,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { animate } from 'motion';
import {
  cn,
  exitFallbackMs,
  spring,
  fontWeights,
  injectShape,
  type SizeVariant,
  injectSize,
  Icon,
  type FluidAnimation,
  enterTransition,
  exitTransition,
  injectAnimateFluid,
} from '@angel-r/fluid-functionalism-angular/core';
import { Tooltip } from '@angel-r/fluid-functionalism-angular/tooltip';

// ---------------------------------------------------------------------------
// InputCopy shows a value and copies it on click. The whole row is one
// <button>: hovering it tints the value and thickens the icon, so the full
// value reads as the click target, not just the icon. 2 variants: "icon"
// (copy icon with a tooltip) and "button" (icon plus a Copy label). Either
// way the result shows in place for 2000ms: a check that draws itself, or a
// red × when the copy fails.
// ---------------------------------------------------------------------------

export type InputCopyVariant = 'icon' | 'button';
export type InputCopyAlign = 'right' | 'left';
type CopyStatus = 'idle' | 'copied' | 'error';
interface ShownGlyph {
  status: CopyStatus;
  key: number;
}

/** The async clipboard InputCopy writes through. */
export interface InputCopyClipboard {
  writeText(text: string): Promise<void>;
}

/**
 * Seam over `navigator.clipboard`, so tests and hosts can swap it. The
 * default reads the browser API at call time and rejects where it is missing
 * (insecure context), which sends InputCopy down its execCommand fallback.
 */
export const INPUT_COPY_CLIPBOARD = new InjectionToken<InputCopyClipboard>('FF_INPUT_COPY_CLIPBOARD', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    return {
      writeText: (text: string) => {
        const clipboard = document.defaultView?.navigator.clipboard;
        if (!clipboard?.writeText) return Promise.reject(new Error('Clipboard API unavailable'));
        return clipboard.writeText(text);
      },
    };
  },
});

const RESULT_MS = 2000;
const CHECK_PATH = 'M6 12L10 16L18 8';
const ERROR_PATH = 'M9 9L15 15M15 9L9 15';

let nextId = 0;

/**
 * Read-only value with a copy-to-clipboard button and animated check
 * feedback: `<ff-input-copy value="npx ..." label="Install command" />`.
 */
@Component({
  selector: 'ff-input-copy',
  imports: [NgTemplateOutlet, Icon, Tooltip],
  host: {
    '[class]': 'hostClass()',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
  },
  template: `
    @if (label()) {
      <span [id]="labelId" [class]="labelClass()" [style.font-variation-settings]="normalWeight">{{ label() }}</span>
    }
    @if (variant() === 'icon') {
      <ff-tooltip
        [content]="tooltipContent()"
        [delayDuration]="500"
        [sideOffset]="2"
        [forceOpen]="forceOpen()"
        (openChange)="onTooltipOpenChange($event)"
      >
        <ng-container [ngTemplateOutlet]="buttonTpl" />
      </ff-tooltip>
    } @else {
      <ng-container [ngTemplateOutlet]="buttonTpl" />
    }

    <ng-template #buttonTpl>
      <button
        [id]="buttonId"
        type="button"
        [disabled]="disabled()"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-labelledby]="label() ? buttonId + ' ' + labelId : null"
        [class]="buttonClass()"
        (pointerdown)="onPointerDown()"
        (click)="copy()"
      >
        @if (align() === 'left') {
          <ng-container [ngTemplateOutlet]="actionTpl" />
          <ng-container [ngTemplateOutlet]="valueTpl" />
        } @else {
          <ng-container [ngTemplateOutlet]="valueTpl" />
          <ng-container [ngTemplateOutlet]="actionTpl" />
        }
      </button>
    </ng-template>

    <!-- select-none: a press copies instead of starting a text selection. On
         hover a <mark> tints the whole value, so it reads as what gets copied. -->
    <ng-template #valueTpl>
      <span [class]="valueClass()" [style.font-variation-settings]="normalWeight">
        <mark class="bg-transparent text-foreground transition-colors duration-80 group-hover:bg-[#6B97FF]/20 group-hover:text-foreground">{{ value() }}</mark>
      </span>
    </ng-template>

    <ng-template #actionTpl>
      @if (variant() === 'button') {
        <span [class]="buttonActionClass()" [style.font-variation-settings]="normalWeight">
          @for (g of shownList(); track g.id) {
          @switch (g.status) {
            @case ('error') {
              <span #slot class="flex items-center gap-1.5 text-destructive">
                <span class="flex items-center justify-center">
                  <svg width="14" height="14" viewBox="2 4 20 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path #glyph [attr.d]="errorPath" />
                  </svg>
                </span>
                <span class="select-none inline-grid text-left">
                  <span class="col-start-1 row-start-1 invisible" aria-hidden="true">Copied</span>
                  <span class="col-start-1 row-start-1">Failed</span>
                </span>
              </span>
            }
            @case ('copied') {
              <span #slot class="flex items-center gap-1.5">
                <span class="flex items-center justify-center">
                  <svg width="14" height="14" viewBox="2 4 20 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path #glyph [attr.d]="checkPath" />
                  </svg>
                </span>
                <span class="select-none inline-grid text-left">
                  <span class="col-start-1 row-start-1 invisible" aria-hidden="true">Copied</span>
                  <span class="col-start-1 row-start-1">Copied</span>
                </span>
              </span>
            }
            @default {
              <span #slot class="flex items-center gap-1.5">
                <span class="flex items-center justify-center">
                  <ff-icon name="copy" [size]="14" [strokeWidth]="1.5" class="transition-[stroke-width] duration-80 group-hover:stroke-[2]" />
                </span>
                <span class="select-none inline-grid text-left">
                  <span class="col-start-1 row-start-1 invisible" aria-hidden="true">Copied</span>
                  <span class="col-start-1 row-start-1">Copy</span>
                </span>
              </span>
            }
          }
          }
        </span>
      } @else {
        <span [class]="iconActionClass()">
          @for (g of shownList(); track g.id) {
          @switch (g.status) {
            @case ('error') {
              <span
                #slot
                class="flex items-center justify-center text-destructive [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-80 group-hover:[&_svg]:stroke-[2]"
               
              >
                <svg width="14" height="14" viewBox="2 4 20 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                  <path #glyph [attr.d]="errorPath" />
                </svg>
              </span>
            }
            @case ('copied') {
              <span
                #slot
                class="flex items-center justify-center [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-80 group-hover:[&_svg]:stroke-[2]"
               
              >
                <svg width="14" height="14" viewBox="2 4 20 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                  <path #glyph [attr.d]="checkPath" />
                </svg>
              </span>
            }
            @default {
              <span #slot class="flex items-center justify-center">
                <ff-icon name="copy" [size]="14" [strokeWidth]="1.5" class="transition-[stroke-width] duration-80 group-hover:stroke-[2]" />
              </span>
            }
          }
          }
        </span>
      }
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputCopy {
  /** The value to display and copy to clipboard. */
  readonly value = input.required<string>();
  /** Optional label displayed above the input. */
  readonly label = input<string | undefined>(undefined);
  /** Whether the component is disabled. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Display variant: icon-only with tooltip, or button with label. */
  readonly variant = input<InputCopyVariant>('icon');
  /** Position of the copy action relative to the value. */
  readonly align = input<InputCopyAlign>('right');
  /** Pins the field to one step of the size ladder (default 36px, compact
   *  28px). Omitted, it follows the surrounding SizeProvider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });
  /** Fires after the value is copied. (React: `onCopy` — renamed so it can't
   *  collide with the native `copy` clipboard event bubbling to the host.) */
  readonly copied = output<void>();

  private readonly document = inject(DOCUMENT);
  private readonly clipboard = inject(INPUT_COPY_CLIPBOARD);
  private readonly shape = injectShape();
  private readonly sizeClasses = injectSize(() => this.size());
  private readonly animateFluid = injectAnimateFluid();

  private readonly id = `ff-input-copy-${nextId++}`;
  protected readonly labelId = `${this.id}-label`;
  protected readonly buttonId = `${this.id}-button`;
  protected readonly normalWeight = fontWeights.normal;
  protected readonly checkPath = CHECK_PATH;
  protected readonly errorPath = ERROR_PATH;

  // "copied" and "error" both occupy the same animation slot on the button.
  protected readonly status = signal<CopyStatus>('idle');
  // Keys the check and × glyphs: copying again while "Copied" still shows
  // mounts a fresh glyph, so the draw replays instead of nothing happening.
  private readonly copyCount = signal(0);
  // "idle" = normal tooltip behavior, "copied" = force open, "suppressed" = force closed.
  private readonly tooltipState = signal<'idle' | 'copied' | 'suppressed'>('idle');
  // What the action slot renders. It trails `status` by the exit of the
  // previous glyph (AnimatePresence mode="wait").
  protected readonly shown = signal<ShownGlyph>({ status: 'idle', key: 0 });
  // One-item list keyed by status + copy count: a new key re-creates the
  // glyph, so its draw replays (the React `key`).
  protected readonly shownList = computed(() => {
    const shown = this.shown();
    return [{ ...shown, id: `${shown.status}-${shown.key}` }];
  });

  private tooltipVisible = false;
  private tooltipWasVisible = false;
  private resultTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly slot = viewChild<ElementRef<HTMLElement>>('slot');
  private readonly glyph = viewChild<ElementRef<SVGPathElement>>('glyph');

  protected readonly hostClass = computed(() =>
    cn('flex flex-col gap-0.5', this.disabled() && 'opacity-50 pointer-events-none', this.userClass()),
  );
  // The row's height comes from the padded children, so the paddings step
  // down with the ladder (py-2 → 36px total, py-1 → 28px).
  private readonly rowPy = computed(() => (this.sizeClasses().variant === 'compact' ? 'py-1' : 'py-2'));
  protected readonly labelClass = computed(() =>
    cn('text-muted-foreground', this.sizeClasses().text, this.align() === 'left' ? 'pl-1' : 'pl-0'),
  );
  protected readonly buttonClass = computed(() =>
    cn(
      'group flex items-center w-full cursor-pointer outline-none transition-all duration-80',
      'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
      this.shape().input,
    ),
  );
  protected readonly valueClass = computed(() =>
    cn(
      'flex-1 min-w-0 text-left text-foreground font-mono select-none truncate',
      this.sizeClasses().text,
      this.rowPy(),
      this.align() === 'left' ? 'pl-1' : 'pl-0',
    ),
  );
  protected readonly buttonActionClass = computed(() =>
    cn(
      'shrink-0 flex items-center gap-1.5 px-1.5 transition-colors duration-80',
      this.rowPy(),
      this.sizeClasses().text,
      'text-muted-foreground group-hover:text-foreground',
    ),
  );
  protected readonly iconActionClass = computed(() =>
    cn('shrink-0 px-1.5 transition-colors duration-80', this.rowPy(), 'text-muted-foreground group-hover:text-foreground'),
  );

  // The name follows the state, so a screen reader hears the result.
  protected readonly ariaLabel = computed(() => {
    const status = this.status();
    if (status === 'copied') return 'Copied';
    if (status === 'error') return 'Copy failed';
    return this.label() ? 'Copy' : 'Copy to clipboard';
  });
  protected readonly tooltipContent = computed(() =>
    this.tooltipState() === 'idle' ? 'Copy to clipboard' : this.status() === 'error' ? 'Copy failed' : 'Copied',
  );
  protected readonly forceOpen = computed(() => {
    const state = this.tooltipState();
    return state === 'copied' ? true : state === 'suppressed' ? false : undefined;
  });

  constructor() {
    this.setupIconSwitch();
    inject(DestroyRef).onDestroy(() => clearTimeout(this.resultTimer));
  }

  // ── Copy ─────────────────────────────────────────────────────────────

  protected onPointerDown() {
    // Capture tooltip visibility before the tooltip closes on the press.
    this.tooltipWasVisible = this.tooltipVisible;
  }

  protected onTooltipOpenChange(open: boolean) {
    this.tooltipVisible = open;
  }

  /** Copies the value, as a click on the row does. */
  async copy() {
    if (this.disabled()) return;
    const value = this.value();
    let ok = true;
    try {
      await this.clipboard.writeText(value);
    } catch {
      ok = this.copyViaExecCommand(value);
    }
    this.status.set(ok ? 'copied' : 'error');
    this.copyCount.update((c) => c + 1);
    // The tooltip says "Copied" only if it was already showing when the
    // press began. Otherwise it stays shut: a click never summons a tooltip
    // the user wasn't reading.
    this.tooltipState.set(this.tooltipWasVisible ? 'copied' : 'suppressed');
    if (ok) this.copied.emit();
    // A new copy restarts the 2000ms window. When it ends, the tooltip stays
    // suppressed until the pointer leaves and comes back, so it doesn't
    // reopen as "Copy to clipboard" right under a resting cursor.
    clearTimeout(this.resultTimer);
    this.resultTimer = setTimeout(() => {
      this.status.set('idle');
      this.tooltipState.set('suppressed');
    }, RESULT_MS);
  }

  // execCommand fallback for when the async Clipboard API is unavailable or
  // denied (insecure context, permissions policy) — copies via a temporary
  // off-screen textarea.
  private copyViaExecCommand(value: string) {
    const document = this.document;
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    // 16px: iOS Safari zooms the page into a focused field set smaller, and
    // select() can focus this one.
    textarea.style.fontSize = '16px';
    document.body.appendChild(textarea);
    textarea.select();
    // iOS Safari's select() only moves the caret to the end; the explicit
    // range is what selects the text there, so the copy isn't empty.
    textarea.setSelectionRange(0, textarea.value.length);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  }

  // ── Tooltip re-arming ────────────────────────────────────────────────

  // Re-entering the row re-arms the normal 500ms hover tooltip; leaving it
  // closes a "Copied" tooltip with the pointer.
  protected onMouseEnter() {
    this.tooltipState.update((prev) => (prev === 'suppressed' ? 'idle' : prev));
  }

  protected onMouseLeave() {
    this.tooltipState.update((prev) => (prev === 'copied' ? 'suppressed' : prev));
  }

  // ── Icon switch ──────────────────────────────────────────────────────

  /**
   * A wait-mode swap on spring.fast: the current glyph shrinks out to 0.8
   * before the result grows in from 0.6 (the copy icon from 0.8), then the
   * check or × strokes draw themselves (pathLength 0 → 1 in 0.08s). Nothing
   * animates at mount (`initial={false}`).
   */
  private setupIconSwitch() {
    let exiting = false;
    let pendingEnter = false;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let animation: FluidAnimation | null = null;

    const target = (): ShownGlyph => {
      const status = this.status();
      return { status, key: status === 'idle' ? 0 : this.copyCount() };
    };
    const same = (a: ShownGlyph, b: ShownGlyph) => a.status === b.status && a.key === b.key;

    const enter = (slot: HTMLElement, status: CopyStatus) => {
      const from = status === 'idle' ? 0.8 : 0.6;
      slot.style.opacity = '0';
      slot.style.transform = `scale(${from})`;
      animation?.stop();
      animation = this.animateFluid(slot, { opacity: [0, 1], scale: [from, 1] }, enterTransition(spring.fast));
      const glyph = this.glyph()?.nativeElement;
      if (glyph) animate(glyph, { pathLength: [0, 1] }, { duration: 0.08, ease: 'easeOut' });
    };

    const finishExit = () => {
      if (!exiting) return;
      exiting = false;
      clearTimeout(exitTimer);
      const next = target();
      if (same(next, this.shown())) {
        // Requested state came back to what was leaving: it re-enters.
        const slot = this.slot()?.nativeElement;
        if (slot) enter(slot, next.status);
        return;
      }
      pendingEnter = true;
      this.shown.set(next);
    };

    const startExit = () => {
      if (exiting || same(target(), this.shown())) return;
      const slot = this.slot()?.nativeElement;
      exiting = true;
      if (!slot) return finishExit();
      animation?.stop();
      animation = this.animateFluid(slot, { opacity: 0, scale: 0.8 }, exitTransition(spring.fast));
      animation.finished.then(finishExit, finishExit);
      exitTimer = setTimeout(finishExit, exitFallbackMs(spring.fast));
    };

    // The requested state changed: the shown glyph leaves first.
    afterRenderEffect(() => {
      this.status();
      this.copyCount();
      untracked(startExit);
    });

    // A freshly swapped-in glyph enters, then chases a newer request.
    afterRenderEffect(() => {
      const shown = this.shown();
      const slot = this.slot()?.nativeElement;
      untracked(() => {
        if (!pendingEnter || !slot) return;
        pendingEnter = false;
        enter(slot, shown.status);
        startExit();
      });
    });

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(exitTimer);
      animation?.stop();
    });
  }
}
