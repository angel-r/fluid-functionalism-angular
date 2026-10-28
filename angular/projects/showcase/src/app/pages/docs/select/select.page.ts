// /docs/select, ported from app/docs/select/page.tsx: the basic select, the
// bordered/borderless variants, leading icons, groups with a separator, the
// scrollable timezone list, the error state, disabled triggers and items, then
// the API reference. The popup's spring lives in the component.

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
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';
import { apiReference } from '../../../docs-kit/api/select';

const THEME_ICONS: Record<string, IconName> = { light: 'sun', dark: 'moon', system: 'monitor' };

const basicCode = `import { Select, SelectTrigger, SelectContent, SelectItem } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

readonly fruit = signal("");

<ff-select [(value)]="fruit">
  <ff-select-trigger placeholder="Select a fruit…" />
  <ff-select-content>
    <ff-select-item [index]="0" value="apple">Apple</ff-select-item>
    <ff-select-item [index]="1" value="banana">Banana</ff-select-item>
    <ff-select-item [index]="2" value="cherry">Cherry</ff-select-item>
    <ff-select-item [index]="3" value="mango">Mango</ff-select-item>
  </ff-select-content>
</ff-select>`;

const variantsCode = `import { Select, SelectTrigger, SelectContent, SelectItem } from "@angel-r/fluid-functionalism-angular";

<!-- Bordered (default) -->
<ff-select>
  <ff-select-trigger variant="bordered" placeholder="Bordered" />
  <ff-select-content>
    <ff-select-item [index]="0" value="a">Option A</ff-select-item>
    <ff-select-item [index]="1" value="b">Option B</ff-select-item>
  </ff-select-content>
</ff-select>

<!-- Borderless -->
<ff-select>
  <ff-select-trigger variant="borderless" placeholder="Borderless" />
  <ff-select-content>
    <ff-select-item [index]="0" value="a">Option A</ff-select-item>
    <ff-select-item [index]="1" value="b">Option B</ff-select-item>
  </ff-select-content>
</ff-select>`;

const iconsCode = `import { Select, SelectTrigger, SelectContent, SelectItem, type IconName } from "@angel-r/fluid-functionalism-angular";
import { computed, signal } from "@angular/core";

const THEME_ICONS: Record<string, IconName> = { light: "sun", dark: "moon", system: "monitor" };

readonly theme = signal("system");
readonly themeIcon = computed(() => THEME_ICONS[this.theme()] ?? "monitor");

<ff-select [(value)]="theme">
  <ff-select-trigger [icon]="themeIcon()" placeholder="Theme" />
  <ff-select-content>
    <ff-select-item [index]="0" value="system" icon="monitor">System</ff-select-item>
    <ff-select-item [index]="1" value="light" icon="sun">Light</ff-select-item>
    <ff-select-item [index]="2" value="dark" icon="moon">Dark</ff-select-item>
  </ff-select-content>
</ff-select>`;

const groupsCode = `import { Select, SelectTrigger, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator } from "@angel-r/fluid-functionalism-angular";

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
</ff-select>`;

const timezoneCode = `import { Select, SelectTrigger, SelectContent, SelectItem } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

readonly timezone = signal("");

<ff-select [(value)]="timezone">
  <ff-select-trigger icon="globe" placeholder="Select timezone…" />
  <ff-select-content>
    <ff-select-item [index]="0" value="utc-8">(UTC-8) Pacific Time</ff-select-item>
    <ff-select-item [index]="1" value="utc-7">(UTC-7) Mountain Time</ff-select-item>
    <ff-select-item [index]="2" value="utc-6">(UTC-6) Central Time</ff-select-item>
    <ff-select-item [index]="3" value="utc-5">(UTC-5) Eastern Time</ff-select-item>
    <ff-select-item [index]="4" value="utc-4">(UTC-4) Atlantic Time</ff-select-item>
    <ff-select-item [index]="5" value="utc-3">(UTC-3) Buenos Aires</ff-select-item>
    <ff-select-item [index]="6" value="utc-1">(UTC-1) Azores</ff-select-item>
    <ff-select-item [index]="7" value="utc+0">(UTC+0) London</ff-select-item>
    <ff-select-item [index]="8" value="utc+1">(UTC+1) Paris</ff-select-item>
    <ff-select-item [index]="9" value="utc+2">(UTC+2) Helsinki</ff-select-item>
    <ff-select-item [index]="10" value="utc+3">(UTC+3) Moscow</ff-select-item>
    <ff-select-item [index]="11" value="utc+5:30">(UTC+5:30) Mumbai</ff-select-item>
    <ff-select-item [index]="12" value="utc+8">(UTC+8) Singapore</ff-select-item>
    <ff-select-item [index]="13" value="utc+9">(UTC+9) Tokyo</ff-select-item>
    <ff-select-item [index]="14" value="utc+10">(UTC+10) Sydney</ff-select-item>
    <ff-select-item [index]="15" value="utc+12">(UTC+12) Auckland</ff-select-item>
  </ff-select-content>
</ff-select>`;

const errorCode = `import { Select, SelectTrigger, SelectContent, SelectItem } from "@angel-r/fluid-functionalism-angular";
import { signal } from "@angular/core";

readonly role = signal("");

<ff-select [(value)]="role">
  <ff-select-trigger
    placeholder="Select a role…"
    error="Please select a role to continue."
  />
  <ff-select-content>
    <ff-select-item [index]="0" value="admin">Admin</ff-select-item>
    <ff-select-item [index]="1" value="editor">Editor</ff-select-item>
    <ff-select-item [index]="2" value="viewer">Viewer</ff-select-item>
  </ff-select-content>
</ff-select>`;

const disabledCode = `import { Select, SelectTrigger, SelectContent, SelectItem } from "@angel-r/fluid-functionalism-angular";

<!-- Disabled trigger -->
<ff-select disabled>
  <ff-select-trigger placeholder="Disabled" />
  <ff-select-content>
    <ff-select-item [index]="0" value="a">Option A</ff-select-item>
  </ff-select-content>
</ff-select>

<!-- Disabled individual items -->
<ff-select>
  <ff-select-trigger placeholder="Some disabled…" />
  <ff-select-content>
    <ff-select-item [index]="0" value="a">Available</ff-select-item>
    <ff-select-item [index]="1" value="b" disabled>Unavailable</ff-select-item>
    <ff-select-item [index]="2" value="c">Available</ff-select-item>
  </ff-select-content>
</ff-select>`;

@Component({
  selector: 'app-select-page',
  imports: [
    DocPage,
    DocSection,
    ComponentPreview,
    PropsTable,
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectGroup,
    SelectLabel,
    SelectSeparator,
  ],
  template: `
    <app-doc-page
      title="Select"
      slug="select"
      description="Animated select menu with fluid hover, bordered/borderless variants, optional leading icons, and spring-animated popover."
      [installUsage]="basicCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Basic">
        <app-component-preview [code]="basicCode">
          <ff-select [(value)]="basic">
            <ff-select-trigger placeholder="Select a fruit…" />
            <ff-select-content>
              <ff-select-item [index]="0" value="apple">Apple</ff-select-item>
              <ff-select-item [index]="1" value="banana">Banana</ff-select-item>
              <ff-select-item [index]="2" value="cherry">Cherry</ff-select-item>
              <ff-select-item [index]="3" value="mango">Mango</ff-select-item>
            </ff-select-content>
          </ff-select>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Variants">
        <app-component-preview [code]="variantsCode">
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
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="With Icons">
        <app-component-preview [code]="iconsCode">
          <ff-select [(value)]="theme">
            <ff-select-trigger [icon]="themeIcon()" placeholder="Theme" />
            <ff-select-content>
              <ff-select-item [index]="0" value="system" icon="monitor">System</ff-select-item>
              <ff-select-item [index]="1" value="light" icon="sun">Light</ff-select-item>
              <ff-select-item [index]="2" value="dark" icon="moon">Dark</ff-select-item>
            </ff-select-content>
          </ff-select>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Groups">
        <app-component-preview [code]="groupsCode">
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
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Scrollable List">
        <app-component-preview [code]="timezoneCode">
          <ff-select [(value)]="timezone">
            <ff-select-trigger icon="globe" placeholder="Select timezone…" />
            <ff-select-content>
              <ff-select-item [index]="0" value="utc-8">(UTC-8) Pacific Time</ff-select-item>
              <ff-select-item [index]="1" value="utc-7">(UTC-7) Mountain Time</ff-select-item>
              <ff-select-item [index]="2" value="utc-6">(UTC-6) Central Time</ff-select-item>
              <ff-select-item [index]="3" value="utc-5">(UTC-5) Eastern Time</ff-select-item>
              <ff-select-item [index]="4" value="utc-4">(UTC-4) Atlantic Time</ff-select-item>
              <ff-select-item [index]="5" value="utc-3">(UTC-3) Buenos Aires</ff-select-item>
              <ff-select-item [index]="6" value="utc-1">(UTC-1) Azores</ff-select-item>
              <ff-select-item [index]="7" value="utc+0">(UTC+0) London</ff-select-item>
              <ff-select-item [index]="8" value="utc+1">(UTC+1) Paris</ff-select-item>
              <ff-select-item [index]="9" value="utc+2">(UTC+2) Helsinki</ff-select-item>
              <ff-select-item [index]="10" value="utc+3">(UTC+3) Moscow</ff-select-item>
              <ff-select-item [index]="11" value="utc+5:30">(UTC+5:30) Mumbai</ff-select-item>
              <ff-select-item [index]="12" value="utc+8">(UTC+8) Singapore</ff-select-item>
              <ff-select-item [index]="13" value="utc+9">(UTC+9) Tokyo</ff-select-item>
              <ff-select-item [index]="14" value="utc+10">(UTC+10) Sydney</ff-select-item>
              <ff-select-item [index]="15" value="utc+12">(UTC+12) Auckland</ff-select-item>
            </ff-select-content>
          </ff-select>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Error State">
        <app-component-preview [code]="errorCode">
          <ff-select [(value)]="role">
            <ff-select-trigger placeholder="Select a role…" error="Please select a role to continue." />
            <ff-select-content>
              <ff-select-item [index]="0" value="admin">Admin</ff-select-item>
              <ff-select-item [index]="1" value="editor">Editor</ff-select-item>
              <ff-select-item [index]="2" value="viewer">Viewer</ff-select-item>
            </ff-select-content>
          </ff-select>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Disabled">
        <app-component-preview [code]="disabledCode">
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
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference">
        <app-props-table [groups]="api" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SelectPage {
  protected readonly api = apiReference;
  /** One line per prop, for the page's install prompt. */
  protected readonly installProps = this.api.flatMap((table) =>
    table.props
      .filter((prop) => !prop.name.startsWith('<') && !prop.name.startsWith('...'))
      .map((prop) => `${prop.name}: ${prop.type}. ${prop.description}`),
  );

  protected readonly basicCode = basicCode;
  protected readonly variantsCode = variantsCode;
  protected readonly iconsCode = iconsCode;
  protected readonly groupsCode = groupsCode;
  protected readonly timezoneCode = timezoneCode;
  protected readonly errorCode = errorCode;
  protected readonly disabledCode = disabledCode;

  protected readonly basic = signal('');
  protected readonly bordered = signal('');
  protected readonly borderless = signal('');
  protected readonly theme = signal('system');
  protected readonly timezone = signal('');
  protected readonly role = signal('');
  protected readonly themeIcon = computed<IconName>(() => THEME_ICONS[this.theme()] ?? 'monitor');
}
