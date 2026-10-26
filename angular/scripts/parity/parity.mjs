#!/usr/bin/env node
// Visual and motion parity between the React docs site and the Angular showcase.
//
//   node scripts/parity/parity.mjs --slug badge [--slug button ...] [--motion]
//        [--react http://localhost:3000] [--angular http://localhost:4300]
//        [--out .parity] [--shots] [--targets 4]
//
// For every page present on both sides it pairs the preview sections by title
// (React `DocSection` h2 ↔ Angular `app-demo-section` h2, nth preview ↔ nth),
// makes the Angular stage the same box as the React preview body, then:
//   - static: walks both rendered trees (custom-element hosts are transparent),
//     pairs elements by tag + classes + own text and diffs boxes and computed
//     styles;
//   - motion (--motion): replays the same pointer input on the same paired
//     targets (hover, then click, then Escape) and samples every element each
//     animation frame from the first input event, then diffs the trajectories.
// Needs `playwright-core` (root devDependency) and a local Chrome.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, '../../../package.json'));
const { chromium } = require('playwright-core');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const all = (name) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []));
const REACT = opt('react', 'http://localhost:3000');
const ANGULAR = opt('angular', 'http://localhost:4300');
const OUT = resolve(opt('out', resolve(here, '../../.parity')));
const MOTION = args.includes('--motion');
const SHOTS = args.includes('--shots');
const TARGETS = Number(opt('targets', '4'));
const ONLY_SECTION = opt('section');
const slugs = all('slug');
// React page slug when it differs from the showcase slug.
const REACT_SLUG = { 'scroll-area': 'scrollbars' };

const STYLE_PROPS = [
  'display', 'color', 'backgroundColor', 'borderTopColor', 'borderTopWidth', 'borderBottomWidth',
  'borderTopLeftRadius', 'borderBottomRightRadius', 'fontSize', 'fontFamily', 'fontVariationSettings',
  'fontWeight', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingRight', 'paddingBottom',
  'paddingLeft', 'opacity', 'transform', 'boxShadow', 'outlineWidth', 'cursor', 'filter',
  'clipPath', 'textDecorationLine', 'fill', 'stroke', 'strokeWidth', 'visibility',
];
const MOTION_PROPS = ['x', 'y', 'w', 'h', 'opacity', 'transform', 'backgroundColor', 'color', 'clipPath', 'fontVariationSettings'];

// ---- in-page code -------------------------------------------------------

function pageLib() {
  const P = window.__parity = {};
  P.roots = (side) => {
    const out = [];
    if (side === 'react') {
      for (const frame of document.querySelectorAll('[data-component-preview]')) {
        const section = frame.closest('.pt-6');
        const title = section?.querySelector('h2')?.textContent.trim().toLowerCase() ?? '';
        const body = frame.querySelector('.overflow-hidden > [tabindex="-1"]');
        if (body) out.push({ title, body });
      }
    } else {
      for (const sec of document.querySelectorAll('app-demo-section')) {
        const title = sec.querySelector('h2')?.textContent.trim().toLowerCase() ?? '';
        const body = sec.querySelector('section > div');
        if (body) out.push({ title, body });
      }
    }
    const seen = {};
    return out.map((r) => ({ ...r, key: `${r.title}#${(seen[r.title] = (seen[r.title] ?? -1) + 1)}` }));
  };
  P.portals = () => [...document.body.children].filter(
    (el) => !el.hasAttribute('data-parity-static') && !['SCRIPT', 'STYLE', 'NEXT-ROUTE-ANNOUNCER'].includes(el.tagName),
  ).concat([...document.querySelectorAll('.cdk-overlay-container')]);
  const ownText = (el) =>
    [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim().slice(0, 40);
  const cls = (el) => (el.getAttribute('class') ?? '').split(/\s+/).filter((c) => c && !c.startsWith('ng-') && !c.startsWith('cdk-') && !c.startsWith('lucide')).sort().join(' ');
  P.walk = (roots, props, origin) => {
    const list = [];
    const visit = (el, parent) => {
      const tag = el.tagName.toLowerCase();
      let self = parent;
      // Component hosts are transparent unless they carry the styling
      // themselves (e.g. `<ff-badge class="…">` in place of React's `<span>`).
      const host = tag.includes('-') || tag === 'ng-component';
      if (!host || cls(el)) {
        const rects = el.getClientRects();
        if (rects.length) {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const style = {};
          for (const p of props) style[p] = cs[p];
          list.push({
            tag, cls: cls(el), text: ownText(el), role: el.getAttribute('role') ?? '',
            x: r.x - origin.x, y: r.y - origin.y, w: r.width, h: r.height, style,
            idx: P.register(el), parent,
          });
          self = list.length - 1;
        }
      }
      if (tag === 'svg') return;
      for (const child of el.children) visit(child, self);
    };
    for (const root of roots) for (const child of root.children) visit(child, -1);
    return list;
  };
  P.els = [];
  P.register = (el) => {
    let i = P.els.indexOf(el);
    if (i < 0) i = P.els.push(el) - 1;
    return i;
  };
  P.origin = (body) => {
    // top-left of the union of the body's rendered descendants
    let x = Infinity, y = Infinity;
    for (const el of body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width || r.height) { x = Math.min(x, r.x); y = Math.min(y, r.y); }
    }
    return { x: isFinite(x) ? x : 0, y: isFinite(y) ? y : 0 };
  };
  P.sample = (body, origin, props, durationMs) =>
    new Promise((done) => {
      const frames = [];
      let t0 = null;
      const mark = (e) => { if (t0 === null) t0 = e.timeStamp; };
      document.addEventListener('pointerover', mark, { capture: true, once: false });
      document.addEventListener('pointerdown', mark, { capture: true });
      document.addEventListener('keydown', mark, { capture: true });
      const start = performance.now();
      P.armed = () => {};
      const tick = (now) => {
        if (t0 !== null) {
          frames.push({ t: now - t0, els: P.walk([body, ...P.portals()], props, origin) });
        }
        if (now - start < durationMs + 3000 && (t0 === null || now - t0 < durationMs)) requestAnimationFrame(tick);
        else {
          document.removeEventListener('pointerover', mark, { capture: true });
          document.removeEventListener('pointerdown', mark, { capture: true });
          document.removeEventListener('keydown', mark, { capture: true });
          done(frames);
        }
      };
      requestAnimationFrame(tick);
    });
}

// ---- node side ----------------------------------------------------------

// Tags are left out: an Angular host element stands in for React's root tag.
const keyOf = (e) => `${e.cls}|${e.text}`;
function pair(a, b) {
  const pairs = [];
  const used = new Set();
  const byKey = new Map();
  b.forEach((e, i) => {
    const k = keyOf(e);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(i);
  });
  const leftovers = [];
  for (const e of a) {
    const q = byKey.get(keyOf(e));
    const i = q?.find((j) => !used.has(j));
    if (i === undefined) leftovers.push(e);
    else { used.add(i); pairs.push([e, b[i]]); }
  }
  // fallback: same tag + text, in order
  const rest = b.map((e, i) => [e, i]).filter(([, i]) => !used.has(i));
  const missing = [];
  for (const e of leftovers) {
    const hit = rest.find(([o, i]) => !used.has(i) && o.text === e.text && (o.tag === e.tag || (e.text !== '' && (o.tag.includes('-') || e.tag.includes('-')))));
    if (hit) { used.add(hit[1]); pairs.push([e, hit[0]]); }
    else missing.push(e);
  }
  const extra = b.filter((_, i) => !used.has(i));
  return { pairs, missing, extra };
}

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
function differs(p, va, vb) {
  return delta(p, va, vb) > 0;
}
// 0 when equal within tolerance, otherwise a magnitude (1 for categorical).
function delta(p, va, vb) {
  if (va === vb) return 0;
  if (typeof va === 'number') {
    const d = Math.abs(va - vb);
    return d > (p === 'opacity' ? 0.03 : 0.75) ? d : 0;
  }
  if (p === 'fontFamily') return 0;
  if (p === 'transform') return sameMatrix(va, vb) ? 0 : 1;
  // Same text with numbers that differ only slightly (colors mid-transition,
  // variable-font axes): compare the numbers with a tolerance.
  const re = /-?\d*\.?\d+(?:e-?\d+)?/g;
  if (String(va).replace(re, '#') === String(vb).replace(re, '#')) {
    const x = String(va).match(re).map(Number), y = String(vb).match(re).map(Number);
    let worst = 0;
    x.forEach((v, i) => {
      const d = Math.abs(v - y[i]);
      if (d > (Math.abs(v) > 2 ? 2 : 0.015)) worst = Math.max(worst, d);
    });
    return worst;
  }
  return 1;
}
function sameMatrix(a, b) {
  const m = (s) => (s === 'none' ? [1, 0, 0, 1, 0, 0] : (s.match(/-?[\d.e-]+/g) ?? []).map(Number));
  const [x, y] = [m(a), m(b)];
  if (x.length !== y.length) return false;
  return x.every((v, i) => Math.abs(v - y[i]) < (i >= 4 && x.length === 6 ? 0.75 : 0.02));
}
const describe = (e) => `<${e.tag}${e.role ? ` role=${e.role}` : ''}${e.text ? ` "${e.text}"` : ''}${e.cls ? ` .${e.cls.split(' ').slice(0, 6).join('.')}${e.cls.split(' ').length > 6 ? '…' : ''}` : ''}>`;

// Offsets are measured from the nearest recorded ancestor (React side) and its
// Angular partner, so a demo-only caption or wrapper does not shift everything.
function local(a, b, pairs) {
  const partner = new Map(pairs.map(([ra, ng]) => [ra, ng]));
  return (ra, ng) => {
    const pa = a[ra.parent];
    const pb = pa ? partner.get(pa) : undefined;
    if (!pa || !pb) return { ax: ra.x, ay: ra.y, bx: ng.x, by: ng.y };
    return { ax: ra.x - pa.x, ay: ra.y - pa.y, bx: ng.x - pb.x, by: ng.y - pb.y };
  };
}

function staticDiff(a, b) {
  const { pairs, missing, extra } = pair(a, b);
  const offset = local(a, b, pairs);
  const lines = [];
  for (const e of missing) lines.push(`  - missing in Angular: ${describe(e)} ${e.w.toFixed(1)}x${e.h.toFixed(1)}`);
  for (const e of extra) lines.push(`  + extra in Angular:   ${describe(e)} ${e.w.toFixed(1)}x${e.h.toFixed(1)}`);
  for (const [ra, ng] of pairs) {
    const d = [];
    if (ra.cls !== ng.cls) {
      const A = new Set(ra.cls.split(' ')), B = new Set(ng.cls.split(' '));
      const only = (S, T) => [...S].filter((c) => c && !T.has(c)).join(' ');
      d.push(`class -[${only(A, B)}] +[${only(B, A)}]`);
    }
    const o = offset(ra, ng);
    if (differs('x', o.ax, o.bx)) d.push(`dx ${o.ax.toFixed(1)}→${o.bx.toFixed(1)}`);
    if (differs('y', o.ay, o.by)) d.push(`dy ${o.ay.toFixed(1)}→${o.by.toFixed(1)}`);
    for (const p of ['w', 'h']) if (differs(p, ra[p], ng[p])) d.push(`${p} ${ra[p].toFixed(1)}→${ng[p].toFixed(1)}`);
    for (const p of STYLE_PROPS) if (differs(p, ra.style[p], ng.style[p])) d.push(`${p} ${ra.style[p]} → ${ng.style[p]}`);
    if (d.length) lines.push(`  ~ ${describe(ra)}: ${d.join('; ')}`);
  }
  return { lines, pairs };
}

function motionDiff(fa, fb) {
  // Resample both runs on a 16ms grid and compare every paired element. A
  // value counts as matching when React had it one frame earlier or later:
  // frame-scheduling jitter between the two runtimes is not a motion change.
  const grid = [];
  const end = Math.min(fa.at(-1)?.t ?? 0, fb.at(-1)?.t ?? 0);
  for (let t = 0; t <= end; t += 16) grid.push(t);
  const at = (frames, t) => frames.reduce((best, f) => (Math.abs(f.t - t) < Math.abs(best.t - t) ? f : best), frames[0]);
  const worst = new Map();
  const presence = new Map();
  const value = (e, p) => (p in e ? e[p] : e.style[p]);
  for (const t of grid) {
    const B = at(fb, t).els;
    const shifted = [t - 16, t, t + 16].map((s) => {
      const A = at(fa, Math.max(0, s)).els;
      const res = pair(A, B);
      return { res, byB: new Map(res.pairs.map(([ra, ng]) => [ng, ra])) };
    });
    const { pairs, missing, extra } = shifted[1].res;
    const absentEverywhere = (e) => shifted.every((x) => x.res.extra.includes(e));
    for (const e of missing) {
      if (shifted.some((x) => x.res.pairs.some(([ra]) => keyOf(ra) === keyOf(e)))) continue;
      presence.set(`only React: ${describe(e)}`, (presence.get(`only React: ${describe(e)}`) ?? 0) + 1);
    }
    for (const e of extra) {
      if (!absentEverywhere(e)) continue;
      presence.set(`only Angular: ${describe(e)}`, (presence.get(`only Angular: ${describe(e)}`) ?? 0) + 1);
    }
    for (const [ra, ng] of pairs) {
      for (const p of MOTION_PROPS) {
        let best = Infinity, bestA = null;
        for (const x of shifted) {
          const other = x.byB.get(ng);
          if (!other) continue;
          const d = delta(p, value(other, p), value(ng, p));
          if (d < best) { best = d; bestA = other; }
        }
        if (!best) continue;
        const va = value(bestA ?? ra, p), vb = value(ng, p);
        const k = `${describe(ra)} ${p}`;
        const w = worst.get(k);
        if (!w || best > w.delta) worst.set(k, { delta: best, t, va, vb, count: (w?.count ?? 0) + 1 });
        else w.count++;
      }
    }
  }
  const lines = [];
  for (const [k, n] of presence) if (n > 1) lines.push(`    presence ${k} in ${n}/${grid.length} frames`);
  for (const [k, w] of worst) {
    if (w.count < 2) continue;
    const fmt = (v) => (typeof v === 'number' ? v.toFixed(1) : v);
    lines.push(`    ${k}: ${w.count}/${grid.length} frames, worst at ${w.t}ms ${fmt(w.va)} → ${fmt(w.vb)}`);
  }
  return lines;
}

async function open(browser, url, side) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light', reducedMotion: 'no-preference', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.addStyleTag({ content: '*{caret-color:transparent!important}' });
  await page.evaluate(pageLib);
  await page.evaluate(() => document.querySelectorAll('body > *').forEach((el) => el.setAttribute('data-parity-static', '')));
  await page.waitForTimeout(800);
  return { page, ctx, side, errors };
}

async function matchStage(ng, ra, key) {
  // Give the Angular stage the React preview body's box so layout is comparable.
  const box = await ra.page.evaluate((key) => {
    const r = window.__parity.roots('react').find((x) => x.key === key);
    const cs = getComputedStyle(r.body);
    return { width: r.body.getBoundingClientRect().width, padding: cs.padding, minHeight: cs.minHeight, alignItems: cs.alignItems, justifyContent: cs.justifyContent, flexDirection: cs.flexDirection };
  }, key);
  await ng.page.evaluate(({ key, box }) => {
    const r = window.__parity.roots('angular').find((x) => x.key === key);
    Object.assign(r.body.style, {
      width: `${box.width}px`, maxWidth: 'none', flex: 'none', padding: box.padding, minHeight: box.minHeight,
      alignItems: box.alignItems, justifyContent: box.justifyContent, flexDirection: box.flexDirection,
      flexWrap: 'nowrap', gap: '0px', boxSizing: 'border-box', borderWidth: '0px',
    });
  }, { key, box });
  await ng.page.waitForTimeout(300);
}

const snapshot = (side, key) => side.page.evaluate(({ key, side: s, props }) => {
  const P = window.__parity;
  const r = P.roots(s).find((x) => x.key === key);
  r.body.scrollIntoView({ block: 'center' });
  return P.walk([r.body], props, P.origin(r.body));
}, { key, side: side.side, props: STYLE_PROPS });

async function runMotion(ra, ng, key, pairs, report) {
  const interactive = pairs.filter(([e]) => ['button', 'a', 'input', 'textarea'].includes(e.tag) || /button|tab|option|menuitem|radio|checkbox|switch|slider|combobox|row/.test(e.role));
  const targets = interactive.slice(0, TARGETS);
  for (const [ta, tb] of targets) {
    for (const action of ['hover', 'click', 'escape']) {
      const runs = [];
      for (const [side, target] of [[ra, ta], [ng, tb]]) {
        const pos = await side.page.evaluate(({ key, s, idx }) => {
          const P = window.__parity;
          const r = P.roots(s).find((x) => x.key === key);
          r.body.scrollIntoView({ block: 'center' });
          const b = P.els[idx].getBoundingClientRect();
          return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        }, { key, s: side.side, idx: target.idx });
        if (action === 'hover') { await side.page.mouse.move(2, 2); await side.page.waitForTimeout(400); }
        const sampling = side.page.evaluate(({ key, s, props }) => {
          const P = window.__parity;
          const r = P.roots(s).find((x) => x.key === key);
          return P.sample(r.body, P.origin(r.body), props, 900);
        }, { key, s: side.side, props: MOTION_PROPS.filter((p) => !['x', 'y', 'w', 'h'].includes(p)) });
        await side.page.waitForTimeout(50);
        if (action === 'hover') await side.page.mouse.move(pos.x, pos.y, { steps: 1 });
        else if (action === 'click') await side.page.mouse.click(pos.x, pos.y);
        else await side.page.keyboard.press('Escape');
        runs.push(await sampling);
      }
      const lines = motionDiff(runs[0], runs[1]);
      if (lines.length) report.push(`  motion ${action} ${describe(ta)}`, ...lines);
    }
  }
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
mkdirSync(OUT, { recursive: true });
for (const slug of slugs) {
  const report = [`# ${slug}`];
  const ra = await open(browser, `${REACT}/docs/${REACT_SLUG[slug] ?? slug}`, 'react');
  const ng = await open(browser, `${ANGULAR}/${slug}`, 'angular');
  const keysA = await ra.page.evaluate(() => window.__parity.roots('react').map((r) => r.key));
  const keysB = await ng.page.evaluate(() => window.__parity.roots('angular').map((r) => r.key));
  const shared = keysA.filter((k) => keysB.includes(k) && (!ONLY_SECTION || k.startsWith(ONLY_SECTION)));
  report.push(`sections: ${shared.length} shared; only React: [${keysA.filter((k) => !keysB.includes(k)).join(', ')}]; only Angular: [${keysB.filter((k) => !keysA.includes(k)).join(', ')}]`);
  for (const key of shared) {
    await matchStage(ng, ra, key);
    const a = await snapshot(ra, key);
    const b = await snapshot(ng, key);
    const { lines, pairs } = staticDiff(a, b);
    report.push(`## ${key} (${a.length} React / ${b.length} Angular elements)`, ...lines);
    if (SHOTS) {
      for (const side of [ra, ng]) {
        const handle = await side.page.evaluateHandle(({ key, s }) => window.__parity.roots(s).find((x) => x.key === key).body, { key, s: side.side });
        await handle.screenshot({ path: join(OUT, `${slug}--${key.replace(/[^\w-]+/g, '_')}--${side.side}.png`), animations: 'disabled' }).catch(() => {});
      }
    }
    if (MOTION) await runMotion(ra, ng, key, pairs, report);
    await ra.page.mouse.move(2, 2);
    await ng.page.mouse.move(2, 2);
    await ra.page.keyboard.press('Escape');
    await ng.page.keyboard.press('Escape');
  }
  if (ra.errors.length || ng.errors.length) report.push(`errors: React ${JSON.stringify(ra.errors)} Angular ${JSON.stringify(ng.errors)}`);
  writeFileSync(join(OUT, `${slug}.txt`), report.join('\n') + '\n');
  console.log(`${slug}: ${report.length - 2} lines → ${join(OUT, `${slug}.txt`)}`);
  await ra.ctx.close();
  await ng.ctx.close();
}
await browser.close();
