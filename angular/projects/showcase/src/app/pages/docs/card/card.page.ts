import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CARD_PARTS, Switch } from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import {
  PLAY_SWITCH,
  PlayDivider,
  PlayField,
  PlaySection,
  PlaySelect,
  PlaygroundLayout,
  PlaygroundPanel,
} from '../../../docs-kit/playground';
import { PropsTable } from '../../../docs-kit/props-table';
import { GetCodeDialog } from '../../../docs-kit/preset/get-code-dialog';
import { injectPresetGlobals } from '../../../docs-kit/preset/preset-globals';
import { usePresetUrl } from '../../../docs-kit/preset/preset-url';
import { buttonProps, cardProps, groupProps, partProps } from '../../../docs-kit/api/card';
import { buildCardInstallSnippet } from './card-install';
import { buildCardPlaygroundCode, type CardPlaygroundView } from './card-playground';
import {
  CARD_BANNER,
  CARD_DEFAULT_CODE,
  CARD_ITEMS,
  CARD_PRESET_DEF,
  CARD_THUMB,
  DEFAULT_CARD_STATE,
  decodeCardPreset,
  encodeCardPreset,
  type CardBorder,
  type CardColumns,
  type CardMediaKind,
  type CardOrientation,
  type CardPreset,
} from './card-options';

// ── Code snippets ────────────────────────────────────────

const basicCode = `import { CARD_PARTS } from '@angel-r/fluid-functionalism-angular';

<!-- Borderless inline list: icon + a ghost action, divided by hairlines. -->
<div class="w-full max-w-[520px]">
  <ff-card-group orientation="inline">
    <ff-card (cardClick)="open(item)">
      <ff-card-media icon="circle" />
      <div ffCardHeader>
        <span ffCardTitle>Fluid motion</span>
        <p ffCardDescription>Spring-tuned transitions across three tiers</p>
      </div>
      <div ffCardFooter>
        <button ffCardButton>Connect</button>
      </div>
    </ff-card>
    <!-- …three more -->
  </ff-card-group>
</div>`;

const gridCode = `import { CARD_PARTS } from '@angel-r/fluid-functionalism-angular';

<!-- Two-column grid of image tiles — columns > 1 turns on 2-D
     fluid hover: the highlight springs to the nearest card across rows AND
     columns. -->
<div class="w-full max-w-[560px]">
  <ff-card-group [columns]="2" border="outlined" separated>
    <ff-card (cardClick)="open(item)">
      <img ffCardImage [src]="banner" />
      <div ffCardHeader>
        <span ffCardTitle>Fluid motion</span>
        <p ffCardDescription>Spring-tuned transitions…</p>
      </div>
      <div ffCardFooter>
        <button ffCardButton variant="primary">Get started</button>
        <button ffCardButton variant="secondary">Learn more</button>
      </div>
    </ff-card>
    <!-- …three more -->
  </ff-card-group>
</div>`;

const outlinedCode = `import { CARD_PARTS } from '@angel-r/fluid-functionalism-angular';

<!-- One shared outlined frame, rows split by dividers: logo + primary. -->
<div class="w-full max-w-[520px]">
  <ff-card-group orientation="inline" border="outlined">
    <ff-card (cardClick)="open(item)">
      <ff-card-media [logo]="logo" />
      <div ffCardHeader>
        <span ffCardTitle>Fluid motion</span>
        <p ffCardDescription>Spring-tuned transitions across three tiers</p>
      </div>
      <div ffCardFooter>
        <button ffCardButton variant="primary">Get started</button>
      </div>
    </ff-card>
    <!-- ff-card-media also accepts a [logo] tuple for a connected pair -->
  </ff-card-group>
</div>`;

const separatedCode = `import { CARD_PARTS } from '@angel-r/fluid-functionalism-angular';

<!-- Separated inline tiles with a full-height image; the action
     row drops below the text (primary, secondary, ghost). -->
<div class="w-full max-w-[560px]">
  <ff-card-group orientation="inline" separated>
    <ff-card (cardClick)="open(item)">
      <img ffCardImage [src]="banner" />
      <div ffCardHeader>
        <span ffCardTitle>Fluid motion</span>
        <p ffCardDescription>Spring-tuned transitions…</p>
      </div>
      <div ffCardFooter>
        <button ffCardButton variant="primary">Get started</button>
        <button ffCardButton variant="secondary">Learn more</button>
        <button ffCardButton>Connect</button>
      </div>
    </ff-card>
    <!-- …three more -->
  </ff-card-group>
</div>`;

const promoCode = `import { CARD_PARTS } from '@angel-r/fluid-functionalism-angular';

<!-- The composition is tuned to a narrow 300px column. -->
<div class="w-full max-w-[300px]">
  <ff-card dismissible (dismiss)="dismissed.set(true)"
    class="border border-border/60 overflow-hidden rounded-xl">
    <img ffCardImage [src]="banner" />
    <div ffCardHeader>
      <span ffCardTitle>Meet the new Card component</span>
    </div>
    <div ffCardContent class="flex flex-col gap-3">
      <ff-card-feature icon="paintbrush" title="Always pixel-perfect"
        description="Renders your design exactly — token-driven and crisp in light and dark, at any radius" />
      <ff-card-feature icon="square-library" title="Stacked, inline, or grid"
        description="One compositional API — borderless by default, with separated tiles or a shared frame" />
    </div>
    <div ffCardFooter>
      <button ffCardButton variant="primary">Get started</button>
      <button ffCardButton variant="ghost">Learn more</button>
    </div>
  </ff-card>
</div>`;

const selectedCode = `import { CARD_PARTS } from '@angel-r/fluid-functionalism-angular';

<!-- Clickable selection — one active card carries the fill, its
     title bolds, and the group drops the dividers around it. -->
<div class="w-full max-w-[520px]">
  <ff-card-group orientation="inline">
    @for (feature of features; track feature.title; let i = $index) {
      <ff-card
        [label]="feature.title"
        [selected]="selected() === i"
        (cardClick)="selected.set(i)"
      >
        <ff-card-media [icon]="feature.icon" />
        <div ffCardHeader>
          <span ffCardTitle>{{ feature.title }}</span>
          <p ffCardDescription>{{ feature.description }}</p>
        </div>
      </ff-card>
    }
  </ff-card-group>
</div>`;

const installUsage = `<ff-card-group orientation="inline">
  <ff-card [label]="item.title" (cardClick)="open(item)">
    <ff-card-media icon="circle" />
    <div ffCardHeader>
      <span ffCardTitle>Fluid motion</span>
      <p ffCardDescription>Spring-tuned transitions across three tiers</p>
    </div>
    <div ffCardFooter><button ffCardButton>Connect</button></div>
  </ff-card>
</ff-card-group>`;

const installProps: readonly string[] = [
  'cardClick: () => void. Binding it makes the whole card a clickable target (a stretched button).',
  'href: string. Makes the whole card a link (a stretched anchor).',
  'selected: boolean (default false). Persistent selected fill and title emphasis on top of fluid hover.',
  'disabled: boolean (default false). Dims and disables the card.',
  'dismissible: boolean (default false). Shows a dismiss button, revealed on hover or focus.',
  'dismiss: () => void. Emitted when the dismiss button is pressed.',
  'ff-card-group orientation: "card" | "inline" (default "card"). Stacked layout or a horizontal row.',
  'ff-card-group columns: number (default 1). Grid columns; more than 1 enables 2-D fluid hover.',
  'ff-card-group border: "none" | "outlined" (default "none"). Borderless with dividers, or a drawn border.',
  'ff-card-group separated: boolean (default false). Individually shaped tiles with a gap instead of one divided block.',
  'Iterate with @for over ff-card inside ff-card-group; every card registers its own fluid hover index.',
];

/** The reference's `pick`: four controls roll from one list each. */
function pick<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

@Component({
  selector: 'app-card-page',
  imports: [
    DocPage,
    DocSection,
    ComponentPreview,
    PropsTable,
    PlaygroundLayout,
    PlaygroundPanel,
    PlayField,
    PlaySelect,
    PlaySection,
    PlayDivider,
    GetCodeDialog,
    Switch,
    CARD_PARTS,
  ],
  templateUrl: './card.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CardPage {
  // ── Playground (per-card props) ──
  protected readonly media = signal<CardMediaKind>(DEFAULT_CARD_STATE.media);
  protected readonly description = signal(DEFAULT_CARD_STATE.description);
  protected readonly primaryBtn = signal(DEFAULT_CARD_STATE.primaryBtn);
  protected readonly secondaryBtn = signal(DEFAULT_CARD_STATE.secondaryBtn);
  protected readonly ghostBtn = signal(DEFAULT_CARD_STATE.ghostBtn);
  // ── Playground (group / layout props) ──
  protected readonly orientation = signal<CardOrientation>(DEFAULT_CARD_STATE.orientation);
  protected readonly columns = signal(String(DEFAULT_CARD_STATE.columns));
  protected readonly border = signal<CardBorder>(DEFAULT_CARD_STATE.border);
  protected readonly separated = signal(DEFAULT_CARD_STATE.separated);
  protected readonly fluidHover = signal(DEFAULT_CARD_STATE.fluidHover);
  protected readonly selectedOn = signal(DEFAULT_CARD_STATE.selected);
  protected readonly selectedIndex = signal(0);

  protected readonly presetDef = CARD_PRESET_DEF;
  protected readonly playSwitch = PLAY_SWITCH;
  protected readonly banner = CARD_BANNER;
  protected readonly thumb = CARD_THUMB;
  protected readonly features = CARD_ITEMS.slice(0, 4);
  protected readonly cardProps = cardProps;
  protected readonly groupProps = groupProps;
  protected readonly partProps = partProps;
  protected readonly buttonProps = buttonProps;
  protected readonly basicCode = basicCode;
  protected readonly gridCode = gridCode;
  protected readonly outlinedCode = outlinedCode;
  protected readonly separatedCode = separatedCode;
  protected readonly promoCode = promoCode;
  protected readonly selectedCode = selectedCode;
  protected readonly installUsage = installUsage;
  protected readonly installProps = installProps;

  protected readonly mediaOptions = [
    { value: 'icon', label: 'Icon' },
    { value: 'logo', label: 'Logo' },
    { value: 'image', label: 'Image' },
    { value: 'none', label: 'None' },
  ];
  protected readonly orientationOptions = [
    { value: 'card', label: 'Card' },
    { value: 'inline', label: 'Inline' },
  ];
  protected readonly columnOptions = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
  ];
  protected readonly borderOptions = [
    { value: 'none', label: 'None' },
    { value: 'outlined', label: 'Outlined' },
  ];

  // ── Demos ──
  protected readonly demoSelected = signal(1);
  protected readonly promoDismissed = signal(false);

  private readonly globals = injectPresetGlobals();
  private readonly defaultPresetCode = signal(CARD_DEFAULT_CODE);

  protected readonly isInline = computed(() => this.orientation() === 'inline');
  /** Inline cards are a full-width list — a multi-column grid crams them until
   *  the media, wrapped title and footer collide. Force a single column there. */
  protected readonly cols = computed(() => (this.isInline() ? 1 : Number(this.columns())));
  /** 3 columns fills two even rows (6); every other layout stays at 4. */
  protected readonly items = computed(() => CARD_ITEMS.slice(0, this.cols() === 3 ? 6 : 4));
  /** A selection made while more items were shown (cols 3 → 6) would otherwise
   *  point past a now-shorter list; clamp so the selection stays visible. */
  protected readonly activeSelected = computed(() => Math.min(this.selectedIndex(), this.items().length - 1));
  protected readonly isImage = computed(() => this.media() === 'image');
  protected readonly isSmall = computed(() => this.media() === 'icon' || this.media() === 'logo');
  /** The prominent image needs each card to clip it to its own rounded corners,
   *  so it only reads right on separated tiles — Separated is forced on. */
  protected readonly effectiveSeparated = computed(() => this.isImage() || this.separated());

  /** Stacked order: primary → secondary → ghost (primary on the left). A plain
   *  inline row reverses it so the primary sits on the right; an inline image
   *  card drops the actions below the text, where they keep the natural order. */
  protected readonly footerButtons = computed(() => {
    const buttons: { variant: 'primary' | 'secondary' | 'ghost'; label: string }[] = [];
    if (this.primaryBtn()) buttons.push({ variant: 'primary', label: 'Get started' });
    if (this.secondaryBtn()) buttons.push({ variant: 'secondary', label: 'Learn more' });
    if (this.ghostBtn()) buttons.push({ variant: 'ghost', label: 'Connect' });
    return this.isInline() && !this.isImage() ? [...buttons].reverse() : buttons;
  });

  private readonly view = computed<CardPlaygroundView>(() => ({
    orientation: this.orientation(),
    cols: this.cols(),
    border: this.border(),
    separated: this.effectiveSeparated(),
    fluidHover: this.fluidHover(),
    media: this.media(),
    description: this.description(),
    primaryBtn: this.primaryBtn(),
    secondaryBtn: this.secondaryBtn(),
    ghostBtn: this.ghostBtn(),
    selected: this.selectedOn(),
  }));

  /** The RAW rail values are encoded: the derived constraints (image forces
   *  Separated, inline forces one column) re-apply on decode and in the
   *  generators. Shape and size ride along from the site settings. */
  protected readonly preset = computed<CardPreset>(() => ({
    media: this.media(),
    description: this.description(),
    primaryBtn: this.primaryBtn(),
    secondaryBtn: this.secondaryBtn(),
    ghostBtn: this.ghostBtn(),
    orientation: this.orientation(),
    columns: Number(this.columns()) as CardColumns,
    border: this.border(),
    separated: this.separated(),
    fluidHover: this.fluidHover(),
    selected: this.selectedOn(),
    ...this.globals(),
  }));

  protected readonly presetCode = computed(() => encodeCardPreset(this.preset()));
  protected readonly installSnippet = computed(() => buildCardInstallSnippet(this.preset()));
  protected readonly code = computed(() => buildCardPlaygroundCode(this.view(), this.globals()));

  constructor() {
    usePresetUrl(this.presetCode, this.defaultPresetCode, (raw) => this.loadPreset(raw));
  }

  protected setMedia(value: string): void {
    this.media.set(value as CardMediaKind);
  }

  protected setOrientation(value: string): void {
    this.orientation.set(value as CardOrientation);
  }

  protected setColumns(value: string): void {
    this.columns.set(value);
  }

  protected setBorder(value: string): void {
    this.border.set(value as CardBorder);
  }

  protected onCardClick(index: number): void {
    if (this.selectedOn()) this.selectedIndex.set(index);
  }

  /** The reference's empty `onClick` on demo cards: a click target with
   *  nowhere to go, so the fluid hover has something to light. */
  protected noop(): void {}

  /** Roll the whole panel; the derived constraints still apply on top. */
  protected shuffle(): void {
    this.media.set(pick(['icon', 'logo', 'image', 'none'] as const));
    this.description.set(Math.random() > 0.25);
    this.primaryBtn.set(Math.random() > 0.4);
    this.secondaryBtn.set(Math.random() > 0.6);
    this.ghostBtn.set(Math.random() > 0.6);
    this.selectedOn.set(Math.random() > 0.6);
    this.selectedIndex.set(Math.floor(Math.random() * 4));
    this.orientation.set(pick(['card', 'inline'] as const));
    this.columns.set(pick(['1', '2', '3'] as const));
    this.border.set(pick(['none', 'outlined'] as const));
    this.separated.set(Math.random() > 0.5);
    this.fluidHover.set(Math.random() > 0.2);
  }

  /** A pasted `?preset=` code of this component; foreign or newer codes leave
   *  the playground at its defaults (the codec fails loudly, the page stays). */
  private loadPreset(raw: string): void {
    const result = decodeCardPreset(raw);
    if (!result.ok) return;
    const preset: CardPreset = result.preset;
    this.media.set(preset.media);
    this.description.set(preset.description);
    this.primaryBtn.set(preset.primaryBtn);
    this.secondaryBtn.set(preset.secondaryBtn);
    this.ghostBtn.set(preset.ghostBtn);
    this.orientation.set(preset.orientation);
    this.columns.set(String(preset.columns));
    this.border.set(preset.border);
    this.separated.set(preset.separated);
    this.fluidHover.set(preset.fluidHover);
    this.selectedOn.set(preset.selected);
  }
}
