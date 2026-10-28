import { ChangeDetectionStrategy, Component, DOCUMENT, computed, inject, output } from '@angular/core';
import { cn, Icon, injectShape, injectSize } from '@angel-r/fluid-functionalism-angular/core';

// Typed here because TypeScript's DOM lib doesn't ship EyeDropper.
interface EyeDropperInstance {
  open(): Promise<{ sRGBHex: string }>;
}
type EyeDropperCtor = new () => EyeDropperInstance;

/**
 * The native `window.EyeDropper` (Chromium-only), or null. Read at render
 * time on the client, so the button never appears where the API is missing.
 */
export function eyeDropperCtor(view: Window | null): EyeDropperCtor | null {
  if (!view || !('EyeDropper' in view)) return null;
  return (view as unknown as { EyeDropper: EyeDropperCtor }).EyeDropper;
}

/** Picks a color from the screen. Renders nothing where the API is missing. */
@Component({
  selector: 'ff-color-eye-dropper',
  imports: [Icon],
  host: { style: 'display: contents' },
  template: `
    @if (supported) {
      <button type="button" aria-label="Pick color from screen" [class]="buttonClass()" (click)="pickColor()">
        <ff-icon name="pipette" [size]="sizeClasses().icon" [strokeWidth]="1.5" />
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EyeDropperButton {
  readonly pick = output<string>();

  private readonly view = inject(DOCUMENT).defaultView;
  private readonly shape = injectShape();
  protected readonly sizeClasses = injectSize();
  protected readonly supported = eyeDropperCtor(this.view) !== null;

  protected readonly buttonClass = computed(() =>
    cn(
      'flex items-center justify-center text-muted-foreground bg-transparent hover:bg-hover hover:text-foreground active:bg-active transition-colors duration-80 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] cursor-pointer',
      this.sizeClasses().control,
      this.sizeClasses().px,
      this.shape().input,
    ),
  );

  // open() rejects when the user presses Escape. Any rejection is swallowed:
  // cancelling a pick is not an error, and the color stays as it was.
  protected async pickColor() {
    const Ctor = eyeDropperCtor(this.view);
    if (!Ctor) return;
    try {
      const result = await new Ctor().open();
      this.pick.emit(result.sRGBHex);
    } catch {
      // user cancelled
    }
  }
}
