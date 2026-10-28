import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  untracked,
} from '@angular/core';
import { cn } from '../core';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../dialog';
import { COMMAND_MENU_DIALOG, type CommandMenuDialogContext } from './command-menu';
import { comboKey, hasModifier, isEditable, matchesShortcut, parseShortcut } from './shortcut';

// Every mounted dialog listens for its own combo; one of them answers a
// press. An open dialog answers first (the press closes it). Otherwise the
// most recently mounted one with that combo whose scope holds the focus
// does: a dialog without a scope is in scope everywhere, so an app-wide
// palette keeps its key, and a scoped one (a docs demo, a pane) takes it
// only while focus is inside its element. Peers are matched on the parsed
// combo, so "mod+k", "cmd+k" and "Mod+K" are one key.
const mountedDialogs: {
  combo: string;
  isOpen: () => boolean;
  inScope: () => boolean;
}[] = [];

/** An element, or an `ElementRef` to one (a template ref or `viewChild`). */
export type CommandMenuShortcutScope = HTMLElement | ElementRef<HTMLElement> | null | undefined;

/**
 * The modal shell, toggled by a global shortcut. Holds an ff-command-menu;
 * picking a row closes it (`closeOnSelect` on the menu), and so does Escape.
 *
 *   <ff-command-menu-dialog [(open)]="open" shortcut="mod+k">
 *     <ff-command-menu [items]="items">…</ff-command-menu>
 *   </ff-command-menu-dialog>
 */
@Component({
  selector: 'ff-command-menu-dialog',
  imports: [Dialog, DialogContent, DialogTitle, DialogDescription],
  providers: [{ provide: COMMAND_MENU_DIALOG, useFactory: () => inject(CommandMenuDialog).context }],
  host: { style: 'display: contents' },
  template: `
    <ff-dialog [open]="isOpen()" [modal]="modal()" (openChange)="setOpen($event)">
      <!-- Opens centered at its cap and keeps that top edge: the top is where
           a panel at the cap height, min(440px, 76dvh), sits centered, so the
           field stays put while the rows under it filter down. Below 580px of
           height the cap is 76dvh and the top lands on 12dvh. -->
      <ff-dialog-content size="lg" position="top" [showCloseButton]="false" [container]="container()" [class]="panelClass()">
        <h2 ffDialogTitle class="sr-only">{{ title() }}</h2>
        <p ffDialogDescription class="sr-only">{{ description() }}</p>
        <ng-content />
      </ff-dialog-content>
    </ff-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandMenuDialog {
  /** Controlled open state. Left undefined, the dialog keeps its own. */
  readonly open = input<boolean | undefined>(undefined);
  readonly defaultOpen = input(false, { transform: booleanAttribute });
  /** The combo that toggles the dialog from anywhere on the page, in the
   *  shortcut syntax. `null` binds nothing. */
  readonly shortcut = input<string | null>('mod+k');
  /** Focus must be inside this element for the combo to open the dialog:
   *  for a demo or a pane that must not take an app-wide combo from the
   *  palette mounted at the root. Closing on the combo works from anywhere. */
  readonly shortcutScope = input<CommandMenuShortcutScope>(undefined);
  /** Read to screen readers as the dialog's name. */
  readonly title = input('Command menu');
  readonly description = input('Search for a command to run.');
  /** Traps focus and locks page scroll while open. */
  readonly modal = input(true, { transform: booleanAttribute });
  /** Portal target, for scoping the dialog to a region (see ff-dialog-content). */
  readonly container = input<HTMLElement | null | undefined>(undefined);
  /** Merged onto the dialog panel. */
  readonly userClass = input('', { alias: 'class' });
  /** The dialog opened or closed, including from the shortcut. (React:
   *  `onOpenChange`.) */
  readonly openChange = output<boolean>();

  private readonly internalOpen = linkedSignal(() => this.defaultOpen());
  /** The effective open state. */
  readonly isOpen = computed(() => this.open() ?? this.internalOpen());

  /** @internal What the menu inside reads. */
  readonly context: CommandMenuDialogContext = {
    open: this.isOpen,
    close: () => this.setOpen(false),
  };

  protected readonly panelClass = computed(() =>
    cn(
      'top-[max(12dvh,calc(50dvh-220px))] flex max-h-[min(440px,76dvh)] flex-col overflow-hidden p-0',
      this.userClass(),
    ),
  );

  private readonly document = inject(DOCUMENT);

  constructor() {
    // Registered once per combo: toggling must not move this dialog to the
    // end of the peer list, which would change who answers a shared combo.
    effect((onCleanup) => {
      const shortcut = this.shortcut();
      const view = this.document.defaultView;
      if (!shortcut || !view) return;
      const parsed = parseShortcut(shortcut);
      if (parsed.key === '') return;
      const combo = comboKey(parsed);
      const entry = {
        combo,
        isOpen: () => untracked(this.isOpen),
        inScope: () => {
          const scope = resolveScope(untracked(this.shortcutScope));
          return !scope || scope.contains(this.document.activeElement);
        },
      };
      mountedDialogs.push(entry);
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.repeat || e.defaultPrevented) return;
        if (!matchesShortcut(e, parsed)) return;
        // A bare key stays out of fields; a modifier combo fires anywhere.
        if (!hasModifier(parsed) && isEditable(e.target)) return;
        const peers = mountedDialogs.filter((d) => d.combo === combo);
        const answers = peers.find((d) => d.isOpen()) ?? peers.slice().reverse().find((d) => d.inScope());
        if (answers !== entry) return;
        e.preventDefault();
        this.setOpen(!untracked(this.isOpen));
      };
      view.addEventListener('keydown', onKeyDown);
      onCleanup(() => {
        view.removeEventListener('keydown', onKeyDown);
        const i = mountedDialogs.indexOf(entry);
        if (i !== -1) mountedDialogs.splice(i, 1);
      });
    });
  }

  /** Opens or closes: uncontrolled dialogs keep it, `openChange` reports it. */
  setOpen(next: boolean) {
    if (this.open() === undefined) this.internalOpen.set(next);
    this.openChange.emit(next);
  }
}

function resolveScope(scope: CommandMenuShortcutScope): HTMLElement | null {
  if (!scope) return null;
  return scope instanceof ElementRef ? scope.nativeElement : scope;
}
