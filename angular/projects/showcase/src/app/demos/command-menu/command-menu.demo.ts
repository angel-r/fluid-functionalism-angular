import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  Button,
  COMMAND_MENU_PARTS,
  Elevated,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  cn,
  injectShape,
  type CommandMenuHint,
  type CommandMenuItemData,
} from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';
import {
  COMMAND_MENU_COPY,
  COMMAND_MENU_SORTS,
  COMMAND_MENU_SUGGESTIONS,
  COMMAND_MENU_TABS,
  COMMAND_MENU_TYPES,
  commandMenuItems,
} from './command-menu.data';

@Component({
  selector: 'app-command-menu-demo',
  imports: [DemoPage, DemoSection, COMMAND_MENU_PARTS, Button, Elevated, Select, SelectTrigger, SelectContent, SelectItem],
  template: `
    <app-demo-page title="Command menu" description="1 field over every action. Type, arrow, Enter.">
      <p class="text-site-body text-muted-foreground" role="status" aria-live="polite">
        {{ lastRun() ? 'Ran “' + lastRun() + '”' : 'Pick a row with Enter or a click.' }}
      </p>

      <app-demo-section title="Basic">
        <div [ffElevated]="2" [shadowLevel]="3" [class]="panelClass()">
          <ff-command-menu [items]="plain" (itemSelect)="run($event)">
            <ff-command-menu-input [placeholder]="copy.placeholder" />
            <ff-command-menu-list>
              <ff-command-menu-empty>{{ copy.empty }}</ff-command-menu-empty>
            </ff-command-menu-list>
          </ff-command-menu>
        </div>
      </app-demo-section>

      <app-demo-section title="Descriptions, shortcuts, disabled rows">
        <div [ffElevated]="2" [shadowLevel]="3" [class]="panelClass()">
          <ff-command-menu [items]="full" (itemSelect)="run($event)">
            <ff-command-menu-input [placeholder]="copy.placeholder" />
            <ff-command-menu-list>
              <ff-command-menu-empty>{{ copy.empty }}</ff-command-menu-empty>
            </ff-command-menu-list>
          </ff-command-menu>
        </div>
      </app-demo-section>

      <app-demo-section title="Suggestions">
        <div [ffElevated]="2" [shadowLevel]="3" [class]="panelClass()">
          <ff-command-menu [items]="full" [suggestions]="suggestions" suggestionsLabel="Recent" (itemSelect)="run($event)">
            <ff-command-menu-input [placeholder]="copy.placeholder" />
            <ff-command-menu-list>
              <ff-command-menu-empty>{{ copy.empty }}</ff-command-menu-empty>
            </ff-command-menu-list>
          </ff-command-menu>
        </div>
      </app-demo-section>

      <app-demo-section title="Tabs">
        <div [ffElevated]="2" [shadowLevel]="3" [class]="panelClass()">
          <ff-command-menu [items]="tabbed()" (itemSelect)="run($event)">
            <ff-command-menu-input [placeholder]="copy.placeholder" />
            <ff-command-menu-tabs [tabs]="tabs" [(value)]="tab" />
            <ff-command-menu-list>
              <ff-command-menu-empty>{{ copy.empty }}</ff-command-menu-empty>
            </ff-command-menu-list>
          </ff-command-menu>
        </div>
      </app-demo-section>

      <app-demo-section title="Filters">
        <div [ffElevated]="2" [shadowLevel]="3" [class]="panelClass()">
          <ff-command-menu [items]="filtered()" (itemSelect)="run($event)">
            <ff-command-menu-input [placeholder]="copy.placeholder" />
            <ff-command-menu-filters>
              <ff-select [(value)]="type">
                <ff-select-trigger variant="borderless" aria-label="Type" />
                <ff-select-content>
                  @for (option of types; track option.value; let i = $index) {
                    <ff-select-item [index]="i" [value]="option.value">{{ option.label }}</ff-select-item>
                  }
                </ff-select-content>
              </ff-select>
              <ff-select [(value)]="sort">
                <ff-select-trigger variant="borderless" aria-label="Sort" />
                <ff-select-content>
                  @for (option of sorts; track option.value; let i = $index) {
                    <ff-select-item [index]="i" [value]="option.value">{{ option.label }}</ff-select-item>
                  }
                </ff-select-content>
              </ff-select>
            </ff-command-menu-filters>
            <ff-command-menu-list>
              <ff-command-menu-empty>{{ copy.empty }}</ff-command-menu-empty>
            </ff-command-menu-list>
          </ff-command-menu>
        </div>
      </app-demo-section>

      <app-demo-section title="Dialog and trigger shortcut">
        <div class="flex flex-wrap items-center gap-3">
          <button ffButton variant="secondary" class="pr-3" (click)="open.set(true)">
            <!-- No whitespace before the caps: JSX drops it, and a space would
                 widen the button. -->
            Open<kbd ffCommandMenuShortcut keys="mod+p" class="ml-1"></kbd>
          </button>
          <ff-command-menu-dialog [(open)]="open" shortcut="mod+p">
            <ff-command-menu [items]="full" [suggestions]="suggestions" (itemSelect)="run($event)">
              <ff-command-menu-input [placeholder]="copy.placeholder" />
              <ff-command-menu-list>
                <ff-command-menu-empty>{{ copy.empty }}</ff-command-menu-empty>
              </ff-command-menu-list>
            </ff-command-menu>
          </ff-command-menu-dialog>
          <button ffButton variant="ghost" (click)="openNoKey.set(true)">Open, no shortcut</button>
          <ff-command-menu-dialog [(open)]="openNoKey" [shortcut]="null">
            <ff-command-menu [items]="full" (itemSelect)="run($event)">
              <ff-command-menu-input [placeholder]="copy.placeholder" />
              <ff-command-menu-list>
                <ff-command-menu-empty>{{ copy.empty }}</ff-command-menu-empty>
              </ff-command-menu-list>
            </ff-command-menu>
          </ff-command-menu-dialog>
        </div>
      </app-demo-section>

      <app-demo-section title="Footer hints">
        <div [ffElevated]="2" [shadowLevel]="3" [class]="panelClass()">
          <ff-command-menu [items]="full" [suggestions]="suggestions" (itemSelect)="run($event)">
            <ff-command-menu-input [placeholder]="copy.placeholder" />
            <ff-command-menu-tabs [tabs]="tabs" [(value)]="footerTab" />
            <ff-command-menu-list>
              <ff-command-menu-empty>{{ copy.empty }}</ff-command-menu-empty>
            </ff-command-menu-list>
            <ff-command-menu-footer />
          </ff-command-menu>
        </div>
      </app-demo-section>

      <app-demo-section title="Custom footer hints">
        <div [ffElevated]="2" [shadowLevel]="3" [class]="panelClass()">
          <ff-command-menu [items]="plain" (itemSelect)="run($event)">
            <ff-command-menu-input [placeholder]="copy.placeholder" />
            <ff-command-menu-list>
              <ff-command-menu-empty>{{ copy.empty }}</ff-command-menu-empty>
            </ff-command-menu-list>
            <ff-command-menu-footer [hints]="customHints" />
          </ff-command-menu>
        </div>
      </app-demo-section>

      <app-demo-section title="Custom rows">
        <div [ffElevated]="2" [shadowLevel]="3" [class]="panelClass()">
          <ff-command-menu [items]="full" (itemSelect)="run($event)">
            <ff-command-menu-input [placeholder]="copy.placeholder" />
            <ff-command-menu-list>
              <ff-command-menu-empty>{{ copy.empty }}</ff-command-menu-empty>
              <ng-template ffCommandMenuRow let-item>
                <ff-command-menu-item [value]="item.value" [icon]="item.icon ?? 'plus'">
                  <span class="flex min-w-0 flex-1 items-baseline gap-2">
                    <span class="truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1">{{ item.label }}</span>
                    <span class="truncate text-muted-foreground [text-box:trim-both_cap_alphabetic] py-1 -my-1">{{
                      item.group
                    }}</span>
                  </span>
                </ff-command-menu-item>
              </ng-template>
            </ff-command-menu-list>
          </ff-command-menu>
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CommandMenuDemo {
  private readonly shape = injectShape();
  protected readonly copy = COMMAND_MENU_COPY;
  protected readonly tabs = COMMAND_MENU_TABS;
  protected readonly types = COMMAND_MENU_TYPES;
  protected readonly sorts = COMMAND_MENU_SORTS;
  protected readonly suggestions = COMMAND_MENU_SUGGESTIONS;
  protected readonly plain = commandMenuItems({ descriptions: false, shortcuts: false });
  protected readonly full = commandMenuItems();
  protected readonly customHints: CommandMenuHint[] = [
    { label: 'Select', keys: ['up', 'down'] },
    { label: 'Open', keys: 'enter' },
    { label: 'Open menu', keys: 'mod+k' },
  ];

  protected readonly lastRun = signal<string | null>(null);
  protected readonly tab = signal('all');
  protected readonly footerTab = signal('all');
  protected readonly type = signal('all');
  protected readonly sort = signal('default');
  protected readonly open = signal(false);
  protected readonly openNoKey = signal(false);

  protected readonly tabbed = computed(() => byGroup(this.full, this.tab()));
  protected readonly filtered = computed(() => {
    const rows = byGroup(this.full, this.type());
    return this.sort() === 'az' ? [...rows].sort((a, b) => a.label.localeCompare(b.label)) : rows;
  });

  /** The inline frame every example sits in: a surface the rows size, up to
   *  a cap the list scrolls past. */
  protected readonly panelClass = computed(() =>
    cn('flex max-h-[360px] w-full max-w-[520px] flex-col overflow-hidden', this.shape().container),
  );

  protected run(item: CommandMenuItemData) {
    this.lastRun.set(item.label);
  }
}

function byGroup(items: CommandMenuItemData[], group: string) {
  return group === 'all' ? items : items.filter((item) => item.group === group);
}
