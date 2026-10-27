import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AskUserQuestions, Button, type AskUserAnswer, type AskUserQuestion } from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';
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

interface Example {
  title: string;
  questions: AskUserQuestion[];
}

@Component({
  selector: 'app-ask-user-questions-demo',
  imports: [DemoPage, DemoSection, AskUserQuestions, Button],
  template: `
    <app-demo-page
      title="AskUserQuestions"
      description="Stepped question flow with 2–5 options, single or multi-select, inline 'other' input, optional skip, and multi-question navigation."
    >
      <!-- The stage holds only the component, like the React preview body; the
           replay/reset controls sit below it (React has them in the preview header). -->
      @for (example of examples; track example.title; let i = $index) {
        <div class="flex flex-col gap-3">
          <app-demo-section [title]="example.title">
            <!-- Re-keyed on replay, so the flow remounts from the start. -->
            @for (key of [replay()[i]]; track key) {
              <ff-ask-user-questions [questions]="example.questions" />
            }
          </app-demo-section>
          <div class="flex justify-end">
            <button ffButton variant="tertiary" size="compact" leadingIcon="rotate-ccw" (click)="replayExample(i)">
              Replay
            </button>
          </div>
        </div>
      }

      <div class="flex flex-col gap-3">
        <app-demo-section title="Controlled">
          <ff-ask-user-questions
            [questions]="controlledQuestions"
            [(currentIndex)]="index"
            [(answers)]="answers"
            (complete)="index.set(0)"
          />
        </app-demo-section>
        <div class="flex items-center justify-end gap-3">
          <span class="text-site-caption text-muted-foreground">
            Question {{ index() + 1 }} · {{ answeredCount() }} answered
          </span>
          <button ffButton variant="tertiary" size="compact" leadingIcon="rotate-ccw" (click)="reset()">Reset</button>
        </div>
      </div>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AskUserQuestionsDemo {
  protected readonly examples: Example[] = [
    { title: 'Multiple questions', questions: multipleQuestions },
    { title: 'Multi-select', questions: multiSelectQuestions },
    { title: 'With other', questions: otherQuestions },
    { title: 'Free text', questions: freeTextQuestions },
    { title: 'Free text validation', questions: validateQuestions },
    { title: 'Skippable', questions: skipQuestions },
    { title: 'Chip on left', questions: chipLeftQuestions },
    { title: 'Stacked layout', questions: stackedQuestions },
  ];
  protected readonly replay = signal(this.examples.map(() => 0));

  protected readonly controlledQuestions = multipleQuestions;
  protected readonly index = signal(0);
  protected readonly answers = signal<Record<string, AskUserAnswer>>({});

  protected replayExample(i: number) {
    this.replay.update((keys) => keys.map((k, j) => (j === i ? k + 1 : k)));
  }

  protected answeredCount() {
    return Object.values(this.answers()).filter((a) => !a.skipped).length;
  }

  protected reset() {
    this.index.set(0);
    this.answers.set({});
  }
}
