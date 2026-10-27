// ---------------------------------------------------------------------------
// Invite dialog — the solution: dialog at surface 5, role picker at surface 7,
// with no props passed between them. Ported from InviteDialogDemo,
// RoleItem and SolutionAnnotations of app/docs/surfaces/page.tsx.
//
// The callouts are measured (the dialog is fluid, not a fixed canvas): each
// reports its target's *live* background color, so the lift to a distinct
// surface reads straight off the rendered pixels.
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  Dropdown,
  Icon,
  SurfaceProvider,
  injectDropdown,
  injectShape,
  fontWeights,
  type IconName,
} from '@angel-r/fluid-functionalism-angular';
import {
  buildArrowPath,
  rgbToHex,
  ANNOTATION_BLUE,
  type ArrowDial,
} from './annotations';
import { SurfacesPreview } from './preview';

const INVITE_DIALOG_CODE = `<div [ffSurface]="5">
  <div class="rounded-2xl bg-surface-5 shadow-surface-5 p-6">
    <!-- The dialog provides surface-5 to everything inside it -->
    <button ffButton variant="secondary">Member</button>

    <ff-dropdown>                      <!-- lifts to surface-7 -->
      <ff-menu-item [index]="0" label="Workspace owner" />
      <ff-menu-item [index]="1" label="Member" [checked]="true" />
      <ff-menu-item [index]="2" label="Restricted member" />
    </ff-dropdown>
  </div>
</div>`;

/** A role row inside the dialog's dropdown: icon, name, description and the
 *  check. It registers with the enclosing Dropdown so the fluid hover and the
 *  roving highlight treat it like any other row. */
@Component({
  selector: 'app-surfaces-role-item',
  imports: [Icon],
  template: `
    <ff-icon [name]="icon()" [size]="18" [strokeWidth]="highlighted() ? 2 : 1.5" [class]="iconClass()" />
    <div class="flex flex-col gap-0.5 min-w-0 flex-1">
      <span [class]="labelClass()" [style.font-variation-settings]="checked() ? semibold : normal">
        {{ label() }}
      </span>
      <span class="text-site-caption text-muted-foreground">{{ description() }}</span>
    </div>
    @if (checked()) {
      <ff-icon name="check" [size]="16" [strokeWidth]="2" class="text-foreground shrink-0 mt-0.5" />
    }
  `,
  host: {
    '[class]': 'hostClass()',
    '[attr.data-fluid-hover-index]': 'index()',
    role: 'menuitemradio',
    '[attr.aria-checked]': 'checked()',
    '[attr.aria-label]': 'label()',
    '[attr.tabindex]': 'tabIndex()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurfacesRoleItem {
  readonly index = input.required<number>();
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  readonly description = input.required<string>();
  readonly checked = input(false);

  protected readonly semibold = fontWeights.semibold;
  protected readonly normal = fontWeights.normal;

  private readonly menu = injectDropdown();
  private readonly shape = injectShape();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly highlighted = computed(() => this.menu.activeIndex() === this.index() || this.checked());

  protected readonly hostClass = computed(
    () =>
      `relative z-10 flex items-start gap-3 px-3 py-2.5 cursor-pointer outline-none transition-colors duration-80 ${this.shape().item}`,
  );
  protected readonly iconClass = computed(
    () =>
      `shrink-0 mt-0.5 transition-[color,stroke-width] duration-80 ${
        this.highlighted() ? 'text-foreground' : 'text-muted-foreground'
      }`,
  );
  protected readonly labelClass = computed(
    () =>
      `text-site-body transition-colors duration-80 ${this.highlighted() ? 'text-foreground' : 'text-muted-foreground'}`,
  );
  protected readonly tabIndex = computed(() =>
    this.index() === (this.menu.checkedIndex?.() ?? 0) ? 0 : -1,
  );

  constructor() {
    effect((onCleanup) => {
      const index = this.index();
      const element = this.host;
      untracked(() => this.menu.registerItem(index, element));
      onCleanup(() => this.menu.unregisterItem(index, element));
    });
  }
}

// Hand-tuned transforms for the two solution callouts.
const SOLUTION_VALUES: Record<'dialog' | 'dropdown', ArrowDial> = {
  dialog: { x: 0, y: -60, rotation: 20, curve: -10, labelX: 0, labelY: -30 },
  dropdown: { x: 0, y: 0, rotation: 0, curve: 10, labelX: 10, labelY: 10 },
};

interface SolutionBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  w: number;
  h: number;
  hex: string;
}

interface SolutionGeo {
  w: number;
  h: number;
  dialog: SolutionBox;
  dropdown: SolutionBox;
}

interface SolutionCallout {
  key: 'dialog' | 'dropdown';
  title: string;
  hex: string;
  labelW: number;
  left: number;
  top: number;
  path: string;
}

interface SolutionView {
  w: number;
  h: number;
  callouts: SolutionCallout[];
}

function measureSolution(
  container: HTMLElement,
  dialog: HTMLElement,
  dropdown: HTMLElement,
): SolutionGeo {
  const cr = container.getBoundingClientRect();
  const rel = (el: HTMLElement): SolutionBox => {
    const r = el.getBoundingClientRect();
    return {
      left: r.left - cr.left,
      top: r.top - cr.top,
      right: r.right - cr.left,
      bottom: r.bottom - cr.top,
      w: r.width,
      h: r.height,
      hex: rgbToHex(getComputedStyle(el).backgroundColor),
    };
  };
  return { w: cr.width, h: cr.height, dialog: rel(dialog), dropdown: rel(dropdown) };
}

@Component({
  selector: 'app-surfaces-invite-dialog-demo',
  imports: [Dropdown, Icon, SurfaceProvider, SurfacesPreview, SurfacesRoleItem],
  template: `
    <app-surfaces-preview [code]="inviteDialogCode">
      <div
        #inviteContainer
        class="dark relative w-full rounded-2xl overflow-hidden min-h-[640px] flex items-center justify-center p-6 bg-background"
      >
        <div
          #inviteDialog
          [ffSurface]="5"
          class="relative w-full max-w-[320px] bg-surface-5 shadow-surface-5 rounded-2xl p-6 flex flex-col gap-5"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div
                class="shrink-0 w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-site-caption"
                [style.font-variation-settings]="semibold"
              >
                M
              </div>
              <span class="text-site-title text-foreground" [style.font-variation-settings]="semibold">
                Invite to your workspace
              </span>
            </div>
            <button
              type="button"
              aria-label="Close"
              class="text-muted-foreground hover:text-foreground p-1 -mr-1 -mt-1 cursor-pointer"
            >
              <ff-icon name="x" [size]="16" [strokeWidth]="1.5" />
            </button>
          </div>

          <label class="flex flex-col gap-2">
            <span class="text-site-body text-foreground" [style.font-variation-settings]="normal">Email</span>
            <textarea
              readonly
              rows="2"
              placeholder="email@gmail.com, email2@gmail.com..."
              class="text-site-body text-foreground placeholder:text-muted-foreground bg-transparent hover:bg-hover border border-border rounded-xl px-3 py-2 resize-none outline-none transition-colors duration-80 cursor-pointer"
            ></textarea>
          </label>

          <div class="flex flex-col gap-2">
            <span class="text-site-body text-foreground" [style.font-variation-settings]="normal">Select role</span>
            <button
              type="button"
              aria-expanded="true"
              class="flex items-center justify-between gap-2 h-10 px-3 rounded-xl bg-active text-site-body text-foreground border border-border cursor-pointer transition-colors duration-80"
            >
              <span>Member</span>
              <ff-icon
                name="chevron-down"
                [size]="14"
                [strokeWidth]="1.5"
                class="text-muted-foreground rotate-180 transition-transform"
              />
            </button>
            <div class="-mt-px">
              <ff-dropdown #inviteMenu class="w-full" [checkedIndex]="1">
                <app-surfaces-role-item
                  [index]="0"
                  icon="users"
                  label="Workspace owner"
                  description="Can change workspace settings and invite new members"
                  [checked]="false"
                />
                <app-surfaces-role-item
                  [index]="1"
                  icon="user"
                  label="Member"
                  description="Can't change workspace settings or invite new members"
                  [checked]="true"
                />
                <app-surfaces-role-item
                  [index]="2"
                  icon="lock"
                  label="Restricted member"
                  description="Can only see and edit content they created"
                  [checked]="false"
                />
              </ff-dropdown>
            </div>
          </div>

          <div class="flex justify-end items-center gap-2 pt-2">
            <button
              type="button"
              class="h-9 px-4 rounded-full bg-transparent hover:bg-hover text-site-body text-foreground cursor-pointer transition-colors duration-80"
              [style.font-variation-settings]="normal"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled
              class="h-9 px-4 rounded-full bg-foreground text-background text-site-body cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
              [style.font-variation-settings]="semibold"
            >
              Send invites
            </button>
          </div>
        </div>

        @if (view(); as annotations) {
          <svg
            class="absolute inset-0 pointer-events-none"
            [attr.width]="annotations.w"
            [attr.height]="annotations.h"
            [attr.viewBox]="'0 0 ' + annotations.w + ' ' + annotations.h"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="ff-solution-arrow"
                viewBox="0 0 12 12"
                markerWidth="12"
                markerHeight="12"
                refX="8.5"
                refY="6"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path
                  d="M3,2.5 L8.5,6 L3,9.5"
                  fill="none"
                  stroke="context-stroke"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </marker>
            </defs>
            @for (callout of annotations.callouts; track callout.key) {
              <path
                [attr.d]="callout.path"
                [attr.stroke]="color"
                stroke-width="1.5"
                stroke-linecap="round"
                fill="none"
                marker-end="url(#ff-solution-arrow)"
              />
            }
          </svg>
          @for (callout of annotations.callouts; track callout.key) {
            <div
              class="absolute flex flex-col gap-0.5 items-start"
              [style.left.px]="callout.left"
              [style.top.px]="callout.top"
              [style.width.px]="callout.labelW"
            >
              <span class="text-site-caption text-foreground" [style.font-variation-settings]="semibold">
                {{ callout.title }}
              </span>
              <span class="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  class="w-2.5 h-2.5 rounded-[3px] border border-white/15 shrink-0"
                  [style.backgroundColor]="callout.hex"
                ></span>
                <span class="text-[11px] font-mono leading-3.5 text-muted-foreground">{{ callout.hex }}</span>
              </span>
            </div>
          }
        }
      </div>
    </app-surfaces-preview>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurfacesInviteDialogDemo {
  protected readonly inviteDialogCode = INVITE_DIALOG_CODE;
  protected readonly color = ANNOTATION_BLUE;
  protected readonly semibold = fontWeights.semibold;
  protected readonly normal = fontWeights.normal;

  private readonly container = viewChild<ElementRef<HTMLElement>>('inviteContainer');
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('inviteDialog');
  private readonly dropdown = viewChild('inviteMenu', { read: ElementRef });

  private readonly geo = signal<SolutionGeo | null>(null);

  protected readonly view = computed<SolutionView | null>(() => {
    const geo = this.geo();
    if (!geo) return null;

    // Dialog callout — label in the left margin, arrow into the dialog surface.
    const dlg = geo.dialog;
    const dEnd = { x: dlg.left + 12, y: dlg.top + dlg.h * 0.4 };
    const dLabelW = 72;
    const dialog: SolutionCallout = {
      key: 'dialog',
      title: 'Dialog',
      hex: dlg.hex,
      labelW: dLabelW,
      left: dlg.left - dLabelW - 16 + SOLUTION_VALUES.dialog.labelX,
      top: dEnd.y + 6 + SOLUTION_VALUES.dialog.labelY,
      path: buildArrowPath(
        { x: dlg.left - 16, y: dEnd.y + 26 },
        dEnd,
        SOLUTION_VALUES.dialog,
      ),
    };

    // Role dropdown callout — label in the right margin, arrow into the menu.
    const dd = geo.dropdown;
    const mEnd = { x: dd.right - 2, y: dd.top + dd.h * 0.22 };
    const mLabelW = 92;
    const dropdown: SolutionCallout = {
      key: 'dropdown',
      title: 'Role dropdown',
      hex: dd.hex,
      labelW: mLabelW,
      left: geo.w - mLabelW - 4 + SOLUTION_VALUES.dropdown.labelX,
      top: mEnd.y + 10 + SOLUTION_VALUES.dropdown.labelY,
      path: buildArrowPath(
        { x: geo.w - mLabelW - 4, y: mEnd.y + 24 },
        mEnd,
        SOLUTION_VALUES.dropdown,
      ),
    };

    return { w: geo.w, h: geo.h, callouts: [dialog, dropdown] };
  });

  constructor() {
    afterRenderEffect((onCleanup) => {
      const container = this.container()?.nativeElement;
      const dialog = this.dialog()?.nativeElement as HTMLElement | undefined;
      const dropdown = this.dropdown()?.nativeElement as HTMLElement | undefined;
      if (!container || !dialog || !dropdown) return;

      const measure = () => this.geo.set(measureSolution(container, dialog, dropdown));
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(container);
      ro.observe(dialog);
      ro.observe(dropdown);
      onCleanup(() => ro.disconnect());
    });
  }
}
