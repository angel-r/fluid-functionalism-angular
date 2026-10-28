import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { cn } from '@angel-r/fluid-functionalism-angular/core';
import { Button } from '@angel-r/fluid-functionalism-angular/button';
import { InputField, InputGroup } from '@angel-r/fluid-functionalism-angular/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@angel-r/fluid-functionalism-angular/select';
import { Switch } from '@angel-r/fluid-functionalism-angular/switch';

// ---------------------------------------------------------------------------
// Section panels of the settings dialog — placeholder settings built from the
// library's controls. Swap for your own; each row is a label + description on
// the left and a control on the right. Each panel keeps its own state, so
// switching sections starts the next one fresh (as the React panels remount).
// Internal to the dialog-sidebar block.
// ---------------------------------------------------------------------------

// Switches carry their own (required) label for assistive tech; the row
// already shows it, so the switch's copy is visually hidden.
const SWITCH_LABEL_HIDDEN = '[&>span:last-child]:sr-only';

const SELECT_PARTS = [Select, SelectTrigger, SelectContent, SelectItem];

/** One settings row: label + description on the left, the control projected right. */
@Component({
  selector: 'ff-settings-row',
  host: { '[class]': 'hostClass()' },
  template: `
    <div class="flex min-w-0 flex-col gap-0.5">
      <span class="text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)] text-foreground">{{ label() }}</span>
      @if (description()) {
        <span class="text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] text-muted-foreground">{{
          description()
        }}</span>
      }
    </div>
    <div class="shrink-0"><ng-content /></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsRow {
  readonly label = input.required<string>();
  readonly description = input<string | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });
  protected readonly hostClass = computed(() =>
    cn(
      'flex items-center justify-between gap-6 border-b border-border/60 py-4 last:border-b-0',
      this.userClass(),
    ),
  );
}

@Component({
  selector: 'ff-settings-general-panel',
  imports: [InputGroup, InputField, SettingsRow, SELECT_PARTS],
  host: { style: 'display: contents' },
  template: `
    <ff-input-group class="w-full">
      <ff-input-field [index]="0" label="Workspace name" [(value)]="name" placeholder="Acme Inc" />
    </ff-input-group>
    <div class="flex flex-col">
      <ff-settings-row label="Language" description="Used for the interface and emails.">
        <ff-select [(value)]="language">
          <ff-select-trigger placeholder="Language" />
          <ff-select-content>
            <ff-select-item [index]="0" value="en">English</ff-select-item>
            <ff-select-item [index]="1" value="fr">Français</ff-select-item>
            <ff-select-item [index]="2" value="de">Deutsch</ff-select-item>
            <ff-select-item [index]="3" value="ja">日本語</ff-select-item>
          </ff-select-content>
        </ff-select>
      </ff-settings-row>
      <ff-settings-row label="Timezone" description="Dates and reminders follow it.">
        <ff-select [(value)]="timezone">
          <ff-select-trigger placeholder="Timezone" />
          <ff-select-content>
            <ff-select-item [index]="0" value="utc-8">(UTC−8) Pacific</ff-select-item>
            <ff-select-item [index]="1" value="utc-5">(UTC−5) Eastern</ff-select-item>
            <ff-select-item [index]="2" value="utc+0">(UTC+0) London</ff-select-item>
            <ff-select-item [index]="3" value="utc+1">(UTC+1) Paris</ff-select-item>
            <ff-select-item [index]="4" value="utc+9">(UTC+9) Tokyo</ff-select-item>
          </ff-select-content>
        </ff-select>
      </ff-settings-row>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsGeneralPanel {
  protected readonly name = signal('Acme Inc');
  protected readonly language = signal('en');
  protected readonly timezone = signal('utc+1');
}

@Component({
  selector: 'ff-settings-notifications-panel',
  imports: [Switch, SettingsRow],
  host: { style: 'display: contents' },
  template: `
    <div class="flex flex-col">
      <ff-settings-row label="Daily digest" description="One email each morning with what changed.">
        <ff-switch [class]="labelHidden" label="Daily digest" [(checked)]="digest" />
      </ff-settings-row>
      <ff-settings-row label="Mentions" description="When someone @-mentions you.">
        <ff-switch [class]="labelHidden" label="Mentions" [(checked)]="mentions" />
      </ff-settings-row>
      <ff-settings-row label="Product updates" description="New features, once a month at most.">
        <ff-switch [class]="labelHidden" label="Product updates" [(checked)]="updates" />
      </ff-settings-row>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsNotificationsPanel {
  protected readonly labelHidden = SWITCH_LABEL_HIDDEN;
  protected readonly digest = signal(true);
  protected readonly mentions = signal(true);
  protected readonly updates = signal(false);
}

@Component({
  selector: 'ff-settings-appearance-panel',
  imports: [SettingsRow, SELECT_PARTS],
  host: { style: 'display: contents' },
  template: `
    <div class="flex flex-col">
      <ff-settings-row label="Theme" description="Follows the system unless you pick one.">
        <ff-select [(value)]="theme">
          <ff-select-trigger placeholder="Theme" />
          <ff-select-content>
            <ff-select-item [index]="0" value="system" icon="monitor">System</ff-select-item>
            <ff-select-item [index]="1" value="light" icon="sun">Light</ff-select-item>
            <ff-select-item [index]="2" value="dark" icon="moon">Dark</ff-select-item>
          </ff-select-content>
        </ff-select>
      </ff-settings-row>
      <ff-settings-row label="Density" description="Row height across lists and tables.">
        <ff-select [(value)]="density">
          <ff-select-trigger placeholder="Density" />
          <ff-select-content>
            <ff-select-item [index]="0" value="default">Default</ff-select-item>
            <ff-select-item [index]="1" value="compact">Compact</ff-select-item>
          </ff-select-content>
        </ff-select>
      </ff-settings-row>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsAppearancePanel {
  protected readonly theme = signal('system');
  protected readonly density = signal('default');
}

@Component({
  selector: 'ff-settings-security-panel',
  imports: [Switch, Button, SettingsRow],
  host: { style: 'display: contents' },
  template: `
    <div class="flex flex-col">
      <ff-settings-row label="Two-factor authentication" description="A code from your authenticator app at sign-in.">
        <ff-switch [class]="labelHidden" label="Two-factor authentication" [(checked)]="twoFactor" />
      </ff-settings-row>
      <ff-settings-row label="New sign-in alerts" description="Email when a new device signs in.">
        <ff-switch [class]="labelHidden" label="New sign-in alerts" [(checked)]="alerts" />
      </ff-settings-row>
      <ff-settings-row label="Active sessions" description="3 devices are signed in right now.">
        <button ffButton variant="secondary" size="sm">Sign out everywhere</button>
      </ff-settings-row>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSecurityPanel {
  protected readonly labelHidden = SWITCH_LABEL_HIDDEN;
  protected readonly twoFactor = signal(true);
  protected readonly alerts = signal(true);
}

const MEMBERS = [
  { name: 'Jane Doe', email: 'jane@acme.com', role: 'owner' },
  { name: 'Sam Park', email: 'sam@acme.com', role: 'admin' },
  { name: 'Ravi Patel', email: 'ravi@acme.com', role: 'member' },
];

@Component({
  selector: 'ff-settings-members-panel',
  imports: [Button, SettingsRow, SELECT_PARTS],
  host: { style: 'display: contents' },
  template: `
    <div class="flex flex-col">
      @for (m of members; track m.email) {
        <ff-settings-row [label]="m.name" [description]="m.email">
          <ff-select [value]="roles()[m.email]" (valueChange)="setRole(m.email, $event)">
            <ff-select-trigger placeholder="Role" variant="borderless" />
            <ff-select-content>
              <ff-select-item [index]="0" value="owner">Owner</ff-select-item>
              <ff-select-item [index]="1" value="admin">Admin</ff-select-item>
              <ff-select-item [index]="2" value="member">Member</ff-select-item>
            </ff-select-content>
          </ff-select>
        </ff-settings-row>
      }
      <div class="pt-4">
        <button ffButton variant="secondary" size="sm">Invite people</button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsMembersPanel {
  protected readonly members = MEMBERS;
  protected readonly roles = signal<Record<string, string>>(Object.fromEntries(MEMBERS.map((m) => [m.email, m.role])));

  protected setRole(email: string, role: string) {
    this.roles.update((r) => ({ ...r, [email]: role }));
  }
}
