# Fluid Functionalism for Angular: component catalog

One npm package holds every part: `@angel-r/fluid-functionalism-angular`.
There is no per-component install and no registry. Import the exported
classes into a standalone component's `imports` array, then use the element
or attribute selector in its template:

```ts
import { Button } from '@angel-r/fluid-functionalism-angular/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@angel-r/fluid-functionalism-angular/select';
```

The setup (package, peers, `provideFluid()`, the theme import, the Tailwind
`@source`) is in [SKILL.md](../SKILL.md#one-time-project-setup). Every row
links to its docs page on the Angular site, which has live examples, the full
inputs/outputs, and a Copy prompt button; the Craft column points to the exact
section of [craft.md](craft.md) to read before composing. Standalone parts
without their own page point to the parent component whose behaviour they
extend.

Attribute parts in the Selector column are directives on native elements:
they only apply to the tag they name (`button[ffButton]` needs a `<button>`
or `<a href>`, `li[ffSidebarMenuItem]` needs an `<li>`).

## Components

| Component | Exported classes (selector) | What it does | Craft |
|---|---|---|---|
| [Accordion](https://angel-r.github.io/fluid-functionalism-angular/docs/accordion) | `AccordionGroup`, `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` (`ff-accordion-group`, `ff-accordion`, `ff-accordion-item`, `ff-accordion-trigger`, `ff-accordion-content`) | Collapsible sections with animated expand/collapse and fluid hover in grouped mode | [Accordion](craft.md#accordion) |
| [AskUserQuestions](https://angel-r.github.io/fluid-functionalism-angular/docs/ask-user-questions) | `AskUserQuestions`, `AskUserQuestionRow` (`ff-ask-user-questions`, `[ffAskUserQuestionRow]`) | Stepped question flow with single/multi-select, an inline "other" input, skip, and multi-question navigation | [AskUserQuestions](craft.md#ask-user-questions) |
| [Badge](https://angel-r.github.io/fluid-functionalism-angular/docs/badge) | `Badge` (`ff-badge`, `span[ffBadge]`) | Compact label with solid and dot variants, the Tailwind color palette, and 2 sizes | [Badge](craft.md#badge) |
| [Banner](https://angel-r.github.io/fluid-functionalism-angular/docs/banner) | `Banner`, `BannerTitle`, `BannerDescription`, `BannerActions`, `BannerAction` (`ff-banner`, `[ffBannerTitle]`, `[ffBannerDescription]`, `[ffBannerActions]`, `ff-banner-action`) | Status message in 5 statuses and 2 contrasts (`contrast` low or high): status icon, title, optional description, up to 3 actions (primary, secondary, ghost), a dismiss that collapses its height, and a fixed full-bleed variant | [Banner](craft.md#banner) |
| [Button](https://angel-r.github.io/fluid-functionalism-angular/docs/button) | `Button` (`button[ffButton]`, `a[ffButton]`) | Variants (primary, secondary, tertiary, ghost), sizes, loading state, icon slots, and a weight shift on hover | [Button](craft.md#button) |
| [Calendar](https://angel-r.github.io/fluid-functionalism-angular/docs/calendar) | `Calendar`, `CalendarNav` (`ff-calendar`, `ff-calendar-nav`) | Month grid for a day or a range (`mode`): one fluid hover across 1 or 2 months, a range band that previews the end, `booked` / `available` / `disabled` matchers, `cellSize`, `fill`, ISO week numbers | [Calendar](craft.md#calendar) |
| [Card](https://angel-r.github.io/fluid-functionalism-angular/docs/card) | `CardGroup`, `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardEyebrow`, `CardContent`, `CardFooter`, `CardAction`, `CardButton`, `CardMedia`, `CardImage`, `CardFeature` (`ff-card-group`, `ff-card`, `[ffCardHeader]`, `[ffCardTitle]`, …) | Compositional card with stacked, inline, and grid layouts, borderless dividers, media/logo/feature slots, and 2-D fluid hover | [Card](craft.md#card) |
| [CarouselDots](https://angel-r.github.io/fluid-functionalism-angular/docs/carousel-dots) | `CarouselDots`, `CarouselDotTrack` (`ff-carousel-dots`, `[ffCarouselDotTrack]`) | Carousel dots, static or on autoplay (`autoplay` input): fluid-hover click areas, a pill that fills over each slide | [CarouselDots](craft.md#carousel-dots) |
| [ChatMessage](https://angel-r.github.io/fluid-functionalism-angular/docs/chat-message) | `ChatMessage` (`ff-chat-message`) | Chat transcript bubble with baked-in motion, user/assistant alignment, and file attachments | [ChatMessage](craft.md#chat-message) |
| [CheckboxGroup](https://angel-r.github.io/fluid-functionalism-angular/docs/checkbox-group) | `CheckboxGroup`, `CheckboxItem` (`ff-checkbox-group`, `ff-checkbox-item`) | Checkbox group with merged backgrounds for contiguous selections | [CheckboxGroup](craft.md#checkbox-group) |
| [ColorPicker](https://angel-r.github.io/fluid-functionalism-angular/docs/color-picker) | `ColorPicker`, `ColorPickerPopover`, `ColorPickerPortalContainer`, `ColorSwatch`, `ColorTile`, `ColorChannels`, `ColorInput`, `SaturationSquare`, `SwatchStrip`, `FormatMenu`, `EyeDropperButton` (`ff-color-picker`, `ff-color-picker-popover`, `ff-color-swatch-strip`, `ff-color-tile`, …) | HEX, RGB, HSL, and OKLCH formats with alpha, swatches, and eyedropper, inline or in a popover | [ColorPicker](craft.md#color-picker) |
| [Combobox](https://angel-r.github.io/fluid-functionalism-angular/docs/combobox) | `Combobox`, `ComboboxInput`, `ComboboxChips`, `ComboboxContent`, `ComboboxList`, `ComboboxItem`, `ComboboxEmpty`, `ComboboxRow`, `ComboboxFieldControls`, `ComboboxCheckedMarker` (`ff-combobox`, `ff-combobox-input`, `ff-combobox-chips`, `ff-combobox-content`, `ff-combobox-list`, `ff-combobox-item`, `ff-combobox-empty`, `ng-template[ffComboboxRow]`) | Type-to-filter field with keyboard highlight, fluid hover, chips for multiple selection, and a create-from-query row | [Combobox](craft.md#combobox) |
| [CommandMenu](https://angel-r.github.io/fluid-functionalism-angular/docs/command-menu) | `CommandMenu`, `CommandMenuInput`, `CommandMenuTabs`, `CommandMenuFilters`, `CommandMenuList`, `CommandMenuItem`, `CommandMenuEmpty`, `CommandMenuShortcut`, `CommandMenuFooter`, `CommandMenuDialog` (`ff-command-menu`, `ff-command-menu-input`, `ff-command-menu-tabs`, `ff-command-menu-filters`, `ff-command-menu-list`, `ff-command-menu-empty`, `ff-command-menu-footer`, `ff-command-menu-dialog`) | Type to filter a list of actions, arrow through them, press Enter: groups, shortcut caps, suggestions, and a dialog shell on `mod+k` | [CommandMenu](craft.md#command-menu) |
| [DatePicker](https://angel-r.github.io/fluid-functionalism-angular/docs/date-picker) | `DatePicker`, `DatePickerPresets`, `DatePickerTimeField` (`ff-date-picker`, `ff-date-picker-presets`, `ff-date-picker-time-field`) | Field or ghost trigger (`variant`) for a date or a range, with optional `presets`, and editable `time` / `timeRange` fields whose slot lists show each duration; each segment opens its own popover | [DatePicker](craft.md#date-picker) |
| [Dialog](https://angel-r.github.io/fluid-functionalism-angular/docs/dialog) | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` (`ff-dialog`, `[ffDialogTrigger]`, `ff-dialog-content`, `[ffDialogHeader]`, `[ffDialogTitle]`, `[ffDialogDescription]`, `[ffDialogFooter]`, `[ffDialogClose]`) | Modal with spring enter/exit and overlay in 3 widths, the largest a canvas for a sidebar | [Dialog](craft.md#dialog) |
| [Dropdown](https://angel-r.github.io/fluid-functionalism-angular/docs/dropdown) | `Dropdown`, `DropdownMenu`, `DropdownTrigger`, `DropdownContent`, `DropdownLabel`, `DropdownSeparator`, `DropdownSub`, `DropdownSubTrigger`, `DropdownSubContent`, `DropdownSearch`, `DropdownEmpty`, `MenuItem` (`ff-dropdown`, `ff-dropdown-menu`, `[ffDropdownTrigger]`, `ff-dropdown-content`, `ff-dropdown-label`, `ff-dropdown-separator`, `ff-dropdown-sub`, `ff-dropdown-sub-trigger`, `ff-dropdown-sub-content`, `ff-dropdown-search`, `ff-dropdown-empty`, `ff-menu-item`, `[ffMenuItemRow]`) | Menu-style dropdown with fluid hover, animated selection, and an optional search field in the popup (`ff-dropdown-search`) | [Dropdown](craft.md#dropdown) |
| [FileThumbnail](https://angel-r.github.io/fluid-functionalism-angular/docs/input-message) | `FileThumbnail` (`ff-file-thumbnail`) | Read-only square preview of a File: images object-cover, PDFs show an icon, or their first page through an app-provided `FILE_THUMBNAIL_PDF_RENDERER` | [InputMessage](craft.md#input-message) |
| [InputCopy](https://angel-r.github.io/fluid-functionalism-angular/docs/input-copy) | `InputCopy` (`ff-input-copy`) | Read-only input with copy-to-clipboard and animated check feedback | [InputCopy](craft.md#input-copy) |
| [InputGroup](https://angel-r.github.io/fluid-functionalism-angular/docs/input-group) | `InputGroup`, `InputField` (`ff-input-group`, `ff-input-field`) | Input fields with fluid hover, animated labels, and validation | [InputGroup](craft.md#input-group) |
| [InputMessage](https://angel-r.github.io/fluid-functionalism-angular/docs/input-message) | `InputMessage`, `InputMessageFileTile`, `InputMessageSendGlyph`, `InputMessageQueuedRow` (`ff-input-message`, `ff-input-message-file-tile`, `ff-input-message-send-glyph`, `li[ffInputMessageQueuedRow]`) | Chat-style composer with auto-resizing textarea, file drop, action slots, and a built-in send button | [InputMessage](craft.md#input-message) |
| [MobileDrawer](https://angel-r.github.io/fluid-functionalism-angular/docs/sidebar) | `MobileDrawer` (`ff-mobile-drawer`) | Slide-in navigation drawer with scrim, focus trap, and scroll lock | [Sidebar](craft.md#sidebar) |
| [RadioGroup](https://angel-r.github.io/fluid-functionalism-angular/docs/radio-group) | `RadioGroup`, `RadioItem` (`ff-radio-group`, `ff-radio-item`) | Radio buttons with fluid hover and animated selection | [RadioGroup](craft.md#radio-group) |
| [ScrollArea](https://angel-r.github.io/fluid-functionalism-angular/docs/scrollbars) | `ScrollArea`, `ScrollBar` (`ff-scroll-area`, `ff-scroll-bar`) | A scrollbar that stays out of the way but never disappears, with native scroll on touch | [Scrollbars](craft.md#scrollbars) |
| [Select](https://angel-r.github.io/fluid-functionalism-angular/docs/select) | `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator` (`ff-select`, `ff-select-trigger`, `ff-select-content`, `ff-select-item`, `ff-select-group`, `ff-select-label`, `ff-select-separator`) | Animated select with bordered/borderless variants, typeahead, and optional icons | [Select](craft.md#select) |
| [Sidebar](https://angel-r.github.io/fluid-functionalism-angular/docs/sidebar) | `SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarHeader`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarSeparator`, `SidebarInset`, `SidebarRail`, `SidebarTrigger`, `SidebarSheet`, `SidebarInput`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuAction`, `SidebarMenuActions`, `SidebarMenuBadge`, `SidebarMenuSkeleton`, `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuSubButton`, `SidebarMenuRowLabel` (`ff-sidebar-provider`, `ff-sidebar`, `ff-sidebar-content`, `[ffSidebarHeader]`, `[ffSidebarFooter]`, `ff-sidebar-group`, `ff-sidebar-group-label`, `ul[ffSidebarMenu]`, `li[ffSidebarMenuItem]`, … ) | Composable app sidebar: drag its edge to resize, collapse it away or press `[` or `]`, and a drawer on mobile | [Sidebar](craft.md#sidebar) |
| [Slider](https://angel-r.github.io/fluid-functionalism-angular/docs/slider) | `Slider`, `SliderComfortable`, `SliderCompact`, `SliderThumb`, `SliderValueDisplay` (`ff-slider`, `[ffSliderThumb]`, `span[ffSliderValueDisplay]`) | Spring-snapped thumb, step dots, range mode, and a click-to-edit value | [Slider](craft.md#slider) |
| [Switch](https://angel-r.github.io/fluid-functionalism-angular/docs/switch) | `Switch` (`ff-switch`) | Toggle with animated thumb and label | [Switch](craft.md#switch) |
| [Table](https://angel-r.github.io/fluid-functionalism-angular/docs/table) | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` (`ff-table`, `thead[ffTableHeader]`, `tbody[ffTableBody]`, `tr[ffTableRow]`, `th[ffTableHead]`, `td[ffTableCell]`) | Data table with fluid hover on rows and semantic markup | [Table](craft.md#table) |
| [Tabs](https://angel-r.github.io/fluid-functionalism-angular/docs/tabs) | `Tabs`, `TabsList`, `TabItem`, `TabPanel` (`ff-tabs`, `ff-tabs-list`, `button[ffTabItem]`, `ff-tab-panel`) | Segmented control with sliding indicator and fluid hover | [Tabs](craft.md#tabs) |
| [TabsSubtle](https://angel-r.github.io/fluid-functionalism-angular/docs/tabs-subtle) | `TabsSubtle`, `TabsSubtleItem`, `TabsSubtlePanel` (`ff-tabs-subtle`, `button[ffTabsSubtleItem]`, `ff-tabs-subtle-panel`) | Tab navigation with an animated pill indicator | [TabsSubtle](craft.md#tabs-subtle) |
| [ThinkingIndicator](https://angel-r.github.io/fluid-functionalism-angular/docs/thinking-indicator) | `ThinkingIndicator` (`ff-thinking-indicator`) | Animated status indicator with morphing SVG and cycling text | [ThinkingIndicator](craft.md#thinking-indicator) |
| [ThinkingSteps](https://angel-r.github.io/fluid-functionalism-angular/docs/thinking-steps) | `ThinkingSteps`, `ThinkingStepsHeader`, `ThinkingStepsTrigger`, `ThinkingStepsContent`, `ThinkingStepsPanel`, `ThinkingStep`, `ThinkingStepDetails`, `ThinkingStepSources`, `ThinkingStepSource`, `ThinkingStepImage` (`ff-thinking-steps`, `ff-thinking-steps-header`, `ff-thinking-steps-trigger`, `ff-thinking-steps-content`, `ff-thinking-steps-panel`, `ff-thinking-step`, `ff-thinking-step-details`, `ff-thinking-step-sources`, `ff-thinking-step-source`, `ff-thinking-step-image`) | Chain-of-thought display with sequential animation and collapsible steps | [ThinkingSteps](craft.md#thinking-steps) |
| [Tooltip](https://angel-r.github.io/fluid-functionalism-angular/docs/tooltip) | `Tooltip`, `TooltipProvider`, `TooltipGroup`, `TooltipPortalContainer` (`ff-tooltip`, `[ffTooltipProvider]`, `[ffTooltipPortalContainer]`) | Spring-based floating tooltip with configurable placement and an optional follow-cursor axis | [Tooltip](craft.md#tooltip) |

## Systems

Shared infrastructure, shipped inside the same package. Components use it
already; reach for it directly when custom code needs the same behaviour.

| System | What ships | What it does | Craft |
|---|---|---|---|
| [Fluid Hover](https://angel-r.github.io/fluid-functionalism-angular/docs/fluid-hover) | `[ffFluidHover]`, `[ffFluidHoverItem]`, `<ff-fluid-hover-highlight>`, `createFluidHover()`, `pickNearest()` | One highlight per list. It glides to the item nearest the cursor and never blinks off between rows | [Fluid Hover](craft.md#fluid-hover) |
| [Motion](https://angel-r.github.io/fluid-functionalism-angular/docs/motion) | `spring`, `enterTransition()`, `exitTransition()`, `animateFluid()`, `injectAnimateFluid()`, `exitFallbackMs()` | 3 spring speeds (fast, moderate, slow), each with an exit one tier quicker than its entrance | [Motion](craft.md#motion) |
| [Reveal](https://angel-r.github.io/fluid-functionalism-angular/docs/reveal) | `reveal-landing`, `reveal-landing-subtle`, `reveal-product`, `reveal-product-subtle`, `reveal-scroll`, `reveal-swap`, `reveal-items` (CSS in `styles/theme.css`) | 1 class reveals a whole page, on load and on scroll | [Reveal](craft.md#reveal) |
| [Scrollbars](https://angel-r.github.io/fluid-functionalism-angular/docs/scrollbars) | `ScrollArea`, `ScrollBar`, `scroll-fade` / `scroll-divider` CSS | A scrollbar that stays out of the way but never disappears, with native scroll on touch | [Scrollbars](craft.md#scrollbars) |
| [Sizes](https://angel-r.github.io/fluid-functionalism-angular/docs/sizes) | `provideFluid({ size })`, `[ffSizeProvider]`, `injectSize()`, `injectSizeVariant()`, `sizeMap` | 2 sizes, a 36px default and a 28px compact, shared by buttons, inputs, selects, tabs, and rows | [Sizes](craft.md#sizes) |
| [Surfaces](https://angel-r.github.io/fluid-functionalism-angular/docs/surfaces) | `[ffElevated]`, `[ffSurface]`, `injectSurface()`, `surfaceClasses()`, the eight `--surface-*` levels | 8 elevation levels so popovers, dropdowns, and dialogs stay visible at any depth, in light and dark | [Surfaces](craft.md#surfaces) |
| [Typography](https://angel-r.github.io/fluid-functionalism-angular/docs/typography) | `typeClass()`, `typeScale`, `fontWeights`, `injectTypeScale()`, `injectSize().type` / `.field`, the `--fs-*` / `--lh-*` tokens | 6 type roles, each a size and a line height at both ladder steps, plus the 3 weight tokens behind reflow-free weight changes | [Typography](craft.md#typography) |

## Setup

Wiring for a whole app rather than one component.

| Piece | What it is |
|---|---|
| `provideFluid()` | Providers for shape, size and icons. Required by every component. Options: `shape`, `size`, `icons` |
| `provideFluidTheme()` | Starts `ThemeService` (light/dark, `.light`/`.dark` root classes). Options: `defaultTheme`, `shortcut` |
| `[ffShapeProvider]` | Overrides the corner style for a region (`defaultShape` input) |
| `[ffSizeProvider]` | Pins one ladder step for a region (`size` or `defaultSize` input) |
| `[ffElevated]` | Raises a floating surface `offset` steps above its substrate; `shadowLevel` pins the shadow |
| `<ff-icon>` | Every icon slot, by Lucide name or a component from an icon pack |
| Icon packs | `tablerIcons`, `phosphorIcons`, `hugeiconsIcons`, `untitleduiIcons`, passed to `provideFluid({ icons })` or a directive-level `provideIcons()` |

## Blocks

Compositions that ship as one component with every part they use.

| Block | Exported classes (selector) | What it is | Craft |
|---|---|---|---|
| [App Sidebar](https://angel-r.github.io/fluid-functionalism-angular/docs/sidebar) | `AppSidebar` (`ff-app-sidebar`) | A complete app shell: workspace header, search field, collapsible sections with badges, user footer, and an inset topbar | [App Sidebar](craft.md#sidebar-app) |
| [Settings Dialog](https://angel-r.github.io/fluid-functionalism-angular/docs/dialog) | `SettingsDialog` (`ff-settings-dialog`) with `SettingsRow`, `SettingsAppearancePanel`, `SettingsGeneralPanel`, `SettingsMembersPanel`, `SettingsNotificationsPanel`, `SettingsSecurityPanel` | The xl Dialog as a canvas, a Sidebar of sections down its left edge, and a scrolling panel of controls | [Settings Dialog](craft.md#dialog-sidebar) |
| [Queued message stack](https://angel-r.github.io/fluid-functionalism-angular/docs/input-message) | `QueuedStack` (`ff-queued-stack`) | Sonner-style stack of queued composer messages: fan out on hover, drag to reorder, morph into the sent message | [Queued stack](craft.md#queued-stack) |

The sidebar blocks also ship individually: `SidebarWorkspaceHeader`
(`ff-sidebar-workspace-header`), `SidebarUserFooter`
(`ff-sidebar-user-footer`), `SidebarSearchField` (`ff-sidebar-search-field`)
and `SidebarInsetTopbar` (`header[ffSidebarInsetTopbar]`). They are parts of
the complete shell, so use the [App Sidebar craft](craft.md#sidebar-app) plus
the installed source for the part itself.

## Choosing quickly

- App shell / navigation -> the `AppSidebar` block (or `Sidebar` to compose
  your own)
- Settings surface -> the `SettingsDialog` block
- Chat / AI interface -> `InputMessage` + `ChatMessage` + `ThinkingSteps` +
  `ThinkingIndicator` (+ `QueuedStack`, `AskUserQuestions`), and the
  typography rules for the markdown in replies
- Action palette -> `CommandMenu` (dialog shell on `mod+k` included)
- Forms -> `InputGroup`, `Select`, `Combobox`, `CheckboxGroup`, `RadioGroup`,
  `Switch`, `Slider`, `ColorPicker`, `DatePicker`
- Booking, scheduling, availability -> `Calendar` (`booked`, `available`),
  `DatePicker` (ranges, times)
- Data display -> `Table`, `Card` (grid layout has 2-D fluid hover), `Badge`
- Custom list/menu/grid you are writing yourself -> `[ffFluidHover]` +
  `spring`, then follow [custom-motion.md](custom-motion.md)
- Text in custom UI -> `typeClass(role, variant)` or `injectSize().type`, never
  raw px (the [Typography craft](craft.md#typography) says which role)
