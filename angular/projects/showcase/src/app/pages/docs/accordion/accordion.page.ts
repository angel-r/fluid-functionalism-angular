import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  Accordion,
  AccordionContent,
  AccordionGroup,
  AccordionItem,
  AccordionTrigger,
  Switch,
} from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PLAY_SWITCH, PlayField, PlaySelect, PlaygroundLayout, PlaygroundPanel } from '../../../docs-kit/playground';
import { PropsTable } from '../../../docs-kit/props-table';
import { injectPresetGlobals } from '../../../docs-kit/preset/preset-globals';
import { contentProps, itemProps, rootProps, triggerProps } from '../../../docs-kit/api/accordion';
import { ACCORDION_ITEMS } from '../../home/demo-data';
import {
  DEFAULT_ACCORDION_STATE,
  buildAccordionPlaygroundCode,
  randomAccordionState,
  type AccordionExpand,
} from './accordion-playground';

interface DemoSection {
  value: string;
  title: string;
  body: string;
}

const singleSections: DemoSection[] = [
  {
    value: 'item-1',
    title: 'Getting Started',
    body: 'Install the component and import it into your project. The accordion supports both single and multiple expand modes.',
  },
  {
    value: 'item-2',
    title: 'Styling',
    body: 'The component integrates with the shape system for pill or rounded border-radius variants. All animations use spring physics.',
  },
  {
    value: 'item-3',
    title: 'Accessibility',
    body: 'Built on Radix UI or Base UI Accordion (your pick) with WAI-ARIA attributes, keyboard navigation, and focus management.',
  },
  {
    value: 'item-4',
    title: 'Animation',
    body: 'Smooth height transitions and spring-animated chevron rotation. The fluid hover background tracks your cursor.',
  },
];

const multipleSections: DemoSection[] = [
  { value: 'item-1', title: 'First Section', body: 'Multiple items can be expanded at the same time.' },
  { value: 'item-2', title: 'Second Section', body: 'Click any trigger to expand or collapse independently.' },
  { value: 'item-3', title: 'Third Section', body: 'Each item operates independently in multiple mode.' },
];

const rowHighlightSections: DemoSection[] = [
  {
    value: 'item-1',
    title: 'Expanded, but not tinted',
    body: 'The panel reads as part of the page rather than a filled block.',
  },
  {
    value: 'item-2',
    title: 'Hover any row',
    body: 'The fill follows your cursor instead of marking a state.',
  },
  {
    value: 'item-3',
    title: 'Compare with the sections above',
    body: 'Those hold a block across the row and its panel while open.',
  },
];

const standaloneCode = `<ff-accordion type="single" collapsible defaultValue="item-1">
  <ff-accordion-item value="item-1">
    <ff-accordion-trigger>What is this component?</ff-accordion-trigger>
    <ff-accordion-content>
      A collapsible accordion with animated expand/collapse and spring-animated chevron.
    </ff-accordion-content>
  </ff-accordion-item>
</ff-accordion>`;

const groupedCode = `<ff-accordion-group type="single" collapsible defaultValue="item-1">
  <ff-accordion-item value="item-1" [index]="0">
    <ff-accordion-trigger>Getting Started</ff-accordion-trigger>
    <ff-accordion-content>
      Install the component and import it into your project. The accordion
      supports both single and multiple expand modes.
    </ff-accordion-content>
  </ff-accordion-item>
  <ff-accordion-item value="item-2" [index]="1">
    <ff-accordion-trigger>Styling</ff-accordion-trigger>
    <ff-accordion-content>
      The component integrates with the shape system for pill or rounded
      border-radius variants. All animations use spring physics.
    </ff-accordion-content>
  </ff-accordion-item>
  <ff-accordion-item value="item-3" [index]="2">
    <ff-accordion-trigger>Accessibility</ff-accordion-trigger>
    <ff-accordion-content>
      Built on Radix UI or Base UI Accordion (your pick) with WAI-ARIA
      attributes, keyboard navigation, and focus management.
    </ff-accordion-content>
  </ff-accordion-item>
  <ff-accordion-item value="item-4" [index]="3">
    <ff-accordion-trigger>Animation</ff-accordion-trigger>
    <ff-accordion-content>
      Smooth height transitions and spring-animated chevron rotation.
      The fluid hover background tracks your cursor.
    </ff-accordion-content>
  </ff-accordion-item>
</ff-accordion-group>`;

const multipleCode = `<ff-accordion-group type="multiple" [defaultValue]="['item-1', 'item-3']">
  <ff-accordion-item value="item-1" [index]="0">
    <ff-accordion-trigger>First Section</ff-accordion-trigger>
    <ff-accordion-content>
      Multiple items can be expanded at the same time.
    </ff-accordion-content>
  </ff-accordion-item>
  <ff-accordion-item value="item-2" [index]="1">
    <ff-accordion-trigger>Second Section</ff-accordion-trigger>
    <ff-accordion-content>
      Click any trigger to expand or collapse independently.
    </ff-accordion-content>
  </ff-accordion-item>
  <ff-accordion-item value="item-3" [index]="2">
    <ff-accordion-trigger>Third Section</ff-accordion-trigger>
    <ff-accordion-content>
      Each item operates independently in multiple mode.
    </ff-accordion-content>
  </ff-accordion-item>
</ff-accordion-group>`;

const rowHighlightCode = `<!-- highlight="trigger": an expanded item stops holding a tint. The fill
     scopes to the row and waits for hover, so the open panel sits on the
     page's own surface — the way a sidebar row highlights without
     colouring its sub-tree. -->
<ff-accordion-group type="single" collapsible defaultValue="item-1" highlight="trigger">
  <ff-accordion-item value="item-1" [index]="0">
    <ff-accordion-trigger>Expanded, but not tinted</ff-accordion-trigger>
    <ff-accordion-content>
      The panel reads as part of the page rather than a filled block.
    </ff-accordion-content>
  </ff-accordion-item>
  <ff-accordion-item value="item-2" [index]="1">
    <ff-accordion-trigger>Hover any row</ff-accordion-trigger>
    <ff-accordion-content>
      The fill follows your cursor instead of marking a state.
    </ff-accordion-content>
  </ff-accordion-item>
  <ff-accordion-item value="item-3" [index]="2">
    <ff-accordion-trigger>Compare with the sections above</ff-accordion-trigger>
    <ff-accordion-content>
      Those hold a block across the row and its panel while open.
    </ff-accordion-content>
  </ff-accordion-item>
</ff-accordion-group>`;

const installUsage = `<ff-accordion-group type="single" collapsible defaultValue="item-1">
  <ff-accordion-item value="item-1" [index]="0">
    <ff-accordion-trigger>Getting started</ff-accordion-trigger>
    <ff-accordion-content>Install the component and import it into your project.</ff-accordion-content>
  </ff-accordion-item>
  <ff-accordion-item value="item-2" [index]="1">
    <ff-accordion-trigger>Styling</ff-accordion-trigger>
    <ff-accordion-content>Pill or rounded, and every transition is a spring.</ff-accordion-content>
  </ff-accordion-item>
</ff-accordion-group>`;

const installProps: readonly string[] = [
  'type: "single" | "multiple" (default "single"). Whether one or multiple items can be expanded.',
  'collapsible: boolean (default true). Accepted for API parity: single mode is always collapsible.',
  'defaultValue: string | string[]. Initially expanded item value(s).',
  'value: string | string[]. Controlled expanded value(s); two-way with [(value)].',
  'valueChange: (value: string | string[]) => void. Emitted when the expanded state changes.',
  'highlight: "trigger" | "item" (default "item"). What an open item tints: item fills the row and its panel, trigger scopes the fill to the row and shows it on hover.',
  'AccordionItem value: string. Unique identifier for this item.',
  'AccordionItem index: number. Position for fluid hover. Required inside ff-accordion-group, omit for standalone.',
  'AccordionItem disabled: boolean (default false). Whether this item is disabled.',
  'AccordionTrigger / AccordionContent: projected content. The trigger label and the collapsible panel.',
];

@Component({
  selector: 'app-accordion-page',
  imports: [
    DocPage,
    DocSection,
    ComponentPreview,
    PropsTable,
    PlaygroundLayout,
    PlaygroundPanel,
    PlayField,
    PlaySelect,
    Switch,
    Accordion,
    AccordionGroup,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
  ],
  templateUrl: './accordion.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AccordionPage {
  protected readonly expand = signal<AccordionExpand>(DEFAULT_ACCORDION_STATE.expand);
  protected readonly highlightExpanded = signal(DEFAULT_ACCORDION_STATE.highlightExpanded);
  protected readonly items = ACCORDION_ITEMS.slice(0, 4);
  protected readonly singleSections = singleSections;
  protected readonly multipleSections = multipleSections;
  protected readonly rowHighlightSections = rowHighlightSections;
  protected readonly expandOptions = [
    { value: 'one', label: 'One at a time' },
    { value: 'oneOrNone', label: 'One or none' },
    { value: 'any', label: 'Any number' },
  ];
  protected readonly playSwitch = PLAY_SWITCH;
  protected readonly rootProps = rootProps;
  protected readonly itemProps = itemProps;
  protected readonly triggerProps = triggerProps;
  protected readonly contentProps = contentProps;
  protected readonly standaloneCode = standaloneCode;
  protected readonly groupedCode = groupedCode;
  protected readonly multipleCode = multipleCode;
  protected readonly rowHighlightCode = rowHighlightCode;
  protected readonly installUsage = installUsage;
  protected readonly installProps = installProps;

  private readonly globals = injectPresetGlobals();

  protected readonly code = computed(() =>
    buildAccordionPlaygroundCode(
      { expand: this.expand(), highlightExpanded: this.highlightExpanded() },
      this.globals(),
    ),
  );

  protected setExpand(value: string): void {
    this.expand.set(value as AccordionExpand);
  }

  protected shuffle(): void {
    const next = randomAccordionState();
    this.expand.set(next.expand);
    this.highlightExpanded.set(next.highlightExpanded);
  }
}
