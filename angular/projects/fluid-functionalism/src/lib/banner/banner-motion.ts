import { animate, motionValue, type MotionValue, type ValueAnimationTransition } from 'motion';
import { spring } from '../core';

/** The fast tier's enter spring, as a value transition. */
const fastEnter: ValueAnimationTransition<number> = {
  type: spring.fast.type,
  duration: spring.fast.duration,
  bounce: spring.fast.bounce,
};

// ── Motion ───────────────────────────────────────────────
// The space a banner takes (a one-row grid whose track runs between 0fr and
// 1fr) and the banner itself move separately.
//
// Appearing, the row starts opening, and a fast tier later the banner fades
// in while growing from 40% on the slow tier, bounce included. Dismissing,
// the row starts closing at once and the banner rides it: while the row
// closes to 60% of its height, the banner shrinks from 100% to 60% from its
// top edge and fades out, so its visible height always equals the row's and
// the closing row never cuts it. The rest of the close happens with the
// banner already gone. A full-bleed bar can't shrink without pulling its ends
// in from the window edges, so it rides its row instead: it slides down into
// the opening row while fading in, and up out of the closing one while
// fading out, both on the row's curve. Reduced motion keeps the fades and
// snaps the row.
//
// At rest the row is exactly the content height, so rewrapping text never
// waits on a measurement, and fr resolves from layout, so a scaled ancestor
// can't skew it. In a flex column with a gap, the row also takes back one
// gap, so nothing jumps when the banner mounts or unmounts.

/** Every value in the appear and dismiss. */
export interface BannerMotionConfig {
  readonly appear: {
    /** The row opening. */
    readonly row: ValueAnimationTransition<number>;
    /** The banner fading in and growing. */
    readonly banner: ValueAnimationTransition<number>;
    /** The scale the banner grows from. */
    readonly fromScale: number;
  };
  readonly dismiss: {
    /** The row closing. The banner rides it. */
    readonly row: ValueAnimationTransition<number>;
    /** The scale the banner shrinks to, which is also how open the row is
     *  when the banner is gone. One number, so the banner's visible height
     *  always equals the row's and the row never cuts it. */
    readonly shrinkTo: number;
  };
}

/** The default appear and dismiss, each value a motion token or derived from
 *  one. Pass a banner's `motion` input to change them for that banner; spread
 *  these to change one value and keep the rest. */
export const bannerMotion: BannerMotionConfig = {
  appear: {
    // Twice the moderate tier, no bounce.
    row: { type: 'spring', duration: spring.moderate.duration * 2, bounce: 0 },
    // The slow tier, bounce included, starting a fast tier after the row.
    banner: {
      type: 'spring',
      duration: spring.slow.duration,
      bounce: spring.slow.bounce,
      delay: spring.fast.duration,
    },
    fromScale: 0.4,
  },
  dismiss: {
    // easeInOut, twice the moderate exit.
    row: { duration: spring.moderate.exit.duration * 2, ease: 'easeInOut' },
    shrinkTo: 0.6,
  },
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Where keyboard focus goes when a banner holding it closes: the first
 *  focusable element after the banner, else the last one before it. */
export function focusNeighbour(banner: HTMLElement) {
  const doc = banner.ownerDocument;
  const candidates = Array.from(doc.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !banner.contains(el) && (el.checkVisibility?.() ?? true),
  );
  const after = candidates.find((el) => banner.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
  const before = candidates
    .filter((el) => banner.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)
    .pop();
  (after ?? before)?.focus({ preventScroll: true });
}

/** The modes a phase runs under; a change restarts the phase from where the
 *  values are, like the React effect's dependencies. */
export interface BannerMotionMode {
  readonly fixed: boolean;
  readonly reduceMotion: boolean;
  readonly config: BannerMotionConfig;
}

/**
 * One mounted banner's motion: how open the row is (as a share of the
 * banner's height), how shown and how large the banner is, and the gap it
 * takes back. Every style is one of these or derived from one, written on
 * each change, so the row and the banner render from the same frame. Lives
 * from mount to the end of the dismiss; a re-open mid-dismiss keeps it, so
 * the appear continues from wherever the banner is.
 */
export class BannerPresence {
  readonly row: MotionValue<number>;
  readonly shown: MotionValue<number>;
  readonly scale: MotionValue<number>;
  /** The gap a flex-column parent puts next to the banner. */
  private gap = 0;
  private overflow: 'hidden' | 'visible';
  private slides: boolean;
  private stopPhase: (() => void) | null = null;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly row$: HTMLElement,
    private readonly content: () => HTMLElement | null | undefined,
    appear: boolean,
    mode: BannerMotionMode,
  ) {
    const scaled = !mode.fixed && !mode.reduceMotion;
    this.row = motionValue(appear ? 0 : 1);
    this.shown = motionValue(appear ? 0 : 1);
    this.scale = motionValue(appear && scaled ? mode.config.appear.fromScale : 1);
    this.slides = mode.fixed && !mode.reduceMotion;
    // The row clips only while it has to. Appearing inline, the banner's
    // slow-tier bounce takes it a touch past full size; the row lets that
    // show. A fixed bar slides out of it, so it clips.
    this.overflow = mode.fixed ? 'hidden' : 'visible';
    const subs = [this.row, this.shown, this.scale].map((v) => v.on('change', () => this.apply()));
    this.unsubscribe = () => subs.forEach((off) => off());
    this.measureGap();
    this.apply();
  }

  /** Measured when the banner mounts, before it paints, so the first frame
   *  already takes the gap back. */
  private measureGap() {
    const parent = this.row$.parentElement;
    if (!parent) return;
    const style = getComputedStyle(parent);
    const column =
      parent.children.length > 1 && style.display.endsWith('flex') && style.flexDirection.startsWith('column');
    this.gap = column ? parseFloat(style.rowGap) || 0 : 0;
  }

  /** Writes every style from the current values. */
  apply() {
    const row = this.row.get();
    const shown = this.shown.get();
    const scale = this.scale.get();
    const rowStyle = this.row$.style;
    rowStyle.setProperty('grid-template-rows', `${row}fr`);
    rowStyle.setProperty('margin-bottom', `${(row - 1) * this.gap}px`);
    rowStyle.setProperty('overflow', this.overflow);

    const content = this.content();
    if (!content) return;
    const y = this.slides ? (row - 1) * 100 : 0;
    const parts = [y !== 0 ? `translateY(${y}%)` : '', scale !== 1 ? `scale(${scale})` : ''].filter(Boolean);
    const style = content.style;
    style.setProperty('opacity', String(shown));
    style.setProperty('transform', parts.length ? parts.join(' ') : 'none');
    style.setProperty('transform-origin', 'top');
    // A banner that is mostly faded takes no clicks: one appearing can't
    // catch clicks meant for what's under it, and one leaving can't be hit
    // twice.
    style.setProperty('pointer-events', shown > 0.5 ? 'auto' : 'none');
  }

  /** Appearing (or coming back mid-dismiss, from wherever it is): the row
   *  opens. Inline, the banner fades in and grows just behind it; a fixed
   *  bar slides down into the row and fades in with it. */
  enter({ fixed, reduceMotion, config }: BannerMotionMode) {
    this.stop();
    const scaled = !fixed && !reduceMotion;
    this.slides = fixed && !reduceMotion;
    this.overflow = fixed ? 'hidden' : 'visible';
    this.apply();
    const open = animate(this.row, 1, reduceMotion ? { duration: 0 } : config.appear.row);
    if (this.slides) {
      const follow = this.row.on('change', (v) => this.shown.set(v));
      this.stopPhase = () => {
        follow();
        open.stop();
      };
      return;
    }
    const show = animate(this.shown, 1, reduceMotion ? fastEnter : config.appear.banner);
    const grow = scaled ? animate(this.scale, 1, config.appear.banner) : undefined;
    this.stopPhase = () => {
      open.stop();
      show.stop();
      grow?.stop();
    };
  }

  /** Dismissing: the row closes from the start, and the banner rides it.
   *  Inline, the banner is gone by the time the row is `shrinkTo` open; a
   *  fixed bar fades over the whole close. Both start from wherever the
   *  banner is, so a dismiss mid-appear doesn't jump. `done` runs once the
   *  close finishes, never after a later phase took over. */
  leave({ fixed, reduceMotion, config }: BannerMotionMode, done: () => void) {
    this.stop();
    // Leaving with keyboard focus inside: hand it to a neighbour, so it
    // doesn't fall back to the top of the page when the banner unmounts.
    const doc = this.row$.ownerDocument;
    if (this.row$.contains(doc.activeElement)) focusNeighbour(this.row$);

    let current = true;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (!current) return;
      current = false;
      clearTimeout(fallback);
      done();
    };
    // A throttled or background tab can stall the animation: a timer
    // finishes the close after its duration plus a safety buffer.
    const arm = (seconds: number | undefined) => {
      fallback = setTimeout(finish, Math.round((seconds ?? 1) * 1000) + 100);
    };

    if (reduceMotion) {
      const hide = animate(this.shown, 0, spring.fast.exit);
      hide.then(finish);
      arm(spring.fast.exit.duration);
      this.stopPhase = () => {
        current = false;
        clearTimeout(fallback);
        hide.stop();
      };
      return;
    }

    const scaled = !fixed;
    this.overflow = 'hidden';
    this.apply();
    const end = fixed ? 0 : Math.min(config.dismiss.shrinkTo, 0.99);
    const rowFrom = this.row.get();
    const shownFrom = this.shown.get();
    const scaleFrom = this.scale.get();
    const unfollow = this.row.on('change', (v) => {
      const left = rowFrom > end ? (v - end) / (rowFrom - end) : rowFrom > 0 ? v / rowFrom : 0;
      this.shown.set(shownFrom * Math.min(1, Math.max(0, left)));
      if (scaled) this.scale.set(Math.min(scaleFrom, Math.max(v, end)));
    });
    const close = animate(this.row, 0, config.dismiss.row);
    close.then(finish);
    arm(typeof config.dismiss.row.duration === 'number' ? config.dismiss.row.duration : undefined);
    this.stopPhase = () => {
      current = false;
      clearTimeout(fallback);
      unfollow();
      close.stop();
    };
  }

  private stop() {
    this.stopPhase?.();
    this.stopPhase = null;
  }

  destroy() {
    this.stop();
    this.unsubscribe();
  }
}
