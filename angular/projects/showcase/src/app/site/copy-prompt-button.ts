// The "Copy prompt" button shared by the doc pages' Installation row, the
// home hero and the right panel. Ported from lib/docs/copy-prompt-button.tsx:
// the label never changes, only the leading glyph crossfades to a check for
// two seconds while a visually hidden "Copied" is announced.

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injectable,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  Button,
  type ButtonSize,
  Icon,
  cn,
  enterTransition,
  exitTransition,
  injectAnimateFluid,
  spring,
} from '@angel-r/fluid-functionalism-angular';

const SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' };
const HIDDEN = { opacity: 0, scale: 0.6, filter: 'blur(4px)' };

/** The button's copied state, read by its glyph (React's CopiedContext). */
@Injectable()
class CopiedState {
  readonly copied = signal(false);
}

/**
 * The leading glyph: copy, or a check while the prompt was just copied. An
 * icon component (the `size` / `strokeWidth` / `class` icon contract), so it
 * goes through the Button's icon slot and takes its icon-side padding, gap
 * and size step. Both glyphs share one cell the size of the icon, so the slot
 * the Button lays out never changes.
 */
@Component({
  selector: 'app-copy-prompt-icon',
  imports: [Icon],
  template: `
    <span class="grid shrink-0" [style.width.px]="size()" [style.height.px]="size()">
      <span #copyGlyph class="col-start-1 row-start-1 flex">
        <ff-icon name="copy" [size]="size()" [strokeWidth]="strokeWidth()" [class]="userClass()" />
      </span>
      <span #checkGlyph class="col-start-1 row-start-1 flex" [style]="hiddenStyle">
        <ff-icon name="check" [size]="size()" [strokeWidth]="strokeWidth()" [class]="userClass()" />
      </span>
    </span>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CopyPromptIcon {
  readonly size = input<number | string>(16);
  readonly strokeWidth = input<number | string | undefined>(1.5);
  readonly userClass = input('', { alias: 'class' });

  protected readonly hiddenStyle = {
    opacity: HIDDEN.opacity,
    transform: `scale(${HIDDEN.scale})`,
    filter: HIDDEN.filter,
  };

  private readonly copied = inject(CopiedState).copied;
  private readonly animate = injectAnimateFluid();
  private readonly copyGlyph = viewChild<ElementRef<HTMLElement>>('copyGlyph');
  private readonly checkGlyph = viewChild<ElementRef<HTMLElement>>('checkGlyph');

  constructor() {
    // The glyph arriving outlasts the one leaving (0.08s against 0.06s), so
    // the crossfade never reads as a gap.
    afterRenderEffect(() => {
      const copied = this.copied();
      const copy = this.copyGlyph()?.nativeElement;
      const check = this.checkGlyph()?.nativeElement;
      if (!copy || !check) return;
      this.animate(copy, copied ? HIDDEN : SHOWN, copied ? exitTransition(spring.fast) : enterTransition(spring.fast));
      this.animate(check, copied ? SHOWN : HIDDEN, copied ? enterTransition(spring.fast) : exitTransition(spring.fast));
    });
  }
}

@Component({
  selector: 'app-copy-prompt-button',
  imports: [Button],
  providers: [CopiedState],
  template: `
    <button ffButton [variant]="variant()" [size]="size()" [leadingIcon]="icon" [class]="buttonClass()" (click)="copy()">
      {{ label() }}
      <span class="sr-only" aria-live="polite">{{ copied() ? 'Copied' : '' }}</span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyPromptButton {
  /** The prompt text written to the clipboard. */
  readonly prompt = input.required<string>();
  readonly label = input('Copy prompt');
  readonly variant = input<'primary' | 'secondary' | 'tertiary' | 'ghost'>('primary');
  /** Omitted, it follows the surrounding SizeProvider. */
  readonly size = input<ButtonSize | undefined>(undefined);
  readonly userClass = input<string>('', { alias: 'class' });
  /** Emitted after a successful copy (the toast, or analytics). */
  readonly copiedPrompt = output<void>();

  protected readonly icon = CopyPromptIcon;
  protected readonly copied = inject(CopiedState).copied;
  protected readonly buttonClass = computed(() => cn('w-fit shrink-0', this.userClass()));

  private timeout: ReturnType<typeof setTimeout> | undefined;

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.prompt());
    } catch {
      // An insecure context or a refused write: announce nothing.
      return;
    }
    this.copied.set(true);
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.copied.set(false), 2000);
    this.copiedPrompt.emit();
  }
}
