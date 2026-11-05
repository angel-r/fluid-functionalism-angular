// Browser checks for /changelog (see ../run.mjs): port-only entries from
// angular/content/changelog/ carry an "Angular" badge on their name line and
// link their refs to this repository, while upstream entries keep neither.

const PATH = 'changelog';

/** The name line, badge and refs of the entry linking to `href`. */
function entryOf(page, href) {
  return page.evaluate((target) => {
    const link = document.querySelector(`article h5 a[href$="${target}"]`);
    const article = link?.closest('article');
    if (!article) return null;
    const name = article.querySelector('h5');
    const badge = name.querySelector('[data-testid="port-badge"]');
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, center: r.top + r.height / 2 };
    };
    return {
      badge: badge ? badge.textContent.trim() : null,
      nameBox: box(link),
      badgeBox: badge ? box(badge) : null,
      refs: [...article.querySelectorAll('app-changelog-ref a, a[aria-label^="Pull request"], a[aria-label^="Commit"]')].map(
        (a) => a.getAttribute('href'),
      ),
    };
  }, href);
}

export const checks = [
  {
    name: 'changelog: a port-only entry shows the Angular badge level with its name and links its ref to the port',
    path: PATH,
    async run(page, h) {
      const entry = await entryOf(page, '/docs/virtual-scroll');
      h.assert(entry, 'the VirtualScroll entry is listed');
      h.assert(entry.badge === 'Angular', 'it carries the Angular badge', entry);
      h.near(entry.badgeBox.center, entry.nameBox.center, 2, 'the badge sits level with the name');
      h.assert(
        entry.refs.length > 0 && entry.refs.every((href) => href.startsWith('https://github.com/angel-r/fluid-functionalism-angular/')),
        'its refs link to the port repository',
        entry.refs,
      );
    },
  },
  {
    name: 'changelog: an upstream entry keeps no badge and links its refs upstream',
    path: PATH,
    async run(page, h) {
      const entry = await entryOf(page, '/docs/combobox');
      h.assert(entry, 'the Combobox entry is listed');
      h.assert(entry.badge === null, 'it has no Angular badge', entry);
      h.assert(
        entry.refs.length > 0 && entry.refs.every((href) => href.startsWith('https://github.com/mickadesign/fluid-functionalism/')),
        'its refs link upstream',
        entry.refs,
      );
    },
  },
];
