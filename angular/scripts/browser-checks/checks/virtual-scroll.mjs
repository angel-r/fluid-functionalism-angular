// Browser checks for the virtual scroll (see ../run.mjs), on /docs/virtual-scroll.
// jsdom has no layout, so these pin what the specs cannot: the real row size
// matches the default item size, the measured offset of a sticky header or
// label column keeps the right row and column under the viewport's corner,
// and the table's fluid hover still lands on a recycled row.

const PATH = 'docs/virtual-scroll';

/** Scrolls a viewport and waits for the windows to follow. */
async function scrollTo(page, h, testid, top, left = 0) {
  await page.locator(`[data-testid="${testid}"]`).evaluate(
    (el, [t, l]) => {
      el.scrollTop = t;
      el.scrollLeft = l;
    },
    [top, left],
  );
  await h.frames(page, 3);
}

export const checks = [
  {
    name: 'virtual-scroll: the table renders a bounded window and a full-height scroll extent',
    path: PATH,
    async run(page, h) {
      const m = await page.locator('[data-testid="table-viewport"]').evaluate((vp) => {
        const rows = [...vp.querySelectorAll('tbody tr:not([data-slot])')];
        const head = vp.querySelector('thead').getBoundingClientRect().height;
        return {
          rendered: rows.length,
          pitch: rows[2].getBoundingClientRect().top - rows[1].getBoundingClientRect().top,
          rowHeight: rows[1].getBoundingClientRect().height,
          head,
          scrollHeight: vp.scrollHeight,
          clientHeight: vp.clientHeight,
        };
      });
      h.assert(m.rendered > 0 && m.rendered < 40, 'only a window of rows is in the DOM', m);
      h.near(m.pitch, m.rowHeight, 0.5, 'rows sit back to back');
      h.near(m.scrollHeight, m.head + 10_000 * m.pitch, 2, 'the scroll extent covers every row at the measured size');
    },
  },
  {
    name: 'virtual-scroll: the row under the sticky header is the one the scroll offset points at',
    path: PATH,
    async run(page, h) {
      const top = 180_000;
      await scrollTo(page, h, 'table-viewport', top);
      const m = await page.locator('[data-testid="table-viewport"]').evaluate((vp) => {
        const box = vp.getBoundingClientRect();
        const head = vp.querySelector('thead').getBoundingClientRect().height;
        const rows = [...vp.querySelectorAll('tbody tr:not([data-slot])')];
        const pitch = rows[2].getBoundingClientRect().top - rows[1].getBoundingClientRect().top;
        const el = document.elementFromPoint(box.left + 10, box.top + head + 20);
        const row = el?.closest('tr');
        return { head, pitch, label: row?.querySelector('td')?.textContent?.trim() ?? null };
      });
      // Rows start below the header, so the point 20px under it is 20px into
      // the rows' own scroll (15px into a row, clear of the collapsed
      // borders): row n (1-based) spans (n - 1) * pitch .. n * pitch.
      const expected = Math.floor((top + 20) / m.pitch) + 1;
      h.assert(m.label === String(expected), 'the row under the header matches the offset', { ...m, expected });
    },
  },
  {
    name: 'virtual-scroll: the count under the table follows the rendered window',
    path: PATH,
    async run(page, h) {
      const text = await page.locator('[data-testid="table-count"]').textContent();
      const rendered = await page.locator('[data-testid="table-viewport"] tbody tr:not([data-slot])').count();
      h.assert(text.trim().startsWith(`${rendered} of 10,000`), 'the count reads the rendered rows', { text, rendered });
    },
  },
  {
    name: 'virtual-scroll: the grid keeps the right row and day under its sticky header and label column',
    path: PATH,
    async run(page, h) {
      const top = 36 * 500;
      const left = 56 * 200;
      await page.locator('[data-testid="grid-viewport"]').scrollIntoViewIfNeeded();
      await scrollTo(page, h, 'grid-viewport', top, left);
      const m = await page.locator('[data-testid="grid-viewport"]').evaluate((vp) => {
        const box = vp.getBoundingClientRect();
        // Just inside the first body cell past the label column and header.
        const x = box.left + 1 + 128 + 4;
        const y = box.top + 1 + 36 + 4;
        const cell = document.elementFromPoint(x, y);
        const label = document.elementFromPoint(box.left + 1 + 10, y);
        const day = document.elementFromPoint(x, box.top + 1 + 10);
        return {
          cell: cell?.tagName.toLowerCase(),
          row: label?.textContent?.trim(),
          day: day?.textContent?.trim(),
          cells: vp.querySelectorAll('app-hours-cell').length,
        };
      });
      h.assert(m.cell === 'app-hours-cell', 'a cell sits past the label column', m);
      h.assert(m.row?.endsWith(' 501'), 'row 501 is under the header', m);
      h.assert(m.day === '201', 'day 201 is past the label column', m);
      h.assert(m.cells > 0 && m.cells < 2_000, 'only a window of cells is in the DOM', m);
    },
  },
  {
    name: 'virtual-scroll: editing a visible cell changes that one cell',
    path: PATH,
    async run(page, h) {
      const read = () =>
        page.locator('[data-testid="grid-viewport"] app-hours-cell').evaluateAll((cells) => cells.map((c) => c.textContent.trim()));
      // Let the windows settle on their measured offsets first.
      await h.frames(page, 4);
      const before = await read();
      await page.locator('[data-testid="edit-cell"]').click();
      await h.frames(page);
      const after = await read();
      const changed = after.filter((v, i) => v !== before[i]).length;
      h.assert(after.length === before.length && changed === 1, 'exactly one cell changed', { changed });
    },
  },
  {
    name: 'virtual-scroll: the table highlight lands on a recycled row after scrolling',
    path: PATH,
    async run(page, h) {
      await scrollTo(page, h, 'table-viewport', 36 * 3000);
      const target = page.locator('[data-testid="table-viewport"] tbody tr:not([data-slot])').nth(8);
      await target.hover();
      await h.frames(page, 20);
      const m = await page.locator('[data-testid="table-viewport"]').evaluate((vp) => {
        const row = vp.querySelector('tbody tr[data-fluid-hover-active]');
        const highlight = vp.querySelector('ff-fluid-hover-highlight > *') ?? vp.querySelector('ff-fluid-hover-highlight');
        const r = row?.getBoundingClientRect();
        const hl = highlight?.getBoundingClientRect();
        return { row: r ? { top: r.top, height: r.height } : null, highlight: hl ? { top: hl.top, height: hl.height } : null };
      });
      h.assert(m.row && m.highlight, 'a row is lit and the highlight is drawn', m);
      h.near(m.highlight.top, m.row.top, 1.5, 'the highlight sits on the hovered row');
    },
  },
];
