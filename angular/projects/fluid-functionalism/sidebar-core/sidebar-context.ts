import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  type Signal,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  output,
  signal,
  untracked,
} from '@angular/core';
import { cn } from '@angel-r/fluid-functionalism-angular/core';

// ─── Constants ───────────────────────────────────────────────────────────────

export const SIDEBAR_COOKIE_NAME = 'sidebar_state';
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const SIDEBAR_WIDTH = '16rem';
export const SIDEBAR_WIDTH_MOBILE = '18rem';
/** Bare-key toggle defaults: "[" for a left sidebar, "]" for a right one.
 *  Bare (no ⌘/Ctrl) so the browser's history shortcuts stay untouched. */
export const SIDEBAR_KEYBOARD_SHORTCUT = '[';
export const SIDEBAR_KEYBOARD_SHORTCUT_RIGHT = ']';
/** Drag-resize clamp for the built-in rail handle (px). */
export const SIDEBAR_MIN_WIDTH = 160;
export const SIDEBAR_MAX_WIDTH = 360;
/** Dragging this far past the minimum width collapses the sidebar instead of
 *  bottoming out — the same "throw it at the edge to dismiss" affordance
 *  native apps use. */
export const SIDEBAR_COLLAPSE_SLOP = 56;

// ─── Context ─────────────────────────────────────────────────────────────────

export type SidebarSide = 'left' | 'right';
export type SidebarVariant = 'sidebar' | 'floating' | 'inset';
export type SidebarCollapsible = 'offcanvas' | 'none';
export type SidebarPeek = 'hover' | 'click' | 'none';

type SetStateAction<T> = T | ((prev: T) => T);

/**
 * The state a SidebarProvider shares with every sidebar part: the React
 * `SidebarContextValue`, with signals for the values. Read it with
 * `injectSidebar()`.
 */
export abstract class SidebarContext {
  abstract readonly state: Signal<'expanded' | 'collapsed'>;
  abstract readonly open: Signal<boolean>;
  abstract setOpen(open: SetStateAction<boolean>): void;
  abstract readonly openMobile: Signal<boolean>;
  abstract setOpenMobile(open: SetStateAction<boolean>): void;
  abstract readonly isMobile: Signal<boolean>;
  abstract toggleSidebar(): void;
  /** Live rail width — the rail's drag-resize updates it. */
  abstract readonly width: Signal<string>;
  abstract setWidth(width: string): void;
  abstract readonly widthMobile: Signal<string>;
  abstract readonly mobileBreakpoint: Signal<number>;
  /** Which edge the rendered Sidebar sits on (registered by the Sidebar). */
  abstract readonly side: Signal<SidebarSide>;
  /** Internal: the Sidebar reports its side so the provider can resolve the
   *  default shortcut and the rail can mirror. */
  abstract registerSide(side: SidebarSide): void;
  /** The resolved toggle key ("[" / "]" / custom / null when disabled). */
  abstract readonly shortcut: Signal<string | null>;
  /** Collapsed-peek mode: reveal the sidebar as a floating overlay from the
   *  collapsed edge on hover or click, without pinning it open. */
  abstract readonly peek: Signal<SidebarPeek>;
  /** True while the collapsed sidebar is peeking as an overlay. */
  abstract readonly isPeeking: Signal<boolean>;
  abstract setIsPeeking(peeking: SetStateAction<boolean>): void;
  /** Shared hover-intent machinery for the peek: ONE timer serves every
   *  affordance that can float the rail out (the edge strip, the trigger),
   *  so crossing between them — or into the peeked card — cancels a pending
   *  dismissal instead of racing a second timer. */
  abstract schedulePeek(): void;
  abstract scheduleDismissPeek(): void;
  abstract cancelPeekTimer(): void;
  /** Internal: true while the rail is being drag-resized (disables the width
   *  spring so the panel tracks the pointer 1:1). */
  abstract readonly isResizing: Signal<boolean>;
  abstract setIsResizing(resizing: SetStateAction<boolean>): void;
}

/** The React name for the context value's type. */
export type SidebarContextValue = SidebarContext;

/** The enclosing SidebarProvider's state (the React `useSidebar()`). */
export function injectSidebar(): SidebarContext {
  const ctx = inject(SidebarContext, { optional: true });
  if (!ctx) throw new Error('injectSidebar must be used within a SidebarProvider');
  return ctx;
}

const resolve = <T>(value: SetStateAction<T>, prev: T): T =>
  typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;

// Mounted-provider registry for the global toggle shortcut. The listener has
// to be global (the key should work without focus in the sidebar), but only
// ONE provider may answer a keypress: the innermost one containing focus, or —
// when focus is outside every provider — the OUTERMOST mounted one (the
// app-shell provider that wraps everything else; mount order can't be used
// because a persistent layout provider mounts once while demos mount later
// on navigation).
const mountedProviders: HTMLElement[] = [];

function isTypingTarget(target: HTMLElement) {
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

/** Whether the provider rooted at `root` is the one that answers a key
 *  pressed with focus on `target`. */
function answersShortcut(root: HTMLElement, target: HTMLElement): boolean {
  if (root.contains(target)) {
    // Providers can NEST (an app shell wrapping doc previews), so containment
    // alone isn't enough: the innermost provider containing focus wins.
    if (mountedProviders.some((el) => el !== root && root.contains(el) && el.contains(target))) return false;
    // The focused element itself WRAPS another provider (a preview frame
    // holding keyboard scope for the demo inside it): the wrapped provider
    // answers, not this ancestor shell.
    if (mountedProviders.some((el) => el !== root && target.contains(el))) return false;
    return true;
  }
  // Focus outside this provider. A focused element that WRAPS providers scopes
  // the key to what it wraps: the outermost wrapped provider answers. Focus on
  // <body> wraps every provider, which degenerates to the outermost overall.
  const wrapped = mountedProviders.filter((el) => target.contains(el));
  if (wrapped.length > 0) {
    const outermost = wrapped.find((el) => !wrapped.some((other) => other !== el && other.contains(el)));
    return outermost === root;
  }
  if (mountedProviders.some((el) => el !== root && el.contains(target))) return false;
  const outermost = mountedProviders.find(
    (el) => !mountedProviders.some((other) => other !== el && other.contains(el)),
  );
  return outermost === root;
}

// ─── SidebarProvider ─────────────────────────────────────────────────────────

/**
 * Owns the sidebar state and renders the layout wrapper (a flex row holding
 * the Sidebar and the SidebarInset). Publishes the widths as
 * `--sidebar-width` / `--sidebar-width-mobile`.
 *
 *   <ff-sidebar-provider>
 *     <ff-sidebar>…</ff-sidebar>
 *     <main ffSidebarInset>…</main>
 *   </ff-sidebar-provider>
 */
@Component({
  selector: 'ff-sidebar-provider',
  providers: [{ provide: SidebarContext, useExisting: SidebarProvider }],
  host: {
    'data-slot': 'sidebar-wrapper',
    '[class]': 'hostClass()',
    '[style.--sidebar-width]': 'width()',
    '[style.--sidebar-width-mobile]': 'widthMobile()',
  },
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarProvider extends SidebarContext {
  /** Uncontrolled initial state. Read the `sidebar_state` cookie on the
   *  server to restore the last visit. */
  readonly defaultOpen = input(true, { transform: booleanAttribute });
  /** Controlled open state — pair with `openChange`. */
  readonly openInput = input<boolean | undefined>(undefined, { alias: 'open' });
  /** Fires when the trigger, rail, or shortcut wants to toggle. */
  readonly openChange = output<boolean>();
  /** Persist the desktop open state to the `sidebar_state` cookie (7 days).
   *  Mobile state never persists. */
  readonly persist = input(true, { transform: booleanAttribute });
  /** Bare-key toggle shortcut. Defaults to "[" for a left sidebar and "]"
   *  for a right one; `null` disables it. */
  readonly shortcutInput = input<string | null | undefined>(undefined, { alias: 'shortcut' });
  /** Viewport width (px) below which the sidebar renders as a drawer. */
  readonly mobileBreakpoint = input(768, { transform: numberAttribute });
  /** While collapsed, reveal the sidebar as a floating overlay from the edge
   *  — on hover (with intent delay) or on click of the edge strip. Peeking
   *  never pins the sidebar or writes the cookie. */
  readonly peek = input<SidebarPeek>('none');
  readonly widthInput = input(SIDEBAR_WIDTH, { alias: 'width' });
  readonly widthMobile = input(SIDEBAR_WIDTH_MOBILE);
  readonly userClass = input('', { alias: 'class' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);

  protected readonly hostClass = computed(() =>
    cn('group/sidebar-wrapper relative flex min-h-svh w-full', this.userClass()),
  );

  // ── Open state ──
  private readonly internalOpen = linkedSignal(() => this.defaultOpen());
  readonly open = computed(() => this.openInput() ?? this.internalOpen());
  readonly state = computed<'expanded' | 'collapsed'>(() => (this.open() ? 'expanded' : 'collapsed'));

  private readonly _openMobile = signal(false);
  readonly openMobile = this._openMobile.asReadonly();

  private readonly _isMobile = signal(false);
  readonly isMobile = this._isMobile.asReadonly();

  // ── Side and shortcut ──
  private readonly _side = signal<SidebarSide>('left');
  readonly side = this._side.asReadonly();
  // Default shortcut mirrors the sidebar's edge: "[" left, "]" right.
  readonly shortcut = computed(() => {
    const shortcut = this.shortcutInput();
    if (shortcut !== undefined) return shortcut;
    return this._side() === 'right' ? SIDEBAR_KEYBOARD_SHORTCUT_RIGHT : SIDEBAR_KEYBOARD_SHORTCUT;
  });

  // ── Width ──
  // Live width: the input is the starting point, the rail's drag-resize
  // updates it at runtime. A new input value resets it.
  private readonly liveWidth = linkedSignal(() => this.widthInput());
  readonly width = this.liveWidth.asReadonly();
  private readonly _isResizing = signal(false);
  readonly isResizing = this._isResizing.asReadonly();

  // ── Peek ──
  // Pinning the sidebar open (or disabling the mode) always dismisses the
  // peek — including a PENDING intent timer, which could otherwise fire on an
  // open sidebar. The gate hides it at once; the effect below clears it.
  private readonly peekRequested = signal(false);
  readonly isPeeking = computed(() => this.peekRequested() && !this.open() && this.peek() !== 'none');
  private peekTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    mountedProviders.push(this.host);

    effect(() => {
      if (!this.open() && this.peek() !== 'none') return;
      untracked(() => {
        this.peekRequested.set(false);
        this.cancelPeekTimer();
      });
    });

    // Starts false so the server and first client render agree (both treat
    // it as desktop); the media query corrects it before interaction.
    effect((onCleanup) => {
      const breakpoint = this.mobileBreakpoint();
      const view = this.document.defaultView;
      if (!view?.matchMedia) return;
      const mql = view.matchMedia(`(max-width: ${breakpoint - 1}px)`);
      const onChange = () => this._isMobile.set(mql.matches);
      onChange();
      mql.addEventListener('change', onChange);
      onCleanup(() => mql.removeEventListener('change', onChange));
    });

    // The bare shortcut key toggles the sidebar app-wide. Bound to the
    // provider's lifetime, skipped while typing, and skipped when a modifier
    // is held so ⌘[ / ⌘] keep their browser meaning.
    const view = this.document.defaultView;
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = untracked(this.shortcut);
      if (shortcut == null) return;
      if (event.key.toLowerCase() !== shortcut.toLowerCase()) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (isTypingTarget(target)) return;
      if (!answersShortcut(this.host, target)) return;
      event.preventDefault();
      this.toggleSidebar();
    };
    view?.addEventListener('keydown', onKeyDown);

    inject(DestroyRef).onDestroy(() => {
      view?.removeEventListener('keydown', onKeyDown);
      this.cancelPeekTimer();
      const i = mountedProviders.indexOf(this.host);
      if (i !== -1) mountedProviders.splice(i, 1);
    });
  }

  setOpen(value: SetStateAction<boolean>) {
    const next = resolve(value, untracked(this.open));
    this.internalOpen.set(next);
    this.openChange.emit(next);
    if (untracked(this.persist)) {
      this.document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    }
  }

  setOpenMobile(value: SetStateAction<boolean>) {
    this._openMobile.set(resolve(value, untracked(this._openMobile)));
  }

  toggleSidebar() {
    if (untracked(this._isMobile)) this.setOpenMobile((prev) => !prev);
    else this.setOpen((prev) => !prev);
  }

  setWidth(width: string) {
    this.liveWidth.set(width);
  }

  registerSide(side: SidebarSide) {
    this._side.set(side);
  }

  setIsPeeking(value: SetStateAction<boolean>) {
    const next = resolve(value, untracked(this.isPeeking));
    // A late intent timer must not arm a peek on a pinned (or peek-less)
    // sidebar, where it would pop up on the next collapse.
    this.peekRequested.set(next && !untracked(this.open) && untracked(this.peek) !== 'none');
  }

  setIsResizing(value: SetStateAction<boolean>) {
    this._isResizing.set(resolve(value, untracked(this._isResizing)));
  }

  cancelPeekTimer() {
    if (this.peekTimer) clearTimeout(this.peekTimer);
    this.peekTimer = null;
  }

  schedulePeek() {
    this.cancelPeekTimer();
    this.peekTimer = setTimeout(() => this.setIsPeeking(true), 150);
  }

  scheduleDismissPeek() {
    this.cancelPeekTimer();
    this.peekTimer = setTimeout(() => this.setIsPeeking(false), 250);
  }
}
