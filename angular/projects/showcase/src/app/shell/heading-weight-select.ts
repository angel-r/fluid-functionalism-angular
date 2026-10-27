// ---------------------------------------------------------------------------
// The custom heading family's weight: Auto (the role weights: 550, display
// 700) or any weight the family has. Ported from lib/docs/heading-font.tsx
// (HeadingWeightSelect); it renders nothing unless a Google Fonts family is the
// heading font.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@angel-r/fluid-functionalism-angular';
import { HeadingFontService } from '../site/heading-font';
import { WEIGHT_NAMES, googleFontWeights } from '../site/google-fonts';

/** "Auto" in the weight select. */
const AUTO = 'auto';

@Component({
  selector: 'app-heading-weight-select',
  // The host stands in for React's fragment/root element: contents keeps it
  // out of the layout its children measured themselves against.
  host: { style: 'display: contents' },
  imports: [Select, SelectTrigger, SelectContent, SelectItem],
  template: `
    @if (weights(); as weights) {
      <ff-select [value]="value()" (valueChange)="setWeight($event)">
        <ff-select-trigger variant="borderless" aria-label="Heading weight" [class]="userClass()" />
        <ff-select-content>
          <ff-select-item [index]="0" [value]="auto">Auto</ff-select-item>
          @for (weight of weights; track weight; let i = $index) {
            <ff-select-item [index]="i + 1" [value]="weight.key">{{ weight.label }}</ff-select-item>
          }
        </ff-select-content>
      </ff-select>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeadingWeightSelect {
  /** Classes for the trigger button (the React `triggerClassName`). */
  readonly userClass = input('', { alias: 'class' });

  protected readonly auto = AUTO;
  private readonly heading = inject(HeadingFontService);

  /** The family's weights, or null while no custom family is the heading. */
  protected readonly weights = computed(() => {
    const custom = this.heading.custom();
    if (this.heading.font() !== 'custom' || !custom) return null;
    return googleFontWeights(custom).map((weight) => ({
      key: String(weight),
      label: `${WEIGHT_NAMES[weight] ?? 'Weight'} ${weight}`,
    }));
  });

  protected readonly value = computed(() => {
    const weight = this.heading.weight();
    return weight === null ? AUTO : String(weight);
  });

  protected setWeight(value: string): void {
    this.heading.setWeight(value === AUTO ? null : Number(value));
  }
}
