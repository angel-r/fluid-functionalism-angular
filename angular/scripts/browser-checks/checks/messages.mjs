// Browser checks for the message components (see ../run.mjs), on
// /docs/input-message: the queued card's morph into its sent bubble and the
// queued stack's drag reorder. Each one drives the docs page's "Queued
// messages" demo like a user and samples the moving boxes once per frame.

const CARD = '[data-slot="queued-stack-card"]';

/** True when a computed `transform`/`translate` value is the identity. */
function isIdentity(value) {
  return ['none', '', '0px', '0px 0px', 'matrix(1, 0, 0, 1, 0, 0)'].includes(value);
}

/** Distance between two boxes' top-left corners. */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** The queued-stack card holding `text`, as a locator. */
const card = (page, text) => page.locator(CARD, { hasText: text });

/** Moves the mouse onto the middle of `locator` (cards ignore pointer events on their text). */
async function hoverCenter(page, locator) {
  const b = await locator.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
}

// The old demo pages' "Live transcript" board (a fixed-height, bottom-justified
// column whose rows a button appended) has no counterpart on the docs site:
// the reference's ChatMessage page is static, and the input-message transcript
// scrolls instead of reflowing its rows. Its layout-FLIP checks (normal and
// reduced motion) were dropped with it; the queued-chat demos below still
// exercise the component's entrance and the queued-to-sent morph.

export const checks = [
  // Dispatching a text-only queued card (Stop ends the streaming reply, so the
  // composer sends the front card) morphs that card into the sent bubble (the
  // React shared `layoutId`): the bubble's text starts in the card's box,
  // travels over several frames into the bubble's own box and ends there with
  // no leftover transform. The text is counter-scaled, so it never stretches
  // on the way, and the card does not stay behind in the stack.
  {
    name: 'queued-stack: dispatched card morphs into the sent bubble',
    path: 'docs/input-message',
    async run(page, h) {
      const section = h.section(page, 'Queued messages');
      await section.scrollIntoViewIfNeeded();
      const TEXT = 'Tighten the spacing';
      // The front card carries attachments (those fade in, no morph): remove it.
      const front = section.locator(CARD, { hasText: 'Match these mockups' });
      await front.scrollIntoViewIfNeeded();
      await hoverCenter(page, front);
      await page.waitForTimeout(500);
      await section.getByRole('button', { name: 'Remove queued message: Match these mockups' }).click();
      await page.mouse.move(5, 5);
      await page.waitForTimeout(600);

      const probe = () => {
        const TEXT = 'Tighten the spacing';
        // The glyph box of each text node reading TEXT (independent of the
        // element that wraps it, so padding never counts).
        const nodes = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) if (walker.currentNode.textContent.trim() === TEXT) nodes.push(walker.currentNode);
        const rect = (node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          const r = range.getBoundingClientRect();
          return { x: r.left, y: r.top, w: r.width, h: r.height };
        };
        const bubble = nodes.find((n) => n.parentElement.closest('ff-chat-message'));
        const queued = nodes.find((n) => n.parentElement.closest('[data-slot="queued-stack-card"]'));
        const host = bubble?.parentElement.closest('ff-chat-message');
        const shown = queued && getComputedStyle(queued.parentElement).visibility === 'visible' && rect(queued).w > 0;
        return {
          bubble: bubble ? rect(bubble) : null,
          hostTransform: host ? getComputedStyle(host).transform : null,
          textTransform: bubble ? getComputedStyle(bubble.parentElement).transform : null,
          card: shown ? rect(queued) : null,
          front: document.querySelector('[data-slot="queued-stack-card"]')?.textContent.trim() ?? null,
        };
      };
      const before = await page.evaluate(probe);
      h.assert(before.front?.startsWith(TEXT), 'the text-only card is next to dispatch', before.front);
      h.assert(before.card && !before.bubble, 'the card is queued and not sent yet', before);
      const start = before.card;

      const series = await h.sample(page, probe, () => section.getByRole('button', { name: 'Stop' }).click(), 800);
      const appear = series.findIndex((s) => s.v.bubble);
      h.assert(appear > -1, 'the sent bubble appears');
      const frames = series.slice(appear).map((s) => s.v);
      const end = frames.at(-1).bubble;
      const travel = dist(start, end);
      h.assert(travel > 50, 'the bubble sits away from the card', { start, end });

      // Starts in the card's box (one frame of spring progress allowed).
      h.assert(
        dist(frames[0].bubble, start) <= travel * 0.45,
        'the bubble starts in the queued card box',
        { first: frames[0].bubble, card: start, end },
      );
      const moving = frames.filter((f) => {
        const p = dist(f.bubble, start) / travel;
        return p > 0.05 && p < 0.95;
      });
      h.assert(moving.length >= 3, 'the bubble travels through intermediate positions', frames.map((f) => f.bubble));
      // Counter-scaled text: same size all the way.
      for (const f of frames) {
        h.near(f.bubble.w, end.w, end.w * 0.08, 'the morphing text keeps its width');
        h.near(f.bubble.h, end.h, end.h * 0.08, 'the morphing text keeps its height');
      }
      // The card leaves the stack: never visible at its queued spot once the bubble shows.
      frames.slice(1).forEach((f) => {
        h.assert(!f.card || dist(f.card, start) > 2, 'the card stays behind in the stack', f.card);
      });
      h.assert(!frames.at(-1).card, 'the card is gone at the end', frames.at(-1).card);
      for (const f of frames.slice(-5)) h.assert(dist(f.bubble, end) <= 0.5, 'the bubble settles in its own box', f.bubble);
      h.assert(isIdentity(frames.at(-1).hostTransform), 'the bubble keeps no transform', frames.at(-1).hostTransform);
      h.assert(isIdentity(frames.at(-1).textTransform), 'the bubble text keeps no transform', frames.at(-1).textTransform);
    },
  },

  // The queued stack fans out on hover; dragging the front card up past both
  // neighbours reorders the queue as it goes. The dragged card follows the
  // pointer (lifted to 1.03), each neighbour springs one slot down (the nearer
  // first), the release springs the card into the top slot, and the new order
  // holds on screen, in the DOM and in the queue (the collapsed pile's front
  // card is the new first one).
  {
    name: 'input-message: queued stack drag reorders cards into their new slots',
    path: 'docs/input-message',
    async run(page, h) {
      const NAMES = ['Match these mockups', 'Tighten the spacing', 'Audit the color contrast'];
      const section = h.section(page, 'Queued messages');
      await section.scrollIntoViewIfNeeded();
      const a = card(page, NAMES[0]);
      await a.scrollIntoViewIfNeeded();
      await hoverCenter(page, a);
      await page.waitForTimeout(600);
      await page.evaluate(() => {
        window.__checkPointerY = null;
        window.__checkReleased = false;
        addEventListener('pointermove', (e) => (window.__checkPointerY = e.clientY), true);
      });

      const probe = () => {
        const NAMES = ['Match these mockups', 'Tighten the spacing', 'Audit the color contrast'];
        const cards = [...document.querySelectorAll('[data-slot="queued-stack-card"]')];
        const index = (el) => NAMES.findIndex((n) => el.textContent.includes(n));
        return {
          cards: NAMES.map((n) => {
            const r = cards.find((c) => c.textContent.includes(n)).getBoundingClientRect();
            return { top: r.top, mid: r.top + r.height / 2, w: r.width };
          }),
          dom: cards.map(index),
          pointer: window.__checkPointerY,
          released: window.__checkReleased,
        };
      };
      const fanned = await page.evaluate(probe);
      const [A, B, C] = fanned.cards;
      const step = A.top - B.top;
      const W = A.w;
      h.near(step, 52, 0.5, 'the hovered stack fans out one card + 8px gap per slot');
      h.near(B.top - C.top, step, 0.5, 'the hovered stack fans out evenly');
      const slot = (i) => A.top - i * step;

      // Grab the front card and drag it up into the top slot's band, 14px
      // below the slot's centre so the release has a distance to spring.
      const x = (await a.boundingBox()).x + 100;
      const startY = A.mid;
      const endY = slot(2) + 22 + 14;
      const moves = 20;
      const series = await h.sample(
        page,
        probe,
        async () => {
          await page.mouse.move(x, startY);
          await page.mouse.down();
          for (let i = 1; i <= moves; i++) {
            await page.mouse.move(x, startY + ((endY - startY) * i) / moves);
            await h.frames(page, 1);
          }
          await page.waitForTimeout(300);
          await page.evaluate(() => (window.__checkReleased = true));
          await page.mouse.up();
        },
        700,
      );

      // While dragged, the card's centre follows the pointer (one frame of lag
      // allowed) and it is lifted to 1.03.
      const isDragged = (s) => !s.v.released && s.v.pointer !== null && s.v.pointer < startY - 5;
      const dragged = series.filter(isDragged);
      h.assert(dragged.length >= 10, 'the drag was sampled', dragged.length);
      let previous = null;
      series.forEach((s, k) => {
        if (k && series[k - 1].v.pointer !== s.v.pointer) previous = series[k - 1].v.pointer;
        if (!isDragged(s)) return;
        // The move lands on the frame after its event: the current or the
        // previous pointer position.
        const pointers = [s.v.pointer, previous].filter((p) => p != null);
        const off = Math.min(...pointers.map((p) => Math.abs(s.v.cards[0].mid - p)));
        h.assert(off <= 2, 'the dragged card follows the pointer', { mid: s.v.cards[0].mid, pointers });
        h.near(s.v.cards[0].w, W * 1.03, 1, 'the dragged card is lifted');
      });

      // Each neighbour springs one slot down, the nearer one first.
      const leavesAt = (i, from) => series.findIndex((s) => Math.abs(s.v.cards[i].top - from) > 0.5);
      for (const [i, from, to] of [[1, slot(1), slot(0)], [2, slot(2), slot(1)]]) {
        const tops = series.map((s) => s.v.cards[i].top);
        const between = tops.filter((y) => y > from + 0.5 && y < to - 0.5);
        h.assert(between.length >= 2, `"${NAMES[i]}" animates into its new slot`, tops);
      }
      h.assert(leavesAt(1, slot(1)) > -1 && leavesAt(1, slot(1)) < leavesAt(2, slot(2)), 'the order changes as the card passes each neighbour', {
        second: leavesAt(1, slot(1)),
        third: leavesAt(2, slot(2)),
      });

      // The release springs the card from under the pointer into the top slot.
      const released = series.filter((s) => s.v.released).map((s) => s.v.cards[0]);
      const releaseTop = dragged.at(-1).v.cards[0].top;
      h.assert(releaseTop - slot(2) > 10, 'the card was released below its slot', { releaseTop, slot: slot(2) });
      const snapping = released.filter((c) => c.top < releaseTop - 0.5 && c.top > slot(2) + 0.5);
      h.assert(snapping.length >= 2, 'the released card springs into its slot', released.map((c) => c.top));

      // Final layout: new order, unlifted, no residue.
      const last = series.at(-1).v;
      [slot(2), slot(0), slot(1)].forEach((top, i) => {
        h.near(last.cards[i].top, top, 0.5, `"${NAMES[i]}" settles in its new slot`);
        h.near(last.cards[i].w, W, 0.5, `"${NAMES[i]}" ends at full scale`);
      });
      const visible = [0, 1, 2].sort((i, j) => last.cards[i].top - last.cards[j].top);
      h.assert(visible.join() === '0,2,1', 'visible order top to bottom is the new one', visible);
      h.assert(last.dom.join() === '1,2,0', 'DOM order is the new queue order', last.dom);

      // The queue itself changed: collapsed, the new first card is the front one.
      await page.mouse.move(5, 5);
      await page.waitForTimeout(600);
      const pile = (await page.evaluate(probe)).cards;
      h.near(pile[1].w, W, 0.5, `"${NAMES[1]}" is the front card`);
      h.near(pile[2].w, W * 0.95, 1, `"${NAMES[2]}" is the first peek`);
      h.near(pile[0].w, W * 0.9, 1, `"${NAMES[0]}" is the last peek`);
    },
  },
];
