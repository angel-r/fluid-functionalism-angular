// ---------------------------------------------------------------------------
// Pure geometry and snapping shared by both slider engines, plus the small
// DOM helpers they use to paint motion-driven styles.
// ---------------------------------------------------------------------------

/** A single value, or `[start, end]` for range mode. */
export type SliderValue = number | [number, number];
/** Where the compact engine shows its value. */
export type ValuePosition = 'left' | 'right' | 'top' | 'bottom' | 'tooltip';
/** Default-step layout. */
export type SliderVariant = 'pips' | 'scrubber';
/** A React-style inline style map: camelCase or dash-case keys; numbers get
 *  `px` unless the property is unitless (`opacity`, `zIndex`, ...). */
export type SliderStyle = Record<string, string | number | null | undefined>;

// The thumb's layout box. Travel is the track width minus this, so the thumb
// never overhangs either end; the visible knob is THUMB_SIZE_REST inside it.
export const THUMB_SIZE = 20;
export const THUMB_SIZE_REST = 16;
// 2px shorter than the thumb box, so the 16px knob fits inside the pill with
// 1px to spare above and below.
export const TRACK_BG_HEIGHT = 18;
// Step dots grow 1.25x (4px → 5px) while the slider is hovered.
export const DOT_SIZE = 4;
export const PIP_SIZE = 5;
// Inset track BG so its rounded-end centers align with thumb centers at min/max
export const TRACK_INSET = (THUMB_SIZE - TRACK_BG_HEIGHT) / 2;

/** The caption bubble every slider tooltip draws. */
export const TOOLTIP_TEXT_CLASS =
  'text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] text-background tabular-nums whitespace-nowrap bg-foreground px-2 py-1';

/** The 40% accent the hover preview bar paints. */
export const HOVER_PREVIEW_BG = 'color-mix(in srgb, var(--color-accent) 40%, transparent)';

/** What a click at the hovered spot would change, in track px. */
export interface HoverPreview {
  left: number;
  width: number;
  snappedValue: number;
  /** The snapped value's x, not the raw cursor: the tooltip's anchor. */
  cursorX: number;
}

// Value → the thumb's left offset in layout px. Thumb centers land
// THUMB_SIZE / 2 in from each end, the same inset the pill's end caps, step
// dots and hover bar measure from.
export function valueToPixel(v: number, min: number, max: number, trackWidth: number): number {
  if (max === min) return 0;
  const usable = trackWidth - THUMB_SIZE;
  return ((v - min) / (max - min)) * usable;
}

// Strict `<`: a value exactly halfway between two entries snaps to the lower.
export function nearestStepIndex(v: number, steps: number[]): number {
  let idx = 0;
  for (let i = 1; i < steps.length; i++) {
    if (Math.abs(steps[i] - v) < Math.abs(steps[idx] - v)) idx = i;
  }
  return idx;
}

// Inverse of valueToPixel with snapping built in: the nearest `steps` entry,
// or the step grid clamped to min/max. Press, drag and release all go
// pixel → snapped value → pixel through here, so a thumb at rest always sits
// on a value the slider can emit.
export function pixelToValue(
  px: number,
  min: number,
  max: number,
  step: number,
  trackWidth: number,
  stepValues: number[] | null = null,
): number {
  const usable = trackWidth - THUMB_SIZE;
  if (usable <= 0) return min;
  const raw = (px / usable) * (max - min) + min;
  if (stepValues) return stepValues[nearestStepIndex(raw, stepValues)];
  const snapped = Math.round((raw - min) / step) * step + min;
  return Math.max(min, Math.min(max, snapped));
}

// The per-thumb math takes arrays; a single value becomes a one-entry array.
export function toValueArray(value: SliderValue): number[] {
  return Array.isArray(value) ? value : [value];
}

/** Sorted, deduped list of allowed values; `null` when fewer than two entries
 *  (a single entry can't span a track, so min/max/step take over). */
export function parseStepValues(steps: readonly number[] | null | undefined): number[] | null {
  if (!steps || steps.length === 0) return null;
  const parsed = Array.from(new Set(steps.map(Number))).sort((a, b) => a - b);
  return parsed.length > 1 ? parsed : null;
}

// ---------------------------------------------------------------------------
// Keyboard (the ARIA slider pattern the hidden thumbs implement)
// ---------------------------------------------------------------------------

function decimalCount(value: number): number {
  return (String(value).split('.')[1] ?? '').length;
}

/**
 * The value a key press moves to, or `null` when the key is not a slider key.
 * Arrows move one step, Shift+arrow and PageUp/PageDown ten, Home/End jump to
 * the ends; the result lands on the step grid at the step's precision.
 */
export function keyboardTarget(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey'>,
  value: number,
  min: number,
  max: number,
  step: number,
): number | null {
  const big = step * 10;
  let next: number;
  switch (event.key) {
    case 'Home':
      return min;
    case 'End':
      return max;
    case 'ArrowRight':
    case 'ArrowUp':
      next = value + (event.shiftKey ? big : step);
      break;
    case 'ArrowLeft':
    case 'ArrowDown':
      next = value - (event.shiftKey ? big : step);
      break;
    case 'PageUp':
      next = value + big;
      break;
    case 'PageDown':
      next = value - big;
      break;
    default:
      return null;
  }
  const snapped = Math.round((next - min) / step) * step + min;
  const precision = Math.max(decimalCount(step), decimalCount(min));
  return Number(Math.max(min, Math.min(max, snapped)).toFixed(precision));
}

// ---------------------------------------------------------------------------
// Hidden primitive geometry (Radix Slider)
// ---------------------------------------------------------------------------

function radixPercent(value: number, min: number, max: number): number {
  const span = max - min;
  return span === 0 ? 0 : Math.max(0, Math.min(100, (100 / span) * (value - min)));
}

/** The thumb wrapper's `left`, as Radix Slider writes it: the value's percent
 *  plus an offset that keeps a `width`-wide thumb inside the track (none
 *  while the thumb has no size). */
export function radixThumbLeft(value: number, min: number, max: number, width: number): string {
  const percent = radixPercent(value, min, max);
  const half = width / 2;
  const offset = width ? half - (half / 50) * percent : 0;
  return `calc(${percent}% + ${offset}px)`;
}

/** The hidden range span's `left` / `right` insets, as Radix Slider writes them. */
export function radixRangeInsets(values: readonly number[], min: number, max: number): { left: string; right: string } {
  const percents = values.map((v) => radixPercent(v, min, max));
  const start = values.length > 1 ? Math.min(...percents) : 0;
  return { left: `${start}%`, right: `${100 - Math.max(...percents)}%` };
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

const UNITLESS = new Set(['opacity', 'zIndex', 'z-index', 'flex', 'flexGrow', 'flex-grow', 'flexShrink', 'flex-shrink', 'fontWeight', 'font-weight', 'lineHeight', 'line-height', 'order', 'scale']);

/** React-style style map → Angular `[style]` map (numbers become `px`). */
export function toStyleMap(style: SliderStyle | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!style) return out;
  for (const [key, value] of Object.entries(style)) {
    if (value === null || value === undefined) continue;
    const name = key.startsWith('--') || key.includes('-') ? key : key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    out[name] = typeof value === 'number' && value !== 0 && !UNITLESS.has(key) ? `${value}px` : String(value);
  }
  return out;
}

/** Writes a style map straight onto an element (dash-case keys). */
export function applyStyles(el: HTMLElement, styles: Record<string, string | number>) {
  for (const [key, value] of Object.entries(toStyleMap(styles))) el.style.setProperty(key, value);
}
