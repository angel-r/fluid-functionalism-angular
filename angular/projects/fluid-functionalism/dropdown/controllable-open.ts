import { type Signal, computed, linkedSignal, untracked } from '@angular/core';

/**
 * The open state of a popup root: controlled through `open` when bound,
 * internal otherwise (seeded by `defaultOpen`). A request that matches the
 * effective state is not reported (React's `useControllableOpen`).
 */
export function createControllableOpen(
  open: Signal<boolean | undefined>,
  defaultOpen: Signal<boolean>,
  emit: (next: boolean) => void,
) {
  const internal = linkedSignal(() => untracked(defaultOpen));
  const value = computed(() => open() ?? internal());
  const set = (next: boolean) => {
    if (next === untracked(value)) return;
    internal.set(next);
    emit(next);
  };
  return { value, set };
}
