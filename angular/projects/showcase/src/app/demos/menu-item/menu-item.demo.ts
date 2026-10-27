import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  DROPDOWN_CONTEXT,
  Elevated,
  FluidHoverHighlight,
  MenuItem,
  createFluidHover,
  isDisabledRow,
  type DropdownContextValue,
  type IconName,
} from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

const ROWS = '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]';

/**
 * A static panel for the demo: the fluid hover list and the dropdown context
 * menu items read (hover, checked rows), plus arrow-key roving between rows.
 * The real inline panel and popup ship with the dropdown.
 */
@Directive({
  selector: '[demoMenuPanel]',
  exportAs: 'demoMenuPanel',
  providers: [{ provide: DROPDOWN_CONTEXT, useFactory: () => inject(DemoMenuPanel).context }],
  host: {
    '[attr.role]': 'role()',
    '(mouseenter)': 'hover.onMouseEnter()',
    '(mousemove)': 'hover.onMouseMove($event)',
    '(mouseleave)': 'hover.onMouseLeave()',
    '(click)': 'hover.onClick($event)',
    '(focusin)': 'onFocus($event)',
    '(focusout)': 'onBlur($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class DemoMenuPanel {
  /** "group" like the inline dropdown panel; "menu" where a search field
   *  needs the menu around it. */
  readonly role = input<'group' | 'menu'>('group');
  readonly checkedIndex = input<number | undefined>(undefined);
  readonly checkedIndices = input<number[] | undefined>(undefined);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly hover = createFluidHover(() => this.host, { isItemDisabled: isDisabledRow });
  readonly context: DropdownContextValue = {
    registerItem: this.hover.registerItem,
    unregisterItem: this.hover.unregisterItem,
    activeIndex: this.hover.activeIndex,
    checkedIndex: this.checkedIndex,
    checkedIndices: this.checkedIndices,
    multiple: computed(() => this.checkedIndices() !== undefined),
  };

  protected onFocus(e: FocusEvent) {
    const index = (e.target as HTMLElement).closest('[data-fluid-hover-index]')?.getAttribute('data-fluid-hover-index');
    if (index != null) this.hover.setActiveIndex(Number(index));
  }

  protected onBlur(e: FocusEvent) {
    if (!this.host.contains(e.relatedTarget as Node)) this.hover.setActiveIndex(null);
  }

  protected onKeydown(e: KeyboardEvent) {
    const rows = Array.from(this.host.querySelectorAll<HTMLElement>(ROWS));
    const current = rows.indexOf(e.target as HTMLElement);
    if (current === -1) return;
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    rows[(current + step + rows.length) % rows.length].focus();
  }
}

@Component({
  selector: 'app-menu-item-demo',
  imports: [DemoPage, DemoSection, DemoMenuPanel, Elevated, FluidHoverHighlight, MenuItem],
  template: `
    <app-demo-page
      title="Menu item"
      description="The row every dropdown renders: an optional icon, a label that keeps its width when it turns semibold, and a check that draws in. Shown here in a static fluid hover panel; the dropdown wraps the same rows in its popup."
    >
      <app-demo-section title="Single selection">
        <div
          demoMenuPanel
          #single="demoMenuPanel"
          [checkedIndex]="selected()"
          [ffElevated]="2"
          [shadowLevel]="3"
          aria-label="Sort by"
          class="relative flex w-72 max-w-full flex-col rounded-xl p-1 select-none"
        >
          <ff-fluid-hover-highlight [hover]="single.hover" class="rounded-lg" />
          @for (option of sortOptions; track option; let i = $index) {
            <ff-menu-item [index]="i" [label]="option" [checked]="selected() === i" (select)="selected.set(i)" />
          }
        </div>
      </app-demo-section>

      <app-demo-section title="Actions with icons">
        <div
          demoMenuPanel
          #actions="demoMenuPanel"
          [ffElevated]="2"
          [shadowLevel]="3"
          aria-label="Settings"
          class="relative flex w-72 max-w-full flex-col rounded-xl p-1 select-none"
        >
          <ff-fluid-hover-highlight [hover]="actions.hover" class="rounded-lg" />
          @for (action of actionRows; track action.label; let i = $index) {
            <ff-menu-item
              [index]="i"
              [icon]="action.icon"
              [label]="action.label"
              [disabled]="action.disabled ?? false"
              (select)="last.set(action.label)"
            />
          }
        </div>
        <p class="w-full text-center text-site-caption text-muted-foreground">Last action: {{ last() }}</p>
      </app-demo-section>

      <app-demo-section title="Multiple selection">
        <div
          demoMenuPanel
          #multi="demoMenuPanel"
          [checkedIndices]="labels()"
          [ffElevated]="2"
          [shadowLevel]="3"
          aria-label="Labels"
          class="relative flex w-72 max-w-full flex-col rounded-xl p-1 select-none"
        >
          <ff-fluid-hover-highlight [hover]="multi.hover" class="rounded-lg" />
          @for (label of labelOptions; track label; let i = $index) {
            <ff-menu-item [index]="i" [label]="label" [checked]="labels().includes(i)" (select)="toggle(i)" />
          }
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class MenuItemDemo {
  protected readonly sortOptions = ['Name', 'Date modified', 'Size', 'Kind'];
  protected readonly selected = signal(0);

  protected readonly actionRows: { label: string; icon: IconName; disabled?: boolean }[] = [
    { label: 'Email', icon: 'mail' },
    { label: 'Notifications', icon: 'bell' },
    { label: 'Privacy', icon: 'shield' },
    { label: 'Theme', icon: 'palette' },
    { label: 'Display', icon: 'monitor', disabled: true },
  ];
  protected readonly last = signal('none');

  protected readonly labelOptions = ['Bug', 'Feature', 'Docs', 'Design', 'Question'];
  protected readonly labels = signal([0, 1]);
  protected toggle(index: number) {
    this.labels.update((current) =>
      current.includes(index) ? current.filter((i) => i !== index) : [...current, index].sort((a, b) => a - b),
    );
  }
}
