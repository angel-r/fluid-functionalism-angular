import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  type IconName,
} from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

const TIMEZONES = [
  { value: 'utc-8', label: '(UTC-8) Pacific Time' },
  { value: 'utc-7', label: '(UTC-7) Mountain Time' },
  { value: 'utc-6', label: '(UTC-6) Central Time' },
  { value: 'utc-5', label: '(UTC-5) Eastern Time' },
  { value: 'utc-4', label: '(UTC-4) Atlantic Time' },
  { value: 'utc-3', label: '(UTC-3) Buenos Aires' },
  { value: 'utc-1', label: '(UTC-1) Azores' },
  { value: 'utc+0', label: '(UTC+0) London' },
  { value: 'utc+1', label: '(UTC+1) Paris' },
  { value: 'utc+2', label: '(UTC+2) Helsinki' },
  { value: 'utc+3', label: '(UTC+3) Moscow' },
  { value: 'utc+5:30', label: '(UTC+5:30) Mumbai' },
  { value: 'utc+8', label: '(UTC+8) Singapore' },
  { value: 'utc+9', label: '(UTC+9) Tokyo' },
  { value: 'utc+10', label: '(UTC+10) Sydney' },
  { value: 'utc+12', label: '(UTC+12) Auckland' },
];

const THEME_ICONS: Record<string, IconName> = { light: 'sun', dark: 'moon', system: 'monitor' };

@Component({
  selector: 'app-select-demo',
  imports: [
    DemoPage,
    DemoSection,
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectGroup,
    SelectLabel,
    SelectSeparator,
  ],
  template: `
    <app-demo-page
      title="Select"
      description="Animated select menu with fluid hover, bordered/borderless variants, optional leading icons, and spring-animated popover."
    >
      <app-demo-section title="Basic">
        <ff-select [(value)]="basic">
          <ff-select-trigger placeholder="Select a fruit…" />
          <ff-select-content>
            <ff-select-item [index]="0" value="apple">Apple</ff-select-item>
            <ff-select-item [index]="1" value="banana">Banana</ff-select-item>
            <ff-select-item [index]="2" value="cherry">Cherry</ff-select-item>
            <ff-select-item [index]="3" value="mango">Mango</ff-select-item>
          </ff-select-content>
        </ff-select>
      </app-demo-section>

      <app-demo-section title="Variants">
        <div class="flex flex-wrap items-center gap-3">
          <ff-select [(value)]="bordered">
            <ff-select-trigger variant="bordered" placeholder="Bordered" />
            <ff-select-content>
              <ff-select-item [index]="0" value="apple">Apple</ff-select-item>
              <ff-select-item [index]="1" value="banana">Banana</ff-select-item>
              <ff-select-item [index]="2" value="cherry">Cherry</ff-select-item>
            </ff-select-content>
          </ff-select>
          <ff-select [(value)]="borderless">
            <ff-select-trigger variant="borderless" placeholder="Borderless" />
            <ff-select-content>
              <ff-select-item [index]="0" value="apple">Apple</ff-select-item>
              <ff-select-item [index]="1" value="banana">Banana</ff-select-item>
              <ff-select-item [index]="2" value="cherry">Cherry</ff-select-item>
            </ff-select-content>
          </ff-select>
        </div>
      </app-demo-section>

      <app-demo-section title="With Icons">
        <ff-select [(value)]="theme">
          <ff-select-trigger [icon]="themeIcon()" placeholder="Theme" />
          <ff-select-content>
            <ff-select-item [index]="0" value="system" icon="monitor">System</ff-select-item>
            <ff-select-item [index]="1" value="light" icon="sun">Light</ff-select-item>
            <ff-select-item [index]="2" value="dark" icon="moon">Dark</ff-select-item>
          </ff-select-content>
        </ff-select>
      </app-demo-section>

      <app-demo-section title="Groups">
        <ff-select>
          <ff-select-trigger placeholder="Settings…" />
          <ff-select-content>
            <ff-select-group>
              <ff-select-label>Account</ff-select-label>
              <ff-select-item [index]="0" value="profile" icon="user">Profile</ff-select-item>
              <ff-select-item [index]="1" value="email" icon="mail">Email</ff-select-item>
            </ff-select-group>
            <ff-select-separator />
            <ff-select-group>
              <ff-select-label>Preferences</ff-select-label>
              <ff-select-item [index]="2" value="notifications" icon="bell">Notifications</ff-select-item>
              <ff-select-item [index]="3" value="privacy" icon="shield">Privacy</ff-select-item>
            </ff-select-group>
          </ff-select-content>
        </ff-select>
      </app-demo-section>

      <app-demo-section title="Scrollable List">
        <ff-select [(value)]="timezone">
          <ff-select-trigger icon="globe" placeholder="Select timezone…" />
          <ff-select-content>
            @for (zone of timezones; track zone.value; let i = $index) {
              <ff-select-item [index]="i" [value]="zone.value">{{ zone.label }}</ff-select-item>
            }
          </ff-select-content>
        </ff-select>
      </app-demo-section>

      <app-demo-section title="Error State">
        <ff-select [(value)]="role">
          <ff-select-trigger placeholder="Select a role…" error="Please select a role to continue." />
          <ff-select-content>
            <ff-select-item [index]="0" value="admin">Admin</ff-select-item>
            <ff-select-item [index]="1" value="editor">Editor</ff-select-item>
            <ff-select-item [index]="2" value="viewer">Viewer</ff-select-item>
          </ff-select-content>
        </ff-select>
      </app-demo-section>

      <app-demo-section title="Disabled">
        <div class="flex flex-wrap items-center gap-3">
          <ff-select disabled>
            <ff-select-trigger placeholder="Disabled" />
            <ff-select-content>
              <ff-select-item [index]="0" value="a">Option A</ff-select-item>
            </ff-select-content>
          </ff-select>
          <ff-select>
            <ff-select-trigger placeholder="Some disabled…" />
            <ff-select-content>
              <ff-select-item [index]="0" value="a">Available</ff-select-item>
              <ff-select-item [index]="1" value="b" disabled>Unavailable</ff-select-item>
              <ff-select-item [index]="2" value="c">Available</ff-select-item>
            </ff-select-content>
          </ff-select>
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SelectDemo {
  protected readonly timezones = TIMEZONES;
  protected readonly basic = signal('');
  protected readonly bordered = signal('');
  protected readonly borderless = signal('');
  protected readonly theme = signal('system');
  protected readonly timezone = signal('');
  protected readonly role = signal('');
  protected readonly themeIcon = computed<IconName>(() => THEME_ICONS[this.theme()] ?? 'monitor');
}
