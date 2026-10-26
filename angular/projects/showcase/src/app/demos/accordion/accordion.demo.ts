import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Accordion, AccordionContent, AccordionGroup, AccordionItem, AccordionTrigger } from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

interface Section {
  value: string;
  title: string;
  body: string;
}

@Component({
  selector: 'app-accordion-demo',
  imports: [DemoPage, DemoSection, Accordion, AccordionGroup, AccordionItem, AccordionTrigger, AccordionContent],
  template: `
    <app-demo-page
      title="Accordion"
      description="Collapsible sections with animated expand/collapse and fluid hover in grouped mode."
    >
      <app-demo-section title="Standalone">
        <div class="flex min-h-[120px] items-center">
          <ff-accordion type="single" collapsible defaultValue="item-1">
            <ff-accordion-item value="item-1">
              <ff-accordion-trigger>What is this component?</ff-accordion-trigger>
              <ff-accordion-content>
                A collapsible accordion with animated expand/collapse and spring-animated chevron.
              </ff-accordion-content>
            </ff-accordion-item>
          </ff-accordion>
        </div>
      </app-demo-section>

      <app-demo-section title="Single Expand">
        <ff-accordion-group type="single" collapsible defaultValue="item-1">
          @for (section of single; track section.value; let i = $index) {
            <ff-accordion-item [value]="section.value" [index]="i">
              <ff-accordion-trigger>{{ section.title }}</ff-accordion-trigger>
              <ff-accordion-content>{{ section.body }}</ff-accordion-content>
            </ff-accordion-item>
          }
        </ff-accordion-group>
      </app-demo-section>

      <app-demo-section title="Multi Expand">
        <ff-accordion-group type="multiple" [defaultValue]="['item-1', 'item-3']">
          @for (section of multiple; track section.value; let i = $index) {
            <ff-accordion-item [value]="section.value" [index]="i">
              <ff-accordion-trigger>{{ section.title }}</ff-accordion-trigger>
              <ff-accordion-content>{{ section.body }}</ff-accordion-content>
            </ff-accordion-item>
          }
        </ff-accordion-group>
      </app-demo-section>

      <app-demo-section title="Row highlight">
        <ff-accordion-group type="single" collapsible defaultValue="item-1" highlight="trigger">
          @for (section of rowHighlight; track section.value; let i = $index) {
            <ff-accordion-item [value]="section.value" [index]="i">
              <ff-accordion-trigger>{{ section.title }}</ff-accordion-trigger>
              <ff-accordion-content>{{ section.body }}</ff-accordion-content>
            </ff-accordion-item>
          }
        </ff-accordion-group>
      </app-demo-section>

      <app-demo-section title="Compact">
        <ff-accordion-group size="compact" type="single" collapsible defaultValue="item-2">
          @for (section of single; track section.value; let i = $index) {
            <ff-accordion-item [value]="section.value" [index]="i">
              <ff-accordion-trigger>{{ section.title }}</ff-accordion-trigger>
              <ff-accordion-content>{{ section.body }}</ff-accordion-content>
            </ff-accordion-item>
          }
        </ff-accordion-group>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AccordionDemo {
  protected readonly single: Section[] = [
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
      body: 'Disclosure buttons with WAI-ARIA attributes, keyboard navigation between triggers, and focus management.',
    },
    {
      value: 'item-4',
      title: 'Animation',
      body: 'Smooth height transitions and spring-animated chevron rotation. The fluid hover background tracks your cursor.',
    },
  ];
  protected readonly multiple: Section[] = [
    { value: 'item-1', title: 'First Section', body: 'Multiple items can be expanded at the same time.' },
    { value: 'item-2', title: 'Second Section', body: 'Click any trigger to expand or collapse independently.' },
    { value: 'item-3', title: 'Third Section', body: 'Each item operates independently in multiple mode.' },
  ];
  protected readonly rowHighlight: Section[] = [
    {
      value: 'item-1',
      title: 'Expanded, but not tinted',
      body: 'The panel reads as part of the page rather than a filled block.',
    },
    { value: 'item-2', title: 'Hover any row', body: 'The fill follows your cursor instead of marking a state.' },
    {
      value: 'item-3',
      title: 'Compare with the sections above',
      body: 'Those hold a block across the row and its panel while open.',
    },
  ];
}
