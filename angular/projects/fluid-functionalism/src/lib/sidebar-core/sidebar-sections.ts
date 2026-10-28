import { Directive, computed, input } from '@angular/core';
import { cn, injectShape, injectSize } from '../core';

/**
 * `<main ffSidebarInset>`: the main column beside the sidebar. Next to an
 * `inset` sidebar it becomes the card (keyed on the shell's `peer` data
 * attributes, so it must be the shell's later sibling).
 */
@Directive({
  selector: '[ffSidebarInset]',
  host: { 'data-slot': 'sidebar-inset', '[class]': 'hostClass()' },
})
export class SidebarInset {
  readonly userClass = input('', { alias: 'class' });
  private readonly shape = injectShape();
  protected readonly hostClass = computed(() =>
    cn(
      'relative flex min-h-0 w-full min-w-0 flex-1 flex-col bg-background',
      'peer-data-[variant=inset]:m-2 peer-data-[variant=inset]:peer-data-[side=left]:ml-0 peer-data-[variant=inset]:peer-data-[side=right]:mr-0',
      // With the rail collapsed away, restore the sidebar-side margin so the
      // card keeps symmetric insets.
      'peer-data-[variant=inset]:peer-data-[state=collapsed]:peer-data-[side=left]:ml-2 peer-data-[variant=inset]:peer-data-[state=collapsed]:peer-data-[side=right]:mr-2',
      'transition-[margin] duration-80',
      // Container radius follows the shape system (literal classes so
      // Tailwind's scanner emits both).
      this.shape().bgRadius >= 20 ? 'peer-data-[variant=inset]:rounded-3xl' : 'peer-data-[variant=inset]:rounded-xl',
      'peer-data-[variant=inset]:bg-surface-2 peer-data-[variant=inset]:shadow-surface-2',
      this.userClass(),
    ),
  );
}

/** `<input ffSidebarInput>`: a search field on the InputGroup field ladder. */
@Directive({
  selector: 'input[ffSidebarInput]',
  host: { 'data-sidebar': 'input', '[class]': 'hostClass()' },
})
export class SidebarInput {
  readonly userClass = input('', { alias: 'class' });
  private readonly shape = injectShape();
  private readonly size = injectSize();
  protected readonly hostClass = computed(() => {
    const size = this.size();
    return cn(
      // Transparent at rest, muted fill + border ring on hover, card fill
      // when focused.
      'w-full bg-transparent px-3 text-foreground placeholder:text-muted-foreground outline-none',
      'ring-1 ring-transparent transition-[background-color,box-shadow] duration-80',
      'hover:bg-muted/50 hover:ring-border',
      'focus:bg-card focus:ring-border',
      'focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
      size.variant === 'compact' ? 'h-7' : 'h-8',
      size.field,
      this.shape().input,
      this.userClass(),
    );
  });
}

/** `<div ffSidebarHeader>` */
@Directive({
  selector: '[ffSidebarHeader]',
  host: { 'data-sidebar': 'header', '[class]': 'hostClass()' },
})
export class SidebarHeader {
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() => cn('flex shrink-0 flex-col gap-2 p-2', this.userClass()));
}

/** `<div ffSidebarFooter>`: pinned to the bottom of the column. */
@Directive({
  selector: '[ffSidebarFooter]',
  host: { 'data-sidebar': 'footer', '[class]': 'hostClass()' },
})
export class SidebarFooter {
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() => cn('mt-auto flex shrink-0 flex-col gap-2 p-2', this.userClass()));
}

/** `<div ffSidebarSeparator>` */
@Directive({
  selector: '[ffSidebarSeparator]',
  host: {
    'data-sidebar': 'separator',
    role: 'separator',
    'aria-orientation': 'horizontal',
    '[class]': 'hostClass()',
  },
})
export class SidebarSeparator {
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() => cn('mx-2 h-px shrink-0 bg-border', this.userClass()));
}

/** `<div ffSidebarGroupContent>`: the rows of a SidebarGroup. */
@Directive({
  selector: '[ffSidebarGroupContent]',
  host: { 'data-sidebar': 'group-content', '[class]': 'hostClass()' },
})
export class SidebarGroupContent {
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() => cn('w-full', this.userClass()));
}
