import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../../site/placeholder-page';

/** Placeholder for the Skill page (T10). The task that owns it replaces this
 *  file; keep the default export and the selector. */
@Component({
  selector: 'app-skill-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page title="Skill" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SkillPage {}
