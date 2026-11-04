// Browser checks for form fields (see ../run.mjs), on /docs/input-group.
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
];
