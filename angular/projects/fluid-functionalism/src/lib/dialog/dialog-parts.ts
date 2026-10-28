import { DestroyRef, Directive, computed, effect, inject, input } from '@angular/core';
import { cn, fontWeights, injectSizeVariant, typeClass } from '../core';
import { Dialog } from './dialog';

let nextId = 0;

/** `<div ffDialogHeader>`: stacks the title and description. */
@Directive({
  selector: '[ffDialogHeader]',
  host: { '[class]': 'hostClass()' },
})
export class DialogHeader {
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() => cn('flex flex-col gap-1.5 mb-4', this.userClass()));
}

/** `<div ffDialogFooter>`: the action row, right-aligned. */
@Directive({
  selector: '[ffDialogFooter]',
  host: { '[class]': 'hostClass()' },
})
export class DialogFooter {
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() => cn('flex justify-end gap-2 mt-6', this.userClass()));
}

/**
 * `<h2 ffDialogTitle>`: names the dialog (the popup's `aria-labelledby`).
 * The title role of the type scale, semibold.
 */
@Directive({
  selector: '[ffDialogTitle]',
  host: {
    '[id]': 'id()',
    '[class]': 'hostClass()',
    '[style.font-variation-settings]': 'weight',
  },
})
export class DialogTitle {
  readonly userClass = input('', { alias: 'class' });
  readonly id = input(`ff-dialog-title-${++nextId}`);
  private readonly variant = injectSizeVariant();
  protected readonly weight = fontWeights.semibold;
  protected readonly hostClass = computed(() =>
    cn(typeClass('title', this.variant() === 'compact' ? 'compact' : 'default'), 'text-foreground', this.userClass()),
  );

  constructor() {
    registerId(this.id, (dialog) => dialog.titleId);
  }
}

/** `<p ffDialogDescription>`: the popup's `aria-describedby`, on the body role. */
@Directive({
  selector: '[ffDialogDescription]',
  host: { '[id]': 'id()', '[class]': 'hostClass()' },
})
export class DialogDescription {
  readonly userClass = input('', { alias: 'class' });
  readonly id = input(`ff-dialog-description-${++nextId}`);
  private readonly variant = injectSizeVariant();
  protected readonly hostClass = computed(() =>
    cn(typeClass('body', this.variant() === 'compact' ? 'compact' : 'default'), 'text-muted-foreground', this.userClass()),
  );

  constructor() {
    registerId(this.id, (dialog) => dialog.descriptionId);
  }
}

/** Publishes a part's id on the enclosing dialog while the part exists. */
function registerId(id: () => string, slot: (dialog: Dialog) => Dialog['titleId']) {
  const dialog = inject(Dialog, { optional: true });
  if (!dialog) return;
  const target = slot(dialog);
  effect(() => target.set(id()));
  inject(DestroyRef).onDestroy(() => {
    if (target() === id()) target.set(null);
  });
}
