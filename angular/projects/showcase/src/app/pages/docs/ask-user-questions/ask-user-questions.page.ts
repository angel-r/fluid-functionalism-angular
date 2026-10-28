// ---------------------------------------------------------------------------
// /docs/ask-user-questions, ported from app/docs/ask-user-questions/page.tsx:
// the playground, then one preview per question-set shape (multiple questions,
// multi-select, other, free text, validation, skip, chip on the left, stacked),
// the controlled example, and the four API tables.
//
// Every preview carries a replay control that remounts the flow (the reference
// bumps a React key); the controlled example also resets its bound index and
// answers, as its own reset does.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AskUserQuestions, type AskUserAnswer, type AskUserQuestion } from '@angel-r/fluid-functionalism-angular';
import { API_REFERENCE } from '../../../docs-kit/api';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';
import { AskUserQuestionsPlayground } from './ask-user-questions-playground';
import {
  PAGE_DESCRIPTION,
  INSTALL_PROPS,
  INSTALL_USAGE,
} from './prompts';
import {
  chipLeftQuestions,
  freeTextQuestions,
  multiSelectQuestions,
  multipleQuestions,
  otherQuestions,
  skipQuestions,
  stackedQuestions,
  validateQuestions,
} from './questions';
import {
  chipLeftCode,
  controlledCode,
  freeTextCode,
  multiSelectCode,
  multipleCode,
  otherCode,
  skipCode,
  stackedCode,
  validateCode,
} from './snippets';

type DemoId =
  | 'multiple'
  | 'multiSelect'
  | 'other'
  | 'freeText'
  | 'validate'
  | 'skip'
  | 'chipLeft'
  | 'stacked'
  | 'controlled';

@Component({
  selector: 'app-ask-user-questions-page',
  imports: [AskUserQuestions, DocPage, DocSection, ComponentPreview, PropsTable, AskUserQuestionsPlayground],
  template: `
    <app-doc-page
      title="AskUserQuestions"
      slug="ask-user-questions"
      [description]="description"
      [installUsage]="installUsage"
      [installProps]="installProps"
    >
      <app-doc-section title="Playground">
        <app-ask-user-questions-playground />
      </app-doc-section>

      <app-doc-section title="Multiple questions">
        <app-component-preview
          [code]="demos.multiple.code"
          align="bottom"
          minHeightClass="min-h-[560px]"
          padding="responsive"
          (replay)="replay('multiple')"
        >
          @for (key of [replayKeys()['multiple']]; track key) {
            <ff-ask-user-questions [questions]="demos.multiple.questions" />
          }
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Multi-select">
        <app-component-preview
          [code]="demos.multiSelect.code"
          align="bottom"
          minHeightClass="min-h-[560px]"
          padding="responsive"
          (replay)="replay('multiSelect')"
        >
          @for (key of [replayKeys()['multiSelect']]; track key) {
            <ff-ask-user-questions [questions]="demos.multiSelect.questions" />
          }
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="With other">
        <app-component-preview
          [code]="demos.other.code"
          align="bottom"
          minHeightClass="min-h-[560px]"
          padding="responsive"
          (replay)="replay('other')"
        >
          @for (key of [replayKeys()['other']]; track key) {
            <ff-ask-user-questions [questions]="demos.other.questions" />
          }
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Free text">
        <app-component-preview
          [code]="demos.freeText.code"
          align="bottom"
          minHeightClass="min-h-[560px]"
          padding="responsive"
          (replay)="replay('freeText')"
        >
          @for (key of [replayKeys()['freeText']]; track key) {
            <ff-ask-user-questions [questions]="demos.freeText.questions" />
          }
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Free text validation">
        <app-component-preview
          [code]="demos.validate.code"
          align="bottom"
          minHeightClass="min-h-[560px]"
          padding="responsive"
          (replay)="replay('validate')"
        >
          @for (key of [replayKeys()['validate']]; track key) {
            <ff-ask-user-questions [questions]="demos.validate.questions" />
          }
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Skippable">
        <app-component-preview
          [code]="demos.skip.code"
          align="bottom"
          minHeightClass="min-h-[560px]"
          padding="responsive"
          (replay)="replay('skip')"
        >
          @for (key of [replayKeys()['skip']]; track key) {
            <ff-ask-user-questions [questions]="demos.skip.questions" />
          }
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Chip on left">
        <app-component-preview
          [code]="demos.chipLeft.code"
          align="bottom"
          minHeightClass="min-h-[560px]"
          padding="responsive"
          (replay)="replay('chipLeft')"
        >
          @for (key of [replayKeys()['chipLeft']]; track key) {
            <ff-ask-user-questions [questions]="demos.chipLeft.questions" />
          }
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Stacked layout">
        <app-component-preview
          [code]="demos.stacked.code"
          align="bottom"
          minHeightClass="min-h-[560px]"
          padding="responsive"
          (replay)="replay('stacked')"
        >
          @for (key of [replayKeys()['stacked']]; track key) {
            <ff-ask-user-questions [questions]="demos.stacked.questions" />
          }
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Controlled">
        <app-component-preview
          [code]="demos.controlled.code"
          align="bottom"
          minHeightClass="min-h-[560px]"
          padding="responsive"
          (replay)="replay('controlled')"
        >
          @for (key of [replayKeys()['controlled']]; track key) {
            <ff-ask-user-questions
              [questions]="demos.controlled.questions"
              [(currentIndex)]="index"
              [(answers)]="answers"
              (complete)="index.set(0)"
            />
          }
        </app-component-preview>
      </app-doc-section>

      @for (table of api; track table.title) {
        <app-doc-section [title]="'API Reference — ' + table.title">
          <app-props-table [props]="table.props" />
        </app-doc-section>
      }
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AskUserQuestionsPage {
  protected readonly description = PAGE_DESCRIPTION;
  protected readonly installUsage = INSTALL_USAGE;
  protected readonly installProps = INSTALL_PROPS;

  /** Each preview's questions and the Angular snippet its Code tab shows. */
  protected readonly demos: Record<DemoId, { code: string; questions: AskUserQuestion[] }> = {
    multiple: { code: multipleCode, questions: multipleQuestions },
    multiSelect: { code: multiSelectCode, questions: multiSelectQuestions },
    other: { code: otherCode, questions: otherQuestions },
    freeText: { code: freeTextCode, questions: freeTextQuestions },
    validate: { code: validateCode, questions: validateQuestions },
    skip: { code: skipCode, questions: skipQuestions },
    chipLeft: { code: chipLeftCode, questions: chipLeftQuestions },
    stacked: { code: stackedCode, questions: stackedQuestions },
    controlled: { code: controlledCode, questions: multipleQuestions },
  };

  protected readonly api = API_REFERENCE['ask-user-questions'];

  /** Kept across a replay of the controlled example, and reset by it. */
  protected readonly index = signal(0);
  protected readonly answers = signal<Record<string, AskUserAnswer>>({});

  /** One counter per preview: bumping it remounts that flow from question 1. */
  protected readonly replayKeys = signal<Record<DemoId, number>>({
    multiple: 0,
    multiSelect: 0,
    other: 0,
    freeText: 0,
    validate: 0,
    skip: 0,
    chipLeft: 0,
    stacked: 0,
    controlled: 0,
  });

  protected replay(id: DemoId): void {
    if (id === 'controlled') {
      this.index.set(0);
      this.answers.set({});
    }
    this.replayKeys.update((keys) => ({ ...keys, [id]: keys[id] + 1 }));
  }
}
