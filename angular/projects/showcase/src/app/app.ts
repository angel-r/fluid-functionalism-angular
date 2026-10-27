import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SiteShell } from './shell/site-shell';

/**
 * The site root: the shell around every page (sidebar, right panel, command
 * menu, 404) and the router's outlet inside it. Routes marked
 * `data: { shell: false }` render full screen, so the shell reads the flag from
 * the router rather than from here.
 */
@Component({
  selector: 'app-root',
  imports: [SiteShell],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
