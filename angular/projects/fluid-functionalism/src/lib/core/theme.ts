import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  InjectionToken,
  type EnvironmentProviders,
  effect,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  signal,
} from '@angular/core';

export type Theme = 'system' | 'light' | 'dark';

const themeOrder: Theme[] = ['system', 'light', 'dark'];

export const FF_DEFAULT_THEME = new InjectionToken<Theme>('FF_DEFAULT_THEME', {
  factory: () => 'system',
});

/**
 * Light/dark switching. The single source of truth for the DOM side effects:
 * swap the `.light` / `.dark` root classes, bracketed by the `.transitioning`
 * guard (added + reflow-flushed before the swap so the 180ms colour
 * cross-fade applies). The first application skips the guard — only
 * user-triggered changes retime transitions.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly _theme = signal<Theme>(inject(FF_DEFAULT_THEME));
  readonly theme = this._theme.asReadonly();
  private hasApplied = false;
  private timeout: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => this.apply(this._theme()));
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timeout));
  }

  setTheme(next: Theme) {
    this._theme.set(next);
  }

  /** Advances system → light → dark → system. */
  cycle() {
    this._theme.update((prev) => themeOrder[(themeOrder.indexOf(prev) + 1) % themeOrder.length]);
  }

  private apply(theme: Theme) {
    const root = this.document.documentElement;
    const animate = this.hasApplied;
    this.hasApplied = true;
    if (animate) {
      root.classList.add('transitioning');
      void root.offsetHeight;
    }
    root.classList.remove('light', 'dark');
    if (theme !== 'system') root.classList.add(theme);
    if (animate) {
      clearTimeout(this.timeout);
      this.timeout = setTimeout(() => root.classList.remove('transitioning'), 200);
    }
  }
}

/**
 * Registers the theme service at startup. With `shortcut: true`, pressing T
 * (outside fields, without modifiers) cycles the theme, as on the docs site.
 */
export function provideFluidTheme(options: { defaultTheme?: Theme; shortcut?: boolean } = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: FF_DEFAULT_THEME, useValue: options.defaultTheme ?? 'system' },
    provideEnvironmentInitializer(() => {
      const theme = inject(ThemeService);
      if (!options.shortcut) return;
      const document = inject(DOCUMENT);
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 't' && e.key !== 'T') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
        e.preventDefault();
        theme.cycle();
      };
      document.addEventListener('keydown', onKeyDown);
      inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', onKeyDown));
    }),
  ]);
}
