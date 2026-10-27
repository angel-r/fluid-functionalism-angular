// ---------------------------------------------------------------------------
// Share-links in, address bar out, ported from `usePresetUrlSync` in
// lib/docs/preset-ui.tsx (D5).
//
// `usePresetUrl(code, defaultCode, onLoad)`:
// - `code`: the playground's current encoded configuration (a signal).
// - `defaultCode`: the code for the component's default state, so the default
//   leaves the address bar clean.
// - `onLoad`: receives the pasted `?preset=` code once; the page checks the
//   tag belongs to its component and applies it.
//
// Call it from a page's construction (`inject` context). It reads `?preset=`
// once, hands the raw code to `onLoad`, then keeps the address bar tracking
// `code` with `history.replaceState`, so the Angular router never re-navigates
// and a copied URL always reopens the configuration.
//
// The pasted code is the only copy of the shared state and the tracker effect
// runs in the same turn as the read, before the decoded state has landed.
// Writing then would replace the pasted code with the pre-hydration default,
// so the tracker only starts writing once `code` has moved off its initial
// value: proof the decode was applied. Until then the URL stays intact.
// ---------------------------------------------------------------------------

import { DOCUMENT, effect, inject, type Signal } from '@angular/core';

export function usePresetUrl(code: Signal<string>, defaultCode: Signal<string>, onLoad: (raw: string) => void): void {
  const document = inject(DOCUMENT);
  const view = document.defaultView;
  const initialCode = code();
  let pending: string | null = null;

  const pasted = new URL(document.location.href).searchParams.get('preset');
  if (pasted) {
    pending = pasted;
    onLoad(pasted);
  }

  effect(() => {
    const current = code();
    const fallback = defaultCode();
    if (pending !== null) {
      if (current === initialCode) return; // decode not applied yet
      pending = null;
    }
    if (!view) return;
    const url = new URL(document.location.href);
    if (current === fallback) url.searchParams.delete('preset');
    else url.searchParams.set('preset', current);
    view.history.replaceState(view.history.state, '', url.href);
  });
}
