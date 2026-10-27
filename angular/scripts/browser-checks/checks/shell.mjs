// Browser checks for the docs site's shell (see ../run.mjs): the 1280 rail ↔
// sheet breakpoint, the playground's right-rail portal, the old-route
// redirects and the 404.
//
// These drive the real chrome (nav rows, the mobile trigger, the router), not
// a component demo: the shell only exists around the docs pages.

const RAIL = 'ff-sidebar-shell';
const PANEL = '[data-site-right-panel]';
const SHEET = '[data-mobile="true"]';
const MOBILE_TRIGGER = 'button[aria-label="Toggle Sidebar"]';
const PLAYGROUND = 'app-playground-panel';

/** The layout the shell shows: the desktop rail, the panel and the trigger. */
function shellState(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('ff-sidebar-shell');
    const column = shell?.querySelector('[data-sidebar="sidebar"]');
    const inset = document.querySelector('main[ffSidebarInset]');
    const panel = document.querySelector('[data-site-right-panel]');
    const aside = panel?.querySelector('aside');
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };
    const trigger = document.querySelector('button[aria-label="Toggle Sidebar"]');
    return {
      railDisplay: shell ? getComputedStyle(shell).display : null,
      column: box(column),
      inset: box(inset),
      panel: { display: panel ? getComputedStyle(panel).display : null, box: box(aside) },
      panelText: aside?.innerText ?? '',
      triggerDisplay: trigger ? getComputedStyle(trigger).display : null,
      triggerBox: box(trigger),
      sheet: !!document.querySelector('[data-mobile="true"]'),
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

/** The sheet's painted box and its scrim's opacity, once per frame. */
const sheetProbe = () => {
  const panel = document.querySelector('[data-mobile="true"]');
  const scrim = document.querySelector('[data-slot="sidebar-sheet-backdrop"]');
  const r = panel?.getBoundingClientRect();
  return {
    x: r ? r.left : null,
    w: r ? r.width : null,
    o: scrim ? Number(getComputedStyle(scrim).opacity) : null,
  };
};

/** Playground copies: parked in the rail, inline in the page column, or both. */
function playgroundCounts(page) {
  return page.evaluate(
    ({ panel, playground }) => ({
      rail: document.querySelectorAll(`${panel} ${playground}`).length,
      inline: document.querySelectorAll(`main[ffSidebarInset] ${playground}`).length,
      total: document.querySelectorAll(playground).length,
      targetChildren: document.querySelector(`${panel} [appRightRailTarget]`)?.childElementCount ?? -1,
    }),
    { panel: PANEL, playground: PLAYGROUND },
  );
}

async function waitForCounts(page, expected) {
  await page.waitForFunction(
    ({ panel, playground, expected }) => {
      const counts = {
        rail: document.querySelectorAll(`${panel} ${playground}`).length,
        inline: document.querySelectorAll(`main[ffSidebarInset] ${playground}`).length,
        total: document.querySelectorAll(playground).length,
      };
      return Object.entries(expected).every(([key, value]) => counts[key] === value);
    },
    { panel: PANEL, playground: PLAYGROUND, expected },
    { timeout: 5000 },
  );
}

// ─── The 1280 breakpoint ────────────────────────────────────────────────────

// At and above 1280px the sidebar is a column in the layout and the right
// panel is on screen beside the page; below it the rail leaves the layout and
// a fixed trigger opens the sidebar as a modal sheet. A route change inside
// that sheet closes it (CloseSheetOnNavigate), so a nav row never leaves the
// drawer covering the page it just opened.
const shellBreakpoint = {
  name: 'shell: at 1280 the rail is a column with the right panel, below it a sheet opens from the trigger and closes on navigation',
  path: '',
  viewport: { width: 1440, height: 900 },
  async run(page, h) {
    const wide = await shellState(page);
    h.assert(wide.railDisplay !== 'none', 'the rail is not part of the layout at 1440', wide.railDisplay);
    h.assert(wide.column && wide.column.width >= 200, 'the rail is not a column at 1440', wide.column);
    h.assert(wide.inset.left >= wide.column.right - 1, 'the page column does not start beside the rail', wide);
    h.assert(wide.triggerDisplay === 'none', 'the mobile trigger shows on the desktop rail', wide.triggerDisplay);
    h.assert(!wide.sheet, 'a mobile sheet is mounted on the desktop rail');
    h.assert(wide.panel.display !== 'none', 'the right panel is hidden at 1440', wide.panel);
    h.assert(wide.panel.box && wide.panel.box.width >= 200, 'the right panel has no box at 1440', wide.panel);
    h.assert(
      wide.panel.box.left >= 0 && wide.panel.box.right <= wide.viewport.width + 0.5,
      'the right panel is off screen at 1440',
      wide.panel,
    );
    h.assert(/Make them yours/.test(wide.panelText), 'the right panel does not hold the settings', wide.panelText);

    // 1280 is the boundary: still the column, still the panel.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(250);
    const edge = await shellState(page);
    h.assert(edge.railDisplay !== 'none', 'the rail left the layout at exactly 1280', edge.railDisplay);
    h.assert(edge.panel.display !== 'none' && edge.panel.box.width >= 200, 'the right panel is hidden at exactly 1280', edge.panel);
    h.assert(!edge.sheet, 'a sheet is mounted at exactly 1280');

    // One pixel narrower: the rail is gone and the trigger takes over.
    await page.setViewportSize({ width: 1279, height: 900 });
    await page.waitForTimeout(250);
    const narrow = await shellState(page);
    h.assert(narrow.railDisplay === 'none', 'the rail is still in the layout at 1279', narrow.railDisplay);
    h.assert(narrow.triggerDisplay !== 'none', 'the mobile trigger is hidden below 1280', narrow.triggerDisplay);
    h.assert(narrow.panel.display === 'none' || narrow.panel.box.width === 0, 'the right panel is still on screen at 1279', narrow.panel);
    h.assert(!narrow.sheet, 'a sheet is mounted before the trigger is pressed');

    // The sheet itself: spring from the left edge over a fading scrim.
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.waitForTimeout(250);
    const trigger = page.locator(MOBILE_TRIGGER).first();
    const series = await h.sample(page, sheetProbe, () => trigger.click(), 800);
    const width = series.map((s) => s.v.w).filter((w) => typeof w === 'number').at(-1);
    h.assert(width > 200, 'the sheet never mounted', series.at(-1));
    const xs = series.map((s) => s.v.x).filter((x) => typeof x === 'number');
    const sliding = xs.filter((x) => x > -width + 2 && x < -2);
    h.assert(sliding.length >= 2, 'the sheet snapped in instead of sliding', xs);
    h.near(xs.at(-1), 0, 0.5, 'the sheet did not settle flush with the left edge');
    const os = series.map((s) => s.v.o).filter((o) => typeof o === 'number');
    const fading = os.filter((o) => o > 0.02 && o < 0.98);
    h.assert(fading.length >= 1, 'the scrim snapped in instead of fading', os.slice(0, 8));
    h.near(os.at(-1), 1, 0.01, 'the scrim did not settle opaque');

    const opened = await page.evaluate(
      ({ sheet }) => {
        const panel = document.querySelector(sheet);
        return {
          role: panel?.getAttribute('role'),
          modal: panel?.getAttribute('aria-modal'),
          text: panel?.innerText ?? '',
          focusInside: panel?.contains(document.activeElement) ?? false,
          scrim: !!document.querySelector('[data-slot="sidebar-sheet-backdrop"]'),
        };
      },
      { sheet: SHEET },
    );
    h.assert(opened.role === 'dialog' && opened.modal === 'true', 'the sheet is not a modal dialog', opened);
    h.assert(opened.scrim, 'the sheet has no scrim');
    h.assert(/\bSearch\b/.test(opened.text) && /\bShowcase\b/.test(opened.text), 'the sheet does not hold the site nav', opened.text.slice(0, 120));
    h.assert(opened.focusInside, 'focus did not move into the sheet');

    // Navigating inside the sheet closes it once the route lands.
    await page.locator(`${SHEET} a`, { hasText: 'Introduction' }).first().click();
    await page.waitForURL('**/docs');
    await page.locator(SHEET).waitFor({ state: 'detached', timeout: 5000 });
    h.assert(new URL(page.url()).pathname === '/docs', 'the nav row did not navigate', page.url());
    const after = await page.evaluate(() => ({
      sheet: !!document.querySelector('[data-mobile="true"]'),
      scrim: !!document.querySelector('[data-slot="sidebar-sheet-backdrop"]'),
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
    }));
    h.assert(!after.sheet && !after.scrim, 'the sheet stayed open after navigating', after);
    h.assert(/Introduction/.test(after.h1), 'the navigation did not reach the Introduction page', after.h1);

    // Escape and a scrim press dismiss it like any modal sheet, with focus
    // back on the trigger.
    for (const [how, close] of [
      ['Escape', () => page.keyboard.press('Escape')],
      ['a scrim press', () => page.mouse.click(700, 450)],
    ]) {
      await trigger.click();
      await page.locator(SHEET).waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(600);
      await close();
      await page.locator(SHEET).waitFor({ state: 'detached', timeout: 5000 });
      h.assert(
        await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Toggle Sidebar'),
        `focus did not return to the trigger after ${how}`,
      );
    }
  },
};

// ─── The right-rail portal ──────────────────────────────────────────────────

// A doc page's playground keeps its preview in the page column and parks its
// controls in the right panel at >=1280px; below that the panel is gone and
// the same controls render inline under the preview, never both. Navigating
// to a page without a playground empties the rail (the page's view is
// destroyed and the rail cleared).
const rightRailPortal = {
  name: 'shell: the playground controls park in the right rail at 1440, render inline at 390, and a nav empties the rail',
  path: 'docs/card',
  viewport: { width: 1440, height: 900 },
  async run(page, h) {
    const parked = await playgroundCounts(page);
    h.assert(parked.rail === 1, 'the controls are not in the right rail at 1440', parked);
    h.assert(parked.inline === 0, 'the controls are also inline at 1440', parked);
    h.assert(parked.total === 1, 'the controls render more than once at 1440', parked);
    h.assert(parked.targetChildren === 1, 'the rail target holds no view', parked);

    // Phones: the same controls, inline in the page column.
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForCounts(page, { rail: 0, inline: 1, total: 1 });
    const inline = await playgroundCounts(page);
    h.assert(inline.inline === 1, 'the controls are not inline at 390', inline);

    // Back on the desktop rail.
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForCounts(page, { rail: 1, inline: 0, total: 1 });

    // A nav to a page with no playground leaves the rail empty.
    await page.locator(`${RAIL} a[href$="chat-message"]`).first().click();
    await page.waitForURL('**/docs/chat-message');
    await page.waitForFunction(
      ({ panel, playground }) => document.querySelectorAll(`${panel} ${playground}`).length === 0,
      { panel: PANEL, playground: PLAYGROUND },
      { timeout: 5000 },
    );
    const after = await playgroundCounts(page);
    h.assert(after.rail === 0 && after.total === 0, 'the rail kept the previous page controls', after);
    const h1 = await page.locator('h1').first().innerText();
    h.assert(/ChatMessage/.test(h1), 'the nav row did not reach ChatMessage', h1);
  },
};

// ─── Redirects ──────────────────────────────────────────────────────────────

// Every route the old showcase shipped still resolves: S7 maps each one onto
// its docs page, so an old bookmark or a deployed link keeps working.
const redirects = {
  name: 'shell: the old showcase routes redirect to their docs pages',
  path: '',
  viewport: { width: 1280, height: 900 },
  async run(page, h) {
    const pairs = [
      ['/foundations', '/docs/surfaces', 'Surfaces'],
      ['/scroll-area', '/docs/scrollbars', 'Scrollbars'],
      ['/menu-item', '/docs/dropdown', 'Dropdown'],
    ];
    for (const [from, to, title] of pairs) {
      const origin = new URL(page.url()).origin;
      await page.goto(`${origin}${from}`, { waitUntil: 'networkidle' });
      await page.waitForURL(`**${to}`);
      const landed = await page.evaluate(() => ({
        path: location.pathname,
        h1: document.querySelector('h1')?.textContent?.trim() ?? '',
        notFound: !!document.querySelector('[data-not-found]'),
      }));
      h.assert(landed.path === to, `${from} did not land on ${to}`, landed.path);
      h.assert(new RegExp(`^${title}$`).test(landed.h1), `${from} landed on another page`, landed.h1);
      h.assert(!landed.notFound, `${from} rendered the 404`, landed);
    }
  },
};

// ─── 404 ────────────────────────────────────────────────────────────────────

// An unknown deep path renders the site's 404 ("A little out of place.") in
// the shell, with the right panel hidden: the settings panel has nothing to
// configure there, and the reference hides it with a `:has` rule.
const notFound = {
  name: 'shell: a deep unknown path renders the 404 without the right panel',
  path: 'docs/unknown/deep-link',
  viewport: { width: 1440, height: 900 },
  async run(page, h) {
    const state = await page.evaluate(
      ({ panel }) => {
        const notFound = document.querySelector('[data-not-found]');
        const wrapper = document.querySelector(panel);
        const aside = wrapper?.querySelector('aside');
        const r = aside?.getBoundingClientRect();
        return {
          found: !!notFound,
          text: notFound?.innerText ?? '',
          panelDisplay: wrapper ? getComputedStyle(wrapper).display : null,
          asideVisible: aside ? !!aside.checkVisibility?.() : false,
          asideWidth: r?.width ?? 0,
          back: [...(notFound?.querySelectorAll('a') ?? [])].map((a) => a.textContent.trim()),
        };
      },
      { panel: PANEL },
    );
    h.assert(state.found, 'the 404 page did not render');
    h.assert(/A little out of place\./.test(state.text), 'the 404 title is missing', state.text);
    h.assert(/We couldn’t find this page\./.test(state.text), 'the 404 sentence is missing', state.text);
    h.assert(state.back.includes('Back to showcase'), 'the 404 has no way back', state.back);
    h.assert(state.panelDisplay === 'none', 'the right panel is displayed on the 404', state.panelDisplay);
    h.assert(!state.asideVisible && state.asideWidth === 0, 'the right panel settings are visible on the 404', state);
  },
};

export const checks = [shellBreakpoint, rightRailPortal, redirects, notFound];
