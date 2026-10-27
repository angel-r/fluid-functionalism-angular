// ---------------------------------------------------------------------------
// The frame every doc example sits in, ported from lib/docs/ComponentPreview.tsx:
// a Preview/Code tab bar over the live demo or its highlighted source, an
// Inspect switch, a replay control, and an optional caption.
//
// Inputs:
// - `title`: the label at the left of the tab bar.
// - `code`: the snippet the Code tab shows. Highlighted with shiki in the two
//   GitHub themes (see highlight.ts); omitted, the tab shows nothing.
// - `padding`: space around the live demo — 'default' (px-8 py-12),
//   'compact' (px-4 py-4), 'responsive' (px-4 py-4, sm:px-8 sm:py-12) or
//   'none'.
// - `minHeightClass`: any Tailwind min-height class for the preview area
//   (default `min-h-[120px]`). Use it to reserve room for floating UI.
// - `align`: vertical alignment of the demo — 'top' for content that grows
//   downward, 'center' (default) or 'bottom'.
// - `inspectable` (default true): show the Inspect switch.
// - `defaultInspect` (default false): start with the pixel rulers on.
// - `inspectRulers` (default true): draw the ruler strips; false for demos
//   that fill the frame.
// - `hideHeader` (default false): drop the tab bar entirely, for gallery rows
//   that would repeat the chrome for one code sample.
// - `caption`: a centered label under the frame.
//
// Output:
// - `replay`: fires when the visitor presses the replay control. The control
//   only exists when a page binds it.
//
// Projection:
// - `[preview-action]`: an optional header action (React's `playbackButton`),
//   for pages whose animation needs a custom control (Pause, Resume, Reset).
//   It takes the default replay button's slot, so a projected action replaces
//   it: the default control is only rendered when the page binds `(replay)`
//   and projects no action. The element is projected by the attribute; add
//   `PreviewAction` to the page's `imports` (it is the marker this component
//   queries). It is dropped with the header when `hideHeader` is set.
// - `app-preview-action-button`: the same slot with the reference's playback
//   chrome already applied (40px ghost control, shape radius, tooltip). Use it
//   for the usual single icon control:
//
//   <app-component-preview [code]="code">
//     <app-preview-action-button icon="pause" tooltip="Pause" (pressed)="pause()" />
//     ...the demo...
//   </app-component-preview>
//
//   Or project any element yourself:
//
//   <app-component-preview [code]="code" (replay)="replay()">
//     <button preview-action ffButton variant="ghost" size="icon"
//             aria-label="Replay" (click)="replay()">
//       <ff-icon name="rotate-ccw" />
//     </button>
//     ...the demo...
//   </app-component-preview>
//
// Wiring: the preview area is click-to-focus (see click-to-focus.ts), so an
// empty-space press hands this demo's keyboard control to the region.
// ---------------------------------------------------------------------------

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  computed,
  contentChild,
  effect,
  inject,
  booleanAttribute,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import {
  Icon,
  Switch,
  TabsSubtle,
  TabsSubtleItem,
  Tooltip,
  cn,
  fontWeights,
  injectShape,
  type IconDefinition,
  type IconName,
} from '@angel-r/fluid-functionalism-angular';
import { Observable, Subject } from 'rxjs';
import { InspectOverlay } from './inspect/inspect-overlay';
import { highlight } from './highlight';
import { routeKeyboardOnMouseDown } from './click-to-focus';

export type PreviewPadding = 'default' | 'compact' | 'responsive' | 'none';
export type PreviewAlign = 'top' | 'center' | 'bottom';

/**
 * Marks an element as the preview's custom header action (React's
 * `playbackButton`, as a slot): `<button preview-action …>`. The element is
 * projected into the header by the attribute; this directive is what the
 * preview queries to know an action was projected, so the default replay
 * button steps aside. Add it to the page's `imports`.
 */
@Directive({ selector: '[preview-action]' })
export class PreviewAction {}

/**
 * The reference's custom playback control (React's `playbackButton`): a 40px
 * ghost button in the shape system's radius, with the tooltip and the 16px
 * icon the doc pages use. Projects into `app-component-preview`'s header as
 * its action.
 *
 * Inputs: `icon` (an icon role name or definition), `tooltip` (its label, also
 * its aria-label; default "Replay animation"). Output: `pressed`.
 */
@Component({
  selector: 'app-preview-action-button',
  imports: [Tooltip, Icon],
  template: `
    <ff-tooltip side="top" [content]="tooltip()">
      <button type="button" [class]="buttonClass()" [attr.aria-label]="tooltip()" (click)="pressed.emit()">
        <ff-icon [name]="iconName()" [icon]="iconDefinition()" [size]="16" [strokeWidth]="1.5" />
      </button>
    </ff-tooltip>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewActionButton {
  readonly icon = input.required<IconName | IconDefinition>();
  readonly tooltip = input('Replay animation');
  readonly pressed = output<void>();

  private readonly shape = injectShape();

  protected readonly iconName = computed(() =>
    typeof this.icon() === 'string' ? (this.icon() as IconName) : undefined,
  );
  protected readonly iconDefinition = computed(() =>
    typeof this.icon() === 'string' ? undefined : (this.icon() as IconDefinition),
  );

  protected readonly buttonClass = computed(() =>
    cn(
      'w-10 h-10 flex items-center justify-center',
      this.shape().button,
      'text-muted-foreground hover:text-foreground hover:bg-hover transition-colors duration-100 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
    ),
  );
}

const PADDING: Record<PreviewPadding, string> = {
  default: 'px-8 py-12',
  compact: 'px-4 py-4',
  responsive: 'px-4 py-4 sm:px-8 sm:py-12',
  none: '',
};

const ALIGN: Record<PreviewAlign, string> = {
  top: 'items-start',
  center: 'items-center',
  bottom: 'items-end',
};

@Component({
  selector: 'app-component-preview',
  imports: [NgTemplateOutlet, TabsSubtle, TabsSubtleItem, Switch, Tooltip, Icon, InspectOverlay],
  templateUrl: './component-preview.html',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponentPreview {
  readonly title = input('');
  readonly code = input<string | undefined>(undefined);
  readonly padding = input<PreviewPadding>('default');
  readonly minHeightClass = input('min-h-[120px]');
  readonly align = input<PreviewAlign>('center');
  readonly inspectable = input(true, { transform: booleanAttribute });
  readonly defaultInspect = input(false, { transform: booleanAttribute });
  readonly inspectRulers = input(true, { transform: booleanAttribute });
  readonly hideHeader = input(false, { transform: booleanAttribute });
  readonly caption = input<string | undefined>(undefined);

  /** Pressed the replay control. Bound by the page, which owns the animation. */
  readonly replay = outputFromObservable(
    new Observable<void>((subscriber) => {
      untracked(() => this.replayListeners.update((count) => count + 1));
      const subscription = this.replays.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        untracked(() => this.replayListeners.update((count) => count - 1));
      };
    }),
  );

  protected readonly tab = signal(0);
  /** Starts from `defaultInspect`; the switch owns it from there. */
  protected readonly inspect = linkedSignal(() => this.defaultInspect());
  protected readonly semibold = fontWeights.semibold;

  private readonly shape = injectShape();
  private readonly sanitizer = inject(DomSanitizer);
  private readonly html = signal('');
  private readonly replays = new Subject<void>();
  private readonly replayListeners = signal(0);
  private highlightRun = 0;

  private readonly preview = viewChild<ElementRef<HTMLElement>>('preview');
  /** The preview region the inspector measures; null while the Code tab is on. */
  protected readonly previewElement = computed(() => this.preview()?.nativeElement ?? null);

  /** A page projected its own playback control: it takes the replay slot. */
  private readonly projectedAction = contentChild(PreviewAction);
  private readonly projectedActionButton = contentChild(PreviewActionButton);
  private readonly hasAction = computed(
    () => this.projectedAction() !== undefined || this.projectedActionButton() !== undefined,
  );

  protected readonly showReplay = computed(() => this.replayListeners() > 0 && !this.hasAction());

  protected readonly safeHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.html()));

  protected readonly frameClass = computed(() =>
    cn(
      'relative isolate flex flex-col gap-0 w-full border border-border/60 transition-[border-color] duration-150 ease-out focus-within:border-foreground/40',
      this.shape().container,
    ),
  );

  protected readonly wrapperClass = computed(() => (this.caption() ? 'flex flex-col gap-3' : ''));

  protected readonly contentRadius = computed(() =>
    this.hideHeader()
      ? 'border-radius: inherit'
      : 'border-bottom-left-radius: inherit; border-bottom-right-radius: inherit',
  );

  protected readonly previewClass = computed(() =>
    cn(
      'relative flex outline-none',
      ALIGN[this.align()],
      'justify-center',
      this.minHeightClass(),
      'bg-background',
      PADDING[this.padding()],
    ),
  );

  // React's `${minHeightClass.replace("min-h-", "[&_pre]:min-h-")}`: the code
  // tab reserves the same height as the preview for its <pre>.
  protected readonly codeClass = computed(
    () =>
      `overflow-auto text-site-body [&_pre]:m-0 [&_pre]:p-4 ${this.minHeightClass().replace('min-h-', '[&_pre]:min-h-')} [&_.shiki]:!bg-transparent`,
  );

  protected readonly replayClass = computed(() =>
    cn(
      'w-10 h-10 flex items-center justify-center',
      this.shape().button,
      'text-muted-foreground hover:text-foreground hover:bg-hover transition-colors duration-100 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
    ),
  );

  constructor() {
    // Highlight the snippet whenever it changes (a playground regenerates it on
    // every control), keeping only the newest run's result.
    effect(() => {
      const code = this.code();
      const run = ++this.highlightRun;
      if (!code) {
        this.html.set('');
        return;
      }
      void highlight(code).then((result) => {
        if (run === this.highlightRun) this.html.set(result);
      });
    });
  }

  protected toggleInspect(): void {
    this.inspect.update((value) => !value);
  }

  protected replayOnce(): void {
    this.replays.next();
  }

  /** The Inspect switch must not dismiss whatever the preview has open. */
  protected blockPointerDown(event: PointerEvent): void {
    event.stopImmediatePropagation();
  }

  /** Same, plus keep focus where it is (the Switch still toggles on click). */
  protected blockMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  protected onPreviewMouseDown(event: MouseEvent): void {
    routeKeyboardOnMouseDown(event, this.previewElement());
  }
}
