// /docs/motion, ported from app/docs/motion/page.tsx: three sections — the
// three speeds, the slower-in/faster-out comparison, and the full token
// reference — plus the reduced-motion note.
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { fontWeights } from '@angel-r/fluid-functionalism-angular';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { CodeChip } from './code-chip';
import { ModalExitDemo } from './modal-exit.demo';
import { SpringReference } from './spring-reference';
import { SpringTokensDemo } from './spring-tokens.demo';

/** The install prompt's snippet: the page's shortest usage. */
const INSTALL_USAGE = `import { enterTransition, exitTransition, injectAnimateFluid, spring } from '@angel-r/fluid-functionalism-angular';

const animate = injectAnimateFluid();
animate(el, { x: 120 }, enterTransition(spring.fast));
animate(el, { opacity: 0 }, exitTransition(spring.fast));`;

/** One install-prompt line per token. */
const INSTALL_PROPS = [
  'spring.fast: 0.08s, bounce 0 — hover, fades, tooltips, focus rings.',
  'spring.moderate: 0.16s, bounce 0 — dropdowns, tabs, panels that must land exactly.',
  'spring.slow: 0.24s, bounce 0.12 — dialogs, drawers, large surfaces.',
  'spring.<tier>.exit: the matching exit tween, one tier quicker — never replay the enter in reverse.',
  'enterTransition(tier) / exitTransition(tier): the two as motion options.',
  'injectAnimateFluid(): animate() bound to the live reduced-motion setting.',
];

@Component({
  selector: 'app-motion-page',
  imports: [DocPage, DocSection, CodeChip, SpringTokensDemo, ModalExitDemo, SpringReference],
  templateUrl: './motion.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class MotionPage {
  protected readonly semibold = fontWeights.semibold;
  protected readonly installUsage = INSTALL_USAGE;
  protected readonly installProps = INSTALL_PROPS;
}
