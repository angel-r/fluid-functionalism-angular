// ---------------------------------------------------------------------------
// The /docs/ask-user-questions playground, ported from
// lib/docs/playgrounds/ask-user-questions.tsx: the controls rebuild a real
// question flow (remounting it so the flow restarts from question 1), while the
// Code tab keeps the matching Angular snippet in sync.
//
// The controls render in the right rail at >=1280px and under the preview
// below that (PlaygroundLayout). The last row is the installable preset's
// "Copy prompt" (D5): the same questions literal the Code tab shows, wrapped in
// a ready-to-paste Angular component.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { AskUserQuestions, Switch, type AskUserQuestion } from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import {
  PLAY_SWITCH,
  PlayDivider,
  PlayField,
  PlaySection,
  PlaySelect,
  PlaygroundLayout,
  PlaygroundPanel,
} from '../../../docs-kit/playground';
import { GetCodeDialog } from '../../../docs-kit/preset/get-code-dialog';
import { injectPresetGlobals } from '../../../docs-kit/preset/preset-globals';
import { usePresetUrl } from '../../../docs-kit/preset/preset-url';
import { INSTALL_PROPS, PAGE_DESCRIPTION } from './prompts';
import {
  AUQ_DEFAULT_CODE,
  AUQ_FREE_TEXT_QUESTIONS,
  AUQ_OPTION_QUESTIONS,
  AUQ_OTHER_PLACEHOLDER,
  AUQ_PRESET_DEF,
  decodeAuqPreset,
  encodeAuqPreset,
  type AskUserQuestionsPlayState,
} from './preset-options';
import { buildSnippet } from './snippets';

type PlayType = 'options' | 'freeText';
type PlayLayout = 'inline' | 'stacked';
type PlayChip = 'right' | 'left';

function buildQuestions(config: AskUserQuestionsPlayState): AskUserQuestion[] {
  if (config.type === 'freeText') {
    return AUQ_FREE_TEXT_QUESTIONS.slice(0, config.count).map((q) => ({
      id: q.id,
      title: q.title,
      freeText: true,
      freeTextMultiline: config.multiline ? undefined : false,
      freeTextPlaceholder: q.placeholder,
      skippable: config.skippable ? undefined : false,
    }));
  }
  return AUQ_OPTION_QUESTIONS.slice(0, config.count).map((q) => ({
    id: q.id,
    title: q.title,
    layout: config.layout === 'stacked' ? ('stacked' as const) : undefined,
    chipPosition: config.chip === 'left' ? ('left' as const) : undefined,
    multiSelect: config.multiSelect || undefined,
    allowOther: config.allowOther || undefined,
    otherPlaceholder: config.allowOther ? AUQ_OTHER_PLACEHOLDER : undefined,
    skippable: config.skippable ? undefined : false,
    options: q.options.map((option) => ({
      id: option.id,
      title: option.title,
      description: config.layout === 'stacked' ? option.long : option.short,
    })),
  }));
}

@Component({
  selector: 'app-ask-user-questions-playground',
  imports: [
    AskUserQuestions,
    Switch,
    ComponentPreview,
    PlayField,
    PlaySelect,
    PlaySection,
    PlayDivider,
    PlaygroundPanel,
    PlaygroundLayout,
    GetCodeDialog,
  ],
  template: `
    <app-playground-layout [preview]="preview" [controls]="controls" />

    <ng-template #preview>
      <app-component-preview
        [code]="code()"
        align="bottom"
        minHeightClass="min-h-[560px]"
        padding="responsive"
        (replay)="replay()"
      >
        @for (key of flowKeys(); track key) {
          <ff-ask-user-questions [questions]="questions()" />
        }
      </app-component-preview>
    </ng-template>

    <ng-template #controls>
      <app-playground-panel (shuffle)="randomize()">
        <app-play-section label="Question" />
        <div>
          <app-play-field label="Type">
            <app-play-select [value]="type()" [options]="typeOptions" (valueChange)="type.set($any($event))" />
          </app-play-field>
          <app-play-field label="Layout" [disabled]="isFreeText()">
            <app-play-select [value]="layout()" [options]="layoutOptions" (valueChange)="layout.set($any($event))" />
          </app-play-field>
          <app-play-field label="Chip position" [disabled]="isFreeText()">
            <app-play-select [value]="chip()" [options]="chipOptions" (valueChange)="chip.set($any($event))" />
          </app-play-field>
          <ff-switch
            label="Multi-select"
            [checked]="multiSelect()"
            (toggle)="multiSelect.set(!multiSelect())"
            [disabled]="isFreeText()"
            [class]="playSwitch"
          />
          <ff-switch
            label="Allow other"
            [checked]="allowOther()"
            (toggle)="allowOther.set(!allowOther())"
            [disabled]="isFreeText()"
            [class]="playSwitch"
          />
          <ff-switch
            label="Multiline"
            [checked]="multiline()"
            (toggle)="multiline.set(!multiline())"
            [disabled]="!isFreeText()"
            [class]="playSwitch"
          />
        </div>

        <app-play-divider />
        <app-play-section label="Flow" />
        <div>
          <app-play-field label="Questions">
            <app-play-select [value]="count()" [options]="countOptions" (valueChange)="count.set($event)" />
          </app-play-field>
          <ff-switch
            label="Skippable"
            [checked]="skippable()"
            (toggle)="skippable.set(!skippable())"
            [class]="playSwitch"
          />
        </div>
        <app-play-divider />
        <!-- shadcn's preset principle: the exact configuration above, as a
             stateless code the playground can turn into an installable flow. -->
        <app-get-code-dialog
          [def]="def"
          [code]="presetCode()"
          [snippet]="installSnippet()"
          [props]="installProps"
          [description]="pageDescription"
        />
      </app-playground-panel>
    </ng-template>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AskUserQuestionsPlayground {
  private readonly globals = injectPresetGlobals();

  protected readonly type = signal<PlayType>('options');
  protected readonly layout = signal<PlayLayout>('inline');
  protected readonly chip = signal<PlayChip>('right');
  protected readonly multiSelect = signal(false);
  protected readonly allowOther = signal(false);
  protected readonly multiline = signal(true);
  protected readonly count = signal('3');
  protected readonly skippable = signal(true);

  /** Bumped by Replay (and shuffle) so the flow restarts even when the
   *  configuration itself didn't change. */
  private readonly replaySeed = signal(0);

  protected readonly playSwitch = PLAY_SWITCH;
  protected readonly def = AUQ_PRESET_DEF;
  protected readonly installProps = INSTALL_PROPS;
  protected readonly pageDescription = PAGE_DESCRIPTION;

  protected readonly typeOptions = [
    { value: 'options', label: 'Options' },
    { value: 'freeText', label: 'Free text' },
  ];
  protected readonly layoutOptions = [
    { value: 'inline', label: 'Inline' },
    { value: 'stacked', label: 'Stacked' },
  ];
  protected readonly chipOptions = [
    { value: 'right', label: 'Right' },
    { value: 'left', label: 'Left' },
  ];
  protected readonly countOptions = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
  ];

  protected readonly isFreeText = computed(() => this.type() === 'freeText');

  private readonly config = computed<AskUserQuestionsPlayState>(() => ({
    type: this.type(),
    layout: this.layout(),
    chip: this.chip(),
    multiSelect: this.multiSelect(),
    allowOther: this.allowOther(),
    multiline: this.multiline(),
    count: Number(this.count()) as 1 | 2 | 3,
    skippable: this.skippable(),
  }));

  protected readonly questions = computed(() => buildQuestions(this.config()));
  protected readonly code = computed(() => buildSnippet({ questions: this.questions() }));
  /** The same configuration for the install prompt, with the site's shape and
   *  size pinned in `provideFluid()`. */
  protected readonly installSnippet = computed(() =>
    buildSnippet({ questions: this.questions(), providers: this.globals() }),
  );

  /** Preset code: ?preset= reopens this configuration; Get code installs it. */
  protected readonly presetCode = computed(() => encodeAuqPreset({ ...this.config(), ...this.globals() }));

  /** The flow holds internal step/answer state, so any configuration change
   *  remounts it — a half-answered flow against freshly swapped questions
   *  would be incoherent. */
  protected readonly flowKeys = computed(() => [`${JSON.stringify(this.config())}|${this.replaySeed()}`]);

  constructor() {
    usePresetUrl(this.presetCode, computed(() => AUQ_DEFAULT_CODE), (raw) => {
      const res = decodeAuqPreset(raw);
      if (!res.ok) return;
      const preset = res.preset;
      this.type.set(preset.type);
      this.layout.set(preset.layout);
      this.chip.set(preset.chip);
      this.multiSelect.set(preset.multiSelect);
      this.allowOther.set(preset.allowOther);
      this.multiline.set(preset.multiline);
      this.count.set(String(preset.count));
      this.skippable.set(preset.skippable);
    });
  }

  protected replay(): void {
    this.replaySeed.update((seed) => seed + 1);
  }

  protected randomize(): void {
    const pick = <T>(values: readonly T[]): T => values[Math.floor(Math.random() * values.length)];
    this.type.set(pick(['options', 'options', 'options', 'freeText'] as const));
    this.layout.set(pick(['inline', 'inline', 'stacked'] as const));
    this.chip.set(pick(['right', 'right', 'left'] as const));
    this.multiSelect.set(Math.random() > 0.6);
    this.allowOther.set(Math.random() > 0.7);
    this.multiline.set(Math.random() > 0.3);
    this.count.set(pick(['1', '2', '3'] as const));
    this.skippable.set(Math.random() > 0.2);
    // Shuffle restarts the flow too, as the reference's does.
    this.replaySeed.update((seed) => seed + 1);
  }
}
