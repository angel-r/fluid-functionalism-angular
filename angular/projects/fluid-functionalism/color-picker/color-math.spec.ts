/**
 * The color picker's pure color math: conversions between HSV, RGB, HSL and
 * OKLCH, the string parser, the ParsedColor builder and the channel edits the
 * panel applies. One test per rule stated in the React source comments.
 */
import {
  applyChannelEdit,
  buildParsed,
  formatValueByFormat,
  hslToRgb,
  hsvaFromRgba,
  hsvToRgb,
  initialHsva,
  oklchToRgb,
  parseColor,
  parseHex,
  resolveCssColor,
  rgbToHexStr,
  rgbToHsl,
  rgbToHsv,
  rgbToOklch,
  type HsvaState,
} from './color-math';

const round = (rgb: { r: number; g: number; b: number }) => ({
  r: Math.round(rgb.r),
  g: Math.round(rgb.g),
  b: Math.round(rgb.b),
});

describe('hsvToRgb / rgbToHsv', () => {
  it('converts the primaries and wraps the hue into 0..360', () => {
    expect(round(hsvToRgb(0, 1, 1))).toEqual({ r: 255, g: 0, b: 0 });
    expect(round(hsvToRgb(120, 1, 1))).toEqual({ r: 0, g: 255, b: 0 });
    expect(round(hsvToRgb(240, 1, 1))).toEqual({ r: 0, g: 0, b: 255 });
    expect(round(hsvToRgb(360, 1, 1))).toEqual({ r: 255, g: 0, b: 0 });
    expect(round(hsvToRgb(-120, 1, 1))).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('keeps output channels unrounded', () => {
    expect(hsvToRgb(0, 0, 0.5).r).toBeCloseTo(127.5, 5);
  });

  it('returns h = 0 and s = 0 for a color with no chroma', () => {
    expect(rgbToHsv(128, 128, 128)).toEqual({ h: 0, s: 0, v: 128 / 255 });
    expect(rgbToHsv(0, 0, 0)).toEqual({ h: 0, s: 0, v: 0 });
  });

  it('round-trips a saturated color', () => {
    const hsv = rgbToHsv(107, 151, 255);
    expect(round(hsvToRgb(hsv.h, hsv.s, hsv.v))).toEqual({ r: 107, g: 151, b: 255 });
  });
});

describe('rgbToHsl / hslToRgb', () => {
  it('converts both ways', () => {
    const hsl = rgbToHsl(255, 0, 0);
    expect(hsl).toEqual({ h: 0, s: 1, l: 0.5 });
    expect(round(hslToRgb(120, 1, 0.25))).toEqual({ r: 0, g: 128, b: 0 });
    expect(round(hslToRgb(0, 0, 1))).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe('OKLCH', () => {
  it('converts sRGB white and red', () => {
    const white = rgbToOklch(255, 255, 255);
    expect(white.L).toBeCloseTo(1, 3);
    expect(white.C).toBeCloseTo(0, 3);
    const red = rgbToOklch(255, 0, 0);
    expect(red.L).toBeCloseTo(0.628, 3);
    expect(red.C).toBeCloseTo(0.2577, 3);
    expect(red.H).toBeCloseTo(29.23, 1);
  });

  it('round-trips through oklchToRgb', () => {
    const o = rgbToOklch(107, 151, 255);
    expect(round(oklchToRgb(o.L, o.C, o.H))).toEqual({ r: 107, g: 151, b: 255 });
  });

  it('clips out-of-gamut chroma per channel', () => {
    const rgb = oklchToRgb(0.7, 0.4, 150);
    for (const c of [rgb.r, rgb.g, rgb.b]) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(255);
    }
  });
});

describe('rgbToHexStr', () => {
  it('appends alpha only below 1', () => {
    expect(rgbToHexStr(255, 0, 0, 1)).toBe('#ff0000');
    expect(rgbToHexStr(255, 0, 0, 0.5)).toBe('#ff000080');
    expect(rgbToHexStr(300, -4, 0.4, 1)).toBe('#ff0000');
  });
});

describe('parseHex', () => {
  it('reads 3, 4, 6 and 8 digits with an optional #', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseHex('f008')).toEqual({ r: 255, g: 0, b: 0, a: 0x88 / 255 });
    expect(parseHex('#6B97FF')).toEqual({ r: 107, g: 151, b: 255, a: 1 });
    expect(parseHex('ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 / 255 });
  });

  it('rejects 5 and 7 digits and non-hex', () => {
    expect(parseHex('#12345')).toBeNull();
    expect(parseHex('#1234567')).toBeNull();
    expect(parseHex('#red')).toBeNull();
  });
});

describe('parseColor', () => {
  it('reads rgb() and rgba() with commas, spaces, slash and percent alpha', () => {
    expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('rgba(0,0,0,0.5)')).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
    expect(parseColor('rgb(10 20 30 / 50%)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
  });

  it('clamps channels and alpha', () => {
    expect(parseColor('rgb(300, -1, 0, 2)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('reads hsl() and hsla()', () => {
    const p = parseColor('hsl(120, 100%, 50%)')!;
    expect(round(p)).toEqual({ r: 0, g: 255, b: 0 });
    expect(parseColor('hsla(0, 100%, 50%, 0.25)')!.a).toBe(0.25);
  });

  it('reads oklch() with L as a percent or a fraction', () => {
    const a = parseColor('oklch(62.8% 0.2577 29.23)')!;
    const b = parseColor('oklch(0.628 0.2577 29.23)')!;
    expect(round(a)).toEqual({ r: 255, g: 0, b: 0 });
    expect(round(b)).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor('oklch(50% 0.1 200 / 0.5)')!.a).toBe(0.5);
  });

  it('returns null for named colors, empty strings and malformed input', () => {
    expect(parseColor('tomato')).toBeNull();
    expect(parseColor('')).toBeNull();
    expect(parseColor('rgb(1, 2)')).toBeNull();
    expect(parseColor('hsl(a, b, c)')).toBeNull();
  });
});

describe('resolveCssColor', () => {
  it('uses the parser first', () => {
    expect(resolveCssColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('returns null for an empty string', () => {
    expect(resolveCssColor('  ')).toBeNull();
  });
});

describe('buildParsed', () => {
  it('builds every format from one HSV tuple', () => {
    const p = buildParsed(0, 1, 1, 1);
    expect(p).toMatchObject({
      h: 0,
      s: 1,
      v: 1,
      a: 1,
      r: 255,
      g: 0,
      b: 0,
      hex: '#ff0000',
      rgb: 'rgb(255, 0, 0)',
      hsl: 'hsl(0, 100%, 50%)',
      oklch: 'oklch(62.8% 0.258 29.2)',
    });
  });

  it('prints alpha (up to 3 decimals) only below 1', () => {
    const p = buildParsed(0, 1, 1, 0.12345);
    expect(p.hex).toBe('#ff00001f');
    expect(p.rgb).toBe('rgba(255, 0, 0, 0.123)');
    expect(p.hsl).toBe('hsla(0, 100%, 50%, 0.123)');
    expect(p.oklch).toBe('oklch(62.8% 0.258 29.2 / 0.123)');
  });

  it('formatValueByFormat picks the string of the format', () => {
    const p = buildParsed(120, 1, 1, 1);
    expect(formatValueByFormat(p, 'hex')).toBe('#00ff00');
    expect(formatValueByFormat(p, 'rgb')).toBe('rgb(0, 255, 0)');
    expect(formatValueByFormat(p, 'hsl')).toBe('hsl(120, 100%, 50%)');
    expect(formatValueByFormat(p, 'oklch')).toBe(p.oklch);
  });
});

describe('applyChannelEdit', () => {
  const green: HsvaState = { h: 120, s: 1, v: 1, a: 1 };

  it('rebuilds the color from an RGB channel and clears the sticky OKLCH hue', () => {
    const next = applyChannelEdit(green, 42, 'r', '255');
    expect(next.oklchHue).toBeNull();
    expect(next.hsv).toMatchObject({ h: 60, s: 1, v: 1 });
  });

  it('keeps the held hue when an RGB edit lands on a gray', () => {
    const gray: HsvaState = { h: 200, s: 0, v: 0.5, a: 1 };
    const next = applyChannelEdit(gray, null, 'g', '128');
    expect(next.hsv.h).toBe(200);
  });

  it('turns a typed HSL hue on a gray into the held HSV hue', () => {
    const gray: HsvaState = { h: 0, s: 0, v: 0.5, a: 1 };
    const next = applyChannelEdit(gray, 30, 'hSL', '210');
    expect(next.hsv.h).toBe(210);
    expect(next.oklchHue).toBeNull();
  });

  it('keeps the sticky OKLCH hue on HSL saturation and lightness edits', () => {
    const next = applyChannelEdit(green, 42, 'lSL', '40');
    expect(next.oklchHue).toBe(42);
  });

  it('makes any OKLCH edit hold its hue, even at zero chroma', () => {
    const toGray = applyChannelEdit(green, null, 'C', '0');
    const heldHue = toGray.oklchHue!;
    expect(heldHue).toBeCloseTo(rgbToOklch(0, 255, 0).H, 5);
    expect(toGray.hsv.s).toBeCloseTo(0, 2);
    // Back up from gray: the color returns to the hue it held.
    const state = { ...green, ...toGray.hsv } as HsvaState;
    const back = applyChannelEdit(state, heldHue, 'C', '0.2');
    const p = buildParsed(back.hsv.h ?? state.h, back.hsv.s ?? state.s, back.hsv.v ?? state.v, 1);
    expect(rgbToOklch(p.r, p.g, p.b).H).toBeCloseTo(heldHue, 0);
  });

  it('sets alpha from a percent, clamped', () => {
    expect(applyChannelEdit(green, null, 'alphaPercent', '50').hsv).toEqual({ a: 0.5 });
    expect(applyChannelEdit(green, null, 'alphaPercent', '150').hsv).toEqual({ a: 1 });
  });
});

describe('initialHsva / hsvaFromRgba', () => {
  it('starts an unparseable first value at pure red', () => {
    expect(initialHsva('nope')).toEqual({ h: 0, s: 1, v: 1, a: 1 });
    expect(initialHsva('#808080').h).toBe(0);
  });

  it('keeps the held hue for a gray, white or black', () => {
    expect(hsvaFromRgba({ r: 255, g: 255, b: 255, a: 1 }, 77).h).toBe(77);
    expect(hsvaFromRgba({ r: 0, g: 0, b: 255, a: 0.5 }, 77)).toEqual({ h: 240, s: 1, v: 1, a: 0.5 });
  });
});
