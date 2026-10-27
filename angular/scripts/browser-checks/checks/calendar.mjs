// Browser checks for the calendar (see ../run.mjs): the measured day column
// (week numbers at three quarters of a cell), the pressed day fill, and the
// ghost band a replaced range leaves while it fades out. Each one drives the
// showcase demo like a user and reads computed styles once per frame.

/** The calendar inside a demo section, as a page-side locator. */
export const checks = [
  {
    // Week numbers take three quarters of a day cell, so they sit close to the
    // days instead of floating in a full column; DayPicker's own weekday row
    // never renders, and each month draws its own row from the first paint.
    name: 'calendar: week numbers take three quarters of a day cell and no second weekday row renders',
    path: 'calendar',
    async run(page, h) {
      const section = h.section(page, 'Week numbers');
      await section.scrollIntoViewIfNeeded();
      const measured = await section.locator('ff-calendar').evaluate((cal) => {
        const header = cal.querySelector('[role="columnheader"]');
        const cell = cal.querySelector('[role="gridcell"]');
        const rows = [...cal.querySelectorAll('[role="rowgroup"]')];
        return {
          header: header?.getBoundingClientRect().width ?? 0,
          cell: cell?.getBoundingClientRect().width ?? 0,
          dayPickerRows: cal.querySelectorAll('.rdp-weekdays').length,
          columns: rows.map((row) => row.querySelectorAll('[role="columnheader"]').length),
        };
      });
      h.assert(measured.cell > 20, 'the day cell was measured', measured);
      h.near(measured.header / measured.cell, 0.75, 0.02, 'week numbers are not three quarters of a cell');
      h.assert(measured.dayPickerRows === 0, "DayPicker's own weekday row is still rendered", measured);
      h.assert(measured.columns.length > 0, 'no month row was found', measured);
      measured.columns.forEach((n, i) => h.assert(n === 8, `month ${i + 1} does not draw 7 weekdays + the week number`, measured.columns));
    },
  },

  {
    // Pressing an empty day presses its hover fill like a ghost Button: the
    // same-color spread that insets it 1px at rest collapses, and the fill
    // steps to the active token. Releasing restores both.
    name: 'calendar: a held press presses the hover fill and steps to the active token',
    path: 'calendar',
    async run(page, h) {
      const section = h.section(page, 'Single');
      const day = section.locator('[role=gridcell][data-day]').nth(10);
      await day.scrollIntoViewIfNeeded();
      const box = await day.boundingBox();
      // The hover fill of the day under the pointer (the pressed class pair,
      // not the inner ring, which has no --day-press).
      const probe = () => {
        const section = [...document.querySelectorAll('app-demo-section')].find(
          (x) => x.querySelector('h2')?.textContent.trim().toLowerCase() === 'single',
        );
        const cal = section?.querySelector('ff-calendar');
        const fill = [...(cal?.querySelectorAll('[data-slot=fluid-hover-highlight]') ?? [])].find((el) =>
          el.className.includes('--day-press'),
        );
        if (!fill) return null;
        const before = getComputedStyle(fill, '::before');
        const shadows = before.boxShadow;
        // The spread of the last shadow in the list (the same-color one).
        const spreads = [...shadows.matchAll(/0px 0px 0px ([\d.]+)px/g)].map((m) => parseFloat(m[1]));
        return {
          token: getComputedStyle(fill).getPropertyValue('--day-press').trim(),
          spread: spreads.at(-1) ?? 0,
          background: before.backgroundColor,
          opacity: parseFloat(getComputedStyle(fill).opacity),
        };
      };

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(250);
      const rest = await page.evaluate(probe);
      h.assert(rest && rest.opacity > 0.5, 'the hover fill did not settle under the pointer', rest);
      h.near(rest.spread, 1, 0.02, 'the resting fill is not inset 1px');

      await page.mouse.down();
      await page.waitForTimeout(120);
      const pressed = await page.evaluate(probe);
      h.assert(pressed, 'the pressed fill disappeared', pressed);
      h.assert(pressed.token !== rest.token, 'pressing did not step the fill to the active token', { rest, pressed });
      h.near(pressed.spread, 0, 0.02, 'the pressed fill still carries the 1px spread');
      h.assert(pressed.background !== rest.background, 'the pressed fill kept the hover colour', { rest, pressed });

      await page.mouse.up();
      await page.waitForTimeout(250);
      const released = await page.evaluate(probe);
      h.assert(released, 'the fill disappeared on release', released);
      h.assert(released.token === rest.token, 'releasing did not restore the hover token', { rest, released });
      h.near(released.spread, 1, 0.02, 'the released fill did not regain its 1px spread');
    },
  },

  {
    // Picking a new start over a committed range leaves that range as a ghost:
    // its band slices and filled ends stay, opacity 1 → 0 on the moderate
    // exit, and they are gone well before a second pick could commit.
    name: 'calendar: replacing a committed range leaves a ghost band that fades out',
    path: 'calendar',
    async run(page, h) {
      const section = h.section(page, 'Range');
      await section.scrollIntoViewIfNeeded();
      const days = section.locator('[role=gridcell][data-day]');
      const pick = async (i) => {
        const day = days.nth(i);
        await day.scrollIntoViewIfNeeded();
        await day.click();
      };
      const probe = () => {
        const section = [...document.querySelectorAll('app-demo-section')].find(
          (x) => x.querySelector('h2')?.textContent.trim().toLowerCase() === 'range',
        );
        const cal = section?.querySelector('ff-calendar');
        const ghosts = [...(cal?.querySelectorAll('[data-slot=calendar-range-ghost]') ?? [])];
        return {
          bands: cal?.querySelectorAll('[data-slot=calendar-range-band]').length ?? 0,
          ghosts: ghosts.length,
          opacity: ghosts.length ? Math.min(...ghosts.map((g) => parseFloat(getComputedStyle(g).opacity))) : null,
          ends: ghosts.filter((g) => g.querySelector('.bg-foreground')).length,
          hidden: ghosts.every((g) => g.getAttribute('aria-hidden') === 'true'),
        };
      };

      await pick(12);
      await page.waitForTimeout(250);
      await pick(16);
      await page.waitForTimeout(250);
      const committed = await page.evaluate(probe);
      h.assert(committed.bands === 5, 'the range was not committed across five days', committed);
      h.assert(committed.ghosts === 0, 'a ghost is showing before any replacement', committed);

      const series = await h.sample(page, probe, () => pick(20), 500);
      const visible = series.filter((s) => s.v.ghosts > 0);
      h.assert(visible.length > 0, 'the replaced range left no ghost', series.map((s) => s.v));
      const first = visible[0].v;
      h.assert(first.ghosts === 5, 'the ghost does not cover the whole old range', first);
      h.assert(first.ends === 2, 'the ghost does not keep its two filled ends', first);
      h.assert(first.hidden, 'the ghost is exposed to assistive tech', first);
      const fading = visible.map((s) => s.v.opacity).filter((o) => typeof o === 'number' && o > 0.05 && o < 0.95);
      h.assert(fading.length > 0, 'the ghost vanished without fading', visible.map((s) => s.v.opacity));
      const last = series.at(-1).v;
      h.assert(last.ghosts === 0, 'the ghost is still there after the exit', last);
      h.assert(last.bands === 0, 'a band is showing for a range that has only a start', last);
    },
  },

  {
    // Coming back into the calendar while picking an end, the solid fill
    // starts opaque on the range start (fadeIn=false) and glides from there:
    // it reads as sliding out of the first pick instead of fading in wherever
    // the pointer lands. Sampled per frame, its opacity never dips.
    name: 'calendar: picking an end glides the solid fill out of the range start without fading',
    path: 'calendar',
    async run(page, h) {
      const section = h.section(page, 'Range');
      await section.scrollIntoViewIfNeeded();
      const days = section.locator('[role=gridcell][data-day]');
      const start = days.nth(12);
      await start.scrollIntoViewIfNeeded();
      await start.click();
      await page.waitForTimeout(300);
      const target = await days.nth(16).boundingBox();
      // Leave and come back: a fresh hover session, the case `from` covers.
      await page.mouse.move(10, 10);
      await page.waitForTimeout(400);

      const probe = () => {
        const section = [...document.querySelectorAll('app-demo-section')].find(
          (x) => x.querySelector('h2')?.textContent.trim().toLowerCase() === 'range',
        );
        const cal = section?.querySelector('ff-calendar');
        const fills = [...(cal?.querySelectorAll('[data-slot=fluid-hover-highlight]') ?? [])].filter(
          (el) => !el.closest('[data-slot=calendar-nav]'),
        );
        const solid = fills.find((el) => el.className.includes('bg-foreground'));
        if (!solid) return null;
        const r = solid.getBoundingClientRect();
        return { opacity: parseFloat(getComputedStyle(solid).opacity), x: r.left, y: r.top, w: r.width };
      };
      const series = await h.sample(
        page,
        probe,
        () => page.mouse.move(target.x + target.width / 2, target.y + target.height / 2),
        500,
      );
      const solid = series.map((s) => s.v).filter(Boolean);
      h.assert(solid.length > 8, 'the solid fill did not appear', series.map((s) => s.v));
      for (const frame of solid) {
        h.assert(frame.opacity >= 0.95, 'the solid fill faded in instead of starting opaque', solid.map((f) => f.opacity));
      }
      const measured = solid.filter((f) => f.w > 5);
      h.assert(measured.length > 8, 'the solid fill never got its rect', solid);
      const xs = new Set(measured.map((f) => Math.round(f.x)));
      h.assert(xs.size >= 2, 'the solid fill mounted on the target instead of gliding from the start', measured.map((f) => f.x));
      const end = measured.at(-1);
      h.near(end.x, target.x, 1, 'the solid fill did not land on the hovered day');
      h.near(end.y, target.y, 1, 'the solid fill did not land on the hovered day');
      h.near(end.w, target.width, 1, 'the solid fill did not take the day cell');
    },
  },
];
