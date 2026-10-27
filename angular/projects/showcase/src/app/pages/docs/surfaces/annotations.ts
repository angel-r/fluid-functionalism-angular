// ---------------------------------------------------------------------------
// The annotation language of /docs/surfaces: a label chip plus a curved arrow,
// drawn in the preview's own coordinate space. Ported from the helpers at the
// top of app/docs/surfaces/page.tsx, shared by the problem and the solution
// demos.
// ---------------------------------------------------------------------------

export const ANNOTATION_BLUE = '#6B97FF';
// Red marks the collapse: the dialog and the dropdown share one surface, so
// their callouts go red to flag the problem. The page background stays blue
// (it's just orienting context, not part of the bug).
export const ANNOTATION_RED = '#FF6B6B';

/** Hand-tuned arrow transforms per annotation. x/y translate the arrow,
 *  rotation pivots it around its midpoint, curve sets the bow, and labelX/labelY
 *  nudge the label. */
export interface ArrowDial {
  x: number;
  y: number;
  rotation: number;
  curve: number;
  labelX: number;
  labelY: number;
}

export interface Point {
  x: number;
  y: number;
}

// Compose a quadratic-Bézier path from base anchors + live dial values.
// rotation pivots the chord around its midpoint, x/y translate the whole arrow,
// and curve sets the perpendicular bow of the control point.
export function buildArrowPath(start: Point, end: Point, dial: ArrowDial): string {
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  const a = (dial.rotation * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const place = (px: number, py: number) => ({
    x: mx + (px - mx) * cos - (py - my) * sin + dial.x,
    y: my + (px - mx) * sin + (py - my) * cos + dial.y,
  });
  const s = place(start.x, start.y);
  const e = place(end.x, end.y);
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const cx = (s.x + e.x) / 2 + nx * dial.curve;
  const cy = (s.y + e.y) / 2 + ny * dial.curve;
  const f = (n: number) => Math.round(n * 10) / 10;
  return `M${f(s.x)},${f(s.y)} Q${f(cx)},${f(cy)} ${f(e.x)},${f(e.y)}`;
}

/** "rgb(r, g, b)" → "#RRGGBB" */
export function rgbToHex(rgb: string): string {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return rgb;
  return (
    '#' +
    m
      .slice(0, 3)
      .map((n) => Number(n).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}
