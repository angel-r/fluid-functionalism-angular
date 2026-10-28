// ---------------------------------------------------------------------------
// The Skill page (S5, D9), ported from app/docs/skill/page.tsx: what the
// Angular skill does, what it knows, and four before/after examples that play
// themselves. The install row copies a prompt that installs the skill and has
// the agent audit the project, as the reference's does.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { fontWeights } from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { SkillTimeline, type TimelineStep } from './timeline';
import { CopyExample, MenuExample, PressExample, TabsExample } from './examples';

/** What it does: 1 line per job. The detail lives in SKILL.md. */
const JOBS: readonly TimelineStep[] = [
  { title: 'Read your stack', body: 'To understand your project.' },
  { title: 'Suggests 2 to 5 upgrades', body: 'Ranked by what your users will notice.' },
  { title: 'Aligns your UI', body: 'Installs what fits, matches the rest.' },
];

/** The skill page's install: a prompt rather than the bare command, so the
 *  agent goes on to run the skill once on the project (D9). Global (-g) keeps
 *  the skill out of the user's repo; -y skips the CLI's prompts, which an
 *  agent shell can't answer. */
const SKILL_INSTALL_COMMAND = 'npx skills add angel-r/fluid-functionalism-angular -g -y';
const SKILL_INSTALL_PROMPT = `Install the fluid-functionalism-angular skill with \`${SKILL_INSTALL_COMMAND}\` (skip this if you already have it). Then read its SKILL.md and use it to audit this project.`;

@Component({
  selector: 'app-skill-page',
  imports: [
    DocPage,
    DocSection,
    SkillTimeline,
    ComponentPreview,
    TabsExample,
    MenuExample,
    CopyExample,
    PressExample,
  ],
  templateUrl: './skill.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SkillPage {
  protected readonly jobs = JOBS;
  protected readonly installPrompt = SKILL_INSTALL_PROMPT;
  protected readonly semibold = fontWeights.semibold;
}
