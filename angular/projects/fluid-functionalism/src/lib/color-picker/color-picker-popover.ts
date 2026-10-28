import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  Injector,
  type TemplateRef,
  ViewContainerRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  cn,
  spring,
  fontWeights,
  injectShape,
  SizeContext,
  sizeMap,
  type SizeVariant,
  SurfaceProvider,
  injectSurface,
  surfaceClasses,
  Icon,
  injectAnimateFluid,
} from '../core';
import { parseColor, rgbToHexStr, type ColorFormat } from './color-math';
import { ColorPicker, type ColorChange } from './color-picker';
import { ColorTile } from './color-swatch';
import { COLOR_PICKER_POPUP_SCOPE, ColorPickerPortalContainer, PopupScope, createPinnedSize } from './shared';
import { PopupOverlay } from './popup-overlay';

let nextId = 0;

// ---------------------------------------------------------------------------
// ColorPickerPopover — a tile + hex trigger opening the panel in a popover.
//
// React builds it on Base UI's Popover; here it is a CDK overlay anchored
// below the trigger's start edge (flipping above on collision). Dismissal:
// a press outside, focus leaving the panel, Escape while focus is inside.
// Focus moves into the panel on open and back to the trigger on close. The
// panel unfolds from the trigger's corner on spring.moderate and keeps
// mounted through its exit tween.
//
//   <ff-color-picker-popover triggerLabel="Fill" [(value)]="fill" />
// ---------------------------------------------------------------------------

@Component({
  selector: 'ff-color-picker-popover',
  imports: [ColorPicker, ColorTile, Icon, SurfaceProvider, ColorPickerPortalContainer],
  providers: [
    { provide: SizeContext, useFactory: () => inject(ColorPickerPopover).sizeContext },
    { provide: COLOR_PICKER_POPUP_SCOPE, useFactory: () => new PopupScope() },
  ],
  host: { class: 'inline-flex' },
  template: `
    <button
      #trigger
      type="button"
      aria-haspopup="dialog"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="open() ? panelId : null"
      [attr.data-popup-open]="open() ? '' : null"
      [class]="triggerClasses()"
      [style.font-variation-settings]="normalWeight"
      (click)="toggle()"
    >
      @if (triggerLabel() && triggerLabelPosition() === 'left') {
        <span [class]="labelClass()">{{ triggerLabel() }}</span>
      }
      <ff-color-tile [color]="swatchColor()" [size]="compact() ? 16 : 20" />
      @if (triggerShowValue()) {
        <span [class]="valueClass()">{{ valueLabel() }}</span>
      }
      @if (triggerLabel() && triggerLabelPosition() === 'right') {
        <span [class]="labelClass()">{{ triggerLabel() }}</span>
      }
      <!-- A span with role="button", since a real button can't nest in the
           trigger button. stopPropagation keeps a remove press from also
           toggling the popover. -->
      @if (triggerShowRemove()) {
        <span
          role="button"
          aria-label="Remove color"
          tabindex="0"
          class="ml-1 text-muted-foreground hover:text-foreground cursor-pointer flex items-center"
          (click)="onRemoveClick($event)"
          (keydown)="onRemoveKeyDown($event)"
        >
          <ff-icon name="x" [size]="14" [strokeWidth]="1.5" />
        </span>
      }
    </button>

    <ng-template #popup>
      <!-- Top-left origin matches the start alignment: the panel unfolds from
           the trigger's corner. -->
      <div data-slot="color-picker-popover-motion" style="transform-origin: top left">
        <!-- The format menu portals into this panel, so it lives inside the
             popover's DOM and scales with it. -->
        <div
          #panel
          [id]="panelId"
          role="dialog"
          tabindex="-1"
          class="outline-none"
          [ffColorPickerPortalContainer]="panel"
          (keydown)="onPanelKeyDown($event)"
          (focusout)="onPanelFocusOut($event)"
        >
          <div [ffSurface]="level()" style="display: contents">
            <ff-color-picker
              [value]="currentValue()"
              (valueChange)="onValueChange($event)"
              (colorChange)="colorChange.emit($event)"
              [format]="format()"
              (formatChange)="format.set($event)"
              [defaultFormat]="defaultFormat()"
              [swatches]="swatches()"
              [hideEyedropper]="hideEyedropper()"
              [formatOpen]="formatOpen()"
              [defaultFormatOpen]="defaultFormatOpen()"
              [class]="panelClass()"
            />
          </div>
        </div>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPickerPopover {
  // ── Panel inputs (forwarded) ────────────────────────────────────────
  /** The color. Two-way: `[(value)]`. The popover owns it (the trigger shows
   *  it too) and keeps the panel in sync. */
  readonly value = model<string | undefined>(undefined);
  readonly defaultValue = input('#6B97FF');
  readonly format = model<ColorFormat | undefined>(undefined);
  readonly defaultFormat = input<ColorFormat>('hex');
  readonly swatches = input<readonly string[] | undefined>(undefined);
  readonly hideEyedropper = input(false, { transform: booleanAttribute });
  readonly formatOpen = input<boolean | undefined>(undefined);
  readonly defaultFormatOpen = input(false, { transform: booleanAttribute });
  /** Pins trigger and popover to one step of the size ladder. */
  readonly size = input<SizeVariant | undefined>(undefined);
  /** Classes for the panel (React `className`, forwarded to ColorPicker). */
  readonly userClass = input('', { alias: 'class' });
  readonly colorChange = output<ColorChange>();

  // ── Trigger ─────────────────────────────────────────────────────────
  /** Optional label rendered alongside the color tile. */
  readonly triggerLabel = input<string | undefined>(undefined);
  readonly triggerLabelPosition = input<'left' | 'right'>('left');
  /** Shows the color as 6-digit hex next to the tile (alpha left out; the
   *  tile shows it). Default true. */
  readonly triggerShowValue = input(true, { transform: booleanAttribute });
  /** Adds an X inside the trigger that emits `triggerRemove` without opening
   *  the popover. */
  readonly triggerShowRemove = input(false, { transform: booleanAttribute });
  /** Custom classes on the trigger button (React `triggerClassName`). */
  readonly triggerClass = input<string | undefined>(undefined);
  readonly triggerRemove = output<void>();

  // ── Open state ──────────────────────────────────────────────────────
  /** Controls the open state; when set, the popover ignores trigger clicks. */
  readonly openInput = input<boolean | undefined>(undefined, { alias: 'open' });
  /** Initial open state (uncontrolled). */
  readonly defaultOpen = input(false, { transform: booleanAttribute });
  /** Fires when the open state would change (even when controlled). */
  readonly openChange = output<boolean>();

  readonly sizeContext = createPinnedSize(() => this.size());
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly shape = injectShape();
  private readonly substrate = injectSurface();
  private readonly animate = injectAnimateFluid();
  private readonly popupScope = inject(COLOR_PICKER_POPUP_SCOPE, { self: true });
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly popupTemplate = viewChild.required<TemplateRef<unknown>>('popup');

  protected readonly panelId = `ff-color-picker-popover-${nextId++}`;
  protected readonly normalWeight = fontWeights.normal;

  private readonly internalOpen = signal<boolean | null>(null);
  readonly open = computed(() => this.openInput() ?? this.internalOpen() ?? this.defaultOpen());

  private readonly sizeClasses = computed(() => sizeMap[this.sizeContext.size()]);
  protected readonly compact = computed(() => this.sizeClasses().variant === 'compact');
  /** The floating panel sits two surface levels above where it opens (capped
   *  at 8, the top of the ladder), with a level-3 shadow. */
  protected readonly level = computed(() => Math.min(this.substrate() + 2, 8));
  protected readonly panelClass = computed(() => cn(surfaceClasses(this.level(), 3), this.userClass()));

  protected readonly currentValue = computed(() => this.value() ?? this.defaultValue());
  private readonly parsedValue = computed(() => parseColor(this.currentValue()));
  /** The tile keeps alpha (over the checker). */
  protected readonly swatchColor = computed(() => {
    const p = this.parsedValue();
    return p ? rgbToHexStr(p.r, p.g, p.b, p.a) : this.currentValue();
  });
  /** The label drops alpha: 6-digit uppercase hex whatever the format. */
  protected readonly valueLabel = computed(() => {
    const p = this.parsedValue();
    return p ? rgbToHexStr(p.r, p.g, p.b, 1).replace(/^#/, '').toUpperCase() : this.currentValue();
  });

  protected readonly triggerClasses = computed(() =>
    cn(
      'flex items-center border border-border bg-transparent hover:bg-hover transition-colors duration-80 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] cursor-pointer',
      this.sizeClasses().gap,
      this.sizeClasses().control,
      this.compact() ? 'px-1.5' : 'px-2',
      this.shape().input,
      this.triggerClass(),
    ),
  );
  protected readonly labelClass = computed(() =>
    cn('text-muted-foreground px-1 select-none', this.sizeClasses().text),
  );
  protected readonly valueClass = computed(() => cn('text-foreground tabular-nums', this.sizeClasses().text));

  private readonly overlay = new PopupOverlay({
    injector: this.injector,
    viewContainerRef: this.viewContainerRef,
    template: () => this.popupTemplate(),
    origin: () => this.trigger().nativeElement,
    portalContainer: () => null,
    paneClass: 'z-50 outline-none',
    sideOffset: 6,
    tier: spring.moderate,
    animate: this.animate,
  });

  constructor() {
    // The trigger is a view query, so opening waits for the first render.
    let firstRun = true;
    afterRenderEffect(() => {
      const open = this.open();
      untracked(() => {
        const initial = firstRun;
        firstRun = false;
        if (open) this.show(!initial);
        else if (!initial) this.hide();
      });
    });

    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
      this.overlay.dispose();
    });
  }

  private requestOpen(next: boolean) {
    if (next === this.open()) return;
    if (this.openInput() === undefined) this.internalOpen.set(next);
    this.openChange.emit(next);
  }

  protected toggle() {
    this.requestOpen(!this.open());
  }

  private panelElement(): HTMLElement | null {
    return this.overlay.root?.querySelector<HTMLElement>('[role="dialog"]') ?? null;
  }

  private show(moveFocus: boolean) {
    this.overlay.show();
    this.document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
    if (moveFocus) this.panelElement()?.focus({ preventScroll: true });
  }

  private hide() {
    this.document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    const panel = this.panelElement();
    const active = this.document.activeElement;
    const hadFocus = !!panel && !!active && (panel.contains(active) || this.popupScope.contains(active));
    this.overlay.hide();
    if (hadFocus) this.trigger().nativeElement.focus({ preventScroll: true });
  }

  // Non-modal: a press outside the trigger and the panel closes it.
  private readonly onDocumentPointerDown = (e: PointerEvent) => {
    const target = e.target as Node | null;
    if (!target) return;
    if (this.trigger().nativeElement.contains(target)) return;
    if (this.isInside(target)) return;
    this.requestOpen(false);
  };

  /** Inside the panel, or inside a popup it owns (the format menu). */
  private isInside(node: Node) {
    return !!this.overlay.pane?.contains(node) || this.popupScope.contains(node);
  }

  protected onPanelKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    this.requestOpen(false);
    this.trigger().nativeElement.focus({ preventScroll: true });
  }

  protected onPanelFocusOut(e: FocusEvent) {
    const next = e.relatedTarget as Node | null;
    if (!next) return;
    if (this.isInside(next) || this.trigger().nativeElement.contains(next)) return;
    this.requestOpen(false);
  }

  protected onValueChange(next: string | undefined) {
    if (next !== undefined) this.value.set(next);
  }

  protected onRemoveClick(e: MouseEvent) {
    e.stopPropagation();
    this.triggerRemove.emit();
  }

  protected onRemoveKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.stopPropagation();
    e.preventDefault();
    this.triggerRemove.emit();
  }
}
