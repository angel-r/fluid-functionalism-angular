import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';

let nextId = 0;

/**
 * The dialog root: owns the open state and wires its parts together. It
 * renders no box of its own (`display: contents`).
 *
 *   <ff-dialog>
 *     <button ffButton ffDialogTrigger variant="tertiary">Open dialog</button>
 *     <ff-dialog-content>
 *       <div ffDialogHeader>
 *         <h2 ffDialogTitle>Create teamspace</h2>
 *         <p ffDialogDescription>Add a new teamspace.</p>
 *       </div>
 *       <div ffDialogFooter>
 *         <button ffButton ffDialogClose variant="ghost">Cancel</button>
 *         <button ffButton>Create</button>
 *       </div>
 *     </ff-dialog-content>
 *   </ff-dialog>
 *
 * Uncontrolled by default (`defaultOpen`); bind `[(open)]` to control it.
 */
@Component({
  selector: 'ff-dialog',
  host: { style: 'display: contents' },
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dialog {
  /** Controlled open state. Left undefined, the dialog keeps its own. */
  readonly open = input<boolean | undefined>(undefined);
  /** Initial open state of an uncontrolled dialog. */
  readonly defaultOpen = input(false, { transform: booleanAttribute });
  /** Traps focus and locks page scroll while open. */
  readonly modal = input(true, { transform: booleanAttribute });
  /** Called when the dialog opens or closes. (React: `onOpenChange`.) */
  readonly openChange = output<boolean>();

  private readonly uncontrolled = linkedSignal(() => this.defaultOpen());
  /** The effective open state. */
  readonly isOpen = computed(() => this.open() ?? this.uncontrolled());

  /** Ids the popup's ARIA attributes point at. */
  readonly popupId = `ff-dialog-popup-${++nextId}`;
  readonly titleId = signal<string | null>(null);
  readonly descriptionId = signal<string | null>(null);

  /** The trigger that last opened the dialog: focus goes back there on close. */
  triggerElement: HTMLElement | null = null;

  setOpen(next: boolean) {
    if (next === this.isOpen()) return;
    this.uncontrolled.set(next);
    this.openChange.emit(next);
  }
}

/**
 * Opens the dialog. Goes on the control itself (React's `render` / `asChild`):
 * `<button ffButton ffDialogTrigger>Open</button>`.
 */
@Directive({
  selector: '[ffDialogTrigger]',
  host: {
    'aria-haspopup': 'dialog',
    '[attr.aria-expanded]': 'dialog.isOpen()',
    '[attr.aria-controls]': 'dialog.isOpen() ? dialog.popupId : null',
    '[attr.data-popup-open]': 'dialog.isOpen() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class DialogTrigger {
  protected readonly dialog = inject(Dialog);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected onClick() {
    this.dialog.triggerElement = this.host;
    this.dialog.setOpen(true);
  }
}

/**
 * Closes the dialog. Goes on the control itself:
 * `<button ffButton ffDialogClose variant="ghost">Cancel</button>`.
 */
@Directive({
  selector: '[ffDialogClose]',
  host: { '(click)': 'dialog.setOpen(false)' },
})
export class DialogClose {
  protected readonly dialog = inject(Dialog);
}
