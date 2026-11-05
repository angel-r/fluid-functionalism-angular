/**
 * The popup's collision rules, which mirror Base UI's anchor positioning
 * (floating-ui `flip` + `size`): a 5px collision padding, and a 1px flip bias
 * toward the requested side so a tie never flips the popup away from it.
 */
import { availableSpace, choosePopupSide } from './popup-overlay';

const viewport = { width: 1280, height: 900 };
// A 36px trigger whose top sits at `top`.
const anchorAt = (top: number) => ({ top, bottom: top + 36, left: 600, right: 700 });

describe('popup overlay: side choice', () => {
  it('keeps the requested side when the popup fits there', () => {
    expect(choosePopupSide('bottom', anchorAt(200), { width: 288, height: 480 }, viewport, 6)).toBe('bottom');
  });

  it('flips to the opposite side when only that side fits', () => {
    expect(choosePopupSide('bottom', anchorAt(600), { width: 288, height: 480 }, viewport, 6)).toBe('top');
  });

  // Trigger at 432: 426px below and 426px above, 480px wanted. Base UI pads
  // the side across from the requested one 1px more, so bottom wins the tie.
  it('stays on the requested side when neither side fits and both overflow alike', () => {
    expect(choosePopupSide('bottom', anchorAt(432), { width: 288, height: 480 }, viewport, 6)).toBe('bottom');
    expect(choosePopupSide('top', anchorAt(432), { width: 288, height: 480 }, viewport, 6)).toBe('top');
  });

  it('takes the side that overflows less when neither fits', () => {
    expect(choosePopupSide('bottom', anchorAt(460), { width: 288, height: 480 }, viewport, 6)).toBe('top');
    expect(choosePopupSide('bottom', anchorAt(400), { width: 288, height: 480 }, viewport, 6)).toBe('bottom');
  });

  it('measures left and right against the width', () => {
    const anchor = { top: 100, bottom: 136, left: 1000, right: 1200 };
    expect(choosePopupSide('right', anchor, { width: 200, height: 100 }, viewport, 4)).toBe('left');
  });
});

describe('popup overlay: available height', () => {
  // Base UI's size(): the space on the resolved side less the 5px padding.
  it('is the space below or above the trigger less the side offset and a 5px padding', () => {
    expect(availableSpace('bottom', anchorAt(400), viewport, 6)).toBe(900 - 436 - 6 - 5);
    expect(availableSpace('top', anchorAt(400), viewport, 6)).toBe(400 - 6 - 5);
    expect(availableSpace('right', anchorAt(400), viewport, 6)).toBe(900 - 10);
  });

  it('keeps fractions instead of rounding them', () => {
    expect(availableSpace('bottom', { top: 400.4, bottom: 436.4, left: 0, right: 0 }, viewport, 6)).toBeCloseTo(452.6, 5);
  });
});
