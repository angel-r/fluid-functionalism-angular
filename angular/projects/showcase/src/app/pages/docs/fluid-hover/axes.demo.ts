// Demo 3 of /docs/fluid-hover, ported from app/docs/fluid-hover/demos.tsx
// (`AxisBlock` / `AxesDemo`): the one input that changes the rule, on real
// components — a tab strip, a menu, a card grid.
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  Card,
  CardDescription,
  CardGroup,
  CardHeader,
  CardTitle,
  Dropdown,
  MenuItem,
  TabItem,
  Tabs,
  TabsList,
  fontWeights,
} from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { ROWS } from './fluid-hover-rows';
import { axesCode } from './fluid-hover-snippets';

const TAB_ITEMS = ['Library', 'Recents', 'Favorites', 'Settings'];

const CARD_ITEMS = [
  { title: 'Inbox', description: 'Everything new lands here.' },
  { title: 'Drafts', description: 'Unsent, saved as you type.' },
  { title: 'Sent', description: 'Delivered and archived.' },
  { title: 'Trash', description: 'Emptied after 30 days.' },
];

/** One axis, labelled: the mono token and what it is for. */
@Component({
  selector: 'app-axis-block',
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex items-baseline gap-2">
        <code class="font-mono text-site-caption text-foreground" [style.font-variation-settings]="semibold"
          >axis="{{ axis() }}"</code
        >
        <span class="text-site-caption text-muted-foreground">{{ hint() }}</span>
      </div>
      <ng-content />
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class AxisBlock {
  readonly axis = input.required<string>();
  readonly hint = input.required<string>();

  protected readonly semibold = fontWeights.semibold;
}

@Component({
  selector: 'app-axes-demo',
  imports: [ComponentPreview, AxisBlock, Tabs, TabsList, TabItem, Dropdown, MenuItem, CardGroup, Card, CardHeader, CardTitle, CardDescription],
  host: { style: 'display: contents' },
  template: `
    <app-component-preview [code]="code" padding="responsive">
      <div class="flex w-full max-w-md flex-col gap-8">
        <app-axis-block axis="x" hint="strips: tabs">
          <ff-tabs [defaultValue]="tabItems[0]">
            <ff-tabs-list>
              @for (label of tabItems; track label) {
                <button ffTabItem [value]="label" [label]="label"></button>
              }
            </ff-tabs-list>
          </ff-tabs>
        </app-axis-block>

        <app-axis-block axis="y" hint="lists: menus, tables, radios">
          <div class="w-56">
            <ff-dropdown aria-label="Folders">
              @for (label of rows; track label; let i = $index) {
                <ff-menu-item [index]="i" [label]="label" />
              }
            </ff-dropdown>
          </div>
        </app-axis-block>

        <app-axis-block axis="xy" hint="grids: card groups">
          <ff-card-group [columns]="2" border="outlined" separated>
            @for (item of cardItems; track item.title) {
              <!-- A card only joins the highlight when it can be clicked. -->
              <ff-card (cardClick)="noop()">
                <div ffCardHeader>
                  <span ffCardTitle>{{ item.title }}</span>
                  <p ffCardDescription>{{ item.description }}</p>
                </div>
              </ff-card>
            }
          </ff-card-group>
        </app-axis-block>
      </div>
    </app-component-preview>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AxesDemo {
  protected readonly code = axesCode;
  protected readonly tabItems = TAB_ITEMS;
  protected readonly rows = ROWS;
  protected readonly cardItems = CARD_ITEMS;

  protected noop(): void {}
}
