// ---------------------------------------------------------------------------
// One live preview per component on the home page's bento grid.
// Ported from app/components/bento-previews.tsx: same compositions, sizes and
// data, built from the Angular library.
//
// Each preview's HOST is the reference's root element, so the card's stage
// lays them out exactly as React does (a bare `<app-x>` wrapper would shrink to
// content and flatten `w-full`). Where the reference's root is a component or a
// directive-driven frame, the host is `display: contents` and that element is
// the box instead. `PREVIEW_MAP` is what the grid looks a slug up in; the key
// list is the reference's, so a slug with no preview simply does not render.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  type Signal,
  type Type,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { animate } from 'motion';
import {
  AccordionContent,
  AccordionGroup,
  AccordionItem,
  AccordionTrigger,
  AskUserQuestions,
  Badge,
  Button,
  Calendar,
  Card,
  CardGroup,
  CardHeader,
  CardMedia,
  CardTitle,
  CarouselDots,
  ChatMessage,
  CheckboxGroup,
  CheckboxItem,
  ColorPicker,
  ColorPickerPortalContainer,
  Combobox,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxRow,
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
  DatePicker,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Dropdown,
  Elevated,
  Icon,
  InputCopy,
  InputField,
  InputGroup,
  InputMessage,
  MenuItem,
  RadioGroup,
  RadioItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SizeProvider,
  Slider,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabItem,
  TabsSubtle,
  TabsSubtleItem,
  ThinkingIndicator,
  ThinkingStep,
  ThinkingStepDetails,
  ThinkingStepSource,
  ThinkingStepSources,
  ThinkingSteps,
  ThinkingStepsContent,
  ThinkingStepsHeader,
  Tooltip,
  cn,
  enterTransition,
  exitTransition,
  fontWeights,
  injectShape,
  spring,
  type CalendarValue,
  type CommandMenuItemData,
  type DatePickerValue,
  type IconName,
} from '@angel-r/fluid-functionalism-angular';
import { COMMAND_MENU_COPY, COMMAND_MENU_SUGGESTIONS, commandMenuItems } from '../../site/command-menu-data';
import {
  ACCORDION_ITEMS,
  ASK_USER_EXAMPLE_QUESTIONS,
  BADGE_ITEMS,
  BUTTON_ITEMS,
  CHECKBOX_ITEMS,
  COMBOBOX_COMPONENTS,
  COMBOBOX_COPY,
  COMBOBOX_DEFAULT_VALUES,
  DIALOG_COPY,
  DROPDOWN_ITEMS,
  INPUT_FIELDS,
  RADIO_DEFAULT,
  RADIO_ITEMS,
  SELECT_DEFAULT,
  SELECT_PLACEHOLDER,
  SELECT_ROLES,
  SIDEBAR_THREADS,
  SLIDER_OPACITY,
  SLIDER_VOLUME,
  SWITCH_ITEMS,
  TABLE_COLUMNS,
  TABLE_ROWS,
  TABLE_TILE_ROWS,
  TABS_DEFAULT,
  TABS_ITEMS,
  TOOLTIP_COPY,
} from './demo-data';

/** How far a slide's label travels sideways on a change, in px. */
const SLIDE_SHIFT = 24;

const CAROUSEL_SLIDES = ['Inbox', 'Drafts', 'Sent', 'Archive'];

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * React `useNarrowFrame`: true below the sidebar's own 768px default
 * breakpoint. The tiles run inside bounded frames a few hundred pixels wide, so
 * the component's real mobile rule does not apply to them: turning into a
 * drawer, or keeping a 12rem rail beside an 83px sliver of main region, hides
 * the very thing the tile exists to show. The tile spends the frame's width on
 * the rail alone instead. Starts false so the first render is stable, then
 * follows the media query. Injection context only.
 */
function injectNarrowFrame(): Signal<boolean> {
  const narrow = signal(false);
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mql = window.matchMedia('(max-width: 767px)');
    const update = () => narrow.set(mql.matches);
    update();
    mql.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => mql.removeEventListener('change', update));
  }
  return narrow.asReadonly();
}

// ─── InputMessage ────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-input-message',
  imports: [InputMessage],
  template: `
    <ff-input-message
      [(value)]="value"
      placeholderSuggestion="Why is every other input box so stiff?"
      (send)="value.set('')"
    />
  `,
  host: { class: 'w-full max-w-[440px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class InputMessagePreview {
  protected readonly value = signal('');
}

// ─── Card ────────────────────────────────────────────────────────────────────

const CARD_ITEMS: readonly { icon: IconName; title: string }[] = [
  { icon: 'circle', title: 'Fluid motion' },
  { icon: 'shield', title: 'Accessible' },
  { icon: 'palette', title: 'Yours to theme' },
  { icon: 'search', title: 'Fluid hover' },
];

/**
 * A medium tile: 4 compact inline rows (icon and title) under one fluid hover,
 * divided by hairlines. The descriptions stay on the docs page: with them the 4
 * rows outgrow the tile's stage.
 */
@Component({
  selector: 'app-bento-card-tile',
  imports: [CardGroup, Card, CardMedia, CardHeader, CardTitle],
  template: `
    <ff-card-group orientation="inline" [fluidHover]="true">
      @for (item of items; track item.title) {
        <!-- 4 rows share a 300px tile row with the stage padding and the
             footer: 52px rows instead of the compact row's 60px minimum. -->
        <ff-card [label]="item.title" size="compact" class="min-h-[52px] py-1.5" (cardClick)="noop()">
          <ff-card-media [icon]="item.icon" />
          <div ffCardHeader>
            <span ffCardTitle>{{ item.title }}</span>
          </div>
        </ff-card>
      }
    </ff-card-group>
  `,
  host: { class: 'w-full max-w-[520px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CardPreview {
  protected readonly items = CARD_ITEMS;
  protected noop() {}
}

// ─── Accordion ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-accordion',
  imports: [AccordionGroup, AccordionItem, AccordionTrigger, AccordionContent],
  template: `
    <ff-accordion-group type="single" defaultValue="item-1" class="w-full">
      @for (item of items; track item.value; let i = $index) {
        <ff-accordion-item [value]="item.value" [index]="i">
          <ff-accordion-trigger>{{ item.title }}</ff-accordion-trigger>
          <ff-accordion-content>{{ item.content }}</ff-accordion-content>
        </ff-accordion-item>
      }
    </ff-accordion-group>
  `,
  host: { class: 'w-full max-w-[420px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class AccordionPreview {
  protected readonly items = ACCORDION_ITEMS;
}

// ─── CarouselDots ────────────────────────────────────────────────────────────

/**
 * A small carousel on the dots' built-in autoplay: the current pill fills, then
 * the next slide comes in from the right. A dot picked by hand slides the label
 * from its side. Hover the slide to pause.
 */
@Component({
  selector: 'app-bento-carousel-dots',
  imports: [CarouselDots],
  template: `
    <div
      #stage
      class="grid h-16 w-48 place-items-center overflow-hidden rounded-xl border border-border/60 bg-background"
      (mouseenter)="hovering.set(true)"
      (mouseleave)="hovering.set(false)"
    ></div>
    <div (pointerdown)="byHand = true" (keydown)="byHand = true">
      <ff-carousel-dots
        [count]="slides.length"
        [value]="slide()"
        (valueChange)="onValueChange($event)"
        [autoplay]="autoplay()"
        [getLabel]="label"
      />
    </div>
  `,
  host: { class: 'flex flex-col items-center gap-3' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselDotsPreview {
  /** Holds the autoplay: the changelog's page-wide Pause passes its playback
   *  state in, as the reference's PreviewPlaybackContext does. */
  readonly paused = input(false);
  protected readonly slides = CAROUSEL_SLIDES;
  protected readonly slide = signal(0);
  protected readonly hovering = signal(false);
  protected readonly autoplay = computed(() => ({ duration: 2400, paused: this.hovering() || this.paused() }));
  protected readonly label = (i: number) => `Show ${CAROUSEL_SLIDES[i]}`;
  /** A dot picked by hand compares indices, so clicking back goes left. */
  protected byHand = false;

  private readonly direction = signal(1);
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  constructor() {
    let current: HTMLElement | null = null;
    effect(() => {
      const index = this.slide();
      const dir = untracked(this.direction);
      const stage = this.stage().nativeElement;
      untracked(() => {
        const label = document.createElement('span');
        label.className = 'col-start-1 row-start-1 text-site-body text-foreground';
        label.textContent = CAROUSEL_SLIDES[index];
        stage.appendChild(label);
        if (current) {
          const leaving = current;
          animate(
            leaving,
            { opacity: 0, x: -dir * SLIDE_SHIFT },
            exitTransition(spring.moderate),
          ).finished.then(() => leaving.remove());
          animate(label, { opacity: [0, 1], x: [dir * SLIDE_SHIFT, 0] }, enterTransition(spring.moderate));
        }
        current = label;
      });
    });
  }

  protected onValueChange(next: number): void {
    // Read the flag now: the comparison needs the slide before this change.
    const picked = this.byHand;
    this.byHand = false;
    this.direction.set(picked ? (next > this.slide() ? 1 : -1) : 1);
    this.slide.set(next);
  }
}

// ─── Badge ───────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-badge',
  imports: [Badge],
  template: `
    @for (item of items; track item.label) {
      <ff-badge variant="dot" [color]="item.color">{{ item.label }}</ff-badge>
    }
  `,
  host: { class: 'flex flex-wrap gap-1.5 items-center' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class BadgePreview {
  protected readonly items = BADGE_ITEMS;
}

// ─── Button ──────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-button',
  imports: [Button],
  template: `
    @for (item of items; track item.label) {
      <button ffButton [variant]="item.variant" size="compact">{{ item.label }}</button>
    }
  `,
  host: { class: 'flex flex-wrap items-center gap-2' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ButtonPreview {
  protected readonly items = BUTTON_ITEMS;
}

// ─── CheckboxGroup ───────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-checkbox-group',
  imports: [CheckboxGroup, CheckboxItem],
  template: `
    <ff-checkbox-group [checkedIndices]="checked()">
      @for (item of items; track item.id; let i = $index) {
        <ff-checkbox-item [index]="i" [label]="item.label" [checked]="checked().has(i)" (toggle)="toggle(i)" />
      }
    </ff-checkbox-group>
  `,
  host: { class: 'w-full max-w-[220px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CheckboxPreview {
  protected readonly items = CHECKBOX_ITEMS;
  protected readonly checked = signal<ReadonlySet<number>>(new Set());

  protected toggle(index: number): void {
    this.checked.update((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }
}

// ─── Dialog ──────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-dialog',
  imports: [Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, Button],
  template: `
    <ff-dialog>
      <button ffButton ffDialogTrigger variant="secondary" size="compact">{{ copy.trigger }}</button>
      <ff-dialog-content size="sm">
        <div ffDialogHeader>
          <h2 ffDialogTitle>{{ copy.title }}</h2>
          <p ffDialogDescription>{{ copy.description }}</p>
        </div>
        <div ffDialogFooter>
          <button ffButton ffDialogClose variant="ghost">{{ copy.cancel }}</button>
          <button ffButton>{{ copy.confirm }}</button>
        </div>
      </ff-dialog-content>
    </ff-dialog>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class DialogPreview {
  protected readonly copy = DIALOG_COPY;
}

// ─── Dropdown ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-dropdown',
  imports: [Dropdown, MenuItem],
  template: `
    <ff-dropdown [checkedIndex]="selected() ?? undefined">
      @for (item of items; track item.value; let i = $index) {
        <ff-menu-item
          [index]="i"
          [icon]="item.icon"
          [label]="item.label"
          [checked]="selected() === i"
          (select)="pick(i)"
        />
      }
    </ff-dropdown>
  `,
  host: { class: 'w-full max-w-[280px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class DropdownPreview {
  protected readonly items = DROPDOWN_ITEMS;
  protected readonly selected = signal<number | null>(0);

  protected pick(index: number): void {
    this.selected.update((current) => (current === index ? null : index));
  }
}

// ─── InputCopy ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-input-copy',
  imports: [InputCopy],
  template: `<ff-input-copy value="npx shadcn@latest registry add @fluid" />`,
  host: { class: 'w-full max-w-[420px] relative z-10' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class InputCopyPreview {}

// ─── InputGroup ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-input-group',
  imports: [InputGroup, InputField],
  template: `
    <ff-input-group>
      @for (field of fields; track field.key; let i = $index) {
        <ff-input-field
          [index]="i"
          [label]="field.label"
          [placeholder]="field.placeholder"
          [icon]="field.icon"
          [value]="values()[field.key] ?? ''"
          (valueChange)="set(field.key, $event)"
        />
      }
    </ff-input-group>
  `,
  host: { class: 'w-full max-w-[320px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class InputGroupPreview {
  protected readonly fields = INPUT_FIELDS;
  protected readonly values = signal<Record<string, string>>({});

  protected set(key: string, value: string): void {
    this.values.update((previous) => ({ ...previous, [key]: value }));
  }
}

// ─── RadioGroup ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-radio-group',
  imports: [RadioGroup, RadioItem],
  template: `
    <ff-radio-group [(value)]="value">
      @for (item of items; track item.value; let i = $index) {
        <ff-radio-item [index]="i" [label]="item.label" [value]="item.value" />
      }
    </ff-radio-group>
  `,
  host: { class: 'w-full max-w-[220px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class RadioGroupPreview {
  protected readonly items = RADIO_ITEMS;
  protected readonly value = signal<string | undefined>(RADIO_DEFAULT);
}

// ─── Select ──────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-select',
  imports: [Select, SelectTrigger, SelectContent, SelectItem],
  template: `
    <ff-select [(value)]="value">
      <ff-select-trigger [placeholder]="placeholder" variant="bordered" />
      <ff-select-content>
        @for (role of roles; track role; let i = $index) {
          <ff-select-item [index]="i" [value]="role">{{ role }}</ff-select-item>
        }
      </ff-select-content>
    </ff-select>
  `,
  host: { class: 'w-full max-w-[280px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SelectPreview {
  protected readonly placeholder = SELECT_PLACEHOLDER;
  protected readonly roles = SELECT_ROLES;
  protected readonly value = signal(SELECT_DEFAULT);
}

// ─── Calendar ────────────────────────────────────────────────────────────────

/**
 * A stay already picked across the month break, so the band shows from the
 * first frame; 2 months side by side once the frame is wide enough. Cells
 * shrink to 30px so a 6-week month fits the 300px row.
 */
@Component({
  selector: 'app-bento-calendar',
  imports: [Calendar],
  template: `<ff-calendar
    mode="range"
    [numberOfMonths]="narrow() ? 1 : 2"
    orientation="horizontal"
    [cellSize]="30"
    [(selected)]="range"
  />`,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CalendarPreview {
  protected readonly narrow = injectNarrowFrame();
  protected readonly range = signal<CalendarValue>({ from: addDays(new Date(), 3), to: addDays(new Date(), 8) });
}

// ─── DatePicker ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-date-picker',
  imports: [DatePicker],
  template: `<ff-date-picker [(value)]="date" />`,
  host: { class: 'flex w-full max-w-[280px] justify-center' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class DatePickerPreview {
  protected readonly date = signal<DatePickerValue>(new Date());
}

// ─── Combobox ────────────────────────────────────────────────────────────────

/** Mirrors the Combobox playground's default (multiple, chips field, bordered,
 *  no icon) with two chips already in. */
@Component({
  selector: 'app-bento-combobox',
  imports: [Combobox, ComboboxChips, ComboboxContent, ComboboxEmpty, ComboboxList, ComboboxItem, ComboboxRow],
  template: `
    <ff-combobox multiple [items]="items" [(value)]="values">
      <ff-combobox-chips [placeholder]="copy.placeholderMultiple" class="w-full" />
      <ff-combobox-content>
        <ff-combobox-empty>{{ copy.empty }}</ff-combobox-empty>
        <ff-combobox-list>
          <ng-template ffComboboxRow let-value="value" let-label="label">
            <ff-combobox-item [value]="value">{{ label }}</ff-combobox-item>
          </ng-template>
        </ff-combobox-list>
      </ff-combobox-content>
    </ff-combobox>
  `,
  host: { class: 'w-full max-w-[280px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ComboboxPreview {
  protected readonly items = COMBOBOX_COMPONENTS;
  protected readonly copy = COMBOBOX_COPY;
  protected readonly values = signal<string[]>(COMBOBOX_DEFAULT_VALUES);
}

// ─── Slider ──────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-slider',
  imports: [Slider],
  template: `
    <div class="flex flex-col gap-1.5 w-full">
      <div class="flex items-center justify-between text-site-body">
        <span class="text-muted-foreground">{{ opacity.label }}</span>
        <span class="text-muted-foreground tabular-nums">{{ basic() }}</span>
      </div>
      <ff-slider [(value)]="basic" [showValue]="false" />
    </div>
    <ff-slider
      variant="scrubber"
      [label]="volume.label"
      [(value)]="volumeValue"
      [min]="0"
      [max]="100"
      [formatValue]="percent"
    />
  `,
  host: { class: 'flex flex-col gap-8 w-full max-w-[280px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SliderPreview {
  protected readonly opacity = SLIDER_OPACITY;
  protected readonly volume = SLIDER_VOLUME;
  protected readonly basic = signal(SLIDER_OPACITY.initial);
  protected readonly volumeValue = signal(SLIDER_VOLUME.initial);
  protected readonly percent = (value: number) => `${value}%`;
}

// ─── Switch ──────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-switch',
  imports: [Switch],
  template: `
    @for (item of items; track item.id) {
      <ff-switch [label]="item.label" [checked]="on().has(item.id)" (checkedChange)="toggle(item.id)" />
    }
  `,
  host: { class: 'flex flex-col gap-3' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SwitchPreview {
  protected readonly items = SWITCH_ITEMS;
  protected readonly on = signal<ReadonlySet<string>>(
    new Set(SWITCH_ITEMS.filter((item) => item.initial).map((item) => item.id)),
  );

  protected toggle(id: string): void {
    this.on.update((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
}

// ─── CommandMenu ─────────────────────────────────────────────────────────────

/**
 * The tile shows the essence: the field, the suggested rows with their caps, and
 * the rows fading into the list's scroll edge. Tabs and the hint footer stay on
 * the docs page. A large tile, so the panel runs tall enough to show the first
 * groups; its own height caps the list.
 */
@Component({
  selector: 'app-bento-command-menu',
  imports: [Elevated, CommandMenu, CommandMenuInput, CommandMenuList, CommandMenuEmpty],
  template: `
    <div [ffElevated]="2" [shadowLevel]="3" [class]="panelClass()">
      <ff-command-menu [items]="items" [suggestions]="suggestions">
        <ff-command-menu-input [placeholder]="copy.placeholder" />
        <ff-command-menu-list>
          <ff-command-menu-empty>{{ copy.empty }}</ff-command-menu-empty>
        </ff-command-menu-list>
      </ff-command-menu>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CommandMenuPreview {
  protected readonly items: CommandMenuItemData[] = commandMenuItems();
  protected readonly suggestions = COMMAND_MENU_SUGGESTIONS;
  protected readonly copy = COMMAND_MENU_COPY;
  private readonly shape = injectShape();
  protected readonly panelClass = computed(() =>
    cn('flex max-h-[440px] w-full max-w-[520px] flex-col overflow-hidden', this.shape().container),
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-table',
  imports: [Table, TableHeader, TableBody, TableRow, TableHead, TableCell],
  template: `
    <ff-table>
      <thead ffTableHeader>
        <tr ffTableRow>
          @for (column of columns; track column) {
            <th ffTableHead>{{ column }}</th>
          }
        </tr>
      </thead>
      <tbody ffTableBody>
        <!-- 4 rows fit a medium tile's stage; the /demo stage and the docs page
             keep all 7. -->
        @for (row of rows; track row[0]; let i = $index) {
          <tr ffTableRow [index]="i">
            @for (cell of row; track $index) {
              <td ffTableCell>{{ cell }}</td>
            }
          </tr>
        }
      </tbody>
    </ff-table>
  `,
  host: { class: 'w-full max-w-[420px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TablePreview {
  protected readonly columns = TABLE_COLUMNS;
  protected readonly rows = TABLE_ROWS.slice(0, TABLE_TILE_ROWS);
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-tabs',
  imports: [Tabs, TabsList, TabItem],
  template: `
    <ff-tabs [(value)]="tab">
      <ff-tabs-list>
        @for (item of items; track item.value) {
          <button ffTabItem [value]="item.value" [label]="item.label"></button>
        }
      </ff-tabs-list>
    </ff-tabs>
  `,
  host: { class: 'w-full max-w-[360px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TabsPreview {
  protected readonly items = TABS_ITEMS;
  protected readonly tab = signal(TABS_DEFAULT);
}

// ─── TabsSubtle ──────────────────────────────────────────────────────────────

const SUBTLE_TABS: readonly { icon: IconName; label: string }[] = [
  { icon: 'home', label: 'Home' },
  { icon: 'message-circle', label: 'Chat' },
  { icon: 'inbox', label: 'Inbox' },
];

@Component({
  selector: 'app-bento-tabs-subtle',
  imports: [TabsSubtle, TabsSubtleItem],
  template: `
    <ff-tabs-subtle idPrefix="bento-tabs" [(selectedIndex)]="tab" [activeLabel]="true" aria-label="Navigation">
      @for (item of items; track item.label; let i = $index) {
        <button ffTabsSubtleItem [index]="i" [icon]="item.icon" [label]="item.label"></button>
      }
    </ff-tabs-subtle>
  `,
  host: { class: 'w-fit mx-auto' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TabsSubtlePreview {
  protected readonly items = SUBTLE_TABS;
  protected readonly tab = signal(0);
}

// ─── ThinkingIndicator ───────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-thinking-indicator',
  imports: [ThinkingIndicator],
  template: `<ff-thinking-indicator />`,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ThinkingIndicatorPreview {}

// ─── AskUserQuestions ────────────────────────────────────────────────────────

/**
 * `self-end` overrides the stage's `items-center` so the flow sits flush with
 * the bottom of the preview area — its content height changes per question
 * (taller multi-select vs short single-select), so anchoring the bottom keeps
 * the footer button and chip column in the same spot instead of drifting up and
 * down as the visitor navigates.
 */
@Component({
  selector: 'app-bento-ask-user-questions',
  imports: [AskUserQuestions],
  template: `<ff-ask-user-questions [questions]="questions" />`,
  host: { class: 'w-full max-w-[420px] self-end' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class AskUserQuestionsPreview {
  protected readonly questions = ASK_USER_EXAMPLE_QUESTIONS;
}

// ─── ThinkingSteps ───────────────────────────────────────────────────────────

const READING_DETAILS = ['Read about.html', 'Read projects.html', 'Read resume.pdf', 'Read contact.html'];

@Component({
  selector: 'app-bento-thinking-steps',
  imports: [
    ThinkingSteps,
    ThinkingStepsHeader,
    ThinkingStepsContent,
    ThinkingStep,
    ThinkingStepDetails,
    ThinkingStepSources,
    ThinkingStepSource,
  ],
  template: `
    <ff-thinking-steps defaultOpen>
      <ff-thinking-steps-header>Research Agent</ff-thinking-steps-header>
      <ff-thinking-steps-content>
        <ff-thinking-step status="complete" icon="search" label="Searching profiles">
          <ff-thinking-step-sources>
            <ff-thinking-step-source>x.com</ff-thinking-step-source>
            <ff-thinking-step-source>github.com</ff-thinking-step-source>
          </ff-thinking-step-sources>
        </ff-thinking-step>
        <ff-thinking-step status="complete" icon="globe" label="Reading portfolio">
          <ff-thinking-step-details summary="Explored 4 pages" [details]="details" />
        </ff-thinking-step>
        <ff-thinking-step status="complete" icon="search" label="Searching recent work">
          <ff-thinking-step-sources>
            <ff-thinking-step-source>figma.com</ff-thinking-step-source>
            <ff-thinking-step-source>behance.net</ff-thinking-step-source>
          </ff-thinking-step-sources>
        </ff-thinking-step>
        <ff-thinking-step
          status="active"
          icon="brain"
          label="Analyzing results"
          description="Compiling findings into a summary."
          [isLast]="true"
        />
      </ff-thinking-steps-content>
    </ff-thinking-steps>
  `,
  host: { class: 'w-full max-w-[380px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ThinkingStepsPreview {
  protected readonly details = READING_DETAILS;
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-tooltip',
  imports: [Tooltip, Button],
  template: `
    <div class="relative z-10">
      <ff-tooltip [content]="copy.content">
        <button ffButton variant="secondary" size="compact">{{ copy.trigger }}</button>
      </ff-tooltip>
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TooltipPreview {
  protected readonly copy = TOOLTIP_COPY;
}

// ─── ColorPicker ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-color-picker',
  imports: [ColorPicker, ColorPickerPortalContainer],
  template: `
    <!-- The relative class is load-bearing: the format menu portals INTO this
         wrapper and positions itself against the wrapper's rect. Without it the
         absolute coordinates resolve against the next positioned ancestor (the
         card), so the menu lands far to the left of the picker. -->
    <div #frame class="relative w-full max-w-[280px]" [ffColorPickerPortalContainer]="frame">
      <ff-color-picker defaultValue="#6B97FF" />
    </div>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ColorPickerPreview {}

// ─── ChatMessage ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bento-chat-message',
  imports: [ChatMessage],
  template: `
    <ff-chat-message from="user" size="compact">Why is every other input box so stiff?</ff-chat-message>
    <ff-chat-message from="assistant" size="compact">Because nothing about them moves with you.</ff-chat-message>
  `,
  host: { class: 'flex w-full max-w-[300px] flex-col gap-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ChatMessagePreview {}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const SIDEBAR_TILE_THREADS = [SIDEBAR_THREADS[0], SIDEBAR_THREADS[2], SIDEBAR_THREADS[3], SIDEBAR_THREADS[4]];

/**
 * A whole app shell in miniature — workspace row, a thread list with the
 * status-dot treatment, a user row, and the main region beside it.
 * `collapsible="none"` keeps it static: it never becomes the full-viewport
 * drawer on phones. One card, two ways to spend its width: beside the main
 * region on a desktop, and rail-only on a phone, where 12rem of rail would
 * leave the main region an 83px sliver that shows nothing.
 */
@Component({
  selector: 'app-bento-sidebar',
  imports: [
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuBadge,
    SidebarInput,
    SidebarInset,
    SizeProvider,
    Icon,
  ],
  template: `
    <ff-sidebar-provider
      class="h-full min-h-0"
      [persist]="false"
      [shortcut]="null"
      [width]="narrow() ? '100%' : '14rem'"
    >
      <ff-sidebar collapsible="none" variant="inset" class="h-full">
        <div ffSidebarHeader>
          <ul ffSidebarMenu size="compact" aria-label="Workspace">
            <li ffSidebarMenuItem>
              <button ffSidebarMenuButton>
                <span
                  class="flex size-5 shrink-0 items-center justify-center rounded-md bg-foreground text-[10px] text-background"
                  [style.font-variation-settings]="semibold"
                  >A</span
                >
                <span class="min-w-0 truncate text-foreground" [style.font-variation-settings]="semibold"
                  >Acme Inc</span
                >
              </button>
            </li>
          </ul>

          <!-- Search and New read as one block — no gap between them — and
               each shortcut is revealed by its own row rather than sitting
               there at rest. Pinned compact so SidebarInput takes its height
               and type from the ladder, the same step the rows use. -->
          <div class="flex flex-col" ffSizeProvider size="compact">
            <div class="group/search relative">
              <ff-icon
                name="search"
                [size]="14"
                [strokeWidth]="1.5"
                class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input ffSidebarInput placeholder="Search" aria-label="Search threads" class="pl-8 pr-11" />
              <kbd
                class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-sans text-site-caption text-muted-foreground opacity-0 transition-opacity duration-80 group-hover/search:opacity-100 group-focus-within/search:opacity-100"
                >⌘K</kbd
              >
            </div>

            <ul ffSidebarMenu size="compact" aria-label="Create">
              <li ffSidebarMenuItem>
                <button ffSidebarMenuButton icon="plus">
                  New thread
                  <span
                    class="ml-auto inline-flex opacity-0 transition-opacity duration-80 group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100"
                  >
                    <kbd class="font-sans text-site-caption text-muted-foreground">⌘N</kbd>
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <ff-sidebar-content>
          <ff-sidebar-group>
            <div ffSidebarGroupLabel>Threads</div>
            <ul ffSidebarMenu size="compact">
              <!-- Skips index 1: it shares a prefix with index 0 and the two
                   truncate to the same string in a 12rem rail. -->
              @for (thread of threads; track thread.label) {
                <li ffSidebarMenuItem>
                  <button ffSidebarMenuButton [status]="thread.status">{{ thread.label }}</button>
                  @if (thread.badge) {
                    <span ffSidebarMenuBadge>{{ thread.badge }}</span>
                  }
                </li>
              }
            </ul>
          </ff-sidebar-group>
        </ff-sidebar-content>

        <div ffSidebarFooter>
          <ul ffSidebarMenu size="compact" aria-label="User">
            <li ffSidebarMenuItem>
              <button ffSidebarMenuButton>
                <img
                  src="micka.png"
                  alt=""
                  width="20"
                  height="20"
                  style="color: transparent"
                  class="size-5 shrink-0 rounded-full outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                />
                <span class="min-w-0 truncate text-foreground">Micka Touillaud</span>
              </button>
            </li>
          </ul>
        </div>
      </ff-sidebar>

      <!-- Blank on purpose — skeleton furniture competed with the rail. -->
      @if (!narrow()) {
        <div ffSidebarInset class="min-h-0"></div>
      }
    </ff-sidebar-provider>
  `,
  host: {
    class:
      'flex h-[380px] w-full max-w-[620px] overflow-hidden rounded-xl border border-border bg-background',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SidebarPreview {
  protected readonly narrow = injectNarrowFrame();
  protected readonly threads = SIDEBAR_TILE_THREADS;
  protected readonly semibold = fontWeights.semibold;
}

// ─── Registry ────────────────────────────────────────────────────────────────

/** The tile rendered for each slug, keyed like the reference's `previewMap`. */
export const PREVIEW_MAP: Readonly<Record<string, Type<unknown>>> = {
  'input-message': InputMessagePreview,
  'chat-message': ChatMessagePreview,
  sidebar: SidebarPreview,
  card: CardPreview,
  accordion: AccordionPreview,
  'ask-user-questions': AskUserQuestionsPreview,
  badge: BadgePreview,
  'carousel-dots': CarouselDotsPreview,
  button: ButtonPreview,
  calendar: CalendarPreview,
  'checkbox-group': CheckboxPreview,
  'color-picker': ColorPickerPreview,
  combobox: ComboboxPreview,
  'command-menu': CommandMenuPreview,
  'date-picker': DatePickerPreview,
  dialog: DialogPreview,
  dropdown: DropdownPreview,
  'input-copy': InputCopyPreview,
  'input-group': InputGroupPreview,
  'radio-group': RadioGroupPreview,
  select: SelectPreview,
  slider: SliderPreview,
  switch: SwitchPreview,
  table: TablePreview,
  tabs: TabsPreview,
  'tabs-subtle': TabsSubtlePreview,
  'thinking-indicator': ThinkingIndicatorPreview,
  'thinking-steps': ThinkingStepsPreview,
  tooltip: TooltipPreview,
};
