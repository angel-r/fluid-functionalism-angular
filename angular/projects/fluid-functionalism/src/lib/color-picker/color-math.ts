// ---------------------------------------------------------------------------
// Color math (no deps). The picker holds one color as HSV + alpha and derives
// every format from it. HSV is the saturation square's own coordinate system,
// and keeping H in state lets the hue survive a pass through gray or black,
// where RGB has no hue to give back.
// ---------------------------------------------------------------------------

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Rgba extends Rgb {
  a: number;
}

export interface ParsedColor {
  // HSV (canonical, 0..360 / 0..1 / 0..1)
  h: number;
  s: number;
  v: number;
  a: number;
  // sRGB 0..255
  r: number;
  g: number;
  b: number;
  // Formatted strings
  hex: string;
  rgb: string;
  hsl: string;
  oklch: string;
}

/** The panel's canonical state. */
export interface HsvaState {
  h: number;
  s: number;
  v: number;
  a: number;
}

export const FORMAT_LABELS: Record<ColorFormat, string> = {
  hex: 'HEX',
  rgb: 'RGB',
  hsl: 'HSL',
  oklch: 'OKLCH',
};

export const FORMATS = ['hex', 'rgb', 'hsl', 'oklch'] as const;

export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function clamp255(n: number) {
  return Math.max(0, Math.min(255, n));
}

// Hue is wrapped into 0..360 first, so 360 and negative angles are valid
// input. Output channels are unrounded 0..255 floats; rounding happens only
// when a string or display value is built.
export function hsvToRgb(h: number, s: number, v: number): Rgb {
  const c = v * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

// A color with no chroma (gray, white, black) returns h = 0 and s = 0: RGB
// has no hue to give back. Callers check `s === 0` and substitute a hue of
// their own (usually the current state hue), which is how H survives S=0 / V=0.
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, v };
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0,
    s = 0;
  if (d > 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hh < 1) [r, g] = [c, x];
  else if (hh < 2) [r, g] = [x, c];
  else if (hh < 3) [g, b] = [c, x];
  else if (hh < 4) [g, b] = [x, c];
  else if (hh < 5) [r, b] = [x, c];
  else [r, b] = [c, x];
  const m = l - c / 2;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

// sRGB transfer curve. OKLab is defined on linear light, so channels are
// decoded before the matrices and re-encoded after; linearToSrgb clamps to
// 0..1, which is where out-of-gamut OKLCH values get clipped.
function srgbToLinear(c: number): number {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return clamp01(v) * 255;
}

// Björn Ottosson's OKLab matrices: linear sRGB → LMS → cube root → Lab, and
// its inverse below.
function linearRgbToOklab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklabToLinearRgb(L: number, a: number, b: number): Rgb {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

// Polar form of OKLab. When C is near 0 the atan2 angle is noise, and the
// 0..255 rounding between edits nudges it too, so the panel keeps a sticky
// OKLCH hue rather than trusting this H after every round-trip.
export function rgbToOklch(r: number, g: number, b: number): { L: number; C: number; H: number } {
  const lab = linearRgbToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
  const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let H = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L: lab.L, C, H };
}

// Out-of-gamut input clips per channel instead of reducing chroma: a chroma
// past the sRGB edge lands on the nearest displayable channel values, and the
// field then shows the chroma of that clipped color.
export function oklchToRgb(L: number, C: number, H: number): Rgb {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const lin = oklabToLinearRgb(L, a, b);
  return {
    r: clamp255(linearToSrgb(lin.r)),
    g: clamp255(linearToSrgb(lin.g)),
    b: clamp255(linearToSrgb(lin.b)),
  };
}

function to2hex(n: number): string {
  return Math.round(clamp255(n)).toString(16).padStart(2, '0');
}

// Alpha is appended only below 1, so opaque colors stay 6-digit. This is
// also the normalizer swatch matching compares against.
export function rgbToHexStr(r: number, g: number, b: number, a: number): string {
  if (a >= 1) return `#${to2hex(r)}${to2hex(g)}${to2hex(b)}`;
  return `#${to2hex(r)}${to2hex(g)}${to2hex(b)}${to2hex(a * 255)}`;
}

function expandShortHex(h: string): string {
  return h
    .split('')
    .map((c) => c + c)
    .join('');
}

// 3, 4, 6 or 8 digits, "#" optional. 5 and 7 digits pass the regex but fall
// through to null.
export function parseHex(input: string): Rgba | null {
  const m = input.trim().match(/^#?([0-9a-fA-F]{3,8})$/);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3 || h.length === 4) h = expandShortHex(h);
  if (h.length !== 6 && h.length !== 8) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  };
}

const fraction = (part: string) => (part.endsWith('%') ? parseFloat(part) / 100 : parseFloat(part));

function splitParts(body: string) {
  return body.split(/[\s,/]+/).filter(Boolean);
}

// Reads the four formats the panel emits: hex, rgb()/rgba(), hsl()/hsla(),
// oklch(). Commas, spaces and "/" all separate parts, and alpha takes 0..1 or
// a percentage. Pure string work with no DOM, so it is safe anywhere; named
// colors go through resolveCssColor instead.
export function parseColor(input: string): Rgba | null {
  const s = input.trim();
  if (!s) return null;
  if (s.startsWith('#') || /^[0-9a-fA-F]{3,8}$/.test(s)) return parseHex(s);

  const rgbM = s.match(/^rgba?\(\s*([^)]+)\)$/i);
  if (rgbM) {
    const parts = splitParts(rgbM[1]);
    if (parts.length < 3) return null;
    const [r, g, b] = parts.map((p) => parseFloat(p));
    const a = parts[3] !== undefined ? fraction(parts[3]) : 1;
    if ([r, g, b, a].some(Number.isNaN)) return null;
    return { r: clamp255(r), g: clamp255(g), b: clamp255(b), a: clamp01(a) };
  }

  const hslM = s.match(/^hsla?\(\s*([^)]+)\)$/i);
  if (hslM) {
    const parts = splitParts(hslM[1]);
    if (parts.length < 3) return null;
    const h = parseFloat(parts[0]);
    const sat = fraction(parts[1]);
    const l = fraction(parts[2]);
    const a = parts[3] !== undefined ? fraction(parts[3]) : 1;
    if ([h, sat, l, a].some(Number.isNaN)) return null;
    const rgb = hslToRgb(h, clamp01(sat), clamp01(l));
    return { r: clamp255(rgb.r), g: clamp255(rgb.g), b: clamp255(rgb.b), a: clamp01(a) };
  }

  const oklchM = s.match(/^oklch\(\s*([^)]+)\)$/i);
  if (oklchM) {
    const parts = splitParts(oklchM[1]);
    if (parts.length < 3) return null;
    const L = fraction(parts[0]);
    const C = parseFloat(parts[1]);
    const H = parseFloat(parts[2]);
    const a = parts[3] !== undefined ? fraction(parts[3]) : 1;
    if ([L, C, H, a].some(Number.isNaN)) return null;
    const rgb = oklchToRgb(clamp01(L), Math.max(0, C), H);
    return { r: clamp255(rgb.r), g: clamp255(rgb.g), b: clamp255(rgb.b), a: clamp01(a) };
  }
  return null;
}

// Browser-assisted fallback for color strings the manual parser doesn't cover
// (named CSS colors like "red" / "tomato", etc.). A canvas 2d context
// round-trips any valid CSS color through `fillStyle`, which serializes to a
// hex or rgba() string that parseColor understands. Returns null without a
// DOM (server rendering) or a canvas (jsdom without the canvas package).
let cssColorCtx: CanvasRenderingContext2D | null = null;

export function resolveCssColor(input: string): Rgba | null {
  const direct = parseColor(input);
  if (direct) return direct;
  const s = input.trim();
  // A "#" string the hex parser rejected is no valid CSS color either.
  if (!s || s.startsWith('#') || typeof document === 'undefined') return null;
  if (!cssColorCtx) {
    try {
      cssColorCtx = document.createElement('canvas').getContext('2d');
    } catch {
      cssColorCtx = null;
    }
    if (!cssColorCtx) return null;
  }
  const ctx = cssColorCtx;
  // An invalid color assignment leaves fillStyle untouched, so round-trip from
  // two different starting values to detect rejection.
  ctx.fillStyle = '#000000';
  ctx.fillStyle = s;
  const first = String(ctx.fillStyle);
  ctx.fillStyle = '#ffffff';
  ctx.fillStyle = s;
  const second = String(ctx.fillStyle);
  if (first !== second) return null;
  return parseColor(first);
}

const alphaText = (a: number) => Number(a.toFixed(3));

// Every format string is built from the one HSV tuple, so all fields of a
// ParsedColor describe the same color. Precision is per format: RGB and HSL
// round to integers, OKLCH prints L% to 1 decimal, C to 3, H to 1. Alpha
// prints (up to 3 decimals) only below 1.
export function buildParsed(h: number, s: number, v: number, a: number): ParsedColor {
  const { r, g, b } = hsvToRgb(h, s, v);
  const hsl = rgbToHsl(r, g, b);
  const oklch = rgbToOklch(r, g, b);
  const hex = rgbToHexStr(r, g, b, a);
  const [R, G, B] = [Math.round(r), Math.round(g), Math.round(b)];
  const hslBody = `${Math.round(hsl.h)}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%`;
  const oklchBody = `${(oklch.L * 100).toFixed(1)}% ${oklch.C.toFixed(3)} ${oklch.H.toFixed(1)}`;
  const opaque = a >= 1;
  return {
    h,
    s,
    v,
    a,
    r: R,
    g: G,
    b: B,
    hex,
    rgb: opaque ? `rgb(${R}, ${G}, ${B})` : `rgba(${R}, ${G}, ${B}, ${alphaText(a)})`,
    hsl: opaque ? `hsl(${hslBody})` : `hsla(${hslBody}, ${alphaText(a)})`,
    oklch: opaque ? `oklch(${oklchBody})` : `oklch(${oklchBody} / ${alphaText(a)})`,
  };
}

export function formatValueByFormat(parsed: ParsedColor, fmt: ColorFormat): string {
  return parsed[fmt];
}

/** The initial HSV state for a value; an unparseable one starts at pure red. */
export function initialHsva(value: string): HsvaState {
  const p = parseColor(value);
  if (!p) return { h: 0, s: 1, v: 1, a: 1 };
  const hsv = rgbToHsv(p.r, p.g, p.b);
  return { h: hsv.s === 0 ? 0 : hsv.h, s: hsv.s, v: hsv.v, a: p.a };
}

/** A parsed whole color merged into state: a gray, white or black keeps the
 *  hue already held. */
export function hsvaFromRgba(p: Rgba, heldHue: number): HsvaState {
  const hsv = rgbToHsv(p.r, p.g, p.b);
  return { h: hsv.s === 0 ? heldHue : hsv.h, s: hsv.s, v: hsv.v, a: p.a };
}

export type ChannelKey = 'r' | 'g' | 'b' | 'hSL' | 'sSL' | 'lSL' | 'L' | 'C' | 'H' | 'alphaPercent';

export interface ChannelEdit {
  /** The HSV fields to merge into state. */
  hsv: Partial<HsvaState>;
  /** The sticky OKLCH hue after the edit. */
  oklchHue: number | null;
}

/**
 * A numeric channel field edit. RGB, HSL and OKLCH edits rebuild the color in
 * their own space from the current rounded RGB, convert back to HSV, and
 * substitute a held hue whenever the result has no saturation.
 *
 * The sticky OKLCH hue preserves the user's stated OKLCH H across the lossy
 * RGB round-trip and across achromatic colors. It is cleared when the hue
 * moves through another channel (RGB, HSL hue); HSL S/L and alpha keep it;
 * any OKLCH edit sets it.
 */
export function applyChannelEdit(
  state: HsvaState,
  oklchHue: number | null,
  channel: ChannelKey,
  value: string,
): ChannelEdit {
  const p = buildParsed(state.h, state.s, state.v, state.a);
  switch (channel) {
    case 'r':
    case 'g':
    case 'b': {
      const r = channel === 'r' ? Number(value) : p.r;
      const g = channel === 'g' ? Number(value) : p.g;
      const b = channel === 'b' ? Number(value) : p.b;
      const hsv = rgbToHsv(r, g, b);
      return { hsv: { h: hsv.s === 0 ? state.h : hsv.h, s: hsv.s, v: hsv.v }, oklchHue: null };
    }
    case 'hSL':
    case 'sSL':
    case 'lSL': {
      const hsl = rgbToHsl(p.r, p.g, p.b);
      const h2 = channel === 'hSL' ? Number(value) : hsl.h;
      const s2 = channel === 'sSL' ? Number(value) / 100 : hsl.s;
      const l2 = channel === 'lSL' ? Number(value) / 100 : hsl.l;
      const rgb = hslToRgb(h2, clamp01(s2), clamp01(l2));
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      // On a gray, a typed HSL hue still becomes the held HSV hue, so the
      // square and hue rail pick it up. S/L edits read the hue back from
      // rounded RGB instead, which is 0 on a gray.
      return {
        hsv: { h: hsv.s === 0 ? h2 : hsv.h, s: hsv.s, v: hsv.v },
        oklchHue: channel === 'hSL' ? null : oklchHue,
      };
    }
    case 'L':
    case 'C':
    case 'H': {
      const cur = rgbToOklch(p.r, p.g, p.b);
      // For L/C edits, anchor on the user's last stated H so we don't drift
      // along with chroma changes.
      const baseH = oklchHue ?? cur.H;
      const L = channel === 'L' ? Number(value) / 100 : cur.L;
      const C = channel === 'C' ? Number(value) : cur.C;
      const H = channel === 'H' ? Number(value) : baseH;
      const rgb = oklchToRgb(clamp01(L), Math.max(0, C), H);
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      return { hsv: { h: hsv.s === 0 ? state.h : hsv.h, s: hsv.s, v: hsv.v }, oklchHue: H };
    }
    case 'alphaPercent':
      return { hsv: { a: clamp01(Number(value) / 100) }, oklchHue };
  }
}
