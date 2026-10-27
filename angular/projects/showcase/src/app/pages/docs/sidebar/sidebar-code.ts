// ---------------------------------------------------------------------------
// The playground's teaching snippet: the configuration the visitor built, as
// an Angular shell template (ported from `buildSidebarPlaygroundCode` in
// lib/docs/playgrounds/sidebar.tsx).
//
// The React version emitted JSX with free identifiers. This one emits what the
// Angular API actually takes: `ff-` elements and `ff…` attribute directives on
// the element they sit on, icon names instead of icon components, and
// `provideFluid()` for the shape and size steps the configuration was shared
// with (D5). The comment density is the reference's: the load-bearing classes
// travel with the code.
// ---------------------------------------------------------------------------

import type { Count3, PlayState, PresetGlobals, RowAction } from './sidebar-preset';
import {
  FOOTER_ACTION_SET,
  GROUP_ACTION_SET,
  HEADER_ACTION_SET,
  ROW_ACTION_SET,
  SEARCH_SHORTCUT,
  SECTION_LABELS,
} from './sidebar-preset';

/** One row action: a tooltipped action, or the overflow menu (a dropdown whose
 *  240px content matches the header/footer popups, so every menu in the
 *  sidebar reads as one family). */
function rowActionLines(count: Count3, indent: string): string[] {
  if (count === 0) return [];
  const actions = ROW_ACTION_SET.slice(-count);
  const one = (action: RowAction, showOnHover: boolean, ind: string): string[] =>
    action.menu
      ? [
          `${ind}<ff-dropdown-menu>`,
          `${ind}  <button ffSidebarMenuAction${showOnHover ? ' showOnHover' : ''} ffDropdownTrigger aria-label="${action.label}">`,
          `${ind}    <ff-icon name="${action.icon}" />`,
          `${ind}  </button>`,
          `${ind}  <!-- 240px — the header/footer trigger width -->`,
          `${ind}  <ff-dropdown-content class="min-w-0 w-[240px]" align="start" [sideOffset]="4">`,
          `${ind}    <ff-menu-item [index]="0" icon="pencil" label="Rename" />`,
          `${ind}    <ff-menu-item [index]="1" icon="link" label="Share" />`,
          `${ind}    <ff-menu-item [index]="2" icon="x" label="Delete" />`,
          `${ind}  </ff-dropdown-content>`,
          `${ind}</ff-dropdown-menu>`,
        ]
      : [
          `${ind}<ff-tooltip content="${action.label}" side="top">`,
          `${ind}  <button ffSidebarMenuAction${showOnHover ? ' showOnHover' : ''} aria-label="${action.label}">`,
          `${ind}    <ff-icon name="${action.icon}" />`,
          `${ind}  </button>`,
          `${ind}</ff-tooltip>`,
        ];
  if (count === 1) return one(actions[0], true, indent);
  return [
    `${indent}<!-- more than one action: the cluster owns the row's gutter -->`,
    `${indent}<div ffSidebarMenuActions showOnHover>`,
    ...actions.flatMap((action) => one(action, false, `${indent}  `)),
    `${indent}</div>`,
  ];
}

/** The brand row, as the shipped block renders it. */
function brandRowLines(variant: 'dropdown' | 'logo', indent: string): string[] {
  if (variant === 'logo') {
    return [
      `${indent}<!-- logo lockup — not interactive, so the block drops its menu:`,
      `${indent}     no SidebarMenu row would track the traveling hover background -->`,
      `${indent}<ff-sidebar-workspace-header name="Acme Inc">`,
      `${indent}  <span ffWorkspaceTile>A</span>`,
      `${indent}</ff-sidebar-workspace-header>`,
    ];
  }
  return [
    `${indent}<!-- workspace switcher: the tile on the rows' leading axis, the chevron`,
    `${indent}     on their trailing one, and the popup on the shared menu grid -->`,
    `${indent}<ff-sidebar-workspace-header name="Acme Inc" [checkedIndex]="0">`,
    `${indent}  <span ffWorkspaceTile>A</span>`,
    `${indent}  <ng-template ffSidebarBlockMenu>`,
    `${indent}    <ff-menu-item [index]="0" icon="rocket" label="Acme Inc" [checked]="true" />`,
    `${indent}    <ff-menu-item [index]="1" icon="plus" label="New workspace" />`,
    `${indent}  </ng-template>`,
    `${indent}</ff-sidebar-workspace-header>`,
  ];
}

/** The header's inline icon buttons: the label plus its keystroke chip. */
function iconButtonLines(
  label: string,
  icon: string,
  shortcut: string | null,
  indent: string,
  tipTemplateName: string,
): string[] {
  const content = shortcut ? `[content]="${tipTemplateName}"` : `content="${label}"`;
  return [
    `${indent}<ff-tooltip ${content} side="bottom">`,
    `${indent}  <button ffButton variant="ghost" size="icon-compact" class="size-6 shrink-0" aria-label="${label}">`,
    `${indent}    <ff-icon name="${icon}" />`,
    `${indent}  </button>`,
    `${indent}</ff-tooltip>`,
  ];
}

/** The label-plus-keystroke tooltip content the inline header buttons point
 *  at: one template each, height-matched to a chipless tooltip. */
function tipTemplateLines(label: string, shortcut: string, name: string, indent: string): string[] {
  return [
    `${indent}<ng-template #${name}>`,
    `${indent}  <span class="flex items-center gap-2">`,
    `${indent}    <span class="[text-box:trim-both_cap_alphabetic]">${label}</span>`,
    `${indent}    <kbd class="-my-1 flex h-4 min-w-4 items-center justify-center rounded border border-background/30 px-1 font-sans text-[10px] text-background">${shortcut}</kbd>`,
    `${indent}  </span>`,
    `${indent}</ng-template>`,
  ];
}

/** The footer's user row: the `ff-sidebar-user-footer` block on the shared
 *  popup grid. */
function userRowLines(horizontal: boolean, indent: string): string[] {
  return [
    `${indent}<ff-sidebar-user-footer name="Micka Touillaud"${horizontal ? ` class="min-w-0 flex-1"` : ''}>`,
    `${indent}  <!-- -ml-0.5 centres the 20px avatar on the rows' leading icon axis;`,
    `${indent}       the chevron rides a 24px slot pulled -mr-0.5 onto the trailing`,
    `${indent}       action axis -->`,
    `${indent}  <img src="avatar.png" alt="" width="20" height="20"`,
    `${indent}    class="-ml-0.5 -mr-0.5 size-5 shrink-0 rounded-full outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10" />`,
    `${indent}  <ng-template ffSidebarBlockMenu>`,
    `${indent}    <ff-menu-item [index]="0" icon="user" label="Profile" />`,
    `${indent}    <ff-menu-item [index]="1" icon="settings" label="Settings" />`,
    `${indent}    <ff-menu-item [index]="2" icon="arrow-left" label="Log out" />`,
    `${indent}  </ng-template>`,
    `${indent}</ff-sidebar-user-footer>`,
  ];
}

/** The anchored footer callout: a Card one surface step above the rail. */
function calloutLines(variant: 'inline' | 'banner', indent: string): string[] {
  const card = [
    `<!-- anchored callout: a Card resting one surface step above the rail,`,
    `     rising another under the pointer -->`,
    `<ff-card size="compact" dismissible label="Sidebar is here — new in Fluid Functionalism" (dismiss)="hideCallout()">`,
    variant === 'banner'
      ? '  <img ffCardImage src="banner.png" class="aspect-[2/1] max-h-28" />'
      : '  <ff-card-media icon="panel-left" [size]="18" />',
    `  <div ffCardHeader class="${variant === 'banner' ? 'gap-0 pt-3' : 'gap-[2px] py-3'}">`,
    '    <span ffCardTitle class="truncate">Sidebar is here</span>',
    '    <p ffCardDescription class="truncate text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)]">New in Fluid Functionalism</p>',
    '  </div>',
    '</ff-card>',
  ];
  if (variant === 'banner') return card.map((line) => `${indent}${line}`);
  // Inline orientation puts the icon beside the text (the group owns it).
  return [
    ...card.slice(0, 2).map((line) => `${indent}${line}`),
    `${indent}<ff-card-group orientation="inline" [fluidHover]="false">`,
    ...card.slice(2).map((line) => `${indent}  ${line}`),
    `${indent}</ff-card-group>`,
  ];
}

/** The stacked callouts: a sonner-style pile of three cards. */
function stackedCalloutLines(variant: 'inline' | 'banner', indent: string): string[] {
  const lines = [
    `${indent}<!-- Stacked callouts — a sonner-style pile: cards peek 12px apiece`,
    `${indent}     behind the front one (scaling down 0.05 a step, two peeks max).`,
  ];
  if (variant === 'banner') {
    lines.push(
      `${indent}     Banner piles never fan out (too tall for a footer) — dismissing`,
      `${indent}     the front card is what reveals and promotes the next.`,
    );
  } else {
    lines.push(
      `${indent}     The inline pile fans out into a column on hover, and dismissing`,
      `${indent}     the front card reveals and promotes the next.`,
    );
  }
  lines.push(
    `${indent}     Each card keeps its own step of the brand mesh's intensity`,
    `${indent}     ladder. Bottom-anchored absolutes inside an in-flow container`,
    `${indent}     whose measured height springs between the pile's states. -->`,
  );
  if (variant === 'banner') {
    lines.push(`${indent}<div class="relative" [style.height.px]="collapsedH">`);
  } else {
    lines.push(
      `${indent}<div class="relative" [style.height.px]="expanded ? expandedH : collapsedH"`,
      `${indent}  (mouseenter)="expanded = true" (mouseleave)="expanded = false">`,
    );
  }
  const cardIndent = `${indent}    `;
  const open = `${indent}  `;
  lines.push(`${open}@for (c of callouts; track c.id; let i = $index) {`);
  lines.push(
    `${open}  <div class="absolute inset-x-0 bottom-0" style="transform-origin: bottom center"`,
    `${open}    [style.z-index]="100 - i"`,
  );
  lines.push(
    variant === 'banner'
      ? `${open}    [style.transform]="'translateY(' + -Math.min(i, 2) * 12 + 'px) scale(' + (1 - Math.min(i, 2) * 0.05) + ')'">`
      : `${open}    [style.transform]="expanded ? 'translateY(' + -i * (cardH + 4) + 'px)' : 'translateY(' + -Math.min(i, 2) * 12 + 'px) scale(' + (1 - Math.min(i, 2) * 0.05) + ')'">`,
  );
  const inline = variant === 'inline';
  const wrap = inline ? `${open}    ` : `${open}  `;
  if (inline) lines.push(`${wrap}<ff-card-group orientation="inline" [fluidHover]="false">`);
  const card = inline ? `${wrap}  ` : wrap;
  lines.push(
    `${card}<ff-card size="compact" dismissible [label]="c.title + ' — ' + c.desc" (dismiss)="dismiss(c.id)">`,
    inline
      ? `${card}  <ff-card-media [icon]="c.icon" [size]="18" />`
      : `${card}  <img ffCardImage [src]="c.mesh" class="aspect-[2/1] max-h-28" />`,
    `${card}  <div ffCardHeader class="${variant === 'banner' ? 'gap-0 pt-3' : 'gap-[2px] py-3'}">`,
    `${card}    <span ffCardTitle class="truncate">{{ c.title }}</span>`,
    `${card}    <p ffCardDescription class="truncate text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)]">{{ c.desc }}</p>`,
    `${card}  </div>`,
    `${card}</ff-card>`,
  );
  if (inline) lines.push(`${wrap}</ff-card-group>`);
  lines.push(`${open}  </div>`, `${open}}`, `${indent}</div>`);
  return lines;
}

/** The configuration, as an Angular shell template. `globals` is the site's
 *  shape and size steps — the only settings a snippet pins. */
export function buildSidebarPlaygroundCode(
  state: PlayState,
  globals: Pick<PresetGlobals, 'shape' | 'size'>,
): string {
  const loading = state.state === 'loading';
  // Threads are leaves — only the icon menu nests.
  const nests = state.l1Primary === 'menu' && state.l1Children;
  // What the snippet actually renders, so the import list stays honest:
  // loading swaps the body rows for skeletons (and drops the sub-tree), but
  // the brand row, the user row, and the vertical header/footer action stacks
  // still emit menu rows even while loading.
  const menuRows =
    !loading ||
    state.headerPrimary === 'dropdown' ||
    state.footerPrimary === 'dropdown' ||
    (state.headerStack === 'vertical' && state.headerActions > 0) ||
    (state.footerStack === 'vertical' && state.footerActions > 0);
  const maxActions = loading ? 0 : Math.max(state.l1Actions, nests ? state.l2Actions : 0);
  const anyBadge = !loading && (state.l1Badges || (nests && state.l2Badges));
  const hasFooter =
    state.footerPrimary === 'dropdown' || state.footerActions > 0 || state.footerCallout !== 'none';
  const anyMenuPopup = state.headerPrimary === 'dropdown' || state.footerPrimary === 'dropdown';
  const headerActions = HEADER_ACTION_SET.slice(0, state.headerActions);
  const footerActions = FOOTER_ACTION_SET.slice(0, state.footerActions);
  const headerHorizontal = state.headerStack === 'horizontal';
  const footerHorizontal = state.footerStack === 'horizontal';
  const peek = state.collapsedBehavior !== 'none';
  const anyTooltip =
    maxActions > 0 ||
    state.sectionActions > 0 ||
    headerHorizontal ||
    (footerHorizontal && footerActions.length > 0);
  const stacked = state.footerCallout !== 'none' && state.footerCalloutStacked;

  // ── Imports ──
  const symbols: string[] = ['provideFluid', 'SidebarProvider', 'Sidebar', 'SidebarTrigger', 'SidebarInset'];
  symbols.push('SidebarHeader', 'SidebarContent');
  if (hasFooter) symbols.push('SidebarFooter');
  symbols.push('SidebarGroup', 'SidebarGroupLabel');
  if (state.sectionActions > 0) symbols.push('SidebarGroupActions', 'SidebarGroupAction');
  symbols.push('SidebarMenu');
  if (menuRows) symbols.push('SidebarMenuItem', 'SidebarMenuButton');
  if (anyBadge) symbols.push('SidebarMenuBadge');
  if (maxActions > 0) symbols.push('SidebarMenuAction');
  if (maxActions > 1) symbols.push('SidebarMenuActions');
  if (nests && !loading) symbols.push('SidebarMenuSub', 'SidebarMenuSubItem', 'SidebarMenuSubButton');
  if (loading) symbols.push('SidebarMenuSkeleton');
  if (state.headerStack === 'vertical') symbols.push('SidebarSearchField');
  if (state.headerPrimary !== 'none') {
    symbols.push('SidebarWorkspaceHeader', 'WorkspaceTile');
    if (state.headerPrimary === 'dropdown') symbols.push('SidebarBlockMenu');
  }
  if (state.footerPrimary === 'dropdown') symbols.push('SidebarUserFooter');
  symbols.push('SidebarInsetTopbar');
  if (anyMenuPopup || maxActions > 0) symbols.push('DropdownMenu', 'DropdownTrigger', 'DropdownContent', 'MenuItem');
  if (anyTooltip) symbols.push('Tooltip');
  if (headerHorizontal || (footerHorizontal && footerActions.length > 0)) symbols.push('Button');
  if (maxActions > 0 || state.sectionActions > 0 || headerHorizontal || state.headerPrimary === 'dropdown') {
    symbols.push('Icon');
  }
  if (stacked || state.footerCallout !== 'none') {
    symbols.push('Card', 'CardGroup', 'CardMedia', 'CardImage', 'CardHeader', 'CardTitle', 'CardDescription');
  }

  const lines: string[] = [];
  lines.push(`import {`);
  // Wrapped import list: four names a line, like the components' own imports.
  for (let index = 0; index < symbols.length; index += 4) {
    lines.push(`  ${symbols.slice(index, index + 4).join(', ')},`);
  }
  lines.push(`} from '@angel-r/fluid-functionalism-angular';`);
  lines.push(``);
  lines.push(`// Pin the shape and size steps this configuration was shared with, once, in`);
  lines.push(`// bootstrapApplication's providers:`);
  lines.push(`provideFluid({ shape: '${globals.shape}', size: '${globals.size}' });`);
  lines.push(``);
  lines.push(`// <app-shell> template`);
  const providerProps =
    ` [open]="open()" (openChange)="open.set($event)"` +
    (peek ? ` peek="${state.collapsedBehavior}"` : ``);
  lines.push(`<ff-sidebar-provider${providerProps}>`);
  lines.push(`  <ff-sidebar${state.design !== 'sidebar' ? ` variant="${state.design}"` : ''}>`);

  // ── Header ──
  lines.push(`    <div ffSidebarHeader>`);
  if (headerHorizontal) {
    lines.push(
      `      <!-- horizontal: search + actions share the brand line as 24px`,
      `          buttons, inset pr-1.5 onto the section actions' axis; each`,
      `          button's tooltip carries its keystroke chip -->`,
    );
    lines.push(...tipTemplateLines('Search', SEARCH_SHORTCUT, 'searchTip', '      '));
    for (const action of headerActions) {
      const name = `${action.label.charAt(0).toLowerCase()}${action.label.slice(1)}Tip`;
      lines.push(...tipTemplateLines(action.label, action.shortcut, name, '      '));
    }
    lines.push(`      <div class="flex items-center gap-1 pr-1.5">`);
    // The brand slot keeps its flex-1 spacer even when empty, so the icon
    // buttons hold the trailing edge exactly as the preview does.
    if (state.headerPrimary === 'none') {
      lines.push(`        <div class="min-w-0 flex-1"></div>`);
    } else {
      lines.push(`        <div class="min-w-0 flex-1">`);
      lines.push(...brandRowLines(state.headerPrimary, '          '));
      lines.push(`        </div>`);
    }
    lines.push(...iconButtonLines('Search', 'search', SEARCH_SHORTCUT, '        ', 'searchTip'));
    for (const action of headerActions) {
      const name = `${action.label.charAt(0).toLowerCase()}${action.label.slice(1)}Tip`;
      lines.push(...iconButtonLines(action.label, action.icon, action.shortcut, '        ', name));
    }
    lines.push(`      </div>`);
  } else {
    if (state.headerPrimary !== 'none') {
      lines.push(...brandRowLines(state.headerPrimary, '      '));
    }
    lines.push(
      `      <!-- search + action rows are ONE block: the field reads as the`,
      `          list's first row, on the menu rows' own tight rhythm -->`,
      `      <div class="flex flex-col">`,
      `        <ff-sidebar-search-field />`,
    );
    if (headerActions.length > 0) {
      lines.push(`        <ul ffSidebarMenu aria-label="Actions">`);
      for (const action of headerActions) {
        lines.push(
          `          <li ffSidebarMenuItem>`,
          `            <button ffSidebarMenuButton icon="${action.icon}">`,
          `              ${action.label}`,
          `              <!-- shortcut chip, revealed on row hover -->`,
          `              <span class="ml-auto inline-flex opacity-0 transition-opacity duration-80 group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100">`,
          `                <kbd class="font-sans text-[11px] leading-3.5 text-muted-foreground">${action.shortcut}</kbd>`,
          `              </span>`,
          `            </button>`,
          `          </li>`,
        );
      }
      lines.push(`        </ul>`);
    }
    lines.push(`      </div>`);
  }
  lines.push(`    </div>`);

  // ── Content ──
  lines.push(`    <ff-sidebar-content>`);
  lines.push(`      <ff-sidebar-group${state.sectionsCollapsible ? ' collapsible' : ''}>`);
  lines.push(`        <ff-sidebar-group-label>${SECTION_LABELS[state.l1Primary][0]}</ff-sidebar-group-label>`);
  if (state.sectionActions > 0) {
    lines.push(`        <div ffSidebarGroupActions>`);
    for (const action of GROUP_ACTION_SET.slice(0, state.sectionActions)) {
      lines.push(
        `          <ff-tooltip content="${action.label}" side="top">`,
        `            <button ffSidebarGroupAction aria-label="${action.label}">`,
        `              <ff-icon name="${action.icon}" />`,
        `            </button>`,
        `          </ff-tooltip>`,
      );
    }
    lines.push(`        </div>`);
  }
  lines.push(`        <ul ffSidebarMenu>`, `          @for (item of items; track item.label) {`, `            <li ffSidebarMenuItem>`);
  if (loading) {
    lines.push(`              <div ffSidebarMenuSkeleton showIcon></div>`);
  } else {
    if (state.l1Primary === 'threads') {
      lines.push(
        `              <!-- semantic status drives the dot, data-status,`,
        `                  and the screen-reader "unread" text -->`,
        `              <button ffSidebarMenuButton [status]="item.status">{{ item.label }}</button>`,
      );
    } else if (nests) {
      lines.push(
        `              <!-- group/parent-row scopes the chevron reveal to the row's own`,
        `                  button; the pinned gutter keeps it from sliding on hover -->`,
        `              <button`,
        `                ffSidebarMenuButton`,
        `                [icon]="item.icon"`,
        `                [isActive]="!!item.active"`,
        `                [class]="item.children ? 'group/parent-row' : ''"`,
        `                [attr.aria-expanded]="item.children ? !!item.open : null"`,
        `                [style.--row-gutter]="item.children ? 'var(--row-gutter-hover)' : null"`,
        `              >`,
        `                {{ item.label }}`,
        `                @if (item.children) {`,
        `                  <span class="ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center">`,
        `                    <!-- one chevron-right glyph, sprung 90° while open; at rest an`,
        `                        open row hides it — hover/focus brings it back -->`,
        `                    <span class="inline-flex" [style.rotate]="item.open ? '90deg' : '0deg'">`,
        `                      <ff-icon`,
        `                        name="chevron-right"`,
        `                        [size]="16"`,
        `                        [strokeWidth]="1.5"`,
        `                        [class]="item.open`,
        `                          ? 'text-muted-foreground transition-opacity duration-80 opacity-0 group-hover/parent-row:opacity-100 group-focus-within/parent-row:opacity-100'`,
        `                          : 'text-muted-foreground transition-opacity duration-80 opacity-100'"`,
        `                      />`,
        `                    </span>`,
        `                  </span>`,
        `                }`,
        `              </button>`,
      );
    } else {
      lines.push(
        `              <button ffSidebarMenuButton [icon]="item.icon" [isActive]="!!item.active">`,
        `                {{ item.label }}`,
        `              </button>`,
      );
    }
    if (state.l1Badges) {
      lines.push(`              @if (item.badge) {`, `                <div ffSidebarMenuBadge>{{ item.badge }}</div>`, `              }`);
    }
    // A row that owns a sub-tree gives its trailing slot to the chevron, so
    // the printed code guards the actions the same way the preview does.
    if (nests && state.l1Actions > 0) {
      lines.push(`              @if (!item.children) {`, ...rowActionLines(state.l1Actions, '                '), `              }`);
    } else {
      lines.push(...rowActionLines(state.l1Actions, '              '));
    }
    if (nests) {
      lines.push(`              <ff-sidebar-menu-sub [open]="!!item.open">`);
      lines.push(`                @for (child of item.children ?? []; track child.label) {`);
      lines.push(`                  <li ffSidebarMenuSubItem>`);
      lines.push(
        state.l2Icon
          ? `                    <a ffSidebarMenuSubButton [icon]="child.icon" href="#">{{ child.label }}</a>`
          : `                    <a ffSidebarMenuSubButton href="#">{{ child.label }}</a>`,
      );
      if (state.l2Badges) {
        lines.push(
          `                    @if (child.badge) {`,
          `                      <div ffSidebarMenuBadge>{{ child.badge }}</div>`,
          `                    }`,
        );
      }
      lines.push(...rowActionLines(state.l2Actions, '                    '));
      lines.push(`                  </li>`, `                }`, `              </ff-sidebar-menu-sub>`);
    }
  }
  lines.push(`            </li>`, `          }`, `        </ul>`, `      </ff-sidebar-group>`);
  if (!loading) {
    lines.push(
      `      <ff-sidebar-group${state.sectionsCollapsible ? ' collapsible' : ''}>`,
      `        <ff-sidebar-group-label>${SECTION_LABELS[state.l1Primary][1]}</ff-sidebar-group-label>`,
      `        <ul ffSidebarMenu><!-- same row anatomy --></ul>`,
      `      </ff-sidebar-group>`,
    );
  }
  lines.push(`    </ff-sidebar-content>`);

  // ── Footer ──
  if (hasFooter) {
    // Flush to the edge only in the inset variant (see the shell).
    const calloutOnly =
      state.footerCallout !== 'none' &&
      state.footerPrimary === 'none' &&
      footerActions.length === 0 &&
      state.design === 'inset';
    if (calloutOnly) {
      lines.push(
        `    <!-- nothing under the card — it sits flush on the edge -->`,
        `    <div ffSidebarFooter class="pb-0">`,
      );
    } else {
      lines.push(`    <div ffSidebarFooter>`);
    }
    if (state.footerCallout !== 'none') {
      lines.push(
        ...(stacked ? stackedCalloutLines(state.footerCallout, '      ') : calloutLines(state.footerCallout, '      ')),
      );
    }
    // Vertical stacking puts the actions above the user row, so identity stays
    // anchored to the sidebar's outer edge.
    if (!footerHorizontal && footerActions.length > 0) {
      lines.push(`      <!-- vertical: actions stack above the user row -->`, `      <ul ffSidebarMenu aria-label="Footer actions">`);
      for (const action of footerActions) {
        lines.push(
          `        <li ffSidebarMenuItem>`,
          `          <button ffSidebarMenuButton icon="${action.icon}">${action.label}</button>`,
          `        </li>`,
        );
      }
      lines.push(`      </ul>`);
    }
    if (state.footerPrimary === 'dropdown' || (footerHorizontal && footerActions.length > 0)) {
      if (footerHorizontal) {
        lines.push(`      <div class="flex items-center gap-1 pr-1.5">`);
        if (state.footerPrimary === 'dropdown') lines.push(...userRowLines(true, '        '));
        for (const action of footerActions) {
          lines.push(
            `        <ff-tooltip content="${action.label}" side="top">`,
            `          <button ffButton variant="ghost" size="icon-compact" class="size-6 shrink-0" aria-label="${action.label}">`,
            `            <ff-icon name="${action.icon}" />`,
            `          </button>`,
            `        </ff-tooltip>`,
          );
        }
        lines.push(`      </div>`);
      } else if (state.footerPrimary === 'dropdown') {
        lines.push(...userRowLines(false, '      '));
      }
    }
    lines.push(`    </div>`);
  }

  lines.push(`  </ff-sidebar>`);
  // pt-2 aligns the inset with the floating rail's card edge.
  lines.push(`  <main ffSidebarInset${state.design === 'floating' ? ` class="pt-2"` : ''}>`);
  lines.push(`    <header ffSidebarInsetTopbar>`);
  if (peek) {
    lines.push(
      `      <!-- isPeeking comes from injectSidebar(), read on the component that`,
      `          owns this template: the trigger hides while the rail is peeked and`,
      `          fades back in late once the rail is pinned -->`,
      `      <ff-sidebar-trigger class="transition-opacity delay-200 duration-160" [class.opacity-0]="sidebar.isPeeking()" />`,
    );
  } else {
    lines.push(`      <ff-sidebar-trigger />`);
  }
  lines.push(`    </header>`, `    <!-- the page -->`, `    <ng-content />`, `  </main>`, `</ff-sidebar-provider>`);
  return lines.join('\n');
}
