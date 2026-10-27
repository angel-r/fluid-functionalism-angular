// Browser checks for layout springs (see ../run.mjs): the sidebar's mobile
// sheet and collapsed peek, the slider thumb, and the carousel-dots pill.
// Each one drives the showcase demo through its public UI and samples the
// moving element once per frame.

/** Pixel tolerance for a settled position: subpixel layout rounding only. */
const SETTLED_PX = 0.5;

/** The numbers in a sampled series, frames where the probe found nothing dropped. */
const numbers = (series, pick) => series.map((s) => pick(s.v)).filter((x) => typeof x === 'number');

const round = (xs) => xs.map((x) => Math.round(x * 10) / 10);

/**
 * Asserts a sampled travel from `from` to `to`: at least `min` frames strictly
 * in between (it animates instead of jumping), never past either end (no
 * overshoot), never turning back, and ending on `to`. An exit that `unmounts`
 * its element when the tween lands may be gone before a frame shows the end
 * pose, so its last frame only has to be 80% of the way there.
 */
function assertTravel(h, xs, from, to, label, { min = 3, tolerance = SETTLED_PX, unmounts = false } = {}) {
  const lo = Math.min(from, to) - tolerance;
  const hi = Math.max(from, to) + tolerance;
  const between = xs.filter((x) => x > lo + 2 * tolerance && x < hi - 2 * tolerance);
  h.assert(between.length >= min, `${label}: expected at least ${min} frames between ${from} and ${to}`, round(xs));
  h.assert(xs.every((x) => x >= lo && x <= hi), `${label}: left the ${from}..${to} range`, round(xs));
  const dir = Math.sign(to - from);
  h.assert(
    xs.every((x, i) => i === 0 || (x - xs[i - 1]) * dir >= -tolerance),
    `${label}: turned back on its way from ${from} to ${to}`,
    round(xs),
  );
  if (unmounts) {
    const covered = (xs.at(-1) - from) / (to - from);
    h.assert(covered >= 0.8, `${label}: its last frame stopped short of ${to}`, round(xs));
  } else {
    h.near(xs.at(-1), to, tolerance, `${label}: settles on ${to}`);
  }
}

/** Viewport centre of `locator`'s element, for mouse moves. */
async function center(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// ─── Sidebar: mobile sheet ──────────────────────────────────────────────────

// Below the provider's mobile breakpoint the rail leaves the layout and the
// sidebar lives in a modal sheet: the trigger slides it in from the left edge
// (spring.moderate, critically damped, so it never overshoots and bares the
// page) over a fading scrim, focus moves into it, and Escape or a scrim press
// slides it back out before it unmounts and focus returns to the trigger.
const sheetProbe = () => {
  const panel = document.querySelector('[data-mobile="true"]');
  const scrim = document.querySelector('[data-slot="sidebar-sheet-backdrop"]');
  const box = panel?.getBoundingClientRect();
  return {
    x: box ? box.left : null,
    w: box ? box.width : null,
    o: scrim ? Number(getComputedStyle(scrim).opacity) : null,
  };
};

async function openSheet(page, h, trigger) {
  const series = await h.sample(page, sheetProbe, () => trigger.click(), 700);
  const width = numbers(series, (v) => v.w).at(-1);
  h.assert(width > 200, 'sheet: the panel never mounted', series.at(-1));
  assertTravel(h, numbers(series, (v) => v.x), -width, 0, 'sheet panel slide-in');
  assertTravel(h, numbers(series, (v) => v.o), 0, 1, 'sheet scrim fade-in', { min: 2, tolerance: 0.02 });
  return width;
}

async function assertSheetClosedBy(page, h, close, width, how) {
  const series = await h.sample(page, sheetProbe, close, 700);
  const xs = numbers(series, (v) => v.x);
  assertTravel(h, xs, 0, -width, `sheet slide-out (${how})`, { min: 2, tolerance: width * 0.02, unmounts: true });
  h.assert(series.at(-1).v.x === null && series.at(-1).v.o === null, `sheet: still mounted after ${how}`, series.at(-1));
  h.assert(
    await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Toggle Sidebar'),
    `sheet: focus did not return to the trigger after ${how}`,
  );
}

const sidebarMobileSheet = {
  name: 'sidebar: mobile sheet slides in over a scrim and slides out on Escape and on a scrim press',
  path: 'sidebar-app',
  viewport: { width: 390, height: 844 },
  async run(page, h) {
    const layout = await page.evaluate(() => {
      const provider = document.querySelector('ff-sidebar-provider').getBoundingClientRect();
      const inset = document.querySelector('[ffSidebarInset]').getBoundingClientRect();
      const shell = document.querySelector('ff-sidebar-shell');
      return {
        shellDisplay: getComputedStyle(shell).display,
        // Every sidebar column outside a sheet, with its laid-out width.
        columns: [...document.querySelectorAll('[data-sidebar="sidebar"]')].map((c) => c.getBoundingClientRect().width),
        insetLeft: inset.left - provider.left,
        sheet: !!document.querySelector('[data-mobile="true"]'),
      };
    });
    h.assert(layout.shellDisplay === 'none', 'sheet: the rail is still in the layout at phone width', layout);
    h.assert(layout.columns.every((w) => w === 0), 'sheet: a sidebar column still takes room at phone width', layout);
    // The inset keeps the inset variant's margins except on the rail's side,
    // where it now starts at the frame edge.
    h.near(layout.insetLeft, 0, SETTLED_PX, 'sheet: the inset does not start at the frame edge');
    h.assert(!layout.sheet, 'sheet: mounted before the trigger was pressed');

    const trigger = page.locator('button[aria-label="Toggle Sidebar"]').first();
    const width = await openSheet(page, h, trigger);
    const opened = await page.evaluate(() => {
      const panel = document.querySelector('[data-mobile="true"]');
      return {
        role: panel.getAttribute('role'),
        modal: panel.getAttribute('aria-modal'),
        text: panel.innerText,
        focusInside: panel.contains(document.activeElement),
      };
    });
    h.assert(opened.role === 'dialog' && opened.modal === 'true', 'sheet: the panel is not a modal dialog', opened);
    h.assert(/Acme Inc/.test(opened.text) && /\bInbox\b/.test(opened.text), 'sheet: the sidebar content is missing', opened.text);
    h.assert(opened.focusInside, 'sheet: focus did not move into the panel');

    await assertSheetClosedBy(page, h, () => page.keyboard.press('Escape'), width, 'Escape');

    await openSheet(page, h, trigger);
    // A press on the scrim, to the right of the 18rem panel.
    const viewport = page.viewportSize();
    await assertSheetClosedBy(page, h, () => page.mouse.click((width + viewport.width) / 2, viewport.height / 2), width, 'scrim press');
  },
};

// ─── Sidebar: collapsed peek ────────────────────────────────────────────────

// A collapsed sidebar with `peek` keeps a 12px edge strip. Hover mode floats
// the sidebar out as a card after a 150ms intent delay, click mode on press;
// the card springs in from -108% (spring.moderate), and leaving it (hover) or
// Escape / an outside press (click) tweens it back out and unmounts it.
const peekProbe = (index) =>
  `() => {
    const section = [...document.querySelectorAll('app-demo-section')].filter((s) =>
      /^\\s*Resize, collapse & peek\\s*$/i.test(s.querySelector('h2')?.textContent ?? ''))[${index}];
    const frame = section.querySelector('ff-sidebar-provider').getBoundingClientRect();
    const card = section.querySelector('[data-sidebar="peek"]')?.getBoundingClientRect();
    return { x: card ? card.left - frame.left : null, w: card ? card.width : null };
  }`;

async function peekState(section) {
  return section.evaluate((s) => ({
    card: !!s.querySelector('[data-sidebar="peek"]'),
    expanded: s.querySelector('button[aria-label="Peek sidebar"]')?.getAttribute('aria-expanded') ?? null,
    text: s.querySelector('[data-sidebar="peek"]')?.innerText ?? '',
  }));
}

async function assertPeekIn(page, h, section, probe, action, label) {
  const series = await h.sample(page, probe, action, 800);
  const width = numbers(series, (v) => v.w).at(-1);
  h.assert(width > 200, `${label}: the peek card never mounted`, series.at(-1));
  assertTravel(h, numbers(series, (v) => v.x), -1.08 * width, 0, `${label} slide-in`);
  const state = await peekState(section);
  h.assert(state.expanded === 'true', `${label}: the strip is not expanded`, state);
  h.assert(/\bThreads\b/.test(state.text), `${label}: the card does not hold the sidebar content`, state.text);
  return series;
}

async function assertPeekOut(page, h, section, probe, action, width, label) {
  const series = await h.sample(page, probe, action, 900);
  assertTravel(h, numbers(series, (v) => v.x), 0, -1.08 * width, `${label} slide-out`, { min: 2, tolerance: width * 0.02, unmounts: true });
  h.assert(series.at(-1).v.x === null, `${label}: the card is still mounted`, series.at(-1));
  const state = await peekState(section);
  h.assert(state.expanded === 'false', `${label}: the strip is still expanded`, state);
  return series;
}

const sidebarPeekHover = {
  name: 'sidebar: hover peek floats the collapsed sidebar in after the intent delay and away on leave',
  path: 'sidebar',
  async run(page, h) {
    const section = h.section(page, 'Resize, collapse & peek', 0);
    await section.scrollIntoViewIfNeeded();
    // This demo starts open: collapse it from the topbar trigger first.
    await section.locator('main button[aria-label="Toggle Sidebar"]').click();
    const strip = section.locator('button[aria-label="Peek sidebar"]');
    await strip.waitFor();
    await page.waitForTimeout(600);
    const before = await peekState(section);
    h.assert(!before.card && before.expanded === 'false', 'hover peek: open before any hover', before);

    const probe = peekProbe(0);
    const at = await center(strip);
    const series = await assertPeekIn(page, h, section, probe, () => page.mouse.move(at.x, at.y), 'hover peek');
    const first = series.find((s) => s.v.x !== null);
    h.assert(first.t >= 140, 'hover peek: the card came in before the 150ms intent delay', { t: first.t });
    const width = numbers(series, (v) => v.w).at(-1);

    const frame = await section.locator('ff-sidebar-provider').boundingBox();
    await assertPeekOut(
      page,
      h,
      section,
      probe,
      () => page.mouse.move(frame.x + frame.width - 40, frame.y + frame.height / 2),
      width,
      'hover peek',
    );
  },
};

const sidebarPeekClick = {
  name: 'sidebar: click peek floats the collapsed sidebar in on press and away on Escape and an outside press',
  path: 'sidebar',
  async run(page, h) {
    const section = h.section(page, 'Resize, collapse & peek', 1);
    await section.scrollIntoViewIfNeeded();
    const strip = section.locator('button[aria-label="Peek sidebar"]');
    const before = await peekState(section);
    h.assert(!before.card && before.expanded === 'false', 'click peek: open before any press', before);
    // Click mode ignores hover: resting on the strip brings nothing in.
    const at = await center(strip);
    await page.mouse.move(at.x, at.y);
    await page.waitForTimeout(400);
    const hovered = await peekState(section);
    h.assert(!hovered.card, 'click peek: hovering the strip opened it', hovered);

    const probe = peekProbe(1);
    const series = await assertPeekIn(page, h, section, probe, () => strip.click(), 'click peek');
    const width = numbers(series, (v) => v.w).at(-1);
    await assertPeekOut(page, h, section, probe, () => page.keyboard.press('Escape'), width, 'click peek (Escape)');

    await assertPeekIn(page, h, section, probe, () => strip.click(), 'click peek');
    const frame = await section.locator('ff-sidebar-provider').boundingBox();
    await assertPeekOut(
      page,
      h,
      section,
      probe,
      () => page.mouse.click(frame.x + frame.width - 40, frame.y + frame.height / 2),
      width,
      'click peek (outside press)',
    );
  },
};

// ─── Slider ─────────────────────────────────────────────────────────────────

// The compact slider's visual thumb (20px) travels `width - 20` px over the
// value range. A press snaps to the step grid and springs the thumb there
// (spring.moderate) while the value, aria-valuenow and the value display jump
// to the new value at once; a drag places the thumb under the pointer with the
// value following, even off the track (pointer capture); arrow keys spring it
// onto the exact step.
const sliderProbe = (title, nth = 0) =>
  `() => {
    const section = [...document.querySelectorAll('app-demo-section')].find((s) =>
      /^\\s*${title}\\s*$/i.test(s.querySelector('h2')?.textContent ?? ''));
    const slider = section.querySelectorAll('ff-slider')[${nth}];
    const track = slider.querySelector('[data-slot="slider-track"]').getBoundingClientRect();
    const thumb = slider.querySelector('[data-slot="slider-thumb"]').getBoundingClientRect();
    return {
      x: thumb.left - track.left,
      travel: track.width - thumb.width,
      now: Number(slider.querySelector('[role="slider"]').getAttribute('aria-valuenow')),
      shown: slider.querySelector('[ffSliderValueDisplay]')?.innerText.trim() ?? null,
    };
  }`;

async function sliderState(page, probe) {
  return page.evaluate(`(${probe})()`);
}

/** Viewport point of `value` (0..100) on the track of the probed slider. */
async function sliderPoint(section, nth, value) {
  return section.evaluate(
    (s, [n, v]) => {
      const track = s.querySelectorAll('ff-slider')[n].querySelector('[data-slot="slider-track"]').getBoundingClientRect();
      return { x: track.left + 10 + (v / 100) * (track.width - 20), y: track.top + track.height / 2 };
    },
    [nth, value],
  );
}

const sliderPress = {
  name: 'slider: a press springs the thumb to the pressed value while the value jumps there',
  path: 'slider',
  async run(page, h) {
    const section = h.section(page, 'Compact');
    await section.scrollIntoViewIfNeeded();
    const probe = sliderProbe('Compact');
    const start = await sliderState(page, probe);
    h.assert(start.now === 25 && start.shown === '25', 'slider press: unexpected start value', start);
    h.near(start.x, 0.25 * start.travel, SETTLED_PX, 'slider press: thumb not at 25 before the press');

    const at = await sliderPoint(section, 0, 75);
    const series = await h.sample(page, probe, () => page.mouse.click(at.x, at.y), 700);
    const travel = start.travel;
    assertTravel(h, numbers(series, (v) => v.x), 0.25 * travel, 0.75 * travel, 'slider press thumb');
    // The value is not animated: it reads 75 from the first frame the thumb moves.
    const moving = series.filter((s) => s.v.x > 0.25 * travel + SETTLED_PX);
    h.assert(
      moving.every((s) => s.v.now === 75 && s.v.shown === '75'),
      'slider press: aria-valuenow / the value display lag the thumb',
      moving.map((s) => [s.v.now, s.v.shown]),
    );
  },
};

const sliderDrag = {
  name: 'slider: a drag keeps the thumb under the pointer, on and off the track, with the value following',
  path: 'slider',
  async run(page, h) {
    const section = h.section(page, 'Compact');
    await section.scrollIntoViewIfNeeded();
    const probe = sliderProbe('Compact');
    const { travel } = await sliderState(page, probe);
    const from = await sliderPoint(section, 0, 25);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    // The press springs the thumb onto the grid even when it is already
    // there, and that spring owns the motion value until it settles: moves
    // in the first ~100ms update the value but not the thumb (same in React,
    // whose press also animates and whose drag sets the value). Start the
    // drag once it has settled.
    await page.waitForTimeout(300);
    // 40px below the track's centre is outside its 36px press area: only
    // pointer capture keeps these moves on the slider.
    for (const value of [40, 60, 90, 70]) {
      const to = await sliderPoint(section, 0, value);
      await page.mouse.move(to.x, to.y + 40, { steps: 4 });
      await h.frames(page, 2);
      const state = await sliderState(page, probe);
      h.assert(state.now === value && state.shown === String(value), `slider drag: value did not follow to ${value}`, state);
      h.near(state.x, (value / 100) * travel, SETTLED_PX, `slider drag: thumb not under the pointer at ${value}`);
    }
    await page.mouse.up();
    await page.waitForTimeout(400);
    const end = await sliderState(page, probe);
    h.assert(end.now === 70, 'slider drag: release changed the value', end);
    h.near(end.x, 0.7 * travel, SETTLED_PX, 'slider drag: thumb moved on release');
  },
};

const sliderKeys = {
  name: 'slider: arrow keys spring the thumb exactly onto the next step',
  path: 'slider',
  async run(page, h) {
    const section = h.section(page, 'Steps');
    await section.scrollIntoViewIfNeeded();
    const probe = sliderProbe('Steps', 0);
    const start = await sliderState(page, probe);
    h.assert(start.now === 50, 'slider keys: unexpected start value', start);
    await section.locator('ff-slider').first().locator('[role="slider"]').focus();

    let value = 50;
    for (const [key, next] of [['ArrowRight', 75], ['ArrowLeft', 50], ['ArrowLeft', 25]]) {
      const series = await h.sample(page, probe, () => page.keyboard.press(key), 600);
      assertTravel(h, numbers(series, (v) => v.x), (value / 100) * start.travel, (next / 100) * start.travel, `slider ${key} to ${next}`);
      const end = series.at(-1).v;
      h.assert(end.now === next && end.shown === String(next), `slider keys: ${key} did not land on ${next}`, end);
      value = next;
    }
  },
};

// ─── Carousel dots ──────────────────────────────────────────────────────────

// Picking a dot moves the 24px pill to it: the chosen dot's track springs
// 6 → 24px while the previous one springs 24 → 6px (spring.moderate), so the
// pill's centre glides along the row and settles centred on the chosen dot's
// button. aria-current and the demo slide follow the pick.
const dotsProbe = () => {
  const section = [...document.querySelectorAll('app-demo-section')].find((s) =>
    /^\s*Static\s*$/i.test(s.querySelector('h2')?.textContent ?? ''),
  );
  const row = section.querySelector('ff-carousel-dots').getBoundingClientRect();
  const tracks = [...section.querySelectorAll('ff-carousel-dots button > span')].map((t) => t.getBoundingClientRect());
  const current = section.querySelector('ff-carousel-dots button[aria-current="true"]');
  const pill = current?.querySelector('span > span[aria-hidden="true"]')?.getBoundingClientRect();
  const buttons = [...section.querySelectorAll('ff-carousel-dots button')];
  return {
    widths: tracks.map((t) => t.width),
    centers: buttons.map((b) => b.getBoundingClientRect()).map((b) => b.left + b.width / 2 - row.left),
    pill: pill ? pill.left + pill.width / 2 - row.left : null,
    current: buttons.indexOf(current),
  };
};

const carouselDots = {
  name: 'carousel-dots: picking a dot glides the pill to it and settles centred on that dot',
  path: 'carousel-dots',
  async run(page, h) {
    const section = h.section(page, 'Static');
    await section.scrollIntoViewIfNeeded();
    const start = await page.evaluate(dotsProbe);
    h.assert(start.current === 0, 'carousel dots: unexpected start dot', start);
    h.assert(
      start.widths.every((w, i) => Math.abs(w - (i === 0 ? 24 : 6)) <= SETTLED_PX),
      'carousel dots: the start pill is not 24px on dot 0 with 6px dots elsewhere',
      start.widths,
    );

    let previous = 0;
    for (const [next, label] of [[3, 'Archive'], [1, 'Drafts']]) {
      const before = await page.evaluate(dotsProbe);
      const series = await h.sample(page, dotsProbe, () => section.getByRole('button', { name: `Show ${label}` }).click(), 700);
      const after = series.at(-1).v;
      h.assert(after.current === next, `carousel dots: aria-current is not on dot ${next}`, after);
      assertTravel(h, numbers(series, (v) => v.widths[next]), 6, 24, `carousel dot ${next} track`);
      assertTravel(h, numbers(series, (v) => v.widths[previous]), 24, 6, `carousel dot ${previous} track`);
      // The pill starts where the chosen 6px dot sat and ends centred on its button.
      const pill = series.filter((s) => s.v.current === next).map((s) => s.v.pill);
      assertTravel(h, pill, before.centers[next], after.centers[next], `carousel pill centre to dot ${next}`);
      h.near(after.pill, after.centers[next], SETTLED_PX, `carousel dots: the pill is not centred on dot ${next}`);
      const slide = await section.locator('app-carousel-slide').innerText();
      h.assert(slide.trim() === label,`carousel dots: the slide did not move to ${label}`, slide);
      previous = next;
    }
  },
};

// ─── Sidebar trailing parts ─────────────────────────────────────────────────

// The row publishes its button height as --row-h; the badge (h-5) and the
// action cluster (size-6) centre on it with calc offsets instead of tuned
// top-* values, so they line up on every row height.
const sidebarTrailing = {
  name: 'sidebar: badges and action clusters centre on their row at every row height',
  path: 'sidebar',
  async run(page, h) {
    const section = h.section(page, 'Actions & badges');
    await section.scrollIntoViewIfNeeded();
    const rows = await section.evaluate((root) => {
      const out = [];
      for (const li of root.querySelectorAll('[data-sidebar=menu-item], [data-sidebar=menu-sub-item]')) {
        const button = [...li.children].find((c) => c.tagName === 'BUTTON' || c.tagName === 'A');
        const badge = [...li.children].find((c) => c.getAttribute('data-sidebar') === 'menu-badge');
        const actions = [...li.children].find((c) => c.getAttribute('data-sidebar') === 'menu-actions');
        const action = [...li.children].find((c) => c.getAttribute('data-sidebar') === 'menu-action');
        const parts = [badge, actions, action].filter(Boolean);
        if (!button || parts.length === 0) continue;
        const b = button.getBoundingClientRect();
        const centre = b.top + b.height / 2;
        out.push({
          row: li.getAttribute('data-sidebar'),
          rowHeight: getComputedStyle(li).getPropertyValue('--row-h').trim(),
          buttonHeight: Math.round(b.height),
          deltas: parts.map((p) => {
            const r = p.getBoundingClientRect();
            return Math.round((r.top + r.height / 2 - centre) * 10) / 10;
          }),
        });
      }
      return out;
    });
    h.assert(rows.length >= 5, 'the demo has too few rows with a badge or actions to check', rows.length);
    for (const row of rows) {
      h.assert(row.rowHeight !== '', `a ${row.row} row publishes no --row-h`, row);
      for (const delta of row.deltas) h.near(delta, 0, 1, `a trailing part is off the ${row.rowHeight} row's centre`, row);
    }
  },
};

export const checks = [sidebarMobileSheet, sidebarPeekHover, sidebarPeekClick, sliderPress, sliderDrag, sliderKeys, carouselDots, sidebarTrailing];
