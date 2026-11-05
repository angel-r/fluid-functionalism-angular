// Browser checks for form fields (see ../run.mjs), on /docs/input-group.
// The multiline field's auto-grow reads real line heights and scrollHeight,
// which jsdom does not lay out, so it is measured here.
// Browser autofill is a UA stylesheet state jsdom has no notion of, so it is
// forced over CDP (`CSS.forcePseudoState`), which applies the same
// `:-webkit-autofill` rules a real autofill does.

/** The alpha of a computed `rgb()`/`rgba()` colour (1 when it has none). */
const alpha = (color) => {
  const parts = color.match(/[\d.]+/g) ?? [];
  return parts.length === 4 ? Number(parts[3]) : 1;
};

/** Forces `:autofill` on the element matched by `selector` until the page closes. */
async function forceAutofill(page, selector) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['autofill'] });
}

/** The autofilled input's paint, next to the --foreground token it should keep. */
function look(page) {
  return page.evaluate(() => {
    const input = document.querySelector('ff-input-field input');
    const probe = document.createElement('span');
    probe.style.color = 'var(--foreground)';
    input.parentElement.append(probe);
    const foreground = getComputedStyle(probe).color;
    probe.remove();
    const style = getComputedStyle(input);
    return {
      autofilled: input.matches(':-webkit-autofill'),
      background: style.backgroundColor,
      textFill: style.webkitTextFillColor,
      caret: style.caretColor,
      foreground,
    };
  });
}

function assertOwnLook(h, v, label) {
  h.assert(v.autofilled, `${label}: the input is not in the autofill state, so the check proves nothing`, v);
  h.assert(alpha(v.background) === 0, `${label}: autofill paints a background inside the field`, v);
  h.assert(v.textFill === v.foreground, `${label}: autofilled text is not the foreground colour`, v);
  h.assert(v.caret === v.foreground, `${label}: the caret is not the foreground colour`, v);
}

function setTheme(page, theme) {
  return page.evaluate((t) => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(t);
  }, theme);
}

export const checks = [
  {
    name: 'input-field: an autofilled input keeps the field look, at rest and focused, in both themes',
    path: 'docs/input-group',
    async run(page, h) {
      await forceAutofill(page, 'ff-input-field input');
      for (const theme of ['light', 'dark']) {
        await setTheme(page, theme);
        await h.frames(page);
        assertOwnLook(h, await look(page), `${theme}, at rest`);
        await page.locator('ff-input-field input').first().focus();
        await h.frames(page);
        assertOwnLook(h, await look(page), `${theme}, focused`);
        await page.locator('ff-input-field input').first().blur();
      }
    },
  },
  {
    name: 'input-field: an autofilled input stays transparent through the theme cross-fade',
    path: 'docs/input-group',
    async run(page, h) {
      await setTheme(page, 'light');
      await forceAutofill(page, 'ff-input-field input');
      await h.frames(page);
      // ThemeProvider's `.transitioning` swaps every element's transition for
      // a 180ms tween; the autofill background must not ride it in.
      await page.evaluate(() => {
        document.documentElement.classList.add('transitioning');
        document.documentElement.classList.replace('light', 'dark');
      });
      await page.waitForTimeout(400);
      await page.evaluate(() => document.documentElement.classList.remove('transitioning'));
      await h.frames(page);
      assertOwnLook(h, await look(page), 'after the cross-fade');
    },
  },
  {
    name: 'input-field multiline: Enter adds lines, the field grows from 3 rows to 8, then scrolls',
    path: 'docs/input-group',
    async run(page, h) {
      const area = h.section(page, 'Multiline').locator('ff-input-field textarea');
      const measure = () =>
        area.evaluate((el) => {
          const box = el.closest('[data-slot="input-container"]');
          return {
            value: el.value,
            height: el.getBoundingClientRect().height,
            box: box.getBoundingClientRect().height,
            lineHeight: parseFloat(getComputedStyle(el).lineHeight),
            overflowY: getComputedStyle(el).overflowY,
            scrolls: el.scrollHeight > el.clientHeight,
          };
        });

      const rest = await measure();
      h.near(rest.height, 3 * rest.lineHeight, 0.5, 'empty: the textarea is not 3 rows tall');
      // The box pads one row up to the control height: 8px above and below.
      h.near(rest.box - rest.height, 16, 0.5, 'the box does not pad the textarea by 8px each side');

      await area.click();
      await page.keyboard.type('The door was blocked by a box.');
      for (const line of ['Closed it.', 'Checked the seal.', 'Logged it.']) {
        await page.keyboard.press('Enter');
        await page.keyboard.type(line);
      }
      await h.frames(page);
      const four = await measure();
      h.assert(four.value.split('\n').length === 4, 'Enter did not insert new lines', four);
      h.near(four.height, 4 * four.lineHeight, 0.5, 'four lines: the textarea did not grow to 4 rows');
      h.assert(four.overflowY === 'hidden' && !four.scrolls, 'four lines: the textarea scrolls before maxRows', four);

      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Enter');
        await page.keyboard.type(`Line ${i + 5}`);
      }
      await h.frames(page);
      const full = await measure();
      h.near(full.height, 8 * full.lineHeight, 0.5, 'twelve lines: the textarea is not capped at 8 rows');
      h.assert(full.overflowY === 'auto' && full.scrolls, 'twelve lines: the textarea does not scroll past maxRows', full);
    },
  },
];
