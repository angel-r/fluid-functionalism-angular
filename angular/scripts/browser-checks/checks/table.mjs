// Browser checks for the server-driven table (#11) on /docs/table: the sticky
// header that only a real scroll container can prove, and the round trip of
// sortChange / pageChange through the page's simulated API (rows stay put
// until the response lands). jsdom has no layout and no scrolling.

const SECTION = 'Server-side data';

/** The demo's scroll container, header and first rows, in viewport pixels. */
const probe = () => {
  const section = [...document.querySelectorAll('app-doc-section')].find((s) =>
    /^\s*Server-side data\s*$/i.test(s.querySelector('h2')?.textContent ?? ''));
  const table = section.querySelector('ff-table');
  const scroller = table.parentElement;
  const thead = table.querySelector('thead');
  const head = thead.getBoundingClientRect();
  const box = scroller.getBoundingClientRect();
  const atHeader = document.elementFromPoint(head.left + 8, head.top + head.height / 2);
  const rule = getComputedStyle(thead.querySelector('tr'), '::after');
  const rows = [...table.querySelectorAll('tbody tr')].map((tr) => [...tr.cells].map((c) => c.textContent.trim()));
  return {
    scrollTop: scroller.scrollTop,
    scrollerTop: box.top,
    headTop: head.top,
    headBackground: getComputedStyle(thead).backgroundColor,
    headerOnTop: !!atHeader?.closest('thead'),
    rule: { position: rule.position, height: rule.height, background: rule.backgroundColor },
    busy: table.querySelector('table').getAttribute('aria-busy'),
    rows,
    label: section.querySelector('ff-table-pagination span')?.textContent.trim(),
  };
};

const opaque = (color) => !/rgba\(.*,\s*0(\.\d+)?\)$/.test(color) && color !== 'transparent';
/** Any colour that paints something: alpha above 0. */
const painted = (color) => color !== 'transparent' && !/[,/]\s*0\)$/.test(color);

async function waitForRows(page, h, predicate, label) {
  for (let i = 0; i < 40; i++) {
    const v = await page.evaluate(probe);
    if (predicate(v)) return v;
    await page.waitForTimeout(50);
  }
  h.assert(false, `${label}: the rows never changed`, await page.evaluate(probe));
}

export const checks = [
  {
    name: 'table: a sticky header stays at the top of its scroll container, over the rows',
    path: 'docs/table',
    async run(page, h) {
      await h.section(page, SECTION).scrollIntoViewIfNeeded();
      const rest = await page.evaluate(probe);
      h.assert(rest.scrollTop === 0, 'the demo starts scrolled', rest);
      await page.evaluate(() => {
        const section = [...document.querySelectorAll('app-doc-section')].find((s) =>
          /^\s*Server-side data\s*$/i.test(s.querySelector('h2')?.textContent ?? ''));
        section.querySelector('ff-table').parentElement.scrollTop = 120;
      });
      await h.frames(page);
      const v = await page.evaluate(probe);
      h.assert(v.scrollTop > 0, 'the demo did not scroll, so the check proves nothing', v);
      h.near(v.headTop, v.scrollerTop, 0.5, 'the header is pinned to the scroll container top');
      h.assert(opaque(v.headBackground), 'the header background lets rows show through', v);
      h.assert(v.headerOnTop, 'a row paints over the stuck header', v);
      h.assert(
        v.rule.position === 'absolute' && v.rule.height === '1px' && painted(v.rule.background),
        'the stuck header has no rule under it',
        v.rule,
      );
    },
  },
  {
    name: 'table: sortChange and pageChange leave the rows alone until the data arrives',
    path: 'docs/table',
    async run(page, h) {
      const section = h.section(page, SECTION);
      await section.scrollIntoViewIfNeeded();
      const before = await page.evaluate(probe);
      h.assert(before.rows[0][1] === 'Engineer', 'the demo does not start on the unsorted first page', before);
      h.assert(before.label === '1–8 of 23', 'the range label', before);

      await section.locator('th', { hasText: 'Role' }).locator('button').click();
      await h.frames(page);
      const pending = await page.evaluate(probe);
      h.assert(JSON.stringify(pending.rows) === JSON.stringify(before.rows), 'sorting changed the rows before the response', pending);
      h.assert(pending.busy === 'true', 'the table is not busy while the query is out', pending);
      const sorted = await waitForRows(page, h, (v) => v.rows[0][1] === 'Designer', 'sort by role');
      h.assert(sorted.busy === null, 'the table stays busy after the data arrived', sorted);
      h.assert(
        (await section.locator('th', { hasText: 'Role' }).getAttribute('aria-sort')) === 'ascending',
        'aria-sort on the sorted column',
      );

      await section.getByRole('button', { name: 'Next page' }).click();
      await h.frames(page);
      const paging = await page.evaluate(probe);
      h.assert(paging.label === '9–16 of 23', 'the range moves with the click', paging);
      h.assert(JSON.stringify(paging.rows) === JSON.stringify(sorted.rows), 'paging changed the rows before the response', paging);
      const next = await waitForRows(page, h, (v) => JSON.stringify(v.rows) !== JSON.stringify(sorted.rows), 'next page');
      h.assert(next.rows.length === 8, 'the second page has 8 rows', next);
    },
  },
  {
    name: 'table: the hover highlight follows rows re-rendered from new data',
    path: 'docs/table',
    async run(page, h) {
      const section = h.section(page, SECTION);
      await section.scrollIntoViewIfNeeded();
      await section.getByRole('button', { name: 'Next page' }).click();
      await waitForRows(page, h, (v) => v.rows[0][0] !== 'Alice', 'next page');
      const row = section.locator('tbody tr').nth(2);
      const box = await row.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(400);
      const lit = await page.evaluate(() => {
        const section = [...document.querySelectorAll('app-doc-section')].find((s) =>
          /^\s*Server-side data\s*$/i.test(s.querySelector('h2')?.textContent ?? ''));
        const highlight = section.querySelector('[data-slot="fluid-hover-highlight"]');
        const rows = section.querySelectorAll('tbody tr');
        return {
          highlight: highlight?.getBoundingClientRect().top ?? null,
          row: rows[2].getBoundingClientRect().top,
          active: rows[2].classList.contains('is-active'),
        };
      });
      h.assert(lit.highlight !== null, 'no highlight under the pointer', lit);
      h.near(lit.highlight, lit.row, 1, 'the highlight sits on the hovered row');
      h.assert(lit.active, 'the hovered row is not lit', lit);
    },
  },
];
