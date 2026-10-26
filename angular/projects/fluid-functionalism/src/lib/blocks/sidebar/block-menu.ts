import { Directive, Injector, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';

/**
 * The dropdown rows of a sidebar block (React's `menu` prop): MenuItem rows
 * inside an `<ng-template>`, so the block renders them inside its own
 * DropdownContent.
 *
 *   <ff-sidebar-user-footer name="Jane Doe">
 *     <img src="/jane.png" alt="" class="size-5 rounded-full" />
 *     <ng-template ffSidebarBlockMenu>
 *       <ff-menu-item [index]="0" icon="user" label="Profile" (select)="openProfile()" />
 *     </ng-template>
 *   </ff-sidebar-user-footer>
 *
 * A template rather than projected content: a MenuItem reads the popup it
 * belongs to through DI at creation, and projected rows would resolve DI
 * from where they were written, outside the block's DropdownContent.
 */
@Directive({ selector: 'ng-template[ffSidebarBlockMenu]' })
export class SidebarBlockMenu {
  readonly template = inject<TemplateRef<void>>(TemplateRef);
}

/**
 * Internal: stamps a block's menu template where it stands, with the node
 * injector of that spot, so the rows reach the enclosing DropdownContent's
 * providers (dropdown context, surface level, menu primitive).
 */
@Directive({ selector: 'ng-container[ffBlockMenuOutlet]' })
export class BlockMenuOutlet {
  readonly template = input.required<TemplateRef<void>>({ alias: 'ffBlockMenuOutlet' });

  constructor() {
    const container = inject(ViewContainerRef);
    const injector = inject(Injector);
    effect((onCleanup) => {
      const ref = container.createEmbeddedView(this.template(), undefined, { injector });
      onCleanup(() => ref.destroy());
    });
  }
}
