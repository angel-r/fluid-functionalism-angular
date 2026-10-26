import { InjectionToken, inject } from '@angular/core';

// ---------------------------------------------------------------------------
// Shortcuts — one string syntax for both the trigger combo and the caps a row
// displays. Tokens join with "+": modifiers first, then one key.
//   "mod+k"        ⌘K on a Mac, Ctrl+K elsewhere
//   "mod+shift+p"  ⌘⇧P / Ctrl+Shift+P
//   "/"            a bare key
// Pre-formatted caps ("⌘K", "⌘⇧P") display as-is, one cap per glyph.
// ---------------------------------------------------------------------------

export interface ParsedShortcut {
  /** ⌘ on a Mac, Ctrl elsewhere. Matches either while listening, so a Ctrl
   *  press on a Mac still opens the menu. */
  mod: boolean;
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  /** Lowercase `KeyboardEvent.key` ("k", "/", "escape"). */
  key: string;
}

const MODIFIER_TOKENS: Record<string, keyof Omit<ParsedShortcut, 'key'>> = {
  mod: 'mod',
  cmd: 'meta',
  command: 'meta',
  meta: 'meta',
  win: 'meta',
  super: 'meta',
  ctrl: 'ctrl',
  control: 'ctrl',
  alt: 'alt',
  option: 'alt',
  opt: 'alt',
  shift: 'shift',
};

/** Named keys, as `KeyboardEvent.key` spells them (lowercased). */
const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  return: 'enter',
  space: ' ',
  spacebar: ' ',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  del: 'delete',
  plus: '+',
};

/** Splits a combo on "+", keeping a trailing "+" as the key itself. */
function shortcutTokens(shortcut: string): string[] {
  const trimmed = shortcut.trim();
  if (trimmed === '') return [];
  const tokens = trimmed.split('+').map((t) => t.trim());
  // "mod++" splits into ["mod", "", ""]: the empties were a literal "+".
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '' && i > 0) {
      if (out[out.length - 1] !== '+') out.push('+');
      continue;
    }
    if (tokens[i] !== '') out.push(tokens[i]);
  }
  return out;
}

export function parseShortcut(shortcut: string): ParsedShortcut {
  const parsed: ParsedShortcut = {
    mod: false,
    meta: false,
    ctrl: false,
    alt: false,
    shift: false,
    key: '',
  };
  for (const token of shortcutTokens(shortcut)) {
    const lower = token.toLowerCase();
    const modifier = MODIFIER_TOKENS[lower];
    if (modifier) parsed[modifier] = true;
    else parsed.key = KEY_ALIASES[lower] ?? lower;
  }
  return parsed;
}

/** Whether a keydown is the parsed combo. The physical key (`code`) stands
 *  in when `key` is not a Latin letter or digit — non-Latin layouts
 *  (Cyrillic, Greek) — or whenever ⌥ is held, since a Mac ⌥ combo usually
 *  turns `key` into a symbol but not on every layout. Without ⌥ a Latin
 *  letter is taken at face value, so on Dvorak or AZERTY the key that types
 *  "t" is never read as the physical K. */
export function matchesShortcut(
  e: Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>,
  parsed: ParsedShortcut,
): boolean {
  if (parsed.key === '') return false;
  const key = e.key.toLowerCase();
  const byCode =
    parsed.key.length === 1 &&
    /[a-z0-9]/.test(parsed.key) &&
    (e.altKey || !/^[a-z0-9]$/i.test(e.key)) &&
    e.code.toLowerCase() === (/[a-z]/.test(parsed.key) ? `key${parsed.key}` : `digit${parsed.key}`);
  if (key !== parsed.key && !byCode) return false;
  if (parsed.mod) {
    if (!e.metaKey && !e.ctrlKey) return false;
  } else if (e.metaKey !== parsed.meta || e.ctrlKey !== parsed.ctrl) {
    return false;
  }
  if (e.altKey !== parsed.alt) return false;
  // Shift is implied by an uppercase letter or a shifted symbol, so it is
  // only checked when the combo names it.
  if (parsed.shift && !e.shiftKey) return false;
  return true;
}

/** Whether the parsed combo holds any modifier, i.e. is safe to fire while
 *  typing in a field. A bare key stays out of inputs. */
export function hasModifier(parsed: ParsedShortcut): boolean {
  return parsed.mod || parsed.meta || parsed.ctrl || parsed.alt;
}

/** The canonical spelling of a parsed combo: "mod+k", "cmd+k" and "Mod+K"
 *  are one key. */
export function comboKey(parsed: ParsedShortcut): string {
  return [
    parsed.mod && 'mod',
    parsed.meta && 'meta',
    parsed.ctrl && 'ctrl',
    parsed.alt && 'alt',
    parsed.shift && 'shift',
    parsed.key,
  ]
    .filter(Boolean)
    .join('+');
}

const CAP_LABELS: Record<string, { mac: string; other: string }> = {
  mod: { mac: '⌘', other: 'Ctrl' },
  meta: { mac: '⌘', other: 'Win' },
  ctrl: { mac: '⌃', other: 'Ctrl' },
  alt: { mac: '⌥', other: 'Alt' },
  shift: { mac: '⇧', other: 'Shift' },
  enter: { mac: '↵', other: 'Enter' },
  escape: { mac: 'Esc', other: 'Esc' },
  backspace: { mac: '⌫', other: 'Backspace' },
  delete: { mac: '⌦', other: 'Del' },
  tab: { mac: '⇥', other: 'Tab' },
  ' ': { mac: 'Space', other: 'Space' },
  arrowup: { mac: '↑', other: '↑' },
  arrowdown: { mac: '↓', other: '↓' },
  arrowleft: { mac: '←', other: '←' },
  arrowright: { mac: '→', other: '→' },
};

const PREFORMATTED = /^[⌘⌃⌥⇧↵⌫⌦⇥↑↓←→]+[A-Za-z0-9]?$/;

/** The caps a shortcut displays, in order: modifiers as symbols on a Mac and
 *  words elsewhere, letters upper-cased, named keys spelled out. */
export function formatShortcut(shortcut: string, mac: boolean): string[] {
  const caps: string[] = [];
  for (const token of shortcutTokens(shortcut)) {
    if (PREFORMATTED.test(token)) {
      caps.push(...Array.from(token));
      continue;
    }
    const lower = token.toLowerCase();
    const modifier = MODIFIER_TOKENS[lower];
    const name = modifier ?? KEY_ALIASES[lower] ?? lower;
    const cap = CAP_LABELS[name];
    if (cap) caps.push(mac ? cap.mac : cap.other);
    else if (name.length === 1) caps.push(name.toUpperCase());
    else caps.push(name.charAt(0).toUpperCase() + name.slice(1));
  }
  return caps;
}

/** Whether the page runs on a Mac — the platform that draws ⌘ and ⌥. */
export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * Whether to draw ⌘ and ⌥ rather than Ctrl and Alt. The platform never
 * changes, so it is read once per injector. Provide `false` / `true` to pin
 * the caps (tests, screenshots). (React: `useIsMac()`.)
 */
export const COMMAND_MENU_IS_MAC = new InjectionToken<boolean>('FF_COMMAND_MENU_IS_MAC', {
  providedIn: 'root',
  factory: isMacPlatform,
});

/** `COMMAND_MENU_IS_MAC` in an injection context. */
export function injectIsMac(): boolean {
  return inject(COMMAND_MENU_IS_MAC);
}

/** Whether a keydown target is a field the user types into. */
export function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}
