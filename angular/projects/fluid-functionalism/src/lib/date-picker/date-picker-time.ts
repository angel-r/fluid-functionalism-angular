// ---------------------------------------------------------------------------
// Time helpers of the date picker (pure, exported for the unit tests).
//
// Times are "HH:mm" strings on the same day as the date, formatted with Intl;
// nothing here imports a date library.
// ---------------------------------------------------------------------------

const DAY_MINUTES = 24 * 60;
/** 23:59, the last minute an end time can take. */
export const LAST_MINUTE = DAY_MINUTES - 1;

/** "HH:mm" → minutes after midnight, or null. */
export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes after midnight → "HH:mm". */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Reads a typed time: `1130`, `11:30`, `11.30`, `9h30`, `9h`, `930`, `9`,
 * `11:30am`, `9pm`, `12am`. A separator (`:`, `.`, `h`) may end the hour on
 * its own (`9h` is 9:00). Three bare digits read as H:MM (`123` is 1:23).
 * Returns minutes after midnight, or null when it isn't a time.
 */
export function parseTime(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, '');
  // Hour, then minutes after a separator (optional there) or two bare digits.
  const m = /^(\d{1,2})(?:[:.h](\d{2})?|(\d{2}))?(a|am|p|pm)?$/.exec(s);
  if (!m) {
    // Three or four bare digits: "930", "1130".
    const d = /^(\d{3,4})(a|am|p|pm)?$/.exec(s);
    if (!d) return null;
    const digits = d[1].padStart(4, '0');
    return parseTime(`${digits.slice(0, 2)}:${digits.slice(2)}${d[2] ?? ''}`);
  }
  let h = Number(m[1]);
  const minutes = m[2] ?? m[3];
  const min = minutes === undefined ? 0 : Number(minutes);
  const suffix = m[4];
  if (min > 59) return null;
  if (suffix) {
    if (h < 1 || h > 12) return null;
    const pm = suffix.startsWith('p');
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
  } else if (h > 23) {
    return null;
  }
  return h * 60 + min;
}

/** `15min`, `1h`, `1h 15min`. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** 12 or 24 hours: the override, else the locale's own clock. */
export function resolveHourCycle(locale?: string, override?: 12 | 24): 12 | 24 {
  if (override) return override;
  const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return cycle === 'h11' || cycle === 'h12' ? 12 : 24;
}

/** Minutes after midnight as the locale shows a time: `11:00` or `11:00 AM`. */
export function formatTime(minutes: number, hourCycle: 12 | 24, locale?: string): string {
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return new Intl.DateTimeFormat(locale, {
    hour: hourCycle === 12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    hourCycle: hourCycle === 12 ? 'h12' : 'h23',
  }).format(date);
}

/** Changing the start keeps the duration: the end moves with it, and
 *  stops at the end of the day. */
export function shiftEnd(prevStart: number, prevEnd: number, nextStart: number): number {
  const duration = Math.max(prevEnd - prevStart, 0);
  return Math.min(nextStart + duration, LAST_MINUTE);
}

export interface TimeSlot {
  minutes: number;
  /** Minutes after the range start, for an end list. */
  duration?: number;
}

/** Start (or single) slots: the whole day in `step` minutes. End slots:
 *  from one step after `after` to the end of the same day. */
export function buildSlots(step: number, after?: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const safeStep = Math.max(1, Math.round(step));
  if (after === undefined) {
    for (let t = 0; t < DAY_MINUTES; t += safeStep) slots.push({ minutes: t });
    return slots;
  }
  for (let t = after + safeStep; t <= LAST_MINUTE; t += safeStep) {
    slots.push({ minutes: t, duration: t - after });
  }
  if (slots.length === 0 && after < LAST_MINUTE) {
    slots.push({ minutes: LAST_MINUTE, duration: LAST_MINUTE - after });
  }
  return slots;
}

/** The slot nearest a time, by index. */
export function nearestSlotIndex(slots: TimeSlot[], minutes: number): number {
  let best = -1;
  let bestDistance = Infinity;
  slots.forEach((slot, i) => {
    const d = Math.abs(slot.minutes - minutes);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}
