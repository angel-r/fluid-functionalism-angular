import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { fontWeights } from '../../core/font-weight';
import { type IconName } from '../../core/icons';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../dialog';
import { SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarProvider } from '../../sidebar-core';
import { Sidebar, SidebarContent } from '../../sidebar';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../sidebar-menu';
import { ScrollArea } from '../../scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../select';
import {
  SettingsAppearancePanel,
  SettingsGeneralPanel,
  SettingsMembersPanel,
  SettingsNotificationsPanel,
  SettingsSecurityPanel,
} from './settings-panels';

// ---------------------------------------------------------------------------
// A settings dialog: the `xl` Dialog as a canvas, a non-collapsing Sidebar
// of sections down its left edge, and a scrolling panel for the section's
// controls. The sidebar is the same composable Sidebar the app shell uses —
// it just lives in a bounded frame: `collapsible="none"` drops the rail and
// the drawer, the provider is told not to persist or listen for the
// shortcut, and `h-full` pins both to the dialog's fixed height.
//
// Below the `sm` breakpoint the column would leave no room for the panel,
// so it hides and a Select at the top of the panel takes over navigation.
// ---------------------------------------------------------------------------

interface SettingsSection {
  id: string;
  label: string;
  icon: IconName;
  description: string;
}

const SECTIONS: SettingsSection[] = [
  { id: 'general', label: 'General', icon: 'settings', description: 'Workspace name, language, and region.' },
  { id: 'notifications', label: 'Notifications', icon: 'bell', description: 'What reaches your inbox and when.' },
  { id: 'appearance', label: 'Appearance', icon: 'palette', description: 'Theme and density for this device.' },
  { id: 'security', label: 'Security', icon: 'shield', description: 'Sign-in protection and active sessions.' },
  { id: 'members', label: 'Members', icon: 'users', description: 'Who can access this workspace.' },
];

/**
 * The dialog-sidebar block: a workspace settings dialog.
 *
 *   <button ffButton variant="secondary" (click)="open.set(true)">Open settings</button>
 *   <ff-settings-dialog [open]="open()" (openChange)="open.set($event)" />
 *
 * Uncontrolled with `defaultOpen`; `defaultSection` picks the section shown first.
 */
@Component({
  selector: 'ff-settings-dialog',
  imports: [
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    ScrollArea,
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SettingsGeneralPanel,
    SettingsNotificationsPanel,
    SettingsAppearancePanel,
    SettingsSecurityPanel,
    SettingsMembersPanel,
  ],
  host: { style: 'display: contents' },
  template: `
    <ff-dialog [open]="open()" [defaultOpen]="defaultOpen()" (openChange)="openChange.emit($event)">
      <!-- The dialog's padding and centering give way to the two-column
           shell; the height is fixed so the panel scrolls inside it. -->
      <ff-dialog-content size="xl" class="flex h-[min(640px,calc(100dvh-4rem))] overflow-hidden p-0">
        <ff-sidebar-provider [persist]="false" [shortcut]="null" width="13rem" class="h-full min-h-0">
          <ff-sidebar collapsible="none" class="hidden h-full sm:flex bg-[rgb(var(--overlay)/0.03)]">
            <div ffSidebarHeader class="px-4 pt-5 pb-2">
              <!-- Headings here are labels, not a headline: the dialog's own
                   title weight would out-shout the nav beneath it. -->
              <h2 ffDialogTitle [style.font-variation-settings]="normalWeight">Settings</h2>
              <p ffDialogDescription class="sr-only">Workspace and account settings.</p>
            </div>
            <ff-sidebar-content>
              <ff-sidebar-group>
                <ff-sidebar-group-label>Workspace</ff-sidebar-group-label>
                <!-- Rows are the whole surface here; keyboard focus moves the
                     highlight instead of drawing a ring. -->
                <ul ffSidebarMenu [focusRing]="false">
                  @for (s of sections; track s.id) {
                    <li ffSidebarMenuItem>
                      <button ffSidebarMenuButton [icon]="s.icon" [isActive]="s.id === section()" (click)="section.set(s.id)">
                        {{ s.label }}
                      </button>
                    </li>
                  }
                </ul>
              </ff-sidebar-group>
            </ff-sidebar-content>
          </ff-sidebar>

          <div class="flex min-w-0 flex-1 flex-col">
            <!-- Panel header — pr-12 keeps clear of the dialog's ✕. -->
            <div class="flex shrink-0 flex-col gap-1 px-6 pt-5 pb-4 pr-12">
              <div class="sm:hidden">
                <!-- The dialog's one DialogTitle lives in the sidebar header
                     (a referenced title names the dialog even while hidden);
                     this is the visible heading for narrow screens. -->
                <h2
                  class="mb-3 text-[length:var(--fs-title,16px)] leading-[var(--lh-title,22px)] text-foreground"
                  [style.font-variation-settings]="normalWeight"
                >
                  Settings
                </h2>
                <ff-select [value]="section()" (valueChange)="section.set($event)">
                  <ff-select-trigger placeholder="Section" />
                  <ff-select-content>
                    @for (s of sections; track s.id; let i = $index) {
                      <ff-select-item [index]="i" [value]="s.id" [icon]="s.icon">{{ s.label }}</ff-select-item>
                    }
                  </ff-select-content>
                </ff-select>
              </div>
              <h3
                class="hidden text-[length:var(--fs-title,16px)] leading-[var(--lh-title,22px)] text-foreground sm:block"
                [style.font-variation-settings]="normalWeight"
              >
                {{ current().label }}
              </h3>
              <p class="hidden text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)] text-muted-foreground sm:block">
                {{ current().description }}
              </p>
            </div>
            <ff-scroll-area class="min-h-0 flex-1" thumbSizing="track">
              <div class="flex flex-col gap-6 px-6 pb-6">
                @switch (current().id) {
                  @case ('notifications') {
                    <ff-settings-notifications-panel />
                  }
                  @case ('appearance') {
                    <ff-settings-appearance-panel />
                  }
                  @case ('security') {
                    <ff-settings-security-panel />
                  }
                  @case ('members') {
                    <ff-settings-members-panel />
                  }
                  @default {
                    <ff-settings-general-panel />
                  }
                }
              </div>
            </ff-scroll-area>
          </div>
        </ff-sidebar-provider>
      </ff-dialog-content>
    </ff-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDialog {
  /** Controlled open state. Left undefined, the dialog keeps its own. */
  readonly open = input<boolean | undefined>(undefined);
  /** Initial open state of an uncontrolled dialog. */
  readonly defaultOpen = input(false, { transform: booleanAttribute });
  /** The section shown first. */
  readonly defaultSection = input('general');
  /** Called when the dialog opens or closes. (React: `onOpenChange`.) */
  readonly openChange = output<boolean>();

  protected readonly sections = SECTIONS;
  protected readonly normalWeight = fontWeights.normal;
  protected readonly section = linkedSignal(() => this.defaultSection());
  protected readonly current = computed(() => SECTIONS.find((s) => s.id === this.section()) ?? SECTIONS[0]);
}
