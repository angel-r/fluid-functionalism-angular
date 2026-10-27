// Shared helpers for the browser checks (see run.mjs).

/** Throws with `message` (and the values involved) unless `condition` holds. */
export function assert(condition, message, details) {
  if (!condition) throw new Error(details === undefined ? message : `${message}: ${JSON.stringify(details)}`);
}

/** Asserts `actual` is within `tolerance` of `expected`. */
export function near(actual, expected, tolerance, message) {
  assert(Math.abs(actual - expected) <= tolerance, message, { actual, expected, tolerance });
}

/** Resolves after `count` animation frames in the page. */
export function frames(page, count = 2) {
  return page.evaluate(
    (n) => new Promise((done) => {
      const step = (left) => (left ? requestAnimationFrame(() => step(left - 1)) : done());
      step(n);
    }),
    count,
  );
}

/**
 * The docs section titled `title` (case-insensitive), as a locator. Every
 * docs page is built from `app-doc-section`s; several sections can share a
 * title (or a title can be used twice on one page), so `nth` picks one.
 */
export function section(page, title, nth = 0) {
  return page
    .locator('app-doc-section')
    .filter({ has: page.locator('h2', { hasText: new RegExp(`^\\s*${escape(title)}\\s*$`, 'i') }) })
    .nth(nth);
}

/**
 * Starts sampling `probe` (a function evaluated in the page, returning any
 * JSON value) once per animation frame, then runs `action` and keeps sampling
 * for `ms`. Resolves to `[{ t, v }]`, `t` in ms from the moment the action
 * started.
 */
export async function sample(page, probe, action, ms = 800) {
  await page.evaluate((src) => {
    const fn = new Function(`return (${src})`)();
    const out = [];
    let t0 = null;
    window.__checkSamples = out;
    window.__checkStart = () => (t0 = performance.now());
    const tick = () => {
      if (t0 !== null) out.push({ t: performance.now() - t0, v: fn() });
      if (!window.__checkStop) requestAnimationFrame(tick);
    };
    window.__checkStop = false;
    requestAnimationFrame(tick);
  }, probe.toString());
  await page.evaluate(() => window.__checkStart());
  await action();
  await page.waitForTimeout(ms);
  return page.evaluate(() => {
    window.__checkStop = true;
    return window.__checkSamples;
  });
}

/** Values strictly between `from` and `to` seen in a sampled series. */
export function inBetween(series, from, to, pick = (v) => v) {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  return series.map((s) => pick(s.v)).filter((x) => typeof x === 'number' && x > lo + 0.5 && x < hi - 0.5);
}

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
