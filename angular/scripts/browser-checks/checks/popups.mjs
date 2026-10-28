// Browser checks for the popups (see ../run.mjs): the combobox chip FLIP,
// the command menu's height spring and keyboard scroll, and the date picker's
// clear fade, time-list centring, "auto" month orientation and popover side.
//
// Per-frame probes run inside the page (h.sample serialises them), so they
// read their target from `window.__popupsTarget`, set by `target()` first.

/** Hands `locator`'s element to the in-page probes as `window.__popupsTarget`. */
function target(locator) {
  return locator.evaluate((el) => {
    window.__popupsTarget = el;
  });
}

/** Opacities strictly between 0 and 1 (h.inBetween's margin is in px). */
function partial(values) {
  return values.filter((v) => typeof v === 'number' && v > 0.01 && v < 0.99);
}

/** Distance between two `[x, y]` points. */
function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Samples whose point lies on the way from `from` to `to`, ends excluded. */
function onTheWay(points, from, to) {
  const span = distance(from, to);
  return points.filter((p) => {
    const t = ((p[0] - from[0]) * (to[0] - from[0]) + (p[1] - from[1]) * (to[1] - from[1])) / (span * span);
    return t > 0.02 && t < 0.98;
  });
}

/** Every chip of the target toolbar: `{ value: [x, y, opacity, width] }`, x/y
 *  from the painted box (transforms included) relative to the toolbar. */
function chipProbe() {
  const rows = window.__popupsTarget;
  const origin = rows.getBoundingClientRect();
  const out = {};
  for (const el of rows.querySelectorAll('[data-chip-value]')) {
    const r = el.getBoundingClientRect();
    out[el.dataset.chipValue] = [r.left - origin.left, r.top - origin.top, +getComputedStyle(el).opacity, r.width];
  }
  return out;
}

/** The settled chips: painted box against the layout slot, and what styles
 *  are left on them. */
function settledChips(rows) {
  return rows.evaluate((toolbar) => {
    const origin = toolbar.getBoundingClientRect();
    return [...toolbar.querySelectorAll('[data-chip-value]')].map((el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        value: el.dataset.chipValue,
        painted: [r.left - origin.left, r.top - origin.top],
        slot: [el.offsetLeft, el.offsetTop],
        width: r.width,
        transform: style.transform,
        opacity: +style.opacity,
      };
    });
  });
}

/** Asserts a settled chip carries no transform, full opacity, and paints on
 *  its layout slot. */
function assertSettled(h, chip) {
  const identity = chip.transform === 'none' || chip.transform === 'matrix(1, 0, 0, 1, 0, 0)';
  h.assert(identity, `${chip.value} keeps a transform after settling`, chip.transform);
  h.near(chip.opacity, 1, 0.001, `${chip.value} opacity after settling`);
  h.assert(distance(chip.painted, chip.slot) <= 0.5, `${chip.value} paints off its layout slot`, chip);
}

/** The "Multiple selection" combobox: its chips toolbar and its text field. */
function multiple(page, h) {
  const section = h.section(page, 'Multiple selection');
  return { section, rows: section.getByRole('toolbar', { name: 'Selected' }), input: section.locator('input').first() };
}

/** A docs section can show several component previews; `nth` picks one. */
function preview(page, h, title, nth = 0) {
  return h.section(page, title).locator('app-component-preview').nth(nth);
}

/** Rect of the highlighted command-menu row against its scroll viewport. */
function commandMenuState(menu) {
  return menu.evaluate((root) => {
    const viewport = root.querySelector('[data-slot="scroll-area-viewport"]');
    const row = root.querySelector('[role="option"][aria-selected="true"]');
    const input = root.querySelector('[role="combobox"]');
    const v = viewport.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    // Where the row's centre sits in the scroll content, from painted boxes.
    const centre = r.top - v.top + viewport.scrollTop + r.height / 2;
    const max = viewport.scrollHeight - viewport.clientHeight;
    return {
      value: row.dataset.value,
      activeDescendant: input.getAttribute('aria-activedescendant') === row.id,
      top: r.top - v.top,
      bottom: v.bottom - r.bottom,
      scrollTop: viewport.scrollTop,
      expected: Math.max(0, Math.min(centre - viewport.clientHeight / 2, max)),
      max,
    };
  });
}

/** Asserts the highlighted row is `value`, fully in view, and centred in the
 *  viewport as far as the scroll ends allow. */
function assertRowInView(h, state, value, step) {
  h.assert(state.value === value, `${step}: highlighted row`, { expected: value, actual: state.value });
  h.assert(state.activeDescendant, `${step}: aria-activedescendant does not point at the highlighted row`);
  h.assert(state.top >= -0.5 && state.bottom >= -0.5, `${step}: highlighted row not fully in view`, state);
  h.near(state.scrollTop, state.expected, 1, `${step}: scrollTop does not centre the row (clamped to the ends)`);
}

/** The settled date-picker popup box, its side and the trigger box. */
function popupGeometry(trigger) {
  return trigger.evaluate((button) => {
    const positioner = [...document.querySelectorAll('[data-slot="date-picker-positioner"]')].find((p) =>
      p.querySelector('[data-slot="date-picker-popup"]'),
    );
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    };
    const popup = positioner?.querySelector('[data-slot="date-picker-popup"]');
    return {
      side: positioner?.getAttribute('data-side') ?? null,
      popup: popup ? box(popup) : null,
      trigger: box(button),
      months: positioner ? [...positioner.querySelectorAll('[data-slot="calendar-month"]')].map(box) : [],
      presets: positioner?.querySelector('ff-date-picker-presets')
        ? box(positioner.querySelector('ff-date-picker-presets'))
        : null,
      viewport: { width: innerWidth, height: document.documentElement.clientHeight },
    };
  });
}

/** Scrolls the page so `locator`'s top edge sits `y` px below the viewport top
 *  (or its bottom edge `fromBottom` px above the viewport bottom). */
function scrollTriggerTo(locator, { y, fromBottom }) {
  return locator.evaluate(
    (el, at) => {
      const r = el.getBoundingClientRect();
      const delta = at.y !== undefined ? r.top - at.y : r.bottom - (document.documentElement.clientHeight - at.fromBottom);
      window.scrollTo(0, window.scrollY + delta);
    },
    { y, fromBottom },
  );
}

export const checks = [
  // Removing a chip FLIPs every chip after it into its new slot: the chips on
  // the first row slide left and the first chip of the second row climbs up
  // into the freed room, passing through intermediate positions over several
  // frames; the removed chip fades out of the flow and leaves the DOM. Once
  // settled every chip paints exactly on its layout slot with no transform.
  {
    name: 'combobox: chips glide to their new slots when one is removed, on both axes, and settle clean',
    path: 'docs/combobox',
    async run(page, h) {
      const { rows, input } = multiple(page, h);
      // Fill the field to two rows: Next.js, Astro + five picks.
      await input.click();
      for (const name of ['Nuxt', 'Remix', 'SvelteKit', 'SolidStart', 'Qwik City']) {
        await page.getByRole('option', { name, exact: true }).click();
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);

      const before = Object.fromEntries((await settledChips(rows)).map((c) => [c.value, c.slot]));
      h.assert(Object.keys(before).length === 7, 'expected 7 chips before the removal', Object.keys(before));
      h.assert(Object.values(before).some(([, y]) => y > 10), 'the chips should wrap onto a second row', before);

      await target(rows);
      const series = await h.sample(
        page,
        chipProbe,
        () => rows.getByRole('button', { name: 'Remove Next.js' }).click(),
        600,
      );
      const after = await settledChips(rows);

      h.assert(
        after.map((c) => c.value).join() === 'astro,nuxt,remix,sveltekit,solid,qwik',
        'the removed chip should leave the DOM once faded',
        after.map((c) => c.value),
      );
      let moved = 0;
      let climbed = 0;
      for (const chip of after) {
        assertSettled(h, chip);
        const from = before[chip.value];
        const to = chip.slot;
        if (distance(from, to) < 2) continue;
        moved++;
        if (Math.abs(from[1] - to[1]) > 10) climbed++;
        const path = series.map((s) => s.v[chip.value]).filter(Boolean);
        const between = onTheWay(path, from, to);
        h.assert(between.length >= 2, `${chip.value} jumped instead of gliding from ${from} to ${to}`, path.slice(0, 12));
      }
      h.assert(moved === 6, 'every chip after the removed one should move', { moved });
      h.assert(climbed >= 1, 'a chip should climb from the second row into the first', { climbed });

      const exit = partial(series.map((s) => s.v.next?.[2]));
      h.assert(exit.length >= 1, 'the removed chip should fade out over frames', series.slice(0, 10).map((s) => s.v.next));
    },
  },

  // Adding a chip appends it: the chips already there hold their slots (no
  // transform, not one pixel of drift) while the new chip pops in from the
  // left edge, its opacity and scale passing through intermediate values,
  // then settles at full size on its slot with no transform left.
  {
    name: 'combobox: an added chip pops in at the end while the others hold their slots',
    path: 'docs/combobox',
    async run(page, h) {
      const { rows, input } = multiple(page, h);
      await input.click();
      await page.waitForTimeout(300);
      const before = Object.fromEntries((await settledChips(rows)).map((c) => [c.value, c.slot]));
      h.assert(Object.keys(before).join() === 'next,astro', 'unexpected starting chips', before);

      await target(rows);
      const series = await h.sample(page, chipProbe, () => page.getByRole('option', { name: 'Nuxt', exact: true }).click(), 500);
      const after = await settledChips(rows);
      h.assert(after.map((c) => c.value).join() === 'next,astro,nuxt', 'Nuxt should be appended', after.map((c) => c.value));
      after.forEach((chip) => assertSettled(h, chip));

      for (const value of ['next', 'astro']) {
        const drift = Math.max(...series.map((s) => distance(s.v[value].slice(0, 2), before[value])));
        h.assert(drift <= 0.5, `${value} should hold its slot while a chip is added`, { drift });
      }
      const nuxt = after.find((c) => c.value === 'nuxt');
      const fading = partial(series.map((s) => s.v.nuxt?.[2]));
      const growing = h.inBetween(series, nuxt.width * 0.9, nuxt.width, (v) => v.nuxt?.[3]);
      h.assert(fading.length >= 2, 'the new chip should fade in over frames', fading);
      h.assert(growing.length >= 2, 'the new chip should scale up over frames', growing);
    },
  },

  // The menu's frame springs to its rows' measured height: typing a query
  // that leaves one row shrinks the panel through intermediate heights,
  // critically damped (never past the target), down to the content height;
  // clearing the query grows it back the same way to the 360px cap.
  {
    name: 'command-menu: filtering springs the list height to the content height and back',
    path: 'docs/command-menu',
    async run(page, h) {
      const menu = h.section(page, 'Basic').locator('ff-command-menu');
      const input = menu.getByRole('combobox');
      const frame = menu.locator(':scope > div').first();
      const heights = () =>
        frame.evaluate((f) => ({ frame: f.getBoundingClientRect().height, content: f.firstElementChild.offsetHeight }));

      const start = await heights();
      h.near(start.frame, 360, 0.5, 'the unfiltered menu should sit at its 360px cap');
      await input.click();
      await target(frame);
      const probe = () => window.__popupsTarget.getBoundingClientRect().height;

      for (const [step, act] of [
        ['filter', () => page.keyboard.insertText('inbox')],
        ['clear', async () => {
          await page.keyboard.press('ControlOrMeta+a');
          await page.keyboard.press('Backspace');
        }],
      ]) {
        const from = (await heights()).frame;
        const series = await h.sample(page, probe, act, 500);
        const end = await heights();
        h.near(end.frame, end.content, 0.5, `${step}: the frame should settle at the content height`);
        h.assert(Math.abs(end.frame - from) > 100, `${step}: the height should change`, { from, to: end.frame });
        const between = h.inBetween(series, from, end.frame);
        h.assert(between.length >= 3, `${step}: the height snapped instead of springing`, series.slice(0, 12).map((s) => s.v));
        const grow = end.frame > from;
        const values = series.map((s) => s.v);
        const backwards = values.some((v, i) => i > 0 && (grow ? v < values[i - 1] - 0.5 : v > values[i - 1] + 0.5));
        const overshoot = grow ? Math.max(...values) > end.frame + 0.5 : Math.min(...values) < end.frame - 0.5;
        h.assert(!backwards && !overshoot, `${step}: the spring should be critically damped`, values);
      }
      h.near((await heights()).frame, 360, 0.5, 'clearing should bring back the 360px cap');
    },
  },

  // Arrow keys move the highlight one enabled row at a time (the disabled
  // row is skipped) and the viewport keeps the highlighted row fully in
  // view, centred as far as the scroll ends allow, at every step: the first
  // rows at the top, the middle ones centred, the last ones at the bottom.
  // ↓ on the last row wraps to the first (back to the top), ↑ on the first
  // wraps to the last, gliding the viewport there over several frames.
  {
    name: 'command-menu: arrow keys keep the highlighted row centred in view, ends and wrap-around included',
    path: 'docs/command-menu',
    async run(page, h) {
      const menu = h.section(page, 'Basic').locator('ff-command-menu');
      const order = await menu
        .locator('[role="option"]')
        .evaluateAll((rows) => rows.filter((r) => r.getAttribute('aria-disabled') !== 'true').map((r) => r.dataset.value));
      h.assert(order.length > 10, 'expected a list longer than its viewport', order);
      await menu.getByRole('combobox').click();
      await page.waitForTimeout(200);

      let state = await commandMenuState(menu);
      assertRowInView(h, state, order[0], 'open');
      h.assert(state.max > 100, 'the list should scroll', state);
      let scrolled = false;
      for (let i = 1; i <= order.length; i++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(220);
        state = await commandMenuState(menu);
        const expected = order[i % order.length];
        assertRowInView(h, state, expected, `↓ #${i} (${expected})`);
        if (state.scrollTop > 1) scrolled = true;
      }
      h.assert(scrolled, 'the viewport never scrolled');
      h.near(state.scrollTop, 0, 0.5, 'wrapping to the first row should return to the top');

      const viewport = menu.locator('[data-slot="scroll-area-viewport"]');
      await target(viewport);
      const series = await h.sample(page, () => window.__popupsTarget.scrollTop, () => page.keyboard.press('ArrowUp'), 400);
      state = await commandMenuState(menu);
      assertRowInView(h, state, order.at(-1), '↑ from the first row');
      h.near(state.scrollTop, state.max, 1, 'wrapping to the last row should reach the bottom');
      const between = h.inBetween(series, 0, state.max);
      h.assert(between.length >= 2, 'the viewport should glide to the last row, not jump', series.map((s) => s.v));
    },
  },

  // The outline picker's clear (✕) button is absent while there is no
  // value, fades in over several frames when a date is picked (the trigger
  // loses its placeholder), and fades out over frames when pressed, then
  // leaves the DOM with the placeholder back.
  {
    name: 'date-picker: the clear control fades in when a date is picked and out when cleared',
    path: 'docs/date-picker',
    async run(page, h) {
      const section = h.section(page, 'Date');
      const trigger = section.locator('[data-slot="date-picker-trigger"]');
      const picker = section.locator('ff-date-picker');
      const probe = () => {
        const clear = window.__popupsTarget.querySelector('[data-slot="date-picker-clear"]');
        return clear ? +getComputedStyle(clear).opacity : null;
      };
      await target(picker);
      h.assert((await h.sample(page, probe, async () => {}, 50)).every((s) => s.v === null), 'no clear button without a value');
      h.assert(await trigger.evaluate((t) => t.hasAttribute('data-placeholder')), 'the empty trigger shows its placeholder');

      await trigger.click();
      await page.waitForTimeout(300);
      const day = page.locator('[data-slot="date-picker-popup"]').getByRole('button', { name: /\b15th\b/ });
      const fadeIn = await h.sample(page, probe, () => day.click(), 500);
      const values = fadeIn.map((s) => s.v).filter((v) => v !== null);
      h.assert(values.length > 0, 'picking a date should mount the clear button');
      h.near(values.at(-1), 1, 0.001, 'the clear button should settle fully opaque');
      h.assert(partial(values).length >= 2, 'the clear button should fade in over frames', values.slice(0, 8));
      h.assert(
        values.every((v, i) => i === 0 || v >= values[i - 1] - 0.01),
        'the fade in should only rise',
        values.slice(0, 8),
      );
      h.assert(!(await trigger.evaluate((t) => t.hasAttribute('data-placeholder'))), 'the trigger should show the picked date');

      const fadeOut = await h.sample(page, probe, () => section.getByRole('button', { name: 'Clear' }).click(), 500);
      h.assert(partial(fadeOut.map((s) => s.v)).length >= 1, 'the clear button should fade out over frames', fadeOut.slice(0, 8).map((s) => s.v));
      h.assert(fadeOut.at(-1).v === null, 'the clear button should leave the DOM once faded');
      h.assert(await trigger.evaluate((t) => t.hasAttribute('data-placeholder')), 'clearing should bring the placeholder back');
    },
  },

  // Focusing a time field opens its slot list scrolled so the selected time
  // (the field's own value) sits at the centre of the list's scroll box,
  // within a pixel, for the start time and for the end time.
  {
    name: 'date-picker: the time list opens with the selected time centred in its scroll box',
    path: 'docs/date-picker',
    async run(page, h) {
      // The event demo's start and end times; the second preview adds a
      // single-time field of its own.
      const fields = preview(page, h, 'Date and time', 0).locator('[data-slot="date-picker-time"]');
      h.assert((await fields.count()) === 2, 'expected the start and end time fields');
      for (let i = 0; i < 2; i++) {
        const field = fields.nth(i);
        await scrollTriggerTo(field, { y: 120 });
        const shown = (await field.locator('input').inputValue()).trim();
        await field.click();
        await page.waitForTimeout(350);
        const list = await page.evaluate(() => {
          const box = [...document.querySelectorAll('[data-slot="date-picker-positioner"]')]
            .map((p) => p.querySelector('[role="listbox"]'))
            .find(Boolean);
          const viewport = box?.closest('[data-slot="scroll-area-viewport"]');
          const row = box?.querySelector('[role="option"][aria-selected="true"]');
          if (!viewport || !row) return null;
          const v = viewport.getBoundingClientRect();
          const r = row.getBoundingClientRect();
          return {
            text: row.textContent.trim(),
            offset: r.top + r.height / 2 - (v.top + v.height / 2),
            scrollTop: viewport.scrollTop,
            max: viewport.scrollHeight - viewport.clientHeight,
            height: viewport.clientHeight,
          };
        });
        h.assert(list, `field ${i}: the list should open with a selected slot`);
        h.assert(list.text.startsWith(shown), `field ${i}: the selected slot should be the field's time`, { shown, row: list.text });
        h.assert(list.scrollTop > 0 && list.scrollTop < list.max, `field ${i}: centring should not be clamped by an end`, list);
        h.near(list.offset, 0, 1, `field ${i}: the selected slot should sit at the centre of the scroll box`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    },
  },

  // A two-month range picker with orientation "auto" lays out on open for
  // the room the window has: side by side (presets on the left) when the
  // window is at least 2 × 7 × 36 + 48 + 152 + 16 = 720px wide, stacked
  // (presets below) one pixel narrower, and side by side again at 720.
  {
    name: 'date-picker: auto orientation lays the range months side by side when they fit, stacked when not',
    path: 'docs/date-picker',
    async run(page, h) {
      const trigger = h.section(page, 'Range with presets').locator('[data-slot="date-picker-trigger"]');
      for (const [width, layout] of [[1280, 'horizontal'], [719, 'vertical'], [720, 'horizontal']]) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(200);
        await trigger.click();
        await page.waitForTimeout(400);
        const g = await popupGeometry(trigger);
        h.assert(g.months.length === 2 && g.presets, `${width}px: expected two months and the presets`, g);
        const [a, b] = g.months;
        if (layout === 'horizontal') {
          h.near(b.top, a.top, 0.5, `${width}px: the months should share a row`);
          h.assert(b.left >= a.right, `${width}px: the second month should sit right of the first`, g.months);
          h.assert(g.presets.right <= a.left, `${width}px: the presets should sit left of the months`, g);
        } else {
          h.near(b.left, a.left, 0.5, `${width}px: the months should share a column`);
          h.assert(b.top >= a.bottom, `${width}px: the second month should sit below the first`, g.months);
          h.assert(g.presets.top >= b.bottom, `${width}px: the presets should sit below the months`, g);
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
      }
    },
  },

  // The date popover opens on its preferred side, below the trigger, 6px
  // off its bottom edge and aligned to its start, when there is room; with
  // the trigger near the viewport bottom it flips above, 6px off the
  // trigger's top edge, still start-aligned and never covering the trigger
  // (React/Base UI flip there).
  {
    name: 'date-picker: the popover opens below its trigger with room and flips above near the viewport bottom',
    path: 'docs/date-picker',
    async run(page, h) {
      const trigger = preview(page, h, 'Date and time', 0).locator('[data-slot="date-picker-trigger"]');
      for (const [where, at] of [['below', { y: 200 }], ['above', { fromBottom: 40 }]]) {
        await scrollTriggerTo(trigger, at);
        await page.waitForTimeout(150);
        await trigger.click();
        await page.waitForTimeout(500);
        const g = await popupGeometry(trigger);
        h.assert(g.popup, `${where}: the popover should open`);
        h.near(g.popup.left, g.trigger.left, 1, `${where}: the popover should align to the trigger's start`);
        if (where === 'below') {
          h.assert(g.side === 'bottom', `${where}: data-side`, g.side);
          h.near(g.popup.top, g.trigger.bottom + 6, 1, `${where}: the popover should open 6px under the trigger`);
        } else {
          h.assert(g.trigger.top - g.popup.bottom >= 0, `${where}: the popover covers its trigger`, g);
          h.assert(g.side === 'top', `${where}: data-side`, g.side);
          h.near(g.popup.bottom, g.trigger.top - 6, 1, `${where}: the popover should open 6px over the trigger`);
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
      }
    },
  },

  // Too narrow for date + time on one row (a phone, a side panel), the time
  // moves under the date with a full-width rule between them; the clear sits
  // after the date it clears, and both rows keep the one-row height. Widening
  // the parent puts them back on one row.
  {
    name: 'date-picker: a narrow parent stacks the time under the date and widening restores one row',
    path: 'docs/date-picker',
    async run(page, h) {
      const picker = preview(page, h, 'Date and time', 0).locator('ff-date-picker');
      await picker.scrollIntoViewIfNeeded();
      const rows = () =>
        picker.evaluate((el) => {
          const kids = [...el.children].filter(
            (c) => c.tagName !== 'FF-FLUID-HOVER-HIGHLIGHT' && c.tagName !== 'INPUT' && c.tagName !== 'DIV',
          );
          const box = (c) => {
            const r = c.getBoundingClientRect();
            return { top: Math.round(r.top), height: Math.round(r.height), order: getComputedStyle(c).order };
          };
          const date = kids.find((c) => c.querySelector('[data-slot=date-picker-trigger]'));
          const time = kids.find((c) => c.querySelector('ff-date-picker-time-field'));
          const clear = kids.find((c) => c.getAttribute('data-slot') === 'date-picker-clear');
          const rule = kids.find((c) => c.classList.contains('basis-full'));
          return {
            two: el.getAttribute('data-two-rows') !== null,
            wrap: getComputedStyle(el).flexWrap,
            date: date ? box(date) : null,
            clear: clear ? box(clear) : null,
            rule: rule ? { ...box(rule), width: Math.round(rule.getBoundingClientRect().width) } : null,
            time: time ? box(time) : null,
            width: Math.round(el.getBoundingClientRect().width),
          };
        });
      const oneRow = await rows();
      h.assert(oneRow.two === false && oneRow.wrap !== 'wrap', 'the wide demo is not on one row', oneRow);

      // Shrink the demo's wrapper: the picker's own box refuses to shrink under
      // its one-row content, so the parent is what gets tight.
      await picker.evaluate((el) => {
        el.parentElement.style.width = '220px';
      });
      await page.waitForTimeout(300);
      const twoRows = await rows();
      h.assert(twoRows.two && twoRows.wrap === 'wrap', 'the narrow picker did not stack', twoRows);
      h.assert(twoRows.date && twoRows.rule && twoRows.time, 'a stacked row is missing', twoRows);
      h.assert(twoRows.date.top < twoRows.rule.top && twoRows.rule.top < twoRows.time.top, 'the rows are not date → rule → time', twoRows);
      h.near(twoRows.rule.width, twoRows.width, 8, 'the rule does not span the stacked field');
      h.assert(twoRows.date.height === twoRows.time.height, 'the two rows have different heights', twoRows);
      if (twoRows.clear) h.assert(twoRows.clear.top === twoRows.date.top, 'the clear is not on the date row', twoRows);

      await picker.evaluate((el) => {
        el.parentElement.style.width = '';
      });
      await page.waitForTimeout(300);
      const back = await rows();
      h.assert(back.two === false, 'widening did not restore one row', back);
      h.assert(back.date.top === back.time.top, 'the segments are not back on one row', back);
    },
  },
];
