// ---------------------------------------------------------------------------
// /docs/sidebar — ported from app/docs/sidebar/page.tsx.
//
// The page chrome is DocPage's; every section below is the reference's, with
// the demos' Angular code tabs and the API reference grouped the way the
// component is built (shell, sections, rows).
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';
import { level1Props, level2Props, providerProps, sectionProps, sidebarProps } from '../../../docs-kit/api/sidebar';
import { SIDEBAR_PROP_LINES } from './sidebar-playground';
import { SidebarPlayground } from './sidebar-playground';
import {
  SidebarDemoCollapse,
  SidebarDemoHeaderFooter,
  SidebarDemoNesting,
  SidebarDemoActions,
  SidebarDemoSettingsDialog,
} from './sidebar-previews';
import { SidebarDemoCallouts } from './sidebar-callouts';
import { SidebarDemoAlignment } from './sidebar-alignment';
import { SidebarDemoIconRailDemo } from './sidebar-rail-compare';
import { SidebarDemoShell, SHELL_HEIGHT } from './sidebar-shells';
import { ACTIONS_CODE, ALIGNMENT_CODE, NESTING_CODE, SETTINGS_DIALOG_CODE } from './sidebar-snippets';

@Component({
  selector: 'app-sidebar-page',
  imports: [
    DocPage,
    DocSection,
    ComponentPreview,
    PropsTable,
    SidebarPlayground,
    SidebarDemoShell,
    SidebarDemoNesting,
    SidebarDemoActions,
    SidebarDemoHeaderFooter,
    SidebarDemoCallouts,
    SidebarDemoCollapse,
    SidebarDemoSettingsDialog,
    SidebarDemoIconRailDemo,
    SidebarDemoAlignment,
  ],
  templateUrl: './sidebar.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SidebarPage {
  protected readonly shellHeight = SHELL_HEIGHT;
  protected readonly installUsage = `import { provideFluid } from '@angel-r/fluid-functionalism-angular';

bootstrapApplication(App, {
  providers: [provideFluid()],
});

<ff-sidebar-provider [persist]="false">
  <ff-sidebar variant="inset">
    <div ffSidebarHeader><!-- brand row, search --></div>
    <ff-sidebar-content><!-- groups and rows --></ff-sidebar-content>
    <div ffSidebarFooter><!-- user row --></div>
  </ff-sidebar>
  <main ffSidebarInset>
    <header ffSidebarInsetTopbar><ff-sidebar-trigger /></header>
    <router-outlet />
  </main>
</ff-sidebar-provider>`;
  protected readonly installProps = SIDEBAR_PROP_LINES;

  protected readonly nestingCode = NESTING_CODE;
  protected readonly actionsCode = ACTIONS_CODE;
  protected readonly settingsDialogCode = SETTINGS_DIALOG_CODE;
  protected readonly alignmentCode = ALIGNMENT_CODE;

  protected readonly providerProps = providerProps;
  protected readonly sidebarProps = sidebarProps;
  protected readonly sectionProps = sectionProps;
  protected readonly level1Props = level1Props;
  protected readonly level2Props = level2Props;
}
