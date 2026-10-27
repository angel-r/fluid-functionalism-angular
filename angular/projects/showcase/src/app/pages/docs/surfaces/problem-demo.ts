// ---------------------------------------------------------------------------
// The problem — an annotated invite dialog whose role picker collapses into its
// own dialog. Ported from the ProblemDemo of app/docs/surfaces/page.tsx: a
// fixed 600×640 canvas, an invite dialog at surface-5, and a role menu that
// hard-codes surface-5 too, with callouts pointing at the three surfaces.
// ---------------------------------------------------------------------------

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  Icon,
  SurfaceProvider,
  fontWeights,
  injectShape,
  type IconName,
} from '@angel-r/fluid-functionalism-angular';
import {
  ANNOTATION_BLUE,
  ANNOTATION_RED,
  buildArrowPath,
  type ArrowDial,
  type Point,
} from './annotations';
import { SurfacesPreview } from './preview';

const PROBLEM_CODE = `<!-- An invite dialog sits at surface-5 (#333).
     The role picker hard-codes its own background… -->
<div class="bg-surface-5 shadow-surface-5 rounded-3xl p-6">   <!-- surface-5 · #333 -->
  <button ffButton variant="secondary">Member</button>

  <!-- ❌ Real elevation shadow, but the background is
       hard-coded to the dialog's own level -->
  <div class="bg-surface-5 shadow-surface-3 rounded-2xl p-1">
    <ff-menu-item [index]="0" label="Workspace owner" />
    <ff-menu-item [index]="1" label="Member" [checked]="true" />
    <ff-menu-item [index]="2" label="Restricted member" />
  </div>
</div>

<!-- surface-5 on surface-5 → the shadow gives a faint
     edge, but the body melts straight into the dialog. -->`;

// Each callout: a label chip plus a curved arrow drawn in the shared
// 600×600 overlay (1 unit = 1px). Coordinates are tuned against the fixed
// canvas below so the arrowheads land on the three surfaces.
type ArrowKey = 'page' | 'dialog' | 'dropdown';

const ARROW_VALUES: Record<ArrowKey, ArrowDial> = {
  page: { x: -50, y: 0, rotation: -60, curve: 23, labelX: 0, labelY: 10 },
  dialog: { x: -20, y: -10, rotation: 20, curve: -18, labelX: 30, labelY: 0 },
  dropdown: { x: -20, y: -20, rotation: -40, curve: 18, labelX: 60, labelY: 0 },
};

interface Annotation {
  key: ArrowKey;
  title: string;
  hex: string;
  swatch: string;
  color: string;
  label: { left: number; top: number; align: 'left' | 'right' };
  // Base anchor points (in the 600×600 canvas). The control point — and thus
  // the curvature — is derived at render time from the dial `curve` value.
  start: Point;
  end: Point;
}

const ANNOTATIONS: readonly Annotation[] = [
  {
    key: 'page',
    title: 'Page background',
    hex: '#171717',
    swatch: '#171717',
    color: ANNOTATION_BLUE,
    label: { left: 14, top: 24, align: 'left' },
    start: { x: 118, y: 74 },
    end: { x: 84, y: 150 },
  },
  {
    key: 'dialog',
    title: 'Dialog',
    hex: '#333333',
    swatch: '#333333',
    color: ANNOTATION_RED,
    label: { left: 8, top: 300, align: 'left' },
    start: { x: 118, y: 300 },
    end: { x: 152, y: 214 },
  },
  {
    key: 'dropdown',
    title: 'Role dropdown',
    hex: '#333333',
    swatch: '#333333',
    color: ANNOTATION_RED,
    label: { left: 442, top: 300, align: 'left' },
    start: { x: 500, y: 338 },
    end: { x: 434, y: 306 },
  },
];

/** The callouts with their arrow path and nudged label position resolved. */
const PROBLEM_ARROWS = ANNOTATIONS.map((annotation) => {
  const dial = ARROW_VALUES[annotation.key];
  return {
    key: annotation.key,
    title: annotation.title,
    hex: annotation.hex,
    swatch: annotation.swatch,
    color: annotation.color,
    path: buildArrowPath(annotation.start, annotation.end, dial),
    left: annotation.label.left + dial.labelX,
    top: annotation.label.top + dial.labelY,
    align: annotation.label.align,
  };
});

/** A presentational role row (no dropdown context) so the broken menu can be
 *  hard-coded to the dialog's own surface and visibly melt into it. */
interface ProblemRole {
  icon: IconName;
  label: string;
  description: string;
  checked: boolean;
}

const PROBLEM_ROLES: readonly ProblemRole[] = [
  {
    icon: 'users',
    label: 'Workspace owner',
    description: 'Can change workspace settings and invite new members',
    checked: false,
  },
  {
    icon: 'user',
    label: 'Member',
    description: "Can't change workspace settings or invite new members",
    checked: true,
  },
  {
    icon: 'lock',
    label: 'Restricted member',
    description: 'Can only see and edit content they created',
    checked: false,
  },
];

@Component({
  selector: 'app-surfaces-problem-demo',
  imports: [Icon, SurfaceProvider, SurfacesPreview],
  template: `
    <app-surfaces-preview [code]="problemCode" padding="none">
      <div class="w-full overflow-x-auto">
        <div class="relative mx-auto w-[600px] h-[640px] shrink-0">
          <!-- Page background — true surface-1, no scrim so the pointed
               colors read at their exact hex values. -->
          <div class="absolute inset-0 bg-background" aria-hidden="true"></div>

          <!-- The dialog (surface-5), centered -->
          <div
            [ffSurface]="5"
            class="absolute left-1/2 -translate-x-1/2 top-8 w-[320px] bg-surface-5 shadow-surface-5 rounded-2xl p-6 flex flex-col gap-5"
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
              <!-- ❌ Same elevation shadow as a real dropdown, but the
                   background is hard-coded to the dialog's own level.
                   surface-5 on surface-5: the shadow gives a faint edge, yet
                   the body melts straight into the dialog. -->
              <div class="-mt-px rounded-2xl p-1 flex flex-col bg-surface-5 shadow-surface-3">
                @for (role of roles; track role.label) {
                  <div [class]="rowClass(role.checked)">
                    <ff-icon
                      [name]="role.icon"
                      [size]="18"
                      [strokeWidth]="role.checked ? 2 : 1.5"
                      [class]="rowIconClass(role.checked)"
                    />
                    <div class="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span
                        [class]="rowLabelClass(role.checked)"
                        [style.font-variation-settings]="role.checked ? semibold : normal"
                      >
                        {{ role.label }}
                      </span>
                      <span class="text-site-caption text-muted-foreground">{{ role.description }}</span>
                    </div>
                    @if (role.checked) {
                      <ff-icon name="check" [size]="16" [strokeWidth]="2" class="text-foreground shrink-0 mt-0.5" />
                    }
                  </div>
                }
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

          <svg
            class="absolute inset-0 pointer-events-none"
            width="600"
            height="640"
            viewBox="0 0 600 640"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <!-- Open line chevron (two strokes) instead of a filled
                   triangle. -->
              <marker
                id="ff-annotation-arrow"
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
            @for (arrow of arrows; track arrow.key) {
              <path
                [attr.d]="arrow.path"
                [attr.stroke]="arrow.color"
                stroke-width="1.5"
                stroke-linecap="round"
                fill="none"
                marker-end="url(#ff-annotation-arrow)"
              />
            }
          </svg>
          @for (annotation of arrows; track annotation.key) {
            <div
              [class]="annotationClass(annotation.align)"
              [style.left.px]="annotation.left"
              [style.top.px]="annotation.top"
              style="width: 150px"
            >
              <span class="text-site-caption text-foreground" [style.font-variation-settings]="semibold">
                {{ annotation.title }}
              </span>
              <span class="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  class="w-2.5 h-2.5 rounded-[3px] border border-white/15 shrink-0"
                  [style.backgroundColor]="annotation.swatch"
                ></span>
                <span class="text-[11px] font-mono leading-3.5 text-muted-foreground">{{ annotation.hex }}</span>
              </span>
            </div>
          }
        </div>
      </div>
    </app-surfaces-preview>
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurfacesProblemDemo {
  private readonly shape = injectShape();

  protected readonly problemCode = PROBLEM_CODE;
  protected readonly roles = PROBLEM_ROLES;
  protected readonly arrows = PROBLEM_ARROWS;
  protected readonly semibold = fontWeights.semibold;
  protected readonly normal = fontWeights.normal;

  protected rowClass(checked: boolean): string {
    return `group relative flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors duration-80 ${this.shape().item} ${
      checked ? 'bg-active' : 'hover:bg-hover'
    }`;
  }

  protected rowIconClass(checked: boolean): string {
    return `shrink-0 mt-0.5 transition-colors duration-80 ${
      checked ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
    }`;
  }

  protected rowLabelClass(checked: boolean): string {
    return `text-site-body transition-colors duration-80 ${
      checked ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
    }`;
  }

  protected annotationClass(align: 'left' | 'right'): string {
    return `absolute flex flex-col gap-0.5 ${align === 'right' ? 'items-end text-right' : 'items-start'}`;
  }
}
