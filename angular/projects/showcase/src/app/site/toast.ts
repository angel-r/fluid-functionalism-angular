// The site's toast slot: one message at a time, bottom center, the way the
// React site's Sonner toasts behave (lib/docs/settings-toast.tsx).
//
// A shortcut shows the pressed key as a chip ("Theme set to Dark"), a finished
// action shows a check. The state lives here; `<app-site-toast>` (toast-host.ts)
// renders it and owns the motion.

import { Injectable, signal } from '@angular/core';

export type ToastState =
  | { kind: 'key'; keyLabel: string; message: string; press: number }
  | { kind: 'success'; message: string };

const TOAST_MS = 2000;

@Injectable({ providedIn: 'root' })
export class SiteToastService {
  private readonly _state = signal<ToastState | null>(null);
  readonly state = this._state.asReadonly();

  private timeout: ReturnType<typeof setTimeout> | undefined;
  /** Monotonic press counter: a repeat press updates the single toast in
   *  place and replays its pressed-state dip. */
  private presses = 0;

  /** A settings shortcut changed something: the key as an inverted chip
   *  beside the message. */
  shortcut(keyLabel: string, message: string): void {
    this.show({ kind: 'key', keyLabel, message, press: ++this.presses });
  }

  /** An action completed (a copy, a command menu pick). Its own message slot,
   *  so a shortcut toast and a success toast never fight over one. */
  success(message: string): void {
    this.show({ kind: 'success', message });
  }

  private show(state: ToastState): void {
    this._state.set(state);
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this._state.set(null), TOAST_MS);
  }
}
