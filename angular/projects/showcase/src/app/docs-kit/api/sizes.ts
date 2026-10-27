// The API reference of /docs/sizes: its PropsTables and the API section
// of /docs/sizes.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export const PROVIDER_PROPS: PropDef[] = [
  {
    name: "provideFluid({ size })",
    type: '"default" | "compact"',
    default: '"default"',
    description:
      "The app-wide variant, registered once in `bootstrapApplication` providers. Switch it at runtime through `injectSizeContext().setSize()`.",
  },
  {
    name: "[ffSizeProvider] size",
    type: '"default" | "compact"',
    description:
      "Controlled variant on a region: pins every control in the subtree to one step. Wins over the app-wide variant.",
  },
  {
    name: "[ffSizeProvider] defaultSize",
    type: '"default" | "compact"',
    default: '"default"',
    description:
      "Uncontrolled initial variant for the region, switchable through the injected `SizeContext`'s `setSize`.",
  },
  {
    name: "injectTypeScale()",
    type: "Signal<Record<TypeScaleRole, number>>",
    description:
      "The active font sizes in px for display, title, subtitle, body, caption and micro. An override argument wins, then the region, then the app.",
  },
  {
    name: "--fs-<role> / --lh-<role>",
    type: "CSS custom properties",
    description:
      "The type scale as tokens, per role and per step (`--fs-body`, `--lh-body`, `--fs-body-compact`, …). The `text-<role>` utilities read them, with the px values as fallbacks.",
  },
];

export const CONSUMER_PROPS: PropDef[] = [
  {
    name: "size",
    type: '"default" | "compact"',
    default: "from the size context",
    description:
      "Per-component override on Button, Badge, Select, Tabs, TabsSubtle, Dropdown, DropdownMenu, CheckboxGroup, RadioGroup, InputGroup, InputCopy, InputMessage, Table, Switch, Slider, Accordion, AccordionGroup, AskUserQuestions, Card, ChatMessage, ColorPicker, ThinkingIndicator, and ThinkingSteps. Wins over the surrounding provider.",
  },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "SizeProvider", props: PROVIDER_PROPS },
  { title: "Component size prop", props: CONSUMER_PROPS },
];
