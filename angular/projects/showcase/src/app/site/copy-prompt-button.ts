// The "Copy prompt" button shared by the doc pages' Installation row, the
// home hero and the right panel. Ported from lib/docs/copy-prompt-button.tsx:
// the label never changes, only the leading glyph crossfades to a check for
// two seconds while a visually hidden "Copied" is announced.

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Button, Icon, enterTransition, exitTransition, injectAnimateFluid, spring } from '@angel-r/fluid-functionalism-angular';

/** One cell the size of the glyph, so the button's layout never moves. */
const GLYPH = 16;

const SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' };
const HIDDEN = { opacity: 0, scale: 0.6, filter: 'blur(4px)' };

@Component({
  selector: 'app-copy-prompt-button',
  imports: [Button, Icon],
  template: `
    <button ffButton [variant]="variant()" [class]="userClass()" (click)="copy()">
      <span class="inline-flex items-center gap-2">
        <span class="grid shrink-0" [style.width.px]="glyph" [style.height.px]="glyph">
          <span #copyGlyph class="col-start-1 row-start-1 flex">
            <ff-icon name="copy" [size]="glyph" [strokeWidth]="1.5" />
          </span>
          <span #checkGlyph class="col-start-1 row-start-1 flex" [style]="hiddenStyle">
            <ff-icon name="check" [size]="glyph" [strokeWidth]="1.5" />
          </span>
        </span>
        <span>{{ label() }}</span>
      </span>
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
  readonly userClass = input<string>('', { alias: 'class' });
  /** Emitted after a successful copy (the toast, or analytics). */
  readonly copiedPrompt = output<void>();

  protected readonly glyph = GLYPH;
  protected readonly copied = signal(false);
  protected readonly hiddenStyle = {
    opacity: HIDDEN.opacity,
    transform: `scale(${HIDDEN.scale})`,
    filter: HIDDEN.filter,
  };

  private readonly animate = injectAnimateFluid();
  private readonly copyGlyph = viewChild<ElementRef<HTMLElement>>('copyGlyph');
  private readonly checkGlyph = viewChild<ElementRef<HTMLElement>>('checkGlyph');
  private timeout: ReturnType<typeof setTimeout> | undefined;

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
