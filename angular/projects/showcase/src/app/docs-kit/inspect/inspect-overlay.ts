import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  TemplateRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  Tooltip,
  enterTransition,
  exitTransition,
  exitFallbackMs,
  fontWeights,
  injectAnimateFluid,
  injectSizeContext,
  spring,
  type FluidAnimation,
} from '@angel-r/fluid-functionalism-angular';
import type { DOMKeyframesDefinition } from 'motion';

// ---------------------------------------------------------------------------
// Inspect overlay — a design-inspector layer for ComponentPreview. It sits
// over the whole preview *frame*: pixel rulers run along the top (above the
// Preview/Code + Inspect toggles) and left, fitting the frame's outer border.
// On hover it measures the deepest element under the cursor — crosshair guide
// lines at its box edges, a green box-model overlay (padding + flex/grid gaps),
// and an FF tooltip with the tag, selector, display, size, padding, and margin.
// Controls measure whole: hovering a button's label or icon row reads the
// button (its padding, its gap), with the label lending its type metrics.
// Only the content region captures the pointer, so the toggles stay clickable
// and the component underneath is frozen while you inspect it. Portalled
// menus/listboxes the demo holds open are inspectable like any in-frame
// element wherever they overlap the content region.
//
// Render it as a child of the preview frame, a sibling of the frame's header
// and content (the frame must be `relative`), exactly where the reference
// mounts it: the two layers are `absolute inset-0` and take the frame's
// padding box as their coordinate space.
// ---------------------------------------------------------------------------

const BLUE = '#6B97FF'; // --focus-ring "clarity" blue
const GREEN = 'rgba(153, 255, 201, 0.35)'; // #99FFC9, subtle
const GREEN_LINE = 'rgba(83, 214, 145, 0.9)';
// Near-black green for the strip labels — the mint fill reads as pale mint in
// light mode but a medium sea-green over dark surfaces, so a dark label keeps
// contrast in both.
const CONTENT_FILL = 'rgba(120, 132, 232, 0.20)';
const BAND = 'rgba(107, 151, 255, 0.16)';

/** Space reserved at the top/left of the frame for the rulers. */
export const RULER_TOP = 18;
export const RULER_LEFT = 22;

const STEP = 8;
const LABEL_STEP = 32;

export interface Strip {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
}

/** Raw, unformatted measurements of the inspected element — for consumers
 *  that render their own tooltip (e.g. the token readout on /docs/sizes). */
export interface InspectRaw {
  width: number;
  height: number;
  pt: number;
  pr: number;
  pb: number;
  pl: number;
  gap: number;
  /** Set only when the element directly wraps text. */
  fontSize: number | null;
}

/** The context a custom readout template receives: `let-raw` in the template. */
export interface InspectReadoutContext {
  $implicit: InspectRaw;
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Tick {
  pos: number;
  value: number;
  inComp: boolean;
  labeled: boolean;
}

interface Target {
  left: number;
  top: number;
  width: number;
  height: number;
  content: Box;
  padStrips: Strip[];
  gapStrips: Strip[];
  /** Headline: the data-slot name when present (e.g. "card-header"), else the
   *  raw tag (e.g. "SPAN"). */
  anchor: string;
  meta: string;
  padding: string;
  margin: string;
  gap: string | null;
  /** Type metrics — only set when the element directly wraps text. */
  font: {
    size: string; // "14px / 20px" (font-size / line-height)
    family: string; // first family name, e.g. "Inter"
    weight: string; // variable axes ("wght 550 · opsz 20") or CSS weight
    tracking: string; // letter-spacing
    color: string; // resolved text color as hex
  } | null;
  raw: InspectRaw;
}

/** Convert a computed `rgb()/rgba()` color to a #rrggbb hex string. */
function rgbToHex(rgb: string): string {
  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(rgb);
  if (!m) return rgb;
  const hex = (n: string) => Math.round(parseFloat(n)).toString(16).padStart(2, '0');
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}

/** Collapse a T R B L set into the shortest CSS shorthand. */
function boxShorthand(t: number, r: number, b: number, l: number): string {
  const R = Math.round;
  if (t === r && r === b && b === l) return `${R(t)}px`;
  if (t === b && l === r) return `${R(t)}px ${R(r)}px`;
  return `${R(t)}px ${R(r)}px ${R(b)}px ${R(l)}px`;
}

/** Whether the element directly wraps text (a title, label, paragraph). */
function wrapsText(el: Element): boolean {
  return Array.from(el.childNodes).some(
    (n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 0,
  );
}

// Interactive controls are measured whole. Hovering an anonymous inner part —
// a label span, the icon row, the painted background layer — snaps to the
// control, so a button reads as its own box rather than as the SPAN under
// the cursor. Parts that are designed boxes in their own right stay
// inspectable: replaced content (an icon's 16px), named slots, and anything
// that paints a border, background, or padding (a shortcut cap in a row).
const CONTROL_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  'summary',
  ...[
    'button',
    'link',
    'tab',
    'option',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'checkbox',
    'radio',
    'switch',
    'combobox',
    'slider',
    'searchbox',
    'textbox',
    'spinbutton',
    'treeitem',
  ].map((role) => `[role="${role}"]`),
].join(',');

const REPLACED = new Set(['svg', 'img', 'video', 'canvas', 'picture', 'iframe']);

function isControl(el: Element): boolean {
  return el.matches(CONTROL_SELECTOR);
}

function isDesignedPart(el: Element): boolean {
  if (REPLACED.has(el.tagName.toLowerCase())) return true;
  // Decorative layers (a button's inset background) belong to the control.
  if (el.getAttribute('aria-hidden') === 'true') return false;
  if (el.hasAttribute('data-slot')) return true;
  const cs = getComputedStyle(el);
  const px = (v: string) => parseFloat(v) || 0;
  if (px(cs.paddingTop) + px(cs.paddingRight) + px(cs.paddingBottom) + px(cs.paddingLeft) > 0) return true;
  if (px(cs.borderTopWidth) + px(cs.borderRightWidth) + px(cs.borderBottomWidth) + px(cs.borderLeftWidth) > 0) return true;
  if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') return true;
  return cs.backgroundImage !== 'none';
}

/** The element to measure for a hit: the hit itself, or the control it is an
 *  anonymous part of. The climb never leaves the preview (`root`) and stops
 *  at a designed part on the way, which keeps a padded inner box its own. */
function snapToControl(hit: HTMLElement, root: Element): HTMLElement {
  // An icon is one designed unit: a hit on one of its paths measures the
  // outermost <svg> (the 16px the size ladder speaks of), not the path.
  let svg = (hit as unknown as SVGElement).ownerSVGElement;
  while (svg?.ownerSVGElement) svg = svg.ownerSVGElement;
  if (svg) hit = svg as unknown as HTMLElement;
  if (isControl(hit) || isDesignedPart(hit)) return hit;
  for (let n = hit.parentElement; n && n !== root && n !== document.body; n = n.parentElement) {
    if (isControl(n)) return n;
    if (isDesignedPart(n)) return hit;
  }
  return hit;
}

@Component({
  selector: 'app-inspect-overlay',
  imports: [NgTemplateOutlet, Tooltip],
  templateUrl: './inspect-overlay.html',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectOverlay {
  /** The preview content element the overlay tracks (ComponentPreview's
   *  `previewRef`): the region that captures the pointer and whose first child
   *  anchors the rulers' 0,0. */
  readonly frame = input.required<HTMLElement>();
  /** Toggled by the preview's Inspect switch. Off removes both layers, the
   *  pointer listener and the observers. */
  readonly active = input(false);
  /** Draw the top/left pixel rulers. Off for full-bleed previews, where the
   *  demo reaches the frame edges and the rulers would draw over (or be
   *  masked by) its chrome — the crosshair, box model, and tooltip remain. */
  readonly rulers = input(true);
  /** Replaces the default tag/box/font tooltip with custom content built from
   *  the raw measurements — e.g. the token readout on /docs/sizes.
   *  `let-raw` is an `InspectRaw`. */
  readonly tooltip = input<TemplateRef<InspectReadoutContext> | null>(null);

  private readonly document = inject(DOCUMENT);
  private readonly animate = injectAnimateFluid();
  private readonly sizeVariant = injectSizeContext().size;

  protected readonly blue = BLUE;
  protected readonly green = GREEN;
  protected readonly greenLine = GREEN_LINE;
  protected readonly contentFill = CONTENT_FILL;
  protected readonly bandFill = BAND;
  protected readonly rulerTop = RULER_TOP;
  protected readonly rulerLeft = RULER_LEFT;
  protected readonly fontWeights = fontWeights;

  private readonly rulerLayer = viewChild<ElementRef<HTMLElement>>('rulerLayer');
  private readonly topRuler = viewChild<ElementRef<HTMLElement>>('topRuler');
  private readonly leftRuler = viewChild<ElementRef<HTMLElement>>('leftRuler');
  private readonly crosshairLayer = viewChild<ElementRef<HTMLElement>>('crosshairLayer');
  protected readonly readoutTemplate = viewChild('tooltipReadout', { read: TemplateRef });

  protected readonly size = signal<{ w: number; h: number }>({ w: 0, h: 0 });
  /** Where the content region sits inside the frame: the only pointer target. */
  protected readonly capture = signal<Box | null>(null);
  /** The rendered component, which anchors the rulers' 0,0. */
  private readonly comp = signal<Box | null>(null);
  protected readonly target = signal<Target | null>(null);
  private readonly shown = signal(false);
  /** Whether the two layers are in the DOM (they stay for the exit fade). */
  protected readonly visible = this.shown.asReadonly();

  private outer: HTMLElement | null = null;
  private rafId = 0;
  private lastEl: HTMLElement | null = null;
  private lastPart: HTMLElement | null = null;
  private lastPos: { x: number; y: number } | null = null;
  private targetRo: ResizeObserver | null = null;
  private animations: FluidAnimation[] = [];
  private exitTimer: ReturnType<typeof setTimeout> | undefined;
  /** Layers whose enter animation already ran: a re-render of the same
   *  element must not replay it from its first keyframe. */
  private readonly animatedLayers = new WeakSet<Element>();

  constructor() {
    // Presence: `active` mounts the layers; turning it off fades them out and
    // only then unmounts (React's AnimatePresence around the overlay).
    effect(() => {
      const active = this.active();
      untracked(() => (active ? this.show() : this.hide()));
    });

    // Frame geometry: interior size for the ruler span, where the content
    // region sits (so only that region captures the pointer), and where the
    // rendered component's 0,0 is. Observed while active, torn down the moment
    // it is not.
    afterRenderEffect((onCleanup) => {
      const active = this.active();
      const visible = this.visible();
      const content = this.frame();
      const outer = active && visible ? this.resolveOuter(content) : null;
      if (!active || !outer) return;
      untracked(() => {
        this.outer = outer;
        const measure = () => {
          const fRect = outer.getBoundingClientRect();
          const iLeft = fRect.left + outer.clientLeft;
          const iTop = fRect.top + outer.clientTop;
          const cRect = content.getBoundingClientRect();
          this.size.set({ w: outer.clientWidth, h: outer.clientHeight });
          this.capture.set({
            left: cRect.left - iLeft,
            top: cRect.top - iTop,
            width: cRect.width,
            height: cRect.height,
          });
          // The rendered component (the content region's first child) anchors
          // the ruler's 0,0 and defines where numbers show vs. where the ruler
          // dims.
          const compEl = content.firstElementChild as HTMLElement | null;
          const rRect = compEl ? compEl.getBoundingClientRect() : cRect;
          this.comp.set({
            left: rRect.left - iLeft,
            top: rRect.top - iTop,
            width: rRect.width,
            height: rRect.height,
          });
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(outer);
        ro.observe(content);
        const compEl = content.firstElementChild;
        if (compEl) ro.observe(compEl);
        onCleanup(() => {
          ro.disconnect();
          if (this.outer === outer) this.outer = null;
        });
      });
    });

    // Enter animation: runs once the layers are in the DOM. React fades both
    // layers in and slides the rulers the last 4px.
    afterRenderEffect(() => {
      const visible = this.visible();
      const active = this.active();
      // Track the layer elements: they appear and disappear with `visible`.
      this.rulerLayer();
      this.topRuler();
      this.leftRuler();
      this.crosshairLayer();
      untracked(() => {
        if (visible && active) this.runEnter();
      });
    });

    // Re-measure in place when the size step flips: the demo re-lays-out
    // without a mousemove, so the inspected element's numbers go stale. Prefer
    // refreshing the element itself (it usually slides out from under the
    // frozen cursor when the page above it reflows); fall back to whatever is
    // under the cursor now. Double-rAF lets the new layout settle first.
    effect((onCleanup) => {
      this.sizeVariant();
      if (!this.active()) return;
      if (!this.lastEl && !this.lastPos) return;
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const el = this.lastEl;
          if (el && el.isConnected) this.measureEl(el, this.livePart(el));
          else if (this.lastPos) this.compute(this.lastPos.x, this.lastPos.y);
        }),
      );
      onCleanup(() => cancelAnimationFrame(id));
    });

    inject(DestroyRef).onDestroy(() => {
      this.teardown();
    });
  }

  // ── Rulers ───────────────────────────────────────────────────────────

  protected readonly capTop = computed(() => this.capture()?.top ?? 0);
  protected readonly capLeft = computed(() => this.capture()?.left ?? 0);
  // The rulers overlay the content instead of reserving a gutter, so the demo
  // never shifts when Inspect toggles. Each ruler occupies the first strip of
  // the content region: the top ruler over [capTop, topStripEnd], the left
  // ruler over [capLeft, leftStripEnd]. The top ruler's ticks still tuck up
  // under the fixed header (masked by its z-40 background). The strip ends are
  // where the other ruler's band starts — used to clear the shared corner.
  protected readonly topStripEnd = computed(() => this.capTop() + RULER_TOP);
  protected readonly leftStripEnd = computed(() => this.capLeft() + RULER_LEFT);

  // Ruler grid: ticks every 8px anchored at the component's 0,0. Numbers show
  // only at 8px multiples that fall inside the component; ticks continue over
  // the surrounding background at low contrast, without numbers.
  private readonly ticks = computed(() => {
    const comp = this.comp();
    const { w, h } = this.size();
    const make = (origin: number, extent: number, total: number): Tick[] => {
      const out: Tick[] = [];
      if (!comp || total <= 0) return out;
      const startK = Math.ceil((0 - origin) / STEP);
      const endK = Math.floor((total - origin) / STEP);
      for (let k = startK; k <= endK; k++) {
        const pos = origin + k * STEP;
        const value = k * STEP;
        const inComp = value >= 0 && value <= extent + 0.5;
        out.push({ pos, value, inComp, labeled: inComp && value % LABEL_STEP === 0 });
      }
      return out;
    };
    return {
      x: make(comp?.left ?? 0, comp?.width ?? 0, w),
      y: make(comp?.top ?? 0, comp?.height ?? 0, h),
    };
  });

  protected readonly topTicks = computed(() =>
    this.ticks().x.filter((t) => t.pos >= this.leftStripEnd()),
  );
  protected readonly topLabels = computed(() => this.topTicks().filter((t) => t.labeled));
  protected readonly leftTicks = computed(() =>
    this.ticks().y.filter((t) => t.pos >= this.topStripEnd()),
  );
  protected readonly leftLabels = computed(() => this.leftTicks().filter((t) => t.labeled));

  protected readonly topBandRect = computed(() => {
    const t = this.target();
    if (!t) return null;
    const end = this.leftStripEnd();
    return {
      x: Math.max(t.left, end),
      width: t.width - Math.max(0, end - t.left),
    };
  });

  protected readonly leftBandRect = computed(() => {
    const t = this.target();
    if (!t) return null;
    const end = this.topStripEnd();
    return {
      y: Math.max(t.top, end),
      height: t.height - Math.max(0, end - t.top),
    };
  });

  // ── Crosshair ────────────────────────────────────────────────────────

  /** The four box edges: two vertical guides, two horizontal. */
  protected readonly verticalGuides = computed(() => {
    const t = this.target();
    return t ? [t.left, t.left + t.width] : [];
  });

  protected readonly horizontalGuides = computed(() => {
    const t = this.target();
    return t ? [t.top, t.top + t.height] : [];
  });

  /** Where the tooltip anchors: the hovered element, at least 1×1. */
  protected readonly tooltipBox = computed(() => {
    const t = this.target();
    return t
      ? { left: t.left, top: t.top, width: Math.max(1, t.width), height: Math.max(1, t.height) }
      : { left: 0, top: 0, width: 1, height: 1 };
  });

  /** The number of measurements taken; read by `readoutOffset()`. */
  private readonly measurements = signal(0);

  /** The readout's 8px gap, re-asserted on every measurement.
   *
   *  The ported Tooltip repositions only when one of its layout inputs changes
   *  (its positioner never observes the origin), while this anchor slides out
   *  from under a stationary bubble. Flipping the last digit on each
   *  measurement is therefore what brings the bubble along: the step is a
   *  ten-thousandth of a pixel, below device-pixel resolution, so the pane's
   *  pixel snap rounds it away and the gap stays React's 8px. */
  protected readonly readoutOffset = computed(() => 8 + (this.measurements() % 2) * 1e-4);

  // ── Measurement ──────────────────────────────────────────────────────

  private livePart(el: HTMLElement): HTMLElement {
    const part = this.lastPart;
    return part && part.isConnected && el.contains(part) ? part : el;
  }

  /** Re-measure when the inspected element itself resizes — a demo-local step
   *  toggle re-lays-out the content without any site-level signal, and the
   *  cursor may be parked (keyboard-driven toggle) with no mousemove coming. */
  private getTargetRo(): ResizeObserver | null {
    if (this.targetRo === null && typeof ResizeObserver !== 'undefined') {
      this.targetRo = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          const el = this.lastEl;
          if (el && el.isConnected) this.measureEl(el, this.livePart(el));
        });
      });
    }
    return this.targetRo;
  }

  private measureEl(el: HTMLElement, part: HTMLElement = el): void {
    const outer = this.outer;
    if (!outer) return;
    const fRect = outer.getBoundingClientRect();
    const iLeft = fRect.left + outer.clientLeft;
    const iTop = fRect.top + outer.clientTop;
    if (this.lastEl !== el) {
      this.targetRo?.disconnect();
      this.getTargetRo()?.observe(el);
    }
    this.lastEl = el;
    this.lastPart = part;

    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const pt = parseFloat(cs.paddingTop) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const pb = parseFloat(cs.paddingBottom) || 0;
    const pl = parseFloat(cs.paddingLeft) || 0;
    const mt = parseFloat(cs.marginTop) || 0;
    const mr = parseFloat(cs.marginRight) || 0;
    const mb = parseFloat(cs.marginBottom) || 0;
    const ml = parseFloat(cs.marginLeft) || 0;

    const left = r.left - iLeft;
    const top = r.top - iTop;
    const width = r.width;
    const height = r.height;

    const padStrips: Strip[] = [];
    if (pt > 0) padStrips.push({ left, top, width, height: pt, label: String(Math.round(pt)) });
    if (pb > 0) {
      padStrips.push({ left, top: top + height - pb, width, height: pb, label: String(Math.round(pb)) });
    }
    if (pl > 0) {
      padStrips.push({
        left,
        top: top + pt,
        width: pl,
        height: height - pt - pb,
        label: String(Math.round(pl)),
      });
    }
    if (pr > 0) {
      padStrips.push({
        left: left + width - pr,
        top: top + pt,
        width: pr,
        height: height - pt - pb,
        label: String(Math.round(pr)),
      });
    }

    // The gap the hovered part sits in: a snapped control may hold only a
    // layout row (a button's icon + label), so the strips come from the
    // nearest flex/grid container on the way up from the part.
    let gapHost: HTMLElement = el;
    let gapCs = cs;
    for (let n: HTMLElement | null = part; n && n !== el; n = n.parentElement) {
      const ncs = getComputedStyle(n);
      if ((ncs.display.includes('flex') || ncs.display.includes('grid')) && n.children.length > 1) {
        gapHost = n;
        gapCs = ncs;
        break;
      }
    }
    const gapStrips: Strip[] = [];
    const isFlex = gapCs.display.includes('flex') || gapCs.display.includes('grid');
    if (isFlex) {
      const kids = Array.from(gapHost.children).map((k) => k.getBoundingClientRect());
      for (let i = 0; i < kids.length - 1; i++) {
        const a = kids[i];
        const b = kids[i + 1];
        const hGap = b.left - a.right;
        const vGap = b.top - a.bottom;
        if (hGap > 1) {
          gapStrips.push({
            left: a.right - iLeft,
            top: Math.min(a.top, b.top) - iTop,
            width: hGap,
            height: Math.max(a.height, b.height),
            label: String(Math.round(hGap)),
          });
        } else if (vGap > 1) {
          gapStrips.push({
            left: Math.min(a.left, b.left) - iLeft,
            top: a.bottom - iTop,
            width: Math.max(a.width, b.width),
            height: vGap,
            label: String(Math.round(vGap)),
          });
        }
      }
    }

    const tag = el.tagName.toLowerCase();
    const slot = el.getAttribute('data-slot');
    // Lead with the semantic part name when there is one; fall back to the
    // raw tag otherwise.
    const anchor = slot ?? el.tagName;

    const flexDir = cs.display.includes('flex')
      ? ` ${cs.flexDirection.startsWith('column') ? 'col' : 'row'}`
      : '';
    // The tag leads the meta line only when the anchor is a slot name —
    // otherwise the anchor already *is* the tag, so listing it again repeats.
    const meta = `${slot ? `${tag} · ` : ''}${cs.display}${flexDir} · ${Math.round(width)} × ${Math.round(height)}`;

    const gapVal = Math.max(parseFloat(gapCs.columnGap) || 0, parseFloat(gapCs.rowGap) || 0);

    // Type metrics come from the hovered part when it is the text itself (a
    // snapped button's label), else from the element when it directly wraps
    // text — never from a layout container that merely inherits a font.
    const textEl = wrapsText(part) ? part : wrapsText(el) ? el : null;
    const tcs = textEl === el ? cs : textEl ? getComputedStyle(textEl) : null;
    let font: Target['font'] = null;
    if (tcs) {
      const sizePx = Math.round(parseFloat(tcs.fontSize));
      const lh = tcs.lineHeight === 'normal' ? 'normal' : `${Math.round(parseFloat(tcs.lineHeight))}px`;
      const family = tcs.fontFamily
        .split(',')[0]
        .replace(/["']/g, '')
        .trim();
      const tracking =
        tcs.letterSpacing === 'normal' || tcs.letterSpacing === '0px' ? '0' : tcs.letterSpacing;
      // FF drives weight through variable-font axes, so the CSS font-weight
      // reads a flat 400 — surface the axes (wght/opsz) when present.
      const fvs = tcs.fontVariationSettings;
      let weight = tcs.fontWeight;
      if (fvs && fvs !== 'normal') {
        const wght = /wght["'\s]+([\d.]+)/.exec(fvs)?.[1];
        const opsz = /opsz["'\s]+([\d.]+)/.exec(fvs)?.[1];
        const parts = [wght ? `wght ${wght}` : null, opsz ? `opsz ${opsz}` : null].filter(
          (p): p is string => p !== null,
        );
        if (parts.length) weight = parts.join(' · ');
      }
      font = {
        size: `${sizePx}px / ${lh}`,
        family,
        weight,
        tracking,
        color: rgbToHex(tcs.color),
      };
    }

    const rawFontSize = tcs ? parseFloat(tcs.fontSize) : null;

    // A new box for the readout: re-anchors the ported tooltip (see
    // `readoutOffset`).
    this.measurements.update((n) => n + 1);

    this.target.set({
      left,
      top,
      width,
      height,
      raw: {
        width,
        height,
        pt,
        pr,
        pb,
        pl,
        gap: gapVal,
        fontSize: rawFontSize,
      },
      content: {
        left: left + pl,
        top: top + pt,
        width: Math.max(0, width - pl - pr),
        height: Math.max(0, height - pt - pb),
      },
      padStrips,
      gapStrips,
      anchor,
      meta,
      padding: boxShorthand(pt, pr, pb, pl),
      margin: boxShorthand(mt, mr, mb, ml),
      gap: isFlex && gapVal > 0 ? `${Math.round(gapVal)}px` : null,
      font,
    });
  }

  private compute(clientX: number, clientY: number): void {
    if (!this.active()) return;
    const content = this.frame();
    // Deepest element under the cursor that belongs to the component (skip
    // the overlay's own UI and the content wrapper itself). Portalled popups
    // the demo has open — menus, listboxes — live outside the content subtree
    // but are the demo's too, so anything inside one under the cursor is
    // inspectable as well (a dropdown held open through the Inspect toggle
    // can be measured item by item). Tooltips stay excluded: role="tooltip"
    // never matches, so the inspector can't chase its own readout. Degenerate
    // boxes — the invisible text-box-trim sizer spans report ~0 height —
    // measure as noise, so fall through to the next element in the stack.
    const stack = this.document.elementsFromPoint(clientX, clientY);
    const el = stack.find((e) => {
      const inContent = content.contains(e) && e !== content;
      if (!inContent) {
        // Portalled popups are only inspectable when THIS demo owns them: the
        // popup must be labelled by (aria-labelledby) or controlled from
        // (aria-controls) a trigger inside this preview's content. A menu
        // opened by site chrome or an adjacent preview fails both checks and
        // stays out of scope.
        const popup = e.closest('[role="menu"],[role="listbox"]');
        if (!popup) return false;
        const labelId = popup.getAttribute('aria-labelledby');
        const labelEl = labelId ? this.document.getElementById(labelId) : null;
        const labelledFromHere = !!labelEl && content.contains(labelEl);
        const controlledFromHere =
          !!popup.id && !!content.querySelector(`[aria-controls="${CSS.escape(popup.id)}"]`);
        if (!labelledFromHere && !controlledFromHere) return false;
      }
      if (e.closest('[data-inspect-ui]')) return false;
      const r = e.getBoundingClientRect();
      return r.width >= 1 && r.height >= 1;
    }) as HTMLElement | undefined;

    if (!el) {
      this.lastEl = null;
      this.lastPart = null;
      this.target.set(null);
      return;
    }
    this.measureEl(snapToControl(el, content), el);
  }

  protected onMove(event: MouseEvent): void {
    const { clientX, clientY } = event;
    this.lastPos = { x: clientX, y: clientY };
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => this.compute(clientX, clientY));
  }

  protected clear(): void {
    this.stopTracking();
    this.target.set(null);
  }

  /** Drop the pointer state and the resize observation of the hovered element
   *  without discarding the measurements the exit fade is still drawing. */
  private stopTracking(): void {
    cancelAnimationFrame(this.rafId);
    this.lastPos = null;
    this.lastEl = null;
    this.lastPart = null;
    this.targetRo?.disconnect();
  }

  // ── Presence ─────────────────────────────────────────────────────────

  private show(): void {
    if (this.shown()) {
      // Re-entered mid-exit: turn the fade around from where it is. The fade
      // has no pointer behind it, so the old readout goes with it.
      this.stopTracking();
      this.target.set(null);
      this.runEnter();
      return;
    }
    this.shown.set(true);
  }

  private hide(): void {
    this.stopTracking();
    if (!this.shown()) {
      this.target.set(null);
      return;
    }
    this.runExit();
  }

  private resolveOuter(content: HTMLElement): HTMLElement {
    // The frame is whatever positioned box the layers resolve against, which
    // is also the coordinate space the measurements use.
    const layer = this.rulerLayer()?.nativeElement ?? this.crosshairLayer()?.nativeElement ?? null;
    const offsetParent = layer?.offsetParent;
    if (offsetParent instanceof HTMLElement) return offsetParent;
    const preview = content.closest('[data-component-preview]');
    return preview instanceof HTMLElement ? preview : (content.parentElement ?? content);
  }

  /** The layers that carry the presence animation, with their enter keyframes,
   *  their static target once already on screen, and their exit keyframes. */
  private animated(): {
    el: HTMLElement | null;
    enter: DOMKeyframesDefinition;
    again: DOMKeyframesDefinition;
    exit: DOMKeyframesDefinition;
  }[] {
    return [
      {
        el: this.rulerLayer()?.nativeElement ?? null,
        enter: { opacity: [0, 1] },
        again: { opacity: 1 },
        exit: { opacity: 0 },
      },
      {
        el: this.topRuler()?.nativeElement ?? null,
        enter: { y: [-4, 0] },
        again: { y: 0 },
        exit: { y: -4 },
      },
      {
        el: this.leftRuler()?.nativeElement ?? null,
        enter: { x: [-4, 0] },
        again: { x: 0 },
        exit: { x: -4 },
      },
      {
        el: this.crosshairLayer()?.nativeElement ?? null,
        enter: { opacity: [0, 1] },
        again: { opacity: 1 },
        exit: { opacity: 0 },
      },
    ];
  }

  private runEnter(): void {
    this.stopAnimations();
    for (const { el, enter, again } of this.animated()) {
      if (!el) continue;
      const fresh = !this.animatedLayers.has(el);
      this.animatedLayers.add(el);
      this.animations.push(this.animate(el, fresh ? enter : again, enterTransition(spring.moderate)));
    }
  }

  private runExit(): void {
    this.stopAnimations();
    const running: FluidAnimation[] = [];
    for (const { el, exit } of this.animated()) {
      if (el) running.push(this.animate(el, exit, exitTransition(spring.moderate)));
    }
    this.animations = running;
    if (!running.length) {
      this.target.set(null);
      this.shown.set(false);
      return;
    }
    const release = () => {
      if (this.animations !== running) return;
      clearTimeout(this.exitTimer);
      // The exit landed: the readout goes with the layers, as on unmount.
      this.target.set(null);
      this.shown.set(false);
    };
    Promise.all(running.map((a) => a.finished)).then(release, release);
    // Fallback release: animation callbacks can stall in throttled tabs.
    this.exitTimer = setTimeout(release, exitFallbackMs(spring.moderate));
  }

  private stopAnimations(): void {
    for (const animation of this.animations) animation.stop();
    this.animations = [];
  }

  private teardown(): void {
    cancelAnimationFrame(this.rafId);
    clearTimeout(this.exitTimer);
    this.stopAnimations();
    this.targetRo?.disconnect();
    this.targetRo = null;
    this.lastEl = null;
    this.lastPart = null;
    this.lastPos = null;
  }
}
